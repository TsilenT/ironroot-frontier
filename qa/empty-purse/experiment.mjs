/** Import, --freeze and structural tests never advance a candidate battle. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,readdirSync,lstatSync,realpathSync,existsSync,mkdirSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {setImmediate as yieldToEventLoop} from 'node:timers/promises';
import {Game} from '../../dist/engine.js';
import {advanceObjectiveBattle} from '../../dist/objectives.js';
import {instrumentEconomy,actualIncome,verifyPlayerCadence} from '../salt-stores/economy.mjs';
import {DESIGN,POLICIES,createPrototype,createPolicy,evaluatePrototype} from './prototype.mjs';
export const ROOT=realpathSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..'));
export const PLAN=JSON.parse(readFileSync(new URL('./PLAN.json',import.meta.url)));
export const sha256=x=>createHash('sha256').update(typeof x==='string'||Buffer.isBuffer(x)?x:JSON.stringify(x)).digest('hex');
export function sourceClosure(){
 const files={};function visit(dir){for(const name of readdirSync(path.join(ROOT,dir)).sort()){
  const rel=path.join(dir,name),s=lstatSync(path.join(ROOT,rel));assert.ok(!s.isSymbolicLink(),'No symlink in frozen source');
  if(s.isDirectory())visit(rel);else if(s.isFile())files[rel]={sha256:sha256(readFileSync(path.join(ROOT,rel))),mode:s.mode&511};
 }}visit('');
 return {files,design:DESIGN,policies:POLICIES,plan:PLAN,execution:{node:process.version,platform:process.platform,arch:process.arch,executable:process.execPath,workspace:ROOT}};
}
export function freeze(){const closure=sourceClosure();return {format:'empty-purse-freeze-v1',status:'pending-independent-review-no-battles',closureSha256:sha256(closure),closure};}
export function verifyApproval(packet){
 assert.equal(packet?.format,'empty-purse-approved-known-cases-v1');
 assert.equal(packet?.status,'independent-review-approved-and-coordinator-authorized');
 for(const k of ['independentReviewer','coordinatorAuthorization'])assert.ok(typeof packet[k]==='string'&&packet[k].trim().length>0,k+' required');
 assert.equal(packet.freeze?.closureSha256,sha256(packet.freeze?.closure),'Freeze digest mismatch');
 assert.deepEqual(packet.freeze.closure,sourceClosure(),'Frozen source/environment changed');return true;
}
export function validateOutputPath(out,{directory=false}={}){
 assert.ok(path.isAbsolute(out),'Absolute external output required');const abs=path.resolve(out);
 let parent=path.dirname(abs);while(!existsSync(parent))parent=path.dirname(parent);
 const resolved=path.join(realpathSync(parent),path.relative(parent,abs));
 assert.ok(resolved!==ROOT&&!resolved.startsWith(ROOT+path.sep),'Output must be outside repository');
 assert.ok(!existsSync(abs),'Never overwrite an existing output');
 if(directory)assert.ok(existsSync(path.dirname(abs)),'Output parent must already exist');return abs;
}
/** Reuses ordinary economy instrumentation. Primary hit attribution excludes
 * unattributed splash/volleys; those remain in the complete effective-damage log. */
