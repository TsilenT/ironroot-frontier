/** Frozen known-input trajectory parity only, not whole-feature equivalence.
 * The historical QA clone fails the exact registered autonomous-air identity
 * gate. These nine particular trajectories match despite that difference; they
 * do not certify autonomous-flyer behavior or the old manual control result.
 * Separate registered-air synthetic coverage exercises the dynamic gate. */
import test from 'node:test';import assert from 'node:assert/strict';
import {Game,getRuleset} from '../dist/engine.js';import * as c from '../dist/campaign.js';
import {encodeBattle,decodeBattle,validateBattleIdentity} from '../dist/battle-codec.js';
import {validateHistoryRow} from '../dist/history-codec.js';
import {createPrototype,evaluatePrototype,DESIGN,QA_RULES} from '../qa/leave-no-road-closed/scenario.mjs';
import {createPolicy} from '../qa/leave-no-road-closed/policies.mjs';
import {advanceObjectiveBattle} from '../dist/objectives.js';
import {campaignControlStatus,advanceCampaignControl} from '../dist/bridge-control.js';
const ID='leave-no-road-closed',RULE='frontier-campaign-leave-roads',fresh=()=>c.createCampaignMission(ID);
const progress=()=>({...c.createCampaignProgress(),missions:Object.fromEntries(c.CAMPAIGN_PROGRESS_MISSIONS.filter(m=>m.id!==ID).map(m=>[m.id,{completed:true,stars:1,bestTime:60}]))});
function comparable(g){const s=g.serialize();delete s.rulesetId;delete s.rulesetRevision;return s;}
test('three-road opening and rule descriptors match frozen epoch2, not every identity-gated feature',()=>{
 const g=fresh(),q=createPrototype();assert.deepEqual(comparable(g),comparable(q));
 const a=structuredClone(getRuleset(RULE)),b=structuredClone(QA_RULES[3]);for(const x of [a,b]){delete x.id;delete x.name;delete x.qaOnly;}assert.deepEqual(a,b);assert.ok(Object.isFrozen(getRuleset(RULE).campaignControl));
 const m=c.getCampaignMission(ID);assert.deepEqual(m.prerequisites,['the-empty-purse']);assert.equal(m.seed,9305);assert.equal(c.getCurrentCampaignRevision(ID,progress()),1);assert.equal(Object.keys(g.buildings).length,8);assert.equal(c.getCampaignTargets(g,ID).length,0);assert.deepEqual(g.state.gold,[900,100]);assert.equal(g.state.income[0],7.5);
 const o=c.getProgressionCampaignOverview(progress());assert.equal(o.total,35);assert.equal(o.maxStars,105);const ch=o.chapters.find(x=>x.number===9);assert.equal(ch.total,3);assert.equal(ch.plannedMissions,5);assert.equal(ch.completed,false);assert.equal(o.chapters.find(x=>x.number===8).total,5);assert.equal(o.chapters.some(x=>x.number===10),false);
});
test('real Purse prerequisite and restart preserve authored seed and earned roster',()=>{const p=progress();assert.ok(c.isMissionUnlocked(p,ID));const g=c.createProgressionCampaignMission(ID,p);assert.deepEqual(g.serialize(),fresh().serialize());g.update(.05);assert.deepEqual(c.createCampaignRestart(g,ID).serialize(),fresh().serialize());delete p.missions['the-empty-purse'];assert.equal(c.isMissionUnlocked(p,ID),false);assert.throws(()=>c.createProgressionCampaignMission(ID,p));});
test('battle and history reject crossed control identities and restore active continuation',()=>{const g=fresh(),p=progress(),identity={ruleset:{id:RULE,revision:1},map:{id:'classic',revision:1},scenario:{kind:'campaign',id:ID,revision:1}};assert.deepEqual(validateBattleIdentity(identity),identity);for(const patch of [{ruleset:{id:DESIGN.parentRulesetId,revision:1}},{ruleset:{id:'frontier-campaign-shared-crossing',revision:1}},{map:{id:'twin-span',revision:1}},{scenario:{kind:'campaign',id:'shared-crossing',revision:1}},{scenario:{kind:'campaign',id:ID,revision:2}}])assert.throws(()=>validateBattleIdentity({...identity,...patch}));const row={won:true,draw:false,difficulty:'normal',time:180,kills:0,built:0,date:'2026-11-10T00:00:00.000Z',identity};assert.deepEqual(validateHistoryRow(row),row);for(let i=0;i<100;i++)g.update(.05);const r=decodeBattle(encodeBattle(g,identity.scenario,{campaignProgress:p}),{campaignProgress:p}).game;assert.deepEqual(r.serialize(),g.serialize());for(let i=0;i<100;i++){g.update(.05);r.update(.05);assert.deepEqual(r.serialize(),g.serialize());}});
for(const seed of [9305,214927,760141])for(const policy of ['paid-three-road','screened-middle-core','two-roads-cheap-third'])test(`known epoch2 trajectory-only parity ${seed}/${policy}`,()=>{let p=c.createCampaignMission(ID,{seed}),q=createPrototype({seed}),pp=createPolicy(policy),qp=createPolicy(policy);let restored=false;while(!evaluatePrototype(q).completed&&!evaluatePrototype(q).failed){assert.deepEqual(pp.step(p),qp.step(q));p.update(.05);q.update(.05);assert.deepEqual(comparable(p),comparable(q));if(!restored&&p.tick===1000){p=Game.restore(JSON.parse(JSON.stringify(p.serialize())));restored=true;}assert.ok(p.tick<=12000);}assert.equal(c.evaluateCampaignMission(p,ID).completed,evaluatePrototype(q).completed);assert.equal(c.evaluateCampaignMission(p,ID).failed,evaluatePrototype(q).failed);assert.equal(p.state.campaignControl.heldSeconds,0);assert.equal(evaluatePrototype(q).completed,policy!=='two-roads-cheap-third'||seed===214927);});
test('synthetic three-road clock requires third road, retains interrupted credit, no income',()=>{
 const g=fresh(),s=g.state,rule=g.ruleset.campaignControl;const gold=[...s.gold];
 s.campaignControl.bridges.forEach((b,i)=>b.owner=i===2?null:0);
 assert.equal(advanceCampaignControl(s.campaignControl,g.map,[],1,g.units,rule),0);
 s.campaignControl.bridges[2].owner=0;assert.equal(advanceCampaignControl(s.campaignControl,g.map,[],1,g.units,rule),1);
 const enemy={type:'gryphon',side:1,hp:1,x:g.map.width/2,y:g.map.lanes[2]};assert.equal(advanceCampaignControl(s.campaignControl,g.map,[enemy],1,g.units,rule),0);assert.equal(s.campaignControl.heldSeconds,1);
 assert.equal(advanceCampaignControl(s.campaignControl,g.map,[],1,g.units,rule),1);assert.deepEqual(s.gold,gold);assert.equal(campaignControlStatus(g).required,3);
});
test('synthetic one-HP one-star control or core clear needs no mandatory purchase or original structure',()=>{
 for(const route of ['control','core']){const g=fresh();g.state.time=500;g.tick=10000;g.state.bases[0].hp=1;g.state.buildings=[];if(route==='control')g.state.campaignControl.heldSeconds=30;else g.state.bases[1].hp=0;const o=c.evaluateCampaignMission(g,ID);assert.equal(o.completed,true);assert.equal(o.stars,1);assert.equal(c.recordCampaignResult(progress(),ID,g).missions[ID].stars,1);}
});
for(const time of [599.95,600,600.05])for(const result of ['alive','control','enemy-down','own-down','draw'])test(`synthetic three-road precedence at${time}/${result}`,()=>{
 const g=fresh();g.state.time=time;g.tick=Math.round(time/.05);if(result==='control')g.state.campaignControl.heldSeconds=30;if(result==='enemy-down')g.state.bases[1].hp=0;if(result==='own-down'){g.state.bases[0].hp=0;g.state.campaignControl.heldSeconds=30;}if(result==='draw'){g.state.bases.forEach(b=>b.hp=0);g.state.winner='draw';}
 const o=c.evaluateCampaignMission(g,ID),win=['control','enemy-down'].includes(result)&&time<=600;assert.equal(o.completed,win);assert.equal(o.failed,!win&&(time>=600||['own-down','draw'].includes(result)));if(o.completed||o.failed){const b=g.serialize();advanceObjectiveBattle(g,.2,x=>c.evaluateCampaignMission(x,ID),600);assert.deepEqual(g.serialize(),b);}
});
for(const delta of [.001,.016,.05,.1,.25])test(`synthetic three-road final frame reaches deadline ${delta}`,()=>{
 const g=fresh();g.state.time=599.95;g.tick=11999;g.aiTimer=30;for(let i=0;i<101&&!c.evaluateCampaignMission(g,ID).failed;i++)advanceObjectiveBattle(g,delta,x=>c.evaluateCampaignMission(x,ID),600);assert.equal(c.evaluateCampaignMission(g,ID).failed,true);assert.equal(g.tick,12000);
});

test('synthetic partial capture and secured control persist through battle restore and continuation',()=>{
 const g=fresh(),p=progress();g.state.time=20;g.tick=400;g.state.campaignControl.heldSeconds=10;
 g.state.campaignControl.bridges.forEach(b=>b.owner=0);Object.assign(g.state.campaignControl.bridges[2],{capturing:1,progress:.5});
 const packet=encodeBattle(g,c.campaignScenarioForGame(g,ID),{campaignProgress:p});
 const r=decodeBattle(structuredClone(packet),{campaignProgress:p}).game;assert.deepEqual(r.serialize(),g.serialize());
 for(let i=0;i<100;i++){g.update(.05);r.update(.05);assert.deepEqual(r.serialize(),g.serialize());}assert.ok(g.state.campaignControl.heldSeconds>10);
 for(const heldSeconds of [-1,31,Infinity]){const corrupt=r.serialize();corrupt.state.campaignControl.heldSeconds=heldSeconds;assert.throws(()=>Game.restore(corrupt));}
 const restart=c.createCampaignRestart(r,ID);assert.equal(restart.state.campaignControl.heldSeconds,0);assert.ok(restart.state.campaignControl.bridges.every(b=>b.owner===null&&b.capturing===null));
});
