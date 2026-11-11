import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { sampleCombatFeedback, COMBAT_FEEDBACK_TIMERS } from '../dist/combat-feedback.js';
import { Renderer, drawUnitPortrait } from '../dist/render.js';
import { Renderer as HistoricalRenderer, drawUnitPortrait as historicalPortrait } from '../qa/fixtures/accepted-clarity/render.js';
import { Game, MAPS, buildSites } from '../dist/engine.js';
import { RecordingContext } from './rootwarden-canvas.mjs';
import { installCanvas, makeRenderer, mockCanvas, digest } from './renderer-canvas.mjs';
import { classicSnapshot } from './renderer-scenarios.mjs';
import { units, poses, unit, recordUnit, combatSnapshots } from './combat-feedback-fixture.mjs';
import {loadRendererBeforeImpact} from './impact-render-source.mjs';
const {Renderer: BeforeImpact, drawUnitPortrait: beforeImpactPortrait} = await loadRendererBeforeImpact();
const read = path => readFileSync(new URL(path, import.meta.url));
const hash = path => createHash('sha256').update(read(path)).digest('hex');

// This fixture labels intentional post-hit changes separately. The earlier
// readability and Classic records remain historical oracles, never repinned.
test('labelled combat-feedback snapshots cover six roles, both teams and motion modes at three scales', () => {
  const expected = JSON.parse(read('./fixtures/renderer-combat-feedback.json'));
  assert.match(expected.scope, /not pixel approval/);
  const actual = combatSnapshots();
  assert.equal(Object.keys(actual).length, 72);
  assert.deepEqual(actual, expected.units);
  for (const type of Object.keys(units)) for (const side of [0, 1])
    for (const scale of [.12, .32, 1]) for (const reducedMotion of [false, true])
      for (const pose of Object.keys(poses)) {
        const canvas = recordUnit(type, side, pose, scale, reducedMotion);
        assert.equal(canvas.depth(), 0, `${type} ${pose}`);
        assert.deepEqual(canvas.calls, recordUnit(type, side, pose, scale, reducedMotion).calls);
      }
});

test('native 0.22/0.16 timers begin at contact or recoil and settle monotonically, without a windup', () => {
  assert.deepEqual(COMBAT_FEEDBACK_TIMERS, { attack: .22, hit: .16 });
  for (const [timer, amount] of [['attack', 'contact'], ['hit', 'recoil']]) {
    let previous = 1;
    for (let frame = 0; frame <= 100; frame++) {
      const value = COMBAT_FEEDBACK_TIMERS[timer] * (1 - frame / 100);
      const pose = sampleCombatFeedback(Object.freeze({ [timer]: value }));
      assert.ok(pose[amount] <= previous && pose[amount] >= 0);
      if (!frame) assert.equal(pose[amount], 1, 'damage already happened, show contact immediately');
      previous = pose[amount];
    }
    assert.equal(previous, 0);
  }
  assert.equal(sampleCombatFeedback({ attack: .22, hit: .16 }).contact, 0);
  assert.equal(sampleCombatFeedback({ attack: .22, hit: .16 }).state, 'hit');
  assert.deepEqual(sampleCombatFeedback({ cooldown: 0 }), { state: 'idle', contact: 0, recoil: 0 });
  for (const value of [NaN, Infinity, -Infinity, -1, null, undefined, '0.22', {}, []])
    assert.deepEqual(sampleCombatFeedback({ attack: value, hit: value }), { state: 'idle', contact: 0, recoil: 0 });
  assert.equal(sampleCombatFeedback({ attack: 1000 }).contact, 1);
});

