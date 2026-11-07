import test from 'node:test';
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {Game} from '../../dist/engine.js';
import {CitadelGame} from './prototype.mjs';
const options={reinforcement:true,ai:false,rulesetId:'frontier-air-local-open'};
const blank=(timed=false)=>{const g=new CitadelGame({...options,rulesetId:timed?'frontier-air-local-timed':options.rulesetId});g.state.buildings=[];return g;}; // Synthetic contract fixture only.
const at90=()=>{const g=blank();for(let i=0;i<1800;i++)g.update(.05);return g;};
test('paid single-use exact deficit-preserving HP extension, both sides and repeat input',()=>{
  const g=at90();g._damage(g.state.bases[0],2000,1);const before=g.serialize();
  assert.deepEqual(g.reinforce(0),{ok:true,cost:190,hpAdded:600});
  assert.equal(g.state.gold[0],before.state.gold[0]-190);assert.equal(g.state.bases[0].hp,4600);assert.equal(g.state.bases[0].maxHp,6600);
  const after=g.snapshot();assert.equal(g.reinforce(0).code,'already-used');assert.deepEqual(g.snapshot(),after);
  assert.ok(g.reinforce(1).ok);assert.equal(g.state.bases[1].hp,6600);
  const normalized=g.serialize();normalized.state.gold=before.state.gold;normalized.state.bases=before.state.bases;assert.deepEqual(normalized,before);
});
test('time, insufficient-gold, dead/ended, invalid side, disabled rejection changes nothing',()=>{
  const g=at90();g.tick=1799;g.state.time=89.95;
  const reject=(code,side=0)=>{const before=g.snapshot();assert.equal(g.reinforce(side).code,code);assert.deepEqual(g.snapshot(),before);};
  reject('too-early');g.tick=1800;g.state.time=90;g.state.gold[0]=189.999;reject('insufficient-gold');g.state.gold[0]=190;
  for(const side of [-1,2,'0',null,NaN])reject('invalid-side',side);
  g.state.bases[0].hp=0;reject('ended-or-dead');g.state.bases[0].hp=6000;g.state.winner=1;reject('ended-or-dead');g.state.winner=null;
  assert.ok(g.reinforce().ok);assert.equal(g.state.gold[0],0);
  const disabled=new CitadelGame({...options,reinforcement:false});assert.equal(disabled.reinforce().code,'disabled');
});
test('production identity protections and invalid opt-in type',()=>{
  for(const rulesetId of ['frontier-campaign-air-local','frontier-authored-air-local','frontier-campaign-watch','frontier-legacy'])assert.throws(()=>new CitadelGame({...options,rulesetId}));
  assert.throws(()=>new CitadelGame({...options,mapId:'intro-one-road'}));assert.throws(()=>new CitadelGame({...options,reinforcement:'true'}));
});
test('strict envelope and production admission separation, purchased restore deterministic',()=>{
  const g=at90();g.reinforce(0);const saved=g.snapshot();
  assert.throws(()=>Game.restore(saved));assert.throws(()=>Game.restore(g.serialize()));
  const restored=CitadelGame.restoreSnapshot(saved);assert.deepEqual(restored.snapshot(),saved);
  for(let i=0;i<100;i++){g.update(.05);restored.update(.05);}assert.deepEqual(restored.snapshot(),g.snapshot());
  const mutate=[s=>s.extra=true,s=>delete s.purchases,s=>s.enabled=false,s=>s.purchases.push(null),s=>s.purchases[0].extra=1,s=>delete s.purchases[0].goldBefore,s=>s.purchases[0].goldBefore=189,s=>s.purchases[0].time=89,s=>s.purchases[0].tick=1800.5,s=>s.purchases[0].hpBefore=0,s=>s.purchases[0].hpBefore=6001,s=>s.engine.state.bases[0].maxHp=7200,s=>s.engine.state.bases[0].hp=6601,s=>s.engine.state.bases[0].hp=NaN,s=>s.engine.state.bases[1].maxHp=6600,s=>s.engine.state.gold[0]=-1,s=>s.engine.state.extra=true,s=>s.engine.rulesetId='frontier-campaign-air-local'];
  for(const f of mutate){const s=structuredClone(saved);f(s);assert.throws(()=>CitadelGame.restoreSnapshot(s));}
});
test('disabled mode matches released engine byte-for-byte over paid native decisions',()=>{
  for(const rulesetId of ['frontier-air-local-open','frontier-bridge-open']){
    const opts={ai:false,rulesetId,seed:91,mapId:'twin-span'},a=new Game(opts),b=new CitadelGame({...opts,reinforcement:false});
    for(let i=0;i<4000&&a.state.winner===null;i++){if(i%100===0)for(const side of [0,1]){a._ai(side);b._ai(side);}a.update(.05);b.update(.05);assert.deepEqual(b.serialize(),a.serialize());}
  }
});
test('controlled open/timed stalemate, ordinary siege and seven-day safety cap',()=>{
  const records=[];
  for(const timed of [false,true]){
    const g=blank(timed);for(let i=0;i<1800;i++)g.update(.05);assert.ok(g.reinforce(0).ok);
    const hp=g.state.bases[0].hp;g._damage(g.state.bases[0],100,1);assert.equal(g.state.bases[0].hp,hp-100);
    // 500 incremental HP remain. This controlled fixture has no army production.
    let firstDecay=null;
    while(g.tick<36000&&g.state.winner===null){const before=g.state.bases[0].hp;g.update(.05);if(g.state.bases[0].hp<before)firstDecay??=g.state.time;}
    records.push({timed,time:g.state.time,winner:g.state.winner,hp:g.state.bases.map(b=>b.hp),firstDecay});
    if(timed){assert.equal(g.state.winner,0);assert.ok(firstDecay>420);assert.ok(g.state.bases[0].hp>0);}else{assert.equal(g.state.winner,null);assert.equal(g.state.bases[0].hp,6500);assert.equal(g.tick,36000);}
    assert.deepEqual(CitadelGame.restoreSnapshot(g.snapshot()).snapshot(),g.snapshot());
  }
  const cap=at90();cap.tick=cap.ruleset.limits.maxTick;cap.state.time=604800;const before=cap.snapshot();assert.equal(cap.reinforce().code,'save-safety-limit');assert.equal(cap.update(.05).code,'save-safety-limit');assert.deepEqual(cap.snapshot(),before);
  writeFileSync('qa/citadel-reinforcement/controlled.json',JSON.stringify({scope:'synthetic contract fixtures, not balance games',records},null,2)+'\n');
});
