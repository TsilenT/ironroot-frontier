import test from 'node:test';
import assert from 'node:assert/strict';
import { runInContext } from 'node:vm';
import { MAPS, buildBounds, buildSites, getMap, getRuleset } from '../dist/engine.js';
import { createCampaignMission, createCampaignProgress, getCampaignMission,
  getCampaignTargets, getProgressionCampaignOverview, ONBOARDING_CHAPTER } from '../dist/campaign.js';
import { createCodex, formatNumber, formatSeconds } from '../dist/codex.js';
import { identityOf, scenarioForBattle } from '../dist/battle-codec.js';
import { missionBriefing } from '../dist/campaign-presentation.js';
import { campaignBuildChoices, campaignCoach, campaignTeaching } from '../dist/campaign-flow.js';
import { isProtectedCampaignBuilding } from '../dist/protected-objectives.js';
import { getMissionScouting, renderMissionScouting, renderScoutingSvg } from '../dist/scouting.js';
import { Renderer } from '../dist/render.js';
import { installCanvas, makeRenderer, styledCalls } from './renderer-canvas.mjs';
import { startupHarness } from './mobile-startup-fixture.mjs';

const ID = 'borrowed-ground';
const fresh = () => createCampaignMission(ID, { revision: 1 });
const json = value => JSON.parse(JSON.stringify(value));
function section(source, from, to) {
  const start = source.indexOf(from), end = source.indexOf(to, start);
  assert.ok(start >= 0 && end > start, `${from} source boundary`);
  return source.slice(start, end);
}
function harness() {
  installCanvas();
  const h = startupHarness({ width: 1180, height: 757 }), { c, source } = h;
  c.campaignProgress = createCampaignProgress();
  for (const mission of getProgressionCampaignOverview(c.campaignProgress).missions) {
    if (mission.id === ID) break;
    c.campaignProgress.missions[mission.id] = { completed: true, stars: 1, bestTime: 60 };
  }
  c.renderer = makeRenderer(Renderer, 1180, 398);
  c.ordinaryRenderer = c.renderer;
  c.selectedCampaign = ID;
  c.start();
  c.viewportPause.clear(); c.paused = false;
  for (const layer of c.dialogLayers) layer.classList.add('hidden');
  c.buildBounds = buildBounds;
  runInContext(section(source, 'function activateBattlePoint(', 'function resetBattleGesture()'), c);
  c.refreshPresentation(); c.updateHUD();
  return h;
}

test('actual app start binds Borrowed identity, ordinary full sight, camp and unlocked roster', () => {
  const { c, $ } = harness(), g = c.game;
  assert.deepEqual(identityOf(g, scenarioForBattle(null, ID, g)), {
    ruleset: { id: 'frontier-campaign-borrowed-ground', revision: 1 },
    map: { id: 'borrowed-yard', revision: 1 }, scenario: { kind: 'campaign', id: ID, revision: 1 },
  });
  assert.equal(g.schemaVersion, 3);
  assert.equal(c.currentCampaign, ID); assert.equal(c.mode, 'campaign');
  assert.equal(c.renderer.map.id, 'borrowed-yard');
  assert.equal(g.difficulty, 'normal'); assert.equal(g.ai, true);
  assert.equal(c.battleView(), g); assert.equal(g.state.fog, undefined);
  assert.equal($('enemyHpText').textContent, '100%');
  assert.equal($('objectiveProgress').textContent, '0/2 targets');
  assert.equal($('income').textContent, '+7.5 /s');
  assert.equal(c.protectedControls.size, 0);
  assert.equal(c.coachingHold, false); assert.equal(c.firstBuildHold, false);
  assert.equal(Object.keys(g.buildings).length, 8);
  assert.deepEqual(campaignBuildChoices(ID, { buildings: g.buildings }), Object.keys(g.buildings));
  assert.equal(campaignTeaching(ID), null); assert.equal(campaignCoach(g, ID), null);
  assert.deepEqual(g.serialize(), fresh().serialize());
});

