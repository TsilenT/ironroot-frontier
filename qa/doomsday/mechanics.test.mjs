import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../../dist/engine.js';
import {createLastAscent} from '../last-ascent/scenario.mjs';
import {createDoomsday,describeDoomsday,evaluateDoomsday} from './scenario.mjs';
import {createPolicy,describePolicy,POLICY_IDS} from './policies.mjs';
import {runDoomsday,PACES} from './simulate.mjs';
import {observeRun} from '../last-ascent/simulate.mjs';

test('normal control exactly reproduces the previous supply-road save',()=>{
  assert.deepEqual(createDoomsday({variant:'control-normal'}).serialize(),createLastAscent().serialize());
});
test('hard candidate changes only the declared existing difficulty',()=>{
  const control=createDoomsday({variant:'control-normal'}).serialize(),hard=createDoomsday().serialize();
  assert.equal(hard.difficulty,'hard');control.difficulty='hard';assert.deepEqual(hard,control);
  const d=describeDoomsday();assert.deepEqual(d.startingInvestment,[1225,2225]);assert.deepEqual(d.startingIncome,[7.5,12.5]);
});
for(const id of POLICY_IDS.filter(id=>describePolicy(id).plan))test(`${id}: every planned site is free and payable in an isolated authoring fixture`,()=>{
  const g=createDoomsday();g.state.gold[0]=10000;
  for(const item of describePolicy(id).plan){const r=g.build(item.type,item.x,g.map.lanes[item.lane]);assert.ok(r.ok,`${JSON.stringify(item)}: ${r.reason}`);}
  Game.restore(g.serialize());
});
test('paced recipe buys at most one paid action per decision after the start delay',()=>{
  const r=runDoomsday({policy:'distributed',seed:202,cap:70});
  const actions=r.purchases.filter(p=>p.side===0);assert.ok(actions.length>8);assert.ok(actions[0].time>=3);
  for(let i=1;i<actions.length;i++)assert.ok(actions[i].time-actions[i-1].time>=2-1e-6);
  assert.deepEqual(r.ledgerMaxError,[0,0]);assert.equal(r.policyPlan.maxActions,1);
});
test('observer records outcomes without changing the engine or policy',()=>{
  const clean=createDoomsday({seed:202}),observed=createDoomsday({seed:202});
  const a=createPolicy('race'),b=createPolicy('race'),o=observeRun(observed);
  for(let i=0;i<1600;i++){a.step(clean);b.step(observed);o.beforeStep();clean.update(.05);observed.update(.05);o.afterStep();}
  assert.deepEqual(observed.serialize(),clean.serialize());assert.deepEqual(o.finish(80).ledgerMaxError,[0,0]);
});
test('engine plus policy checkpoint replays identically through an actual ending',()=>{
  let g=createDoomsday({seed:202}),pilot=createPolicy('race'),restored=null,restoredPilot=null;
  for(let tick=0;tick<14400&&evaluateDoomsday(g)==='running';tick++){
    if(tick===600){restored=Game.restore(g.serialize());restoredPilot=createPolicy('race',{state:pilot.serialize()});}
    pilot.step(g);g.update(.05);if(restored){restoredPilot.step(restored);restored.update(.05);}
  }
  assert.notEqual(evaluateDoomsday(g),'running');assert.deepEqual(restored.serialize(),g.serialize());assert.deepEqual(restoredPilot.serialize(),pilot.serialize());
});
test('one HP wins and finite observation caps are censored, not mission defeats',()=>{
  const g=createDoomsday();g.state.bases[0].hp=1;g.state.bases[1].hp=0;assert.equal(evaluateDoomsday(g),'won');
  g.state.bases[0].hp=0;assert.equal(evaluateDoomsday(g),'draw');
  const r=runDoomsday({policy:'idle',cap:1});assert.equal(r.outcome,'stall');assert.equal(r.censored,true);
});
test('invalid identities, seeds and timing fail explicitly',()=>{
  for(const variant of ['__proto__','hard',''])assert.throws(()=>createDoomsday({variant}),RangeError);
  for(const seed of [-1,2**32,NaN,1.5])assert.throws(()=>createDoomsday({seed}),RangeError);
  assert.throws(()=>createPolicy('missing'),RangeError);assert.throws(()=>createPolicy('race',{decisionSeconds:0}),RangeError);
  assert.throws(()=>runDoomsday({pace:'missing'}),RangeError);assert.throws(()=>runDoomsday({cap:Infinity}),RangeError);
  assert.equal(PACES.delayed.maxActions,1);
});
