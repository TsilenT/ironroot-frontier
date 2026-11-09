import test from'node:test';import assert from'node:assert/strict';import{readFileSync}from'node:fs';import{createHash}from'node:crypto';
import{Game,RULESETS,buildBounds,buildSites}from'../dist/engine.js';import{BRAM_MAP_ID,BRAM_RULESET_ID}from'../dist/bram-forward.js';import{create}from'../qa/bram-forward/simulate.mjs';import{instrument}from'../qa/bram-forward/audit.mjs';
const hash=v=>createHash('sha256').update(typeof v==='string'?v:JSON.stringify(v)).digest('hex');
test('Only declared tower geometry and new private identity differ from exact005 initial state/definitions',()=>{
 assert.equal(hash(Object.fromEntries(Object.entries(RULESETS).filter(([id])=>id!==BRAM_RULESET_ID))),'3837efc3770d3139e9a37630a46849d9e019f0bdc9641528ea44cef08c0fc369');
 const g=create(),prior=g.serialize();prior.mapId='qa-bram-two-roads';prior.rulesetId='frontier-qa-bram-forward-v1';for(const b of prior.state.buildings)if([6,11].includes(b.id))b.x=2750;else if([9,14].includes(b.id))b.x=3170;
 assert.equal(hash(prior),'0e373e6295217bf1b84cea8c7baef727eb5e8e2b543cfa9a4b34dd9bffed5192');
 const map=structuredClone(g.map);map.id='qa-bram-two-roads';map.name='QA only · Bram forward camp';assert.equal(hash(map),'f569f61c57b4c7eab47e5a8be754c9bb7e76dc371c3506bbaa5bc7bbbc074a17');
 const rules=structuredClone(g.ruleset);rules.id='frontier-qa-bram-forward-v1';rules.name='QA only · Bram forward camp';assert.equal(hash(rules),'235fa14cb826ea578ac43adc4feeeffaf30dee847d5230c281d15a8016d9132e');
 assert.equal(hash(readFileSync(new URL('../qa/bram-forward/policies.mjs',import.meta.url),'utf8')),'13c8adc3eef89d7407de020ddc0ef21a7764288ecd882bc5c9b1fa1a6dbe33f4');
});
test('Original2050 watches restore normally but never add construction bounds or sites',()=>{
 const g=create(7301,false);assert.deepEqual(Game.restore(g.serialize()).serialize(),g.serialize());assert.deepEqual(buildBounds(g.map,1),{minX:2680,maxX:3800,minY:180,maxY:720});assert.equal(buildSites(g.map,1).length,16);assert.equal(buildSites(g.map,1).some(p=>p.x===2050),false);
 g.state.gold[1]=10000;for(const type of Object.keys(g.buildings))for(const y of[340,560])assert.equal(g.canBuild(type,2050,y,1).ok,false);
 assert.equal(g.build('watchtower',3170,340,1).ok,true);assert.equal(g.upgrade(6,1).ok,true);assert.equal(g.state.buildings.find(b=>b.id===6).maxHp,1800);assert.deepEqual(Game.restore(g.serialize()).serialize(),g.serialize());
});
test('Authored exception binds exact original ID/type/side/road/coordinates and retains all ordinary validation',()=>{
 const base=create().serialize(),mutations=[
  d=>{const b=d.state.buildings.find(b=>b.id===6);b.id=d.nextId++;},d=>{const b=d.state.buildings.find(b=>b.id===6);b.type='barracks';b.hp=b.maxHp=980;},d=>d.state.buildings.find(b=>b.id===6).side=0,d=>d.state.buildings.find(b=>b.id===6).lane=1,d=>d.state.buildings.find(b=>b.id===6).x=2051,d=>d.state.buildings.find(b=>b.id===6).y=560,d=>d.state.buildings.find(b=>b.id===6).level=1,d=>d.state.buildings.find(b=>b.id===6).hp=1401,d=>d.state.buildings.find(b=>b.id===6).maxHp=1399,d=>d.state.buildings.find(b=>b.id===6).progress=1.01,d=>d.state.buildings.find(b=>b.id===6).invested=219,d=>{const b=structuredClone(d.state.buildings.find(b=>b.id===6));d.state.buildings.push(b);},d=>{d.state.buildings.find(b=>b.id===6).x=3170;}
 ];for(const mutate of mutations){const bad=structuredClone(base);mutate(bad);const before=structuredClone(bad);assert.throws(()=>Game.restore(bad));assert.deepEqual(bad,before);}
 const g=create(7301,false);g._damage(g.state.buildings.find(b=>b.id===6),10000,0);g.update(.05);g._place('watchtower',2050,340,1);assert.throws(()=>Game.restore(g.serialize()));assert.equal(g.canBuild('watchtower',2050,340,1).ok,false);
});
test('New QA identity rejects crossed pairs,005 saves and geometry relabels; no silent reinterpretation',()=>{
 const oldMap='qa-bram-two-roads',oldRules='frontier-qa-bram-forward-v1';for(const[mapId,rulesetId]of[[oldMap,BRAM_RULESET_ID],[BRAM_MAP_ID,oldRules],[oldMap,oldRules],['classic',BRAM_RULESET_ID],[BRAM_MAP_ID,'frontier-campaign-air-local']])assert.throws(()=>new Game({mapId,rulesetId}));
 for(const mutate of[d=>d.mapId=oldMap,d=>d.rulesetId=oldRules,d=>{d.mapId=oldMap;d.rulesetId=oldRules;},d=>{for(const b of d.state.buildings)if([6,11].includes(b.id))b.x=2750;else if([9,14].includes(b.id))b.x=3170;}]){const bad=create().serialize();mutate(bad);assert.throws(()=>Game.restore(bad));}
});
test('Audit-only main-field/HP metrics read inclusive1320–2680 state without mutation or RNG',()=>{
 const g=create(7301,false);for(const x of[1320,2680,1319,2681]){g._spawn(g.state.buildings.find(b=>b.id===1));g.state.units.at(-1).x=x;}
 g._spawn(g.state.buildings.find(b=>b.id===1));g.state.units.at(-1).x=2050;g.state.units.at(-1).hp=0;
 const a=instrument(g),before=g.serialize(),view=a.summary();assert.equal(view.units[0][0],5);assert.deepEqual(view.mainField[0][0],{count:2,hp:360});assert.deepEqual(view.unitHP[0],[720,0]);assert.deepEqual(g.serialize(),before);
});
test('Passive audit preserves an identical one-tick synthetic combat continuation and snapshots exact state',()=>{
 const a=create(7301,false);a._spawn(a.state.buildings.find(b=>b.id===1));a.state.units.at(-1).x=1900;a._spawn(a.state.buildings.find(b=>b.id===7));a.state.units.at(-1).x=2200;a.tick=99;a.state.time=4.95;const b=Game.restore(a.serialize()),audit=instrument(a);
 a.update(.05);b.update(.05);assert.deepEqual(a.serialize(),b.serialize());assert.equal(a.tick,100);assert.equal(audit.snapshots.length,1);const snap=audit.snapshots[0];for(const side of[0,1]){const own=a.state.units.filter(u=>u.side===side&&u.lane===0);assert.equal(snap.unitHP[side][0],own.reduce((n,u)=>n+u.hp,0));assert.deepEqual(snap.mainField[side][0],{count:own.length,hp:own.reduce((n,u)=>n+u.hp,0)});}assert.equal(audit.attempts.length,0);
});
