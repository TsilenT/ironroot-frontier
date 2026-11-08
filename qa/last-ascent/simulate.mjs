import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { createLastAscent, describeLastAscent, evaluateLastAscent, DEFAULT_VARIANT } from './scenario.mjs';
import { createPolicy, describePolicyPlan, POLICY_IDS } from './policies.mjs';
const round=n=>Math.round(n*1e5)/1e5;
const rounded=v=>Array.isArray(v)?v.map(rounded):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).map(([k,n])=>[k,rounded(n)])):typeof v==='number'?round(v):v;

/** Observer only: wrappers record actual successful engine transactions/damage. */
export function observeRun(game,{variant=DEFAULT_VARIANT,policy='manual',seed,traceEvery=15}={}) {
  const d=describeLastAscent({variant}),s=game.state;
  const result={variant,policy,seed,policyPlan:POLICY_IDS.includes(policy)?describePolicyPlan(policy,game):null,startingInvestment:d.startingInvestment,startingGold:[...s.gold],startingHP:s.bases.map(b=>b.hp),firstContact:null,firstCoreDamage:[null,null],firstStructureLoss:[null,null],minHP:s.bases.map(b=>b.hp),baseExposureSeconds:[0,0],grossIncome:[0,0],mineIncome:[0,0],killGold:[0,0],refunds:[0,0],spending:[0,0],spendingByKind:[{},{}],purchases:[],losses:[],initialMines:s.buildings.filter(b=>b.type==='mint').map(b=>({id:b.id,side:b.side})),trace:[],ledgerMaxError:[0,0]};
  for(const method of ['build','upgrade','cast','sell','buyCitadelOption']){
    const original=game[method];
    game[method]=function(...args){
      const side=method==='build'?(args[3]??0):method==='cast'?(args[2]??0):(args[1]??0);
      const before=this.state.gold[side],killsBefore=this.state.stats.kills[side],oldBuilding=['upgrade','sell'].includes(method)?this.state.buildings.find(b=>b.id===args[0]):null;
      const out=original.apply(this,args);
      if(out.ok){
        const delta=before-this.state.gold[side]+2*(this.state.stats.kills[side]-killsBefore);
        if(delta>=0){result.spending[side]+=delta;result.spendingByKind[side][method]=(result.spendingByKind[side][method]??0)+delta;}else result.refunds[side]-=delta;
        result.purchases.push({time:this.state.time,side,method,type:out.building?.type??oldBuilding?.type??(method==='cast'?'volley':args[0]),cost:delta,id:out.building?.id??oldBuilding?.id??null});
      }
      return out;
    };
  }
  const damage=game._damage;
  game._damage=function(target,amount,side){
    const hp=target.hp;damage.call(this,target,amount,side);
    if(target.hp<hp){
      if(result.firstContact===null)result.firstContact={time:this.state.time,attackingSide:side,targetType:target.type,x:target.x,y:target.y};
      if(target.type==='base'&&result.firstCoreDamage[target.side]===null)result.firstCoreDamage[target.side]=this.state.time;
      if(target.hp<=0&&this.buildings[target.type]){
        if(result.firstStructureLoss[target.side]===null)result.firstStructureLoss[target.side]=this.state.time;
        result.losses.push({time:this.state.time,id:target.id,type:target.type,side:target.side,invested:target.invested,level:target.level,x:target.x,lane:target.lane,treasuryAtLoss:this.state.gold[target.side],incomeAfterLoss:5+this.state.buildings.filter(b=>b.side===target.side&&b.type==='mint'&&b.hp>0).reduce((n,b)=>n+2.5*(1+.5*(b.level-1)),0)});
      }
    }
  };
  let nextTrace=0;
  const snapshot=()=>({time:s.time,hp:s.bases.map(b=>b.hp),gold:[...s.gold],income:[...s.income],mines:[0,1].map(side=>s.buildings.filter(b=>b.side===side&&b.type==='mint').map(b=>({id:b.id,level:b.level,hp:b.hp}))),buildings:[0,1].map(side=>s.buildings.filter(b=>b.side===side).length),units:[0,1].map(side=>s.units.filter(u=>u.side===side).length),spending:[...result.spending],grossIncome:[...result.grossIncome],mineIncome:[...result.mineIncome],killGold:[...result.killGold],overtime:s.overtime});
  return {result,beforeStep(){
    for(const side of [0,1]){
      const mine=s.buildings.filter(b=>b.side===side&&b.type==='mint'&&b.hp>0).reduce((n,b)=>n+2.5*(1+.5*(b.level-1)),0);
      result.grossIncome[side]+=(5+mine)*.05;result.mineIncome[side]+=mine*.05;
      if(s.units.some(u=>u.side!==side&&u.hp>0&&Math.hypot(u.x-s.bases[side].x,u.y-s.bases[side].y)<310))result.baseExposureSeconds[side]+=.05;
    }
  },afterStep(){
    for(const side of [0,1]){
      result.minHP[side]=Math.min(result.minHP[side],s.bases[side].hp);result.killGold[side]=2*s.stats.kills[side];
      const expected=result.startingGold[side]+result.grossIncome[side]+result.killGold[side]+result.refunds[side]-result.spending[side];
      result.ledgerMaxError[side]=Math.max(result.ledgerMaxError[side],Math.abs(expected-s.gold[side]));
    }
    if(s.time+1e-8>=nextTrace){result.trace.push(snapshot());nextTrace+=traceEvery;}
  },finish(cap){
    result.trace.push(snapshot());const outcome=evaluateLastAscent(game);
    return rounded({...result,mineLossConsequences:result.losses.filter(l=>l.type==='mint').map(l=>({...l,spendingAfter:result.purchases.filter(p=>p.side===l.side&&p.time>=l.time&&p.cost>0).reduce((sum,p)=>sum+p.cost,0),purchasesAfter:result.purchases.filter(p=>p.side===l.side&&p.time>=l.time&&p.cost>0).length})),minimumMineFundedSpending:[0,1].map(side=>Math.max(0,result.spending[side]-result.startingGold[side]-5*s.time-result.killGold[side]-result.refunds[side])),outcome:outcome==='running'?'stall':outcome,censored:outcome==='running',capSeconds:cap,duration:s.time,finalHP:s.bases.map(b=>b.hp),finalGold:[...s.gold],finalIncome:[...s.income],finalBuildings:[0,1].map(side=>s.buildings.filter(b=>b.side===side).map(b=>({id:b.id,type:b.type,level:b.level,hp:b.hp,x:b.x,lane:b.lane}))),initialMinesLost:result.initialMines.filter(m=>!s.buildings.some(b=>b.id===m.id)),citadelOptions:s.citadelOptions,killCount:[...s.stats.kills],damage:[...s.stats.damage]});
  }};
}
export function runLastAscent({variant=DEFAULT_VARIANT,policy='supported-race',seed=101,cap=720,traceEvery=15}={}) {
  const game=createLastAscent({variant,seed}),pilot=createPolicy(policy),observer=observeRun(game,{variant,policy,seed,traceEvery});
  while(game.state.time<cap-1e-8&&evaluateLastAscent(game)==='running'){
    pilot.step(game);observer.beforeStep();game.update(.05);observer.afterStep();
    if(game.limitReason)break;
  }
  return observer.finish(cap);
}
export function summarize(runs){
  const groups={};for(const r of runs){const key=`${r.variant}/${r.policy}`,g=groups[key]??={runs:0,won:0,lost:0,draw:0,stall:0,durations:[],finalPlayerHP:[],enemyMinesLost:[],firstContact:[],maxLedgerError:0};g.runs++;g[r.outcome]++;g.durations.push(r.duration);g.finalPlayerHP.push(r.finalHP[0]);g.enemyMinesLost.push(r.initialMinesLost.filter(m=>m.side===1).length);g.firstContact.push(r.firstContact?.time);g.maxLedgerError=Math.max(g.maxLedgerError,...r.ledgerMaxError);}
  return groups;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const args=Object.fromEntries(process.argv.slice(2).map(arg=>{const [k,...v]=arg.replace(/^--/,'').split('=');return[k,v.join('=')];}));
  const variants=(args.variants??DEFAULT_VARIANT).split(','),policies=(args.policies??POLICY_IDS.join(',')).split(','),seeds=(args.seeds??'101,202,303').split(',').map(Number),cap=Number(args.cap??720),runs=[];
  for(const variant of variants)for(const policy of policies)for(const seed of seeds){const run=runLastAscent({variant,policy,seed,cap});runs.push(run);console.log(`${variant} ${policy} seed=${seed}: ${run.outcome} ${run.duration}s HP ${run.finalHP.join('/')} first contact ${run.firstContact?.time} gold error ${run.ledgerMaxError.join('/')}`);if(args.out)writeFileSync(args.out,runs.map(v=>JSON.stringify(v)).join('\n')+'\n');}
  const summary=summarize(runs);if(args.summary)writeFileSync(args.summary,JSON.stringify(summary,null,2)+'\n');console.log(JSON.stringify(summary,null,2));
}
