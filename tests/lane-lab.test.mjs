import assert from 'node:assert/strict';
import test from 'node:test';
import {Game as ReleaseGame, MAPS as RELEASE_MAPS} from '../dist/engine.js';
import {Game, LAB_MAPS, AIR_ROUTE, BUILDINGS, UNITS, buildSites, worldX, homeX} from '../qa/lane-lab/engine.js';
import {PILOTS,createPilot} from '../qa/lane-lab/campaign.js';
import {createCampaignMission} from '../dist/campaign.js';
import {createBackup,parseBackup,restoreBackup} from '../dist/backup.js';

const clone = value => structuredClone(value);
const advance = (g, seconds) => { for (let i=0; i<Math.round(seconds*20); i++) g.update(.05); };
function empty(mapId='three-roads-crosswind') {
  const g = new Game({mapId,ai:false,seed:427});
  g.state.buildings=[];g.state.units=[];g.state.effects=[];
  return g;
}
function spawn(g,type,side,lane,x=worldX(g.map,side,AIR_ROUTE.gate)) {
  const producer=Object.keys(BUILDINGS).find(k=>BUILDINGS[k].unit===type);
  g._spawn({type:producer,side,x:x-(side?-48:48),lane,level:1});
  const u=g.state.units.at(-1);u.x=x;u.y=g.map.lanes[lane];u.cooldown=0;return u;
}

test('lab maps are immutable, opt-in, legal at every site, with 8/16/24-site bounds',()=>{
  assert.deepEqual(Object.keys(RELEASE_MAPS),['classic','long-march','twin-span']);
  for (const [mapId,map] of Object.entries(LAB_MAPS)) {
    assert.ok(Object.isFrozen(map)&&Object.isFrozen(map.lanes));
    assert.equal(map.buildLimit,map.lanes.length*8);
    assert.throws(()=>new ReleaseGame({mapId}),/Unknown battlefield/);
    for(const side of [0,1]) {
      const g=empty(mapId);g.state.gold[side]=10000;
      for(const site of buildSites(map,side)) assert.equal(g.build('barracks',site.x,site.y,side).ok,true);
      assert.equal(g.state.buildings.length,map.buildLimit);
      assert.equal(g.canBuild('archery',worldX(map,side,270),map.lanes[0]+1,side).ok,false);
      const before=g.serialize();g._ai(side);
      assert.ok(g.state.gold[side]>=0);assert.equal(g.state.buildings.length,map.buildLimit);
      assert.notDeepEqual(g.serialize(),before,'full frontier AI can spend on upgrades');
      assert.deepEqual(Game.restore(g.serialize()).serialize(),g.serialize());
    }
  }
});

test('release maps preserve exact state/RNG/save parity through all-roster combat and AI',()=>{
  for(const mapId of Object.keys(RELEASE_MAPS)) for(const difficulty of ['easy','normal','hard']) {
    const options={mapId,difficulty,seed:958};
    const a=new ReleaseGame(options),b=new Game(options);
    for(const g of [a,b]) {
      g.state.gold=[2000,2000];
      for(const side of [0,1]) for(const [i,type] of ['archery','aerie','sanctum','foundry','mint'].entries()) {
        const lane=i%g.map.lanes.length;
        assert.ok(g.build(type,worldX(g.map,side,1250-Math.floor(i/g.map.lanes.length)*140),g.map.lanes[lane],side).ok);
      }
    }
    for(let i=0;i<2400;i++) {
      a.update(.05);b.update(.05);
      if(i%300===0) assert.deepEqual(b.serialize(),a.serialize());
    }
    a.update(.017);b.update(.017);
    assert.deepEqual(b.serialize(),a.serialize());
    assert.deepEqual(Game.restore(a.serialize()).serialize(),a.serialize());
    assert.deepEqual(ReleaseGame.restore(b.serialize()).serialize(),a.serialize());
  }
});

