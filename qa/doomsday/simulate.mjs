import {writeFileSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {createDoomsday,describeDoomsday,evaluateDoomsday,DOOMSDAY_VARIANTS} from './scenario.mjs';
import {createPolicy,describePolicy,POLICY_IDS} from './policies.mjs';
import {observeRun,summarize} from '../last-ascent/simulate.mjs';

export const PACES=Object.freeze({
  burst:{startDelay:0,decisionSeconds:1,maxActions:Infinity},
  paced:{startDelay:3,decisionSeconds:2,maxActions:1},
  delayed:{startDelay:10,decisionSeconds:3,maxActions:1}
});
export function runDoomsday({variant='doomsday-hard',policy='distributed',seed=101,cap=720,pace='paced'}={}){
  if(!Object.hasOwn(PACES,pace))throw new RangeError(`Unknown pace: ${pace}`);
  if(!Number.isFinite(cap)||cap<=0||cap>7200)throw new RangeError('Invalid observation cap.');
  const game=createDoomsday({variant,seed}),timing=policy==='adaptive'?{startDelay:3,decisionSeconds:4}:PACES[pace];
  const pilot=createPolicy(policy,timing),observer=observeRun(game,{variant:'supply-road',policy:'manual',seed});
  // Reuse the previous neutral ledger observer. Formations/costs are identical;
  // only ordinary difficulty differs. Replace identity, not observed outcomes.
  Object.assign(observer.result,{variant,policy,pace,policyPlan:{...describePolicy(policy),...timing,maxActions:timing.maxActions===Infinity?'unlimited':timing.maxActions}});
  while(game.state.time<cap-1e-8&&evaluateDoomsday(game)==='running'){
    pilot.step(game);observer.beforeStep();game.update(.05);observer.afterStep();if(game.limitReason)break;
  }
  return observer.finish(cap);
}
const digest=path=>createHash('sha256').update(readFileSync(new URL(path,import.meta.url))).digest('hex');
export function sourceHashes(){return Object.fromEntries(['../../dist/engine.js','../../dist/rulesets.js','./scenario.mjs','./policies.mjs','./simulate.mjs','../last-ascent/scenario.mjs','../last-ascent/simulate.mjs'].map(path=>[path,digest(path)]));}
export function summarizeDoomsday(runs){
  const groups=summarize(runs.map(r=>({...r,policy:`${r.policy}/${r.pace}`})));
  for(const [key,g] of Object.entries(groups)){
    const rows=runs.filter(r=>`${r.variant}/${r.policy}/${r.pace}`===key),wins=rows.filter(r=>r.outcome==='won');
    g.playerHPOnWins=wins.map(r=>r.finalHP[0]);g.enemyHPOnLosses=rows.filter(r=>r.outcome==='lost').map(r=>r.finalHP[1]);
    g.playerBuildingLosses=rows.map(r=>r.losses.filter(l=>l.side===0).length);
    g.enemyMineLossTimes=rows.map(r=>r.mineLossConsequences.filter(l=>l.side===1).map(l=>l.time));
  }
  return groups;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const args=Object.fromEntries(process.argv.slice(2).map(a=>{const [k,...v]=a.replace(/^--/,'').split('=');return[k,v.join('=')];}));
  const variants=(args.variants??DOOMSDAY_VARIANTS.join(',')).split(','),policies=(args.policies??POLICY_IDS.join(',')).split(','),seeds=(args.seeds??'101,202,303').split(',').map(Number),paces=(args.paces??'paced').split(','),runs=[];
  for(const variant of variants)for(const pace of paces)for(const policy of policies)for(const seed of seeds){
    const r=runDoomsday({variant,pace,policy,seed,cap:Number(args.cap??720)});runs.push(r);
    console.log(`${variant} ${pace} ${policy} ${seed}: ${r.outcome} ${r.duration}s HP ${r.finalHP.join('/')} ledger ${r.ledgerMaxError.join('/')}`);
    if(args.out)writeFileSync(args.out,runs.map(r=>JSON.stringify(r)).join('\n')+'\n');
  }
  const report={sourceHashes:sourceHashes(),setup:DOOMSDAY_VARIANTS.map(variant=>describeDoomsday({variant})),runs:runs.length,seeds,paces,groups:summarizeDoomsday(runs)};
  if(args.summary)writeFileSync(args.summary,JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report.groups,null,2));
}
