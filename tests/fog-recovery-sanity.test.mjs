// NEW recovery sanity checks, authored 2026-11-08. Not recovered historical tests.
// Canvas assertions compare commands/ownership, not raster pixels or native layouts.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { makeRenderer, recordingCanvas, resetCanvasLogs, methods, digest, installCanvas } from './fog-recovery-canvas.mjs';
const root = process.env.FOG_CANDIDATE_ROOT || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const load = file => import(pathToFileURL(path.join(root, 'dist', file)));
const { FogRenderer, observationFacade, observationHUD, layoutMemoryBadges, layoutCitadelLabels } = await load('fog-view.js');
const { Game } = await load('engine.js');
const { FOG_SKIRMISH_RULESET_ID, observe, refreshFog } = await load('fog.js');
const ui = { paused: true, selected: null, build: null, spell: false, pointer: null };
const game = () => new Game({ rulesetId: FOG_SKIRMISH_RULESET_ID, ai: false, seed: 93 });
const viewOf = g => observationFacade(observe(g));
const maskView = () => ({ map: { width: 3200, height: 900 }, fog: { enabled: true, revealed: false, side: 0, observers: [{ x: 410, y: 450, radius: 320 }, { x: 110, y: 450, radius: 360 }] } });
function maskCall(r, view, mini = false, width = mini ? r.mw : r.width, height = mini ? r.mh : r.height, destination = mini ? r.m : r.c) {
  const mask = mini ? r.miniMask : r.mask;
  const before = methods(mask, 'clearRect').length;
  const target = destination === r.c ? r.canvas : destination === r.m ? r.mini : null;
  const composites = target?.raw.filter(call => call[0] === 'drawImage' && call[1] === mask).length;
  r.drawMask(destination, mask, width, height, view, mini);
  if (target) {
    assert.equal(target.raw.filter(call => call[0] === 'drawImage' && call[1] === mask).length, composites + 1, 'exactly one composite to requested destination');
    assert.deepEqual(target.raw.at(-2), ['drawImage', mask, 0, 0, width, height]);
    assert.equal(target.depth(), 0);
  }
  return methods(mask, 'clearRect').length - before;
}

test('NEW: hits still composite once; in-place observer changes/order miss; snapshots contain primitives only', () => {
  const r = makeRenderer(FogRenderer), v = maskView();
  assert.equal(maskCall(r, v), 1);
  const initial = digest(r.mask.raster);
  assert.equal(maskCall(r, structuredClone(v)), 0, 'value-identical detached observers hit');
  assert.equal(digest(r.mask.raster), initial);
  for (const mutate of [v => v.fog.observers[0].x++, v => v.fog.observers[0].y++, v => v.fog.observers[0].radius++, v => v.fog.observers.reverse(), v => v.fog.observers.push({ x: 900, y: 450, radius: 320 }), v => v.fog.observers.pop()]) {
    mutate(v); assert.equal(maskCall(r, v), 1); assert.equal(maskCall(r, v), 0);
  }
  v.fog.observers[0].id = 999; v.state = { time: 900, gold: [1, 90000] };
  assert.equal(maskCall(r, v), 0, 'non-raster state does not invalidate');
  for (const entry of [...r.maskRaster.inputs, ...r.maskRaster.observers]) assert.ok(entry === null || !['object', 'function'].includes(typeof entry));
  assert.notEqual(r.maskRaster.observers, v.fog.observers);
  const saved = [...r.maskRaster.observers]; v.fog.observers[0].x++;
  assert.deepEqual(r.maskRaster.observers, saved, 'cache retained values, not observer references');
  const alternate = recordingCanvas(); r.drawMask(alternate.c, r.mask, r.width, r.height, { ...v, fog: { ...v.fog, observers: [{ ...v.fog.observers[0], x: v.fog.observers[0].x - 1 }, ...v.fog.observers.slice(1)] } }, false);
  assert.equal(alternate.raw.filter(c => c[0] === 'drawImage' && c[1] === r.mask).length, 1);
});

