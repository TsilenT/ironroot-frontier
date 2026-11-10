/** Candidate tick zero only; advancement below uses empty synthetic Games. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,existsSync,readFileSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {gzipSync} from 'node:zlib';
import {Game} from '../dist/engine.js';
import {DESIGN,evaluatePrototype} from '../qa/give-ground/scenario.mjs';
import {PLAN,ROOT,freeze,sha256,verifySourcePacket,verifyApproval,validateOutput,advanceRunnerTick,createRunControl,retainCaseArtifacts,observeProduction,runApprovedMatrix} from '../qa/give-ground/run.mjs';
function empty(time=0){const g=new Game({rulesetId:DESIGN.parentRulesetId,mapId:DESIGN.mapId,ai:false,seed:17});g.state.buildings=[];g.state.units=[];g.state.effects=[];g.state.time=time;g.tick=Math.round(time/.05);g.state.overtime=time>=300;return g;}
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
function gateFixture(dir){
 const f=freeze(),sourcePacket=path.join(dir,'source.tar.gz');execFileSync('tar',['--format=ustar','-czf',sourcePacket,'-C',ROOT,...Object.keys(f.closure.files)]);
 const sourcePacketSha256=sha256(readFileSync(sourcePacket)),manifest=path.join(dir,'manifest.json');writeFileSync(manifest,JSON.stringify({freezeSha256:f.sha256,sourcePacketSha256,files:f.closure.files}));
 const recoveryCheckpoint=path.join(dir,'recovery.json');writeFileSync(recoveryCheckpoint,JSON.stringify({format:'give-ground-recovery-v1',status:'source-checkpoint-retained',freezeSha256:f.sha256,sourcePacket,sourcePacketSha256,manifest,manifestSha256:sha256(readFileSync(manifest))}));
 return {format:'give-ground-approval-v1',status:'parent-authorized-after-independent-preflight',independentReviewer:'SYNTHETIC CHECK ONLY',parentAuthorization:'SYNTHETIC CHECK ONLY; NEVER RUN',freezeSha256:f.sha256,recoveryCheckpoint,recoveryCheckpointSha256:sha256(readFileSync(recoveryCheckpoint))};
}
test('closed source/approval/recovery gate verifies real bytes, no natural cases',async()=>{
 assert.equal(PLAN.knownSeeds.length,1);assert.equal(PLAN.cases.length,4);assert.equal(PLAN.naturalCaseCount,4);
 const f=freeze();for(const required of ['qa/give-ground/run.mjs','tests/give-ground-runner.test.mjs','qa/give-ground/scenario.mjs','qa/give-ground/policies.mjs','qa/give-ground/PLAN.json'])assert.ok(f.closure.files[required]);
 assert.throws(()=>verifyApproval({}));const dir=mkdtempSync('/tmp/give-ground-gate-');
 try{
  await assert.rejects(runApprovedMatrix({approval:{},out:path.join(dir,'forbidden.json')}));assert.equal(existsSync(path.join(dir,'forbidden.json')),false);
  const a=gateFixture(dir);assert.ok(verifyApproval(a));
  const bytes=readFileSync(path.join(dir,'source.tar.gz'));assert.ok(verifySourcePacket(bytes,f.closure.files));
  assert.throws(()=>verifySourcePacket(Buffer.from('arbitrary checkpoint'),f.closure.files));
  assert.throws(()=>verifySourcePacket(gzipSync(Buffer.alloc(1024)),f.closure.files),/incomplete/);
  assert.throws(()=>verifySourcePacket(bytes,{...f.closure.files,'package.json':'wrong'}),/source mismatch/);
  const missing={...f.closure.files};delete missing['package.json'];assert.throws(()=>verifySourcePacket(bytes,missing),/Unexpected archive member/);
  assert.throws(()=>verifySourcePacket(bytes,{...f.closure.files,'missing-source.mjs':'wrong'}),/incomplete/);
  for(const key of ['independentReviewer','parentAuthorization','freezeSha256','recoveryCheckpointSha256'])assert.throws(()=>verifyApproval({...a,[key]:''}));
  writeFileSync(path.join(dir,'source.tar.gz'),'changed');assert.throws(()=>verifyApproval(a),/packet/);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
test('output gate rejects repo and existing files',()=>{
 assert.throws(()=>validateOutput(path.join(ROOT,'qa','forbidden.json')),/outside/);
 const dir=mkdtempSync('/tmp/give-ground-output-');try{const out=path.join(dir,'result.json');assert.equal(validateOutput(out),out);writeFileSync(out,'x');assert.throws(()=>validateOutput(out),/overwrite/);}finally{rmSync(dir,{recursive:true,force:true});}
});
test('native .05 path reaches exact runner deadline from synthetic empty tick zero',()=>{
 const g=empty();for(let i=0;i<12000;i++)advanceRunnerTick(g);assert.equal(g.tick,12000);near(g.state.time,600);assert.equal(evaluatePrototype(g).reason,'deadline');
 const before=g.serialize();advanceRunnerTick(g);assert.deepEqual(g.serialize(),before);
 for(const terminal of ['enemy-core','player-core','draw']){const x=empty(599.95);if(terminal!=='player-core')x.state.bases[1].hp=0;if(terminal!=='enemy-core')x.state.bases[0].hp=0;const prior=x.serialize();const outcome=advanceRunnerTick(x);assert.equal(outcome.reason,terminal==='draw'?'player-core':terminal);assert.deepEqual(x.serialize(),prior);}
 const one=empty(600);one.state.bases[0].hp=1;one.state.bases[1].hp=0;assert.equal(evaluatePrototype(one).completed,true);
});
test('synthetic last native tick preserves core/draw precedence and one HP success',()=>{
 for(const deadSides of [[1],[0],[0,1]]){
  const g=empty(599.9500000000021);g.state.bases[0].hp=1;
  for(const side of deadSides){const base=g.state.bases[side];base.hp=1;g._spawn({type:'barracks',side:1-side,x:base.x+((1-side)?48:-48),lane:1,level:1});const u=g.state.units.at(-1);u.y=450;u.cooldown=0;}
  const result=advanceRunnerTick(g);assert.equal(g.tick,12000);near(g.state.time,600);assert.equal(result.reason,deadSides.includes(0)?'player-core':'enemy-core');assert.equal(result.completed,!deadSides.includes(0));
 }
});
test('native observer is external; actual spawn/source/contact and travelled path are measured in a synthetic fixture',()=>{
 const g=empty();g.state.gold=[1000,1000];const origin=g.build('foundry',1250,g.map.lanes[0],0).building;
 const plain=g.serialize(),ob=observeProduction(g,origin.id);assert.deepEqual(g.serialize(),plain);
 g._spawn(origin);const unit=g.state.units[0];unit.x+=30;ob.sample();unit.x+=40;
 const enemy=g.build('barracks',2750,g.map.lanes[0],1).building;g._fire(unit,enemy,1,unit.type);ob.sample();
 let row=ob.snapshot();assert.equal(row.units.length,1);assert.equal(row.units[0].producerId,origin.id);near(row.units[0].firstContact.travel,70);assert.equal(row.units[0].firstContact.otherId,enemy.id);assert.equal(row.units[0].firstContact.role,'attacker');
 g._damage(origin,origin.hp,1);assert.equal(ob.sample().newOriginalLoss,true);assert.equal(ob.sample().newOriginalLoss,false);assert.ok(ob.snapshot().losses.some(x=>x.id===origin.id));
 g.state.buildings=g.state.buildings.filter(b=>b.hp>0);const replacement=g.build('foundry',410,g.map.lanes[0]).building;g._spawn(replacement);ob.sample();row=ob.snapshot();assert.ok(row.producers.some(p=>p.id===replacement.id&&p.replacement&&p.x===410));assert.equal(g.tick,0);
 const fresh=g.state.units.at(-1);fresh.x+=15;g._damage(fresh,1,1);const hit=ob.snapshot().units.find(u=>u.id===fresh.id).firstContact;assert.equal(hit.kind,'committed-damage');assert.equal(hit.role,'damage-recipient');assert.equal(hit.sourceSide,1);assert.equal(hit.otherId,undefined);near(hit.travel,15);
 const copy=ob.snapshot();copy.units[0].travel=-1;assert.notEqual(ob.snapshot().units[0].travel,-1);
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
