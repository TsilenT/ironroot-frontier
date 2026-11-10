/** Closed experiment. Import/freeze never advances a battle. Generated artifacts stay external. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,readdirSync,existsSync,mkdirSync} from 'node:fs';
import path from 'node:path';import {fileURLToPath} from 'node:url';
import {observe} from '../../dist/fog.js';
import {instrumentEconomy,verifyPlayerCadence} from '../salt-stores/economy.mjs';
import {sha256,validateOutput,createRunControl,retainCaseArtifacts} from '../leave-no-road-closed/run.mjs';
import {DESIGN,QA_IDENTITY,createPrototype,evaluatePrototype,savePrototype,restorePrototype} from './scenario.mjs';
import {POLICIES,createPolicy} from './policies.mjs';
export {validateOutput,createRunControl,retainCaseArtifacts};
export const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
export const PLAN=JSON.parse(readFileSync(new URL('./PLAN.json',import.meta.url)));
const DECISION_TICK=3600,LANES=[0,2];
function exactPlan(){
 assert.deepEqual(PLAN.knownSeeds,[9501,9502]);assert.equal(PLAN.naturalCaseCount,6);
 assert.deepEqual(PLAN.cases.map(x=>x.policy),['fresh-contact','stale-contact','omniscient-diagnostic']);
 assert.equal(new Set(PLAN.cases.map(x=>x.id)).size,3);
}
export function freeze(){
 exactPlan();const files={};
 const names=[...readdirSync(path.join(ROOT,'dist')).filter(n=>n.endsWith('.js')).map(n=>'dist/'+n),
  ...readdirSync(path.join(ROOT,'qa/two-messages')).filter(n=>/\.(?:mjs|json)$/.test(n)).map(n=>'qa/two-messages/'+n),
  'package.json','qa/salt-stores/economy.mjs','qa/leave-no-road-closed/run.mjs','qa/leave-no-road-closed/scenario.mjs','qa/leave-no-road-closed/policies.mjs','qa/leave-no-road-closed/PLAN.json',
  'tests/two-messages-prototype.test.mjs','tests/two-messages-runner.test.mjs','docs/TWO_MESSAGES_PROTOTYPE.md'];
 for(const name of [...new Set(names)].sort())files[name]=sha256(readFileSync(path.join(ROOT,name)));
 const closure={baselineCommit:DESIGN.baselineCommit,baselineTree:DESIGN.baselineTree,node:process.version,files,design:DESIGN,identity:QA_IDENTITY,policies:POLICIES,plan:PLAN};
 return {format:'two-messages-freeze-v1',status:'awaiting-independent-preflight',sha256:sha256(closure),closure};
}
/** Approval binds a single new output path, so it cannot authorize a fresh-path replay. */
export function verifyApproval(approval,out){
 assert.ok(approval&&Object.getPrototypeOf(approval)===Object.prototype);
 assert.deepEqual(Object.keys(approval).sort(),['format','status','independentReviewer','parentAuthorization','freezeSha256','outputPath'].sort());
 assert.equal(approval.format,'two-messages-approval-v1');assert.equal(approval.status,'parent-authorized-after-independent-preflight');
 for(const k of ['independentReviewer','parentAuthorization','outputPath'])assert.ok(typeof approval[k]==='string'&&approval[k].trim());
 assert.equal(approval.freezeSha256,freeze().sha256,'Changed source/design/plan/runtime');
 assert.equal(path.resolve(approval.outputPath),path.resolve(out),'Approval is for another output path');return true;
}
export function advanceRunnerTick(game){
 const before=evaluatePrototype(game);if(before.completed||before.failed)return before;
 const tick=game.tick;game.update(.05);assert.equal(game.tick,tick+1,'Active native simulation must advance exactly one tick');return evaluatePrototype(game);
}
const clone=x=>structuredClone(x);
const errorRecord=e=>({name:e.name??'Error',message:e.message??String(e),code:e.code??null});
const structure=b=>({id:b.id,type:b.type,lane:b.lane,x:b.x,y:b.y,level:b.level});
/** Conservative lane-wide visibility gaps. These do not imply a hidden enemy treasury. */
export function createObservationRecorder(){
 const prior=new Map(LANES.map(lane=>[lane,{ids:[],ever:false}])),events=[],samples=[];
 return {events,samples,record(game,{sample=false}={}){
  // End-of-battle full-map reveal is not reconnaissance. Terminal state is
  // retained separately in the raw result, never as a renewed sighting.
  const outcome=evaluatePrototype(game);if(outcome.completed||outcome.failed)return;
  const view=observe(game,0);if(!view.fog.enabled||view.fog.revealed)return;
  const visible=view.state.buildings.filter(b=>b.side===1),memories=view.fog.memories;
  for(const lane of LANES){
   const old=prior.get(lane),buildings=visible.filter(b=>b.lane===lane).map(structure).sort((a,b)=>a.id-b.id),ids=buildings.map(b=>b.id);
   if(JSON.stringify(ids)!==JSON.stringify(old.ids)){
    const transition=!ids.length?'gap':!old.ids.length?(old.ever?'renewal':'first-contact'):'visible-set-change';
    events.push({tick:game.tick,time:game.state.time,lane,transition,buildings});
   }
   prior.set(lane,{ids,ever:old.ever||ids.length>0});
  }
  if(sample)samples.push({tick:game.tick,time:game.state.time,visible:visible.map(structure),memories:clone(memories),ownGold:view.state.gold[0],ownIncome:view.state.income[0],knownEnemyCitadelHP:view.state.bases[1].hp});
 }};
}
/** Evidence only, not a utility/balance verdict. Missing evidence stays an explicit failure to establish the concept. */
export function summarizeInformation(events,transactions){
 events=events.filter(e=>e.tick<=DECISION_TICK);
 const paid=transactions.filter(t=>t.side===1&&t.method==='build'),reobserved=[];
 for(const lane of LANES){
  let first=null,gap=null,lastGap=null;
  for(const event of events.filter(e=>e.lane===lane)){
   if(event.transition==='first-contact'&&first===null)first=event.time;
   if(event.transition==='gap'&&first!==null)gap=event.time;
   if(event.transition==='renewal'&&gap!==null){lastGap={start:gap,end:event.time};gap=null;}
   if(first===null||!lastGap||!event.buildings.length)continue;
   for(const b of event.buildings){const buy=paid.find(t=>t.id===b.id&&t.lane===lane&&t.time>first&&t.time>=lastGap.start&&t.time<lastGap.end);
    if(buy&&!reobserved.some(x=>x.id===b.id))reobserved.push({id:b.id,type:b.type,lane,firstContact:first,gap:clone(lastGap),paidAt:buy.time,cost:buy.cost,seenAt:event.time});}
  }
 }
 return {firstContacts:events.filter(e=>e.transition==='first-contact').length,gaps:events.filter(e=>e.transition==='gap').length,renewals:events.filter(e=>e.transition==='renewal').length,laterPaidBuildingsReobserved:reobserved,
  limitation:'A sight gap and later paid contact alone do not establish a changed sensible purchase or an avoidable cost. Compare same-seed commitments and common-time costs; do not require blind defeat.'};
}
async function executeCase({seed,spec,checkpoint}){
 let game,player,economy,initial,phase='before-factory',beforeDecision=null;const commands=[],trace=[],losses=[],restoreChecks=[],shadows=[],observation=createObservationRecorder(),firstCoreDamage=[null,null];let steps=0;
 const capture=()=>({seed,caseId:spec.id,policy:spec.policy,phase,initial,current:game&&savePrototype(game,player?.snapshot()),commands,trace,losses,restoreChecks,observations:{events:observation.events,samples:observation.samples},ledger:economy?.snapshot(),beforeDecision});
 try{
  game=createPrototype({seed});player=createPolicy(spec.policy);initial=savePrototype(game,player.snapshot());
  const initialRestore=restorePrototype(initial);assert.deepEqual(savePrototype(initialRestore.game,initialRestore.policyState),initial);
  economy=instrumentEconomy(game);const damage=game._damage;
  game._damage=function(target,...args){const before=target.hp,result=damage.call(this,target,...args);
   if(!this.damageQueue&&target.hp<before){if(target.type==='base'&&firstCoreDamage[target.side]===null)firstCoreDamage[target.side]=this.state.time;
    if(before>0&&target.hp<=0&&this.buildings[target.type])losses.push({tick:this.tick,time:this.state.time,id:target.id,type:target.type,side:target.side,lane:target.lane,invested:target.invested});}return result;};
  phase='running';
  while(!evaluatePrototype(game).completed&&!evaluatePrototype(game).failed){
   if(game.tick%100===0)await checkpoint();assert.ok(++steps<=12002,'Native fixed-tick guard');
   if(game.tick===DECISION_TICK)beforeDecision=game.serialize();
   observation.record(game,{sample:game.tick%100===0});
   if(game.tick%100===0)trace.push({tick:game.tick,time:game.state.time,hp:game.state.bases.map(b=>b.hp),gold:[...game.state.gold],ownSpending:economy.ledger.spending[0],ownBuildingLosses:losses.filter(x=>x.side===0).length,built:[...game.state.stats.built],kills:[...game.state.stats.kills],units:[0,1].map(side=>game.state.units.filter(u=>u.side===side&&u.hp>0).length)});
   const command=player.step(game);if(command)commands.push(clone(command));
   for(const shadow of shadows)assert.deepEqual(shadow.player.step(shadow.game),command,'Restored policy command divergence');
   advanceRunnerTick(game);economy.reconcile();
   for(let i=shadows.length-1;i>=0;i--){const shadow=shadows[i];advanceRunnerTick(shadow.game);assert.deepEqual(savePrototype(shadow.game,shadow.player.snapshot()),savePrototype(game,player.snapshot()),'Restored game/policy continuation divergence');shadow.receipt.checkedTicks++;if(--shadow.remaining===0)shadows.splice(i,1);}
   if([1800,3601].includes(game.tick)&&!evaluatePrototype(game).completed&&!evaluatePrototype(game).failed){const packet=savePrototype(game,player.snapshot()),restored=restorePrototype(packet);assert.deepEqual(savePrototype(restored.game,restored.policyState),packet);const receipt={tick:game.tick,envelopeRoundTrip:true,checkedTicks:0};restoreChecks.push(receipt);shadows.push({game:restored.game,player:createPolicy(spec.policy,{state:restored.policyState}),remaining:5,receipt});}
  }
  observation.record(game,{sample:true});if(game.tick%100===0&&!trace.some(t=>t.tick===game.tick))trace.push({tick:game.tick,time:game.state.time,hp:game.state.bases.map(b=>b.hp),gold:[...game.state.gold],ownSpending:economy.ledger.spending[0],ownBuildingLosses:losses.filter(x=>x.side===0).length,built:[...game.state.stats.built],kills:[...game.state.stats.kills],units:[0,1].map(side=>game.state.units.filter(u=>u.side===side&&u.hp>0).length)});phase='raw-completion';const ledger=economy.snapshot();
  return {...capture(),scope:'Closed-design known-input QA, not campaign admission or human balance',current:undefined,final:savePrototype(game,player.snapshot()),outcome:evaluatePrototype(game),duration:game.state.time,finalHP:game.state.bases.map(b=>b.hp),firstCoreDamage,ledger,information:summarizeInformation(observation.events,ledger.transactions)};
 }catch(error){try{error.partial=clone(capture());}catch{error.partial={seed,caseId:spec.id,phase,captureFailed:true};}throw error;}
}
function validateCompletedCase(row,approval,out){
 const restored=restorePrototype(row.final);assert.deepEqual(savePrototype(restored.game,restored.policyState),row.final);verifyPlayerCadence(row.ledger.transactions);
 for(const t of row.ledger.transactions){const g=restored.game,price=t.method==='build'?g.buildings[t.type].cost:t.method==='upgrade'?Math.round(g.buildings[t.type].cost*(.7+.35*(t.before.building.level-1))):t.method==='cast'?g.ruleset.spell.cost:t.method==='buyCitadelOption'?g.ruleset.citadel.cost:null;if(price!==null)assert.equal(t.cost,price,'Ordinary price mismatch');}
 assert.ok(row.ledger.maxError.every(n=>n<=1e-6));verifyApproval(approval,out);
}
function compareSameSeed(rows){
 const simplify=t=>({time:t.time,tick:t.tick,side:t.side,method:t.method,args:t.args,cost:t.cost,id:t.id,type:t.type,lane:t.lane});
 const reference=rows[0],commonEnd=Math.min(180,...rows.map(r=>r.duration));
 const costTick=Math.min(Math.round(DESIGN.comparisonTime/.05),...rows.map(r=>Math.floor((Math.round(r.duration/.05))/100)*100));
 const commonCosts=rows.map(r=>{const sample=r.trace.find(t=>t.tick===costTick);assert.ok(sample,'Missing common-time sample');return {policy:r.policy,tick:costTick,time:sample.time,hp:sample.hp,ownGold:sample.gold[0],ownKills:sample.kills[0],ownBuildingLosses:sample.ownBuildingLosses,ownSpending:sample.ownSpending};});
 for(const row of rows.slice(1)){
  assert.deepEqual(row.ledger.transactions.filter(t=>t.time<commonEnd-1e-7).map(simplify),reference.ledger.transactions.filter(t=>t.time<commonEnd-1e-7).map(simplify),'Common paid prefix diverged');
  if(row.beforeDecision&&reference.beforeDecision)assert.deepEqual(row.beforeDecision,reference.beforeDecision,'Common pre-decision game differs');
 }
 return {seed:reference.seed,commonPrefixThrough:commonEnd,identicalPaidPrefix:true,commonTimeCosts:commonCosts,cases:rows.map(r=>({policy:r.policy,reachedDecision:!!r.beforeDecision,decisionCommands:r.commands.filter(c=>c.kind==='decision'),decisionPurchases:r.ledger.transactions.filter(t=>t.side===0&&t.time>=180-1e-7).map(simplify),information:r.information,outcome:r.outcome,duration:r.duration,finalHP:r.finalHP,ownBuildingLosses:r.losses.filter(x=>x.side===0).length})),
  verdict:'Unassessed. Require an actual gap and later paid contact, a different sensible commitment, and a measurable avoidable cost in both seeds. Otherwise report failure; identical wins are not automatically failure or success.'};
}
export async function runApprovedMatrix({approval,out}){
 verifyApproval(approval,out);out=validateOutput(out);const cases=validateOutput(out+'.cases');
 writeFileSync(out,JSON.stringify({status:'starting',freezeSha256:approval.freezeSha256}),{flag:'wx'});mkdirSync(cases);
 const control=createRunControl(out),results=[],comparisons=[];let current=null;
 const writeStatus=(status,error=null)=>writeFileSync(out,JSON.stringify({status,freezeSha256:approval.freezeSha256,casesDirectory:cases,current,results,comparisons,error:error&&errorRecord(error)}));
 try{
  for(const seed of PLAN.knownSeeds){const rows=[];
   for(const spec of PLAN.cases){current={seed,caseId:spec.id};await control.checkpoint();verifyApproval(approval,out);writeStatus('running');
    const stem=`${seed}-${spec.id}`,row=await retainCaseArtifacts({out:cases,stem,run:()=>executeCase({seed,spec,checkpoint:()=>control.checkpoint()}),verify:async r=>{await control.checkpoint();validateCompletedCase(r,approval,out);}});
    rows.push(row);results.push({seed,caseId:spec.id,policy:spec.policy,outcome:row.outcome,duration:row.duration,finalHP:row.finalHP,information:row.information,rawFile:path.join(cases,stem+'.json'),verified:true});current=null;writeStatus('partial');
   }
   comparisons.push(compareSameSeed(rows));writeStatus(results.length===PLAN.naturalCaseCount?'complete':'partial');
  }
  return {results,comparisons};
 }catch(error){writeStatus('incomplete',error);throw error;}finally{control.close();}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const [mode,a,b,...extra]=process.argv.slice(2);assert.equal(extra.length,0);
 if(mode==='--freeze'&&a&&!b){const out=validateOutput(a);writeFileSync(out,JSON.stringify(freeze(),null,2),{flag:'wx'});process.stdout.write('Frozen only: '+out+'\n');}
 else if(mode==='--run-approved'&&a&&b)await runApprovedMatrix({approval:JSON.parse(readFileSync(a)),out:b});
 else throw Error('Use --freeze EXTERNAL_NEW_FILE or --run-approved APPROVAL EXTERNAL_NEW_RESULTS');
}