test('NEW: all field mask inputs invalidate, while minimap ignores camera/field projection; rounding is exact', () => {
  const r = makeRenderer(FogRenderer, 390.1, 302.1, 1.25), v = maskView();
  assert.equal(maskCall(r, v), 1); assert.equal(maskCall(r, v, true), 1);
  for (const mutate of [() => r.camera += .001, () => r.scale += .001, () => r.width += .001, () => r.height += .001]) {
    mutate(); assert.equal(maskCall(r, v), 1); assert.equal(maskCall(r, v, true), 0, 'minimap has no field projection dependency');
  }
  for (const mutate of [() => v.fog.side = 1, () => v.fog.enabled = false, () => v.fog.revealed = true, () => v.map.width++, () => v.map.height++, () => r.dpr += .001]) {
    mutate(); assert.equal(maskCall(r, v), 1); assert.equal(maskCall(r, v, true), 1);
  }
  const width = 390.1, height = 302.1;
  assert.equal(maskCall(r, v, false, width, height), 1);
  const backing = [r.mask.width, r.mask.height];
  assert.equal(maskCall(r, v, false, width + .00001, height + .00001), 1, 'logical dimensions invalidate even with unchanged rounded backing');
  assert.deepEqual([r.mask.width, r.mask.height], backing);
  assert.deepEqual(backing, [Math.max(1, Math.round(width * r.dpr)), Math.max(1, Math.round(height * r.dpr))]);
  assert.equal(maskCall(r, v, false, .01, .01), 1); assert.deepEqual([r.mask.width, r.mask.height], [1, 1]);
  assert.equal(maskCall(r, v, false, .01, .01), 0);
  r.drawMask(r.c, r.mask, .01, .01, v, true);
  assert.equal(r.maskRaster.inputs[0], true, 'mode is an exact cache input even on the same owned mask');
  assert.equal(maskCall(r, v, false, .01, .01), 1);
});

test('NEW: constructor/resize/reset/fog transitions invalidate; only owned masks receive loss listeners', () => {
  const destination = recordingCanvas(), mini = recordingCanvas(240, 72);
  installCanvas();
  const r = new FogRenderer(destination, mini), v = maskView();
  for (const owned of [r.mask, r.miniMask]) {
    assert.equal(owned.listeners.get('contextlost').length, 1); assert.equal(owned.listeners.get('contextrestored').length, 1);
  }
  assert.equal(destination.listeners.size, 0); assert.equal(mini.listeners.size, 0);
  new FogRenderer(destination, mini); new FogRenderer(destination, mini);
  assert.equal(destination.listeners.size, 0, 'repeated constructors do not retain renderer closures on destination'); assert.equal(mini.listeners.size, 0);
  for (const transition of [() => r.resize(), () => r.resetObservation()]) {
    maskCall(r, v); maskCall(r, v, true); transition();
    assert.equal(r.maskRaster.inputs, null); assert.equal(r.miniMaskRaster.inputs, null);
    assert.equal(maskCall(r, v), 1); assert.equal(maskCall(r, v, true), 1);
  }
  r.mask.dispatch('contextlost'); assert.equal(r.maskRaster.inputs, null); assert.deepEqual(r.maskRaster.observers, []);
  assert.equal(maskCall(r, v), 1); assert.equal(maskCall(r, v), 1); assert.equal(maskCall(r, v, true), 0);
  r.mask.dispatch('contextrestored'); assert.equal(maskCall(r, v), 1); assert.equal(maskCall(r, v), 0);
  r.miniMask.setContextLost(true); assert.equal(maskCall(r, v, true), 1); assert.equal(maskCall(r, v, true), 1);
  r.miniMask.setContextLost(false); assert.equal(maskCall(r, v, true), 1); assert.equal(maskCall(r, v, true), 0);
  const g = game(); g.state.effects = []; const fog = viewOf(g);
  r.draw(fog, ui, 0); assert.ok(r.maskRaster.inputs && r.miniMaskRaster.inputs);
  const ordinary = viewOf(new Game({ rulesetId: 'frontier-citadel-open', ai: false }));
  r.draw(ordinary, ui, 0); assert.equal(r.maskRaster.inputs, null); assert.equal(r.miniMaskRaster.inputs, null);
  r.draw(fog, ui, 0); assert.ok(r.maskRaster.inputs && r.miniMaskRaster.inputs);
  g.state.winner = 0; r.draw(viewOf(g), ui, 0); assert.equal(r.maskRaster.inputs, null); assert.equal(r.miniMaskRaster.inputs, null);
});

const memory = { id: 55, type: 'watchtower', level: 2, side: 1, lane: 1, x: 300, y: 220, observedAt: 125.9 };
function labelView() { const v = viewOf(game()); v.state.time = 200; v.fog.rememberedCitadel = { choice: 'regen', observedAt: 125.9 }; return v; }
const overlap = (a, b) => a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;

