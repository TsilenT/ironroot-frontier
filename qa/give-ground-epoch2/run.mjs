/** Closed until independent preflight + parent authorization. Imports never run cases. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,readdirSync,existsSync,realpathSync,mkdirSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {instrumentEconomy,verifyPlayerCadence} from '../salt-stores/economy.mjs';
import {DESIGN,createPrototype,evaluatePrototype,savePrototype,restorePrototype,metadataFor} from './scenario.mjs';
import {POLICIES,createPolicy} from './policies.mjs';
import {sha256,verifySourcePacket,validateOutput,advanceRunnerTick,createRunControl,retainCaseArtifacts,observeProduction} from '../give-ground/run.mjs';
export {sha256,verifySourcePacket,validateOutput,advanceRunnerTick,createRunControl,retainCaseArtifacts,observeProduction};
export const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
export const PLAN=JSON.parse(readFileSync(new URL('./PLAN.json',import.meta.url)));
export function freeze(){
 assert.equal(PLAN.epoch,2);assert.equal(PLAN.status,'closed-awaiting-independent-preflight-and-scoped-authorization');assert.deepEqual(PLAN.knownSeeds,[9467]);assert.deepEqual(PLAN.cases.map(c=>c.policy),['rescue','front','rear']);assert.equal(PLAN.naturalCaseCount,3);
 const files={};
 for(const name of readdirSync(path.join(ROOT,'dist')).filter(n=>n.endsWith('.js')).sort())files['dist/'+name]=sha256(readFileSync(path.join(ROOT,'dist',name)));
 for(const name of ['package.json','qa/salt-stores/economy.mjs',
  ...readdirSync(path.join(ROOT,'qa/give-ground')).map(n=>'qa/give-ground/'+n),
  ...readdirSync(path.join(ROOT,'qa/give-ground-epoch2')).map(n=>'qa/give-ground-epoch2/'+n),
  ...readdirSync(path.join(ROOT,'tests')).filter(n=>n.startsWith('give-ground')).map(n=>'tests/'+n),
  ...readdirSync(path.join(ROOT,'docs')).filter(n=>n.startsWith('GIVE_GROUND')).map(n=>'docs/'+n)].sort())files[name]=sha256(readFileSync(path.join(ROOT,name)));
 const closure={baselineCommit:DESIGN.baselineCommit,baselineTree:DESIGN.baselineTree,node:process.version,files,design:DESIGN,policies:POLICIES,plan:PLAN};
 return {format:'give-ground-freeze-v2',status:'awaiting-independent-preflight',sha256:sha256(closure),closure};
}
export function verifyApproval(approval,out){
 assert.ok(approval&&Object.getPrototypeOf(approval)===Object.prototype);
 assert.deepEqual(Object.keys(approval).sort(),['format','status','independentReviewer','parentAuthorization','freezeSha256','recoveryCheckpoint','recoveryCheckpointSha256','outputPath'].sort());
 assert.ok(typeof approval.outputPath==='string'&&approval.outputPath.trim());
 assert.equal(path.resolve(approval.outputPath),path.resolve(out),'Approval is for another output path');
 assert.equal(approval?.format,'give-ground-approval-v2');
 assert.equal(approval.status,'parent-authorized-after-independent-preflight');
 assert.ok(typeof approval.independentReviewer==='string'&&approval.independentReviewer.trim());
 assert.ok(typeof approval.parentAuthorization==='string'&&approval.parentAuthorization.trim());
 assert.equal(approval.freezeSha256,freeze().sha256,'Changed source/design/plan/runtime');
 assert.ok(typeof approval.recoveryCheckpoint==='string'&&approval.recoveryCheckpoint.trim(),'Recovery checkpoint file required');
 const checkpointPath=realpathSync(approval.recoveryCheckpoint),root=realpathSync(ROOT);
 assert.ok(!checkpointPath.startsWith(root+path.sep),'Recovery checkpoint must be external');
 const raw=readFileSync(checkpointPath);
 assert.equal(approval.recoveryCheckpointSha256,sha256(raw),'Recovery checkpoint changed');
 const checkpoint=JSON.parse(raw);
 assert.equal(checkpoint.format,'give-ground-recovery-v2');
 assert.equal(checkpoint.freezeSha256,approval.freezeSha256);
 assert.equal(checkpoint.status,'source-checkpoint-retained');
 assert.ok(typeof checkpoint.sourcePacket==='string'&&checkpoint.sourcePacket.trim());
 const packetPath=realpathSync(checkpoint.sourcePacket);
 assert.ok(!packetPath.startsWith(root+path.sep),'Source packet must be external');
 assert.equal(sha256(readFileSync(packetPath)),checkpoint.sourcePacketSha256,'Source packet unavailable or changed');
 const manifestPath=realpathSync(checkpoint.manifest);
 assert.ok(!manifestPath.startsWith(root+path.sep),'Manifest must be external');
 const manifestRaw=readFileSync(manifestPath);
 assert.equal(sha256(manifestRaw),checkpoint.manifestSha256,'Manifest changed');
 const manifest=JSON.parse(manifestRaw);
 assert.equal(manifest.freezeSha256,approval.freezeSha256,'Manifest source closure mismatch');
 assert.equal(manifest.sourcePacketSha256,checkpoint.sourcePacketSha256,'Manifest packet mismatch');
 assert.deepEqual(manifest.files,freeze().closure.files,'Manifest file closure mismatch');
 verifySourcePacket(readFileSync(packetPath),manifest.files);
 return true;
}
function safeSnapshot(read){try{return JSON.parse(JSON.stringify(read()??null));}catch(error){return {captureError:error.message};}}
const errorRecord=error=>({name:error.name??'Error',message:error.message??String(error),code:error.code??null,stack:error.stack??null});
/** Additional read-only native fire receipts distinguish outgoing activity from
 * incoming factory contact. Nominal fire damage is NOT committed damage. */
