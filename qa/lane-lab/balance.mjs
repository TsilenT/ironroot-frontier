/** Opt-in diagnostic matrix. node qa/lane-lab/balance.mjs [seeds=2] [--output FILE]
 * Each seed runs both player sides and both first-decision orders. Single Road
 * also gets an easy-AI cohort. Defaults to spread seeds; --seed-mode consecutive
 * retains the original seed sequence for targeted follow-up diagnostics.
 */
import assert from 'node:assert/strict';
import {readFileSync, writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {Game, MAPS, BUILDINGS, buildSites} from './engine.js';
import {POLICIES, createPolicyMemory, actPolicy} from './policies.mjs';

const argv = process.argv.slice(2);
const seeds = argv[0] && !argv[0].startsWith('--') ? Number(argv.shift()) : 2;
assert.ok(Number.isInteger(seeds) && seeds > 0 && seeds <= 20, 'Use 1–20 seeds.');
let output = null;
let seedMode = 'spread';
while (argv.length) {
  const option = argv.shift(), value = argv.shift();
  assert.ok(value, 'Missing value for ' + option);
  if (option === '--output') output = value;
  else if (option === '--seed-mode') seedMode = value;
  else assert.fail('Unknown option: ' + option);
}
assert.ok(['spread', 'consecutive'].includes(seedMode));
function spreadSeed(index) {
  if (index === 0) return 51001;
  let mixed = (51001 + Math.imul(index, 0x9e3779b9)) >>> 0;
  mixed = Math.imul(mixed ^ (mixed >>> 16), 0x85ebca6b);
  mixed = Math.imul(mixed ^ (mixed >>> 13), 0xc2b2ae35);
  return (mixed ^ (mixed >>> 16)) >>> 0;
}
const seedValues = Array.from({length: seeds}, (_, i) => seedMode === 'spread' ? spreadSeed(i) : 51001 + i);
assert.equal(new Set(seedValues).size, seedValues.length);
const mapIds = ['single-road', 'two-roads', 'three-roads', 'two-roads-crosswind', 'three-roads-crosswind'];
const difficultiesFor = mapId => mapId === 'single-road' ? ['easy', 'normal', 'hard'] : ['normal', 'hard'];
const orders = ['player-first', 'rival-first'];
const hash = name => createHash('sha256').update(readFileSync(new URL(name, import.meta.url))).digest('hex');
const round = n => +n.toFixed(3);
const started = performance.now();

function invariants(g) {
  const s = g.state;
  assert.ok(s.gold.every(v => Number.isFinite(v) && v >= 0));
  assert.ok(s.units.length <= 140 && s.effects.length <= 256 && s.projectiles.length <= 256);
  for (const side of [0, 1]) {
    const buildings = s.buildings.filter(b => b.side === side);
    assert.ok(buildings.length <= g.map.buildLimit);
    assert.ok(buildings.filter(b => b.type === 'mint').length <= 3);
    assert.ok(s.units.filter(u => u.side === side).length <= 70);
    const sites = buildSites(g.map, side);
    for (const b of buildings) assert.ok(sites.some(p => p.x === b.x && p.y === b.y && p.lane === b.lane));
  }
  for (const u of s.units) {
    assert.ok(u.x >= 75 && u.x <= g.map.width - 75 && u.y >= 180 && u.y <= 720);
    assert.ok(Number.isInteger(u.lane) && u.lane >= 0 && u.lane < g.map.lanes.length);
  }
}

function match(spec) {
  let g = new Game({mapId: spec.mapId, difficulty: spec.difficulty, seed: spec.seed, ai: false});
  const memory = createPolicyMemory();
  const rival = 1 - spec.playerSide;
  const timers = [0, 0];
  if (spec.difficulty === 'easy') timers[rival] = 7;
  const warning = new Set(), transit = new Set(), landed = new Set();
  let restoreChecks = 0, income120 = null, maxUnits = 0;
  let pendingRestore = null;
  const maxUnitsBySide = [0, 0];
  const openings = [];
  for (let frame = 0; frame < 12000 && g.state.winner === null; frame++) {
    g.update(.05);
    if (pendingRestore) {
      pendingRestore.update(.05);
      assert.deepEqual(pendingRestore.serialize(), g.serialize(), 'Restored and uninterrupted next steps diverged.');
      g = pendingRestore;
      pendingRestore = null;
      restoreChecks++;
    }
    if (g.state.winner !== null) break;
    // Vary ONLY the opening decision order. Later absolute-side ordering matches.
    const openingOrder = spec.order === 'player-first' ? [spec.playerSide, rival] : [rival, spec.playerSide];
    for (const side of frame === 0 ? openingOrder : frame % 2 ? [1, 0] : [0, 1]) {
      timers[side] -= .05;
      if (timers[side] > 0) continue;
      if (side === rival) {
        g._ai(side);
        timers[side] = (spec.difficulty === 'easy' ? 14 : spec.difficulty === 'hard' ? 3 : 5) + g.random() * 3;
      } else {
        const action = actPolicy(g, side, spec.policy, memory);
        if (action && openings.length < 8) openings.push({time: round(g.state.time), ...action});
        timers[side] = 5;
      }
    }
    const unitsBySide = [0, 0];
    for (const u of g.state.units) {
      unitsBySide[u.side]++;
      if (u.airRoute) {
        if (u.airRoute.phase === 'warning') warning.add(u.id);
        if (u.airRoute.phase === 'transit') transit.add(u.id);
        if (u.airRoute.phase === 'done') landed.add(u.id);
      }
    }
    for (const side of [0, 1]) maxUnitsBySide[side] = Math.max(maxUnitsBySide[side], unitsBySide[side]);
    maxUnits = Math.max(maxUnits, g.state.units.length);
    if (income120 === null && g.state.time >= 120) income120 = g.state.income[spec.playerSide];
    if (frame % 20 === 0) invariants(g);
    if (frame > 0 && frame % 600 === 0) {
      const snapshot = g.serialize();
      pendingRestore = Game.restore(snapshot);
      assert.deepEqual(pendingRestore.serialize(), snapshot, 'Save roundtrip changed a diagnostic game.');
    }
  }
  invariants(g);
  assert.notEqual(g.state.winner, null, 'A complete game must terminate within 600 seconds.');
  assert.deepEqual(Game.restore(g.serialize()).serialize(), g.serialize());
  const enemyBuildings = g.state.buildings.filter(b => b.side === rival);
  return {...spec, outcome: g.state.winner === 'draw' ? 'draw' : g.state.winner === spec.playerSide ? 'win' : 'loss',
    seconds: round(g.state.time), citadelHP: g.state.bases.map(b => round(b.hp)),
    income120, maxUnits, maxUnitsBySide, capReachedBySide: maxUnitsBySide.map(n => n === 70), restoreChecks,
    enteredOvertime: g.state.time >= 300, overtimeSeconds: round(Math.max(0, g.state.time - 300)),
    enteredCollapse: g.state.time > 420, collapseSeconds: round(Math.max(0, g.state.time - 420)),
    crossings: {warned: warning.size, transit: transit.size, landed: landed.size},
    policyActions: {...memory}, openings,
    enemyFinalForce: Object.fromEntries(Object.keys(BUILDINGS).map(type => [type, enemyBuildings.filter(b => b.type === type).length]))};
}

const games = [];
for (const mapId of mapIds) {
  assert.ok(Object.hasOwn(MAPS, mapId), 'Missing lab map: ' + mapId);
  for (const difficulty of difficultiesFor(mapId)) for (const policy of POLICIES) for (const seed of seedValues) for (const playerSide of [0, 1]) for (const order of orders)
    games.push(match({mapId, difficulty, policy, seed, playerSide, order}));
  process.stderr.write(`Completed ${mapId}: ${games.length} games\n`);
}
const rows = [];
for (const mapId of mapIds) for (const difficulty of difficultiesFor(mapId)) for (const policy of POLICIES) {
  const selected = games.filter(g => g.mapId === mapId && g.difficulty === difficulty && g.policy === policy);
  const count = outcome => selected.filter(g => g.outcome === outcome).length;
  rows.push({mapId, difficulty, policy, games: selected.length, wins: count('win'), losses: count('loss'), draws: count('draw'),
    winsBySide: [0, 1].map(side => selected.filter(g => g.playerSide === side && g.outcome === 'win').length),
    winsBySideAndOrder: [0, 1].flatMap(playerSide => orders.map(order => {
      const cohort = selected.filter(g => g.playerSide === playerSide && g.order === order);
      return {playerSide, order, games: cohort.length, wins: cohort.filter(g => g.outcome === 'win').length,
        losses: cohort.filter(g => g.outcome === 'loss').length, draws: cohort.filter(g => g.outcome === 'draw').length};
    })),
    meanSeconds: round(selected.reduce((n, g) => n + g.seconds, 0) / selected.length),
    overtimeGames: selected.filter(g => g.enteredOvertime).length, collapseGames: selected.filter(g => g.enteredCollapse).length,
    maxUnitsBySide: [0, 1].map(side => Math.max(...selected.map(g => g.maxUnitsBySide[side]))),
    capReachedGamesBySide: [0, 1].map(side => selected.filter(g => g.capReachedBySide[side]).length),
    crossings: Object.fromEntries(['warned', 'transit', 'landed'].map(k => [k, selected.reduce((n, g) => n + g.crossings[k], 0)])),
    failureExamples: selected.filter(g => g.outcome === 'loss').slice(0, 2).map(g => ({seed: g.seed, playerSide: g.playerSide, order: g.order, seconds: g.seconds,
      enteredOvertime: g.enteredOvertime, enteredCollapse: g.enteredCollapse, maxUnitsBySide: g.maxUnitsBySide,
      opponentCitadelHP: g.citadelHP[1 - g.playerSide], income120: g.income120, enemyFinalForce: g.enemyFinalForce}))});
}
const comparisons = [];
for (const [plain, crossing] of [['two-roads', 'two-roads-crosswind'], ['three-roads', 'three-roads-crosswind']]) {
  const paired = games.filter(g => g.mapId === crossing).map(g => {
    const control = games.find(c => c.mapId === plain && c.difficulty === g.difficulty && c.policy === g.policy && c.seed === g.seed && c.playerSide === g.playerSide && c.order === g.order);
    assert.ok(control);
    return {difficulty: g.difficulty, policy: g.policy, seed: g.seed, playerSide: g.playerSide, order: g.order,
      plain: control.outcome, crossing: g.outcome, secondsDelta: round(g.seconds - control.seconds), crossings: g.crossings};
  });
  comparisons.push({plain, crossing, pairs: paired.length, outcomesChanged: paired.filter(p => p.plain !== p.crossing).length,
    changes: paired.filter(p => p.plain !== p.crossing),
    meanSecondsDelta: round(paired.reduce((n, p) => n + p.secondsDelta, 0) / paired.length)});
}
const report = {schemaVersion: 2, engineHash: hash('./engine.js'), policyHash: hash('./policies.mjs'), harnessHash: hash('./balance.mjs'),
  node: process.version, seeds: seedValues, seedMode, orders, stepSeconds: .05, maxSeconds: 600,
  seedMeaning: 'Spread uses a fixed 32-bit integer mixer after initial seed 51001; consecutive starts at 51001. These are deterministic pseudo-random seeds, not a representative human sample.',
  orderMeaning: 'Only the initial simultaneous decision event changes player/rival order. Later absolute-side decision ordering is identical. Easy AI still waits its normal 7 seconds.',
  playerDecisionSeconds: 5, aiDecisionSeconds: 'easy: initial 7, then 14–17; normal: 5–8; hard: 3–6, seeded',
  rules: 'Unmodified free barracks and 420 gold. Legal paid build/upgrade only for bots; unmodified paid AI actions. No injected state. All games run to a terminal outcome.',
  limits: 'Scripted diagnostics, not human difficulty evidence. Small seed sample. Player policies do not cast spells or salvage; the rival uses its normal AI spell behavior. Crossing timings include only phases observed at fixed steps; killed units may warn without landing. Overtime/collapse metrics measure clock exposure, not cause of defeat. No map-specific retuning. Easy cohort covers Single Road only.',
  resumeAudit: 'At every 30-second checkpoint, roundtrip equality is followed by restored versus uninterrupted next-fixed-step equality before replacing the active instance. Bot memory and actor timers are external diagnostic state, not engine save contents.',
  games: games.length, restoreChecks: games.reduce((n, g) => n + g.restoreChecks, 0),
  elapsedSeconds: round((performance.now() - started) / 1000), rows, comparisons, results: games};
const json = JSON.stringify(report, null, 2) + '\n';
if (output) writeFileSync(output, json);
process.stdout.write(json);
