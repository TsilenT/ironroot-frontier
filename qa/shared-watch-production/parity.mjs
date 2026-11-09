/** Actual admitted factory/evaluator versus unchanged validated QA mechanics.
 * Known-seed compatibility only. No new balance matrix or old-approval bypass. */
import assert from 'node:assert/strict';
import {Game} from '../../dist/engine.js';
import * as c from '../../dist/campaign.js';
import {advanceObjectiveBattle} from '../../dist/objectives.js';
import {instrumentEconomy,verifyPlayerCadence} from '../salt-stores/economy.mjs';
import {createPrototype,createPolicy,evaluatePrototype} from '../shared-watch/prototype.mjs';
export const ID='the-shared-watch',RULE='frontier-campaign-shared-watch';
export const KNOWN_SEEDS=Object.freeze([8405,2573958384,556468347,3946224910,1954583465,4266584889]);
export function prerequisites(){return {...c.createCampaignProgress(),missions:Object.fromEntries(c.CAMPAIGN_PROGRESS_MISSIONS.filter(m=>m.id!==ID).map(m=>[m.id,{completed:true,stars:1,bestTime:60}]))};}
export function productionParity({policy,seed=8405,donorCommands=[]}={}){
 assert.ok(KNOWN_SEEDS.includes(seed),'Known production compatibility seed only');assert.ok(['central-watch','distributed-mobile','central-archery-control'].includes(policy));
 const production=c.createCampaignMission(ID,{seed}),oracle=createPrototype({seed}),p=createPolicy(policy,{donorCommands}),q=createPolicy(policy,{donorCommands}),ledger=instrumentEconomy(production),initial=production.serialize(),checkpoints=[],shadows=[];let steps=0,lastPaid=null;
 const evaluate=g=>c.evaluateCampaignMission(g,ID),compare=()=>{const expected=oracle.serialize();expected.rulesetId=RULE;assert.deepEqual(production.serialize(),expected,`${policy}/${seed}/tick${production.tick}: full state including effects`);};compare();
 while(!evaluate(production).completed&&!evaluate(production).failed){
  assert.ok(++steps<=12002,'Bounded production case');const row=p.step(production),other=q.step(oracle);assert.deepEqual(row,other,'Identical paid policy result');
  if(row?.ok&&!row.omitted){lastPaid={state:production.serialize(),time:production.state.time,tick:production.tick};}
  for(const shadow of shadows)if(row&&!row.omitted){const a=row.action,b=shadow.game.state.buildings.find(b=>b.side===0&&b.type===a.type&&b.x===a.x&&b.lane===a.lane&&b.level===a.fromLevel),r=a.method==='build'?shadow.game.build(a.type,a.x,shadow.game.map.lanes[a.lane],0):b?shadow.game.upgrade(b.id,0):{ok:false};assert.equal(r.ok,row.ok);}
  advanceObjectiveBattle(production,.05,evaluate,600);advanceObjectiveBattle(oracle,.05,evaluatePrototype,600);compare();assert.deepEqual([evaluate(production).completed,evaluate(production).failed],[evaluatePrototype(oracle).completed,evaluatePrototype(oracle).failed]);
  for(let i=shadows.length-1;i>=0;i--){const shadow=shadows[i];advanceObjectiveBattle(shadow.game,.05,evaluate,600);assert.deepEqual(shadow.game.serialize(),production.serialize());shadow.receipt.continuationTicks++;if(--shadow.remaining===0)shadows.splice(i,1);}
  for(const at of [30,90])if(!checkpoints.some(x=>x.at===at)&&production.state.time>=at-1e-7){const receipt={at,state:production.serialize(),continuationTicks:0};checkpoints.push(receipt);if(!evaluate(production).completed&&!evaluate(production).failed){const envelope=c.campaignScenarioForGame(production,ID);assert.deepEqual(envelope,{kind:'campaign',id:ID,revision:1});shadows.push({game:Game.restore(receipt.state),remaining:10,receipt});}}
 }
 const final=production.serialize(),economy=ledger.snapshot();verifyPlayerCadence(economy.transactions);assert.deepEqual(Game.restore(final).serialize(),final);assert.ok(economy.maxError.every(n=>n<=1e-6));
 // A real no-further-purchase continuation supports an honestly labelled native fixture.
 if(lastPaid){const tail=Game.restore(lastPaid.state);while(!evaluate(tail).completed&&!evaluate(tail).failed)advanceObjectiveBattle(tail,.05,evaluate,600);assert.deepEqual(tail.serialize(),final,'Last-paid natural continuation');}
 return {scope:'Known production factory/evaluator parity, not new validation or human balance',policy,seed,initial,final,commands:p.applied,ledger:economy,checkpoints,lastPaid,outcome:evaluate(production),duration:production.state.time,hp:production.state.bases.map(b=>b.hp)};
}
