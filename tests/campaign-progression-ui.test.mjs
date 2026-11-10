import test from 'node:test';
import assert from 'node:assert/strict';
import { runInContext } from 'node:vm';
import { Game, BUILDINGS, getRuleset, getMap, buildBounds } from '../dist/engine.js';
import * as campaign from '../dist/campaign.js';
import { createCodex, formatNumber, formatSeconds } from '../dist/codex.js';
import { getMissionScouting, renderMissionScouting } from '../dist/scouting.js';
import { encodeBattle, decodeBattle, scenarioForBattle, identityOf } from '../dist/battle-codec.js';
import { createBackup, parseBackup, BACKUP_STORAGE_KEYS as K } from '../dist/backup.js';
import { createStorage } from '../dist/persistence.js';
import { advanceObjectiveBattle } from '../dist/objectives.js';
import { missionBriefing } from '../dist/campaign-presentation.js';
import { startupHarness } from './mobile-startup-fixture.mjs';
import { onboardingReferencePolicy } from './onboarding-campaign-policies.mjs';

const record = { completed: true, stars: 1, bestTime: 60 };
const plain = value => JSON.parse(JSON.stringify(value));
function progress(count = 0) {
  const result = campaign.createCampaignProgress();
  for (const mission of campaign.ONBOARDING_MISSIONS.slice(0, count)) result.missions[mission.id] = { ...record };
  return result;
}
const returning = () => ({ ...progress(), missions: { emberwatch: { ...record } } });
const cardTypes = h => h.$('buildCards').children.map(card => card.dataset.type);
const visibleCards = h => h.$('buildCards').children.filter(card => !card.classList.contains('hidden')).map(card => card.dataset.type);
const codexUnits = h => [...h.$('unitCodex').innerHTML.matchAll(/data-codex-unit="([^"]+)"/g)].map(match => match[1]);
const codexStructures = h => [...h.$('structureCodex').innerHTML.matchAll(/data-codex-structure="([^"]+)"/g)].map(match => match[1]);

/** Actual app function bodies and real rules/codecs, with a deliberately small DOM.
 * No rendering, touch, accessibility-tree, native focus or browser claim is made.
 * The backup bridge removes only Node VM prototype boundaries, not any payload data.
 */
function uiHarness({ campaignProgress = progress(), width = 390, height = 650 } = {}) {
  const h = startupHarness({ width, height }), { c, $ } = h;
  const section = (from, to) => {
    const start = h.source.indexOf(from), end = h.source.indexOf(to, start);
    assert.ok(start >= 0 && end > start, `actual source section: ${from}`);
    return h.source.slice(start, end);
  };
  const data = new Map([[K.campaign, JSON.stringify(campaignProgress)]]);
  const log = { downloads: [], notices: [], history: [], writes: [], removals: 0 };
  const raw = {
    getItem: key => data.get(key) ?? null,
    setItem(key, value) { log.writes.push([key, value]); data.set(key, value); },
    removeItem(key) { log.writes.push([key, null]); data.delete(key); },
  };
  const storage = createStorage(() => raw);
  Object.assign(c, campaign, {
    CAMPAIGN_MISSIONS: campaign.CAMPAIGN_PROGRESS_MISSIONS,
    CAMPAIGN_CHAPTERS: [campaign.ONBOARDING_CHAPTER, ...campaign.ALL_CAMPAIGN_CHAPTERS, campaign.SHARED_CROSSING_CHAPTER],
    getCampaignOverview: campaign.getProgressionCampaignOverview,
    campaignProgress, selectedCampaign: campaign.CAMPAIGN_PROGRESS_MISSIONS[0].id,
    selectedChapter: null, mode: 'campaign', labels: {}, campaignPage: 'mission', briefingMission: null, missionBriefing,
    createCodex, formatNumber, formatSeconds, getRuleset, getMap, renderMissionScouting,
    drawUnitPortrait() {}, renderChallenge() {}, updateResume() {}, keepDialogFocus() {},
    buildBounds, encodeBattle, decodeBattle, scenarioForBattle, identityOf,
    finishBattleReport() {}, retryHistorySave() {}, trialRecords: {}, progressDirty: false,
    historySession: { retain: row => log.history.push(plain(row)), pendingCount: () => 0 },
    preferenceSession: { dirty: () => false }, profileSession: { status: () => ({ canWrite: true }) },
    localStorage: raw, storage, preferences: {}, TRIALS: K.trials, SAVE: K.battle,
    createBackup: (target, options) => createBackup(target, plain(options)),
    downloadBackup: text => log.downloads.push(text), toast: text => log.notices.push(text),
  });
  Object.assign(c.battleSession, {
    remove() { log.removals++; return true; }, isCurrent: () => true,
    captureResult: () => ({ remove() { log.removals++; }, status: 'current' }),
  });
  c.renderer.scale = 1;
  c.renderer.snap = point => point;
  for (const [from, to] of [
    ['const initialOverview =', 'let trialRecords ='],
    ['const labels =', 'const profileSession ='],
    ['function populateFieldGuide(', 'const viewportPause ='],
    ['function populateBuildCards()', 'function canInteract()'],
    ['function selectBuild(', 'function cancel()'],
    ['function activateBattlePoint(', 'function resetBattleGesture()'],
    ['function showCampaignPage(', 'setMode(mode);'],
    ['function setMode(', 'function updateSkirmishRules()'],
    ["$('start').onclick =", 'function persistProgress()'],
    ['function persistProgress()', 'function save()'],
    ['function updateResume()', '\nupdateResume();'],
    ['function finish()', 'let pointer ='],
    ["$('exportBackup').onclick =", "$('importBackup').onclick ="],
  ]) runInContext(section(from, to), c);
  return { ...h, data, storage, raw, uiLog: log };
}

