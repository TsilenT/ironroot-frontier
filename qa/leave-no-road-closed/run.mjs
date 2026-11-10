/** Closed until independent preflight + parent authorization. Imports never run cases. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,readdirSync,existsSync,realpathSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {setImmediate as yieldToEventLoop} from 'node:timers/promises';
import {bridgeStatus,campaignControlStatus} from '../../dist/bridge-control.js';
import {instrumentEconomy,verifyPlayerCadence} from '../salt-stores/economy.mjs';
import {DESIGN,createPrototype,evaluatePrototype,savePrototype,restorePrototype} from './scenario.mjs';
import {POLICIES,createPolicy} from './policies.mjs';
export const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
export const PLAN=JSON.parse(readFileSync(new URL('./PLAN.json',import.meta.url)));
export const sha256=value=>createHash('sha256').update(typeof value==='string'||Buffer.isBuffer(value)?value:JSON.stringify(value)).digest('hex');
export function freeze(){
 const files={};
 for(const name of readdirSync(path.join(ROOT,'dist')).filter(n=>n.endsWith('.js')).sort())files['dist/'+name]=sha256(readFileSync(path.join(ROOT,'dist',name)));
 for(const name of ['package.json','qa/salt-stores/economy.mjs','qa/leave-no-road-closed/scenario.mjs','qa/leave-no-road-closed/policies.mjs','qa/leave-no-road-closed/run.mjs','qa/leave-no-road-closed/PLAN.json','tests/leave-no-road-closed-prototype.test.mjs','docs/LEAVE_NO_ROAD_CLOSED_PROTOTYPE.md'])files[name]=sha256(readFileSync(path.join(ROOT,name)));
 const closure={baselineCommit:DESIGN.baselineCommit,baselineTree:DESIGN.baselineTree,node:process.version,files,design:DESIGN,policies:POLICIES,plan:PLAN};
 return {format:'leave-roads-freeze-v1',status:'awaiting-independent-preflight',sha256:sha256(closure),closure};
}
export function verifyApproval(approval){
 assert.equal(approval?.format,'leave-roads-approval-v1');
 assert.equal(approval.status,'parent-authorized-after-independent-preflight');
 assert.ok(typeof approval.independentReviewer==='string'&&approval.independentReviewer.trim());
 assert.ok(typeof approval.parentAuthorization==='string'&&approval.parentAuthorization.trim());
 assert.equal(approval.freezeSha256,freeze().sha256,'Changed source/design/plan/runtime');
 return true;
}
export function validateOutput(file){
 const absolute=path.resolve(file),parent=realpathSync(path.dirname(absolute)),resolved=path.join(parent,path.basename(absolute)),root=realpathSync(ROOT);
 assert.ok(resolved!==root&&!resolved.startsWith(root+path.sep),'Generated output must remain outside repository');
 assert.equal(existsSync(resolved),false,'Refusing to overwrite output');
 return resolved;
}
/** The engine's fixed tick already enforces this control rule's deadline.
 * Never clamp its input to a floating-point remainder below one whole tick. */
export function advanceRunnerTick(game){
 const before=evaluatePrototype(game);if(before.completed||before.failed)return before;
 const tick=game.tick;game.update(.05);
 assert.equal(game.tick,tick+1,'Active simulation failed to advance one fixed tick');
 return evaluatePrototype(game);
}
function safeSnapshot(read){try{return JSON.parse(JSON.stringify(read()??null));}catch(error){return {captureError:error.message};}}
const errorRecord=error=>({name:error.name??'Error',message:error.message??String(error),code:error.code??null,stack:error.stack??null});
/** Yield at most every 100 native ticks and between cases; release all handlers. */
export function createRunControl(out){
 let signal=null;const onInt=()=>{signal='SIGINT';},onTerm=()=>{signal='SIGTERM';};
 process.on('SIGINT',onInt);process.on('SIGTERM',onTerm);
 return {async checkpoint(){
  await yieldToEventLoop();
  if(signal||existsSync(out+'.stop')){const error=Error(signal?'Cancelled by '+signal:'Cancelled by stop file');error.code='STOP_REQUESTED';throw error;}
 },close(){process.off('SIGINT',onInt);process.off('SIGTERM',onTerm);}};
}
/** Raw completion is retained BEFORE validation. Interrupted/error drafts remain
 * separate and never receive a verified receipt. Nothing automatically retries. */
