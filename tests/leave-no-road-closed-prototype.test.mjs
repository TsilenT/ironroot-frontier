/** No candidate natural battle is advanced. All ticking uses empty synthetic fixtures. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,existsSync,readFileSync,writeFileSync,readdirSync} from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
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
 for(const change of [s=>s.extra=1,s=>s.epoch=1,s=>s.requiredBridges=1,s=>s.requiredBridges='3',s=>s.control.heldSeconds=30.01,s=>s.control.heldSeconds=13,s=>s.control.earned=[0,0],s=>s.control.bridges[0].progress=2,s=>s.engine.rulesetId=QA_RULES[3].id,s=>s.engine.mapId='long-march',s=>s.engine.state.time+=.01,s=>s.engine.tick++,s=>s.engine.state.campaignControl=s.control,s=>s.engine.state.time=600.05]){const bad=structuredClone(valid);change(bad);assert.throws(()=>restorePrototype(bad),String(change));}
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

// Small structural epoch1 references, not battle results. Self-contained after recovery.
const EPOCH1={
  "initial": {
    "9305-2": "95711f90a22a05232d1b1e5ba8e0365a4c8f0d370fd24cd62f054d69827fa971",
    "9305-3": "edfbf9fbf59a96480e0923352c77b634618ee7a307f83875605995fc7216cd76",
    "214927-2": "080ee46ff68c74ec56195a0849e3e125764b580a1858739a5714f1586fd30ef0",
    "214927-3": "c470ab653bde152e5438a254bf96545bade5c8404a9ea9db8a19a88ef993deb5",
    "760141-2": "1a6995434b0543dda146f71a7abdf6767314edfa3412aed906cbe264dbb5e890",
    "760141-3": "95ef10139697321c9c9f1c28f70d8b0583b5908aa233dbc480be5443439ef86a"
  },
  "policies": {
    "paid-three-road": {
      "intent": "Fund a real southern screen and ranged/splash support, then economy and screened siege across the roads. Reopen lost planned sites at normal prices.",
      "plan": [
        {
          "type": "barracks",
          "x": 1250,
          "lane": 2,
          "once": false
        },
        {
          "type": "archery",
          "x": 1110,
          "lane": 2,
          "once": false
        },
        {
          "type": "sanctum",
          "x": 970,
          "lane": 2,
          "once": false
        },
        {
          "type": "mint",
          "x": 410,
          "lane": 0,
          "once": false
        },
        {
          "type": "mint",
          "x": 410,
          "lane": 2,
          "once": false
        },
        {
          "type": "foundry",
          "x": 830,
          "lane": 2,
          "once": false
        },
        {
          "type": "foundry",
          "x": 830,
          "lane": 0,
          "once": false
        },
        {
          "type": "foundry",
          "x": 830,
          "lane": 1,
          "once": false
        },
        {
          "type": "barracks",
          "x": 1250,
          "lane": 0,
          "once": false
        },
        {
          "type": "barracks",
          "x": 1250,
          "lane": 1,
          "once": false
        }
      ]
    },
    "screened-middle-core": {
      "intent": "Concentrate on middle citadel pressure. Siege sits behind the inherited warrior/archer screen and a new front barracks, never unsupported at the front.",
      "plan": [
        {
          "type": "barracks",
          "x": 1250,
          "lane": 1,
          "once": false
        },
        {
          "type": "foundry",
          "x": 830,
          "lane": 1,
          "once": false
        },
        {
          "type": "sanctum",
          "x": 690,
          "lane": 1,
          "once": false
        },
        {
          "type": "archery",
          "x": 550,
          "lane": 1,
          "once": false
        },
        {
          "type": "mint",
          "x": 410,
          "lane": 0,
          "once": false
        },
        {
          "type": "mint",
          "x": 410,
          "lane": 2,
          "once": false
        },
        {
          "type": "foundry",
          "x": 270,
          "lane": 1,
          "once": false
        },
        {
          "type": "barracks",
          "x": 1250,
          "lane": 0,
          "once": false
        },
        {
          "type": "sanctum",
          "x": 830,
          "lane": 0,
          "once": false
        }
      ]
    },
    "two-roads-cheap-third": {
      "intent": "Buy one southern barracks once, then commit to north/middle support and siege. Do not replace or add further southern factories. This is the cheaper-coverage comparison, not a required loser.",
      "plan": [
        {
          "type": "barracks",
          "x": 1250,
          "lane": 2,
          "once": true
        },
        {
          "type": "sanctum",
          "x": 830,
          "lane": 0,
          "once": false
        },
        {
          "type": "barracks",
          "x": 1250,
          "lane": 1,
          "once": false
        },
        {
          "type": "foundry",
          "x": 830,
          "lane": 1,
          "once": false
        },
        {
          "type": "sanctum",
          "x": 690,
          "lane": 1,
          "once": false
        },
        {
          "type": "archery",
          "x": 550,
          "lane": 1,
          "once": false
        },
        {
          "type": "mint",
          "x": 410,
          "lane": 0,
          "once": false
        },
        {
          "type": "mint",
          "x": 410,
          "lane": 2,
          "once": false
        },
        {
          "type": "foundry",
          "x": 690,
          "lane": 0,
          "once": false
        }
      ]
    }
  },
  "design": {
    "id": "leave-no-road-closed",
    "epoch": 1,
    "title": "Leave No Road Closed",
    "status": "fresh-design-natural-cases-unopened",
    "baselineCommit": "65ee1438435a9e8a4cb6b8b6930ac87ca17518b7",
    "baselineTree": "b6ee01ff93f43176a889d7fb3c226cf5ef442643",
    "numericStatus": "All formation, purse, seed and policy choices are new hypotheses, not balance evidence.",
    "parentRulesetId": "frontier-campaign-citadel-open",
    "mapId": "classic",
    "difficulty": "normal",
    "ai": true,
    "seed": 9305,
    "timeLimit": 600,
    "seconds": 30,
    "requiredBridges": 3,
    "startingGold": 900,
    "enemyGold": 100,
    "startingHealth": 6000,
    "cadenceTicks": 100,
    "playerBuildings": [
      [
        "barracks",
        1110,
        0
      ],
      [
        "archery",
        970,
        0
      ],
      [
        "barracks",
        1110,
        1
      ],
      [
        "archery",
        970,
        1
      ],
      [
        "mint",
        410,
        1
      ]
    ],
    "enemyBuildings": [
      [
        "barracks",
        2090,
        0
      ],
      [
        "archery",
        2370,
        0
      ],
      [
        "barracks",
        1950,
        1
      ],
      [
        "sanctum",
        2230,
        1
      ],
      [
        "barracks",
        1950,
        2
      ],
      [
        "archery",
        2230,
        2
      ],
      [
        "mint",
        2790,
        1
      ]
    ]
  },
  "runtimeHash": "55a554a6f4800df06a84b1ec4758e579593bb0faf9d1e7c2fcc66ed4b8e8fd5a"
};

const digest=value=>createHash('sha256').update(typeof value==='string'||Buffer.isBuffer(value)?value:JSON.stringify(value)).digest('hex');
test('epoch2 permits only broad reorder and two mine once flags; literal core/cheap and implementation unchanged',()=>{
 const source=readFileSync(path.join(ROOT,'qa/leave-no-road-closed/policies.mjs'),'utf8');
 const oldBroad=` 'paid-three-road':{
  intent:'Fund a real southern screen and ranged/splash support, then economy and screened siege across the roads. Reopen lost planned sites at normal prices.',
  plan:[B('barracks',1250,2),B('archery',1110,2),B('sanctum',970,2),...mines,B('foundry',830,2),B('foundry',830,0),B('foundry',830,1),B('barracks',1250,0),B('barracks',1250,1)],
 },
`;
 const normalized=source.replace(/ 'paid-three-road':\{[\s\S]*?(?= 'screened-middle-core':)/,oldBroad);
 assert.equal(digest(normalized),'82e37ce0000abd32e55744a8f28c474199f62323ac4fc7b0f18806bc1063cc8c');
 for(const id of ['screened-middle-core','two-roads-cheap-third'])assert.deepEqual(POLICIES[id],EPOCH1.policies[id]);
 const strip=plan=>plan.map(({once,...site})=>site).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));
 const before=EPOCH1.policies['paid-three-road'].plan,after=POLICIES['paid-three-road'].plan;
 assert.equal(after.length,10);assert.deepEqual(strip(after),strip(before));
 assert.deepEqual(after.map(x=>[x.type,x.x,x.lane,x.once]),[
 ['barracks',1250,2,false],['barracks',1250,0,false],['barracks',1250,1,false],
 ['foundry',830,0,false],['foundry',830,1,false],['archery',1110,2,false],
 ['sanctum',970,2,false],['foundry',830,2,false],['mint',410,0,true],['mint',410,2,true]]);
 const g=fixture();assert.equal(after.reduce((n,item)=>n+g.buildings[item.type].cost,0),2015);
 assert.deepEqual(after.map(item=>g.buildings[item.type].cost).sort((a,b)=>a-b),before.map(item=>g.buildings[item.type].cost).sort((a,b)=>a-b));
});
test('epoch2 all known seed openings equal epoch1 except QA identity; runtime and runner remain exact',()=>{
 assert.equal(DESIGN.epoch,2);assert.equal(PLAN.epoch,2);
 assert.deepEqual({...DESIGN,epoch:1},EPOCH1.design);
 assert.deepEqual(PLAN.knownSeeds,[9305,214927,760141]);
 assert.deepEqual(PLAN.cases.map(c=>[c.id,c.policy,c.requiredBridges]),[
 ['broad-three','paid-three-road',3],['core-three','screened-middle-core',3],
 ['cheap-three','two-roads-cheap-third',3],['cheap-two-diagnostic','two-roads-cheap-third',2]]);
 const source=readFileSync(path.join(ROOT,'qa/leave-no-road-closed/scenario.mjs'),'utf8')
 .replaceAll('epoch:2','epoch:1').replaceAll('packet.epoch!==2','packet.epoch!==1').replaceAll('closed-e2-','closed-e1-');
 assert.equal(digest(source),'1c06f1741aa84c02f38fcd3272547dc4f095949a2d7ff5c949aed0db6b4c735c');
 assert.equal(digest(readFileSync(path.join(ROOT,'qa/leave-no-road-closed/run.mjs'))),'b3dcd59cfa0db37ad03916fba10d7c9bb19b69f237ab11c274feaba9c8929399');
 const runtime=Object.fromEntries(readdirSync(path.join(ROOT,'dist')).sort().map(n=>[n,digest(readFileSync(path.join(ROOT,'dist',n)))]));
 assert.equal(digest(runtime),EPOCH1.runtimeHash);
 for(const seed of PLAN.knownSeeds)for(const requiredBridges of [2,3]){
  const g=createPrototype({seed,requiredBridges}),save=savePrototype(g);
  assert.equal(g.tick,0);assert.equal(g.ruleset.id,`qa-leave-no-road-closed-e2-${requiredBridges}`);
  assert.equal(save.epoch,2);assert.deepEqual(savePrototype(restorePrototype(save)),save);
  const old={...save,epoch:1};assert.equal(digest(old),EPOCH1.initial[seed+'-'+requiredBridges]);
  assert.throws(()=>restorePrototype(old),/Invalid QA envelope/);
 }
});
test('synthetic no-tick broad mines purchase once while every ordinary combat site rebuilds repeatedly',()=>{
 // Empty synthetic worlds only, manually assigned clock/gold and explicit loss. No update/_step calls.
 const plan=POLICIES['paid-three-road'].plan;
 for(const [index,item] of plan.entries()){
  const g=fixture(),p=createPolicy('paid-three-road');g.state.gold[0]=10000;
  // Occupy every other planned location so this site is the sole missing item.
  for(const [i,other] of plan.entries())if(i!==index)assert.ok(g.build(other.type,other.x,g.map.lanes[other.lane]).ok);
  const purchase=p.step(g);assert.ok(purchase.ok);assert.equal(purchase.type,item.type);assert.equal(purchase.x,item.x);assert.equal(purchase.lane,item.lane);
  assert.equal(purchase.cost,g.buildings[item.type].cost);
  for(let repeat=1;repeat<=2;repeat++){
   g.state.buildings=g.state.buildings.filter(b=>!(b.side===0&&b.x===item.x&&b.lane===item.lane));
   g.tick=repeat*100;g.state.time=repeat*5;
   const restored=createPolicy('paid-three-road',{state:p.snapshot()});
   assert.deepEqual(restored.snapshot(),p.snapshot());
   const next=p.step(g);
   if(item.once){assert.ok(p.snapshot().onceCompleted.includes(index));assert.notEqual(next?.method,'build');assert.equal(g.state.buildings.some(b=>b.x===item.x&&b.lane===item.lane),false);}
   else {assert.ok(next.ok);assert.equal(next.method,'build');assert.equal(next.type,item.type);assert.equal(next.x,item.x);assert.equal(next.lane,item.lane);assert.equal(next.cost,g.buildings[item.type].cost);}
  }
 }
 const g=fixture(),p=createPolicy('paid-three-road');
 for(const item of plan.slice(0,8)){g.state.gold[0]=10000;assert.ok(g.build(item.type,item.x,g.map.lanes[item.lane]).ok);}
 g.state.gold[0]=0;assert.equal(p.step(g).ok,false);assert.deepEqual(p.snapshot().onceCompleted,[]);
 g.tick=100;g.state.time=5;g.state.gold[0]=190;assert.ok(p.step(g).ok);assert.deepEqual(p.snapshot().onceCompleted,[8]);
});
