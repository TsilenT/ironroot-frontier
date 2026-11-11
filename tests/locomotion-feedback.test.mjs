import test from 'node:test';
import assert from 'node:assert/strict';
import {Game, buildSites} from '../dist/engine.js';
import {Renderer} from '../dist/render.js';
import {FogRenderer, observationFacade} from '../dist/fog-view.js';
import {FOG_RULESET_ID, observe} from '../dist/fog.js';
import {installCanvas, makeRenderer, mockCanvas} from './renderer-canvas.mjs';
import {rendererBeforeLocomotion} from './locomotion-render-source.mjs';

function paidGame() {
  const game = new Game({ai:false, seed:731, rulesetId:'frontier-rootwarden-open'});
  for (const side of [0,1]) {
    const site = buildSites(game.map, side).find(site => site.lane === 1);
    assert.equal(game.build('archery', site.x, site.y, side).ok, true);
  }
  return game;
}
function draw(renderer, game) {
  const before = game.serialize(), seed = game.seed;
  renderer.draw(game, {paused:true}, 0);
  assert.deepEqual(game.serialize(), before); assert.equal(game.seed, seed);
}
function unitCommands(renderer, unit, time, overrides = {}) {
  const canvas = mockCanvas();
  const r = Object.create(Renderer.prototype);
  Object.assign(r, {c:canvas.c, scale:1, unitMotion:renderer.unitMotion, reducedMotion:false, ...overrides});
  r.drawUnit(Object.freeze({...unit}), time);
  assert.equal(canvas.depth(), 0);
  return canvas.calls;
}

test('declared renderer delta preserves every other v0.40.2 source byte', () => {
  assert.ok(rendererBeforeLocomotion().includes('moving = u.cooldown <= 0'));
});

test('ordinary paid troops walk during positive cooldown and rendering cannot alter deterministic combat', () => {
  installCanvas(); const rendered = paidGame(), control = paidGame(), renderer = makeRenderer(Renderer);
  renderer.reducedMotion = false; let caught = 0, substantial = false;
  for (let tick = 0; tick < 700; tick++) {
    const prior = new Map(rendered.state.units.map(unit => [unit.id, {...unit}]));
    draw(renderer, rendered); rendered.update(.05); control.update(.05); draw(renderer, rendered);
    assert.deepEqual(rendered.serialize(), control.serialize(), 'same paid simulation with and without drawing');
    for (const unit of rendered.state.units) {
      const before = prior.get(unit.id);
      if (!before || unit.cooldown <= 0 || Math.hypot(unit.x-before.x, unit.y-before.y) < .001 || !['archer','warrior'].includes(unit.type)) continue;
      caught++;
      if (unit.cooldown > .4) substantial = true;
      assert.equal(renderer.unitMotion.get(unit.id).moving, true);
      assert.deepEqual(unitCommands(renderer, {...unit,cooldown:-1}, rendered.state.time), unitCommands(renderer, {...unit,cooldown:2}, rendered.state.time));
      const walking = unitCommands(renderer, unit, rendered.state.time);
      const motion = renderer.unitMotion.get(unit.id);
      renderer.unitMotion.set(unit.id, {...motion, moving:false});
      assert.notDeepEqual(unitCommands(renderer, unit, rendered.state.time), walking, 'the real canvas legs/head change, not just a cache flag');
      renderer.unitMotion.set(unit.id, motion);
    }
  }
  assert.ok(caught > 0, 'observe actual paid movement while the cooldown is still positive');
  assert.ok(substantial, 'the repair covers combat recovery, beyond the brief initial spawn cooldown');
});

