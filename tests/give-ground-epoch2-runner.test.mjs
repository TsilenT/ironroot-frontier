/** Structural only: any candidate _step is forbidden. Generated fixtures stay external. */
import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,existsSync,readFileSync,writeFileSync} from 'node:fs';import path from 'node:path';
import {execFileSync} from 'node:child_process';import {gzipSync} from 'node:zlib';
import {Game} from '../dist/engine.js';
import {createPrototype,savePrototype,restorePrototype} from '../qa/give-ground-epoch2/scenario.mjs';
import {PLAN,ROOT,freeze,sha256,verifySourcePacket,verifyApproval,validateOutput,advanceRunnerTick,createRunControl,retainCaseArtifacts,observeEpoch2Production,runApprovedMatrix} from '../qa/give-ground-epoch2/run.mjs';
Game.prototype._step=function(){throw Error('New candidate tick forbidden');};
function gateFixture(dir){
 const outputPath=path.join(dir,'never-run.json');
 const f=freeze(),sourcePacket=path.join(dir,'source.tar.gz');execFileSync('tar',['--format=ustar','-czf',sourcePacket,'-C',ROOT,...Object.keys(f.closure.files)]);
 const sourcePacketSha256=sha256(readFileSync(sourcePacket)),manifest=path.join(dir,'manifest.json');writeFileSync(manifest,JSON.stringify({freezeSha256:f.sha256,sourcePacketSha256,files:f.closure.files}));
 const recoveryCheckpoint=path.join(dir,'recovery.json');writeFileSync(recoveryCheckpoint,JSON.stringify({format:'give-ground-recovery-v2',status:'source-checkpoint-retained',freezeSha256:f.sha256,sourcePacket,sourcePacketSha256,manifest,manifestSha256:sha256(readFileSync(manifest))}));
 return {outputPath,format:'give-ground-approval-v2',status:'parent-authorized-after-independent-preflight',independentReviewer:'SYNTHETIC CHECK ONLY',parentAuthorization:'SYNTHETIC CHECK ONLY; NEVER RUN',freezeSha256:f.sha256,recoveryCheckpoint,recoveryCheckpointSha256:sha256(readFileSync(recoveryCheckpoint))};
}
test('closed source/approval/recovery gate verifies real bytes, no natural cases',async()=>{
 assert.equal(PLAN.knownSeeds.length,1);assert.equal(PLAN.cases.length,3);assert.equal(PLAN.naturalCaseCount,3);
 const f=freeze();for(const required of ['qa/give-ground/run.mjs','qa/give-ground-epoch2/run.mjs','tests/give-ground-epoch2-runner.test.mjs','qa/give-ground-epoch2/scenario.mjs','qa/give-ground-epoch2/policies.mjs','qa/give-ground-epoch2/PLAN.json'])assert.ok(f.closure.files[required]);
 assert.throws(()=>verifyApproval({}));const dir=mkdtempSync('/tmp/give-ground-gate-');
 try{
  await assert.rejects(runApprovedMatrix({approval:{},out:path.join(dir,'forbidden.json')}));assert.equal(existsSync(path.join(dir,'forbidden.json')),false);
  const a=gateFixture(dir);assert.ok(verifyApproval(a,a.outputPath));assert.throws(()=>verifyApproval(a,a.outputPath+'-other'));assert.throws(()=>verifyApproval({...a,extra:true},a.outputPath));assert.throws(()=>verifyApproval({...a,format:'give-ground-approval-v1'},a.outputPath));
  const bytes=readFileSync(path.join(dir,'source.tar.gz'));assert.ok(verifySourcePacket(bytes,f.closure.files));
  assert.throws(()=>verifySourcePacket(Buffer.from('arbitrary checkpoint'),f.closure.files));
  assert.throws(()=>verifySourcePacket(gzipSync(Buffer.alloc(1024)),f.closure.files),/incomplete/);
  assert.throws(()=>verifySourcePacket(bytes,{...f.closure.files,'package.json':'wrong'}),/source mismatch/);
  const missing={...f.closure.files};delete missing['package.json'];assert.throws(()=>verifySourcePacket(bytes,missing),/Unexpected archive member/);
  assert.throws(()=>verifySourcePacket(bytes,{...f.closure.files,'missing-source.mjs':'wrong'}),/incomplete/);
  for(const key of ['independentReviewer','parentAuthorization','freezeSha256','recoveryCheckpointSha256'])assert.throws(()=>verifyApproval({...a,[key]:''},a.outputPath));
  writeFileSync(path.join(dir,'source.tar.gz'),'changed');assert.throws(()=>verifyApproval(a,a.outputPath),/packet/);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
test('output gate rejects repo and existing files',()=>{
 assert.throws(()=>validateOutput(path.join(ROOT,'qa','forbidden.json')),/outside/);
 const dir=mkdtempSync('/tmp/give-ground-output-');try{const out=path.join(dir,'result.json');assert.equal(validateOutput(out),out);writeFileSync(out,'x');assert.throws(()=>validateOutput(out),/overwrite/);}finally{rmSync(dir,{recursive:true,force:true});}
});
test('cooperative cancellation yields to signals/stop file and removes handlers',async()=>{
 const dir=mkdtempSync('/tmp/give-ground-cancel-'),out=path.join(dir,'result.json'),counts=['SIGINT','SIGTERM'].map(s=>process.listenerCount(s));
 try{for(const signal of ['SIGINT','SIGTERM']){const c=createRunControl(out);try{setImmediate(()=>process.emit(signal));await assert.rejects(c.checkpoint(),e=>e.code==='STOP_REQUESTED'&&e.message.includes(signal));}finally{c.close();}}
 const c=createRunControl(out);try{writeFileSync(out+'.stop','stop');await assert.rejects(c.checkpoint(),e=>e.code==='STOP_REQUESTED');}finally{c.close();}}
 finally{rmSync(dir,{recursive:true,force:true});}assert.deepEqual(['SIGINT','SIGTERM'].map(s=>process.listenerCount(s)),counts);
});
test('raw completion precedes verification; errors and interrupted partials survive without verified receipts',async()=>{
 const out=mkdtempSync('/tmp/give-ground-retain-'),draft={tick:1,commands:[],observations:{originalEvents:[]}};
 try{
  const failed=Error('synthetic verification failure');await assert.rejects(retainCaseArtifacts({out,stem:'complete-but-failed',run:async()=>draft,verify:()=>{assert.deepEqual(JSON.parse(readFileSync(path.join(out,'complete-but-failed.json'))),draft);throw failed;}}),e=>e===failed);
  assert.equal(existsSync(path.join(out,'complete-but-failed-verified.json')),false);assert.deepEqual(JSON.parse(readFileSync(path.join(out,'complete-but-failed-partial.json'))).draft,draft);
  const stop=Error('cancelled');stop.code='STOP_REQUESTED';stop.partial=draft;await assert.rejects(retainCaseArtifacts({out,stem:'interrupted',run:async()=>{throw stop;},verify:()=>assert.fail('must not verify')}));assert.equal(existsSync(path.join(out,'interrupted.json')),false);assert.equal(JSON.parse(readFileSync(path.join(out,'interrupted-partial.json'))).error.code,'STOP_REQUESTED');
  await retainCaseArtifacts({out,stem:'verified',run:async()=>draft,verify:()=>assert.ok(existsSync(path.join(out,'verified.json')))});assert.equal(JSON.parse(readFileSync(path.join(out,'verified-verified.json'))).rawSha256,sha256(JSON.stringify(draft)));
 }finally{rmSync(out,{recursive:true,force:true});}
});

test('runner requests one native .05 tick from a synthetic stub and respects terminal priority',()=>{
 const g={tick:0,state:{time:0,winner:null,bases:[{hp:6000},{hp:6000}]},update(dt){assert.equal(dt,.05);this.tick++;this.state.time+=dt;}};
 assert.equal(advanceRunnerTick(g).failed,false);assert.equal(g.tick,1);g.state.bases[0].hp=0;assert.equal(advanceRunnerTick(g).reason,'player-core');assert.equal(g.tick,1);
});
test('read-only native fire receipts distinguish factory exposure and outgoing spawned-unit activity',()=>{
 const g=createPrototype(),control=restorePrototype(savePrototype(g)),before=g.serialize(),ob=observeEpoch2Production(g,3);
 assert.deepEqual(g.serialize(),before);
 const original=g.state.buildings.find(b=>b.id===3),other=g.state.buildings.find(b=>b.side===1);
 const cOriginal=control.state.buildings.find(b=>b.id===3),cOther=control.state.buildings.find(b=>b.id===other.id);
 g._spawn(original);control._spawn(cOriginal);const u=g.state.units.at(-1),v=control.state.units.at(-1);
 g._fire(u,other,1,u.type);control._fire(v,cOther,1,v.type);
 g._fire(other,original,1,'tower');control._fire(cOther,cOriginal,1,'tower');
 assert.deepEqual(g.serialize(),control.serialize());assert.equal(g.tick,0);
 const r=ob.snapshot();assert.equal(r.fireEvents.length,2);assert.equal(r.fireEvents[0].attackerId,u.id);assert.equal(r.units[0].producerId,3);assert.equal(r.fireEvents[1].targetId,3);assert.equal(r.fireEvents[0].nominalDamage,1);
 r.fireEvents[0].targetId=-1;assert.notEqual(ob.snapshot().fireEvents[0].targetId,-1);
});
