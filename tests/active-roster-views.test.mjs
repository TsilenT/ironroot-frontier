import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { Game, BUILDINGS, UNITS, getRuleset, MAPS } from '../dist/engine.js';
import { identityOf } from '../dist/battle-codec.js';
import { createCodex, UNIT_CODEX } from '../dist/codex.js';
import { createBattleJournal, exportBattleReport } from '../dist/battle-report.js';
import { renderBattleReport } from '../dist/report-view.js';
import { getMissionScouting } from '../dist/scouting.js';
import { Renderer, drawUnitPortrait } from '../dist/render.js';
import { Renderer as AcceptedRenderer, drawUnitPortrait as acceptedPortrait } from '../qa/fixtures/accepted-clarity/render.js';
import { drawRootwarden } from '../dist/rootwarden-art.js';
import { mockCanvas, makeRenderer, installCanvas } from './renderer-canvas.mjs';
import { createBattleJournal as createLegacyJournal } from '../qa/fixtures/production-v012/dist/battle-report.js';
import { Game as LegacyGame } from '../qa/fixtures/production-v012/dist/engine.js';
import { classicSnapshot, gameFixture, viewports } from './renderer-scenarios.mjs';

const rootGame = (mode = 'open', extra = {}) => new Game({ ai: false, rulesetId: `frontier-rootwarden-${mode}`, rulesetRevision: 1, ...extra });
const objective = { completed: true, failed: false, label: 'Observed objective complete.' };
const finish = (game, options = {}) => createBattleJournal(game, options).finish(game, { objectiveOutcome: objective });
const hash = path => createHash('sha256').update(readFileSync(new URL(path, import.meta.url))).digest('hex');

test('catalogues bind to one immutable roster, keep legacy exports clean and derive new figures', () => {
  assert.equal(Object.keys(UNITS).length, 5);
  assert.equal(Object.keys(BUILDINGS).length, 7);
  assert.equal(UNIT_CODEX.length, 5);
  const legacy = new Game({ ai: false });
  for (const mode of ['open', 'timed']) {
    const game = rootGame(mode), before = JSON.stringify(game.serialize());
    const catalogue = createCodex(game), entry = catalogue.UNIT_CODEX.find(unit => unit.id === 'rootwarden');
    assert.equal(catalogue.UNIT_CODEX.length, 6);
    for (const key of ['hp', 'damage', 'range', 'speed', 'attackTime', 'flying', 'canAttackAir', 'canAttackGround']) assert.equal(entry.baseStats[key], game.units.rootwarden[key]);
    for (const key of ['name', 'cost', 'hp', 'spawnTime']) assert.equal(entry.production[key], game.buildings.wardenLodge[key]);
    assert.deepEqual(entry.production.upgradeCosts, [1, 2].map(level => game.upgradeCost({ type: 'wardenLodge', level })));
    assert.match(entry.role, /High-health, low-damage/);
    assert.match(entry.cautions, /No armor or arrow resistance/);
    assert.match(entry.cautions, /archers behind it/);
    assert.equal(catalogue.ECONOMY_GUIDE.overtime.forcedDecay, mode === 'timed');
    assert.equal(catalogue.ECONOMY_GUIDE.overtime.decayAt, game.ruleset.endgame.decayAt);
    assert.equal(catalogue.ECONOMY_GUIDE.overtime.productionMultiplier, game.ruleset.endgame.productionMultiplier);
    assert.equal(catalogue.ECONOMY_GUIDE.overtime.unitStructureDamageMultiplier, game.ruleset.endgame.structureDamageMultiplier);
    assert.deepEqual(catalogue.UNIT_CODEX, createCodex(game.ruleset).UNIT_CODEX);
    assert.deepEqual(catalogue.ECONOMY_GUIDE.overtime, createCodex(game.ruleset).ECONOMY_GUIDE.overtime);
    assert.equal(JSON.stringify(game.serialize()), before);
    assert.ok(Object.isFrozen(entry.baseStats));
    assert.equal(createCodex(legacy).UNIT_CODEX.length, 5);
  }
  assert.equal(createCodex(rootGame('open', { mapId: 'twin-span' })).ECONOMY_GUIDE.buildingCap, 16);
});

test('portraits require the active roster, reject coerced enum values, and restore canvas state', () => {
  for (const side of [0, 1]) {
    const canvas = mockCanvas();
    assert.equal(drawUnitPortrait(canvas, 'rootwarden', side), false);
    assert.equal(canvas.calls.length, 0);
    assert.equal(drawUnitPortrait(canvas, 'rootwarden', side, rootGame()), true);
    assert.equal(canvas.depth(), 0);
    canvas.reset();
    assert.equal(drawUnitPortrait(canvas, 'rootwarden', side, getRuleset('frontier-rootwarden-timed')), true);
    assert.equal(canvas.depth(), 0);
    assert.equal(drawUnitPortrait(canvas, ['rootwarden'], side, rootGame()), false);
  }
});