export function instrumentField(g){
 const births=[],hits=[],losses=[],pending=[],birthById=new Map();let current=null;
 const spawn=g._spawn;g._spawn=function(b){const before=this.nextId,r=spawn.call(this,b);for(const u of this.state.units.filter(u=>u.id>=before)){
  const row={time:this.state.time,tick:this.tick,id:u.id,type:u.type,side:u.side,factoryId:b.id,lane:b.lane};births.push(row);birthById.set(u.id,row);
 }return r;};
 const fire=g._fire;g._fire=function(a,...args){const prev=current;current={id:a.id,type:a.type,side:a.side,birth:birthById.get(a.id)??null};try{return fire.call(this,a,...args);}finally{current=prev;}};
 const damage=g._damage;g._damage=function(t,amount,side){
  if(this.damageQueue){pending.push({id:t.id,amount,side,attacker:current});return damage.call(this,t,amount,side);}
  const meta=pending.length?pending.shift():{attacker:current};if(meta.id!==undefined)assert.ok(meta.id===t.id&&meta.amount===amount&&meta.side===side,'Queued damage attribution mismatch');
  const hp=t.hp,r=damage.call(this,t,amount,side),effective=hp-t.hp;
  if(effective>0){const row={time:this.state.time,tick:this.tick,side,targetId:t.id,targetType:t.type,targetKind:this.buildings[t.type]?'building':t.type==='base'?'base':'unit',targetSide:t.side,lane:t.lane??null,effective,attacker:meta.attacker};hits.push(row);
   if(t.hp<=0&&this.buildings[t.type])losses.push({time:row.time,tick:row.tick,id:t.id,type:t.type,side:t.side,lane:t.lane});
  }return r;
 };
 return {births,hits,losses,pending};
}
export function comparePair(retain,salvage){
 assert.equal(retain.seed,salvage.seed);
 const limit=Math.min(90,retain.duration,salvage.duration),times=new Set(salvage.traces.map(t=>t.tick));
 const a=retain.traces.filter(t=>t.time<=limit+1e-7&&times.has(t.tick)).at(-1),b=salvage.traces.find(t=>t.tick===a.tick);
 const at=(r)=>({grossPlayerIncome:r.traces.find(t=>t.tick===a.tick).grossIncome[0],ownCoreHP:r.traces.find(t=>t.tick===a.tick).hp[0],ownStructureDamage:r.field.hits.filter(h=>h.targetSide===0&&h.time<=a.time+1e-7&&h.targetKind==='building').reduce((n,h)=>n+h.effective,0),combatLosses:r.field.losses.filter(l=>l.side===0&&l.time<=a.time+1e-7),supportPrimaryDamage:r.field.hits.filter(h=>h.time<=a.time+1e-7&&r.paidFactoryIds.includes(h.attacker?.birth?.factoryId)).reduce((n,h)=>n+h.effective,0)});
 return {seed:retain.seed,commonClock:a.time,retain:at(retain),salvage:at(salvage),retainMinusSalvageGrossIncome:a.grossIncome[0]-b.grossIncome[0],scope:'Observed paired scripted outcomes, not isolated whole-outcome causality or a win-rate gate'};
}
function safeSnapshot(read){
 try{return JSON.parse(JSON.stringify(read()??null));}catch(e){return {captureError:e.message};}
}
function serializableDraft(value){
 if(!value||typeof value!=='object')return safeSnapshot(()=>value);
 return Object.fromEntries(Object.entries(value).map(([key,part])=>[key,safeSnapshot(()=>part)]));
}
/** Event-loop safe point at most every 100 fixed ticks and between cases. */
export function createRunControl(out){
 let stopped=false,signal=null;const onStop=name=>{stopped=true;signal=name;};
 const onInt=()=>onStop('SIGINT'),onTerm=()=>onStop('SIGTERM');
 process.on('SIGINT',onInt);process.on('SIGTERM',onTerm);
 return {async checkpoint(){
  await yieldToEventLoop();
  if(stopped||existsSync(out+'.stop')){const e=Error(signal?'Cancelled by '+signal:'Cancelled by stop file');e.code='STOP_REQUESTED';throw e;}
 },close(){process.off('SIGINT',onInt);process.off('SIGTERM',onTerm);}};
}
/** Retain failed draft or just-completed raw before any later verification.
 * Separate verification receipt prevents unverified raws being mistaken for passes. */
