import test from 'node:test';import assert from 'node:assert/strict';
import {Game,getRuleset,supportsAutonomousAir,buildSites} from '../dist/engine.js';
import * as c from '../dist/campaign.js';import {advanceObjectiveBattle} from '../dist/objectives.js';
import {encodeBattle,decodeBattle,validateBattleIdentity} from '../dist/battle-codec.js';
const ID='three-minutes-more';
export const progress=()=>({...c.createCampaignProgress(),missions:Object.fromEntries(c.CAMPAIGN_PROGRESS_MISSIONS.filter(m=>m.id!==ID).map(m=>[m.id,{completed:true,stars:1,bestTime:60}]))});
test('registered Twin Span survival factory has ordinary full roster, healthy cores and finite purses',()=>{
 const g=c.createProgressionCampaignMission(ID,progress()),m=c.getCampaignMission(ID);
 assert.equal(g.ruleset,getRuleset('frontier-campaign-three-minutes'));assert.equal(supportsAutonomousAir(g.ruleset),true);assert.ok(g.ruleset.citadel);assert.equal(Object.keys(g.buildings).length,8);
 assert.equal(g.map.id,'twin-span');assert.equal(buildSites(g.map,0).length,16);assert.equal(g.ai,true);assert.deepEqual(g.state.gold,[850,100]);assert.deepEqual(g.state.bases.map(b=>b.hp),[6000,6000]);assert.deepEqual(g.state.income,[7.5,7.5]);assert.equal(g.state.buildings.length,11);
 assert.deepEqual(m.objectives.map(o=>[o.type,o.seconds]),[['survive',180]]);assert.equal(c.getCampaignTargets(g,ID).length,0);assert.deepEqual(m.prerequisites,['leave-no-road-closed']);
 assert.ok(!g.ruleset.fog&&!g.ruleset.campaignControl&&!g.ruleset.minorReserve);const p=progress();delete p.missions['leave-no-road-closed'];assert.throws(()=>c.createProgressionCampaignMission(ID,p));
});
for(const time of [179.95,180,180.05])for(const state of ['alive','enemy','own','draw'])test(`synthetic 1HP precedence ${time}/${state}`,()=>{
 const g=c.createCampaignMission(ID);g.state.time=time;g.tick=Math.round(time/.05);g.state.bases[0].hp=1;g.state.buildings=[];
 if(state==='enemy')g.state.bases[1].hp=0;if(state==='own')g.state.bases[0].hp=0;if(state==='draw')g.state.winner='draw';
 const r=c.evaluateCampaignMission(g,ID);assert.equal(r.completed,!['own','draw'].includes(state)&&time<=180&&(time===180||state==='enemy'));assert.equal(r.failed,['own','draw'].includes(state)||time>180);
 if(r.completed){assert.equal(r.stars,1);assert.equal(c.recordCampaignResult(progress(),ID,g).missions[ID].stars,1);}
});
test('native objective batching stops at survival and own-core loss takes priority',()=>{
 const g=c.createCampaignMission(ID);g.state.time=179.95;g.tick=3599;g.aiTimer=30;
 const r=advanceObjectiveBattle(g,.25,x=>c.evaluateCampaignMission(x,ID),180);assert.equal(r.completed,true);assert.equal(g.tick,3600);assert.ok(Math.abs(g.state.time-180)<1e-7);
 const dead=c.createCampaignMission(ID);dead.state.bases[0].hp=0;const before=dead.serialize();assert.equal(advanceObjectiveBattle(dead,.25,x=>c.evaluateCampaignMission(x,ID),180).failed,true);assert.deepEqual(dead.serialize(),before);
});
test('exact identity codec and engine restore keep registered rules and restart bytes',()=>{
 const g=c.createCampaignMission(ID),initial=g.serialize(),ref=c.campaignScenarioForGame(g,ID),identity={ruleset:{id:g.ruleset.id,revision:1},map:{id:'twin-span',revision:1},scenario:ref};assert.deepEqual(validateBattleIdentity(identity),identity);
 for(const patch of [{map:{id:'classic',revision:1}},{ruleset:{id:'frontier-campaign-citadel-open',revision:1}},{scenario:{kind:'skirmish',id:'standard',revision:1}},{scenario:{kind:'campaign',id:'leave-no-road-closed',revision:1}}])assert.throws(()=>validateBattleIdentity({...identity,...patch}));
 for(let i=0;i<20;i++)g.update(.05);const r=decodeBattle(encodeBattle(g,ref,{campaignProgress:progress()}),{campaignProgress:progress()}).game;assert.equal(r.ruleset,getRuleset(g.ruleset.id));assert.equal(supportsAutonomousAir(r.ruleset),true);
 for(let i=0;i<20;i++){g.update(.05);r.update(.05);assert.deepEqual(r.serialize(),g.serialize());}assert.deepEqual(c.createCampaignRestart(r,ID).serialize(),initial);assert.deepEqual(Game.restore(g.serialize()).serialize(),g.serialize());
});
for(const delta of [.001,.016,.05,.1,.25])for(const end of ['alive','own-loss','enemy-loss','draw'])test(`synthetic native final combat tick ${delta}/${end} preserves loss/draw precedence`,()=>{
 const g=c.createCampaignMission(ID);g.state.buildings=[];g.state.units=[];g.state.projectiles=[];g.state.time=179.95;g.tick=3599;g.aiTimer=30;g.state.bases.forEach(b=>{b.hp=1;b.cooldown=30;});
 // Real units deliver ordinary damage on the final native tick. Only this
 // fixture's position/health/time are synthetic; no substitute engine rules.
 for(const side of end==='draw'?[0,1]:end==='own-loss'?[1]:end==='enemy-loss'?[0]:[]){const target=g.state.bases[1-side];g._spawn({type:'barracks',side,lane:0,x:target.x,level:1});const u=g.state.units.at(-1);u.x=target.x;u.y=target.y;u.cooldown=0;}
 let outcome=c.evaluateCampaignMission(g,ID);
 for(let i=0;i<101&&!outcome.completed&&!outcome.failed;i++)outcome=advanceObjectiveBattle(g,delta,x=>c.evaluateCampaignMission(x,ID),180);
 assert.equal(g.tick,3600);assert.ok(Math.abs(g.state.time-180)<1e-7);assert.equal(outcome.completed,end==='alive'||end==='enemy-loss');assert.equal(outcome.failed,end==='own-loss'||end==='draw');
 if(end==='draw')assert.equal(g.state.winner,'draw');if(outcome.completed)assert.equal(outcome.stars,1);
});
test('optional veterans medal counts living upgraded buildings, not the number of upgrade commands',()=>{
 const g=c.createCampaignMission(ID);g.state.time=180;g.tick=3600;
 const own=g.state.buildings.filter(b=>b.side===0);own[0].level=3;
 assert.equal(c.evaluateCampaignMission(g,ID).medals.find(m=>m.id==='veterans').earned,false);
 own[1].level=2;own[2].level=2;assert.equal(c.evaluateCampaignMission(g,ID).medals.find(m=>m.id==='veterans').earned,true);
 own[2].hp=0;assert.equal(c.evaluateCampaignMission(g,ID).medals.find(m=>m.id==='veterans').earned,false);
});