test('accepted historical frames remain pinned; calm renderer commands, geometry, portraits and VFX stay exact', () => {
  for (const [name, expected] of Object.entries({
    'render.js': '9f77b130b7397f188a63dfb960a90d2b5b17d0da94c4e8bd7a1f56ba64aed99e',
    'vfx.js': '90a98c0899610079301c98c0c9851f44318c1e5b455cb230464a03d11dfe8393',
    'engine.js': '83d315ba2a25ced0167543896c48c1d9ae0096827767e9bbe28485c5ae1810f5',
  })) assert.equal(hash(`../qa/fixtures/accepted-clarity/${name}`), expected);
  installCanvas();
  const historical = classicSnapshot(AcceptedRenderer, acceptedPortrait);
  const current = classicSnapshot(Renderer, drawUnitPortrait);
  const originalFrames = JSON.parse(readFileSync(new URL('./fixtures/renderer-readability-lab.json', import.meta.url), 'utf8'));
  assert.deepEqual(historical.frames, originalFrames.frames, 'preserved historical hit/attack command evidence');
  assert.deepEqual(current.themes, historical.themes);
  assert.deepEqual(current.portraits, historical.portraits);
  // Action poses now have their own explicitly labelled snapshot suite.
  // Inactive units still use the accepted draw commands, not just similar art.
  for (const mapId of Object.keys(MAPS)) for (const [width, height] of viewports) {
    const game = gameFixture(mapId), a = makeRenderer(Renderer, width, height), b = makeRenderer(AcceptedRenderer, width, height);
    for (const unit of game.state.units) { unit.attack = 0; unit.hit = 0; }
    for (const renderer of [a, b]) {
      renderer.setMap(mapId); renderer.camera = game.map.width / 2;
      renderer.canvas.reset(); renderer.mini.reset();
      renderer.draw(game, { paused: true, build: 'archery', pointer: { x: 690, y: game.map.lanes[0] }, spell: true }, 0);
    }
    assert.deepEqual(a.canvas.calls, b.canvas.calls, `${mapId} ${width}x${height} main canvas`);
    assert.deepEqual(a.mini.calls, b.mini.calls, `${mapId} ${width}x${height} minimap`);
  }
});

test('Rootwarden movement comes from observed positions, is bounded, and resets across games', () => {
  installCanvas(); const renderer = makeRenderer(Renderer), game = rootGame();
  game._spawn({ type: 'wardenLodge', side: 0, x: 1200, y: 450, lane: 1, level: 1 });
  const unit = game.state.units[0]; unit.cooldown = -1;
  const draw = () => { const before = JSON.stringify(game.serialize()); renderer.draw(game, { paused: true }, 0); assert.equal(JSON.stringify(game.serialize()), before); };
  draw(); assert.equal(renderer.rootwardenMotion.get(unit.id).moving, false, 'ready cooldown is not evidence of walking');
  unit.x += 3; game.state.time += .05; draw(); assert.equal(renderer.rootwardenMotion.get(unit.id).moving, true);
  draw(); assert.equal(renderer.rootwardenMotion.get(unit.id).moving, true, 'same observed simulation instant retains the pose');
  game.state.time += .05; draw(); assert.equal(renderer.rootwardenMotion.get(unit.id).moving, false);
  game.state.units = []; draw(); assert.equal(renderer.rootwardenMotion.size, 0);
  const other = rootGame(); other._spawn({ type: 'wardenLodge', side: 0, x: 1400, y: 450, lane: 1, level: 1 });
  renderer.draw(other, { paused: true }, 0); assert.equal(renderer.rootwardenMotion.get(other.state.units[0].id).moving, false);
  renderer.draw(new Game({ ai: false }), { paused: true, build: 'wardenLodge', pointer: { x: 690, y: 450 } }, 0);
  assert.equal(renderer.rootwardenMotion.size, 0);
  assert.equal(renderer.buildings, BUILDINGS);
});

test('instant engine attacks render contact then settle, with one helper-owned shadow', () => {
  for (const attack of [.22, .17, .1, .01]) for (const side of [0, 1]) {
    const unit = { id: 1, type: 'rootwarden', x: 0, y: 0, side, hp: 800, maxHp: 800, attack, hit: 0 };
    const actual = mockCanvas(), expected = mockCanvas();
    Renderer.prototype.drawUnit.call({ c: actual.c, reducedMotion: false }, unit, 1);
    expected.c.save(); expected.c.translate(0, 0);
    drawRootwarden(expected.c, { side, facing: side ? -1 : 1, scale: 1, compact: false, reducedMotion: false, marker: false, outline: 0, state: 'attack', phase: .48 + .52 * (1 - attack / .22), time: 1, seed: 1 });
    expected.c.restore();
    assert.deepEqual(actual.calls, expected.calls);
    assert.equal(actual.depth(), 0);
  }
  installCanvas(); const renderer = makeRenderer(Renderer), game = rootGame();
  const lodge = game._place('wardenLodge', 690, 450, 0);
  renderer.buildings = game.buildings;
  renderer.canvas.reset(); renderer.drawBuilding(lodge);
  assert.ok(!renderer.canvas.calls.some(call => call[0] === 'ellipse' && call[1] === 8 && call[2] === 23 && call[3] === 51), 'legacy building shadow is not duplicated');
  assert.equal(renderer.canvas.depth(), 0);
});

