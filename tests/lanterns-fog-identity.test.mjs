import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { Game, RULESETS, getRuleset, DEFAULT_SKIRMISH_RULESET_ID, FOG_RULESET_ID, FOG_SKIRMISH_RULESET_ID, LANTERNS_RULESET_ID } from '../dist/engine.js';
import { FOG, supportsFog, observe, observeObjectiveResult, refreshFog, validateFog } from '../dist/fog.js';
import { validateBattleIdentity, encodeBattle, decodeBattle } from '../dist/battle-codec.js';
import { validateHistoryRow } from '../dist/history-codec.js';
import { parseBackup, restoreBackup } from '../dist/backup.js';
import * as campaign from '../dist/campaign.js';
import { CURRENT_CHALLENGES } from '../dist/challenges.js';
import { TRAINING_LESSONS } from '../dist/training.js';

const clone = structuredClone;
const fresh = (options = {}) => new Game({ rulesetId: LANTERNS_RULESET_ID, ai: false, seed: 91, ...options });
const mechanics = rules => Object.fromEntries(['units', 'buildings', 'spell', 'combat', 'ai', 'economy', 'movement', 'endgame', 'limits', 'citadel'].map(key => [key, rules[key]]));
const withoutIdentity = game => { const { rulesetId, ...state } = game.serialize(); return state; };
const view = (game, side) => { const { ruleset, ...observation } = observe(game, side); return observation; };
const scenario = { kind: 'campaign', id: 'lanterns-on-the-water', revision: 1 };
const identity = () => ({ ruleset: { id: LANTERNS_RULESET_ID, revision: 1 }, map: { id: 'classic', revision: 1 }, scenario: clone(scenario) });
const record = value => ({ won: true, draw: false, difficulty: 'normal', time: 60, kills: 1, built: 2, date: '2026-11-08T00:00:00.000Z', identity: value });
function remembered() {
  const game = fresh(); game.state.time = 100; game.tick = 2000; game.state.gold = [1000, 1000];
  for (const side of [0, 1]) {
    assert.ok(game.buyCitadelOption(side ? 'regen' : 'arrows', side).ok);
    game._spawn({ type: 'aerie', side, x: side ? 300 : 2900, y: 450, lane: 1, level: 1 });
    Object.assign(game.state.units.at(-1), { x: side ? 300 : 2900, y: 450, lane: 1 });
  }
  refreshFog(game);
  for (const unit of game.state.units) unit.x = unit.side ? 2200 : 1000;
  refreshFog(game);
  assert.ok(game.state.fog.sides.every(side => side.structures.length === 1 && side.citadel !== null));
  for (const building of [...game.state.buildings]) assert.ok(game.upgrade(building.id, building.side).ok);
  return game;
}
function assertRejectsUnchanged(saved, mutations, read = Game.restore) {
  for (const mutate of mutations) {
    const bad = clone(saved); mutate(bad); const before = clone(bad);
    assert.throws(() => read(bad)); assert.deepEqual(bad, before);
  }
}

test('Lanterns adds one frozen campaign fog identity without changing any historical descriptor bytes', () => {
  assert.equal(LANTERNS_RULESET_ID, 'frontier-campaign-lanterns');
  const oldRules = Object.fromEntries(Object.entries(RULESETS).filter(([id]) => !['frontier-campaign-empty-purse','frontier-campaign-wake-reserve','frontier-campaign-shared-watch','frontier-campaign-long-screen','frontier-hammer-prototype','frontier-campaign-hammer-turns',LANTERNS_RULESET_ID, 'frontier-campaign-borrowed-ground', 'frontier-campaign-river-between','frontier-campaign-false-quiet-a','frontier-campaign-false-quiet-b','frontier-campaign-road-we-know','frontier-campaign-reed-beds','frontier-campaign-archers-quay','frontier-campaign-salt-stores'].includes(id)));
  assert.equal(createHash('sha256').update(JSON.stringify(oldRules)).digest('hex'), '7977e413ed6a0e7fde83f2af4d024c8b5e277c01c9c4e4bba67cef57d2606e1f');
  const rules = getRuleset(LANTERNS_RULESET_ID);
  assert.equal(rules.revision, 1); assert.equal(rules.campaignOnly, true);
  assert.equal(rules.skirmishOnly, undefined); assert.equal(rules.authoredOnly, undefined); assert.equal(rules.qaOnly, undefined);
  assert.deepEqual(mechanics(rules), mechanics(getRuleset('frontier-campaign-citadel-open')));
  assert.equal(Object.keys(rules.buildings).length, 8); assert.equal(rules.fog, FOG);
  assert.equal(rules.endgame.forcedDecay, false); assert.equal(rules.economy.policy, 'legacy'); assert.equal(rules.campaignControl, undefined);
  assert.ok(Object.isFrozen(rules) && Object.isFrozen(rules.fog) && Object.isFrozen(rules.buildings));
  assert.throws(() => { rules.fog.flyerRadius = 999; }, TypeError);
  assert.equal(DEFAULT_SKIRMISH_RULESET_ID, 'frontier-citadel-open');
});

