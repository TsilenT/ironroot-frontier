/** Pure QA record analysis. Does not construct games, advance ticks or choose seeds. */
import {getRuleset,CITADEL_CAMPAIGN_RULESET_IDS} from '../../dist/rulesets.js';
const ROSTER=getRuleset(CITADEL_CAMPAIGN_RULESET_IDS[2]);
const PRODUCERS=new Set(['barracks','archery','foundry','sanctum','aerie','wardenLodge']);
const CONTROLS=new Set(['north-watch-control','omit-watch-control','central-archery-control']);
const assetKey=a=>[a.type,a.x,a.lane].join('/');
const semantic=a=>({method:a.method,type:a.type,x:a.x,lane:a.lane,fromLevel:a.method==='upgrade'?a.fromLevel:null});
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const paidAt=(r,tick)=>r.ledger.transactions.filter(t=>t.side===0&&t.tick===tick&&t.cost>0);
const target=t=>({method:t.method,type:t.type,x:t.x,lane:t.lane,fromLevel:t.method==='upgrade'?t.before?.building?.level:null});
const requireRecord=(ok,message)=>{if(!ok)throw new Error(message);};
/** Fail closed on ordinary unit identity/provenance before crediting output. */
export function validateOrdinarySpawns(run){
 const producers=new Map(),births=new Map(),entityIds=new Set();
 const add=(b,tick)=>{requireRecord(Number.isSafeInteger(b.id)&&b.id>0&&!entityIds.has(b.id),'Invalid/duplicate building identity');entityIds.add(b.id);producers.set(b.id,{...b,tick});};
 for(const b of run.initial.state.buildings)add(b,0);
 for(const t of run.ledger.transactions)if(t.method==='build')add({...t,side:t.side},t.tick);
 for(const u of run.spawns){
  requireRecord(Number.isSafeInteger(u.id)&&u.id>0&&!entityIds.has(u.id)&&!births.has(u.id),'Invalid/duplicate spawned unit identity');
  requireRecord(Number.isSafeInteger(u.tick)&&u.tick>=0&&u.tick<=run.final.tick&&Number.isFinite(u.time)&&Math.abs(u.time-u.tick*.05)<1e-6,'Invalid spawned unit tick/time');
  const b=producers.get(u.buildingId),unit=b&&ROSTER.buildings[b.type]?.unit;
  requireRecord(b&&unit&&Object.hasOwn(ROSTER.units,u.type)&&u.type===unit,'Spawn type/producer provenance mismatch');
  requireRecord([0,1].includes(u.side)&&u.side===b.side&&u.birthLane===b.lane&&u.tick>b.tick,'Spawn side/lane/build chronology mismatch');
  requireRecord(!run.losses.some(l=>l.id===b.id&&l.tick<u.tick),'Spawn after producer loss');births.set(u.id,{...u,producer:b});
 }
 return births;
}
function transformed(action,policy){
 const a={...action};if(a.type==='watchtower'){
  if(policy==='north-watch-control')a.lane=0;
  if(policy==='central-archery-control')a.type='archery';
 }return a;
}
/** First divergent non-watch payment/result closes the causal prefix BEFORE that
 * tick. IDs may differ; compare semantic type/x/lane/from-level paid targets.
 * Complete earlier witnesses remain eligible. Incomplete/post-censor evidence
 * does not count, and censoring never removes a seed from the denominator. */
