import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {Game,buildSites} from '../../dist/engine.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const output=path.resolve(process.argv[2]||path.join(root,'qa/citadel-playtest/paid-results.json'));
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex');
const sourceFiles=['dist/engine.js','dist/rulesets.js','dist/citadel-options.js','dist/bridge-control.js','qa/citadel-playtest/paid-sample.mjs','qa/citadel-playtest/PLAN.md'];
const report={createdAt:new Date().toISOString(),scope:'Eight engine games; four paired choice comparisons. Native AI, no browser/human claims.',sourceSha256:Object.fromEntries(sourceFiles.map(f=>[f,hash(f)])),cases:[],failures:[]};
function observe(game){
  const actions=[],income=[0,0],spent=[0,0],refunds=[0,0],firstDamage=[null,null],baseDamage=[{},{}],pendingSources=[];
  let source=null;
  for(const name of ['build','upgrade','sell','cast','buyCitadelOption']){
    const original=game[name];game[name]=function(...args){
      const side=args[name==='build'?3:name==='cast'?2:1]??0,beforeGold=this.state.gold[side],beforeKills=this.state.stats.kills[side];
      const b=name==='upgrade'?this.state.buildings.find(b=>b.id===args[0]&&b.side===side):null;
      const cost=name==='build'?this.buildings[args[0]]?.cost:name==='upgrade'&&b?this.upgradeCost(b):name==='cast'?75:name==='buyCitadelOption'?190:0;
      const result=original.apply(this,args);
      if(result.ok){const refund=result.refund??0;spent[side]+=cost;refunds[side]+=refund;actions.push({time:this.state.time,tick:this.tick,side,action:name,args,grossCost:cost,refund,beforeGold,afterGold:this.state.gold[side],immediateBounty:2*(this.state.stats.kills[side]-beforeKills)});}
      return result;
    };
  }
  const fire=game._fire;game._fire=function(attacker,...args){const prev=source;source=attacker.type;try{return fire.call(this,attacker,...args);}finally{source=prev;}};
  const damage=game._damage;game._damage=function(target,amount,side){
    const queued=!!this.damageQueue,before=target.hp;
    const kind=queued?source:pendingSources.length?pendingSources.shift():source;
    if(queued)pendingSources.push(kind);
    const result=damage.call(this,target,amount,side);
    if(!queued&&target.type==='base'&&target.hp<before){const received=target.side;if(firstDamage[received]===null)firstDamage[received]=this.state.time;baseDamage[received][kind??'other']=(baseDamage[received][kind??'other']??0)+before-target.hp;}
    return result;
  };
  return {actions,income,spent,refunds,firstDamage,baseDamage};
}
function snapshot(game){return {time:game.state.time,tick:game.tick,winner:game.state.winner,gold:[...game.state.gold],hp:game.state.bases.map(b=>b.hp),kills:[...game.state.stats.kills],bridgeReceipts:game.state.bridgeControl?.earned??[0,0],citadel:structuredClone(game.state.citadelOptions.sides),production:[0,1].map(side=>game.state.buildings.filter(b=>b.side===side&&game.buildings[b.type].unit).map(b=>({id:b.id,type:b.type,level:b.level,hp:b.hp})))};}
function run(choice,bridge,seed){
  const game=new Game({rulesetId:bridge?'frontier-citadel-bridge-open':'frontier-citadel-open',seed,ai:true,difficulty:'normal'}),ledger=observe(game);
  const result={choice,bridge,seed,rulesetId:game.ruleset.id,openingAttempts:[],supportAttempts:[],purchase:null,horizons:{}};
  for(const [type,x,y] of [['archery',550,450],['mint',270,260]])result.openingAttempts.push({time:game.state.time,type,result:game.build(type,x,y).ok});
  let support=0;
  while(game.tick<9000&&game.state.winner===null){
    if(game.tick===700)result.openingAttempts.push({time:game.state.time,type:'barracks',result:game.build('barracks',690,260).ok});
    if(game.tick===1800){result.purchase={before:snapshot(game),result:game.buyCitadelOption(choice),after:snapshot(game)};}
    if(game.tick>=2600&&(game.tick-2600)%800===0){const type=['archery','barracks','foundry'][support++%3],site=buildSites(game.map,0).find(p=>game.canBuild(type,p.x,p.y).ok);const r=site?game.build(type,site.x,site.y):{ok:false,reason:'No affordable legal site'};result.supportAttempts.push({time:game.state.time,type,site,result:{ok:r.ok,reason:r.reason??null}});}
    for(const side of [0,1])ledger.income[side]+=(5+game.state.buildings.filter(b=>b.side===side&&b.type==='mint'&&b.hp>0).reduce((n,b)=>n+2.5*(1+.5*(b.level-1)),0))*.05;
    game.update(.05);
    if([1800,3600,6000,9000].includes(game.tick))result.horizons[Math.round(game.tick*.05)]=snapshot(game);
  }
  // Retain assigned cases that end before eligibility instead of dropping them.
  if(result.purchase===null)result.purchase={before:snapshot(game),result:game.buyCitadelOption(choice),after:snapshot(game),earlyEnded:true};
  result.final=snapshot(game);result.ongoingBound=game.state.winner===null;result.ledger={...ledger,bounties:game.state.stats.kills.map(k=>2*k),residual:[0,1].map(side=>420+ledger.income[side]+2*game.state.stats.kills[side]+(game.state.bridgeControl?.earned[side]??0)+ledger.refunds[side]-ledger.spent[side]-game.state.gold[side])};
  for(const [side,residual]of result.ledger.residual.entries())assert.ok(Math.abs(residual)<1e-6,`Side ${side} ledger residual ${residual}`);
  assert.ok(result.ledger.actions.filter(a=>a.action==='cast').every(a=>a.grossCost===75));
  assert.deepEqual(Game.restore(game.serialize()).serialize(),game.serialize());
  return result;
}
for(const bridge of [false,true])for(const seed of [17,91])for(const choice of ['arrows','regen']){
  try{const result=run(choice,bridge,seed);report.cases.push(result);console.log(JSON.stringify({choice,bridge,seed,time:result.final.time,winner:result.final.winner,purchase:result.purchase.result,healed:result.final.citadel.map(c=>c.healedTotal),shots:result.final.citadel.map(c=>c.extraShots)}));}
  catch(error){report.failures.push({choice,bridge,seed,error:error.stack});}
  fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');
}
if(report.failures.length){console.error(JSON.stringify(report.failures,null,2));process.exitCode=1;}
