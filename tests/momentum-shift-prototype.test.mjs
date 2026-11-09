import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, readdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {Game} from '../dist/engine.js';
import {SHIFT, createShift, validateShift, restoreShift, viewShift, stepShift, pulseHits} from '../qa/momentum-shift/kernel.mjs';

const frame = (state, extra = {}) => ({tick: state.tick + 1, playerHp: 6000, enemyHp: 2100, bossHp: state.bossHp, ...extra});
const step = (state, extra) => stepShift(state, frame(state, extra));
const until = (state, to, extra) => {
  const intents = [];
  while (state.tick < to) {
    const out = step(state, extra); state = out.state; intents.push(...out.intents);
  }
  return {state, intents};
};
const deployed = variant => until(createShift(variant), 1 + SHIFT.warningTicks).state;

test('QA identity is explicit, immutable and not a campaign/ruleset registration', () => {
  assert.equal(SHIFT.id, 'qa-momentum-shift'); assert.equal(SHIFT.revision, 1);
  assert.equal(SHIFT.bossMaxHp, 10000); assert.equal(SHIFT.warningTicks / SHIFT.hz, 8);
  assert.ok(Object.isFrozen(SHIFT.variants['bounded-boss']));
  assert.throws(() => { SHIFT.variants['bounded-boss'].damage = 1; });
  for (const name of readdirSync(fileURLToPath(new URL('../dist/', import.meta.url))).filter(p => /\.(js|html)$/.test(p))) {
    assert.doesNotMatch(readFileSync(new URL(`../dist/${name}`, import.meta.url), 'utf8'), /qa-momentum-shift|momentum-shift\/kernel/);
  }
});

test('trigger is fixed low HP, not time, hidden player power or a renewed subsidy', () => {
  let state = createShift();
  const waiting = until(state, 1000, {enemyHp: 2100.00001}); state = waiting.state;
  assert.equal(state.phase, 'armed'); assert.deepEqual(waiting.intents, []);
  const out = step(state); assert.equal(out.state.warningAt, 1001);
  assert.deepEqual(out.intents, [{type: 'warn-breakout', deployAt: 1161, variant: 'bounded-boss'}]);
});

test('warning cannot be erased by enemy healing or repeatedly retriggered', () => {
  const first = step(createShift());
  const next = until(first.state, 160, {enemyHp: 6000});
  assert.equal(next.state.phase, 'warning'); assert.deepEqual(next.intents, []);
  assert.equal(viewShift(next.state).warningSeconds, .05);
  const out = step(next.state, {enemyHp: 6000});
  assert.equal(out.state.phase, 'recovering'); assert.equal(out.state.deployedAt, 161);
  assert.deepEqual(out.intents.map(i => i.type), ['deploy-boss', 'breakout-pulse']);
  assert.equal(out.state.bossHp, 10000);
});

for (const variant of Object.keys(SHIFT.variants)) test(`${variant}: exactly one pulse and one counterpush across repeated low health`, () => {
  const out = until(createShift(variant), 1000);
  assert.equal(out.state.phase, 'pushing');
  assert.deepEqual(out.intents.map(i => i.type), ['warn-breakout', 'deploy-boss', 'breakout-pulse', 'begin-counterpush']);
  assert.equal(out.intents.find(i => i.type === 'breakout-pulse').kind, SHIFT.variants[variant].kind);
});

test('four-second recovery is damageable, then starts pushing on exactly its due tick', () => {
  let state = deployed(); const spawn = state.tick;
  let out = step(state, {bossHp: 9000}); state = out.state;
  assert.equal(state.phase, 'recovering'); assert.equal(state.bossHp, 9000);
  out = until(state, spawn + SHIFT.recoveryTicks - 1);
  assert.equal(out.state.phase, 'recovering'); assert.equal(viewShift(out.state).recoverySeconds, .05);
  out = step(out.state); assert.equal(out.state.phase, 'pushing');
  assert.deepEqual(out.intents, [{type: 'begin-counterpush'}]);
});