export function cleanPrefix(donor,control,{maximumSeconds=90}={}){
 requireRecord(donor.policy==='central-watch','Expected central-watch donor');
 requireRecord(CONTROLS.has(control.policy),'Expected declared replay control');
 requireRecord(donor.seed===control.seed,'Paired seeds differ');
 requireRecord(Number.isFinite(maximumSeconds)&&maximumSeconds>0,'Invalid prefix maximum');
 requireRecord([donor.final.tick,control.final.tick].every(t=>Number.isSafeInteger(t)&&t>=0),'Invalid terminal tick');
 let tick=Math.min(Math.round(maximumSeconds/.05),donor.final.tick,control.final.tick);
 let reason=tick===Math.round(maximumSeconds/.05)?'maximum-window':'terminal',evidence=null;
 const expected=donor.commands.filter(c=>c.ok&&!c.omitted),byTick=new Map();
 requireRecord(expected.every((c,i)=>i===0||c.tick>expected[i-1].tick),'Donor commands must be strictly ordered');
 for(const c of control.commands){const rows=byTick.get(c.tick)??[];rows.push(c);byTick.set(c.tick,rows);}
 const expectedTicks=new Set(expected.map(c=>c.tick));
 const censored=(at,why,proof)=>{if(at<tick){tick=at;reason=why;evidence=proof;}};
 for(const c of control.commands)if(!expectedTicks.has(c.tick))censored(c.tick,'extra-control-command',{controlCommand:c});
 for(const t of control.ledger.transactions.filter(t=>t.side===0&&t.cost>0))if(!byTick.has(t.tick))censored(t.tick,'unmatched-control-payment',{controlTransaction:t});
 let checkedCommands=0;
 for(const d of expected){
  if(d.tick>=tick)break;
  const rows=byTick.get(d.tick)??[];if(rows.length!==1){censored(d.tick,rows.length?'duplicate-control-command':'missing-control-command',{donorCommand:d,controlCommands:rows});break;}
  const c=rows[0],watch=d.action.type==='watchtower',wanted=transformed(d.action,control.policy),proof={donorCommand:d,controlCommand:c};
  if(!same(semantic(c.action),semantic(wanted))){censored(d.tick,watch?'invalid-declared-treatment':'different-command-target',proof);break;}
  const dp=paidAt(donor,d.tick),cp=paidAt(control,c.tick);
  requireRecord(dp.length===1,'Donor successful command lacks one payment');
  requireRecord(same(target(dp[0]),semantic(d.action)),'Donor payment target disagrees with command');
  if(watch){
   if(control.policy==='omit-watch-control'){
    if(!c.omitted||!c.ok||cp.length)censored(d.tick,'invalid-declared-omission',proof);
   }else if(!c.ok||c.omitted||cp.length!==1||!same(target(cp[0]),semantic(wanted))||cp[0].cost!==(control.policy==='central-archery-control'?175:dp[0].cost))censored(d.tick,'invalid-declared-treatment-payment',{...proof,donorPayments:dp,controlPayments:cp});
   if(d.tick>=tick)break;
  }else{
   if(!c.ok||c.omitted){censored(d.tick,'control-command-rejected',proof);break;}
   if(cp.length!==1||!same(target(cp[0]),target(dp[0]))||cp[0].cost!==dp[0].cost){censored(d.tick,'different-payment-cost-or-target',{...proof,donorPayments:dp,controlPayments:cp});break;}
  }
  checkedCommands++;
 }
 return {seed:donor.seed,control:control.policy,exclusiveTick:tick,exclusiveTime:tick*.05,reason,evidence,checkedCommands,scope:'Only strictly earlier events may support causal claims; post-prefix outcomes are diagnostic.'};
}
function assets(run,prefix){
 const rows=run.initial.state.buildings.filter(b=>b.side===0&&PRODUCERS.has(b.type)).map(b=>({id:b.id,type:b.type,x:b.x,lane:b.lane,origin:'authored',tick:0,cost:b.invested}));
 for(const t of run.ledger.transactions)if(t.side===0&&t.method==='build'&&PRODUCERS.has(t.type)&&t.tick<prefix.exclusiveTick)rows.push({id:t.id,type:t.type,x:t.x,lane:t.lane,origin:'paid',tick:t.tick,cost:t.cost});
 return rows;
}
/** A material witness is a real matched producer lost in the control, retained
 * through the clean prefix by its donor, with actual subsequent ordinary output.
 * Same-tick spawns, mines, different purchase timing/cost, and post-censor events
 * never count. No new damage floor or inferred saved-unit/HP valuation. */
export function retainedProduction(donor,control,{lanes=[2],...options}={}){
 requireRecord(Array.isArray(lanes)&&lanes.length>0&&lanes.every(l=>Number.isInteger(l)&&l>=0&&l<=2),'Invalid retention lanes');
 validateOrdinarySpawns(donor);validateOrdinarySpawns(control);
 const prefix=cleanPrefix(donor,control,options),da=assets(donor,prefix),ca=assets(control,prefix),witnesses=[],retentionDifferences=[],rejected=[];
 for(const loss of control.losses.filter(l=>l.side===0&&lanes.includes(l.lane)&&PRODUCERS.has(l.type)&&l.tick<prefix.exclusiveTick)){
  const controlled=ca.find(a=>a.id===loss.id&&assetKey(a)===assetKey(loss));
  const retained=controlled&&da.find(a=>assetKey(a)===assetKey(controlled)&&a.origin===controlled.origin&&a.tick===controlled.tick&&a.cost===controlled.cost);
  if(!retained){rejected.push({loss,reason:'No identical initial or paid donor producer'});continue;}
  if(donor.losses.some(l=>l.id===retained.id&&l.tick<prefix.exclusiveTick)){rejected.push({loss,reason:'Donor does not retain producer through prefix'});continue;}
  retentionDifferences.push({loss,donorAsset:retained,controlAsset:controlled});
  const subsequentOutput=donor.spawns.filter(s=>s.side===0&&s.buildingId===retained.id&&s.tick>loss.tick&&s.tick<prefix.exclusiveTick);
  if(!subsequentOutput.length){rejected.push({loss,reason:'No strictly later retained output before censor'});continue;}
  witnesses.push({loss,donorAsset:retained,controlAsset:controlled,subsequentOutput});
 }
 return {prefix,material:witnesses.length>0,witnesses,retentionDifferences,rejected,scope:'Read-only producer retention/output evidence, not a mission or validation pass.'};
}

