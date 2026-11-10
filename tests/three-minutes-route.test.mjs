import test from 'node:test';import assert from 'node:assert/strict';
import * as c from '../dist/campaign.js';import {getRuleset,supportsAutonomousAir} from '../dist/engine.js';
import {encodeBattle,decodeBattle} from '../dist/battle-codec.js';import {advanceObjectiveBattle} from '../dist/objectives.js';
import {instrumentEconomy,verifyPlayerCadence} from '../qa/salt-stores/economy.mjs';import {survivalPolicy} from './three-minutes-policy.mjs';
const ID='three-minutes-more';
const progress=()=>({...c.createCampaignProgress(),missions:Object.fromEntries(c.CAMPAIGN_PROGRESS_MISSIONS.filter(m=>m.id!==ID).map(m=>[m.id,{completed:true,stars:1,bestTime:60}]))});
test('ordinary paid rear defense reaches primary180s on the unchanged authored opening',()=>{
 const g=c.createCampaignMission(ID),policy=survivalPolicy(),ledger=instrumentEconomy(g),commands=[];let outcome=c.evaluateCampaignMission(g,ID),shadow=null,remaining=0,checked=false;
 while(!outcome.completed&&!outcome.failed){
  const command=policy(g);if(command){assert.equal(command.ok,true,JSON.stringify(command));commands.push({tick:g.tick,...command});}
  outcome=advanceObjectiveBattle(g,.05,x=>c.evaluateCampaignMission(x,ID),180);ledger.reconcile();
  if(shadow&&remaining>0){shadow.update(.05);assert.deepEqual(shadow.serialize(),g.serialize());remaining--;}
  if(g.tick===1201){shadow=decodeBattle(encodeBattle(g,c.campaignScenarioForGame(g,ID),{campaignProgress:progress()}),{campaignProgress:progress()}).game;assert.equal(shadow.ruleset,getRuleset(g.ruleset.id));assert.equal(supportsAutonomousAir(shadow.ruleset),true);assert.deepEqual(shadow.serialize(),g.serialize());remaining=5;checked=true;}
  assert.ok(g.tick<=3600);
 }
 assert.equal(outcome.completed,true);assert.equal(outcome.objectives[0].met,true);assert.equal(g.tick,3600);assert.ok(Math.abs(g.state.time-180)<1e-7);assert.deepEqual(g.state.bases.map(b=>b.hp),[6000,6000]);assert.ok(checked&&remaining===0);
 assert.ok(commands.some(c=>c.action==='volley'));assert.ok(commands.some(c=>c.action==='citadel'));assert.ok(commands.every((c,i)=>i===0||c.tick-commands[i-1].tick>=100));
 assert.ok(verifyPlayerCadence(ledger.ledger.transactions)>0);assert.ok(ledger.ledger.maxError.every(e=>e<1e-6));assert.ok(g.state.stats.built[1]>6,'ordinary paid adaptive enemy developed');
});