for (const offset of [1, SHIFT.recoveryTicks, SHIFT.recoveryTicks + 1]) test(`boss defeat at deployment +${offset} is permanent and wins precedence over movement`, () => {
  let state = deployed(); state = until(state, state.tick + offset - 1).state;
  const death = step(state, {bossHp: 0});
  assert.equal(death.state.phase, 'spent'); assert.deepEqual(death.intents, [{type: 'boss-defeated'}]);
  const later = until(death.state, death.state.tick + 400);
  assert.equal(later.state.phase, 'spent'); assert.deepEqual(later.intents, []);
});

for (const at of [1, 40, 161, 162, 241, 300]) for (const [playerHp, enemyHp, outcome] of [[1, 0, 'won'], [0, 1, 'lost'], [0, 0, 'draw']]) {
  test(`core ${outcome} at ${at} precedes threshold, deployment, recovery or boss state`, () => {
    const state = until(createShift(), at - 1).state;
    const out = step(state, {playerHp, enemyHp});
    assert.equal(out.state.phase, 'ended'); assert.equal(out.state.outcome, outcome);
    assert.equal(out.state.endedAt, at); assert.deepEqual(out.intents, []);
    assert.throws(() => step(out.state), /ended/);
  });
}

test('a race win can bypass a living boss without a hidden core HP floor', () => {
  const state = deployed();
  const out = step(state, {playerHp: 1, enemyHp: 0, bossHp: 9900});
  assert.equal(out.state.outcome, 'won'); assert.equal(out.state.bossHp, 9900);
});

test('simultaneous boss and core defeat saves terminal bookkeeping without extra intents', () => {
  const out = step(deployed(), {playerHp: 0, enemyHp: 0, bossHp: 0});
  assert.equal(out.state.outcome, 'draw'); assert.equal(out.state.spentAt, out.state.tick);
  assert.deepEqual(out.intents, []); assert.deepEqual(restoreShift(out.state), out.state);
});

test('all phase boundaries resume the exact same state and intent stream', () => {
  for (const cut of [0, 1, 80, 160, 161, 162, 240, 241, 300]) {
    const state = until(createShift(), cut).state;
    const saved = JSON.parse(JSON.stringify(state)), clone = restoreShift(saved);
    assert.notEqual(clone, saved);
    assert.deepEqual(until(clone, 500), until(state, 500));
  }
  const spent = step(deployed(), {bossHp: 0}).state;
  assert.deepEqual(until(restoreShift(spent), 400), until(spent, 400));
});

test('projection is detached and repeated render/evaluation cannot emit intents or change state', () => {
  const state = until(createShift(), 100).state, original = structuredClone(state);
  for (let n = 0; n < 100; n++) { const view = viewShift(state); view.phase = 'pushing'; }
  assert.deepEqual(state, original);
  const input = frame(state), inputCopy = structuredClone(input);
  stepShift(Object.freeze(state), Object.freeze(input));
  assert.deepEqual(input, inputCopy); assert.deepEqual(state, original);
});

test('duplicate, skipped, fractional and backward ticks fail rather than reapply an intent', () => {
  const state = step(createShift()).state;
  for (const tick of [0, 1, 1.5, 3, -1, NaN, Infinity, SHIFT.maxTick + 1]) {
    assert.throws(() => stepShift(state, frame(state, {tick})));
  }
});

test('seven-day limit safely preserves a pending final-tick warning instead of simulating past its ceiling', () => {
  const state = {...createShift(), tick: SHIFT.maxTick - 1};
  const out = step(state);
  assert.equal(out.state.tick, SHIFT.maxTick); assert.equal(out.state.phase, 'warning');
  assert.equal(out.intents[0].deployAt, SHIFT.maxTick + SHIFT.warningTicks);
  const saved = JSON.parse(JSON.stringify(out.state));
  assert.deepEqual(restoreShift(saved), out.state); assert.equal(viewShift(out.state).warningSeconds, 8);
  assert.throws(() => step(out.state), /frame tick/);
  assert.deepEqual(out.state, saved); assert.equal(out.state.outcome, null);
});

