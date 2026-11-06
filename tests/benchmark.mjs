/** Reproducible, dependency-free headless workload. Run: node --expose-gc tests/benchmark.mjs */
import {readFile} from 'node:fs/promises';
import {performance} from 'node:perf_hooks';
import os from 'node:os';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const source=await readFile(new URL('../dist/engine.js',import.meta.url),'utf8');
const {Game,BUILDINGS}=await import(new URL('../dist/engine.js',import.meta.url).href);
const engineSha256=createHash('sha256').update(source).digest('hex');
const rulesetsSha256=createHash('sha256').update(await readFile(new URL('../dist/rulesets.js',import.meta.url))).digest('hex');
const hash=engineSha256.slice(0,12);
function invariants(g){
  const s=g.state;
  assert.ok(s.units.length<=140&&s.buildings.length<=48&&s.effects.length<=256&&s.projectiles.length<=256);
  assert.ok(s.gold.every(n=>Number.isFinite(n)&&n>=0));
  const ids=[...s.units,...s.buildings].map(e=>e.id);
  assert.equal(ids.length,new Set(ids).size);
  for(const entity of [...s.units,...s.buildings])assert.ok(Number.isFinite(entity.x)&&Number.isFinite(entity.y)&&Number.isFinite(entity.hp)&&entity.hp>=0&&entity.hp<=entity.maxHp);
}
function saturated(){
  const g=new Game({seed:20260403,ai:false});g.state.buildings=[];g.state.gold=[100000,100000];
  const types=['barracks','archery','foundry','sanctum','aerie','watchtower'];
  for(let side=0;side<2;side++)for(let lane=0;lane<3;lane++)for(let col=0;col<8;col++){
    const type=types[(col+lane)%types.length];assert.ok(g.build(type,side?3000-col*140:200+col*140,[260,450,640][lane],side).ok);
  }
  return g;
}
function replenish(g){
  // All troops start near the contested center; deaths are replenished legally at the cap.
  for(let side=0;side<2;side++){
    const factories=g.state.buildings.filter(b=>b.side===side&&BUILDINGS[b.type].unit);
    let count=g.state.units.filter(u=>u.side===side).length;
    while(count<70&&factories.length){const b=factories[count%factories.length];g._spawn(b);const u=g.state.units.at(-1);u.x=side?1670:1530;count++;}
  }
}
const g=saturated();replenish(g);invariants(g);
const elapsed=[];let peakUnits=0,peakBuildings=0,peakEffects=0,peakProjectiles=0;
if(globalThis.gc)globalThis.gc();
const beforeMemory=process.memoryUsage().heapUsed;
let totalStartUnits=0,minStartUnits=140;
for(let i=0;i<2400;i++){
  replenish(g);totalStartUnits+=g.state.units.length;minStartUnits=Math.min(minStartUnits,g.state.units.length);
  const start=performance.now();g.update(.05);elapsed.push(performance.now()-start);
  peakUnits=Math.max(peakUnits,g.state.units.length);peakBuildings=Math.max(peakBuildings,g.state.buildings.length);peakEffects=Math.max(peakEffects,g.state.effects.length);peakProjectiles=Math.max(peakProjectiles,g.state.projectiles.length);
  if(i%100===0){invariants(g);const restored=Game.restore(g.serialize());assert.deepEqual(restored.serialize(),g.serialize());}
}
invariants(g);elapsed.sort((a,b)=>a-b);
const sum=elapsed.reduce((a,b)=>a+b,0),p=q=>elapsed[Math.floor((elapsed.length-1)*q)];
if(globalThis.gc)globalThis.gc();
const afterMemory=process.memoryUsage().heapUsed;
const longStart=performance.now();let wins=0,restores=0,maxDuration=0;
for(let seed=1;seed<=50;seed++){
  let game=new Game({seed,difficulty:['easy','normal','hard'][seed%3]});
  for(let frame=0;frame<12000&&game.state.winner===null;frame++){
    game.update(.05);
    if(frame%1000===0){invariants(game);game=Game.restore(game.serialize());restores++;}
  }
  invariants(game);assert.notEqual(game.state.winner,null,'match must terminate within10 simulated minutes');wins++;maxDuration=Math.max(maxDuration,game.state.time);
  // Terminal games must not continue to allocate or advance through a long idle session.
  const saved=game.serialize();for(let i=0;i<1000;i++)game.update(1e12);assert.deepEqual(game.serialize(),saved);
}
console.log(JSON.stringify({engineSha:hash,engineSha256,rulesetsSha256,rulesetId:g.ruleset.id,node:process.version,cpu:os.cpus()[0]?.model,logicalCpus:os.cpus().length,saturated:{simulatedSeconds:120,steps:elapsed.length,totalMs:+sum.toFixed(2),meanStepMs:+(sum/elapsed.length).toFixed(4),p95StepMs:+p(.95).toFixed(4),p99StepMs:+p(.99).toFixed(4),maxStepMs:+elapsed.at(-1).toFixed(4),peakUnits,minStartUnits,meanStartUnits:+(totalStartUnits/2400).toFixed(1),peakBuildings,peakEffects,peakProjectiles,gcControlled:typeof globalThis.gc==='function',heapDeltaMB:+((afterMemory-beforeMemory)/1048576).toFixed(2)},longRun:{completedMatches:wins,restoreCheckpoints:restores,longestMatchSeconds:+maxDuration.toFixed(1),wallMs:+(performance.now()-longStart).toFixed(1)},note:'CPU-only simulation benchmark, not browser rendering/FPS. Heap delta includes garbage-collector timing; entity limits and repeated terminal no-ops are deterministic checks.'},null,2));