test('one-lane AI and unit production have no phantom roads on either side or difficulty',()=>{
  for(const difficulty of ['easy','normal','hard']) for(const side of [0,1]) {
    const g=new Game({mapId:'single-road',difficulty,ai:false});
    for(let frame=0;frame<2400;frame++) { g.update(.05);if(frame%100===0)g._ai(side); }
    assert.ok(g.state.buildings.length>2);
    for(const e of [...g.state.buildings,...g.state.units]) assert.equal(e.lane,0);
    assert.ok(g.state.gold.every(n=>n>=0));
    assert.doesNotThrow(()=>Game.restore(g.serialize()));
  }
});

test('crossing is mirrored, one adjacent transfer, exactly two seconds warning and speed-bounded',()=>{
  for(const mapId of ['two-roads-crosswind','three-roads-crosswind']) {
    const map=LAB_MAPS[mapId];
    for(const side of [0,1]) for(let lane=0;lane<map.lanes.length;lane++) {
      if(map.airRoutes[lane]===null)continue;
      const g=empty(mapId),u=spawn(g,'gryphon',side,lane),seed=g.seed;
      const start={x:u.x,y:u.y,lane:u.lane};
      for(let i=0;i<40;i++) {
        g.update(.05);assert.equal(u.x,start.x);assert.equal(u.y,start.y);
        assert.equal(u.lane,start.lane);assert.equal(g.seed,seed,'route consumes no RNG draws');
        assert.deepEqual(Game.restore(g.serialize()).serialize(),g.serialize());
      }
      assert.equal(u.airRoute.phase,'transit');
      const expected=Math.ceil(Math.abs(map.lanes[map.airRoutes[lane]]-u.y)/(AIR_ROUTE.speed*.05));
      for(let i=0;i<expected;i++) {
        const y=u.y;g.update(.05);assert.ok(Math.abs(u.y-y)<=AIR_ROUTE.speed*.05+1e-9);
        assert.equal(u.x,start.x);assert.equal(g.seed,seed);
      }
      assert.equal(u.airRoute.phase,'done');assert.equal(u.lane,map.airRoutes[lane]);
      assert.equal(u.y,map.lanes[u.lane]);
      const crossedLane=u.lane;advance(g,3);assert.equal(u.lane,crossedLane);assert.equal(u.airRoute.phase,'done');
      assert.ok(homeX(g.map,side,u.x)>AIR_ROUTE.gate);
    }
  }
});

test('ground units, middle flyers and no-crossing maps retain ordinary movement',()=>{
  for(const type of Object.keys(UNITS)) {
    const g=empty(),u=spawn(g,type,0,type==='gryphon'?1:0);
    const x=u.x;g.update(.05);assert.equal(u.airRoute,undefined);assert.ok(u.x>x);
  }
  for(const mapId of ['single-road','two-roads','three-roads']) {
    const g=empty(mapId),u=spawn(g,'gryphon',0,0);advance(g,5);
    assert.equal(u.airRoute,undefined);assert.equal(u.lane,0);
  }
});

test('transit flyers cannot attack and remain vulnerable to either adjacent archer lane, towers and rally',()=>{
  for(const side of [0,1]) for(const counter of ['origin-archer','destination-archer','tower','rally','warrior','wizard','siege']) {
    const g=empty(),u=spawn(g,'gryphon',side,0);advance(g,2.5);
    assert.equal(u.airRoute.phase,'transit');
    const rival=1-side,lane=counter==='origin-archer'?0:1;
    let defender;
    if(counter==='tower') defender=g._place('watchtower',u.x,g.map.lanes[1],rival);
    else if(counter!=='rally') defender=spawn(g,counter.endsWith('archer')?'archer':counter,rival,lane,u.x);
    const hp=u.hp,defenderHP=defender?.hp;
    if(counter==='rally')assert.ok(g.cast(u.x,u.y,rival).ok);
    else g.update(.05);
    if(['origin-archer','destination-archer','tower','rally'].includes(counter))assert.ok(u.hp<hp,counter);
    else assert.equal(u.hp,hp,counter+' cannot hit air');
    if(defender)assert.equal(defender.hp,defenderHP,'crossing flyer cannot fire');
  }
});