test('fog recognizes only the five exact registry objects, never campaign flags or forged policy copies', () => {
  assert.deepEqual(Object.values(RULESETS).filter(supportsFog).map(rules => rules.id).sort(), ['frontier-campaign-false-quiet-a','frontier-campaign-false-quiet-b',LANTERNS_RULESET_ID, FOG_RULESET_ID, FOG_SKIRMISH_RULESET_ID].sort());
  for (const id of ['frontier-campaign-false-quiet-a','frontier-campaign-false-quiet-b',LANTERNS_RULESET_ID, FOG_RULESET_ID, FOG_SKIRMISH_RULESET_ID]) {
    const rules = getRuleset(id); assert.ok(supportsFog(rules));
    for (const forged of [{ ...rules }, Object.freeze({ ...rules }), Object.create(rules), { id, revision: 1, fog: FOG }, { ...rules, revision: 2 }, { ...rules, id: 'arbitrary-campaign-fog' }]) assert.equal(supportsFog(forged), false);
  }
  for (const rules of Object.values(RULESETS).filter(rules => rules.campaignOnly && rules.id !== LANTERNS_RULESET_ID && !rules.id.startsWith('frontier-campaign-false-quiet-'))) {
    assert.equal(supportsFog(rules), false); assert.equal(supportsFog({ ...rules, fog: FOG }), false);
  }
});

test('Lanterns constructor and restore require Classic open-ended ordinary economy without bridge state', () => {
  const game = fresh(), saved = game.serialize(); assert.deepEqual(Game.restore(saved).serialize(), saved);
  for (const mapId of ['long-march', 'twin-span', 'intro-one-road', 'intro-two-road']) {
    assert.throws(() => fresh({ mapId }), /fog requires Classic/);
    assertRejectsUnchanged(saved, [data => { data.mapId = mapId; }]);
  }
  for (const options of [{ rulesetRevision: 2 }, { mapRevision: 2 }]) assert.throws(() => fresh(options));
  assertRejectsUnchanged(saved, [
    data => { data.rulesetId = 'frontier-citadel-timed'; }, data => { data.rulesetId = 'frontier-citadel-bridge-open'; },
    data => { data.rulesetId = 'frontier-campaign-citadel-open'; }, data => { data.rulesetId = 'frontier-campaign-one-signal'; },
    data => { data.state.bridgeControl = {}; }, data => { data.state.campaignControl = {}; },
    data => { data.endgame = 'timed'; }, data => { data.ruleset = { fog: FOG }; },
    data => { data.scenario = clone(scenario); }, data => { delete data.state.fog; },
  ]);
  for (const rulesetId of ['frontier-citadel-timed', 'frontier-citadel-bridge-open', 'frontier-campaign-citadel-open']) {
    const noFog = new Game({ rulesetId }).serialize(); noFog.rulesetId = LANTERNS_RULESET_ID;
    assert.throws(() => Game.restore(noFog), 'missing fog knowledge cannot be implicitly migrated');
  }
  for (const ruleset of [{ ...game.ruleset, endgame: { ...game.ruleset.endgame, forcedDecay: true } }, { ...game.ruleset, economy: { policy: 'bridge-income' } }, { ...game.ruleset, id: 'arbitrary-campaign' }]) {
    assert.throws(() => validateFog(saved.state.fog, { map: game.map, ruleset, state: saved.state, nextId: saved.nextId }, message => { throw new Error(message); }));
  }
});

