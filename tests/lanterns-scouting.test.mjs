import test from 'node:test';
import assert from 'node:assert/strict';
import { getMap } from '../dist/engine.js';
import { createCampaignMission, getCampaignMission } from '../dist/campaign.js';
import { getRuleset } from '../dist/rulesets.js';
import { getMissionScouting, renderMissionScouting, renderScoutingSvg } from '../dist/scouting.js';

const fixture = () => ({
  id: 'lanterns-on-the-water', scenarioRevision: 1, name: 'Lanterns on the Water',
  rulesetId: 'frontier-campaign-lanterns', rulesetRevision: 1,
  mapId: 'classic', mapRevision: 1, intelligence: 'charted-customs-posts',
  playerBuildings: [['watchtower', 970, 1, 2], ['barracks', 690, 0, 3], ['mint', 410, 2]],
  enemyBuildings: [['watchtower', 2090, 0, 3], ['watchtower', 2090, 2, 2], ['foundry', 2510, 0, 3], ['aerie', 2650, 2, 2]],
  markedTargets: [
    { type: 'watchtower', x: 2090, lane: 0, name: 'North Customs House' },
    { type: 'watchtower', x: 2090, lane: 2, name: 'South Customs House' },
  ],
  protectedTargets: [],
});
const outputs = mission => ({
  report: getMissionScouting(mission), html: renderMissionScouting(mission), svg: renderScoutingSvg(mission),
});
const assertFrozen = value => {
  if (value && typeof value === 'object') {
    assert.ok(Object.isFrozen(value));
    Object.values(value).forEach(assertFrozen);
  }
};

test('the authored Lanterns mission uses the chart contract and preserves actual own deployment', () => {
  const mission = getCampaignMission('lanterns-on-the-water', 1);
  const game = createCampaignMission(mission.id, { revision: 1 });
  const { report, html, svg } = outputs(mission);
  assert.equal(report.intelligence, 'charted-customs-posts');
  assert.equal(report.armies[0].buildingCount, game.state.buildings.filter(building => building.side === 0).length);
  for (const building of report.armies[0].buildings) {
    assert.ok(game.state.buildings.some(actual => ['type', 'x', 'y', 'lane', 'level', 'side'].every(field => actual[field] === building[field])));
  }
  assert.deepEqual(report.landmarks.map(({ targetName, type, x, lane }) => ({ name: targetName, type, x, lane })), mission.markedTargets);
  assert.equal(report.armies[1].buildingCount, null);
  assert.deepEqual(report.armies[1].buildings, []);
  assert.deepEqual(outputs({ ...mission, enemyBuildings: [] }), { report, html, svg });
  assert.deepEqual(getMissionScouting(mission, game), report);
});

test('Lanterns charts only the two original posts and keeps current enemy force unknown', () => {
  const mission = fixture(), { report, html, svg } = outputs(mission);
  assert.equal(report.intelligence, mission.intelligence);
  assert.equal(report.objectives.markedCount, 2);
  assert.equal(report.objectives.protectedCount, 0);
  assert.equal(report.armies[1].buildingCount, null, 'unknown is not zero or the number of charted posts');
  assert.deepEqual(report.armies[1].buildings, []);
  assert.deepEqual(report.armies[1].groups, []);
  for (const road of report.armies[1].roads) {
    assert.equal(road.count, null);
    assert.match(road.summary, /unknown outside current sight/);
  }
  assert.deepEqual(report.landmarks.map(({ type, targetName, x, y, lane, condition }) => ({ type, targetName, x, y, lane, condition })),
    mission.markedTargets.map(({ type, name, x, lane }) => ({ type, targetName: name, x, y: getMap(mission.mapId).lanes[lane], lane, condition: 'unknown' })));
  for (const landmark of report.landmarks) {
    for (const hidden of ['level', 'hp', 'maxHp', 'upgrades', 'defenders', 'observedAt', 'lastSeen', 'originalId']) assert.equal(Object.hasOwn(landmark, hidden), false, hidden);
    assert.equal(landmark.id, `${mission.id}/${landmark.type}/${landmark.x}/${landmark.lane}`);
  }
  assert.equal((svg.match(/class="scouting-landmark"/g) || []).length, 2);
  assert.equal((svg.match(/class="scouting-building"/g) || []).length, mission.playerBuildings.length);
  assert.equal((svg.match(/class="scouting-charted"/g) || []).length, 2);
  assert.doesNotMatch(svg, /class="scouting-enemy"/);
  assert.match(svg, /charted battlefield/);
  assert.match(html, /Current force unknown/);
  assert.match(html, /Current HP, level, upgrades and defenders are unknown outside current sight/);
  const enemySection = html.match(/<section class="scouting-army scouting-army-right"[^>]*>([\s\S]*?)<\/section>/)?.[1];
  assert.ok(enemySection);
  assert.doesNotMatch(enemySection, /\d+ starting building|\d+ ×|level \d|No starting buildings/);
  for (const target of mission.markedTargets) {
    assert.ok(svg.includes(`transform="translate(${target.x} ${getMap(mission.mapId).lanes[target.lane]})"><title>${target.name}: charted Watchtower`));
    assert.ok(html.includes(`<strong>${target.name}:</strong> Watchtower`));
  }
});

