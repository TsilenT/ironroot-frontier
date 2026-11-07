// Fully paid, deterministic checkpoints for UI coverage, not a human balance claim.
import assert from 'node:assert/strict';
import { Game, worldX } from '../../dist/engine.js';
import { encodeBattle, decodeBattle } from '../../dist/battle-codec.js';
export function automaticAirFixture(mapId='classic') {
  const game = new Game({ rulesetId:'frontier-air-local-open', mapId, ai:false, seed:73423 });
  const source=0, destination=1;
  const own=game.build('aerie',1250,game.map.lanes[source],0);
  const enemy=game.build('wardenLodge',worldX(game.map,1,1250),game.map.lanes[destination],1);
  assert.equal(own.ok,true);assert.equal(enemy.ok,true);
  assert.equal(game.state.gold[0],170);assert.equal(game.state.gold[1],210);
  let flyer,target;
  for(let i=0;i<1800;i++){
    game.update(.05);
    flyer=game.state.units.find(u=>u.side===0&&u.type==='gryphon'&&u.airTargetId!==null&&Math.abs(u.y-game.map.lanes[source])>5);
    target=flyer&&game.state.units.find(u=>u.id===flyer.airTargetId);
    if(target&&target.side===1&&target.lane===destination)break;
  }
  assert.ok(flyer&&target,'ordinary paid production reaches an adjacent-road chase');
  const envelope=encodeBattle(game);
  assert.deepEqual(decodeBattle(envelope).game.serialize(),game.serialize());
  return { envelope, aerieId:own.building.id, flyerId:flyer.id, targetId:target.id, source, destination,
    paid:{aerie:250,wardenLodge:210}, origin:'420 gold and default barracks, paid production, ordinary ticks only' };
}