test('actual title briefing and battle field guide use the mission map and its 12-building cap', () => {
  const { c, $, source } = harness();
  Object.assign(c, {
    createCodex, formatNumber, formatSeconds, getMap, getRuleset, ONBOARDING_CHAPTER,
    getCampaignOverview: getProgressionCampaignOverview, missionBriefing, renderMissionScouting,
    campaignPage: 'mission', briefingMission: null, drawUnitPortrait() {},
  });
  runInContext(section(source, 'function populateFieldGuide(', 'const viewportPause ='), c);
  runInContext(section(source, 'function renderCampaign()', "$('campaignStoryNav').onclick"), c);
  c.started = false; c.renderCampaign();
  assert.equal($('campaignMissionTitle').textContent, 'Borrowed Ground');
  assert.equal($('start').disabled, false);
  assert.match($('codexScope').textContent, /This battlefield allows 12 buildings per side/);
  assert.match($('economyCodex').innerHTML, /70 living troops and 12 buildings/);
  assert.equal(($('unitCodex').innerHTML.match(/data-codex-unit=/g) || []).length, 6);
  assert.match($('campaignGoal').textContent, /both original roadblocks or the enemy citadel/);
  assert.match($('campaignScoutReport').innerHTML, /12-building limit per side/);
  $('start').onclick();
  assert.equal(c.currentCampaign, ID);
  assert.match($('codexScope').textContent, /This battlefield allows 12 buildings per side/);
  assert.match($('economyCodex').innerHTML, /70 living troops and 12 buildings/);
});

test('actual Restart-to-briefing and Begin reset mutable play while retaining exact identity', () => {
  const { c, $ } = harness(), original = c.game, start = original.serialize();
  const identity = identityOf(original, scenarioForBattle(null, ID, original));
  c.ui.build = 'barracks'; c.activateBattlePoint({ x: 410, y: 260 });
  for (let i = 0; i < 16; i++) original.update(.25);
  c.ui.selected = original.state.buildings.find(b => b.side === 0 && b.type === 'watchtower').id;
  const retained = original.serialize(), writes = [], titles = [];
  c.showTitle = options => { titles.push(options); c.started = false; };
  c.SAVE = 'isolated-test-battle';
  c.writeBattle = (...args) => { writes.push(args); return true; };
  c.paused = true;
  c.returnToBriefing('restartStatus');
  assert.equal(titles.length, 1); assert.equal(writes.length, 0);
  assert.equal(c.game, original); assert.deepEqual(c.game.serialize(), retained);
  assert.deepEqual(c.briefingRestart.game.serialize(), start);
  assert.equal(c.briefingRestart.campaign, ID);
  $('start').onclick();
  assert.equal(writes.length, 1); assert.equal(writes[0][4], ID);
  assert.notEqual(c.game, original); assert.deepEqual(c.game.serialize(), start);
  assert.deepEqual(identityOf(c.game, scenarioForBattle(null, ID, c.game)), identity);
  assert.equal(c.renderer.map.id, 'borrowed-yard'); assert.equal(c.ui.selected, null);
  assert.equal(c.briefingRestart, null); assert.equal(c.objectiveOutcome, null);
});

test('actual field input keeps occupied sites occupied and pays ordinary prices for free plots', () => {
  const { c } = harness(), g = c.game;
  const before = g.serialize();
  c.ui.build = 'barracks';
  c.activateBattlePoint({ x: 970 + 15, y: 260 + 10 });
  assert.deepEqual(g.serialize(), before); assert.equal(c.ui.build, 'barracks');
  c.activateBattlePoint({ x: 410 + 12, y: 260 + 10 });
  const purchased = g.state.buildings.find(b => b.side === 0 && b.x === 410 && b.lane === 0);
  assert.equal(purchased.type, 'barracks');
  assert.equal(g.state.gold[0], before.state.gold[0] - g.buildings.barracks.cost);
  assert.equal(c.ui.build, null);
  c.activateBattlePoint({ x: purchased.x, y: purchased.y }); c.updateSelection();
  assert.equal(c.ui.selected, purchased.id);
});