test('both sides keep detached hidden observations and stale memories through exact engine restore', () => {
  const game = remembered(), saved = game.serialize(), restored = Game.restore(saved);
  assert.deepEqual(restored.serialize(), saved);
  for (const side of [0, 1]) {
    const observed = observe(game, side), resumed = observe(restored, side);
    assert.deepEqual(resumed, observed); assert.equal(observed.state.gold[1 - side], null);
    assert.equal(observed.state.bases[1 - side].hp, null); assert.deepEqual(observed.state.citadelOptions.sides[1 - side], { choice: null });
    assert.equal(observed.fog.memories[0].level, 1); assert.equal(game.state.buildings.find(b => b.side !== side).level, 2);
    assert.deepEqual(observed.fog.rememberedCitadel, { choice: side ? 'arrows' : 'regen', observedAt: 100 });
    observed.fog.memories[0].level = 3; observed.state.gold[side] = 0;
  }
  assert.deepEqual(game.serialize(), saved);
  for (let i = 0; i < 400; i++) {
    const dt = i % 3 ? .05 : .1; game.update(dt); restored.update(dt);
    if (i % 50 === 0) assert.deepEqual(restored.serialize(), game.serialize());
  }
  assert.deepEqual(restored.serialize(), game.serialize());
});

test('Lanterns preserves existing fog commands, both-side AI, RNG and deterministic continuation', () => {
  for (const difficulty of ['normal', 'hard']) {
    let game = fresh({ difficulty, ai: true }), baseline = new Game({ rulesetId: FOG_SKIRMISH_RULESET_ID, difficulty, ai: true, seed: 91 });
    for (let i = 0; i < 700; i++) {
      if (i % 100 === 0) { game._ai(0); baseline._ai(0); }
      if (i === 120) assert.deepEqual(game.buyCitadelOption('arrows'), baseline.buyCitadelOption('arrows'));
      if (i % 170 === 100) assert.deepEqual(game.cast(110, 450), baseline.cast(110, 450));
      game.update(.05); baseline.update(.05);
      if (i % 25 === 0) {
        assert.deepEqual(withoutIdentity(game), withoutIdentity(baseline));
        for (const side of [0, 1]) assert.deepEqual(view(game, side), view(baseline, side));
      }
      if (i === 249 || i === 499) { game = Game.restore(game.serialize()); baseline = Game.restore(baseline.serialize()); }
    }
    assert.deepEqual(withoutIdentity(game), withoutIdentity(baseline));
  }
});

test('malformed, spurious, oversized and recycled fog memory rejects without mutating input', () => {
  const game = remembered(), saved = game.serialize();
  assertRejectsUnchanged(saved, [
    data => { data.state.fog.extra = true; }, data => { data.state.fog.version = 2; }, data => { data.state.fog.sides.pop(); },
    data => { data.state.fog.sides[0].extra = true; }, data => { data.state.fog.sides[0].units = []; },
    data => { data.state.fog.sides[0].structures[0].hp = 20; }, data => { data.state.fog.sides[0].structures[0].observedAt = 101; },
    data => { data.state.fog.sides[0].structures[0].id = data.nextId; }, data => { data.state.fog.sides[0].structures[0].id = data.state.units[0].id; },
    data => { data.state.fog.sides[0].structures[0].side = 0; }, data => { data.state.fog.sides[0].structures[0].type = 'gryphon'; },
    data => { data.state.fog.sides[0].structures[0].x += 1; }, data => { data.state.fog.sides[0].structures[0].level = 4; },
    data => { data.state.fog.sides[0].structures.push(clone(data.state.fog.sides[0].structures[0])); },
    data => { data.state.fog.sides[0].structures = Array.from({ length: 65 }, () => clone(data.state.fog.sides[0].structures[0])); },
    data => { data.state.fog.sides[0].citadel.hp = 5000; }, data => { data.state.fog.sides[0].citadel.observedAt = 101; },
    data => { data.state.effects[0].fogSeen = 0; }, data => { data.state.effects[0].fogSeen = 4; },
    data => { data.state.effects = Array.from({ length: 129 }, () => ({ ...data.state.effects[0], fogSeen: 1 })); },
  ]);
});

test('objective result reveal is presentation-only; absent, incomplete or malformed outcomes never reveal', () => {
  for (const side of [0, 1]) {
    const game = remembered(), saved = game.serialize(), expected = observe(game, side);
    for (const outcome of [undefined, null, {}, false, [], { completed: false, failed: false }, { completed: 1, failed: false }, { completed: true }, { completed: true, failed: true }]) assert.deepEqual(observeObjectiveResult(game, side, outcome), expected);
    for (const outcome of [{ completed: true, failed: false }, { completed: false, failed: true }]) {
      const revealed = observeObjectiveResult(game, side, outcome);
      assert.equal(revealed.fog.enabled, false); assert.equal(revealed.fog.revealed, true);
      assert.equal(revealed.state.bases[1 - side].hp, game.state.bases[1 - side].hp);
      assert.equal(revealed.state.gold[1 - side], game.state.gold[1 - side]);
      assert.equal(revealed.state.winner, null); assert.equal(revealed.state.fog, undefined);
      revealed.state.bases[0].hp = 1; revealed.state.gold[1 - side] = 0;
      assert.deepEqual(game.serialize(), saved); assert.deepEqual(observe(game, side), expected);
    }
    const untouched = Game.restore(saved); game._ai(side); untouched._ai(side); assert.deepEqual(game.serialize(), untouched.serialize());
  }
  assert.throws(() => observeObjectiveResult(fresh(), 2, { completed: true, failed: false }), /Invalid observation side/);
});

