// Browser fixture authorship is explicit: legal paid prehistory is separate from
// synthetic feedback arrangements. No browser application state/clock hook.
import assert from 'node:assert/strict';
import {Game} from '../../dist/engine.js';
import {encodeBattle,decodeBattle} from '../../dist/battle-codec.js';
export function paidPrehistory({bridge=false,seed=17}={}) {
  const game=new Game({rulesetId:bridge?'frontier-citadel-bridge-open':'frontier-citadel-open',seed,ai:false});
  const actions=[];
  for(const side of [0,1])for(const [type,x,y] of [['archery',550,450],['mint',270,260]]){
    const before=game.state.gold[side],result=game.build(type,side?game.map.width-x:x,y,side);
    assert.equal(result.ok,true);actions.push({time:game.state.time,side,type,cost:before-game.state.gold[side]});
  }
  while(game.tick<1800&&game.state.winner===null)game.update(.05);
  assert.equal(game.state.winner,null,'Predeclared legal prehistory ended before its decision');
  assert.equal(game.tick,1800);assert.equal(game.canBuyCitadelOption('arrows').ok,true);
  const battle=encodeBattle(game);decodeBattle(battle);
  return {game,battle,provenance:{kind:'legal scripted paid prehistory',seed,ai:false,actions,tick:game.tick,time:game.state.time,baseHp:game.state.bases.map(b=>b.hp),gold:[...game.state.gold]}};
}
export function feedbackFixture(kind) {
  const game=new Game({rulesetId:'frontier-citadel-open',seed:31,ai:false});
  // Explicit synthetic clock/entity placement, never called paid gameplay.
  game.tick=2000;game.state.time=100;game.state.units=[];game.state.buildings=[];
  assert.equal(game.buyCitadelOption(kind).ok,true);
  if(kind==='regen'){
    game._damage(game.state.bases[0],240,1);
    game.state.citadelOptions.sides[0].purchasedAt=90;
    game.state.citadelOptions.sides[0].purchasedTick=1800;
    game.state.citadelOptions.sides[0].lastDamageAt=90;
  }
  for(const [type,x,y,cooldown] of kind==='arrows'?[['barracks',260,450,0],['archery',290,450,0]]:[['archery',625,450,0]]){
    const b={type,side:1,x:x+48,y,lane:1,level:1};game._spawn(b);
    Object.assign(game.state.units.at(-1),{x,y,cooldown});
  }
  game.state.effects=[];game.state.projectiles=[];
  const battle=encodeBattle(game);decodeBattle(battle);
  return {battle,provenance:{kind:'synthetic mechanism/presentation fixture',choice:kind,description:kind==='regen'?'Damaged base begins eligible to heal. A distant enemy archer advances and causes actual damage to interrupt healing.':'Two distinct nearby living targets expose the additional projectile on the ordinary firing cycle.'}};
}