test('inherited assets have ordinary selection, paid upgrades and health-adjusted salvage without protection locks', () => {
  for (const type of ['watchtower', 'barracks', 'archery', 'mint']) {
    const { c, $ } = harness(), g = c.game;
    const b = g.state.buildings.find(b => b.side === 0 && b.type === type);
    c.activateBattlePoint(b); c.updateSelection();
    assert.equal(c.ui.selected, b.id); assert.equal($('selectionTitle').textContent, g.buildings[type].name);
    assert.equal(isProtectedCampaignBuilding(g, ID, b.id), false);
    assert.equal($('sell').disabled, false);
    assert.equal($('sell').textContent, `Salvage · +${Math.floor(b.invested * .5)}`);
    const cost = g.upgradeCost(b), gold = g.state.gold[0];
    assert.equal($('upgrade').textContent, `Upgrade · ◆ ${cost}`);
    $('upgrade').onclick();
    assert.equal(b.level, 2); assert.equal(g.state.gold[0], gold - cost);
    assert.equal(b.invested, g.buildings[type].cost + cost);
    b.hp = b.maxHp * .61;
    c.refreshPresentation(); c.updateSelection();
    const refund = Math.floor(b.invested * .5 * b.hp / b.maxHp), beforeSell = g.state.gold[0];
    assert.equal($('sell').textContent, `Salvage · +${refund}`);
    $('sell').onclick();
    assert.equal(g.state.gold[0], beforeSell + refund);
    assert.equal(g.state.buildings.some(candidate => candidate.id === b.id), false);
    assert.equal(c.ui.selected, null); assert.equal($('objectiveProgress').textContent, '0/2 targets');
    assert.equal(g.state.winner, null); assert.equal(c.objectiveOutcome, null);
  }
});

test('actual objective HUD credits original roadblock IDs and ignores same-site replacement towers', () => {
  const { c, $ } = harness(), g = c.game;
  const targets = getCampaignTargets(g, ID);
  assert.deepEqual(targets.map(t => [t.name, t.originalId]), [['North Roadblock', 12], ['South Roadblock', 13]]);
  assert.ok(targets.every(t => t.kind === 'destroy' && t.side === 1));
  const first = targets[0];
  g.state.buildings = g.state.buildings.filter(b => b.id !== first.originalId);
  g.state.gold[1] += g.buildings.watchtower.cost; // Synthetic replacement boundary, not paid-route evidence.
  const replacement = g.build(first.type, first.x, g.map.lanes[first.lane], 1);
  assert.equal(replacement.ok, true); assert.notEqual(replacement.building.id, first.originalId);
  c.refreshPresentation(); c.updateHUD();
  assert.equal($('objectiveProgress').textContent, '1/2 targets');
  const observed = getCampaignTargets(g, ID);
  assert.equal(observed[0].originalId, first.originalId); assert.equal(observed[0].building, null);
  assert.equal(observed[1].originalId, targets[1].originalId);
  assert.equal(c.protectedControls.size, 0);
});

test('renderer snaps only to the 12 real plots per side including ties, not the omitted Classic columns', () => {
  installCanvas(); const r = makeRenderer(Renderer); r.setMap('borrowed-yard');
  for (const side of [0, 1]) {
    const sites = buildSites(r.map, side); assert.equal(sites.length, 12);
    for (const site of sites) assert.deepEqual(r.snap(site, side), { x: site.x, y: site.y });
    for (let x = -100; x <= 3300; x += 23) for (const y of [-10, 260, 355, 450, 545, 640, 1000]) {
      const p = r.snap({ x, y }, side);
      assert.ok(sites.some(site => site.x === p.x && site.y === p.y));
    }
  }
  assert.deepEqual(r.snap({ x: 550, y: 355 }), { x: 690, y: 450 });
  assert.deepEqual(r.snap({ x: 830, y: 545 }), { x: 970, y: 640 });
  assert.deepEqual(r.snap({ x: 2650, y: 355 }, 1), { x: 2510, y: 450 });
});

