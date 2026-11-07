import test from 'node:test';
import assert from 'node:assert/strict';
import { createContext, runInContext } from 'node:vm';
import { readFileSync } from 'node:fs';
import { installSyntheticGamepad } from '../qa/browser/synthetic-gamepad-provider.mjs';
import { GamepadInput, moveCursor, nextAffordableIndex } from '../dist/controller.js';
import { Game } from '../dist/engine.js';
import { campaignBuildChoices } from '../dist/campaign-flow.js';

const plain = value => JSON.parse(JSON.stringify(value));

function harness({ point = { x: 100, y: 100 }, offset = { x: 30, y: 80 } } = {}) {
  let now = 0, position = { ...point }, visible = true, geometryReads = 0;
  // Read-only DOM geometry. Only the real moveCursor output below can update
  // the rendered position; the provider has no position/style setter.
  const cursor = Object.freeze({
    getBoundingClientRect: () => {
      geometryReads++;
      return visible
        ? Object.freeze({ x: offset.x + position.x - 7, y: offset.y + position.y - 7, width: 14, height: 14 })
        : Object.freeze({ x: 0, y: 0, width: 0, height: 0 });
    },
  });
  const context = createContext({
    navigator: {},
    performance: { now: () => now },
    document: Object.freeze({ getElementById: id => id === 'controllerCursor' ? cursor : null }),
  });
  context.window = context;
  // Match Playwright's serialized addInitScript, rather than relying on any
  // Node closure or injecting the app's private controller/cursor objects.
  runInContext(`(${installSyntheticGamepad.toString()})()`, context);
  const events = [], samples = [];
  const getGamepads = () => {
    const sample = context.navigator.getGamepads();
    samples.push(plain(sample));
    return sample;
  };
  const input = new GamepadInput({
    getGamepads,
    onAction: event => events.push(event),
    onMove: frame => {
      position = moveCursor(position, frame.cursor, frame.dt, { width: 1200, height: 900 },
        { speed: 570, precision: frame.precision, padding: 20 });
    },
  });
  return {
    input, events, samples,
    hardware: context.__qaPad,
    controls: context.__qaGamepad,
    get polls() { return context.__qaPadPolls; },
    get geometryReads() { return geometryReads; },
    get position() { return { x: offset.x + position.x, y: offset.y + position.y }; },
    hideCursor() { visible = false; },
    sample(time) { now = time; return getGamepads(); },
    update(time, scope = 'gameplay') { now = time; return input.update(time, scope); },
  };
}

test('sampled tap releases its hardware without mutating the returned pressed snapshot', () => {
  const h = harness();
  h.controls.tap(5);
  h.hardware.axes[0] = 0.5;
  const pressed = h.sample(450)[0];
  assert.equal(pressed.buttons[5].pressed, true);
  assert.equal(pressed.buttons[5].value, 1);
  assert.equal(h.hardware.buttons[5], false);
  h.controls.neutral();
  assert.equal(pressed.buttons[5].pressed, true);
  assert.equal(pressed.axes[0], 0.5);
  const released = h.sample(2000)[0];
  assert.equal(released.buttons[5].pressed, false);
  assert.equal(released.buttons[5].value, 0);
  assert.deepEqual(plain(released.axes), [0, 0, 0, 0]);
  assert.equal(h.polls, 2);
});

for (const delay of [16, 331, 350, 450, 2000]) {
  test(`one sampled bumper tap cannot repeat with a ${delay} ms scheduling delay`, () => {
    const h = harness();
    h.update(0);
    h.controls.tap(5);
    h.update(delay);
    // No runner release command is sent. Even a subsequent long frame sees
    // neutral input, rather than the runtime's intentional 350 ms repeat.
    h.update(delay + 450);
    h.update(delay + 1000);
    assert.deepEqual(h.events.map(({ action, phase }) => [action, phase]), [['nextCard', 'press']]);
    assert.deepEqual(h.samples.map(sample => sample[0].buttons[5].pressed), [false, true, false, false]);
  });
}

test('discrete bumpers retain the real affordable-card order under repeated long delays', () => {
  const h = harness(), game = new Game({ seed: 919, ai: false });
  const types = campaignBuildChoices(null, { buildings: game.buildings });
  const cards = types.map(type => game.buildings[type]);
  let selected = -1, now = 0;
  const selections = [];
  h.update(now);
  for (const button of [5, 5, 5, 4]) {
    h.controls.tap(button);
    const frame = h.update(now += 450);
    for (const event of frame.actions) {
      selected = nextAffordableIndex(cards, selected, event.action === 'nextCard' ? 1 : -1, 202);
      selections.push(types[selected]);
    }
    assert.deepEqual(h.update(now += 700).actions, []);
  }
  assert.deepEqual(selections, ['barracks', 'archery', 'mint', 'archery']);
  assert.equal(h.events.length, 4);
});

test('explicit held bumper still exercises production repeat delay and interval', () => {
  const h = harness();
  h.update(0);
  h.controls.hold(5);
  for (const now of [16, 365, 366, 475, 476, 1000]) h.update(now);
  assert.deepEqual(h.events.map(({ time, phase }) => [time, phase]),
    [[16, 'press'], [366, 'repeat'], [476, 'repeat'], [1000, 'repeat']]);
  assert.equal(h.hardware.buttons[5], true);
  h.controls.neutral();
  assert.deepEqual(h.update(1500).actions, []);
});