test('identity-only admission rejects Lanterns under old scenarios and preserves Skirmish and QA boundaries', () => {
  for (const badScenario of [{ kind: 'skirmish', id: 'standard', revision: 1 }, { kind: 'campaign', id: 'one-signal-is-enough', revision: 1 }, { kind: 'campaign', id: 'first-watch', revision: 1 }, { kind: 'trial', id: 'shieldbreaker', revision: 1 }]) {
    const bad = identity(); bad.scenario = badScenario;
    assert.throws(() => validateBattleIdentity(bad)); assert.throws(() => validateHistoryRow(record(bad)));
    assert.throws(() => encodeBattle(fresh(), badScenario));
  }
  const skirmish = { ruleset: { id: FOG_SKIRMISH_RULESET_ID, revision: 1 }, map: { id: 'classic', revision: 1 }, scenario: { kind: 'skirmish', id: 'standard', revision: 1 } };
  assert.deepEqual(validateBattleIdentity(skirmish), skirmish);
  const qa = clone(skirmish); qa.ruleset.id = FOG_RULESET_ID;
  assert.throws(() => validateBattleIdentity(qa), error => error.code === 'qa-only-ruleset');
  assert.throws(() => encodeBattle(new Game({ rulesetId: FOG_RULESET_ID })));
  assertRejectsUnchanged(skirmish, [data => { data.scenario = clone(scenario); }, data => { data.map.id = 'long-march'; }], validateBattleIdentity);
});

const earnedProgress = () => ({ ...campaign.createCampaignProgress(), missions: Object.fromEntries(campaign.CAMPAIGN_PROGRESS_MISSIONS.filter(mission => ![scenario.id, 'the-empty-purse', 'wake-the-reserve', 'the-shared-watch', 'the-long-screen', 'the-hammer-turns', 'borrowed-ground', 'a-river-between-us', 'false-quiet', 'the-road-we-know','through-the-reed-beds','the-archers-quay','salt-in-the-stores'].includes(mission.id)).map(mission => [mission.id, { completed: true, stars: 2, bestTime: 60 }])) });
function campaignWithMemories() {
  const game = campaign.createProgressionCampaignMission(scenario.id, earnedProgress());
  assert.deepEqual(game.state.fog.sides.map(side => side.structures), [[], []], 'authored setup must not retain discarded default-building knowledge');
  // Synthetic observation fixture, not evidence of a paid campaign completion.
  game.state.time = 100; game.tick = 2000; game.state.gold = [1500, 1500];
  for (const side of [0, 1]) {
    assert.ok(game.buyCitadelOption(side ? 'regen' : 'arrows', side).ok);
    const target = game.state.buildings.find(building => building.side !== side);
    game._spawn({ type: 'aerie', side, x: target.x, y: 450, lane: 1, level: 1 });
    const scout = game.state.units.at(-1); Object.assign(scout, { x: target.x, y: 450 }); refreshFog(game);
    scout.x = side ? 300 : 2900; refreshFog(game);
    scout.x = side ? 2790 : 410; refreshFog(game);
    assert.ok(game.state.fog.sides[side].structures.length > 0);
    assert.ok(game.upgrade(target.id, 1 - side).ok);
  }
  return game;
}
const backup = (battle, history = []) => ({ format: 'ironroot-backup', version: 2, createdAt: '2026-11-08T00:00:00.000Z', data: { campaign: earnedProgress(), trials: {}, settings: { skirmishBridgeIncome: true }, history, battle } });
function untouchedStorage() {
  const values = new Map([['existing', 'preserve'], ['unrelated', 'untouched']]), operations = [];
  return { values, operations, getItem(key) { operations.push(['get', key]); return values.get(key) ?? null; }, setItem(key, value) { operations.push(['set', key, value]); values.set(key, value); }, removeItem(key) { operations.push(['remove', key]); values.delete(key); } };
}

