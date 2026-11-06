import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
const source=await readFile(new URL('../dist/engine.js',import.meta.url),'utf8');
const {Game,BUILDINGS,UNITS}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
function tick(g,seconds){for(let i=0;i<seconds*20;i++)g.update(.05);}
test('placement and economy are validated without mutating failed requests',()=>{const g=new Game({ai:false});assert.equal(g.state.gold[0],420);assert.equal(g.build('mint',1600,260).ok,false);assert.equal(g.build('mint',410,450).ok,false);assert.equal(g.build('mint',NaN,450).ok,false);assert.equal(g.build('bogus',270,260).ok,false);assert.equal(g.build('toString',270,260).ok,false);assert.equal(g.build('foundry',270,260).ok,true);assert.equal(g.build('foundry',270,640).ok,false);assert.equal(g.state.gold[0],150);});
test('production, ranged attacks, counter modifiers and unit cap',()=>{const g=new Game({ai:false});tick(g,10);assert.equal(g.state.units.length,2);const a=g.state.units[0],b=g.state.units[1];a.x=1500;a.y=450;a.type='archer';a.cooldown=0;b.x=1650;b.y=450;b.cooldown=100;const hp=b.hp;g.update(.05);assert.ok(b.hp<hp);assert.ok(Math.abs(hp-b.hp-UNITS.archer.damage*.55)<.001);assert.equal(g.state.projectiles.length,1);const c=g.state.buildings[0];for(let i=0;i<200;i++)g._spawn(c);assert.equal(g.state.units.filter(u=>u.side===0).length,70);});
test('upgrades and partial refunds obey ownership and level limits',()=>{const g=new Game({ai:false});const b=g.state.buildings[0];assert.equal(g.upgrade(b.id,1).ok,false);g.state.gold[0]=1000;assert.equal(g.upgrade(b.id).ok,true);assert.equal(b.level,2);assert.equal(b.hp,b.maxHp);assert.equal(g.upgrade(b.id).ok,true);assert.equal(g.upgrade(b.id).ok,false);const before=g.state.gold[0];const sold=g.sell(b.id);assert.ok(sold.ok);assert.equal(g.state.gold[0],before+sold.refund);assert.ok(sold.refund<b.invested);assert.equal(g.sell(b.id).ok,false);});
test('spell costs money, damages only enemies, and respects cooldown',()=>{const g=new Game({ai:false});tick(g,10);const [a,b]=g.state.units;b.x=a.x;b.y=a.y;const ahp=a.hp,bhp=b.hp;assert.ok(g.cast(a.x,a.y).ok);assert.equal(a.hp,ahp);assert.ok(b.hp<bhp);assert.equal(g.cast(a.x,a.y).ok,false);assert.ok(g.state.spellCooldown[0]>0);});
test('AI spends real income, builds multiple lanes, and completes a match',()=>{const g=new Game({seed:99});tick(g,120);assert.ok(g.state.stats.built[1]>=4);assert.ok(new Set(g.state.buildings.filter(b=>b.side===1).map(b=>b.lane)).size>=2);assert.ok(g.state.gold[1]>=0);tick(g,480);assert.notEqual(g.state.winner,null);for(const u of g.state.units)assert.ok(Number.isFinite(u.x)&&Number.isFinite(u.y)&&Number.isFinite(u.hp));assert.ok(g.state.units.length<=140);});
test('deterministic seeds and frame subdivision reproduce state',()=>{const a=new Game({seed:45}),b=new Game({seed:45});tick(a,40);for(let i=0;i<400;i++)b.update(.1);assert.deepEqual(a.state,b.state);});
test('base destruction ends simulation and rejects further actions',()=>{const g=new Game({ai:false});g.state.bases[1].hp=0;g.update(.05);assert.equal(g.state.winner,0);const time=g.state.time;g.update(1);assert.equal(g.state.time,time);assert.equal(g.build('mint',270,260).ok,false);});
test('invalid deltas cannot contaminate state',()=>{const g=new Game({ai:false});for(const dt of [NaN,Infinity,-1,0])g.update(dt);assert.equal(g.state.time,0);assert.equal(BUILDINGS.watchtower.unit,null);});

test('economy limits prevent unchecked compounding',()=>{const g=new Game({ai:false});g.state.gold[0]=5000;for(const y of [260,450,640])assert.ok(g.build('mint',270,y).ok);assert.equal(g.build('mint',550,260).ok,false);g.update(.05);assert.equal(g.state.income[0],12.5);});
test('siege can break an isolated tower from outside arrow range',()=>{const g=new Game({ai:false});g.state.buildings=[];g.state.units=[];const tower=g._place('watchtower',1900,450,1);const factory=g._place('foundry',1640,450,0);g._spawn(factory);g.state.buildings=[tower];const siege=g.state.units[0];siege.x=1648;siege.y=450;siege.cooldown=0;const hp=siege.hp;tick(g,35);assert.equal(tower.hp,0);assert.equal(siege.hp,hp);});

