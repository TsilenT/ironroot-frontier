import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {Game,COMMAND_MAPS,LAB_MAPS,AIR_ROUTE,worldX,BUILDINGS} from '../qa/lane-lab/engine.js';
import {Game as PreviousLab} from './fixtures/lane-lab-v1.js';
import {Game as ReleaseGame} from '../dist/engine.js';
import {createBackup,restoreBackup} from '../dist/backup.js';
import {createScenario,createResponseMemory,respond} from '../qa/flight-command/scenarios.js';
const advance=(g,seconds)=>{for(let i=0;i<Math.round(seconds*20)&&g.state.winner===null;i++)g.update(.05);};
function fixture(mapId='command-three-roads',side=0,lane) {
  const g=new Game({mapId,ai:false,seed:958});
  g.state.buildings=[];g.state.effects=[];
  lane??=g.map.startingLane;
  g.state.gold[side]=1000;
  const {building:aerie}=g.build('aerie',worldX(g.map,side,1250),g.map.lanes[lane],side);
  return {g,aerie,side};
}
test('flight orders are owned, live, adjacent and opt-in, with failures leaving all state unchanged',()=>{
  for(const mapId of Object.keys(COMMAND_MAPS))for(const side of [0,1])for(const lane of COMMAND_MAPS[mapId].lanes.keys()) {
    const {g,aerie}=fixture(mapId,side,lane);assert.equal(aerie.flightPlan,lane);
    const bad=[()=>g.setFlightPlan(aerie.id,lane,1-side),()=>g.setFlightPlan(aerie.id,lane,2),()=>g.setFlightPlan(aerie.id,-1,side),()=>g.setFlightPlan(aerie.id,99,side),()=>g.setFlightPlan(aerie.id,.5,side),()=>g.setFlightPlan('missing',lane,side)];
    if(lane===0&&g.map.lanes.length===3)bad.push(()=>g.setFlightPlan(aerie.id,2,side));
    for(const action of bad){const before=g.serialize();assert.equal(action().ok,false);assert.deepEqual(g.serialize(),before);}
    for(let to=Math.max(0,lane-1);to<=Math.min(lane+1,g.map.lanes.length-1);to++) {
      const gold=[...g.state.gold],seed=g.seed;assert.equal(g.setFlightPlan(aerie.id,to,side).ok,true);
      assert.equal(aerie.flightPlan,to);assert.deepEqual(g.state.gold,gold);assert.equal(g.seed,seed);
    }
    const other=g._place('archery',worldX(g.map,side,970),g.map.lanes[lane],side),before=g.serialize();
    assert.equal(g.setFlightPlan(other.id,lane,side).ok,false);assert.deepEqual(g.serialize(),before);
    g.sell(aerie.id,side);assert.equal(g.setFlightPlan(aerie.id,lane,side).ok,false);
  }
  const old=new Game({mapId:'three-roads-crosswind',ai:false}),before=old.serialize();
  assert.equal(old.setFlightPlan(1,0).ok,false);assert.deepEqual(old.serialize(),before);
});
test('orders lock at launch: changing plans, upgrading or losing the aerie cannot reroute airborne units',()=>{
  for(const side of [0,1]) {
    const {g,aerie}=fixture('command-three-roads',side);
    g.setFlightPlan(aerie.id,0,side);advance(g,1.3);
    const first=g.state.units[0],route=structuredClone(first.airRoute),id=first.id;
    assert.equal(first.airRoute.to,0);
    assert.ok(g.setFlightPlan(aerie.id,2,side).ok);assert.deepEqual(first.airRoute,route);
    assert.ok(g.upgrade(aerie.id,side).ok);assert.deepEqual(first.airRoute,route);
    advance(g,14);const second=g.state.units.find(u=>u.id!==id);assert.equal(second.airRoute.to,2);
    const liveRoute=structuredClone(second.airRoute);g.sell(aerie.id,side);assert.deepEqual(second.airRoute,liveRoute);
    const restored=Game.restore(g.serialize());advance(g,5);advance(restored,5);assert.deepEqual(restored.serialize(),g.serialize());
    assert.equal(first.airRoute.to,0);assert.equal(second.airRoute.to,2);
  }
});
test('holding avoids transit delay; both adjacent shifts are mirrored, bounded and cannot attack while crossing',()=>{
  for(const side of [0,1])for(const destination of [0,1,2]) {
    const {g,aerie}=fixture('command-three-roads',side);g.setFlightPlan(aerie.id,destination,side);
    g._spawn(aerie);g.state.buildings=[];const u=g.state.units[0];u.x=worldX(g.map,side,AIR_ROUTE.gate);u.y=g.map.lanes[1];
    const x=u.x,seed=g.seed;
    for(let frame=0;frame<40;frame++){g.update(.05);assert.equal(g.seed,seed);}
    if(destination===1){assert.equal(u.airRoute,undefined);assert.notEqual(u.x,x);continue;}
    assert.equal(u.x,x);assert.equal(u.y,g.map.lanes[1]);assert.equal(u.airRoute.phase,'transit');
    for(let frame=0;frame<46;frame++){const y=u.y;g.update(.05);assert.ok(Math.abs(u.y-y)<=AIR_ROUTE.speed*.05+1e-9);assert.equal(u.x,x);}
    assert.equal(u.airRoute.phase,'done');assert.equal(u.lane,destination);
    advance(g,1);assert.notEqual(u.x,x);assert.equal(u.airRoute.phase,'done');
  }
});
test('command flight snapshots preserve future orders and in-flight phases through exact continuation',()=>{
  for(const seconds of [0,1.3,3,5,8])for(const to of [0,1,2]) {
    const {g,aerie}=fixture();g.setFlightPlan(aerie.id,to);advance(g,seconds);g.update(.017);
    const saved=g.serialize();assert.equal(saved.version,4);assert.equal(saved.ruleset,'lane-command-1');
    const restored=Game.restore(saved);for(let frame=0;frame<160;frame++){g.update(.05);restored.update(.05);assert.deepEqual(restored.serialize(),g.serialize());}
  }
});
test('committed approaches follow their launch road to the gateway instead of chasing off-road targets',()=>{
  const {g,aerie}=fixture();g.setFlightPlan(aerie.id,2);g._spawn(aerie);
  const u=g.state.units[0];u.x=1399;u.y=450;
  g._spawn({type:'archery',side:1,x:1448,lane:1,level:1});
  const archer=g.state.units[1];archer.x=1400;archer.y=300;archer.cooldown=20;
  g.state.buildings=[];g.update(.05);assert.equal(u.y,450);assert.ok(u.x>=1400);
  g.update(.05);assert.equal(u.airRoute.phase,'warning');assert.equal(u.y,450);
  for(let frame=0;frame<120;frame++){g.update(.05);assert.doesNotThrow(()=>Game.restore(g.serialize()));}
});
test('command snapshot validation rejects malformed plans, rulesets, nonadjacent routes and future geometry',()=>{
  const {g,aerie}=fixture();g.setFlightPlan(aerie.id,0);advance(g,1.3);const saved=g.serialize();
  const invalid=[d=>d.version=3,d=>d.ruleset='lane-lab-1',d=>d.mapId='three-roads-crosswind',d=>d.mapRevision=2,
    d=>delete d.state.buildings[0].flightPlan,d=>d.state.buildings[0].flightPlan=99,d=>d.state.buildings[0].flightPlan=.5,
    d=>d.state.units[0].airRoute.from=0,d=>d.state.units[0].airRoute.to=1,d=>d.state.units[0].airRoute.extra=1,
    d=>d.state.units[0].airRoute.remaining=3,d=>d.state.units[0].airRoute.phase='teleport',
    d=>d.state.units[0].y=700,d=>d.state.units[0].x=2200];
  for(const mutate of invalid){const data=structuredClone(saved);mutate(data);const before=structuredClone(data);assert.throws(()=>Game.restore(data));assert.deepEqual(data,before);}
  const edge=fixture('command-three-roads',0,0);const bad=edge.g.serialize();bad.state.buildings[0].flightPlan=2;assert.throws(()=>Game.restore(bad),/adjacent/);
});
test('all old lab identities preserve exact v3 simulation/RNG/save behavior against the frozen previous lab',()=>{
  assert.equal(createHash('sha256').update(readFileSync(new URL('./fixtures/lane-lab-v1.js',import.meta.url))).digest('hex'),'9eeced24ff2926969920c2075025c56ec28d9d92417bc6ee2d9f1867e71ce481');
  for(const mapId of Object.keys(LAB_MAPS)) {
    const options={mapId,seed:958,difficulty:'hard'};let a=new PreviousLab(options),b=new Game(options);
    for(const g of [a,b])for(const side of [0,1]) {g.state.gold[side]=1000;g.build('aerie',worldX(g.map,side,1250),g.map.lanes[0],side);g.build('archery',worldX(g.map,side,1110),g.map.lanes.at(-1),side);}
    for(let frame=0;frame<1800;frame++){a.update(.05);b.update(.05);if(frame%300===0)assert.deepEqual(b.serialize(),a.serialize());}
    a.update(.017);b.update(.017);assert.deepEqual(b.serialize(),a.serialize());
    assert.deepEqual(Game.restore(a.serialize()).serialize(),a.serialize());
    assert.deepEqual(PreviousLab.restore(b.serialize()).serialize(),b.serialize());
  }
  for(const mapId of ['classic','twin-span','three-roads-crosswind']) {
    const saved=new PreviousLab({mapId}).serialize();saved.state.buildings[0].flightPlan='unused historical JSON';
    assert.deepEqual(Game.restore(saved).serialize(),PreviousLab.restore(saved).serialize(),'new field checks do not reinterpret unused data under old rulesets');
  }
});
test('production and previous lab reject command snapshots; production backup import never accesses storage',()=>{
  for(const mapId of Object.keys(COMMAND_MAPS)) {
    const g=fixture(mapId).g,saved=g.serialize();assert.throws(()=>ReleaseGame.restore(saved));assert.throws(()=>PreviousLab.restore(saved));
    const backup=JSON.parse(createBackup({getItem:()=>null},{createdAt:'2026-11-06T00:00:00.000Z'}));
    backup.data.battle={format:'ironroot-save',version:2,challengeId:null,campaignId:null,game:saved};
    const ops=[],storage={getItem:k=>ops.push(k),setItem:k=>ops.push(k),removeItem:k=>ops.push(k)};
    assert.equal(restoreBackup(storage,JSON.stringify(backup)).ok,false);assert.deepEqual(ops,[]);
  }
});

