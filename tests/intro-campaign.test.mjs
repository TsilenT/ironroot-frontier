import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { Game, MAPS } from '../dist/engine.js';
import {
  CAMPAIGN_MISSIONS, CAMPAIGN_CHAPTERS, ALL_CAMPAIGN_MISSIONS, ALL_CAMPAIGN_CHAPTERS,
  INTRO_MISSIONS, getCampaignMission, createCampaignMission, evaluateCampaignMission,
  getCampaignTargets, createCampaignProgress, normalizeCampaignProgress, mergeCampaignProgress,
  getCampaignOverview, isMissionUnlocked, recordCampaignResult,
} from '../dist/campaign.js';
import { isIntroMission } from '../dist/intro-campaign.js';
import { playCampaign } from './campaign-policies.mjs';
import { introReferencePolicy, introMinesOnlyPolicy } from './intro-campaign-policies.mjs';
import { encodeBattle, decodeBattle } from '../dist/battle-codec.js';

const run = (mission, options = {}) => playCampaign(createCampaignMission, evaluateCampaignMission, mission, {
  startDelay: 10, actionEvery: 5, maxActionsPerDecision: 1,
  policy: introReferencePolicy(mission.id), ...options,
});
const coreWin = id => { const game = createCampaignMission(id); game.state.bases[1].hp = 0; return game; };
const legacySemantics = JSON.parse(await readFile(new URL('./fixtures/campaign-v012-semantics.json', import.meta.url), 'utf8'));

test('all sixteen old IDs retain exact maps, goals, medals, formations, deadlines and prerequisites', () => {
  assert.equal(legacySemantics.sourceCommit, '24edddab2cff33b3f91b396bc855193f87421ba3');
  const actual = CAMPAIGN_MISSIONS.map(m => Object.fromEntries(legacySemantics.fields.filter(f => Object.hasOwn(m, f)).map(f => [f, m[f]])));
  assert.deepEqual(actual, legacySemantics.missions);
});

test('two separate optional missions use explicit legacy rules and one then two roads', () => {
  assert.equal(CAMPAIGN_MISSIONS.length, 16);
  assert.equal(CAMPAIGN_CHAPTERS.length, 5);
  assert.equal(ALL_CAMPAIGN_MISSIONS.length, 18);
  assert.equal(ALL_CAMPAIGN_CHAPTERS[0].id, 'first-roads');
  assert.deepEqual(INTRO_MISSIONS.map(m => m.id), ['first-watch', 'forked-road']);
  assert.deepEqual(Object.keys(MAPS), ['classic', 'long-march', 'twin-span'], 'intro geometry is not a fresh-skirmish picker choice');
  for (const [index, mission] of INTRO_MISSIONS.entries()) {
    const game = createCampaignMission(mission.id), snapshot = game.serialize();
    assert.equal(getCampaignMission(mission.id), mission);
    assert.equal(mission.optional, true);
    assert.equal(snapshot.version, 3);
    assert.equal(snapshot.rulesetId, 'frontier-legacy');
    assert.equal(snapshot.rulesetRevision, 1);
    assert.equal(snapshot.mapId, mission.mapId);
    assert.equal(snapshot.mapRevision, 1);
    assert.deepEqual(game.map.lanes, index === 0 ? [450] : [340, 560]);
    assert.equal(game.map.width, 3200); assert.equal(game.map.height, 900);
    assert.equal(game.map.buildLimit, (index + 1) * 8);
    assert.equal(game.ai, false);
    assert.equal(game.state.gold[0], mission.startingGold);
    assert.equal(game.state.buildings.filter(b => b.side === 0).length, 0);
    assert.equal(game.state.buildings.filter(b => b.side === 1).length, index + 1);
    assert.equal(game.state.stats.built[0], 0);
    assert.deepEqual(Game.restore(snapshot).serialize(), snapshot);
    assert.equal(game.build('wardenLodge', 970, game.map.lanes[0]).ok, false);
  }
  for (const id of ['', null, [], {}, '__proto__', 'emberwatch']) assert.equal(isIntroMission(id), false);
});

