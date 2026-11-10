import {FINAL_CHAPTER_MAPS} from '../dist/final-chapter-identities.js';
/** Production flight kernel: no lab engine, schema or global tuning aliases. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, MAPS, RULESETS, flightGateHome, flightGateX, supportsFlightOrders, worldX, validateEngineFields, DEFAULT_SKIRMISH_RULESET_ID } from '../dist/engine.js';
import { CAMPAIGN_RULESET_IDS } from '../dist/rulesets.js';
import { encodeBattle, decodeBattle } from '../dist/battle-codec.js';
import { createBackup, restoreBackup } from '../dist/backup.js';
const ids=['frontier-flight-open','frontier-flight-timed','frontier-campaign-flight'];
const clone=structuredClone;
const advance=(g,seconds)=>{for(let i=0;i<Math.round(seconds*20);i++)g.update(.05);};
function fixture(mapId='classic',side=0,lane=1,rulesetId=ids[0]){
  const g=new Game({rulesetId,mapId,ai:false,seed:958});g.state.buildings=[];g.state.effects=[];g.state.gold[side]=2000;
  const {building:aerie}=g.build('aerie',worldX(g.map,side,1250),g.map.lanes[lane],side);
  assert.ok(aerie);return {g,aerie};
}
function launch(g,aerie,to){assert.equal(g.setFlightPlan(aerie.id,to,aerie.side).ok,true);g._spawn(aerie);return g.state.units.at(-1);}
function enemy(g,type,side,lane,x,y){g._spawn({type:{archer:'archery',gryphon:'aerie',warrior:'barracks',rootwarden:'wardenLodge',wizard:'sanctum',siege:'foundry'}[type],side,x:x+(side?48:-48),lane,level:1});const u=g.state.units.at(-1);u.x=x;u.y=y;u.cooldown=0;return u;}
function phaseFixture(phase,side=0,mapId='classic'){
  const {g,aerie}=fixture(mapId,side,0),u=launch(g,aerie,1);g.state.buildings=[];
  for(let i=0;u.airRoute.phase!==phase&&i<1000;i++)g.update(.05);
  assert.equal(u.airRoute.phase,phase);return {g,u};
}
function rejectsUnchanged(g,fn){const before=g.serialize();assert.equal(fn().ok,false);assert.deepEqual(g.serialize(),before);}

test('historical flight identities and three campaign stages stay immutable as fresh defaults advance',()=>{
  assert.equal(new Game().ruleset.id,'frontier-legacy');assert.equal(DEFAULT_SKIRMISH_RULESET_ID,'frontier-citadel-open');
  assert.deepEqual(CAMPAIGN_RULESET_IDS,['frontier-campaign-watch','frontier-campaign-fork','frontier-campaign-open']);
  for(const id of ids){const r=RULESETS[id];assert.equal(r.revision,1);assert.equal(Object.keys(r.buildings).length,8);assert.equal(r.units.rootwarden.hp,800);assert.equal(r.units.gryphon.speed,84);assert.equal(r.units,RULESETS['frontier-rootwarden-open'].units);assert.equal(r.limits,RULESETS['frontier-rootwarden-open'].limits);assert.deepEqual(r.movement,{policy:'flight-orders-v1',flightOrders:{gateCenterOffset:200,warningSeconds:2,adjacentOnly:true,maxCrossings:1}});assert.equal(r.endgame.forcedDecay,id==='frontier-flight-timed');assert.equal(!!r.campaignOnly,id==='frontier-campaign-flight');assert.throws(()=>r.movement.flightOrders.warningSeconds=1,TypeError);}
  for(const r of Object.values(RULESETS))for(const m of Object.values(MAPS)){const enabled=ids.includes(r.id);assert.equal(supportsFlightOrders(r),enabled);assert.equal(flightGateHome(m,r),enabled?m.width/2-200:null);for(const side of [0,1])assert.equal(flightGateX(m,r,side),enabled?worldX(m,side,m.width/2-200):null);}
  assert.equal(supportsFlightOrders({...RULESETS['frontier-legacy'],combat:{flyingCrossLanes:true}}),false);
});

test('owned live adjacent orders are free, consume no RNG, and reject every malformed request without mutation',()=>{
  for(const id of ids)for(const mapId of Object.keys(MAPS))for(const side of [0,1])for(const lane of MAPS[mapId].lanes.keys()){
    const {g,aerie}=fixture(mapId,side,lane,id);assert.equal(aerie.flightPlan,lane);
    const bad=[()=>g.setFlightPlan(aerie.id,lane,1-side),()=>g.setFlightPlan(aerie.id,lane,2),()=>g.setFlightPlan(aerie.id,lane,'0'),()=>g.setFlightPlan(String(aerie.id),lane,side),()=>g.setFlightPlan(null,lane,side)];
    for(const value of [-1,99,.5,NaN,Infinity,'1',null,undefined,[],{}])bad.push(()=>g.setFlightPlan(aerie.id,value,side));
    for(const to of MAPS[mapId].lanes.keys())if(Math.abs(to-lane)>1)bad.push(()=>g.setFlightPlan(aerie.id,to,side));
    for(const action of bad)rejectsUnchanged(g,action);
    for(let to=Math.max(0,lane-1);to<=Math.min(lane+1,g.map.lanes.length-1);to++){const before=g.serialize();assert.equal(g.setFlightPlan(aerie.id,to,side).ok,true);const after=g.serialize();before.state.buildings[0].flightPlan=to;assert.deepEqual(after,before);}
    const b=g._place('archery',worldX(g.map,side,970),g.map.lanes[lane],side);rejectsUnchanged(g,()=>g.setFlightPlan(b.id,lane,side));aerie.hp=0;rejectsUnchanged(g,()=>g.setFlightPlan(aerie.id,lane,side));
  }
  for(const id of Object.keys(RULESETS).filter(id=>id!=='frontier-campaign-salt-stores'&&id!=='frontier-campaign-archers-quay'&&!ids.includes(id))){const g=new Game({rulesetId:id,ai:false,...(id==='frontier-campaign-borrowed-ground'?{mapId:'borrowed-yard'}:FINAL_CHAPTER_MAPS[id]?{mapId:FINAL_CHAPTER_MAPS[id]}:{})});rejectsUnchanged(g,()=>g.setFlightPlan(1,0));}
});

test('all maps/sides/adjacent routes finish once, use exact mirrored gates and speed, and resume every phase',()=>{
  let routes=0,continuations=0;
  for(const mapId of Object.keys(MAPS))for(const side of [0,1])for(const from of MAPS[mapId].lanes.keys())for(const to of MAPS[mapId].lanes.keys())if(Math.abs(from-to)===1){
    const {g,aerie}=fixture(mapId,side,from),u=launch(g,aerie,to),seen=new Set(),seed=g.seed;g.state.buildings=[];
    for(let frame=0;frame<700;frame++){
      const phase=u.airRoute.phase;
      if(!seen.has(phase)){
        seen.add(phase);g.update(.017);const saved=g.serialize(),restored=Game.restore(saved);assert.equal(saved.version,3);assert.equal(saved.rulesetId,ids[0]);assert.deepEqual(restored.serialize(),saved);validateEngineFields(saved);
        for(let i=0;i<12;i++){g.update(.05);restored.update(.05);assert.deepEqual(g.serialize(),restored.serialize());continuations++;}
      }
      const x=u.x,y=u.y,before=u.airRoute.phase;g.update(.05);assert.doesNotThrow(()=>Game.restore(g.serialize()));assert.equal(g.seed,seed);
      if(['warning','transit'].includes(before)){assert.equal(u.x,x);assert.equal(u.attack,0);assert.ok(Math.abs(u.y-y)<=g.units.gryphon.speed*.05+1e-7);}
      if(u.airRoute.phase==='warning'){assert.equal(u.x,flightGateX(g.map,g.ruleset,side));assert.equal(u.y,g.map.lanes[from]);assert.equal(u.lane,from);}
      if(seen.has('done')&&u.airRoute.phase==='done'){advance(g,1);assert.equal(u.airRoute.phase,'done');assert.equal(u.lane,to);break;}
    }
    assert.deepEqual([...seen],['approach','warning','transit','done']);routes++;
  }
  assert.equal(routes,20);assert.equal(continuations,960);
});

test('warning is exactly forty ticks, transfer uses normal speed and neither phase can attack',()=>{
  for(const mapId of Object.keys(MAPS))for(const side of [0,1]){
    const {g,aerie}=fixture(mapId,side,0),u=launch(g,aerie,1);g.state.buildings=[];u.x=flightGateX(g.map,g.ruleset,side);u.y=g.map.lanes[0];
    const target=enemy(g,'rootwarden',1-side,0,u.x+10,g.map.lanes[0]);target.cooldown=20;const hp=target.hp,x=u.x;
    for(let i=0;i<40;i++){g.update(.05);assert.equal(u.x,x);assert.equal(u.y,g.map.lanes[0]);assert.equal(target.hp,hp);assert.equal(u.attack,0);}
    assert.equal(u.airRoute.phase,'transit');assert.equal(u.airRoute.remaining,0);
    let transitTicks=0;while(u.airRoute.phase==='transit'){g.update(.05);transitTicks++;assert.equal(target.hp,hp);assert.equal(u.attack,0);}
    assert.equal(transitTicks,Math.ceil(Math.abs(g.map.lanes[1]-g.map.lanes[0])/(84*.05)));assert.equal(u.lane,1);assert.equal(u.y,g.map.lanes[1]);
  }
});

test('orders snapshot at launch through upgrades, plan changes, selling and destroyed producers',()=>{
  for(const mapId of Object.keys(MAPS))for(const side of [0,1])for(const loss of ['sell','destroy']){
    const {g,aerie}=fixture(mapId,side,0),u=launch(g,aerie,1),route=clone(u.airRoute);assert.equal(g.setFlightPlan(aerie.id,0,side).ok,true);assert.equal(g.upgrade(aerie.id,side).ok,true);assert.deepEqual(u.airRoute,route);g._spawn(aerie);assert.equal(g.state.units.at(-1).airRoute,undefined);
    if(loss==='sell')g.sell(aerie.id,side);else{g._damage(aerie,aerie.hp,1-side);g.update(.05);}assert.deepEqual(u.airRoute,route);
    const copy=Game.restore(g.serialize());for(let i=0;i<300;i++){g.update(.05);copy.update(.05);assert.deepEqual(g.serialize(),copy.serialize());}assert.equal(u.airRoute.phase,'done');assert.equal(u.lane,1);
  }
});

test('route cap, failed launch, terminal and safety guards preserve gold, RNG and committed orders',()=>{
  for(const side of [0,1]){const {g,aerie}=fixture('classic',side,0);g.setFlightPlan(aerie.id,1,side);for(let i=0;i<70;i++)g._spawn(aerie);assert.equal(g.state.units.length,70);g.setFlightPlan(aerie.id,0,side);const before=g.serialize();g._spawn(aerie);assert.deepEqual(g.serialize(),before);assert.ok(g.state.units.every(u=>u.airRoute.to===1));assert.doesNotThrow(()=>Game.restore(before));
    g.state.bases[1-side].hp=0;g.state.winner=side;rejectsUnchanged(g,()=>g.setFlightPlan(aerie.id,0,side));}
  for(const mode of ['time','tick','gold','id']){const {g,aerie}=fixture();if(mode==='time')g.state.time=g.ruleset.limits.maxTime;if(mode==='tick')g.tick=g.ruleset.limits.maxTick;if(mode==='gold')g.state.gold[0]=g.ruleset.limits.maxCounter-g.ruleset.limits.headroom+1;if(mode==='id')g.nextId=g.ruleset.limits.maxId-g.ruleset.limits.headroom+1;const before=g.serialize();assert.equal(g.setFlightPlan(aerie.id,0).code,'save-safety-limit');assert.deepEqual(g.serialize(),before);}
});

test('committed approach stays on source road and clamps without chasing off-road targets or overshooting',()=>{
  for(const side of [0,1]){const {g,aerie}=fixture('classic',side,1),u=launch(g,aerie,2),gate=flightGateX(g.map,g.ruleset,side);g.state.buildings=[];u.x=gate+(side?1:-1);u.y=g.map.lanes[1];enemy(g,'archer',1-side,1,gate,g.map.lanes[1]-150).cooldown=20;
    g.update(.05);assert.equal(u.x,gate);assert.equal(u.y,g.map.lanes[1]);g.update(.05);assert.equal(u.airRoute.phase,'warning');assert.doesNotThrow(()=>Game.restore(g.serialize()));}
});

test('crossing flyers are targetable by in-range anti-air on both roads, never by Rootwardens or ground-only splash',()=>{
  for(const mapId of Object.keys(MAPS))for(const side of [0,1])for(const lane of [0,1])for(const type of ['archer','gryphon','rootwarden','warrior','wizard','siege']){
    const {g,u}=phaseFixture('transit',side,mapId),d=g.units[type],attacker=enemy(g,type,1-side,lane,u.x+10,g.map.lanes[lane]);
    // Destination gryphons have shorter range: position them physically near the route.
    if(type==='gryphon')attacker.y=u.y+30;const hp=u.hp,foeHP=attacker.hp;g.update(.05);
    const inRange=Math.hypot(attacker.x-u.x,attacker.y-u.y)<=d.range;
    assert.equal(u.hp<hp,d.canAttackAir&&inRange,`${mapId}/${side}/${lane}/${type}`);assert.equal(attacker.hp,foeHP,'transiting flyer never returns fire');
  }
  const {g,u}=phaseFixture('transit');const a=enemy(g,'archer',1,1,u.x+260,g.map.lanes[1]);const hp=u.hp;g.update(.05);assert.equal(u.hp,hp,'acquisition cannot extend ordinary attack range');assert.equal(a.attack,0);
});

test('tower snapshot and paid volleys retain physical range and air vulnerability',()=>{
  for(const phase of ['warning','transit'])for(const side of [0,1]){
    const {g,u}=phaseFixture(phase,side),hp=u.hp;
    // Synthetic near-gateway tower tests kernel snapshot order, not legal build territory.
    const tower=g._place('watchtower',u.x,u.y+239,1-side);tower.cooldown=0;g.update(.05);assert.ok(u.hp<hp);assert.equal(u.attack,0);
    const before=g.state.gold[1-side];g.state.gold[1-side]=500;const targetHP=u.hp;assert.equal(g.cast(u.x,u.y,1-side).ok,true);assert.equal(g.state.spellCooldown[1-side],25);assert.equal(u.hp,Math.max(0,targetHP-92));assert.equal(g.state.gold[1-side],425+(u.hp===0?2:0));assert.ok(before>=0);
    const far=phaseFixture(phase,side);far.g._place('watchtower',far.u.x+241,far.u.y,1-side);const farHP=far.u.hp;far.g.update(.05);assert.equal(far.u.hp,farHP);
  }
});

test('conditional strict shape rejects malformed plans, route ownership, phases, timers and geometry without touching inputs',()=>{
  for(const side of [0,1])for(const phase of ['approach','warning','transit','done']){
    const {g}=phaseFixture(phase,side),saved=g.serialize();
    const invalid=[v=>v.version=4,v=>v.rulesetId='lane-command-1',v=>v.rulesetRevision=2,v=>v.state.units[0].airRoute.extra=1,v=>delete v.state.units[0].airRoute.remaining,v=>v.state.units[0].airRoute=null,v=>v.state.units[0].airRoute.from=99,v=>v.state.units[0].airRoute.to=0,v=>v.state.units[0].airRoute.to=.5,v=>v.state.units[0].airRoute.phase='teleport',v=>v.state.units[0].airRoute.remaining=-1,v=>v.state.units[0].airRoute.remaining=3,v=>v.state.units[0].lane=2];
    if(phase==='approach')invalid.push(v=>v.state.units[0].airRoute.remaining=1,v=>v.state.units[0].x=worldX(g.map,side,1500),v=>v.state.units[0].y=400);
    if(phase==='warning')invalid.push(v=>v.state.units[0].airRoute.remaining=0,v=>v.state.units[0].y+=1);
    if(['warning','transit'].includes(phase))invalid.push(v=>v.state.units[0].x+=1,v=>v.state.units[0].attack=.1);
    if(['transit','done'].includes(phase))invalid.push(v=>v.state.units[0].airRoute.remaining=.1);
    if(phase==='transit')invalid.push(v=>v.state.units[0].y=500,v=>v.state.units[0].y=g.map.lanes[1]);
    for(const mutate of invalid){const value=clone(saved);mutate(value);const before=clone(value);assert.throws(()=>Game.restore(value),`${side}/${phase}`);assert.deepEqual(value,before);}
  }
  const {g,aerie}=fixture('classic',0,0);launch(g,aerie,1);const saved=g.serialize();
  for(const mutate of [v=>delete v.state.buildings[0].flightPlan,v=>v.state.buildings[0].flightPlan=2,v=>v.state.buildings[0].flightPlan='1',v=>v.state.units[0].flightPlan=1,v=>v.state.buildings[0].airRoute={},v=>v.rulesetId='frontier-rootwarden-open']){const value=clone(saved);mutate(value);assert.throws(()=>Game.restore(value));}
  const ground=new Game({rulesetId:ids[0],ai:false});ground._spawn(ground.state.buildings[0]);const bad=ground.serialize();bad.state.units[0].airRoute={from:1,to:0,phase:'approach',remaining:2};assert.throws(()=>Game.restore(bad));const badBuilding=ground.serialize();badBuilding.state.buildings[0].flightPlan=1;assert.throws(()=>Game.restore(badBuilding));
});

test('new skirmish schema3 envelopes resume all phases; lab schema4 is rejected before storage access',()=>{
  for(const phase of ['approach','warning','transit','done']){const {g}=phaseFixture(phase);g.update(.017);const envelope=encodeBattle(g);assert.equal(envelope.version,3);assert.equal(envelope.game.version,3);assert.deepEqual(decodeBattle(envelope).game.serialize(),g.serialize());}
  const backup=JSON.parse(createBackup({getItem:()=>null},{createdAt:'2026-11-06T00:00:00.000Z'}));backup.data.battle={format:'ironroot-save',version:2,challengeId:null,campaignId:null,game:{...fixture().g.serialize(),version:4,ruleset:'lane-command-1'}};
  const ops=[],storage={getItem:k=>ops.push(k),setItem:k=>ops.push(k),removeItem:k=>ops.push(k)};assert.equal(restoreBackup(storage,JSON.stringify(backup)).ok,false);assert.deepEqual(ops,[]);
});

test('new AI observes committed destinations at existing cadence, pays for legal counters and does not read future plans',()=>{
  for(const mapId of Object.keys(MAPS))for(const side of [0,1]){
    const {g,aerie}=fixture(mapId,1-side,0);g.state.gold[side]=175;g.state.time=30;g.state.buildings=g.state.buildings.filter(b=>b!==aerie);
    // Equal paid-position source coverage, then an incoming adjacent route breaks the tie.
    const shifted=Game.restore(g.serialize()),holding=Game.restore(g.serialize());
    for(const game of [shifted,holding]){game.state.gold[side]=175;game._spawn({...aerie,flightPlan:game===shifted?1:0});}
    shifted._ai(side);holding._ai(side);
    const counter=shifted.state.buildings.find(b=>b.side===side);assert.equal(counter?.type,'archery');assert.equal(counter?.lane,1);assert.equal(shifted.state.gold[side],0);assert.equal(holding.state.buildings.find(b=>b.side===side)?.lane,0);assert.doesNotThrow(()=>Game.restore(shifted.serialize()));
    const hidden=fixture(mapId,1-side,0).g,producer=hidden.state.buildings[0];hidden.state.time=30;const copy=Game.restore(hidden.serialize());hidden.setFlightPlan(producer.id,1,1-side);hidden._ai(side);copy._ai(side);const actual=hidden.serialize(),expected=copy.serialize();actual.state.buildings.find(b=>b.id===producer.id).flightPlan=expected.state.buildings.find(b=>b.id===producer.id).flightPlan;assert.deepEqual(actual,expected,'unlaunched opponent orders are not observed');
  }
  const {g,aerie}=fixture();g.ai=true;g.aiTimer=.2;g.state.time=30;g.state.gold[1]=175;launch(g,aerie,0);const restored=Game.restore(g.serialize());for(let i=0;i<8;i++){g.update(.05);restored.update(.05);assert.deepEqual(restored.serialize(),g.serialize());}assert.ok(g.aiTimer>0);assert.ok(g.state.buildings.filter(b=>b.side===1&&b.type==='aerie').every(b=>b.flightPlan===b.lane));
});
