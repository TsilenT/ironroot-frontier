import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,rmSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {getRuleset} from '../dist/rulesets.js';
import {createReserve,DESIGN} from '../qa/minor-reserve/scenario.mjs';
import {POLICIES,createPolicy,CADENCE_TICKS} from '../qa/minor-reserve/policies.mjs';
import {observeCombat,forceSummary} from '../qa/minor-reserve/observe.mjs';
import {ROOT,RUNNER,readPlan,newExternalPath,verifyApproval,runApproved} from '../qa/minor-reserve/run.mjs';
const rules=getRuleset(DESIGN.rulesetId);
function fakeGame({gold=100000}={}){
 let nextId=20;const calls=[],g={tick:0,map:{lanes:[260,450,640]},state:{time:0,gold:[gold,0],buildings:DESIGN.playerBuildings.map(([type,x,lane],i)=>({id:i+1,type,x,lane,side:0,hp:rules.buildings[type].hp,level:1}))},calls};
 g.build=(type,x,y,side)=>{calls.push({method:'build',type,x,y,side});const cost=rules.buildings[type].cost;if(g.state.gold[0]<cost)return {ok:false,reason:'Unaffordable fixture'};g.state.gold[0]-=cost;const building={id:nextId++,type,x,lane:g.map.lanes.indexOf(y),side:0,hp:rules.buildings[type].hp,level:1};g.state.buildings.push(building);return {ok:true,building};};
 g.upgrade=(id,side)=>{calls.push({method:'upgrade',id,side});const b=g.state.buildings.find(b=>b.id===id);if(!b)return {ok:false,reason:'No fixture target'};b.level++;return {ok:true,building:b};};return g;
}
const at=(g,tick)=>{g.tick=tick;g.state.time=tick*.05;};

