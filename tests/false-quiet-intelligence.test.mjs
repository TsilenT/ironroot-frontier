import test from 'node:test';
import assert from 'node:assert/strict';
import { hasChartedIntelligence, chartedObjectiveTargets, chartedObjectiveObservation } from '../dist/campaign-intelligence.js';

const fixture = variant => ({
  id: 'false-quiet', scenarioRevision: 1, rulesetId: `frontier-campaign-false-quiet-${variant}`, rulesetRevision: 1,
  intelligence: 'charted-central-fort', markedTargets: [{ type: 'watchtower', x: 2090, lane: 1, name: 'Central Fort' }],
});
const view = () => ({ map: { lanes: [260, 620, 980] }, state: { time: 30, buildings: [] },
  fog: { enabled: true, observers: [], memories: [] } });
const original = (mission, building) => ({ ...mission.markedTargets[0], kind: 'destroy', originalId: 7, building });

test('False Quiet chart contract allowlists both exact identities and no others', () => {
  for (const variant of ['a', 'b']) {
    const mission = fixture(variant);
    assert.equal(hasChartedIntelligence(mission), true);
    for (const mutation of [{ id: 'another-mission' }, { scenarioRevision: 2 }, { rulesetRevision: 2 },
      { rulesetId: 'frontier-campaign-false-quiet-c' }, { rulesetId: 'frontier-campaign-lanterns' },
      { intelligence: 'charted-customs-posts' }, { intelligence: undefined }]) {
      const invalid = { ...mission, ...mutation };
      assert.equal(hasChartedIntelligence(invalid), false);
      assert.deepEqual(chartedObjectiveTargets(invalid, null, null), []);
    }
  }
});

test('False Quiet variants expose identical strict chart rows without reading hidden original data', () => {
  const observation = view();
  const hidden = new Proxy({}, { get() { throw new Error('Hidden original data accessed'); } });
  const rows = ['a', 'b'].map(variant => {
    const mission = fixture(variant);
    return chartedObjectiveTargets(mission, observation, [original(mission, hidden)]);
  });
  assert.deepEqual(rows[0], rows[1]);
  assert.deepEqual(Object.keys(rows[0][0]), ['originalId', 'label', 'type', 'x', 'y', 'lane', 'road', 'status', 'statusText', 'percent', 'confirmedDestroyed']);
  assert.equal(rows[0][0].status, 'charted');
  assert.equal(rows[0][0].percent, null);
  assert.equal(rows[0][0].label, 'Central Fort');
  assert.ok(Object.isFrozen(rows[0][0]));
  assert.deepEqual(observation, view());
});

test('False Quiet uses visible health only, retains stale observation, and dispatch clears only original memory', () => {
  for (const variant of ['a', 'b']) {
    const mission = fixture(variant), observation = view();
    const originals = [original(mission, { hp: 999, level: 3 })];
    const building = { ...mission.markedTargets[0], id: 7, side: 1, y: 620, hp: 25, maxHp: 100 };
    observation.state.buildings = [building];
    observation.fog.observers = [{ x: 2090, y: 620, radius: 10 }];
    assert.equal(chartedObjectiveTargets(mission, observation, originals)[0].percent, 25);
    observation.fog.observers = [];
    observation.state.buildings = [];
    const memory = { ...building, level: 1, observedAt: 10 };
    const replacement = { ...memory, id: 8 };
    observation.fog.memories = [memory, replacement];
    const stale = chartedObjectiveTargets(mission, observation, originals)[0];
    assert.equal(stale.status, 'last-seen');
    assert.equal(stale.percent, null);
    assert.match(stale.statusText, /L1 at 0:10/);
    originals[0].building = null;
    const cleared = chartedObjectiveTargets(mission, observation, originals)[0];
    assert.equal(cleared.status, 'destroyed');
    assert.equal(cleared.percent, null);
    const filtered = chartedObjectiveObservation(mission, observation, originals);
    assert.deepEqual(filtered.fog.memories, [replacement]);
    assert.deepEqual(observation.fog.memories, [memory, replacement]);
    assert.equal(filtered.state, observation.state);
  }
});
