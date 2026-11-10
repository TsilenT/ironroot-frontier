/** Guarded baseline preparation/execution. No unguarded battle entry point. */
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,realpathSync,existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {platform,arch,release,endianness} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createReserve,MinorReserveGame,DESIGN,evaluateReserve} from './scenario.mjs';
import {POLICIES,createPolicy,CADENCE_TICKS} from './policies.mjs';
import {observeCombat,forceSummary} from './observe.mjs';
import {instrumentEconomy,verifyPlayerCadence} from '../salt-stores/economy.mjs';

export const ROOT=realpathSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..'));
export const EVIDENCE=path.resolve(ROOT,'../ironroot-minor-reserve-baseline-evidence');
export const RUNNER=fileURLToPath(import.meta.url);
const INVENTORY=path.resolve(ROOT,'../ironroot-minor-reserve-remote-c0f8f466-inventory.json');
const INVENTORY_SHA='0d302f73cc35e1652a799915d9e7012ff278076b93a64700cd3963bafd8139b2';
const WORK_FILES=['qa/minor-reserve/PLAN.json','qa/minor-reserve/README.md','qa/minor-reserve/index.html','qa/minor-reserve/observe.mjs','qa/minor-reserve/policies.mjs','qa/minor-reserve/run.mjs','qa/minor-reserve/scenario.mjs','qa/minor-reserve/shell.mjs','tests/minor-reserve-qa.test.mjs','tests/minor-reserve-runner.test.mjs'];
const MODIFIED=['qa/minor-reserve/PLAN.json','qa/minor-reserve/README.md','qa/minor-reserve/scenario.mjs','qa/minor-reserve/shell.mjs','tests/minor-reserve-qa.test.mjs'];
const NEW_FILES=['qa/minor-reserve/observe.mjs','qa/minor-reserve/policies.mjs','qa/minor-reserve/run.mjs','tests/minor-reserve-runner.test.mjs'];
const PARENT_COMMIT='c0f8f46609d05eaccc3040dd19c8477db1102c83',PARENT_TREE='b043e937d848f9906e1385c69961130e88fac9fa';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const json=value=>JSON.stringify(value,null,2)+'\n';
export function readPlan(){return JSON.parse(readFileSync(path.join(ROOT,'qa/minor-reserve/PLAN.json'),'utf8'));}
function walk(dir,prefix=''){return readdirSync(dir,{withFileTypes:true}).flatMap(e=>{const p=path.posix.join(prefix,e.name);if(e.isDirectory())return walk(path.join(dir,e.name),p);assert.ok(e.isFile(),'Source must not contain symlinks or special files');return [p];}).sort();}
export function sourceBinding(){
 assert.equal(realpathSync(process.cwd()),ROOT,'Use the frozen workspace as cwd.');
 const bytes=readFileSync(INVENTORY);assert.equal(hash(bytes),INVENTORY_SHA,'Canonical inventory changed');
 const inv=JSON.parse(bytes);assert.equal(inv.commit,PARENT_COMMIT);assert.equal(inv.sha,PARENT_TREE);assert.equal(inv.truncated,false);
 const present={},omitted=[],known=new Set(),changed={};
 for(const entry of inv.tree){if(entry.type!=='blob')continue;known.add(entry.path);const p=path.join(ROOT,entry.path);if(!existsSync(p)){omitted.push(entry.path);continue;}
  const data=readFileSync(p),git=createHash('sha1').update('blob '+data.length+'\0').update(data).digest('hex');if(MODIFIED.includes(entry.path)){assert.notEqual(git,entry.sha,'Declared modification is absent: '+entry.path);changed[entry.path]={parentBlob:entry.sha,sha256:hash(data)};}else assert.equal(git,entry.sha,'Unchanged parent blob changed: '+entry.path);present[entry.path]=hash(data);
 }
 assert.equal(Object.keys(present).length,1357);assert.deepEqual(Object.keys(changed).sort(),MODIFIED);assert.equal(omitted.length,1048);
 const additions=walk(ROOT).filter(p=>!known.has(p));assert.deepEqual(additions,NEW_FILES,'Only the exact four new runner/policy/test files are permitted');
 const plan=readPlan();assert.equal(plan.nextStage.seed,9104);assert.equal(plan.nextStage.reserveEnabled,false);assert.equal(plan.nextStage.maximumCases,3);assert.deepEqual(plan.nextStage.caseOrder,['north-supported','south-bypass','idle']);assert.equal(plan.nextStage.playerCadenceSeconds,CADENCE_TICKS*.05);assert.equal(plan.status,'prepared-awaiting-independent-review-and-authorization');
 return {workspace:ROOT,source:{commit:inv.commit,tree:inv.sha,inventory:INVENTORY,inventorySha256:INVENTORY_SHA,present:1357,omitted:1048,changed,designBaseline:DESIGN.sourceCommit,presentSha256:hash(JSON.stringify(present)),omittedSha256:hash(JSON.stringify(omitted))},workFiles:Object.fromEntries(WORK_FILES.map(p=>[p,hash(readFileSync(path.join(ROOT,p)))])),environment:{node:process.version,versions:process.versions,execPath:realpathSync(process.execPath),nodeBinarySha256:hash(readFileSync(process.execPath)),execArgv:process.execArgv,nodeOptions:process.env.NODE_OPTIONS??null,platform:platform(),arch:arch(),kernel:release(),endianness:endianness(),timezone:process.env.TZ??null},planSha256:hash(readFileSync(path.join(ROOT,'qa/minor-reserve/PLAN.json')))};
}
export function createFreeze(){return {format:'minor-reserve-baseline-freeze-v1',status:'pending-independent-review-and-authorization',binding:sourceBinding()};}
export function newExternalPath(value,evidenceRoot=EVIDENCE){
 const absolute=path.resolve(value),parent=realpathSync(path.dirname(absolute)),result=path.join(parent,path.basename(absolute));
 assert.ok(result.startsWith(path.resolve(evidenceRoot)+path.sep),'Generated artifacts must use the dedicated external evidence directory');assert.ok(!existsSync(result),'Never overwrite or retry an existing artifact');return result;
}
export function verifyApproval(packet,approvalPath,output,{bindingReader=sourceBinding,pathValidator=newExternalPath}={}){
 assert.equal(packet?.format,'minor-reserve-baseline-approved-v1');assert.equal(packet.status,'approved');assert.ok(typeof packet.reviewer==='string'&&packet.reviewer.trim());assert.ok(typeof packet.authorization==='string'&&packet.authorization.trim());
 assert.equal(packet.freeze?.format,'minor-reserve-baseline-freeze-v1');assert.equal(packet.freeze.status,'pending-independent-review-and-authorization');assert.deepEqual(packet.freeze.binding,bindingReader(),'Exact source/environment/plan binding changed');
 assert.deepEqual(packet.invocation,[process.execPath,RUNNER,'--run-approved',realpathSync(approvalPath),path.resolve(output)],'Approval must bind exact invocation and fresh external output');
 pathValidator(output);return packet.freeze.binding;
}
function auditPrices(game,ledger){
 verifyPlayerCadence(ledger.transactions);
 for(const t of ledger.transactions){const expected=t.method==='build'?game.buildings[t.type].cost:t.method==='upgrade'?Math.round(game.buildings[t.type].cost*(.7+.35*(t.before.building.level-1))):t.method==='cast'?game.ruleset.spell.cost:t.method==='buyCitadelOption'?game.ruleset.citadel.cost:-Math.floor(t.before.building.invested*.5*t.before.building.hp/t.before.building.maxHp);assert.equal(t.cost,expected,'Ordinary payment/refund changed');}
 assert.ok(ledger.maxError.every(n=>n<=1e-6),'Economy reconciliation failed');
}
async function runCase(policyId,{binding,stopped}){
 const game=createReserve({seed:9104,reserveEnabled:false}),policy=createPolicy(policyId),initial=game.serialize();
 assert.deepEqual(MinorReserveGame.restore(JSON.stringify(initial)).serialize(),initial,'Initial QA roundtrip');
 const observer=observeCombat(game),economy=instrumentEconomy(game),attempts=[],commands=[],trace=[forceSummary(game)],restoreChecks=[],shadows=[];
 let activeAI=false;const ai=game._ai;game._ai=function(...args){activeAI=true;try{return ai.apply(this,args);}finally{activeAI=false;}};
 for(const method of ['build','upgrade','cast','sell','buyCitadelOption']){const original=game[method];game[method]=function(...args){
  const side=method==='build'?(args[3]??0):method==='cast'?(args[2]??0):(args[1]??0),beforeGold=this.state.gold[side],beforeKills=this.state.stats.kills[side],result=original.apply(this,args);
  attempts.push(structuredClone({tick:this.tick,time:this.state.time,actor:activeAI?'ai':'player',side,method,args,beforeGold,afterGold:this.state.gold[side],killDelta:this.state.stats.kills[side]-beforeKills,ok:result.ok,reason:result.reason??null,building:result.building??null}));return result;
 };}
 const sampled=new Set();
 function probe(role){
  if(sampled.has(role))return;sampled.add(role);const save=game.serialize(),restored=MinorReserveGame.restore(JSON.stringify(save));assert.deepEqual(restored.serialize(),save,'Natural save roundtrip');
  const row={role,tick:game.tick,time:game.state.time,checkedTicks:0,requestedTicks:10};restoreChecks.push(row);shadows.push({game:restored,policy:createPolicy(policyId,policy.serialize()),row});
 }
 function partial(){return {policy:policyId,seed:9104,reserveEnabled:false,initial,commands,attempts,trace,combat:observer.receipt,ledger:economy.snapshot(),restoreChecks,current:game.serialize(),policyState:policy.serialize()};}
 try{
  for(;;){
   const outcome=evaluateReserve(game);if(outcome.completed||outcome.failed)break;
   if(game.tick%100===0){await new Promise(resolve=>setImmediate(resolve));if(stopped())throw Error('Externally stopped baseline stage');}
   const row=policy.step(game);if(row)commands.push(row);
   for(const shadow of shadows){const replay=shadow.policy.step(shadow.game);assert.deepEqual(replay,row,'Restored ordinary command changed');}
   const tick=game.tick;game.update(.05);assert.equal(game.tick,tick+1,'Simulation did not advance one fixed tick');observer.assertDrained();economy.reconcile();
   for(let i=shadows.length-1;i>=0;i--){const shadow=shadows[i];shadow.game.update(.05);assert.deepEqual(shadow.game.serialize(),game.serialize(),'Natural save continuation diverged');assert.deepEqual(shadow.policy.serialize(),policy.serialize(),'Policy continuation diverged');shadow.row.checkedTicks++;if(shadow.row.checkedTicks===10)shadows.splice(i,1);}
   if(game.tick%100===0)trace.push(forceSummary(game));
   const ended=evaluateReserve(game);if(!ended.completed&&!ended.failed){
    if(game.tick===600)probe('30-seconds');if(game.tick===1800)probe('90-seconds');
    for(const side of [0,1])if(observer.receipt.firstOriginalStructureLossAt[side]!==null)probe('first-original-loss-side-'+side);
   }
  }
  const outcome=evaluateReserve(game),final=game.serialize(),ledger=economy.snapshot();assert.deepEqual(MinorReserveGame.restore(JSON.stringify(final)).serialize(),final,'Final QA roundtrip');auditPrices(game,ledger);
  assert.equal(game.reserve.enabled,false);assert.equal(game.reserve.releases.length,0);assert.deepEqual(sourceBinding(),binding,'Source or environment changed during case');
  for(const shadow of shadows)shadow.row.endedWithBattle=true;
  for(const at of [30,90])if(game.state.time>at+.5+1e-7)assert.ok(restoreChecks.some(c=>c.role===at+'-seconds'&&c.checkedTicks===10),'Reached save checkpoint missing ten-tick continuation');
  return {...partial(),outcome,final,duration:game.state.time,finalHP:game.state.bases.map(b=>b.hp),scope:'Disabled-reserve natural paid baseline; feasibility only, not human balance or campaign admission'};
 }catch(error){error.partial=partial();throw error;}
}
export async function runApproved(approvalPath,output){
 const packet=JSON.parse(readFileSync(approvalPath,'utf8')),binding=verifyApproval(packet,approvalPath,output),out=newExternalPath(output);mkdirSync(out);
 let interrupted=false;const interrupt=()=>{interrupted=true;};process.on('SIGINT',interrupt);process.on('SIGTERM',interrupt);
 const stopped=()=>interrupted||existsSync(out+'.stop'),manifest={format:'minor-reserve-baseline-results-v1',status:'active',binding,invocation:packet.invocation,reviewer:packet.reviewer,startedAt:new Date().toISOString(),cases:[]};
 const saveManifest=()=>writeFileSync(path.join(out,'manifest.json'),json(manifest));saveManifest();
 try{
  for(const id of ['north-supported','south-bypass','idle']){
   if(stopped())throw Error('Externally stopped before next baseline case');assert.deepEqual(sourceBinding(),binding,'Source changed between cases');
   try{const result=await runCase(id,{binding,stopped}),file=id+'.json',bytes=json(result);writeFileSync(path.join(out,file),bytes,{flag:'wx'});manifest.cases.push({policy:id,file,sha256:hash(bytes),won:result.outcome.completed,duration:result.duration,finalHP:result.finalHP,playerSpend:result.ledger.spending[0],enemySpend:result.ledger.spending[1],firstOriginalPostLossAt:result.combat.firstOriginalPostLossAt,firstCoreDamageAt:result.combat.firstCoreDamageAt});saveManifest();}
   catch(error){if(error.partial){const file=id+'.partial.json';writeFileSync(path.join(out,file),json(error.partial),{flag:'wx'});manifest.partial=file;}throw error;}
  }
  const paidWins=manifest.cases.filter(c=>c.policy!=='idle'&&c.won&&c.playerSpend>0);manifest.status=paidWins.length?'baseline-feasible-for-independent-review':'baseline-no-paid-win-stop';manifest.warnings=manifest.cases.find(c=>c.policy==='idle').won?['Idle wins: review baseline weakness before reserve work.']:[];manifest.completedAt=new Date().toISOString();saveManifest();return manifest;
 }catch(error){manifest.status=interrupted||stopped()?'stopped':'error';manifest.error=error.message;manifest.completedAt=new Date().toISOString();saveManifest();throw error;}
 finally{process.removeListener('SIGINT',interrupt);process.removeListener('SIGTERM',interrupt);}
}
async function main(args){
 if(args[0]==='--freeze'&&args.length===2){const output=newExternalPath(args[1]);writeFileSync(output,json(createFreeze()),{flag:'wx'});process.stdout.write(output+'\n');return;}
 if(args[0]==='--run-approved'&&args.length===3){const result=await runApproved(args[1],args[2]);process.stdout.write(result.status+'\n');return;}
 throw Error('Use --freeze NEW_EXTERNAL_FILE, or --run-approved REVIEWED_APPROVAL NEW_EXTERNAL_DIRECTORY. Neither command permits a seed/policy override.');
}
if(process.argv[1]&&path.resolve(process.argv[1])===RUNNER)main(process.argv.slice(2)).catch(error=>{process.stderr.write(error.stack+'\n');process.exitCode=1;});