test('renderer grid, ghost and selection use real camp positions and keep finite balanced canvas frames', () => {
  installCanvas();
  for (const [width, height] of [[1180, 398], [390, 650], [844, 390]]) {
    const r = makeRenderer(Renderer, width, height), g = fresh(); r.setMap(g.map);
    const b = g.state.buildings.find(b => b.side === 0 && b.type === 'watchtower');
    const calls = [], canBuild = g.canBuild.bind(g);
    g.canBuild = (type, x, y) => { calls.push([x, y]); return canBuild(type, x, y); };
    r.canvas.reset(); r.mini.reset();
    r.draw(g, { paused: true, build: 'barracks', pointer: { x: 970 + 10, y: 260 + 10 }, selected: b.id }, 0);
    assert.deepEqual(calls, [...buildSites(g.map, 0).map(s => [s.x, s.y]), [970, 260]]);
    const plots = styledCalls(r.canvas, 'fillRect').filter(c => ['#c8e2a429', '#273d2820'].includes(c.style));
    assert.equal(plots.length, 12); assert.equal(plots.filter(c => c.style === '#c8e2a429').length, 3);
    assert.ok(styledCalls(r.canvas, 'strokeRect', 'strokeStyle').some(c => c.style === '#e89176' && JSON.stringify(c.args) === JSON.stringify([915, 205, 110, 110])));
    assert.ok(r.canvas.calls.some(c => c[0] === 'arc' && c[1] === b.x && c[2] === b.y && c[3] === g.buildings[b.type].range));
    assert.ok(r.canvas.calls.some(c => c[0] === 'ellipse' && c[1] === b.x && c[2] === b.y + 18 && c[3] === 65));
    assert.equal(r.canvas.depth(), 0); assert.equal(r.mini.depth(), 0);
  }
});

test('terrain cache switches safely into and out of Borrowed Yard while minimap projects actual deployment', () => {
  installCanvas(); const r = makeRenderer(Renderer, 1180, 398), classic = r.baseTerrain, g = fresh();
  r.setMap(g.map); r.setTheme('woodland');
  assert.notEqual(r.baseTerrain, classic); assert.equal(classic.width, 0);
  assert.equal(r.terrain.width, 3200); assert.equal(r.terrain.height, 900);
  const borrowed = r.baseTerrain; r.setMap('borrowed-yard'); assert.equal(r.baseTerrain, borrowed);
  r.mini.reset(); r.drawMinimap(g.state, g);
  assert.deepEqual(r.mini.calls.filter(c => c[0] === 'moveTo'), g.map.lanes.map(y => ['moveTo', 0, y / 900 * 72]));
  const rects = styledCalls(r.mini, 'fillRect');
  for (const side of [0, 1]) {
    const buildings = g.state.buildings.filter(b => b.side === side), dots = rects.filter(c => c.style === (side ? '#e9a080' : '#bbdfaf'));
    assert.equal(dots.length, buildings.length);
    assert.deepEqual(dots.map(c => c.args), buildings.map(b => [b.x / 3200 * 240 - 1, b.y / 900 * 72 - 1, 3, 3]));
  }
  assert.deepEqual(rects.find(c => c.style === '#e5a281').args, [3090 / 3200 * 240 - 2, 33, 4, 6]);
  r.setMap('classic'); assert.equal(borrowed.width, 0); assert.equal(r.map, MAPS.classic);
});

