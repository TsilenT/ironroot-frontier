/** Structural/preflight tests only. Never advances a candidate battle. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import path from 'node:path';
import {Game,buildSites} from '../dist/engine.js';
import {getRuleset,LONG_SCREEN_RULESET_ID} from '../dist/rulesets.js';
import {getCampaignMission} from '../dist/campaign.js';
import {DESIGN,POLICIES,createPrototype,createPolicy,evaluatePrototype} from '../qa/shared-watch/prototype.mjs';
import {PLAN,ROOT,freeze,verifyApproval,summarize,instrumentCombat,placementConsequence,decide,validateOutputDirectory,stopFileRequested,verifyInvocation} from '../qa/shared-watch/experiment.mjs';

test('new QA factory is deterministic, full-roster, legal, healthy and unadmitted without advancing a tick',()=>{
 const g=createPrototype(),save=g.serialize();assert.equal(g.tick,0);assert.equal(g.state.time,0);assert.deepEqual(g.state.units,[]);
 assert.deepEqual(save,createPrototype().serialize());assert.deepEqual(Game.restore(save).serialize(),save);
 assert.equal(g.map.id,'classic');assert.equal(g.difficulty,'normal');assert.equal(g.ai,true);assert.equal(g.aiTimer,0);
 assert.deepEqual(g.state.gold,[1100,100]);assert.deepEqual(g.state.income,[7.5,7.5]);assert.deepEqual(g.state.bases.map(b=>b.hp),[6000,6000]);
 assert.equal(Object.keys(g.buildings).length,8);assert.equal(g.ruleset.ai.policy,'legacy');assert.equal(g.ruleset.endgame.forcedDecay,false);
 const screen=getRuleset(LONG_SCREEN_RULESET_ID),{id,name,...actual}=g.ruleset,{id:screenId,name:screenName,...expected}=screen;assert.deepEqual(actual,expected);
 for(const b of g.state.buildings){assert.equal(b.level,1);assert.equal(b.hp,b.maxHp);assert.equal(b.invested,g.buildings[b.type].cost);assert.ok(buildSites(g.map,b.side).some(site=>site.x===b.x&&site.y===b.y));}
 assert.deepEqual(g.state.stats.built,[5,7]);assert.throws(()=>getCampaignMission('the-shared-watch'));
 for(const seed of [-1,4294967296,NaN,1.5])assert.throws(()=>createPrototype({seed}));
});

test('paid central and distributed first choices are legal, affordable and actually executed at tick zero',()=>{
 for(const [id,type,x,lane,cost] of [['central-watch','watchtower',1250,1,220],['distributed-mobile','archery',550,0,175],['watch-only','watchtower',1250,1,220],['no-new-support-siege','foundry',1110,0,270]]){
  const g=createPrototype(),p=createPolicy(id),row=p.step(g);assert.equal(row.ok,true);assert.equal(row.tick,0);assert.deepEqual(row.action,{method:'build',type,x,lane});assert.equal(g.state.gold[0],1100-cost);assert.equal(g.tick,0);assert.equal(p.step(g),null);
 }
 assert.equal(createPolicy('idle').step(createPrototype()),null);
});

test('all declared plan sites fit without collisions; all formation and planned commands pay normal prices',()=>{
 for(const [id,def] of Object.entries(POLICIES).filter(([,p])=>p.plan)){
  const g=createPrototype();g.state.gold[0]=10000; // Authoring-only fixture: no simulation/evidence.
  for(const a of def.plan){const before=g.state.gold[0],r=g.build(a.type,a.x,g.map.lanes[a.lane]);assert.ok(r.ok,id+': '+r.reason);assert.equal(before-g.state.gold[0],g.buildings[a.type].cost);}
  assert.equal(g.tick,0);assert.ok(g.state.buildings.filter(b=>b.side===0).length<=g.map.buildLimit);
 }
});

test('matched-cost outer placement, omission and cheaper archer controls change only the declared first action',()=>{
 const donor=[{tick:0,action:{method:'build',type:'watchtower',x:1250,lane:1},ok:true}];
 for(const [id,type,lane,spent] of [['north-watch-control','watchtower',0,220],['omit-watch-control',null,null,0],['central-archery-control','archery',1,175]]){
  const g=createPrototype(),before=g.serialize(),p=createPolicy(id,{donorCommands:donor}),r=p.step(g);assert.ok(r.ok);assert.equal(g.state.gold[0],1100-spent);assert.equal(g.state.buildings.length,before.state.buildings.length+(type?1:0));
  if(type){const b=g.state.buildings.at(-1);assert.equal(b.type,type);assert.equal(b.x,1250);assert.equal(b.lane,lane);}else assert.deepEqual(g.serialize(),before);
  assert.equal(p.step(g),null);assert.equal(g.tick,0);
 }
});

test('replay retains failed legal-command attempts instead of adapting; watch-only never upgrades',()=>{
 const g=createPrototype(),donor=[{tick:0,action:{method:'build',type:'archery',x:690,lane:0},ok:true}],p=createPolicy('north-watch-control',{donorCommands:donor});
 const r=p.step(g);assert.equal(r.ok,false);assert.match(r.reason,/Too close/);assert.equal(p.applied.length,1);assert.equal(p.step(g),null);
 const only=createPolicy('watch-only'),h=createPrototype();assert.ok(only.step(h).ok);h.tick=100;h.state.time=5;assert.equal(only.step(h),null);assert.equal(only.applied.length,1);
});

test('geometry supports but does not prove adjacent-road contribution and the tower has one normal stream',()=>{
 const g=createPrototype(),d=g.buildings.watchtower,half=Math.sqrt(d.range**2-190**2);assert.equal(d.range,240);assert.equal(d.cost,220);assert.equal(d.damage,29);assert.ok(half>146&&half<147);
 assert.ok(Math.hypot(1320-1250,190)<240);assert.ok(Math.hypot(1320-1110,190)>240);assert.ok(g.canBuild('watchtower',1250,450).ok);
 assert.equal(g.state.buildings.some(b=>b.type==='watchtower'),false);
});

test('QA terminal contract accepts damaged wins and loss/draw precedence without simulations',()=>{
 for(const [kind,expected] of [['win','enemy-core'],['loss','player-core'],['draw','player-core'],['deadline','deadline']]){
  const g=createPrototype();g.state.bases[0].hp=1;if(kind==='win')g.state.bases[1].hp=0;if(kind==='loss')g.state.bases[0].hp=0;if(kind==='draw')g.state.winner='draw';if(kind==='deadline')g.state.time=600;assert.equal(evaluatePrototype(g).reason,expected);
 }
 const g=createPrototype();g.state.bases[0].hp=0;g.state.bases[1].hp=0;assert.equal(evaluatePrototype(g).completed,false);
});

test('all known cases and causal controls are preregistered; only a reviewed matching freeze permits runs',()=>{
 assert.equal(PLAN.cases,24);assert.equal(PLAN.knownSeeds.length*PLAN.caseOrder.length,24);assert.deepEqual(PLAN.heldOutSeeds,[]);assert.deepEqual([...PLAN.caseOrder].sort(),Object.keys(POLICIES).sort());
 const f=freeze();assert.equal(f.closure.design,DESIGN);assert.throws(()=>verifyApproval({}));
 const packet={format:'shared-watch-approved-known-cases-v1',status:'independent-review-approved-and-coordinator-authorized',independentReviewer:'STRUCTURAL-TEST-ONLY',coordinatorAuthorization:'STRUCTURAL-TEST-ONLY: this fixture does not run cases',freeze:f};assert.ok(verifyApproval(packet));
 packet.freeze={...f,closureSha256:'bad'};assert.throws(()=>verifyApproval(packet),/digest mismatch/);
});

test('summary excludes the first producer/enemy-core damage tick, keeps own-core pressure and actual other-road harm',()=>{
 const shot=(time,lane,damage,candidates=[])=>({time,tick:Math.round(time/.05),attackerId:99,targetId:10+lane,targetLane:lane,targetGround:true,effective:damage,candidates});
 const r={policy:'central-watch',seed:8405,ledger:{transactions:[{side:0,type:'watchtower',id:99,cost:220}],spending:[220,0],maxError:[0,0]},firstCountWarningAt:5,firstEnemyProducerLossAt:20,fires:[shot(10,0,20,[{id:10,ground:true,birthLane:0},{id:12,ground:true,birthLane:2}]),shot(10.85,2,21),shot(20,2,999)],damageEvents:[{side:1,targetSide:0,time:10,attackerId:12,effective:123,tick:200},{side:1,targetSide:0,time:10.05,attackerId:12,effective:7,tick:201}],firstCoreDamage:[5,null],outcome:{completed:false},duration:30,finalHP:[6000,6000],restoreChecks:[],attempts:[]};
 const s=summarize(r);assert.deepEqual(s.openingWatchGroundDamageByRoad,[20,0,21]);assert.equal(s.competition.length,1);assert.equal(s.competition[0].unchosenEffectiveDamage,7);
});


test('instrumentation preserves ordinary immediate AI-style volley and exact queued effective damage without ticking',()=>{
 const g=createPrototype(),c=instrumentCombat(g),unit={id:999,type:'warrior',side:0,x:1250,y:260,lane:0,hp:180,maxHp:180,level:1,cooldown:0,attack:0,flying:false};g.state.units.push(unit);
 assert.ok(g.cast(1250,260,1).ok);assert.equal(unit.hp,88);assert.equal(c.damageEvents[0].effective,92);assert.equal(c.damageEvents[0].fireIndex,null);assert.equal(c.pending.length,0);
 const target=g.state.buildings.find(b=>b.side===1&&b.type==='barracks');target.hp=150;const attacker=g.state.buildings.find(b=>b.side===0);g.damageQueue=[];
 g._fire(attacker,target,100,'archer');g._fire(attacker,target,100,'archer');assert.equal(target.hp,150);const queue=g.damageQueue;g.damageQueue=null;for(const hit of queue)g._damage(...hit);
 assert.deepEqual(c.fires.map(f=>f.effective),[100,50]);assert.equal(c.pending.length,0);assert.equal(c.firstEnemyProducerLossAt,0);assert.equal(c.losses[0].type,'barracks');assert.equal(g.tick,0);assert.equal(g.state.time,0);
});

test('same-cost consequence classifies actual lost producer types even when absent at final',()=>{
 const base={duration:200,losses:[],damageEvents:[],final:{state:{buildings:[]}}},control={...base,losses:[{type:'foundry',x:1250,lane:2,side:0,time:120}],damageEvents:[{side:1,targetSide:0,targetType:'foundry',targetLane:2,attackerLane:2,time:119,effective:200}]};
 const c=placementConsequence(base,control);assert.equal(c.horizon,180);assert.equal(c.avoidedSouthernProducerLosses.length,1);assert.equal(c.controlSouthernThreatStructureDamage,200);
 const late={...control,losses:[{...control.losses[0],time:181}]};assert.equal(placementConsequence(base,late).avoidedSouthernProducerLosses.length,0);
});

function syntheticMatrix(){return PLAN.knownSeeds.flatMap(seed=>PLAN.caseOrder.map(policy=>{
 const central=policy==='central-watch',main=central||policy==='distributed-mobile',won=main&&seed!==8303;
 return {policy,seed,ledger:{transactions:[{side:1,cost:140,type:'barracks'},...(main?[{side:0,cost:270,type:'foundry',time:5},{side:0,cost:175,type:'archery',time:10}]:[]),...(central?[{side:0,cost:220,type:'watchtower',id:99,time:0}]:[])],spending:[0,140],maxError:[0,0]},firstEnemyProducerLossAt:null,firstCountWarningAt:5,firstCoreDamage:[null,100],fires:central?[{index:0,time:10,tick:200,attackerId:99,targetId:10,targetLane:0,targetGround:true,effective:60,candidates:[{id:10,ground:true,birthLane:0},{id:11,ground:true,birthLane:1}]},{index:1,time:11,tick:220,attackerId:99,targetId:12,targetLane:2,targetGround:true,effective:60,candidates:[]}]:[],damageEvents:central?[{side:1,targetSide:0,time:10.5,tick:210,attackerId:11,effective:10}]:[],outcome:{completed:won},duration:120,finalHP:[6000,won?0:6000],restoreChecks:[{at:30,checkedTicks:10},{at:90,checkedTicks:10}],attempts:[],unexpectedGoldWrites:[],aiCalls:[{}],losses:policy==='north-watch-control'?[{type:'archery',x:550,lane:2,side:0,time:110}]:[],commands:[]};
 }));}

test('replicated fair gates accept isolated stress losses and winning placement controls, require default witnesses',()=>{
 let runs=syntheticMatrix();for(const r of runs.filter(r=>r.policy==='north-watch-control'))r.outcome.completed=true;
 let d=decide(runs);assert.equal(d.failures.length,0);assert.deepEqual(d.positiveWitnesses,[8405,448273]);
 runs=syntheticMatrix();runs.find(r=>r.seed===8405&&r.policy==='distributed-mobile').outcome.completed=false;assert.ok(decide(runs).failures.some(f=>f.includes('distributed-mobile')));
 runs=syntheticMatrix();runs.find(r=>r.seed===8405&&r.policy==='watch-only').outcome.completed=true;assert.ok(decide(runs).failures.some(f=>f.includes('watch-only')));
 runs=syntheticMatrix();runs.find(r=>r.seed===8405&&r.policy==='north-watch-control').losses=[];assert.ok(decide(runs).failures.some(f=>f.includes('witnesses including default')));
 runs=syntheticMatrix();runs.find(r=>r.seed===448273&&r.policy==='central-watch').fires=[];assert.ok(decide(runs).failures.some(f=>f.includes('witnesses including default')));
 runs=syntheticMatrix();for(const r of runs.filter(r=>r.policy==='central-archery-control'&&r.seed!==8303))r.outcome.completed=true;d=decide(runs);assert.equal(d.failures.length,0);assert.match(d.warnings[0],/CHEAPER-SUBSTITUTE/);assert.match(d.decision,/REVIEW/);
});

test('preopen source/environment, exact invocation and output/stop controls refuse safely without running cases',()=>{
 const f=freeze(),packet={format:'shared-watch-approved-known-cases-v1',status:'independent-review-approved-and-coordinator-authorized',independentReviewer:'STRUCTURAL-TEST-ONLY',coordinatorAuthorization:'STRUCTURAL-TEST-ONLY: no cases',freeze:structuredClone(f)};
 packet.freeze.closure.execution.nodeVersion='wrong';assert.throws(()=>verifyApproval(packet),/dependencies changed/);
 packet.freeze=structuredClone(f);packet.freeze.closure.files['dist/engine.js']='wrong';assert.throws(()=>verifyApproval(packet),/dependencies changed/);
 const inside=path.join(ROOT,'qa','shared-watch','must-not-be-created');assert.equal(existsSync(inside),false);assert.throws(()=>validateOutputDirectory(inside),/outside repository/);assert.equal(existsSync(inside),false);
 const temp=mkdtempSync('/tmp/shared-watch-preflight-');try{const out=path.join(temp,'new-output'),approval=path.join(temp,'structural-only.json');writeFileSync(approval,'{}');assert.equal(validateOutputDirectory(out),out);assert.equal(stopFileRequested(out),false);writeFileSync(out+'.stop','stop');assert.equal(stopFileRequested(out),true);assert.throws(()=>verifyInvocation({invocation:[]},approval,out),/exact invocation/);assert.equal(existsSync(out),false);}finally{rmSync(temp,{recursive:true,force:true});}
});