test('hidden deployment permutations, force counts and conditions cannot change any scouting output', () => {
  const mission = fixture(), expected = outputs(mission);
  const deployments = [
    [],
    [['barracks', 2997, 1, 3]],
    [['watchtower', 2090, 2, 1], ['watchtower', 2090, 0, 1]],
    [['mint', 2899, 0, 2], ['barracks', 2997, 1], ['sanctum', 2631, 2, 3], ['archery', 2761, 1, 2], ['aerie', 2511, 0, 3]],
    [...mission.enemyBuildings].reverse(),
  ];
  for (const enemyBuildings of deployments) {
    const variant = { ...mission, enemyBuildings, enemyGold: 987654,
      deployment: { enemy: 'HIDDEN FORCE 987654' }, briefing: ['HIDDEN FORCE 987654'],
      markedTargets: mission.markedTargets.map(target => ({ ...target, hp: 4219873, maxHp: 987654, level: 3, upgrades: ['SECRET UPGRADE'], defenders: ['SECRET GUARD'], lastSeen: 888888 })),
    };
    assert.deepEqual(outputs(variant), expected);
    assert.doesNotMatch(JSON.stringify(outputs(variant)), /987654|4219873|888888|HIDDEN FORCE|SECRET UPGRADE|SECRET GUARD|2997|2899|2631|2761|2511/);
  }
});

test('the selective briefing never reads hidden deployment, gold or runtime observation state', () => {
  const mission = fixture(), expected = outputs(mission);
  for (const field of ['enemyBuildings', 'enemyGold', 'deployment', 'briefing', 'state', 'fog', 'memories']) {
    Object.defineProperty(mission, field, { get() { throw new Error(`Read hidden ${field}`); }, configurable: true });
  }
  for (const target of mission.markedTargets) for (const field of ['level', 'hp', 'maxHp', 'upgrades', 'defenders', 'lastSeen', 'originalId']) {
    Object.defineProperty(target, field, { get() { throw new Error(`Read hidden target ${field}`); }, enumerable: true });
  }
  assert.deepEqual(outputs(mission), expected);
  const context = { ruleset: getRuleset(mission.rulesetId, 1) };
  Object.defineProperty(context, 'state', { get() { throw new Error('Read live state'); } });
  assert.deepEqual(getMissionScouting(mission, context), expected.report);
  assert.equal(renderScoutingSvg(mission, context), expected.svg);
});