test('Lanterns mission, history and backup bind exact @1 identities and retain both memories through restore', () => {
  const game = campaignWithMemories(), progress = earnedProgress(), saved = encodeBattle(game, scenario, { campaignProgress: progress }), before = game.serialize();
  assert.deepEqual(validateBattleIdentity(identity()), identity());
  assert.deepEqual(campaign.campaignScenarioForGame(game, scenario.id), scenario);
  assert.equal(saved.version, 3); assert.equal(saved.game.version, 3); assert.deepEqual(saved.scenario, scenario);
  const restored = decodeBattle(JSON.stringify(saved), { campaignProgress: progress }).game;
  assert.deepEqual(restored.serialize(), before); assert.deepEqual(restored.state.fog, before.state.fog);
  for (const side of [0, 1]) assert.deepEqual(observe(restored, side), observe(game, side));
  const row = record(identity()); assert.deepEqual(validateHistoryRow(row), row);
  const parsed = parseBackup(JSON.stringify(backup(saved, [row])));
  assert.deepEqual(parsed.data.battle, saved); assert.deepEqual(parsed.data.history, [row]); assert.equal(parsed.data.settings.skirmishBridgeIncome, true);
  const storage = untouchedStorage(), result = restoreBackup(storage, JSON.stringify(backup(saved, [row])));
  assert.equal(result.ok, true); assert.equal(storage.values.get('unrelated'), 'untouched');
  assert.throws(() => decodeBattle(saved, { campaignProgress: campaign.createCampaignProgress() }), error => error.code === 'locked-mission');
  for (let i = 0; i < 160; i++) { game.update(.05); restored.update(.05); }
  assert.deepEqual(restored.serialize(), game.serialize());
  const restarted = campaign.createCampaignRestart(restored, scenario.id);
  assert.equal(restarted.ruleset.id, LANTERNS_RULESET_ID); assert.equal(restarted.state.time, 0);
  assert.deepEqual(restarted.state.fog.sides.map(side => side.structures), [[], []]);
});

test('Lanterns identity history and backup reject every other campaign identity, wrong map, revision and roster before storage access', () => {
  const game = campaign.createProgressionCampaignMission(scenario.id, earnedProgress()), saved = encodeBattle(game, scenario, { campaignProgress: earnedProgress() });
  const mutations = [
    ...['long-march', 'twin-span', 'intro-one-road', 'intro-two-road'].map(id => value => { value.map.id = id; }),
    value => { value.map.revision = 2; }, value => { value.ruleset.revision = 2; }, value => { value.scenario.revision = 2; },
    ...[FOG_RULESET_ID, FOG_SKIRMISH_RULESET_ID, DEFAULT_SKIRMISH_RULESET_ID, 'frontier-citadel-timed', 'frontier-citadel-bridge-open', 'frontier-campaign-citadel-open', 'frontier-campaign-one-signal'].map(id => value => { value.ruleset.id = id; }),
    ...campaign.CAMPAIGN_PROGRESS_MISSIONS.filter(mission => mission.id !== scenario.id).map(mission => value => { value.scenario = { kind: 'campaign', id: mission.id, revision: 1 }; }),
    value => { value.scenario = { kind: 'skirmish', id: 'standard', revision: 1 }; },
    ...CURRENT_CHALLENGES.map(trial => value => { value.scenario = { kind: 'trial', id: trial.id, revision: trial.scenarioRevision ?? 1 }; }),
    ...TRAINING_LESSONS.map(lesson => value => { value.scenario = { kind: 'lesson', id: lesson.id, revision: 1 }; }),
    value => { value.scenario.extra = 'fog'; },
  ];
  for (const mutate of mutations) {
    const bad = identity(); mutate(bad); const before = clone(bad);
    assert.throws(() => validateBattleIdentity(bad)); assert.throws(() => validateHistoryRow(record(bad))); assert.deepEqual(bad, before);
    const invalid = backup(saved, [record(bad)]), storage = untouchedStorage(), bytes = [...storage.values];
    assert.throws(() => parseBackup(JSON.stringify(invalid))); assert.equal(restoreBackup(storage, JSON.stringify(invalid)).ok, false);
    assert.deepEqual(storage.operations, []); assert.deepEqual([...storage.values], bytes);
  }
  assertRejectsUnchanged(saved, [
    value => { value.scenario = { kind: 'skirmish', id: 'standard', revision: 1 }; },
    value => { value.scenario = { kind: 'campaign', id: 'one-signal-is-enough', revision: 1 }; },
    value => { value.game.ai = false; }, value => { value.game.difficulty = 'hard'; },
    value => { value.game.state.fog.sides[0].units = []; }, value => { value.game.state.bridgeControl = {}; },
    value => { delete value.game.state.fog; },
  ], value => decodeBattle(value, { campaignProgress: earnedProgress() }));
});