const position=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y);
const forward=p=>position(p)&&p.x>1250&&Math.hypot(p.x-1250,p.y-450)>240;
/** Validate passive event-time/effective joins; future records cannot borrow old
 * five-second trace positions or nominal shot damage for forward combat. */
export function validateObservedFires(run){
 const births=validateOrdinarySpawns(run),effective=new Map();
 for(const d of run.damageEvents){if(d.fireIndex===null)continue;const f=run.fires[d.fireIndex];requireRecord(f&&f.index===d.fireIndex&&f.attackerId===d.attackerId&&f.targetId===d.targetId&&f.tick===d.tick&&f.side===d.side&&f.targetSide===d.targetSide&&f.targetType===d.targetType,'Invalid fire/effective-damage join');requireRecord(Number.isFinite(d.effective)&&d.effective>0,'Invalid effective damage');effective.set(d.fireIndex,(effective.get(d.fireIndex)??0)+d.effective);}
 for(let i=0;i<run.fires.length;i++){const f=run.fires[i];requireRecord(f.index===i&&position(f.attackerPosition)&&position(f.targetPosition),'Missing event-time fire positions/index');for(const [id,type,side] of [[f.attackerId,f.attackerType,f.side],[f.targetId,f.targetType,f.targetSide]])if(Object.hasOwn(ROSTER.units,type)){const u=births.get(id);requireRecord(u&&u.type===type&&u.side===side&&u.tick<=f.tick,'Fire unit lineage/timing mismatch');}requireRecord(Number.isFinite(f.effective)&&f.effective>=0&&Math.abs((effective.get(i)??0)-f.effective)<1e-6,'Fire effective sum mismatch');if(f.attackerType==='watchtower')requireRecord(Array.isArray(f.context)&&f.context.length===2&&f.context.every(c=>Array.isArray(c.unitPositions)&&c.unitPositions.length===c.living&&c.unitPositions.every(u=>position(u)&&u.hp>0&&Object.hasOwn(ROSTER.units,u.type))&&Array.isArray(c.liveProducers)&&c.liveProducers.every(p=>p.hp>0&&ROSTER.buildings[p.type]?.unit)),'Missing living force positions');}
 return births;
}
export function advancingSupport(run){
 const births=validateObservedFires(run),early=run.ledger.transactions.filter(t=>t.side===0&&t.method==='build'&&(t.type==='archery'&&t.x===550&&t.lane===0&&t.tick===0||t.type==='sanctum'&&t.x===830&&t.lane===2&&t.tick===100));
 const eligible=new Set(early.map(t=>t.id));return run.fires.filter(f=>f.side===0&&f.targetSide===1&&f.effective>0&&eligible.has(births.get(f.attackerId)?.buildingId)&&forward(f.attackerPosition)&&forward(f.targetPosition));
}
export function sharedOpening(donor,prefix){
 validateObservedFires(donor);const watch=donor.ledger.transactions.find(t=>t.side===0&&t.type==='watchtower'),bound=Math.min(prefix.exclusiveTime,90,donor.firstEnemyProducerLossAt??Infinity,donor.firstCoreDamage[1]??Infinity),shots=donor.fires.filter(f=>f.attackerId===watch?.id&&f.time<bound-1e-7),roads=new Set();
 const contested=f=>[1,2].every(lane=>f.context[1].liveProducers.some(p=>p.lane===lane))&&f.context[1].unitPositions.some(u=>[1,2].includes(u.lane)&&!ROSTER.units[u.type].flying);
 for(const f of shots)if(f.targetGround&&f.effective>0&&contested(f))roads.add(f.targetLane);
 const competition=[];for(const f of shots){if(!contested(f))continue;const ground=f.candidates.filter(c=>c.ground);if(new Set(ground.map(c=>c.birthLane)).size<2)continue;const waiting=new Set(ground.filter(c=>c.id!==f.targetId&&c.birthLane!==f.targetLane).map(c=>c.id)),next=donor.fires.find(n=>n.attackerId===watch.id&&n.tick>f.tick),until=Math.min(bound,next?.time??f.time+.85);const harm=donor.damageEvents.filter(d=>d.side===1&&d.targetSide===0&&waiting.has(d.attackerId)&&d.tick>f.tick&&d.time<until-1e-7);if(harm.length)competition.push({fireIndex:f.index,harm});}
 return {bound,roads:[...roads],competition,qualifies:roads.has(1)&&roads.has(2)&&competition.length>0,scope:'Mechanical evidence only; independent force-context audit must reject already-settled play.'};
}
/** All five seeds remain in the denominator, even when a paired prefix censors. */
export function decideValidation(runs,plan){
 requireRecord(runs.length===plan.cases,'Incomplete v2 matrix');const keys=new Set();for(const r of runs){requireRecord(plan.seeds.includes(r.seed)&&plan.caseOrder.includes(r.policy)&&!keys.has(r.seed+'/'+r.policy),'Unexpected/duplicate v2 case');keys.add(r.seed+'/'+r.policy);validateObservedFires(r);}
 const get=(seed,policy)=>runs.find(r=>r.seed===seed&&r.policy===policy),failures=[],warnings=[],wins={},negativeFailures={},comparisons=[],joint=[],advancing=[];
 for(const p of ['central-watch','distributed-mobile']){wins[p]=runs.filter(r=>r.policy===p&&r.outcome.completed).map(r=>r.seed);if(wins[p].length<plan.minimumMainWins)failures.push(p+': insufficient wins');}
 for(const p of ['idle','watch-only']){negativeFailures[p]=runs.filter(r=>r.policy===p&&!r.outcome.completed).map(r=>r.seed);if(negativeFailures[p].length<plan.minimumTrivialityFailures)failures.push(p+': insufficient triviality failures');}
 const cheapMatched=[];
 for(const seed of plan.seeds){
  const central=get(seed,'central-watch'),mobile=get(seed,'distributed-mobile'),north=get(seed,'north-watch-control'),material=retainedProduction(central,north),shared=sharedOpening(central,material.prefix);comparisons.push({seed,material,shared});
  if(central.outcome.completed&&material.material&&shared.qualifies)joint.push(seed);
  if(mobile.outcome.completed&&advancingSupport(mobile).length)advancing.push(seed);
  const cheap=get(seed,'central-archery-control'),cheapEvidence=retainedProduction(central,cheap,{lanes:[1,2]});if(central.outcome.completed&&cheap.outcome.completed&&cheapEvidence.retentionDifferences.length===0)cheapMatched.push(seed);
  for(const r of plan.caseOrder.map(p=>get(seed,p))){if(Math.max(...r.ledger.maxError)>1e-6||r.unexpectedGoldWrites.length)failures.push(seed+'/'+r.policy+': economy');if(!r.ledger.transactions.some(t=>t.side===1&&t.cost>0))failures.push(seed+'/'+r.policy+': paid enemy absent');for(const at of [30,90])if(r.duration>at+.5&&!r.restoreChecks.some(c=>c.at===at&&c.checkedTicks===10))failures.push(seed+'/'+r.policy+': restore '+at);}
 }
 if(joint.length<plan.minimumJointWitnesses)failures.push('Insufficient same-case material/shared witnesses');if(advancing.length<plan.minimumAdvancingWins)failures.push('Insufficient forward mobile-support witnesses');
 const cheaperWins=runs.filter(r=>r.policy==='central-archery-control'&&r.outcome.completed).length;if(cheaperWins>=plan.cheaperWinWarning&&cheapMatched.length>=plan.cheaperRetentionWarning)warnings.push('CHEAPER-SUBSTITUTE: winning cheaper support matches clean-prefix producer retention; static rationale unresolved.');
 return {decision:failures.length?'CUT-v2':warnings.length?'REVIEW-cheaper-substitute':'PROVISIONAL-feasibility-pending-independent-force-audit',scope:plan.scope,failures,warnings,wins,negativeFailures,jointWitnesses:joint,advancingWitnesses:advancing,cheaperMatched:cheapMatched,comparisons};
}
