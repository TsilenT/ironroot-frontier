import test from 'node:test';
import assert from 'node:assert/strict';
import { createCampaignMission, createCampaignRestart, createCampaignProgress, CAMPAIGN_MISSIONS, getCampaignMission, getCampaignTargets, evaluateCampaignMission, getProgressionCampaignOverview, getCampaignLaunchMission, normalizeCampaignProgress, recordCampaignResult, getCampaignRevisionForRuleset, canUseCampaignRuleset } from '../dist/campaign.js';
import { LANTERNS_RULESET_ID, FOG_RULESET_ID, FOG_SKIRMISH_RULESET_ID } from '../dist/rulesets.js';
import { observe } from '../dist/fog.js';
import { advanceObjectiveBattle } from '../dist/objectives.js';
import { encodeBattle, decodeBattle, scenarioForBattle } from '../dist/battle-codec.js';
import { createPolicy } from '../qa/lanterns/paid-policies.mjs';
import { describeLanterns } from '../qa/lanterns/scenario.mjs';
const ID='lanterns-on-the-water',fresh=()=>createCampaignMission(ID),evaluate=g=>evaluateCampaignMission(g,ID);
function progress(){const p=createCampaignProgress();for(const m of CAMPAIGN_MISSIONS)p.missions[m.id]={completed:true,stars:1,bestTime:60};p.missions['shared-crossing']={completed:true,stars:1,bestTime:180};p.missions['one-signal-is-enough']={completed:true,stars:1,bestTime:210};return normalizeCampaignProgress(p);}
function remove(g,index){const t=getCampaignTargets(g,ID)[index];g.state.buildings=g.state.buildings.filter(b=>b.id!==t.originalId);return t;}
function clock(g,time){g.state.time=time;g.tick=Math.round(time/.05);}
test('Lanterns is one immutable additive mission with exact campaign fog identity',()=>{
 const m=getCampaignMission(ID),g=fresh(),p=progress();assert.ok(Object.isFrozen(m));assert.equal(m.rulesetId,LANTERNS_RULESET_ID);assert.equal(m.intelligence,'charted-customs-posts');assert.equal(m.timeLimit,600);assert.equal(m.ai,true);assert.equal(m.difficulty,'normal');assert.equal(g.ruleset.endgame.forcedDecay,false);assert.deepEqual(m.prerequisites,['one-signal-is-enough']);
 assert.equal(getCampaignRevisionForRuleset(ID,LANTERNS_RULESET_ID),1);for(const wrong of [FOG_RULESET_ID,FOG_SKIRMISH_RULESET_ID,'frontier-campaign-one-signal'])assert.throws(()=>getCampaignRevisionForRuleset(ID,wrong));assert.equal(canUseCampaignRuleset(p,ID,1,LANTERNS_RULESET_ID),true);assert.equal(canUseCampaignRuleset(createCampaignProgress(),ID,1,LANTERNS_RULESET_ID),false);
 const overview=getProgressionCampaignOverview(p);assert.equal(overview.total,42);assert.equal(overview.maxStars,126);assert.equal(overview.nextMissionId,ID);assert.equal(getCampaignMission(ID).reward,'Completes the current Chapter 6 route');assert.equal(getCampaignLaunchMission('one-signal-is-enough',p).reward,'Unlocks Lanterns on the Water');assert.equal(getCampaignMission('one-signal-is-enough').reward,'Unlocks the campaign epilogue');assert.equal(getCampaignMission('shared-crossing').reward,'Unlocks the campaign epilogue');
});
test('production formation matches the paid prototype and starts with empty fog memory',()=>{
 const d=describeLanterns(),m=getCampaignMission(ID),g=fresh();for(const [key,expected] of [['playerBuildings',d.playerBuildings],['enemyBuildings',d.enemyBuildings]])assert.deepEqual(m[key],expected.map(({type,x,lane,level})=>level===1?[type,x,lane]:[type,x,lane,level]));
 assert.deepEqual(g.state.gold,d.startingGold);assert.deepEqual(g.state.income,d.startingIncome);assert.deepEqual(g.state.fog,{version:1,sides:[{structures:[],citadel:null},{structures:[],citadel:null}]});assert.equal(observe(g,0).state.buildings.filter(b=>b.side===1).length,0);assert.equal(observe(g,0).state.bases[1].hp,null);
 const text=m.briefing.join('\n');assert.doesNotMatch(text,/Enemy deployment:|enemy.*level-|2370|2790/);assert.match(text,/10:00/);assert.match(text,/5:00/);assert.match(text,/1\.65/);assert.match(text,/1\.75/);assert.match(text,/32 to 18/);assert.match(text,/outside sight/);assert.match(text,/same sight rules/);
});
test('only original post IDs count; visible upgrades and paid replacements do not reset credit',()=>{
 const g=fresh(),initial=getCampaignTargets(g,ID);assert.deepEqual(initial.map(t=>t.name),['North Customs House','River Customs House']);assert.deepEqual(initial.map(t=>[t.x,t.lane]),[[2090,0],[2090,2]]);
 g.state.gold[1]=1000;assert.ok(g.upgrade(initial[0].originalId,1).ok);assert.equal(evaluate(g).objectives[0].value,0);
 const first=remove(g,0);assert.equal(evaluate(g).completed,false);assert.equal(evaluate(g).objectives[0].value,1);assert.ok(g.build('watchtower',first.x,g.map.lanes[first.lane],1).ok);assert.equal(evaluate(g).objectives[0].value,1);remove(g,1);assert.equal(evaluate(g).completed,true);assert.equal(g.state.winner,null);
});
test('posts and enemy citadel accept one own HP; own loss overrides simultaneous victory',()=>{
 for(const route of ['posts','citadel']){const g=fresh();g.state.bases[0].hp=1;if(route==='posts'){remove(g,0);remove(g,1);}else g.state.bases[1].hp=0;assert.equal(evaluate(g).completed,true);g.state.bases[0].hp=0;assert.equal(evaluate(g).completed,false);assert.equal(evaluate(g).failed,true);}
 const g=fresh();g.state.bases[1].hp=0;g.state.bases[0].hp=0;assert.equal(evaluate(g).failed,true);
});
test('deadline is exactly ten minutes; same-tick objective win works without extra ticks',()=>{
 for(const finish of ['none','posts','both-cores']){const g=fresh();clock(g,599.95);let ticks=0;g.update=dt=>{ticks++;g.state.time+=dt;if(finish==='posts'){remove(g,0);remove(g,1);}if(finish==='both-cores'){g.state.bases.forEach(b=>b.hp=0);}};const outcome=advanceObjectiveBattle(g,.25,evaluate,600);assert.equal(ticks,1);assert.equal(g.state.time,600);assert.equal(outcome.completed,finish==='posts');assert.equal(outcome.failed,finish!=='posts');}
});
test('active one-post checkpoint restores; restart resets memory and originals; one-star clear records',()=>{
 const p=progress(),g=fresh();remove(g,0);const bytes=encodeBattle(g,scenarioForBattle(null,ID,g),{campaignProgress:p}),copy=decodeBattle(bytes,{campaignProgress:p}).game;assert.deepEqual(copy.serialize(),g.serialize());assert.equal(evaluate(copy).objectives[0].value,1);const restart=createCampaignRestart(copy,ID);assert.equal(getCampaignTargets(restart,ID).filter(t=>t.building).length,2);assert.deepEqual(restart.state.fog,fresh().state.fog);
 clock(copy,200);copy.state.bases[0].hp=1;remove(copy,1);const result=recordCampaignResult(p,ID,copy);assert.equal(result.missions[ID].stars,1);assert.equal(getProgressionCampaignOverview(result).completed,false);assert.equal(getProgressionCampaignOverview(result).nextMissionId,'borrowed-ground');assert.throws(()=>encodeBattle(copy,scenarioForBattle(null,ID,copy),{campaignProgress:p}));
});
test('paid production post/core routes preserve the QA results through actual checkpoint restoration',()=>{
 for(const [policyId,seed,time,hp,posts] of [['scout-commit',6301,99.7,6000,2],['forceful-middle',51017,175.45,918,0]]){
  let g=fresh();g.seed=seed;const policy=createPolicy(policyId),p=progress();let nextSave=15,saves=0,outcome=evaluate(g);
  while(!outcome.completed&&!outcome.failed){policy.step(g);outcome=advanceObjectiveBattle(g,.05,evaluate,600);if(g.state.time>=nextSave&&!outcome.completed&&!outcome.failed){const before=g.serialize();g=decodeBattle(encodeBattle(g,scenarioForBattle(null,ID,g),{campaignProgress:p}),{campaignProgress:p}).game;assert.deepEqual(g.serialize(),before);nextSave+=15;saves++;}}
  assert.equal(outcome.completed,true,policyId);assert.ok(Math.abs(g.state.time-time)<1e-6);assert.ok(Math.abs(g.state.bases[0].hp-hp)<1e-6);assert.equal(outcome.objectives[0].value,posts);assert.ok(saves>=6);assert.ok(g.state.stats.built[1]>7,'ordinary AI bought buildings');
 }
});