function launch(h, id = h.c.selectedCampaign) {
  h.c.mode = 'campaign'; h.c.selectedCampaign = id; h.c.selectedChapter = campaign.getCampaignMission(id).chapterId;
  h.c.renderCampaign(); h.$('start').onclick();
}
function injectResultBoundary(h) {
  // Deliberate result-boundary fixture, not evidence of a playable strategy.
  h.c.game.state.bases[1].hp = 0;
  h.c.objectiveOutcome = campaign.evaluateCampaignMission(h.c.game, h.c.currentCampaign);
  assert.equal(h.c.objectiveOutcome.completed, true);
  h.c.finish();
}

test('fresh title, briefing, real start, deck and field guide agree on the two-building opening', () => {
  const h = uiHarness(); h.c.renderCampaign();
  assert.equal(h.c.selectedCampaign, 'roadside-watch');
  assert.equal(h.$('campaignMissionTitle').textContent, 'Roadside Watch');
  assert.equal(h.$('campaignCount').textContent, '37');
  assert.match(h.$('campaignIntroProgressText').textContent, /2\/8 buildings/);
  assert.equal(h.$('start').disabled, false);
  assert.equal(h.$('skipIntroduction').classList.contains('hidden'), true);
  assert.deepEqual(h.$('campaignChapters').children.map(node => node.dataset.chapter), ['opening-roads', ...campaign.CAMPAIGN_CHAPTERS.map(chapter => chapter.id), campaign.SHARED_CROSSING_CHAPTER.id, campaign.UNLIT_ROADS_CHAPTER.id, campaign.SIEGE_COAST_CHAPTER.id, campaign.BROKEN_LINE_CHAPTER.id]);
  assert.match(h.$('campaignBriefing').innerHTML, /^<li>Available here: Barracks, Archery range\.<\/li>/);
  assert.deepEqual(codexUnits(h), ['warrior', 'archer']);
  assert.deepEqual(codexStructures(h), []);
  h.$('start').onclick();
  assert.equal(h.c.currentCampaign, 'roadside-watch');
  assert.equal(h.c.game.ruleset.id, 'frontier-campaign-citadel-watch');
  assert.deepEqual(cardTypes(h), ['barracks', 'archery']);
  assert.deepEqual(visibleCards(h), ['barracks', 'archery']);
  assert.equal(h.$('allBuildings').classList.contains('hidden'), true);
  assert.equal(h.$('buildingKeyHelp').textContent, 'Barracks: 1 · Archery range: 2');
  assert.match(h.$('coachText').textContent, /Barracks|barracks/);
  assert.equal(h.c.paused, false);
});

