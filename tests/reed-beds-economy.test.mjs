import test from 'node:test';
import assert from 'node:assert/strict';
import {exactScenario} from '../qa/reed-beds/scenario.mjs';
import {instrumentEconomy,actualIncome,verifyPlayerCadence} from '../qa/reed-beds/economy.mjs';
import {createPolicy,describePolicy,POLICY_IDS,POLICY_DEFINITIONS} from '../qa/reed-beds/paid-policies.mjs';
import {runReedBeds} from '../qa/reed-beds/simulate.mjs';
import {auditRun} from '../qa/reed-beds/verify-evidence.mjs';
import {paidCheckpoints} from '../qa/reed-beds/checkpoints.mjs';
test('Reed authored setup has exact identity, original targets, ordinary mines and cached tick-zero income',()=>{
 const {game,formation}=exactScenario();assert.equal(formation.escalation,300);assert.deepEqual(formation.targets.map(t=>t.originalId),[7,9,11]);assert.deepEqual([0,1].map(side=>actualIncome(game,side)),[7.5,7.5]);assert.deepEqual(instrumentEconomy(game).ledger.startingCachedIncome,[7.5,7.5]);
});
test('Reed policies are explicit, frozen and detached from caller changes',()=>{
 assert.deepEqual(POLICY_IDS,['outer-pair','north-middle','middle-south','screened-siege','supported-rootwarden','core-rush','air-core','broad-novice','idle']);assert.ok(Object.isFrozen(POLICY_DEFINITIONS['outer-pair'].plan));
 const description=describePolicy('outer-pair');description.plan[0].type='mint';assert.equal(describePolicy('outer-pair').plan[0].type,'barracks');assert.throws(()=>createPolicy('unknown'));
});
test('Reed successful receipts detach action-time entities from later upgrades and caller mutation',()=>{
 const {game:g}=exactScenario(),e=instrumentEconomy(g),r=g.build('barracks',1250,g.map.lanes[0],0);assert.ok(r.ok);const saved=structuredClone(e.ledger.transactions[0]);assert.equal(saved.result.building.level,1);
 assert.ok(g.upgrade(r.building.id,0).ok);assert.equal(r.building.level,2);assert.deepEqual(e.ledger.transactions[0],saved);const copy=e.snapshot();copy.transactions[0].result.building.level=99;copy.spending[0]=-100;assert.deepEqual(e.ledger.transactions[0],saved);e.reconcile();
});
test('Reed ordinary build upgrade volley and citadel receipts share the five-second player cadence',()=>{
 const {game:g}=exactScenario(),e=instrumentEconomy(g),wait=()=>{for(let i=0;i<100;i++)g.update(.05);e.reconcile();};
 const r=g.build('barracks',1250,g.map.lanes[0],0);assert.ok(r.ok);wait();assert.ok(g.upgrade(r.building.id,0).ok);wait();assert.ok(g.cast(1600,g.map.lanes[0],0).ok);wait();assert.ok(g.buyCitadelOption('arrows',0).ok);e.reconcile();
 const paid=e.snapshot().transactions.filter(t=>t.side===0);assert.deepEqual(paid.map(t=>t.method),['build','upgrade','cast','buyCitadelOption']);assert.deepEqual(paid.map(t=>t.cost),[140,98,75,190]);assert.equal(verifyPlayerCadence(paid),4);
 for(let i=1;i<paid.length;i++){const invalid=structuredClone(paid);invalid[i].time=invalid[i-1].time+4.99;assert.throws(()=>verifyPlayerCadence(invalid),/five seconds/);}
 assert.ok(e.ledger.maxError.every(n=>n<1e-6));
});
test('Reed mine income is accrued from actual paid mines on engine ticks, not a stale cached rate',()=>{
 const {game:g}=exactScenario(),e=instrumentEconomy(g),r=g.build('mint',270,g.map.lanes[0],0);assert.ok(r.ok);assert.equal(g.state.income[0],7.5);assert.equal(actualIncome(g,0),10);g.update(.05);assert.equal(g.state.income[0],10);assert.equal(e.ledger.grossIncome[0],.5);e.reconcile();
});
test('Reed authored paid outer-pair victory and single-target core bypass independently audit',()=>{
 for(const policy of ['outer-pair','core-rush']){const run=runReedBeds({policy});assert.equal(run.outcome,'won');assert.ok(auditRun(run).independentIncomeVerified);assert.ok(run.enemyPurchases>0);if(policy==='outer-pair')assert.deepEqual(run.targetLosses.map(t=>t.type),['sanctum','watchtower']);else{assert.equal(run.route,'enemy-citadel');assert.equal(run.targetLosses.length,1);}}
});
test('Reed paid checkpoint summaries stop while active near the second original target, not just near the core',()=>{
 const result=paidCheckpoints(),near=result.checkpoints['terminal-near'];assert.equal(near.originalTargets.filter(t=>!t.alive).length,1);assert.ok(near.originalTargets.some(t=>t.alive&&t.hp<=150));assert.ok(near.cores[1]>0);assert.ok(near.paidActions>0);assert.ok(near.maxLedgerError.every(n=>n<1e-6));
});
