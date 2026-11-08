import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { memoryScene, MEMORY_STAGES, describeMemoryScene } from '../qa/fog-prototype/memory-scenarios.js';
import { FogRenderer, memoryLabel, observationHUD } from '../dist/fog-view.js';
import { installCanvas, makeRenderer, digest } from './renderer-canvas.mjs';
const ui = { paused: true, selected: null, build: null, spell: false, pointer: null };
const enemies = view => view.state.buildings.filter(b => b.side === 1);

test('synthetic sequence distinguishes unseen, current, stale, empty and replacement observations', () => {
  const views = MEMORY_STAGES.map((_, i) => memoryScene(i));
  assert.equal(enemies(views[0]).length, 0); assert.equal(views[0].fog.memories.length, 0);
  assert.equal(enemies(views[1])[0].type, 'watchtower'); assert.equal(views[1].fog.memories.length, 0);
  assert.equal(views[1].state.units.filter(u => u.side === 1).length, 1);
  assert.equal(enemies(views[2]).length, 0); assert.equal(views[2].state.units.filter(u => u.side === 1).length, 0);
  const memory = views[2].fog.memories[0]; assert.equal(memory.type, 'watchtower'); assert.equal(memory.level, 1); assert.equal(memory.observedAt, 12);
  assert.deepEqual(views[3].fog.memories, views[2].fog.memories);
  assert.equal(views[4].fog.memories.length, 0); assert.equal(enemies(views[4]).length, 0);
  const replacement = enemies(views[5])[0]; assert.equal(replacement.type, 'barracks'); assert.notEqual(replacement.id, memory.id);
  assert.equal(views[6].fog.memories[0].type, 'barracks'); assert.equal(views[6].fog.memories[0].observedAt, 60);
});

test('memory text includes frozen type, level and observation time, never live health or production', () => {
  const a = describeMemoryScene(memoryScene(2)), b = describeMemoryScene(memoryScene(3));
  assert.deepEqual(a, b); assert.match(a.join(' '), /Watchtower, level 1, at 0:12/);
  assert.match(a.join(' '), /Current health and production unknown/);
  assert.doesNotMatch(a.join(' '), /800|1400|level 2|sold|upgrade/i);
  assert.match(describeMemoryScene(memoryScene(6)).join(' '), /Barracks, level 1, at 1:00/);
  for (const view of MEMORY_STAGES.map((_, i) => memoryScene(i))) assert.equal(view.state.bases[1].hp, null);
  const view = memoryScene(3), label = memoryLabel(view, view.fog.memories[0]);
  assert.deepEqual(label, { title: 'Watchtower · L1', when: 'Last seen 0:12', description: 'Last seen Watchtower, level 1, at 0:12. Current health and production unknown.' });
  assert.match(observationHUD(view).description, /Last seen Watchtower, level 1, at 0:12/);
});

test('field memory labels include frozen time and stay inside the horizontal viewport', () => {
  installCanvas(); const renderer = makeRenderer(FogRenderer, 1165, 398), view = memoryScene(3);
  for (const zoom of [.7, 1, 1.7]) for (const camera of [600, 1900, 3000]) {
    renderer.zoom = zoom; renderer.resize(); renderer.camera = camera; renderer.clampCamera(); renderer.canvas.reset(); renderer.draw(view, ui, 0);
    for (const call of renderer.canvas.calls.filter(c => c[0] === 'fillText' && ['Watchtower · L1', 'Last seen 0:12'].includes(c[1]))) {
      const half = call[1].length * 7 / 2;
      assert.ok(call[2] - half >= 0); assert.ok(call[2] + half <= renderer.width);
    }
  }
});

test('known enemy citadel unknown-health text stays inside the right-edge viewport', () => {
  installCanvas(); const renderer = makeRenderer(FogRenderer, 1165, 398), view = memoryScene(3);
  for (const zoom of [.7, 1, 1.7]) {
    renderer.zoom = zoom; renderer.resize(); renderer.camera = 3000; renderer.clampCamera(); renderer.canvas.reset();
    renderer.drawBase(view.state.bases[1], view);
    const left = renderer.camera - renderer.width / (2 * renderer.scale), right = renderer.camera + renderer.width / (2 * renderer.scale);
    for (const call of renderer.canvas.calls.filter(c => c[0] === 'fillText')) {
      const x = view.state.bases[1].x + call[2], half = call[1].length * 7 / 2;
      assert.ok(x - half >= left); assert.ok(x + half <= right);
    }
  }
});

test('off-camera memories retain minimap markers without teleporting field labels to an edge', () => {
  installCanvas(); const renderer = makeRenderer(FogRenderer, 320, 398), view = memoryScene(3);
  renderer.camera = 600; renderer.clampCamera(); renderer.canvas.reset(); renderer.draw(view, ui, 0);
  assert.equal(renderer.canvas.calls.some(c => c[0] === 'fillText' && c[1] === 'Last seen 0:12'), false);
  assert.ok(renderer.mini.calls.some(c => c[0] === 'setLineDash' && JSON.stringify(c[1]) === '[2,2]'));
});

test('hidden change produces identical field/minimap glyphs despite changed hostile live state', () => {
  installCanvas(); const render = stage => { const renderer = makeRenderer(FogRenderer, 1154, 398); renderer.camera = 1900; renderer.clampCamera(); renderer.canvas.reset(); renderer.mini.reset(); renderer.draw(memoryScene(stage), ui, 0); return renderer; };
  const a = render(2), b = render(3);
  assert.equal(digest(a.canvas.calls), digest(b.canvas.calls)); assert.equal(digest(a.mini.calls), digest(b.mini.calls));
});

test('pause, panning and repeated rendering cannot change memory or clear stale structure', () => {
  installCanvas(); const view = memoryScene(3), before = JSON.stringify(view), renderer = makeRenderer(FogRenderer);
  for (const camera of [600, 1900, 3000, 1900]) { renderer.camera = camera; renderer.clampCamera(); renderer.draw(view, ui, .1); }
  assert.equal(JSON.stringify(view), before); assert.equal(view.fog.memories[0].observedAt, 12);
});

test('synthetic page is separate from paid shell, labelled, and has no profile or live-game mutation hook', () => {
  const html = readFileSync(new URL('../qa/fog-prototype/memory-scene.html', import.meta.url), 'utf8');
  const js = readFileSync(new URL('../qa/fog-prototype/memory-scene.js', import.meta.url), 'utf8');
  const shell = readFileSync(new URL('../qa/fog-prototype/shell.js', import.meta.url), 'utf8');
  assert.match(html, /Synthetic QA · not a played match/);
  assert.doesNotMatch(shell, /memoryScene|memory-scenarios|memory-scene/);
  assert.doesNotMatch(js, /localStorage|sessionStorage|indexedDB|serviceWorker|fetch\(|\.state\s*=|game\.state|Game\.restore|\.serialize\(/);
  assert.match(js, /renderer\.draw\(view,/); assert.doesNotMatch(js, /game\.update|setInterval/);
});
