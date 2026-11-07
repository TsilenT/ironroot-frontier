/** Opt-in autonomous-air experiment: ordinary paid units, physical combat, exact replay. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, MAPS, INTRO_MAPS, RULESETS, worldX, laneFor, supportsAutonomousAir, supportsFlightOrders, DEFAULT_SKIRMISH_RULESET_ID, validateEngineFields } from '../dist/engine.js';
import { AUTONOMOUS_AIR_RULESET_IDS } from '../dist/rulesets.js';
import { encodeBattle, decodeBattle } from '../dist/battle-codec.js';
const ids=AUTONOMOUS_AIR_RULESET_IDS;
const maps={...MAPS,...INTRO_MAPS};
const step=(g,n=1)=>{for(let i=0;i<n;i++)g.update(.05);};
const producers={gryphon:'aerie',archer:'archery',warrior:'barracks',rootwarden:'wardenLodge',wizard:'sanctum',siege:'foundry'};
function fixture(mapId='classic',side=0,lane=0,id=ids[0]){
  const g=new Game({rulesetId:id,mapId,ai:false,seed:958});g.state.buildings=[];g.state.effects=[];g.state.gold=[3000,3000];
  const b=g.build('aerie',worldX(g.map,side,1250),g.map.lanes[lane],side).building;assert.ok(b);g._spawn(b);const u=g.state.units.at(-1);u.y=g.map.lanes[lane];u.cooldown=0;g.state.buildings=[];return {g,u,b};
}
function enemy(g,type,side,lane,x,y=g.map.lanes[lane]){
  g._spawn({type:producers[type],side,lane,x:x+(side?48:-48),level:1});const u=g.state.units.at(-1);u.x=x;u.y=y;u.cooldown=0;return u;
}
function resume(g,ticks=40){g.update(.017);const saved=g.serialize(),r=Game.restore(saved);validateEngineFields(saved);assert.deepEqual(r.serialize(),saved);for(let i=0;i<ticks;i++){g.update(.05);r.update(.05);assert.deepEqual(r.serialize(),g.serialize());}return r;}

test('automatic-air identities preserve all stats and the legacy constructor and reject all manual commands without mutation',()=>{
  assert.equal(DEFAULT_SKIRMISH_RULESET_ID,'frontier-citadel-open');assert.equal(new Game().ruleset.id,'frontier-legacy');
  for(const id of ids){const r=RULESETS[id];assert.equal(r.experimental,undefined);assert.equal(r.units,RULESETS['frontier-rootwarden-open'].units);assert.equal(r.buildings,RULESETS['frontier-rootwarden-open'].buildings);assert.ok(Object.isFrozen(r.movement.autonomousAir));assert.equal(supportsFlightOrders(r),false);assert.equal(supportsAutonomousAir(r),true);assert.equal(r.endgame.forcedDecay,id===ids[1]);
    const {g,b}=fixture('classic',0,0,id),before=g.serialize();for(const to of [0,1,2,null,'1',NaN])assert.equal(g.setFlightPlan(b.id,to).ok,false);assert.deepEqual(g.serialize(),before);assert.equal(b.flightPlan,undefined);assert.equal(g.state.units[0].airRoute,undefined);}
  assert.equal(supportsAutonomousAir({...RULESETS[ids[0]]}),false);
});

test('every adjacent map/side direction acquires physically, never attacks at perception distance or moves faster',()=>{
  let cases=0;
  for(const [mapId,map] of Object.entries(maps))for(const side of [0,1])for(let from=0;from<map.lanes.length;from++)for(let to=0;to<map.lanes.length;to++)if(Math.abs(from-to)===1){
    const {g,u}=fixture(mapId,side,from);const target=enemy(g,'rootwarden',1-side,to,u.x+70*(side?-1:1));const seed=g.seed,hp=target.hp;
    step(g);assert.equal(u.airTargetId,target.id);assert.equal(target.hp,hp);assert.equal(u.attack,0);
    let attacked=false;for(let i=0;i<160;i++){const x=u.x,y=u.y,before=target.hp,rangeBefore=Math.hypot(target.x-u.x,target.y-u.y);step(g);assert.ok(Math.hypot(u.x-x,u.y-y)<=84*.05+1e-8);assert.equal(u.lane,laneFor(g.map,u.y));assert.equal(g.seed,seed);
      if(target.hp<before){assert.ok(rangeBefore<=110+1e-8);attacked=true;break;}}
    assert.ok(attacked,`${mapId}/${side}/${from}->${to}`);assert.ok(Math.abs(u.y-map.lanes[from])>30);assert.ok(target.hp<hp);assert.equal(u.hp,u.maxHp,'ground screen cannot hit air');resume(g);cases++;
  }
  assert.equal(cases,24);
});

test('negative perception, one-road and nonadjacent cases keep physical-road discipline without shortcuts',()=>{
  for(const side of [0,1])for(const kind of ['nonadjacent','too-far','one-road']){
    const {g,u}=fixture(kind==='one-road'?'intro-one-road':'classic',side);const lane=kind==='nonadjacent'?2:kind==='one-road'?0:1;
    const e=enemy(g,'rootwarden',1-side,lane,u.x+(side?-1:1)*(kind==='nonadjacent'?0:301));const hp=e.hp;step(g);
    assert.equal(u.airTargetId,null);assert.equal(u.y,g.map.lanes[0]);assert.equal(e.hp,hp);
  }
  // A very close same-road unit is noticed on the one-road map.
  const {g,u}=fixture('intro-one-road');const e=enemy(g,'rootwarden',1,0,u.x+140);step(g);assert.equal(u.airTargetId,e.id);resume(g);
});

test('living locks survive nearer distractions; death continues locally from the nearest road',()=>{
  for(const side of [0,1]){
    const {g,u}=fixture('classic',side,0),e=enemy(g,'rootwarden',1-side,1,u.x+80);step(g,10);assert.equal(u.airTargetId,e.id);
    const distraction=enemy(g,'warrior',1-side,0,u.x+15,u.y);for(let i=0;i<20;i++){step(g);assert.equal(u.airTargetId,e.id);}
    g._damage(distraction,distraction.hp,side);step(g,15);assert.equal(u.lane,1);
    const next=enemy(g,'rootwarden',1-side,2,u.x,g.map.lanes[2]);const y=u.y;g._damage(e,e.hp,side);step(g);
    assert.equal(u.airTargetId,next.id,'physically reaching road 1 makes road 2 adjacent');assert.ok(u.y>=y,'no return to birth road');resume(g);
  }
});

test('actual-distance escape clears a lock without a return phase or snap',()=>{
  const {g,u}=fixture();const e=enemy(g,'rootwarden',1,1,u.x+80);step(g,35);const lane=u.lane,x=u.x,y=u.y;e.x=u.x+430;step(g);
  assert.equal(u.airTargetId,null);assert.equal(u.lane,lane);assert.ok(Math.hypot(u.x-x,u.y-y)<=4.2+1e-8);assert.equal(Object.hasOwn(u,'airFocus'),false);resume(g,4);
});

test('physically nearby flyers defend reciprocally across a nearest-road boundary',()=>{
  const {g,u}=fixture();u.x=1500;u.y=540;u.lane=1;u.cooldown=0;
  const guard=enemy(g,'gryphon',1,2,1500,550);guard.cooldown=0;const hp=u.hp,guardHP=guard.hp;step(g);
  assert.equal(u.hp,hp-17);assert.equal(guard.hp,guardHP-17);assert.equal(u.airTargetId,guard.id);assert.equal(guard.airTargetId,u.id);resume(g,5);
});

test('anti-air uses real distance in every gap and stays on its own road; ground-only troops never attack air',()=>{
  for(const side of [0,1])for(const lane of [0,1])for(const type of ['archer','gryphon','warrior','rootwarden','wizard','siege']){
    const {g,u}=fixture('classic',side);u.y=355;u.lane=laneFor(g.map,u.y);u.cooldown=20;
    const a=enemy(g,type,1-side,lane,u.x+10),hp=u.hp,d=g.units[type];const distance=Math.hypot(a.x-u.x,a.y-u.y);step(g);assert.equal(u.hp<hp,d.canAttackAir&&distance<=d.range,`${side}/${lane}/${type}`);
    if(!d.flying)assert.equal(a.y,g.map.lanes[lane]);
  }
  const {g,u}=fixture();u.y=355;u.lane=laneFor(g.map,u.y);const a=enemy(g,'archer',1,1,u.x+230),hp=u.hp;step(g);assert.equal(u.hp,hp);assert.equal(a.y,g.map.lanes[1]);
  assert.ok(a.x<u.x+230,'archer may close longitudinally without walking across roads');
});

test('tower and paid volley damage still reaches off-road flyers at unchanged physical range',()=>{
  for(const side of [0,1]){
    const {g,u}=fixture('classic',side);u.y=355;u.lane=laneFor(g.map,u.y);
    // Legal paid tower site, with flyer on the battlefield gap just within reach.
    u.x=worldX(g.map,1-side,1450);const built=g.build('watchtower',worldX(g.map,1-side,1250),g.map.lanes[1],1-side);assert.equal(built.ok,true);assert.equal(g.state.gold[1-side],2780);const hp=u.hp;step(g);assert.equal(u.hp,hp-29);
    g.state.gold[1-side]=75;const before=u.hp;assert.equal(g.cast(u.x,u.y,1-side).ok,true);assert.equal(u.hp,Math.max(0,before-92));assert.equal(g.state.gold[1-side],u.hp===0?2:0);
  }
});

test('strict saves resume idle, acquisition, pursuit, combat, death, escape and fractional accumulator states',()=>{
  for(const id of ids)for(const side of [0,1]){
    const {g,u}=fixture('classic',side,0,id);resume(g,2);
    const e=enemy(g,'rootwarden',1-side,1,u.x+20);step(g,4);assert.notEqual(u.airTargetId,null);resume(g,3);step(g,30);resume(g,3);
    g._damage(e,e.hp,side);assert.equal(u.airTargetId,null);resume(g,3);step(g,100);resume(g,3);
    if(id!==ids[2])assert.deepEqual(decodeBattle(encodeBattle(g)).game.serialize(),g.serialize());
  }
});

test('malformed target metadata and foreign policy fields reject without touching inputs',()=>{
  const {g,u}=fixture();enemy(g,'rootwarden',1,1,u.x+40);step(g);const saved=g.serialize();
  for(const mutate of [s=>delete s.state.units[0].airTargetId,s=>s.state.units[0].airTargetId={},s=>s.state.units[0].airTargetId=999,s=>s.state.units[0].airTargetId=s.state.units[0].id,s=>s.state.units[0].airTargetId='1',s=>s.state.units[0].lane=2,s=>s.state.units[1].hp=0,s=>s.state.units[0].airRoute={},s=>s.state.units[0].airFocus={},s=>s.state.units[1].airTargetId=null,s=>s.rulesetId='frontier-rootwarden-open',s=>s.state.units[1].x=s.state.units[0].x+500]){
    const s=structuredClone(saved);mutate(s);const copy=structuredClone(s);assert.throws(()=>Game.restore(s));assert.deepEqual(s,copy);
  }
});

test('spawn RNG remains identical and side caps, terminal state and long-session guards freeze safely',()=>{
  const {g,b}=fixture(),other=new Game({rulesetId:'frontier-rootwarden-open',ai:false,seed:958});other.state.buildings=[];other.state.gold=[3000,3000];const b2=other.build('aerie',1250,260).building;other._spawn(b2);assert.equal(g.seed,other.seed);assert.equal(g.state.units[0].cooldown,0);
  for(let i=1;i<70;i++)g._spawn(b);assert.equal(g.state.units.length,70);const before=g.serialize();g._spawn(b);assert.deepEqual(g.serialize(),before);assert.doesNotThrow(()=>Game.restore(g.serialize()));
  for(const mode of ['terminal','time','tick','gold','id']){const {g}=fixture();if(mode==='terminal'){g.state.bases[1].hp=0;g.state.winner=0;}if(mode==='time')g.state.time=g.ruleset.limits.maxTime;if(mode==='tick')g.tick=g.ruleset.limits.maxTick;if(mode==='gold')g.state.gold[0]=g.ruleset.limits.maxCounter-g.ruleset.limits.headroom+1;if(mode==='id')g.nextId=g.ruleset.limits.maxId-g.ruleset.limits.headroom+1;const s=g.serialize();g.update(.05);assert.deepEqual(g.serialize(),s);assert.equal(g.setFlightPlan(1,0).ok,false);}
});

test('paid producers prove adjacent damage, real archer/tower counters and exactly mirrored outcomes',()=>{
  const outcomes=[];
  for(const side of [0,1])for(const defender of ['barracks','archery','watchtower']){
    const g=new Game({rulesetId:ids[0],ai:false,seed:958});g.state.buildings=[];g.state.effects=[];g.state.gold=[1000,1000];
    assert.equal(g.build('aerie',worldX(g.map,side,1250),g.map.lanes[0],side).ok,true);
    assert.equal(g.build(defender,worldX(g.map,1-side,1250),g.map.lanes[1],1-side).ok,true);
    assert.equal(g.state.gold[side],750);assert.equal(g.state.gold[1-side],1000-g.buildings[defender].cost);
    let firstId=null,firstDead=false,sawPursuit=false;
    for(let i=0;i<900;i++){step(g);const u=g.state.units.find(u=>u.type==='gryphon'&&u.side===side);if(u){firstId??=u.id;sawPursuit||=u.airTargetId!==null;}if(firstId&&!g.state.units.some(u=>u.id===firstId))firstDead=true;}
    if(defender==='barracks'){assert.equal(sawPursuit,true);assert.equal(firstDead,false);assert.equal(g.state.stats.kills[side],4);assert.equal(g.state.stats.damage[1-side],0);}
    else {assert.equal(firstDead,true);assert.equal(g.state.stats.kills[1-side],3);}
    assert.doesNotThrow(()=>Game.restore(g.serialize()));outcomes.push({side,defender,kills:[g.state.stats.kills[side],g.state.stats.kills[1-side]],damage:[g.state.stats.damage[side],g.state.stats.damage[1-side]],gold:[g.state.gold[side],g.state.gold[1-side]]});
  }
  for(let i=0;i<3;i++)assert.deepEqual({...outcomes[i],side:1},outcomes[i+3]);
});

test('a paid between-tick volley clears killed target references immediately and saves deterministically',()=>{
  const {g,u}=fixture();const e=enemy(g,'archer',1,1,u.x+20);step(g);assert.equal(u.airTargetId,e.id);assert.equal(g.cast(e.x,e.y).ok,true);assert.equal(e.hp,0);assert.equal(u.airTargetId,null);resume(g,20);
  const saved=g.serialize();const alive=g.state.units.find(x=>x.id===u.id);if(alive){const bad=structuredClone(saved);bad.state.units[0].airTargetId=999;assert.throws(()=>Game.restore(bad));}
});

test('140-unit cap uses deterministic bounded nearest scans without spawn draws or unbounded path work',()=>{
  const g=new Game({rulesetId:ids[0],ai:false,seed:44});g.state.buildings=[];g.state.effects=[];
  for(const side of [0,1])for(let i=0;i<70;i++){const u=enemy(g,'gryphon',side,i%3,side?1690:1510);u.cooldown=20;}
  const seed=g.seed,saved=g.serialize(),copy=Game.restore(saved);assert.equal(g.state.units.length,140);
  let maxDistances=0;const hypot=Math.hypot;
  for(let i=0;i<180;i++){
    let distances=0;Math.hypot=(...args)=>{distances++;return hypot(...args);};try{step(g);}finally{Math.hypot=hypot;}maxDistances=Math.max(maxDistances,distances);step(copy);
    assert.deepEqual(copy.serialize(),g.serialize());assert.equal(g.state.units.length,140);assert.equal(g.seed,seed);
  }
  assert.ok(maxDistances<50000,`bounded distance work per step: ${maxDistances}`);assert.doesNotThrow(()=>Game.restore(g.serialize()));
});

test('paid Warden encounters do not periodically abandon living nearby targets under either starting economy',()=>{
  for(const side of [0,1])for(const standardStart of [false,true]){
    const g=new Game({rulesetId:ids[0],ai:false,seed:958});if(!standardStart){g.state.buildings=[];g.state.effects=[];g.state.gold=[1000,1000];}
    assert.equal(g.build('aerie',worldX(g.map,side,1250),g.map.lanes[0],side).ok,true);
    assert.equal(g.build('wardenLodge',worldX(g.map,1-side,1250),g.map.lanes[1],1-side).ok,true);
    let firstId=null,trackedTicks=0,deadTargetReleases=0,finalRoad=0;
    for(let i=0;i<2400&&g.state.winner===null;i++){
      const flyer=g.state.units.find(u=>u.id===firstId),previous=flyer&&g.state.units.find(u=>u.id===flyer.airTargetId);
      step(g);const current=g.state.units.find(u=>u.type==='gryphon'&&u.side===side);firstId??=current?.id??null;
      if(flyer&&g.state.units.includes(flyer)){trackedTicks++;finalRoad=flyer.lane;
        if(previous&&previous.hp>0&&Math.hypot(previous.x-flyer.x,previous.y-flyer.y)<=420&&Math.abs(laneFor(g.map,previous.y)-flyer.lane)<=1)assert.equal(flyer.airTargetId,previous.id,'living reachable lock never drops on a world-space timer');
        if(previous&&previous.hp===0)deadTargetReleases++;
      }
      if(i%199===0)assert.deepEqual(Game.restore(g.serialize()).serialize(),g.serialize());
    }
    assert.ok(trackedTicks>1000);assert.ok(deadTargetReleases>0);assert.equal(finalRoad,1);assert.ok(g.state.stats.damage[side]>1000);
  }
});

test('ground anti-air ignores unreachable road gaps, retains reachable interceptions and never oscillates around a zero-distance movement goal',()=>{
  for(const side of [0,1]){
    const {g,u}=fixture('twin-span',side,0);u.x=1600;u.y=340;u.lane=0;u.cooldown=20;
    const bait=enemy(g,'rootwarden',1-side,0,1600);u.airTargetId=bait.id;
    const a=enemy(g,'archer',1-side,1,1600);const x=a.x;step(g);assert.ok((a.x-x)*(a.side?-1:1)>0,'unreachable flyer does not stall ordinary forward movement');assert.equal(a.y,560);
    // Bring the flyer into the reachable gap. Acquisition may close only x.
    u.x=1600;u.y=365;u.lane=0;u.airTargetId=null;a.x=1400;const beforeY=a.y;step(g);assert.ok(a.x>1400);assert.equal(a.y,beforeY);
    // Exact lateral range admits an already-in-range shot at equal x.
    a.x=1600;a.y=560;a.cooldown=0;u.x=1600;u.y=355;u.lane=0;u.cooldown=20;const hp=u.hp;step(g);assert.equal(u.hp,hp-25.5);assert.equal(a.y,560);
  }
});

test('both AI sides use the same automatic flyer targeting, with paid ordinary production and restorable AI timing',()=>{
  for(const mapId of Object.keys(maps)){
    const g=new Game({rulesetId:ids[0],mapId,ai:true,seed:999});g.state.gold=[2000,2000];
    for(const side of [0,1]){const lane=side%g.map.lanes.length;assert.equal(g.build('aerie',worldX(g.map,side,1250),g.map.lanes[lane],side).ok,true);}
    const copy=Game.restore(g.serialize());for(let i=0;i<1600;i++){g.update(.05);copy.update(.05);if(i%40===0)assert.deepEqual(g.serialize(),copy.serialize());}
    assert.deepEqual(g.serialize(),copy.serialize());assert.ok(g.state.units.filter(u=>u.type==='gryphon').every(u=>Object.hasOwn(u,'airTargetId')));assert.ok(g.state.stats.built[1]>2);assert.doesNotThrow(()=>Game.restore(g.serialize()));
  }
});
