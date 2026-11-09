import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../dist/engine.js';
import {decodeBattle} from '../dist/battle-codec.js';
import {CAMPAIGN_PROGRESS_MISSIONS} from '../dist/campaign.js';
import {createReserve,MinorReserveGame,DESIGN,evaluateReserve,reserveStatus} from '../qa/minor-reserve/scenario.mjs';
import {instrumentEconomy} from '../qa/salt-stores/economy.mjs';
const step=(g,ticks=1)=>{for(let i=0;i<ticks;i++)g.update(.05);};
const post=g=>g.state.buildings.find(b=>b.id===g.reserve.postId);
const killPost=g=>g._damage(post(g),post(g).hp,0);
const isolate=g=>{g.aiTimer=30;g._ai=()=>{};g.state.buildings=[post(g)];g.state.units=[];g.state.effects=[];g.state.projectiles=[];};
const untilDue=g=>step(g,g.reserve.triggerTick+DESIGN.warningTicks-g.tick);
function mirror(g,ticks){const restored=MinorReserveGame.restore(g.serialize());for(let i=0;i<ticks;i++){step(g);step(restored);assert.deepEqual(restored.serialize(),g.serialize());}return restored;}
function ordinaryUnit(g,type,side,x,lane){const producer={warrior:'barracks',archer:'archery',siege:'foundry'}[type];const id=g.nextId;g._spawn({type:producer,side,x:x+(side?48:-48),lane,level:1});return g.state.units.find(u=>u.id===id);}

