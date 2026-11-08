import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,getRuleset,DEFAULT_SKIRMISH_RULESET_ID,FOG_RULESET_ID} from '../dist/engine.js';
import {Game as BaselineGame} from './fixtures/fog-baseline/engine.js';
import {FOG,supportsFog,observe,isPointVisible,refreshFog,sightSnapshot,pointInSight} from '../dist/fog.js';
const clone=v=>JSON.parse(JSON.stringify(v));
const steps=(g,n)=>{for(let i=0;i<n;i++)g.update(.05);};
const producers={warrior:'barracks',archer:'archery',siege:'foundry',wizard:'sanctum',gryphon:'aerie',rootwarden:'wardenLodge'};
function fixture(side=0){const g=new Game({rulesetId:FOG_RULESET_ID,ai:false,seed:91});g.state.buildings=[];g.state.units=[];g.state.effects=[];g.state.projectiles=[];g.state.time=100;g.tick=2000;g.state.gold=[1000,1000];refreshFog(g);return g;}
function unit(g,side,type='warrior',x=1200,y=450){g._spawn({type:producers[type],side,x,y,lane:g.map.lanes.indexOf(y)>=0?g.map.lanes.indexOf(y):1,level:1});const u=g.state.units.at(-1);Object.assign(u,{x,y,lane:g.map.lanes.reduce((best,_,i)=>Math.abs(g.map.lanes[i]-y)<Math.abs(g.map.lanes[best]-y)?i:best,0),cooldown:20});return u;}
const publicView=g=>{const o=observe(g);return {state:o.state,fog:o.fog};};

test('fog identity is explicit, immutable, Classic-only, and default remains unchanged',()=>{
 assert.equal(DEFAULT_SKIRMISH_RULESET_ID,'frontier-citadel-open');assert.equal(supportsFog(new Game().ruleset),false);
 const r=getRuleset(FOG_RULESET_ID);assert.ok(Object.isFrozen(r)&&Object.isFrozen(r.fog));assert.equal(r.endgame.forcedDecay,false);assert.equal(r.economy.policy,'legacy');
 assert.deepEqual(r.units,getRuleset(DEFAULT_SKIRMISH_RULESET_ID).units);assert.deepEqual(r.buildings,getRuleset(DEFAULT_SKIRMISH_RULESET_ID).buildings);
 for(const mapId of ['long-march','twin-span','intro-one-road','intro-two-road'])assert.throws(()=>new Game({rulesetId:FOG_RULESET_ID,mapId}),/fog requires Classic/);
 const restart=new Game({rulesetId:r.id,seed:91});assert.equal(supportsFog(restart.ruleset),true);assert.deepEqual(restart.state.fog.sides.map(s=>s.structures),[[],[]]);
});

test('inclusive circular boundaries are symmetric and use living observers and real coordinates',()=>{
 for(const side of [0,1])for(const type of ['warrior','gryphon']){
  const g=fixture(),u=unit(g,side,type,1600,450),radius=type==='gryphon'?420:320;
  assert.equal(isPointVisible(g,side,1600+radius,450),true);assert.equal(isPointVisible(g,side,1600+radius+1e-6,450),false);
  assert.equal(isPointVisible(g,side,1600+radius*.6,450+radius*.8),true);
  assert.equal(isPointVisible(g,side,1600+radius*.8,450+radius*.8),false);
  u.hp=0;assert.equal(isPointVisible(g,side,1600,450),false);
 }
 const g=fixture();for(const side of [0,1]){const base=g.state.bases[side],direction=side?-1:1;assert.equal(isPointVisible(g,side,base.x+direction*360,base.y),true);assert.equal(isPointVisible(g,side,base.x+direction*(360+1e-6),base.y),false);}
 const a=unit(g,0,'warrior',1200),b=unit(g,0,'warrior',1500);assert.equal(isPointVisible(g,0,1800,450),true);b.hp=0;assert.equal(isPointVisible(g,0,1800,450),false);a.hp=0;assert.equal(isPointVisible(g,0,1200,450),false);
});

