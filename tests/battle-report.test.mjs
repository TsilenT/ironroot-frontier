import { assertFrozenEngineExceptEnumValidation } from './engine-validation-source.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { Game, BUILDINGS, UNITS, MAPS, worldX } from '../dist/engine.js';
import { CAMPAIGN_MISSIONS, createCampaignMission, evaluateCampaignMission, getCampaignTargets, currentIncome } from '../dist/campaign.js';
import { CHALLENGES, createChallenge, evaluateChallenge, getChallengeTargets } from '../dist/challenges.js';
import { advanceObjectiveBattle } from '../dist/objectives.js';
import { createBattleJournal, exportBattleReport } from '../dist/battle-report.js';

const success = () => ({ completed: true, failed: false, label: 'Test objective complete.' });
const end = (journal, game, extra = {}) => journal.finish(game, { objectiveOutcome: success(), ...extra });
const deepFreeze = value => {
  if (value && typeof value === 'object') { Object.values(value).forEach(deepFreeze); Object.freeze(value); }
  return value;
};
const assertFrozen = value => {
  if (value && typeof value === 'object') { assert.ok(Object.isFrozen(value)); Object.values(value).forEach(assertFrozen); }
};
const assertFiniteJSON = value => {
  if (typeof value === 'number') assert.ok(Number.isFinite(value));
  else if (value && typeof value === 'object') Object.values(value).forEach(assertFiniteJSON);
  else assert.ok(value === null || ['string', 'boolean'].includes(typeof value));
};
const bytes = game => JSON.stringify(game.serialize());