test('scouting uses authored rules or explicit context, never a global roster superset', () => {
  const mission = { name: 'Warden deployment', playerBuildings: [['wardenLodge', 690, 1]], enemyBuildings: [] };
  assert.throws(() => getMissionScouting(mission), /unknown building type/);
  const game = rootGame(), report = getMissionScouting(mission, game);
  assert.equal(report.armies[0].groups[0].name, game.buildings.wardenLodge.name);
  assert.equal(report.armies[0].groups[0].count, 1);
  assert.deepEqual(report, getMissionScouting({ ...mission, rulesetId: game.ruleset.id, rulesetRevision: 1 }));
  assert.throws(() => getMissionScouting({ ...mission, rulesetId: 'frontier-legacy' }, game), /does not match/);
  assert.throws(() => getMissionScouting({ ...mission, playerBuildings: [[['wardenLodge'], 690, 1]] }, game), /unknown building type/);
  assert.throws(() => getMissionScouting({ ...mission, rulesetId: ['frontier-rootwarden-open'] }), /Unknown ruleset/);
});

test('v2 reports freeze real battle identity, definitions and endgame policy without altering play', () => {
  for (const mode of ['open', 'timed']) {
    const game = rootGame(mode), identity = structuredClone(identityOf(game));
    game._spawn({ type: 'wardenLodge', side: 0, x: 1200, y: 450, lane: 1, level: 1 });
    const journal = createBattleJournal(game, { identity, resumed: true });
    identity.scenario.id = 'changed-after-recording';
    game.state.time = 421; journal.sample();
    const before = JSON.stringify(game.serialize()), report = journal.finish(game, { objectiveOutcome: objective });
    assert.equal(report.version, 2);
    assert.deepEqual(report.identity, identityOf(game));
    assert.notEqual(report.identity, identity);
    assert.equal(report.rules.endgame.forcedDecay, mode === 'timed');
    assert.equal(report.final.sides[0].unitComposition.find(item => item.type === 'rootwarden').count, 1);
    assert.deepEqual(report.final.sides[0].unitComposition.map(item => item.type), Object.keys(game.units));
    assert.deepEqual(report.final.sides[0].buildingComposition.map(item => item.type), Object.keys(game.buildings));
    assert.ok(Object.isFrozen(report.rules.endgame));
    assert.equal(JSON.stringify(game.serialize()), before);
    assert.equal(game.state.winner, null, 'observing an objective does not set an engine result');
    assert.deepEqual(JSON.parse(exportBattleReport(report)), report);
    const html = renderBattleReport(report);
    assert.match(html, /Rootwarden/); assert.match(html, /At 5:00/); assert.match(html, /1.65×/);
    if (mode === 'open') {
      assert.match(html, /No automatic citadel decay or forced time-limit winner/);
      assert.ok(!html.includes('Health that citadels lose automatically during overtime'));
      assert.ok(!report.limitations.some(item => item.includes('automatic overtime citadel decay')));
    } else assert.match(html, /after 7:00/);
  }
  const legacy = finish(new Game({ ai: false }));
  assert.equal(legacy.final.sides[0].unitComposition.length, 5);
  assert.ok(!renderBattleReport(legacy).includes('Rootwarden'));
});

test('reports reject identity mismatch and coerced roster types but retain legacy v1 view compatibility', () => {
  const game = rootGame(), badIdentity = structuredClone(identityOf(game));
  badIdentity.ruleset.id = 'frontier-legacy';
  assert.throws(() => createBattleJournal(game, { identity: badIdentity }), /does not match/);
  const legacy = new Game({ ai: false });
  legacy.state.units.push({ type: ['warrior'], side: 0, hp: 1 });
  assert.throws(() => createBattleJournal(legacy), /unknown entity/);
  const originalGame = new LegacyGame({ ai: false });
  const report = createLegacyJournal(originalGame).finish(originalGame, { objectiveOutcome: objective });
  assert.equal(report.version, 1);
  assert.equal(Object.hasOwn(report, 'identity'), false);
  const before = JSON.stringify(report), html = renderBattleReport(report);
  assert.match(html, /Health that citadels lose automatically during overtime/);
  assert.equal(JSON.stringify(report), before);
  assert.ok(!html.includes('undefined'));
  for (const edit of [r => { delete r.rules; }, r => { r.identity.map.revision = 2; }, r => { r.rules.endgame.forcedDecay = 'false'; }, r => { r.rules.endgame.decayAt = 420; }]) {
    const altered = structuredClone(finish(rootGame())); edit(altered);
    assert.throws(() => renderBattleReport(altered), /Battle report/);
  }
});