test('strict phase saves reject cross-identity, unknown fields and inconsistent deployment clocks', () => {
  const state = deployed();
  for (const changes of [
    {id: 'frontier-campaign-momentum'}, {revision: 2}, {variant: '__proto__'},
    {phase: 'surprise'}, {bonusGold: 1000}, {warningAt: null}, {warningAt: 2},
    {deployedAt: state.tick + 1}, {bossHp: 10001}, {bossHp: NaN}, {bossHp: 0},
    {spentAt: state.tick}, {outcome: 'won'}, {endedAt: state.tick},
    {phase: 'pushing'}, {phase: 'armed'}, {phase: 'spent'}, {phase: 'warning'},
    {tick: state.tick + SHIFT.recoveryTicks}
  ]) assert.throws(() => restoreShift({...state, ...changes}), JSON.stringify(changes));
  const absent = {...state}; delete absent.warningAt; assert.throws(() => restoreShift(absent));
  assert.throws(() => restoreShift(Object.assign(Object.create(null), state)));
  assert.throws(() => restoreShift(Object.defineProperty({...state}, 'bossHp', {get() {throw Error('getter ran');}})), /fields/);
  assert.throws(() => createShift('reserve-not-implemented'));
});

test('frame admission rejects healing, nonexistent bosses, missing/extra fields and invalid core HP', () => {
  const state = deployed();
  for (const changes of [{bossHp: 10001}, {bossHp: null}, {playerHp: -1}, {enemyHp: 6001}, {enemyHp: NaN}, {freeGold: 2}]) {
    assert.throws(() => stepShift(state, frame(state, changes)));
  }
  assert.throws(() => step(createShift(), {bossHp: 10000}));
  const input = frame(state); delete input.bossHp; assert.throws(() => stepShift(state, input));
});

test('strict restoration rejects unreachable terminal histories and damaged spawn-tick bosses', () => {
  const ending = step(until(createShift(), 100).state, {enemyHp: 0}).state;
  assert.throws(() => restoreShift({...ending, tick: 1000, endedAt: 1000}), /missed deployment/);
  assert.throws(() => restoreShift({...ending, warningAt: ending.endedAt}), /precede termination/);
  const active = deployed();
  assert.throws(() => restoreShift({...active, bossHp: 1}), /full boss HP/);
  const ended = step(active, {enemyHp: 0, bossHp: 0}).state;
  assert.throws(() => restoreShift({...ended, spentAt: null}), /defeat tick/);
  assert.throws(() => restoreShift({...ended, tick: active.tick, endedAt: active.tick, spentAt: null, bossHp: 10000}), /precede termination/);
});

test('local pulse includes exact edge, excludes allies/dead/far troops, is order-independent and never mutates', () => {
  const centre = {x: 3090, y: 450, side: 1};
  const unit = (id, x, hp = 180, side = 0) => ({id, side, x, y: 450, hp});
  const troops = [unit(3, 2850), unit(2, 2849.99999), unit(1, 3090, 65), unit(4, 3090, 0), unit(5, 3090, 800, 1)];
  const before = structuredClone(troops);
  assert.deepEqual(pulseHits('bounded-boss', centre, troops), [{id: 1, damage: 65}, {id: 3, damage: 150}]);
  assert.deepEqual(pulseHits('lethal-boss', centre, troops), [{id: 1, damage: 65}, {id: 3, damage: 180}]);
  assert.deepEqual(pulseHits('bounded-boss', centre, [...troops].reverse()), pulseHits('bounded-boss', centre, troops));
  assert.deepEqual(troops, before);
});

