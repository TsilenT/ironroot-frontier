/** No candidate natural battle is advanced. All ticking uses empty synthetic fixtures. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,existsSync,readFileSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {Game,buildSites} from '../dist/engine.js';
import {getRuleset} from '../dist/rulesets.js';
import {getCampaignMission} from '../dist/campaign.js';
import {createCampaignControl,advanceCampaignControl,bridgeIncome,campaignControlEnded} from '../dist/bridge-control.js';
import {DESIGN,QA_RULES,bindQAControl,createPrototype,evaluatePrototype,savePrototype,restorePrototype} from '../qa/leave-no-road-closed/scenario.mjs';
import {POLICIES,createPolicy} from '../qa/leave-no-road-closed/policies.mjs';
import {PLAN,ROOT,freeze,verifyApproval,validateOutput,advanceRunnerTick,createRunControl,retainCaseArtifacts} from '../qa/leave-no-road-closed/run.mjs';
import {instrumentEconomy} from '../qa/salt-stores/economy.mjs';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
const owner=(side=0)=>({owner:side,capturing:null,progress:0});
function fixture({time=0,held=0,required=3,owned=false,ai=false}={}){
 const base=new Game({rulesetId:DESIGN.parentRulesetId,seed:17,ai});
 base.state.buildings=[];base.state.units=[];base.state.effects=[];base.state.stats.built=[0,0];
 base.state.time=time;base.tick=Math.round(time/.05);base.state.overtime=time>=300;
 const g=bindQAControl(base,required);g.state.campaignControl.heldSeconds=held;
 if(owned)g.state.campaignControl.bridges=g.map.lanes.map(()=>owner());
 return g;
}
function troop(g,side,lane,type='warrior',x=g.map.width/2){
 const d=g.units[type];return {id:g.nextId++,side,lane,type,x,y:g.map.lanes[lane],hp:d.hp,maxHp:d.hp,level:1,cooldown:0,attack:0,flying:d.flying,...(d.flying?{airTargetId:null}:{})};
}

test('fresh QA formation is legal, deterministic, healthy and not runtime admission; zero ticks',()=>{
 const g=createPrototype(),save=savePrototype(g);assert.equal(g.tick,0);assert.equal(g.state.time,0);assert.deepEqual(g.state.units,[]);
 assert.deepEqual(save,savePrototype(createPrototype()));assert.deepEqual(savePrototype(restorePrototype(save)),save);
 assert.deepEqual(g.state.gold,[900,100]);assert.deepEqual(g.state.income,[7.5,7.5]);assert.deepEqual(g.state.stats.built,[5,7]);assert.deepEqual(g.state.bases.map(b=>b.hp),[6000,6000]);
 assert.equal(g.ai,true);assert.equal(g.difficulty,'normal');assert.equal(g.ruleset.ai.policy,'legacy');assert.equal(g.ruleset.economy.policy,'legacy');assert.equal(g.ruleset.endgame.forcedDecay,false);assert.equal(g.ruleset.endgame.escalationAt,300);assert.equal(g.state.fog,undefined);
 assert.equal(Object.keys(g.buildings).length,8);assert.deepEqual(g.ruleset.campaignControl,{policy:'cumulative-route-v1',requiredBridges:3,seconds:30,timeLimit:600});assert.ok(Object.isFrozen(g.ruleset.campaignControl));
 const {id,name,qaOnly,campaignControl,...qa}=g.ruleset,{id:parentId,name:parentName,...parent}=getRuleset(DESIGN.parentRulesetId);assert.deepEqual(qa,parent);
 for(const b of g.state.buildings){assert.ok(buildSites(g.map,b.side).some(p=>p.x===b.x&&p.y===b.y));assert.equal(b.level,1);assert.equal(b.hp,b.maxHp);assert.equal(b.invested,g.buildings[b.type].cost);}
 assert.throws(()=>getRuleset(g.ruleset.id));assert.throws(()=>new Game({rulesetId:g.ruleset.id}));assert.throws(()=>Game.restore(g.serialize()));assert.throws(()=>getCampaignMission(DESIGN.id));
 assert.deepEqual(bridgeIncome(g),[0,0]);assert.equal(g.state.bridgeControl,undefined);
 for(const seed of [-1,2**32,NaN,1.5])assert.throws(()=>createPrototype({seed}));assert.throws(()=>createPrototype({requiredBridges:1}));
});

test('all plans fit ordinary sites/caps and pay normal build/upgrade prices without ticking',()=>{
 for(const [id,def] of Object.entries(POLICIES)){
  const g=createPrototype();g.state.gold[0]=10000; // Explicit authoring fixture, not battle evidence.
  for(const item of def.plan){
   if(item.type==='foundry')assert.ok(g.state.buildings.some(b=>b.side===0&&b.type==='barracks'&&b.lane===item.lane&&b.x>item.x),id+': siege needs a forward screen');
   const before=g.state.gold[0],r=g.build(item.type,item.x,g.map.lanes[item.lane]);assert.ok(r.ok,id+': '+r.reason);assert.equal(before-g.state.gold[0],g.buildings[item.type].cost);
  }
  for(const b of g.state.buildings.filter(b=>b.side===0)){const before=g.state.gold[0],price=g.upgradeCost(b);assert.ok(g.upgrade(b.id).ok);assert.equal(before-g.state.gold[0],price);}
  assert.equal(g.tick,0);assert.equal(g.state.buildings.filter(b=>b.side===0&&b.type==='mint').length,3);
 }
 const g=createPrototype();assert.equal(g.canBuild('barracks',1500,450).ok,false);assert.match(g.canBuild('barracks',1110,260).reason,/Too close/);
 g.state.gold[0]=0;assert.match(g.canBuild('foundry',830,450).reason,/270/);
 const cap=fixture();cap.state.gold[0]=10000;
 for(const p of buildSites(cap.map,0))assert.ok(cap.build('barracks',p.x,p.y).ok);
 assert.equal(cap.state.buildings.length,24);assert.match(cap.canBuild('barracks',340,355).reason,/limit/);
 const producer=cap.state.buildings[0],beforeSpawns=cap.state.gold[0];for(let i=0;i<71;i++)cap._spawn(producer);assert.equal(cap.state.units.length,70);assert.equal(cap.state.gold[0],beforeSpawns);
 assert.deepEqual(savePrototype(restorePrototype(savePrototype(cap))),savePrototype(cap));
 const mines=fixture();mines.state.gold[0]=1000;for(const lane of [0,1,2])assert.ok(mines.build('mint',410,mines.map.lanes[lane]).ok);assert.match(mines.canBuild('mint',690,450).reason,/Maximum 3/);
});

test('policy commands are affordable ordinary actions; continuation and single cheap add-on are explicit',()=>{
 for(const [id,type,x,lane,cost] of [['paid-three-road','barracks',1250,2,140],['screened-middle-core','barracks',1250,1,140],['two-roads-cheap-third','barracks',1250,2,140]]){
  const g=createPrototype(),p=createPolicy(id),r=p.step(g);assert.ok(r.ok);assert.equal(r.type,type);assert.equal(r.x,x);assert.equal(r.lane,lane);assert.equal(r.cost,cost);assert.equal(g.state.gold[0],900-cost);assert.equal(p.step(g),null);assert.equal(g.tick,0);
  const restored=restorePrototype(savePrototype(g)),q=createPolicy(id,{state:p.snapshot()});assert.deepEqual(q.snapshot(),p.snapshot());assert.equal(q.step(restored),null);
 }
 const g=createPrototype(),p=createPolicy('two-roads-cheap-third');p.step(g);g.state.buildings=g.state.buildings.filter(b=>!(b.side===0&&b.lane===2));g.tick=100;g.state.time=5;
 const next=p.step(g);assert.ok(next.ok);assert.equal(next.lane,0);assert.equal(g.state.buildings.some(b=>b.side===0&&b.lane===2),false);
});

test('three-road capture credits the last overlap; flyers deny, contest pauses and empty ownership persists',()=>{
 const g=fixture(),c=createCampaignControl(g.map),rule=QA_RULES[3].campaignControl;
 c.bridges=[owner(),owner(),{owner:1,capturing:0,progress:1.98}];
 near(advanceCampaignControl(c,g.map,[troop(g,0,2)],.05,g.units,rule),.03);
 near(advanceCampaignControl(c,g.map,[troop(g,1,2,'gryphon')],3,g.units,rule),0);assert.equal(c.bridges[2].owner,0);
 near(advanceCampaignControl(c,g.map,[troop(g,1,2)],1.9,g.units,rule),0);assert.equal(c.bridges[2].capturing,1);
 near(advanceCampaignControl(c,g.map,[],.1,g.units,rule),.1);assert.deepEqual(c.bridges[2],owner());
 advanceCampaignControl(c,g.map,[troop(g,1,2)],2,g.units,rule);assert.deepEqual(c.bridges[2],owner(1));near(c.heldSeconds,.13);
 const flyerOnly=createCampaignControl(g.map);advanceCampaignControl(flyerOnly,g.map,[troop(g,0,2,'gryphon')],3,g.units,rule);assert.equal(flyerOnly.bridges[2].owner,null);
});

test('synthetic native ticks: loss/draw/core precede control; goal/deadline stop before AI; 1 HP win accepted',()=>{
 for(const deadSides of [[0],[1],[0,1]]){
  const g=fixture({time:31.95,held:29.95,owned:true,ai:true});let calls=0;g._ai=()=>calls++;
  for(const side of deadSides){g.state.bases[side].hp=1;g.state.units.push(troop(g,1-side,1,'warrior',g.state.bases[side].x));}
  g.update(.25);near(g.state.time,32);near(g.state.campaignControl.heldSeconds,29.95);assert.equal(calls,0);
  assert.equal(evaluatePrototype(g).reason,deadSides.includes(0)?'player-core':'enemy-core');assert.equal(evaluatePrototype(g).completed,!deadSides.includes(0));
 }
 const goal=fixture({time:31.95,held:29.95,owned:true,ai:true});goal.state.bases[0].hp=1;let calls=0;goal._ai=()=>calls++;goal.update(.25);
 near(goal.state.time,32);near(goal.state.campaignControl.heldSeconds,30);assert.equal(calls,0);assert.equal(evaluatePrototype(goal).reason,'control');assert.equal(campaignControlEnded(goal),true);
 const stopped=savePrototype(goal);goal.update(.25);assert.deepEqual(savePrototype(goal),stopped);
 for(const finish of [false,true]){const g=fixture({time:599.95,held:finish?29.95:20,owned:true,ai:true});let ai=0;g._ai=()=>ai++;g.update(.25);near(g.state.time,600);assert.equal(ai,0);assert.equal(evaluatePrototype(g).reason,finish?'control':'deadline');}
 const lastCore=fixture({time:599.95});lastCore.state.bases[0].hp=1;lastCore.state.bases[1].hp=1;lastCore.state.units=[troop(lastCore,0,1,'warrior',3090)];lastCore.update(.25);assert.equal(evaluatePrototype(lastCore).reason,'enemy-core');
});

test('synthetic native ticks preserve ordinary economy, paid AI, caps and 5:00 escalation',()=>{
 const g=fixture({time:299.95,ai:true});g.state.gold=[420,420];const economy=instrumentEconomy(g);g.update(.05);economy.reconcile();
 near(g.state.time,300);assert.equal(g.state.overtime,true);near(g.state.gold[0],420.25);assert.ok(g.state.gold[1]<420.25);assert.ok(g.state.buildings.some(b=>b.side===1));
 assert.deepEqual(bridgeIncome(g),[0,0]);assert.equal(g.state.bases[0].hp,6000);
 assert.deepEqual(economy.ledger.transactions.map(t=>[t.side,t.type,t.cost]),[[1,'barracks',140],[1,'barracks',140]]);near(economy.ledger.grossIncome[1],.25);
});

test('QA save boundaries round-trip and continue synthetic native state, reject malformed/mixed envelopes',()=>{
 const scenarios=[fixture(),fixture({time:1.95}),fixture({time:12,held:10,owned:true}),fixture({time:31.95,held:29.95,owned:true}),fixture({time:32,held:30,owned:true}),fixture({time:600,held:20,owned:true})];
 scenarios[1].state.campaignControl.bridges[0]={owner:null,capturing:0,progress:1.95};
 scenarios[2].state.units=[troop(scenarios[2],1,2,'gryphon')];
 for(const g of scenarios){const save=savePrototype(g),r=restorePrototype(save);assert.deepEqual(savePrototype(r),save);for(let i=0;i<6;i++){g.update(.05);r.update(.05);assert.deepEqual(savePrototype(r),savePrototype(g));}}
 const valid=savePrototype(fixture({time:12,held:10,owned:true}));
 for(const change of [s=>s.extra=1,s=>s.epoch=2,s=>s.requiredBridges=1,s=>s.requiredBridges='3',s=>s.control.heldSeconds=30.01,s=>s.control.heldSeconds=13,s=>s.control.earned=[0,0],s=>s.control.bridges[0].progress=2,s=>s.engine.rulesetId=QA_RULES[3].id,s=>s.engine.mapId='long-march',s=>s.engine.state.time+=.01,s=>s.engine.tick++,s=>s.engine.state.campaignControl=s.control,s=>s.engine.state.time=600.05]){const bad=structuredClone(valid);change(bad);assert.throws(()=>restorePrototype(bad),String(change));}
});

test('small proposal is frozen and run guard/output guard refuse unapproved runs without running one',()=>{
 assert.equal(PLAN.knownSeeds.length*PLAN.cases.length,12);assert.deepEqual(PLAN.heldOutSeeds,[]);assert.equal(PLAN.naturalCaseCount,12);
 const cheap=PLAN.cases.filter(c=>c.policy==='two-roads-cheap-third');assert.deepEqual(cheap.map(c=>c.requiredBridges),[3,2]);
 assert.throws(()=>verifyApproval({}));const f=freeze();assert.equal(f.closure.design.status,'fresh-design-natural-cases-unopened');
 const approval={format:'leave-roads-approval-v1',status:'parent-authorized-after-independent-preflight',independentReviewer:'STRUCTURAL TEST ONLY',parentAuthorization:'STRUCTURAL TEST ONLY: no run',freezeSha256:f.sha256};assert.ok(verifyApproval(approval));approval.freezeSha256='bad';assert.throws(()=>verifyApproval(approval));
 assert.throws(()=>validateOutput(path.join(ROOT,'qa','should-not-exist.json')),/outside/);
 const temp=mkdtempSync('/tmp/leave-roads-output-test-');try{assert.equal(validateOutput(path.join(temp,'result.json')),path.join(temp,'result.json'));}finally{rmSync(temp,{recursive:true,force:true});}
});

test('actual runner advance path reaches native deadline from tick zero despite drift and preserves last-tick precedence',()=>{
 const empty=fixture();for(let i=0;i<11999;i++)advanceRunnerTick(empty);
 assert.equal(empty.tick,11999);assert.ok(empty.state.time>599.95); // Reproduces the sub-tick deadline remainder.
 const deadline=advanceRunnerTick(empty);assert.equal(empty.tick,12000);near(empty.state.time,600);assert.equal(deadline.reason,'deadline');
 const stopped=savePrototype(empty);advanceRunnerTick(empty);assert.deepEqual(savePrototype(empty),stopped);
 for(const kind of ['control','enemy-core','player-core','draw']){
  const g=fixture({time:599.9500000000021,held:29.95,owned:true});
  if(['enemy-core','draw'].includes(kind)){g.state.bases[1].hp=1;g.state.units.push(troop(g,0,1,'warrior',3090));}
  if(['player-core','draw'].includes(kind)){g.state.bases[0].hp=1;g.state.units.push(troop(g,1,1,'warrior',110));}
  const restored=restorePrototype(savePrototype(g));const outcome=advanceRunnerTick(g);advanceRunnerTick(restored);
  assert.equal(g.tick,12000);assert.deepEqual(savePrototype(restored),savePrototype(g));
  assert.equal(outcome.reason,kind==='draw'?'player-core':kind);near(g.state.campaignControl.heldSeconds,kind==='control'?30:29.95);
 }
});

test('runner checkpoint yields to queued signal delivery, sees stop files and removes handlers',async()=>{
 const temp=mkdtempSync('/tmp/leave-roads-signal-test-'),out=path.join(temp,'result.json');
 const before=[process.listenerCount('SIGINT'),process.listenerCount('SIGTERM')];
 for(const signal of ['SIGINT','SIGTERM']){
  const control=createRunControl(out);let delivered=false;
  try{
   setImmediate(()=>{delivered=true;process.emit(signal);});
   await assert.rejects(control.checkpoint(),error=>error.code==='STOP_REQUESTED'&&error.message.includes(signal));assert.equal(delivered,true);
  }finally{control.close();}
 }
 const control=createRunControl(out);try{writeFileSync(out+'.stop','stop');await assert.rejects(control.checkpoint(),error=>error.code==='STOP_REQUESTED');}finally{control.close();rmSync(temp,{recursive:true,force:true});}
 assert.deepEqual([process.listenerCount('SIGINT'),process.listenerCount('SIGTERM')],before);
});

test('retention keeps completed raw before failing verification, interrupted drafts/errors and distinct verified receipts',async()=>{
 const out=mkdtempSync('/tmp/leave-roads-retention-test-');
 const draft={tick:100,commands:[{ok:true,cost:140}],ledger:{spending:[140,0]},trace:[{tick:100}]};
 try{
  const validationError=Error('Synthetic post-case source failure');validationError.code='SOURCE_CHANGED';
  await assert.rejects(retainCaseArtifacts({out,stem:'postcase',run:async()=>draft,verify:async row=>{assert.deepEqual(row,draft);assert.deepEqual(JSON.parse(readFileSync(path.join(out,'postcase.json'))),draft);throw validationError;}}),error=>error===validationError);
  const failed=JSON.parse(readFileSync(path.join(out,'postcase-partial.json')));assert.deepEqual(failed.draft,draft);assert.equal(failed.error.code,'SOURCE_CHANGED');assert.equal(existsSync(path.join(out,'postcase-verified.json')),false);
  const stop=Error('Synthetic cancellation');stop.code='STOP_REQUESTED';stop.partial=draft;
  await assert.rejects(retainCaseArtifacts({out,stem:'interrupted',run:async()=>{throw stop;},verify:()=>assert.fail('Stopped case must not verify')}),error=>error===stop);
  const partial=JSON.parse(readFileSync(path.join(out,'interrupted-partial.json')));assert.deepEqual(partial.draft,draft);assert.equal(partial.error.code,'STOP_REQUESTED');assert.equal(existsSync(path.join(out,'interrupted.json')),false);
  await retainCaseArtifacts({out,stem:'complete',run:async()=>draft,verify:()=>{assert.equal(existsSync(path.join(out,'complete.json')),true);}});
  assert.equal(JSON.parse(readFileSync(path.join(out,'complete-verified.json'))).status,'case-and-source-verified');
 }finally{rmSync(out,{recursive:true,force:true});}
});
