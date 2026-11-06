import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { GamepadInput, radialDeadzone, moveCursor, nextFocusIndex, nextAffordableIndex, spatialFocusIndex } from '../dist/controller.js';
const check = (name, fn) => test(`controller: ${name}`, fn);
const pad = (overrides = {}) => ({
  id: 'Fixture pad', index: 0, mapping: 'standard', connected: true,
  buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })),
  axes: [0, 0, 0, 0], ...overrides,
});
function harness(options = {}) {
  let pads = [pad()];
  const actions = [], moves = [], connections = [];
  const input = new GamepadInput({
    getGamepads: () => pads,
    onAction: (event) => actions.push(event),
    onMove: (frame) => moves.push(frame),
    onConnection: (event) => connections.push(event),
    ...options,
  });
  return { input, actions, moves, connections,
    get pad() { return pads[0]; },
    set pads(value) { pads = value; },
    update: (now, context = 'gameplay') => input.update(now, context),
  };
}
function button(p, index, value) {
  p.buttons[index] = { pressed: value === true, value: value === true ? 1 : Number(value) || 0 };
}
const names = (frame) => frame.actions.map((event) => event.action);
const zero = { x: 0, y: 0 };

check('imports and constructs without browser globals', () => {
  assert.equal(typeof GamepadInput, 'function');
  const frame = new GamepadInput().update(0);
  assert.equal(frame.connected, false);
  assert.deepEqual(frame.actions, []);
  assert.deepEqual(frame.cursor, zero);
});
check('missing, denied and malformed providers return an idle frame', () => {
  for (const getGamepads of [() => null, () => undefined, () => ({}), () => 3,
    () => { throw new Error('SecurityError'); }]) {
    const frame = new GamepadInput({ getGamepads }).update(0);
    assert.equal(frame.connected, false);
    assert.deepEqual(frame.actions, []);
  }
});
check('sparse lists and unsupported mappings do not falsely claim support', () => {
  const h = harness();
  h.pads = [null, undefined, pad({ mapping: '' }), pad({ connected: false, index: 3 })];
  assert.equal(h.update(0).connected, false);
  const p = pad({ index: 6 });
  h.pads = [null, p];
  assert.equal(h.update(16).gamepad.index, 6);
  assert.equal(h.connections.length, 1);
  assert.equal(h.connections[0].connected, true);
});
check('explicit nonstandard mapping opt-in permits custom hardware', () => {
  const h = harness({ allowUnmapped: true, mapping: { buttons: { confirm: 7 } } });
  h.pad.mapping = '';
  h.update(0);
  button(h.pad, 7, true);
  assert.deepEqual(names(h.update(16)), ['confirm']);
});
check('active controller ownership survives reordering and ignores a second pad', () => {
  const first = pad({ index: 4 }), second = pad({ index: 1, id: 'Second pad' });
  const h = harness();
  h.pads = [null, first, second];
  assert.equal(h.update(0).gamepad.index, 4);
  button(second, 0, true);
  h.pads = [second, null, first];
  assert.deepEqual(names(h.update(16)), []);
  button(first, 0, true);
  assert.deepEqual(names(h.update(32)), ['confirm']);
  assert.equal(h.connections.length, 1);
});
check('disconnect clears motion and replacement controller rearms held controls', () => {
  const h = harness();
  h.update(0);
  h.pad.axes[0] = 1;
  assert.equal(h.update(16).cursor.x, 1);
  h.pads = [];
  const disconnected = h.update(32);
  assert.equal(disconnected.connected, false);
  assert.deepEqual(disconnected.cursor, zero);
  assert.equal(h.connections.at(-1).connected, false);
  const replacement = pad();
  button(replacement, 0, true);
  h.pads = [replacement];
  assert.deepEqual(names(h.update(48)), []);
  button(replacement, 0, false);
  h.update(64);
  button(replacement, 0, true);
  assert.deepEqual(names(h.update(80)), ['confirm']);
});
check('connect suppresses held buttons and sticks until neutral', () => {
  const h = harness();
  button(h.pad, 0, true);
  h.pad.axes = [1, 0, -1, 0];
  assert.deepEqual(names(h.update(0)), []);
  assert.deepEqual(h.update(100).cursor, zero);
  assert.deepEqual(h.update(116).camera, zero);
  button(h.pad, 0, false);
  h.pad.axes = [0, 0, 0, 0];
  h.update(132);
  button(h.pad, 0, true);
  h.pad.axes = [1, 0, -1, 0];
  const frame = h.update(148);
  assert.deepEqual(names(frame), ['confirm']);
  assert.deepEqual(frame.cursor, { x: 1, y: 0 });
  assert.deepEqual(frame.camera, { x: -1, y: 0 });
});
check('confirm is one-shot, releases cleanly, and never repeats', () => {
  const h = harness();
  h.update(0);
  button(h.pad, 0, true);
  assert.deepEqual(names(h.update(16)), ['confirm']);
  for (const time of [32, 400, 1000, 10000]) assert.deepEqual(names(h.update(time)), []);
  button(h.pad, 0, false);
  h.update(10016);
  button(h.pad, 0, true);
  assert.deepEqual(names(h.update(10032)), ['confirm']);
  assert.deepEqual(h.actions.map((event) => event.phase), ['press', 'press']);
});
check('direction repeats obey delay and interval with no backlog after a stall', () => {
  const h = harness({ repeatDelay: 300, repeatInterval: 100 });
  h.update(0, 'menu');
  button(h.pad, 15, true);
  assert.deepEqual(h.update(10, 'menu').actions.map((e) => [e.action, e.phase]), [['right', 'press']]);
  assert.deepEqual(names(h.update(309, 'menu')), []);
  assert.equal(h.update(310, 'menu').actions[0].phase, 'repeat');
  assert.deepEqual(names(h.update(409, 'menu')), []);
  assert.equal(h.update(410, 'menu').actions.length, 1);
  assert.equal(h.update(10000, 'menu').actions.length, 1);
  assert.equal(h.update(10001, 'menu').actions.length, 0);
});
check('building card cycling repeats but face actions never do', () => {
  const h = harness({ repeatDelay: 300, repeatInterval: 100 });
  h.update(0);
  button(h.pad, 5, true);
  button(h.pad, 3, true);
  assert.ok(names(h.update(10)).includes('nextCard'));
  assert.deepEqual(names(h.update(310)), ['nextCard']);
});
check('context mode and scope changes prevent held-button click-through', () => {
  const h = harness();
  h.update(0, { mode: 'menu', key: 'title' });
  button(h.pad, 0, true);
  assert.deepEqual(names(h.update(16, { mode: 'menu', key: 'title' })), ['confirm']);
  assert.deepEqual(names(h.update(32, { mode: 'menu', key: 'settings' })), []);
  assert.deepEqual(names(h.update(1000, { mode: 'menu', key: 'settings' })), []);
  button(h.pad, 0, false);
  h.update(1016, { mode: 'menu', key: 'settings' });
  button(h.pad, 0, true);
  assert.deepEqual(names(h.update(1032, { mode: 'menu', key: 'settings' })), ['confirm']);
  assert.deepEqual(names(h.update(1048, 'gameplay')), []);
});
check('reset rearms input and clears frame delta', () => {
  const h = harness();
  h.update(0);
  button(h.pad, 0, true);
  h.update(16);
  h.input.reset();
  assert.deepEqual(names(h.update(32)), []);
  assert.equal(h.update(48).dt, 0.016);
  button(h.pad, 0, false);
  h.update(64);
  button(h.pad, 0, true);
  assert.deepEqual(names(h.update(80)), ['confirm']);
});
check('reset in an action callback cancels other same-frame actions', () => {
  let input;
  const p = pad(), events = [];
  input = new GamepadInput({ getGamepads: () => [p], onAction: (event) => {
    events.push(event.action);
    input.reset();
  } });
  input.update(0);
  button(p, 0, true);
  button(p, 1, true);
  const frame = input.update(16);
  assert.equal(events.length, 1);
  assert.equal(frame.actions.length, 1);
  assert.deepEqual(frame.cursor, zero);
});
check('disabled and unknown contexts suppress commands and continuous movement', () => {
  for (const context of ['disabled', 'unknown']) {
    const h = harness();
    h.update(0);
    button(h.pad, 0, true);
    h.pad.axes = [1, 0, 1, 0];
    const frame = h.update(16, context);
    assert.deepEqual(names(frame), []);
    assert.deepEqual(frame.cursor, zero);
    assert.deepEqual(frame.camera, zero);
    assert.deepEqual(names(h.update(32)), []);
    assert.deepEqual(h.update(48).cursor, zero);
  }
});
check('backward and invalid timestamps fail safe and never produce negative delta', () => {
  const h = harness();
  h.update(100);
  button(h.pad, 0, true);
  const backward = h.update(50);
  assert.deepEqual(names(backward), []);
  assert.equal(backward.dt, 0);
  assert.equal(h.update(NaN).dt, 0);
  assert.equal(h.update(Infinity).dt, 0);
  button(h.pad, 0, false);
  h.update(1000);
  button(h.pad, 0, true);
  assert.deepEqual(names(h.update(1016)), ['confirm']);
  assert.equal(h.update(10000).dt, 0.05);
});
check('analog buttons use hysteresis and numeric or boolean samples are accepted', () => {
  const h = harness();
  h.update(0);
  button(h.pad, 0, 0.56);
  assert.deepEqual(names(h.update(16)), ['confirm']);
  button(h.pad, 0, 0.49);
  assert.deepEqual(names(h.update(32)), []);
  button(h.pad, 0, 0.56);
  assert.deepEqual(names(h.update(48)), []);
  button(h.pad, 0, 0.39);
  h.update(64);
  h.pad.buttons[0] = 1;
  assert.deepEqual(names(h.update(80)), ['confirm']);
  h.pad.buttons[0] = false;
  h.update(96);
  h.pad.buttons[0] = true;
  assert.deepEqual(names(h.update(112)), ['confirm']);
});
check('menu stick emits one dominant direction and does not move the cursor', () => {
  const h = harness();
  h.update(0, 'menu');
  h.pad.axes = [1, 0.8, 1, 0];
  const frame = h.update(16, 'menu');
  assert.deepEqual(names(frame), ['right']);
  assert.deepEqual(frame.cursor, zero);
  assert.deepEqual(frame.camera, zero);
  h.pad.axes[0] = 0;
  h.pad.axes[1] = -1;
  assert.deepEqual(names(h.update(32, 'menu')), ['up']);
});
check('menu stick hysteresis prevents spurious release around the press threshold', () => {
  const h = harness();
  h.update(0, 'menu');
  for (const [time, x, events] of [[16, 0.8, ['right']], [32, 0.65, []],
    [48, 0.8, []], [64, 0.3, []], [80, 0.8, ['right']]]) {
    h.pad.axes[0] = x;
    assert.deepEqual(names(h.update(time, 'menu')), events);
  }
});
check('D-pad takes priority over menu stick and opposite directions cancel', () => {
  const h = harness();
  h.update(0, 'menu');
  h.pad.axes[0] = 1;
  button(h.pad, 12, true);
  assert.deepEqual(names(h.update(16, 'menu')), ['up']);
  button(h.pad, 13, true);
  assert.deepEqual(names(h.update(32, 'menu')), []);
});
check('custom mapping merges defaults and supports disabled or multi-button bindings', () => {
  const mapping = { buttons: { confirm: [2, 7], focus: null, pause: [] },
    sticks: { cursor: [4, 5] } };
  const h = harness({ mapping });
  h.pad.axes = [0, 0, 0, 0, 0, 0];
  h.update(0);
  button(h.pad, 0, true);
  button(h.pad, 9, true);
  assert.deepEqual(names(h.update(16)), []);
  button(h.pad, 2, true);
  assert.deepEqual(names(h.update(32)), ['confirm']);
  button(h.pad, 2, false);
  h.update(48);
  button(h.pad, 7, true);
  h.pad.axes[4] = 1;
  const frame = h.update(64);
  assert.deepEqual(names(frame), ['confirm']);
  assert.equal(frame.cursor.x, 1);
  assert.deepEqual(mapping.buttons.confirm, [2, 7], 'caller mapping was mutated');
});
check('precision is continuous, rearms, and emits no action', () => {
  const h = harness();
  h.update(0);
  button(h.pad, 6, true);
  const frame = h.update(16);
  assert.equal(frame.precision, true);
  assert.deepEqual(names(frame), []);
  button(h.pad, 6, false);
  assert.equal(h.update(32).precision, false);
});
check('malformed samples remain finite and do not invent actions', () => {
  const h = harness();
  h.pad.axes = [NaN, Infinity, '1', undefined];
  h.pad.buttons = [null, {}, { value: NaN }, { value: Infinity }];
  assert.deepEqual(h.update(0).cursor, zero);
  const frame = h.update(16);
  assert.deepEqual(frame.camera, zero);
  assert.deepEqual(names(frame), []);
});
check('callbacks match emitted actions, connection changes, and movement frames', () => {
  const h = harness();
  h.update(0);
  button(h.pad, 0, true);
  h.pad.axes[0] = 1;
  const frame = h.update(16);
  assert.deepEqual(h.actions, frame.actions);
  assert.deepEqual(h.moves.at(-1), frame);
  h.update(32);
  assert.equal(h.connections.length, 1);
  h.pads = [];
  h.update(48);
  h.update(64);
  assert.equal(h.connections.length, 2);
  assert.deepEqual(h.moves.at(-1).cursor, zero);
});

