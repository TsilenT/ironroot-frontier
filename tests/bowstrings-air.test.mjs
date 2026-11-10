/** Synthetic registered interaction, not an additional strategy attempt. */
import test from 'node:test';import assert from 'node:assert/strict';import * as c from '../dist/campaign.js';import {Game,getRuleset,supportsAutonomousAir} from '../dist/engine.js';import {encodeBattle,decodeBattle} from '../dist/battle-codec.js';
const ID='cut-the-bowstrings',progress=()=>({...c.createCampaignProgress(),missions:Object.fromEntries(c.CAMPAIGN_PROGRESS_MISSIONS.filter(m=>m.id!==ID).map(m=>[m.id,{completed:true,stars:1,bestTime:60}]))});
test('actual inherited flyer acquires adjacent-road enemy and retains physical combat and exact RNG through both restore paths',()=>{
 const g=c.createCampaignMission(ID);g.state.buildings=c.getCampaignTargets(g,ID).map(t=>t.building);g.state.income=[5,5];g.state.units=g.state.units.slice(0,1);g.aiTimer=30;const flyer=g.state.units[0];g._spawn({type:'wardenLodge',side:1,lane:1,x:flyer.x+150,level:1});const target=g.state.units.at(-1),hp=target.hp;
 g.update(.05);assert.equal(flyer.airTargetId,target.id);g.update(.017);assert.ok(g.accumulator>0);const snapshot=g.serialize(),identity=c.campaignScenarioForGame(g,ID);
 const restored=[Game.restore(snapshot),decodeBattle(encodeBattle(g,identity,{campaignProgress:progress()}),{campaignProgress:progress()}).game];
 for(const r of restored){assert.equal(r.ruleset,getRuleset('frontier-campaign-bowstrings'));assert.equal(supportsAutonomousAir(r.ruleset),true);assert.deepEqual(r.serialize(),snapshot);assert.equal(r.state.units[0].airTargetId,target.id);}
 for(let i=0;i<80;i++){g.update(.05);for(const r of restored){r.update(.05);assert.deepEqual(r.serialize(),g.serialize());}}
 assert.ok(g.state.units.find(u=>u.id===target.id).hp<hp);assert.equal(g.state.units[0].hp,125);assert.ok(g.state.units[0].y>g.map.lanes[0]+30);assert.ok(g.state.time<5);
});