test('versioned save roundtrip is independent and deterministic midcombat',()=>{
  const original=new Game({seed:958,difficulty:'hard'});
  original.build('archery',1250,260);original.build('barracks',1250,640);
  tick(original,24);original.update(.017);
  const save=original.serialize(),resumed=Game.restore(JSON.parse(JSON.stringify(save)));
  assert.equal(save.version,1);assert.deepEqual(resumed.serialize(),save);
  resumed.state.gold[0]+=1;assert.notEqual(resumed.state.gold[0],original.state.gold[0]);resumed.state.gold[0]-=1;
  for(let i=0;i<1200;i++){original.update(.05);resumed.update(.05);}
  assert.deepEqual(resumed.serialize(),original.serialize());
});
test('all difficulties restore throughout their full match',()=>{
  for(const difficulty of ['easy','normal','hard']){
    let game=new Game({difficulty,seed:148});
    for(let i=0;i<12;i++){tick(game,50);const save=game.serialize();game=Game.restore(save);assert.deepEqual(game.serialize(),save);}
    assert.notEqual(game.state.winner,null);
  }
});
test('corrupt save structures and unsupported versions are rejected clearly',()=>{
  for(const input of [null,[],{},'{}',42,{version:2},undefined])assert.throws(()=>Game.restore(input),/Invalid saved game:/);
  const base=new Game({ai:false});tick(base,10);
  const mutations=[
    d=>d.version=99,d=>d.ai='true',d=>d.seed=-1,d=>d.seed=2**32,d=>d.difficulty='impossible',
    d=>d.accumulator=100,d=>d.tick=1.2,d=>d.aiTimer=Infinity,d=>d.state=null,
    d=>d.state.gold=[100],d=>d.state.gold[0]=-1,d=>d.state.gold[0]=NaN,
    d=>d.state.spellCooldown[1]=26,d=>d.state.income[0]=500,d=>d.state.winner=4,
    d=>d.state.stats.kills[0]=.2,d=>d.state.stats.damage[0]=-1,
    d=>d.state.bases[0].hp=7000,d=>d.state.bases[1].side=0,
    d=>d.state.buildings[0].type='constructor',d=>d.state.buildings[0].level=4,
    d=>d.state.buildings[0].maxHp=999,d=>d.state.buildings[0].progress=-.5,
    d=>d.state.buildings[0].x=2500,d=>d.state.buildings[0].lane=2,
    d=>d.state.units[0].hp=-1,d=>d.state.units[0].type='dragon',d=>d.state.units[0].x=-1,
    d=>d.state.units[0].id=d.state.buildings[0].id,d=>d.nextId=1,
    d=>d.state.units.push(...Array(150).fill(d.state.units[0])),
    d=>d.state.effects.push({type:'script'}),d=>d.state.projectiles.push({type:'script'}),
    d=>d.state.winner=0,d=>d.extra=()=>1,
    d=>d.state.extra=JSON.parse('{"__proto__":{"bad":true}}')
  ];
  for(const mutate of mutations){const bad=base.serialize();mutate(bad);assert.throws(()=>Game.restore(bad),/Invalid saved game:/);}
});
test('restoring hostile nesting or excessive arrays is bounded',()=>{
  const d=new Game().serialize();d.extra={};let ref=d.extra;for(let i=0;i<20;i++){ref.child={};ref=ref.child;}
  assert.throws(()=>Game.restore(d),/nested/);
  const huge=new Game().serialize();huge.state.effects=Array(257).fill(null);assert.throws(()=>Game.restore(huge),/limit/);
  const circular=new Game().serialize();circular.extra=circular;assert.throws(()=>Game.restore(circular),/nested/);
});
test('extreme elapsed time is capped and transient visuals have hard limits',()=>{
  const g=new Game({ai:false});g.update(Number.MAX_VALUE);assert.ok(g.state.time<=.25);assert.ok(g.accumulator<.051);
  for(let i=0;i<2000;i++)g._effect(100,100,'hit',0);assert.equal(g.state.effects.length,256);
  tick(g,2);assert.equal(g.state.effects.length,0);
});
test('lethal simultaneous attacks allow both soldiers to strike',()=>{
  const g=new Game({ai:false});tick(g,2);g.state.buildings=[];
  const [a,b]=g.state.units;for(const u of [a,b]){u.hp=10;u.cooldown=0;u.x=1600;u.y=450;u.lane=1;}
  g.update(.05);assert.equal(g.state.units.length,0);assert.deepEqual(g.state.stats.kills,[1,1]);
});
test('invalid action inputs do not change state',()=>{
  const g=new Game({ai:false}),before=g.serialize();
  for(const side of [-1,2,NaN,'0',null]){assert.equal(g.build('barracks',700,260,side).ok,false);assert.equal(g.cast(100,100,side).ok,false);assert.equal(g.upgrade(1,side).ok,false);assert.equal(g.sell(1,side).ok,false);}
  for(const value of [NaN,Infinity,-Infinity,'100',null,undefined]){assert.equal(g.build('barracks',value,260).ok,false);assert.equal(g.cast(100,value).ok,false);}
  assert.deepEqual(g.serialize(),before);
});