test('explicit held confirm survives a scope reset without click-through and rearms after release', () => {
  const h = harness();
  h.update(0, { mode: 'menu', key: 'title' });
  h.controls.hold(0);
  assert.equal(h.update(16, { mode: 'menu', key: 'title' }).actions[0].action, 'confirm');
  h.input.reset();
  for (const now of [32, 350, 650, 1000]) {
    assert.deepEqual(h.update(now, 'gameplay').actions, []);
    assert.equal(h.hardware.buttons[0], true);
  }
  h.controls.neutral();
  h.update(1016);
  h.controls.tap(0);
  assert.equal(h.update(1032).actions[0].action, 'confirm');
  assert.deepEqual(h.events.map(({ action, phase }) => [action, phase]),
    [['confirm', 'press'], ['confirm', 'press']]);
});

for (const frameGap of [16, 80, 450]) {
  test(`sampled steering reaches the unchanged bound and stays neutral with ${frameGap} ms frames`, () => {
    const h = harness(), target = { x: 490, y: 320 };
    h.update(0);
    h.controls.steerTo(target);
    let now = 0;
    for (let frame = 0; frame < 400 && h.controls.steering.status === 'moving'; frame++) {
      h.update(now += frameGap);
    }
    assert.equal(h.controls.steering.status, 'arrived');
    const stopped = h.position;
    assert.ok(Math.hypot(target.x - stopped.x, target.y - stopped.y) < 8);
    assert.ok(h.geometryReads > 1);
    assert.deepEqual(h.samples.at(-1)[0].axes, [0, 0, 0, 0]);
    assert.equal(h.samples.at(-1)[0].buttons[6].pressed, false);
    // Simulate an arbitrarily late runner neutral command. The application's
    // actual movement function consumes only neutral samples in the meantime.
    for (const delay of [16, 450, 2000, 10000]) {
      h.update(now += delay);
      assert.deepEqual(h.position, stopped);
    }
    assert.ok(Math.hypot(target.x - h.position.x, target.y - h.position.y) < 15);
  });
}

test('steering preserves the strict 8 px stop threshold and does not move an already reached cursor', () => {
  const h = harness();
  h.update(0);
  const original = h.position;
  h.controls.steerTo({ x: original.x + 8, y: original.y });
  assert.deepEqual(plain(h.sample(16)[0].axes), [0.5, 0, 0, 0]);
  assert.equal(h.controls.steering.status, 'moving');
  h.controls.steerTo({ x: original.x + 7.999, y: original.y });
  assert.deepEqual(plain(h.sample(450)[0].axes), [0, 0, 0, 0]);
  assert.equal(h.controls.steering.status, 'arrived');
  assert.deepEqual(h.position, original);
});

test('missing rendered cursor stops synthetic motion rather than claiming arrival', () => {
  const h = harness();
  h.controls.steerTo({ x: 600, y: 600 });
  h.sample(16);
  h.hideCursor();
  const sample = h.sample(450)[0];
  assert.equal(h.controls.steering.status, 'cursor unavailable');
  assert.deepEqual(plain(sample.axes), [0, 0, 0, 0]);
  assert.equal(sample.buttons[6].pressed, false);
});

test('neutral input and disconnect cancel pending taps and steering without stale reconnect motion', () => {
  const h = harness();
  h.controls.tap(0);
  h.controls.neutral();
  assert.equal(h.sample(16)[0].buttons[0].pressed, false);
  h.controls.steerTo({ x: 600, y: 600 });
  h.sample(32);
  h.hardware.connected = false;
  assert.deepEqual(plain(h.sample(48)), []);
  h.hardware.connected = true;
  const sample = h.sample(64)[0];
  assert.deepEqual(plain(sample.axes), [0, 0, 0, 0]);
  assert.ok(sample.buttons.every(button => button.pressed === false));
  assert.equal(h.controls.steering, null);
});

test('invalid synthetic commands fail before they change an existing input', () => {
  const h = harness();
  h.controls.hold(5);
  for (const index of [-1, 17, 0.5, NaN]) assert.throws(() => h.controls.tap(index), /button index/);
  for (const target of [null, {}, { x: NaN, y: 0 }, { x: 0, y: Infinity }]) {
    assert.throws(() => h.controls.steerTo(target), /finite coordinates/);
  }
  assert.equal(h.sample(16)[0].buttons[5].pressed, true);
});

test('browser consumers retain deliberate 650 ms holds and the original placement assertions', () => {
  const read = name => readFileSync(new URL(`../qa/browser/${name}`, import.meta.url), 'utf8');
  const accessibility = read('accessibility-backup.spec.mjs');
  const build = read('build-completion.spec.mjs');
  const helpers = read('synthetic-gamepad-helpers.mjs');
  assert.equal((accessibility.match(/holdPadButton\(page,0,650\)/g) || []).length, 2);
  for (const source of [accessibility, build]) assert.match(source, /from '\.\/synthetic-gamepad-helpers\.mjs'/);
  assert.match(accessibility, /gold\[0\]\)\.toBeLessThan\(220\)/);
  assert.match(accessibility, /b\.side===0&&b\.type==='archery'\)\)\.toHaveLength\(1\)/);
  assert.match(build, /await frozenPurchase\(page,1,280\)/);
  assert.match(build, /state\.gold\[0\]\)\.toBe\(gold\)/);
  assert.match(build, /state\.buildings\.filter\(b=>b\.side===0\)\)\.toHaveLength\(count\)/);
  assert.match(helpers, /toBeLessThan\(15\)/);
  assert.doesNotMatch(helpers.slice(helpers.indexOf('export async function padButton'), helpers.indexOf('export async function holdPadButton')), /waitForTimeout/);
});
