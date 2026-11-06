import assert from 'node:assert/strict';
import test from 'node:test';
import { BUILDINGS, MAPS } from '../dist/engine.js';
import { CAMPAIGN_MISSIONS, createCampaignMission } from '../dist/campaign.js';
import { getMissionScouting, renderMissionScouting, renderScoutingSvg } from '../dist/scouting.js';

const clone = value => structuredClone(value);
const fixture = mapId => ({
  name: 'Scout the frontier', mapId,
  playerBuildings: [['mint', 410, 0], ['archery', 830, 0, 2], ['barracks', 970, 1]],
  enemyBuildings: [['barracks', MAPS[mapId].width - 970, 0, 3], ['watchtower', MAPS[mapId].width - 1250, 1, 2]],
  protectedTargets: [{ type: 'mint', x: 410, lane: 0 }],
  markedTargets: [{ type: 'watchtower', x: MAPS[mapId].width - 1250, lane: 1 }],
});
const originals = ['emberwatch', 'three-roads', 'winter-stores', 'wings-of-ash', 'stonegate', 'long-vigil', 'cold-forge', 'black-ledger', 'furnace-heart', 'crown-foothold', 'last-light', 'ironroot'];
const assertFrozen = value => {
  if (value && typeof value === 'object') {
    assert.ok(Object.isFrozen(value));
    Object.values(value).forEach(assertFrozen);
  }
};

test('map reports use real dimensions, lane centers and per-side building limits', () => {
  for (const mapId of Object.keys(MAPS)) {
    const source = MAPS[mapId], mission = fixture(mapId), report = getMissionScouting(mission);
    assert.equal(report.map.id, source.id);
    assert.equal(report.map.name, source.name);
    assert.equal(report.map.width, source.width);
    assert.equal(report.map.height, source.height);
    assert.equal(report.map.roadCount, source.lanes.length);
    assert.equal(report.map.siteLimit, source.buildLimit);
    assert.deepEqual(report.map.lanes, source.lanes);
    for (const army of report.armies) for (const building of army.buildings) assert.equal(building.y, source.lanes[building.lane]);
    assert.deepEqual(report.map.territories.map(bounds => [bounds.minX, bounds.maxX]), [[200, 1320], [source.width - 1320, source.width - 200]]);
    assert.match(report.map.summary, new RegExp(`${source.width} × ${source.height}`));
  }
  assert.equal(getMissionScouting({}).map.id, 'classic');
  assert.match(getMissionScouting({}).map.placement, /Free placement/);
  assert.match(getMissionScouting(fixture('twin-span')).map.placement, /Marked building sites/);
});

test('SVG projects authored x positions and lanes without normalizing maps to Classic', () => {
  for (const mapId of Object.keys(MAPS)) {
    const mission = fixture(mapId), svg = renderScoutingSvg(mission), map = MAPS[mapId];
    assert.ok(svg.includes(`viewBox="0 0 ${map.width} ${map.height}"`));
    assert.equal((svg.match(/class="scouting-road"/g) || []).length, map.lanes.length);
    assert.equal((svg.match(/class="scouting-building"/g) || []).length, mission.playerBuildings.length + mission.enemyBuildings.length);
    for (const [type, x, lane] of [...mission.playerBuildings, ...mission.enemyBuildings]) {
      assert.ok(svg.includes(`transform="translate(${x} ${map.lanes[lane]})"`), `${mapId}/${type}/${x}/${lane}`);
    }
    for (const y of map.lanes) assert.ok(svg.includes(`d="M 0 ${y} H ${map.width}"`));
    assert.ok(svg.includes('preserveAspectRatio="xMidYMid meet"'));
  }
  const twin = renderScoutingSvg(fixture('twin-span'));
  assert.ok(!twin.includes('data-lane="2"'));
  assert.ok(!getMissionScouting(fixture('twin-span')).armies.flatMap(army => army.roads).some(road => /Middle/.test(road.name)));
});

