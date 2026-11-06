import test from 'node:test';
import assert from 'node:assert/strict';
import { Renderer, battlefieldReadability } from '../dist/render.js';
import { BattleVFX } from '../dist/vfx.js';
import { MAPS, UNITS, buildSites } from '../dist/engine.js';
import { installCanvas, makeRenderer, mockCanvas, styledCalls } from './renderer-canvas.mjs';
import { gameFixture } from './renderer-scenarios.mjs';

const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-8, `${a} != ${b}`);
const effect = (type, life = .5) => ({type, life, maxLife:1, x:1600, y:450, side:0, radius:75});
const unit = (type, side = 0) => ({type, side, x:800, y:450, id:1, hp:UNITS[type].hp / 2, maxHp:UNITS[type].hp, cooldown:0, attack:0});

// Trace the actual command transforms, including enemy-facing flips, rather than
// assuming that a positive world-space width means a left-to-right screen bar.
function filledRects(canvas) {
  let m = [1, 0, 0, 1, 0, 0]; const stack = [], rects = [];
  const multiply = n => {
    const [a,b,c,d,e,f] = m, [g,h,i,j,k,l] = n;
    m = [a*g+c*h,b*g+d*h,a*i+c*j,b*i+d*j,a*k+c*l+e,b*k+d*l+f];
  };
  for (const [op, ...a] of canvas.calls) {
    if (op === 'save') stack.push([...m]);
    else if (op === 'restore') m = stack.pop();
    else if (op === 'setTransform') m = a;
    else if (op === 'translate') multiply([1,0,0,1,...a]);
    else if (op === 'scale') multiply([a[0],0,0,a[1],0,0]);
    else if (op === 'rotate') multiply([Math.cos(a[0]),Math.sin(a[0]),-Math.sin(a[0]),Math.cos(a[0]),0,0]);
    else if (op === 'fillRect') rects.push({ x:m[0]*a[0]+m[2]*a[1]+m[4], y:m[1]*a[0]+m[3]*a[1]+m[5], width:m[0]*a[2], height:m[3]*a[3] });
  }
  return rects;
}

test('visual magnification is continuous, bounded and based on CSS field scale, not device pixels', () => {
  for (let scale = .12; scale <= 2; scale += .002) {
    const a = battlefieldReadability(scale), b = battlefieldReadability(scale + .00001);
    assert.ok(a.unitScale >= 1 && a.unitScale <= 1.65);
    assert.ok(a.compact >= 0 && a.compact <= 1);
    assert.ok(Math.abs(a.unitScale - b.unitScale) < .0002);
  }
  assert.equal(battlefieldReadability(.32).unitScale, 1.65);
  assert.equal(battlefieldReadability(.55).unitScale, 1);
  assert.equal(battlefieldReadability(.65).compact, 0);
  for (const bad of [0, -1, NaN, Infinity]) assert.deepEqual(battlefieldReadability(bad), battlefieldReadability(1));
  // This is a geometry bound, not a subjective legibility claim.
  close(34 * .32 * battlefieldReadability(.32).unitScale, 17.952);
});

test('all five damaged unit bars stay >=18x2.5 CSS pixels and fill left to right on either team', () => {
  installCanvas(); const renderer = makeRenderer(Renderer);
  for (const scale of [.12, .22, .32, .4333, .65, 1]) for (const type of Object.keys(UNITS)) for (const side of [0,1]) {
    renderer.scale = scale; renderer.canvas.reset(); renderer.c.scale(scale,scale);
    renderer.drawUnit(unit(type,side), 4);
    const [back,fill] = filledRects(renderer.canvas).slice(-2);
    assert.ok(back.width >= 18 && fill.height >= 2.5 - 1e-8, `${type} ${side} ${scale}`);
    assert.ok(fill.width >= 9 - 1e-8);
    assert.ok(fill.x > back.x && fill.width > 0, 'enemy facing must not reverse health');
    close(fill.x + fill.width, 800 * scale);
    assert.equal(renderer.canvas.depth(),0);
  }
});

test('team markers differ in shape without color and stay at the true ground anchor', () => {
  installCanvas(); const renderer = makeRenderer(Renderer); renderer.scale = .32;
  renderer.canvas.reset(); renderer.drawTeamMarker(0, 1.65);
  assert.equal(renderer.canvas.calls.filter(c => c[0] === 'ellipse').length,1);
  assert.equal(renderer.canvas.calls.filter(c => c[0] === 'lineTo').length,0);
  renderer.canvas.reset(); renderer.drawTeamMarker(1, 1.65);
  assert.equal(renderer.canvas.calls.filter(c => c[0] === 'ellipse').length,0);
  assert.equal(renderer.canvas.calls.filter(c => c[0] === 'lineTo').length,3);
  for (const type of Object.keys(UNITS)) {
    renderer.canvas.reset(); renderer.drawUnit(unit(type),0);
    assert.deepEqual(renderer.canvas.calls.find(c => c[0] === 'translate'), ['translate',800,450]);
  }
});

