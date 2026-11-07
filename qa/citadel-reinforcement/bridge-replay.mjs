// Measurement-only deterministic replay of the same 24 registered bridge games.
// First outcomes and source commit remain in results.json; no new configurations.
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {paired} from './study.mjs';
const dir='qa/citadel-reinforcement/';
const original=JSON.parse(readFileSync(dir+'results.json')),results=[];
for(const map of ['classic','twin-span'])for(const seed of [17,91])for(const focal of [0,1]){
  const old=original.cases.filter(c=>c.group==='interaction'&&c.map===map&&c.seed===seed&&c.focal===focal);
  const commonTick=Math.min(...old.map(c=>c.final.tick));
  const repeated=paired('interaction',map,seed,'E',focal,[commonTick]);
  for(const c of repeated){const prev=old.find(x=>x.id===c.id);assert.equal(c.engineFinalHash,prev.engineFinalHash);assert.deepEqual(c.ledgers,prev.ledgers);assert.deepEqual(c.actions,prev.actions);}
  results.push({map,seed,focal,commonTick,time:commonTick*.05,cases:repeated.map(c=>({id:c.id,choice:c.choice,common:c.checkpoints.find(x=>x.label==='common-terminal'),terminal:c.final,ledger:c.ledgers}))});
}
const sha=file=>createHash('sha256').update(readFileSync(file)).digest('hex');
writeFileSync(dir+'bridge-matched-horizons.json',JSON.stringify({scope:'24 deterministic measurement replays; all final engine hashes, exact actions and ledgers equal original',originalResultsHash:sha(dir+'results.json'),sources:Object.fromEntries([dir+'study.mjs',dir+'bridge-replay.mjs',dir+'prototype.mjs'].map(f=>[f,sha(f)])),results},null,2)+'\n');
console.log('24/24 bridge replays exactly match original actions, ledgers, final engine hashes.');
