import {performance} from 'node:perf_hooks';
import {writeFileSync} from 'node:fs';
import {fixture,versions,counts} from './fog-performance-workloads.mjs';
const results=[],order=['phase1','current','released'];
for(const workload of ['sparse','crowded_march','crowded_combat']){
 const snapshots=Object.fromEntries(order.map(v=>[v,fixture(workload,v).serialize()]));const batches=workload==='sparse'?40:10,steps=40;
 const samples=Object.fromEntries(order.map(v=>[v,[]]));
 for(let round=0;round<8;round++)for(const version of [...order.slice(round%3),...order.slice(0,round%3)]){
  let elapsed=0;for(let b=0;b<batches;b++){const g=versions[version].Game.restore(snapshots[version]),start=performance.now();for(let i=0;i<steps;i++)g._step(.05);elapsed+=performance.now()-start;}
  if(round>0)samples[version].push(elapsed);
 }
 for(const version of order){const a=[...samples[version]].sort((a,b)=>a-b),g=versions[version].Game.restore(snapshots[version]);const initial=counts(g);for(let i=0;i<steps;i++)g._step(.05);results.push({workload,version,batches,stepsPerBatch:steps,totalTimedStepsPerSample:batches*steps,samplesMs:samples[version],medianMs:a[3],minMs:a[0],maxMs:a[6],medianMsPerStep:a[3]/(batches*steps),spreadPercent:100*(a[6]-a[0])/a[3],initial,finalAfterEachBatch:counts(g)});}
}
const report={method:'One longer confirmation after short profiling showed high spread. Fresh restore outside timed region for each batch; 40-step bounded batches; one warmup and seven measured rounds, rotating versions; no forcedGC, no AI. No further runtime edits.',results};writeFileSync(process.argv[2]??'fog-step-confirmation.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