test('opening locked mission clicks cannot launch or charge; hidden expansion cannot bypass engine roster', () => {
  const h = uiHarness(); h.c.renderCampaign();
  h.$('campaignMissions').children.find(node => node.dataset.mission === 'shield-at-the-fork').onclick();
  assert.equal(h.$('start').disabled, true);
  assert.match(h.$('campaignUnlock').textContent, /Complete Roadside Watch/);
  const untouched = h.c.game.serialize(); h.$('start').onclick();
  assert.equal(h.c.started, false); assert.deepEqual(h.c.game.serialize(), untouched); assert.equal(h.log.claims, 0);
  launch(h, 'roadside-watch');
  const before = h.c.game.serialize(); h.$('allBuildings').onclick();
  assert.deepEqual(cardTypes(h), ['barracks', 'archery']);
  assert.deepEqual(visibleCards(h), ['barracks', 'archery']);
  for (const type of ['watchtower', 'mint', 'wardenLodge', 'foundry', 'sanctum', 'aerie']) {
    h.c.selectBuild(type); assert.equal(h.c.ui.build, null);
    assert.equal(h.c.game.canBuild(type, 550, 450).ok, false);
    assert.equal(h.c.game.build(type, 550, 450).ok, false);
    assert.deepEqual(h.c.game.serialize(), before, `${type} may not spend, place, or change a save`);
  }
});

test('actual Continue walks the 2 → 5 → 8 opening, records wins once and separates earned rewards from replay', () => {
  const h = uiHarness();
  for (const [index, id] of ['roadside-watch', 'shield-at-the-fork', 'open-three-roads'].entries()) {
    launch(h, id);
    assert.equal(cardTypes(h).length, [2, 5, 8][index]);
    assert.equal(h.$('allBuildings').classList.contains('hidden'), true);
    assert.deepEqual(cardTypes(h), Object.keys(h.c.game.buildings));
    assert.deepEqual(codexUnits(h), Object.keys(h.c.game.units));
    injectResultBoundary(h);
    const earned = h.$('resultObjectives').children.filter(node => node.classList.contains('campaign-earned'));
    assert.equal(earned.length, index < 2 ? 1 : 0);
    if (index === 0) assert.match(earned[0].textContent, /Warden lodge.*Gold mine.*Watchtower|Watchtower.*Gold mine.*Warden lodge/);
    if (index === 1) assert.match(earned[0].textContent, /Foundry|Siege foundry/);
    const records = plain(h.c.campaignProgress), historyCount = h.uiLog.history.length;
    h.c.finish(); assert.deepEqual(h.c.campaignProgress, records); assert.equal(h.uiLog.history.length, historyCount);
    h.$('playAgain').onclick();
    assert.equal(h.c.selectedCampaign, ['shield-at-the-fork', 'open-three-roads', 'emberwatch'][index]);
    assert.equal(h.c.started, false); assert.equal(h.$('welcome').classList.contains('hidden'), false);
  }
  h.$('start').onclick(); assert.equal(h.c.currentCampaign, 'emberwatch');
  assert.equal(campaign.campaignScenarioForGame(h.c.game, 'emberwatch').revision, 5);
  assert.equal(cardTypes(h).length, 8);
  launch(h, 'roadside-watch'); injectResultBoundary(h);
  assert.equal(h.$('resultObjectives').children.some(node => node.classList.contains('campaign-earned')), false);
  assert.match(h.$('campaignIntroProgressText').textContent, /8\/8 buildings/);
  assert.equal(h.c.campaignProgress.missions['roadside-watch'].stars, 1, 'replay may not fabricate bonus stars');
});

