/** Frozen known-case runner. Importing it and npm test never advances a battle. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,readdirSync,realpathSync,existsSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {Game} from '../../dist/engine.js';
import {advanceObjectiveBattle} from '../../dist/objectives.js';
import {instrumentEconomy,verifyPlayerCadence} from '../salt-stores/economy.mjs';
import {DESIGN,POLICIES,createPrototype,createPolicy,evaluatePrototype} from './prototype.mjs';
export const PLAN=JSON.parse(readFileSync(new URL('./PLAN.json',import.meta.url)));
export const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
export const sha256=x=>createHash('sha256').update(typeof x==='string'||Buffer.isBuffer(x)?x:JSON.stringify(x)).digest('hex');
export function sourceClosure(){
 const files={};for(const name of readdirSync(path.join(ROOT,'dist')).sort())files['dist/'+name]=sha256(readFileSync(path.join(ROOT,'dist',name)));
 for(const name of ['package.json','qa/shared-watch/prototype.mjs','qa/shared-watch/experiment.mjs','qa/shared-watch/PLAN.json','qa/salt-stores/economy.mjs','tests/shared-watch-prototype.test.mjs','docs/SHARED_WATCH_PROTOTYPE.md'])files[name]=sha256(readFileSync(path.join(ROOT,name)));
 return {baselineCommit:DESIGN.baselineCommit,baselineTree:DESIGN.baselineTree,execution:{nodeVersion:process.version,platform:process.platform,arch:process.arch,nodeExecutable:process.execPath,workspace:realpathSync(ROOT),entrypoint:'qa/shared-watch/experiment.mjs',mode:'--run-approved',stopPolicy:'Check OUTPUT_DIRECTORY.stop every 100 fixed ticks and between cases. SIGINT/SIGTERM stops between cases. Retain completed raws; mark incomplete; never retry automatically.'},files,design:DESIGN,policies:POLICIES,plan:PLAN};
}
export function freeze(){const closure=sourceClosure();return {format:'shared-watch-freeze-v1',status:'frozen-awaiting-independent-review-and-coordinator-authorization',closureSha256:sha256(closure),closure};}
export function verifyApproval(packet){
 assert.equal(packet?.format,'shared-watch-approved-known-cases-v1');
 assert.equal(packet?.status,'independent-review-approved-and-coordinator-authorized');
 assert.ok(typeof packet.independentReviewer==='string'&&packet.independentReviewer.length>0,'Named independent review required');
 assert.ok(typeof packet.coordinatorAuthorization==='string'&&packet.coordinatorAuthorization.length>0,'Exact coordinator authorization required');
 assert.deepEqual(packet.freeze?.closure,sourceClosure(),'Frozen dependencies changed');
 assert.equal(packet.freeze.closureSha256,sha256(packet.freeze.closure),'Freeze digest mismatch');
 return true;
}
export function advanceSimulation(g,before=()=>{},after=()=>{}){
 const max=Math.ceil(DESIGN.timeLimit/.05)+2;let steps=0;
 while(!evaluatePrototype(g).completed&&!evaluatePrototype(g).failed){
  assert.ok(++steps<=max,'Finite fixed-tick guard exceeded');const tick=g.tick,time=g.state.time,acc=g.accumulator;
  before();advanceObjectiveBattle(g,.05,evaluatePrototype,DESIGN.timeLimit);
  assert.ok(g.tick>tick&&g.state.time>time||g.accumulator>acc||evaluatePrototype(g).completed||evaluatePrototype(g).failed,'Active battle made no progress');after();
 }
 return evaluatePrototype(g);
}
/** Observation-only hooks. Tests may exercise direct/queued damage fixtures without ticking. */
export function instrumentCombat(g,initial=g.serialize()){
 const s=g.state,fires=[],damageEvents=[],spawns=[],losses=[],pending=[],births=new Map(),original=new Map(initial.state.buildings.map(b=>[b.id,b]));
 const firstCoreDamage=[null,null];let currentFire=null,firstEnemyProducerLossAt=null;
 function forceContext(){return [0,1].map(side=>{
  const units=s.units.filter(u=>u.side===side&&u.hp>0),composition={};
  for(const u of units){const key=u.type+'@'+u.level;composition[key]??={count:0,hp:0};composition[key].count++;composition[key].hp+=u.hp;}
  return {side,living:units.length,totalHP:units.reduce((n,u)=>n+u.hp,0),composition,originalProducers:initial.state.buildings.filter(b=>b.side===side&&g.buildings[b.type].unit).map(b=>{const live=s.buildings.find(x=>x.id===b.id&&x.hp>0);return {id:b.id,type:b.type,lane:b.lane,alive:!!live,hp:live?.hp??0,level:live?.level??b.level};})};
 });}
 const spawn=g._spawn;g._spawn=function(b){const before=this.nextId,r=spawn.call(this,b);for(const u of s.units.filter(u=>u.id>=before)){const row={tick:g.tick,time:s.time,id:u.id,type:u.type,side:u.side,buildingId:b.id,birthLane:b.lane};births.set(u.id,row);spawns.push(row);}return r;};
 const fire=g._fire;g._fire=function(a,t,amount,type,extra){
  const candidates=a.type==='watchtower'?s.units.filter(u=>u.side!==a.side&&u.hp>0&&Math.hypot(u.x-a.x,u.y-a.y)<g.buildings.watchtower.range).map(u=>({id:u.id,type:u.type,lane:u.lane,birthLane:births.get(u.id)?.birthLane??u.lane,ground:!g.units[u.type].flying,distance:Math.hypot(u.x-a.x,u.y-a.y)})):[];
  const row={index:fires.length,context:a.type==='watchtower'?forceContext():null,tick:g.tick,time:s.time,attackerId:a.id,attackerType:a.type,side:a.side,attackerLane:births.get(a.id)?.birthLane??a.lane??null,targetId:t.id,targetType:t.type,targetSide:t.side,targetLane:births.get(t.id)?.birthLane??t.lane??null,targetGround:!!g.units[t.type]&&!g.units[t.type].flying,requested:amount,effective:0,candidates};fires.push(row);
  const previous=currentFire;currentFire=row;try{return fire.call(this,a,t,amount,type,extra);}finally{currentFire=previous;}
 };
 const damage=g._damage;g._damage=function(t,amount,side){
  if(this.damageQueue){pending.push({target:t.id,amount,side,fire:currentFire});return damage.call(this,t,amount,side);}
  const queued=pending.length>0,meta=queued?pending.shift():{fire:currentFire};if(queued)assert.ok(meta.target===t.id&&meta.amount===amount&&meta.side===side,'Queued damage attribution order changed');
  const hp=t.hp,r=damage.call(this,t,amount,side),effective=hp-t.hp;if(effective<=0)return r;
  if(meta.fire)meta.fire.effective+=effective;
  damageEvents.push({tick:g.tick,time:s.time,attackerId:meta.fire?.attackerId??null,attackerLane:meta.fire?.attackerLane??null,side,targetId:t.id,targetType:t.type,targetSide:t.side,targetLane:births.get(t.id)?.birthLane??t.lane??null,effective,fireIndex:meta.fire?.index??null});
  if(t.type==='base'&&firstCoreDamage[t.side]===null)firstCoreDamage[t.side]=s.time;
  if(t.hp<=0&&g.buildings[t.type]){const row={tick:g.tick,time:s.time,id:t.id,type:t.type,side:t.side,lane:t.lane,x:t.x,original:original.has(t.id)};losses.push(row);if(t.side===1&&original.has(t.id)&&g.buildings[t.type].unit&&firstEnemyProducerLossAt===null)firstEnemyProducerLossAt=s.time;}
  return r;
 };
 return {fires,damageEvents,spawns,losses,pending,firstCoreDamage,get firstEnemyProducerLossAt(){return firstEnemyProducerLossAt;}};
}
export function runFrozenCase({policy,seed,packet,donor,stop=()=>false}={}){
 verifyApproval(packet);assert.ok(PLAN.knownSeeds.includes(seed));assert.ok(PLAN.caseOrder.includes(policy));
 if(POLICIES[policy].kind==='replay'){assert.equal(donor?.policy,'central-watch');assert.equal(donor.seed,seed);}
 const g=createPrototype({seed}),s=g.state,initial=g.serialize(),economy=instrumentEconomy(g);
 const player=createPolicy(policy,{donorCommands:donor?.commands.filter(c=>c.ok&&!c.omitted)??[]});
 const combat=instrumentCombat(g,initial),{fires,damageEvents,spawns,losses,pending,firstCoreDamage}=combat;
 const attempts=[],trace=[],aiCalls=[],unexpectedGoldWrites=[],restoreChecks=[];
 let depth=0,activeAI=false,firstCountWarningAt=null,nextTrace=0;
 s.gold=new Proxy(s.gold,{set(a,k,v){if(k!=='length'&&!depth)unexpectedGoldWrites.push({tick:g.tick,key:k,value:v});a[k]=v;return true;}});
 for(const method of ['_step','build','upgrade','cast','sell','buyCitadelOption']){const prior=g[method];g[method]=function(...args){depth++;try{return prior.apply(this,args);}finally{depth--;}};}
 for(const method of ['build','upgrade','cast','sell','buyCitadelOption']){const prior=g[method];g[method]=function(...args){const side=method==='build'?(args[3]??0):method==='cast'?(args[2]??0):(args[1]??0),before=s.gold[side],r=prior.apply(this,args);attempts.push({tick:g.tick,time:s.time,method,args,side,ai:activeAI,beforeGold:before,afterGold:s.gold[side],ok:r.ok,reason:r.reason??null,id:r.building?.id??null});return r;};}

 const ai=g._ai;g._ai=function(side=1){const start=attempts.length,before=s.gold[side];activeAI=true;try{return ai.call(this,side);}finally{activeAI=false;aiCalls.push({tick:g.tick,time:s.time,beforeGold:before,afterGold:s.gold[side],attemptStart:start,attemptCount:attempts.length-start});}};
 const checkpoints=[30,90],shadows=[];
 function mirror(shadow,row){if(!row||row.omitted)return;const a=row.action,b=shadow.state.buildings.find(b=>b.side===0&&b.type===a.type&&b.x===a.x&&b.lane===a.lane&&b.level===a.fromLevel);const r=a.method==='build'?shadow.build(a.type,a.x,shadow.map.lanes[a.lane],0):b?shadow.upgrade(b.id,0):{ok:false};assert.equal(r.ok,row.ok,'Restored command result diverged');}
 const outcome=advanceSimulation(g,()=>{if(g.tick%100===0&&stop()){const error=new Error('Externally stopped known-case matrix');error.code='EXTERNAL_STOP';error.partial={policy,seed,tick:g.tick,time:s.time,state:g.serialize()};throw error;}const row=player.step(g);for(const shadow of shadows)mirror(shadow.game,row);},()=>{
  assert.equal(pending.length,0,'All queued damage attributed');economy.reconcile();
  const counts=[0,1].map(side=>s.units.filter(u=>u.side===side&&u.hp>0).length);
  if(firstCountWarningAt===null&&counts[0]>=12&&counts[0]>=2*Math.max(counts[1],1))firstCountWarningAt=s.time;
  for(let i=shadows.length-1;i>=0;i--){const shadow=shadows[i];shadow.game.update(.05);assert.deepEqual(shadow.game.serialize(),g.serialize(),'Active restore continuation diverged');shadow.receipt.checkedTicks++;if(--shadow.remaining===0)shadows.splice(i,1);}
  if(checkpoints.length&&s.time>=checkpoints[0]-1e-7){const at=checkpoints.shift(),save=g.serialize(),restored=Game.restore(save);assert.deepEqual(restored.serialize(),save);const receipt={at,actualTime:s.time,tick:g.tick,checkedTicks:0};restoreChecks.push(receipt);if(!outcomeEnded(s))shadows.push({game:restored,remaining:10,receipt});}
  if(s.time>=nextTrace-1e-7){trace.push({tick:g.tick,time:s.time,hp:s.bases.map(b=>b.hp),gold:[...s.gold],income:[...s.income],counts,buildings:s.buildings.map(({id,type,side,lane,x,hp,level})=>({id,type,side,lane,x,hp,level})),units:s.units.map(({id,type,side,lane,x,y,hp})=>({id,type,side,lane,x,y,hp}))});nextTrace+=5;}
 });
 const ledger=economy.snapshot();verifyPlayerCadence(ledger.transactions);assert.deepEqual(unexpectedGoldWrites,[]);
 for(const t of ledger.transactions){const price=t.method==='build'?g.buildings[t.type].cost:t.method==='upgrade'?Math.round(g.buildings[t.type].cost*(.7+.35*(t.before.building.level-1))):t.method==='cast'?g.ruleset.spell.cost:t.method==='buyCitadelOption'?g.ruleset.citadel.cost:-Math.floor(t.before.building.invested*.5*t.before.building.hp/t.before.building.maxHp);assert.equal(t.cost,price,'Normal paid price');}
 const final=g.serialize();assert.deepEqual(Game.restore(final).serialize(),final);assert.deepEqual(packet.freeze.closure,sourceClosure(),'Source/environment changed during case');
 return {epoch:1,policy,seed,scope:'QA-only known-case hypothesis; not production campaign factory/evaluator',initial,commands:player.applied,attempts,aiCalls,ledger,unexpectedGoldWrites,firstCoreDamage,firstCountWarningAt,firstEnemyProducerLossAt:combat.firstEnemyProducerLossAt,restoreChecks,spawns,losses,fires,damageEvents,trace,outcome,duration:s.time,finalHP:s.bases.map(b=>b.hp),final};
}
const outcomeEnded=s=>s.winner!==null||s.bases.some(b=>b.hp<=0)||s.time>=DESIGN.timeLimit-1e-7;
export function summarize(r){
 const watchId=r.ledger.transactions.find(t=>t.side===0&&t.type==='watchtower')?.id??null;
 const close=Math.min(PLAN.openingWindow.maximumSeconds,r.firstEnemyProducerLossAt??Infinity,r.firstCoreDamage[1]??Infinity);
 const shots=r.fires.filter(f=>f.attackerId===watchId&&f.time<close-1e-7),openingDamage=[0,0,0];
 for(const f of shots)if(f.targetGround)openingDamage[f.targetLane]+=f.effective;
 const competition=[];for(let i=0;i<shots.length;i++){
  const shot=shots[i],candidates=shot.candidates.filter(c=>c.ground),lanes=new Set(candidates.map(c=>c.birthLane));if(lanes.size<2)continue;
  const unchosen=new Set(candidates.filter(c=>c.id!==shot.targetId&&c.birthLane!==shot.targetLane).map(c=>c.id));
  const until=Math.min(r.fires.find(f=>f.attackerId===watchId&&f.time>shot.time+1e-7)?.time??shot.time+.85,close);
  const harm=r.damageEvents.filter(d=>d.side===1&&d.targetSide===0&&d.tick>shot.tick&&d.time<until-1e-7&&unchosen.has(d.attackerId));
  if(harm.length)competition.push({shotTick:shot.tick,time:shot.time,targetLane:shot.targetLane,competingLanes:[...lanes],unchosenEffectiveDamage:harm.reduce((n,d)=>n+d.effective,0),damageEventTicks:harm.map(d=>d.tick)});
 }
 const paid=r.ledger.transactions.filter(t=>t.side===0&&t.cost>0),first=r.firstCoreDamage[1];
 return {policy:r.policy,seed:r.seed,won:r.outcome.completed,duration:r.duration,hp:r.finalHP,openingClosedAt:close,originalWatchId:watchId,openingWatchGroundDamageByRoad:openingDamage,competition,paidFoundryBeforeCore:paid.some(t=>t.type==='foundry'&&(first===null||t.time<first)),paidSupportBeforeCore:paid.some(t=>['archery','wardenLodge','sanctum'].includes(t.type)&&(first===null||t.time<first)),playerSpend:r.ledger.spending[0],enemySpend:r.ledger.spending[1],maxLedgerError:Math.max(...r.ledger.maxError),restoreChecks:r.restoreChecks,rejectedPlayerAttempts:r.attempts.filter(a=>a.side===0&&!a.ok).length};
}
const PRODUCERS=new Set(['barracks','archery','foundry','sanctum','aerie','wardenLodge']);
/** Classify actual losses when they occur, never from final surviving building types.
 * Southern producer losses use target road. Southern core pressure uses attacker's
 * birth road (cores have no road); other structure damage uses the target road. */
