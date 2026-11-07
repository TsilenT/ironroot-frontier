import test from 'node:test';
import assert from 'node:assert/strict';
import { MAPS, Game, getRuleset, RULESETS } from '../dist/engine.js';
import { supportsFlightOrders, flightGateX } from '../dist/flight-orders.js';
import { buildFlightSignals, flightRouteGeometry, flightViewport, flightBoundsVisible,
  groupFlightCorridors, flightSignalLabel, flightBannerLayout, drawFlightRoutes, drawFlightMinimap } from '../dist/flight-visuals.js';
import { mockCanvas } from './renderer-canvas.mjs';

const ruleset = getRuleset('frontier-flight-open');
const fixture = (map = MAPS.classic) => ({ map, ruleset, state: { units: [], buildings: [] } });
const unit = (map, side = 0, from = 0, to = 1, phase = 'warning', remaining = 2) => ({
  id: 1, hp: 100, type: 'gryphon', side, x: flightGateX(map, ruleset, side),
  y: phase === 'transit' ? (map.lanes[from] + map.lanes[to]) / 2 : map.lanes[from],
  airRoute: { from, to, phase, remaining },
});
const aerie = (map, side = 0, lane = 0, flightPlan = 1) => ({ id: 10 + side, type: 'aerie', side,
  hp: 300, x: side ? map.width - 1250 : 1250, y: map.lanes[lane], lane, flightPlan });
const renderer = (game, scale = .32, width = 390, height = 240) => ({
  c: mockCanvas().c, scale, width, height, camera: game.map.width / 2, reducedMotion: false, vfx: { quality: 'high' },
});
const freeze = value => { if (value && typeof value === 'object' && !Object.isFrozen(value)) {
  for (const child of Object.values(value)) freeze(child); Object.freeze(value);
} return value; };
const labels = canvas => canvas.calls.filter(call => call[0] === 'fillText').map(call => call[1]);

test('gate geometry uses each registered flight identity and map, mirrored for both sides and directions', () => {
  for (const rules of Object.values(RULESETS).filter(supportsFlightOrders)) for (const map of Object.values(MAPS)) {
    for (const side of [0, 1]) for (let from = 0; from < map.lanes.length; from++) for (const to of [from - 1, from + 1]) {
      const actual = flightRouteGeometry(map, rules, side, from, to);
      if (to < 0 || to >= map.lanes.length) { assert.equal(actual, null); continue; }
      assert.deepEqual(actual, { x: flightGateX(map, rules, side), fromY: map.lanes[from], toY: map.lanes[to],
        direction: Math.sign(to - from), midY: (map.lanes[from] + map.lanes[to]) / 2 });
      assert.equal(actual.x, map.width / 2 + (side ? 200 : -200));
    }
    for (const [side, from, to] of [[2, 0, 1], [0, 0, 0], [0, 0, 2], [0, .5, 1], [0, 0, NaN]])
      assert.equal(flightRouteGeometry(map, rules, side, from, to), null);
  }
});

test('old rules, copied rules, and injected route properties draw nothing and do not inspect state', () => {
  for (const rules of [...Object.values(RULESETS).filter(r => !supportsFlightOrders(r)), { ...ruleset }]) {
    const game = { map: MAPS.classic, ruleset: rules, get state() { throw Error('Old state inspected'); } };
    assert.deepEqual(buildFlightSignals(game), { routes: [], preview: null });
    assert.equal(flightRouteGeometry(game.map, rules, 0, 0, 1), null);
    const canvas = mockCanvas(), view = { ...renderer(game), c: canvas.c };
    drawFlightRoutes(view, game, { selected: 10 });
    drawFlightMinimap(canvas.c, game, { width: 240, height: 72 });
    assert.deepEqual(canvas.calls, []);
  }
});