test('renderer-only changes preserve engine state, RNG, camera transforms and paid placement sites', () => {
  installCanvas(); const renderer = makeRenderer(Renderer);
  for (const map of Object.values(MAPS)) for (const scale of [.12,.32,.75]) {
    const game = gameFixture(map.id), control = gameFixture(map.id);
    renderer.setMap(map); renderer.scale = scale; renderer.clampCamera();
    for (const site of buildSites(map,0)) {
      const screen = renderer.worldToScreen(site.x,site.y), world = renderer.screenToWorld(screen.x,screen.y);
      close(world.x,site.x); close(world.y,site.y); assert.deepEqual(renderer.snap(world),{x:site.x,y:site.y});
    }
    for (let i=0;i<12;i++) {
      game.update(.05); control.update(.05);
      const before = JSON.stringify(game.state), seed = game.seed;
      renderer.canvas.reset(); renderer.mini.reset();
      renderer.draw(game,{paused:false,build:'barracks',pointer:{x:410,y:map.lanes[0]}},.05);
      assert.equal(JSON.stringify(game.state),before);
      assert.equal(game.seed,seed);
      assert.deepEqual(game.serialize(),control.serialize());
      assert.equal(renderer.canvas.depth(),0); assert.equal(renderer.mini.depth(),0);
    }
  }
});

test('impact effects precede bodies and mission badges follow every body and projectile', () => {
  installCanvas(); const renderer = makeRenderer(Renderer), game = gameFixture();
  renderer.camera = 1600; renderer.scale = .32; renderer.clampCamera();
  game.state.effects = [effect('volley')];
  const target = game.state.buildings.find(b => b.type === 'watchtower');
  renderer.canvas.reset();
  renderer.draw(game,{paused:true,targets:[target.id]},0);
  const calls = renderer.canvas.calls;
  const effects = calls.findIndex(c => c[0] === 'translate' && c[1] === 1600 && c[2] === 450);
  const targetBadge = calls.findLastIndex(c => c[0] === 'translate' && c[1] === target.x && c[2] === target.y - 94);
  for (const entity of [...game.state.buildings,...game.state.units]) {
    const index = calls.findIndex(c => c[0] === 'translate' && c[1] === entity.x && c[2] === entity.y);
    assert.ok(index > effects, 'effects are below battlefield entities');
    assert.ok(index < targetBadge, 'mission badges remain above entities');
  }
  assert.ok(targetBadge > calls.findLastIndex(c => c[0] === 'rotate'), 'badge follows arrow trails');
});

test('small-field terrain suppression leaves cached art untouched and essential labels have a 10px floor', () => {
  installCanvas(); const renderer = makeRenderer(Renderer), game = gameFixture();
  for (const scale of [.12,.32,.65,1]) {
    renderer.scale = scale; const terrainCalls = JSON.stringify(renderer.terrain.calls);
    renderer.canvas.reset(); renderer.draw(game,{paused:true},0);
    assert.equal(JSON.stringify(renderer.terrain.calls),terrainCalls);
    const washes = styledCalls(renderer.canvas,'fillRect').filter(c => c.style === '#24342c');
    assert.equal(washes.length, scale < .65 ? 1 : 0);
    const fonts = renderer.canvas.calls.filter(c => c[0] === 'set' && c[1] === 'font' && c[2].includes('DM Sans'));
    for (const font of fonts) assert.ok(Number(font[2].match(/([\d.]+)px/)[1]) * scale >= 10 - 1e-8);
  }
});

test('compact and low-quality effects suppress decoration without modifying particle state', () => {
  const vfx = new BattleVFX(); vfx.update(['build','death','magic','hit'].map(t=>effect(t)),0);
  const before = JSON.stringify(vfx.particles), stats = vfx.getStats(), seed = vfx.seed;
  const full = mockCanvas(), compact = mockCanvas(); vfx.draw(full.c); vfx.draw(compact.c,null,{compact:true});
  assert.ok(compact.calls.length < full.calls.length * .8);
  assert.equal(JSON.stringify(vfx.particles),before); assert.deepEqual(vfx.getStats(),stats); assert.equal(vfx.seed,seed);
  vfx.quality = 'low'; const low = mockCanvas(); vfx.draw(low.c);
  assert.deepEqual(low.calls,compact.calls);
  assert.equal(compact.depth(),0);
});

test('reduced-motion base effects keep geometry stationary while fading; low quality shortens volleys', () => {
  installCanvas(); const renderer = makeRenderer(Renderer); renderer.reducedMotion = true;
  for (const type of ['volley','blast','magic','build','upgrade','death','hit']) {
    const frames = [.8,.2].map(life => {
      renderer.canvas.reset(); renderer.drawEffect(effect(type,life));
      return renderer.canvas.calls.filter(c=>!(c[0] === 'set' && c[1] === 'globalAlpha'));
    });
    assert.deepEqual(frames[0],frames[1],type);
  }
  renderer.canvas.reset(); renderer.drawEffect(effect('volley')); const high = renderer.canvas.calls.length;
  renderer.vfx.setPreferences({quality:'low'}); renderer.canvas.reset(); renderer.drawEffect(effect('volley'));
  assert.ok(renderer.canvas.calls.length < high);
});

test('placement outlines are visible in CSS pixels without expanding their exact world-site bounds', () => {
  installCanvas(); const renderer = makeRenderer(Renderer), game = gameFixture(); renderer.scale=.32;
  renderer.canvas.reset(); renderer.draw(game,{paused:true,build:'barracks',pointer:{x:410,y:450}},0);
  const outlines = styledCalls(renderer.canvas,'strokeRect','strokeStyle').filter(c=>['#edf2b4','#e89176'].includes(c.style));
  assert.deepEqual(outlines.at(-1).args,[355,395,110,110]);
  assert.ok(renderer.canvas.calls.some(c=>c[0]==='set'&&c[1]==='lineWidth'&&c[2]===2/.32));
});
