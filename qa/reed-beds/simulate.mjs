import {writeFileSync,readFileSync,mkdirSync,realpathSync} from 'node:fs';
import {pathToFileURL,fileURLToPath} from 'node:url';
import path from 'node:path';
import {evaluateCampaignMission,getCampaignTargets} from '../../dist/campaign.js';
import {advanceObjectiveBattle} from '../../dist/objectives.js';
import {observe} from '../../dist/fog.js';
import {createPolicy,POLICY_IDS} from './paid-policies.mjs';
import {instrumentEconomy,verifyPlayerCadence} from './economy.mjs';
import {ID,BASELINE,exactScenario,hash} from './scenario.mjs';
export const VALIDATION_PLAN=Object.freeze({developmentSeeds:[7307,719,51017,424242],heldOutSeeds:[982451,620231],policies:[...POLICY_IDS],historicalEvidenceReused:false,scope:'Fresh production-engine paid feasibility only; not human difficulty or native UI evidence.'});
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const harnessFiles=['qa/reed-beds/paid-policies.mjs','qa/reed-beds/economy.mjs','qa/reed-beds/scenario.mjs','qa/reed-beds/simulate.mjs'];
const combatFiles=['dist/engine.js','dist/rulesets.js','dist/objectives.js','dist/fog.js','dist/autonomous-air.js','dist/citadel-options.js'];
export function fingerprint(){return {policySha256:hash(readFileSync(path.join(root,harnessFiles[0]),'utf8')),harnessHashes:Object.fromEntries(harnessFiles.map(f=>[f,hash(readFileSync(path.join(root,f),'utf8'))])),combatHashes:Object.fromEntries(combatFiles.map(f=>[f,hash(readFileSync(path.join(root,f),'utf8'))])),formationSha256:exactScenario().formationSha256};}
export function freezePlan(){const frozen={status:'frozen-before-held-out-runs',frozenAt:new Date().toISOString(),baseline:BASELINE,...VALIDATION_PLAN,...fingerprint(),formation:exactScenario().formation};writeFileSync(path.join(root,'qa/reed-beds/VALIDATION_PLAN.json'),JSON.stringify(frozen,null,2)+'\n');return frozen;}
export function verifyFrozen(){const plan=JSON.parse(readFileSync(path.join(root,'qa/reed-beds/VALIDATION_PLAN.json'),'utf8')),now=fingerprint();for(const key of Object.keys(now))if(JSON.stringify(plan[key])!==JSON.stringify(now[key]))throw Error('Frozen input changed: '+key);return plan;}
export function runReedBeds({policy='outer-pair',seed=7307,cap=600,onStep=null}={}){
 if(!Number.isSafeInteger(seed)||seed<0||seed>0xffffffff)throw RangeError('Seed must be uint32');
 const {game,mission,formationSha256}=exactScenario(),s=game.state;game.seed=seed;
 const player=createPolicy(policy),economy=instrumentEconomy(game),result={policy,seed,rulesetId:game.ruleset.id,scenario:ID,mapId:game.map.id,production:true,formationSha256,
 startingInvestment:[mission.playerBuildings,mission.enemyBuildings].map(bs=>bs.reduce((n,[type,,,level=1])=>n+game.buildings[type].cost+Array.from({length:level-1},(_,i)=>Math.round(game.buildings[type].cost*(.7+.35*i))).reduce((a,b)=>a+b,0),0)),firstContact:null,firstCoreDamage:[null,null],buildingLosses:[],targetLosses:[],trace:[]};
 const damage=game._damage;game._damage=function(target,amount,side){const hp=target.hp;const output=damage.call(this,target,amount,side);if(target.hp<hp){if(result.firstContact===null)result.firstContact={time:s.time,side,type:target.type,x:target.x,lane:target.lane??null};if(target.type==='base'&&result.firstCoreDamage[target.side]===null)result.firstCoreDamage[target.side]=s.time;if(target.hp<=0&&this.buildings[target.type])result.buildingLosses.push({time:s.time,side:target.side,type:target.type,x:target.x,lane:target.lane,id:target.id});}return output;};
 const lost=new Set();let outcome=evaluateCampaignMission(game,ID),nextTrace=0;
 const targetState=()=>getCampaignTargets(game,ID).map(t=>({name:t.name,type:t.type,lane:t.lane,originalId:t.originalId,alive:!!t.building,hp:t.building?.hp??0}));
 const capture=()=>({time:s.time,hp:s.bases.map(b=>b.hp),gold:[...s.gold],income:[...s.income],targets:targetState(),buildings:[0,1].map(side=>s.buildings.filter(b=>b.side===side).length)});
 result.trace.push(capture());nextTrace=15;
 while(!outcome.completed&&!outcome.failed&&s.time<cap-1e-8){
  player.step(game);outcome=advanceObjectiveBattle(game,.05,g=>evaluateCampaignMission(g,ID),mission.timeLimit);economy.reconcile();
  for(const t of targetState())if(!t.alive&&!lost.has(t.originalId)){lost.add(t.originalId);result.targetLosses.push({time:s.time,...t});}
  if(s.time+1e-7>=nextTrace){const v=observe(game,0);if(v.state.bases[1].hp!==s.bases[1].hp)throw Error('Clear-view observation lost');result.trace.push(capture());nextTrace+=15;}
  if(onStep)onStep({game,outcome,economy,policy:player});
 }
 const ledger=economy.snapshot(),playerPurchases=verifyPlayerCadence(ledger.transactions),dead=targetState().filter(t=>!t.alive);
 return {...result,outcome:outcome.completed?'won':outcome.failed?'lost':'censored',route:outcome.completed?(s.bases[1].hp<=0?'enemy-citadel':dead.map(t=>t.type).join('+')):outcome.failed?(s.bases[0].hp<=0?'player-citadel':'deadline'):null,duration:s.time,finalHP:s.bases.map(b=>b.hp),finalGold:[...s.gold],finalStats:structuredClone(s.stats),finalTargets:targetState(),objective:structuredClone(outcome),ledger,playerPurchases,enemyPurchases:ledger.transactions.filter(t=>t.side===1).length};
}
export function summarize(runs){return Object.fromEntries(POLICY_IDS.map(policy=>{const g=runs.filter(r=>r.policy===policy);return[policy,{games:g.length,wins:g.filter(r=>r.outcome==='won').length,runs:g.map(r=>({seed:r.seed,outcome:r.outcome,route:r.route,duration:r.duration,hp:r.finalHP,targetsDestroyed:r.targetLosses.map(t=>t.type),spending:r.ledger.spending,enemyPurchases:r.enemyPurchases,maxLedgerError:Math.max(...r.ledger.maxError)}))}];}));}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const args=Object.fromEntries(process.argv.slice(2).map(a=>{const [k,...v]=a.replace(/^--/,'').split('=');return[k,v.length?v.join('='):true];}));
 if(args.freeze){console.log(JSON.stringify(freezePlan(),null,2));process.exit(0);}
 const held=!!args['held-out'],plan=held?verifyFrozen():null,seeds=(args.seeds??(held?VALIDATION_PLAN.heldOutSeeds:VALIDATION_PLAN.developmentSeeds).join(',')).split(',').map(Number),policies=(args.policies??POLICY_IDS.join(',')).split(',');
 if(seeds.some(seed=>VALIDATION_PLAN.heldOutSeeds.includes(seed))&&!held)throw Error('Held-out seeds require --held-out and frozen inputs');
 if(held&&seeds.some(seed=>!VALIDATION_PLAN.heldOutSeeds.includes(seed)))throw Error('Unexpected held-out seed');
 if(!args.out)throw Error('Use --out with an external raw receipt path');
 const out=path.resolve(args.out),ancestor=path.dirname(out);mkdirSync(ancestor,{recursive:true});const resolved=path.join(realpathSync(ancestor),path.basename(out));if(resolved===root||resolved.startsWith(root+path.sep))throw Error('Raw receipts must remain outside source');
 const runs=[],start=new Date().toISOString(),fp=fingerprint();
 for(const policy of policies)for(const seed of seeds){const run=runReedBeds({policy,seed,cap:Number(args.cap??600)});runs.push(run);writeFileSync(out,runs.map(r=>JSON.stringify(r)).join('\n')+'\n');console.log(`${policy} seed=${seed}: ${run.outcome} route=${run.route} ${run.duration.toFixed(2)}s HP=${run.finalHP.map(n=>n.toFixed(2)).join('/')} paid=${run.playerPurchases}/${run.enemyPurchases}`);}
 if(held)verifyFrozen();
 const raw=readFileSync(out),summary={scope:VALIDATION_PLAN.scope,generatedAt:new Date().toISOString(),startedAt:start,baseline:BASELINE,...fp,plan:plan??VALIDATION_PLAN,heldOut:held,totalRuns:runs.length,raw:{sha256:hash(raw.toString('utf8')),bytes:raw.length,filename:path.basename(out)},results:summarize(runs)};
 if(args.summary)writeFileSync(args.summary,JSON.stringify(summary,null,2)+'\n');console.log(JSON.stringify({runs:runs.length,heldOut:held,rawSha256:summary.raw.sha256}));
}
