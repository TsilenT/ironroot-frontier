/** Source/recording-context checks. The review PNGs separately use native Canvas. */
import test from 'node:test';import assert from 'node:assert/strict';
import {Renderer} from '../dist/render.js';import {mockCanvas,digest} from './renderer-canvas.mjs';
import {rendererBeforeFinalChapter,rendererBeforeObliqueArt} from './final-chapter-render-source.mjs';
function draw({x=1100,time=175,reducedMotion=false,attack=0,hit=0}={}){
 const canvas=mockCanvas(),health=[],u=Object.freeze({id:700,type:'colossus',side:1,x,y:410,hp:6607,maxHp:10000,attack,hit}),phase=Object.freeze({triggeredAt:3097});
 Renderer.prototype.drawColossus.call({c:canvas.c,scale:1,reducedMotion,health(...args){health.push(args);}},u,time,phase);
 assert.equal(canvas.depth(),0);assert.deepEqual(health,[[-175,-221,350,6607/10000,'#f2bd81',8]]);return canvas.calls;
}
test('declared art reverses exactly to actual parent and the literal historic renderer',()=>{assert.match(rendererBeforeObliqueArt(),/fillRect\(-158,-118,316,236\)/);assert.doesNotMatch(rendererBeforeFinalChapter(),/drawColossus/);});
for(const [name,x,time]of [['emergence',2800,155.5],['approach',2200,175],['siege',1100,175]])test(`${name}: finite balanced drawing retains body ring, labels and bounded local geometry`,()=>{
 for(const reducedMotion of [false,true])for(const attack of [0,.1]){
  const calls=draw({x,time,reducedMotion,attack,hit:.1});
  assert.ok(calls.some(c=>c[0]==='arc'&&c[1]===0&&c[2]===0&&c[3]===210));
  assert.ok(calls.some(c=>c[0]==='fillText'&&c[1].endsWith(name==='emergence'?'EMERGING':name==='approach'?'APPROACH':'SIEGE MARCH')));
  assert.equal(calls.filter(c=>c[0]==='translate').length,1);assert.ok(!calls.some(c=>['rotate','scale','transform','setTransform'].includes(c[0])),'art faces, not a skewed scene or footprint');
  for(const c of calls.filter(c=>['moveTo','lineTo','ellipse','arc'].includes(c[0]))){assert.ok(Math.abs(c[1])<=225,c);assert.ok(c[2]>=-210&&c[2]<=145,c);}
 }
});
test('static reduced-motion pose and position-driven machinery are deterministic and input objects stay frozen',()=>{
 assert.equal(digest(draw({reducedMotion:true})),digest(draw({reducedMotion:true,time:180})));
 assert.equal(digest(draw()),digest(draw()));
 const local=calls=>calls.filter(c=>c[0]!=='translate');
 assert.notEqual(digest(local(draw())),digest(local(draw({x:1110}))), 'running gear changes with native position, not just world translation');
 assert.notEqual(digest(draw()),digest(draw({attack:.1})),'contact retains a clear static cue');
});