test('army names, counts and mixed levels derive from all seven known building types', () => {
  const mission = { playerBuildings: Object.keys(BUILDINGS).map((type, i) => [type, 270 + i * 140, 0]), enemyBuildings: [['barracks', 2230, 0], ['barracks', 2370, 0, 3], ['barracks', 2230, 1, 3], ['aerie', 2650, 2, 2]] };
  const [left, right] = getMissionScouting(mission).armies;
  assert.equal(left.side, 0); assert.equal(left.position, 'left'); assert.equal(left.shape, 'square');
  assert.equal(right.side, 1); assert.equal(right.position, 'right'); assert.equal(right.shape, 'diamond');
  assert.equal(left.buildingCount, 7); assert.equal(right.buildingCount, 4);
  assert.deepEqual(left.groups.map(group => group.type), Object.keys(BUILDINGS));
  for (const group of left.groups) {
    assert.equal(group.name, BUILDINGS[group.type].name);
    assert.equal(group.count, 1);
    assert.deepEqual(group.levels, [{ level: 1, count: 1 }]);
    assert.ok(left.summary.includes(BUILDINGS[group.type].name));
  }
  assert.deepEqual(right.groups[0].levels, [{ level: 1, count: 1 }, { level: 3, count: 2 }]);
  assert.equal(right.groups[0].count, 3);
  assert.match(right.summary, /3 × Barracks \(1 at level 1, 2 at level 3\)/);
  assert.match(right.roads[2].summary, /1 × Gryphon aerie \(level 2\)/);
});

test('protection and destruction have distinct kinds, shapes and readable road details', () => {
  const mission = fixture('twin-span'), report = getMissionScouting(mission), svg = renderScoutingSvg(mission), html = renderMissionScouting(mission);
  assert.equal(report.objectives.protectedCount, 1); assert.equal(report.objectives.markedCount, 1);
  assert.equal(report.armies[0].buildings.find(b => b.type === 'mint').targetKind, 'protect');
  assert.equal(report.armies[1].buildings.find(b => b.type === 'watchtower').targetKind, 'destroy');
  assert.match(report.armies[0].roads[0].summary, /Gold mine \(level 1, protect\)/);
  assert.match(report.armies[1].roads[1].summary, /Watchtower \(level 2, destroy\)/);
  assert.match(svg, /<rect class="scouting-friendly"/);
  assert.match(svg, /<path class="scouting-enemy"/);
  assert.match(svg, /<path class="scouting-protect"/);
  assert.match(svg, /<circle class="scouting-destroy"[^>]*stroke-dasharray/);
  assert.equal((svg.match(/class="scouting-protect"/g) || []).length, 1);
  assert.equal((svg.match(/class="scouting-destroy"/g) || []).length, 1);
  assert.match(html, /Shield outline: protect\. Dashed ring: destroy\./);
  mission.protectedTargets.push(clone(mission.protectedTargets[0]));
  mission.markedTargets.push(clone(mission.markedTargets[0]));
  assert.deepEqual(getMissionScouting(mission), report, 'repeated objective references count one structure');
});

