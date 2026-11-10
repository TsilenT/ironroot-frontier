import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';
import {Game,getRuleset} from '../dist/engine.js';import {supportsFog,observe,refreshFog} from '../dist/fog.js';
import {createCampaignMission,getCampaignMission} from '../dist/campaign.js';import {validateBattleIdentity,decodeBattle} from '../dist/battle-codec.js';import {validateHistoryRow} from '../dist/history-codec.js';
import {DESIGN,QA_IDENTITY,createPrototype,evaluatePrototype,savePrototype,restorePrototype} from '../qa/two-messages/scenario.mjs';
import {POLICIES,PROBE,DECISION_TICK,createPolicy,validatePolicyState,chooseCounter,contact} from '../qa/two-messages/policies.mjs';
Game.prototype._step=function(){throw Error('Natural candidate tick forbidden in preflight');};
const digest=x=>createHash('sha256').update(x).digest('hex');
for(const seed of DESIGN.seeds)test(`closed tick-zero factory has actual fog, honest opening and no ghost memories ${seed}`,()=>{
 const g=createPrototype({seed});assert.equal(g.tick,0);assert.equal(g.state.time,0);assert.equal(g.ruleset,getRuleset(DESIGN.parentRulesetId));assert.equal(supportsFog(g.ruleset),true);assert.equal(g.ai,true);assert.equal(Object.keys(g.buildings).length,8);assert.deepEqual(g.state.gold,[1100,100]);assert.deepEqual(g.state.income,[7.5,7.5]);assert.equal(g.state.buildings.length,16);assert.deepEqual(g.state.fog.sides.map(r=>r.structures),[[],[]]);assert.equal(observe(g,0).fog.enabled,true);assert.equal(observe(g,0).state.gold[1],null);assert.equal(observe(g,0).state.buildings.filter(b=>b.side===1).length,0);assert.throws(()=>g.update(.05),/Natural candidate tick forbidden/);
});
test('private QA identity and envelope are not a native ruleset, campaign or result identity',()=>{
 const g=createPrototype(),packet=savePrototype(g),identity={ruleset:{id:QA_IDENTITY.id,revision:1},map:{id:'classic',revision:1},scenario:{kind:'campaign',id:DESIGN.id,revision:1}};
 assert.throws(()=>new Game({rulesetId:QA_IDENTITY.id}));assert.throws(()=>Game.restore({...g.serialize(),rulesetId:QA_IDENTITY.id}));assert.throws(()=>Game.restore(packet));assert.throws(()=>decodeBattle(packet));assert.throws(()=>createCampaignMission(DESIGN.id));assert.throws(()=>getCampaignMission(DESIGN.id));assert.throws(()=>validateBattleIdentity(identity));assert.throws(()=>validateHistoryRow({won:true,draw:false,difficulty:'normal',time:200,kills:0,built:0,date:'2026-11-10T00:00:00.000Z',identity}));
 // Explicitly honest boundary: raw parent data remain valid ordinary parent data.
 assert.deepEqual(Game.restore(g.serialize()).serialize(),g.serialize());
});
test('strict envelope preserves actual fog and policy at zero without touching source packet',()=>{
 const g=createPrototype(),p=createPolicy('fresh-contact'),packet=savePrototype(g,p.snapshot()),before=structuredClone(packet),r=restorePrototype(packet);assert.deepEqual(savePrototype(r.game,r.policyState),packet);assert.deepEqual(packet,before);assert.equal(supportsFog(r.game.ruleset),true);
 for(const change of [x=>x.epoch=2,x=>x.experimentId='other',x=>x.extra=true,x=>x.engine.rulesetId='frontier-campaign-empty-purse',x=>x.constructionSeed=9503,x=>x.engine.state.fog.sides[0].structures.push({id:123,type:'barracks',side:1,x:1950,y:260,lane:0,level:1,observedAt:1}),x=>x.policyState.epoch=2,x=>x.policyState.extra=true,x=>x.policyState.nextProbeIndex=6]){const bad=structuredClone(packet);change(bad);assert.throws(()=>restorePrototype(bad));}
});
test('all information policies make identical paid tick-zero probe and keep real fog',()=>{
 const games=Object.keys(POLICIES).map(()=>createPrototype());const commands=Object.keys(POLICIES).map((id,i)=>createPolicy(id).step(games[i]));assert.deepEqual(commands[0],commands[1]);assert.deepEqual(commands[1],commands[2]);assert.equal(commands[0].cost,140);assert.deepEqual(games[0].serialize(),games[1].serialize());assert.deepEqual(games[1].serialize(),games[2].serialize());assert.ok(games.every(g=>supportsFog(g.ruleset)&&g.tick===0));
});
test('fixed probe price/timing and selected counter are bounded, no hidden starting variation',()=>{
 const g=createPrototype();assert.equal(PROBE.reduce((n,p)=>n+g.buildings[p.type].cost,0),1170);assert.deepEqual(PROBE.map(p=>p.tick),[0,100,200,300,1800,1900]);assert.equal(DECISION_TICK,3600);assert.deepEqual(DESIGN.seeds,[9501,9502]);assert.throws(()=>createPrototype({seed:9503}));
 const tower={id:10,type:'watchtower',side:1,x:1950,y:260,lane:0,level:1,observedAt:20},aerie={id:11,type:'aerie',side:1,x:2230,y:640,lane:2,level:1,observedAt:180};assert.deepEqual(chooseCounter([tower]),{type:'foundry',lane:0,x:550});assert.deepEqual(chooseCounter([tower,aerie]),{type:'archery',lane:2,x:550});
});
test('synthetic empty-world observation proves first contact can become stale and refresh without hidden updates',()=>{
 const g=new Game({seed:1,ai:false,rulesetId:DESIGN.parentRulesetId});g.state.buildings=[];g.state.units=[];g.state.effects=[];g.state.gold=[10000,10000];g.state.fog.sides.forEach(r=>r.structures=[]);
 const enemy=g.build('barracks',1950,260,1).building;
 // Explicit synthetic observer, never an authored formation or natural tick.
 const scout={id:g.nextId++,type:'warrior',side:0,hp:1,x:1700,y:260};g.state.units.push(scout);refreshFog(g);const first=observe(g,0);assert.ok(first.state.buildings.some(b=>b.id===enemy.id));
 scout.x=1000;refreshFog(g);assert.ok(observe(g,0).fog.memories.some(b=>b.id===enemy.id&&b.level===1));g.upgrade(enemy.id,1);assert.equal(observe(g,0).fog.memories.find(b=>b.id===enemy.id).level,1);
 scout.x=1700;refreshFog(g);assert.equal(observe(g,0).state.buildings.find(b=>b.id===enemy.id).level,2);assert.equal(observe(g,0).fog.memories.length,0);assert.equal(g.tick,0);
});
for(const time of [599.95,600,600.05])for(const result of ['alive','enemy','own','draw'])test(`synthetic precedence ${time}/${result}`,()=>{
 const g=createPrototype();g.state.time=time;g.tick=Math.round(time/.05);if(result==='enemy')g.state.bases[1].hp=0;if(result==='own')g.state.bases[0].hp=0;if(result==='draw'){g.state.bases.forEach(b=>b.hp=0);g.state.winner='draw';}const o=evaluatePrototype(g);assert.equal(o.completed,result==='enemy'&&time<=600);assert.equal(o.failed,['own','draw'].includes(result)||time>=600&&!(result==='enemy'&&time===600));
});
test('invalid observation/policy records and cross-policy restores fail closed',()=>{
 const state=createPolicy('fresh-contact').snapshot();for(const change of [s=>s.epoch=2,s=>s.policyId='unknown',s=>s.extra=1,s=>s.nextProbeIndex=7,s=>s.firstContacts=[null],s=>s.firstContacts[0]={lane:0,tick:0,buildings:[]},s=>s.decision={tick:3600}]){const bad=structuredClone(state);change(bad);assert.throws(()=>validatePolicyState(bad));}assert.throws(()=>createPolicy('stale-contact',{state}));
});

test('construction seed remains private provenance while evolving RNG restores exactly without natural steps',()=>{
 const g=createPrototype({seed:9502});for(let i=0;i<7;i++)g.random();assert.notEqual(g.seed,9502);assert.equal(g.tick,0);
 const packet=savePrototype(g);assert.equal(packet.constructionSeed,9502);assert.equal(packet.engine.seed,g.seed);
 const restored=restorePrototype(packet).game;assert.deepEqual(restored.serialize(),g.serialize());
 for(let i=0;i<12;i++)assert.equal(restored.random(),g.random());assert.deepEqual(restored.serialize(),g.serialize());assert.equal(savePrototype(restored).constructionSeed,9502);
});
