import {writeFileSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {createCampaignMission,evaluateCampaignMission,getCampaignMission} from '../../dist/campaign.js';
import {advanceObjectiveBattle} from '../../dist/objectives.js';
import {observe} from '../../dist/fog.js';
import {createPolicy,POLICY_IDS} from './paid-policies.mjs';
import {instrumentEconomy,verifyPlayerCadence} from './economy.mjs';
const ID='the-road-we-know';
const rounded=v=>Array.isArray(v)?v.map(rounded):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).map(([k,x])=>[k,rounded(x)])):typeof v==='number'?Math.round(v*1e6)/1e6:v;
export const VALIDATION_PLAN=Object.freeze({developmentSeeds:[7301,719,51017,424242],heldOutSeeds:[98317,620219],policies:[...POLICY_IDS],notes:'Policies frozen before these fresh runs. Two newly selected held-out seeds are reported separately; earlier historical seeds are not held out.'});
export function runRoadWeKnow({policy='broad-novice',seed=7301,cap=600}={}){
 if(!Number.isSafeInteger(seed)||seed<0||seed>0xffffffff)throw RangeError('Seed must be uint32');
 const game=createCampaignMission(ID),s=game.state;game.seed=seed;
 const player=createPolicy(policy),economy=instrumentEconomy(game),mission=getCampaignMission(ID);
 const result={policy,seed,rulesetId:game.ruleset.id,scenario:ID,mapId:game.map.id,production:true,
  startingInvestment:[mission.playerBuildings,mission.enemyBuildings].map(bs=>bs.reduce((n,[type,,,level=1])=>n+game.buildings[type].cost*(level===2?1.7:1),0)),
  firstContact:null,firstCoreDamage:[null,null],buildingLosses:[],trace:[]};
 const damage=game._damage;game._damage=function(target,amount,side){const hp=target.hp;damage.call(this,target,amount,side);if(target.hp<hp){if(result.firstContact===null)result.firstContact={time:s.time,side,type:target.type,x:target.x,lane:target.lane??null};if(target.type==='base'&&result.firstCoreDamage[target.side]===null)result.firstCoreDamage[target.side]=s.time;if(target.hp<=0&&this.buildings[target.type])result.buildingLosses.push({time:s.time,side:target.side,type:target.type,x:target.x,lane:target.lane,id:target.id});}};
 let outcome=evaluateCampaignMission(game,ID),nextTrace=0;
 while(!outcome.completed&&!outcome.failed&&s.time<cap-1e-8){
  player.step(game);economy.accrue(.05);outcome=advanceObjectiveBattle(game,.05,g=>evaluateCampaignMission(g,ID),600);economy.reconcile();
  if(s.time>=nextTrace){const v=observe(game,0);if(v.state.bases[1].hp!==s.bases[1].hp)throw Error('Clear-view observation lost');result.trace.push({time:s.time,hp:s.bases.map(b=>b.hp),gold:[...s.gold],income:[...s.income],buildings:[0,1].map(side=>s.buildings.filter(b=>b.side===side).length)});nextTrace+=15;}
 }
 const ledger=economy.snapshot();verifyPlayerCadence(ledger.transactions);
 const report=rounded({...result,outcome:outcome.completed?'won':outcome.failed?'lost':'censored',route:outcome.completed?'enemy-citadel':outcome.failed?(s.bases[0].hp<=0?'player-citadel':'deadline'):null,duration:s.time,finalHP:s.bases.map(b=>b.hp),finalGold:[...s.gold],ledger,enemyPurchases:ledger.transactions.filter(t=>t.side===1).length});
 // Retain the actual detached action-time numbers and floating-point error bounds.
 report.ledger=ledger;return report;
}
export function summarize(runs){return Object.fromEntries(POLICY_IDS.map(p=>{const g=runs.filter(r=>r.policy===p);return [p,{games:g.length,wins:g.filter(r=>r.outcome==='won').length,runs:g.map(r=>({seed:r.seed,outcome:r.outcome,duration:r.duration,hp:r.finalHP,spending:r.ledger.spending,enemyPurchases:r.enemyPurchases,maxLedgerError:Math.max(...r.ledger.maxError)}))}];}));}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const args=Object.fromEntries(process.argv.slice(2).map(a=>{const [key,...v]=a.replace(/^--/,'').split('=');return[key,v.join('=')];}));const seeds=(args.seeds??[...VALIDATION_PLAN.developmentSeeds,...VALIDATION_PLAN.heldOutSeeds].join(',')).split(',').map(Number),policies=(args.policies??POLICY_IDS.join(',')).split(','),runs=[];
 const policySha256=createHash('sha256').update(readFileSync(new URL('./paid-policies.mjs',import.meta.url))).digest('hex');
 for(const policy of policies)for(const seed of seeds){const run=runRoadWeKnow({policy,seed,cap:Number(args.cap??600)});runs.push(run);console.log(`${policy} seed=${seed}: ${run.outcome} ${run.duration}s HP=${run.finalHP.join('/')} enemy purchases=${run.enemyPurchases}`);if(args.out)writeFileSync(args.out,runs.map(r=>JSON.stringify(r)).join('\n')+'\n');}
 const summary={scope:'Fresh production-engine paid feasibility; not human difficulty or native UI evidence.',generatedAt:new Date().toISOString(),policySha256,plan:VALIDATION_PLAN,totalRuns:runs.length,development:summarize(runs.filter(r=>VALIDATION_PLAN.developmentSeeds.includes(r.seed))),heldOut:summarize(runs.filter(r=>VALIDATION_PLAN.heldOutSeeds.includes(r.seed)))};
 if(args.summary)writeFileSync(args.summary,JSON.stringify(summary,null,2)+'\n');console.log(JSON.stringify({runs:runs.length,policySha256}));
}
