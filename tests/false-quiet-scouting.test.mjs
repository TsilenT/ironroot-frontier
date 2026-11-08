import test from 'node:test';
import assert from 'node:assert/strict';
import { getRuleset } from '../dist/rulesets.js';
import { getMissionScouting, renderMissionScouting, renderScoutingSvg } from '../dist/scouting.js';

const fixture = (variant = 'a') => ({
  id: 'false-quiet', scenarioRevision: 1, name: 'False Quiet', rulesetId: `frontier-campaign-false-quiet-${variant}`, rulesetRevision: 1,
  mapId: 'classic', mapRevision: 1, intelligence: 'charted-central-fort',
  objective: 'Destroy the original Central Fort, or destroy the enemy citadel. Your citadel must survive.',
  playerBuildings: [['barracks', 690, 0], ['mint', 410, 2]],
  enemyBuildings: [['watchtower', 2090, 1], ['foundry', 2510, 0]],
  markedTargets: [{ type: 'watchtower', x: 2090, lane: 1, name: 'Central Fort' }], protectedTargets: [],
});
const outputs = (mission, context) => ({ report: getMissionScouting(mission, context),
  html: renderMissionScouting(mission, context), svg: renderScoutingSvg(mission, context) });

test('False Quiet variants and selected runtime context have indistinguishable briefings', () => {
  const mission = fixture(), expected = outputs(mission);
  assert.deepEqual(outputs(fixture('b')), expected);
  const context = { ruleset: getRuleset('frontier-campaign-false-quiet-b', 1) };
  Object.defineProperty(context, 'state', { get() { throw new Error('Live state read'); } });
  assert.deepEqual(outputs(mission, context), expected);
  for (const enemyBuildings of [[], [['aerie', 2650, 2, 3]], null, 'private']) {
    assert.deepEqual(outputs({ ...mission, enemyBuildings, enemyGold: 999999, enemyUpgrades: { damage: 3 } }), expected);
  }
  Object.defineProperty(mission, 'enemyBuildings', { get() { throw new Error('Hidden factories read'); } });
  for (const field of ['hp', 'maxHp', 'level', 'upgrades', 'defenders', 'observedAt']) {
    Object.defineProperty(mission.markedTargets[0], field, { enumerable: true, get() { throw new Error('Hidden target read'); } });
  }
  assert.deepEqual(outputs(mission), expected);
});

test('False Quiet report reveals public target geometry, not a force roster or enemy condition', () => {
  const mission = fixture(), { report, html, svg } = outputs(mission);
  assert.equal(report.intelligence, 'charted-central-fort');
  assert.equal(report.objectives.markedCount, mission.markedTargets.length);
  assert.equal(report.armies[1].buildingCount, null);
  assert.deepEqual(report.armies[1].buildings, []);
  assert.deepEqual(report.armies[1].groups, []);
  assert.ok(report.armies[1].roads.every(road => road.count === null));
  assert.equal(report.landmarks[0].targetName, 'Central Fort');
  assert.equal(report.landmarks[0].x, 2090);
  assert.equal(report.landmarks[0].y, report.map.lanes[1]);
  for (const field of ['level', 'hp', 'maxHp', 'upgrades', 'defenders', 'observedAt', 'originalId']) {
    assert.equal(Object.hasOwn(report.landmarks[0], field), false);
  }
  assert.ok(Object.isFrozen(report.landmarks[0]));
  assert.match(svg, /charted battlefield/);
  assert.match(svg, /class="scouting-charted"/);
  assert.doesNotMatch(svg, /class="scouting-enemy"/);
  assert.match(html, /Charted fort objectives/);
  assert.doesNotMatch(html, /customs|Lanterns|Foundry/);
  for (const text of [report.summary, html, svg]) {
    assert.match(text, /One of two starting production layouts/);
    assert.match(text, /Resume, Restart and result Replay preserve the selected layout; choosing a new attempt from the campaign selects a layout anew/);
    assert.match(text, /Objective dispatch confirms/);
    assert.match(text, /even outside current sight/);
    assert.match(text, /Replacements do not count/);
    assert.match(text, /Current HP, level, upgrades and defenders are unknown/);
  }
});

test('False Quiet chart target count, names and geometry follow descriptor data rather than Lanterns constants', () => {
  const mission = fixture();
  mission.markedTargets.push({ type: 'watchtower', x: 2230, lane: 2, name: 'Outer Fort' });
  const report = getMissionScouting(mission);
  assert.equal(report.objectives.markedCount, 2);
  assert.deepEqual(report.landmarks.map(l => l.targetName), ['Central Fort', 'Outer Fort']);
  assert.equal(report.landmarks[1].y, report.map.lanes[2]);
  assert.throws(() => getMissionScouting({ ...mission, markedTargets: [] }), /requires named original targets/);
  assert.throws(() => getMissionScouting({ ...mission, requiredTargets: 1 }), /requires all original fort targets/);
});

test('False Quiet malformed identities fail closed and authored text is escaped', () => {
  for (const mutation of [{ id: 'other' }, { scenarioRevision: 2 }, { intelligence: undefined }, { intelligence: 'charted-customs-posts' }]) {
    assert.throws(() => getMissionScouting({ ...fixture(), ...mutation }));
  }
  assert.throws(() => getMissionScouting(fixture(), getRuleset('frontier-campaign-lanterns', 1)), /does not match/);
  const mission = fixture();
  mission.markedTargets[0].name = '<script>private</script>';
  mission.objective = '<img src=x onerror="bad">';
  const { html, svg } = outputs(mission);
  for (const text of [html, svg]) {
    assert.doesNotMatch(text, /<script>|<img/);
    assert.match(text, /&lt;/);
  }
});
