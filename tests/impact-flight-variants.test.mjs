import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../dist/engine.js';
import {installCanvas,makeRenderer} from './renderer-canvas.mjs';
import {rendererBeforeImpact,loadRendererBeforeImpact} from './impact-render-source.mjs';
import {paidImpactScene,impactReadabilityScene} from './impact-feedback-fixture.mjs';
import {flightContactVariant} from '../qa/projectile-contact/variants.mjs';

const baseline=rendererBeforeImpact(),{Renderer:Main}=await loadRendererBeforeImpact();
const variants=await Promise.all([false,true].map(async fadeFlight=>{
  const source=flightContactVariant(baseline,{fadeFlight}).replace(/(from\s*['"])(\.\/[^'"]+)(['"])/g,
    (_,a,p,b)=>a+new URL('../dist/'+p.slice(2),import.meta.url).href+b);
  return (await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'))).Renderer;
}));
// The mock assigns per-canvas gradient handles. Compare their stops, not handle counters.
const commands=r=>JSON.parse(JSON.stringify(r.canvas.calls,(key,value)=>key==='gradient'&&typeof value==='number'?true:value));
const draw=(r,game)=>{r.canvas.reset();r.mini.reset();r.draw(game,{paused:true},0);return commands(r);};
const phase=(game,elapsed)=>{
  for(const p of game.state.projectiles){p.life=Math.max(0,p.maxLife-elapsed);const t=Math.min(1,elapsed/p.maxLife);
    p.x=p.sx+(p.tx-p.sx)*t;p.y=p.sy+(p.ty-p.sy)*t;}
};

test('flight experiments require literal public-main source and retain its siege arc',()=>{
  for(const fadeFlight of [false,true]){
    const source=flightContactVariant(baseline,{fadeFlight});
    assert.match(source,/const arc = p.type === 'siege' \? Math.sin\(t \* Math.PI\) \* 55/);
    assert.match(source,/immediateRangedContact\(this,p\)/);
    assert.throws(()=>flightContactVariant(baseline+'\n',{fadeFlight}),/literal public-main/);
  }
});

test('both QA variants draw contact at paid damage birth and preserve 800 deterministic continuation ticks',()=>{
  installCanvas();
  for(const Class of variants){
    const scene=paidImpactScene(),game=Game.restore(scene.after),control=Game.restore(scene.after),r=makeRenderer(Class);
    r.reducedMotion=false;r.camera=1600;
    assert.ok(scene.receipt.hpAfter<scene.receipt.hpBefore);
    const p=game.state.projectiles[scene.projectileIndex];
    assert.ok(draw(r,game).some(call=>call[0]==='translate'&&call[1]===p.tx&&call[2]===p.ty-17-(p.targetAir?17:0)));
    for(let tick=0;tick<400;tick++){
      const before=game.serialize();draw(r,game);assert.deepEqual(game.serialize(),before);
      game.update(.05);control.update(.05);assert.deepEqual(game.serialize(),control.serialize());
    }
  }
});

test('full-flight variant is command-exact with main after the immediate accent expires, including restored tails',()=>{
  installCanvas();
  for(const width of [320,390,1180]){
    const game=Game.restore(impactReadabilityScene()),renderers=[Main,variants[0]].map(C=>makeRenderer(C,width,240));
    for(const r of renderers){r.reducedMotion=false;r.camera=1600;}
    for(const elapsed of [.15,.25]){
      phase(game,elapsed);assert.deepEqual(draw(renderers[1],game),draw(renderers[0],game));
      const restored=Game.restore(game.serialize());assert.deepEqual(draw(renderers[1],restored),draw(renderers[0],restored));
    }
  }
});

test('reduced-motion contact has no travelling, fading or restarting mark across frozen and restored phases',()=>{
  installCanvas();
  for(const Class of variants)for(const width of [320,390,1180]){
    const game=Game.restore(impactReadabilityScene()),r=makeRenderer(Class,width,240);r.camera=1600;r.reducedMotion=true;
    const initial=draw(r,game);
    for(const elapsed of [.05,.15,.25]){
      phase(game,elapsed);assert.deepEqual(draw(r,game),initial);
      assert.deepEqual(draw(r,Game.restore(game.serialize())),initial);
    }
  }
});

test('expired stored cosmetics add no flight or contact in either QA variant',()=>{
  installCanvas();
  for(const Class of variants)for(const reducedMotion of [false,true]){
    const game=Game.restore(impactReadabilityScene()),r=makeRenderer(Class,320,240);r.camera=1600;r.reducedMotion=reducedMotion;
    phase(game,.28);const expired=draw(r,game);game.state.projectiles=[];assert.deepEqual(draw(r,game),expired);
  }
});
