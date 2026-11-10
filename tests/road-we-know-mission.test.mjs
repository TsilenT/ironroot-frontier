import {beforeFinalChapterRules} from './historical-catalog.mjs';
import {beforeFinalChapter} from './historical-catalog.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import * as c from '../dist/campaign.js';
import {getRuleset} from '../dist/rulesets.js';
import {observe} from '../dist/fog.js';
import {encodeBattle,decodeBattle,validateBattleIdentity} from '../dist/battle-codec.js';
import {advanceObjectiveBattle} from '../dist/objectives.js';
import {createPolicy} from '../qa/road-we-know/paid-policies.mjs';
const ID='the-road-we-know',RULE='frontier-campaign-road-we-know',fresh=()=>c.createCampaignMission(ID),evaluate=g=>c.evaluateCampaignMission(g,ID);
const progress=()=>({...c.createCampaignProgress(),missions:Object.fromEntries(c.CAMPAIGN_PROGRESS_MISSIONS.filter(beforeFinalChapter).filter(m=>m.id!=='cut-the-bowstrings'&&m.id!=='three-minutes-more'&&m.id!=='cut-the-bowstrings'&&m.id!=='leave-no-road-closed'&&m.id!=='the-empty-purse'&&m.id!=='wake-the-reserve'&&m.id !== 'the-shared-watch' && m.id!=='the-long-screen'&&m.id!=='the-hammer-turns'&&m.id!=='salt-in-the-stores'&&m.id!=='the-archers-quay'&&(m.id!=='cut-the-bowstrings'&&m.id!=='three-minutes-more'&&m.id!==ID&&m.id!=='through-the-reed-beds')).map(m=>[m.id,{completed:true,stars:2,bestTime:60}]))});
const clock=(g,t)=>{g.state.time=t;g.tick=Math.round(t/.05);};
test('second Chapter 7 mission is gated by False Quiet and retains the current full paid rules',()=>{
 const p=progress(),m=c.getCampaignMission(ID),o=c.getProgressionCampaignOverview(p),g=fresh();
 assert.ok(Object.isFrozen(m));assert.equal(o.total,42);assert.equal(o.maxStars,126);assert.equal(o.nextMissionId,ID);assert.equal(o.chapters.find(c=>c.id==='unlit-roads').total,3);assert.deepEqual(m.prerequisites,['false-quiet']);
 assert.equal(c.getCampaignLaunchMission('false-quiet',p).reward,'Unlocks The Road We Know');assert.equal(c.getCampaignMission('false-quiet').reward,'Completes the current Unlit Roads route');
 const locked=structuredClone(p);delete locked.missions['false-quiet'];assert.throws(()=>c.createProgressionCampaignMission(ID,locked));assert.equal(c.canUseCampaignRuleset(c.createCampaignProgress(),ID,1,RULE),false);assert.equal(c.canUseCampaignRuleset(p,ID,1,RULE),true);
 const prior=getRuleset('frontier-campaign-citadel-open');for(const key of Object.keys(prior).filter(k=>!['id','name'].includes(k)))assert.deepEqual(g.ruleset[key],prior[key],key);
 assert.equal(g.map.id,'twin-span');assert.equal(g.difficulty,'normal');assert.ok(g.ai);assert.equal(Object.keys(g.ruleset.buildings).length,8);assert.equal(g.state.buildings.length,10);assert.equal(observe(g,0).state.buildings.filter(b=>b.side===1).length,6);assert.deepEqual(g.state.gold,[1000,120]);assert.deepEqual(g.state.income,[7.5,7.5]);assert.deepEqual(c.getCampaignTargets(g,ID),[]);
});
test('core victory only, survival precedence, bounded deadline and exact campaign identity',()=>{
 for(const t of [599.95,600,600.05]){const g=fresh();clock(g,t);g.state.bases[1].hp=0;g.state.bases[0].hp=1;assert.equal(evaluate(g).completed,t<=600);g.state.bases[0].hp=0;assert.equal(evaluate(g).completed,false);assert.equal(evaluate(g).failed,true);}
 const g=fresh();g.state.buildings=g.state.buildings.filter(b=>b.side===0);assert.equal(evaluate(g).completed,false);clock(g,599.95);let ticks=0;g.update=dt=>{g.state.time+=dt;ticks++;};assert.equal(advanceObjectiveBattle(g,.25,evaluate,600).failed,true);assert.equal(ticks,1);
 const identity={ruleset:{id:RULE,revision:1},map:{id:'twin-span',revision:1},scenario:{kind:'campaign',id:ID,revision:1}};assert.deepEqual(validateBattleIdentity(identity),identity);
 for(const change of [{map:{id:'classic',revision:1}},{ruleset:{id:'frontier-campaign-citadel-open',revision:1}},{scenario:{kind:'campaign',id:'false-quiet',revision:1}},{scenario:{kind:'skirmish',id:'standard',revision:1}}])assert.throws(()=>validateBattleIdentity({...identity,...change}));
});
test('real paid supported routes preserve checkpoint continuation and exact restart',()=>{
 for(const route of ['screened-siege','supported-rootwarden','north-rush']){let g=fresh(),copy=null;const uninterrupted=fresh(),control=createPolicy(route);const initial=g.serialize(),p=progress(),policy=createPolicy(route);let result=evaluate(g),saves=0;
 while(!result.completed&&!result.failed){policy.step(g);control.step(uninterrupted);advanceObjectiveBattle(uninterrupted,.05,evaluate,600);result=advanceObjectiveBattle(g,.05,evaluate,600);if(g.tick%200===0&&!result.completed&&!result.failed){copy=decodeBattle(encodeBattle(g,c.campaignScenarioForGame(g,ID),{campaignProgress:p}),{campaignProgress:p}).game;assert.deepEqual(copy.serialize(),g.serialize());assert.deepEqual(c.createCampaignRestart(copy,ID).serialize(),initial);g=copy;saves++;}}
 assert.deepEqual(g.serialize(),uninterrupted.serialize());assert.deepEqual(result,evaluate(uninterrupted));assert.ok(saves>=3);assert.ok(g.state.stats.built[1]>6);assert.ok(result.completed,route);assert.throws(()=>encodeBattle(g,c.campaignScenarioForGame(g,ID),{campaignProgress:p}));const recorded=c.recordCampaignResult(p,ID,g);assert.equal(c.getProgressionCampaignOverview(recorded).nextMissionId,'through-the-reed-beds');for(const [id,row]of Object.entries(p.missions))assert.deepEqual(recorded.missions[id],row);
 }
});
test('all prior mission and whole ruleset bytes remain exact against the False Quiet parent',async()=>{
 const {createHash}=await import('node:crypto'),{RULESETS}=await import('../dist/rulesets.js');const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
 assert.equal(hash(c.CAMPAIGN_PROGRESS_MISSIONS.filter(beforeFinalChapter).filter(m=>m.id!=='cut-the-bowstrings'&&m.id!=='three-minutes-more'&&m.id!=='cut-the-bowstrings'&&m.id!=='leave-no-road-closed'&&m.id!=='the-empty-purse'&&m.id!=='wake-the-reserve'&&m.id !== 'the-shared-watch' && m.id!=='the-long-screen'&&m.id!=='the-hammer-turns'&&m.id!=='salt-in-the-stores'&&m.id!=='the-archers-quay'&&m.id!=='cut-the-bowstrings'&&m.id!=='three-minutes-more'&&m.id!==ID&&m.id!=='through-the-reed-beds')),'d1c2899f3ff76da02d4afb231e5efe61bbdbf4e764329dda032e7b18eb52f5c8');
 assert.equal(hash(Object.fromEntries(Object.entries(RULESETS).filter(([id])=>beforeFinalChapterRules(id)).filter(([id])=>!['frontier-campaign-bowstrings','frontier-campaign-three-minutes','frontier-campaign-leave-roads','frontier-campaign-empty-purse','frontier-campaign-wake-reserve','frontier-campaign-shared-watch','frontier-campaign-long-screen','frontier-hammer-prototype','frontier-campaign-hammer-turns'].includes(id)&&id!=='frontier-campaign-salt-stores'&&id!=='frontier-campaign-archers-quay'&&id!==RULE&&id!=='frontier-campaign-reed-beds'))),'8145be9199c93f688a8170f92b0185af81608b7e4321516f0de3d5ca1ae30554');
});