test('build/sale and observer death refresh contact; moving enemy leaves no remembered troop',()=>{
 const g=fixture();g.state.gold[0]=1000;assert.equal(g.build('watchtower',1250,450).ok,true);const e=unit(g,1,'archer',1500);refreshFog(g);assert.ok(observe(g).state.units.some(u=>u.id===e.id));
 const owned=g.state.buildings[0];assert.ok(g.sell(owned.id).ok);assert.equal(observe(g).state.units.length,0);assert.deepEqual(observe(g).fog.memories,[]);
 const scout=unit(g,0,'warrior',1450);refreshFog(g);assert.equal(observe(g).state.units.length,2);scout.hp=0;refreshFog(g);assert.equal(observe(g).state.units.length,0);
});

test('building memory freezes type/level/time, survives hidden upgrade/death/sale, and empty re-observation clears',()=>{
 for(const change of ['upgrade','death','sale']){
  const g=fixture(),scout=unit(g,0,'gryphon',2150),b=g._place('archery',2300,450,1);refreshFog(g);const recorded=clone(g.state.fog.sides[0].structures[0]);assert.equal(observe(g).fog.memories.length,0);
  scout.x=1000;refreshFog(g);g.state.time+=1;g.tick+=20;
  if(change==='upgrade')assert.ok(g.upgrade(b.id,1).ok);else if(change==='sale')assert.ok(g.sell(b.id,1).ok);else {g._damage(b,b.hp,0);g.state.buildings=g.state.buildings.filter(e=>e.hp>0);refreshFog(g);}
  const memory=observe(g).fog.memories[0];assert.deepEqual(memory,recorded);assert.equal('hp' in memory,false);assert.equal('progress' in memory,false);
  scout.x=2150;refreshFog(g);
  if(change==='upgrade'){assert.equal(observe(g).state.buildings.find(e=>e.id===b.id).level,2);assert.equal(g.state.fog.sides[0].structures[0].level,2);}else assert.deepEqual(g.state.fog.sides[0].structures,[]);
 }
});

test('replacement is a new observation and never recycles a stale memory target ID',()=>{
 const g=fixture(),scout=unit(g,0,'gryphon',2150),b=g._place('archery',2300,450,1);refreshFog(g);scout.x=1000;refreshFog(g);g.sell(b.id,1);const replacement=g._place('aerie',2300,450,1);refreshFog(g);
 assert.equal(observe(g).fog.memories[0].id,b.id);scout.x=2150;refreshFog(g);assert.deepEqual(g.state.fog.sides[0].structures.map(b=>b.id),[replacement.id]);assert.equal(observe(g).state.buildings.at(-1).type,'aerie');
});

test('memory is bounded with deterministic oldest/id eviction',()=>{
 const g=fixture(),scout=unit(g,0,'gryphon',2900),r=g.state.fog.sides[0];
 r.structures=Array.from({length:64},(_,i)=>({id:g.nextId++,type:'barracks',side:1,x:2000+i,y:260,lane:0,level:1,observedAt:0}));
 const oldest=r.structures[0].id,b=g._place('watchtower',2900,450,1);refreshFog(g);assert.equal(r.structures.length,64);assert.equal(r.structures.some(m=>m.id===oldest),false);assert.equal(r.structures.some(m=>m.id===b.id),true);assert.deepEqual(Game.restore(g.serialize()).serialize(),g.serialize());
});

test('observation is detached and read-only, hides private enemy fields/resources and unseen citadel status',()=>{
 const g=fixture(),scout=unit(g,0,'gryphon',2100),enemy=unit(g,1,'gryphon',2250),b=g._place('aerie',2300,450,1);enemy.airTargetId=scout.id;refreshFog(g);const before=g.serialize(),o=observe(g);
 for(let i=0;i<5;i++)observe(g);assert.deepEqual(g.serialize(),before);assert.equal(o.state.gold[1],null);assert.equal(o.state.bases[1].hp,null);assert.deepEqual(o.state.citadelOptions.sides[1],{choice:null});
 const publicEnemy=o.state.units.find(e=>e.id===enemy.id);assert.equal(publicEnemy.airTargetId,undefined);assert.equal(publicEnemy.cooldown,0);assert.equal(publicEnemy.attack,0);assert.equal(o.state.buildings.find(e=>e.id===b.id).progress,0);
 o.state.units[0].hp=1;o.fog.observers[0].x=999;assert.deepEqual(g.serialize(),before);assert.equal(o.serialize,undefined);assert.equal(o.seed,undefined);assert.equal(o.canBuild,undefined);
});

