import test from 'node:test';
import assert from 'node:assert/strict';
import {BattleVFX} from '../dist/vfx.js';
const effect=(type='blast',radius=55)=>({x:600,y:450,type,side:0,life:.7,maxLife:.7,radius});
function canvas(){
 const calls=[];let depth=0;
 const ctx=new Proxy({}, {get:(o,k)=>k in o?o[k]:(...args)=>{
  if(k==='save')depth++;if(k==='restore')depth--;
  assert.ok(args.filter(a=>typeof a==='number').every(Number.isFinite),`${k} finite`);
  calls.push([k,...args]);
 },set:(o,k,v)=>{if(typeof v==='number')assert.ok(Number.isFinite(v));o[k]=v;return true;}});
 return {ctx,calls,depth:()=>depth};
}
test('all effect families draw finite, balanced canvas operations without engine mutation',()=>{
 const effects=['build','upgrade','sell','spawn','death','hit','blast','magic','volley'].map(t=>Object.freeze(effect(t)));
 const before=JSON.stringify(effects);const v=new BattleVFX();v.update(Object.freeze(effects),1/60);
 const c=canvas();v.draw(c.ctx);assert.ok(c.calls.length>50);assert.equal(c.depth(),0);
 assert.equal(JSON.stringify(effects),before);assert.equal(v.getStats().effectsSeen,9);
});
test('WeakSet identity tracking prevents repeated or returning effect spawns',()=>{
 const v=new BattleVFX(),e=effect();v.update([e],0);const count=v.getStats().spawned;
 v.update([e],0);v.update([],0);v.update([e],0);assert.equal(v.getStats().spawned,count);
 v.update([effect()],0);assert.ok(v.getStats().spawned>count);
});
test('heavy prolonged combat respects global and rubble caps',()=>{
 const v=new BattleVFX();for(let i=0;i<1000;i++){
  v.update([effect('death'),effect(),effect('magic'),effect('volley',150)],.016);
  const s=v.getStats();assert.ok(s.particles<=200);assert.ok(s.rubble<=30);
  assert.ok(Math.abs(v.getShake().x)<=2&&Math.abs(v.getShake().y)<=2);
 }
 for(let i=0;i<100;i++)v.update([],.1);assert.equal(v.getStats().particles,0);
});
test('pause freezes visuals and defers unseen effects until resumed',()=>{
 const v=new BattleVFX();v.update([effect()],.01);const c=canvas();v.draw(c.ctx);
 const before=v.getStats(),shake=v.getShake();const e=effect('upgrade');v.update([e],10,{paused:true});
 const after=canvas();v.draw(after.ctx);assert.deepEqual(after.calls,c.calls);
 assert.deepEqual(v.getStats(),before);assert.deepEqual(v.getShake(),shake);
 v.update([e],0);assert.equal(v.getStats().effectsSeen,before.effectsSeen+1);
});
test('negative and nonfinite delta do not reverse or poison existing particles',()=>{
 const v=new BattleVFX();v.update([effect()],0);const c=canvas();v.draw(c.ctx);
 for(const dt of [-10,NaN,Infinity,undefined])v.update([],dt);
 const after=canvas();v.draw(after.ctx);assert.deepEqual(after.calls,c.calls);
});
test('reduced motion uses only stationary fading particles and no shake',()=>{
 const v=new BattleVFX({reducedMotion:true});v.update([effect(),effect('magic')],0);
 const c=canvas();v.draw(c.ctx);v.update([],.05);const after=canvas();v.draw(after.ctx);
 const transforms=x=>x.calls.filter(c=>['translate','rotate','scale'].includes(c[0]));
 assert.deepEqual(transforms(c),transforms(after));assert.deepEqual(v.getShake(),{x:0,y:0});
});
test('live preference changes reduce budgets and immediately cancel shake',()=>{
 const high=new BattleVFX(),low=new BattleVFX({quality:'low'});high.update([effect()],0);low.update([effect()],0);
 assert.ok(low.getStats().particles<high.getStats().particles);
 for(let i=0;i<40;i++)high.update([effect('death')],0);
 high.setPreferences({quality:'low',reducedMotion:true});assert.ok(high.getStats().particles<=80);
 assert.ok(high.getStats().rubble<=12);assert.deepEqual(high.getShake(),{x:0,y:0});
});
test('reset clears counters, particles and identity history reproducibly',()=>{
 const v=new BattleVFX(),e=effect();v.update([e],0);const c=canvas();v.draw(c.ctx);v.reset();
 assert.equal(v.getStats().particles,0);assert.equal(v.getStats().spawned,0);
 assert.deepEqual(v.getShake(),{x:0,y:0});v.update([e],0);const after=canvas();v.draw(after.ctx);assert.deepEqual(after.calls,c.calls);
});
test('invalid effects are ignored and view culling avoids draw work',()=>{
 const v=new BattleVFX();v.update([null,42,{},effect('unknown'),{...effect(),x:NaN}],0);
 assert.equal(v.getStats().particles,0);v.update([effect()],0);
 const c=canvas();v.draw(c.ctx,{x:2000,y:2000,width:100,height:100});assert.equal(c.calls.length,2);
});