test('markup supplies accessible static map semantics and readable deployment text', () => {
  const mission = fixture('long-march'), html = renderMissionScouting(mission), svg = renderScoutingSvg(mission);
  assert.match(svg, /role="img"/); assert.match(svg, /aria-label="Scout the frontier: starting deployment\./);
  assert.match(svg, /<title>Scout the frontier: starting deployment<\/title>/);
  assert.match(svg, /<desc>.*Long March.*4000 × 900.*3 roads.*North is at the top\./);
  assert.match(svg, /focusable="false"/);
  assert.ok(!svg.includes('<text'), 'no tiny in-map building labels');
  assert.match(html, /Your army · left/); assert.match(html, /Enemy army · right/);
  assert.match(html, /North road/); assert.match(html, /Middle road/); assert.match(html, /South road/);
  assert.match(html, /No starting buildings\./);
  assert.match(html, /Starting buildings only/);
  assert.ok(!/<(?:script|image|foreignObject|animate|animateTransform|set)\b|\bon\w+=|\b(?:href|src)=/i.test(html));
  assert.ok(!/<(?:details|button|input)\b/.test(html), 'parent owns the disclosure and CTA');
  assert.ok(!/\sid=/.test(html), 'multiple previews do not create duplicate IDs');
});

test('all mission strings are escaped in SVG attributes and HTML text', () => {
  const name = `Raid </title><script>alert("x")</script><svg onload='attack'>&\u0000`;
  const mission = { ...fixture('classic'), name, id: '" onload="attack', briefing: ['<img src=x onerror=attack>'] };
  for (const output of [renderScoutingSvg(mission), renderMissionScouting(mission)]) {
    assert.ok(output.includes('Raid &lt;/title&gt;&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;&lt;svg onload=&#39;attack&#39;&gt;&amp;\ufffd'));
    assert.ok(!output.includes('<script>'));
    assert.ok(!output.includes('<svg onload='));
    assert.ok(!output.includes('<img'));
    assert.ok(!output.includes('\u0000'));
    assert.equal((output.match(/<svg\b/g) || []).length, 1);
  }
  assert.equal(getMissionScouting(mission).missionName, name, 'structured strings remain text, not double-escaped');
  const unicode = renderScoutingSvg({ name: 'Signal \ud800 \udfff 🛡' });
  assert.ok(unicode.includes('Signal \ufffd \ufffd 🛡'), 'invalid XML surrogates are replaced while real Unicode stays intact');
});

test('malformed mission, map, deployment and objective data fails without guessing', () => {
  for (const mission of [null, undefined, [], 'mission', 7]) assert.throws(() => getMissionScouting(mission), TypeError);
  for (const mapId of [null, 0, {}, '', 'missing', '__proto__', 'constructor']) assert.throws(() => getMissionScouting({ mapId }), /Unknown battlefield/);
  for (const name of [null, 1, {}, []]) assert.throws(() => getMissionScouting({ name }), TypeError);
  for (const field of ['playerBuildings', 'enemyBuildings', 'markedTargets', 'protectedTargets']) {
    for (const value of [null, 'bad', {}, 1]) assert.throws(() => getMissionScouting({ [field]: value }), TypeError);
  }
  const badTuples = [null, {}, [], ['barracks'], ['barracks', 270], ['barracks', 270, 0, 1, 'extra'], ['missing', 270, 0], ['constructor', 270, 0], ['barracks', '270', 0], ['barracks', NaN, 0], ['barracks', Infinity, 0], ['barracks', -1, 0], ['barracks', 3201, 0], ['barracks', 270, -1], ['barracks', 270, 2], ['barracks', 270, 0.5], ['barracks', 270, '0'], ['barracks', 270, 0, null], ['barracks', 270, 0, 0], ['barracks', 270, 0, 4], ['barracks', 270, 0, 1.5], ['barracks', 270, 0, '2']];
  for (const tuple of badTuples) assert.throws(() => getMissionScouting({ mapId: 'twin-span', playerBuildings: [tuple] }), /Scouting/);
  assert.throws(() => getMissionScouting({ playerBuildings: new Array(1) }), /must be \[type/);
  assert.throws(() => getMissionScouting({ markedTargets: new Array(1) }), /target objects/);
  assert.throws(() => getMissionScouting({ playerBuildings: [['barracks', 270, 0], ['archery', 270, 0]] }), /repeats a building position/);
  for (const target of [null, [], 'bad', {}, { type: 'mint', x: 410, lane: 2 }, { type: 'mint', x: 411, lane: 0 }, { type: 'watchtower', x: 1950, lane: 1 }]) {
    assert.throws(() => getMissionScouting({ ...fixture('twin-span'), protectedTargets: [target] }), /Scouting/);
  }
  assert.throws(() => getMissionScouting({ ...fixture('classic'), markedTargets: [{ type: 'mint', x: 410, lane: 0 }] }), /starting enemy building/);
  assert.throws(() => renderMissionScouting({ mapId: 'missing' }), /Unknown battlefield/);
  assert.throws(() => renderScoutingSvg({ playerBuildings: [['bad', 270, 0]] }), /Scouting/);
});

test('repeated output is deterministic, input order is canonical and nothing mutates', () => {
  const mission = fixture('long-march'), before = clone(mission), engineBefore = clone(MAPS), rosterBefore = clone(BUILDINGS);
  const report = getMissionScouting(mission), html = renderMissionScouting(mission), svg = renderScoutingSvg(mission);
  assertFrozen(report);
  for (let i = 0; i < 4; i++) {
    assert.deepEqual(getMissionScouting(mission), report);
    assert.equal(renderMissionScouting(mission), html);
    assert.equal(renderScoutingSvg(mission), svg);
  }
  const reversed = clone(mission); reversed.playerBuildings.reverse(); reversed.enemyBuildings.reverse();
  assert.deepEqual(getMissionScouting(reversed), report);
  assert.equal(renderMissionScouting(reversed), html);
  const frozenMission = (function deepFreeze(value) { if (value && typeof value === 'object') { Object.values(value).forEach(deepFreeze); Object.freeze(value); } return value; })(clone(mission));
  assert.equal(renderMissionScouting(frozenMission), html);
  assert.deepEqual(mission, before); assert.deepEqual(MAPS, engineBefore); assert.deepEqual(BUILDINGS, rosterBefore);
  assert.throws(() => report.armies[0].buildings[0].level = 3, TypeError);
  assert.throws(() => report.map.lanes.push(999), TypeError);
});

test('empty authored deployments stay empty and do not imply default skirmish buildings', () => {
  const report = getMissionScouting({});
  assert.equal(report.missionName, 'Mission');
  assert.deepEqual(report.armies.map(army => army.buildingCount), [0, 0]);
  assert.deepEqual(report.armies.map(army => army.groups), [[], []]);
  assert.equal(report.objectives.protectedCount, 0); assert.equal(report.objectives.markedCount, 0);
  assert.ok(!renderScoutingSvg({}).includes('class="scouting-building"'));
});

test('all original and new campaign reports agree with actual authored mission starts', () => {
  // Assert the legacy roster by its order, without freezing the campaign length.
  assert.deepEqual(CAMPAIGN_MISSIONS.filter(mission => mission.number <= 12).map(mission => mission.id), originals);
  for (const mission of CAMPAIGN_MISSIONS) {
    const before = clone(mission), report = getMissionScouting(mission), game = createCampaignMission(mission.id);
    if (mission.number <= 12) {
      assert.equal(report.map.id, 'classic');
      const legacy = clone(mission); delete legacy.mapId;
      assert.deepEqual(getMissionScouting(legacy), report);
    }
    assert.equal(report.map.id, game.map.id);
    for (const army of report.armies) {
      const real = game.state.buildings.filter(building => building.side === army.side);
      assert.equal(army.buildingCount, real.length);
      for (const building of army.buildings) assert.ok(real.some(actual => ['type', 'x', 'y', 'lane', 'side', 'level'].every(field => actual[field] === building[field])), `${mission.id}/${building.type}/${building.x}`);
      assert.equal(army.groups.reduce((sum, group) => sum + group.count, 0), real.length);
      for (const group of army.groups) assert.equal(group.levels.reduce((sum, level) => sum + level.count, 0), group.count);
    }
    assert.equal(report.objectives.protectedCount, mission.protectedTargets.length);
    assert.equal(report.objectives.markedCount, mission.markedTargets.length);
    assert.ok(renderMissionScouting(mission).length > 0);
    assert.deepEqual(mission, before);
  }
});

test('Black Ledger watchtower stays level 1 in aggregate, road and SVG text', () => {
  const mission = CAMPAIGN_MISSIONS.find(mission => mission.id === 'black-ledger');
  const game = createCampaignMission(mission.id), report = getMissionScouting(mission);
  const html = renderMissionScouting(mission), svg = renderScoutingSvg(mission);
  const towers = game.state.buildings.filter(building => building.side === 1 && building.type === 'watchtower');
  assert.deepEqual(towers.map(({ x, lane, level }) => ({ x, lane, level })), [{ x: 2510, lane: 1, level: 1 }]);
  const aggregate = '1 × Barracks (level 1); 1 × Watchtower (level 1); 3 × Gold mine (level 1).';
  const middle = '1 × Barracks (level 1); 1 × Watchtower (level 1); 1 × Gold mine (level 1, destroy).';
  assert.equal(report.armies[1].summary, aggregate);
  assert.equal(report.armies[1].roads[1].summary, middle);
  assert.ok(html.includes(`<p class="scouting-roster">${aggregate}</p>`));
  assert.ok(html.includes(`<li><strong>Middle road:</strong> ${middle}</li>`));
  assert.ok(svg.includes('transform="translate(2510 450)"><title>Enemy Watchtower, level 1, Middle road</title>'));
  for (const output of [html, svg]) assert.doesNotMatch(output, /Watchtower(?: \(level|, level) [23]/);
});

test('every campaign aggregate, road and SVG level label matches actual factory buildings', t => {
  let verifiedBuildings = 0;
  for (const mission of CAMPAIGN_MISSIONS) {
    const game = createCampaignMission(mission.id), report = getMissionScouting(mission);
    const html = renderMissionScouting(mission), svg = renderScoutingSvg(mission);
    const roadNames = game.map.lanes.length === 2 ? ['North road', 'South road'] : ['North road', 'Middle road', 'South road'];
    const kindFor = building => {
      const targets = building.side === 0 ? mission.protectedTargets : mission.markedTargets;
      return targets.some(target => target.type === building.type && target.x === building.x && target.lane === building.lane)
        ? building.side === 0 ? 'protect' : 'destroy' : null;
    };
    // Read each rendered marker at its actual position, so one correct tooltip
    // cannot hide a second wrong label for another building of the same type.
    const markers = [...svg.matchAll(/<g class="scouting-building" data-side="(\d+)" data-lane="(\d+)" data-kind="([^"]*)" transform="translate\(([^ ]+) ([^)]+)\)"><title>([^<]*)<\/title>/g)]
      .map(([, side, lane, kind, x, y, title]) => ({ side: Number(side), lane: Number(lane), kind, x: Number(x), y: Number(y), title }));
    assert.equal(markers.length, game.state.buildings.length, `${mission.id}: rendered marker count`);
    for (const building of game.state.buildings) {
      const matches = markers.filter(marker => marker.side === building.side && marker.lane === building.lane && marker.x === building.x && marker.y === building.y);
      assert.equal(matches.length, 1, `${mission.id}: unique marker at ${building.x}/${building.y}`);
      const kind = kindFor(building);
      assert.equal(matches[0].kind, kind || 'ordinary');
      assert.equal(matches[0].title, `${building.side === 0 ? 'Allied' : 'Enemy'} ${BUILDINGS[building.type].name}, level ${building.level}, ${roadNames[building.lane]}${kind ? `, ${kind}` : ''}`, `${mission.id}: SVG level label`);
      verifiedBuildings++;
    }
    for (const side of [0, 1]) {
      const actual = game.state.buildings.filter(building => building.side === side);
      const section = html.match(new RegExp(`<section class="scouting-army scouting-army-${side === 0 ? 'left' : 'right'}"[^>]*>([\\s\\S]*?)</section>`))?.[1];
      assert.ok(section, `${mission.id}/${side}: rendered army section`);
      // Oracle is the instantiated game, not scouting's own groups or strings.
      const aggregates = [];
      for (const type of Object.keys(BUILDINGS)) {
        const own = actual.filter(building => building.type === type);
        if (!own.length) continue;
        const levels = [...new Set(own.map(building => building.level))].sort((a, b) => a - b);
        const levelText = levels.length === 1 ? `level ${levels[0]}` : levels.map(level => `${own.filter(building => building.level === level).length} at level ${level}`).join(', ');
        aggregates.push(`${own.length} × ${BUILDINGS[type].name} (${levelText})`);
      }
      const expectedAggregate = aggregates.length ? `${aggregates.join('; ')}.` : 'No starting buildings.';
      assert.equal(report.armies[side].summary, expectedAggregate, `${mission.id}/${side}: aggregate report`);
      assert.equal(section.match(/<p class="scouting-roster">([^<]*)<\/p>/)?.[1], expectedAggregate, `${mission.id}/${side}: rendered aggregate`);
      const renderedRoads = [...section.matchAll(/<li><strong>([^<]*):<\/strong> ([^<]*)<\/li>/g)].map(([, name, summary]) => ({ name, summary }));
      assert.equal(renderedRoads.length, game.map.lanes.length, `${mission.id}/${side}: rendered road count`);
      for (let lane = 0; lane < game.map.lanes.length; lane++) {
        const entries = [];
        for (const type of Object.keys(BUILDINGS)) for (const level of [1, 2, 3]) for (const kind of [null, 'protect', 'destroy']) {
          const count = actual.filter(building => building.lane === lane && building.type === type && building.level === level && kindFor(building) === kind).length;
          if (count) entries.push(`${count} × ${BUILDINGS[type].name} (level ${level}${kind ? `, ${kind}` : ''})`);
        }
        const summary = entries.length ? `${entries.join('; ')}.` : 'No starting buildings.';
        assert.equal(report.armies[side].roads[lane].summary, summary, `${mission.id}/${side}/${lane}: road report`);
        assert.deepEqual(renderedRoads[lane], { name: roadNames[lane], summary }, `${mission.id}/${side}/${lane}: rendered road levels`);
      }
    }
  }
  t.diagnostic(`Verified ${verifiedBuildings} actual starting buildings across ${CAMPAIGN_MISSIONS.length} missions against aggregate, road and positioned SVG text.`);
});