function soldier(g,type,side,x,y=450){
  const producer=Object.keys(BUILDINGS).find(k=>BUILDINGS[k].unit===type);
  g._spawn({type:producer,side,x:x-(side?-48:48),y,lane:1,level:1});
  const unit=g.state.units.at(-1);unit.x=x;unit.y=y;unit.cooldown=0;return unit;
}
test('all seven structures are producible, upgradeable, sellable and saveable',()=>{
  assert.equal(Object.keys(BUILDINGS).length,7);
  for(const type of Object.keys(BUILDINGS)){
    const g=new Game({ai:false});g.state.gold[0]=10000;
    const {building:b,ok}=g.build(type,1200,260);assert.ok(ok);assert.ok(g.upgrade(b.id).ok);
    tick(g,2);if(BUILDINGS[type].unit)assert.ok(g.state.units.some(u=>u.type===BUILDINGS[type].unit));
    assert.deepEqual(Game.restore(g.serialize()).serialize(),g.serialize());assert.ok(g.sell(b.id).ok);
  }
});
test('ground melee ignores airborne targets rather than stopping or chasing them',()=>{
  for(const type of ['warrior','siege','wizard']){
    const g=new Game({ai:false});g.state.buildings=[];
    const ground=soldier(g,type,0,1500),air=soldier(g,'gryphon',1,1490);air.cooldown=100;
    const hp=air.hp;g.update(.05);assert.ok(ground.x>1500,`${type} must advance`);assert.equal(air.hp,hp);
  }
});
test('mixed air and ground targets do not hide valid targets from melee',()=>{
  const g=new Game({ai:false});g.state.buildings=[];
  const warrior=soldier(g,'warrior',0,1500),air=soldier(g,'gryphon',1,1501),ground=soldier(g,'archer',1,1520);
  air.cooldown=ground.cooldown=100;const hp=ground.hp;g.update(.05);
  assert.ok(ground.hp<hp);assert.equal(air.hp,air.maxHp);assert.ok(warrior.attack>0);
});
test('wizard bypasses shields and splashes ground soldiers without hurting flyers',()=>{
  const g=new Game({ai:false});g.state.buildings=[];
  soldier(g,'wizard',0,1500);const primary=soldier(g,'warrior',1,1650),secondary=soldier(g,'archer',1,1660),air=soldier(g,'gryphon',1,1655);
  for(const u of [primary,secondary,air])u.cooldown=100;
  const hp=primary.hp,shp=secondary.hp;g.update(.05);
  assert.equal(hp-primary.hp,24);assert.ok(Math.abs(shp-secondary.hp-15.6)<.001);assert.equal(air.hp,air.maxHp);
  assert.ok(g.state.effects.some(e=>e.type==='magic'));assert.ok(g.state.projectiles.some(p=>p.type==='wizard'));
});
test('siege splash cannot hit airborne soldiers',()=>{
  const g=new Game({ai:false});g.state.buildings=[];soldier(g,'siege',0,1500);
  const ground=soldier(g,'warrior',1,1670),air=soldier(g,'gryphon',1,1680);ground.cooldown=air.cooldown=100;
  g.update(.05);assert.ok(ground.hp<ground.maxHp);assert.equal(air.hp,air.maxHp);
});
test('archers and watchtowers can shoot flying units',()=>{
  const g=new Game({ai:false});g.state.buildings=[];soldier(g,'archer',0,1500);const air=soldier(g,'gryphon',1,1650);air.cooldown=100;
  g.update(.05);assert.equal(air.maxHp-air.hp,25.5);
  g.state.units=g.state.units.filter(u=>u===air);g._place('watchtower',1500,450,0);const hp=air.hp;g.update(.05);assert.ok(air.hp<hp);
});
test('gryphons attack structures with reduced damage',()=>{
  const g=new Game({ai:false});g.state.buildings=[];const target=g._place('mint',1650,450,1);soldier(g,'gryphon',0,1520);
  g.update(.05);assert.ok(Math.abs(target.maxHp-target.hp-10.2)<.001);
});
test('outer-lane warriors must converge before hitting the physical core',()=>{
  const g=new Game({ai:false});g.state.buildings=[];const unit=soldier(g,'warrior',0,3000,260);unit.lane=0;
  const base=g.state.bases[1];base.cooldown=100;g.update(.05);assert.equal(base.hp,base.maxHp);assert.ok(unit.y>260);
  tick(g,4);assert.ok(base.hp<base.maxHp);assert.ok(Math.hypot(unit.x-base.x,unit.y-base.y)<=UNITS.warrior.range+55.1);
});
test('cores retaliate against air and ground attackers',()=>{
  for(const type of ['warrior','gryphon']){const g=new Game({ai:false});g.state.buildings=[];const unit=soldier(g,type,0,2850);unit.cooldown=100;g.update(.05);assert.equal(unit.maxHp-unit.hp,32);}
});
test('wizard and flying combat resumes exactly with new visual types',()=>{
  const g=new Game({ai:false});g.state.buildings=[];soldier(g,'wizard',0,1500);soldier(g,'gryphon',0,1500);soldier(g,'archer',1,1650);soldier(g,'warrior',1,1660);
  g.update(.05);const restored=Game.restore(g.serialize());tick(g,10);tick(restored,10);assert.deepEqual(g.serialize(),restored.serialize());
});

