/** Structural fixtures only: never calls update, _step, advanceObjectiveBattle or runCase. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {Game,buildSites} from '../dist/engine.js';
import {getCampaignMission} from '../dist/campaign.js';
import {CITADEL_OPTIONS,citadelOptionStatus} from '../dist/citadel-options.js';
import {DESIGN,POLICIES,createPrototype,createPolicy,evaluatePrototype} from '../qa/camp-kept/prototype.mjs';
import {PLAN,ROOT,freeze,verifyApproval,validateOutputDirectory} from '../qa/camp-kept/experiment.mjs';

test('new factory is deterministic, ordinary full-roster, intact, paid-AI and unadmitted without a tick',()=>{
 const g=createPrototype(),save=g.serialize();assert.deepEqual(save,createPrototype().serialize());assert.deepEqual(Game.restore(save).serialize(),save);
 assert.equal(g.tick,0);assert.equal(g.state.time,0);assert.deepEqual(g.state.units,[]);assert.deepEqual(g.state.effects,[]);
 assert.equal(g.map.id,'classic');assert.equal(g.difficulty,'normal');assert.equal(g.ai,true);assert.equal(g.aiTimer,0);
 assert.equal(Object.keys(g.buildings).length,8);assert.equal(Object.keys(g.units).length,6);assert.equal(g.ruleset.ai.policy,'legacy');assert.equal(g.ruleset.endgame.forcedDecay,false);assert.equal(g.ruleset.endgame.escalationAt,300);
 assert.deepEqual(g.state.gold,[1100,100]);assert.deepEqual(g.state.income,[7.5,7.5]);assert.deepEqual(g.state.bases.map(b=>[b.hp,b.maxHp]),[[2700,6000],[6000,6000]]);
 assert.deepEqual(g.state.stats.built,[4,7]);assert.deepEqual(g.state.stats.kills,[0,0]);assert.deepEqual(g.state.stats.damage,[0,0]);
 for(const b of g.state.buildings){assert.equal(b.level,1);assert.equal(b.hp,b.maxHp);assert.equal(b.invested,g.buildings[b.type].cost);assert.ok(buildSites(g.map,b.side).some(site=>site.x===b.x&&site.y===b.y));}
 assert.throws(()=>getCampaignMission('the-camp-we-kept'));assert.equal(g.state.fog,undefined);assert.equal(g.state.campaignControl,undefined);assert.equal(g.state.hammerCommitment,undefined);
});

test('full-health control changes exactly one initial HP field; only declared seed/health inputs are valid',()=>{
 const wounded=createPrototype().serialize(),full=createPrototype({health:'full'}).serialize();full.state.bases[0].hp=2700;assert.deepEqual(full,wounded);
 for(const seed of [-1,4294967296,1.5,NaN])assert.throws(()=>createPrototype({seed}));assert.throws(()=>createPrototype({health:'damaged'}));
 for(const seed of PLAN.knownSeeds)assert.equal(createPrototype({seed}).seed,seed);
});

test('first paid commands are affordable, normal-price and distinct without ticking',()=>{
 for(const [policy,method,cost] of [['counterattack','build',270],['regen-income','citadel',190],['arrows-income','citadel',190],['greedy-recovery','build',190]]){
  const g=createPrototype(),p=createPolicy(policy),r=p.step(g);assert.ok(r.ok);assert.equal(r.action.method,method);assert.equal(r.tick,0);assert.equal(g.state.gold[0],1100-cost);assert.equal(p.step(g),null);assert.equal(g.tick,0);
 }
 const g=createPrototype(),before=g.serialize();assert.equal(createPolicy('idle').step(g),null);assert.deepEqual(g.serialize(),before);assert.throws(()=>createPolicy('unknown'));
});

test('all declared fixed plans fit, pay ordinary prices and respect the mine/build limits',()=>{
 for(const [id,def] of Object.entries(POLICIES)){
  const g=createPrototype();g.state.gold[0]=10000; // Synthetic authoring fixture only, never gameplay evidence.
  for(const a of def.plan){const before=g.state.gold[0],r=a.method==='citadel'?g.buyCitadelOption(a.choice):g.build(a.type,a.x,g.map.lanes[a.lane]);assert.ok(r.ok,id+': '+r.reason);assert.equal(before-g.state.gold[0],a.method==='citadel'?190:g.buildings[a.type].cost);}
  assert.equal(g.tick,0);assert.equal(g.state.time,0);assert.ok(g.state.buildings.filter(b=>b.side===0).length<=g.map.buildLimit);assert.ok(g.state.buildings.filter(b=>b.side===0&&b.type==='mint').length<=3);
 }
});

test('regeneration is slow, not an instant heal; the 190-gold choices are mutually exclusive',()=>{
 assert.equal(CITADEL_OPTIONS.cost,190);assert.equal(CITADEL_OPTIONS.regenRate,3);assert.equal(CITADEL_OPTIONS.regenDelay,8);
 const g=createPrototype();assert.ok(g.buyCitadelOption('regen').ok);assert.equal(g.state.bases[0].hp,2700);assert.equal(g.state.citadelOptions.sides[0].healedTotal,0);assert.equal(citadelOptionStatus(g).regenWait,8);assert.equal(citadelOptionStatus(g).healingActive,false);assert.equal(g.buyCitadelOption('arrows').ok,false);assert.equal(g.tick,0);
 const arrows=POLICIES['arrows-income'].plan,regen=POLICIES['regen-income'].plan;assert.deepEqual(arrows.slice(1),regen.slice(1));assert.deepEqual([arrows[0].choice,regen[0].choice],['arrows','regen']);
});

test('local evaluator permits 1-HP core wins, prioritizes loss/draw and has a 600-second deadline',()=>{
 const g=createPrototype();g.state.bases[0].hp=1;g.state.bases[1].hp=0;g.state.time=600;assert.equal(evaluatePrototype(g).completed,true);
 g.state.bases[0].hp=0;assert.equal(evaluatePrototype(g).reason,'player-core');assert.equal(evaluatePrototype(g).completed,false);
 const h=createPrototype();h.state.winner='draw';assert.equal(evaluatePrototype(h).reason,'player-core');h.state.winner=null;h.state.time=600;assert.equal(evaluatePrototype(h).reason,'deadline');
 assert.equal(evaluatePrototype(createPrototype()).reason,null);
});

test('all twenty cases are preregistered and source approval is exact; fixtures do not authorize execution',()=>{
 assert.equal(PLAN.cases,20);assert.equal(PLAN.knownSeeds.length*PLAN.healthControls.length*PLAN.policies.length,20);assert.deepEqual(PLAN.policies,Object.keys(POLICIES));assert.deepEqual(PLAN.healthControls,['wounded','full']);
 const f=freeze();assert.equal(f.source.design,DESIGN);assert.throws(()=>verifyApproval({}));
 const p={format:'camp-kept-reviewed-run-v1',status:'reviewed-and-authorized',independentReviewer:'STRUCTURAL-FIXTURE-ONLY',coordinatorAuthorization:'STRUCTURAL-FIXTURE-ONLY; no case is executed',freeze:f};assert.ok(verifyApproval(p));
 p.freeze={...f,sha256:'bad'};assert.throws(()=>verifyApproval(p),/changed/);
});

test('results directory must be external and empty',()=>{
 assert.throws(()=>validateOutputDirectory(ROOT),/outside/);const d=mkdtempSync(path.join(os.tmpdir(),'camp-kept-no-tick-'));
 try{assert.equal(validateOutputDirectory(d),d);writeFileSync(path.join(d,'fixture'),'x');assert.throws(()=>validateOutputDirectory(d),/empty/);}finally{rmSync(d,{recursive:true,force:true});}
});
