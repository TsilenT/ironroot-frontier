import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Renderer, drawUnitPortrait } from '../dist/render.js';
import { MAPS, WORLD, LANES, Game, buildSites } from '../dist/engine.js';
import { installCanvas, makeRenderer, styledCalls } from './renderer-canvas.mjs';
import { classicSnapshot, gameFixture, viewports } from './renderer-scenarios.mjs';

const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} != ${b}`);
const terrainRects = (renderer, color) => styledCalls(renderer.baseTerrain, 'fillRect').filter(call => call.style === color).map(call => call.args);

test('Classic retains frozen terrain, camera geometry, minimaps and portraits; combat frames have a separately labelled fixture', () => {
  installCanvas();
  const { sourceSHA256, ...fixture } = JSON.parse(readFileSync(new URL('./fixtures/renderer-classic-0.8.json', import.meta.url), 'utf8'));
  assert.equal(sourceSHA256, 'ef5ebcbed466bdd829ab34b12adaddf262d4627d31bd1ddbd4c99dd793701251');
  const actual = classicSnapshot(Renderer, drawUnitPortrait);
  assert.deepEqual(actual.themes, fixture.themes);
  assert.deepEqual(actual.portraits, fixture.portraits);
  for (const [viewport, frame] of Object.entries(actual.frames)) {
    const { main: before, ...geometry } = fixture.frames[viewport];
    const { main: after, ...current } = frame;
    assert.deepEqual(current, geometry, viewport);
    assert.notEqual(after, before, 'intentional renderer increment, not a rewritten historical baseline');
  }
  const visual = JSON.parse(readFileSync(new URL('./fixtures/renderer-combat-feedback.json', import.meta.url), 'utf8'));
  assert.deepEqual(actual.frames, visual.frames);
});

test('setMap accepts registered IDs/descriptors, rejects foreign geometry, and preserves theme', () => {
  installCanvas(); const renderer = makeRenderer(Renderer);
  assert.equal(renderer.map, MAPS.classic);
  renderer.setTheme('highland');
  assert.equal(renderer.setMap('long-march'), MAPS['long-march']);
  assert.equal(renderer.theme, 'highland');
  assert.equal(renderer.terrain.width, 4000);
  assert.equal(renderer.terrainKey, 'long-march:1:highland');
  assert.equal(renderer.setMap(MAPS['twin-span']), MAPS['twin-span']);
  const terrain = renderer.terrain;
  for (const invalid of ['missing', null, {}, { ...MAPS.classic }, { ...MAPS['twin-span'], revision: 2 }, { ...MAPS['long-march'], width: 123 }])
    assert.throws(() => renderer.setMap(invalid));
  assert.equal(renderer.map, MAPS['twin-span']); assert.equal(renderer.terrain, terrain);
  renderer.setMap(); assert.equal(renderer.map, MAPS.classic);
});

test('terrain draws exact lane counts, full world width, midpoint rivers and bridges', () => {
  installCanvas(); const renderer = makeRenderer(Renderer);
  for (const map of Object.values(MAPS)) {
    renderer.setMap(map);
    assert.deepEqual([renderer.baseTerrain.width, renderer.baseTerrain.height], [map.width, map.height]);
    assert.deepEqual(terrainRects(renderer, '#657450'), map.lanes.map(y => [0, y - 54, map.width, 108]));
    assert.deepEqual(terrainRects(renderer, '#635e48'), map.lanes.map(y => [map.width / 2 - 108, y - 51, 202, 102]));
    const river = renderer.baseTerrain.calls.filter(call => call[0] === 'bezierCurveTo');
    assert.equal(river.length, 8);
    assert.deepEqual(river[0], ['bezierCurveTo', map.width / 2 - 150, 200, map.width / 2 + 100, 380, map.width / 2 - 20, 570]);
    assert.ok(renderer.baseTerrain.calls.some(call => JSON.stringify(call) === JSON.stringify(['lineTo', map.width - 100, map.lanes[0]])));
  }
});

test('Long March frontier markers and side tints stay attached to owned territory', () => {
  installCanvas(); const renderer = makeRenderer(Renderer); renderer.setMap('long-march');
  const borderStarts = renderer.baseTerrain.calls.filter(call => call[0] === 'moveTo' && call[2] === 160);
  assert.deepEqual(borderStarts, [['moveTo', 1390, 160], ['moveTo', 2610, 160]]);
  renderer.draw(gameFixture('long-march'), { paused: true }, 0);
  const tints = styledCalls(renderer.canvas, 'fillRect').filter(call => ['#4597800c', '#a051370b'].includes(call.style));
  assert.deepEqual(tints.map(call => call.args), [[0, 150, 1390, 600], [2610, 150, 1390, 600]]);
  assert.ok(renderer.canvas.calls.some(call => JSON.stringify(call) === JSON.stringify(['fillText', 'ENEMY FRONTIER', 3230, 145])));
});

test('all viewports clamp both map ends, whole-world views center, and screen transforms round-trip', () => {
  installCanvas(); const renderer = makeRenderer(Renderer);
  for (const map of Object.values(MAPS)) for (const [width, height] of viewports) {
    renderer.setMap(map); renderer.canvas.rect = { width, height }; renderer.resize();
    const half = width / (2 * renderer.scale), first = Math.min(half, map.width / 2), last = Math.max(map.width - half, map.width / 2);
    renderer.camera = -10000; renderer.clampCamera(); close(renderer.camera, first);
    renderer.pan(-100000); close(renderer.camera, last);
    renderer.pan(100000); close(renderer.camera, first);
    for (const point of [{ x: 110, y: 450 }, { x: map.width - 110, y: 450 }, { x: map.width / 2, y: map.lanes.at(-1) }]) {
      const screen = renderer.worldToScreen(point.x, point.y), world = renderer.screenToWorld(screen.x, screen.y);
      close(world.x, point.x); close(world.y, point.y);
    }
    assert.equal(renderer.screenToWorld(width / 2, height / 2).y, 450);
  }
});

test('Classic snap matches original math across boundaries, exact ties and dense finite inputs', () => {
  installCanvas(); const renderer = makeRenderer(Renderer);
  const oldSnap = p => ({ x: Math.max(270, Math.min(1250, 270 + Math.round((p.x - 270) / 140) * 140)), y: LANES.reduce((a, b) => Math.abs(a - p.y) < Math.abs(b - p.y) ? a : b) });
  for (let x = -100; x <= 3500; x += 10) for (const y of [0, 260, 354.9999, 355, 355.0001, 450, 544.9999, 545, 545.0001, 640, 900])
    assert.deepEqual(renderer.snap({ x, y }), oldSnap({ x, y }));
  for (const x of [-Infinity, -Number.MAX_VALUE, Number.MAX_VALUE, Infinity, NaN])
    assert.deepEqual(renderer.snap({ x, y: 450 }), oldSnap({ x, y: 450 }));
});

test('snap uses only map sites, mirrors right-side columns and never relocates occupied placements', () => {
  installCanvas(); const renderer = makeRenderer(Renderer);
  for (const map of Object.values(MAPS)) {
    renderer.setMap(map);
    for (const side of [0, 1]) {
      const sites = buildSites(map, side);
      for (const site of sites) assert.deepEqual(renderer.snap(site, side), { x: site.x, y: site.y });
      for (let x = -100; x <= map.width + 100; x += 53) for (const y of [-10, 260, 340, 450, 560, 640, 1000]) {
        const point = renderer.snap({ x, y }, side);
        assert.ok(sites.some(site => site.x === point.x && site.y === point.y));
      }
    }
    const game = new Game({ mapId: map.id, ai: false }), occupied = game.state.buildings[0];
    const point = renderer.snap({ x: occupied.x + 12, y: occupied.y + 15 });
    assert.deepEqual(point, { x: occupied.x, y: occupied.y });
    assert.equal(game.canBuild('barracks', point.x, point.y).ok, false);
  }
  renderer.setMap('twin-span'); assert.deepEqual(renderer.snap({ x: 340, y: 450 }), { x: 410, y: 560 });
});

test('build grid and ghost validate exactly the same snapped sites as player input', () => {
  installCanvas(); const renderer = makeRenderer(Renderer);
  for (const map of Object.values(MAPS)) {
    renderer.setMap(map); renderer.canvas.reset();
    const game = new Game({ mapId: map.id, ai: false }), requests = [], canBuild = game.canBuild.bind(game);
    game.canBuild = (type, x, y) => { requests.push([x, y]); return canBuild(type, x, y); };
    const pointer = { x: 421, y: map.lanes[map.startingLane] + 10 }, snapped = renderer.snap(pointer);
    renderer.draw(game, { paused: true, build: 'barracks', pointer }, 0);
    assert.deepEqual(requests, [...buildSites(map, 0).map(({ x, y }) => [x, y]), [snapped.x, snapped.y]]);
    const slots = styledCalls(renderer.canvas, 'fillRect').filter(call => ['#c8e2a429', '#273d2820'].includes(call.style));
    assert.equal(slots.length, map.buildLimit);
    const ghosts = styledCalls(renderer.canvas, 'strokeRect', 'strokeStyle').filter(call => call.style === '#e89176');
    assert.ok(ghosts.some(call => JSON.stringify(call.args) === JSON.stringify([snapped.x - 55, snapped.y - 55, 110, 110])));
    assert.equal(renderer.canvas.depth(), 0); assert.equal(renderer.mini.depth(), 0);
  }
});

test('minimap projects extended entities, bases, actual roads and camera window using map dimensions', () => {
  installCanvas(); const renderer = makeRenderer(Renderer, 800, 900); renderer.setMap('long-march');
  renderer.camera = 3600; renderer.clampCamera();
  const state = { buildings: [{ x: 3730, y: 640, side: 1 }], units: [{ x: 3925, y: 560, side: 1 }], bases: [{ x: 110, y: 450, side: 0 }, { x: 3890, y: 450, side: 1 }] };
  renderer.drawMinimap(state);
  const rects = styledCalls(renderer.mini, 'fillRect');
  const rect = style => rects.find(call => call.style === style).args;
  assert.deepEqual(rect('#e9a080'), [3730 / 4000 * 240 - 1, 640 / 900 * 72 - 1, 3, 3]);
  assert.deepEqual(rect('#df9b77'), [3925 / 4000 * 240, 560 / 900 * 72, 1.5, 1.5]);
  assert.deepEqual(rect('#e5a281'), [3890 / 4000 * 240 - 2, 33, 4, 6]);
  assert.deepEqual(rect('#628476'), [1936 / 4000 * 240, 0, 128 / 4000 * 240, 72]);
  assert.deepEqual(rect('#f0ecd415'), [192, 0, 48, 72]);
  renderer.setMap('twin-span'); renderer.mini.reset(); renderer.drawMinimap(new Game({ mapId: 'twin-span' }).state);
  assert.deepEqual(renderer.mini.calls.filter(call => call[0] === 'moveTo'), [['moveTo', 0, 340 / 900 * 72], ['moveTo', 0, 560 / 900 * 72]]);
});

test('terrain cache retains at most current base and theme, including repeated same-theme map switches', () => {
  const created = installCanvas(), renderer = makeRenderer(Renderer);
  for (let pass = 0; pass < 3; pass++) for (const theme of ['woodland', 'highland', 'ashlands', 'citadel', 'bad-theme']) {
    renderer.setTheme(theme);
    for (const map of Object.values(MAPS)) {
      const oldMap = renderer.map, oldBase = renderer.baseTerrain;
      renderer.setMap(map); const terrain = renderer.terrain, base = renderer.baseTerrain, count = created.length;
      renderer.setMap(map.id); renderer.setTheme(renderer.theme);
      assert.equal(created.length, count); assert.equal(renderer.terrain, terrain);
      if (oldMap !== map) { assert.notEqual(base, oldBase); assert.equal(oldBase.width, 0); assert.equal(oldBase.height, 0); }
      const alive = created.filter(canvas => canvas.width > 0 && canvas.height > 0);
      assert.deepEqual(new Set(alive), new Set([base, terrain]));
      assert.ok(alive.length <= 2);
      assert.ok(alive.reduce((bytes, canvas) => bytes + canvas.width * canvas.height * 4, 0) <= 28800000);
      assert.equal(terrain.width, map.width); assert.equal(terrain.height, map.height);
    }
  }
});

test('simultaneous renderers retain independent geometry, cameras, themes and global compatibility constants', () => {
  installCanvas(); const before = JSON.stringify({ WORLD, LANES, MAPS });
  const classic = makeRenderer(Renderer), longer = makeRenderer(Renderer), twin = makeRenderer(Renderer);
  longer.setMap('long-march'); twin.setMap('twin-span'); longer.setTheme('ashlands');
  const classicBase = classic.baseTerrain;
  assert.equal(classic.map, MAPS.classic); assert.equal(classic.terrain, classicBase); assert.equal(classic.theme, 'woodland');
  assert.equal(classic.snap({ x: 410, y: 450 }).y, 450); assert.equal(twin.snap({ x: 410, y: 450 }).y, 560);
  for (const renderer of [classic, longer, twin]) { renderer.camera = 9999; renderer.clampCamera(); close(renderer.camera, renderer.map.width - renderer.width / (2 * renderer.scale)); }
  longer.setMap('classic'); assert.equal(classic.baseTerrain, classicBase); assert.equal(classicBase.width, 3200);
  assert.equal(twin.map, MAPS['twin-span']); assert.equal(JSON.stringify({ WORLD, LANES, MAPS }), before);
});


test('citadel overlays draw only real map lanes and cover Long March beyond the old boundary', () => {
  installCanvas(); const renderer = makeRenderer(Renderer);
  for (const map of Object.values(MAPS)) {
    renderer.setMap(map); renderer.setTheme('citadel');
    const tiles = styledCalls(renderer.terrain, 'fillRect').filter(call => ['#b0ad9255', '#757e6a44'].includes(call.style));
    assert.equal(tiles.length, map.lanes.length * Math.ceil(map.width / 54) * 2);
    assert.deepEqual([...new Set(tiles.map(call => call.args[1]))].sort((a, b) => a - b), map.lanes.flatMap(y => [y - 35, y + 2]));
    if (map.id === 'long-march') assert.ok(tiles.some(call => call.args[0] > 3900));
  }
});

test('new-map complete frames and bases remain finite across responsive views', () => {
  installCanvas(); const renderer = makeRenderer(Renderer);
  for (const map of Object.values(MAPS)) for (const [width, height] of viewports) {
    renderer.setMap(map); renderer.canvas.rect = { width, height }; renderer.resize();
    renderer.camera = map.width; renderer.clampCamera(); renderer.canvas.reset(); renderer.mini.reset();
    const game = gameFixture(map.id);
    renderer.draw(game, { paused: true, build: 'barracks', pointer: { x: 1250, y: map.lanes[0] }, spell: true }, 0);
    assert.ok(renderer.canvas.calls.some(call => call[0] === 'translate' && call[1] === map.width - 110 && call[2] === 450));
    assert.equal(renderer.canvas.depth(), 0); assert.equal(renderer.mini.depth(), 0);
  }
});
