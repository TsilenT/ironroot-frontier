import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {runFalseQuiet} from './simulate.mjs';
import {POLICY_IDS} from './paid-policies.mjs';
import {createFalseQuiet,describeFalseQuiet,evaluateFalseQuiet} from './scenario.mjs';
import {observe} from '../../dist/fog.js';
const ground=createFalseQuiet(),air=createFalseQuiet({variant:'air-flank'});
assert.deepEqual(ground.state.buildings.map(b=>[b.id,b.x,b.lane]),air.state.buildings.map(b=>[b.id,b.x,b.lane]));
assert.deepEqual(ground.falseQuiet.posts,air.falseQuiet.posts);
assert.equal(ground.falseQuiet.posts.length,1);
assert.equal(ground.falseQuiet.posts[0].x,2230);
assert.equal(observe(ground,0).state.buildings.some(b=>b.id===ground.falseQuiet.posts[0].id),false);
for(const g of [ground,air]){assert.equal(g.ai,true);assert.deepEqual(g.state.gold,[1000,120]);assert.deepEqual(g.state.income,[7.5,7.5]);assert.equal(evaluateFalseQuiet(g).outcome,'running');}
const id=ground.falseQuiet.posts[0].id;ground.state.buildings=ground.state.buildings.filter(b=>b.id!==id);assert.equal(evaluateFalseQuiet(ground).route,'original-fort');ground.state.bases[0].hp=0;assert.equal(evaluateFalseQuiet(ground).outcome,'lost');
const source=readFileSync(new URL('./paid-policies.mjs',import.meta.url),'utf8');assert.equal(/g\.state|game\.state|\.seed|falseQuiet/.test(source),false);
const files=['regression','held-out','novice-final','paced-corrected'];
const retained=files.every(file=>existsSync(new URL(`./${file}.jsonl`,import.meta.url)))&&!process.argv.includes('--recompute');
const rows=retained?files.flatMap(file=>readFileSync(new URL(`./${file}.jsonl`,import.meta.url),'utf8').trim().split('\n').map(JSON.parse))
 :['ground-heavy','air-flank'].flatMap(variant=>POLICY_IDS.flatMap(policy=>[7301,719,51017,7309,7313,90001].map(seed=>runFalseQuiet({variant,policy,seed,production:true}))));
for(const r of rows){assert(r.ledgerMaxError.every(v=>v<=1e-6));assert(r.enemyPurchases>0);assert.equal(r.casualties.length,2);assert(r.firstContact!==null);if(r.policy.endsWith('-5s')||r.policy==='broad-novice'){const ts=r.transactions.filter(t=>t.side===0).map(t=>t.time);for(let i=1;i<ts.length;i++)assert(ts[i]-ts[i-1]>=5-1e-6,'Paced policy exceeded one paid action per five seconds');}}
console.log(`${retained?'Retained local':'Recomputed current production'} paid ledger rows checked: ${rows.length}.`);
console.log('False Quiet fixture, fixed target IDs, fog, loss precedence, policy source and paid ledgers verified.');
