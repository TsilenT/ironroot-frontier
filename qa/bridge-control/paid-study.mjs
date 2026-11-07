/** Fixed, preregistered paid synthetic comparison; no runtime writes or publication. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync, existsSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import {Game, worldX} from '../../dist/engine.js';
import {bridgeZones, bridgeStatus} from '../../dist/bridge-control.js';

const root = new URL('./', import.meta.url);
const planBytes = readFileSync(new URL('study-plan.json', root));
const plan = JSON.parse(planBytes);
const sha = value => createHash('sha256').update(value).digest('hex');
const round = value => Math.round(value * 1e6) / 1e6;
const DT = plan.fixedStepSeconds, EPS = 1e-6;
const output = process.argv[2] || 'study-results.json';
assert.match(output, /^[a-z0-9-]+\.json$/);
assert.ok(!existsSync(new URL(output, root)), 'Keep prior evidence: choose a new output filename instead of overwriting.');
const runtimeFiles = ['engine.js', 'rulesets.js', 'bridge-control.js', 'autonomous-air.js'];
const sourceHashes = Object.fromEntries(runtimeFiles.map(file => [file, sha(readFileSync(new URL('../../dist/' + file, import.meta.url)))]));

function playerPolicy(game, side, name, state) {
  const policy = plan.policies[name];
  const index = state.built;
  const type = index < policy.opening.length ? policy.opening[index] : policy.repeat[(index - policy.opening.length) % policy.repeat.length];
  const order = [game.map.startingLane, ...game.map.lanes.map((_, i) => i).filter(i => i !== game.map.startingLane)];
  const repeatCycle = Math.floor((index - policy.opening.length) / policy.repeat.length);
  const lane = index < policy.opening.length || name === 'concentrated-rush' ? game.map.startingLane : order[repeatCycle % order.length];
  const lanes = name === 'concentrated-rush' ? [lane] : [lane, ...order.filter(i => i !== lane)];
  const columns = type === 'mint' ? [...game.map.siteColumns] : [...game.map.siteColumns].reverse();
  // Waiting for the requested producer is intentional; no affordability-driven
  // composition substitution hides the effect of additional gold.
  if (game.state.gold[side] + 1e-9 < game.buildings[type].cost) return false;
  for (const candidate of lanes) {
    for (const home of columns) {
      const result = game.build(type, worldX(game.map, side, home), game.map.lanes[candidate], side);
      if (result.ok) { state.built++; return true; }
    }
  }
  const own = game.state.buildings.filter(b => b.side === side && b.hp > 0 && lanes.includes(b.lane));
  const capacity = lanes.length * game.map.siteColumns.length;
  if (own.length < capacity) return false;
  const upgrades = own.filter(b => game.buildings[b.type].unit && b.level < 3)
    .sort((a, b) => a.level - b.level || a.id - b.id);
  for (const building of upgrades) {
    if (game.upgrade(building.id, side).ok) return true;
  }
  return false;
}

function gameResult(spec) {
  const g = new Game({mapId: spec.mapId, difficulty: plan.difficulty, seed: spec.seed, ai: false, rulesetId: plan.modes[spec.mode]});
  const ledger = {initial: [420, 420], base: [0, 0], mines: [0, 0], bridge: [0, 0], spent: [0, 0], refunds: [0, 0], maxResidual: 0, accepted: [0, 0], rejected: [0, 0], bridgeDependentLedgerActions: [0, 0]};
  const actions = [], spawnCounts = [{}, {}], attackCounts = [{}, {}], firstSpawns = [{}, {}], snapshots = [];
  const captures = [], bridges = bridgeZones(g.map), ownerStreak = bridges.map(() => ({owner: null, start: 0, emptyStart: null, longestEmpty: 0, emptySeconds: 0, blockedSeconds: 0, airDenialSeconds: 0}));
  const ownership = {firstCapture: null, switches: 0, paidWhileEmpty: [0, 0], totalEmptySeconds: 0, maxUninterruptedEmptyOwnership: 0, everOwned: bridges.map(() => []), ownerEpochs: [], transitions: captures};
  let checkpointCount = 0, aiTimer = 0, maxBridgeRate = 0, maxArmy = [0, 0];
  const state = {built: 0};
  const inZone = (u, z) => u.hp > 0 && Object.hasOwn(g.units, u.type) && Math.abs(u.x - z.x) <= z.width / 2 && Math.abs(u.y - z.y) <= z.height / 2;
  const checkLedger = () => {
    for (const side of [0, 1]) {
      const expected = 420 + ledger.base[side] + ledger.mines[side] + ledger.bridge[side] + g.state.stats.kills[side] * 2 - ledger.spent[side] + ledger.refunds[side];
      const residual = Math.abs(expected - g.state.gold[side]);
      ledger.maxResidual = Math.max(ledger.maxResidual, residual);
      assert.ok(Number.isFinite(g.state.gold[side]) && g.state.gold[side] >= 0, `${spec.id}: nonfinite or negative gold ${side}`);
      assert.ok(residual <= EPS, `${spec.id}: side ${side} unexplained ledger residual ${residual}`);
    }
  };
  for (const name of ['build', 'upgrade', 'cast', 'sell']) {
    const raw = g[name];
    g[name] = function(...args) {
      const side = args[name === 'build' ? 3 : name === 'cast' ? 2 : 1] ?? 0;
      const previous = name === 'upgrade' || name === 'sell' ? this.state.buildings.find(b => b.id === args[0]) : null;
      const gold = this.state.gold[side], kills = this.state.stats.kills[side];
      const cost = name === 'build' ? this.buildings[args[0]]?.cost : name === 'cast' ? this.ruleset.spell.cost : name === 'upgrade' && previous ? this.upgradeCost(previous) : 0;
      const result = raw.apply(this, args);
      if (result.ok) {
        const refunded = result.refund || 0;
        assert.ok(Number.isFinite(cost), `${spec.id}: undefined accepted action price`);
        assert.ok(gold >= cost, `${spec.id}: unaffordable accepted action`);
        assert.ok(Math.abs(gold - cost + refunded + 2 * (this.state.stats.kills[side] - kills) - this.state.gold[side]) <= 1e-7, `${spec.id}: wrong ${name} price`);
        ledger.accepted[side]++; ledger.spent[side] += cost; ledger.refunds[side] += refunded;
        const bridgeDependentLedger = cost > 0 && gold - ledger.bridge[side] < cost - 1e-9;
        if (bridgeDependentLedger) ledger.bridgeDependentLedgerActions[side]++;
        const b = result.building || previous;
        actions.push({at: round(this.state.time), actor: side === spec.playerSide ? 'player' : 'ai', side, name, type: name === 'build' ? args[0] : b?.type ?? null, lane: b?.lane ?? null, level: b?.level ?? null, cost, refund: refunded, goldBefore: round(gold), bridgeEarnedBefore: round(ledger.bridge[side]), bridgeDependentLedger});
      } else {
        ledger.rejected[side]++;
        assert.equal(this.state.gold[side], gold, `${spec.id}: rejected ${name} changed gold`);
      }
      return result;
    };
  }
  const spawn = g._spawn;
  g._spawn = function(building) {
    const next = this.nextId;
    const result = spawn.call(this, building);
    const u = this.state.units.find(unit => unit.id === next);
    if (u) {
      spawnCounts[u.side][u.type] = (spawnCounts[u.side][u.type] || 0) + 1;
      firstSpawns[u.side][u.type] ??= round(this.state.time);
    }
    return result;
  };
  const fire = g._fire;
  g._fire = function(attacker, ...args) {
    if (Object.hasOwn(this.units, attacker.type)) attackCounts[attacker.side][attacker.type] = (attackCounts[attacker.side][attacker.type] || 0) + 1;
    return fire.call(this, attacker, ...args);
  };
  const checkpoint = () => {
    const saved = g.serialize();
    const a = Game.restore(saved), b = Game.restore(saved);
    assert.deepEqual(a.serialize(), saved, `${spec.id}: strict restore roundtrip`);
    a.update(DT); b.update(DT);
    assert.deepEqual(a.serialize(), b.serialize(), `${spec.id}: restored continuation`);
    // Compare the serialized-state clone to a second clone constructed from the
    // measured live object, without advancing the measured game or its ledger.
    const direct = Object.create(Object.getPrototypeOf(g));
    Object.defineProperties(direct, Object.getOwnPropertyDescriptors(g));
    direct.state = structuredClone(g.state); direct.damageQueue = null;
    for (const method of ['build', 'upgrade', 'cast', 'sell', '_spawn', '_fire']) delete direct[method];
    direct.update(DT);
    assert.deepEqual(a.serialize(), direct.serialize(), `${spec.id}: live-vs-restored next step`);
    checkpointCount++;
  };
  const snapshot = () => ({at: round(g.state.time), baseHp: g.state.bases.map(b => round(b.hp)), gold: g.state.gold.map(round), spent: [...ledger.spent], mineReceipts: ledger.mines.map(round), bridgeReceipts: ledger.bridge.map(round), kills: [...g.state.stats.kills], army: [0, 1].map(side => g.state.units.filter(u => u.side === side && u.hp > 0).length), bridges: spec.mode === 'enabled' ? bridgeStatus(g).map(b => ({lane: b.lane, owner: b.owner, capturing: b.capturing, progress: round(b.progress), blocked: b.blocked, income: b.income})) : []});
  checkpoint(); snapshots.push(snapshot());
  const snapshotFrames = new Set([30, 60, 90, 180, 300, 420, 600].map(s => Math.round(s / DT)));
  for (let frame = 0; frame < Math.round(plan.maximumSimulatedSeconds / DT) && g.state.winner === null; frame++) {
    if (frame % Math.round(plan.playerDecisionEverySeconds / DT) === 0) {
      for (let n = 0; n < plan.playerMaximumSuccessfulActionsPerDecision; n++) if (!playerPolicy(g, spec.playerSide, spec.policy, state)) break;
    }
    for (const side of [0, 1]) {
      ledger.base[side] += 5 * DT;
      ledger.mines[side] += g.state.buildings.filter(b => b.side === side && b.type === 'mint' && b.hp > 0).reduce((sum, b) => sum + g.buildings.mint.income * (1 + .5 * (b.level - 1)), 0) * DT;
    }
    const previousControl = g.state.bridgeControl ? structuredClone(g.state.bridgeControl) : null;
    const previousTick = g.tick;
    g.update(DT);
    assert.equal(g.tick, previousTick + 1, `${spec.id}: exactly one measured fixed step`);
    if (spec.mode === 'enabled') {
      const delta = g.state.bridgeControl.earned.map((value, side) => value - previousControl.earned[side]);
      assert.ok(delta.every(value => value >= -1e-9), `${spec.id}: bridge receipt decreased`);
      assert.ok(delta[0] + delta[1] <= .5 * DT + 1e-9, `${spec.id}: bridge payment exceeds map-wide cap`);
      maxBridgeRate = Math.max(maxBridgeRate, (delta[0] + delta[1]) / DT);
      for (const side of [0, 1]) ledger.bridge[side] += delta[side];
      const status = bridgeStatus(g);
      const emptyPaid = [0, 0];
      for (const zone of bridges) {
        const lane = zone.lane, current = status[lane], previous = previousControl.bridges[lane], streak = ownerStreak[lane];
        const occupants = g.state.units.filter(u => inZone(u, zone));
        if (current.owner !== previous.owner) {
          assert.ok(current.owner === 0 || current.owner === 1, `${spec.id}: lingering owner was cleared`);
          assert.ok(previous.capturing === current.owner && previous.progress + DT >= 2 - 1e-7, `${spec.id}: owner changed without full capture`);
          assert.ok(occupants.some(u => u.side === current.owner && !u.flying) && occupants.every(u => u.side === current.owner), `${spec.id}: capture without uncontested living ground`);
          if (previous.owner !== null) {
            ownership.switches++;
            ownership.ownerEpochs.push({lane, owner: previous.owner, from: round(streak.start), to: round(g.state.time), endedBy: 'enemy-ground-recapture'});
          }
          ownership.firstCapture ??= round(g.state.time);
          if (!ownership.everOwned[lane].includes(current.owner)) ownership.everOwned[lane].push(current.owner);
          captures.push({at: round(g.state.time), lane, from: previous.owner, to: current.owner});
          streak.owner = current.owner; streak.start = g.state.time; streak.emptyStart = null;
        }
        if (current.owner !== null && occupants.length === 0) {
          streak.emptyStart ??= g.state.time - DT;
          const duration = g.state.time - streak.emptyStart;
          streak.longestEmpty = Math.max(streak.longestEmpty, duration);
          streak.emptySeconds += DT; ownership.totalEmptySeconds += DT;
          ownership.maxUninterruptedEmptyOwnership = Math.max(ownership.maxUninterruptedEmptyOwnership, duration);
          if (previous.owner === current.owner && !current.blocked) emptyPaid[current.owner] += .5 / bridges.length * DT;
        } else streak.emptyStart = null;
        if (current.owner !== null && current.blocked) {
          streak.blockedSeconds += DT;
          if (occupants.some(u => u.side !== current.owner && u.flying) && !occupants.some(u => u.side !== current.owner && !u.flying)) streak.airDenialSeconds += DT;
        }
      }
      for (const side of [0, 1]) {
        assert.ok(emptyPaid[side] <= delta[side] + 1e-8, `${spec.id}: empty payout accounting exceeds actual receipts`);
        ownership.paidWhileEmpty[side] += emptyPaid[side];
      }
    } else assert.equal(g.state.bridgeControl, undefined, `${spec.id}: disabled mode gained bridge state`);
    checkLedger();
    if (g.state.winner === null) {
      aiTimer -= DT;
      if (aiTimer <= 0) { g._ai(1 - spec.playerSide); aiTimer = 5 + g.random() * 3; }
    }
    checkLedger();
    for (const side of [0, 1]) maxArmy[side] = Math.max(maxArmy[side], g.state.units.filter(u => u.side === side && u.hp > 0).length);
    if ((frame + 1) % Math.round(60 / DT) === 0) checkpoint();
    if (snapshotFrames.has(frame + 1)) snapshots.push(snapshot());
  }
  checkpoint();
  if (snapshots.at(-1).at !== round(g.state.time)) snapshots.push(snapshot());
  if (spec.mode === 'enabled') for (const [lane, streak] of ownerStreak.entries()) if (streak.owner !== null) ownership.ownerEpochs.push({lane, owner: streak.owner, from: round(streak.start), to: round(g.state.time), endedBy: 'observation-end'});
  const early = snapshots.find(s => Math.abs(s.at - 90) < EPS) || null;
  const leader = values => values[0] === values[1] ? 'tied' : values[0] > values[1] ? 0 : 1;
  return {
    ...spec, rulesetId: g.ruleset.id, seconds: round(g.state.time), winner: g.state.winner,
    outcome: g.state.winner === null ? 'ongoing' : g.state.winner === 'draw' ? 'draw' : g.state.winner === spec.playerSide ? 'player-win' : 'ai-win',
    baseHp: g.state.bases.map(b => round(b.hp)), maxArmy, spawns: spawnCounts, firstSpawns, attacks: attackCounts,
    checkpointCount, maxBridgeRate: round(maxBridgeRate), ledger: {...ledger, killBounty: g.state.stats.kills.map(k => k * 2), finalGold: [...g.state.gold]},
    early90: early ? {citadelLeader: leader(early.baseHp), payoutLeader: leader(early.bridgeReceipts), armyCountLeader: leader(early.army), ...early} : null,
    winningSideBridgeReceipts: typeof g.state.winner === 'number' ? round(ledger.bridge[g.state.winner]) : null,
    ownership: {...ownership, bridges: ownerStreak.map((entry, lane) => ({lane, longestEmpty: round(entry.longestEmpty), emptySeconds: round(entry.emptySeconds), blockedSeconds: round(entry.blockedSeconds), airDenialSeconds: round(entry.airDenialSeconds)}))},
    actions, snapshots, finalStateSha256: sha(JSON.stringify(g.serialize()))
  };
}

function comparisons(results) {
  return results.filter(r => r.mode === 'enabled').map(on => {
    const off = results.find(r => r.mode === 'disabled' && r.mapId === on.mapId && r.policy === on.policy && r.playerSide === on.playerSide && r.seed === on.seed);
    const byType = [];
    for (const actor of ['player', 'ai']) for (const type of ['barracks', 'mint', 'archery', 'wardenLodge', 'aerie', 'foundry', 'sanctum', 'watchtower']) {
      const a = on.actions.filter(a => a.actor === actor && a.name === 'build' && a.type === type), b = off.actions.filter(a => a.actor === actor && a.name === 'build' && a.type === type);
      if (a.length || b.length) byType.push({actor, type, onCount: a.length, offCount: b.length, firstOn: a[0]?.at ?? null, firstOff: b[0]?.at ?? null, firstDelta: a[0] && b[0] ? round(a[0].at - b[0].at) : null});
    }
    const key = a => a ? `${a.at}/${a.actor}/${a.name}/${a.type}/${a.lane}/${a.level}` : null;
    let firstDiff = null;
    for (let i = 0; i < Math.max(on.actions.length, off.actions.length); i++) if (key(on.actions[i]) !== key(off.actions[i])) { firstDiff = {actionIndex: i, enabled: on.actions[i] ?? null, disabled: off.actions[i] ?? null}; break; }
    return {mapId: on.mapId, policy: on.policy, playerSide: on.playerSide, seed: on.seed, onOutcome: on.outcome, offOutcome: off.outcome, onSeconds: on.seconds, offSeconds: off.seconds, durationDelta: round(on.seconds - off.seconds), outcomeChanged: on.outcome !== off.outcome, playerBridge: round(on.ledger.bridge[on.playerSide]), aiBridge: round(on.ledger.bridge[1 - on.playerSide]), playerSpendDelta: on.ledger.spent[on.playerSide] - off.ledger.spent[on.playerSide], aiSpendDelta: on.ledger.spent[1 - on.playerSide] - off.ledger.spent[1 - on.playerSide], firstDifferentAction: firstDiff, firstBuildTimes: byType};
  });
}
const startedAtUtc = new Date().toISOString(), started = performance.now(), results = [], failures = [];
const report = () => ({study: plan.study, startedAtUtc, completedAtUtc: new Date().toISOString(), elapsedSeconds: round((performance.now() - started) / 1000), planSha256: sha(planBytes), sourceHashes, declaredGames: plan.games, completedGames: results.length, failures, results, comparisons: comparisons(results.filter(r => r.mode === 'disabled' || results.some(x => x.mode === 'disabled' && x.mapId === r.mapId && x.policy === r.policy && x.playerSide === r.playerSide && x.seed === r.seed))), limitations: [plan.scope, 'One declared seed and normal AI only; mirrored sides are separate simulations, not assumed identical outcomes.', 'Paid scripted decisions are synthetic and faster/more consistent than human input. No native browser/UI evidence is provided by this study.', 'Open-ended games remaining alive at 600 seconds are ongoing. No forced endings or policy/reward tuning.', 'Bridge-dependent ledger action means current gold minus cumulative bridge receipts would not pay for the action with all other recorded transactions held fixed. Diverging kill/build histories prevent interpreting this as a full causal counterfactual.', 'The 90-second citadel leader can be tied; army count and payout leaders are separate descriptive values.', 'Zone occupancy is the engine fixed-step sample; crossing time is quantized to 0.05 seconds. Empty payout accounting counts only stable owners empty in the post-step sample.']});
try {
  for (const mapId of plan.maps) for (const policy of Object.keys(plan.policies)) for (const playerSide of plan.playerSides) for (const seed of plan.seeds) for (const mode of Object.keys(plan.modes)) {
    const spec = {id: [mapId, policy, playerSide, seed, mode].join('/'), mapId, policy, playerSide, seed, mode};
    try { results.push(gameResult(spec)); console.log(JSON.stringify({completed: results.length, ...spec, outcome: results.at(-1).outcome, seconds: results.at(-1).seconds})); }
    catch (error) { failures.push({spec, message: error.message, stack: error.stack}); throw error; }
  }
  assert.equal(results.length, plan.games);
} finally { writeFileSync(new URL(output, root), JSON.stringify(report(), null, 2) + '\n'); }
