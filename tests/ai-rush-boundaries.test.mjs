import assert from 'node:assert/strict';
import test from 'node:test';
import {Game,BUILDINGS,LANES} from '../dist/engine.js';

const mirror=(side,x)=>side===1?x:3200-x;
function fixture(side){
  const g=new Game({ai:false,difficulty:'normal',seed:427});
  g.state.buildings=[];g.state.units=[];g.state.time=60;
  const place=(type,lane,x=1950,owner=side)=>g._place(type,mirror(owner,x),LANES[lane],owner);
  const threaten=(type,lane,x)=>{
    const owner=1-side,producer=Object.keys(BUILDINGS).find(t=>BUILDINGS[t].unit===type);
    g._spawn({type:producer,side:owner,x:mirror(side,x)-(owner?-48:48),y:LANES[lane],lane,level:1});
  };
  return {g,place,threaten};
}

test('normal nearby coverage includes 2510 but excludes 2650 and 2790 on both sides',()=>{
  for(const side of [0,1])for(const x of [2510,2650,2790]){
    const {g,place}=fixture(side);
    for(const lane of [0,1,2])place('barracks',lane,x);
    place('barracks',0,1950,1-side);g.state.gold[side]=175;
    const before=g.state.buildings.length;g._ai(side);
    const additions=g.state.buildings.slice(before);
    assert.equal(additions.length,1);
    assert.equal(additions[0].type,x<2650?'archery':'barracks',`side ${side}, x ${x}`);
    assert.equal(additions[0].lane,0);
    assert.equal(g.state.gold[side],x<2650?0:35);
  }
});

test('normal prioritizes the lane whose only production is in the excluded rear row',()=>{
  for(const side of [0,1])for(const x of [2650,2790]){
    const {g,place}=fixture(side);
    place('barracks',0);place('barracks',1);place('barracks',2,x);
    g.state.gold[side]=140;g._ai(side);
    const b=g.state.buildings.at(-1);
    assert.equal(b.type,'barracks');assert.equal(b.lane,2);assert.equal(mirror(side,b.x),1950);
    assert.equal(g.state.gold[side],0);
  }
});

test('rear-only normal screen still responds to air before purchasing another barracks',()=>{
  for(const side of [0,1]){
    const {g,place,threaten}=fixture(side);
    place('barracks',0,2790);place('barracks',1);place('barracks',2);
    threaten('gryphon',0,2100);g.state.gold[side]=175;g._ai(side);
    const b=g.state.buildings.at(-1);
    assert.equal(b.type,'archery');assert.equal(b.lane,0);assert.equal(g.state.gold[side],0);
  }
});

test('rear-only normal screen still responds to an immediate ground incursion with a tower',()=>{
  for(const side of [0,1]){
    const {g,place,threaten}=fixture(side);
    place('barracks',0,2790);place('barracks',1);place('barracks',2);
    threaten('warrior',0,2100);g.state.gold[side]=220;g._ai(side);
    const b=g.state.buildings.at(-1);
    assert.equal(b.type,'watchtower');assert.equal(b.lane,0);assert.equal(g.state.gold[side],0);
  }
});

test('normal saves for a missing nearby screen instead of spending its savings on rear upgrades',()=>{
  for(const side of [0,1]){
    const {g,place}=fixture(side);
    for(const lane of [0,1,2])place('barracks',lane,2790);
    g.state.gold[side]=100;const before=g.serialize();g._ai(side);
    assert.deepEqual(g.serialize(),before);
    g.state.gold[side]=140;g._ai(side);
    assert.equal(g.state.buildings.length,4);assert.equal(mirror(side,g.state.buildings.at(-1).x),1950);
    assert.equal(g.state.gold[side],0);
  }
});

test('normal with a full frontier and only a rear barracks retains affordable upgrade fallback',()=>{
  for(const side of [0,1]){
    const {g,place}=fixture(side);
    for(const lane of [0,1,2])for(const x of [1950,2090,2230,2370,2510,2650,2790,2930])
      place(lane===0&&x===2790?'barracks':'watchtower',lane,x);
    g.state.gold[side]=100;g._ai(side);
    assert.equal(g.state.buildings.length,24);assert.equal(g.state.gold[side],2);
    const b=g.state.buildings.find(b=>b.type==='barracks');assert.equal(b.level,2);
    const before=g.serialize();g._ai(side);assert.deepEqual(g.serialize(),before);
  }
});
