import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,rmSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {createReserve,MinorReserveGame} from '../qa/minor-reserve/scenario.mjs';
import {observeCombat} from '../qa/minor-reserve/observe.mjs';
import {createEventObserver,verifyPairPrefix} from '../qa/minor-reserve-comparison/events.mjs';
import {ROOT,RUNNER,CASES,readPlan,newExternalPath,verifyApproval,verifyDisabledReplay,runApproved} from '../qa/minor-reserve-comparison/run.mjs';
const policy={serialize:()=>({id:'synthetic-only',index:0,nextTick:0})};
function fixture(enabled=true,{target=false,cap=0}={}){
 const g=createReserve({reserveEnabled:enabled});g.aiTimer=30;const post=g.state.buildings.find(b=>b.id===g.reserve.postId);g.state.buildings=[post];g.state.income=[5,5];g.state.units=[];
 const combat=observeCombat(g),events=createEventObserver();
 if(target)g._spawn({id:500,type:'wardenLodge',side:0,x:2752,lane:0,level:1});
 for(let i=0;i<cap;i++)g._spawn({id:501,type:'barracks',side:1,x:3058,lane:2,level:1});
 return {g,post,combat,events};
}
function capture(f){const before=f.g.serialize(),roles=f.events.capture(f.g,policy,f.combat.receipt);assert.deepEqual(f.g.serialize(),before,'Passive event capture mutated state');return roles;}
function advance(f,ticks=1){let roles=[];for(let i=0;i<ticks;i++){f.g.update(.05);f.combat.assertDrained();roles.push(...capture(f));}return roles;}

