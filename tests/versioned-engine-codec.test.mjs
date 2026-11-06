import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, MAPS, INTRO_MAPS, BUILDINGS, UNITS, getMap, getRuleset } from '../dist/engine.js';
import { encodeBattle, decodeBattle, identityOf, scenarioForBattle } from '../dist/battle-codec.js';
import { createCampaignMission, createCampaignProgress, ALL_CAMPAIGN_MISSIONS } from '../dist/campaign.js';
import { createStorage, createSaveSession, writeBattle, getBattleWriteFailure, createHistorySession } from '../dist/persistence.js';
const modern=(id='frontier-rootwarden-open',options={})=>new Game({rulesetId:id,rulesetRevision:1,ai:false,...options});
const clone=value=>JSON.parse(JSON.stringify(value));
function empty(game){game.state.buildings=[];game.state.units=[];game.state.effects=[];game.state.projectiles=[];return game;}
function store(){const data=new Map(),backend={getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value),removeItem:key=>data.delete(key)};return {data,backend,storage:createStorage(()=>backend)};}

test('whole rulesets and maps are immutable, isolated and never change legacy aliases or picker order',()=>{
  const old=new Game(),open=modern(),timed=modern('frontier-rootwarden-timed');
  assert.equal(old.ruleset.id,'frontier-legacy');assert.equal(old.units,UNITS);assert.equal(old.buildings,BUILDINGS);
  assert.equal(old.buildings.wardenLodge,undefined);assert.equal(open.units.rootwarden.hp,800);
  assert.deepEqual(Object.keys(open.buildings),[...Object.keys(BUILDINGS),'wardenLodge']);
  for(const edit of [()=>{open.units.rootwarden.hp=1;},()=>{open.units={};},()=>{open.ruleset=old.ruleset;},()=>{open.map=getMap('long-march');},()=>{timed.ruleset.endgame.forcedDecay=false;}])assert.throws(edit,TypeError);
  assert.deepEqual(Object.keys(MAPS),['classic','long-march','twin-span']);
  assert.deepEqual(Object.values(INTRO_MAPS).map(m=>[m.width,m.height,[...m.lanes],m.startingLane,m.buildLimit]),[[3200,900,[450],0,8],[3200,900,[340,560],0,16]]);
  for(const args of [['classic',2],['intro-one-road',2],[['classic'],1],['constructor',1]])assert.throws(()=>getMap(...args));
  assert.throws(()=>new Game({rulesetId:null}));
});

test('legacy v1/v2 serializer shape survives restore; explicit identities alone produce v3',()=>{
  for(const mapId of Object.keys(MAPS)){
    const game=new Game({mapId});game.update(.137);const data=game.serialize();
    assert.equal(data.version,mapId==='classic'?1:2);assert.equal(Object.hasOwn(data,'rulesetId'),false);
    assert.equal(JSON.stringify(Game.restore(data).serialize()),JSON.stringify(data));
    assert.equal(encodeBattle(Game.restore(data)).version,2);
    for(const key of ['rulesetId','rulesetRevision','scenario','rules','ruleset'])assert.throws(()=>Game.restore({...data,[key]:'frontier-rootwarden-open'}));
  }
  const game=modern();game.update(.137);assert.equal(game.serialize().version,3);
  assert.deepEqual(Game.restore(game.serialize()).serialize(),game.serialize());
  assert.equal(new Game({rulesetId:'frontier-legacy'}).serialize().version,3);
});

test('Rootwarden kernel is exact, pays normal costs, attacks as melee and is forbidden in legacy payloads',()=>{
  const game=modern(),b=game.build('wardenLodge',970,450).building;
  assert.ok(b);assert.equal(game.state.gold[0],210);assert.equal(b.hp,650);assert.equal(game.buildings.wardenLodge.spawnTime,12);
  assert.equal(game.upgradeCost(b),147);assert.ok(game.upgrade(b.id).ok);game._spawn(b);
  const u=game.state.units.find(u=>u.type==='rootwarden');assert.equal(u.maxHp,800*1.12);
  const d=game.units.rootwarden;assert.deepEqual([d.damage,d.attackTime,d.speed,d.range,d.radius,d.flying,d.canAttackAir,d.canAttackGround],[8,1.5,60,34,17,false,false,true]);
  const enemy=game.state.bases[1],hp=enemy.hp;game.state.projectiles=[];game._fire(u,enemy,8,'rootwarden');assert.equal(enemy.hp,hp-8);assert.equal(game.state.projectiles.length,0);assert.ok(game.state.effects.some(e=>e.type==='hit'));
  assert.equal(new Game().canBuild('wardenLodge',970,450).ok,false);
  const foreign=game.serialize();delete foreign.rulesetId;delete foreign.rulesetRevision;delete foreign.mapId;delete foreign.mapRevision;foreign.version=1;assert.throws(()=>Game.restore(foreign));
});

