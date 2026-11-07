import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {Game, BUILDINGS} from '../dist/engine.js';
import {Game as HistoricalGame} from '../qa/fixtures/production-v012/dist/engine.js';
import {historicalProfile} from '../qa/browser/production-v012-fixtures.mjs';
import {assertPassiveContinuation} from '../qa/browser/passive-continuation.mjs';

function farBeaconContinuation() {
  const historical = HistoricalGame.restore(historicalProfile('far-beacon').domains.battle.game);
  for (let tick = 0; tick < 13; tick++) historical.update(.05);
  historical.update(.049999999999999996);
  const before = historical.serialize(), continued = HistoricalGame.restore(before);
  // Independent historical engine updates reproduce the exact clock/remainder
  // pair observed in the 598925c cloud report, without the candidate replay loop.
  for (const elapsed of [.25, .25, .19989999999999963]) continued.update(elapsed);
  return {before, after: continued.serialize()};
}

test('Far Beacon replay handles the measured near-full remainder with exactly fourteen ticks', () => {
  const {before, after} = farBeaconContinuation(), originals = JSON.stringify({before, after});
  assert.deepEqual([before.tick, before.state.time, before.accumulator], [13, .65, .049999999999999996]);
  assert.deepEqual([after.tick, after.state.time, after.accumulator], [27, 1.3500000000000005, .04989999999999964]);
  const naive = Game.restore(before); naive.update(.05);
  assert.equal(naive.tick, 15, 'the previous replay actually advanced two ticks on its first call');
  assert.notEqual(after.seed, before.seed, 'the fixture includes real RNG advancement');
  assert.ok(after.state.units.length > before.state.units.length, 'the fixture includes spawned units');
  const evidence = assertPassiveContinuation(before, after);
  assert.deepEqual(evidence, {ticks:14, fixedSeconds:14 * .05, elapsedSeconds:14 * .05 + after.accumulator - before.accumulator, beforeAccumulator:before.accumulator, afterAccumulator:after.accumulator});
  assert.equal(JSON.stringify({before, after}), originals, 'neither observed checkpoint was changed');
});

test('exact replay supports zero ticks, fractional RAF updates and both sides of the tick boundary', () => {
  for (const accumulator of [0, Number.MIN_VALUE, .001, .017, .025, .0499, .049999999999999996]) {
    const historical = new HistoricalGame({seed:120012, mapId:'long-march', ai:false});
    historical.update(accumulator);
    const before = historical.serialize();
    assertPassiveContinuation(before, before);
    for (const frames of [[.000001], [.017, .083, .033], [.25, .25, .1999]]) {
      const continued = HistoricalGame.restore(before);
      for (const elapsed of frames) continued.update(elapsed);
      assertPassiveContinuation(before, continued.serialize());
    }
  }
});

test('replay rejects altered state, RNG, identity and tick progression without dropping serialized fields', () => {
  const {before, after} = farBeaconContinuation();
  for (const mutate of [
    value => value.seed = (value.seed + 1) >>> 0,
    value => value.nextId++,
    value => value.ai = !value.ai,
    value => value.aiTimer += .01,
    value => value.mapId = 'classic',
    value => value.difficulty = 'hard',
    value => value.state.gold[0] += .25,
    value => value.state.units[0].x++,
    value => value.state.buildings[0].level++,
    value => value.state.time += .05,
    value => value.tick++,
    value => delete value.seed,
    value => value.unexpected = true,
  ]) {
    const corrupted = structuredClone(after); mutate(corrupted);
    assert.throws(() => assertPassiveContinuation(before, corrupted));
  }
});

test('both accumulator observations and elapsed time are independently bounded', () => {
  const {before, after} = farBeaconContinuation();
  for (const endpoint of ['before', 'after']) for (const accumulator of [-Number.EPSILON, .05, .07, Infinity, NaN]) {
    const pair = structuredClone({before, after}); pair[endpoint].accumulator = accumulator;
    assert.throws(() => assertPassiveContinuation(pair.before, pair.after), `${endpoint} remainder ${accumulator}`);
  }
  const backwards = structuredClone(before); backwards.accumulator = before.accumulator - Number.EPSILON;
  assert.throws(() => assertPassiveContinuation(before, backwards), /nonnegative elapsed time/);
  const late = HistoricalGame.restore(before);
  for (let tick = 0; tick < 60; tick++) late.update(.05);
  assert.throws(() => assertPassiveContinuation(before, late.serialize()), /bounded forward tick continuation/);
});

