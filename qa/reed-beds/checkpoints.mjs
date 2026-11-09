import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {getCampaignTargets} from '../../dist/campaign.js';
import {encodeBattle,decodeBattle,scenarioForBattle} from '../../dist/battle-codec.js';
import {runReedBeds} from './simulate.mjs';
import {ID,hash} from './scenario.mjs';
/** Portable summaries only. Caller supplies admitted prerequisite progress for battle-codec round trips. */
export function paidCheckpoints({campaignProgress,policy='outer-pair',seed=7307,onCheckpoint=null}={}){
 const checkpoints={};
 const run=runReedBeds({policy,seed,onStep({game,outcome,economy}){
  if(outcome.completed||outcome.failed)return;
  const targets=getCampaignTargets(game,ID),destroyed=targets.filter(t=>!t.building).length;
  const alive=targets.filter(t=>t.building).sort((a,b)=>a.building.hp-b.building.hp);
  const name=!checkpoints['paid-opening']&&game.state.time>=25-1e-7?'paid-opening':!checkpoints['one-target']&&destroyed===1?'one-target':!checkpoints['terminal-near']&&destroyed===1&&alive[0]?.building.hp<=150?'terminal-near':null;
  if(!name)return;
  const battle=campaignProgress?encodeBattle(game,scenarioForBattle(null,ID,game),{campaignProgress}):null;
  if(battle){const restored=decodeBattle(battle,{campaignProgress}).game;assert.deepEqual(restored.serialize(),game.serialize());}
  const ledger=economy.snapshot(),summary={policy,seed,time:game.state.time,rulesetId:game.ruleset.id,originalTargets:targets.map(t=>({name:t.name,originalId:t.originalId,type:t.type,lane:t.lane,alive:!!t.building,hp:t.building?.hp??0})),cores:game.state.bases.map(b=>b.hp),gold:[...game.state.gold],paidActions:ledger.transactions.filter(t=>t.side===0&&t.cost>0).length,spending:ledger.spending,grossIncome:ledger.grossIncome,killGold:ledger.killGold,maxLedgerError:ledger.maxError,battleSha256:battle?hash(battle):null};
  checkpoints[name]=summary;if(onCheckpoint)onCheckpoint({name,game,battle,summary,ledger});
 }});
 assert.equal(run.outcome,'won');assert.ok(checkpoints['terminal-near'],'must capture an active near-target-completion checkpoint');
 return {scope:'Fresh ordinary paid-engine checkpoint summaries, not browser-earned wins. Near-terminal means one original destroyed and another original at ≤150 HP; evaluator remains active.',mission:ID,checkpoints,completion:{route:run.route,time:run.duration,cores:run.finalHP}};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const result=paidCheckpoints();if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));}
