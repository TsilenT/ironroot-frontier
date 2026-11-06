import assert from 'node:assert/strict';
import test from 'node:test';
import {Game,MAPS,WORLD,LANES,getMap,homeX,worldX,buildSites,buildBounds,laneFor,BUILDINGS,UNITS,SPELL,upgradeCost} from '../dist/engine.js';
const newMaps=['long-march','twin-span'];
const clone=x=>JSON.parse(JSON.stringify(x));
function advance(g,seconds){for(let i=0;i<seconds*20&&g.state.winner===null;i++)g.update(.05);}
function empty(mapId,side=1,difficulty='normal'){
  const g=new Game({mapId,ai:false,difficulty,seed:427});g.state.buildings=[];g.state.units=[];g.state.effects=[];g.state.time=60;
  const place=(type,lane,h=1250,owner=side)=>g._place(type,worldX(g.map,owner,h),g.map.lanes[lane],owner);
  const foe=(type,lane,h,owner=1-side)=>unit(g,type,owner,worldX(g.map,side,h),lane);
  return {g,place,foe};
}
function unit(g,type,side,x,lane=0){
  const producer=Object.keys(BUILDINGS).find(k=>BUILDINGS[k].unit===type),y=g.map.lanes[lane];
  g._spawn({type:producer,side,x:x-(side?-48:48),y,lane,level:1});
  const u=g.state.units.at(-1);u.x=x;u.y=y;u.cooldown=0;return u;
}
function legal(g){
  const s=g.state;assert.ok(s.gold.every(n=>Number.isFinite(n)&&n>=0));
  assert.ok(s.units.length<=140);assert.ok(s.effects.length<=256&&s.projectiles.length<=256);
  const ids=[...s.buildings,...s.units].map(e=>e.id);assert.equal(ids.length,new Set(ids).size);
  for(const side of [0,1]){
    const own=s.buildings.filter(b=>b.side===side);assert.ok(own.length<=g.map.buildLimit);assert.ok(own.filter(b=>b.type==='mint').length<=3);assert.ok(s.units.filter(u=>u.side===side).length<=70);
    const sites=buildSites(g.map,side);for(const b of own)assert.ok(sites.some(p=>p.x===b.x&&p.y===b.y&&p.lane===b.lane));
  }
  for(const u of s.units){assert.ok(u.x>=75&&u.x<=g.map.width-75&&u.y>=180&&u.y<=720);assert.ok(u.lane>=0&&u.lane<g.map.lanes.length);}
  assert.deepEqual(Game.restore(g.serialize()).serialize(),g.serialize());
}