test('hidden state differential preserves view, Front, AI choices, Volley and RNG before physical interaction',()=>{
 for(const difficulty of ['easy','normal','hard'])for(const side of [0,1]){
  const a=fixture();a.difficulty=difficulty;a.state.gold=[2200,2200];a.state.time=150;a.tick=3000;
  a._place('barracks',side?2350:850,260,side);a._place('archery',side?2350:850,450,side);a._place('barracks',side?2350:850,640,side);
  const enemy=a._place('barracks',side?270:2930,260,1-side);refreshFog(a);const b=Game.restore(a.serialize()),changed=b.state.buildings.find(e=>e.id===enemy.id);
  Object.assign(changed,{type:'watchtower',hp:1000,maxHp:1000,progress:0,invested:220});b.state.gold[1-side]=3;b.state.bases[1-side].hp=5000;b.state.citadelOptions.sides[1-side].choice='arrows';b.state.citadelOptions.sides[1-side].purchasedAt=0;b.state.citadelOptions.sides[1-side].purchasedTick=0;
  refreshFog(b);assert.deepEqual(observe(a,side),observe(b,side));a._ai(side);b._ai(side);
  assert.equal(a.seed,b.seed);assert.deepEqual(a.state.buildings.filter(e=>e.side===side),b.state.buildings.filter(e=>e.side===side));assert.equal(a.state.gold[side],b.state.gold[side]);assert.equal(a.state.spellCooldown[side],b.state.spellCooldown[side]);assert.deepEqual(a.state.citadelOptions.sides[side],b.state.citadelOptions.sides[side]);
 }
});

test('hidden structures cannot steer movement or get direct attacks; known enemy citadel remains destination',()=>{
 const a=fixture(),u=unit(a,0,'warrior',1400,450);a._place('barracks',2600,500,1);refreshFog(a);const b=Game.restore(a.serialize());Object.assign(b.state.buildings[0],{x:2500,y:380});refreshFog(b);steps(a,1);steps(b,1);assert.deepEqual(a.state.units.find(e=>e.id===u.id),b.state.units.find(e=>e.id===u.id));assert.ok(a.state.units[0].x>1400);
});

test('Volley rejects hidden centers without any mutation and visible-center splash stays ordinary without impact leaks',()=>{
 const g=fixture(),scout=unit(g,0,'warrior',1200),target=unit(g,1,'archer',1550);target.hp=60;refreshFog(g);const before=g.serialize();assert.equal(g.cast(1600,450).code,'fog-hidden-aim');assert.deepEqual(g.serialize(),before);
 assert.equal(isPointVisible(g,0,target.x,target.y),false);const gold=g.state.gold[0];assert.ok(g.cast(1510,450).ok);assert.equal(target.hp,0);assert.equal(g.state.gold[0],gold-75+2);assert.equal(g.state.spellCooldown[0],25);
 const o=observe(g);assert.equal(o.state.units.some(u=>u.id===target.id),false);assert.equal(o.state.effects.some(e=>e.type==='death'&&e.x===1550),false);assert.ok(o.state.effects.some(e=>e.type==='volley'));assert.deepEqual(o.state.projectiles,[]);
});

test('hidden events never replay on later reveal, observable events retain stable presentation IDs',()=>{
 const g=fixture(),scout=unit(g,0,'warrior',1200);g.state.effects=[];g._effect(1600,450,'death',1,.7);g._effect(1200,450,'build',0,.7);refreshFog(g);
 const initial=observe(g).state.effects;assert.equal(initial.length,1);assert.equal(initial[0].fogSeen,undefined);assert.equal(observe(g).state.effects[0].eventId,initial[0].eventId);scout.x=1500;refreshFog(g);assert.equal(observe(g).state.effects.some(e=>e.x===1600),false);
});