export async function retainCaseArtifacts({out,stem,run,verify,snapshot=()=>null}){
 let row;try{
  row=await run();const raw=JSON.stringify(row);
  writeFileSync(path.join(out,stem+'.json'),raw,{flag:'wx'});
  await verify(row);
  writeFileSync(path.join(out,stem+'-verified.json'),JSON.stringify({status:'case-and-source-verified',rawSha256:sha256(raw)}),{flag:'wx'});
  return row;
 }catch(error){
  const draft=row??error.partial??safeSnapshot(snapshot);
  const serializable=draft&&typeof draft==='object'?Object.fromEntries(Object.entries(draft).map(([key,value])=>[key,safeSnapshot(()=>value)])):safeSnapshot(()=>draft);
  writeFileSync(path.join(out,stem+'-partial.json'),JSON.stringify({status:'incomplete',error:errorRecord(error),draft:serializable}),{flag:'wx'});
  throw error;
 }
}
async function executeCase({seed,spec,checkpoint}){
 let game,initial,economy,player,phase='before-factory';const caseId=spec.id;
 const commands=[],trace=[],bridgeEvents=[],losses=[],restoreChecks=[],shadows=[],peakUnits=[0,0],firstCoreDamage=[null,null];
 let steps=0,nextTrace=0,priorBridges='',priorCredit=false,priorHeld=0,aiCalls=0;
 const capture=()=>({caseId,seed,policy:spec.policy,requiredBridges:spec.requiredBridges,phase,
  initial:safeSnapshot(()=>initial),current:safeSnapshot(()=>game&&savePrototype(game)),policyState:safeSnapshot(()=>player?.snapshot()),
  commands:safeSnapshot(()=>commands),trace:safeSnapshot(()=>trace),bridgeEvents:safeSnapshot(()=>bridgeEvents),losses:safeSnapshot(()=>losses),restoreChecks:safeSnapshot(()=>restoreChecks),
  ledger:safeSnapshot(()=>economy?.snapshot()),peakUnits:[...peakUnits],firstCoreDamage:[...firstCoreDamage],aiCalls});
 try{
 game=createPrototype({seed,requiredBridges:spec.requiredBridges});const s=game.state;
 initial=savePrototype(game);economy=instrumentEconomy(game);player=createPolicy(spec.policy);phase='initial-restore';
 const originalAI=game._ai;game._ai=function(...args){aiCalls++;return originalAI.apply(this,args);};
 const damage=game._damage;game._damage=function(target,...args){
  const before=target.hp,result=damage.call(this,target,...args);
  if(!this.damageQueue&&target.hp<before){
   if(target.type==='base'&&firstCoreDamage[target.side]===null)firstCoreDamage[target.side]=s.time;
   if(before>0&&target.hp<=0&&this.buildings[target.type])losses.push({tick:this.tick,time:s.time,id:target.id,type:target.type,side:target.side,lane:target.lane});
  }return result;
 };
 function sample(){
  const counts=[0,1].map(side=>s.units.filter(u=>u.side===side&&u.hp>0).length);
  counts.forEach((n,side)=>{assert.ok(n<=70);peakUnits[side]=Math.max(peakUnits[side],n);});
  const bridges=bridgeStatus(game),held=s.campaignControl.heldSeconds,credited=held>priorHeld+1e-9;
  const key=JSON.stringify(bridges.map(({owner,blocked,capturing})=>({owner,blocked,capturing})));
  if(key!==priorBridges||credited!==priorCredit)bridgeEvents.push({tick:game.tick,time:s.time,held,credited,count:campaignControlStatus(game).count,bridges});
  priorBridges=key;priorCredit=credited;priorHeld=held;
  if(game.tick>=nextTrace){
   trace.push({tick:game.tick,time:s.time,hp:s.bases.map(b=>b.hp),gold:[...s.gold],held,bridges,
    coverage:game.map.lanes.map((_,lane)=>({lane,playerFactories:s.buildings.filter(b=>b.side===0&&b.lane===lane&&game.buildings[b.type].unit).map(({id,type,level,hp})=>({id,type,level,hp})),units:[0,1].map(side=>s.units.filter(u=>u.side===side&&u.lane===lane).length)}))});
   nextTrace+=100;
  }
 }
 // QA envelope equality at tick zero. Ordinary native restore is deliberately unavailable.
 assert.deepEqual(savePrototype(restorePrototype(initial)),initial);sample();
 phase='running';
 while(!evaluatePrototype(game).completed&&!evaluatePrototype(game).failed){
  if(game.tick%100===0)await checkpoint();
  assert.ok(++steps<=12002,'Fixed-tick guard');
  const row=player.step(game);if(row)commands.push(row);
  for(const shadow of shadows)assert.deepEqual(shadow.player.step(shadow.game),row,'Restored policy command diverged');
  advanceRunnerTick(game);
  economy.reconcile();sample();
  for(let i=shadows.length-1;i>=0;i--){
   const shadow=shadows[i];shadow.game.update(.05);
   assert.deepEqual(savePrototype(shadow.game),savePrototype(game),'Restored native continuation diverged');
   shadow.receipt.checkedTicks++;if(--shadow.remaining===0)shadows.splice(i,1);
  }
  if([600,1800].includes(game.tick)&&!evaluatePrototype(game).completed&&!evaluatePrototype(game).failed){
   const save=savePrototype(game),restored=restorePrototype(save);assert.deepEqual(savePrototype(restored),save);
   const receipt={tick:game.tick,envelopeRoundTrip:true,checkedTicks:0};restoreChecks.push(receipt);
   shadows.push({game:restored,player:createPolicy(spec.policy,{state:player.snapshot()}),remaining:5,receipt});
  }
 }
 phase='raw-completion';const ledger=economy.snapshot(),final=savePrototype(game);
 const paidByRoad=game.map.lanes.map((_,lane)=>ledger.transactions.filter(t=>t.side===0&&t.lane===lane&&t.type!=='mint').reduce((n,t)=>n+t.cost,0));
 return {scope:'QA-only fresh design, not an admitted mission or human difficulty claim',caseId,seed,policy:spec.policy,requiredBridges:spec.requiredBridges,
  outcome:evaluatePrototype(game),duration:s.time,finalHP:s.bases.map(b=>b.hp),held:s.campaignControl.heldSeconds,paidByRoad,peakUnits,firstCoreDamage,aiCalls,initial,final,commands,trace,bridgeEvents,losses,restoreChecks,ledger};
 }catch(error){error.partial=capture();throw error;}
}
function validateCompletedCase(row,approval){
 const game=restorePrototype(row.final);assert.deepEqual(savePrototype(game),row.final);
 verifyPlayerCadence(row.ledger.transactions);
 for(const t of row.ledger.transactions){
  const price=t.method==='build'?game.buildings[t.type].cost:t.method==='upgrade'?Math.round(game.buildings[t.type].cost*(.7+.35*(t.before.building.level-1))):t.method==='cast'?game.ruleset.spell.cost:game.ruleset.citadel.cost;
  assert.equal(t.cost,price,'Nonstandard price');
 }
 verifyApproval(approval);
}
export async function runApprovedMatrix({approval,out}){
 verifyApproval(approval);out=validateOutput(out);const cases=validateOutput(out+'.cases');mkdirSync(cases);
 const control=createRunControl(out),results=[];let current=null;
 const writeStatus=(status,error=null)=>writeFileSync(out,JSON.stringify({freezeSha256:approval.freezeSha256,status,casesDirectory:cases,current,error:error&&errorRecord(error),results}));
 try{
  writeStatus('running');
  for(const seed of PLAN.knownSeeds)for(const spec of PLAN.cases){
   current={seed,caseId:spec.id};await control.checkpoint();verifyApproval(approval);
   const stem=`${seed}-${spec.id}`;
   const result=await retainCaseArtifacts({out:cases,stem,run:()=>executeCase({seed,spec,checkpoint:()=>control.checkpoint()}),verify:async row=>{await control.checkpoint();validateCompletedCase(row,approval);}});
   results.push({caseId:result.caseId,seed:result.seed,policy:result.policy,requiredBridges:result.requiredBridges,outcome:result.outcome,duration:result.duration,finalHP:result.finalHP,held:result.held,paidByRoad:result.paidByRoad,rawFile:path.join(cases,stem+'.json'),verified:true});
   current=null;writeStatus(results.length===PLAN.naturalCaseCount?'complete':'partial');
   process.stdout.write(`${seed} ${spec.id}: ${result.outcome.reason} at ${result.duration.toFixed(2)}s\n`);
  }
  return results;
 }catch(error){writeStatus('incomplete',error);throw error;}
 finally{control.close();}
}
const invoked=process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(invoked){
 const [mode,a,b,...extra]=process.argv.slice(2);assert.equal(extra.length,0);
 if(mode==='--freeze'&&a&&!b){const out=validateOutput(a);writeFileSync(out,JSON.stringify(freeze(),null,2));process.stdout.write(`Frozen only: ${out}\n`);}
 else if(mode==='--run-approved'&&a&&b){
  await runApprovedMatrix({approval:JSON.parse(readFileSync(a)),out:b});
 }else throw Error('Use --freeze OUTSIDE_FILE or --run-approved APPROVAL OUTSIDE_FILE. Natural runs require independent preflight and parent authorization.');
}
