/** No-tick structural tests only. Synthetic time/damage/funding fixtures are not gameplay evidence. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,rmSync,existsSync,symlinkSync,readFileSync} from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {Game,buildSites} from '../dist/engine.js';
import {getRuleset,SALT_STORES_RULESET_ID} from '../dist/rulesets.js';
import {getCampaignMission} from '../dist/campaign.js';
import {actualIncome,instrumentEconomy} from '../qa/salt-stores/economy.mjs';
import {DESIGN,SUPPORT_PLAN,POLICIES,createPrototype,createPolicy,evaluatePrototype} from '../qa/empty-purse/prototype.mjs';
import {PLAN,ROOT,freeze,verifyApproval,validateOutputPath,instrumentField,runApprovedMatrix,comparePair,retainCaseArtifacts,createRunControl} from '../qa/empty-purse/experiment.mjs';
// Any accidental simulation, including through helper methods, fails this suite.
Game.prototype._step=function(){throw Error('Candidate battle ticks forbidden in structural tests');};

test('QA authoring is deterministic, ordinary full roster, healthy, open and not admitted campaign content',()=>{
 const g=createPrototype(),s=g.state,save=g.serialize();assert.deepEqual(save,createPrototype().serialize());assert.deepEqual(Game.restore(save).serialize(),save);
 assert.equal(g.tick,0);assert.equal(s.time,0);assert.deepEqual(s.units,[]);assert.equal(g.ai,true);assert.equal(g.aiTimer,0);assert.equal(g.difficulty,'normal');
 assert.deepEqual(s.gold,[0,100]);assert.deepEqual(s.income,[12.5,7.5]);assert.deepEqual(s.bases.map(b=>b.hp),[6000,6000]);assert.equal(g.map.buildLimit,24);
 assert.equal(Object.keys(g.buildings).length,8);assert.equal(g.ruleset.ai.policy,'legacy');assert.equal(g.ruleset.endgame.forcedDecay,false);assert.ok(!s.fog);
 const {id,name,...rules}=g.ruleset,{id:oldId,name:oldName,...old}=getRuleset(SALT_STORES_RULESET_ID);assert.deepEqual(rules,old);
 assert.throws(()=>getCampaignMission('the-empty-purse'),/Unknown campaign/);assert.equal(getCampaignMission('the-shared-watch').rulesetId,'frontier-campaign-shared-watch');
 for(const b of s.buildings){assert.equal(b.hp,b.maxHp);assert.ok(buildSites(g.map,b.side).some(site=>site.x===b.x&&site.y===b.y));}
 for(const seed of [-1,4294967296,NaN,1.5])assert.throws(()=>createPrototype({seed}),/uint32/);
});

test('L3 inherited mine has actual JS upgrade investment, normal income, ordinary full/damaged refunds',()=>{
 const g=createPrototype(),mine=g.state.buildings.find(b=>b.side===0&&b.type==='mint'&&b.level===3);
 assert.equal(mine.invested,190+133+199);assert.equal(mine.hp,684);assert.equal(actualIncome(g,0),12.5);
 const ledger=instrumentEconomy(g),r=g.sell(mine.id,0);assert.equal(r.refund,261);assert.equal(g.state.gold[0],261);assert.equal(actualIncome(g,0),7.5);ledger.reconcile();assert.equal(ledger.ledger.refunds[0],261);
 const h=createPrototype(),b=h.state.buildings.find(b=>b.side===0&&b.type==='mint'&&b.level===3);b.hp=b.maxHp/2;
 assert.equal(h.sell(b.id,0).refund,130);assert.equal(h.tick,0);
});

test('source arithmetic predicts 5s versus 20s cadence affordability, not field benefit',()=>{
 const g=createPrototype(),cost=g.buildings.sanctum.cost,income=actualIncome(g,0);
 assert.equal(cost,230);assert.equal(Math.ceil(cost/income/5)*5,20);
 const p=createPolicy('salvage-one-mine',g),sale=p.step(g);assert.equal(sale.action.method,'sell');assert.equal(sale.refund,261);assert.equal(p.step(g),null);
 // Synthetic clock/funding only: prove the next same-price command and sale cadence.
 g.tick=100;g.state.time=5;g.state.gold[0]+=5*actualIncome(g,0);
 const support=p.step(g);assert.equal(support.ok,true);assert.deepEqual(support.action,SUPPORT_PLAN[0]);assert.equal(g.state.gold[0],68.5);assert.equal(g.state.income[0],12.5); // Cached income updates on normal ticks; never used as the policy's actual-income source.
 assert.equal(261/5,52.2); // Uninterrupted income/refund crossover only, not a useful-battle claim.
});

test('retaining starts with honest failed affordability, idle does nothing and sale is optional core-only',()=>{
 const g=createPrototype(),p=createPolicy('retain-income',g),before=g.serialize();const row=p.step(g);assert.equal(row.ok,false);assert.match(row.reason,/230/);assert.deepEqual(g.serialize(),before);assert.equal(p.step(g),null);
 assert.equal(createPolicy('idle',g).step(g),null);assert.throws(()=>createPolicy('unknown',g));
 const h=createPrototype();for(const b of [...h.state.buildings].filter(b=>b.side===0&&b.type==='mint'))assert.ok(h.sell(b.id,0).ok);
 assert.equal(evaluatePrototype(h).failed,false);h.state.bases[0].hp=1;h.state.bases[1].hp=0;assert.equal(evaluatePrototype(h).completed,true);
});

test('complete support plan is legal on ample ordinary sites and spends normal prices without ticking',()=>{
 const g=createPrototype();g.state.gold[0]=10000; // Structural placement fixture only, never a run.
 for(const a of SUPPORT_PLAN){const before=g.state.gold[0],r=g.build(a.type,a.x,g.map.lanes[a.lane],0);assert.ok(r.ok,r.reason);assert.equal(before-g.state.gold[0],g.buildings[a.type].cost);}
 assert.equal(g.state.buildings.filter(b=>b.side===0).length,15);assert.ok(15<g.map.buildLimit);assert.equal(g.tick,0);
 assert.equal(SUPPORT_PLAN[0].type,'sanctum');assert.ok(SUPPORT_PLAN.findIndex(a=>a.type==='barracks'&&a.lane===0)<SUPPORT_PLAN.findIndex(a=>a.type==='foundry'&&a.lane===0));
 assert.ok(SUPPORT_PLAN.findIndex(a=>a.type==='barracks'&&a.lane===2)<SUPPORT_PLAN.findIndex(a=>a.type==='foundry'&&a.lane===2));
 assert.ok(!SUPPORT_PLAN.some(a=>a.type==='mint'));assert.ok(Object.isFrozen(DESIGN));assert.ok(Object.isFrozen(SUPPORT_PLAN));assert.deepEqual(Object.keys(POLICIES),PLAN.caseOrder);
});

test('core/deadline evaluator preserves damaged wins, own-loss/draw precedence and rejects late wins',()=>{
 const g=createPrototype();g.state.bases[0].hp=1;g.state.bases[1].hp=0;g.state.time=600;assert.equal(evaluatePrototype(g).completed,true);
 g.state.time=600.05;assert.equal(evaluatePrototype(g).reason,'deadline');g.state.time=0;g.state.bases[0].hp=0;assert.equal(evaluatePrototype(g).reason,'player-core');
 g.state.bases[0].hp=1;g.state.winner='draw';assert.equal(evaluatePrototype(g).reason,'player-core');g.state.winner=null;g.state.bases[1].hp=6000;g.state.time=600;assert.equal(evaluatePrototype(g).reason,'deadline');
});

test('field hooks attribute primary support hits, retain unattributed splash and queued effective overkill without ticking',()=>{
 const g=createPrototype(),field=instrumentField(g),b=g.state.buildings.find(b=>b.side===0&&b.type==='barracks');g._spawn(b);
 const u=g.state.units[0];assert.equal(field.births[0].factoryId,b.id);const t=g.state.buildings.find(b=>b.side===1&&b.type==='barracks');t.hp=150;
 g.damageQueue=[];g._fire(u,t,100,'warrior');g._damage(t,25,0);g._fire(u,t,100,'warrior');const q=g.damageQueue;g.damageQueue=null;for(const h of q)g._damage(...h);
 assert.deepEqual(field.hits.map(h=>h.effective),[100,25,25]);assert.equal(field.hits[0].attacker.birth.factoryId,b.id);assert.equal(field.hits[1].attacker,null);assert.equal(field.losses.length,1);assert.equal(field.pending.length,0);assert.equal(g.tick,0);
});

test('exact nine cases remain unopened, frozen source approvals reject drift and missing review',async()=>{
 assert.equal(PLAN.cases,9);assert.equal(PLAN.knownSeeds.length*PLAN.caseOrder.length,9);assert.deepEqual(PLAN.heldOutSeeds,[]);assert.equal(PLAN.playerAttemptCadence,5);
 const f=freeze();assert.throws(()=>verifyApproval({}));const p={format:'empty-purse-approved-known-cases-v1',status:'independent-review-approved-and-coordinator-authorized',independentReviewer:'STRUCTURAL FIXTURE ONLY',coordinatorAuthorization:'STRUCTURAL FIXTURE ONLY: NO BATTLES',freeze:f};assert.ok(verifyApproval(p));
 const bad=structuredClone(p);bad.freeze.closure.files['dist/engine.js'].sha256='bad';bad.freeze.closureSha256=sha256ForTest(bad.freeze.closure);assert.throws(()=>verifyApproval(bad),/changed/);
 await assert.rejects(()=>runApprovedMatrix({},{}));
});
import {sha256 as sha256ForTest} from '../qa/empty-purse/experiment.mjs';

test('generated evidence may not overwrite source, existing paths or a symlink back into source',()=>{
 const inside=path.join(ROOT,'qa','empty-purse','must-not-be-created');assert.throws(()=>validateOutputPath(inside),/outside/);assert.equal(existsSync(inside),false);
 const t=mkdtempSync('/tmp/empty-purse-structural-');try{const f=path.join(t,'existing.json');writeFileSync(f,'{}');assert.throws(()=>validateOutputPath(f),/overwrite/);assert.equal(validateOutputPath(path.join(t,'fresh')),path.join(t,'fresh'));const link=path.join(t,'source-link');symlinkSync(ROOT,link,'dir');assert.throws(()=>validateOutputPath(path.join(link,'new-file')),/outside/);}finally{rmSync(t,{recursive:true,force:true});}
});


test('paired observations use actual common-clock income, field support damage and losses, never a gold display gate',()=>{
 const make=(policy)=>({policy,seed:9102,duration:77.45,paidFactoryIds:[99],traces:[{tick:0,time:0,grossIncome:[0,0],hp:[6000,6000]},{tick:1200,time:60,grossIncome:[policy==='retain-income'?750:450,0],hp:[5900,6000]}],field:{hits:[{time:50,targetSide:0,targetKind:'building',effective:30,attacker:null},{time:55,targetSide:1,targetKind:'unit',effective:25,attacker:{birth:{factoryId:99}}},{time:75,targetSide:1,targetKind:'unit',effective:99,attacker:{birth:{factoryId:99}}}],losses:[{time:59,side:0,type:'barracks'}]}});
 const pair=comparePair(make('retain-income'),make('salvage-one-mine'));assert.equal(pair.commonClock,60);assert.equal(pair.retainMinusSalvageGrossIncome,300);assert.equal(pair.retain.supportPrimaryDamage,25);assert.equal(pair.retain.ownStructureDamage,30);assert.equal(pair.retain.combatLosses.length,1);assert.ok(!Object.hasOwn(pair,'passed'));assert.match(pair.scope,/not isolated/);
});


test('synthetic runtime, ledger, attribution and assertion failures each preserve draft without opening a case',async()=>{
 const t=mkdtempSync('/tmp/empty-purse-faults-');try{for(const reason of ['runtime','ledger','attribution','assertion']){
  const draft={phase:'synthetic-only',reason,tick:0,commands:[{ok:false}],ledger:{spending:[0,0]}};
  await assert.rejects(()=>retainCaseArtifacts({out:t,stem:reason,run:async()=>{const e=Error(reason);e.partial=draft;throw e;},verify:()=>assert.fail('Must not verify failed run')}),new RegExp(reason));
  assert.deepEqual(JSON.parse(readFileSync(path.join(t,reason+'-partial.json'))).draft,draft);assert.equal(existsSync(path.join(t,reason+'.json')),false);
 }const fallback={phase:'pre-factory',tick:0};await assert.rejects(()=>retainCaseArtifacts({out:t,stem:'before-draft',run:()=>{throw Error('setup');},snapshot:()=>fallback,verify:()=>{}}),/setup/);assert.deepEqual(JSON.parse(readFileSync(path.join(t,'before-draft-partial.json'))).draft,fallback);
 }finally{rmSync(t,{recursive:true,force:true});}
});

test('synthetic completed raw survives source-drift failure and has no verified receipt',async()=>{
 const t=mkdtempSync('/tmp/empty-purse-source-drift-');try{const row={scope:'synthetic-only',tick:0};await assert.rejects(()=>retainCaseArtifacts({out:t,stem:'case',run:async()=>row,verify:()=>{throw Error('Source changed during case');}}),/Source changed/);
  assert.deepEqual(JSON.parse(readFileSync(path.join(t,'case.json'))),row);assert.deepEqual(JSON.parse(readFileSync(path.join(t,'case-partial.json'))).draft,row);assert.equal(existsSync(path.join(t,'case-verified.json')),false);
  await retainCaseArtifacts({out:t,stem:'good',run:async()=>row,verify:()=>{}});assert.equal(JSON.parse(readFileSync(path.join(t,'good-verified.json'))).status,'case-and-postcase-source-verified');
 }finally{rmSync(t,{recursive:true,force:true});}
});

test('stop-file checkpoint yields, rejects and retains synthetic interruption without ticking',async()=>{
 const t=mkdtempSync('/tmp/empty-purse-stop-'),out=path.join(t,'out');const c=createRunControl(out);try{
  writeFileSync(out+'.stop','stop');await assert.rejects(()=>retainCaseArtifacts({out:t,stem:'stopped',run:async()=>{await c.checkpoint();assert.fail('Must stop');},snapshot:()=>({scope:'synthetic-only',tick:0}),verify:()=>{}}),/stop file/);
  assert.equal(JSON.parse(readFileSync(path.join(t,'stopped-partial.json'))).draft.tick,0);
 }finally{c.close();rmSync(t,{recursive:true,force:true});}
});

test('real SIGINT and SIGTERM retain a synthetic interrupted draft at an async checkpoint',()=>{
 const moduleURL=pathToFileURL(path.join(ROOT,'qa/empty-purse/experiment.mjs')).href,t=mkdtempSync('/tmp/empty-purse-signals-');
 try{for(const signal of ['SIGINT','SIGTERM']){const code=`import {createRunControl,retainCaseArtifacts} from ${JSON.stringify(moduleURL)}; const c=createRunControl(${JSON.stringify(path.join(t,'signal-run'))}); try { await retainCaseArtifacts({out:${JSON.stringify(t)},stem:${JSON.stringify(signal)},run:async()=>{process.kill(process.pid,${JSON.stringify(signal)}); await c.checkpoint(); throw Error('Signal ignored');},snapshot:()=>({scope:'synthetic-only',tick:0}),verify:()=>{throw Error('Must not verify interruption');}}); } catch(e) { if(e.code!=='STOP_REQUESTED')throw e; console.log(e.message); } finally { c.close(); }`;
  const r=spawnSync(process.execPath,['--input-type=module','-e',code],{encoding:'utf8',timeout:5000});assert.equal(r.status,0,r.stderr);assert.match(r.stdout,new RegExp(signal));assert.equal(JSON.parse(readFileSync(path.join(t,signal+'-partial.json'))).draft.tick,0);assert.equal(existsSync(path.join(t,signal+'-verified.json')),false);
 }}finally{rmSync(t,{recursive:true,force:true});}
});


test('synthetic raw-serialization failure preserves other draft components with a capture error',async()=>{
 const t=mkdtempSync('/tmp/empty-purse-serialization-');try{const bad={};bad.loop=bad;const row={scope:'synthetic-only',tick:0,bad};await assert.rejects(()=>retainCaseArtifacts({out:t,stem:'bad',run:()=>row,verify:()=>{}}),/circular/i);
 const saved=JSON.parse(readFileSync(path.join(t,'bad-partial.json'))).draft;assert.equal(saved.tick,0);assert.equal(saved.scope,'synthetic-only');assert.match(saved.bad.captureError,/circular/i);assert.equal(existsSync(path.join(t,'bad-verified.json')),false);
 }finally{rmSync(t,{recursive:true,force:true});}
});