test('own roster, starting counts, levels and geometry remain complete and accurate', () => {
  const mission = fixture(), { report, html, svg } = outputs(mission);
  const own = report.armies[0], rules = getRuleset(mission.rulesetId, 1);
  assert.equal(own.buildingCount, mission.playerBuildings.length);
  assert.equal(own.groups.reduce((sum, group) => sum + group.count, 0), mission.playerBuildings.length);
  for (const [type, x, lane, level = 1] of mission.playerBuildings) {
    const building = own.buildings.find(b => b.type === type && b.x === x && b.lane === lane);
    assert.ok(building);
    assert.equal(building.level, level);
    assert.equal(building.y, getMap(mission.mapId).lanes[lane]);
    assert.ok(svg.includes(`transform="translate(${x} ${building.y})"><title>Allied ${rules.buildings[type].name}, level ${level}`));
    assert.ok(own.roads[lane].summary.includes(`${rules.buildings[type].name} (level ${level})`));
    assert.ok(html.includes(`${rules.buildings[type].name} (level ${level})`));
  }
  const enlarged = { ...mission, playerBuildings: [...mission.playerBuildings, ['archery', 830, 2, 2]] };
  const next = outputs(enlarged);
  assert.equal(next.report.armies[0].buildingCount, own.buildingCount + 1);
  assert.notEqual(next.svg, svg);
  assert.deepEqual(next.report.armies[1], report.armies[1]);
  assert.deepEqual(next.report.landmarks, report.landmarks);
});

test('landmark names, roads and coordinates derive from chart metadata and actual map geometry', () => {
  const mission = fixture();
  mission.mapId = 'long-march';
  mission.markedTargets = [
    { type: 'watchtower', x: 2830, lane: 2, name: 'Recharted South' },
    { type: 'watchtower', x: 2690, lane: 0, name: 'Recharted North' },
  ];
  const { report, html, svg } = outputs(mission), map = getMap(mission.mapId);
  assert.equal(report.map.width, map.width);
  assert.equal(report.map.height, map.height);
  assert.deepEqual(report.map.lanes, map.lanes);
  assert.deepEqual(report.landmarks.map(l => [l.targetName, l.x, l.y, l.roadName]), [
    ['Recharted North', 2690, map.lanes[0], 'North road'], ['Recharted South', 2830, map.lanes[2], 'South road'],
  ]);
  assert.ok(svg.includes(`viewBox="0 0 ${map.width} ${map.height}"`));
  for (const landmark of report.landmarks) {
    assert.ok(svg.includes(`translate(${landmark.x} ${landmark.y})`));
    assert.ok(html.includes(`x ${landmark.x}`));
    assert.ok(svg.includes(`x ${landmark.x}. Current HP`));
  }
  assert.doesNotMatch(svg, /2090/);
  assert.deepEqual(outputs({ ...mission, markedTargets: [...mission.markedTargets].reverse(), playerBuildings: [...mission.playerBuildings].reverse() }), { report, html, svg });
});