test('NEW: citadel labels clear reserved controls or omit text, preserving the true marker and stale badges', () => {
  const v = labelView(), base = { ...v.state.bases[1], x: 300, y: 100 }, options = { width: 800, height: 600, scale: 1, project: (x, y) => ({ x, y }), measure: text => text.length * 7 };
  const label = layoutCitadelLabels(v, base, options); assert.ok(label); assert.equal(label.labels.length, 3);
  for (const [width, height, x, y, scale] of [[800,600,300,100,1],[390,350,380,90,.32],[320,125,160,70,.32],[844,220,800,80,.4],[1180,757,1100,150,1.5]]) {
    const l = layoutCitadelLabels(v, { ...base, x, y }, { ...options, width, height, scale });
    if (l) { assert.ok(l.rect.x >= 4 && l.rect.x + l.rect.width <= width - 64); assert.ok(l.rect.y >= 84 && l.rect.y + l.rect.height <= height - 90); }
  }
  assert.equal(layoutCitadelLabels(v, base, { ...options, height: 125 }), null);
  assert.equal(layoutCitadelLabels(v, { ...base, x: -1 }, options), null);
  v.fog.memories = [{ ...memory }];
  const badges = layoutMemoryBadges(v, options), frozen = structuredClone(badges);
  assert.ok(badges[0].badge, 'pre-existing stale badge is admitted');
  assert.ok(overlap(label.rect, badges[0].rect));
  assert.equal(layoutCitadelLabels(v, base, options), null, 'citadel text yields to stale marker/badge');
  assert.deepEqual(layoutMemoryBadges(v, options), frozen, 'no stale badge is moved or suppressed');
  const r = makeRenderer(FogRenderer, 320, 125); r.scale = .32; r.canvas.reset();
  r.drawBase(base, v);
  assert.ok(r.canvas.calls.some(c => c[0] === 'translate' && c[1] === base.x && c[2] === base.y));
  assert.ok(r.canvas.calls.some(c => c[0] === 'strokeRect' && c.slice(1).join() === '-57,-88,114,125'));
  assert.equal(methods(r.canvas, 'fillText').length, 0, 'crowded text omission never removes or moves citadel marker');
});

test('NEW: Pause keeps building entries and frozen valid choice/time; current or ordinary contacts suppress stale citadel', () => {
  const v = labelView(); v.fog.memories = [{ ...memory }];
  const original = observationHUD(v).memoryDetails;
  assert.equal(original.length, 2); assert.match(original[0], /Watchtower, level 2, at 2:05/);
  assert.match(original[1], /enemy citadel with Regeneration at 2:05/); assert.match(original[1], /Current health and upgrade unknown/);
  v.state.time = 300; assert.deepEqual(observationHUD(v).memoryDetails, original);
  for (const invalid of [null, [], {}, { choice:'other', observedAt:1 }, { choice:'regen', observedAt:-1 }, { choice:'regen', observedAt:301 }, { choice:'regen', observedAt:NaN }, { choice:'regen', observedAt:Infinity }, { choice:'regen', observedAt:'125' }]) {
    v.fog.rememberedCitadel = invalid; assert.deepEqual(observationHUD(v).memoryDetails, [original[0]]);
  }
  v.fog.rememberedCitadel = { choice: 'arrows', observedAt: 0 }; assert.match(observationHUD(v).memoryDetails[1], /Extra Arrow at 0:00/);
  v.state.bases[1].hp = 5000; assert.deepEqual(observationHUD(v).memoryDetails, [original[0]]);
  v.state.bases[1].hp = null; v.fog.enabled = false; assert.deepEqual(observationHUD(v).memoryDetails, []);
});