test('fresh players get an intro recommendation, while old records and campaign completion stay unchanged', () => {
  const fresh = createCampaignProgress(), overview = getCampaignOverview(fresh);
  assert.equal(overview.nextMissionId, 'emberwatch');
  assert.equal(overview.total, 16); assert.equal(overview.maxStars, 48);
  assert.equal(overview.introduction.nextMissionId, 'first-watch');
  assert.equal(overview.introduction.recommended, true);
  assert.equal(overview.introduction.total, 2); assert.equal(overview.introduction.maxStars, 6);
  assert.equal(isMissionUnlocked(fresh, 'first-watch'), true);
  assert.equal(isMissionUnlocked(fresh, 'forked-road'), false);
  assert.equal(isMissionUnlocked(fresh, 'emberwatch'), true, 'intro is not a new main-campaign prerequisite');
  const legacy = createCampaignProgress();
  for (const mission of CAMPAIGN_MISSIONS)
    legacy.missions[mission.id] = { completed: true, stars: 3, bestTime: mission.timeLimit - .1 };
  const bytes = JSON.stringify(legacy), normalized = normalizeCampaignProgress(legacy), old = getCampaignOverview(normalized);
  assert.equal(JSON.stringify(normalized), bytes, 'late but valid historical best times survive');
  assert.equal(old.completed, true); assert.equal(old.cleared, 16); assert.equal(old.stars, 48);
  assert.equal(old.introduction.completed, false); assert.equal(old.introduction.stars, 0);
  assert.equal(old.introduction.recommended, false, 'do not send an experienced profile back through introductions');
  assert.deepEqual(CAMPAIGN_MISSIONS[0].prerequisites, []);
});

test('intro records merge independently and never fabricate lessons or reduce a prior best', () => {
  let progress = recordCampaignResult(createCampaignProgress(), 'first-watch', coreWin('first-watch'));
  assert.equal(progress.missions['first-watch'].stars, 1, 'core-only fixture earns no building star');
  assert.equal(isMissionUnlocked(progress, 'forked-road'), true);
  assert.equal(getCampaignOverview(progress).introduction.nextMissionId, 'forked-road');
  const { game, outcome } = run(INTRO_MISSIONS[1]);
  assert.equal(outcome.stars, 3);
  progress = recordCampaignResult(progress, 'forked-road', game);
  const legacy = recordCampaignResult(createCampaignProgress(), 'emberwatch', coreWin('emberwatch'));
  const combined = mergeCampaignProgress(legacy, progress);
  assert.ok(combined.missions.emberwatch);
  assert.equal(combined.missions['forked-road'].stars, 3);
  assert.equal(getCampaignOverview(combined).introduction.completed, true);
  const replay = coreWin('forked-road'); replay.state.time = game.state.time + 1;
  assert.deepEqual(recordCampaignResult(combined, 'forked-road', replay), combined);
  assert.equal(normalizeCampaignProgress({ ...createCampaignProgress(), missions: { 'forked-road': progress.missions['forked-road'] } }).missions['forked-road'], undefined);
});

test('all six optional stars have paid routes with a late start, five-second decisions and repeated restore', () => {
  for (const mission of INTRO_MISSIONS) for (const [seed, startDelay] of [[mission.seed, 10], [57, 10], [999, 10], [mission.seed, 30]]) {
    const actions = [];
    const { game, outcome } = run(mission, {
      seed, startDelay,
      restore: data => Game.restore(data),
      onAction: action => actions.push({ time: action.time, cost: action.cost, gold: action.game.state.gold[0] }),
    });
    assert.equal(outcome.completed, true, `${mission.id}/${seed}: ${outcome.label}`);
    assert.equal(outcome.stars, 3, `${mission.id}/${seed}: ${outcome.medals.filter(m => !m.earned).map(m => m.label)}`);
    assert.ok(game.state.time < 150, `${mission.id} remains a short opening`);
    assert.ok(game.state.bases[0].hp > 5000, 'deliberate beginner route tolerates reading time');
    assert.ok(actions.length >= 4 && actions.every(a => a.cost > 0 && a.gold >= 0));
    assert.ok(actions.every((a, i) => i === 0 || a.time - actions[i - 1].time >= 4.99));
    assert.ok(actions[0].time >= startDelay);
    assert.deepEqual(Game.restore(game.serialize()).serialize(), game.serialize());
  }
});

test('a late off-seed recovery remains a win without granting stars for the lost road and mine', () => {
  const { game, outcome } = run(INTRO_MISSIONS[1], { seed: 999, startDelay: 30, restore: data => Game.restore(data) });
  assert.equal(outcome.completed, true);
  assert.equal(outcome.stars, 1);
  assert.equal(game.state.bases[1].hp, 0);
  assert.ok(outcome.medals.every(m => !m.earned));
});

test('a paid tower alternative works, and a faster no-mine win never claims the income star', () => {
  const warriors = run(INTRO_MISSIONS[0], { policy: introReferencePolicy('first-watch', { ranged: false }) });
  assert.equal(warriors.outcome.completed, true); assert.equal(warriors.outcome.stars, 2);
  assert.equal(warriors.outcome.medals.find(m => m.id === 'ranged-support').earned, false);
  const mission = INTRO_MISSIONS[1];
  const tower = run(mission, { policy: introReferencePolicy(mission.id, { tower: true }) });
  assert.equal(tower.outcome.completed, true); assert.equal(tower.outcome.stars, 3);
  const noMine = run(mission, { policy: introReferencePolicy(mission.id, { mine: false }) });
  assert.equal(noMine.outcome.completed, true); assert.equal(noMine.outcome.stars, 2);
  assert.equal(noMine.outcome.medals.find(m => m.id === 'working-mine').earned, false);
  assert.ok(noMine.game.state.time < tower.game.state.time);
});

