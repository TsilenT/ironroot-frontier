import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {getRuleset} from '../../dist/rulesets.js';
import {verifyPlayerCadence} from './economy.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
const rawPath=process.argv[2];if(!rawPath)throw Error('Pass the retained raw JSONL evidence path.');
const bytes=fs.readFileSync(rawPath),lines=bytes.toString('utf8').trim().split('\n'),rules=getRuleset('frontier-campaign-road-we-know'),counts={},runs=[];
for(const line of lines){
 const r=JSON.parse(line),ts=r.ledger.transactions;verifyPlayerCadence(ts);
 for(const t of ts){
  if(!t.result.ok)throw Error('Unsuccessful receipt');
  let expected;
  if(t.method==='build'){expected=rules.buildings[t.type].cost;if(t.result.building.level!==1)throw Error('Aliased build receipt');}
  else if(t.method==='upgrade'){expected=Math.round(rules.buildings[t.type].cost*(.7+.35*(t.before.building.level-1)));if(t.result.building.level!==t.before.building.level+1)throw Error('Aliased upgrade receipt');}
  else if(t.method==='cast')expected=rules.spell.cost;
  else if(t.method==='buyCitadelOption')expected=rules.citadel.cost;
  else if(t.method==='sell')expected=-Math.floor(t.before.building.invested*.5*t.before.building.hp/t.before.building.maxHp);
  else throw Error('Unknown paid action');
  if(Math.abs(t.cost-expected)>1e-6)throw Error('Nonordinary price');
  if(Math.abs(t.before.gold-t.cost+2*(t.after.kills-t.before.kills)-t.after.gold)>1e-6)throw Error('Receipt does not reconcile');
  const key=t.side+'/'+t.method;counts[key]=(counts[key]||0)+1;
 }
 if(r.ledger.maxError.some(x=>x>1e-6))throw Error('Ledger error');
 const paid=ts.filter(t=>t.side===0&&t.cost>0),minGap=paid.length>1?Math.min(...paid.slice(1).map((t,i)=>t.time-paid[i].time)):null;
 runs.push({policy:r.policy,seed:r.seed,outcome:r.outcome,rawLineSha256:hash(line),receipts:ts.length,playerPaidActions:paid.length,minimumPlayerGap:minGap,maxLedgerError:Math.max(...r.ledger.maxError)});
}
const sourceFiles=['dist/campaign.js','dist/rulesets.js','dist/engine.js','qa/road-we-know/paid-policies.mjs','qa/road-we-know/economy.mjs','qa/road-we-know/simulate.mjs','qa/road-we-know/scenario.mjs','qa/road-we-know/VALIDATION_PLAN.json'];
const result={scope:'Fresh successful action receipts from actual production campaign engine; no raw historical results reused.',rawSha256:hash(bytes),rawBytes:bytes.length,runs:runs.length,receipts:counts,totalReceipts:Object.values(counts).reduce((a,b)=>a+b,0),sourceHashes:Object.fromEntries(sourceFiles.map(p=>[p,hash(fs.readFileSync(p))])),checks:['All action receipts successful and detached at action time','All build/upgrade/volley/citadel/sell prices ordinary','Every receipt reconciles gold and kill bounties','At most one paid player action per five seconds across action types','Continuous income/kill/spend ledgers remain within 1e-6'],runAudit:runs};
fs.writeFileSync(new URL('./receipt-audit.json',import.meta.url),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({runs:result.runs,receipts:result.totalReceipts,byType:counts,rawSha256:result.rawSha256}));
