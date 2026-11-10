/** Structural command fixtures only. Never call Game.update/_step or runCase.
 * Synthetic clocks/funds below test decisions, not simulated battle outcomes. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {Game,buildSites} from '../dist/engine.js';
import {getCampaignMission} from '../dist/campaign.js';
import {CITADEL_OPTIONS,citadelOptionStatus} from '../dist/citadel-options.js';
import {DESIGN,OPENING,FOLLOWUP,POLICIES,createPrototype,createPolicy,evaluatePrototype} from '../qa/camp-kept/prototype.mjs';
import {PLAN,ROOT,freeze,verifyApproval,validateOutputDirectory} from '../qa/camp-kept/experiment.mjs';
const clock=(g,seconds)=>{g.tick=Math.round(seconds/.05);g.state.time=seconds;};
const enemy=(id,x,lane=1)=>({id,type:'warrior',side:1,hp:180,maxHp:180,level:1,lane,x,y:[260,450,640][lane],flying:false,cooldown:0,attack:0});

test('unchanged factory is deterministic, ordinary full-roster, intact, paid-AI and unadmitted without a tick',()=>{
 const g=createPrototype(),save=g.serialize();assert.deepEqual(save,createPrototype().serialize());assert.deepEqual(Game.restore(save).serialize(),save);
 assert.equal(g.tick,0);assert.equal(g.state.time,0);assert.deepEqual(g.state.units,[]);assert.deepEqual(g.state.effects,[]);
 assert.equal(g.map.id,'classic');assert.equal(g.difficulty,'normal');assert.equal(g.ai,true);assert.equal(g.aiTimer,0);
 assert.equal(Object.keys(g.buildings).length,8);assert.equal(Object.keys(g.units).length,6);assert.equal(g.ruleset.ai.policy,'legacy');assert.equal(g.ruleset.endgame.forcedDecay,false);assert.equal(g.ruleset.endgame.escalationAt,300);
 assert.deepEqual(g.state.gold,[1100,100]);assert.deepEqual(g.state.income,[7.5,7.5]);assert.deepEqual(g.state.bases.map(b=>[b.hp,b.maxHp]),[[2700,6000],[6000,6000]]);
 assert.deepEqual(g.state.stats.built,[4,7]);assert.deepEqual(g.state.stats.kills,[0,0]);assert.deepEqual(g.state.stats.damage,[0,0]);
 for(const b of g.state.buildings){assert.equal(b.level,1);assert.equal(b.hp,b.maxHp);assert.equal(b.invested,g.buildings[b.type].cost);assert.ok(buildSites(g.map,b.side).some(site=>site.x===b.x&&site.y===b.y));}
 assert.throws(()=>getCampaignMission('the-camp-we-kept'));assert.equal(g.state.fog,undefined);assert.equal(g.state.campaignControl,undefined);assert.equal(g.state.hammerCommitment,undefined);
});

test('full-health control changes exactly one initial HP field; seed and health controls remain explicit',()=>{
 const a=createPrototype().serialize(),b=createPrototype({health:'full'}).serialize();b.state.bases[0].hp=2700;assert.deepEqual(a,b);
 for(const seed of [-1,4294967296,1.5,NaN])assert.throws(()=>createPrototype({seed}));assert.throws(()=>createPrototype({health:'damaged'}));
 for(const seed of PLAN.knownSeeds)assert.equal(createPrototype({seed}).seed,seed);
});

test('all three active variants pay identical support-first commands before the choice stage',()=>{
 for(const id of ['support-none','support-regen','support-arrows']){
  const g=createPrototype(),p=createPolicy(id);for(let i=0;i<4;i++){clock(g,2*i);const before=g.state.gold[0],r=p.step(g);assert.ok(r.ok);assert.deepEqual({type:r.action.type,x:r.action.x,lane:r.action.lane},OPENING[i]);assert.equal(before-g.state.gold[0],g.buildings[OPENING[i].type].cost);assert.equal(r.action.decision,'initial-support');assert.equal(p.step(g),null);}
  clock(g,8);const hp=g.state.bases[0].hp,r=p.step(g);assert.ok(r.ok);if(id==='support-none'){assert.equal(r.action.type,'sanctum');assert.equal(r.action.lane,1);}else{assert.equal(r.action.method,'citadel');assert.equal(r.action.choice,POLICIES[id].choice);assert.equal(g.state.bases[0].hp,hp);assert.equal(g.state.citadelOptions.sides[0].healedTotal,0);}
 }
 assert.equal(DESIGN.cadenceSeconds,2);assert.equal(createPolicy('idle').step(createPrototype()),null);assert.throws(()=>createPolicy('unknown'));
});

test('all support/rear-development sites fit and pay normal prices within existing limits',()=>{
 const g=createPrototype();g.state.gold[0]=10000; // Synthetic authoring fixture, never battle evidence.
 for(const a of [...OPENING,...FOLLOWUP]){const before=g.state.gold[0],r=g.build(a.type,a.x,g.map.lanes[a.lane]);assert.ok(r.ok,r.reason);assert.equal(before-g.state.gold[0],g.buildings[a.type].cost);}
 assert.equal(g.tick,0);assert.equal(g.state.time,0);assert.equal(g.state.buildings.filter(b=>b.side===0).length,15);assert.equal(g.state.buildings.filter(b=>b.side===0&&b.type==='mint').length,3);
 assert.equal(FOLLOWUP.filter(a=>a.type==='foundry').every(a=>a.x<=410),true);
});


test('synthetic intact-perimeter command sequence reaches ordinary rear development and affordable upgrades',()=>{
 for(const id of ['support-none','support-regen','support-arrows']){
  const g=createPrototype(),p=createPolicy(id);g.state.gold[0]=10000;const builds=OPENING.length+FOLLOWUP.length,choices=id==='support-none'?0:1;
  for(let i=0;i<builds+choices+1;i++){clock(g,2*i);const r=p.step(g);assert.ok(r?.ok,r?.reason);if(i===builds+choices)assert.equal(r.action.method,'upgrade');}
  assert.equal(g.state.buildings.filter(b=>b.side===0).length,15);assert.deepEqual(g.state.units,[]); // No production or combat was advanced.
 }
});

test('ordinary rebuilding can replace a lost inherited producer and chooses an affordable repair',()=>{
 const g=createPrototype(),p=createPolicy('support-none'),first=p.step(g);assert.ok(first.ok);const north=g.state.buildings.find(b=>b.side===0&&b.type==='barracks'&&b.lane===0),southId=first.buildingId;
 g.state.buildings=g.state.buildings.filter(b=>![north.id,southId].includes(b.id));g.state.gold[0]=160;g.state.units=[enemy(999,300,2),enemy(1000,500,0)];clock(g,2);
 const r=p.step(g);assert.ok(r.ok);assert.equal(r.action.decision,'rebuild-production');assert.equal(r.action.type,'barracks');assert.equal(r.action.lane,0);assert.notEqual(r.buildingId,north.id);assert.equal(g.state.gold[0],20);
 // The closer southern missing archery is unaffordable, so it does not block an affordable northern repair.
});

test('a lost new producer is rebuilt at its ordinary site rather than forgotten',()=>{
 const g=createPrototype(),p=createPolicy('support-none'),a=p.step(g);g.state.buildings=g.state.buildings.filter(b=>b.id!==a.buildingId);clock(g,2);const r=p.step(g);assert.ok(r.ok);assert.equal(r.action.decision,'rebuild-production');assert.equal(r.action.type,'archery');assert.equal(r.action.x,690);assert.equal(r.action.lane,2);assert.notEqual(r.buildingId,a.buildingId);
});

test('urgent visible core-cluster volley is ordinary paid damage; distant or sparse contacts do not trigger it',()=>{
 const g=createPrototype();g.state.units=[enemy(999,280),enemy(1000,300),enemy(1001,320)];const before=g.state.gold[0],r=createPolicy('support-none').step(g);assert.ok(r.ok);assert.equal(r.action.method,'cast');assert.equal(r.action.decision,'visible-core-cluster');assert.equal(before-g.state.gold[0],g.ruleset.spell.cost);assert.deepEqual(g.state.units.map(u=>u.hp),[88,88,88]);assert.equal(g.tick,0);
 for(const units of [[enemy(999,300),enemy(1000,320)],[enemy(999,1900),enemy(1000,1920),enemy(1001,1940)]]){const h=createPrototype();h.state.units=units;assert.equal(createPolicy('support-none').step(h).action.method,'build');}
});

test('failed repairs remain visible and a decision cannot repeat before the declared two-second interval',()=>{
 const g=createPrototype(),p=createPolicy('support-none');assert.ok(p.step(g).ok);const b=g.state.buildings.find(b=>b.side===0&&b.type==='barracks'&&b.lane===0);g.state.buildings=g.state.buildings.filter(a=>a!==b);g.state.gold[0]=0;clock(g,2);const r=p.step(g);assert.equal(r.ok,false);assert.match(r.reason,/Need/);assert.equal(p.step(g),null);clock(g,3.95);assert.equal(p.step(g),null);clock(g,4);assert.equal(p.step(g).ok,false);assert.equal(p.commands.filter(r=>!r.ok).length,2);
});

test('ordinary regeneration retains delay, no instant heal and one mutually exclusive choice',()=>{
 assert.equal(CITADEL_OPTIONS.cost,190);assert.equal(CITADEL_OPTIONS.regenRate,3);assert.equal(CITADEL_OPTIONS.regenDelay,8);const g=createPrototype();assert.ok(g.buyCitadelOption('regen').ok);assert.equal(g.state.bases[0].hp,2700);assert.equal(citadelOptionStatus(g).regenWait,8);assert.equal(citadelOptionStatus(g).healingActive,false);assert.equal(g.buyCitadelOption('arrows').ok,false);assert.equal(g.tick,0);
});

test('local terminal contract permits 1-HP core wins, prioritizes loss/draw and retains the deadline',()=>{
 const g=createPrototype();g.state.bases[0].hp=1;g.state.bases[1].hp=0;g.state.time=600;assert.equal(evaluatePrototype(g).completed,true);g.state.bases[0].hp=0;assert.equal(evaluatePrototype(g).reason,'player-core');const h=createPrototype();h.state.winner='draw';assert.equal(evaluatePrototype(h).reason,'player-core');h.state.winner=null;h.state.time=600;assert.equal(evaluatePrototype(h).reason,'deadline');assert.equal(evaluatePrototype(createPrototype()).reason,null);
});

test('only sixteen declared cases and a matching newly reviewed freeze can be opened',()=>{
 assert.equal(PLAN.cases,16);assert.equal(PLAN.knownSeeds.length*PLAN.healthControls.length*PLAN.policies.length,16);assert.deepEqual(PLAN.policies,Object.keys(POLICIES));assert.deepEqual(PLAN.healthControls,['wounded','full']);const f=freeze();assert.equal(f.source.design,DESIGN);assert.throws(()=>verifyApproval({}));const p={format:'camp-kept-reviewed-run-v1',status:'reviewed-and-authorized',independentReviewer:'STRUCTURAL-FIXTURE-ONLY',coordinatorAuthorization:'STRUCTURAL-FIXTURE-ONLY; no case execution',freeze:f};assert.ok(verifyApproval(p));p.freeze={...f,sha256:'earlier-epoch'};assert.throws(()=>verifyApproval(p),/changed/);
});

test('results must remain in a new empty directory outside source',()=>{
 assert.throws(()=>validateOutputDirectory(ROOT),/outside/);const d=mkdtempSync(path.join(os.tmpdir(),'camp-kept-no-tick-'));try{assert.equal(validateOutputDirectory(d),d);writeFileSync(path.join(d,'fixture'),'x');assert.throws(()=>validateOutputDirectory(d),/empty/);}finally{rmSync(d,{recursive:true,force:true});}
});