check('radial deadzone removes drift, rescales range, and clamps diagonal speed', () => {
  assert.deepEqual(radialDeadzone(0.1, 0.1), zero);
  assert.deepEqual(radialDeadzone(0.2, 0), zero);
  assert.ok(Math.abs(radialDeadzone(0.6, 0).x - 0.5) < 1e-12);
  const diagonal = radialDeadzone(1, 1);
  assert.ok(Math.abs(Math.hypot(diagonal.x, diagonal.y) - 1) < 1e-12);
  assert.deepEqual(radialDeadzone(-1, 0), { x: -1, y: 0 });
  assert.deepEqual(radialDeadzone(NaN, Infinity), zero);
});
check('cursor movement is frame-rate independent, precision-scaled and bounds-clamped', () => {
  const bounds = { width: 1000, height: 600 }, start = { x: 100, y: 100 };
  let point = start;
  for (let i = 0; i < 10; i++) point = moveCursor(point, { x: 1, y: 0 }, 0.01, bounds, { speed: 100 });
  assert.equal(point.x, 110);
  assert.equal(start.x, 100);
  assert.equal(moveCursor(start, { x: 1, y: 0 }, 0.05, bounds, { speed: 100, precision: true }).x, 101.5);
  assert.deepEqual(moveCursor({ x: 999, y: 599 }, { x: 1, y: 1 }, 10, bounds, { speed: 100 }), { x: 1000, y: 600 });
  assert.deepEqual(moveCursor({ x: -50, y: 700 }, zero, 0, bounds), { x: 0, y: 600 });
  assert.equal(moveCursor(start, { x: 1, y: 0 }, 10, bounds, { speed: 100 }).x, 105);
});
check('cursor numeric safety and diagonal normalization survive malformed inputs', () => {
  const point = moveCursor(null, { x: NaN, y: Infinity }, NaN, { width: NaN, height: -1 });
  assert.deepEqual(point, zero);
  const moved = moveCursor(zero, { x: 1, y: 1 }, 0.05, { width: 100, height: 100 }, { speed: 100 });
  assert.ok(Math.abs(Math.hypot(moved.x, moved.y) - 5) < 1e-12);
});
check('linear focus navigation skips hidden/disabled controls and wraps all eight cards', () => {
  const cards = Array.from({ length: 8 }, (_, index) => ({ id: index }));
  assert.equal(nextFocusIndex(cards, 7, 1), 0);
  assert.equal(nextFocusIndex(cards, 0, -1), 7);
  cards[1].disabled = true;
  cards[2].hidden = true;
  assert.equal(nextFocusIndex(cards, 0, 1), 3);
  assert.equal(nextFocusIndex(cards, -1, 1), 0);
  assert.equal(nextFocusIndex(cards, -1, -1), 7);
  assert.equal(nextFocusIndex([], 0, 1), -1);
  assert.equal(nextFocusIndex([{ disabled: true }], 0, 1), -1);
  assert.equal(nextFocusIndex(cards, 7, 1, { wrap: false }), 7);
});
check('affordable card cycling skips expensive neighbors and wraps in both directions', () => {
  const cards = [140, 175, 270, 220, 190, 230, 250].map((cost) => ({ cost }));
  assert.equal(nextAffordableIndex(cards, 1, 1, 200), 4, 'Archery must skip Foundry and Watchtower to Gold mine');
  assert.equal(nextAffordableIndex(cards, 1, -1, 200), 0);
  assert.equal(nextAffordableIndex(cards, 4, 1, 200), 0);
  assert.equal(nextAffordableIndex(cards, 0, -1, 200), 4);
  assert.equal(nextAffordableIndex(cards, -1, 1, 200), 0);
  assert.equal(nextAffordableIndex(cards, -1, -1, 200), 4);
  assert.equal(nextAffordableIndex(cards, 1, 1, 270), 2, 'Exact affordability is sufficient');
  assert.equal(nextAffordableIndex(cards, 0, -10, 200), 4, 'Direction magnitude does not skip entries');
});
check('affordable cycling never returns the selected card or toggles the only affordable one off', () => {
  const cards = [140, 175, 270, 220, 190, 230, 250].map((cost) => ({ cost }));
  for (const direction of [-1, 1]) {
    assert.equal(nextAffordableIndex(cards, 0, direction, 150), -1);
    assert.equal(nextAffordableIndex(cards, -1, direction, 139), -1);
    assert.equal(nextAffordableIndex([{ cost: 0 }], 0, direction, 0), -1);
    assert.equal(nextAffordableIndex([{ cost: 0 }], -1, direction, 0), 0);
  }
});
check('affordable cycling rejects malformed costs and budgets without modifying the input', () => {
  const cards = Object.freeze([null, {}, { cost: -1 }, { cost: NaN },
    { cost: Infinity }, { cost: '10' }, Object.freeze({ cost: 10 })]);
  assert.equal(nextAffordableIndex(cards, -1, 1, 10), 6);
  assert.equal(nextAffordableIndex(cards, 999, -1, 10), 6);
  assert.equal(nextAffordableIndex(cards, 1.5, 1, 10), 6);
  for (const gold of [-1, NaN, Infinity, undefined, '100'])
    assert.equal(nextAffordableIndex(cards, -1, 1, gold), -1);
  for (const list of [[], null, undefined, {}])
    assert.equal(nextAffordableIndex(list, -1, 1, 10), -1);
});
check('affordable cycling is bounded to one pass even when every other card is too expensive', () => {
  let reads = 0;
  const cards = Array.from({ length: 1000 }, () => ({ get cost() { reads++; return 100; } }));
  assert.equal(nextAffordableIndex(cards, 100, 1, 0), -1);
  assert.equal(reads, 999);
  reads = 0;
  assert.equal(nextAffordableIndex(cards, -1, -1, 0), -1);
  assert.equal(reads, 1000);
});
check('spatial focus selects directional neighbors and never crosses an unavailable item', () => {
  const items = [
    { x: 0, y: 0, width: 10, height: 10 },
    { x: 40, y: 0, width: 10, height: 10 },
    { x: 0, y: 40, width: 10, height: 10 },
    { x: -40, y: 0, width: 10, height: 10 },
    { x: 0, y: -40, width: 10, height: 10, hidden: true },
    { x: 15, y: 0, width: 10, height: 10, disabled: true },
  ];
  assert.equal(spatialFocusIndex(items, 0, 'right'), 1);
  assert.equal(spatialFocusIndex(items, 0, 'down'), 2);
  assert.equal(spatialFocusIndex(items, 0, 'left'), 3);
  assert.equal(spatialFocusIndex(items, 0, 'up'), 0);
  assert.equal(spatialFocusIndex(items, -1, 'right'), 0);
  assert.equal(spatialFocusIndex([], 0, 'right'), -1);
});

