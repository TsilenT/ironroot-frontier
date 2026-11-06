import assert from 'node:assert/strict';
import test from 'node:test';
import {Game,MAPS,worldX,homeX,buildSites,BUILDINGS,UNITS,SPELL} from '../dist/engine.js';
function fixture(mapId,side=1,difficulty='normal'){
  const g=new Game({mapId,ai:false,difficulty,seed:427});g.state.buildings=[];g.state.units=[];g.state.effects=[];g.state.time=60;
  const place=(type,lane,h=1250,owner=side)=>g._place(type,worldX(g.map,owner,h),g.map.lanes[lane],owner);
  const foe=(type,lane,h)=>{const owner=1-side,producer=Object.keys(BUILDINGS).find(t=>BUILDINGS[t].unit===type),x=worldX(g.map,side,h);g._spawn({type:producer,side:owner,x:x-(owner?-48:48),y:g.map.lanes[lane],lane,level:1});};
  return {g,place,foe,lanes:g.map.lanes.map((_,i)=>i)};
}
function added(f,side,gold){f.g.state.gold[side]=gold;const count=f.g.state.buildings.length;f.g._ai(side);return f.g.state.buildings.slice(count);}
for(const mapId of Object.keys(MAPS))for(const side of [0,1]){
  const label=`${mapId} side ${side}`;
  test(`${label}: normal coverage uses strict home-distance 550 boundary`,()=>{
    for(const h of [549.999,550,550.001,690]){
      const f=fixture(mapId,side);for(const lane of f.lanes)f.place('barracks',lane,h);
      f.place('barracks',0,1250,1-side);const [b]=added(f,side,175);assert.equal(b.type,h>550?'archery':'barracks');assert.equal(b.lane,0);assert.equal(f.g.state.gold[side],h>550?0:35);
    }
  });
  test(`${label}: scoring pressure uses strict home-distance 1550 boundary`,()=>{
    for(const h of [1549.999,1550,1550.001]){
      const f=fixture(mapId,side);for(const lane of f.lanes)f.place('barracks',lane);f.foe('warrior',1,h);const [b]=added(f,side,175);assert.equal(b.type,'archery');assert.equal(b.lane,h<1550?1:0);
    }
  });
  test(`${label}: active pressure uses strict home-distance 1450 boundary`,()=>{
    for(const h of [1449.999,1450,1450.001]){
      const f=fixture(mapId,side);for(const lane of f.lanes){f.place('barracks',lane);f.place('archery',lane,1110);}if(f.lanes.length===2)f.place('archery',1,970);
      f.foe('warrior',0,h);const [b]=added(f,side,190);assert.equal(b.type,h<1450?'barracks':'mint');assert.ok(b.lane<f.lanes.length);assert.equal(f.g.state.gold[side],h<1450?50:0);
    }
  });
  test(`${label}: emergency tower uses strict home-distance 1250 boundary`,()=>{
    for(const h of [1249.999,1250,1250.001]){
      const f=fixture(mapId,side);for(const lane of f.lanes)f.place('barracks',lane);f.foe('warrior',0,h);const [b]=added(f,side,220);assert.equal(b.type,h<1250?'watchtower':'archery');assert.equal(f.g.state.gold[side],h<1250?0:45);
    }
  });
  test(`${label}: rally uses strict home-distance 1650 boundary and honest cooldown/cost`,()=>{
    for(const h of [1649.999,1650,1650.001]){
      const f=fixture(mapId,side);for(let i=0;i<4;i++)f.foe('warrior',0,h);
      added(f,side,SPELL.cost);assert.equal(f.g.state.gold[side],h<1650?0:SPELL.cost);assert.equal(f.g.state.spellCooldown[side],h<1650?25:0);
      if(h<1650){f.g.state.gold[side]=75;f.g._ai(side);assert.equal(f.g.state.gold[side],75);}
    }
  });
  test(`${label}: air, siege, shield and ground-incursion counters retain priority`,()=>{
    for(const [foeType,foeCount,enemyTower,expected,gold] of [['gryphon',1,false,'archery',175],['warrior',1,false,'watchtower',220],['warrior',3,false,'sanctum',230],[null,0,true,'foundry',270]]){
      const f=fixture(mapId,side);for(const lane of f.lanes)f.place('barracks',lane);
      if(enemyTower){f.place('watchtower',0,1250,1-side);f.place('barracks',0,1110,1-side);}
      for(let i=0;i<foeCount;i++)f.foe(foeType,0,expected==='watchtower'?1100:1400);
      const [b]=added(f,side,gold);assert.equal(b.type,expected);assert.equal(b.lane,0);assert.equal(f.g.state.gold[side],0);
    }
  });
  test(`${label}: legal candidate preferences and full-lane fallback use actual lane count`,()=>{
    for(const difficulty of ['easy','normal','hard']){
      const f=fixture(mapId,side,difficulty);f.g.state.time=0;const [b]=added(f,side,140);assert.equal(homeX(f.g.map,side,b.x),difficulty==='easy'?690:1250);assert.equal(b.lane,0);
    }
    const f=fixture(mapId,side);for(const p of buildSites(f.g.map,side).filter(p=>p.lane===0))f.place('watchtower',0,homeX(f.g.map,side,p.x));
    for(const h of [1250,1110,970])f.place('barracks',0,h,1-side);const [b]=added(f,side,140);assert.equal(b.lane,1);assert.equal(b.type,'barracks');
  });
  test(`${label}: normal establishes all available screens and new-map mine randomness stays legal`,()=>{
    const g=new Game({mapId,ai:false,difficulty:'normal'});g._ai(side);for(let i=0;i<120;i++)g.update(.05);g._ai(side);
    const screens=g.state.buildings.filter(b=>b.side===side&&homeX(g.map,side,b.x)>550&&b.type==='barracks');assert.deepEqual([...new Set(screens.map(b=>b.lane))].sort(),g.map.lanes.map((_,i)=>i));
    for(let seed=1;seed<=32;seed++){
      const f=fixture(mapId,side);f.g.seed=(seed*0x9e3779b9)>>>0;for(const lane of f.lanes){f.place('barracks',lane);f.place('archery',lane,1110);}if(f.lanes.length===2)f.place('archery',1,970);
      const [b]=added(f,side,190);assert.equal(b.type,'mint');assert.ok(b.lane<f.lanes.length);assert.equal(homeX(f.g.map,side,b.x),270);assert.doesNotThrow(()=>Game.restore(f.g.serialize()));
    }
  });
}
