/** All candidate steps forbidden; clocks/losses below are explicitly synthetic. */
import test from 'node:test';import assert from 'node:assert/strict';
import {Game,getRuleset,supportsAutonomousAir} from '../dist/engine.js';
import {decodeBattle} from '../dist/battle-codec.js';import {getCampaignMission} from '../dist/campaign.js';
import * as old from '../qa/give-ground/scenario.mjs';import {createPolicy as oldPolicy,POLICIES as OLD} from '../qa/give-ground/policies.mjs';
import * as next from '../qa/give-ground-epoch2/scenario.mjs';
import {createPolicy,POLICIES,PREFIX,validatePolicyState} from '../qa/give-ground-epoch2/policies.mjs';
Game.prototype._step=function(){throw Error('New candidate tick forbidden');};
const clock=(g,t)=>{g.tick=t;g.state.time=t*.05;g.state.overtime=t>=6000;};
test('factory is exact original registered opening, purse, seed and full feature identity',()=>{
 const g=next.createPrototype();assert.equal(next.createPrototype,old.createPrototype);assert.deepEqual(g.serialize(),old.createPrototype().serialize());
 assert.equal(g.ruleset,getRuleset(old.DESIGN.parentRulesetId));assert.equal(supportsAutonomousAir(g.ruleset),true);
 assert.deepEqual(g.state.gold,[900,300]);assert.deepEqual(g.state.bases.map(b=>b.hp),[6000,6000]);assert.equal(g.seed,9467);assert.equal(g.ai,true);assert.equal(g.map.id,'long-march');assert.equal(Object.keys(g.buildings).length,8);
 assert.throws(()=>g.update(.05),/candidate tick forbidden/);assert.throws(()=>next.createPrototype({seed:1}));
 assert.throws(()=>getCampaignMission('give-ground'));assert.throws(()=>decodeBattle(next.savePrototype(next.createPrototype())));
});
test('all paid policies share legal315-gold one-time middle prefix then exact original priorities',()=>{
 const games=[];
 for(const id of ['rescue','front','rear']){
  assert.deepEqual(POLICIES[id].plan,OLD[id].plan);assert.equal(POLICIES[id].replacementX,OLD[id].replacementX);
  const g=next.createPrototype(),p=createPolicy(id),a=p.step(g);assert.deepEqual({...a},{tick:0,time:0,method:'build',type:'barracks',x:1110,lane:1,ok:true,reason:null,cost:140});assert.equal(p.step(g),null);
  clock(g,99);assert.equal(p.step(g),null);clock(g,100);const b=p.step(g);assert.equal(b.type,'archery');assert.equal(b.x,970);assert.equal(b.lane,1);assert.equal(b.cost,175);assert.equal(b.ok,true);assert.equal(g.state.gold[0],585);assert.equal(p.step(g),null);games.push(g.serialize());
  const r=next.restorePrototype(next.savePrototype(g)),continued=createPolicy(id,{state:p.snapshot()});
  clock(g,200);clock(r,200);const reference=oldPolicy(id,{state:{nextTick:200}}),control=next.restorePrototype(next.savePrototype(g));
  const expected=reference.step(control);assert.deepEqual(p.step(g),expected);assert.deepEqual(continued.step(r),expected);
  assert.deepEqual(g.serialize(),control.serialize());assert.deepEqual(r.serialize(),g.serialize());
  // Destroy the middle screen synthetically: the prefix never rebuilds it.
  g.state.buildings=g.state.buildings.filter(b=>!(b.side===0&&b.lane===1&&['barracks','archery'].includes(b.type)));
  clock(g,300);const command=p.step(g);assert.ok(!command||command.lane!==1);
 }
 assert.deepEqual(games[0],games[1]);assert.deepEqual(games[1],games[2]);assert.deepEqual(PREFIX.map(x=>x.tick),[0,100]);
});

test('prefix failures are attempted once, never retried as a rebuilding loop',()=>{
 const g=next.createPrototype();assert.equal(g.build('barracks',1110,g.map.lanes[1],0).ok,true);
 const p=createPolicy('front'),first=p.step(g);assert.equal(first.ok,false);assert.equal(first.cost,0);
 g.state.buildings=g.state.buildings.filter(b=>!(b.side===0&&b.lane===1&&b.x===1110));assert.equal(p.step(g),null);
 clock(g,100);assert.equal(p.step(g).type,'archery');assert.equal(p.snapshot().prefixIndex,2);
});
test('front/rear retain exact replacement sites after synthetic loss, only after the common prefix',()=>{
 for(const [id,x]of [['front',1250],['rear',410]]){
  const g=next.createPrototype(),p=createPolicy(id);g.state.buildings=g.state.buildings.filter(b=>b.id!==3);
  assert.equal(p.step(g).lane,1);clock(g,100);assert.equal(p.step(g).lane,1);clock(g,200);const c=p.step(g);
  assert.equal(c.type,'foundry');assert.equal(c.x,x);assert.equal(c.lane,0);assert.equal(c.cost,270);assert.equal(c.ok,true);
 }
});
test('epoch2 envelope/policy reject cross-epoch and malformed identities; engine RNG is not reset',()=>{
 const g=next.createPrototype(),oldPacket=old.savePrototype(g),packet=next.savePrototype(g);
 assert.throws(()=>old.restorePrototype(packet));assert.throws(()=>next.restorePrototype(oldPacket));
 assert.deepEqual(next.savePrototype(next.restorePrototype(packet)),packet);
 for(const change of [p=>p.extra=1,p=>p.epoch=1,p=>p.metadata.initialSeed=1,p=>p.engine.rulesetId='qa-give-ground',p=>p.engine.mapId='classic']){const bad=structuredClone(packet);change(bad);assert.throws(()=>next.restorePrototype(bad));}
 for(const state of [{nextTick:200},{epoch:1,policyId:'rescue',prefixIndex:0,baseState:{nextTick:200}},{epoch:2,policyId:'idle',prefixIndex:0,baseState:{nextTick:200}},{epoch:2,policyId:'front',prefixIndex:3,baseState:{nextTick:200}}])assert.throws(()=>validatePolicyState(state));
 assert.throws(()=>createPolicy('rear',{state:createPolicy('front').snapshot()}));assert.throws(()=>oldPolicy('rescue',{state:createPolicy('rescue').snapshot()}));
 for(let i=0;i<5;i++)g.random();const r=next.restorePrototype(next.savePrototype(g));assert.equal(next.savePrototype(r).metadata.initialSeed,9467);assert.equal(r.seed,g.seed);for(let i=0;i<5;i++)assert.equal(r.random(),g.random());
});
for(const time of [599.95,600,600.05])for(const end of ['alive','enemy','own','draw'])test(`synthetic precedence ${time}/${end}`,()=>{
 const g=next.createPrototype();clock(g,Math.round(time/.05));if(end==='enemy')g.state.bases[1].hp=0;if(end==='own')g.state.bases[0].hp=0;if(end==='draw')g.state.winner='draw';
 const o=next.evaluatePrototype(g);assert.equal(o.completed,end==='enemy'&&time<=600);assert.equal(o.failed,['own','draw'].includes(end)||time>=600&&!(end==='enemy'&&time===600));if(o.completed||o.failed)assert.equal(createPolicy('rescue').step(g),null);
});
