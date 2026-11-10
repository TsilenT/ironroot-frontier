/** Structural/synthetic only: no candidate progression or seed screening. */
import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../dist/engine.js';
import * as old from '../qa/two-messages/scenario.mjs';
import * as next from '../qa/two-messages-epoch2/scenario.mjs';
import {OPENING_CHART,chooseCounter,createPolicy,PROBE,DECISION_TICK,validatePolicyState} from '../qa/two-messages-epoch2/policies.mjs';
import {freeze,verifyApproval,summarizeInformation,decisionAblation} from '../qa/two-messages-epoch2/run.mjs';
import {freeze as oldFreeze,verifyApproval as oldApproval} from '../qa/two-messages/run.mjs';
Game.prototype._step=function(){throw Error('Natural epoch2 tick forbidden');};
const contact=(id,type,x,lane)=>({id,type,x,lane,side:1,y:[260,450,640][lane],level:1,observedAt:60});
const originals=OPENING_CHART.map((b,i)=>contact(i+1,b.type,b.x,b.lane));
test('public chart exactly covers symmetric original outer forces, not invented memories',()=>{
 const g=next.createPrototype();assert.deepEqual(next.DESIGN.enemyBuildings.filter(b=>[0,2].includes(b[2])).map(([type,x,lane])=>({lane,x,type})),OPENING_CHART);
 assert.deepEqual(g.state.fog.sides.map(s=>s.structures),[[],[]]);
 assert.equal(next.DESIGN.startingGold,old.DESIGN.startingGold);assert.equal(next.DESIGN.enemyGold,old.DESIGN.enemyGold);assert.equal(next.DESIGN.startingHealth,6000);
 assert.deepEqual(PROBE.map(p=>p.tick),[0,100,200,300,1200,1300]);assert.equal(DECISION_TICK,2400);assert.equal(next.DESIGN.decisionTime,120);
 assert.deepEqual(next.DESIGN.seeds,[9501,9502]);assert.equal(PROBE.reduce((n,p)=>n+g.buildings[p.type].cost,0),1170);
});
test('original force survival and destruction cannot change the information choice',()=>{
 const fallback=chooseCounter([]),later=contact(100,'aerie',2230,2),decision=chooseCounter([later]);
 for(let mask=0;mask<64;mask++){
  const subset=originals.filter((_,i)=>mask&(1<<i));
  assert.deepEqual(chooseCounter(subset),fallback);
  assert.deepEqual(chooseCounter([...subset,later]),decision);
 }
 // Even later replacements/upgrades at charted plots are conservatively ignored.
 assert.deepEqual(chooseCounter(originals.map(b=>({...b,id:b.id+200,type:'aerie',level:3}))),fallback);
 assert.deepEqual(decision,{type:'archery',lane:2,x:550});
});
// These events and receipts are synthetic audit records; no Game is advanced.
function eligibleInformation(contacts,paid){
 return summarizeInformation([
  {tick:200,time:10,lane:0,transition:'first-contact',buildings:originals.filter(b=>b.lane===0)},
  {tick:200,time:10,lane:2,transition:'first-contact',buildings:originals.filter(b=>b.lane===2)},
  ...[0,2].map(lane=>({tick:600,time:30,lane,transition:'visible-set-change',buildings:contacts.filter(b=>b.lane===lane)}))
 ],paid);
}
const receipt=(b,time)=>({side:1,method:'build',id:b.id,lane:b.lane,time,cost:360});
test('pre-first hidden aerie cannot borrow causality from an eligible later barracks',()=>{
 const early=contact(100,'aerie',2230,2),later=contact(101,'barracks',2230,0),contacts=[early,later];
 const information=eligibleInformation(contacts,[receipt(early,5),receipt(later,20)]);
 assert.deepEqual(information.laterPaidBuildingsReobserved.map(b=>b.id),[101]);
 const result=decisionAblation({contacts},information);
 assert.deepEqual(result.eligibleObservationIds,[101]);assert.deepEqual(result.removedContactIds,[101]);
 assert.deepEqual(result.eligibleNotInDecisionIds,[]);assert.equal(result.changed,false);
 assert.deepEqual(result.actual,result.withoutEligibleContacts);
 // Removing all paid contacts would change the choice, but is NOT this gate.
 assert.notDeepEqual(result.actual,chooseCounter([]));
});
test('genuine qualifying later-paid aerie changes the causal choice when removed',()=>{
 const later=contact(100,'aerie',2230,2),information=eligibleInformation([later],[receipt(later,20)]);
 const result=decisionAblation({contacts:[...originals,later]},information);
 assert.equal(result.basis,'eligible-post-snapshot-reobserved-decision-contacts');
 assert.deepEqual(result.removedContactIds,[100]);assert.deepEqual(result.eligibleNotInDecisionIds,[]);
 assert.deepEqual(result.actual,{type:'archery',lane:2,x:550});
 assert.deepEqual(result.withoutEligibleContacts,chooseCounter([]));assert.equal(result.changed,true);
});
test('eligible later-paid contact can leave the choice unchanged',()=>{
 const later=contact(100,'barracks',2230,0),information=eligibleInformation([later],[receipt(later,20)]);
 const result=decisionAblation({contacts:[later]},information);
 assert.deepEqual(result.removedContactIds,[100]);assert.equal(result.changed,false);
});
test('eligible observation absent from the actual decision input is not removed or causal',()=>{
 const later=contact(100,'aerie',2230,2),information=eligibleInformation([later],[receipt(later,20)]);
 const result=decisionAblation({contacts:originals},information);
 assert.deepEqual(result.eligibleObservationIds,[100]);assert.deepEqual(result.removedContactIds,[]);
 assert.deepEqual(result.eligibleNotInDecisionIds,[100]);assert.equal(result.changed,false);
});
test('post-snapshot eligibility still excludes pre-first purchases and post-decision sightings',()=>{
 const later=contact(100,'aerie',2230,2),paid=[receipt(later,50)];
 const events=[{tick:200,time:10,lane:2,transition:'first-contact',buildings:originals.filter(b=>b.lane===2)},
 {tick:1200,time:60,lane:2,transition:'visible-set-change',buildings:[...originals.filter(b=>b.lane===2),later]}];
 assert.equal(summarizeInformation(events,paid).laterPaidBuildingsReobserved.length,1);
 assert.equal(summarizeInformation(events,[{...paid[0],time:5}]).laterPaidBuildingsReobserved.length,0);
 assert.equal(summarizeInformation([events[0],{...events[1],tick:2420,time:121}],paid).laterPaidBuildingsReobserved.length,0);
 assert.equal(summarizeInformation(events,[{...paid[0],time:121}]).laterPaidBuildingsReobserved.length,0);
});
test('epoch identities, policy, freeze and approvals reject both directions across epochs',()=>{
 const a=old.savePrototype(old.createPrototype()),b=next.savePrototype(next.createPrototype());
 assert.throws(()=>next.restorePrototype(a));assert.throws(()=>old.restorePrototype(b));
 assert.throws(()=>validatePolicyState({...createPolicy('fresh-contact').snapshot(),epoch:1}));
 const one=oldFreeze(),two=freeze();assert.notEqual(one.sha256,two.sha256);assert.notEqual(one.format,two.format);
 const approval={format:'two-messages-approval-v1',status:'parent-authorized-after-independent-preflight',independentReviewer:'synthetic only',parentAuthorization:'synthetic only',freezeSha256:two.sha256,outputPath:'/tmp/never-open-e2'};
 assert.throws(()=>verifyApproval(approval,approval.outputPath));assert.throws(()=>oldApproval({...approval,format:'two-messages-approval-v2',freezeSha256:one.sha256},approval.outputPath));
 assert.equal(two.closure.plan.status,'closed-awaiting-independent-preflight-and-scoped-authorization');
 assert.ok(two.closure.files['qa/two-messages/run.mjs']);assert.ok(two.closure.files['tests/two-messages-epoch2-causal.test.mjs']);
});