test('flyers acquire at 300, retain through 420 and release beyond without expanding attack permissions',()=>{
 for(const distance of [300,300.001,420,420.001]){
  const g=fixture(),flyer=unit(g,0,'gryphon',1500),target=unit(g,1,'archer',1500+distance);target.cooldown=20;
  if(distance>=420)flyer.airTargetId=target.id;refreshFog(g);assert.equal(isPointVisible(g,0,target.x,target.y),distance<=420);steps(g,1);
  assert.equal(flyer.airTargetId===target.id,distance===300||distance===420);
 }
 const g=fixture(),warrior=unit(g,0,'warrior',1600),air=unit(g,1,'gryphon',1620);warrior.cooldown=0;refreshFog(g);const hp=air.hp;steps(g,1);assert.equal(air.hp,hp);
});

test('both sides capture memory symmetrically and citadel choice remembers no hidden counters',()=>{
 for(const side of [0,1]){
  const g=fixture(),x=side?300:2900,scout=unit(g,side,'gryphon',x);g.buyCitadelOption('regen',1-side);refreshFog(g);
  const o=observe(g,side);assert.equal(o.state.bases[1-side].hp,6000);assert.deepEqual(o.state.citadelOptions.sides[1-side],{choice:'regen'});scout.x=1600;refreshFog(g);g.state.bases[1-side].hp=4500;
  assert.equal(observe(g,side).state.bases[1-side].hp,null);assert.deepEqual(observe(g,side).fog.rememberedCitadel,{choice:'regen',observedAt:100});
 }
});

test('serialize/restore preserves memory and exact deterministic continuation across normal frame batches',()=>{
 const g=new Game({rulesetId:FOG_RULESET_ID,seed:123,ai:true});steps(g,1600);const r=Game.restore(g.serialize());assert.deepEqual(r.serialize(),g.serialize());
 for(let i=0;i<500;i++){const dt=i%3===0?.1:.05;g.update(dt);r.update(dt);if(i%100===0)assert.deepEqual(r.serialize(),g.serialize());}assert.deepEqual(r.serialize(),g.serialize());
});

test('malformed/oversized/recycled knowledge and cross-identity fog fields reject without changing input',()=>{
 const g=fixture(),scout=unit(g,0,'gryphon',2150),b=g._place('archery',2300,450,1);refreshFog(g);scout.x=1000;refreshFog(g);const valid=g.serialize();
 const mutations=[d=>delete d.state.fog,d=>d.state.fog.extra=1,d=>d.state.fog.version=2,d=>d.state.fog.sides.pop(),d=>d.state.fog.sides[0].extra=1,
 d=>d.state.fog.sides[0].structures.push(clone(d.state.fog.sides[0].structures[0])),d=>d.state.fog.sides[0].structures[0].id=d.nextId,d=>d.state.fog.sides[0].structures[0].id=scout.id,d=>d.state.fog.sides[0].structures[0].side=0,d=>d.state.fog.sides[0].structures[0].type='gryphon',d=>d.state.fog.sides[0].structures[0].x=NaN,d=>d.state.fog.sides[0].structures[0].x=3201,d=>d.state.fog.sides[0].structures[0].observedAt=101,d=>d.state.fog.sides[0].structures[0].level=4,d=>d.state.fog.sides[0].structures[0].hp=1,d=>d.state.fog.sides[0].structures=Array.from({length:65},()=>clone(d.state.fog.sides[0].structures[0])),d=>d.state.fog.sides[0].citadel={choice:'regen',observedAt:101},d=>d.state.effects[0].fogSeen=4,d=>d.state.effects[0].fogSeen=0,d=>d.state.effects=Array.from({length:129},()=>({...d.state.effects[0],fogSeen:1})),d=>d.state.projectiles.push({x:110,y:450,sx:110,sy:450,tx:200,ty:450,side:0,type:'tower',sourceAir:false,targetAir:false,fogSeen:1,life:.28,maxLife:.28}),d=>d.mapId='long-march'];
 for(const mutate of mutations){const bad=clone(valid);mutate(bad);const before=structuredClone(bad);assert.throws(()=>Game.restore(bad));assert.deepEqual(bad,before);}
 for(const rulesetId of ['frontier-legacy','frontier-citadel-open']){const bad=new Game({rulesetId}).serialize();bad.state.fog=valid.state.fog;assert.throws(()=>Game.restore(bad));}
 const oldIdentity=clone(valid);oldIdentity.rulesetId='frontier-citadel-open';assert.throws(()=>Game.restore(oldIdentity));
 assert.throws(()=>BaselineGame.restore(valid),/Unknown|unknown/);
});