test('defender responses observe launched orders and buy legal counters with actual gold and cooldowns',()=>{
  for(const mapId of Object.keys(COMMAND_MAPS))for(const side of [0,1])for(const policy of ['destination-archery','destination-tower','origin-archery','rally']) {
    const scenario=createScenario('open-supply',{mapId,side}),g=scenario.game,memory=createResponseMemory();
    const destination=g.map.lanes.length===3?0:1;
    for(const id of scenario.aerieIds)g.setFlightPlan(id,destination,side);
    const initial=g.serialize();assert.equal(respond(g,1-side,policy,memory),null);assert.deepEqual(g.serialize(),initial,'unlaunched future plan alone does not trigger this observer');
    advance(g,2);const before=g.state.gold[1-side],action=respond(g,1-side,policy,memory);
    assert.ok(action,policy);assert.equal(before-g.state.gold[1-side],action.cost);
    assert.equal(action.cost,policy==='rally'?75:policy==='destination-tower'?220:175);
    if(policy!=='rally') {
      const building=g.state.buildings.find(b=>b.id===action.buildingId);
      assert.equal(building.side,1-side);assert.equal(building.lane,policy==='origin-archery'?scenario.originLane:destination);
    }else {
      assert.equal(g.state.spellCooldown[1-side],25);assert.equal(respond(g,1-side,policy,memory),null);
      assert.ok(g.state.units.filter(u=>u.side===side&&u.type==='gryphon').every(u=>u.hp<u.maxHp));
    }
    assert.doesNotThrow(()=>Game.restore(g.serialize()));
  }
});