test('Resume preserves a two-building battle after a later unlock; deliberate replay adopts earned tier after explicit Begin', () => {
  const h = uiHarness(); launch(h);
  const before = h.c.game.serialize();
  const bytes = encodeBattle(h.c.game, scenarioForBattle(null, 'roadside-watch', h.c.game), { campaignProgress: h.c.campaignProgress });
  h.c.campaignProgress = progress(2);
  h.data.set(K.battle, JSON.stringify(bytes));
  h.c.showTitle();
  assert.equal(h.$('resumeSaved').classList.contains('hidden'), false);
  assert.match(h.$('resumeSaved').textContent, /ROADSIDE WATCH/);
  h.$('resumeSaved').onclick();
  assert.deepEqual(h.c.game.serialize(), before);
  assert.deepEqual(cardTypes(h), ['barracks', 'archery']);
  assert.deepEqual(codexUnits(h), ['warrior', 'archer']);
  assert.equal(h.$('allBuildings').classList.contains('hidden'), true);
  injectResultBoundary(h); assert.equal(h.c.objectiveOutcome.stars, 1);
  assert.equal(h.$('replayMission').classList.contains('hidden'), false);
  const earned=JSON.stringify(h.c.campaignProgress);
  h.$('replayMission').onclick();
  assert.equal(h.c.started,false);assert.equal(h.c.selectedCampaign,'roadside-watch');
  assert.equal(JSON.stringify(h.c.campaignProgress),earned);
  h.$('start').onclick();
  assert.equal(h.c.currentCampaign, 'roadside-watch');
  assert.equal(h.c.game.ruleset.id, 'frontier-campaign-citadel-open');
  assert.equal(cardTypes(h).length, 8);
  assert.deepEqual(codexUnits(h), Object.keys(h.c.game.units));
});

test('returning main progress keeps full roster; legacy-intro-only records retain stars without skipping new opening', () => {
  const old = returning(), h = uiHarness({ campaignProgress: old }); h.c.renderCampaign();
  assert.equal(h.c.selectedCampaign, 'three-roads');
  assert.match(h.$('campaignIntroProgressText').textContent, /8\/8 buildings.*earlier campaign progress/);
  launch(h); assert.equal(h.c.game.ruleset.id, 'frontier-campaign-citadel-open');
  assert.equal(cardTypes(h).length, 8); assert.deepEqual(h.c.campaignProgress, old);
  const introOnly = { ...progress(), missions: { 'first-watch': { ...record, stars: 2 }, 'forked-road': { ...record } } };
  const intro = uiHarness({ campaignProgress: introOnly }); intro.c.renderCampaign();
  assert.equal(intro.c.selectedCampaign, 'roadside-watch');
  assert.match(intro.$('campaignIntroProgressText').textContent, /2\/8 buildings.*Legacy lessons: 3\/6 stars retained/);
  assert.ok(intro.$('campaignChapters').children.some(node => node.dataset.chapter === 'first-roads'));
  launch(intro); assert.deepEqual(cardTypes(intro), ['barracks', 'archery']);
  assert.deepEqual(intro.c.campaignProgress, introOnly);
});

test('restored legacy main mission retries and replays legacy identity without roster reinterpretation', () => {
  const h = uiHarness({ campaignProgress: returning() });
  const legacy = campaign.createCampaignMission('emberwatch'), before = legacy.serialize();
  h.c.start(legacy, null, 'emberwatch');
  assert.deepEqual(h.c.game.serialize(), before); assert.deepEqual(cardTypes(h), Object.keys(BUILDINGS));
  assert.equal(h.c.game.ruleset.id, 'frontier-legacy');
  h.c.objectiveOutcome = { failed: true }; h.$('playAgain').onclick();
  assert.equal(h.c.started,false); h.$('start').onclick();
  assert.equal(h.c.game.ruleset.id, 'frontier-legacy'); assert.deepEqual(h.c.game.serialize(), before);
  h.c.game.state.time=101; // Miss the speed medal so the optional Replay CTA is eligible.
  injectResultBoundary(h);assert.equal(h.c.objectiveOutcome.stars,2);h.$('replayMission').onclick();
  assert.equal(h.c.started,false);h.$('start').onclick();assert.deepEqual(h.c.game.serialize(),before);
  assert.equal(h.c.game.ruleset.id, 'frontier-legacy'); assert.deepEqual(cardTypes(h), Object.keys(BUILDINGS));
});