test('terminal observation reveals only after an actual ended state; pause/draw frequency never reveals',()=>{
 const g=fixture();assert.equal(observe(g).state.bases[1].hp,null);const before=g.serialize();for(let i=0;i<20;i++)observe(g);assert.deepEqual(g.serialize(),before);
 g.state.bases[1].hp=0;steps(g,1);assert.equal(g.state.winner,0);const o=observe(g);assert.equal(o.fog.enabled,false);assert.equal(o.fog.revealed,true);assert.equal(o.state.gold[1],g.state.gold[1]);
});

test('all existing rules retain exact default state/RNG under paired native paid scripts',()=>{
 for(const rulesetId of [undefined,'frontier-citadel-open','frontier-citadel-bridge-open','frontier-air-local-timed'])for(const seed of [1,754]){
  const options={seed,ai:true,...(rulesetId?{rulesetId}:{})},a=new Game(options),b=new BaselineGame(options);
  for(let i=0;i<800;i++){if(i%100===0){a._ai(0);b._ai(0);}a.update(.05);b.update(.05);if(i%200===0)assert.deepEqual(a.serialize(),b.serialize());}
  assert.deepEqual(a.serialize(),b.serialize());assert.equal(a.state.fog,undefined);
 }
});


test('fog AI citadel purchase uses own observed threats/health while unknown enemy base stays unknown',()=>{
 for(const side of [0,1])for(const choice of ['arrows','regen']){
  const g=fixture(),base=g.state.bases[side],direction=side?-1:1;g.state.gold[side]=190;
  if(choice==='arrows'){unit(g,1-side,'archer',base.x+direction*100);unit(g,1-side,'warrior',base.x+direction*160);}else base.hp-=150;
  refreshFog(g);assert.equal(observe(g,side).state.bases[1-side].hp,null);g._ai(side);assert.equal(g.state.citadelOptions.sides[side].choice,choice);assert.equal(g.state.gold[side],0);
  const ended=fixture();ended.state.bases[side].hp=5700;ended.state.bases[1-side].hp=0;ended.state.winner=side;ended._ai(side);assert.equal(ended.state.citadelOptions.sides[side].choice,null);
 }
});


test('hidden event saturation cannot evict visible effects, and fog output remains bounded',()=>{
 const a=fixture(),b=Game.restore(a.serialize());a._effect(110,450,'build',0,.7);b._effect(110,450,'build',0,.7);
 const before=observe(a);assert.deepEqual(before,observe(b));
 for(let i=0;i<400;i++)b._effect(3090,450,'hit',1,.2);
 assert.deepEqual(observe(a),observe(b));assert.ok(b.state.effects.length<=256);assert.equal(b.state.effects.filter(e=>e.fogSeen&2).length,128);
 for(let i=0;i<400;i++)b._effect(110,450,'hit',0,.2);
 assert.equal(b.state.effects.length,256);assert.equal(b.state.effects.filter(e=>e.fogSeen&1).length,128);assert.deepEqual(Game.restore(b.serialize()).serialize(),b.serialize());
});

test('nonfog and terminal observer events have stable presentation IDs without changing simulation events',()=>{
 for(const ended of [false,true]){const g=ended?fixture():new Game({ai:false});if(ended){g.state.bases[1].hp=0;g.state.winner=0;}g._effect(110,450,'build',0);const before=g.serialize(),a=observe(g),b=observe(g);assert.ok(a.state.effects.length);assert.ok(a.state.effects.every(e=>typeof e.eventId==='string'));assert.deepEqual(a,b);assert.deepEqual(g.serialize(),before);assert.equal(a.state.fog,undefined);}
});
