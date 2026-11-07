// Correct retained observations only: no simulation, gameplay or raw-result writes.
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const dir='qa/citadel-reinforcement/';
const sha=x=>createHash('sha256').update(x).digest('hex');
const raw=readFileSync(dir+'results.json'),data=JSON.parse(raw),cases=[];
let castCount=0,affectedCasts=0,totalCorrection=0;
for(const original of data.cases.filter(c=>c.group==='symmetric')){
  const corrected=structuredClone(original),adjustments=[];
  for(const [index,a] of original.actions.entries())if(a.method==='cast'&&a.ok){
    const net=a.before.gold-a.after.gold,bounty=75-net;
    assert.ok(bounty>=0&&Number.isInteger(bounty/2));assert.ok(a.before.gold>=75);
    const gross=net+bounty;assert.equal(gross,75);
    corrected.ledgers[a.side].spent+=bounty;corrected.ledgers[a.side].bounty+=bounty;
    adjustments.push({actionIndex:index,time:a.time,side:a.side,netGoldDecrease:net,grossCost:75,immediateKillBounty:bounty});
    castCount++;if(bounty>0)affectedCasts++;totalCorrection+=bounty;
  }
  for(const side of [0,1]){
    const l=corrected.ledgers[side];
    const gross=original.actions.filter(a=>a.side===side&&a.ok).reduce((n,a)=>n+(a.method==='cast'?75:Math.max(0,a.before.gold-a.after.gold)),0);
    assert.equal(gross,l.spent);
    assert.ok(Math.abs(l.initial+l.base+l.mine+l.bridge+l.bounty+l.refund-l.spent-original.final.gold[side])<1e-7);
  }
  const strip=({ledgers,...rest})=>rest;
  // Exact retained outcomes, all actions/before-after states, timing, HP,
  // checkpoints, hashes and policies remain unchanged by the correction.
  assert.deepEqual(strip(corrected),strip(original));
  cases.push({id:original.id,unchangedActionOutcomeHash:sha(JSON.stringify(strip(original))),ledgerBefore:original.ledgers,ledgerCorrected:corrected.ledgers,adjustments});
}
assert.equal(cases.length,12);assert.equal(castCount,123);assert.equal(affectedCasts,113);assert.equal(totalCorrection,2146);
assert.equal(sha(readFileSync(dir+'results.json')),sha(raw));
const result={scope:'observation correction from retained actions; zero replayed games; original results unchanged',originalCommit:'aabf5f924b95b9273dd26f6bd8eefad77801561e',firstRunSourceCommit:data.sourceCommit,rawResultsSha256:sha(raw),scriptSha256:sha(readFileSync(dir+'correct-accounting.mjs')),castCount,affectedCasts,totalCorrectionToEachCategory:totalCorrection,successfulVolleyGrossCost:75,exactRetainedActionOutcomeParity:true,cases};
writeFileSync(dir+'corrected-accounting.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({cases:cases.length,castCount,affectedCasts,totalCorrection,exactRetainedActionOutcomeParity:true,rawResultsSha256:result.rawResultsSha256}));