test('capped pulse preserves meaningful composition differences, literal full-clear remains separately inspectable', () => {
  const centre = {x: 3090, y: 450, side: 1};
  const troops = [65, 90, 125, 180, 240, 800].map((hp, i) => ({id: i + 1, side: 0, x: 3000, y: 450, hp}));
  const capped = pulseHits('bounded-boss', centre, troops), lethal = pulseHits('lethal-boss', centre, troops);
  assert.deepEqual(troops.map((u, i) => u.hp - capped[i].damage), [0, 0, 0, 30, 90, 650]);
  assert.ok(troops.every((u, i) => u.hp === lethal[i].damage));
});

test('240px inner clear explicitly leaves long-range core besiegers outside its area', () => {
  const centre = {x: 3090, y: 450, side: 1}, g = new Game({ai: false});
  const troops = ['archer', 'siege'].map((type, i) => ({id: i + 1, side: 0, x: centre.x - g.units[type].range - 55, y: centre.y, hp: g.units[type].hp}));
  assert.deepEqual(troops.map(u => centre.x - u.x), [260, 275]);
  assert.deepEqual(pulseHits('lethal-boss', centre, troops), []);
});

test('pulse rejects duplicate IDs, invalid troop records and sparse input', () => {
  const centre = {x: 3090, y: 450, side: 1}, u = {id: 1, side: 0, x: 3000, y: 450, hp: 180};
  for (const troops of [[u, u], [{...u, hp: -1}], [{...u, type: 'base'}], new Array(1)]) {
    assert.throws(() => pulseHits('bounded-boss', centre, troops));
  }
});

test('pulse cannot bypass validation with custom iterators, accessors, array properties or prototypes', () => {
  const centre = {x: 3090, y: 450, side: 1}, u = {id: 1, side: 0, x: 3000, y: 450, hp: 180};
  const skipped = [{...u, id: -99}]; Object.defineProperty(skipped, Symbol.iterator, {value: function* () {}});
  assert.throws(() => pulseHits('bounded-boss', centre, skipped), /array fields/);
  let reads = 0;
  const unstable = [u]; Object.defineProperty(unstable, '0', {enumerable: true, get() { reads++; return reads === 1 ? u : {...u, id: -99, hp: 1e99}; }});
  assert.throws(() => pulseHits('lethal-boss', centre, unstable), /array fields/); assert.equal(reads, 0);
  const extra = [u]; extra.note = 'not JSON array data'; assert.throws(() => pulseHits('bounded-boss', centre, extra));
  const inherited = [u]; Object.setPrototypeOf(inherited, Object.create(Array.prototype)); assert.throws(() => pulseHits('bounded-boss', centre, inherited));
  const unsafeUnit = {...u}; Object.defineProperty(unsafeUnit, 'hp', {get() { throw Error('getter ran'); }});
  assert.throws(() => pulseHits('bounded-boss', centre, [unsafeUnit]), /fields/);
  assert.deepEqual(pulseHits('bounded-boss', Object.freeze(centre), Object.freeze([Object.freeze(u)])), [{id: 1, damage: 150}]);
});

test('unchanged engine remains ordinary-save-compatible and rejects injected phase state / fake 10k warrior', () => {
  const game = new Game({ai: false, rulesetId: 'frontier-citadel-open'}), original = game.serialize();
  const observed = stepShift(createShift(), {tick: 1, playerHp: game.state.bases[0].hp, enemyHp: game.state.bases[1].hp, bossHp: null});
  assert.equal(observed.state.phase, 'armed'); assert.deepEqual(game.serialize(), original);
  assert.deepEqual(Game.restore(original).serialize(), original);
  const extra = structuredClone(original); extra.state.momentumShift = createShift();
  assert.throws(() => Game.restore(extra), /Invalid saved game/);
  game._spawn(game.state.buildings[0]);
  const fake = game.serialize(); fake.state.units[0].hp = fake.state.units[0].maxHp = 10000;
  assert.throws(() => Game.restore(fake), /health does not match/);
});