export function observeEpoch2Production(game,originalId){
 const base=observeProduction(game,originalId),fire=game._fire,fireEvents=[];
 game._fire=function(attacker,target,...args){
  fireEvents.push({tick:this.tick,time:this.state.time,attackerId:attacker.id,attackerType:attacker.type,attackerSide:attacker.side,targetId:target.id,targetType:target.type,targetSide:target.side,nominalDamage:args[0]});
  return fire.call(this,attacker,target,...args);
 };
 return {sample:()=>base.sample(),snapshot:()=>({...base.snapshot(),fireEvents:structuredClone(fireEvents)})};
}
async function executeCase({seed,spec,checkpoint}){
 let game,initial,economy,player,observer,phase='before-factory';
 const commands=[],trace=[],restoreChecks=[],shadows=[];let steps=0,nextTrace=0,aiCalls=0;
 const capture=()=>({caseId:spec.id,seed,policy:spec.policy,phase,initial:safeSnapshot(()=>initial),current:safeSnapshot(()=>game&&savePrototype(game)),policyState:safeSnapshot(()=>player?.snapshot()),commands,trace,restoreChecks,observations:safeSnapshot(()=>observer?.snapshot()),ledger:safeSnapshot(()=>economy?.snapshot()),aiCalls});
 try{
  game=createPrototype({seed});initial=savePrototype(game);economy=instrumentEconomy(game);player=createPolicy(spec.policy);
  observer=observeEpoch2Production(game,metadataFor(game).originalProducerId);
  const nativeAI=game._ai;game._ai=function(...args){aiCalls++;return nativeAI.apply(this,args);};
  assert.deepEqual(savePrototype(restorePrototype(initial)),initial);
  const sample=()=>{
   const event=observer.sample();
   if(game.tick>=nextTrace){
    const s=game.state;trace.push({tick:game.tick,time:s.time,hp:s.bases.map(b=>b.hp),gold:[...s.gold],buildings:s.buildings.filter(b=>b.side===0).map(({id,type,x,lane,hp,level,progress})=>({id,type,x,lane,hp,level,progress})),lanes:game.map.lanes.map((_,lane)=>({lane,units:[0,1].map(side=>s.units.filter(u=>u.side===side&&u.lane===lane&&u.hp>0).map(({id,type,x,hp})=>({id,type,x,hp})))}))});nextTrace+=100;
   }return event;
  };
  sample();phase='running';
  while(!evaluatePrototype(game).completed&&!evaluatePrototype(game).failed){
   if(game.tick%100===0)await checkpoint();assert.ok(++steps<=12001,'Fixed tick guard');
   const command=player.step(game);if(command)commands.push(command);
   for(const shadow of shadows)assert.deepEqual(shadow.player.step(shadow.game),command,'Saved policy diverged');
   const before=savePrototype(game),beforePolicy=player.snapshot();
   advanceRunnerTick(game);economy.reconcile();const event=sample();
   for(let i=shadows.length-1;i>=0;i--){const shadow=shadows[i];advanceRunnerTick(shadow.game);assert.deepEqual(savePrototype(shadow.game),savePrototype(game),'Saved continuation diverged');shadow.receipt.checkedTicks++;if(--shadow.remaining===0)shadows.splice(i,1);}
   if(event.newOriginalLoss){
    const restored=restorePrototype(before);advanceRunnerTick(restored);assert.deepEqual(savePrototype(restored),savePrototype(game),'Before-loss continuation diverged');
    restoreChecks.push({kind:'immediately-before-loss',tick:before.engine?.tick??before.tick,checkedTicks:1,save:before,policyState:beforePolicy});
   }
   if(event.newOriginalLoss||[600,1800].includes(game.tick)){
    const saved=savePrototype(game),restored=restorePrototype(saved);assert.deepEqual(savePrototype(restored),saved);
    const receipt={kind:event.newOriginalLoss?'immediately-after-loss':'timed',tick:game.tick,checkedTicks:0,save:saved,policyState:player.snapshot()};restoreChecks.push(receipt);
    if(!evaluatePrototype(game).completed&&!evaluatePrototype(game).failed)shadows.push({game:restored,player:createPolicy(spec.policy,{state:player.snapshot()}),receipt,remaining:5});
   }
  }
  phase='raw-completion';return {...capture(),scope:'QA only; no balance, human difficulty, admission or held-out claim',outcome:evaluatePrototype(game),duration:game.state.time,finalHP:game.state.bases.map(b=>b.hp),final:savePrototype(game)};
 }catch(error){error.partial=capture();throw error;}
}
function validateCompletedCase(row,approval,out){
 const game=restorePrototype(row.final);assert.deepEqual(savePrototype(game),row.final);
 verifyPlayerCadence(row.ledger.transactions);
 for(let i=1;i<row.commands.length;i++)assert.ok(row.commands[i].tick-row.commands[i-1].tick>=DESIGN.cadenceTicks,'Player attempt cadence');
 for(const t of row.ledger.transactions){
  const price=t.method==='build'?game.buildings[t.type].cost:t.method==='upgrade'?Math.round(game.buildings[t.type].cost*(.7+.35*(t.before.building.level-1))):t.method==='sell'?-Math.floor(t.before.building.invested*.5*(t.before.building.hp/t.before.building.maxHp)):t.method==='cast'?game.ruleset.spell.cost:game.ruleset.citadel.cost;
  assert.equal(t.cost,price,'Nonstandard price or refund');
 }
 for(const producer of row.observations.producers.filter(p=>p.replacement))assert.ok(row.ledger.transactions.some(t=>t.side===0&&t.method==='build'&&t.id===producer.id&&t.cost===game.buildings[producer.type].cost),'Replacement must be paid');
 verifyApproval(approval,out);
}
export async function runApprovedMatrix({approval,out}){
 verifyApproval(approval,out);out=validateOutput(out);const cases=validateOutput(out+'.cases');mkdirSync(cases);
 const control=createRunControl(out),results=[];let current=null;
 const writeStatus=(status,error=null)=>writeFileSync(out,JSON.stringify({freezeSha256:approval.freezeSha256,status,casesDirectory:cases,current,error:error&&errorRecord(error),results}));
 try{
  writeFileSync(out,JSON.stringify({status:'running',freezeSha256:approval.freezeSha256,casesDirectory:cases}),{flag:'wx'});
  for(const seed of PLAN.knownSeeds)for(const spec of PLAN.cases){
   current={seed,caseId:spec.id};await control.checkpoint();verifyApproval(approval,out);
   const stem=`${seed}-${spec.id}`;
   const result=await retainCaseArtifacts({out:cases,stem,run:()=>executeCase({seed,spec,checkpoint:()=>control.checkpoint()}),verify:async row=>{await control.checkpoint();validateCompletedCase(row,approval,out);}});
   results.push({caseId:result.caseId,seed,policy:result.policy,outcome:result.outcome,duration:result.duration,finalHP:result.finalHP,rawFile:path.join(cases,stem+'.json'),verified:true});current=null;
   writeStatus(results.length===PLAN.naturalCaseCount?'complete':'partial');
   process.stdout.write(`${seed} ${spec.id}: ${result.outcome.reason} at ${result.duration.toFixed(2)}s\n`);
  }return results;
 }catch(error){writeStatus('incomplete',error);throw error;}finally{control.close();}
}
const invoked=process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(invoked){
 const [mode,a,b,...extra]=process.argv.slice(2);assert.equal(extra.length,0);
 if(mode==='--freeze'&&a&&!b){const out=validateOutput(a);writeFileSync(out,JSON.stringify(freeze(),null,2),{flag:'wx'});process.stdout.write(`Frozen only: ${out}\n`);}
 else if(mode==='--run-approved'&&a&&b)await runApprovedMatrix({approval:JSON.parse(readFileSync(a)),out:b});
 else throw Error('Use --freeze OUTSIDE_FILE or --run-approved APPROVAL OUTSIDE_FILE. Natural runs require independent preflight, retained source recovery checkpoint and parent authorization.');
}