export function placementConsequence(donor,control){
 const horizon=Math.min(180,donor.duration,control.duration),eligible=r=>r.losses.filter(l=>l.side===0&&l.lane===2&&PRODUCERS.has(l.type)&&l.time<=horizon+1e-7),key=l=>[l.type,l.x,l.lane].join('/');
 const donorLost=new Set(eligible(donor).map(key)),avoidedSouthernProducerLosses=eligible(control).filter(l=>!donorLost.has(key(l)));
 const structureDamage=r=>r.damageEvents.filter(d=>d.side===1&&d.targetSide===0&&d.time<=horizon+1e-7&&(d.targetLane===2&&['barracks','archery','foundry','watchtower','mint','sanctum','aerie','wardenLodge'].includes(d.targetType)||d.targetType==='base'&&d.attackerLane===2)).reduce((n,d)=>n+d.effective,0);
 return {horizon,avoidedSouthernProducerLosses,donorSouthernThreatStructureDamage:structureDamage(donor),controlSouthernThreatStructureDamage:structureDamage(control)};
}
export function decide(runs){
 const summaries=runs.map(summarize),failures=[],comparisons=[],positiveWitnesses=[],mainWins={},negativeFailures={};
 for(const id of ['central-watch','distributed-mobile']){const wins=summaries.filter(r=>r.policy===id&&r.won).map(r=>r.seed);mainWins[id]=wins;if(wins.length<2||!wins.includes(DESIGN.seed))failures.push(`${id}: requires >=2/3 wins including default ${DESIGN.seed}`);}
 for(const id of ['idle','watch-only']){const losses=summaries.filter(r=>r.policy===id&&!r.won).map(r=>r.seed);negativeFailures[id]=losses;if(losses.length<2||!losses.includes(DESIGN.seed))failures.push(`${id}: requires >=2/3 failures including default ${DESIGN.seed}`);}
 for(const seed of PLAN.knownSeeds){
  const get=id=>runs.find(r=>r.policy===id&&r.seed===seed),summary=id=>summaries.find(r=>r.policy===id&&r.seed===seed);
  assert.ok(PLAN.caseOrder.every(id=>get(id)),'Full preregistered matrix required');
  const c=get('central-watch'),cs=summary('central-watch'),comparison={seed,...placementConsequence(c,get('north-watch-control'))};comparisons.push(comparison);
  const shared=cs.openingWatchGroundDamageByRoad[0]>=60&&cs.openingWatchGroundDamageByRoad[2]>=60&&cs.competition.length>0;
  if(cs.won&&shared&&comparison.avoidedSouthernProducerLosses.length>0)positiveWitnesses.push(seed);
  for(const id of ['central-watch','distributed-mobile']){const r=summary(id);if(r.won&&(!r.paidFoundryBeforeCore||!r.paidSupportBeforeCore))failures.push(`${seed}/${id}: winning route lacks paid supported assault`);}
  for(const id of PLAN.caseOrder){const r=get(id);if(Math.max(...r.ledger.maxError)>1e-6||r.unexpectedGoldWrites.length)failures.push(`${seed}/${id}: ledger failed`);if(!r.aiCalls.length||!r.ledger.transactions.some(t=>t.side===1&&t.cost>0))failures.push(`${seed}/${id}: normal paid enemy absent`);for(const at of [30,90])if(r.duration>at+.5&&!r.restoreChecks.some(x=>x.at===at&&x.checkedTicks===10))failures.push(`${seed}/${id}: active restore continuation absent at ${at}`);}
 }
 if(positiveWitnesses.length<2||!positiveWitnesses.includes(DESIGN.seed))failures.push(`Shared contribution, shared-stream saturation and avoided southern producer loss require >=2/3 winning-donor witnesses including default ${DESIGN.seed}`);
 const cheaperMatches=PLAN.knownSeeds.filter(seed=>{const c=runs.find(r=>r.seed===seed&&r.policy==='central-watch'),a=runs.find(r=>r.seed===seed&&r.policy==='central-archery-control');return c.outcome.completed&&a.outcome.completed&&placementConsequence(c,a).avoidedSouthernProducerLosses.length===0;});
 const warnings=[];if(cheaperMatches.length>=2)warnings.push('CHEAPER-SUBSTITUTE WARNING: central archery replay also wins without an additional southern producer loss in '+cheaperMatches.join(', ')+'. This is a dominance concern, not proof; review the full force/purchase/loss traces before any further validation or integration.');
 return {scope:PLAN.scope,decision:failures.length?'CUT-epoch1':warnings.length?'REVIEW-cheaper-substitute-concern':'KEEP-feasibility-for-independent-audit-only',failures,warnings,positiveWitnesses,mainWins,negativeFailures,comparisons,summaries,diagnostics:'Omit-watch and cheaper-archery outcomes and no-new-support concentrated siege are reported without mandatory loss. Ratios are descriptive only. No readiness or human-win-rate inference.'};
}

