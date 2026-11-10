/** Closed until independent preflight + parent authorization. Imports never run cases. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,readdirSync,existsSync,realpathSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {setImmediate as yieldToEventLoop} from 'node:timers/promises';
import {instrumentEconomy,verifyPlayerCadence} from '../salt-stores/economy.mjs';
import {DESIGN,createPrototype,evaluatePrototype,savePrototype,restorePrototype,metadataFor} from './scenario.mjs';
import {POLICIES,createPolicy} from './policies.mjs';
export const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
export const PLAN=JSON.parse(readFileSync(new URL('./PLAN.json',import.meta.url)));
export const sha256=value=>createHash('sha256').update(typeof value==='string'||Buffer.isBuffer(value)?value:JSON.stringify(value)).digest('hex');
export function freeze(){
 const files={};
 for(const name of readdirSync(path.join(ROOT,'dist')).filter(n=>n.endsWith('.js')).sort())files['dist/'+name]=sha256(readFileSync(path.join(ROOT,'dist',name)));
 for(const name of ['package.json','qa/salt-stores/economy.mjs',
  ...readdirSync(path.join(ROOT,'qa/give-ground')).map(n=>'qa/give-ground/'+n),
  ...readdirSync(path.join(ROOT,'tests')).filter(n=>n.startsWith('give-ground')).map(n=>'tests/'+n),
  ...readdirSync(path.join(ROOT,'docs')).filter(n=>n.startsWith('GIVE_GROUND')).map(n=>'docs/'+n)].sort())files[name]=sha256(readFileSync(path.join(ROOT,name)));
 const closure={baselineCommit:DESIGN.baselineCommit,baselineTree:DESIGN.baselineTree,node:process.version,files,design:DESIGN,policies:POLICIES,plan:PLAN};
 return {format:'give-ground-freeze-v1',status:'awaiting-independent-preflight',sha256:sha256(closure),closure};
}
/** Recoverable source archive, not merely a checksum of arbitrary bytes.
 * Exact regular-file USTAR entries only; no links, directories, PAX extensions,
 * path aliases, duplicate members or unbound payloads are accepted. */