const source = readFileSync(new URL('../qa/browser/regression.spec.mjs', import.meta.url), 'utf8');
const caseStart = source.indexOf("test('tap places exactly one building, rejects occupied slot, upgrades and salvages'");
const caseEnd = source.indexOf('\ntest(', caseStart + 1), placementCase = source.slice(caseStart, caseEnd);
const oracleStart = placementCase.indexOf('  expect(snapshot.state.buildings');
const oracleEnd = placementCase.indexOf("  await press(page, '#resume'); await press(page, '#cancelBuild');");
assert.ok(oracleStart >= 0 && oracleEnd > oracleStart, 'locate the actual browser economic assertions');
const economicAssertions = placementCase.slice(oracleStart, oracleEnd);
function assertEconomics(checkpoints) {
  // Execute the actual browser assertion block with Node assertions. This is a
  // pure oracle test, not Playwright execution or evidence of browser input.
  runInNewContext(economicAssertions, {Game, BUILDINGS, ...checkpoints, expect: actual => ({
    toBe: expected => assert.equal(actual, expected),
    toHaveLength: expected => assert.equal(actual.length, expected),
    toBeGreaterThanOrEqual: expected => assert.ok(actual >= expected),
  })});
}
function placementCheckpoints(ticks = 111) {
  const game = new Game({seed:123, ai:false}), baseline = game.serialize();
  assert.equal(game.build('archery', 270, 450).ok, true);
  for (let tick = 0; tick < ticks; tick++) game.update(.05);
  const placed = game.serialize();
  assert.match(game.build('archery', 270, 450).reason, /Too close/);
  for (let tick = 0; tick < 7; tick++) game.update(.05);
  return {baseline, placed, snapshot:game.serialize()};
}

test('actual placement oracle accepts measured income beyond the old fixed gold bound', () => {
  const checkpoints = placementCheckpoints();
  assert.equal(checkpoints.placed.state.gold[0], 272.75);
  assert.ok(checkpoints.placed.state.gold[0] > 420 - BUILDINGS.archery.cost + 25);
  assertEconomics(checkpoints);
  for (const ticks of [0, 1, 20, 199]) assertEconomics(placementCheckpoints(ticks));
});

test('actual placement oracle rejects free builds, duplicate payment, charged rejection and altered income', () => {
  for (const mutate of [
    pair => pair.placed.state.gold[0] += BUILDINGS.archery.cost,
    pair => pair.placed.state.gold[0] -= BUILDINGS.archery.cost,
    pair => pair.snapshot.state.gold[0] -= BUILDINGS.archery.cost,
    pair => pair.snapshot.state.gold[0] += .25,
    pair => pair.snapshot.state.stats.built[0]++,
    pair => pair.snapshot.state.stats.kills[0]++,
    pair => pair.snapshot.state.income[0] = 7.5,
    pair => pair.snapshot.state.time += .05,
    pair => pair.snapshot.tick++,
  ]) {
    const checkpoints = placementCheckpoints(); mutate(checkpoints);
    assert.throws(() => assertEconomics(checkpoints));
  }
});

test('browser case retains ordinary checkpoints, rejection, upgrade and salvage coverage', () => {
  assert.match(placementCase, /const baseline = await pause\(page\)/);
  assert.match(placementCase, /const placed = await pause\(page\)/);
  assert.match(placementCase, /const snapshot = await pause\(page\)/);
  assert.match(placementCase, /\[\[baseline, placed, BUILDINGS\.archery\.cost\], \[placed, snapshot, 0\]\]/);
  assert.match(placementCase, /before\.state\.gold\[0\] - cost \+ \(after\.tick - before\.tick\) \* \(5 \* \.05\)/);
  assert.doesNotMatch(placementCase, /\+ 25|toBeCloseTo|waitForTimeout|test\.skip|test\.setTimeout/);
  for (const assertion of ["toContainText('Too close')", "toHaveText('Archery range')", "press(page, '#upgrade')", "toContainText('Level 2')", "press(page, '#sell')", "toHaveLength(0)"]) assert.ok(placementCase.includes(assertion), assertion);
});