test('exact two supported plans are mirrored; ranged screen precedes rear siege',()=>{
 const n=POLICIES['north-supported'].plan,s=POLICIES['south-bypass'].plan;assert.equal(n.length,13);assert.equal(s.length,13);assert.equal(CADENCE_TICKS,100);
 assert.deepEqual(n.slice(0,3).map(a=>[a.type,a.x,a.lane]),[['archery',550,0],['wardenLodge',830,0],['foundry',410,0]]);
 assert.deepEqual(s,n.map(a=>({...a,lane:2-a.lane})));assert.deepEqual(Object.keys(POLICIES),['north-supported','south-bypass','idle']);
});
test('declared static sites are legal, use at most three mines and do not overwrite inherited assets',()=>{
 for(const id of ['north-supported','south-bypass']){const occupied=DESIGN.playerBuildings.map(([type,x,lane])=>({type,x,lane}));for(const a of POLICIES[id].plan){assert.ok(a.x>=200&&a.x<=1320);assert.ok(occupied.every(b=>Math.hypot(b.x-a.x,(b.lane-a.lane)*190)>=108));occupied.push(a);}assert.equal(occupied.filter(b=>b.type==='mint').length,3);assert.ok(occupied.length<=24);assert.ok(POLICIES[id].plan.slice(0,3).reduce((n,a)=>n+rules.buildings[a.type].cost,0)<=900);}
});
test('rejected commands consume the five-second boundary and retry the same build',()=>{
 const g=fakeGame({gold:0}),p=createPolicy('north-supported');const first=p.step(g);assert.equal(first.ok,false);assert.equal(p.serialize().index,0);at(g,99);assert.equal(p.step(g),null);assert.equal(g.calls.length,1);at(g,100);const second=p.step(g);assert.deepEqual(second.action,first.action);assert.equal(g.calls.length,2);assert.equal(p.serialize().nextTick,200);
});
test('successful plan advances once per boundary; upgrade order is explicit and health independent',()=>{
 const g=fakeGame(),p=createPolicy('north-supported');for(let i=0;i<13;i++){at(g,i*100);assert.equal(p.step(g).ok,true);}assert.equal(p.serialize().index,13);at(g,1300);const row=p.step(g);assert.equal(row.action.method,'upgrade');assert.equal(row.action.type,'foundry');assert.equal(row.action.x,270);assert.equal(row.action.lane,0);assert.equal(g.calls.length,14);
});
test('no-op consumes cadence; missing a decision boundary fails instead of silently changing cadence',()=>{
 const g=fakeGame(),p=createPolicy('north-supported',{id:'north-supported',index:13,nextTick:0});g.state.buildings=[];assert.equal(p.step(g).action,null);assert.equal(p.serialize().nextTick,100);at(g,101);assert.throws(()=>p.step(g),/Missed/);
});
test('policy continuation uses exact serializable index and next tick',()=>{
 const g=fakeGame(),p=createPolicy('south-bypass');p.step(g);const q=createPolicy('south-bypass',p.serialize()),copy=fakeGame();copy.state=structuredClone(g.state);at(g,100);at(copy,100);assert.deepEqual(q.step(copy).action,p.step(g).action);assert.deepEqual(q.serialize(),p.serialize());for(const saved of [{id:'south-bypass',index:-1,nextTick:0},{id:'south-bypass',index:0,nextTick:3},{id:'idle',index:0,nextTick:0}])assert.throws(()=>createPolicy('south-bypass',saved));assert.throws(()=>createPolicy('unknown'));
});
test('idle does not inspect combat or issue commands',()=>{const p=createPolicy('idle');for(const tick of [0,1,100,12000])assert.equal(p.step({tick}),null);assert.deepEqual(p.serialize(),{id:'idle',index:0,nextTick:0});});
test('passive observer records real queued effective damage and ordinary birth source',()=>{
 const g=createReserve({reserveEnabled:false});g.state.buildings=[];g.state.units=[];g._ai=()=>{};const o=observeCombat(g);
 g._spawn({id:501,type:'archery',side:0,x:1452,lane:0,level:1});g._spawn({id:502,type:'barracks',side:1,x:1648,lane:0,level:1});g.state.units.forEach(u=>u.cooldown=0);g.update(.05);o.assertDrained();assert.equal(o.receipt.spawns.length,2);assert.equal(o.receipt.spawns[0].sourceBuildingId,501);assert.ok(o.receipt.fires.some(f=>f.effective>0));assert.equal(o.receipt.firstUnitCombatAt,.05);assert.ok(o.receipt.damage.every(d=>d.effective>0));
 g._damage(g.state.bases[1],1,0);assert.equal(o.receipt.firstCoreDamageAt[1],.05);assert.equal(o.receipt.damage.at(-1).fireIndex,null);const summary=forceSummary(g);assert.equal(summary.sides.length,2);assert.equal(summary.coreHP[1],5999);
});
test('observer preserves original structure/post identity and does not invent splash attackers',()=>{
 const g=createReserve({reserveEnabled:false}),o=observeCombat(g),post=g.state.buildings.find(b=>b.id===g.reserve.postId);g._damage(post,post.hp,0);assert.equal(o.receipt.firstOriginalPostLossAt,0);assert.equal(o.receipt.firstOriginalStructureLossAt[1],0);assert.equal(o.receipt.losses[0].original,true);assert.equal(o.receipt.losses[0].fireIndex,null);
});
test('fresh external artifact paths reject existing artifacts and directory escapes',()=>{
 const dir=mkdtempSync(path.join(tmpdir(),'minor-reserve-path-'));try{assert.equal(newExternalPath(path.join(dir,'new'),dir),path.join(dir,'new'));writeFileSync(path.join(dir,'existing'),'fixture');assert.throws(()=>newExternalPath(path.join(dir,'existing'),dir));assert.throws(()=>newExternalPath(path.join(dir,'..','escape'),dir));}finally{rmSync(dir,{recursive:true,force:true});}
});
test('approval is bound to exact status, reviewer, source/environment and invocation without executing a case',()=>{
 const dir=mkdtempSync(path.join(tmpdir(),'minor-reserve-approval-'));try{
  const approval=path.join(dir,'approval.json'),output=path.join(dir,'fresh-output');writeFileSync(approval,'{}');const binding={fixture:'zero-case-test'},packet={format:'minor-reserve-baseline-approved-v1',status:'approved',reviewer:'Fixture reviewer',authorization:'Fixture only; no game execution',freeze:{format:'minor-reserve-baseline-freeze-v1',status:'pending-independent-review-and-authorization',binding},invocation:[process.execPath,RUNNER,'--run-approved',approval,output]},options={bindingReader:()=>binding,pathValidator:p=>newExternalPath(p,dir)};
  assert.deepEqual(verifyApproval(packet,approval,output,options),binding);assert.equal(existsSync(output),false);
  for(const change of [p=>p.status='pending',p=>p.reviewer='',p=>p.authorization='',p=>p.freeze.binding={other:true},p=>p.invocation[4]=path.join(dir,'other')]){const bad=structuredClone(packet);change(bad);assert.throws(()=>verifyApproval(bad,approval,output,options));}assert.equal(existsSync(output),false);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
test('missing approval refuses before creating output or a natural encounter',async()=>{
 const dir=mkdtempSync(path.join(tmpdir(),'minor-reserve-refusal-'));try{await assert.rejects(runApproved(path.join(dir,'missing.json'),path.join(dir,'output')));assert.equal(existsSync(path.join(dir,'output')),false);}finally{rmSync(dir,{recursive:true,force:true});}
});
test('CLI without an exact approved mode refuses, without external inventory or games',()=>{const result=spawnSync(process.execPath,[RUNNER],{cwd:ROOT,encoding:'utf8'});assert.equal(result.status,1);assert.match(result.stderr,/Use --freeze/);});
test('prepared plan binds exactly three disabled cases, one seed and declared five-second cadence',()=>{const p=readPlan();assert.equal(p.status,'prepared-awaiting-independent-review-and-authorization');assert.deepEqual(p.nextStage.caseOrder,['north-supported','south-bypass','idle']);assert.equal(p.nextStage.seed,9104);assert.equal(p.nextStage.reserveEnabled,false);assert.equal(p.nextStage.maximumCases,3);assert.equal(p.nextStage.playerCadenceSeconds,5);});
