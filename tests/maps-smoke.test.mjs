import assert from 'node:assert/strict';
import test from 'node:test';
import {Game,buildSites,worldX,BUILDINGS,upgradeCost,SPELL} from '../dist/engine.js';
function track(g,ledger){
  for(const action of ['build','upgrade','sell','cast']){const raw=g[action];g[action]=function(...args){const side=(action==='build'?args[3]:action==='cast'?args[2]:args[1])??0;const building=action==='upgrade'?this.state.buildings.find(b=>b.id===args[0]):null;
      const cost=action==='build'?BUILDINGS[args[0]]?.cost:action==='upgrade'&&building?upgradeCost(building):action==='cast'?SPELL.cost:0;const result=raw.apply(this,args);if(result.ok){ledger.spend[side]+=cost;ledger.refund[side]+=result.refund||0;}return result;};}
  return g;
}
function verify(g,l){
  for(const side of [0,1]){
    assert.ok(Math.abs(g.state.gold[side]-(420+l.income[side]+g.state.stats.kills[side]*2-l.spend[side]+l.refund[side]))<1e-6,`honest gold ledger side ${side}`);
    assert.ok(g.state.units.filter(u=>u.side===side).length<=70);const sites=buildSites(g.map,side),own=g.state.buildings.filter(b=>b.side===side);assert.ok(own.length<=g.map.buildLimit);assert.ok(own.filter(b=>b.type==='mint').length<=3);
    for(const b of own)assert.ok(sites.some(p=>p.x===b.x&&p.y===b.y&&p.lane===b.lane));
  }
  assert.deepEqual(Game.restore(g.serialize()).serialize(),g.serialize());
}
function policy(g,side,turn){
  const types=['barracks','archery','barracks','foundry','sanctum','aerie','mint'],type=types[Math.floor(turn/g.map.lanes.length)%types.length],lane=turn%g.map.lanes.length;
  for(const h of [1250,1110,970,830,690,550,410,270])if(g.build(type,worldX(g.map,side,h),g.map.lanes[lane],side).ok)break;
  if(turn%7===0){const b=g.state.buildings.find(b=>b.side===side&&b.level<3);if(b)g.upgrade(b.id,side);}
  if(turn%9===0){const u=g.state.units.find(u=>u.side!==side);if(u)g.cast(u.x,u.y,side);}
  if(turn===80){const mine=g.state.buildings.find(b=>b.side===side&&b.type==='mint');if(mine)g.sell(mine.id,side);}
}
test('24 complete new-map games terminate with valid saves, legal armies and exact purchase/income ledgers',()=>{
  const results=[];
  for(const mapId of ['long-march','twin-span'])for(const difficulty of ['easy','normal','hard'])for(const playerSide of [0,1])for(const seed of [1,57]){
    const ledger={income:[0,0],spend:[0,0],refund:[0,0]};let g=track(new Game({mapId,difficulty,seed,ai:false}),ledger),timer=difficulty==='easy'?7:0,peak=[0,0];
    for(let frame=0;frame<12000&&g.state.winner===null;frame++){
      if(frame%20===0)policy(g,playerSide,frame/20);
      timer-=.05;if(timer<=0){g._ai(1-playerSide);timer=(difficulty==='easy'?14:difficulty==='hard'?3:5)+g.random()*3;}
      g.update(.05);for(const side of [0,1]){ledger.income[side]+=g.state.income[side]*.05;peak[side]=Math.max(peak[side],g.state.units.filter(u=>u.side===side).length);}
      if(frame%800===0){verify(g,ledger);const saved=g.serialize();g=track(Game.restore(saved),ledger);assert.deepEqual(g.serialize(),saved);}
    }
    assert.notEqual(g.state.winner,null,`${mapId}/${difficulty}/${playerSide}/${seed}: must end by 600s`);assert.ok(g.state.time<600);verify(g,ledger);
    results.push({mapId,difficulty,playerSide,seed,winner:g.state.winner,seconds:Math.round(g.state.time*10)/10,peak,overtime:g.state.overtime,collapse:g.state.time>420});
  }
  console.log('New-map smoke outcomes (not a balance audit): '+JSON.stringify(results));
});