test('shared save admission preserves intro identity, checks unlocks and rejects mismatched scenarios', () => {
  const progress = recordCampaignResult(createCampaignProgress(), 'first-watch', coreWin('first-watch'));
  for (const mission of INTRO_MISSIONS) {
    const game = createCampaignMission(mission.id);
    assert.equal(game.build('barracks', 970, game.map.lanes[0]).ok, true);
    for (let i = 0; i < 100; i++) game.update(.05);
    const envelope = encodeBattle(game, { kind: 'campaign', id: mission.id, revision: 1 }, { campaignProgress: progress });
    assert.equal(envelope.version, 3);
    assert.equal(envelope.scenario.id, mission.id);
    const restored = decodeBattle(envelope, { campaignProgress: progress });
    assert.deepEqual(restored.game.serialize(), game.serialize());
    assert.deepEqual(getCampaignTargets(restored.game, mission.id), getCampaignTargets(game, mission.id));
    const future = structuredClone(envelope); future.scenario.revision = 2;
    assert.throws(() => decodeBattle(future, { campaignProgress: progress }), /scenario version/);
    const mismatch = structuredClone(envelope); mismatch.scenario.id = 'emberwatch';
    assert.throws(() => decodeBattle(mismatch, { campaignProgress: progress }), /battlefield/);
    const wrongRules = structuredClone(envelope); wrongRules.game.rulesetId = 'frontier-rootwarden-timed';
    assert.throws(() => decodeBattle(wrongRules, { campaignProgress: progress }), /scenario rules/);
    if (mission.id === 'forked-road') assert.throws(() => decodeBattle(envelope), /locked/);
  }
});

test('idle and mine-only decisions do not clear an introductory battle', () => {
  for (const mission of INTRO_MISSIONS) for (const policy of [() => {}, introMinesOnlyPolicy]) {
    const { outcome } = run(mission, { policy });
    assert.equal(outcome.completed, false, mission.id);
    assert.equal(outcome.failed, true, mission.id);
    assert.equal(outcome.stars, 0);
  }
});

test('early core victories count without pretending missing learning actions happened', () => {
  for (const mission of INTRO_MISSIONS) {
    const game = createCampaignMission(mission.id);
    game.state.bases[1].hp = 0;
    const result = evaluateCampaignMission(game, mission.id);
    assert.equal(result.completed, true); assert.equal(result.failed, false); assert.equal(result.stars, 1);
    assert.ok(result.medals.every(m => m.earned === false));
    game.state.bases[0].hp = 0;
    assert.equal(evaluateCampaignMission(game, mission.id).completed, false, 'simultaneous defeat still takes precedence');
  }
});

test('marked targets keep their original IDs through saves, destruction and paid replacement', () => {
  for (const mission of INTRO_MISSIONS) {
    let game = createCampaignMission(mission.id);
    const targets = getCampaignTargets(game, mission.id);
    assert.ok(targets.every(t => t.originalId === t.building.id));
    for (let i = 0; i < 200; i++) game.update(.05);
    game = Game.restore(game.serialize());
    assert.deepEqual(getCampaignTargets(game, mission.id).map(t => t.originalId), targets.map(t => t.originalId));
    const first = targets[0];
    game.state.buildings = game.state.buildings.filter(b => b.id !== first.originalId);
    // Wait for the normal enemy treasury to fund a replacement, without editing gold.
    for (let i = 0; i < 400; i++) game.update(.05);
    const replacement = game.build(first.type, first.x, game.map.lanes[first.lane], 1);
    assert.equal(replacement.ok, true); assert.notEqual(replacement.building.id, first.originalId);
    const restored = Game.restore(game.serialize());
    assert.equal(getCampaignTargets(restored, mission.id)[0].building, null);
    assert.equal(evaluateCampaignMission(restored, mission.id).progress, 1 / targets.length);
    assert.throws(() => getCampaignTargets(new Game({ ai: false }), mission.id), /battlefield mismatch/);
  }
});

test('a mid-battle restore keeps future simulation, learning stars and target observations identical', () => {
  for (const mission of INTRO_MISSIONS) {
    const a = createCampaignMission(mission.id), policy = introReferencePolicy(mission.id);
    for (let tick = 0; tick < 700; tick++) { if (tick >= 200 && tick % 100 === 0) policy(a); a.update(.05); }
    a.update(.017);
    const b = Game.restore(a.serialize());
    for (let tick = 0; tick < 300; tick++) { a.update(.05); b.update(.05); }
    assert.deepEqual(b.serialize(), a.serialize());
    assert.deepEqual(evaluateCampaignMission(b, mission.id), evaluateCampaignMission(a, mission.id));
  }
});
