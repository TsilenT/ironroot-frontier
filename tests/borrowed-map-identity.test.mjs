import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {Game, MAPS, INTRO_MAPS, CAMPAIGN_MAPS, getMap, buildSites, homeX, worldX, BORROWED_GROUND_RULESET_ID} from '../dist/engine.js';
import {RULESETS, getRuleset} from '../dist/rulesets.js';
import {validateBattleIdentity, encodeBattle, decodeBattle} from '../dist/battle-codec.js';
import {validateHistoryRow} from '../dist/history-codec.js';
import {Renderer} from '../dist/render.js';
import {installCanvas, makeRenderer} from './renderer-canvas.mjs';
import {getMissionScouting, renderScoutingSvg} from '../dist/scouting.js';

const MAP='borrowed-yard', RULES=BORROWED_GROUND_RULESET_ID, MISSION='borrowed-ground';
const fresh=options=>new Game({mapId:MAP,rulesetId:RULES,ai:false,seed:6401,...options});
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const identity=()=>({map:{id:MAP,revision:1},ruleset:{id:RULES,revision:1},scenario:{kind:'campaign',id:MISSION,revision:1}});
function empty(side=0){const game=fresh();game.state.buildings=[];game.state.effects=[];game.state.gold[side]=10000;return game;}
function assertLegal(game){
  for(const side of [0,1]){
    const sites=buildSites(game.map,side),own=game.state.buildings.filter(b=>b.side===side);
    assert.ok(own.length<=12);assert.equal(new Set(own.map(b=>`${b.x}/${b.y}`)).size,own.length);
    assert.ok(own.every(b=>sites.some(site=>site.x===b.x&&site.y===b.y&&site.lane===b.lane)));
  }
  assert.ok(game.state.gold.every(gold=>gold>=0));
  assert.deepEqual(Game.restore(game.serialize()).serialize(),game.serialize());
}

test('Borrowed Yard adds one frozen campaign map without changing any published geometry or rules',()=>{
  assert.equal(hash(MAPS),'098b998e3976ed83ccc71878da86a99462bfd3ffcfdf0e19ac89c6ea48394730');
  assert.equal(hash(INTRO_MAPS),'eddc76629a903c0dd5d1fed4c78b54dc21ef99269269d6e3185d34eaf0284742');
  assert.equal(hash(Object.fromEntries(Object.entries(RULESETS).filter(([id])=>!['frontier-hammer-prototype','frontier-campaign-hammer-turns'].includes(id)&&id!=='frontier-campaign-salt-stores'&&id!=='frontier-campaign-archers-quay'&&id!==RULES&&id!=='frontier-campaign-river-between'&&id!=='frontier-campaign-road-we-know'&&id!=='frontier-campaign-reed-beds'&&!id.startsWith('frontier-campaign-false-quiet-')))),'68011b3b9db67c3ae73d38aff72c6cf39d01603b1fc7729b875151758e053123');
  assert.deepEqual(Object.keys(MAPS),['classic','long-march','twin-span']);assert.equal(Object.hasOwn(MAPS,MAP),false);
  assert.deepEqual(Object.keys(CAMPAIGN_MAPS),[MAP]);assert.ok(Object.isFrozen(CAMPAIGN_MAPS));
  const map=getMap(MAP);assert.equal(map,CAMPAIGN_MAPS[MAP]);
  assert.deepEqual(map,{id:MAP,revision:1,name:'Borrowed Yard',width:3200,height:900,lanes:[260,450,640],startingLane:1,buildLimit:12,siteColumns:[410,690,970,1250]});
  assert.ok(Object.isFrozen(map)&&Object.isFrozen(map.lanes)&&Object.isFrozen(map.siteColumns));
  assert.throws(()=>{map.siteColumns.push(270);},TypeError);assert.throws(()=>getMap(MAP,2));
  const mechanics=['units','buildings','spell','combat','ai','economy','movement','endgame','limits','citadel'];
  const rules=getRuleset(RULES),ordinary=getRuleset('frontier-campaign-citadel-open');
  for(const key of mechanics)assert.deepEqual(rules[key],ordinary[key],key);
  assert.equal(rules.revision,1);assert.equal(rules.campaignOnly,true);assert.equal(Object.keys(rules.buildings).length,8);
  for(const key of ['fog','campaignControl','skirmishOnly','authoredOnly','qaOnly'])assert.equal(rules[key],undefined,key);
  assert.ok(Object.isFrozen(rules)&&Object.isFrozen(rules.buildings));
});