test('simultaneous core destruction is an honest persistent draw',()=>{
  const g=new Game({ai:false});g.state.bases.forEach(b=>b.hp=0);g.update(.05);assert.equal(g.state.winner,'draw');
  assert.deepEqual(Game.restore(g.serialize()).serialize(),g.serialize());const before=g.serialize();g.update(100);assert.deepEqual(g.serialize(),before);
  const invalid=new Game().serialize();invalid.state.winner='draw';assert.throws(()=>Game.restore(invalid),/draw requires/);
});
test('symmetric duels have identical damage and mirrored movement each tick',()=>{
  for(const type of Object.keys(UNITS)){
    const g=new Game({ai:false});g.state.buildings=[];const left=soldier(g,type,0,1500),right=soldier(g,type,1,1700);
    for(let i=0;i<500&&left.hp>0&&right.hp>0;i++){
      g.update(.05);assert.ok(Math.abs(left.x+right.x-3200)<1e-8,`${type}: mirrored movement`);assert.equal(left.hp,right.hp,`${type}: simultaneous attacks`);
    }
  }
});
test('mirrored forward barracks do not reproduce the former left-side sweep',()=>{
  const wins=[0,0];
  for(let seed=1;seed<=40;seed++){
    const g=new Game({ai:false,seed});
    for(let side=0;side<2;side++)for(const y of [260,450,640])assert.ok(g.build('barracks',side?1950:1250,y,side).ok);
    for(let frame=0;frame<12000&&g.state.winner===null;frame++)g.update(.05);
    assert.notEqual(g.state.winner,null);if(typeof g.state.winner==='number')wins[g.state.winner]++;
  }
  assert.ok(wins[0]>=10&&wins[1]>=10,`No directional sweep expected; observed ${wins}`);
});
test('native side-parametric AI produces mirrored fair-cost opening positions',()=>{
  const g=new Game({ai:false,difficulty:'hard'});g._ai(0);g._ai(1);
  const positions=side=>g.state.buildings.filter(b=>b.side===side).map(b=>[b.type,side?3200-b.x:b.x,b.y]).sort();
  assert.deepEqual(positions(0),positions(1));assert.equal(g.state.gold[0],g.state.gold[1]);
  const before=g.serialize();g._ai(8);assert.deepEqual(g.serialize(),before);
});
test('resumed games allocate fresh unique IDs through later building and production',()=>{
  let g=new Game({ai:false});tick(g,20);g=Game.restore(g.serialize());const previous=new Set([...g.state.buildings,...g.state.units].map(e=>e.id));
  const result=g.build('sanctum',1200,260);assert.ok(result.ok);assert.ok(!previous.has(result.building.id));tick(g,25);
  const ids=[...g.state.buildings,...g.state.units].map(e=>e.id);assert.equal(ids.length,new Set(ids).size);assert.ok(g.nextId>Math.max(...ids));
});
test('projectiles identify airborne sources and destinations for rendering',()=>{
  const g=new Game({ai:false});g.state.buildings=[];soldier(g,'archer',0,1500);soldier(g,'gryphon',1,1600);g.update(.05);
  const arrow=g.state.projectiles.find(p=>p.type==='archer'),bolt=g.state.projectiles.find(p=>p.type==='gryphon');
  assert.equal(arrow.sourceAir,false);assert.equal(arrow.targetAir,true);assert.equal(bolt.sourceAir,true);assert.equal(bolt.targetAir,false);
  assert.deepEqual(Game.restore(g.serialize()).serialize(),g.serialize());
});