check('configuration rejects invalid bindings and preserves the shared defaults', async () => {
  const { DEFAULT_MAPPING } = await import('../dist/controller.js');
  assert.ok(Object.isFrozen(DEFAULT_MAPPING));
  assert.ok(Object.isFrozen(DEFAULT_MAPPING.buttons.confirm));
  for (const mapping of [
    { buttons: { confirm: -1 } },
    { buttons: { confirm: 1.5 } },
    { buttons: { confirm: [0, NaN] } },
    { sticks: { cursor: [0] } },
    { sticks: { cursor: [0, 0] } },
  ]) assert.throws(() => new GamepadInput({ mapping }), TypeError);
  const h = harness({ mapping: { sticks: { cursor: null } } });
  h.update(0);
  h.pad.axes[0] = 1;
  assert.deepEqual(h.update(16).cursor, zero);
  assert.deepEqual(DEFAULT_MAPPING.buttons.confirm, [0]);
});
check('a controller replacement in the same slot triggers disconnect and fresh ownership', () => {
  const h = harness();
  h.update(0);
  const replacement = pad({ id: 'Different controller' });
  button(replacement, 0, true);
  h.pads = [replacement];
  assert.deepEqual(names(h.update(16)), []);
  assert.deepEqual(h.connections.map((event) => event.connected), [true, false, true]);
  assert.equal(h.connections[1].gamepad.id, 'Fixture pad');
  assert.equal(h.connections[2].gamepad.id, 'Different controller');
});
check('held menu stick on connection cannot navigate until released', () => {
  const h = harness();
  h.pad.axes[0] = 1;
  assert.deepEqual(names(h.update(0, 'menu')), []);
  assert.deepEqual(names(h.update(1000, 'menu')), []);
  h.pad.axes[0] = 0;
  h.update(1016, 'menu');
  h.pad.axes[0] = 1;
  assert.deepEqual(names(h.update(1032, 'menu')), ['right']);
});
check('focus helpers handle disabled current items and invalid geometry deterministically', () => {
  const items = [{}, { disabled: true }, {}, { hidden: true }];
  assert.equal(nextFocusIndex(items, 1, 1), 2);
  assert.equal(nextFocusIndex(items, 1, -1), 0);
  assert.equal(nextFocusIndex(items, 3, 1), 0);
  assert.equal(nextFocusIndex(items, 0, 1000000), 0);
  const rect = { x: 0, y: 0, width: 10, height: 10 };
  const spatial = [{ rect }, { rect: { ...rect, x: NaN } },
    { rect: { ...rect, x: 100 } }, { rect: { ...rect, x: 20, y: 70 } }];
  assert.equal(spatialFocusIndex(spatial, 0, 'right'), 2);
  assert.equal(spatialFocusIndex(spatial, 0, 'invalid'), 0);
  assert.equal(spatialFocusIndex([null, {}], -1, 'down'), -1);
});
check('seeded mixed polling always produces finite bounded motion and one-shot face actions', () => {
  let seed = 81723;
  const random = () => ((seed = Math.imul(seed, 1664525) + 1013904223 >>> 0) / 4294967296);
  const h = harness();
  let now = 0;
  h.update(now);
  for (let i = 0; i < 4000; i++) {
    now += random() * 100;
    h.pad.axes = Array.from({ length: 4 }, () => random() * 2.4 - 1.2);
    for (let b = 0; b < 17; b++) button(h.pad, b, random() < 0.1);
    const frame = h.update(now, i % 133 === 0 ? 'disabled' : i % 77 < 15 ? 'menu' : 'gameplay');
    for (const axis of [frame.cursor, frame.camera]) {
      assert.ok(Number.isFinite(axis.x) && Number.isFinite(axis.y));
      assert.ok(Math.hypot(axis.x, axis.y) <= 1 + 1e-12);
    }
    assert.ok(frame.dt >= 0 && frame.dt <= 0.05);
    for (const event of frame.actions) {
      if (['confirm', 'cancel', 'pause', 'focus', 'rally'].includes(event.action))
        assert.equal(event.phase, 'press');
    }
    assert.equal(new Set(frame.actions.map((event) => event.action)).size, frame.actions.length);
  }
});

check('module import and construction never touch navigator, document or animation scheduling', () => {
  const moduleURL = new URL('../dist/controller.js', import.meta.url).href;
  const result = spawnSync(process.execPath, ['--input-type=module', '--eval', `
    import assert from 'node:assert/strict';
    for (const name of ['navigator', 'document', 'requestAnimationFrame']) {
      Object.defineProperty(globalThis, name, { configurable: true, get() {
        throw new Error('Unexpected browser access: ' + name);
      } });
    }
    const { GamepadInput } = await import(${JSON.stringify(moduleURL)});
    const input = new GamepadInput();
    assert.equal(input.update(0).connected, false);
  `], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
});
