import assert from 'node:assert/strict';
import {decodeBattle} from '../../dist/battle-codec.js';
import {campaignFixture,introReplayFixture} from './campaign-fixtures.mjs';
for(const kind of ['victory','failure','protected']){
  const fixture=campaignFixture(kind);
  assert.deepEqual(decodeBattle(fixture.envelope,{campaignProgress:fixture.progress}).game.serialize(),fixture.envelope.game);
  console.log('Validated active campaign fixture and next-step oracle: '+kind);
}
for(const id of ['first-watch','forked-road']){
  const fixture=introReplayFixture(id);
  assert.equal(fixture.envelope.version,3);assert.equal(fixture.envelope.scenario.id,id);
  assert.equal(fixture.outcome.stars,3);
  console.log(`Validated paid ${id} checkpoint: ${fixture.envelope.game.state.time}s -> ${fixture.finalGame.state.time}s, 3 stars.`);
}