test('scouting names and depicts both actual formations, levels, roads, cap and original roadblocks', () => {
  const mission = getCampaignMission(ID), g = fresh(), before = g.serialize();
  const report = getMissionScouting(mission, g), html = renderMissionScouting(mission), svg = renderScoutingSvg(mission);
  assert.equal(report.map.id, g.map.id); assert.equal(report.map.siteLimit, 12);
  assert.equal(report.map.placement, 'Marked building sites');
  assert.equal(report.objectives.protectedCount, 0); assert.equal(report.objectives.markedCount, 2);
  assert.equal((svg.match(/class="scouting-building"/g) || []).length, 17);
  assert.equal((svg.match(/class="scouting-destroy"/g) || []).length, 2);
  assert.doesNotMatch(svg, /class="scouting-protect"|class="scouting-charted"/);
  for (const army of report.armies) {
    const actual = g.state.buildings.filter(b => b.side === army.side);
    assert.equal(army.buildingCount, actual.length);
    for (const building of army.buildings) {
      assert.ok(actual.some(b => ['type', 'side', 'x', 'y', 'lane', 'level'].every(key => b[key] === building[key])));
      assert.ok(svg.includes(`transform="translate(${building.x} ${building.y})"`));
      assert.ok(html.includes(`${building.name} (level ${building.level}`));
    }
  }
  assert.deepEqual(report.armies[1].buildings.filter(b => b.targetKind).map(b => [b.targetName, b.x, b.lane]), [['North Roadblock', 1950, 0], ['South Roadblock', 1950, 2]]);
  assert.deepEqual(g.serialize(), before, 'briefing does not change runtime state');
});

test('briefing distinguishes optional reconfiguration and medals from the original-target win condition', () => {
  const mission = getCampaignMission(ID), brief = missionBriefing(mission), g = fresh();
  assert.match(brief.goal, /both original roadblocks or the enemy citadel within 10:00/);
  assert.match(brief.goal, /Your citadel must survive/); assert.equal(brief.protection, '');
  assert.ok(brief.facts.includes('10:00 time limit'));
  assert.doesNotMatch(brief.facts.join(' '), /4,500|4:00/);
  const text = mission.briefing.join(' ');
  assert.match(text, /12 building sites per side/); assert.match(text, /not protected objectives/);
  assert.match(text, /Salvage returns half the invested gold.*current health.*rounded down/);
  assert.match(text, /Later replacement towers do not undo original-roadblock destruction/);
  assert.match(text, /normal adaptive enemy pays/i);
  assert.match(mission.hint, /Keep and upgrade.*or salvage/); assert.match(mission.hint, /No building or unit is required/);
  const value = side => g.state.buildings.filter(b => b.side === side).reduce((sum, b) => sum + b.invested, 0);
  assert.ok(text.includes(value(0).toLocaleString('en-US'))); assert.ok(text.includes(value(1).toLocaleString('en-US')));
  const free = buildSites(g.map, 0).filter(s => g.canBuild('barracks', s.x, s.y).ok);
  assert.deepEqual(free.map(s => [s.x, s.lane]), [[410, 0], [690, 1], [410, 2]]);
  assert.ok(free.every(site => site.x < 970));
});

test('actual Skirmish map picker excludes the campaign-only map and fresh Skirmish resets campaign UI', () => {
  const { c, $, source } = harness();
  c.MAPS = MAPS; c.getMap = getMap; c.updateSkirmishRules = () => {};
  runInContext(section(source, 'const mapDescriptions =', "for (const btn of document.querySelectorAll('[data-difficulty]'))"), c);
  const maps = $('mapChoices').querySelectorAll('[data-map]').map(button => button.dataset.map);
  assert.deepEqual(json(maps), ['classic', 'long-march', 'twin-span']); assert.equal(maps.includes('borrowed-yard'), false);
  c.mode = 'skirmish'; c.selectedMap = 'classic';
  $('skirmishFog').checked = false; $('skirmishBridgeIncome').checked = false;
  c.start(); c.updateHUD();
  assert.equal(c.currentCampaign, null); assert.equal(c.game.map.id, 'classic'); assert.equal(c.renderer.map.id, 'classic');
  assert.equal(c.game.ruleset.campaignOnly, undefined); assert.equal(c.protectedControls.size, 0);
  assert.equal($('matchType').textContent, 'SOLO SKIRMISH');
});
