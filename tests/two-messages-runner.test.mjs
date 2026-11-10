/** Pure runner checks: NEVER advance a natural candidate battle. */
import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,readFileSync,existsSync,rmSync} from 'node:fs';import path from 'node:path';import os from 'node:os';
import {Game} from '../dist/engine.js';import {LANTERNS_RULESET_ID} from '../dist/rulesets.js';import {refreshFog} from '../dist/fog.js';
import {freeze,verifyApproval,validateOutput,createRunControl,retainCaseArtifacts,advanceRunnerTick,createObservationRecorder,summarizeInformation,runApprovedMatrix} from '../qa/two-messages/run.mjs';
Game.prototype._step=function(){throw Error('Natural step forbidden in runner preflight');};
const temp=()=>mkdtempSync(path.join(os.tmpdir(),'two-messages-runner-'));
function approval(outputPath){return {format:'two-messages-approval-v1',status:'parent-authorized-after-independent-preflight',independentReviewer:'synthetic guard test, not actual approval',parentAuthorization:'synthetic guard test, never used to execute',freezeSha256:freeze().sha256,outputPath};}
test('freeze binds exact six-case plan and source closure without ticking',()=>{const a=freeze(),b=freeze();assert.deepEqual(a,b);assert.equal(a.closure.plan.naturalCaseCount,6);assert.deepEqual(a.closure.plan.knownSeeds,[9501,9502]);for(const name of ['dist/engine.js','dist/fog.js','qa/two-messages/scenario.mjs','qa/two-messages/policies.mjs','qa/two-messages/run.mjs','qa/leave-no-road-closed/run.mjs','qa/leave-no-road-closed/scenario.mjs','qa/leave-no-road-closed/policies.mjs','qa/leave-no-road-closed/PLAN.json','qa/salt-stores/economy.mjs','tests/two-messages-runner.test.mjs'])assert.match(a.closure.files[name],/^[a-f0-9]{64}$/);});
test('approval refuses source mismatch, missing review and another output path before execution',async()=>{
 const d=temp(),out=path.join(d,'results.json');try{const a=approval(out);assert.equal(verifyApproval(a,out),true);assert.throws(()=>verifyApproval({...a,freezeSha256:'bad'},out));assert.throws(()=>verifyApproval({...a,independentReviewer:''},out));assert.throws(()=>verifyApproval(a,out+'-other'));assert.throws(()=>verifyApproval({...a,unexpected:true},out));await assert.rejects(runApprovedMatrix({approval:{...a,freezeSha256:'bad'},out}));assert.equal(existsSync(out),false);assert.equal(existsSync(out+'.cases'),false);}finally{rmSync(d,{recursive:true,force:true});}
});
test('output guard refuses source paths and existing files, allowing only external fresh paths',()=>{const d=temp();try{const file=path.join(d,'new.json');assert.equal(validateOutput(file),file);writeFileSync(file,'existing');assert.throws(()=>validateOutput(file));assert.throws(()=>validateOutput(new URL('../qa/two-messages/forbidden.json',import.meta.url).pathname));}finally{rmSync(d,{recursive:true,force:true});}});
test('raw result is retained before verification; failed verification keeps raw and incomplete record',async()=>{const d=temp();try{const raw={scope:'synthetic no-battle row',value:3};await assert.rejects(retainCaseArtifacts({out:d,stem:'one',run:async()=>raw,verify:async row=>{assert.deepEqual(JSON.parse(readFileSync(path.join(d,'one.json'))),row);throw Error('synthetic verification failure');}}),/synthetic verification/);assert.deepEqual(JSON.parse(readFileSync(path.join(d,'one.json'))),raw);assert.equal(existsSync(path.join(d,'one-verified.json')),false);assert.equal(JSON.parse(readFileSync(path.join(d,'one-partial.json'))).status,'incomplete');}finally{rmSync(d,{recursive:true,force:true});}});
test('interrupted execution retains partial snapshot without claiming raw completion or verification',async()=>{const d=temp();try{await assert.rejects(retainCaseArtifacts({out:d,stem:'partial',run:async()=>{const e=Error('stopped');e.partial={tick:0,naturalTicks:0};throw e;},verify:async()=>assert.fail('must not verify incomplete')}));const r=JSON.parse(readFileSync(path.join(d,'partial-partial.json')));assert.equal(r.draft.naturalTicks,0);assert.equal(existsSync(path.join(d,'partial.json')),false);assert.equal(existsSync(path.join(d,'partial-verified.json')),false);}finally{rmSync(d,{recursive:true,force:true});}});
test('stop-file cancellation yields and closes both signal handlers',async()=>{const d=temp(),out=path.join(d,'run'),counts=['SIGINT','SIGTERM'].map(s=>process.listenerCount(s)),c=createRunControl(out);try{await c.checkpoint();writeFileSync(out+'.stop','stop');await assert.rejects(c.checkpoint(),e=>e.code==='STOP_REQUESTED');}finally{c.close();assert.deepEqual(['SIGINT','SIGTERM'].map(s=>process.listenerCount(s)),counts);rmSync(d,{recursive:true,force:true});}});
test('native runner requests .05 only and does not advance terminal synthetic worlds',()=>{
 const g={tick:0,state:{time:0,winner:null,bases:[{hp:6000},{hp:6000}]},update(dt){assert.equal(dt,.05);this.tick++;this.state.time+=dt;}};
 assert.equal(advanceRunnerTick(g).completed,false);assert.equal(g.tick,1);g.state.bases[0].hp=0;assert.equal(advanceRunnerTick(g).failed,true);assert.equal(g.tick,1);
 const stalled={...g,state:{time:0,winner:null,bases:[{hp:1},{hp:1}]},update(){}};assert.throws(()=>advanceRunnerTick(stalled),/advance exactly one/);
});
test('synthetic observations distinguish actual gap and later paid construction from initial layout',()=>{
 const g=new Game({seed:1,ai:false,mapId:'classic',rulesetId:LANTERNS_RULESET_ID});g.state.buildings=[];g.state.units=[];g.state.effects=[];
 const unit={id:101,type:'warrior',side:0,hp:1,maxHp:1,x:1800,y:g.map.lanes[0],lane:0,level:1};
 const first={id:102,type:'barracks',side:1,hp:700,maxHp:700,x:2090,y:g.map.lanes[0],lane:0,level:1};
 g.state.units=[unit];g.state.buildings=[first];const recorder=createObservationRecorder();refreshFog(g);recorder.record(g,{sample:true});
 g.tick=20;g.state.time=1;unit.x=1000;refreshFog(g);recorder.record(g,{sample:true});
 const later={id:103,type:'watchtower',side:1,hp:1000,maxHp:1000,x:2230,y:g.map.lanes[0],lane:0,level:1};g.state.buildings.push(later);
 g.tick=60;g.state.time=3;unit.x=1950;refreshFog(g);recorder.record(g,{sample:true});
 assert.deepEqual(recorder.events.map(e=>e.transition),['first-contact','gap','renewal']);assert.equal(recorder.samples[1].visible.length,0);assert.equal(recorder.samples[1].memories.length,1);
 const paid=[{side:1,method:'build',id:103,lane:0,time:2,cost:220}],summary=summarizeInformation(recorder.events,paid);assert.equal(summary.laterPaidBuildingsReobserved.length,1);assert.equal(summary.laterPaidBuildingsReobserved[0].id,103);
 assert.equal(summarizeInformation(recorder.events,[{...paid[0],time:0}]).laterPaidBuildingsReobserved.length,0);assert.equal(summarizeInformation(recorder.events.filter(e=>e.transition!=='gap'),paid).laterPaidBuildingsReobserved.length,0);
});

