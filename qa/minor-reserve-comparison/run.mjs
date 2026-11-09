/** Guarded four-case comparison preparation/execution. No unguarded battle entry point. */
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,realpathSync,existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {platform,arch,release,endianness} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createReserve,MinorReserveGame,DESIGN,evaluateReserve} from '../minor-reserve/scenario.mjs';
import {POLICIES,createPolicy,CADENCE_TICKS} from '../minor-reserve/policies.mjs';
import {observeCombat,forceSummary} from '../minor-reserve/observe.mjs';
import {createEventObserver,verifyPairPrefix} from './events.mjs';
import {instrumentEconomy,verifyPlayerCadence} from '../salt-stores/economy.mjs';

export const ROOT=realpathSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..'));
export const EVIDENCE=path.resolve(ROOT,'../ironroot-minor-reserve-comparison-evidence');
export const RUNNER=fileURLToPath(import.meta.url);
const INVENTORY=path.resolve(ROOT,'../ironroot-minor-reserve-remote-7571bb9c-inventory.json');
const INVENTORY_SHA='093bfe19a2514912e4f3f2d7c7a39e50a09acf0e8f940d122666da413e76c589';
const NEW_FILES=['qa/minor-reserve-comparison/PLAN.json','qa/minor-reserve-comparison/README.md','qa/minor-reserve-comparison/events.mjs','qa/minor-reserve-comparison/run.mjs','tests/minor-reserve-comparison.test.mjs'];
const PARENT_COMMIT='7571bb9c5dfa80ccf517e9a2d0d7fed142e320e5',PARENT_TREE='a3a24f8d8f18f04d2bbd3fc083a83ecbb1f6427d';
export const CASES=Object.freeze([{label:'north-disabled',policy:'north-supported',reserveEnabled:false},{label:'north-enabled',policy:'north-supported',reserveEnabled:true},{label:'south-disabled',policy:'south-bypass',reserveEnabled:false},{label:'south-enabled',policy:'south-bypass',reserveEnabled:true}].map(Object.freeze));
const BASELINE=path.resolve(ROOT,'../ironroot-minor-reserve-baseline-evidence/checkpoint003-baseline-run001');
const INPUTS=[
 [path.join(BASELINE,'north-supported.json'),'7cb2e358dee0f300460564aaa6c925c21e60675abaa778015f2b78ce1f666c4e'],
 [path.join(BASELINE,'south-bypass.json'),'1904a216564959c29d4ecb212bcab9eac96b94c8f5db9d3d903c7853ad68ec63'],
 [path.resolve(ROOT,'../ironroot-minor-reserve-independent-review/checkpoint003-baseline-outcome-review.md'),'fbb0f8b951cb90fe017e6120fc200f9a5f7f883c4d8df8afb87abddb3f8efde8'],
 [path.resolve(ROOT,'../ironroot-minor-reserve-baseline-evidence/comparison-plan-proposal-002.json'),'7f1ff327af007ef6f0ba1305c481f1c3a3777c891a490aab068e16971cdca16e']
];
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const json=value=>JSON.stringify(value,null,2)+'\n';
export function readPlan(){return JSON.parse(readFileSync(path.join(ROOT,'qa/minor-reserve-comparison/PLAN.json'),'utf8'));}
function walk(dir,prefix=''){return readdirSync(dir,{withFileTypes:true}).flatMap(e=>{const p=path.posix.join(prefix,e.name);if(e.isDirectory())return walk(path.join(dir,e.name),p);assert.ok(e.isFile(),'Source must not contain symlinks or special files');return [p];}).sort();}
export function sourceBinding(){
 assert.equal(realpathSync(process.cwd()),ROOT,'Use the frozen workspace as cwd.');
 const bytes=readFileSync(INVENTORY);assert.equal(hash(bytes),INVENTORY_SHA,'Canonical inventory changed');
 const inv=JSON.parse(bytes);assert.equal(inv.commit,PARENT_COMMIT);assert.equal(inv.sha,PARENT_TREE);assert.equal(inv.truncated,false);
 const present={},omitted=[],known=new Set();
 for(const entry of inv.tree){if(entry.type!=='blob')continue;known.add(entry.path);const p=path.join(ROOT,entry.path);if(!existsSync(p)){omitted.push(entry.path);continue;}
  const data=readFileSync(p),git=createHash('sha1').update('blob '+data.length+'\0').update(data).digest('hex');assert.equal(git,entry.sha,'Parent blob changed: '+entry.path);present[entry.path]=hash(data);
 }
 assert.equal(Object.keys(present).length,1361);assert.equal(omitted.length,1048);
 const additions=walk(ROOT).filter(p=>!known.has(p));assert.deepEqual(additions,NEW_FILES,'Only the exact five new comparison files are permitted');
 const plan=readPlan();assert.equal(plan.seed,9104);assert.equal(plan.maximumCases,4);assert.deepEqual(plan.caseOrder,CASES);assert.equal(plan.cadenceTicks,CADENCE_TICKS);assert.equal(plan.status,'prepared-awaiting-independent-review-and-authorization');
 const inputs=Object.fromEntries(INPUTS.map(([p,expected])=>{assert.equal(hash(readFileSync(p)),expected,'Baseline/audit/proposal input changed: '+p);return [p,expected];}));
 return {workspace:ROOT,source:{commit:inv.commit,tree:inv.sha,inventory:INVENTORY,inventorySha256:INVENTORY_SHA,present:1361,omitted:1048,designBaseline:DESIGN.sourceCommit,presentSha256:hash(JSON.stringify(present)),omittedSha256:hash(JSON.stringify(omitted))},inputs,workFiles:Object.fromEntries(NEW_FILES.map(p=>[p,hash(readFileSync(path.join(ROOT,p)))])),environment:{node:process.version,versions:process.versions,execPath:realpathSync(process.execPath),nodeBinarySha256:hash(readFileSync(process.execPath)),execArgv:process.execArgv,nodeOptions:process.env.NODE_OPTIONS??null,platform:platform(),arch:arch(),kernel:release(),endianness:endianness(),timezone:process.env.TZ??null},planSha256:hash(readFileSync(path.join(ROOT,'qa/minor-reserve-comparison/PLAN.json')))};
}
export function createFreeze(){return {format:'minor-reserve-comparison-freeze-v1',status:'pending-independent-review-and-authorization',binding:sourceBinding()};}
export function newExternalPath(value,evidenceRoot=EVIDENCE){
 const absolute=path.resolve(value),parent=realpathSync(path.dirname(absolute)),result=path.join(parent,path.basename(absolute));
 assert.ok(result.startsWith(path.resolve(evidenceRoot)+path.sep),'Generated artifacts must use the dedicated external evidence directory');assert.ok(!existsSync(result),'Never overwrite or retry an existing artifact');return result;
}
export function verifyApproval(packet,approvalPath,output,{bindingReader=sourceBinding,pathValidator=newExternalPath}={}){
 assert.equal(packet?.format,'minor-reserve-comparison-approved-v1');assert.equal(packet.status,'approved');assert.ok(typeof packet.reviewer==='string'&&packet.reviewer.trim());assert.ok(typeof packet.authorization==='string'&&packet.authorization.trim());
 assert.equal(packet.freeze?.format,'minor-reserve-comparison-freeze-v1');assert.equal(packet.freeze.status,'pending-independent-review-and-authorization');assert.deepEqual(packet.freeze.binding,bindingReader(),'Exact source/environment/plan binding changed');
 assert.deepEqual(packet.invocation,[process.execPath,RUNNER,'--run-approved',realpathSync(approvalPath),path.resolve(output)],'Approval must bind exact invocation and fresh external output');
 pathValidator(output);return packet.freeze.binding;
}
function auditPrices(game,ledger){
 verifyPlayerCadence(ledger.transactions);
 for(const t of ledger.transactions){const expected=t.method==='build'?game.buildings[t.type].cost:t.method==='upgrade'?Math.round(game.buildings[t.type].cost*(.7+.35*(t.before.building.level-1))):t.method==='cast'?game.ruleset.spell.cost:t.method==='buyCitadelOption'?game.ruleset.citadel.cost:-Math.floor(t.before.building.invested*.5*t.before.building.hp/t.before.building.maxHp);assert.equal(t.cost,expected,'Ordinary payment/refund changed');}
 assert.ok(ledger.maxError.every(n=>n<=1e-6),'Economy reconciliation failed');
}
async function runCase(def,{binding,stopped}){
 const {policy:policyId,reserveEnabled}=def;
 const game=createReserve({seed:9104,reserveEnabled}),policy=createPolicy(policyId),initial=game.serialize();
 assert.deepEqual(MinorReserveGame.restore(JSON.stringify(initial)).serialize(),initial,'Initial QA roundtrip');
 const observer=observeCombat(game),events=createEventObserver(),economy=instrumentEconomy(game),attempts=[],commands=[],trace=[forceSummary(game)],restoreChecks=[],shadows=[];
 let activeAI=false;const ai=game._ai;game._ai=function(...args){activeAI=true;try{return ai.apply(this,args);}finally{activeAI=false;}};
 for(const method of ['build','upgrade','cast','sell','buyCitadelOption']){const original=game[method];game[method]=function(...args){
  const side=method==='build'?(args[3]??0):method==='cast'?(args[2]??0):(args[1]??0),beforeGold=this.state.gold[side],beforeKills=this.state.stats.kills[side],result=original.apply(this,args);
  attempts.push(structuredClone({tick:this.tick,time:this.state.time,actor:activeAI?'ai':'player',side,method,args,beforeGold,afterGold:this.state.gold[side],killDelta:this.state.stats.kills[side]-beforeKills,ok:result.ok,reason:result.reason??null,building:result.building??null}));return result;
 };}
 const sampled=new Set();
 function probe(role){
  if(sampled.has(role))return;sampled.add(role);const previous=restoreChecks.at(-1);if(previous?.tick===game.tick){previous.roles.push(role);return;}const save=game.serialize(),restored=MinorReserveGame.restore(JSON.stringify(save));assert.deepEqual(restored.serialize(),save,'Natural save roundtrip');
  const row={role,roles:[role],tick:game.tick,time:game.state.time,checkedTicks:0,requestedTicks:10};restoreChecks.push(row);shadows.push({game:restored,policy:createPolicy(policyId,policy.serialize()),row});
 }
 function partial(){return {label:def.label,policy:policyId,seed:9104,reserveEnabled,events:events.receipt,initial,commands,attempts,trace,combat:observer.receipt,ledger:economy.snapshot(),restoreChecks,current:game.serialize(),policyState:policy.serialize()};}
 events.capture(game,policy,observer.receipt);
 try{
  for(;;){
   const outcome=evaluateReserve(game);if(outcome.completed||outcome.failed)break;
   if(game.tick%100===0){await new Promise(resolve=>setImmediate(resolve));if(stopped())throw Error('Externally stopped baseline stage');}
   const row=policy.step(game);if(row)commands.push(row);
   for(const shadow of shadows){const replay=shadow.policy.step(shadow.game);assert.deepEqual(replay,row,'Restored ordinary command changed');}
   const tick=game.tick;game.update(.05);assert.equal(game.tick,tick+1,'Simulation did not advance one fixed tick');observer.assertDrained();economy.reconcile();
   for(let i=shadows.length-1;i>=0;i--){const shadow=shadows[i];shadow.game.update(.05);assert.deepEqual(shadow.game.serialize(),game.serialize(),'Natural save continuation diverged');assert.deepEqual(shadow.policy.serialize(),policy.serialize(),'Policy continuation diverged');shadow.row.checkedTicks++;if(shadow.row.checkedTicks===10)shadows.splice(i,1);}
   if(game.tick%100===0)trace.push(forceSummary(game));
   const eventRoles=events.capture(game,policy,observer.receipt),ended=evaluateReserve(game);if(!ended.completed&&!ended.failed){
    if(game.tick===600)probe('30-seconds');if(game.tick===1800)probe('90-seconds');
    for(const side of [0,1])if(observer.receipt.firstOriginalStructureLossAt[side]!==null)probe('first-original-loss-side-'+side);for(const role of eventRoles)probe(role);
   }
  }
  const outcome=evaluateReserve(game),final=game.serialize(),ledger=economy.snapshot();assert.deepEqual(MinorReserveGame.restore(JSON.stringify(final)).serialize(),final,'Final QA roundtrip');auditPrices(game,ledger);
  assert.equal(game.reserve.enabled,reserveEnabled);if(!reserveEnabled)assert.equal(game.reserve.releases.length,0);assert.deepEqual(sourceBinding(),binding,'Source or environment changed during case');
  for(const shadow of shadows)shadow.row.endedWithBattle=true;
  for(const at of [30,90])if(game.state.time>at+.5+1e-7)assert.ok(restoreChecks.some(c=>c.role===at+'-seconds'&&c.checkedTicks===10),'Reached save checkpoint missing ten-tick continuation');
  return {...partial(),events:events.finish(game,observer.receipt),outcome,final,duration:game.state.time,finalHP:game.state.bases.map(b=>b.hp),scope:'Northern/southern-focus comparison only; no avoidance, winner-reversal or human-difficulty claim'};
 }catch(error){error.partial=partial();throw error;}
}
export function verifyDisabledReplay(result,known){
 for(const key of ['initial','commands','attempts','trace','combat','ledger','current','policyState','outcome','final','duration','finalHP'])assert.deepEqual(result[key],known[key],'Disabled mechanics/receipts changed: '+key);
 const canonical=rows=>rows.map(({role,tick,time,checkedTicks,requestedTicks,...extra})=>({role,tick,time,checkedTicks,requestedTicks,...(extra.endedWithBattle?{endedWithBattle:true}:{})}));
 assert.deepEqual(canonical(result.restoreChecks),canonical(known.restoreChecks),'Disabled natural continuation changed');
 return {exactReplay:true,policy:result.policy};
}
export async function runApproved(approvalPath,output){
 const packet=JSON.parse(readFileSync(approvalPath,'utf8')),binding=verifyApproval(packet,approvalPath,output),out=newExternalPath(output);mkdirSync(out);
 let interrupted=false;const interrupt=()=>{interrupted=true;};process.on('SIGINT',interrupt);process.on('SIGTERM',interrupt);
 const stopped=()=>interrupted||existsSync(out+'.stop'),manifest={format:'minor-reserve-comparison-results-v1',status:'active',binding,invocation:packet.invocation,reviewer:packet.reviewer,startedAt:new Date().toISOString(),cases:[],pairs:[]},donors=new Map();
 const saveManifest=()=>writeFileSync(path.join(out,'manifest.json'),json(manifest));saveManifest();
 try{
  for(const def of CASES){
   if(stopped())throw Error('Externally stopped before next comparison case');assert.deepEqual(sourceBinding(),binding,'Source changed between cases');
   try{
    const result=await runCase(def,{binding,stopped}),file=def.label+'.json',bytes=json(result);writeFileSync(path.join(out,file),bytes,{flag:'wx'});
    manifest.cases.push({label:def.label,policy:def.policy,reserveEnabled:def.reserveEnabled,file,sha256:hash(bytes),won:result.outcome.completed,duration:result.duration,finalHP:result.finalHP,playerSpend:result.ledger.spending[0],enemySpend:result.ledger.spending[1],reserve:result.events.summary});saveManifest();
    if(!def.reserveEnabled){const known=JSON.parse(readFileSync(path.join(BASELINE,def.policy+'.json'),'utf8'));verifyDisabledReplay(result,known);donors.set(def.policy,result);}
    else manifest.pairs.push({policy:def.policy,...verifyPairPrefix(donors.get(def.policy),result)});
    saveManifest();
   }catch(error){if(error.partial){const file=def.label+'.partial.json';writeFileSync(path.join(out,file),json(error.partial),{flag:'wx'});manifest.partial=file;}throw error;}
  }
  manifest.status='comparison-recorded-for-independent-review';manifest.completedAt=new Date().toISOString();saveManifest();return manifest;
 }catch(error){manifest.status=interrupted||stopped()?'stopped':'error';manifest.error=error.message;manifest.completedAt=new Date().toISOString();saveManifest();throw error;}
 finally{process.removeListener('SIGINT',interrupt);process.removeListener('SIGTERM',interrupt);}
}
async function main(args){
 if(args[0]==='--freeze'&&args.length===2){const output=newExternalPath(args[1]);writeFileSync(output,json(createFreeze()),{flag:'wx'});process.stdout.write(output+'\n');return;}
 if(args[0]==='--run-approved'&&args.length===3){const result=await runApproved(args[1],args[2]);process.stdout.write(result.status+'\n');return;}
 throw Error('Use --freeze NEW_EXTERNAL_FILE, or --run-approved REVIEWED_APPROVAL NEW_EXTERNAL_DIRECTORY. Neither command permits a seed, case or policy override.');
}
if(process.argv[1]&&path.resolve(process.argv[1])===RUNNER)main(process.argv.slice(2)).catch(error=>{process.stderr.write(error.stack+'\n');process.exitCode=1;});
