import assert from 'node:assert/strict';
import {Game,buildSites} from '../../dist/engine.js';
import {parseBackup} from '../../dist/backup.js';
import {MAP_IDS,NEW_MAP_IDS,mapFixture,mapBackup,authoredMap,invalidMapFixtures} from './map-fixtures.mjs';
for(const id of MAP_IDS){
  const envelope=mapFixture(id,{built:true}),game=Game.restore(envelope.game);
  assert.equal(game.map.width,id==='long-march'?4000:3200);
  assert.equal(buildSites(game.map,0).length,id==='twin-span'?16:24);
  assert.deepEqual(game.map.lanes,id==='twin-span'?[340,560]:[260,450,640]);
  assert.equal(envelope.game.version,id==='classic'?1:2);
  assert.equal(Object.hasOwn(envelope.game,'mapId'),id!=='classic');
  assert.deepEqual(mapBackup(id).backup.data.battle,envelope);
  const win=Game.restore(mapFixture(id,{victory:true}).game);win.update(.1);
  assert.equal(win.state.winner,0);
}
for(const id of NEW_MAP_IDS)for(const mode of ['campaign','challenges']){
  const backup=structuredClone(mapBackup(id).backup);
  backup.data.battle=authoredMap(id,mode);
  assert.equal(Game.restore(backup.data.battle.game).map.id,id);
  assert.throws(()=>parseBackup(JSON.stringify(backup)),/Classic battlefield/,id+' '+mode);
}
assert.equal(invalidMapFixtures().length,6);
console.log('Map fixtures: 3 geometry/save/backup/victory fixtures, 6 corruptions, 4 authored-map rejections passed.');
