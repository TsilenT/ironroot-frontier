import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,getRuleset,supportsAutonomousAir} from '../../dist/engine.js';
import {decodeBattle,validateBattleIdentity} from '../../dist/battle-codec.js';
import * as campaign from '../../dist/campaign.js';
import {FOOTHOLD,createFoothold,footholdTargets,evaluateFoothold,advanceFoothold,restartFoothold,serializeFoothold,restoreFoothold} from './foothold.mjs';
const step=(e,n)=>{for(let i=0;i<n;i++)advanceFoothold(e,.05);};
function breach(e,count=2){for(const t of e.targets.slice(0,count)){const b=e.game.state.buildings.find(b=>b.id===t.id);e.game._damage(b,b.hp,0);}advanceFoothold(e,.05);}
test('registered full-earned parent, real opening disadvantage and normal production',()=>{
 const e=createFoothold(),g=e.game,s=g.state;assert.equal(g.ruleset,getRuleset(FOOTHOLD.rulesetId));assert.equal(supportsAutonomousAir(g.ruleset),true);assert.equal(supportsAutonomousAir({...g.ruleset}),false);
 assert.equal(g.difficulty,'hard');assert.equal(g.ai,true);assert.equal(Object.keys(g.buildings).length,8);assert.equal(g.ruleset.fog,undefined);
 assert.deepEqual(s.gold,[900,200]);assert.deepEqual(s.income,[7.5,12.5]);assert.deepEqual(s.bases.map(b=>b.hp),[3600,6000]);
 assert.deepEqual([0,1].map(side=>s.buildings.filter(b=>b.side===side).reduce((n,b)=>n+b.invested,0)),[1225,2225]);
 assert.equal(s.units.length,0);step(e,25);assert.ok(s.units.length>0);assert.equal(s.bases[0].hp,3600);
});
test('private envelope and scenario never become campaign progress/history/backup identities',()=>{
 const e=createFoothold();assert.throws(()=>decodeBattle(serializeFoothold(e)));assert.throws(()=>decodeBattle(e.game.serialize()));
 assert.throws(()=>campaign.getCampaignMission(FOOTHOLD.id));
 assert.throws(()=>validateBattleIdentity({ruleset:{id:FOOTHOLD.rulesetId,revision:1},map:{id:'classic',revision:1},scenario:{kind:'campaign',id:FOOTHOLD.id,revision:1}}));
 assert.equal(campaign.CAMPAIGN_PROGRESS_MISSIONS.some(m=>m.id===FOOTHOLD.id),false);
});
test('original posts retain breach credit when ordinary replacements occupy the sites',()=>{
 const e=createFoothold();breach(e);assert.equal(evaluateFoothold(e).outcome,'won');e.game.state.gold[1]=1000;
 for(const t of e.targets.slice(0,2)){const r=e.game.build(t.type,t.x,t.y,1);assert.ok(r.ok);assert.notEqual(r.building.id,t.id);}
 assert.equal(footholdTargets(e).filter(t=>!t.building).length,2);assert.equal(evaluateFoothold(e).completed,true);assert.equal(e.game.state.bases[1].hp,6000);
});
test('one surviving HP wins through either route; no health floor or mandatory purchase',()=>{
 for(const route of ['posts','core']){const e=createFoothold();e.game.state.bases[0].hp=1;if(route==='posts')breach(e);else e.game.state.bases[1].hp=0;assert.equal(evaluateFoothold(e).completed,true);}
});
for(const time of [599.95,600,600.05])for(const ending of ['posts','core','own','draw','pending'])test(`deadline/loss/draw precedence ${time}/${ending}`,()=>{
 const e=createFoothold(),s=e.game.state;s.time=time;e.game.tick=Math.round(time*20);
 if(ending==='posts')s.buildings=s.buildings.filter(b=>!e.targets.slice(0,2).some(t=>t.id===b.id));
 if(ending==='core'||ending==='draw')s.bases[1].hp=0;if(ending==='own'||ending==='draw')s.bases[0].hp=0;
 const r=evaluateFoothold(e);assert.equal(r.completed,time<=600&&['posts','core'].includes(ending));assert.equal(r.outcome==='draw',ending==='draw');
 if(ending==='own')assert.equal(r.outcome,'lost');if(ending==='pending')assert.equal(r.outcome,time<600?'running':'lost');
});
test('active paid state and fractional accumulator restore exactly; restart keeps seed and fresh original targets',()=>{
 const e=createFoothold({seed:101}),initial=e.game.serialize();assert.ok(e.game.build('archery',1250,260).ok);advanceFoothold(e,.017);
 let r=restoreFoothold(JSON.parse(JSON.stringify(serializeFoothold(e))));assert.deepEqual(r.game.serialize(),e.game.serialize());
 step(e,700);step(r,700);assert.deepEqual(r.game.serialize(),e.game.serialize());
 const fresh=restartFoothold(r);assert.deepEqual(fresh.game.serialize(),initial);assert.deepEqual(fresh.targets,e.targets);
 assert.deepEqual(Game.restore(r.game.serialize()).serialize(),r.game.serialize());
});
test('destroyed original targets survive active restore and do not silently turn into replacements',()=>{
 const e=createFoothold();breach(e,1);const r=restoreFoothold(serializeFoothold(e));assert.equal(evaluateFoothold(r).destroyed,1);assert.equal(evaluateFoothold(r).outcome,'running');
 assert.deepEqual(r.targets,e.targets);step(e,100);step(r,100);assert.deepEqual(r.game.serialize(),e.game.serialize());
});
function addWarrior(e,side,x,lane,y){e.game._spawn({type:'barracks',side,x:x-(side?-48:48),lane,level:1});const u=e.game.state.units.at(-1);u.x=x;u.y=y;u.cooldown=0;}
for(const ending of ['posts','core','own','draw','pending'])test(`final native tick stops exactly at deadline with ${ending}`,()=>{
 const e=createFoothold(),g=e.game,s=g.state;s.buildings=s.buildings.filter(b=>e.targets.slice(0,2).some(t=>t.id===b.id));s.units=[];s.effects=[];g.aiTimer=30;g.tick=11999;s.time=599.95;s.bases.forEach(b=>{b.hp=1;b.cooldown=30;});
 if(['posts','own','draw'].includes(ending))for(const b of s.buildings){b.hp=1;addWarrior(e,0,b.x,b.lane,b.y);}
 if(['core','draw'].includes(ending))addWarrior(e,0,s.bases[1].x,1,450);
 if(['own','draw'].includes(ending))addWarrior(e,1,s.bases[0].x,1,450);
 const r=advanceFoothold(e,.25);assert.equal(g.tick,12000);assert.equal(r.completed,['posts','core'].includes(ending));assert.equal(r.outcome==='draw',ending==='draw');
 const before=serializeFoothold(e);advanceFoothold(e,.25);assert.deepEqual(serializeFoothold(e),before);
});
test('foreign identity, extra metadata, malformed targets and post-deadline state reject',()=>{
 const e=createFoothold();step(e,30);const original=serializeFoothold(e);
 for(const mutate of [x=>x.format='ironroot-save',x=>x.version=1,x=>x.seed=-1,x=>x.targets=[],x=>x.game.difficulty='normal',x=>x.game.ai=false,x=>x.game.rulesetId='frontier-air-local-open',x=>x.game.state.buildings.find(b=>b.id===e.targets[0].id).x+=1,x=>{x.game.tick=12001;x.game.state.time=600.05;}]){const x=structuredClone(original);mutate(x);assert.throws(()=>restoreFoothold(x));}
 assert.deepEqual(serializeFoothold(e),original);
});