test('briefing, scouting and field guide match the launch roster and reject a mismatched scout context', () => {
  for (const count of [0, 1, 2, 3]) {
    const p = progress(count), id = ['roadside-watch', 'shield-at-the-fork', 'open-three-roads', 'emberwatch'][count];
    const h = uiHarness({ campaignProgress: p }); h.c.selectedCampaign = id; h.c.renderCampaign();
    const mission = campaign.getCampaignLaunchMission(id, p), game = campaign.createProgressionCampaignMission(id, p);
    const before = game.serialize(), scout = getMissionScouting(mission, game);
    assert.deepEqual(scout.armies[1].buildings.map(b => [b.type, b.x, b.lane, b.level]), game.state.buildings.filter(b => b.side === 1).sort((a, b) => a.lane - b.lane || a.x - b.x).map(b => [b.type, b.x, b.lane, b.level]));
    assert.equal(h.$('campaignScoutReport').innerHTML, renderMissionScouting(mission, game));
    const rosterLine = 'Available here: ' + Object.values(game.buildings).map(b => b.name).join(', ') + '.';
    assert.ok(h.$('campaignBriefing').innerHTML.startsWith(`<li>${rosterLine}</li>`));
    assert.deepEqual(codexUnits(h), Object.keys(game.units));
    assert.deepEqual(codexStructures(h), Object.entries(game.buildings).filter(([, b]) => !b.unit).map(([id]) => id));
    assert.throws(() => getMissionScouting(mission, new Game()), /does not match/);
    assert.deepEqual(game.serialize(), before);
  }
});

function exportHarness(p, id) {
  const h = uiHarness({ campaignProgress: p }); launch(h, id);
  h.$('backupIncludeBattle').checked = true;
  h.c.progressDirty = true;
  return h;
}

test('ordinary export uses the live campaign scenario identity and roundtrips lower-tier ongoing saves', () => {
  for (const [p, id] of [[progress(), 'roadside-watch'], [progress(1), 'shield-at-the-fork'], [progress(3), 'emberwatch'], [returning(), 'emberwatch']]) {
    const h = exportHarness(p, id), before = h.c.game.serialize();
    h.$('exportBackup').onclick(); assert.equal(h.uiLog.downloads.length, 1, h.$('backupStatus').textContent);
    const parsed = parseBackup(h.uiLog.downloads[0]);
    assert.deepEqual(parsed.data.battle.scenario, scenarioForBattle(null, id, h.c.game));
    assert.deepEqual(decodeBattle(parsed.data.battle, { campaignProgress: parsed.data.campaign }).game.serialize(), before);
    assert.deepEqual(parsed.data.campaign, p); assert.equal(h.uiLog.writes.length, 0);
  }
  const h = exportHarness(progress(), 'roadside-watch'), before = h.c.game.serialize();
  h.c.campaignProgress = progress(2); h.data.set(K.campaign, JSON.stringify(progress(2)));
  h.$('exportBackup').onclick(); assert.equal(h.uiLog.downloads.length, 1, h.$('backupStatus').textContent);
  const parsed = parseBackup(h.uiLog.downloads[0]);
  const restored = decodeBattle(parsed.data.battle, { campaignProgress: parsed.data.campaign }).game;
  assert.deepEqual(restored.serialize(), before); assert.equal(Object.keys(restored.buildings).length, 2);
});

test('ordinary export refuses unsafe stored campaign bytes or unsupported in-memory battle without replacing anything', () => {
  const unknown = { ...progress(), missions: { 'future-lesson': { ...record } } };
  for (const bytes of ['{broken', JSON.stringify({ ...progress(), version: 99 }), JSON.stringify(unknown), JSON.stringify({ ...progress(), missions: { 'shield-at-the-fork': { ...record } } })]) {
    const h = exportHarness(progress(), 'roadside-watch'); h.data.set(K.campaign, bytes);
    const before = [...h.data], battle = h.c.game.serialize(); h.$('exportBackup').onclick();
    assert.equal(h.uiLog.downloads.length, 0); assert.match(h.$('backupStatus').textContent, /Stored campaign progress cannot be read safely/);
    assert.deepEqual([...h.data], before); assert.deepEqual(h.c.game.serialize(), battle); assert.equal(h.uiLog.writes.length, 0);
  }
  const denied = exportHarness(progress(), 'roadside-watch');
  denied.c.storage = { read: () => ({ ok: false, value: null }) }; denied.$('exportBackup').onclick();
  assert.equal(denied.uiLog.downloads.length, 0); assert.match(denied.$('backupStatus').textContent, /cannot be read safely/);
  const invalid = exportHarness(progress(), 'roadside-watch'), before = [...invalid.data];
  invalid.c.game.state.buildings[0].type = 'unknown'; invalid.$('exportBackup').onclick();
  assert.equal(invalid.uiLog.downloads.length, 0); assert.doesNotMatch(invalid.$('backupStatus').textContent, /download started/);
  assert.deepEqual([...invalid.data], before); assert.equal(invalid.uiLog.writes.length, 0);
});

