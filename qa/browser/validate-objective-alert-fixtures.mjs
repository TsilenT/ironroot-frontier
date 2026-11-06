import assert from 'node:assert/strict';
import {decodeBattle} from '../../dist/battle-codec.js';
import {objectiveAlertFixture, resumeLabelFixtures} from './objective-alert-fixtures.mjs';

for (const kind of ['critical', 'delayed', 'loss']) {
  const fixture = objectiveAlertFixture(kind);
  assert.deepEqual(decodeBattle(fixture.envelope, {campaignProgress: fixture.progress}).game.serialize(), fixture.envelope.game);
  assert.equal(fixture.outcome.failed, kind === 'loss');
  assert.equal(fixture.outcome.completed, false);
  assert.equal(fixture.message, `Critical health: North gold mine (${kind === 'loss' ? 1 : 25}% HP).`);
  console.log(`Validated ${kind} protected-original fixture, shared admission and real-combat continuation.`);
}
for (const fixture of resumeLabelFixtures()) {
  assert.equal(fixture.envelope.version, 3);
  assert.match(fixture.label, / · 00:00$/);
  if (fixture.authored) assert.doesNotMatch(fixture.label, /SUDDEN DEATH|OPEN[ -]ENDED/);
  else assert.match(fixture.label, /SUDDEN DEATH|OPEN-ENDED/);
  console.log(`Validated label fixture: ${fixture.label}`);
}