export function external(p){const real=realpathSync(p);assert.ok(real!==ROOT&&!real.startsWith(ROOT+path.sep),'Generated artifacts must stay outside repository');return real;}
export function validateOutputDirectory(p){const out=path.resolve(p);external(path.dirname(out));assert.ok(!existsSync(out),'Use a new external case directory');return out;}
export const stopFileRequested=output=>existsSync(output+'.stop');
export function verifyInvocation(packet,approvalPath,output){assert.deepEqual(packet.invocation,[process.execPath,fileURLToPath(import.meta.url),'--run-approved',realpathSync(approvalPath),path.resolve(output)],'Approval must bind exact invocation');}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const [mode,a,b]=process.argv.slice(2);
 if(mode==='--freeze'){assert.ok(a,'External freeze filename required');external(path.dirname(a));assert.ok(!existsSync(a),'Never overwrite a freeze');writeFileSync(a,JSON.stringify(freeze(),null,2)+'\n',{flag:'wx'});console.log('Frozen source, no battles: '+a);}
 else if(mode==='--run-approved'){
  assert.ok(a&&b,'Approval packet and fresh external output directory required');const packet=JSON.parse(readFileSync(a));verifyApproval(packet);const target=validateOutputDirectory(b);verifyInvocation(packet,a,b);mkdirSync(target);const out=external(target),closure=sourceClosure(),runs=[];
  writeFileSync(path.join(out,'approved-packet.json'),JSON.stringify(packet,null,2)+'\n');
  let signaled=false,stopped=false;process.on('SIGINT',()=>{signaled=true;});process.on('SIGTERM',()=>{signaled=true;});
  const stop=()=>signaled||stopFileRequested(b);
  outer:for(const seed of PLAN.knownSeeds)for(const policy of PLAN.caseOrder){
   await new Promise(resolve=>setImmediate(resolve));if(stop()){stopped=true;break outer;}
   try{const r=runFrozenCase({policy,seed,packet,donor:runs.find(r=>r.seed===seed&&r.policy==='central-watch'),stop});runs.push(r);writeFileSync(path.join(out,`${seed}-${policy}.json`),JSON.stringify(r)+'\n',{flag:'wx'});assert.deepEqual(sourceClosure(),closure,'Source/environment changed after case');console.log(JSON.stringify(summarize(r)));}
   catch(error){writeFileSync(path.join(out,'incomplete.json'),JSON.stringify({complete:false,reason:error.message,completedCases:runs.length,partial:error.partial??{policy,seed}},null,2)+'\n',{flag:'wx'});throw error;}
  }
  if(stopped){writeFileSync(path.join(out,'incomplete.json'),JSON.stringify({complete:false,reason:'external stop between cases',completedCases:runs.length},null,2)+'\n',{flag:'wx'});process.exitCode=2;}
  else {assert.deepEqual(sourceClosure(),closure,'Source changed during cases');writeFileSync(path.join(out,'decision.json'),JSON.stringify(decide(runs),null,2)+'\n',{flag:'wx'});}
 }else throw Error('Use --freeze EXTERNAL_FILE, or --run-approved APPROVAL_PACKET FRESH_EXTERNAL_DIRECTORY. No implicit simulations.');
}
