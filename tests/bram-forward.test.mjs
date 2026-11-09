import test from'node:test';import{readFileSync}from'node:fs';import assert from'node:assert/strict';
import{Game,MAPS,CAMPAIGN_MAPS,buildSites}from'../dist/engine.js';
import{BRAM_GATES,BRAM_MAP_ID,BRAM_RULESET_ID}from'../dist/bram-forward.js';
import{create,continueTo}from'../qa/bram-forward/simulate.mjs';
import{policyAction,padSafety}from'../qa/bram-forward/policies.mjs';
import{instrument}from'../qa/bram-forward/audit.mjs';
const clone=v=>structuredClone(v);
function breach(g,lane=0){g._damage(g.state.buildings.find(b=>b.id===BRAM_GATES[lane].id),10000,0);g.update(.05);}
test('Bram is exact paired QA-only identity, absent public and campaign map catalogs',()=>{
 const g=create();assert.equal(g.ruleset.qaOnly,true);assert.equal(g.map.qaOnly,true);assert.equal(MAPS[BRAM_MAP_ID],undefined);assert.equal(CAMPAIGN_MAPS[BRAM_MAP_ID],undefined);assert.throws(()=>new Game({rulesetId:BRAM_RULESET_ID}));assert.throws(()=>new Game({mapId:BRAM_MAP_ID}));assert.deepEqual(Game.restore(g.serialize()).serialize(),g.serialize());
 assert.equal(g.state.buildings.length,16);assert.deepEqual(g.state.gold,[1100,100]);assert.deepEqual(g.state.income,[7.5,7.5]);assert.equal(g.map.buildLimit,16);
});
test('Both marked pads visible while closed; construction access is exact and road-specific',()=>{
 const g=create(7301,false);assert.equal(buildSites(g.map,0).filter(s=>s.x>1320).length,4);
 for(const y of[340,560])for(const x of[2370,2510])assert.equal(g.canBuild('foundry',x,y).ok,false);
 assert.equal(g.canBuild('barracks',2371,340).ok,false);assert.equal(g.canBuild('barracks',2510,341).ok,false);
 breach(g);assert.deepEqual(g.state.bramBreach.gates.map(b=>b.openedTick),[1,null]);
 assert.equal(g.canBuild('foundry',2510,340).ok,true);assert.equal(g.canBuild('foundry',2510,560).ok,false);assert.equal(g.canBuild('foundry',2510,340,1).ok,false);
});
test('Damage-resolution opening grants no money/free entity; normal paid construction and refund survive restore',()=>{
 const g=create(7301,false),before=g.state.gold[0],built=g.state.stats.built[0];breach(g);assert.equal(g.state.gold[0],before+.375);assert.equal(g.state.stats.built[0],built);
 const cash=g.state.gold[0],r=g.build('foundry',2510,340);assert.equal(r.ok,true);assert.equal(cash-g.state.gold[0],270);assert.equal(r.building.level,1);assert.equal(r.building.hp,g.buildings.foundry.hp);
 const data=g.serialize(),restored=Game.restore(data);assert.deepEqual(restored.serialize(),data);const sale=g.sell(r.building.id);assert.equal(sale.refund,135);assert.equal(Game.restore(g.serialize()).state.bramBreach.gates[0].openedTick,1);
});
test('Rebuilt ordinary enemy watch never relocks original gate; restart is closed',()=>{
 const g=create(7301,false);breach(g);g._damage(g.state.buildings.find(b=>b.id===9),10000,0);g.update(.05);g.state.gold[1]=300;const r=g.build('watchtower',2750,340,1);assert.equal(r.ok,true);assert.notEqual(r.building.id,6);g.update(.05);assert.equal(g.state.bramBreach.gates[0].openedTick,1);assert.deepEqual(Game.restore(g.serialize()).serialize(),g.serialize());assert.equal(create().state.bramBreach.gates[0].openedTick,null);
});
test('Strict prototype restore rejects malformed/cross-identity gates and forward buildings',()=>{
 const initial=create().serialize();for(const mutate of[
 s=>s.state.bramBreach.gates[0].id++,s=>s.state.bramBreach.gates[0].lane=1,s=>s.state.bramBreach.gates[0].openedTick=0,s=>s.state.bramBreach.gates[0].openedTick=1,s=>s.state.bramBreach.extra=1,s=>s.state.bramBreach.revision=2,s=>s.state.buildings=s.state.buildings.filter(b=>b.id!==6),s=>s.state.buildings.find(b=>b.id===6).x=2890,s=>s.mapId='classic',s=>s.rulesetId='frontier-campaign-air-local',s=>s.state.time=.001,s=>s.state.buildings.find(b=>b.id===1).x=2370]){const bad=clone(initial);mutate(bad);assert.throws(()=>Game.restore(bad));}
 const g=create(7301,false);breach(g);const opened=g.serialize();for(const tick of[-1,0,.5,2]){const bad=clone(opened);bad.state.bramBreach.gates[0].openedTick=tick;assert.throws(()=>Game.restore(bad));}
 const classic=new Game().serialize();classic.state.bramBreach=clone(initial.state.bramBreach);assert.throws(()=>Game.restore(classic));
});
test('Before/after synthetic breach and after purchase resume with no repeated reward',()=>{
 const g=create(7301,false);g.state.buildings.find(b=>b.id===6).hp=1;
 // Synthetic mechanism fixture, not an authored game outcome: one ordinary ram
 // attacks normally inside the fixed step, so restore itself never opens a gate.
 g._spawn({type:'foundry',side:0,x:1750,y:340,lane:0,level:1});g.state.units.at(-1).cooldown=0;
 const prior=g.serialize();g.update(.05);const opened=g.serialize();assert.equal(opened.state.bramBreach.gates[0].openedTick,1);
 const beforeRestored=Game.restore(prior);assert.equal(beforeRestored.state.bramBreach.gates[0].openedTick,null);beforeRestored.update(.05);assert.deepEqual(beforeRestored.serialize(),opened);
 assert.equal(g.build('foundry',2510,340).ok,true);const bought=g.serialize(),afterRestored=Game.restore(opened);assert.deepEqual(afterRestored.serialize(),opened);afterRestored.build('foundry',2510,340);assert.deepEqual(afterRestored.serialize(),bought);
 const end=continueTo(bought,'idle',21);for(let i=0;i<20;i++)g.update(.05);assert.deepEqual(end,g.serialize());assert.equal(end.state.gold[0],bought.state.gold[0]+7.5);assert.equal(end.state.buildings.filter(b=>b.side===0&&b.x===2510).length,1);
});
test('Paid cadence includes failed attempts, and visible unsafe pads cause cautious rear investment',()=>{
 const g=create(7301,false);for(const[type,x,lane]of[['foundry',1250,0],['foundry',1250,1],['mint',270,0],['mint',270,1],['sanctum',830,0],['sanctum',830,1]])g._place(type,x,g.map.lanes[lane],0);
 breach(g);g.tick=100;g.state.time=5;g.state.gold[0]=0;const a=instrument(g);policyAction(g,'prompt');assert.equal(a.attempts.length,1);assert.equal(a.attempts[0].ok,false);assert.equal(a.attempts[0].x,2510);
 g.tick=101;g.state.time=5.05;policyAction(g,'prompt');assert.equal(a.attempts.length,1);assert.equal(padSafety(g,0).safe,false);g.tick=200;g.state.time=10;g.state.gold[0]=300;const notes=[];policyAction(g,'cautious',notes);assert.equal(notes.length,1);assert.equal(a.attempts.at(-1).method,'upgrade');
});

test('Malformed old-map null state keeps its historical Invalid saved game error shape',()=>{const data=new Game().serialize();data.state=null;assert.throws(()=>Game.restore(data),/^Error: Invalid saved game:/);});

test('Final exposed-watch initial formation preserves exact declared order/positions',()=>{
 const plan=JSON.parse(readFileSync(new URL('../qa/bram-forward/PLAN.json',import.meta.url),'utf8')),g=create();
 assert.deepEqual(g.state.buildings.map(b=>[b.type,b.x,b.y,b.level]),[...plan.formation.player,...plan.formation.enemy]);
 assert.deepEqual(g.state.buildings.map(b=>b.id),Array.from({length:16},(_,i)=>i+1));
 assert.deepEqual(g.state.buildings.filter(b=>[6,10,11,16].includes(b.id)).map(b=>[b.id,b.type,b.x,b.y]),[[6,'watchtower',2050,340],[10,'foundry',3730,340],[11,'watchtower',2050,560],[16,'mint',3310,340]]);
 assert.deepEqual(plan.seeds,[7301,9127]);assert.deepEqual(plan.policies,['rear','prompt','cautious','idle']);
});