test('gait follows displacement, freezes while stationary and on redraw, and respects reduced motion', () => {
  installCanvas(); const game = paidGame(), renderer = makeRenderer(Renderer);
  while (!game.state.units.length) game.update(.05);
  const unit = game.state.units[0]; draw(renderer, game);
  game.update(.05); draw(renderer, game);
  const phase = renderer.unitMotion.get(unit.id).phase;
  for (let frame = 0; frame < 10; frame++) draw(renderer, game);
  assert.equal(renderer.unitMotion.get(unit.id).phase, phase);
  // Explicit stationary/cooldown-ready presentation fixture, without engine advancement.
  game.state.time += 5; unit.cooldown = -1; unit.attack = 0; unit.hit = 0; draw(renderer, game);
  assert.equal(renderer.unitMotion.get(unit.id).moving, false);
  assert.equal(renderer.unitMotion.get(unit.id).phase, phase);
  const stationary = unitCommands(renderer, unit, game.state.time);
  assert.deepEqual(unitCommands(renderer, {...unit,cooldown:1}, game.state.time), stationary);
  const reduced = unitCommands(renderer, unit, game.state.time, {reducedMotion:true});
  unit.x += 2; game.state.time += .05; draw(renderer, game);
  assert.equal(renderer.unitMotion.get(unit.id).moving, true);
  assert.notEqual(renderer.unitMotion.get(unit.id).phase, phase);
  const moved = unitCommands(renderer, unit, game.state.time, {reducedMotion:true});
  // Translation remains at the real world position; local reduced-motion art stays still.
  assert.deepEqual(moved.filter(call => call[0] !== 'translate'), reduced.filter(call => call[0] !== 'translate'));
});

test('motion history resets on disappearance, game changes and backward simulation time', () => {
  installCanvas(); const game = paidGame(), renderer = makeRenderer(Renderer);
  while (!game.state.units.length) game.update(.05);
  draw(renderer, game); game.update(.05); draw(renderer, game);
  assert.ok([...renderer.unitMotion.values()].some(motion => motion.moving));
  game.state.time = 0; draw(renderer, game);
  assert.ok([...renderer.unitMotion.values()].every(motion => !motion.moving));
  game.state.units = []; draw(renderer, game); assert.equal(renderer.unitMotion.size, 0);
  draw(renderer, paidGame()); assert.equal(renderer.unitMotion.size, 0);
});

test('fog rendering retains movement across fresh facades and resets without hidden-unit history', () => {
  installCanvas(); const game = new Game({ai:false,seed:731,rulesetId:FOG_RULESET_ID});
  for (const side of [0,1]) {
    const site = buildSites(game.map,side).find(site => site.lane === 1);
    assert.equal(game.build('archery',site.x,site.y,side).ok,true);
  }
  while (![0,1].every(side => game.state.units.some(unit => unit.side === side))) game.update(.05);
  const renderer = makeRenderer(FogRenderer);
  const render = () => renderer.draw(observationFacade(observe(game,0)),{paused:true},0);
  render(); game.update(.05); render();
  assert.ok([...renderer.unitMotion.values()].some(motion => motion.moving));
  assert.deepEqual([...renderer.unitMotion.keys()].sort(), observe(game,0).state.units.map(u => u.id).sort());
  for (const unit of game.state.units.filter(unit => unit.side === 1)) assert.equal(renderer.unitMotion.has(unit.id),false);
  renderer.resetObservation(); assert.equal(renderer.unitMotion.size,0);
  render(); assert.ok([...renderer.unitMotion.values()].every(motion => !motion.moving));
});

test('ranged HP and hit changes are visible while the new arrow remains at its source', () => {
  const game = paidGame(); let observed = false;
  for (let tick = 0; tick < 1000 && !observed; tick++) {
    const beforeTime = game.state.time, shots = [];
    const fire = game._fire;
    game._fire = function(attacker, target, damage, type, ...rest) {
      if (type === 'archer') shots.push({target, hp:target.hp, damage});
      return fire.call(this, attacker, target, damage, type, ...rest);
    };
    game.update(.05); game._fire = fire;
    const shot = shots.find(shot => game.state.units.includes(shot.target));
    if (!shot) continue;
    const projectile = game.state.projectiles.find(p => p.type === 'archer' && p.life === .28);
    assert.ok(projectile); assert.ok(shot.target.hp < shot.hp); assert.equal(shot.target.hit, .16);
    assert.equal(projectile.x, projectile.sx); assert.equal(projectile.y, projectile.sy);
    assert.ok(beforeTime < game.state.time);
    observed = true;
  }
  assert.ok(observed);
});
