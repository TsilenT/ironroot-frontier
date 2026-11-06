/** Reproducible AI comparison; no dependencies or browser required.
 * node tests/balance.mjs [baseline git ref] [seed count] [first seed]
 * Runs baseline and working AI in the WORKING combat engine against identical
 * fixed policies, with both map sides. Does not alter prices or grant resources.
 */
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {Game, BUILDINGS, LANES} from '../dist/engine.js';
const ref=process.argv[2]||'db685c64ca1f7f399826348f09270fbdc5e63e86';
const seeds=Number(process.argv[3]||10),firstSeed=Number(process.argv[4]||1);
assert.ok(Number.isInteger(seeds)&&seeds>0&&Number.isInteger(firstSeed)&&firstSeed>=0);
const baselineSource=ref.startsWith('file:')?await readFile(ref.slice(5),'utf8'):execFileSync('git',['show',`${ref}:dist/engine.js`],{encoding:'utf8'});
const {Game:Baseline}=await import('data:text/javascript;base64,'+Buffer.from(baselineSource).toString('base64'));
const workingSource=await readFile(new URL('../dist/engine.js',import.meta.url),'utf8');
const hash=s=>createHash('sha256').update(s).digest('hex');
function scripted(g,side,policy){
  const own=g.state.buildings.filter(b=>b.side===side);
  const count=t=>own.filter(b=>b.type===t).length;
  const cycle=policy==='air'?['aerie','archery']:policy==='rush'?['barracks']:['barracks','archery','foundry','sanctum'];
  let type=cycle[own.filter(b=>BUILDINGS[b.type].unit).length%cycle.length];
  if(policy==='economy'&&count('mint')<3)type='mint';
  const lanes=[0,1,2].sort((a,b)=>own.filter(x=>x.lane===a).length-own.filter(x=>x.lane===b).length||a-b);
  for(const lane of lanes)for(const x of type==='mint'?[270,410,550]:[1250,1110,970,830,690,550,410,270]){
    if(g.build(type,side?3200-x:x,LANES[lane],side).ok)return;
  }
  for(const b of own.filter(b=>b.level<3).sort((a,b)=>a.level-b.level))if(g.upgrade(b.id,side).ok)return;
}
function match(ai,difficulty,policy,seed,side){
  const g=new Game({ai:false,difficulty,seed}),timers=[0,0];
  timers[side]=difficulty==='easy'?7:0;
  if(policy==='baseline')timers[1-side]=timers[side];
  let income120=null,mines=0,spells=0;
  const build=g.build.bind(g),cast=g.cast.bind(g);
  g.build=(type,x,y,s=0)=>{const r=build(type,x,y,s);if(r.ok&&s===side&&type==='mint')mines++;return r;};
  g.cast=(x,y,s=0)=>{const r=cast(x,y,s);if(r.ok&&s===side)spells++;return r;};
  for(let frame=0;frame<12000&&g.state.winner===null;frame++){
    g.update(.05);if(g.state.winner!==null)break;
    // Alternate decision order each visit so one policy is not always first.
    for(const s of frame%2?[1,0]:[0,1]){
      timers[s]-=.05;if(timers[s]>0)continue;
      if(s===side||policy==='baseline'){
        (s===side?ai:Baseline.prototype._ai).call(g,s);
        timers[s]=(difficulty==='easy'?14:difficulty==='hard'?3:5)+g.random()*3;
      }else {scripted(g,s,policy);timers[s]=5;}
    }
    if(income120===null&&g.state.time>=120)income120=g.state.income[side];
    assert.ok(g.state.gold.every(n=>Number.isFinite(n)&&n>=0));
  }
  return {winner:g.state.winner,side,seconds:g.state.time,gold:g.state.gold[side],income120,mines,spells};
}
const rows=[];
for(const version of ['baseline','working'])for(const difficulty of ['easy','normal','hard'])for(const policy of ['rush','mixed','economy','air','baseline']){
  const games=[];
  for(let seed=firstSeed;seed<firstSeed+seeds;seed++)for(const side of [0,1])games.push(match(version==='baseline'?Baseline.prototype._ai:Game.prototype._ai,difficulty,policy,seed,side));
  const mean=key=>{const ns=games.map(g=>g[key]).filter(n=>n!==null);return ns.length?+(ns.reduce((a,b)=>a+b,0)/ns.length).toFixed(2):null;};
  rows.push({version,difficulty,policy,games:games.length,wins:games.filter(g=>g.winner===g.side).length,losses:games.filter(g=>g.winner===1-g.side).length,draws:games.filter(g=>g.winner==='draw').length,timeouts:games.filter(g=>g.winner===null).length,winsBySide:[0,1].map(s=>games.filter(g=>g.side===s&&g.winner===s).length),meanSeconds:mean('seconds'),meanEndGold:mean('gold'),meanIncome120:mean('income120'),income120Samples:games.filter(g=>g.income120!==null).length,meanMinesBuilt:mean('mines'),meanSpells:mean('spells')});
}
console.log(JSON.stringify({baselineRef:ref,baselineEngineSha256:hash(baselineSource),workingEngineSha256:hash(workingSource),node:process.version,seeds,firstSeed,step:.05,maxSeconds:600,rows},null,2));

