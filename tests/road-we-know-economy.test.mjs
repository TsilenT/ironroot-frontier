import test from 'node:test';
import assert from 'node:assert/strict';
import {createCampaignMission} from '../dist/campaign.js';
import {instrumentEconomy,verifyPlayerCadence} from '../qa/road-we-know/economy.mjs';
const fresh=()=>createCampaignMission('the-road-we-know');
test('action-time receipts and exported snapshots are detached from live upgrades and caller mutation',()=>{
 const g=fresh(),e=instrumentEconomy(g),r=g.build('barracks',1250,g.map.lanes[0],0);assert.ok(r.ok);
 const saved=structuredClone(e.ledger.transactions[0]);assert.equal(saved.result.building.level,1);
 assert.ok(g.upgrade(r.building.id,0).ok);assert.equal(r.building.level,2);assert.deepEqual(e.ledger.transactions[0],saved);
 const view=e.snapshot();view.transactions[0].result.building.level=99;view.spending[0]=-1;assert.deepEqual(e.ledger.transactions[0],saved);assert.ok(e.ledger.spending[0]>0);e.reconcile();
});
test('real paid build upgrade volley and citadel receipts share a five-second cadence and reconcile',()=>{
 const g=fresh(),e=instrumentEconomy(g);
 const wait=()=>{for(let i=0;i<100;i++){e.accrue(.05);g.update(.05);e.reconcile();}};
 const r=g.build('barracks',1250,g.map.lanes[0],0);assert.ok(r.ok);wait();assert.ok(g.upgrade(r.building.id,0).ok);wait();assert.ok(g.cast(1600,g.map.lanes[0],0).ok);wait();assert.ok(g.buyCitadelOption('arrows',0).ok);e.reconcile();
 const paid=e.snapshot().transactions.filter(t=>t.side===0);assert.deepEqual(paid.map(t=>t.method),['build','upgrade','cast','buyCitadelOption']);assert.deepEqual(paid.map(t=>t.cost),[140,98,75,190]);assert.equal(verifyPlayerCadence(paid),4);
 for(let i=1;i<paid.length;i++){const invalid=structuredClone(paid);invalid[i].time=invalid[i-1].time+4.99;assert.throws(()=>verifyPlayerCadence(invalid),/five seconds/);}
 assert.ok(e.ledger.maxError.every(n=>n<1e-6));
});
