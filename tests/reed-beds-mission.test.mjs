import {verifyHistoricalRuntime,historicalRoot} from '../qa/hammer-prototype/historical-runtime.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import * as c from '../dist/campaign.js';
import {RULESETS,getRuleset} from '../dist/rulesets.js';
import {encodeBattle,decodeBattle,validateBattleIdentity} from '../dist/battle-codec.js';
import {advanceObjectiveBattle} from '../dist/objectives.js';
import {observe} from '../dist/fog.js';
const ID='through-the-reed-beds',RULE='frontier-campaign-reed-beds',fresh=()=>c.createCampaignMission(ID),ev=g=>c.evaluateCampaignMission(g,ID),mission=c.getCampaignMission(ID);
const progress=()=>({...c.createCampaignProgress(),missions:Object.fromEntries(c.CAMPAIGN_PROGRESS_MISSIONS.filter(m=>m.id!=='wake-the-reserve'&&m.id !== 'the-shared-watch' && m.id!=='the-long-screen'&&m.id!=='the-hammer-turns'&&m.id!=='salt-in-the-stores'&&m.id!=='the-archers-quay'&&(m.id!==ID)).map(m=>[m.id,{completed:true,stars:1,bestTime:60}]))});
const remove=(g,lanes)=>{const ids=c.getCampaignTargets(g,ID).filter(t=>lanes.includes(t.lane)).map(t=>t.originalId);g.state.buildings=g.state.buildings.filter(b=>!ids.includes(b.id));};
const clock=(g,t)=>{g.state.time=t;g.tick=Math.round(t/.05);};
test('Reed closes a three-mission Chapter 7 using the exact ordinary paid authored formation',()=>{
 const g=fresh(),p=progress(),o=c.getProgressionCampaignOverview(p);assert.ok(Object.isFrozen(mission));assert.equal(o.total,33);assert.equal(o.maxStars,99);assert.equal(o.chapters.find(c=>c.id==='unlit-roads').total,3);assert.equal(o.nextMissionId,ID);assert.deepEqual(mission.prerequisites,['the-road-we-know']);
 assert.equal(mission.number,24);assert.equal(mission.seed,7307);assert.equal(mission.scenarioRevision,1);assert.equal(g.ruleset.id,RULE);assert.equal(g.map.id,'classic');assert.equal(g.map.revision,1);assert.equal(g.difficulty,'normal');assert.ok(g.ai);assert.deepEqual(g.state.gold,[1100,100]);assert.deepEqual(g.state.income,[7.5,7.5]);assert.deepEqual(g.state.bases.map(b=>b.hp),[6000,6000]);
 assert.deepEqual(mission.playerBuildings,[['barracks',830,0],['barracks',830,1],['barracks',830,2],['mint',410,1]]);assert.deepEqual(mission.enemyBuildings,[['watchtower',2230,0,2],['archery',2370,0],['foundry',2230,1],['barracks',2090,1],['sanctum',2230,2],['archery',2090,2],['mint',2790,1]]);
 assert.deepEqual(c.getCampaignTargets(g,ID).map(t=>[t.name,t.originalId]),[['North Reed Watch',7],['Middle Iron Works',9],['South Ember Hall',11]]);assert.equal(observe(g,0).state.buildings.length,11);assert.equal(g.state.fog,undefined);
 const prior=getRuleset('frontier-campaign-citadel-open');for(const key of Object.keys(prior).filter(k=>!['id','name'].includes(k)))assert.deepEqual(g.ruleset[key],prior[key],key);
 assert.equal(c.getCampaignLaunchMission('the-road-we-know',p).reward,'Unlocks Through the Reed Beds');assert.equal(c.getCampaignMission('the-road-we-know').reward,'Completes the current Unlit Roads route');assert.equal(c.getCampaignMission('false-quiet').reward,'Completes the current Unlit Roads route');
 const locked=structuredClone(p);delete locked.missions['the-road-we-know'];assert.throws(()=>c.createProgressionCampaignMission(ID,locked));assert.equal(c.canUseCampaignRuleset(p,ID,1,RULE),true);assert.equal(c.canUseCampaignRuleset(c.createCampaignProgress(),ID,1,RULE),false);
});
for(const pair of [[0,2],[0,1],[1,2]])test(`any pair ${pair} wins while the third original stands; replacement never restores credit`,()=>{
 const g=fresh(),before=structuredClone(g.serialize());remove(g,[pair[0]]);let r=ev(g);assert.equal(r.completed,false);assert.equal(r.objectives[0].value,1);assert.equal(r.objectives[0].required,2);assert.equal(r.objectives[0].target,3);
 const original=c.getCampaignTargets(fresh(),ID).find(t=>t.lane===pair[0]).building;g.state.buildings.push({...structuredClone(original),id:g.nextId++});assert.equal(ev(g).objectives[0].value,1);remove(g,[pair[1]]);clock(g,400);g.state.bases[0].hp=1;const third=c.getCampaignTargets(g,ID).find(t=>!pair.includes(t.lane));assert.ok(third.building);r=ev(g);assert.equal(r.completed,true);assert.equal(r.stars,1);assert.equal(g.state.bases[1].hp,6000);assert.deepEqual(c.createCampaignRestart(g,ID).serialize(),before);
});
test('core alternate needs no outpost credit; own-core loss and draw take precedence with inclusive bounded deadline',()=>{
 for(const count of [0,1])for(const t of [599.95,600,600.05]){const g=fresh();if(count)remove(g,[0]);clock(g,t);g.state.bases[0].hp=1;g.state.bases[1].hp=0;assert.equal(ev(g).completed,t<=600);assert.equal(ev(g).objectives[0].value,count);for(const winner of [1,'draw']){g.state.winner=winner;assert.equal(ev(g).completed,false);assert.equal(ev(g).failed,true);}g.state.winner=0;g.state.bases[0].hp=0;assert.equal(ev(g).completed,false);}
 for(const t of [599.95,600,600.05]){const g=fresh();remove(g,[0,2]);clock(g,t);assert.equal(ev(g).completed,t<=600);}
 const g=fresh();clock(g,599.95);let ticks=0;g.update=dt=>{g.state.time+=dt;ticks++;};assert.equal(advanceObjectiveBattle(g,.25,ev,600).failed,true);assert.equal(ticks,1);
});
test('destroy-any schema rejects malformed counts, mixed objectives, duplicate/un-authored targets and foreign identity',()=>{
 assert.equal(c.validateDestroyAnyObjective(mission).required,2);
 const changes=[m=>m.objectives[0].required=0,m=>m.objectives[0].required=3,m=>m.objectives[0].required=1.5,m=>m.objectives[0].required='2',m=>delete m.objectives[0].required,m=>m.objectives.push({id:'citadel',type:'citadel',label:'core'}),m=>m.objectives[0].targets[1]={...m.objectives[0].targets[0]},m=>m.objectives[0].targets[0].x=2229,m=>m.objectives[0].targets[0].name='',m=>m.objectives[0].minimumSurvivors=1,m=>m.requiredTargets=2,m=>m.id='the-road-we-know',m=>m.mapId='twin-span',m=>m.mapRevision=2,m=>m.rulesetId='frontier-campaign-citadel-open',m=>m.rulesetRevision=2,m=>m.scenarioRevision=2,m=>m.objectives[0].type='destroy'];
 for(const change of changes){const m=structuredClone(mission);change(m);assert.throws(()=>c.validateDestroyAnyObjective(m));}
});
test('exact admission, active checkpoint continuation, restart, one-star progression and current chapter epilogue',()=>{
 const p=progress(),g=fresh(),identity={ruleset:{id:RULE,revision:1},map:{id:'classic',revision:1},scenario:{kind:'campaign',id:ID,revision:1}};assert.deepEqual(validateBattleIdentity(identity),identity);
 for(const change of [{map:{id:'twin-span',revision:1}},{map:{id:'classic',revision:2}},{ruleset:{id:'frontier-campaign-road-we-know',revision:1}},{ruleset:{id:RULE,revision:2}},{scenario:{kind:'campaign',id:'the-road-we-know',revision:1}},{scenario:{kind:'campaign',id:ID,revision:2}},{scenario:{kind:'skirmish',id:'standard',revision:1}}])assert.throws(()=>validateBattleIdentity({...identity,...change}));
 for(let i=0;i<100;i++)g.update(.05);remove(g,[0]);const encoded=encodeBattle(g,c.campaignScenarioForGame(g,ID),{campaignProgress:p}),restored=decodeBattle(encoded,{campaignProgress:p}).game;assert.deepEqual(restored.serialize(),g.serialize());assert.equal(ev(restored).objectives[0].value,1);g.update(.05);restored.update(.05);assert.deepEqual(restored.serialize(),g.serialize());assert.deepEqual(c.createCampaignRestart(restored,ID).serialize(),fresh().serialize());
 clock(restored,400);restored.state.bases[0].hp=1;remove(restored,[2]);const result=c.recordCampaignResult(p,ID,restored);assert.equal(result.missions[ID].stars,1);for(const [id,row]of Object.entries(p.missions))assert.deepEqual(result.missions[id],row);const o=c.getProgressionCampaignOverview(result);assert.equal(o.nextMissionId,'the-archers-quay');assert.equal(o.chapters.find(c=>c.id==='unlit-roads').completed,true);assert.match(o.chapters.find(c=>c.id==='unlit-roads').epilogue,/coast/);assert.doesNotMatch(o.chapters.find(c=>c.id==='unlit-roads').epilogue,/campaign complete/i);assert.equal(o.chapters.find(ch=>ch.number===8).total,5);assert.throws(()=>c.getCampaignMission('broken-lanterns'));assert.throws(()=>encodeBattle(restored,c.campaignScenarioForGame(restored,ID),{campaignProgress:p}));
});
verifyHistoricalRuntime();
// Historical engine-byte oracle is isolated; descriptor/rules/state assertions below remain current.
test('all actual Road parent descriptors rules initial states raw chapter and engine remain frozen',()=>{
 const f=JSON.parse(readFileSync(new URL('./fixtures/reed-parent-v0280.json',import.meta.url),'utf8')),hash=x=>createHash('sha256').update(typeof x==='string'?x:JSON.stringify(x)).digest('hex');assert.equal(f.baseCommit,'6b6cf964097a815b214933c7e74bb3f23b72d5d5');
 for(const [key,want]of Object.entries(f.descriptors)){const [id,r]=key.split('@');assert.equal(hash(c.getCampaignMission(id,+r)),want,key);}
 for(const [id,want]of Object.entries(f.rules))assert.equal(hash(RULESETS[id]),want,id);
 for(const [key,want]of Object.entries(f.states)){const [ref,variant]=key.split('/'),[id,r]=ref.split('@');assert.equal(hash(c.createCampaignMission(id,{revision:+r,...(variant?{variant}:{})}).serialize()),want,key);}
 assert.equal(hash(c.UNLIT_ROADS_CHAPTER),f.chapter);assert.equal(hash(readFileSync(new URL('dist/engine.js',historicalRoot),'utf8')),f.engineSha256);
});