export function verifySourcePacket(bytes,files){
 const tar=gunzipSync(bytes,{maxOutputLength:64*1024*1024});
 assert.equal(tar.length%512,0,'Truncated source archive');
 const zero=b=>b.every(n=>n===0),seen=new Set();let offset=0,ended=false;
 const string=b=>{const end=b.indexOf(0),value=b.subarray(0,end<0?b.length:end).toString('utf8');if(end>=0)assert.ok(zero(b.subarray(end)),'Invalid tar string padding');return value;};
 const octal=b=>{const raw=b.toString('ascii').replace(/\0/g,'').trim();assert.match(raw,/^[0-7]+$/,'Non-octal tar number');const n=parseInt(raw,8);assert.ok(Number.isSafeInteger(n)&&n>=0);return n;};
 while(offset+512<=tar.length){
  const header=tar.subarray(offset,offset+512);offset+=512;
  if(zero(header)){assert.ok(offset+512<=tar.length&&zero(tar.subarray(offset)),'Invalid tar terminator');ended=true;break;}
  assert.equal(header.subarray(257,263).toString('binary'),'ustar\0','Only USTAR is supported');
  assert.equal(header.subarray(263,265).toString('ascii'),'00');
  const checksum=octal(header.subarray(148,156));let actual=0;for(let i=0;i<512;i++)actual+=i>=148&&i<156?32:header[i];assert.equal(checksum,actual,'Tar header checksum mismatch');
  assert.ok(header[156]===0||header[156]===48,'Only regular source files are allowed');
  assert.equal(string(header.subarray(157,257)),'','Tar link forbidden');
  const name=string(header.subarray(0,100)),prefix=string(header.subarray(345,500)),relative=prefix?prefix+'/'+name:name;
  assert.ok(relative&&!relative.startsWith('/')&&!relative.includes('\\')&&relative.split('/').every(p=>p&&p!=='.'&&p!=='..'),'Unsafe archive path');
  assert.ok(Object.hasOwn(files,relative),'Unexpected archive member: '+relative);assert.ok(!seen.has(relative),'Duplicate archive member: '+relative);
  const size=octal(header.subarray(124,136)),padded=Math.ceil(size/512)*512;
  assert.ok(offset+padded<=tar.length,'Truncated archive member');assert.equal(sha256(tar.subarray(offset,offset+size)),files[relative],'Archive source mismatch: '+relative);
  assert.ok(zero(tar.subarray(offset+size,offset+padded)),'Invalid tar payload padding');seen.add(relative);offset+=padded;
 }
 assert.ok(ended,'Missing tar terminator');assert.deepEqual([...seen].sort(),Object.keys(files).sort(),'Source packet is incomplete');return true;
}
export function verifyApproval(approval){
 assert.equal(approval?.format,'give-ground-approval-v1');
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
 assert.equal(checkpoint.format,'give-ground-recovery-v1');
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
export function validateOutput(file){
 const absolute=path.resolve(file),parent=realpathSync(path.dirname(absolute)),resolved=path.join(parent,path.basename(absolute)),root=realpathSync(ROOT);
 assert.ok(resolved!==root&&!resolved.startsWith(root+path.sep),'Generated output must remain outside repository');
 assert.equal(existsSync(resolved),false,'Refusing to overwrite output');
 return resolved;
}
/** The private evaluator enforces the deadline around each native tick.
 * Never clamp input to a floating-point remainder below one whole tick. */
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
/** External telemetry only. Wrappers delegate each native call once and never
 * alter entities, prices, targeting, production or RNG. Contact means an actual
 * native fire event (including being its target) or committed damage, including
 * splash without a source-unit ID. These distinct event kinds are retained;
 * contact is never inferred from proximity. */
export function observeProduction(game,originalProducerId){
 const original=game.state.buildings.find(b=>b.id===originalProducerId);
 assert.ok(original,'Original producer must exist at observation start');
 const initialIds=new Set(game.state.buildings.map(b=>b.id));
 const units=new Map(),producers=new Map(),losses=[],coreDamage=[];
 const originalSpec={id:original.id,type:original.type,x:original.x,lane:original.lane};
 const live=()=>game.state.buildings.find(b=>b.id===originalProducerId&&b.hp>0);
 let previousOriginalHP=original.hp,lossRecorded=false;
 const move=u=>{const row=units.get(u.id);if(row){row.travel+=Math.hypot(u.x-row.lastX,u.y-row.lastY);row.lastX=u.x;row.lastY=u.y;}};
 const spawn=game._spawn;game._spawn=function(b){
  const before=this.nextId,result=spawn.call(this,b);
  for(const u of this.state.units.filter(u=>u.id>=before)){
   const replacement=b.side===0&&!initialIds.has(b.id)&&b.type===originalSpec.type&&b.lane===originalSpec.lane;
   if(!producers.has(b.id))producers.set(b.id,{id:b.id,type:b.type,side:b.side,x:b.x,y:b.y,lane:b.lane,original:b.id===originalProducerId,replacement,firstSpawnTick:this.tick,spawnIds:[]});
   producers.get(b.id).spawnIds.push(u.id);
   units.set(u.id,{id:u.id,producerId:b.id,side:u.side,type:u.type,lane:u.lane,spawnTick:this.tick,spawnTime:this.state.time,spawnX:u.x,spawnY:u.y,lastX:u.x,lastY:u.y,travel:0,firstContact:null,removedTick:null});
  }
  return result;
 };
 const fire=game._fire;game._fire=function(attacker,target,...args){
  for(const [u,other,role] of [[attacker,target,'attacker'],[target,attacker,'target']]){
   move(u);const row=units.get(u.id);if(row&&!row.firstContact)row.firstContact={kind:'fire',tick:this.tick,time:this.state.time,elapsed:this.state.time-row.spawnTime,travel:row.travel,x:u.x,y:u.y,otherId:other.id,otherType:other.type,role,coreHP:this.state.bases.map(b=>b.hp)};
  }
  return fire.call(this,attacker,target,...args);
 };
 const damage=game._damage;game._damage=function(target,...args){
  const before=target.hp,result=damage.call(this,target,...args);
  if(!this.damageQueue&&target.hp<before){
   move(target);const recipient=units.get(target.id);if(recipient&&!recipient.firstContact)recipient.firstContact={kind:'committed-damage',role:'damage-recipient',sourceSide:args[1],tick:this.tick,time:this.state.time,elapsed:this.state.time-recipient.spawnTime,travel:recipient.travel,x:target.x,y:target.y,coreHP:this.state.bases.map(b=>b.hp)};
   if(target.type==='base'&&!coreDamage.some(e=>e.side===target.side))coreDamage.push({side:target.side,tick:this.tick,time:this.state.time,hp:target.hp});
   if(before>0&&target.hp<=0&&this.buildings[target.type])losses.push({id:target.id,type:target.type,side:target.side,lane:target.lane,tick:this.tick,time:this.state.time});
  }
  return result;
 };
 const originalEvents=[{tick:game.tick,time:game.state.time,hp:original.hp,x:original.x,lane:original.lane}];
 return {sample(){
  const current=live();if((current?.hp??0)!==previousOriginalHP){previousOriginalHP=current?.hp??0;originalEvents.push({tick:game.tick,time:game.state.time,hp:previousOriginalHP});}
  const gone=!current&&!lossRecorded;if(gone)lossRecorded=true;
  const alive=new Set();for(const u of game.state.units){alive.add(u.id);move(u);}
  for(const row of units.values())if(!alive.has(row.id)&&row.removedTick===null)row.removedTick=game.tick;
  return {newOriginalLoss:gone};
 },snapshot:()=>structuredClone({original:originalSpec,originalEvents,producers:[...producers.values()],units:[...units.values()],losses,firstCoreDamage:coreDamage})};
}
async function executeCase({seed,spec,checkpoint}){
 let game,initial,economy,player,observer,phase='before-factory';
 const commands=[],trace=[],restoreChecks=[],shadows=[];let steps=0,nextTrace=0,aiCalls=0;
 const capture=()=>({caseId:spec.id,seed,policy:spec.policy,phase,initial:safeSnapshot(()=>initial),current:safeSnapshot(()=>game&&savePrototype(game)),policyState:safeSnapshot(()=>player?.snapshot()),commands,trace,restoreChecks,observations:safeSnapshot(()=>observer?.snapshot()),ledger:safeSnapshot(()=>economy?.snapshot()),aiCalls});
 try{
  game=createPrototype({seed});initial=savePrototype(game);economy=instrumentEconomy(game);player=createPolicy(spec.policy);
  observer=observeProduction(game,metadataFor(game).originalProducerId);
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
function validateCompletedCase(row,approval){
 const game=restorePrototype(row.final);assert.deepEqual(savePrototype(game),row.final);
 verifyPlayerCadence(row.ledger.transactions);
 for(let i=1;i<row.commands.length;i++)assert.ok(row.commands[i].tick-row.commands[i-1].tick>=DESIGN.cadenceTicks,'Player attempt cadence');
 for(const t of row.ledger.transactions){
  const price=t.method==='build'?game.buildings[t.type].cost:t.method==='upgrade'?Math.round(game.buildings[t.type].cost*(.7+.35*(t.before.building.level-1))):t.method==='sell'?-Math.floor(t.before.building.invested*.5*(t.before.building.hp/t.before.building.maxHp)):t.method==='cast'?game.ruleset.spell.cost:game.ruleset.citadel.cost;
  assert.equal(t.cost,price,'Nonstandard price or refund');
 }
 for(const producer of row.observations.producers.filter(p=>p.replacement))assert.ok(row.ledger.transactions.some(t=>t.side===0&&t.method==='build'&&t.id===producer.id&&t.cost===game.buildings[producer.type].cost),'Replacement must be paid');
 verifyApproval(approval);
}
export async function runApprovedMatrix({approval,out}){
 verifyApproval(approval);out=validateOutput(out);const cases=validateOutput(out+'.cases');mkdirSync(cases);
 const control=createRunControl(out),results=[];let current=null;
 const writeStatus=(status,error=null)=>writeFileSync(out,JSON.stringify({freezeSha256:approval.freezeSha256,status,casesDirectory:cases,current,error:error&&errorRecord(error),results}));
 try{
  writeFileSync(out,JSON.stringify({status:'running',freezeSha256:approval.freezeSha256,casesDirectory:cases}),{flag:'wx'});
  for(const seed of PLAN.knownSeeds)for(const spec of PLAN.cases){
   current={seed,caseId:spec.id};await control.checkpoint();verifyApproval(approval);
   const stem=`${seed}-${spec.id}`;
   const result=await retainCaseArtifacts({out:cases,stem,run:()=>executeCase({seed,spec,checkpoint:()=>control.checkpoint()}),verify:async row=>{await control.checkpoint();validateCompletedCase(row,approval);}});
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
