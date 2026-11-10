import test from 'node:test';import assert from 'node:assert/strict';import * as c from '../dist/campaign.js';import {advanceObjectiveBattle} from '../dist/objectives.js';import {encodeBattle,decodeBattle} from '../dist/battle-codec.js';import {instrumentEconomy,verifyPlayerCadence} from '../qa/salt-stores/economy.mjs';import {demolitionPolicy} from './bowstrings-policy.mjs';
const ID='cut-the-bowstrings';const progress=()=>({...c.createCampaignProgress(),missions:Object.fromEntries(c.CAMPAIGN_PROGRESS_MISSIONS.filter(m=>m.id!==ID).map(m=>[m.id,{completed:true,stars:1,bestTime:60}]))});
test('ordinary paid mixed air/ground route destroys both original bows before the enemy core, with exact restore and paid ledgers',()=>{
 const g=c.createCampaignMission(ID),policy=demolitionPolicy(),economy=instrumentEconomy(g),originals=c.getCampaignTargets(g,ID).map(t=>t.originalId),openingFlyers=g.state.units.map(u=>u.id),shots=[];
 const fire=g._fire;g._fire=function(attacker,target,damage,...rest){shots.push({attacker:attacker.id,type:attacker.type,target:target.id,damage});return fire.call(this,attacker,target,damage,...rest);};
 let outcome=c.evaluateCampaignMission(g,ID),shadow=null,left=0,checked=false;const commands=[];
 while(!outcome.completed&&!outcome.failed){const command=policy(g);if(command){assert.equal(command.ok,true,JSON.stringify(command));commands.push({tick:g.tick,...command});}outcome=advanceObjectiveBattle(g,.05,x=>c.evaluateCampaignMission(x,ID),600);economy.reconcile();
  if(shadow&&left>0){shadow.update(.05);assert.deepEqual(shadow.serialize(),g.serialize());left--;}
  if(g.tick===601){shadow=decodeBattle(encodeBattle(g,c.campaignScenarioForGame(g,ID),{campaignProgress:progress()}),{campaignProgress:progress()}).game;assert.equal(shadow.ruleset,g.ruleset);assert.deepEqual(shadow.serialize(),g.serialize());left=5;checked=true;}
  assert.ok(g.tick<=12000);
 }
 assert.equal(outcome.completed,true);assert.equal(outcome.objectives[0].met,true);assert.ok(c.getCampaignTargets(g,ID).every(t=>!t.building));assert.ok(g.state.bases[1].hp>0,'this must be a primary-target win, not an incidental core win');assert.equal(g.state.bases[0].hp,6000);assert.ok(g.state.time<180);assert.equal(commands.length,8);assert.ok(checked&&left===0);assert.equal(verifyPlayerCadence(economy.ledger.transactions),8);assert.deepEqual(economy.ledger.maxError,[0,0]);assert.ok(g.state.stats.built[1]>6);
 assert.ok(shots.some(s=>s.type==='gryphon'&&originals.includes(s.target)),'ordinary flyers actually attack the named original targets');assert.ok(shots.some(s=>openingFlyers.includes(s.attacker)),'the initial company participates in ordinary combat');
});