// Synthetic reproduction of the independent preflight HOLD; no engine ticks.
for(const ending of ['victory','own-core','deadline','active','after-decision'])test(`terminal reveal is not renewed reconnaissance: ${ending}`,()=>{
 const g=new Game({seed:1,ai:false,rulesetId:LANTERNS_RULESET_ID});g.state.buildings=[];g.state.units=[];g.state.effects=[];
 const u={id:101,type:'warrior',side:0,hp:1,maxHp:1,x:1800,y:260,lane:0,level:1};
 const first={id:102,type:'barracks',side:1,hp:700,maxHp:700,x:2090,y:260,lane:0,level:1};g.state.units=[u];g.state.buildings=[first];
 const r=createObservationRecorder();g.tick=200;g.state.time=10;refreshFog(g);r.record(g,{sample:true});
 g.tick=400;g.state.time=20;u.x=1000;refreshFog(g);r.record(g,{sample:true});
 g.state.buildings.push({id:103,type:'watchtower',side:1,hp:1000,maxHp:1000,x:2230,y:260,lane:0,level:1});
 g.tick=600;g.state.time=30;
 if(ending==='victory')g.state.winner=0;
 else if(ending==='own-core')g.state.bases[0].hp=0;
 else if(ending==='deadline'){g.tick=12000;g.state.time=600;}
 else {u.x=1950;if(ending==='after-decision'){g.tick=3620;g.state.time=181;}refreshFog(g);}
 r.record(g,{sample:true});
 const summary=summarizeInformation(r.events,[{side:1,method:'build',id:103,lane:0,time:25,cost:220}]);
 assert.equal(summary.laterPaidBuildingsReobserved.length,ending==='active'?1:0);
 if(['victory','own-core','deadline'].includes(ending)){assert.deepEqual(r.events.map(e=>e.transition),['first-contact','gap']);assert.equal(r.samples.length,2);}
 else {assert.deepEqual(r.events.map(e=>e.transition),['first-contact','gap','renewal']);assert.equal(r.samples.length,3);}
});
