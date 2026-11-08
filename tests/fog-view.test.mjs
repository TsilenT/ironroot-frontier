import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, buildSites } from '../dist/engine.js';
import { FOG_RULESET_ID, observe, refreshFog } from '../dist/fog.js';
import { FogRenderer, observationFacade, observationHUD, ObservationAudio, pointInObservation } from '../dist/fog-view.js';
import { installCanvas, makeRenderer, styledCalls, digest } from './renderer-canvas.mjs';

const make = () => new Game({ rulesetId: FOG_RULESET_ID, mapId: 'classic', ai: false, seed: 123 });
const project = game => observationFacade(observe(game, 0));
const ui = { paused: false, build: null, spell: false, selected: null, pointer: null };
function troop(game, x, y = 450, side = 0) {
  const u = { id: game.nextId++, type: 'warrior', side, x, y, lane: 1, hp: 180, maxHp: 180, level: 1, cooldown: 0, attack: 0, flying: false };
  game.state.units.push(u); return u;
}
function render(view, width = 390, height = 300) {
  installCanvas(); const r = makeRenderer(FogRenderer, width, height); r.camera = 1600; r.clampCamera();
  r.canvas.reset(); r.mini.reset(); r.draw(view, ui, .05); return r;
}

test('façade rejects raw game, has no action closure, and validates paid sites from observation alone', () => {
  const game = make(), view = project(game);
  assert.throws(() => observationFacade(game), /observation/);
  for (const method of ['serialize', 'build', 'upgrade', 'sell', 'cast', 'random']) assert.equal(view[method], undefined);
  for (const type of Object.keys(game.buildings)) for (const site of buildSites(game.map, 0)) assert.deepEqual(view.canBuild(type, site.x, site.y), game.canBuild(type, site.x, site.y));
  const captured = JSON.stringify(view.state); game.state.gold[0] = 0; game.state.buildings[0].hp = 5;
  assert.equal(JSON.stringify(view.state), captured);
  assert.equal(view.canBuild('barracks', 690, 260).ok, true);
});

test('unknown enemy health remains unknown in HUD and canvas; raw Game cannot render', () => {
  const game = make(), view = project(game), model = observationHUD(view), r = render(view);
  assert.equal(model.enemyHP, null); assert.match(model.description, /health unknown/);
  assert.ok(r.canvas.calls.some(c => c[0] === 'fillText' && c[1] === 'HEALTH UNKNOWN'));
  assert.throws(() => r.draw(game, ui, .05), /observation/);
  assert.equal(r.activeGame, view);
  assert.equal(r.canvas.depth(), 0); assert.equal(r.mini.depth(), 0);
});

test('hidden enemy changes cannot affect field, minimap, HUD, Front or audio', () => {
  const a = make(), b = make();
  b.state.buildings[1].hp = 17; b.state.buildings[1].progress = .99; b.state.buildings[1].level = 3;
  b._place('aerie', 2300, 260, 1); troop(b, 2750, 640, 1); b.state.bases[1].hp = 250;
  b.state.gold[1] = 9999; b.state.stats.damage[1] = 800; b.state.frontline = 2900;
  b._effect(2800, 450, 'volley', 1, 1.1, 170); refreshFog(a); refreshFog(b);
  const av = project(a), bv = project(b);
  assert.deepEqual(av.state, bv.state); assert.deepEqual(av.fog, bv.fog);
  assert.deepEqual(observationHUD(av), observationHUD(bv));
  const ar = render(av), br = render(bv);
  assert.equal(digest(ar.canvas.calls), digest(br.canvas.calls)); assert.equal(digest(ar.mini.calls), digest(br.mini.calls));
  const opts = { camera: 2800, width: 390, scale: .5 };
  assert.deepEqual(new ObservationAudio().update(av, opts), new ObservationAudio().update(bv, opts));
});

test('stale structures draw dashed memories without live HP or production; hidden sale does not clear glyph', () => {
  const game = make(), scout = troop(game, 1710), building = game._place('watchtower', 2000, 450, 1);
  refreshFog(game); scout.x = 800; refreshFog(game);
  const before = project(game); game.state.buildings = game.state.buildings.filter(b => b !== building); refreshFog(game);
  const after = project(game); assert.deepEqual(before.fog.memories, after.fog.memories);
  assert.equal(after.state.buildings.some(b => b.id === building.id), false);
  for (const forbidden of ['hp', 'maxHp', 'progress', 'cooldown', 'invested']) assert.equal(after.fog.memories[0][forbidden], undefined);
  const r = render(after, 1180, 400); assert.ok(r.canvas.calls.some(c => c[0] === 'fillText' && c[1].startsWith('Last seen ')));
  assert.ok(r.canvas.calls.some(c => c[0] === 'setLineDash' && JSON.stringify(c[1]) === '[4,3]'));
});

