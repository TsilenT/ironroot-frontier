import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {Game,RULESETS} from '../dist/engine.js';
import {FALSE_QUIET_RULESET_IDS} from '../dist/rulesets.js';
import * as c from '../dist/campaign.js';
import {observe} from '../dist/fog.js';
import {encodeBattle,decodeBattle,identityOf} from '../dist/battle-codec.js';
import {advanceObjectiveBattle} from '../dist/objectives.js';
import {createPolicy} from '../qa/false-quiet/paid-policies.mjs';
const ID='false-quiet',fresh=variant=>c.createCampaignMission(ID,{variant}),evalMission=g=>c.evaluateCampaignMission(g,ID);
function progress(){return c.normalizeCampaignProgress({...c.createCampaignProgress(),missions:Object.fromEntries(c.CAMPAIGN_PROGRESS_MISSIONS.filter(m=>m.id!==ID).map(m=>[m.id,{completed:true,stars:2,bestTime:60}]))});}
function remove(g){const t=c.getCampaignTargets(g,ID)[0];g.state.buildings=g.state.buildings.filter(b=>b.id!==t.originalId);return t;}
const clock=(g,time)=>{g.state.time=time;g.tick=Math.round(time/.05);};

test('False Quiet adds exactly one Chapter 7 mission and two immutable layout identities',()=>{
 const p=progress(),old=structuredClone(p),m=c.getCampaignMission(ID),o=c.getProgressionCampaignOverview(p);
 assert.equal(o.total,26);assert.equal(o.maxStars,78);assert.equal(o.nextMissionId,ID);assert.equal(o.chapters.at(-1).number,7);assert.deepEqual(o.chapters.at(-1).total,2);
 assert.deepEqual(m.prerequisites,['a-river-between-us']);assert.equal(c.getCampaignLaunchMission('a-river-between-us',p).reward,'Unlocks False Quiet');assert.ok(Object.isFrozen(m));assert.deepEqual(p,old);
 for(const [i,variant]of ['a','b'].entries()){const g=fresh(variant);assert.equal(g.ruleset.id,FALSE_QUIET_RULESET_IDS[i]);assert.equal(g.ai,true);assert.equal(g.difficulty,'normal');assert.equal(g.ruleset.endgame.forcedDecay,false);assert.equal(c.getCampaignRevisionForRuleset(ID,g.ruleset.id),1);assert.equal(c.canUseCampaignRuleset(p,ID,1,g.ruleset.id),true);assert.equal(c.canUseCampaignRuleset(c.createCampaignProgress(),ID,1,g.ruleset.id),false);}
 assert.throws(()=>fresh('c'));assert.throws(()=>fresh('__proto__'));assert.throws(()=>c.createCampaignMission('lanterns-on-the-water',{variant:'b'}));
});

test('layout selection is fresh-only; Restart preserves selection and returns exact authored state',()=>{
 const random=Math.random;try{let calls=0;Math.random=()=>{calls++;return .1;};const a=c.createCampaignMission(ID);assert.equal(a.ruleset.id,FALSE_QUIET_RULESET_IDS[0]);assert.equal(calls,1);Math.random=()=>{calls++;return .9;};const b=c.createCampaignMission(ID);assert.equal(b.ruleset.id,FALSE_QUIET_RULESET_IDS[1]);assert.equal(calls,2);for(const g of [a,b]){const initial=g.serialize();for(let i=0;i<200;i++)g.update(.05);assert.deepEqual(c.createCampaignRestart(g,ID).serialize(),initial);}assert.equal(calls,2);}finally{Math.random=random;}
});

test('layout differences are ordinary authored producers and have identical charted original identity',()=>{
 const a=fresh('a'),b=fresh('b');assert.deepEqual(a.state.buildings.map(v=>[v.id,v.x,v.lane]),b.state.buildings.map(v=>[v.id,v.x,v.lane]));
 for(const g of [a,b]){assert.deepEqual(g.state.gold,[1000,120]);assert.deepEqual(g.state.income,[7.5,7.5]);assert.equal(g.state.buildings.length,12);assert.equal(g.state.units.length,0);assert.equal(observe(g,0).state.bases[1].hp,null);assert.equal(observe(g,0).state.buildings.filter(v=>v.side===1).length,0);const [t]=c.getCampaignTargets(g,ID);assert.equal(t.x,2230);assert.equal(t.lane,1);assert.equal(t.name,'Middle Road Fort');assert.equal(t.building.type,'watchtower');assert.equal(t.building.level,2);}
 assert.deepEqual(c.getCampaignTargets(a,ID).map(t=>[t.originalId,t.type,t.x,t.lane]),c.getCampaignTargets(b,ID).map(t=>[t.originalId,t.type,t.x,t.lane]));
 assert.equal(a.state.buildings.some(v=>v.side===1&&v.type==='aerie'),false);assert.equal(b.state.buildings.filter(v=>v.side===1&&v.type==='aerie').length,2);
});

test('one original fort or core wins at one HP; replacements do not revoke victory; loss and deadline take precedence',()=>{
 for(const variant of ['a','b'])for(const route of ['fort','core']){const g=fresh(variant);clock(g,600);g.state.bases[0].hp=1;if(route==='fort'){const t=remove(g);g._place(t.type,t.x,g.map.lanes[t.lane],1);}else g.state.bases[1].hp=0;assert.equal(evalMission(g).completed,true);clock(g,600.05);assert.equal(evalMission(g).completed,false);assert.equal(evalMission(g).failed,true);clock(g,500);g.state.bases[0].hp=0;assert.equal(evalMission(g).completed,false);assert.equal(evalMission(g).failed,true);}
 const g=fresh('a');clock(g,599.95);let ticks=0;g.update=dt=>{g.state.time+=dt;ticks++;remove(g);};assert.equal(advanceObjectiveBattle(g,.25,evalMission,600).completed,true);assert.equal(ticks,1);
});

test('real paid five-second routes remain deterministic across admitted saved checkpoints for both layouts',()=>{
 const p=progress();for(const variant of ['a','b']){let g=fresh(variant),policy=createPolicy('direct-rush-5s'),nextSave=10,saves=0,enemyPurchases=0;const initialEnemy=g.state.stats.built[1];let outcome=evalMission(g);
 while(!outcome.completed&&!outcome.failed){policy.step(g);outcome=advanceObjectiveBattle(g,.05,evalMission,600);if(g.state.time>=nextSave&&!outcome.completed&&!outcome.failed){const original=g.serialize();g=decodeBattle(encodeBattle(g,c.campaignScenarioForGame(g,ID),{campaignProgress:p}),{campaignProgress:p}).game;assert.deepEqual(g.serialize(),original);nextSave+=10;saves++;}}
 assert.equal(outcome.completed,true);assert.ok(g.state.stats.built[1]>initialEnemy);assert.ok(saves>=4);const recorded=c.recordCampaignResult(p,ID,g);assert.equal(recorded.missions[ID].completed,true);for(const [id,row]of Object.entries(p.missions))assert.deepEqual(recorded.missions[id],row);assert.equal(c.getProgressionCampaignOverview(recorded).completed,false);assert.throws(()=>encodeBattle(g,c.campaignScenarioForGame(g,ID),{campaignProgress:p}));}
});