export async function retainCaseArtifacts({out,stem,run,verify,snapshot=()=>null}){
 let row;try{
  row=await run();const raw=JSON.stringify(row);
  writeFileSync(path.join(out,stem+'.json'),raw,{flag:'wx'});
  await verify(row);
  writeFileSync(path.join(out,stem+'-verified.json'),JSON.stringify({status:'case-and-postcase-source-verified',rawSha256:sha256(raw)}),{flag:'wx'});
  return row;
 }catch(e){
  writeFileSync(path.join(out,stem+'-partial.json'),JSON.stringify({status:'incomplete',reason:e.message,code:e.code??null,draft:serializableDraft(row??e.partial??safeSnapshot(snapshot))}),{flag:'wx'});
  throw e;
 }
}
async function executeCase({policy,seed,checkpoint}){
 let g,initial,economy,field,player,phase='before-factory';
 const traces=[],aiCalls=[],unexpectedGoldWrites=[];
 const capture=()=>({policy,seed,phase,initial:safeSnapshot(()=>initial),current:safeSnapshot(()=>g?.serialize()),commands:safeSnapshot(()=>player?.applied),ledger:safeSnapshot(()=>economy?.snapshot()),field:safeSnapshot(()=>field),traces:safeSnapshot(()=>traces),aiCalls:safeSnapshot(()=>aiCalls),unexpectedGoldWrites:safeSnapshot(()=>unexpectedGoldWrites)});
 try {
 g=createPrototype({seed});const s=g.state;initial=g.serialize();const original=new Set(s.buildings.map(b=>b.id));phase='initial-restore-validation';
 assert.deepEqual(Game.restore(initial).serialize(),initial);
 economy=instrumentEconomy(g);field=instrumentField(g);player=createPolicy(policy,g);
 let depth=0,traceIndex=0,steps=0;
 s.gold=new Proxy(s.gold,{set(a,k,v){if(k!=='length'&&!depth)unexpectedGoldWrites.push({tick:g.tick,key:k,value:v});a[k]=v;return true;}});
 for(const method of ['_step','build','upgrade','cast','sell','buyCitadelOption']){const prior=g[method];g[method]=function(...a){depth++;try{return prior.apply(this,a);}finally{depth--;}};}
 const ai=g._ai;g._ai=function(...a){const before=economy.ledger.transactions.length,r=ai.apply(this,a);aiCalls.push({tick:this.tick,time:s.time,transactions:economy.ledger.transactions.length-before});return r;};
 function trace(){traces.push({tick:g.tick,time:s.time,gold:[...s.gold],income:[0,1].map(side=>actualIncome(g,side)),grossIncome:[...economy.ledger.grossIncome],hp:s.bases.map(b=>b.hp),buildings:s.buildings.map(({id,type,side,lane,x,hp,level})=>({id,type,side,lane,x,hp,level})),units:s.units.map(({id,type,side,lane,x,hp})=>({id,type,side,lane,x,hp}))});}
 trace();traceIndex++;phase='running';
 while(!evaluatePrototype(g).completed&&!evaluatePrototype(g).failed){
  if(g.tick%100===0)await checkpoint();
  assert.ok(++steps<=Math.ceil(DESIGN.timeLimit/.05)+2,'Finite tick guard');player.step(g);
  const before=g.tick;advanceObjectiveBattle(g,.05,evaluatePrototype,DESIGN.timeLimit);assert.ok(g.tick>before||evaluatePrototype(g).failed||evaluatePrototype(g).completed,'No simulation progress');
  assert.equal(field.pending.length,0);economy.reconcile();
  if(traceIndex<PLAN.tracesAtSeconds.length&&s.time>=PLAN.tracesAtSeconds[traceIndex]-1e-7){trace();traceIndex++;}
 }
 phase='final-validation';if(traces.at(-1).tick!==g.tick)trace();
 const ledger=economy.snapshot();verifyPlayerCadence(ledger.transactions);assert.deepEqual(unexpectedGoldWrites,[]);
 for(let i=1;i<player.applied.length;i++)assert.ok(player.applied[i].time-player.applied[i-1].time>=5-1e-7,'Sale/failed-attempt cadence');
 for(const t of ledger.transactions){const price=t.method==='build'?g.buildings[t.type].cost:t.method==='upgrade'?g.upgradeCost(t.before.building):t.method==='cast'?g.ruleset.spell.cost:t.method==='buyCitadelOption'?g.ruleset.citadel.cost:-Math.floor(t.before.building.invested*.5*t.before.building.hp/t.before.building.maxHp);assert.equal(t.cost,price,'Ordinary price/refund');}
 const final=g.serialize();assert.deepEqual(Game.restore(final).serialize(),final);
 const paidFactories=new Set(ledger.transactions.filter(t=>t.side===0&&t.method==='build'&&g.buildings[t.type].unit).map(t=>t.id));
 const supportBirths=field.births.filter(b=>b.side===0&&paidFactories.has(b.factoryId));
 const supportHits=field.hits.filter(h=>h.attacker?.birth&&paidFactories.has(h.attacker.birth.factoryId));
 return {policy,seed,paidFactoryIds:[...paidFactories],scope:'QA-only scripted known case; no human balance or campaign admission',initial,final,outcome:evaluatePrototype(g),duration:s.time,ledger,commands:player.applied,aiCalls,unexpectedGoldWrites,field,traces,summary:{firstSupportBuildAt:ledger.transactions.find(t=>t.side===0&&t.method==='build'&&g.buildings[t.type].unit)?.time??null,firstSupportBirthAt:supportBirths[0]?.time??null,firstSupportPrimaryHitAt:supportHits[0]?.time??null,supportPrimaryEffectiveDamage:supportHits.reduce((n,h)=>n+h.effective,0),firstCoreDamageAt:[0,1].map(side=>field.hits.find(h=>h.targetType==='base'&&h.targetSide===side)?.time??null),originalCombatLosses:field.losses.filter(l=>original.has(l.id)),finalHP:s.bases.map(b=>b.hp)}};
 }catch(e){e.partial=capture();throw e;}
}
/** Only executable entry to battles: matching reviewed freeze plus exact command. */
export async function runApprovedMatrix(packet,{out,approvalPath,invocation}){
 verifyApproval(packet);assert.deepEqual(packet.invocation,invocation,'Exact approved invocation required');
 assert.deepEqual(invocation,[`--run-approved=${approvalPath}`,`--out=${out}`],'Unexpected invocation');
 validateOutputPath(out,{directory:true});mkdirSync(out);writeFileSync(path.join(out,'freeze.json'),JSON.stringify(packet.freeze,null,2));
 const control=createRunControl(out),summaries=[],pairs=[];let retained=null;
 try {for(const seed of PLAN.knownSeeds)for(const policy of PLAN.caseOrder){
  await control.checkpoint();verifyApproval(packet);
  const row=await retainCaseArtifacts({out,stem:`${seed}-${policy}`,run:()=>executeCase({policy,seed,checkpoint:()=>control.checkpoint()}),verify:()=>assert.deepEqual(packet.freeze.closure,sourceClosure(),'Source changed during case')});
  if(policy==='retain-income')retained=row;if(policy==='salvage-one-mine')pairs.push(comparePair(retained,row));summaries.push({policy,seed,outcome:row.outcome,duration:row.duration,...row.summary});
 }
 await control.checkpoint();writeFileSync(path.join(out,'summary.json'),JSON.stringify({status:'complete',summaries,pairs},null,2));return summaries;
 }catch(e){writeFileSync(path.join(out,'incomplete.json'),JSON.stringify({status:'incomplete',reason:e.message,completed:summaries},null,2));throw e;}
 finally{control.close();}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 const args=process.argv.slice(2);
 if(args.length===1&&args[0].startsWith('--freeze=')){const out=args[0].slice(9);validateOutputPath(out);writeFileSync(out,JSON.stringify(freeze(),null,2));console.log('Frozen source only; no candidate ticks executed.');}
 else if(args.length===2&&args[0].startsWith('--run-approved=')&&args[1].startsWith('--out=')){
  const approvalPath=args[0].slice(15),out=args[1].slice(6);assert.ok(path.isAbsolute(approvalPath));
  await runApprovedMatrix(JSON.parse(readFileSync(approvalPath)),{out,approvalPath,invocation:args});console.log('Approved known-case matrix complete.');
 }else throw Error('Use --freeze=/ABS/new.json, or the exact separately approved run command.');
}
