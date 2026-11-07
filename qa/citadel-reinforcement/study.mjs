import assert from 'node:assert/strict';
import {writeFileSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import {CitadelGame, CONTRACT} from './prototype.mjs';
import {worldX} from '../../dist/engine.js';
const DIR='qa/citadel-reinforcement/';
const hash=x=>createHash('sha256').update(x).digest('hex');
const round=x=>Math.round(x*1e6)/1e6;
const starting=()=>({initial:420,base:0,mine:0,bridge:0,bounty:0,spent:0,refund:0,maxResidual:0});
function attach(g, prior) {
  const m=prior?structuredClone(prior):{ledgers:[starting(),starting()],actions:[],firstDamage:[null,null],spawned:[0,0],baseDamage:[0,0],decay:[0,0],purchases:[null,null],checkpoints:[]};
  g.metrics=m;
  for(const method of ['build','upgrade','cast','sell','reinforce']) {
    const original=g[method].bind(g);
    g[method]=(...args)=>{
      const side=method==='reinforce'?(args[0]??0):method==='build'?(args[3]??0):method==='cast'?(args[2]??0):(args[1]??0);
      const before={gold:g.state.gold[side],hp:g.state.bases[side]?.hp,maxHp:g.state.bases[side]?.maxHp};
      const result=original(...args);
      const after={gold:g.state.gold[side],hp:g.state.bases[side]?.hp,maxHp:g.state.bases[side]?.maxHp};
      if(result.ok){const delta=before.gold-after.gold;if(delta>=0)m.ledgers[side].spent+=delta;else m.ledgers[side].refund-=delta;}
      // Native AI tries many rejected coordinates; retain successful purchases,
      // all reinforce attempts and final scripted rejections, not search noise.
      if(result.ok||method==='reinforce')m.actions.push({time:g.state.time,tick:g.tick,side,method,args,ok:result.ok,code:result.code??null,before,after,id:result.building?.id??null});
      if(method==='reinforce'&&result.ok)m.purchases[side]={time:g.state.time,hpBefore:before.hp,deficit:6000-before.hp,repair:Math.min(600,6000-before.hp),aboveOldCap:Math.max(0,600-(6000-before.hp)),damage:0,decay:0,consumed:0,backToPreHP:null};
      return result;
    };
  }
  const damage=g._damage.bind(g);
  g._damage=(target,amount,side)=>{
    const before=target.hp,queued=!!g.damageQueue;
    damage(target,amount,side);
    if(!queued&&target.type==='base'&&target.hp<before){const i=target.side,d=before-target.hp;m.firstDamage[i]??=g.state.time;m.baseDamage[i]+=d;if(m.purchases[i])m.purchases[i].damage+=d;}
  };
  const spawn=g._spawn.bind(g);
  g._spawn=b=>{const id=g.nextId;spawn(b);if(g.nextId>id)m.spawned[b.side]++;};
  const step=g._step.bind(g);
  g._step=dt=>{
    const hp=g.state.bases.map(b=>b.hp),damageBefore=[...m.baseDamage],bridgeBefore=g.state.bridgeControl?.earned.slice()??[0,0],kills=[...g.state.stats.kills];
    for(const side of [0,1]){m.ledgers[side].base+=5*dt;m.ledgers[side].mine+=g.state.buildings.filter(b=>b.side===side&&b.type==='mint'&&b.hp>0).reduce((n,b)=>n+2.5*(1+.5*(b.level-1)),0)*dt;}
    step(dt);
    for(const side of [0,1]){
      const l=m.ledgers[side];l.bridge+=(g.state.bridgeControl?.earned[side]??0)-bridgeBefore[side];l.bounty+=2*(g.state.stats.kills[side]-kills[side]);
      const dec=Math.max(0,hp[side]-g.state.bases[side].hp-(m.baseDamage[side]-damageBefore[side]));m.decay[side]+=dec;if(dec>1e-8)m.firstDamage[side]??=g.state.time;
      const p=m.purchases[side];if(p){p.decay+=dec;p.consumed=Math.min(600,p.damage+p.decay);if(g.state.bases[side].hp<=p.hpBefore)p.backToPreHP??=g.state.time;}
      const expected=l.initial+l.base+l.mine+l.bridge+l.bounty+l.refund-l.spent;
      l.maxResidual=Math.max(l.maxResidual,Math.abs(expected-g.state.gold[side]));assert.ok(l.maxResidual<1e-5,'ledger residual');assert.ok(g.state.gold[side]>=0);
    }
  };
  return g;
}
function checkpoint(g,label) {
  return {label,time:g.state.time,tick:g.tick,gold:[...g.state.gold],hp:g.state.bases.map(b=>b.hp),bridge:g.state.bridgeControl?.earned.slice()??[0,0],spawned:[...g.metrics.spawned],sides:[0,1].map(side=>({producers:g.state.buildings.filter(b=>b.side===side&&g.buildings[b.type].unit).map(b=>({id:b.id,type:b.type,hp:b.hp,level:b.level})),mines:g.state.buildings.filter(b=>b.side===side&&b.type==='mint').length,units:g.state.units.filter(u=>u.side===side).length}))};
}
const OPEN={E:[[0,'mint'],[0,'archery'],[30,'barracks'],[55,'wardenLodge'],[75,'archery']],P:[[0,'barracks'],[0,'archery'],[25,'barracks'],[55,'archery']]};
const SUPPORT={E:['barracks','archery','wardenLodge','archery','foundry'],P:['archery','barracks','sanctum','archery','foundry']};
function place(g,type,side,index) {
  const n=g.map.lanes.length,lanes=Array.from({length:n},(_,i)=>(index+i)%n),cols=type==='mint'?[270,410,550,690,830,970,1110,1250]:[1110,970,830,690,550,410,270,1250];
  let result;
  for(const lane of lanes)for(const x of cols){result=g.build(type,worldX(g.map,side,x),g.map.lanes[lane],side);if(result.ok)return result;}
  return result;
}
function script(g,roles,controller,phase) {
  for(const side of (g.tick%200===0?[0,1]:[1,0])) {
    const c=controller[side],role=roles[side];
    if(phase==='opening') {
      while(c.open<OPEN[role].length && OPEN[role][c.open][0]*20<=g.tick){const type=OPEN[role][c.open][1],r=place(g,type,side,c.index);if(!r.ok){g.metrics.actions.push({time:g.state.time,tick:g.tick,side,method:'script-rejection',phase,type,reason:r.reason});break;}c.open++;c.index++;}
    } else {
      const type=SUPPORT[role][c.support%SUPPORT[role].length],r=place(g,type,side,c.index);
      if(r.ok){c.support++;c.index++;}else g.metrics.actions.push({time:g.state.time,tick:g.tick,side,method:'script-rejection',phase,type,reason:r.reason});
    }
  }
}
function finish(g,meta) {
  g.metrics.checkpoints.push(checkpoint(g,'terminal-or-bound'));
  // Admission on every final state exercises normal combat and purchased saves.
  assert.deepEqual(CitadelGame.restoreSnapshot(g.snapshot()).snapshot(),g.snapshot());
  return {...meta,time:g.state.time,winner:g.state.winner,ongoing:g.state.winner===null,final:checkpoint(g,'final'),...g.metrics,engineFinalHash:hash(JSON.stringify(g.snapshot()))};
}
export function paired(group,map,seed,matchup,focal,extraTicks=[]) {
  const roles=focal===0?[matchup,matchup==='E'?'P':'E']:[matchup==='E'?'P':'E',matchup];
  const g=attach(new CitadelGame({reinforcement:true,ai:false,mapId:map,seed,rulesetId:group==='interaction'?'frontier-bridge-open':'frontier-air-local-open'}));
  const ctl=[{open:0,support:0,index:0},{open:0,support:0,index:0}];
  while(g.tick<1800&&g.state.winner===null){if(g.tick%100===0)script(g,roles,ctl,'opening');g.update(.05);}
  const snapshot=g.snapshot(),prehistoryHash=hash(JSON.stringify({snapshot,ctl,metrics:g.metrics})),before=checkpoint(g,'decision-before');
  return ['reinforce','archery','mint'].map(choice=>{
    const b=attach(CitadelGame.restoreSnapshot(snapshot),g.metrics),c=structuredClone(ctl);
    const result=choice==='reinforce'?b.reinforce(focal):place(b,choice,focal,c[focal].index);
    // Choice does not shift common support lane/index; keep scripts paired.
    b.metrics.checkpoints.push(before,checkpoint(b,'decision-after'));
    const assigned={tick:b.tick,time:b.state.time,ok:result.ok,code:result.code??null,reason:result.reason??null,cost:result.ok?(choice==='reinforce'?190:b.buildings[choice].cost):0,availableGold:before.gold[focal],alive:before.hp.every(h=>h>0),ongoing:b.state.winner===null,timeEligible:b.tick>=1800};
    while(b.tick<18000&&b.state.winner===null){if(b.tick>=2200&&(b.tick-2200)%400===0)script(b,roles,c,'support');b.update(.05);if(extraTicks.includes(b.tick))b.metrics.checkpoints.push(checkpoint(b,'common-terminal'));if([2400,3000,4200].includes(b.tick))b.metrics.checkpoints.push(checkpoint(b,'decision-plus-'+(b.tick/20-90)));}
    return finish(b,{id:`${group}/${map}/${seed}/${matchup}/${focal}/${choice}`,group,map,seed,matchup,focal,choice,roles,assigned,prehistoryHash});
  });
}
function symmetric(map,seed,policy) {
  const g=attach(new CitadelGame({reinforcement:true,ai:false,mapId:map,seed,rulesetId:'frontier-air-local-open'}));
  while(g.tick<18000&&g.state.winner===null){
    if(g.tick%100===0)for(const side of (g.tick%200===0?[0,1]:[1,0])){
      if(policy==='reactive'&&g.tick>=1800&&!g.reinforcementPurchases[side]&&g.state.bases[side].hp<=5400)g.reinforce(side);
      g._ai(side);
    }
    g.update(.05);if([1800,2400,3000,4200].includes(g.tick))g.metrics.checkpoints.push(checkpoint(g,'at-'+g.tick/20));
  }
  return finish(g,{id:`symmetric/${map}/${seed}/${policy}`,group:'symmetric',map,seed,policy});
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
const sources=Object.fromEntries(['dist/engine.js','dist/rulesets.js','dist/bridge-control.js','dist/autonomous-air.js',DIR+'prototype.mjs',DIR+'study.mjs',DIR+'PREREGISTRATION.md'].map(p=>[p,hash(readFileSync(p))]));
const cases=[];
for(const map of ['classic','long-march','twin-span'])for(const seed of [17,91])for(const matchup of ['E','P'])for(const focal of [0,1]){cases.push(...paired('primary',map,seed,matchup,focal));console.log(`primary ${map} ${seed} ${matchup} ${focal}`);}
for(const map of ['classic','twin-span'])for(const seed of [17,91])for(const focal of [0,1]){cases.push(...paired('interaction',map,seed,'E',focal));console.log(`interaction ${map} ${seed} ${focal}`);}
for(const map of ['classic','long-march','twin-span'])for(const seed of [17,91])for(const policy of ['off','reactive']){cases.push(symmetric(map,seed,policy));console.log(`symmetric ${map} ${seed} ${policy}`);}
assert.equal(cases.length,108);
writeFileSync(DIR+'results.json',JSON.stringify({base:'5ec1f967a1c8c8f9861f68b8fef3cf99c4fa460d',sourceCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),contract:CONTRACT,sources,cases},null,2)+'\n');
console.log('Wrote 108 cases.');

}
