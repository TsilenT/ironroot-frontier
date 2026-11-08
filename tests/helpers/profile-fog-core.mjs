import {performance} from 'node:perf_hooks';
import {cpus} from 'node:os';
import {writeFileSync} from 'node:fs';
import {fixture,versions,counts} from './fog-performance-workloads.mjs';
const mode=process.argv[2]??'measure',output=process.argv[3],names=['sparse','crowded_march','crowded_combat'];
const summarize=samples=>{const a=[...samples].sort((x,y)=>x-y);return {samplesMs:samples,medianMs:a[Math.floor(a.length/2)],minMs:a[0],maxMs:a.at(-1),spreadPercent:100*(a.at(-1)-a[0])/a[Math.floor(a.length/2)]};};
if(mode==='cpu'){
 const version=process.argv[3]??'phase1',snapshot=fixture('crowded_combat',version).serialize();let count=0;const start=performance.now();
 while(performance.now()-start<3500){const g=versions[version].Game.restore(snapshot);for(let j=0;j<20;j++)g._step(.05);count++;}
 console.log(JSON.stringify({version,batches:count,elapsedMs:performance.now()-start}));
}else{
 const results=[];
 for(const name of names){
  const snapshots=Object.fromEntries(Object.keys(versions).map(v=>[v,fixture(name,v).serialize()]));
  for(const task of ['fixedSteps','observations','effectIngestion','sightSnapshot','eventAudience']){
   const samples=Object.fromEntries(Object.keys(versions).map(v=>[v,[]])),initial={},final={};
   // Rotate order each round to reduce systematic warm/host scheduling bias.
   for(let round=0;round<8;round++)for(const v of [...Object.keys(versions).slice(round%3),...Object.keys(versions).slice(0,round%3)]){
    if(v==='released'&&['sightSnapshot','eventAudience'].includes(task))continue;
    const g=versions[v].Game.restore(snapshots[v]),fog=versions[v].fog;initial[v]=counts(g);
    const n=task==='fixedSteps'?40:task==='observations'?200:2000;const start=performance.now();
    if(task==='fixedSteps')for(let i=0;i<n;i++)g._step(.05);
    else if(task==='observations')for(let i=0;i<n;i++)fog.observe(g,i%2);
    else if(task==='effectIngestion')for(let i=0;i<n;i++)g._effect(i%2?3090:110,450,'hit',i%2,.2);
    else if(task==='sightSnapshot')for(let i=0;i<n;i++)fog.sightSnapshot(g);
    else for(let i=0;i<n;i++)fog.eventAudience(g,(i%40)*80,180+(i%3)*270);
    const elapsed=performance.now()-start;if(round>0)samples[v].push(elapsed);final[v]=counts(g);
   }
   for(const v of Object.keys(versions))if(samples[v].length){const operationsPerSample=task==='fixedSteps'?40:task==='observations'?200:2000;results.push({workload:name,version:v,task,operationsPerSample,initial:initial[v],final:final[v],...summarize(samples[v])});}
  }
 }
 const report={kind:'Synthetic warmed Node CPU profiling; not browser/mobile FPS or balance.',environment:{node:process.version,platform:process.platform,arch:process.arch,cpu:cpus()[0].model,logicalCPUs:cpus().length},method:'Fresh restored state outside timed regions; one warmup + seven measured rounds; rotating version order. 40 direct fixed steps=2 simulated seconds. AI excluded. Sparse=12 troops/6 buildings; crowded=140 troops/48 buildings. Combat casualties reported. No forced GC.',results};
 if(output)writeFileSync(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}