test('many units collapse into stable directional groups, with earliest warning and leading transit marker', () => {
  const game = fixture();
  game.state.units = [unit(game.map, 1, 1, 0, 'transit', 0), unit(game.map, 0, 0, 1, 'warning', 1.8),
    unit(game.map, 0, 0, 1, 'warning', .6), unit(game.map, 0, 0, 1, 'transit', 0),
    { ...unit(game.map, 0, 0, 1, 'transit', 0), y: 400 }, unit(game.map, 0, 1, 0, 'warning', 1.4),
    unit(game.map, 0, 0, 1, 'approach', 2), unit(game.map, 0, 0, 1, 'done', 0)];
  const signals = buildFlightSignals(game);
  assert.equal(signals.routes.length, 3);
  assert.deepEqual(signals.routes.map(r => r.key), ['0:0:1', '0:1:0', '1:1:0']);
  const route = signals.routes[0];
  assert.equal(route.warningCount, 2); assert.equal(route.remaining, .6);
  assert.equal(route.transitCount, 2); assert.equal(route.transitY, 400); assert.equal(route.approachCount, 0);
  assert.equal(flightSignalLabel(route), '↓ 0.6s×2 / AIR×2');
  assert.equal(groupFlightCorridors(signals.routes).length, 2);
  assert.equal(groupFlightCorridors(signals.routes)[0].routes.length, 2);
  assert.deepEqual(buildFlightSignals({ ...game, state: { ...game.state, units: [...game.state.units].reverse() } }), signals);
  assert.equal(buildFlightSignals(game, { includeApproach: true }).routes[0].approachCount, 1);
  assert.equal(flightSignalLabel({ ...route, warningCount: 1, remaining: .00001, transitCount: 0 }), '↓ 0.1s');
});

test('world culls offscreen gateways in both axes while minimap retains launched crossings', () => {
  const game = fixture(MAPS['long-march']); game.state.units = [unit(game.map), unit(game.map, 1)];
  const viewport = { minX: 200, maxX: 900, minY: 150, maxY: 750 };
  assert.equal(buildFlightSignals(game, { viewport }).routes.length, 0);
  assert.equal(buildFlightSignals(game).routes.length, 2);
  assert.equal(buildFlightSignals(game, { viewport: { minX: 1700, maxX: 1900, minY: 200, maxY: 500 } }).routes.length, 1);
  assert.equal(buildFlightSignals(game, { viewport: { minX: 1700, maxX: 1900, minY: 700, maxY: 800 } }).routes.length, 0);
  assert.equal(flightBoundsVisible({ minX: 0, maxX: 100, minY: 0, maxY: 100 }, { minX: 100, maxX: 200, minY: 100, maxY: 200 }), true);
  const canvas = mockCanvas();
  const signals = drawFlightMinimap(canvas.c, game, { width: 240, height: 72 });
  assert.equal(signals.routes.length, 2); assert.ok(canvas.calls.length > 0);
});

test('preview only reads a selected living owned aerie, including source when gateway is offscreen', () => {
  const game = fixture(); game.state.buildings = [aerie(game.map), { ...aerie(game.map, 1),
    get flightPlan() { throw Error('Read an unlaunched enemy plan'); } }];
  assert.equal(buildFlightSignals(game).preview, null);
  assert.equal(buildFlightSignals(game, { selected: 11 }).preview, null);
  const preview = buildFlightSignals(game, { selected: 10, viewport: { minX: 1100, maxX: 1300, minY: 100, maxY: 350 } }).preview;
  assert.equal(preview.showSource, true); assert.equal(preview.showGate, false);
  assert.equal(preview.from, 0); assert.equal(preview.to, 1);
  for (const patch of [{ hp: 0 }, { type: 'barracks' }, { flightPlan: 0 }, { flightPlan: 2 }, { flightPlan: NaN }]) {
    game.state.buildings[0] = { ...aerie(game.map), ...patch };
    assert.equal(buildFlightSignals(game, { selected: 10 }).preview, null);
  }
});

test('dead, finished, malformed and non-gryphon flights never produce misleading signals', () => {
  const game = fixture(), base = unit(game.map);
  game.state.units = [{ ...base, hp: 0 }, { ...base, type: 'warrior' }, { ...base, side: 7 }, { ...base, x: Infinity },
    { ...base, y: NaN }, { ...base, airRoute: null }, ...[
      { phase: 'done' }, { phase: 'future' }, { to: 2 }, { to: 0 }, { from: -1 }, { remaining: NaN }, { remaining: 3 }, { remaining: -.1 },
    ].map(patch => ({ ...base, airRoute: { ...base.airRoute, ...patch } }))];
  assert.deepEqual(buildFlightSignals(game), { routes: [], preview: null });
});