test('saves at all route phases and partial accumulator continue exactly',()=>{
  for(const seconds of [0,1,2.5,6]) for(const side of [0,1]) {
    const a=empty(),u=spawn(a,'gryphon',side,0,worldX(LAB_MAPS['three-roads-crosswind'],side,1399));
    advance(a,seconds);a.update(.017);
    const b=Game.restore(a.serialize());
    for(let i=0;i<180;i++){a.update(.05);b.update(.05);assert.deepEqual(b.serialize(),a.serialize());}
    assert.equal(a.state.units.find(v=>v.id===u.id)?.airRoute.phase,'done');
  }
});

test('lab saves reject invalid identity, route fields, phase, lane, position and timers without mutation',()=>{
  const g=empty();spawn(g,'gryphon',0,0);advance(g,.5);
  const source=g.serialize();assert.equal(source.version,3);assert.equal(source.ruleset,'lane-lab-1');
  assert.throws(()=>ReleaseGame.restore(source),/Invalid saved game:/);
  const mutations=[d=>d.version=2,d=>delete d.ruleset,d=>d.ruleset='future',d=>d.mapRevision=2,d=>d.mapId='classic',
    d=>delete d.state.units[0].airRoute,d=>d.state.units[0].airRoute.to=2,d=>d.state.units[0].airRoute.from=99,
    d=>d.state.units[0].airRoute.phase='teleport',d=>d.state.units[0].airRoute.remaining=2.1,
    d=>d.state.units[0].airRoute.remaining=NaN,d=>d.state.units[0].airRoute.extra=1,d=>d.state.units[0].lane=1,
    d=>d.state.units[0].x=1000,d=>d.state.units[0].airRoute.phase='approach',
    d=>{d.state.units[0].type='warrior';d.state.units[0].flying=false;d.state.units[0].maxHp=180;d.state.units[0].hp=180;}];
  for(const mutate of mutations) {const bad=clone(source);mutate(bad);const before=clone(bad);assert.throws(()=>Game.restore(bad),/Invalid saved game/);assert.deepEqual(bad,before);}
  const bad=clone(source);bad.state.units[0].airRoute.phase='transit';bad.state.units[0].airRoute.remaining=0;bad.state.units[0].y=700;
  assert.throws(()=>Game.restore(bad),/position mismatch/);
  for(const phase of ['approach','warning']) {
    const invalid=clone(source);invalid.state.units[0].airRoute.phase=phase;
    invalid.state.units[0].airRoute.remaining=phase==='approach'?2:.05;
    invalid.state.units[0].y=700;
    assert.throws(()=>Game.restore(invalid),/position mismatch/,'reject before the next phase makes the same position invalid');
  }
  for(const phase of ['approach','warning','transit','done'])for(const y of [244.01,450,465.99]) {
    const accepted=clone(source),u=accepted.state.units[0];
    u.airRoute.phase=phase;u.airRoute.remaining=phase==='approach'?2:phase==='warning'?.05:0;
    u.lane=phase==='done'?1:0;u.y=y;
    const restored=Game.restore(accepted);restored.update(.05);
    assert.doesNotThrow(()=>Game.restore(restored.serialize()),'accepted phase fixture remains restorable after advancing');
  }
});