test('NEW: hidden changes cannot affect field/minimap/HUD or detached observation; drawing does not mutate engine', () => {
  const a = game(), b = game(); a.state.effects = []; b.state.effects = [];
  b.state.gold[1] = 99999; b.state.bases[1].hp = 321;
  b.state.buildings.find(x => x.side === 1).level = 3; b.state.buildings.find(x => x.side === 1).progress = .99;
  b._place('aerie', 2700, 260, 1); b.state.citadelOptions.sides[1].choice = 'regen';
  refreshFog(a); refreshFog(b); const av = viewOf(a), bv = viewOf(b);
  assert.deepEqual(av.state, bv.state); assert.deepEqual(av.fog, bv.fog); assert.deepEqual(observationHUD(av), observationHUD(bv));
  const ar = makeRenderer(FogRenderer, 390, 350), br = makeRenderer(FogRenderer, 390, 350);
  const before = [a.serialize(), b.serialize()], observations = [JSON.stringify(av), JSON.stringify(bv)];
  for (let i = 0; i < 2; i++) {
    resetCanvasLogs(ar); resetCanvasLogs(br); ar.draw(av, ui, 0); br.draw(bv, ui, 0);
    assert.deepEqual(ar.canvas.calls, br.canvas.calls); assert.deepEqual(ar.mini.calls, br.mini.calls);
  }
  assert.deepEqual([a.serialize(), b.serialize()], before); assert.deepEqual([JSON.stringify(av), JSON.stringify(bv)], observations);
  a.state.gold[0] = 0; assert.equal(JSON.stringify(av), observations[0], 'presentation is detached from later engine changes');
});

// A deliberately narrow DOM adapter executes the exact recovered app function.
// It verifies focus/count/ARIA behavior, not browser geometry or assistive-technology output.
function pauseAdapter() {
  const app = readFileSync(path.join(root, 'dist/app.js'), 'utf8');
  const fn = app.match(/^function updateFogMemoryDetails\(view\) \{[\s\S]*?^\}/m)?.[0]; assert.ok(fn);
  const doc = { activeElement: null }, nodes = new Map();
  class Element {
    constructor() { this.children = []; this.attributes = {}; this.dataset = {}; this.hidden = true; this.open = false; this.textContent = ''; this.classList = { toggle: (name, value) => { assert.equal(name, 'hidden'); this.hidden = value; } }; }
    contains(n) { return n === this || this.children.some(c => c.contains(n)); }
    replaceChildren(...children) { this.children = children; }
    setAttribute(key, value) { this.attributes[key] = value; }
    removeAttribute(key) { delete this.attributes[key]; }
    focus() { doc.activeElement = this; }
  }
  for (const id of ['pauseFogDetails','pauseFogList','pauseFogSummary','fogMemoryHint','mapDefaultNote','pause','resume']) nodes.set(id, new Element());
  const $ = id => nodes.get(id); $('pauseFogDetails').children = [$('pauseFogSummary'), $('pauseFogList')]; doc.createElement = () => new Element();
  const scope = { $, document: doc, observationHUD, paused: true };
  runInNewContext(fn + '\nthis.update = updateFogMemoryDetails;', scope);
  return { $, scope, doc, update: scope.update };
}

test('NEW: recovered Pause adapter counts citadel plus buildings, preserves focus, and clears stale ARIA on transitions', () => {
  const h = pauseAdapter(), { $, doc, update, scope } = h, v = labelView(); v.fog.memories = [{ ...memory }];
  update(v); assert.equal($('pauseFogSummary').textContent, 'Last-seen details (2)'); assert.equal($('pause').attributes['aria-describedby'], 'fogMemoryHint');
  assert.equal($('pauseFogDetails').hidden, false); assert.equal($('mapDefaultNote').hidden, true);
  const entry = $('pauseFogList').children[1]; assert.equal(entry.attributes.tabindex, '0'); entry.focus(); $('pauseFogDetails').open = true;
  update(v); assert.equal($('pauseFogList').children[1], entry); assert.equal(doc.activeElement, entry); assert.equal($('pauseFogDetails').open, true);
  v.state.bases[1].hp = 5000; update(v); assert.equal($('pauseFogSummary').textContent, 'Last-seen details (1)'); assert.equal(doc.activeElement, $('pauseFogSummary'));
  v.fog.enabled = false; update(v); assert.equal($('pauseFogList').children.length, 0); assert.equal($('pauseFogDetails').open, false); assert.equal($('pause').attributes['aria-describedby'], undefined); assert.equal(doc.activeElement, $('resume'));
  v.fog.enabled = true; v.state.bases[1].hp = null; update(v); $('pauseFogList').children[0].focus(); scope.paused = false;
  v.fog.memories = []; v.fog.rememberedCitadel = null; update(v); assert.equal(doc.activeElement, $('pause')); assert.equal($('mapDefaultNote').hidden, false);
  const html = readFileSync(path.join(root, 'dist/index.html'), 'utf8');
  assert.match(html, /<details id="pauseFogDetails"[^>]*>[\s\S]*?<summary id="pauseFogSummary">Last-seen details<\/summary>/);
  assert.match(html, /<ul id="pauseFogList" aria-label="Last-seen enemy details"><\/ul>/);
});