test('reduced motion holds distinct static live states without new bob, blur, flash, opacity or clock dependence', () => {
  for (const type of Object.keys(units)) for (const side of [0, 1]) for (const scale of [.12, .32, 1]) {
    const idle = recordUnit(type, side, 'idle', scale, true).calls;
    const attack = recordUnit(type, side, 'contact', scale, true).calls;
    const hit = recordUnit(type, side, 'hit', scale, true).calls;
    assert.notDeepEqual(attack, idle, type);
    assert.notDeepEqual(hit, idle, type);
    assert.notDeepEqual(hit, attack, type);
    for (const time of [0, .05, 8, 999]) for (const fraction of [.01, .5, 1]) {
      assert.deepEqual(recordUnit(type, side, { attack: .22 * fraction, hit: 0 }, scale, true, time).calls, attack);
      assert.deepEqual(recordUnit(type, side, { attack: 0, hit: .16 * fraction }, scale, true, time).calls, hit);
    }
    for (const calls of [idle, attack, hit]) assert.ok(!calls.some(call =>
      call[0] === 'set' && ['shadowBlur', 'shadowColor', 'globalAlpha'].includes(call[1])));
  }
});

test('ground markers, shadows and left-to-right damaged health remain exact in every action pose', () => {
  for (const type of Object.keys(units)) for (const side of [0, 1]) for (const scale of [.12, .32, 1]) {
    const idle = recordUnit(type, side, 'idle', scale, true).calls;
    // Ground marker finishes before the first model scale. Health follows the
    // restored model transform; the final six commands include its styles/rects.
    const markerEnd = idle.findIndex(call => call[0] === 'scale');
    for (const pose of Object.keys(poses)) {
      const current = recordUnit(type, side, pose, scale, true).calls;
      assert.deepEqual(current.slice(0, markerEnd), idle.slice(0, markerEnd));
      assert.deepEqual(current.slice(-6), idle.slice(-6), `${type} ${pose} health`);
      if (type !== 'rootwarden') {
        const shadowEnd = current.findIndex(call => call[0] === 'fill');
        assert.deepEqual(current.slice(0, shadowEnd + 1), idle.slice(0, shadowEnd + 1));
        if (type === 'gryphon') {
          const count = calls => calls.filter(call => call[0] === 'ellipse' && call[1] === 2 && call[2] === 5);
          assert.deepEqual(count(current), count(idle));
        }
      }
    }
  }
});

test('contact/recoil stays within conservative original-silhouette bounds without extra draw shapes', () => {
  const bounds = { warrior: [-30, 30, -34, 17], archer: [-29, 29, -34, 17],
    siege: [-35, 35, -47, 19], wizard: [-29, 29, -43, 17], gryphon: [-42, 42, -55, 17] };
  for (const [type, [left, right, top, bottom]] of Object.entries(bounds)) for (const side of [0, 1])
    for (const pose of Object.keys(poses)) for (const reducedMotion of [false, true]) {
      const c = new RecordingContext(), renderer = Object.create(Renderer.prototype);
      Object.assign(renderer, { c, scale: 1, reducedMotion });
      renderer.drawUnit({ ...unit(type, side, pose), x: 0, y: 0, hp: units[type].hp }, 1.2);
      for (const [x, y] of c.points) assert.ok(x >= left && x <= right && y >= top && y <= bottom,
        `${type} ${side} ${pose}: (${x}, ${y})`);
      assert.equal(c.stack.length, 0);
      const count = name => c.commands.filter(call => call[0] === name).length;
      const idle = recordUnit(type, side, 'idle', 1, reducedMotion).calls;
      for (const name of ['fill', 'stroke', 'arc', 'ellipse'])
        assert.equal(count(name), idle.filter(call => call[0] === name).length, `${type} ${pose} ${name}`);
    }
});

