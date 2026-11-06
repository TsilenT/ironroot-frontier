import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { Renderer } from '../dist/render.js';
import { Game } from '../dist/engine.js';
import { createCombatScene } from '../qa/combat-feedback/scenes.js';
import { installCanvas, makeRenderer, mockCanvas } from './renderer-canvas.mjs';
import { poses, unit, recordUnit } from './combat-feedback-fixture.mjs';
const read = name => readFileSync(new URL('../' + name, import.meta.url), 'utf8');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const manifest = JSON.parse(read('qa/combat-feedback/baseline-manifest.json'));
let source = read('qa/combat-feedback/baseline-render.js');
for (const [from, to] of [
  ["'../engine.js'", '../dist/engine.js'],
  ["'./baseline-vfx.js'", '../qa/combat-feedback/baseline-vfx.js'],
  ["'./baseline-rootwarden-art.js'", '../qa/combat-feedback/baseline-rootwarden-art.js'],
]) source = source.replace(from, JSON.stringify(new URL(to, import.meta.url).href));
const { Renderer: Baseline } = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));

test('native fixture pins exact tested v0.13.0 source with only three reversible import substitutions', () => {
  assert.equal(manifest.privateCommit, '76135e7b56077a661f67b0b5eeab7c118ec57844');
  assert.equal(manifest.source['dist/render.js'], 'd641e2b2a2ed8403441e98eb6ba5baa7455eb0cfb1795d804b00b73e491fa3aa');
  let original = read('qa/combat-feedback/baseline-render.js');
  for (const [file, digest] of Object.entries(manifest.fixture)) assert.equal(hash(read('qa/combat-feedback/' + file)), digest);
  for (const change of manifest.substitutions) {
    assert.equal(original.split(change.to).length, 2); original = original.replace(change.to, change.from);
  }
  assert.equal(hash(original), manifest.source['dist/render.js']);
  for (const file of ['engine.js', 'vfx.js', 'rootwarden-art.js']) assert.equal(hash(read('dist/' + file)), manifest.source['dist/' + file]);
  for (const file of ['vfx.js', 'rootwarden-art.js']) assert.equal(hash(read('qa/combat-feedback/baseline-' + file)), manifest.source['dist/' + file]);
});

test('every existing idle role and every Rootwarden action match the exact v0.13.0 baseline commands', () => {
  for (const type of ['warrior', 'archer', 'siege', 'wizard', 'gryphon', 'rootwarden'])
    for (const side of [0, 1]) for (const scale of [.12, .32, 1]) for (const reducedMotion of [false, true])
      for (const pose of type === 'rootwarden' ? Object.keys(poses) : ['idle']) {
        const canvas = mockCanvas(), renderer = Object.create(Baseline.prototype);
        Object.assign(renderer, { c: canvas.c, scale, reducedMotion, rootwardenMotion: new Map() });
        renderer.drawUnit(unit(type, side, pose), 1.2);
        assert.deepEqual(recordUnit(type, side, pose, scale, reducedMotion).calls, canvas.calls,
          `${type} ${side} ${scale} ${reducedMotion} ${pose}`);
      }
});

test('victim glow exactly matches v0.13.0 for all roles, sides, qualities, motion settings and hit ages', () => {
  let cases = 0;
  const glowCalls = calls => calls.filter(call => call[0] === 'set' && ['shadowColor', 'shadowBlur'].includes(call[1]));
  for (const type of ['warrior', 'archer', 'siege', 'wizard', 'gryphon', 'rootwarden'])
    for (const side of [0, 1]) for (const scale of [undefined, .12, .32, 1])
      for (const quality of [undefined, 'high', 'low']) for (const reducedMotion of [false, true])
        for (const hit of [0, .001, .08, .16]) {
          const commands = [Baseline, Renderer].map(RendererClass => {
            const canvas = mockCanvas(), renderer = Object.create(RendererClass.prototype);
            Object.assign(renderer, { c: canvas.c, scale, reducedMotion, vfx: { quality }, rootwardenMotion: new Map() });
            renderer.drawUnit({ ...unit(type, side), attack: .22, hit }, 1.2);
            assert.equal(canvas.depth(), 0);
            return glowCalls(canvas.calls);
          });
          assert.deepEqual(commands[1], commands[0], `${type} ${side} ${scale} ${quality} ${reducedMotion} ${hit}`);
          const expected = type !== 'rootwarden' && hit > 0 &&
            (scale === undefined || (!reducedMotion && quality !== 'low'))
            ? [['set', 'shadowColor', '#fff3c9'], ['set', 'shadowBlur', 9]] : [];
          assert.deepEqual(commands[1], expected, 'same glow, no expansion to low detail or reduced motion');
          cases++;
        }
  assert.equal(cases, 1152);
});