test('open rules keep exact five-minute escalation but never apply timed core decay',()=>{
  const timed=empty(modern('frontier-rootwarden-timed')),open=empty(modern());
  for(const game of [timed,open]){game.state.time=299.95;game.tick=5999;game.update(.1);assert.equal(game.state.overtime,true);game.state.time=420;game.tick=8400;game.update(.1);}
  assert.ok(timed.state.bases[0].hp<6000);assert.equal(open.state.bases[0].hp,6000);assert.equal(open.state.winner,null);
  assert.equal(open.ruleset.endgame.productionMultiplier,1.65);assert.equal(open.ruleset.endgame.structureDamageMultiplier,1.75);assert.equal(open.ruleset.endgame.escalatedBaseDamage,18);
});

test('three-hour continuous open simulation and restored continuation remain valid without decay',()=>{
  const original=empty(modern());for(let i=0;i<43204;i++)original.update(.25);
  assert.ok(original.state.time>10800);assert.equal(original.state.winner,null);assert.equal(original.state.bases[0].hp,6000);
  const resumed=decodeBattle(encodeBattle(original)).game;
  for(let i=0;i<100;i++){original.update(.137);resumed.update(.137);}
  assert.deepEqual(resumed.serialize(),original.serialize());
});

test('seven-day and counter preflights refuse whole calls without changing serialized bytes or winner',()=>{
  const game=empty(modern()),limits=game.ruleset.limits;
  assert.deepEqual([limits.maxTime,limits.maxTick,limits.maxCounter,limits.maxId,limits.headroom],[604800.01,12096000,1e12,1e12,1e7]);
  game.tick=limits.maxTick-1;game.state.time=604799.95;game.accumulator=.02;
  const before=JSON.stringify(game.serialize());const result=game.update(.25);
  assert.equal(result.code,'save-safety-limit');assert.equal(JSON.stringify(game.serialize()),before);assert.equal(game.state.winner,null);
  assert.equal(game.update(.03),undefined);assert.equal(game.tick,limits.maxTick);assert.match(game.limitReason,/seven-day/);
  const horizon=JSON.stringify(game.serialize());
  for(const action of [()=>game.update(.05),()=>game.build('barracks',970,450),()=>game.sell(1),()=>game.upgrade(1),()=>game.cast(1000,450)])assert.equal(action().code,'save-safety-limit');
  assert.equal(JSON.stringify(game.serialize()),horizon);assert.deepEqual(decodeBattle(encodeBattle(game)).game.serialize(),game.serialize());
  const nearCounter=modern();nearCounter.state.gold[0]=1e12-1e7+1;const counterBefore=JSON.stringify(nearCounter.serialize());assert.match(nearCounter.limitReason,/counter/);assert.equal(nearCounter.update(.25).ok,false);assert.equal(JSON.stringify(nearCounter.serialize()),counterBefore);
  for(const field of ['gold']){const bad=clone(nearCounter.serialize());bad.state[field][0]=1e12+1;assert.throws(()=>Game.restore(bad));}
});

test('preflight headroom bounds every admitted roster and current map collection',()=>{
  for(const id of ['frontier-rootwarden-open','frontier-rootwarden-timed']){
    const rules=getRuleset(id),unitHP=Math.max(...Object.values(rules.units).map(u=>u.hp*1.24)),buildingHP=Math.max(...Object.values(rules.buildings).map(b=>b.hp*1.8));
    const liveHP=140*unitHP+48*buildingHP+12000;assert.ok(liveHP<250000);assert.ok(liveHP*10<rules.limits.headroom);
    const game=empty(modern(id));game.accumulator=.251;const tick=game.tick;game.update(.25);assert.equal(game.tick-tick,10);assert.ok(game.state.effects.length<=256);assert.ok(game.state.projectiles.length<=256);
  }
});