test('map registry has exact immutable geometry and independent compatibility globals',()=>{
  assert.deepEqual(Object.keys(MAPS),['classic','long-march','twin-span']);assert.ok(Object.isFrozen(MAPS));
  for(const [id,width,lanes,startingLane,cap] of [['classic',3200,[260,450,640],1,24],['long-march',4000,[260,450,640],1,24],['twin-span',3200,[340,560],0,16]]){
    const map=getMap(id);assert.equal(map.id,id);assert.equal(map.revision,1);assert.equal(map.width,width);assert.equal(map.height,900);assert.deepEqual(map.lanes,lanes);assert.equal(map.startingLane,startingLane);assert.equal(map.buildLimit,cap);
    assert.ok(Object.isFrozen(map)&&Object.isFrozen(map.lanes)&&Object.isFrozen(map.siteColumns));assert.notEqual(map.lanes,LANES);assert.throws(()=>map.width=1,TypeError);assert.throws(()=>map.lanes.push(1),TypeError);
    for(const side of [0,1]){
      assert.deepEqual(buildBounds(map,side),{minX:side?width-1320:200,maxX:side?width-200:1320,minY:180,maxY:720});
      const sites=buildSites(map,side);assert.equal(sites.length,cap);assert.equal(new Set(sites.map(p=>`${p.x}/${p.y}`)).size,cap);
      for(const [i,p] of sites.entries()){assert.equal(homeX(map,side,p.x),map.siteColumns[i%8]);assert.equal(worldX(map,side,homeX(map,side,p.x)),p.x);assert.equal(p.y,lanes[p.lane]);assert.equal(laneFor(map,p.y),p.lane);for(const q of sites.slice(i+1))assert.ok(Math.hypot(p.x-q.x,p.y-q.y)>=108);}
      sites[0].x=123;assert.notEqual(buildSites(map,side)[0].x,123);
    }
    for(let i=0;i<lanes.length-1;i++)assert.equal(laneFor(map,(lanes[i]+lanes[i+1])/2),i);
    const g=new Game({mapId:id});assert.equal(g.map,map);assert.throws(()=>g.map=MAPS.classic,TypeError);assert.throws(()=>delete g.map,TypeError);
    assert.deepEqual(g.state.bases.map(b=>[b.x,b.y]),[[110,450],[width-110,450]]);assert.equal(g.state.frontline,width/2);
    assert.deepEqual(g.state.buildings.map(b=>[b.id,b.x,b.y,b.lane]),[[1,410,lanes[startingLane],startingLane],[2,width-410,lanes[startingLane],startingLane]]);
  }
  assert.deepEqual(WORLD,{width:3200,height:900});assert.deepEqual(LANES,[260,450,640]);
  for(const id of ['',null,0,{},'unknown','constructor','toString','__proto__']){assert.throws(()=>getMap(id),/Unknown battlefield/);assert.throws(()=>new Game({mapId:id}),/Unknown battlefield/);}
});
test('all seven structures build, upgrade, spawn, sell and restore on every new-map owned site',()=>{
  for(const mapId of newMaps)for(const side of [0,1])for(const type of Object.keys(BUILDINGS))for(const site of buildSites(getMap(mapId),side)){
    const {g}=empty(mapId,side);g.state.gold[side]=10000;
    const result=g.build(type,site.x,site.y,side);assert.ok(result.ok,`${mapId}/${side}/${type}/${site.x}/${site.y}`);assert.equal(result.building.lane,site.lane);
    assert.ok(g.upgrade(result.building.id,side).ok);advance(g,2);
    if(BUILDINGS[type].unit){const u=g.state.units[0];assert.equal(u.type,BUILDINGS[type].unit);assert.equal(u.lane,site.lane);assert.ok(Math.abs(u.y-site.y)<=16);}
    legal(g);assert.ok(g.sell(result.building.id,side).ok);legal(g);
  }
});
test('new maps reject non-sites, phantom lanes, occupied taps and opponent territory without side effects',()=>{
  for(const mapId of newMaps)for(const side of [0,1]){
    const g=new Game({mapId,ai:false});g.state.gold[side]=10000;const map=g.map,before=g.serialize();
    for(const [x,y] of [[worldX(map,side,270),450],[worldX(map,side,200),map.lanes[0]],[worldX(map,side,1320),map.lanes[0]],[worldX(map,side,270)+.01,map.lanes[0]],[worldX(map,1-side,270),map.lanes[0]],[worldX(map,side,270),map.lanes[0]+.01],[NaN,map.lanes[0]],[worldX(map,side,410),map.lanes[map.startingLane]]]){
      if(mapId==='long-march'&&y===450&&homeX(map,side,x)===270)continue;
      assert.equal(g.build('barracks',x,y,side).ok,false);assert.deepEqual(g.serialize(),before);
    }
    assert.equal(g.state.buildings.length,2,'occupied tap never selects a different free site');
    if(mapId==='twin-span')for(const y of [260,450,640])assert.equal(g.canBuild('mint',worldX(map,side,270),y,side).ok,false);
  }
});
test('map caps and three-mine limits hold; a full 16-site AI spends on affordable upgrades',()=>{
  for(const mapId of newMaps)for(const side of [0,1]){
    const {g}=empty(mapId,side);g.state.gold[side]=100000;
    for(const site of buildSites(g.map,side))assert.ok(g.build(site.x===worldX(g.map,side,1250)?'foundry':'barracks',site.x,site.y,side).ok);
    assert.equal(g.state.buildings.length,g.map.buildLimit);g.state.gold[side]=100;g._ai(side);assert.equal(g.state.gold[side],2);assert.equal(g.state.buildings.filter(b=>b.level===2).length,1);legal(g);
    const mines=empty(mapId,side).g;mines.state.gold[side]=10000;
    const sites=buildSites(mines.map,side);for(const p of sites.slice(0,3))assert.ok(mines.build('mint',p.x,p.y,side).ok);
    assert.match(mines.build('mint',sites[3].x,sites[3].y,side).reason,/Maximum 3/);advance(mines,.05);assert.equal(mines.state.income[side],12.5);legal(mines);
  }
});
test('spawn and movement use actual lane centers and both physical core edges for ground and air',()=>{
  for(const mapId of newMaps)for(const side of [0,1])for(const type of Object.keys(UNITS))for(const lane of [0,getMap(mapId).lanes.length-1]){
    const {g}=empty(mapId,side);const base=g.state.bases[1-side];base.cooldown=2;
    const u=unit(g,type,side,base.x+(side?90:-90),lane);const initialDistance=Math.hypot(u.x-base.x,u.y-base.y),initialY=u.y;
    advance(g,.05);assert.ok(Math.hypot(u.x-base.x,u.y-base.y)<initialDistance||base.hp<6000);
    if(initialDistance-55>UNITS[type].range)assert.ok(Math.abs(u.y-450)<Math.abs(initialY-450));
    advance(g,5);assert.ok(base.hp<6000,`${mapId}/${side}/${type}/${lane}: reaches actual core`);legal(g);
    const edge=empty(mapId,side).g;const at=unit(edge,type,side,side?edge.map.width-75:75,lane);advance(edge,.05);assert.ok(side?at.x<edge.map.width-75:at.x>75);legal(edge);
  }
});
test('base end-zone targeting follows the real right core rather than the old boundary',()=>{
  const {g}=empty('long-march');const a=unit(g,'warrior',0,3750,0),b=unit(g,'archer',1,3770,1);a.y=b.y=450;b.cooldown=1;g.update(.05);assert.ok(b.hp<b.maxHp,'cross-lane enemies are eligible within 220 of the real enemy base');legal(g);
  const far=empty('long-march').g;const c=unit(far,'warrior',0,3090,0),d=unit(far,'archer',1,3110,1);c.y=d.y=450;d.cooldown=1;far.update(.05);assert.equal(d.hp,d.maxHp,'old right-base position is not a cross-lane end zone');legal(far);
});
test('Long March combat, effects, rally and projectiles beyond x=3200 roundtrip correctly',()=>{
  const {g}=empty('long-march');const tower=g._place('watchtower',3730,260,1);const a=unit(g,'archer',0,3550,0),b=unit(g,'gryphon',1,3650,0);g.update(.05);
  assert.ok(g.state.projectiles.length>=2);assert.ok(g.state.projectiles.some(p=>p.sx>3200&&p.tx>3200));assert.ok(tower.cooldown>0);assert.ok(b.hp<b.maxHp);assert.ok(a.hp<a.maxHp);legal(g);
  const before=g.serialize();for(const point of [[4000.01,450],[-.01,450],[3500,900.01],[3500,-.01]]){assert.equal(g.cast(...point).ok,false);assert.deepEqual(g.serialize(),before);}
  assert.ok(g.cast(4000,900).ok);assert.equal(g.state.effects.at(-1).x,4000);legal(g);
});
test('all new-map saves require exact identity, site, lane, cap, entity and world bounds',()=>{
  for(const mapId of newMaps){
    const g=new Game({mapId,ai:false});advance(g,2);g._effect(100,100,'hit',0);const source=g.serialize();assert.equal(source.version,2);assert.equal(source.mapId,mapId);assert.equal(source.mapRevision,1);assert.equal(source.state.map,undefined);
    const invalid=[d=>delete d.mapId,d=>delete d.mapRevision,d=>d.mapId='classic',d=>d.mapId='missing',d=>d.mapId='constructor',d=>d.mapRevision=2,d=>d.mapRevision='1',d=>d.version=1,d=>d.width=g.map.width,d=>d.map={id:mapId},d=>d.state.bases[1].x=3091,d=>d.state.frontline=g.map.width-109,d=>d.state.buildings[0].x+=.1,d=>d.state.buildings[0].y+=.1,d=>d.state.buildings[0].lane=g.map.lanes.length,d=>d.state.units[0].lane=g.map.lanes.length,d=>d.state.units[0].x=g.map.width-74,d=>d.state.units[0].x=74,d=>d.state.effects[0].x=g.map.width+.01,d=>{const b=clone(d.state.buildings[0]);b.id=d.nextId++;d.state.buildings.push(b);},d=>d.state.gold[0]=NaN,d=>d.state.units[0].flying=!d.state.units[0].flying,d=>d.extra=()=>1,d=>d.state.extra=JSON.parse('{"__proto__":{"bad":true}}')];
    for(const mutate of invalid){const bad=clone(source);mutate(bad);assert.throws(()=>Game.restore(bad),/Invalid saved game:/);}
    const saved=clone(source);const restored=Game.restore(source);assert.deepEqual(source,saved);assert.deepEqual(restored.serialize(),source);restored.state.gold[0]++;assert.deepEqual(source,saved);
    if(mapId==='long-march'){const mislabeled=clone(source);mislabeled.mapId='twin-span';assert.throws(()=>Game.restore(mislabeled),/Invalid saved game:/);}
  }
  for(const field of ['mapId','mapRevision']){const legacy=new Game().serialize();legacy[field]=field==='mapId'?'classic':1;assert.throws(()=>Game.restore(legacy),/version 1 cannot contain map identity/);}
});
test('new-map projectile endpoints are bounded independently and foreign snapshots are never mutated',()=>{
  for(const mapId of newMaps){const {g}=empty(mapId);unit(g,'archer',0,g.map.width/2-50);unit(g,'gryphon',1,g.map.width/2+50);g.update(.05);assert.ok(g.state.projectiles.length);
    for(const key of ['x','sx','tx','y','sy','ty'])for(const value of [-.01,(key.includes('y')?g.map.height:g.map.width)+.01]){const bad=g.serialize();bad.state.projectiles[0][key]=value;const before=clone(bad);assert.throws(()=>Game.restore(bad),/Invalid saved game:/);assert.deepEqual(bad,before);}
  }
});
test('new-map partial accumulators resume exactly through mixed air/ground combat and AI',()=>{
  for(const mapId of newMaps)for(const difficulty of ['easy','normal','hard']){
    const a=new Game({mapId,difficulty,seed:958});a.build('archery',1250,a.map.lanes[0]);a.build('barracks',1250,a.map.lanes.at(-1));advance(a,35);a.update(.017);const b=Game.restore(a.serialize());
    for(let i=0;i<1500;i++){a.update(.05);b.update(.05);if(i%250===0)assert.deepEqual(b.serialize(),a.serialize());}assert.deepEqual(b.serialize(),a.serialize());legal(a);
  }
});
test('interleaved differently sized games cannot change another game geometry or random sequence',()=>{
  const active=Object.keys(MAPS).map(mapId=>new Game({mapId,difficulty:'hard',seed:91}));const controls=active.map(g=>Game.restore(g.serialize()));
  for(let i=0;i<1600;i++){for(const g of active){g.update(.05);if(i%120===0)g._ai(0);}for(const g of controls){g.update(.05);if(i%120===0)g._ai(0);}}
  active.forEach((g,i)=>{assert.deepEqual(g.serialize(),controls[i].serialize());legal(g);});assert.deepEqual(WORLD,{width:3200,height:900});assert.deepEqual(LANES,[260,450,640]);
});
test('new maps keep the 70-unit per-side production cap without extra random draws',()=>{
  for(const mapId of newMaps){const g=new Game({mapId,ai:false,seed:81});
    for(const side of [0,1]){const producer=g.state.buildings.find(b=>b.side===side);for(let i=0;i<70;i++)g._spawn(producer);assert.equal(g.state.units.filter(u=>u.side===side).length,70);const before=g.serialize();for(let i=0;i<20;i++)g._spawn(producer);assert.deepEqual(g.serialize(),before);}
    legal(g);advance(g,20);legal(g);
  }
});
test('new-map idle and empty-board collapse games reach valid terminal states by 600 seconds',()=>{
  for(const mapId of newMaps){
    const idle=new Game({mapId,seed:9});advance(idle,600);assert.notEqual(idle.state.winner,null);legal(idle);
    const emptyGame=empty(mapId).g;emptyGame.state.time=419.95;advance(emptyGame,180);assert.equal(emptyGame.state.winner,'draw');assert.ok(emptyGame.state.time<600);legal(emptyGame);
  }
});