test('synthetic scenes stay deterministic, six-role and capped, with no profile/save or ticking access', () => {
  for (const mode of ['roster', 'single', 'dense']) for (const event of ['idle', 'attack', 'hit', 'overlap', 'mixed'])
    for (const elapsed of [0, .05, .15, .22]) for (const side of ['both', '0', '1']) {
      const options = { mode, event, elapsed, side, role: 'rootwarden' };
      const a = createCombatScene(Game, options), b = createCombatScene(Game, options);
      assert.deepEqual(a.game.serialize(), b.game.serialize());
      for (const team of [0, 1]) {
        const troops = a.game.state.units.filter(u => u.side === team);
        assert.ok(troops.length <= 70);
        if (side === 'both' || Number(side) === team) {
          assert.equal(troops.length, mode === 'dense' ? 70 : mode === 'single' ? 1 : 6);
          assert.equal(new Set(troops.map(u => u.type)).size, mode === 'single' ? 1 : 6);
        } else assert.equal(troops.length, 0);
      }
      assert.equal(a.game.state.effects.length, 0); assert.equal(a.game.state.projectiles.length, 0);
      assert.equal(a.game.state.time, 18); assert.equal(a.game.state.winner, null);
    }
  for (const file of ['scenes.js', 'fixture.js'])
    assert.doesNotMatch(read('qa/combat-feedback/' + file), /localStorage|sessionStorage|fetch\(|serviceWorker|\.update\(|Game\.restore/);
  const html = read('qa/combat-feedback/index.html');
  assert.match(html, /not played outcomes/); assert.match(html, /not device viewport/);
  assert.match(html, /Rootwarden is unchanged/); assert.match(html, /Next recovery frame/);
  assert.ok(!readdirSync(new URL('../dist', import.meta.url)).some(file => file.startsWith('__qa')));
  assert.doesNotMatch(read('dist/service-worker.js'), /__qa_combat_feedback|baseline-render|scenes\.js/);
});

test('paired roster, single and 140-troop scenes preserve state/RNG, cameras, minimaps and finite balanced draws', () => {
  installCanvas(); const renderers = [makeRenderer(Baseline), makeRenderer(Renderer)];
  let cases = 0;
  for (const mode of ['roster', 'single', 'dense']) for (const event of ['attack', 'hit', 'mixed'])
    for (const elapsed of [0, .1, .22])
      for (const [width, height, practice] of [[320, 220, false], [390, 302, false], [844, 240, false], [1180, 757, false], [534, 190, true]])
        for (const quality of ['low', 'high']) for (const reducedMotion of [false, true]) {
          const { game, ui, camera } = createCombatScene(Game, { mode, event, elapsed, role: 'siege' });
          const before = JSON.stringify(game.serialize()), state = JSON.stringify(game.state), seed = game.seed;
          for (const renderer of renderers) {
            renderer.canvas.rect = { width, height }; renderer.resize();
            if (practice) renderer.scale = Math.max(.12, height / game.map.height);
            renderer.camera = camera; renderer.clampCamera(); renderer.reducedMotion = reducedMotion;
            renderer.vfx.reset(); renderer.vfx.setPreferences({ quality, reducedMotion });
            renderer.canvas.reset(); renderer.mini.reset(); renderer.draw(game, ui, 0);
            assert.equal(JSON.stringify(game.serialize()), before); assert.equal(JSON.stringify(game.state), state);
            assert.equal(game.seed, seed); assert.equal(renderer.canvas.depth(), 0); assert.equal(renderer.mini.depth(), 0);
          }
          const [a, b] = renderers;
          assert.equal(a.camera, b.camera); assert.equal(a.scale, b.scale);
          assert.deepEqual(a.mini.calls, b.mini.calls); assert.deepEqual(a.vfx.particles, b.vfx.particles);
          if (elapsed === .22) assert.deepEqual(a.canvas.calls, b.canvas.calls, 'settled full frames return to baseline');
          cases++;
        }
  assert.equal(cases, 540);
});