test('hidden citadel preserves only a labelled last-seen choice', () => {
  const game = make(), scout = troop(game, 2800); game.state.citadelOptions.sides[1].choice = 'regen'; refreshFog(game);
  scout.x = 800; refreshFog(game); game.state.citadelOptions.sides[1].healedTotal = 999;
  const r = render(project(game));
  assert.ok(r.canvas.calls.some(c => c[0] === 'fillText' && c[1] === 'LAST SEEN: REGEN'));
  const text = r.canvas.calls.filter(c => c[0] === 'fillText').map(c => c[1]).join(' ');
  assert.doesNotMatch(text, /999|REGEN ·|WAIT/);
});

test('visible contacts use current renderer models but hidden troop dots are absent from minimap', () => {
  const game = make(); troop(game, 690); const visible = troop(game, 900, 450, 1), hidden = troop(game, 2000, 450, 1); refreshFog(game);
  const view = project(game); assert.deepEqual(view.state.units.filter(u => u.side === 1).map(u => u.id), [visible.id]);
  assert.equal(view.state.units.some(u => u.id === hidden.id), false);
  const r = render(view), dots = styledCalls(r.mini, 'fillRect').filter(c => c.style === '#df9b77');
  assert.equal(dots.length, 1); assert.equal(dots[0].args[0], visible.x / 3200 * r.mw);
});

test('audio IDs survive detached frames; paused or off-camera events are never replayed later', () => {
  const game = make(); const sound = new ObservationAudio(), options = { camera: 410, width: 390, scale: .5 };
  assert.ok(sound.update(project(game), options).sounds.length > 0);
  assert.equal(sound.update(project(game), options).sounds.length, 0);
  game._effect(410, 450, 'volley', 0, 1.1, 170);
  assert.equal(sound.update(project(game), { ...options, paused: true }).sounds.length, 0);
  assert.equal(sound.update(project(game), options).sounds.length, 0);
  game._effect(410, 450, 'blast', 0, .45, 55);
  assert.equal(sound.update(project(game), { ...options, camera: 2800 }).sounds.length, 0);
  assert.equal(sound.update(project(game), options).sounds.length, 0);
});

test('hidden-at-creation events do not play when the camera or sight reaches them', () => {
  const game = make(); game.state.effects = []; game._effect(2300, 450, 'volley', 1, 1.1, 170);
  const sound = new ObservationAudio(), options = { camera: 2300, width: 390, scale: .5 };
  assert.equal(sound.update(project(game), options).sounds.length, 0);
  troop(game, 2100); refreshFog(game);
  assert.equal(sound.update(project(game), options).sounds.length, 0);
});

test('VFX dedupes detached effects and removes particles/shake on lost sight', () => {
  const game = make(); game.state.effects = []; const scout = troop(game, 1710); refreshFog(game);
  game._effect(1800, 450, 'blast', 1, .45, 55);
  const r = render(project(game)); const spawned = r.vfx.spawned;
  assert.ok(spawned > 0); r.draw(project(game), ui, .05); assert.equal(r.vfx.spawned, spawned);
  scout.x = 800; refreshFog(game); r.draw(project(game), ui, .05);
  assert.equal(r.vfx.particles.length, 0); assert.deepEqual(r.vfx.getShake(), { x: 0, y: 0 });
});

test('safe frame geometry stays finite across compact and desktop field sizes', () => {
  for (const [width, height] of [[320, 125], [390, 350], [844, 220], [1180, 757]]) {
    const view = project(make()), r = render(view, width, height);
    r.draw(view, { ...ui, build: 'barracks', pointer: { x: 690, y: 260 } }, .05);
    r.draw(view, { ...ui, spell: true, pointer: { x: 2300, y: 450 } }, .05);
    assert.equal(r.canvas.depth(), 0); assert.equal(r.mini.depth(), 0);
  }
});

test('mask uses one composited union of sight, independent of camera/input and overlapping circles', () => {
  const view = project(make()), r = render(view);
  assert.ok(r.mask.calls.some(c => c[0] === 'set' && c[1] === 'globalCompositeOperation' && c[2] === 'destination-out'));
  assert.equal(pointInObservation(view, 410 + 320, 450), true);
  assert.equal(pointInObservation(view, 410 + 320.1, 450), false);
  const before = JSON.stringify(view); r.camera = 3000; r.zoom = 1.7; r.resize(); r.draw(view, { ...ui, paused: true }, .05);
  assert.equal(JSON.stringify(view), before);
});

test('ordinary fog-off observation still produces event audio and VFX', () => {
  const game = new Game({ rulesetId: 'frontier-citadel-open', ai: false }), view = project(game);
  assert.equal(view.fog.enabled, false);
  assert.ok(new ObservationAudio().update(view, { camera: 410, width: 390, scale: .5 }).sounds.length > 0);
  const r = render(view); assert.ok(r.vfx.spawned > 0);
});