test('Borrowed Yard positions are symmetric, separated and use the ordinary constructor sites',()=>{
  const game=fresh(),map=game.map;
  assert.equal(game.schemaVersion,3);assert.equal(game.state.buildings.length,2);
  assert.deepEqual(game.state.buildings.map(b=>[b.x,b.y,b.lane]),[[410,450,1],[2790,450,1]]);
  for(const side of [0,1]){
    const sites=buildSites(map,side);assert.equal(sites.length,12);
    for(const [index,site] of sites.entries()){
      assert.equal(homeX(map,side,site.x),map.siteColumns[index%4]);
      assert.equal(worldX(map,side,homeX(map,side,site.x)),site.x);
      assert.equal(site.y,map.lanes[site.lane]);
      assert.ok(buildSites(map,1-side).some(other=>other.x===map.width-site.x&&other.y===site.y));
      for(const other of sites.slice(index+1))assert.ok(Math.hypot(site.x-other.x,site.y-other.y)>=108);
    }
  }
  assertLegal(game);
});

test('all eight ordinary buildings use only owned marked plots, with exact paid construction',()=>{
  for(const side of [0,1])for(const type of Object.keys(getRuleset(RULES).buildings))for(const site of buildSites(getMap(MAP),side)){
    const game=empty(side),gold=game.state.gold[side],built=game.build(type,site.x,site.y,side);
    assert.ok(built.ok,`${side}/${type}/${site.x}/${site.y}`);assert.equal(game.state.gold[side],gold-game.buildings[type].cost);assertLegal(game);
  }
  for(const side of [0,1]){
    const game=fresh(),before=game.serialize();
    for(const [distance,y] of [[270,260],[550,450],[830,640],[1110,260],[410.01,260],[410,260.01],[410,450],[200,260],[1320,260]]){
      assert.equal(game.build('barracks',worldX(game.map,side,distance),y,side).ok,false);
      assert.deepEqual(game.serialize(),before);
    }
    assert.equal(game.build('barracks',worldX(game.map,1-side,690),260,side).ok,false);assert.deepEqual(game.serialize(),before);
  }
});

test('ordinary Normal AI buys legal plots on both sides and paid upgrades at a full yard',()=>{
  for(const side of [0,1]){
    const game=fresh({difficulty:'normal'}),gold=game.state.gold[side],prior=game.state.buildings.filter(b=>b.side===side).reduce((sum,b)=>sum+b.invested,0);
    game._ai(side);
    const own=game.state.buildings.filter(b=>b.side===side);assert.equal(own.length,3);
    assert.equal(gold-game.state.gold[side],own.reduce((sum,b)=>sum+b.invested,0)-prior);assert.equal(game.state.gold[side],140);assertLegal(game);
    const full=empty(side);for(const site of buildSites(full.map,side))assert.ok(full.build('barracks',site.x,site.y,side).ok);
    full.state.gold[side]=100;full._ai(side);
    assert.equal(full.state.buildings.length,12);assert.equal(full.state.buildings.filter(b=>b.level===2).length,1);assert.equal(full.state.gold[side],2);assertLegal(full);
  }
});

test('keeping or upgrading uses the same site; ordinary salvage frees it for paid replacement and restore',()=>{
  for(const side of [0,1]){
    const game=empty(side),sites=buildSites(game.map,side);
    for(const [index,site] of sites.entries())assert.ok(game.build(index===0?'watchtower':'barracks',site.x,site.y,side).ok);
    const original=game.state.buildings[0],position={x:original.x,y:original.y},oldId=original.id;
    game.state.gold[side]=500;assert.equal(game.canBuild('archery',position.x,position.y,side).ok,false);
    assert.ok(game.upgrade(oldId,side).ok);assert.equal(game.state.gold[side],346);assert.equal(game.state.buildings.length,12);
    assert.deepEqual({x:original.x,y:original.y},position);original.hp=original.maxHp/2;
    assert.deepEqual(game.sell(oldId,side),{ok:true,refund:93});assert.equal(game.state.gold[side],439);
    const replacement=game.build('archery',position.x,position.y,side);assert.ok(replacement.ok);assert.notEqual(replacement.building.id,oldId);
    assert.equal(game.state.gold[side],264);assert.equal(game.state.buildings.length,12);assertLegal(game);
  }
});

