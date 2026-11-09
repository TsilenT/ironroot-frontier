/** Mechanical/passive-observer and zero-case refusal fixtures only. No v2 seed is run. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,readFileSync,existsSync,rmSync} from 'node:fs';
import path from 'node:path';
import {Game} from '../dist/engine.js';
import {createPrototype} from '../qa/shared-watch/prototype.mjs';
import {instrumentCombat,runFrozenCase,runValidationCase} from '../qa/shared-watch/experiment.mjs';
import {PLAN,ROOT,validationFreeze,verifyValidationApproval,verifyValidationCase} from '../qa/shared-watch-validation/contract.mjs';
import {runApprovedMatrix} from '../qa/shared-watch-validation/run.mjs';
import {advancingSupport,validateObservedFires,decideValidation,sharedOpening,cleanPrefix} from '../qa/shared-watch-validation/evaluate.mjs';
const packet=()=>({format:'shared-watch-v2-approved-validation-v1',status:'independent-review-approved-and-coordinator-authorized',independentReviewer:'SYNTHETIC-ONLY-NOT-AUTHORIZATION',coordinatorAuthorization:'SYNTHETIC-ONLY: metadata/zero-case refusal checks, never execute a v2 seed',freeze:validationFreeze()});
function fixture(capture){const g=createPrototype(),initial=g.serialize(),observer=instrumentCombat(g,initial,{capturePositions:capture});g.build('watchtower',1250,450);for(const lane of [0,2])g._spawn(g.state.buildings.find(b=>b.side===1&&b.type==='barracks'&&b.lane===lane));g.tick=24;g.state.time=1.2;g.state.units[0].x=1320;g.state.units[0].y=260;g.state.units[1].x=1320;g.state.units[1].y=640;return {g,observer};}

test('optional per-instance observer changes no state, RNG, tick or legal-command results',()=>{
 const method=Game.prototype._fire,a=fixture(false),b=fixture(true);assert.deepEqual(a.g.serialize(),b.g.serialize());assert.equal(Game.prototype._fire,method);
 for(const f of [a,b]){const g=f.g,watch=g.state.buildings.find(x=>x.type==='watchtower'),target=g.state.units[0];g.damageQueue=[];g._fire(watch,target,100,'tower');g._fire(watch,target,100,'tower');const q=g.damageQueue;g.damageQueue=null;for(const hit of q)g._damage(...hit);}
 assert.deepEqual(a.g.serialize(),b.g.serialize());assert.equal(b.g.tick,24);assert.equal(b.g.state.time,1.2);assert.deepEqual(b.observer.fires.map(f=>f.effective),[100,80]);assert.deepEqual(b.observer.damageEvents.map(d=>d.fireIndex),[0,1]);assert.equal('attackerPosition' in a.observer.fires[0],false);assert.deepEqual(b.observer.fires[0].attackerPosition,{x:1250,y:450});assert.deepEqual(b.observer.fires[0].targetPosition,{x:1320,y:260});
});

test('selection-time XY and living force snapshots do not follow later movement or death',()=>{
 const {g,observer}=fixture(true),watch=g.state.buildings.find(b=>b.type==='watchtower'),target=g.state.units[0];g._fire(watch,target,1,'tower');const f=observer.fires[0],snap=structuredClone(f);target.x=1800;target.y=450;target.hp=0;assert.deepEqual(f,snap);assert.equal(f.context[1].unitPositions.length,2);assert.equal(f.context[1].unitPositions[0].hp,180);assert.equal(f.context[1].unitPositions[0].x,1320);
});

test('save/restore probes are unobserved independent instances, never mixed into main-case arrays',()=>{
 const {g,observer}=fixture(true),before=g.serialize(),lengths=[observer.fires.length,observer.spawns.length,observer.damageEvents.length],probe=Game.restore(before);probe._fire(probe.state.bases[0],probe.state.units[0],1,'tower');probe._spawn(probe.state.buildings.find(b=>b.side===0&&b.type==='barracks'));assert.deepEqual(g.serialize(),before);assert.deepEqual([observer.fires.length,observer.spawns.length,observer.damageEvents.length],lengths);
});

test('old epoch1 and separate v2 entrypoints fail closed without correct approval before game construction',()=>{
 assert.throws(()=>runFrozenCase({seed:PLAN.seeds[0],policy:'central-watch'}));assert.throws(()=>runValidationCase({seed:PLAN.seeds[0],policy:'central-watch'}));const p=packet();assert.ok(verifyValidationApproval(p));assert.throws(()=>verifyValidationCase({packet:p,seed:8405,policy:'central-watch'}),/outside exact v2/);assert.throws(()=>verifyValidationCase({packet:p,seed:PLAN.seeds[0],policy:'no-new-support-siege'}),/outside exact v2/);p.freeze.closure.execution.nodeVersion='wrong';assert.throws(()=>verifyValidationApproval(p),/mismatch/);
});

test('new adapter refuses absent approval, duplicate/inside output and stops with zero cases before any game',async()=>{
 const temp=mkdtempSync('/tmp/shared-watch-v2-zero-case-');try{const file=path.join(temp,'synthetic-only.json'),out=path.join(temp,'results'),p=packet();p.invocation=[process.execPath,path.join(ROOT,'qa/shared-watch-validation/run.mjs'),'--run-approved',file,out];writeFileSync(file,JSON.stringify(p));await assert.rejects(runApprovedMatrix({},file,out));assert.equal(existsSync(out),false);
  const inside=path.join(ROOT,'qa/shared-watch-validation/must-not-create');p.invocation[4]=inside;await assert.rejects(runApprovedMatrix(p,file,inside),/outside repository/);assert.equal(existsSync(inside),false);p.invocation[4]=out;
  writeFileSync(out+'.stop','stop before any case');const listeners=process.listenerCount('SIGTERM');await assert.rejects(runApprovedMatrix(p,file,out),/External stop between cases/);const result=JSON.parse(readFileSync(path.join(out,'incomplete.json')));assert.equal(result.completedCases,0);assert.equal(process.listenerCount('SIGTERM'),listeners);await assert.rejects(runApprovedMatrix(p,file,out),/new external case directory/);
 }finally{rmSync(temp,{recursive:true,force:true});}
});

function observedSupport(){const initialProducer={id:1,type:'barracks',side:0,x:690,lane:2,invested:140},purchase={id:2,type:'archery',method:'build',side:0,x:550,lane:0,tick:0,cost:175},spawn={id:3,type:'archer',side:0,buildingId:2,birthLane:0,tick:24,time:1.2},fire={index:0,tick:100,time:5,attackerId:3,attackerType:'archer',side:0,targetId:8,targetType:'warrior',targetSide:1,effective:5,requested:100,attackerPosition:{x:1500,y:260},targetPosition:{x:1600,y:260}};return {initial:{state:{buildings:[initialProducer,{id:4,type:'barracks',side:1,x:1950,lane:0,invested:140}]}},ledger:{transactions:[purchase]},final:{tick:200},spawns:[spawn,{id:8,type:'warrior',side:1,buildingId:4,birthLane:0,tick:24,time:1.2}],losses:[],fires:[fire],damageEvents:[{fireIndex:0,tick:100,attackerId:3,targetId:8,side:0,targetSide:1,targetType:'warrior',effective:5}]};}

test('advancement uses real opening lineage and event-time forward circle positions, counting only effective damage',()=>{
 let r=observedSupport();assert.equal(advancingSupport(r).length,1);r.fires[0].attackerPosition.x=500;assert.equal(advancingSupport(r).length,0);r=observedSupport();r.fires[0].targetPosition.x=1000;assert.equal(advancingSupport(r).length,0);r=observedSupport();r.ledger.transactions[0].tick=100;assert.throws(()=>advancingSupport(r),/chronology/);r=observedSupport();delete r.fires[0].attackerPosition;assert.throws(()=>validateObservedFires(r),/positions/);r=observedSupport();r.damageEvents[0].effective=100;assert.throws(()=>validateObservedFires(r),/effective sum/);
});


function matrix(){return PLAN.seeds.flatMap(seed=>PLAN.caseOrder.map(policy=>{
 const initial={state:{buildings:[{id:10,type:'barracks',side:0,x:690,lane:2,invested:140},{id:11,type:'barracks',side:0,x:830,lane:1,invested:140},{id:20,type:'barracks',side:1,x:2090,lane:1,invested:140},{id:21,type:'barracks',side:1,x:1950,lane:2,invested:140}]}},cmd=(tick,type,x,lane)=>({tick,time:tick*.05,action:{method:'build',type,x,lane},ok:true}),pay=(c,id,cost)=>({tick:c.tick,time:c.time,side:0,method:'build',type:c.action.type,x:c.action.x,lane:c.action.lane,id,cost,before:{building:null}}),commands=[cmd(0,'watchtower',1250,1),cmd(1000,'sanctum',830,2),cmd(1700,'foundry',1250,0)],transactions=commands.map((c,i)=>pay(c,100+i,[220,230,270][i]));
 const r={seed,policy,initial,final:{tick:2400},duration:120,outcome:{completed:policy==='central-watch'||policy==='distributed-mobile'},commands,ledger:{transactions,maxError:[0,0]},unexpectedGoldWrites:[],restoreChecks:[{at:30,checkedTicks:10},{at:90,checkedTicks:10}],firstEnemyProducerLossAt:null,firstCoreDamage:[null,null],losses:[],spawns:[],fires:[],damageEvents:[]};
 if(policy==='distributed-mobile'){Object.assign(r,observedSupport());r.seed=seed;r.policy=policy;r.duration=120;r.final.tick=2400;r.outcome={completed:true};r.ledger.maxError=[0,0];}
 else if(policy==='central-watch'){
  r.spawns=[{id:500,type:'warrior',side:0,buildingId:10,birthLane:2,tick:1464,time:73.2},{id:502,type:'warrior',side:0,buildingId:10,birthLane:2,tick:24,time:1.2},{id:800,type:'warrior',side:1,buildingId:20,birthLane:1,tick:24,time:1.2},{id:801,type:'warrior',side:1,buildingId:21,birthLane:2,tick:24,time:1.2}];
  const context=[0,1].map(side=>({side,living:side?2:1,originalProducers:[1,2].map(lane=>({lane,alive:true})),liveProducers:[1,2].map(lane=>({id:10000+side*10+lane,type:'barracks',lane,hp:700})),unitPositions:(side?[{id:800,type:'warrior',side:1,lane:1},{id:801,type:'warrior',side:1,lane:2}]:[{id:502,type:'warrior',side:0,lane:2}]).map(u=>({...u,level:1,hp:180,x:1320,y:450}))}));
  r.fires=[{index:0,tick:600,time:30,attackerId:100,attackerType:'watchtower',side:0,targetId:800,targetType:'warrior',targetSide:1,targetLane:1,targetGround:true,effective:5,attackerPosition:{x:1250,y:450},targetPosition:{x:1320,y:450},context,candidates:[{id:800,ground:true,birthLane:1},{id:801,ground:true,birthLane:2}]},{index:1,tick:601,time:30.05,attackerId:801,attackerType:'warrior',side:1,targetId:502,targetType:'warrior',targetSide:0,effective:5,attackerPosition:{x:1320,y:640},targetPosition:{x:1320,y:640}},{index:2,tick:617,time:30.85,attackerId:100,attackerType:'watchtower',side:0,targetId:801,targetType:'warrior',targetSide:1,targetLane:2,targetGround:true,effective:5,attackerPosition:{x:1250,y:450},targetPosition:{x:1320,y:640},context,candidates:[]}];r.damageEvents=r.fires.map(f=>({fireIndex:f.index,tick:f.tick,time:f.time,attackerId:f.attackerId,targetId:f.targetId,targetType:f.targetType,targetSide:f.targetSide,side:f.side,effective:f.effective}));
 }else if(policy.endsWith('-control')){
  if(policy==='north-watch-control'){r.commands[0].action.lane=0;r.ledger.transactions[0].lane=0;r.commands[2].ok=false;r.ledger.transactions.pop();r.losses=[{id:10,type:'barracks',side:0,x:690,lane:2,tick:1329,time:66.45}];}
  if(policy==='omit-watch-control'){r.commands[0].omitted=true;r.ledger.transactions.shift();}
  if(policy==='central-archery-control'){r.commands[0].action.type='archery';r.ledger.transactions[0].type='archery';r.ledger.transactions[0].cost=175;}
 }else{r.commands=[];r.ledger.transactions=[];}
 r.ledger.transactions.push({side:1,method:'build',id:700,type:'barracks',x:1800,lane:0,tick:500,cost:140});return r;
}));}

test('all-five denominator and joint gates use complete pre-censor evidence, never post-censor fire or partial output',()=>{
 let runs=matrix(),d=decideValidation(runs,PLAN);assert.equal(d.failures.length,0);assert.equal(d.jointWitnesses.length,5);assert.equal(d.advancingWitnesses.length,5);
 for(const r of runs.filter(r=>r.policy==='north-watch-control').slice(0,3)){r.commands[1].ok=false;r.ledger.transactions=r.ledger.transactions.filter(t=>!(t.side===0&&t.tick===1000));}d=decideValidation(runs,PLAN);assert.equal(d.jointWitnesses.length,2);assert.ok(d.failures.some(f=>f.includes('same-case')));
 runs=matrix();for(const r of runs.filter(r=>r.policy==='central-watch').slice(0,3))r.firstCoreDamage[1]=30;d=decideValidation(runs,PLAN);assert.equal(d.jointWitnesses.length,2);
 runs=matrix();for(const r of runs.filter(r=>r.policy==='distributed-mobile').slice(0,3))r.fires[0].attackerPosition.x=500;d=decideValidation(runs,PLAN);assert.equal(d.advancingWitnesses.length,2);assert.ok(d.failures.some(f=>f.includes('forward')));
 assert.throws(()=>decideValidation(runs.slice(1),PLAN),/Incomplete/);
});

test('cheaper warning compares producer retention, not only wins or a missing post-loss spawn',()=>{const runs=matrix();for(const r of runs.filter(r=>r.policy==='central-archery-control'))r.outcome.completed=true;let d=decideValidation(runs,PLAN);assert.equal(d.failures.length,0);assert.match(d.warnings[0],/CHEAPER/);for(const r of runs.filter(r=>r.policy==='central-archery-control'))r.losses=[{id:10,type:'barracks',side:0,x:690,lane:2,tick:1799,time:89.95}];d=decideValidation(runs,PLAN);assert.equal(d.warnings.length,0);});


test('contested review uses live production, never an added original-player-survival gate',()=>{const runs=matrix(),donor=runs.find(r=>r.policy==='central-watch'),control=runs.find(r=>r.seed===donor.seed&&r.policy==='north-watch-control');for(const f of donor.fires.filter(f=>f.context))for(const p of f.context[0].originalProducers)p.alive=false;assert.equal(sharedOpening(donor,cleanPrefix(donor,control)).qualifies,true);for(const f of donor.fires.filter(f=>f.context))f.context[1].liveProducers=f.context[1].liveProducers.filter(p=>p.lane!==2);assert.equal(sharedOpening(donor,cleanPrefix(donor,control)).qualifies,false);});


test('cheaper retention warning covers middle AND south, while primary placement witness stays south-only',()=>{const runs=matrix();for(const r of runs.filter(r=>r.policy==='central-archery-control')){r.outcome.completed=true;r.losses=[{id:11,type:'barracks',side:0,x:830,lane:1,tick:1799,time:89.95}];}const d=decideValidation(runs,PLAN);assert.equal(d.failures.length,0);assert.equal(d.jointWitnesses.length,5);assert.equal(d.cheaperMatched.length,0);assert.equal(d.warnings.length,0);});