test('viewport conversion and banner geometry preserve fixed pixel text at phone and desktop scales', () => {
  const game = fixture();
  for (const scale of [.32, .45, 1, 1.5]) {
    const view = renderer(game, scale, 390, 240), port = flightViewport(view, game.map);
    assert.ok(Math.abs((port.maxX - port.minX) * scale - 390) < 1e-9);
    assert.ok(Math.abs((port.maxY - port.minY) * scale - 240) < 1e-9);
    for (const side of [0, 1]) for (const screenX of [4, 90, 200, 386]) {
      const corridor = { side, x: port.minX + screenX / scale, midY: 450 };
      const badge = flightBannerLayout(corridor, 140, 37, scale, port);
      assert.ok(screenX + badge.x >= 4 - 1e-9); assert.ok(screenX + badge.x + badge.width <= 386 + 1e-9);
      assert.equal(badge.height, 37);
    }
  }
  assert.equal(flightViewport({ width: 0, height: 300, camera: 1600 }, game.map), null);
});

test('complete canvas operations remain finite and balanced on every map, side, phase and scale', () => {
  for (const map of Object.values(MAPS)) for (const scale of [.32, .4, .8, 1.5]) {
    const game = fixture(map);
    for (const side of [0, 1]) for (let from = 0; from < map.lanes.length; from++) for (const to of [from - 1, from + 1]) {
      if (to < 0 || to >= map.lanes.length) continue;
      for (const phase of ['warning', 'transit', 'approach']) game.state.units.push(unit(map, side, from, to, phase, phase === 'warning' ? 1.2 : 0));
    }
    game.state.buildings = [aerie(map)];
    const world = mockCanvas(), mini = mockCanvas(), view = { ...renderer(game, scale, 1400, 700), c: world.c };
    world.c.globalAlpha = .5; world.c.lineWidth = 6;
    const scene = drawFlightRoutes(view, game, { selected: 10 }); drawFlightMinimap(mini.c, game, { width: 240, height: 72, selected: 10 });
    assert.equal(world.depth(), 0); assert.equal(mini.depth(), 0); assert.equal(world.c.globalAlpha, .5); assert.equal(world.c.lineWidth, 6);
    assert.ok(labels(world).includes('YOU')); assert.ok(labels(world).includes('FOE')); assert.equal(labels(world).includes('NEXT ↓'), !!scene.preview?.showSource);
    assert.ok(world.calls.some(c => c[0] === 'set' && c[1] === 'font' && c[2] === '600 12px monospace'));
    assert.ok(mini.calls.some(c => c[0] === 'clip'));
    // Unit counts do not multiply route banners. At most four corridor banners on three roads.
    assert.ok(labels(world).filter(text => text === 'YOU' || text === 'FOE').length <= (map.lanes.length - 1) * 2);
  }
});

test('low effects/reduced motion keep essential countdown, ownership, arrows and next-order labels', () => {
  const game = fixture(); game.state.units = [unit(game.map), unit(game.map, 1)]; game.state.buildings = [aerie(game.map)];
  const render = (reducedMotion, quality) => {
    const canvas = mockCanvas(); drawFlightRoutes({ ...renderer(game), c: canvas.c, reducedMotion, vfx: { quality } }, game, { selected: 10 }); return canvas;
  };
  const high = render(false, 'high');
  for (const canvas of [render(true, 'high'), render(false, 'low'), render(true, 'low')]) {
    assert.deepEqual(labels(canvas), labels(high));
    assert.ok(canvas.calls.length < high.calls.length, 'Only optional feather ticks are removed');
  }
});