test('paid UI commands win all three lessons, restore midbattle, and Continue starts automatic-air Emberwatch', () => {
  const h = uiHarness(); h.c.renderCampaign();
  const paid = [];
  // A test player drives real card-click, placement, selection and upgrade handlers.
  // It cannot add gold, inject damage, spawn troops or alter the engine clock.
  const player = {
    get state() { return h.c.game.state; }, get map() { return h.c.game.map; },
    build(type, x, y) {
      h.c.cancel();
      const card = h.$('buildCards').children.find(node => node.dataset.type === type);
      assert.ok(card, `${type} has a real roster card`);
      const beforeGold = h.c.game.state.gold[0], beforeCount = h.c.game.state.buildings.length;
      card.click();
      if (h.c.ui.build !== type) return { ok: false };
      h.c.activateBattlePoint({ x, y });
      const building = h.c.game.state.buildings.find(b => b.side === 0 && b.type === type && b.x === x && b.y === y);
      if (h.c.game.state.buildings.length === beforeCount) return { ok: false };
      assert.ok(building); assert.equal(h.c.game.state.gold[0], beforeGold - h.c.game.buildings[type].cost);
      paid.push({ mission: h.c.currentCampaign, kind: 'build', type, time: h.c.game.state.time });
      return { ok: true, building };
    },
    upgrade(id) {
      h.c.cancel();
      const building = h.c.game.state.buildings.find(b => b.id === id), beforeLevel = building.level;
      const beforeGold = h.c.game.state.gold[0], cost = h.c.game.upgradeCost(building);
      h.c.activateBattlePoint({ x: building.x, y: building.y });
      assert.equal(h.c.ui.selected, id); h.$('upgrade').click();
      if (building.level === beforeLevel) return { ok: false };
      assert.equal(h.c.game.state.gold[0], beforeGold - cost);
      paid.push({ mission: h.c.currentCampaign, kind: 'upgrade', type: building.type, time: h.c.game.state.time });
      return { ok: true, building };
    },
  };
  for (const [index, mission] of campaign.ONBOARDING_MISSIONS.entries()) {
    assert.equal(h.c.selectedCampaign, mission.id); h.$('start').onclick();
    assert.equal(cardTypes(h).length, [2, 5, 8][index]);
    const policy = onboardingReferencePolicy(mission.id); let nextAction = 10, restored = false;
    for (let frame = 0; frame < (mission.timeLimit + 1) * 4 && !h.c.objectiveOutcome?.completed && !h.c.objectiveOutcome?.failed; frame++) {
      if (h.c.game.state.time + 1e-8 >= nextAction) { policy(player); nextAction += 5; h.c.updateHUD(); }
      if (!restored && h.c.game.state.time >= 30) {
        const before = h.c.game.serialize();
        h.$('backupIncludeBattle').checked = true; h.$('exportBackup').onclick();
        assert.equal(h.uiLog.downloads.length, index + 1, h.$('backupStatus').textContent);
        const backup = parseBackup(h.uiLog.downloads.at(-1));
        const resumed = decodeBattle(backup.data.battle, { campaignProgress: backup.data.campaign }).game;
        h.c.start(resumed, null, mission.id); assert.deepEqual(h.c.game.serialize(), before);
        assert.equal(cardTypes(h).length, [2, 5, 8][index]); restored = true;
      }
      const outcome = advanceObjectiveBattle(h.c.game, .25, game => campaign.evaluateCampaignMission(game, mission.id), mission.timeLimit);
      if (outcome.completed || outcome.failed) h.c.objectiveOutcome = outcome;
    }
    assert.equal(restored, true); assert.equal(h.c.objectiveOutcome?.completed, true, `${mission.id}: ${h.c.objectiveOutcome?.label}`);
    assert.ok(h.c.game.state.time > 30 && h.c.game.state.time <= mission.timeLimit);
    h.c.finish();
    assert.equal(h.$('resultTitle').textContent, 'MISSION COMPLETE');
    assert.equal(h.c.campaignProgress.missions[mission.id].completed, true);
    assert.ok(h.uiLog.history.at(-1).identity.scenario.id === mission.id);
    assert.ok(paid.some(action => action.mission === mission.id && action.kind === 'build'));
    assert.ok(paid.some(action => action.mission === mission.id && action.kind === 'upgrade'));
    h.$('playAgain').onclick();
  }
  assert.equal(h.c.selectedCampaign, 'emberwatch'); h.$('start').onclick();
  assert.equal(cardTypes(h).length, 8);
  assert.deepEqual(scenarioForBattle(null, 'emberwatch', h.c.game), { kind: 'campaign', id: 'emberwatch', revision: 5 });
  assert.equal(h.uiLog.history.length, 3);
});

