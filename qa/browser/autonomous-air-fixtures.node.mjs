// Node-only provenance and replay validation. This is not native browser proof.
import assert from 'node:assert/strict';
import {Game} from '../../dist/engine.js';
import {encodeBattle,decodeBattle} from '../../dist/battle-codec.js';
import {createBackup,parseBackup,BACKUP_STORAGE_KEYS as K} from '../../dist/backup.js';
import {automaticAirFixture} from './autonomous-air-fixtures.mjs';
let comparisons=0;
for(const mapId of ['classic','twin-span','long-march']) {
  const fixture=automaticAirFixture(mapId),before=fixture.envelope;
  assert.deepEqual(automaticAirFixture(mapId),fixture,'fixture creation is deterministic');
  assert.equal(before.game.rulesetId,'frontier-air-local-open');assert.equal(before.game.mapId,mapId);
  assert.equal(before.game.state.stats.built[0],2);assert.equal(before.game.state.stats.built[1],2);
  assert.equal(before.game.state.buildings.filter(b=>b.type==='barracks').length,2,'default barracks retained');
  const a=decodeBattle(before).game,b=Game.restore(before.game);
  const flyer=a.state.units.find(u=>u.id===fixture.flyerId),target=a.state.units.find(u=>u.id===fixture.targetId);
  assert.equal(flyer.airTargetId,target.id);assert.equal(flyer.lane,fixture.source);assert.equal(target.lane,fixture.destination);
  assert.ok(Math.hypot(flyer.x-target.x,flyer.y-target.y)<=300,'nearby adjacent-road acquisition');
  assert.ok(Math.abs(flyer.y-a.map.lanes[fixture.source])>5,'checkpoint is already a moving chase');
  assert.equal(a.state.buildings.find(b=>b.id===fixture.aerieId).invested,250);
  for(let side=0;side<2;side++)assert.ok(Math.abs(a.state.gold[side]-(420-[250,210][side]+5*a.state.time))<1e-8,'ordinary paid gold only');
  for(const structure of a.state.buildings)assert.equal(Object.hasOwn(structure,'flightPlan'),false);
  for(const u of a.state.units)assert.equal(Object.hasOwn(u,'airRoute'),false);
  const backup=parseBackup(createBackup({getItem:key=>key===K.battle?JSON.stringify(before):null}));assert.deepEqual(backup.data.battle,before);
  const targetHp=target.hp;
  for(let tick=0;tick<120;tick++){a.update(.05);b.update(.05);assert.deepEqual(a.serialize(),b.serialize());comparisons++;}
  assert.equal(flyer.lane,fixture.destination);assert.equal(flyer.airTargetId,target.id);assert.ok(target.hp<targetHp);
  assert.equal(a.state.stats.damage[0],68,'four normal 17-damage gryphon hits');
  assert.deepEqual(decodeBattle(encodeBattle(a)).game.serialize(),a.serialize());
}
console.log(`Validated 3 fully paid automatic-air checkpoints, ${comparisons} exact continuation comparisons, normal adjacent-road damage and backup admission. Browser execution is separate.`);
