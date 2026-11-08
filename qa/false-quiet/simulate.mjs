import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { observe } from '../../dist/fog.js';
import { createFalseQuiet, describeFalseQuiet, evaluateFalseQuiet, DEFAULT_VARIANT, FALSE_QUIET_SEEDS } from './scenario.mjs';
import { createPolicy, describePolicy, POLICY_IDS } from './paid-policies.mjs';
const rounded=value=>Array.isArray(value)?value.map(rounded):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).map(([k,v])=>[k,rounded(v)])):typeof value==='number'?Math.round(value*1e6)/1e6:value;
/** Observation may read truth for validation; no measurements flow back into policy. */
export function runFalseQuiet({variant=DEFAULT_VARIANT,policy='scout-adapt',seed=FALSE_QUIET_SEEDS[0],cap=600,production=false}={}){
  const game=createFalseQuiet({variant,seed,production}),s=game.state,description=describeFalseQuiet({variant}),player=createPolicy(policy);
  const result={variant,policy,seed,rulesetId:game.ruleset.id,policyPlan:describePolicy(policy),startingInvestment:description.startingInvestment,startingGold:[...s.gold],firstContact:null,firstVisibleEnemy:null,firstCoreDamage:[null,null],firstLoss:[null,null],postLosses:[],grossIncome:[0,0],killGold:[0,0],refunds:[0,0],spending:[0,0],ledgerMaxError:[0,0],transactions:[],trace:[]};
  for(const method of ['build','upgrade','cast','sell','buyCitadelOption']){
    const original=game[method];game[method]=function(...args){
      const side=method==='build'?(args[3]??0):method==='cast'?(args[2]??0):(args[1]??0),gold=s.gold[side],kills=s.stats.kills[side],prior=['upgrade','sell'].includes(method)?s.buildings.find(b=>b.id===args[0]):null;
      const output=original.apply(this,args);
      if(output.ok){const spent=gold-s.gold[side]+2*(s.stats.kills[side]-kills);if(spent>=0)result.spending[side]+=spent;else result.refunds[side]-=spent;result.transactions.push({time:s.time,side,method,type:output.building?.type??prior?.type??(method==='cast'?'volley':args[0]),cost:spent,id:output.building?.id??prior?.id??null,x:output.building?.x??prior?.x??null,lane:output.building?.lane??prior?.lane??null});}
      return output;
    };
  }
  const damage=game._damage;game._damage=function(target,amount,side){
    const hp=target.hp;damage.call(this,target,amount,side);
    if(target.hp<hp){
      if(result.firstContact===null)result.firstContact={time:s.time,side,targetType:target.type,x:target.x,lane:target.lane??null};
      if(target.type==='base'&&result.firstCoreDamage[target.side]===null)result.firstCoreDamage[target.side]=s.time;
      if(target.hp<=0&&this.buildings[target.type]){
        if(result.firstLoss[target.side]===null)result.firstLoss[target.side]={time:s.time,type:target.type,x:target.x,lane:target.lane};
        const post=game.falseQuiet.posts.find(p=>p.id===target.id);if(post)result.postLosses.push({id:post.id,name:post.name,time:s.time});
      }
    }
  };
  let outcome=evaluateFalseQuiet(game),nextTrace=0;
  while(outcome.outcome==='running'&&s.time<cap-1e-8){
    player.step(game);
    for(const side of [0,1])result.grossIncome[side]+=.05*(5+s.buildings.filter(b=>b.side===side&&b.type==='mint'&&b.hp>0).reduce((n,b)=>n+2.5*(1+.5*(b.level-1)),0));
    game.update(.05);
    const view=observe(game,0);if(result.firstVisibleEnemy===null&&[...view.state.buildings,...view.state.units].some(e=>e.side===1))result.firstVisibleEnemy=s.time;
    for(const side of [0,1]){result.killGold[side]=2*s.stats.kills[side];const expected=result.startingGold[side]+result.grossIncome[side]+result.killGold[side]+result.refunds[side]-result.spending[side];result.ledgerMaxError[side]=Math.max(result.ledgerMaxError[side],Math.abs(expected-s.gold[side]));}
    if(s.time>=nextTrace){result.trace.push({time:s.time,hp:s.bases.map(b=>b.hp),gold:[...s.gold],income:[...s.income],spending:[...result.spending],buildings:[0,1].map(side=>s.buildings.filter(b=>b.side===side).length),units:[0,1].map(side=>s.units.filter(u=>u.side===side).length)});nextTrace+=15;}
    outcome=evaluateFalseQuiet(game);
  }
  if(result.ledgerMaxError.some(e=>e>1e-6))throw new Error(`Paid economy ledger mismatch: ${result.ledgerMaxError}`);
  return rounded({...result,...outcome,outcome:outcome.outcome==='running'?'censored':outcome.outcome,duration:s.time,finalHP:s.bases.map(b=>b.hp),finalGold:[...s.gold],policyDecisions:player.report(),casualties:[s.stats.kills[1],s.stats.kills[0]],enemyPurchases:result.transactions.filter(t=>t.side===1).length});
}
export function summarize(runs){return Object.fromEntries([...new Set(runs.map(r=>`${r.variant}/${r.policy}`))].map(key=>{const group=runs.filter(r=>`${r.variant}/${r.policy}`===key);return [key,{games:group.length,wins:group.filter(r=>r.outcome==='won').length,outcomes:group.map(r=>r.outcome),routes:group.map(r=>r.route),duration:group.map(r=>r.duration),playerHP:group.map(r=>r.finalHP[0]),spending:group.map(r=>r.spending),enemyPurchases:group.map(r=>r.enemyPurchases),firstContact:group.map(r=>r.firstContact?.time),firstVisibleEnemy:group.map(r=>r.firstVisibleEnemy),maxLedgerError:Math.max(...group.flatMap(r=>r.ledgerMaxError))}];}));}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const args=Object.fromEntries(process.argv.slice(2).map(a=>{const [key,...value]=a.replace(/^--/,'').split('=');return [key,value.join('=')];}));
  const variants=(args.variants??DEFAULT_VARIANT).split(','),policies=(args.policies??POLICY_IDS.filter(p=>p!=='idle').join(',')).split(','),seeds=(args.seeds??FALSE_QUIET_SEEDS.join(',')).split(',').map(Number),runs=[];
  for(const variant of variants)for(const policy of policies)for(const seed of seeds){const run=runFalseQuiet({variant,policy,seed,cap:Number(args.cap??600),production:args.production==='true'});runs.push(run);console.log(`${variant} ${policy} seed=${seed}: ${run.outcome}/${run.route} ${run.duration}s HP=${run.finalHP.join('/')} paid=${run.spending.join('/')} enemy purchases=${run.enemyPurchases}`);if(args.out)writeFileSync(args.out,runs.map(r=>JSON.stringify(r)).join('\n')+'\n');}
  console.log(JSON.stringify(summarize(runs),null,2));
}