// These execute the real presentation functions against HTML ancestry, not a
// browser. Native focus, scroll geometry and touch remain browser QA work.
test('Story → Chapter → Mission moves focus, folds only new briefings, and keeps a fresh profile unchanged', () => {
  const h = uiHarness(); h.c.renderCampaign();
  const before = [...h.data], state = h.c.game.serialize();
  const hidden = id => h.$(id).classList.contains('hidden');
  const choose = (list, key, value) => h.$(list).children.find(node => node.dataset[key] === value).click();
  assert.equal(hidden('campaignMissionPage'), false);
  assert.equal(hidden('campaignStoryPage'), true); assert.equal(hidden('campaignChapterPage'), true);
  assert.equal(h.$('campaignGoal').textContent, missionBriefing(campaign.ONBOARDING_MISSIONS[0]).goal);
  h.$('campaignConfig').scrollTop = 170;
  h.$('campaignStoryNav').click();
  assert.equal(h.c.document.activeElement.id, 'campaignStoryTitle');
  assert.equal(h.$('campaignConfig').scrollTop, 0);
  assert.equal(h.$('campaignStoryNav').attributes['aria-current'], 'page');
  assert.equal(hidden('campaignChapterNav'), true); assert.equal(hidden('campaignMissionPosition'), true);
  assert.equal(hidden('start'), true); assert.equal(hidden('campaignStoryPage'), false);
  assert.deepEqual(h.$('campaignChapters').children.map(n => n.dataset.chapter), ['opening-roads', ...campaign.CAMPAIGN_CHAPTERS.map(c => c.id), campaign.SHARED_CROSSING_CHAPTER.id, campaign.UNLIT_ROADS_CHAPTER.id, campaign.SIEGE_COAST_CHAPTER.id, campaign.BROKEN_LINE_CHAPTER.id]);
  choose('campaignChapters', 'chapter', 'opening-roads');
  assert.equal(h.c.document.activeElement.id, 'campaignChapterTitle');
  assert.equal(h.$('campaignChapterNav').attributes['aria-current'], 'page');
  assert.equal(h.$('campaignStoryNav').attributes['aria-current'], undefined);
  assert.equal(h.$('campaignChapterLabel').textContent, 'START HERE');
  assert.equal(hidden('start'), true);
  choose('campaignMissions', 'mission', 'shield-at-the-fork');
  assert.equal(h.c.document.activeElement.id, 'campaignMissionTitle');
  assert.equal(h.$('campaignMissionPosition').textContent, 'Mission 2 of 3');
  assert.equal(h.$('campaignChapterNav').attributes['aria-current'], undefined);
  assert.equal(hidden('campaignMissionPosition'), false);
  assert.equal(hidden('start'), false); assert.equal(h.$('start').disabled, true);
  assert.match(h.$('campaignUnlock').textContent, /Complete Roadside Watch/);
  for (const id of ['campaignRules', 'campaignScout', 'campaignHintDetails']) h.$(id).open = true;
  h.$('campaignStoryNav').click(); h.$('campaignReturnMission').click();
  for (const id of ['campaignRules', 'campaignScout', 'campaignHintDetails']) assert.equal(h.$(id).open, true);
  h.$('campaignPrevious').click();
  for (const id of ['campaignRules', 'campaignScout', 'campaignHintDetails']) assert.equal(h.$(id).open, false);
  assert.equal(h.$('start').disabled, false); assert.equal(h.$('campaignPrevious').disabled, true);
  assert.deepEqual([...h.data], before); assert.deepEqual(h.c.game.serialize(), state); assert.deepEqual(h.uiLog.writes, []);
});

