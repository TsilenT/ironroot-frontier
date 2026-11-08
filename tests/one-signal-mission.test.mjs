import test from 'node:test';
import assert from 'node:assert/strict';
import {createCampaignMission,evaluateCampaignMission,getCampaignTargets,createCampaignRestart,getCampaignMission,getProgressionCampaignOverview,getCampaignLaunchMission,recordCampaignResult} from '../dist/campaign.js';
import {advanceObjectiveBattle} from '../dist/objectives.js';
import {encodeBattle,decodeBattle,scenarioForBattle} from '../dist/battle-codec.js';
import {MISSION_ID,campaignProgress,playOneSignal} from './one-signal-policies.mjs';
const fresh=()=>createCampaignMission(MISSION_ID),evaluate=g=>evaluateCampaignMission(g,MISSION_ID);
function remove(g,index){const id=getCampaignTargets(g,MISSION_ID)[index].originalId;g.state.buildings=g.state.buildings.filter(b=>b.id!==id);}
function clock(g,time){g.state.time=time;g.tick=Math.round(time/.05);}
test('minimum survivor mission adds progression without rewriting prior descriptors',()=>{
 const g=fresh(),m=getCampaignMission(MISSION_ID);assert.ok(Object.isFrozen(m));assert.equal(m.timeLimit,210);assert.deepEqual(getCampaignTargets(g,MISSION_ID).map(t=>t.name),['Ridge Signal','River Signal']);
 assert.equal(getProgressionCampaignOverview(campaignProgress()).total,23);assert.equal(getProgressionCampaignOverview(campaignProgress()).nextMissionId,MISSION_ID);
 assert.equal(getCampaignLaunchMission('shared-crossing',campaignProgress()).reward,'Unlocks One Signal Is Enough');assert.equal(getCampaignMission('shared-crossing').reward,'Unlocks the campaign epilogue');
});
test('either original can be lost; last signal and own core losses override every win',()=>{
 for(const index of [0,1]){const g=fresh();remove(g,index);assert.equal(evaluate(g).failed,false);clock(g,210);assert.equal(evaluate(g).completed,true);assert.equal(evaluate(g).stars,1);
 getCampaignTargets(g,MISSION_ID).find(t=>t.building).building.hp=1;g.state.bases[0].hp=1;assert.equal(evaluate(g).completed,true);
 remove(g,1-index);g.state.bases[1].hp=0;assert.equal(evaluate(g).completed,false);assert.equal(evaluate(g).failed,true);}
 const g=fresh();clock(g,210);g.state.bases[0].hp=0;g.state.bases[1].hp=0;assert.equal(evaluate(g).failed,true);
});
test('early core win requires a signal; original-survivors medal cannot fall through to upgrades or rebuilds',()=>{
 const g=fresh();clock(g,100);g.state.bases[1].hp=0;assert.equal(evaluate(g).stars,3);remove(g,0);assert.equal(evaluate(g).stars,2);g.state.gold[0]=2000;assert.ok(g.build('watchtower',970,g.map.lanes[0]).ok);for(const b of g.state.buildings.filter(b=>b.side===0))b.level=3;
 assert.equal(evaluate(g).medals.find(m=>m.type==='original-survivors').earned,false);remove(g,1);assert.equal(evaluate(g).failed,true);
});
test('exact deadline and batched ticks stop with failure before simultaneous core victory',()=>{
 for(const loss of [false,true]){const g=fresh();remove(g,0);clock(g,209.95);let calls=0;g.update=dt=>{calls++;g.state.time+=dt;if(loss){remove(g,1);g.state.bases[1].hp=0;}};
 const result=advanceObjectiveBattle(g,.25,evaluate,210);assert.equal(calls,1);assert.equal(g.state.time,210);assert.equal(result.completed,!loss);assert.equal(result.failed,loss);}
});
test('one-loss active checkpoints restore exactly and restart recreates originals; ended checkpoints reject',()=>{
 const g=fresh(),profile=campaignProgress();remove(g,0);const bytes=encodeBattle(g,scenarioForBattle(null,MISSION_ID,g),{campaignProgress:profile});const copy=decodeBattle(bytes,{campaignProgress:profile}).game;assert.deepEqual(copy.serialize(),g.serialize());assert.deepEqual(evaluate(copy),evaluate(g));assert.equal(getCampaignTargets(createCampaignRestart(copy,MISSION_ID),MISSION_ID).filter(t=>t.building).length,2);
 for(const terminate of [h=>remove(h,1),h=>clock(h,210),h=>{h.state.bases[0].hp=0;}]){const h=decodeBattle(bytes,{campaignProgress:profile}).game;terminate(h);assert.throws(()=>encodeBattle(h,scenarioForBattle(null,MISSION_ID,h),{campaignProgress:profile}));}
 clock(copy,210);const recorded=recordCampaignResult(profile,MISSION_ID,copy);assert.equal(recorded.missions[MISSION_ID].stars,1);
});
test('historical protect-all semantics remain unchanged',()=>{
 const g=createCampaignMission('last-light',{revision:5});const t=getCampaignTargets(g,'last-light')[0];g.state.buildings=g.state.buildings.filter(b=>b.id!==t.originalId);assert.equal(evaluateCampaignMission(g,'last-light').failed,true);
});
test('ordinary paid routes clear with either sacrifice or both; wardens optional and restore parity',()=>{
 for(const [route,survivors] of [['northSacrifice',['Ridge Signal']],['southSacrifice',['River Signal']],['bothNoWardens',['Ridge Signal','River Signal']]]){
   const run=playOneSignal({route});assert.equal(run.outcome.completed,true,route);assert.deepEqual(run.summary.survivors,survivors);
   const restored=playOneSignal({route,restore:true});assert.deepEqual(restored.game.serialize(),run.game.serialize());assert.deepEqual(restored.outcome,run.outcome);assert.ok(restored.summary.saved>0);
 }
 for(const route of ['idle','economy']){const run=playOneSignal({route});assert.equal(run.outcome.failed,true);assert.deepEqual(run.summary.survivors,[]);}
});