test('objective dispatch is explicitly distinct from sightings and replacements do not count', () => {
  const { report, html, svg } = outputs(fixture());
  for (const text of [report.objectives.summary, html, svg]) {
    assert.match(text, /Destroy both original customs posts, or destroy the enemy citadel/);
    assert.match(text, /Your citadel must survive/);
    assert.match(text, /Objective dispatch confirms each original post(?:'|&#39;)s destruction even outside current sight/);
    assert.match(text, /does not reveal nearby enemies/);
    assert.match(text, /Replacements do not count/);
  }
  assert.match(html, /not last-seen memories or current enemy sightings/);
  assert.doesNotMatch(JSON.stringify(report), /"(?:lastSeen|observedAt|memories|originalId)"/);
});

test('mission and landmark text is escaped in SVG labels, attributes and HTML', () => {
  const mission = fixture();
  const hostile = `</title><script>alert("x")</script><img src=x onerror='attack'>&\u0000\ud800`;
  mission.name = hostile;
  mission.markedTargets[0].name = hostile;
  mission.markedTargets[1].name = 'South & "River" <Post>';
  const { report, html, svg } = outputs(mission);
  assert.equal(report.landmarks[0].targetName, hostile, 'report values remain text');
  for (const markup of [html, svg]) {
    assert.doesNotMatch(markup, /<script|<img|<svg onload|\u0000|\ud800/);
    assert.ok(markup.includes('&lt;/title&gt;&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;&lt;img src=x onerror=&#39;attack&#39;&gt;&amp;\ufffd\ufffd'));
    assert.ok(markup.includes('South &amp; &quot;River&quot; &lt;Post&gt;'));
    assert.equal((markup.match(/<svg\b/g) || []).length, 1);
    assert.doesNotMatch(markup, /<(?:foreignObject|image|animate|set)\b/);
    for (const [tag] of markup.matchAll(/<[^>]+>/g)) {
      // Text safely inside an aria-label can contain words such as "onerror".
      assert.doesNotMatch(tag.replace(/"[^"]*"|'[^']*'/g, '""'), /\s(?:on\w+|href|src)=/);
    }
  }
});

test('charted intelligence admits only the exact mission identity and refuses disclosure fallback', () => {
  const mission = fixture();
  for (const patch of [
    { id: 'one-signal-is-enough' }, { id: undefined },
    { scenarioRevision: 2 }, { scenarioRevision: undefined }, { scenarioRevision: '1' },
    { intelligence: undefined }, { intelligence: null }, { intelligence: true }, { intelligence: 'show-customs' },
    { rulesetId: 'frontier-legacy' }, { rulesetId: undefined }, { rulesetRevision: undefined }, { rulesetRevision: 2 },
  ]) {
    for (const render of [getMissionScouting, renderMissionScouting, renderScoutingSvg]) assert.throws(() => render({ ...mission, ...patch }), /Scouting|ruleset/i, JSON.stringify(patch));
  }
  assert.throws(() => getMissionScouting({ intelligence: mission.intelligence }), /Scouting/);
  assert.throws(() => getMissionScouting(mission, getRuleset('frontier-legacy')), /does not match/);
  const legacy = getMissionScouting({ playerBuildings: [['barracks', 690, 0]], enemyBuildings: [['watchtower', 2090, 0, 3]] });
  assert.equal(legacy.armies[1].buildingCount, 1);
  assert.equal(legacy.armies[1].buildings[0].level, 3);
  assert.equal(Object.hasOwn(legacy, 'intelligence'), false);
  assert.equal(Object.hasOwn(legacy, 'landmarks'), false);
});

test('malformed chart data fails closed without inventing landmarks or revealing the enemy', () => {
  const mission = fixture();
  for (const targets of [undefined, null, {}, [], [mission.markedTargets[0]], [...mission.markedTargets, mission.markedTargets[0]], [null, mission.markedTargets[1]], new Array(2), [mission.markedTargets[0], mission.markedTargets[0]]]) {
    assert.throws(() => getMissionScouting({ ...mission, markedTargets: targets }), /Scouting/);
  }
  for (const patch of [
    { name: undefined }, { name: null }, { name: 3 }, { name: '  ' },
    { type: 'barracks' }, { type: 'constructor' }, { type: ['watchtower'] },
    { x: -1 }, { x: Infinity }, { x: '2090' }, { x: 3201 },
    { lane: -1 }, { lane: 3 }, { lane: 1.5 }, { lane: '0' },
  ]) assert.throws(() => getMissionScouting({ ...mission, markedTargets: [{ ...mission.markedTargets[0], ...patch }, mission.markedTargets[1]] }), /Scouting/);
  for (const requiredTargets of [0, 1, 3, 1.5, '2', null]) assert.throws(() => getMissionScouting({ ...mission, requiredTargets }), /Scouting/);
  assert.equal(getMissionScouting({ ...mission, requiredTargets: 2 }).objectives.markedCount, 2);
});

test('selective scouting is deterministic, deeply frozen and leaves authored data untouched', () => {
  const mission = fixture(), before = structuredClone(mission), expected = outputs(mission);
  assertFrozen(expected.report);
  for (let i = 0; i < 4; i++) assert.deepEqual(outputs(mission), expected);
  assert.deepEqual(mission, before);
  assert.throws(() => expected.report.landmarks[0].condition = 'healthy', TypeError);
  assert.throws(() => expected.report.armies[1].buildings.push({ level: 3 }), TypeError);
  const freeze = value => { if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); } return value; };
  assert.deepEqual(outputs(freeze(structuredClone(mission))), expected);
});