test('quick navigation visits all current missions in progression order, without exposing a legacy skip', () => {
  const h = uiHarness(); h.c.renderCampaign();
  const overview = campaign.getProgressionCampaignOverview(h.c.campaignProgress), before = [...h.data];
  for (const [index, mission] of overview.missions.entries()) {
    assert.equal(h.c.selectedCampaign, mission.id);
    assert.equal(h.c.selectedChapter, mission.chapterId);
    assert.equal(h.$('campaignMissionTitle').textContent, mission.name);
    assert.equal(h.$('campaignGoal').textContent, missionBriefing(mission).goal);
    assert.equal(h.$('campaignObjective').textContent, mission.objective);
    assert.equal(h.$('start').disabled, index !== 0);
    assert.equal(h.$('skipIntroduction').classList.contains('hidden'), true);
    if (mission.id === 'emberwatch') assert.match(h.$('campaignUnlock').textContent, /Complete Open Three Roads/);
    if (index < overview.missions.length - 1) h.$('campaignNext').click();
  }
  assert.equal(h.$('campaignNext').disabled, true);
  assert.deepEqual([...h.data], before); assert.deepEqual(h.uiLog.writes, []);
});

test('completed opening replay advertises the earned roster without changing stars, while returning players keep their next mission', () => {
  const h = uiHarness({ campaignProgress: progress(2) }); h.c.renderCampaign();
  h.$('campaignPrevious').click();
  assert.equal(h.c.selectedCampaign, 'shield-at-the-fork');
  assert.match(h.$('start').innerHTML, /REPLAY MISSION/);
  assert.equal(h.$('campaignMissionStatus').textContent, '★☆☆ · Complete');
  assert.match(h.$('campaignBriefing').innerHTML, /Warden lodge/);
  const before = [...h.data]; h.$('campaignStoryNav').click(); h.$('campaignReturnMission').click();
  assert.deepEqual([...h.data], before);
  h.$('start').click(); assert.equal(h.c.game.ruleset.id, 'frontier-campaign-citadel-open');
  assert.equal(cardTypes(h).length, 8);
  const old = uiHarness({ campaignProgress: returning() }); old.c.renderCampaign();
  assert.equal(old.c.selectedCampaign, 'three-roads');
  assert.equal(old.$('start').disabled, false);
  assert.equal(old.$('campaignMissionPosition').textContent, 'Mission 2 of 3');
});

test('legacy lessons remain separate, and their return action goes to the required current opening', () => {
  const p = progress(); p.missions['first-watch'] = { ...record, stars: 2 };
  const h = uiHarness({ campaignProgress: p }); h.c.renderCampaign();
  const before = [...h.data]; h.$('campaignStoryNav').click();
  h.$('campaignChapters').children.find(n => n.dataset.chapter === 'first-roads').click();
  assert.equal(h.$('campaignChapterLabel').textContent, 'LEGACY LESSONS');
  h.$('campaignMissions').children.find(n => n.dataset.mission === 'forked-road').click();
  assert.equal(h.$('start').disabled, false);
  assert.equal(h.$('skipIntroduction').classList.contains('hidden'), false);
  h.$('skipIntroduction').click();
  assert.equal(h.c.selectedCampaign, 'roadside-watch');
  assert.equal(h.c.document.activeElement.id, 'campaignMissionTitle');
  assert.deepEqual([...h.data], before); assert.equal(h.c.campaignProgress.missions['first-watch'].stars, 2);
  assert.equal(h.c.campaignProgress.missions['roadside-watch'], undefined);
});

test('mode switches restore their launch button and saved-title return resets a stale Story page to a mission', () => {
  const h = uiHarness(); h.c.renderCampaign(); h.$('campaignStoryNav').click();
  assert.equal(h.$('start').classList.contains('hidden'), true);
  h.c.setMode('skirmish'); assert.equal(h.$('start').classList.contains('hidden'), false);
  assert.match(h.$('start').innerHTML, /BEGIN SKIRMISH/);
  h.c.setMode('campaign'); assert.equal(h.$('start').classList.contains('hidden'), true);
  h.$('campaignReturnMission').click(); h.$('start').click();
  const before = h.c.game.serialize();
  // A saved battle can resume directly while the Story page is selected.
  h.c.campaignPage = 'story'; h.c.showTitle();
  assert.equal(h.c.campaignPage, 'mission');
  assert.equal(h.$('campaignMissionPage').classList.contains('hidden'), false);
  assert.equal(h.$('start').classList.contains('hidden'), false);
  assert.deepEqual(h.c.game.serialize(), before);
});