test('future orders cannot bypass the 70-unit limit or issue commands after the battle ends',()=>{
  const {g,aerie}=fixture();
  g.setFlightPlan(aerie.id,0);for(let i=0;i<70;i++)g._spawn(aerie);
  assert.equal(g.state.units.length,70);
  g.setFlightPlan(aerie.id,2);const before=g.serialize();g._spawn(aerie);
  assert.deepEqual(g.serialize(),before,'capped launch consumes no extra RNG and cannot create another flight');
  assert.ok(g.state.units.every(u=>u.airRoute.to===0),'existing capped flights keep the first plan');
  assert.doesNotThrow(()=>Game.restore(g.serialize()));
  g.state.bases[1].hp=0;g.state.winner=0;
  const ended=g.serialize();assert.equal(g.setFlightPlan(aerie.id,1).ok,false);assert.deepEqual(g.serialize(),ended);
});

test('rally response spending remains 75 gold when immediate kill bounties reduce the net treasury change',()=>{
  const scenario=createScenario('open-supply'),g=scenario.game,memory=createResponseMemory();advance(g,2);
  const flyers=g.state.units.filter(u=>u.side===scenario.playerSide&&u.type==='gryphon');assert.equal(flyers.length,2);
  for(const u of flyers)g._damage(u,u.hp-1,scenario.defenderSide);
  const before=g.state.gold[scenario.defenderSide],action=respond(g,scenario.defenderSide,'rally',memory);
  assert.equal(action.cost,75);assert.equal(memory.spend,75);assert.equal(action.netGoldDelta,71);
  assert.equal(before-g.state.gold[scenario.defenderSide],71);assert.equal(g.state.stats.kills[scenario.defenderSide],2);
});
