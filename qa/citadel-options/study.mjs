import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {OptionGame,CONTRACT,KINDS} from './prototype.mjs';
import {observe,sample} from './observe.mjs';
import {worldX} from '../../dist/engine.js';
const DIR='qa/citadel-options/',sha=x=>createHash('sha256').update(x).digest('hex');
const OPEN={focal:[[0,'barracks'],[0,'archery'],[30,'mint'],[60,'wardenLodge']],swarm:[[0,'barracks'],[0,'barracks'],[30,'archery'],[60,'barracks']],siege:[[0,'foundry'],[20,'barracks'],[55,'foundry']],air:[[0,'aerie'],[20,'aerie'],[60,'archery']]};
const SUPPORT={focal:['barracks','archery','wardenLodge','archery','sanctum'],swarm:['barracks','archery','barracks'],siege:['foundry','barracks','archery'],air:['aerie','archery','aerie']};
function place(g,type,side,index,focal){
 const rear=[270,410,550,690,830,970,1110,1250],columns=type==='mint'||focal&&type==='archery'?rear:focal?[690,550,830,410,970,270,1110,1250]:[1110,970,830,690,550,410,270,1250];
 let last;
 for(let i=0;i<g.map.lanes.length;i++){const lane=(index+i)%g.map.lanes.length;for(const x of columns){last=g.build(type,worldX(g.map,side,x),g.map.lanes[lane],side);if(last.ok)return last;}}
 return last;
}
function scripted(g,ctl,focal,threat,opening){
 for(const side of (g.tick%200===0?[0,1]:[1,0])){
  const c=ctl[side],role=side===focal?'focal':threat;
  if(opening){while(c.open<OPEN[role].length&&OPEN[role][c.open][0]*20<=g.tick){const type=OPEN[role][c.open][1],r=place(g,type,side,c.index,side===focal);if(!r.ok){g.metrics.actions.push({time:g.state.time,tick:g.tick,side,method:'script-rejection',phase:'opening',type,reason:r.reason});break;}c.open++;c.index++;}}
  else {const type=SUPPORT[role][c.support%SUPPORT[role].length],r=place(g,type,side,c.index,side===focal);if(r.ok){c.support++;c.index++;}else g.metrics.actions.push({time:g.state.time,tick:g.tick,side,method:'script-rejection',phase:'support',type,reason:r.reason});}
 }
}
function group(map,seed,threat,focal){
 const g=observe(new OptionGame({optionsEnabled:true,ai:false,mapId:map,seed,rulesetId:'frontier-air-local-open'})),ctl=[{open:0,support:0,index:0},{open:0,support:0,index:0}];
 while(g.tick<1800&&g.state.winner===null){if(g.tick%100===0)scripted(g,ctl,focal,threat,true);g.update(.05);if(g.tick%100===0)g.metrics.trace.push(sample(g,'prehistory'));}
 const snapshot=g.snapshot(),prehistoryHash=sha(JSON.stringify({snapshot,ctl,metrics:g.metrics})),before=sample(g,'decision-before');
 return [...KINDS,'archery','hold'].map(choice=>{
  const b=observe(OptionGame.restoreSnapshot(snapshot),g.metrics),c=structuredClone(ctl);
  const r=choice==='hold'?{ok:true,cost:0}:choice==='archery'?place(b,'archery',focal,c[focal].index,true):b.purchase(choice,focal);
  const assigned={ok:r.ok,time:b.state.time,tick:b.tick,code:r.code??null,reason:r.reason??null,cost:r.ok?(choice==='hold'?0:choice==='archery'?175:190):0,goldBefore:before.gold[focal],hpBefore:before.hp[focal],alive:before.hp.every(h=>h>0),ongoing:b.state.winner===null,timeEligible:b.tick>=1800};
  b.metrics.trace.push(before,sample(b,'decision-after'));
  while(b.tick<18000&&b.state.winner===null){if(b.tick>=2200&&(b.tick-2200)%300===0)scripted(b,c,focal,threat,false);b.update(.05);if(b.tick%100===0)b.metrics.trace.push(sample(b,'continuation'));}
  assert.deepEqual(OptionGame.restoreSnapshot(b.snapshot()).snapshot(),b.snapshot());
  for(const side of [0,1])assert.equal(b.metrics.ledgers[side].bounty,b.state.stats.kills[side]*2);
  const final=sample(b,'terminal-or-bound');
  return {id:`${map}/${threat}/${seed}/${focal}/${choice}`,map,seed,threat,focal,choice,prehistoryHash,assigned,time:b.state.time,winner:b.state.winner,ongoing:b.state.winner===null,purchases:b.purchases,final,...b.metrics,engineFinalHash:sha(JSON.stringify(b.snapshot()))};
 });
}
const files=['dist/engine.js','dist/rulesets.js','dist/autonomous-air.js',DIR+'PREREGISTRATION.md',DIR+'prototype.mjs',DIR+'observe.mjs',DIR+'study.mjs'];
const metadata={base:'5ec1f967a1c8c8f9861f68b8fef3cf99c4fa460d',sourceCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),node:process.version,contract:CONTRACT,sources:Object.fromEntries(files.map(f=>[f,sha(readFileSync(f))]))};
const cases=[];
for(const map of ['classic','twin-span'])for(const threat of ['swarm','siege','air'])for(const seed of [17,91])for(const focal of [0,1]){cases.push(...group(map,seed,threat,focal));console.log(`${map} ${threat} ${seed} focal=${focal}: ${cases.length}/120`);}
assert.equal(cases.length,120);
writeFileSync(DIR+'results.json','{\n"metadata":'+JSON.stringify(metadata)+',\n"cases":[\n'+cases.map(c=>JSON.stringify(c)).join(',\n')+'\n]}\n');
console.log('Completed 120 registered games; all gold, kill-bounty and restore assertions passed.');