test('production backup import rejects every lab map before touching existing storage',()=>{
  for(const mapId of Object.keys(LAB_MAPS)) {
    const backup=JSON.parse(createBackup({getItem:()=>null},{createdAt:'2026-11-06T00:00:00.000Z'}));
    backup.data.battle={format:'ironroot-save',version:2,challengeId:null,campaignId:null,game:new Game({mapId}).serialize()};
    const text=JSON.stringify(backup),operations=[];
    const storage={getItem:k=>{operations.push(['get',k]);return 'existing battle';},setItem:(...a)=>operations.push(['set',...a]),removeItem:k=>operations.push(['remove',k])};
    assert.throws(()=>parseBackup(text));
    const result=restoreBackup(storage,text);assert.equal(result.ok,false);assert.deepEqual(operations,[]);
  }
});

test('lab routes do not lift unit caps and all maps terminate with restorable saves',()=>{
  const saturated=empty();const producer={type:'aerie',side:0,x:410,lane:0,level:1};
  for(let i=0;i<70;i++)saturated._spawn(producer);
  const before=saturated.serialize();for(let i=0;i<10;i++)saturated._spawn(producer);
  assert.deepEqual(saturated.serialize(),before);
  for(const mapId of Object.keys(LAB_MAPS)) {
    const g=new Game({mapId,difficulty:'hard'});
    for(let frame=0;frame<12000&&g.state.winner===null;frame++)g.update(.05);
    assert.notEqual(g.state.winner,null);assert.doesNotThrow(()=>Game.restore(g.serialize()));
    assert.ok(g.state.units.length<=140);
  }
});

test('empty lab maps retain overtime/collapse termination independently of ordinary short matches',()=>{
  for(const mapId of Object.keys(LAB_MAPS)) {
    const g=empty(mapId);g.state.time=419.95;
    for(let frame=0;frame<3600&&g.state.winner===null;frame++)g.update(.05);
    assert.equal(g.state.winner,'draw');assert.equal(g.state.overtime,true);
    assert.ok(g.state.time>420&&g.state.time<600);
    assert.deepEqual(Game.restore(g.serialize()).serialize(),g.serialize());
  }
});

test('campaign pilots introduce exactly 1/2/3 roads and preserve original target identity after resume',()=>{
  assert.deepEqual(PILOTS.slice(0,3).map(p=>LAB_MAPS[p.mapId].lanes.length),[1,2,3]);
  for(const pilot of PILOTS) {
    const {game,targets,evaluate}=createPilot(pilot.id);
    assert.ok(targets.length>0);assert.equal(evaluate(game).completed,false);
    const resumed=Game.restore(game.serialize());assert.deepEqual(evaluate(resumed),evaluate(game));
    assert.ok(resumed.state.buildings.every(b=>b.lane<resumed.map.lanes.length));
  }
  const {game,targets,evaluate}=createPilot('first-road');
  game.state.buildings=game.state.buildings.filter(b=>b.id!==targets[0].id);
  game._place(targets[0].type,targets[0].x,game.map.lanes[0],1);
  assert.equal(evaluate(game).completed,true,'replacement does not resurrect a destroyed marked target');
  const winter=createPilot('full-front'),mine=winter.targets.find(t=>t.kind==='protect');
  winter.game.sell(mine.id);
  winter.game._place(mine.type,mine.x,winter.game.map.lanes[mine.lane],0);
  assert.equal(winter.evaluate(winter.game).failed,true,'replacement does not restore a protected original mine');
});

test('three-road winter pilot preserves the production formation and objective deadline semantics',()=>{
  const pilot=createPilot('full-front'),release=createCampaignMission('winter-stores');
  assert.deepEqual(pilot.game.state,release.state);
  const g=pilot.game;g.state.time=149.95;g.state.gold[0]=10000;
  assert.ok(g.build('mint',410,g.map.lanes[1]).ok);
  for(const b of g.state.buildings.filter(b=>b.side===0&&b.type==='mint').slice(0,2))assert.ok(g.upgrade(b.id).ok);
  assert.equal(pilot.evaluate(g).completed,false);
  g.update(.05);assert.equal(pilot.evaluate(g).completed,true);
  const failing=createPilot('full-front');failing.game.state.time=150;
  assert.equal(failing.evaluate(failing.game).failed,true);
});
