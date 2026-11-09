import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {getRuleset} from '../../dist/rulesets.js';
import {CITADEL_OPTIONS} from '../../dist/citadel-options.js';
import {verifyPlayerCadence} from './economy.mjs';
import {hash,exactScenario} from './scenario.mjs';
const close=(a,b,label)=>assert.ok(Math.abs(a-b)<1e-6,`${label}: ${a} vs ${b}`);
export function auditRun(run){
 const {formation,formationSha256}=exactScenario(),rules=getRuleset('frontier-campaign-reed-beds'),ledger=run.ledger;
 assert.equal(run.formationSha256,formationSha256);assert.deepEqual(ledger.startingGold,[1100,100]);assert.deepEqual(ledger.startingActualIncome,[7.5,7.5]);assert.deepEqual(ledger.startingCachedIncome,[7.5,7.5]);
 assert.equal(run.production,true);assert.equal(run.rulesetId,rules.id);assert.equal(run.scenario,'through-the-reed-beds');assert.equal(run.mapId,'classic');
 const paid=verifyPlayerCadence(ledger.transactions),spending=[0,0],refunds=[0,0],incomeEvents=[[],[]];
 for(const t of ledger.transactions){
  assert.ok([0,1].includes(t.side));assert.equal(t.result.ok,true);assert.ok(t.before.gold>=0&&t.after.gold>=0);assert.ok(t.time>=0&&t.time<=run.duration);close(t.time,t.tick*.05,'receipt tick time');close(t.cost,t.before.gold-t.after.gold+2*(t.after.kills-t.before.kills),'receipt price');
  let expected;
  if(t.method==='build'){expected=rules.buildings[t.args[0]].cost;assert.equal(t.result.building.level,1);assert.equal(t.result.building.id,t.id);}
  else if(t.method==='upgrade'){expected=Math.round(rules.buildings[t.before.building.type].cost*(.7+.35*(t.before.building.level-1)));assert.equal(t.result.building.level,t.before.building.level+1);}
  else if(t.method==='cast')expected=rules.spell.cost;
  else if(t.method==='buyCitadelOption')expected=CITADEL_OPTIONS[t.args[0]].cost;
  else if(t.method==='sell')expected=-Math.floor(t.before.building.invested*.5*t.before.building.hp/t.before.building.maxHp);
  else assert.fail('Unrecognized receipt method');
  close(t.cost,expected,'ordinary engine price');if(t.cost>=0)spending[t.side]+=t.cost;else refunds[t.side]-=t.cost;
  if(t.type==='mint'){const rate=level=>rules.buildings.mint.income*(1+.5*(level-1));const delta=t.method==='build'?rate(1):t.method==='upgrade'?rate(t.result.building.level)-rate(t.before.building.level):t.method==='sell'?-rate(t.before.building.level):0;incomeEvents[t.side].push({time:t.time,delta});}
 }
 for(const loss of run.buildingLosses)if(loss.type==='mint'){
  let level=1;
  for(const t of ledger.transactions.filter(t=>t.id===loss.id&&t.time<=loss.time))if(t.result.building)level=t.result.building.level;
  incomeEvents[loss.side].push({time:loss.time,delta:-rules.buildings.mint.income*(1+.5*(level-1))});
 }
 for(const side of [0,1]){
  close(spending[side],ledger.spending[side],'total paid receipts');close(refunds[side],ledger.refunds[side],'total refund receipts');close(ledger.killGold[side],run.finalStats.kills[side]*2,'kill gold');
  let rate=formation.startingIncome[side],time=0,gross=0;
  for(const event of incomeEvents[side].sort((a,b)=>a.time-b.time)){gross+=(event.time-time)*rate;time=event.time;rate+=event.delta;}
  gross+=(run.duration-time)*rate;close(gross,ledger.grossIncome[side],'independent mine event integration');
  close(ledger.startingGold[side]+ledger.grossIncome[side]+ledger.killGold[side]+ledger.refunds[side]-ledger.spending[side],run.finalGold[side],'full-precision gold conservation');assert.ok(ledger.maxError[side]<1e-6);
 }
 assert.equal(run.playerPurchases,paid);assert.equal(run.enemyPurchases,ledger.transactions.filter(t=>t.side===1).length);
 assert.equal(run.targetLosses.length,run.finalTargets.filter(t=>!t.alive).length);assert.ok(new Set(run.targetLosses.map(t=>t.originalId)).size===run.targetLosses.length);
 if(run.outcome==='won'){assert.ok(run.finalHP[0]>0);assert.ok(run.duration<=600+1e-7);if(run.route==='enemy-citadel')assert.equal(run.finalHP[1],0);else assert.ok(run.targetLosses.length>=2);}
 return {policy:run.policy,seed:run.seed,outcome:run.outcome,route:run.route,duration:run.duration,playerPaidActions:paid,enemySuccessfulActions:run.enemyPurchases,targetsDestroyed:run.targetLosses.map(t=>t.originalId),maxLedgerError:Math.max(...ledger.maxError),independentIncomeVerified:true,ordinaryPricesVerified:true};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const args=Object.fromEntries(process.argv.slice(2).map(a=>{const [k,...v]=a.replace(/^--/,'').split('=');return[k,v.join('=')];}));
 const files=args.raw.split(','),runs=files.flatMap(file=>readFileSync(file,'utf8').trim().split('\n').filter(Boolean).map(JSON.parse)),audits=runs.map(auditRun),report={scope:'Independent arithmetic audit of fresh detached action-time receipts and mine events. Does not establish native UI behavior or human difficulty.',generatedAt:new Date().toISOString(),rawFiles:files.map(file=>{const data=readFileSync(file,'utf8');return{filename:file.split('/').at(-1),sha256:hash(data),bytes:Buffer.byteLength(data)};}),runs:audits.length,allPassed:true,maximumLedgerError:Math.max(...audits.map(a=>a.maxLedgerError)),audits};
 if(args.out)writeFileSync(args.out,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({runs:audits.length,allPassed:true,maximumLedgerError:report.maximumLedgerError}));
}
