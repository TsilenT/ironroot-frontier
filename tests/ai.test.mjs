import assert from 'node:assert/strict';
import test from 'node:test';
import {Game, BUILDINGS, LANES, SPELL} from '../dist/engine.js';

function empty(difficulty='normal'){
  const g=new Game({ai:false,difficulty});g.state.buildings=[];g.state.units=[];g.state.time=60;return g;
}
function place(g,type,side,lane,x=1950){return g._place(type,side?x:3200-x,LANES[lane],side);}
function foe(g,type,lane,x){
  const producer=Object.keys(BUILDINGS).find(k=>BUILDINGS[k].unit===type);
  g._spawn({type:producer,side:0,x:x-48,y:LANES[lane],lane,level:1});
  return g.state.units.at(-1);
}
test('AI buys mobile anti-air before a tower when flyers threaten a lane',()=>{
  const g=empty();for(const lane of [0,1,2])place(g,'barracks',1,lane);foe(g,'gryphon',0,2000);g.state.gold[1]=175;
  g._ai(1);assert.equal(g.state.gold[1],0);assert.ok(g.state.buildings.some(b=>b.side===1&&b.type==='archery'&&b.lane===0));
});
test('AI reinforces production deficits without buying a premature tower',()=>{
  const g=empty();place(g,'barracks',1,0);place(g,'barracks',0,0);place(g,'barracks',0,0,2090);g.state.gold[1]=175;
  g._ai(1);assert.ok(g.state.buildings.some(b=>b.side===1&&b.type==='archery'));assert.equal(g.state.gold[1],0);
});
test('AI still buys a defensive tower for an actual ground incursion',()=>{
  const g=empty();for(const lane of [0,1,2])place(g,'barracks',1,lane);foe(g,'warrior',0,2100);g.state.gold[1]=220;
  g._ai(1);assert.ok(g.state.buildings.some(b=>b.side===1&&b.type==='watchtower'&&b.lane===0));assert.equal(g.state.gold[1],0);
});
test('AI uses another lane when its preferred frontier is full',()=>{
  const g=empty();for(const x of [1950,2090,2230,2370,2510,2650,2790,2930])place(g,'watchtower',1,0,x);
  for(const x of [1950,2090,2230])place(g,'barracks',0,0,x);
  g.state.gold[1]=140;g._ai(1);
  assert.ok(g.state.buildings.some(b=>b.side===1&&b.type==='barracks'&&b.lane!==0));assert.equal(g.state.gold[1],0);
});
test('full-frontier AI selects an affordable upgrade below the former 300-gold gate',()=>{
  const g=empty();for(const lane of [0,1,2])for(const x of [1950,2090,2230,2370,2510,2650,2790,2930])place(g,x===1950?'foundry':'barracks',1,lane,x);
  g.state.gold[1]=100;g._ai(1);
  assert.equal(g.state.gold[1],2);assert.equal(g.state.buildings.filter(b=>b.level===2&&b.type==='barracks').length,1);
});
test('AI preserves savings for an unaffordable counter rather than upgrading arbitrarily',()=>{
  const g=empty();for(const lane of [0,1,2])place(g,'barracks',1,lane);place(g,'watchtower',0,0);place(g,'barracks',0,0,2090);g.state.gold[1]=200;
  g._ai(1);assert.equal(g.state.gold[1],200);assert.ok(g.state.buildings.every(b=>b.level===1));
});
test('AI does not buy fresh mines too late to repay before overtime',()=>{
  const g=empty();g.state.time=250;
  for(const lane of [0,1,2]){place(g,'barracks',1,lane);place(g,'archery',1,lane,2090);}
  g.state.gold[1]=190;g._ai(1);assert.ok(!g.state.buildings.some(b=>b.type==='mint'));
});
test('terminal AI invocation cannot spend gold or consume random state',()=>{
  const g=empty();g.state.winner=0;g.state.bases[1].hp=0;g.state.gold=[1000,1000];const before=g.serialize();
  g._ai(0);g._ai(1);assert.deepEqual(g.serialize(),before);
});
test('AI spends normal spell cost and respects cooldown',()=>{
  const g=empty('hard');g.state.gold[1]=SPELL.cost;
  for(let i=0;i<4;i++)foe(g,'warrior',0,1800);
  g._ai(1);assert.equal(g.state.gold[1],0);assert.equal(g.state.spellCooldown[1],SPELL.cooldown);
  g.state.gold[1]=SPELL.cost;g._ai(1);assert.equal(g.state.gold[1],SPELL.cost);
});

