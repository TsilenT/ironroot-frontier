/** Explicit synthetic API fixtures; no claim that native AI purchased after death. */
import test from 'node:test';import assert from 'node:assert/strict';import {Game} from '../dist/engine.js';import * as c from '../dist/campaign.js';
const blank=()=>{const g=c.createCampaignMission('the-last-engine');g.state.gold=[1000,1000];g.state.bases[1].hp=0;g.update(.05);assert.equal(g.state.winner,null);return g;};
test('exact registered finale rejects every dead-side manual command without state, treasury or RNG mutation',()=>{
 const g=blank(),enemy=g.state.buildings.find(b=>b.side===1&&b.type==='barracks'),before=g.serialize();
 for(const action of [()=>g.canBuild('barracks',2930,g.map.lanes[0],1),()=>g.build('barracks',2930,g.map.lanes[0],1),()=>g.upgrade(enemy.id,1),()=>g.sell(enemy.id,1),()=>g.cast(1600,450,1)]){assert.deepEqual(action(),{ok:false,code:'citadel-fallen',reason:'This citadel has fallen.'});assert.deepEqual(g.serialize(),before);}
 for(const kind of ['regen','arrows']){assert.equal(g.canBuyCitadelOption(kind,1).code,'battle-ended');assert.equal(g.buyCitadelOption(kind,1).code,'battle-ended');assert.deepEqual(g.serialize(),before);}g._ai(1);assert.deepEqual(g.serialize(),before);
});
for(const command of ['build','upgrade','sell','cast'])test(`living-side ${command} remains legal during registered core-first aftermath`,()=>{
 const g=blank(),own=g.state.buildings.find(b=>b.side===0&&b.type==='barracks');const result=command==='build'?g.build('barracks',270,g.map.lanes[0]):command==='cast'?g.cast(1600,450):g[command](own.id);assert.equal(result.ok,true);assert.equal(g.state.winner,null);
});
test('dead enemy factories keep ordinary production while its AI and citadel remain stopped',()=>{
 const g=blank(),built=g.state.stats.built[1],initialUnitIds=new Set(g.state.units.map(u=>u.id));for(let i=0;i<40;i++)g.update(.05);assert.ok(g.state.units.some(u=>u.side===1&&u.type!=='colossus'&&!initialUnitIds.has(u.id)));assert.equal(g.state.stats.built[1],built);assert.equal(g.state.bases[1].hp,0);assert.equal(g.state.citadelOptions.sides[1].choice,null);
});
test('dead issuing player is also rejected before the next terminal tick',()=>{const g=blank();g.state.bases[0].hp=0;const own=g.state.buildings.find(b=>b.side===0),before=g.serialize();for(const action of [()=>g.canBuild('barracks',270,g.map.lanes[0]),()=>g.build('barracks',270,g.map.lanes[0]),()=>g.upgrade(own.id),()=>g.sell(own.id),()=>g.cast(1600,450)]){assert.equal(action().code,'citadel-fallen');assert.deepEqual(g.serialize(),before);}});
test('prior registered identity retains its manual admission behavior; new guard requires exact registry identity',()=>{
 const prior=new Game({rulesetId:'frontier-campaign-citadel-open',ai:false});prior.state.bases[1].hp=0;prior.state.gold[1]=1000;assert.equal(prior.canBuild('barracks',2930,prior.map.lanes[0],1).ok,true);assert.equal(prior.build('barracks',2930,prior.map.lanes[0],1).ok,true);assert.equal(prior.cast(1600,450,1).ok,true);
 const original=blank(),lookalike=Object.create(original);Object.defineProperty(lookalike,'ruleset',{value:{...original.ruleset}});assert.equal(lookalike.canBuild('barracks',2930,lookalike.map.lanes[0],1).ok,true,'a forged object cannot activate the identity-scoped exception');
});