test('reserve QA imports an unchanged ordinary roster; modest opening is authored, not a balance claim',()=>{
 const g=createReserve();assert.equal(g.ai,true);assert.equal(g.difficulty,'normal');assert.deepEqual(g.state.gold,[900,100]);assert.deepEqual(g.state.bases.map(b=>b.hp),[6000,6000]);assert.deepEqual(g.state.income,[7.5,7.5]);
 assert.equal(g.state.buildings.length,11);assert.equal(post(g).type,'watchtower');assert.equal(post(g).maxHp,g.buildings.watchtower.hp);assert.equal(reserveStatus(g).phase,'armed');
 assert.equal(CAMPAIGN_PROGRESS_MISSIONS.some(m=>m.id===DESIGN.id),false);
});
test('invalid seed and mode rejected',()=>{for(const seed of [-1,NaN,2**32,.5])assert.throws(()=>createReserve({seed}));assert.throws(()=>createReserve({reserveEnabled:1}));});
test('ordinary post damage alone does not call reserve',()=>{const g=createReserve();isolate(g);g._damage(post(g),999,0);step(g,5);assert.equal(g.reserve.triggerTick,null);assert.equal(g.reserve.releases.length,0);});
test('destruction gives exactly120 warning ticks, then six ordinary level-one units',()=>{
 const g=createReserve();isolate(g);killPost(g);step(g);assert.equal(g.reserve.triggerTick,1);assert.equal(reserveStatus(g).warningSeconds,6);step(g,119);assert.equal(g.reserve.releases.length,0);step(g);
 assert.deepEqual(g.reserve.releases.map(r=>r.tick),Array(6).fill(121));assert.equal(reserveStatus(g).phase,'complete');
 assert.deepEqual(g.state.units.map(u=>u.type),DESIGN.reserve);assert.ok(g.state.units.every(u=>u.side===1&&u.level===1&&u.maxHp===g.units[u.type].hp&&u.hp===u.maxHp&&u.x===3050&&u.lane===0));
 const ids=g.reserve.releases.map(r=>r.unitId);step(g,100);assert.deepEqual(g.reserve.releases.map(r=>r.unitId),ids);
});
test('replacement at command-post site is ordinary and does not rearm the original',()=>{
 const g=createReserve();isolate(g);killPost(g);step(g);g.state.gold[1]=220;assert.equal(g.build('watchtower',2230,260,1).ok,true);const replacement=g.state.buildings[0];untilDue(g);assert.equal(g.reserve.releases.length,6);g._damage(replacement,replacement.hp,0);step(g,150);assert.equal(g.reserve.releases.length,6);assert.equal(g.reserve.triggerTick,1);
});
test('cap uses a finite queue, defers without RNG/ID use, drains available slots in order',()=>{
 const g=createReserve();isolate(g);for(let i=0;i<70;i++)ordinaryUnit(g,'warrior',1,3010,2);killPost(g);step(g);step(g,119);const id=g.nextId,seed=g.seed;step(g);assert.equal(g.reserve.releases.length,0);assert.equal(g.nextId,id);assert.equal(g.seed,seed);assert.equal(reserveStatus(g).phase,'arriving');
 g.state.units[0].hp=0;step(g);assert.equal(g.reserve.releases.length,1);assert.equal(g.state.units.length,70);g.state.units.filter(u=>!g.reserve.releases.some(r=>r.unitId===u.id)).slice(0,5).forEach(u=>u.hp=0);step(g);assert.equal(g.reserve.releases.length,6);assert.equal(g.state.units.length,70);assert.deepEqual(g.reserve.releases.map(r=>g.state.units.find(u=>u.id===r.unitId).type),DESIGN.reserve);
});
test('ordinary troops really march, target and attack; no all-road boss reach',()=>{
 const g=createReserve();isolate(g);killPost(g);step(g);untilDue(g);const units=g.state.units.slice(),start=units.map(u=>u.x),victim=ordinaryUnit(g,'warrior',0,2750,0);const south=ordinaryUnit(g,'warrior',0,3000,2);const fired=[];const fire=g._fire;
 g._fire=function(a,t,...args){if(g.reserve.releases.some(r=>r.unitId===a.id))fired.push({source:a.id,target:t.id});return fire.call(this,a,t,...args);};step(g,90);
 assert.ok(units.some((u,i)=>u.x<start[i]));assert.ok(fired.some(f=>f.target===victim.id));assert.ok(victim.hp<victim.maxHp);assert.equal(fired.some(f=>f.target===south.id),false);
});
test('initial and active warning restore are exactly deterministic',()=>{
 const g=createReserve();assert.deepEqual(MinorReserveGame.restore(g.serialize()).serialize(),g.serialize());killPost(g);step(g);mirror(g,130);assert.equal(g.reserve.releases.length,6);
});
test('active partial-cap and complete continuation preserve exact event state',()=>{
 const g=createReserve();isolate(g);for(let i=0;i<69;i++)ordinaryUnit(g,'warrior',1,3010,2);killPost(g);step(g);untilDue(g);assert.equal(g.reserve.releases.length,1);
 // Re-enable standard AI before restore parity; tests do not serialize monkey patches.
 delete g._ai;mirror(g,5);g.state.units.slice(0,5).forEach(u=>u.hp=0);step(g);assert.equal(g.reserve.releases.length,6);mirror(g,10);
});
test('same-tick citadel death/draw suppresses trigger and all later arrivals',()=>{
 for(const dead of [[0],[1],[0,1]]){
  const g=createReserve();isolate(g);killPost(g);for(const side of dead)g.state.bases[side].hp=0;step(g);assert.equal(g.reserve.triggerTick,null);assert.equal(g.reserve.releases.length,0);assert.equal(g.tick,0);assert.equal(evaluateReserve(g).completed,dead.length===1&&dead[0]===1);assert.deepEqual(MinorReserveGame.restore(g.serialize()).serialize(),g.serialize());
 }
});
test('real simultaneous post and core lethal damage resolves core before event',()=>{
 const g=createReserve();isolate(g);const p=post(g);p.hp=1;g.state.bases[1].hp=1;ordinaryUnit(g,'siege',0,p.x-80,0).cooldown=0;ordinaryUnit(g,'siege',0,2990,1).cooldown=0;step(g);assert.equal(g.state.winner,0);assert.equal(post(g),undefined);assert.equal(g.reserve.triggerTick,null);assert.equal(g.reserve.releases.length,0);assert.equal(evaluateReserve(g).completed,true);assert.deepEqual(MinorReserveGame.restore(g.serialize()).serialize(),g.serialize());
});
test('core death on an arrival tick ends battle without spawning',()=>{
 const g=createReserve();isolate(g);killPost(g);step(g);step(g,119);g.state.bases[1].hp=1;ordinaryUnit(g,'siege',0,2990,1).cooldown=0;step(g);assert.equal(g.state.winner,0);assert.equal(g.reserve.releases.length,0);mirror(g,5);
});
test('10:00 stops trigger/arrival and player loss takes priority over enemy loss',()=>{
 const g=createReserve();isolate(g);g.tick=11999;g.state.time=g.tick*.05;killPost(g);step(g);assert.equal(g.tick,12000);assert.equal(g.reserve.triggerTick,null);assert.equal(evaluateReserve(g).reason,'deadline');step(g,10);assert.equal(g.tick,12000);assert.deepEqual(MinorReserveGame.restore(g.serialize()).serialize(),g.serialize());
 const both=createReserve();both.state.bases.forEach(b=>b.hp=0);assert.equal(evaluateReserve(both).reason,'player-core');
});
test('baseline control still permits original post destruction without any reserve',()=>{const g=createReserve({reserveEnabled:false});isolate(g);killPost(g);step(g,125);assert.equal(g.reserve.releases.length,0);assert.equal(reserveStatus(g).phase,'disabled');assert.deepEqual(MinorReserveGame.restore(g.serialize()).serialize(),g.serialize());});
test('reserve never writes treasury, adds a factory, or removes normal paid development',()=>{
 const g=createReserve(),ledger=instrumentEconomy(g);killPost(g);step(g,480);assert.equal(g.reserve.releases.length,6);ledger.reconcile();assert.ok(ledger.ledger.transactions.some(t=>t.side===1&&t.cost>0));assert.ok(ledger.ledger.spending[1]>0);assert.ok(g.state.units.some(u=>!g.reserve.releases.some(r=>r.unitId===u.id)));assert.ok(ledger.ledger.maxError.every(n=>n<1e-6));
});
test('strict QA envelope fails closed on malformed event and wrong identity',()=>{
 const mutations=[s=>s.extra=1,s=>s.scenario.revision=2,s=>s.reserve.postId++,s=>s.reserve.extra=1,s=>s.reserve.triggerTick=0,s=>s.reserve.releases.push({unitId:1,tick:120}),s=>s.engine.rulesetId='frontier-citadel-open',s=>s.engine.state.time=.001];
 for(const mutate of mutations){const s=createReserve().serialize();mutate(s);assert.throws(()=>MinorReserveGame.restore(s));}
 const g=createReserve();killPost(g);step(g,121);for(const mutate of [s=>s.reserve.releases[0].tick=1,s=>s.reserve.releases[1].unitId=s.reserve.releases[0].unitId,s=>s.reserve.releases.pop(),s=>s.reserve.enabled=false,s=>s.reserve.releases[0].extra=true,s=>delete s.reserve.releases[0],s=>s.reserve.releases.extra=1]){const s=g.serialize();mutate(s);assert.throws(()=>MinorReserveGame.restore(s));}
});
test('normal battle codec rejects QA envelope; raw engine has no new state field',()=>{
 const g=createReserve();assert.throws(()=>decodeBattle(g.serialize()));const raw=Game.prototype.serialize.call(g);assert.equal(Object.hasOwn(raw.state,'reserve'),false);assert.deepEqual(Game.restore(raw).serialize(),raw);
});