test('four-case plan has honest focus labels, unchanged seed and paired existing Boolean only',()=>{const p=readPlan();assert.equal(p.seed,9104);assert.equal(p.maximumCases,4);assert.equal(p.cadenceTicks,100);assert.deepEqual(p.caseOrder,CASES);assert.deepEqual(CASES.map(c=>c.reserveEnabled),[false,true,false,true]);assert.match(p.labels['south-bypass'],/not a demonstrated/);assert.equal(p.status,'prepared-awaiting-independent-review-and-authorization');});
test('synthetic event observer is passive and records warning/release plus real ordinary interaction',()=>{
 const f=fixture(true,{target:true}),twin=MinorReserveGame.restore(f.g.serialize());f.g._damage(f.post,f.post.hp,0);const tp=twin.state.buildings.find(b=>b.id===twin.reserve.postId);twin._damage(tp,tp.hp,0);capture(f);const seen=new Set();
 for(let i=0;i<220;i++){twin.update(.05);for(const role of advance(f))seen.add(role);assert.deepEqual(f.g.serialize(),twin.serialize());}
 for(const role of ['warning-start','last-warning-tick','warning-due','first-release','queue-complete'])assert.ok(seen.has(role),role);
 const events=f.events.finish(f.g,f.combat.receipt);assert.equal(events.firstReleaseTick,121);assert.equal(events.releases.length,6);assert.ok(events.paths.length);assert.ok(events.contexts.some(c=>c.tags.includes('warning-due')));assert.ok(events.contexts.some(c=>c.tags.includes('first-reserve-interaction')));assert.ok(events.summary.outgoingEffective>0);assert.ok(events.summary.incomingEffective>0);assert.equal(events.prefix.at(-1).tick,120);
});
test('synthetic warning and release checkpoints restore exactly without extending a terminal tail',()=>{
 const f=fixture(true);f.g._damage(f.post,f.post.hp,0);const shadows=[];
 for(let i=1;i<=135;i++){
  advance(f);for(let j=shadows.length-1;j>=0;j--){const s=shadows[j];s.game.update(.05);assert.deepEqual(s.game.serialize(),f.g.serialize());if(--s.remaining===0)shadows.splice(j,1);}
  if([1,120,121].includes(i))shadows.push({game:MinorReserveGame.restore(JSON.stringify(f.g.serialize())),remaining:10});
 }
 assert.equal(shadows.length,0);
});
test('each successive synthetic partial count receives its own save/context boundary and exact continuation',()=>{
 const f=fixture(true,{cap:70});f.g._damage(f.post,f.post.hp,0);advance(f,121);assert.equal(f.g.reserve.releases.length,0);assert.ok(f.events.receipt.contexts.some(c=>c.tags.includes('warning-due')&&c.phase.phase==='arriving'));const shadows=[];
 function mirrorTick(){for(let j=shadows.length-1;j>=0;j--){const shadow=shadows[j];shadow.game.update(.05);assert.deepEqual(shadow.game.serialize(),f.g.serialize());if(--shadow.remaining===0)shadows.splice(j,1);}}
 for(let count=1;count<=5;count++){
  const victim=f.g.state.units.find(u=>!f.g.reserve.releases.some(r=>r.unitId===u.id));f.g._damage(victim,victim.hp,0);
  for(const shadow of shadows){const unit=shadow.game.state.units.find(u=>u.id===victim.id);shadow.game._damage(unit,unit.hp,0);}
  const roles=advance(f);mirrorTick();assert.equal(f.g.reserve.releases.length,count);assert.ok(roles.includes('partial-release-'+count));assert.ok(f.events.receipt.contexts.some(c=>c.tick===f.g.tick&&c.tags.includes('partial-release-'+count)&&c.reserve.releases.length===count));
  const saved=JSON.stringify(f.g.serialize()),restored=MinorReserveGame.restore(saved);assert.deepEqual(restored.serialize(),f.g.serialize());shadows.push({game:restored,remaining:10});
 }
 for(let i=0;i<10;i++){advance(f);mirrorTick();}assert.equal(shadows.length,0);assert.equal(f.events.finish(f.g,f.combat.receipt).summary.remaining,1);
});
test('paired synthetic engine/policy prefix matches until actual release and rejects an altered digest',()=>{
 const off=fixture(false),on=fixture(true);off.g._damage(off.post,off.post.hp,0);on.g._damage(on.post,on.post.hp,0);capture(off);capture(on);advance(off,125);advance(on,125);
 const d={events:off.events.finish(off.g,off.combat.receipt)},e={events:on.events.finish(on.g,on.combat.receipt)};assert.equal(verifyPairPrefix(d,e).throughTick,120);const empty=structuredClone(e);empty.events.prefix=[];assert.throws(()=>verifyPairPrefix(d,empty),/prefix/);e.events.prefix[3].digest='changed';assert.throws(()=>verifyPairPrefix(d,e),/before first authored release/);
});
test('pre-release semantic or affordability receipt differences fail; post-release differences remain reported',()=>{
 const prefix=n=>Array.from({length:n},(_,tick)=>({tick,digest:'same-'+tick})),command=tick=>({tick,action:{method:'build',type:'archery',x:550,lane:0},ok:true,reason:null,beforeGold:900,afterGold:725});
 const disabled={events:{prefix:prefix(5),firstReleaseTick:null},commands:[command(0),command(2)]},enabled={events:{prefix:prefix(2),firstReleaseTick:2},commands:[command(0),command(2)]};
 assert.equal(verifyPairPrefix(disabled,enabled).firstCommandOrAffordabilityDivergence,null);
 for(const mutate of [r=>r.commands[0].afterGold--,r=>r.commands[0].action.lane=2,r=>r.commands[0].ok=false,r=>r.commands.shift()]){const bad=structuredClone(enabled);mutate(bad);assert.throws(()=>verifyPairPrefix(disabled,bad),/receipt diverged before first authored release/);}
 const later=structuredClone(enabled);later.commands[1].afterGold--;assert.equal(verifyPairPrefix(disabled,later).firstCommandOrAffordabilityDivergence.enabled.tick,2);
 const never=structuredClone(disabled);never.commands[0].beforeGold--;assert.throws(()=>verifyPairPrefix(disabled,never),/receipt diverged before first authored release/);
});
test('malformed authored birth receipt is rejected without changing simulation',()=>{const f=fixture(true);f.g._damage(f.post,f.post.hp,0);advance(f,121);const id=f.g.reserve.releases[0].unitId;f.combat.receipt.spawns.find(b=>b.unit.id===id).sourceBuildingId=501;assert.throws(()=>f.events.finish(f.g,f.combat.receipt),/provenance/);});
test('disabled replay checks every old mechanic receipt and ignores only new probe labels',()=>{
 const keys=['initial','commands','attempts','trace','combat','ledger','current','policyState','outcome','final','duration','finalHP'];const known=Object.fromEntries(keys.map(k=>[k,{fixture:k}]));known.policy='north-supported';known.restoreChecks=[{role:'30-seconds',tick:600,time:30,checkedTicks:10,requestedTicks:10}];const got=structuredClone(known);got.restoreChecks[0].roles=['30-seconds'];assert.equal(verifyDisabledReplay(got,known).exactReplay,true);got.attempts={changed:true};assert.throws(()=>verifyDisabledReplay(got,known),/receipts changed/);
});
test('comparison artifact path guard rejects overwrites and escapes',()=>{const dir=mkdtempSync(path.join(tmpdir(),'reserve-compare-path-'));try{assert.equal(newExternalPath(path.join(dir,'fresh'),dir),path.join(dir,'fresh'));writeFileSync(path.join(dir,'existing'),'x');assert.throws(()=>newExternalPath(path.join(dir,'existing'),dir));assert.throws(()=>newExternalPath(path.join(dir,'..','escape'),dir));}finally{rmSync(dir,{recursive:true,force:true});}});
test('comparison approval requires exact new identity and invocation; helper test runs zero cases',()=>{
 const dir=mkdtempSync(path.join(tmpdir(),'reserve-compare-approval-'));try{const ap=path.join(dir,'approval.json'),out=path.join(dir,'fresh'),binding={fixture:true};writeFileSync(ap,'{}');const packet={format:'minor-reserve-comparison-approved-v1',status:'approved',reviewer:'Fixture only',authorization:'No game execution',freeze:{format:'minor-reserve-comparison-freeze-v1',status:'pending-independent-review-and-authorization',binding},invocation:[process.execPath,RUNNER,'--run-approved',ap,out]},options={bindingReader:()=>binding,pathValidator:p=>newExternalPath(p,dir)};assert.deepEqual(verifyApproval(packet,ap,out,options),binding);assert.equal(existsSync(out),false);for(const mutate of [p=>p.format='minor-reserve-baseline-approved-v1',p=>p.status='pending',p=>p.reviewer='',p=>p.freeze.binding={different:true},p=>p.invocation[4]='other']){const bad=structuredClone(packet);mutate(bad);assert.throws(()=>verifyApproval(bad,ap,out,options));}}finally{rmSync(dir,{recursive:true,force:true});}
});
test('missing comparison approval and unsupported CLI refuse before any natural case/output',async()=>{const dir=mkdtempSync(path.join(tmpdir(),'reserve-compare-refuse-'));try{await assert.rejects(runApproved(path.join(dir,'missing'),path.join(dir,'out')));assert.equal(existsSync(path.join(dir,'out')),false);const result=spawnSync(process.execPath,[RUNNER],{cwd:ROOT,encoding:'utf8'});assert.equal(result.status,1);assert.match(result.stderr,/Use --freeze/);}finally{rmSync(dir,{recursive:true,force:true});}});
