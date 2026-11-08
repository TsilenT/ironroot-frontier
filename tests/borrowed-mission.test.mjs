import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, buildSites } from '../dist/engine.js';
import { createCampaignMission, createCampaignRestart, createCampaignProgress, CAMPAIGN_MISSIONS, getCampaignMission, getCampaignTargets, evaluateCampaignMission, getProgressionCampaignOverview, getCampaignLaunchMission, normalizeCampaignProgress, recordCampaignResult, getCampaignRevisionForRuleset, canUseCampaignRuleset } from '../dist/campaign.js';
import { BORROWED_GROUND_RULESET_ID, LANTERNS_RULESET_ID, ONE_SIGNAL_RULESET_ID } from '../dist/rulesets.js';
import { advanceObjectiveBattle } from '../dist/objectives.js';
import { encodeBattle, decodeBattle, scenarioForBattle } from '../dist/battle-codec.js';
import { isProtectedCampaignBuilding } from '../dist/protected-objectives.js';
import { createPolicy } from '../qa/borrowed-ground/paid-policies.mjs';
import { createBorrowed, describeBorrowed } from '../qa/borrowed-ground/scenario.mjs';
import { runBorrowed } from '../qa/borrowed-ground/simulate.mjs';
const ID='borrowed-ground',fresh=()=>createCampaignMission(ID),evaluate=g=>evaluateCampaignMission(g,ID);
function progress(){const p=createCampaignProgress();for(const m of CAMPAIGN_MISSIONS)p.missions[m.id]={completed:true,stars:1,bestTime:60};for(const [id,time]of [['shared-crossing',180],['one-signal-is-enough',210],['lanterns-on-the-water',180]])p.missions[id]={completed:true,stars:1,bestTime:time};return normalizeCampaignProgress(p);}
function remove(g,index){const target=getCampaignTargets(g,ID)[index];g.state.buildings=g.state.buildings.filter(b=>b.id!==target.originalId);return target;}
function clock(g,time){g.state.time=time;g.tick=Math.round(time/.05);}
test('Borrowed Ground is an additive immutable full-roster mission with exact normal adaptive identity',()=>{
 const m=getCampaignMission(ID),g=fresh(),p=progress();assert.ok(Object.isFrozen(m));assert.equal(m.rulesetId,BORROWED_GROUND_RULESET_ID);assert.equal(m.mapId,'borrowed-yard');assert.equal(m.timeLimit,600);assert.equal(m.ai,true);assert.equal(m.difficulty,'normal');assert.equal(g.ruleset.endgame.forcedDecay,false);assert.equal(Object.keys(g.buildings).length,8);assert.equal(g.state.fog,undefined);assert.deepEqual(m.prerequisites,['lanterns-on-the-water']);
 assert.equal(getCampaignRevisionForRuleset(ID,BORROWED_GROUND_RULESET_ID),1);for(const wrong of [LANTERNS_RULESET_ID,ONE_SIGNAL_RULESET_ID,'frontier-campaign-citadel-open'])assert.throws(()=>getCampaignRevisionForRuleset(ID,wrong));assert.equal(canUseCampaignRuleset(p,ID,1,BORROWED_GROUND_RULESET_ID),true);assert.equal(canUseCampaignRuleset(createCampaignProgress(),ID,1,BORROWED_GROUND_RULESET_ID),false);
 const overview=getProgressionCampaignOverview(p);assert.equal(overview.total,24);assert.equal(overview.maxStars,72);assert.equal(overview.nextMissionId,ID);assert.equal(getCampaignMission('lanterns-on-the-water').reward,'Completes the current Chapter 6 route');assert.equal(getCampaignLaunchMission('lanterns-on-the-water',p).reward,'Unlocks Borrowed Ground');assert.equal(getCampaignLaunchMission(ID,p).reward,'Unlocks A River Between Us');
});
test('production matches the paid legal setup and explicitly describes twelve shared-rule plots',()=>{
 const d=describeBorrowed(),m=getCampaignMission(ID),g=fresh(),qa=createBorrowed();assert.deepEqual(g.serialize(),qa.serialize());assert.deepEqual(m.playerBuildings,d.playerBuildings);assert.deepEqual(m.enemyBuildings,d.enemyBuildings);assert.deepEqual(g.state.gold,d.startingGold);assert.deepEqual(g.state.income,d.startingIncome);assert.deepEqual(d.startingInvestment,[1620,1495]);
 assert.deepEqual([0,1].map(side=>g.state.buildings.filter(b=>b.side===side).length),[9,8]);assert.equal(buildSites(g.map,0).length,12);const own=g.state.buildings.filter(b=>b.side===0);assert.deepEqual(buildSites(g.map,0).filter(p=>!own.some(b=>b.x===p.x&&b.y===p.y)).map(p=>[p.x,p.lane]),[[410,0],[690,1],[410,2]]);
 const text=m.briefing.join('\n');assert.match(text,/twelve per side/);assert.match(text,/only occupy the marked plots/);assert.match(text,/not protected objectives/);assert.match(text,/half the invested gold/);assert.match(text,/10:00/);assert.match(text,/1 HP is enough/);assert.match(text,/5:00/);assert.match(text,/1\.65/);assert.match(text,/1\.75/);assert.match(text,/32 to 18/);
});
test('starting towers can be kept, upgraded or salvaged at the ordinary refund without objective failure',()=>{
 for(const action of ['upgrade','sell','loss']){const g=fresh(),tower=g.state.buildings.find(b=>b.side===0&&b.type==='watchtower');assert.deepEqual(getCampaignTargets(g,ID).filter(t=>t.kind==='protect'),[]);assert.equal(isProtectedCampaignBuilding(g,ID,tower.id),false);const gold=g.state.gold[0];if(action==='upgrade'){assert.ok(g.upgrade(tower.id).ok);assert.equal(gold-g.state.gold[0],154);assert.equal(tower.x,1250);}else if(action==='sell'){const r=g.sell(tower.id);assert.equal(r.refund,110);assert.equal(g.state.gold[0]-gold,110);assert.ok(g.build('barracks',tower.x,tower.y).ok);}else g.state.buildings=g.state.buildings.filter(b=>b!==tower);assert.equal(evaluate(g).failed,false);}
 const g=fresh(),tower=g.state.buildings.find(b=>b.side===0&&b.type==='watchtower');tower.hp=500;assert.equal(g.sell(tower.id).refund,55);
});
test('only the two original roadblocks count; enemy upgrades and replacements do not erase credit',()=>{
 const g=fresh(),initial=getCampaignTargets(g,ID);assert.deepEqual(initial.map(t=>[t.name,t.originalId]),[['North Roadblock',12],['South Roadblock',13]]);g.state.gold[1]=1000;assert.ok(g.upgrade(initial[0].originalId,1).ok);assert.equal(evaluate(g).objectives[0].value,0);const first=remove(g,0);assert.equal(evaluate(g).objectives[0].value,1);assert.ok(g.build('watchtower',first.x,g.map.lanes[first.lane],1).ok);assert.equal(evaluate(g).objectives[0].value,1);remove(g,1);assert.equal(evaluate(g).completed,true);assert.equal(g.state.winner,null);
});
test('either victory route accepts one own HP and own loss takes precedence',()=>{
 for(const route of ['posts','citadel']){const g=fresh();g.state.bases[0].hp=1;if(route==='posts'){remove(g,0);remove(g,1);}else g.state.bases[1].hp=0;assert.equal(evaluate(g).completed,true);g.state.bases[0].hp=0;assert.equal(evaluate(g).completed,false);assert.equal(evaluate(g).failed,true);}
});
test('ten-minute deadline uses the final allowed tick and accepts same-tick objectives but not simultaneous own loss',()=>{
 for(const finish of ['none','posts','both-cores']){const g=fresh();clock(g,599.95);let ticks=0;g.update=dt=>{ticks++;g.state.time+=dt;if(finish==='posts'){remove(g,0);remove(g,1);}if(finish==='both-cores')g.state.bases.forEach(b=>b.hp=0);};const result=advanceObjectiveBattle(g,.25,evaluate,600);assert.equal(ticks,1);assert.equal(g.state.time,600);assert.equal(result.completed,finish==='posts');assert.equal(result.failed,finish!=='posts');}
});
test('Borrowed Ground rejects post-deadline objective/core credit without changing same-tick victory',()=>{
 for(const route of ['posts','citadel'])for(const time of [600,600.05]){const g=fresh();clock(g,time);if(route==='posts'){remove(g,0);remove(g,1);}else g.state.bases[1].hp=0;assert.equal(evaluate(g).completed,time===600);assert.equal(evaluate(g).failed,time>600);}
});
test('one-roadblock checkpoint restores, restart rebuilds exact camp, and a one-star victory advances',()=>{
 const p=progress(),g=fresh();remove(g,0);const copy=decodeBattle(encodeBattle(g,scenarioForBattle(null,ID,g),{campaignProgress:p}),{campaignProgress:p}).game;assert.deepEqual(copy.serialize(),g.serialize());assert.equal(evaluate(copy).objectives[0].value,1);assert.deepEqual(createCampaignRestart(copy,ID).serialize(),fresh().serialize());clock(copy,300);copy.state.bases[0].hp=1;remove(copy,1);const result=recordCampaignResult(p,ID,copy);assert.equal(result.missions[ID].stars,1);assert.equal(getProgressionCampaignOverview(result).completed,false);assert.equal(getProgressionCampaignOverview(result).nextMissionId,'a-river-between-us');assert.throws(()=>encodeBattle(copy,scenarioForBattle(null,ID,copy),{campaignProgress:p}));
});
test('paid keep/core and selective-salvage/roadblock victories survive actual profile-admitted restores',()=>{
 for(const [policyId,seed,time,remaining]of [['keep-mass',719,155.4,1],['selective-salvage',6401,194.45,0]]){let g=fresh();g.seed=seed;const policy=createPolicy(policyId),p=progress();let nextSave=15,saves=0,outcome=evaluate(g);while(!outcome.completed&&!outcome.failed){policy.step(g);outcome=advanceObjectiveBattle(g,.05,evaluate,600);if(g.state.time>=nextSave&&!outcome.completed&&!outcome.failed){const prior=g.serialize();g=decodeBattle(encodeBattle(g,scenarioForBattle(null,ID,g),{campaignProgress:p}),{campaignProgress:p}).game;assert.deepEqual(g.serialize(),prior);nextSave+=15;saves++;}}assert.equal(outcome.completed,true,policyId);assert.ok(Math.abs(g.state.time-time)<1e-6);assert.equal(getCampaignTargets(g,ID).filter(t=>t.building).length,remaining);assert.equal(g.state.bases[0].hp,6000);assert.ok(saves>=10);assert.ok(g.state.stats.built[1]>8);assert.equal(g.state.buildings.some(b=>b.side===0&&b.type==='wardenLodge'),false);assert.equal(g.state.citadelOptions.sides[0].choice,null);}
});
test('production selective route matches every paid transaction and enforces independent ledgers and five-second commands',()=>{
 const qa=runBorrowed({policy:'selective-salvage',seed:6401}),production=runBorrowed({policy:'selective-salvage',seed:6401,production:true});assert.deepEqual(production,qa);assert.equal(qa.outcome,'won');assert.equal(qa.route,'original-roadblocks');assert.deepEqual(qa.refunds,[220,0]);assert.ok(qa.ledgerMaxError.every(e=>e<1e-6));assert.ok(qa.maxBuildings.every(n=>n<=12));assert.ok(qa.enemyPurchases>=10);assert.equal(qa.policyDecisions.salvaged.length,2);assert.deepEqual(Game.restore(fresh().serialize()).serialize(),fresh().serialize());
});
