import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Game} from '../dist/engine.js';
import {Renderer} from '../dist/render.js';
import {observe,FOG_RULESET_ID} from '../dist/fog.js';
import {installCanvas,makeRenderer,mockCanvas} from './renderer-canvas.mjs';
import {gameFixture,viewports} from './renderer-scenarios.mjs';
import {loadRendererBeforeImpact,rendererBeforeImpact} from './impact-render-source.mjs';
import {paidImpactScene,projectile} from './impact-feedback-fixture.mjs';

const {Renderer: BeforeImpact} = await loadRendererBeforeImpact();
function mark(p, {reducedMotion = false, quality = 'high'} = {}) {
  const canvas = mockCanvas(), renderer = Object.create(Renderer.prototype);
  Object.assign(renderer,{c:canvas.c,reducedMotion,vfx:{quality}});
  const before = structuredClone(p); renderer.drawProjectile(Object.freeze(p));
  assert.deepEqual(p,before); assert.equal(canvas.depth(),0);
  return canvas.calls;
}
const anchor = calls => calls.find(call => call[0] === 'translate');
const alpha = calls => calls.filter(call => call[0] === 'set' && call[1] === 'globalAlpha').at(-1)[2];

test('the only renderer changes are the declared impact projection, fade and extracted method', () => {
  assert.match(rendererBeforeImpact(), /const arc = p.type === 'siege'/);
  assert.equal(readFileSync(new URL('../dist/engine.js',import.meta.url),'utf8').includes('drawProjectile'),false);
});

test('all ranged roles contact the recorded endpoint at launch and keep that anchor throughout the tail', () => {
  for (const type of ['archer','tower','siege','wizard','gryphon']) for (const side of [0,1])
    for (const sourceAir of [false,true]) for (const targetAir of [false,true]) {
      let previous = 1;
      for (const life of [.28,.23,.13,.03]) {
        const p = projectile(type,{side,sourceAir,targetAir,life,x:947,y:451});
        const calls = mark(p);
        assert.deepEqual(anchor(calls),['translate',p.tx,p.ty-17-(targetAir?17:0)]);
        assert.ok(alpha(calls) <= previous); previous = alpha(calls);
      }
      assert.ok(previous < .11);
    }
});

test('expired saved cosmetics cannot produce a fresh contact mark, including reduced motion', () => {
  for (const type of ['archer','tower','siege','wizard','gryphon']) for (const reducedMotion of [false,true])
    assert.deepEqual(mark(projectile(type,{life:0}),{reducedMotion}),[]);
});

test('arrow tips meet the endpoint; zero-distance and air/ground directions stay finite', () => {
  for (const sourceAir of [false,true]) for (const targetAir of [false,true]) for (const dx of [-200,0,200]) {
    const p = projectile('archer',{sx:1000,tx:1000+dx,sourceAir,targetAir});
    const calls = mark(p);
    assert.deepEqual(calls.filter(call => call[0] === 'translate'),[
      ['translate',p.tx,p.ty-17-(targetAir?17:0)],['translate',-8,0],
    ]);
    const dy = (sourceAir?17:0)-(targetAir?17:0);
    assert.deepEqual(calls.find(call => call[0] === 'rotate'),['rotate',Math.atan2(dy,dx)]);
  }
});

test('reduced motion holds a static mark; low detail omits the streak and extra arrows retain their chevron', () => {
  const p = projectile('tower',{citadelExtra:true});
  const reduced = mark(p,{reducedMotion:true});
  assert.deepEqual(mark({...p,life:.03,x:1090},{reducedMotion:true}),reduced);
  const low = mark(p,{quality:'low'}), high = mark(p);
  const strokes = calls => calls.filter(call => call[0] === 'stroke').length;
  assert.equal(strokes(low),2,'shaft and existing second chevron');
  assert.equal(strokes(reduced),2);
  assert.equal(strokes(high),3,'one bounded early streak');
  assert.equal(strokes(mark({...p,life:.13})),2,'no later arrival cue');
  assert.ok(low.some(call => call[0] === 'set' && call[2] === '#a7e8f3'));
});

test('paid damage and lethal removal are already resolved when the first marker is drawn', () => {
  for (const lethal of [false,true]) {
    const scene = paidImpactScene({lethal}), game = Game.restore(scene.after);
    const p = game.state.projectiles[scene.projectileIndex];
    assert.equal(p.life,.28); assert.equal(p.x,p.sx); assert.equal(p.y,p.sy);
    assert.ok(scene.receipt.hpAfter < scene.receipt.hpBefore);
    assert.deepEqual([p.tx,p.ty],[scene.receipt.targetAtLaunch.x,scene.receipt.targetAtLaunch.y]);
    assert.deepEqual(anchor(mark(p)),['translate',p.tx,p.ty-17-(p.targetAir?17:0)]);
    if (lethal) assert.equal(game.state.units.some(unit => unit.id === scene.receipt.target),false);
  }
});

test('rendering cannot alter continuation, RNG, kill rewards, damage, effects or projectile lifetimes', () => {
  installCanvas(); const scene = paidImpactScene(), rendered = Game.restore(scene.after), control = Game.restore(scene.after);
  const renderer = makeRenderer(Renderer); renderer.reducedMotion = false;
  for (let tick = 0; tick < 400; tick++) {
    const before = rendered.serialize(); renderer.canvas.reset(); renderer.mini.reset();
    renderer.draw(rendered,{paused:true},0); assert.deepEqual(rendered.serialize(),before);
    rendered.update(.05); control.update(.05); assert.deepEqual(rendered.serialize(),control.serialize());
  }
});

test('restored mid-tail marks do not restart; observing/drawing adds no fog information', () => {
  const scene = paidImpactScene(), game = Game.restore(scene.after); game.update(.1);
  const restored = Game.restore(game.serialize());
  for (const p of game.state.projectiles) {
    const index = game.state.projectiles.indexOf(p);
    assert.deepEqual(mark(restored.state.projectiles[index]),mark(p));
  }
  const fog = new Game({rulesetId:FOG_RULESET_ID,ai:false});
  for (const side of [0,1]) {
    const site = fog.map.siteColumns[0];
    const x = side ? fog.map.width-site : site;
    assert.equal(fog.build('archery',x,450,side).ok,true);
  }
  const fire = fog._fire; let fired = false;
  fog._fire = function(attacker,target,damage,type,...rest) {
    if (type === 'archer') fired = true;
    return fire.call(this,attacker,target,damage,type,...rest);
  };
  for (let tick = 0; tick < 1000 && !fired; tick++) fog.update(.05);
  assert.equal(fired,true,'observe a real paid ranged attack under fog');
  assert.deepEqual(fog.state.projectiles,[]);
  assert.deepEqual(observe(fog,0).state.projectiles,[]);
  assert.deepEqual(observe(fog,1).state.projectiles,[]);
});

test('terrain, actors, overlays and minimap remain byte-exact when no projectiles are present', () => {
  installCanvas();
  for (const [width,height] of viewports) for (const reducedMotion of [false,true]) {
    const game = gameFixture(); game.state.projectiles = [];
    const current = makeRenderer(Renderer,width,height), prior = makeRenderer(BeforeImpact,width,height);
    for (const renderer of [current,prior]) {
      renderer.reducedMotion = reducedMotion; renderer.camera = 1600;
      renderer.canvas.reset(); renderer.mini.reset(); renderer.draw(game,{paused:true},0);
    }
    assert.deepEqual(current.canvas.calls,prior.canvas.calls);
    assert.deepEqual(current.mini.calls,prior.mini.calls);
  }
});