test('rendering frozen simulation leaves clock, RNG, route state and input UI byte-for-byte unchanged', () => {
  const game = new Game({ rulesetId: ruleset.id, mapId: 'long-march', ai: false });
  game.state.units.push(unit(game.map)); game.state.buildings.push(aerie(game.map));
  const before = JSON.stringify(game.serialize()); const ui = freeze({ selected: 10, paused: false });
  game.random = () => { throw Error('Visuals must not consume simulation RNG'); };
  freeze(game); freeze(ui);
  const canvas = mockCanvas(), view = { ...renderer(game), c: canvas.c };
  const first = buildFlightSignals(game, { selected: 10 });
  for (let frame = 0; frame < 8; frame++) {
    drawFlightRoutes(view, game, ui); drawFlightMinimap(canvas.c, game, { width: 240, height: 72, selected: 10 });
  }
  assert.deepEqual(buildFlightSignals(game, { selected: 10 }), first);
  assert.equal(JSON.stringify(game.serialize()), before); assert.deepEqual(ui, { selected: 10, paused: false });
  first.routes[0].warningCount = 999;
  assert.equal(game.state.units[0].airRoute.remaining, 2); assert.equal(buildFlightSignals(game).routes[0].warningCount, 1);
});

test('minimap validates bounds and never emits approach labels as actual warning countdowns', () => {
  const game = fixture(); game.state.units = [unit(game.map, 1, 0, 1, 'approach', 2)];
  const canvas = mockCanvas();
  for (const geometry of [{}, { width: 0, height: 72 }, { width: 240, height: Infinity }, { width: 240, height: 72, x: NaN }]) {
    assert.deepEqual(drawFlightMinimap(canvas.c, game, geometry), { routes: [], preview: null });
    assert.equal(canvas.calls.length, 0);
  }
  assert.equal(drawFlightRoutes({ ...renderer(game), c: canvas.c }, game).routes.length, 0);
  assert.equal(drawFlightMinimap(canvas.c, game, { width: 240, height: 72, x: 12, y: 8 }).routes.length, 1);
  assert.deepEqual(labels(canvas), []);
  assert.ok(canvas.calls.some(call => call[0] === 'rect' && JSON.stringify(call.slice(1)) === JSON.stringify([12, 8, 240, 72])));
});

test('real production flight phases drive preview, launched minimap, warning and crossing without simulation assistance', () => {
  for (const map of Object.values(MAPS)) for (const side of [0, 1]) {
    const game = new Game({ rulesetId: ruleset.id, mapId: map.id, ai: false });
    game.state.gold[side] = 2000;
    const producer = game.build('aerie', side ? map.width - 1250 : 1250, map.lanes[0], side).building;
    assert.ok(producer); assert.equal(game.setFlightPlan(producer.id, 1, side).ok, true);
    game._spawn(producer);
    const gryphon = game.state.units.find(u => u.type === 'gryphon');
    assert.equal(buildFlightSignals(game).routes.length, 0);
    assert.equal(buildFlightSignals(game, { includeApproach: true }).routes[0].approachCount, 1);
    // Resolve a permitted engine phase at its exact gate. The renderer is only an observer.
    gryphon.x = flightGateX(map, ruleset, side); gryphon.y = map.lanes[0];
    game._advanceAirRoute(gryphon, .05);
    assert.equal(buildFlightSignals(game).routes[0].warningCount, 1);
    assert.equal(buildFlightSignals(game).routes[0].remaining, gryphon.airRoute.remaining);
    assert.equal(game.setFlightPlan(producer.id, 0, side).ok, true);
    assert.equal(buildFlightSignals(game, { selected: producer.id }).preview, null);
    assert.equal(buildFlightSignals(game).routes[0].to, 1, 'Future Hold does not redraw the launched destination');
    for (let tick = 0; tick < 42; tick++) game._advanceAirRoute(gryphon, .05);
    assert.equal(buildFlightSignals(game).routes[0].transitCount, 1);
    for (let tick = 0; tick < 60; tick++) game._advanceAirRoute(gryphon, .05);
    assert.equal(gryphon.airRoute.phase, 'done'); assert.equal(buildFlightSignals(game, { includeApproach: true }).routes.length, 0);
  }
});