test('historical source still produces unchanged readability hashes; portraits and Rootwarden bytes are retained', () => {
  installCanvas();
  const historical = classicSnapshot(HistoricalRenderer, historicalPortrait);
  const fixture = JSON.parse(read('./fixtures/renderer-readability-lab.json'));
  assert.deepEqual(historical.frames, fixture.frames);
  assert.equal(hash('../qa/fixtures/accepted-clarity/render.js'), '9f77b130b7397f188a63dfb960a90d2b5b17d0da94c4e8bd7a1f56ba64aed99e');
  assert.equal(hash('./fixtures/renderer-readability-lab.json'), '18929dc571b01f831a43cae59dbcf374ea61c766d12f0a37c6d77b0aedc4bc11');
  assert.equal(hash('../dist/rootwarden-art.js'), '70430d5e6a05963ecb245e3181d8ee43c2a21165a31260e75fc0403ba59bafda');
  const current = classicSnapshot(Renderer, drawUnitPortrait);
  const beforeImpact = classicSnapshot(BeforeImpact, beforeImpactPortrait);
  assert.deepEqual(current.portraits, historical.portraits);
  assert.deepEqual(current.themes, historical.themes);
  assert.deepEqual(beforeImpact.frames, JSON.parse(read('./fixtures/renderer-combat-feedback.json')).frames);
  for (const [viewport, frame] of Object.entries(current.frames)) {
    const {main: _, ...geometry} = frame;
    const {main: __, ...priorGeometry} = beforeImpact.frames[viewport];
    assert.deepEqual(geometry, priorGeometry);
  }
  for (const type of Object.keys(units)) for (const side of [0, 1]) {
    const canvas = mockCanvas(); drawUnitPortrait(canvas, type, side, { units });
    assert.equal(canvas.depth(), 0);
  }
});

test('real fire events show damage/contact immediately and drawing preserves engine, RNG, geometry and minimap', () => {
  installCanvas();
  for (const map of Object.values(MAPS)) for (const type of Object.keys(units)) for (const side of [0, 1])
    for (const reducedMotion of [false, true]) {
      const game = new Game({ ai: false, seed: 917, mapId: map.id, rulesetId: 'frontier-rootwarden-open' });
      game.state.units = [unit(type, side), unit('rootwarden', 1 - side)];
      const [attacker, target] = game.state.units;
      Object.assign(attacker, { id: 50, x: 1580, y: map.lanes[0], lane: 0, level: 1 });
      Object.assign(target, { id: 51, x: 1610, y: map.lanes[0], lane: 0, level: 1 });
      game.nextId = 100;
      const hp = target.hp;
      game._fire(attacker, target, 7, type);
      assert.equal(target.hp, hp - 7); assert.equal(target.hit, .16); assert.equal(attacker.attack, .22);
      if (type !== 'rootwarden') assert.equal(sampleCombatFeedback(attacker).contact, 1);
      const renderer = makeRenderer(Renderer, 320, 220), control = makeRenderer(HistoricalRenderer, 320, 220);
      for (const r of [renderer, control]) { r.setMap(map.id); r.scale = .32; r.camera = map.width / 2; r.reducedMotion = reducedMotion; }
      const before = JSON.stringify(game.serialize()), state = JSON.stringify(game.state), seed = game.seed;
      renderer.draw(game, { paused: true }, 0); control.drawMinimap(game.state);
      assert.equal(JSON.stringify(game.serialize()), before); assert.equal(JSON.stringify(game.state), state);
      assert.equal(game.seed, seed); assert.deepEqual(renderer.mini.calls, control.mini.calls);
      for (const site of buildSites(map, 0)) {
        assert.deepEqual(renderer.worldToScreen(site.x, site.y), control.worldToScreen(site.x, site.y));
        assert.deepEqual(renderer.snap(site), control.snap(site));
      }
      const copy = Game.restore(game.serialize());
      for (let tick = 0; tick < 6; tick++) {
        game.update(.05); copy.update(.05); renderer.canvas.reset(); renderer.mini.reset();
        renderer.draw(game, { paused: true }, 0);
        assert.deepEqual(game.serialize(), copy.serialize()); assert.equal(game.seed, copy.seed);
      }
    }
});

test('pose sampling has no import, random, mutation, storage, events or clock dependencies', () => {
  const source = String(read('../dist/combat-feedback.js'));
  assert.doesNotMatch(source, /\b(import|Date|performance|document|window|fetch|Math\.random|localStorage|sessionStorage|setTimeout|setInterval|requestAnimationFrame)\b/);
  for (const value of [null, undefined, {}, Object.freeze({ attack: .22, hit: .16 })]) assert.doesNotThrow(() => sampleCombatFeedback(value));
});