test('observer retains frozen engine rules with only the audited save-type guard', () => {
  const source = readFileSync(new URL('../dist/engine.js', import.meta.url));
  assertFrozenEngineExceptEnumValidation(source);
  const observer = readFileSync(new URL('../dist/battle-report.js', import.meta.url), 'utf8');
  assert.doesNotMatch(observer, /\b(localStorage|sessionStorage|document|window|fetch|Date|Math\.random)\b/);
  assert.doesNotMatch(observer, /game\.(update|_step|random|build|sell|upgrade|cast|serialize)\s*\(/);
});

test('all maps report actual geometry, both armies, finite values and zero-filled known roster', () => {
  for (const mapId of Object.keys(MAPS)) {
    const game = new Game({ ai: false, mapId }), report = end(createBattleJournal(game), game);
    assert.equal(report.map.id, mapId);
    assert.equal(report.map.laneCount, MAPS[mapId].lanes.length);
    assert.equal(report.map.width, MAPS[mapId].width);
    assert.deepEqual(report.map.lanes, MAPS[mapId].lanes);
    for (const side of report.final.sides) {
      assert.equal(side.gold, 420); assert.equal(side.income, 5); assert.equal(side.mineIncome, 0);
      assert.equal(side.buildingCount, 1); assert.equal(side.armyCount, 0); assert.equal(side.baseHp, 6000);
      assert.deepEqual(side.unitComposition.map(g => g.type), Object.keys(UNITS));
      assert.deepEqual(side.buildingComposition.map(g => g.type), Object.keys(BUILDINGS));
      assert.equal(side.buildingComposition.find(g => g.type === 'barracks').count, 1);
      assert.ok(side.unitComposition.every(g => g.count === 0));
    }
    assert.equal(report.scope.fullTimeline, true); assert.equal(report.scope.observedDuration, 0);
    assert.equal(report.sampling.retainedPoints, 1); assert.equal(report.sampling.observationCount, 1);
    assert.equal(report.sampling.interpolated, false);
    assertFrozen(report); assertFiniteJSON(report);
  }
});

test('authored initial allocations, health and placements are observed, never inferred as spending', () => {
  for (const mission of CAMPAIGN_MISSIONS) {
    const game = createCampaignMission(mission.id), before = bytes(game);
    const report = end(createBattleJournal(game, { mode: 'campaign', id: mission.id, name: mission.name }), game);
    assert.equal(report.initial.sides[0].gold, mission.startingGold);
    assert.equal(report.initial.sides[1].gold, mission.enemyGold || 0);
    assert.equal(report.initial.sides[0].baseHp, mission.startingHealth);
    assert.equal(report.initial.sides[0].baseMaxHp, 6000);
    assert.equal(report.initial.sides[0].buildingCount, mission.playerBuildings.length);
    assert.equal(report.initial.sides[1].buildingCount, mission.enemyBuildings.length);
    assert.equal(report.cumulativeStats[0].built, mission.playerBuildings.length);
    assert.equal(report.cumulativeStats[1].built, mission.enemyBuildings.length);
    assert.equal(report.initial.sides[0].income, currentIncome(game));
    assert.equal(bytes(game), before);
    const json = exportBattleReport(report);
    for (const invented of ['goldSpent', 'totalIncome', 'unitsSpawned', 'lifetimeSpawns', 'causeOfDefeat']) assert.ok(!json.includes(`"${invented}"`));
  }
});

test('current income uses alive, upgraded mines even when cached engine income is stale', () => {
  const game = new Game({ ai: false });
  game.state.gold = [10000, 10000];
  const journal = createBattleJournal(game);
  const mine = game.build('mint', 270, 260).building;
  assert.equal(game.state.income[0], 5);
  game.state.time = 2; journal.sample();
  game.upgrade(mine.id); game.state.time = 4; journal.sample();
  game.upgrade(mine.id); game.state.time = 6; journal.sample();
  game.sell(mine.id); game.state.time = 8; journal.sample();
  const dead = game.build('mint', 270, 260).building;
  dead.hp = 0; game.state.time = 10;
  const report = end(journal, game);
  assert.deepEqual(report.timeline.map(p => p.sides[0].income), [5, 7.5, 8.75, 10, 5, 5]);
  assert.deepEqual(report.timeline.map(p => p.sides[0].mineIncome), [0, 2.5, 3.75, 5, 0, 0]);
  assert.equal(report.final.sides[0].buildingCount, 1);
  assert.equal(report.final.sides[0].buildingComposition.find(g => g.type === 'mint').count, 0);
  assert.deepEqual(report.observedPeaks[0].income, { value: 10, time: 6 });
});

test('sampling uses simulation time at 1× and 2×, ignores pauses and does not backfill skipped times', () => {
  for (const dt of [.05, .1]) {
    const game = new Game({ ai: false }), journal = createBattleJournal(game);
    for (let i = 0; i < 10; i++) assert.equal(journal.sample(), false);
    for (let i = 0; i < Math.round(6 / dt); i++) { game.update(dt); journal.sample(); }
    for (let i = 0; i < 10; i++) assert.equal(journal.sample(), false);
    const report = end(journal, game);
    assert.equal(report.timeline.length, 4);
    report.timeline.forEach((point, index) => assert.ok(Math.abs(point.time - index * 2) < 1e-7));
    assert.equal(report.sampling.observationCount, 4);
  }
  const game = new Game({ ai: false }), journal = createBattleJournal(game);
  game.state.time = 19.75; journal.sample();
  assert.deepEqual(end(journal, game).timeline.map(p => p.time), [0, 19.75]);
});

test('short and same-time terminal changes force a final snapshot without duplicate timestamps', () => {
  const game = new Game({ ai: false }), journal = createBattleJournal(game);
  game.build('mint', 270, 260);
  const report = end(journal, game);
  assert.equal(report.timeline.length, 1);
  assert.equal(report.initial.sides[0].income, 5);
  assert.equal(report.final.sides[0].income, 7.5);
  assert.strictEqual(report.timeline[0], report.final);
  assert.equal(report.sampling.observationCount, 2);
  assert.equal(report.scope.observedDuration, 0);
  const short = new Game({ ai: false }), shortJournal = createBattleJournal(short);
  short.update(.05); assert.equal(shortJournal.sample(), false);
  const shortReport = end(shortJournal, short);
  assert.deepEqual(shortReport.timeline.map(p => p.time), [0, .05]);
  assert.equal(shortReport.scope.endedAt, .05);
});

test('thinning is bounded, preserves actual endpoints/timestamps and all captured observed peaks', () => {
  const game = new Game({ ai: false }), journal = createBattleJournal(game), captured = new Set([0]);
  for (let time = 2; time <= 30000; time += 2) {
    game.state.time = time;
    game.state.gold[0] = time === 2 ? 1000000 : time;
    if (journal.sample()) captured.add(time);
  }
  game.state.time = 30000.5;
  const report = end(journal, game); captured.add(30000.5);
  assert.ok(report.timeline.length <= 256);
  assert.equal(report.timeline[0].time, 0);
  assert.equal(report.timeline.at(-1).time, 30000.5);
  assert.ok(report.timeline.every((p, i) => captured.has(p.time) && (!i || p.time > report.timeline[i - 1].time)));
  assert.equal(report.sampling.observationCount, captured.size);
  assert.equal(report.sampling.retainedPoints, report.timeline.length);
  assert.ok(report.sampling.thinned); assert.ok(report.sampling.thinningPasses > 1);
  assert.equal(report.sampling.currentInterval, 2 * 2 ** report.sampling.thinningPasses);
  assert.ok(!report.timeline.some(p => p.time === 2), 'the high-gold point was removed from timeline');
  assert.deepEqual(report.observedPeaks[0].gold, { value: 1000000, time: 2 });
  assert.ok(report.limitations.some(s => s.includes('thinned')));
  assert.ok(exportBattleReport(report).length < 1500000);
  assertFiniteJSON(report);
});

test('unsampled transient peaks are not presented as observations or true maxima', () => {
  const game = new Game({ ai: false }), journal = createBattleJournal(game);
  game.state.time = 1; game.state.gold[0] = 9999; assert.equal(journal.sample(), false);
  game.state.time = 2; game.state.gold[0] = 500; journal.sample();
  const report = end(journal, game);
  assert.deepEqual(report.observedPeaks[0].gold, { value: 500, time: 2 });
  assert.ok(report.limitations.some(s => s.includes('events between observations may be missed')));
});

test('journal identity, monotonic time, terminal requirement and idempotence prevent mixed matches', () => {
  const game = new Game({ ai: false }), other = new Game({ ai: false }), journal = createBattleJournal(game);
  assert.throws(() => journal.sample(other), /one game/);
  assert.throws(() => journal.finish(other), /one game/);
  assert.throws(() => journal.finish(game), /terminal/);
  game.state.time = 1; journal.sample(); game.state.time = .5;
  assert.throws(() => journal.sample(), /backwards/); assert.throws(() => end(journal, game), /backwards/);
  game.state.time = 1;
  const report = end(journal, game);
  assert.strictEqual(journal.finish(game), report);
  assert.equal(journal.sample(game), false);
  assert.throws(() => journal.sample(other), /one game/);
  assert.throws(() => journal.finish(other), /one game/);
});

test('no engine/objective references escape and deeply frozen sources can be observed', () => {
  const game = new Game({ ai: false });
  game.state.winner = 0; game.state.bases[1].hp = 0;
  const before = JSON.stringify(game), methods = Object.getOwnPropertyDescriptors(Game.prototype);
  deepFreeze(game);
  const objectiveOutcome = deepFreeze(success()), journal = createBattleJournal(game);
  assert.equal(journal.sample(), false);
  const report = journal.finish(game, { objectiveOutcome, targets: deepFreeze([]) });
  assert.equal(JSON.stringify(game), before);
  assert.deepEqual(Object.getOwnPropertyDescriptors(Game.prototype), methods);
  assert.notStrictEqual(report.map, game.map); assert.notStrictEqual(report.map.lanes, game.map.lanes);
  assert.notStrictEqual(report.final.sides, game.state.bases);
  assertFrozen(report);
  assert.throws(() => { report.final.sides[0].gold = 0; }, TypeError);
  assert.throws(() => { report.timeline.push({}); }, TypeError);
  assert.throws(() => { report.observedPeaks[0].gold.value = 0; }, TypeError);
  assert.deepEqual(JSON.parse(exportBattleReport(report)), report);
});

test('export is a whitelist of finite JSON and rejects foreign objects without executing toJSON', () => {
  const game = new Game({ ai: false });
  game.state.privateThing = 'Do not include';
  const outcome = { ...success(), password: 'No', toJSON() { throw new Error('Do not execute'); } };
  const journal = createBattleJournal(game, { name: '<script>raw text, never markup</script>' });
  const report = journal.finish(game, { objectiveOutcome: outcome });
  const json = exportBattleReport(report);
  assert.ok(!json.includes('password')); assert.ok(!json.includes('privateThing')); assert.ok(!json.includes('toJSON'));
  assert.equal(JSON.parse(json).context.name, '<script>raw text, never markup</script>');
  assert.throws(() => exportBattleReport(JSON.parse(json)), /completed report from this session/);
  assert.throws(() => exportBattleReport({ toJSON() { throw new Error('Should not run'); } }), /completed report from this session/);
  assertFiniteJSON(report);
});

test('invalid observed data is rejected rather than coerced into plausible finite facts', () => {
  for (const poison of [NaN, Infinity, -Infinity, -1, '12']) {
    const game = new Game({ ai: false }); game.state.gold[0] = poison;
    assert.throws(() => createBattleJournal(game), /gold/);
  }
  for (const edit of [g => g.state.time = NaN, g => g.state.bases[0].hp = Infinity, g => g.state.units.push({ type: 'unknown', side: 0, hp: 1 }), g => g.state.buildings[0].level = 0]) {
    const game = new Game({ ai: false }); edit(game); assert.throws(() => createBattleJournal(game));
  }
  const game = new Game({ ai: false }), journal = createBattleJournal(game);
  assert.throws(() => journal.finish(game, { objectiveOutcome: { ...success(), failed: true } }), /both complete and fail/);
  assert.throws(() => createBattleJournal(game, { name: 'x'.repeat(201) }), /at most 200/);
  assert.throws(() => end(journal, game, { targets: [{ type: 'mint', x: 270, lane: 0, building: null }] }), /kind/);
  assert.throws(() => end(journal, game, { targets: [{ kind: 'protect', side: 0, type: 'mint', x: 270, lane: 9, building: null }] }), /lane/);
  game.state.stats.damage[1] = Infinity;
  assert.throws(() => end(journal, game), /damage/);
  game.state.stats.damage[1] = 3.5;
  const report = end(journal, game);
  assert.equal(report.sampling.observationCount, 1, 'failed finish attempts did not alter journal');
  assert.equal(report.cumulativeStats[1].damage, 3.5);
});

test('terminal engine wins, losses and draw remain distinct from objective outcomes', () => {
  for (const winner of [0, 1, 'draw']) {
    const game = new Game({ ai: false }), journal = createBattleJournal(game);
    game.state.winner = winner;
    if (winner === 'draw') game.state.bases.forEach(b => b.hp = 0);
    else game.state.bases[1 - winner].hp = 0;
    const report = journal.finish(game);
    assert.equal(report.outcome.engineWinner, winner);
    assert.equal(report.outcome.source, 'engine');
    assert.equal(report.outcome.result, winner === 'draw' ? 'draw' : winner === 0 ? 'victory' : 'defeat');
  }
  const game = new Game({ ai: false }), report = end(createBattleJournal(game), game);
  assert.equal(report.outcome.source, 'objective'); assert.equal(report.outcome.result, 'victory');
  assert.equal(report.outcome.engineWinner, null); assert.equal(game.state.winner, null);
});

test('original protected/destroyed targets come from evaluator identity, not replacement locations', () => {
  for (const mission of CAMPAIGN_MISSIONS.filter(m => m.protectedTargets.length)) {
    const game = createCampaignMission(mission.id), journal = createBattleJournal(game, { mode: 'campaign', id: mission.id, name: mission.name });
    const protectedTarget = getCampaignTargets(game, mission.id).find(t => t.kind === 'protect');
    game.state.buildings = game.state.buildings.filter(b => b.id !== protectedTarget.originalId);
    const replacement = game._place(protectedTarget.type, protectedTarget.x, game.map.lanes[protectedTarget.lane], 0);
    assert.notEqual(replacement.id, protectedTarget.originalId);
    game.state.winner = 0; game.state.bases[1].hp = 0;
    const objectiveOutcome = evaluateCampaignMission(game, mission.id), targets = getCampaignTargets(game, mission.id);
    const before = bytes(game), report = journal.finish(game, { objectiveOutcome, targets });
    assert.equal(report.outcome.engineWinner, 0); assert.equal(report.outcome.result, 'defeat');
    assert.equal(report.outcome.objectiveFailed, true);
    assert.equal(report.objectives.targets.find(t => t.kind === 'protect' && t.x === protectedTarget.x && t.lane === protectedTarget.lane).alive, false);
    assert.equal(report.objectives.items.find(i => i.type === 'protect').failed, true);
    assert.equal(bytes(game), before);
  }
  const mission = CAMPAIGN_MISSIONS.find(m => m.markedTargets.length && !m.protectedTargets.length);
  const game = createCampaignMission(mission.id), journal = createBattleJournal(game);
  for (const target of getCampaignTargets(game, mission.id)) {
    game.state.buildings = game.state.buildings.filter(b => b.id !== target.originalId);
    game._place(target.type, target.x, game.map.lanes[target.lane], 1);
  }
  const outcome = evaluateCampaignMission(game, mission.id);
  const report = journal.finish(game, { objectiveOutcome: outcome, targets: getCampaignTargets(game, mission.id) });
  assert.equal(report.outcome.engineWinner, null); assert.equal(report.outcome.result, 'victory');
  assert.ok(report.objectives.targets.every(t => !t.alive));
});

test('campaign and trial terminal evaluation supplies objective facts on every authored map', () => {
  for (const [list, create, evaluate, targetsFor, mode] of [[CAMPAIGN_MISSIONS, createCampaignMission, evaluateCampaignMission, getCampaignTargets, 'campaign'], [CHALLENGES, createChallenge, evaluateChallenge, getChallengeTargets, 'challenge']]) {
    for (const entry of list) {
      const game = create(entry.id), journal = createBattleJournal(game, { mode, id: entry.id, name: entry.name });
      game.state.time = entry.timeLimit;
      const objectiveOutcome = evaluate(game, entry.id);
      assert.ok(objectiveOutcome.completed || objectiveOutcome.failed);
      const targets = targetsFor(game, entry.id).map(t => mode === 'challenge' ? { ...t, kind: 'destroy', side: 1 } : t);
      const report = journal.finish(game, { objectiveOutcome, targets });
      assert.equal(report.outcome.result, objectiveOutcome.completed ? 'victory' : 'defeat');
      assert.equal(report.outcome.label, objectiveOutcome.label);
      assert.equal(report.objectives.items.length, objectiveOutcome.objectives?.length || 0);
      assert.equal(report.objectives.targets.length, targets.length);
      assert.deepEqual(report.objectives.targets.map(t => t.alive), targets.map(t => !!t.building));
      assertFiniteJSON(report);
    }
  }
});

test('version-1 and version-2 historical saves resume partial timelines without schema changes', () => {
  for (const file of ['backup-v0.7-format.json', 'backup-v0.9-format.json']) {
    const backup = JSON.parse(readFileSync(new URL('./fixtures/' + file, import.meta.url)));
    const source = JSON.stringify(backup), game = Game.restore(backup.data.battle.game), before = bytes(game);
    const journal = createBattleJournal(game, { resumed: true });
    assert.equal(bytes(game), before);
    for (let i = 0; i < 60; i++) { game.update(.05); journal.sample(); }
    const current = bytes(game), report = end(journal, game);
    assert.equal(report.scope.resumed, true); assert.equal(report.scope.fullTimeline, false);
    assert.equal(report.scope.startedAt, backup.data.battle.game.state.time);
    assert.equal(report.scope.missingBefore, backup.data.battle.game.state.time);
    assert.ok(report.timeline.every(p => p.time >= report.scope.startedAt));
    assert.equal(report.scope.counters, 'full-match-engine');
    assert.deepEqual(report.cumulativeStats, [0, 1].map(side => ({ side, ...Object.fromEntries(['kills', 'built', 'damage'].map(k => [k, game.state.stats[k][side]])) })));
    assert.equal(bytes(game), current); assert.equal(JSON.stringify(backup), source);
    assert.equal(Game.restore(game.serialize()).serialize().version, backup.data.battle.game.version);
    assert.ok(report.limitations[0].includes('after Resume'));
    assert.ok(!Object.hasOwn(game.serialize(), 'battleReport'));
  }
  const game = new Game({ ai: false }); game.state.time = 25;
  const report = end(createBattleJournal(game), game);
  assert.equal(report.scope.fullTimeline, false); assert.equal(report.scope.missingBefore, 25);
});

function paidActions(game, turn) {
  for (const side of [0, 1]) {
    const type = Object.keys(BUILDINGS)[turn % 7], lane = turn % game.map.lanes.length;
    for (const x of game.map.siteColumns) if (game.build(type, worldX(game.map, side, x), game.map.lanes[lane], side).ok) break;
    if (turn % 3 === 0) { const b = game.state.buildings.find(b => b.side === side && b.level < 3); if (b) game.upgrade(b.id, side); }
    if (turn % 7 === 2) { const b = game.state.buildings.find(b => b.side === side && b.type === 'mint'); if (b) game.sell(b.id, side); }
    if (turn % 4 === 1) { const u = game.state.units.find(u => u.side !== side); if (u) game.cast(u.x, u.y, side); }
  }
}
test('complete paired simulations remain byte-identical with and without observation on all maps', () => {
  for (const mapId of Object.keys(MAPS)) {
    const observed = new Game({ mapId, seed: 731, difficulty: 'hard' });
    const control = new Game({ mapId, seed: 731, difficulty: 'hard' });
    let journal = createBattleJournal(observed);
    for (let frame = 0; frame < 12000 && observed.state.winner === null; frame++) {
      if (frame % 80 === 0) { paidActions(observed, frame / 80); paidActions(control, frame / 80); }
      const dt = frame % 3 === 0 ? .1 : .05;
      observed.update(dt); control.update(dt); journal.sample();
      if (frame % 97 === 0) assert.equal(bytes(observed), bytes(control), `${mapId} frame ${frame}`);
      // Create another observational segment without modifying the game.
      if (frame === 200) journal = createBattleJournal(observed, { resumed: true });
    }
    assert.notEqual(observed.state.winner, null, mapId + ' terminated');
    const before = bytes(observed), report = journal.finish(observed);
    assert.equal(bytes(observed), bytes(control)); assert.equal(bytes(observed), before);
    assert.equal(report.outcome.engineWinner, observed.state.winner);
    assert.equal(observed.seed, control.seed); assert.equal(observed.nextId, control.nextId); assert.equal(observed.tick, control.tick);
  }
});

test('fixed-step objective termination and resulting report agree at 1× and 2×', () => {
  const reports = [];
  for (const dt of [.05, .1]) {
    const game = createChallenge('holdfast'); game.state.time = 139.8;
    game.state.units = []; game.state.buildings = game.state.buildings.filter(b => b.side === 0);
    const journal = createBattleJournal(game, { resumed: true, mode: 'challenge', id: 'holdfast' });
    let objectiveOutcome;
    for (let i = 0; i < 8; i++) {
      objectiveOutcome = advanceObjectiveBattle(game, dt, g => evaluateChallenge(g, 'holdfast'), 140); journal.sample();
      if (objectiveOutcome.completed || objectiveOutcome.failed) break;
    }
    reports.push(journal.finish(game, { objectiveOutcome }));
  }
  assert.equal(reports[0].outcome.result, 'victory'); assert.equal(reports[1].outcome.result, 'victory');
  assert.equal(reports[0].scope.endedAt, reports[1].scope.endedAt);
  assert.deepEqual(reports[0].final, reports[1].final);
  assert.deepEqual(reports[0].cumulativeStats, reports[1].cumulativeStats);
});

test('sparse engine arrays and inherited indices cannot hide missing observed values', () => {
  for (const field of ['gold', 'bases', 'units', 'buildings']) {
    const game = new Game({ ai: false });
    const length = ['gold', 'bases'].includes(field) ? 2 : 1;
    game.state[field] = new Array(length);
    const before = JSON.stringify(game);
    assert.throws(() => createBattleJournal(game), /own entry at every index/);
    assert.equal(JSON.stringify(game), before);
  }
  const game = new Game({ ai: false });
  const inherited = Object.create(Array.prototype);
  Object.defineProperty(inherited, '0', { value: 420 });
  const gold = new Array(2); gold[1] = 420; Object.setPrototypeOf(gold, inherited);
  game.state.gold = gold;
  assert.equal(game.state.gold[0], 420);
  assert.equal(Object.hasOwn(game.state.gold, 0), false);
  assert.throws(() => createBattleJournal(game), /own entry at every index/);
});

test('sparse objective, target and counter arrays reject without poisoning later finish', () => {
  const game = new Game({ ai: false }), journal = createBattleJournal(game);
  const before = bytes(game);
  assert.throws(() => end(journal, game, { objectiveOutcome: { ...success(), objectives: new Array(1) } }), /objective items must contain an own entry/);
  assert.throws(() => end(journal, game, { targets: new Array(1) }), /resolved targets must contain an own entry/);
  const originalKills = game.state.stats.kills;
  game.state.stats.kills = new Array(2);
  assert.throws(() => end(journal, game), /kills must contain an own entry/);
  game.state.stats.kills = originalKills;
  assert.equal(bytes(game), before);
  const report = end(journal, game);
  assert.equal(report.sampling.observationCount, 1);
  assert.deepEqual(report.objectives, { items: [], targets: [] });
  assert.deepEqual(JSON.parse(exportBattleReport(report)), report);
  assertFrozen(report); assertFiniteJSON(report);
});
