import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { RecordingContext } from './rootwarden-canvas.mjs';
import { drawRootwarden, drawWardenLodge, sampleRootwardenPose, ROOTWARDEN_STATES,
  WARDEN_LODGE_STATES, ROOTWARDEN_BOUNDS, WARDEN_LODGE_BOUNDS, ROOTWARDEN_PALETTE } from '../dist/rootwarden-art.js';
const hash = path => createHash('sha256').update(readFileSync(new URL(path,import.meta.url))).digest('hex');
const snapshot = (draw,o) => { const c=new RecordingContext();draw(c,o);return c; };

test('Every state, side, facing and LOD emits finite commands and restores canvas state',()=>{
  let cases=0;
  for(const [draw,states] of [[drawRootwarden,ROOTWARDEN_STATES],[drawWardenLodge,WARDEN_LODGE_STATES]])
    for(const state of states)for(const side of [0,1])for(const facing of [-1,1])
      for(const reducedMotion of [false,true])for(const compact of [false,true])for(const phase of [0,.24,.48,.75,1]) {
        const c=new RecordingContext();c.translate(20,30);c.scale(.32,.32);
        const before=c.snapshot(),o=Object.freeze({state,side,facing,reducedMotion,compact,phase,time:3.78,scale:1.65,marker:true});
        draw(c,o);assert.equal(c.stack.length,0);assert.deepEqual(c.snapshot(),before);cases++;
      }
  assert.equal(cases,560);
});

test('Invalid and extreme numeric inputs safely normalize, without mutating caller data',()=>{
  const invalid=[NaN,Infinity,-Infinity,Number.MAX_VALUE,-Number.MAX_VALUE,0,-1,null,undefined,'12',{},[]];
  for(const value of invalid)for(const draw of [drawRootwarden,drawWardenLodge]) {
    const o=Object.freeze({ x:value,y:value,scale:value,time:value,phase:value,seed:value,outline:value,markerWidth:value,marker:true,state:'walk' });
    const c=snapshot(draw,o);assert.equal(c.stack.length,0);
  }
  for(const o of [null,undefined,0,'invalid'])for(const draw of [drawRootwarden,drawWardenLodge])assert.doesNotThrow(()=>snapshot(draw,o));
});

test('Reduced-motion geometry is identical over time, phase, and animation seed',()=>{
  for(const [draw,states] of [[drawRootwarden,ROOTWARDEN_STATES],[drawWardenLodge,WARDEN_LODGE_STATES]])
    for(const state of states)for(const side of [0,1])for(const compact of [false,true]) {
      const options={state,side,compact,reducedMotion:true,marker:true};
      const reference=snapshot(draw,{...options,time:0,phase:0,seed:0}).commands;
      for(const time of [0,.19,.45,2.18,12345])assert.deepEqual(snapshot(draw,{...options,time,phase:.87,seed:71}).commands,reference);
    }
  assert.deepEqual(snapshot(drawRootwarden,{state:'idle',reducedMotion:true}).commands,
    snapshot(drawRootwarden,{state:'walk',reducedMotion:true}).commands);
  assert.notDeepEqual(snapshot(drawRootwarden,{state:'attack',reducedMotion:true}).commands,
    snapshot(drawRootwarden,{state:'hit',reducedMotion:true}).commands);
});

test('Walk and action poses remain restrained; hit does not flash or turn transparent',()=>{
  for(let i=0;i<=100;i++) {
    for(const state of ROOTWARDEN_STATES) {
      const p=sampleRootwardenPose({state,phase:i/100,time:i/100});
      assert.ok(Math.abs(p.bodyX)<=.81);assert.ok(Math.abs(p.bodyY)<=.66);
      assert.ok(Math.abs(p.shieldX)<=2.41);assert.ok(Math.abs(p.lean)<.026);
      assert.ok(Math.abs(p.backFoot)<=1.66&&Math.abs(p.frontFoot)<=1.66);
    }
  }
  assert.equal(sampleRootwardenPose({state:'attack',phase:0}).shieldX,0);
  assert.equal(sampleRootwardenPose({state:'attack',phase:1}).shieldX,0);
  const c=snapshot(drawRootwarden,{state:'hit'});
  assert.ok(c.commands.some(v=>v[0]==='stroke'&&v[1]==='#f5dfb2'));
  assert.ok(c.commands.filter(v=>v[0]==='stroke'||v[0]==='fill').every(v=>v.at(-1)===.7));
});

test('Model geometry fits documented conservative art bounds in both directions',()=>{
  for(const [draw,states,b] of [[drawRootwarden,ROOTWARDEN_STATES,ROOTWARDEN_BOUNDS],
    [drawWardenLodge,WARDEN_LODGE_STATES,WARDEN_LODGE_BOUNDS]]) {
    for(const state of states)for(const side of [0,1])for(const phase of [0,.24,.48,.75,1]) {
      const c=snapshot(draw,{state,side,phase,marker:true,time:.19});
      // Rootwarden's bounds are canonical right-facing; mirrored sides use mirrored bounds.
      const left=draw===drawRootwarden&&side ? -b.right : b.left;
      const right=draw===drawRootwarden&&side ? -b.left : b.right;
      for(const [x,y] of c.points)assert.ok(x>=left&&x<=right&&y>=b.top&&y<=b.bottom, `${draw.name} ${state}: (${x},${y}) outside bounds`);
    }
  }
});

test('Team identity uses both accepted colors and independent circle/diamond geometry',()=>{
  assert.equal(ROOTWARDEN_PALETTE[0].cloth,'#539d95');assert.equal(ROOTWARDEN_PALETTE[1].cloth,'#ad6554');
  const ally=snapshot(drawRootwarden,{side:0,facing:1,marker:true});
  const enemy=snapshot(drawRootwarden,{side:1,facing:1,marker:true});
  assert.ok(ally.commands.filter(v=>v[0]==='ellipse').length>enemy.commands.filter(v=>v[0]==='ellipse').length);
  assert.notDeepEqual(ally.commands,enemy.commands);
});

test('Nested Canvas saves are restored if a host Canvas operation throws',()=>{
  for(const draw of [drawRootwarden,drawWardenLodge])for(const failAt of [1,5,10,18]) {
    const c=new RecordingContext(),before=c.snapshot();let count=0;
    c.fill=function(){if(++count===failAt)throw Error('host failure');RecordingContext.prototype.fill.call(this);};
    try { draw(c,{state:'hit',marker:true}); } catch(error){assert.equal(error.message,'host failure');}
    assert.equal(c.stack.length,0);assert.deepEqual(c.snapshot(),before);
  }
});

test('Original helpers have no engine, DOM, network, timer or storage dependency',()=>{
  const source=readFileSync(new URL('../dist/rootwarden-art.js',import.meta.url),'utf8');
  assert.doesNotMatch(source,/\b(import|document|window|fetch|localStorage|sessionStorage|requestAnimationFrame|setInterval|setTimeout)\b/);
});

test('Production helper is the exact accepted original art', () => {
  assert.equal(hash('../dist/rootwarden-art.js'), '70430d5e6a05963ecb245e3181d8ee43c2a21165a31260e75fc0403ba59bafda');
});