test('shared codec rejects unknown identities, malformed enums, raw v3 and mismatched authored context',()=>{
  const envelope=encodeBattle(modern());
  const corrupt=[v=>v.scenario.revision++,v=>v.scenario.id='unknown',v=>v.scenario.kind=['skirmish'],v=>v.game.rulesetRevision++,v=>v.game.rulesetId='constructor',v=>v.game.rulesetId=['frontier-rootwarden-open'],v=>v.game.mapRevision++,v=>v.game.state.extra=1,v=>v.game.state.buildings[0].type=['barracks'],v=>v.extra=1];
  for(const mutate of corrupt){const bad=clone(envelope);mutate(bad);const original=JSON.stringify(bad);assert.throws(()=>decodeBattle(bad));assert.equal(JSON.stringify(bad),original);}
  assert.throws(()=>decodeBattle(modern().serialize()));
  const ended=modern();ended.state.bases[1].hp=0;ended.state.winner=0;assert.throws(()=>encodeBattle(ended));assert.equal(identityOf(ended).scenario.id,'standard');
  assert.throws(()=>encodeBattle(modern(),scenarioForBattle(null,'emberwatch')));
  const intro=createCampaignMission('first-watch'),introEnvelope=encodeBattle(intro,scenarioForBattle(null,'first-watch'));
  assert.equal(decodeBattle(introEnvelope).identity.map.id,'intro-one-road');
  const locked=createCampaignMission('forked-road');assert.throws(()=>encodeBattle(locked,scenarioForBattle(null,'forked-road')),/locked/);
  const progress=createCampaignProgress();progress.missions['first-watch']={completed:true,stars:3,bestTime:58};assert.equal(decodeBattle(encodeBattle(locked,scenarioForBattle(null,'forked-road'),{campaignProgress:progress}),{campaignProgress:progress}).campaignId,'forked-road');
});

test('engine and codec never evaluate saved accessor/toJSON properties',()=>{
  let invoked=0;const data=modern().serialize();Object.defineProperty(data.state,'time',{enumerable:true,get(){invoked++;return 0;}});
  assert.throws(()=>Game.restore(data));assert.throws(()=>decodeBattle({format:'ironroot-save',version:3,scenario:{kind:'skirmish',id:'standard',revision:1},game:data}));assert.equal(invoked,0);
  const clean=modern().serialize();clean.toJSON=()=>{invoked++;return {};};assert.throws(()=>Game.restore(clean));assert.equal(invoked,0);
});

test('candidate validation precedes ownership and storage mutation; writes require verified bytes',()=>{
  const {data,storage}=store();data.set('battle','prior');const session=createSaveSession(storage,'battle');session.claim();
  const game=modern();game.state.time=604801;assert.equal(writeBattle(session,'battle',game),false);assert.equal(getBattleWriteFailure(session).code,'invalid-battle');assert.equal(data.get('battle'),'prior');assert.equal(session.status(),'current');
  const valid=modern();assert.equal(writeBattle(session,'battle',valid),true);assert.equal(decodeBattle(data.get('battle')).game.ruleset.id,valid.ruleset.id);
  assert.equal(writeBattle({...storage,set:()=>true},'other',valid),false);
  data.set('battle','newer');assert.equal(writeBattle(session,'battle',valid),false);assert.equal(data.get('battle'),'newer');
  const invalidScenario=modern();assert.equal(writeBattle(session,'battle',invalidScenario,null,'emberwatch'),false);assert.equal(data.get('battle'),'newer');
});

test('history deduplication includes full identity and refuses unknown modern rows without overwriting',()=>{
  const {data,storage}=store(),session=createHistorySession(storage,'history');
  const common={won:false,draw:true,difficulty:'normal',time:100,kills:10,built:2,date:'2026-11-06T12:00:00.000Z'};
  for(const rule of ['frontier-rootwarden-open','frontier-rootwarden-timed'])session.retain({...common,identity:identityOf(modern(rule))});
  assert.equal(session.retry(),true);assert.equal(JSON.parse(data.get('history')).length,2);
  const before=data.get('history'),bad={...common,identity:clone(identityOf(modern()))};bad.identity.ruleset.revision=99;assert.throws(()=>session.retain(bad));assert.equal(data.get('history'),before);
});

test('codec preserves malformed legacy classification while distinguishing future schema and v3 identities',()=>{
  const legacy=encodeBattle(new Game({ai:false})),explicit=encodeBattle(modern());
  for(const format of [null,['ironroot-save'],'unknown-format'])assert.throws(()=>decodeBattle({...legacy,format}),error=>error.code==='invalid-battle');
  for(const campaignId of [[],['emberwatch'],'unknown-mission'])assert.throws(()=>decodeBattle({...legacy,campaignId}),error=>error.code==='invalid-battle');
  assert.throws(()=>decodeBattle({...legacy,version:99}),error=>error.code==='unsupported-version');
  assert.throws(()=>decodeBattle({...explicit,scenario:{kind:'campaign',id:'unknown-mission',revision:1}}),error=>error.code==='unsupported-identity');
});