test('engine admission pairs Borrowed Yard only with its rules and rejects malformed saved plots unchanged',()=>{
  for(const mapId of [...Object.keys(MAPS),...Object.keys(INTRO_MAPS)])assert.throws(()=>fresh({mapId}),/Borrowed Yard/);
  for(const rulesetId of Object.keys(RULESETS).filter(id=>id!=='frontier-campaign-salt-stores'&&id!=='frontier-campaign-archers-quay'&&id!==RULES))assert.throws(()=>fresh({rulesetId}),/Borrowed Yard/);
  assert.throws(()=>new Game({mapId:MAP}),/Borrowed Yard/);
  for(const options of [{mapRevision:2},{rulesetRevision:2}])assert.throws(()=>fresh(options));
  const saved=fresh().serialize();
  for(const mutate of [
    data=>{data.mapId='classic';},data=>{data.rulesetId='frontier-campaign-citadel-open';},
    data=>{data.mapRevision=2;},data=>{data.rulesetRevision=2;},data=>{delete data.mapId;},
    data=>{data.version=2;delete data.rulesetId;delete data.rulesetRevision;},
    data=>{data.state.buildings[0].x=550;},data=>{data.state.buildings[0].y+=.01;},
    data=>{data.state.buildings[0].lane=3;},data=>{const copy=structuredClone(data.state.buildings[0]);copy.id=data.nextId++;data.state.buildings.push(copy);},
    data=>{data.state.fog={};},data=>{data.state.bridgeControl={};},data=>{data.state.campaignControl={};},
  ]){
    const value=structuredClone(saved);mutate(value);const before=structuredClone(value);
    assert.throws(()=>Game.restore(value));assert.deepEqual(value,before);
  }
});

test('renderer snapping and scouting use the registered twelve-site yard without changing renderer rules',()=>{
  installCanvas();const renderer=makeRenderer(Renderer);renderer.setMap(MAP);
  for(const side of [0,1])for(const x of [-100,200,270,410,550,690,830,970,1110,1250,1400,3300])for(const y of [180,260,355,450,545,640,720]){
    const point=renderer.snap({x,y},side);assert.ok(buildSites(getMap(MAP),side).some(site=>site.x===point.x&&site.y===point.y));
  }
  const mission={id:MISSION,name:'Borrowed Ground',mapId:MAP,mapRevision:1,rulesetId:RULES,rulesetRevision:1,playerBuildings:[['watchtower',1250,0]],enemyBuildings:[['barracks',2230,2]]};
  const report=getMissionScouting(mission);assert.equal(report.map.siteLimit,12);assert.equal(report.map.roadCount,3);assert.equal(report.map.placement,'Marked building sites');
  assert.deepEqual(report.map.lanes,[260,450,640]);assert.match(report.map.summary,/12-building limit per side/);assert.match(renderScoutingSvg(mission),/viewBox="0 0 3200 900"/);
});

test('campaign catalog binds exact Borrowed Ground identity and rejects Skirmish, wrong missions and legacy results',async()=>{
  const campaign=await import('../dist/campaign.js');
  const mission=campaign.getCampaignMission(MISSION),game=campaign.createCampaignMission(MISSION);
  assert.equal(mission.mapId,MAP);assert.equal(mission.rulesetId,RULES);assert.equal(mission.difficulty,'normal');assert.equal(mission.ai,true);
  assert.deepEqual(validateBattleIdentity(identity()),identity());assertLegal(game);
  for(const mutate of [
    value=>{value.scenario={kind:'skirmish',id:'standard',revision:1};},
    value=>{value.scenario={kind:'campaign',id:'one-signal-is-enough',revision:1};},
    value=>{value.scenario={kind:'campaign',id:'lanterns-on-the-water',revision:1};},
    value=>{value.scenario.revision=2;},value=>{value.map={id:'classic',revision:1};},
    value=>{value.ruleset={id:'frontier-campaign-citadel-open',revision:1};},
    value=>{value.map={id:'classic',revision:1};value.ruleset={id:'frontier-campaign-citadel-open',revision:1};},
  ]){const value=identity();mutate(value);const before=structuredClone(value);assert.throws(()=>validateBattleIdentity(value));assert.deepEqual(value,before);}
  const progress={...campaign.createCampaignProgress(),missions:Object.fromEntries(campaign.CAMPAIGN_PROGRESS_MISSIONS.filter(m=>m.id!=='the-hammer-turns'&&m.id!=='salt-in-the-stores'&&m.id!=='the-archers-quay'&&(m.id!==MISSION)).map(m=>[m.id,{completed:true,stars:1,bestTime:60}]))};
  assert.equal(campaign.getCampaignRevisionForRuleset(MISSION,RULES),1);
  const saved=encodeBattle(game,identity().scenario,{campaignProgress:progress}),restored=decodeBattle(saved,{campaignProgress:progress});
  assert.deepEqual(restored.game.serialize(),game.serialize());assert.deepEqual(campaign.createCampaignRestart(restored.game,MISSION).serialize(),game.serialize());
  const row={won:true,draw:false,difficulty:'normal',time:60,kills:0,built:0,date:'2026-11-08T00:00:00.000Z',identity:identity()};
  assert.deepEqual(validateHistoryRow(row),row);const {identity:ignored,...legacy}=row;
  assert.throws(()=>validateHistoryRow({...legacy,campaignId:MISSION,mapId:MAP}));
});
