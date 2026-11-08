import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../dist/engine.js';
import { FOG_SKIRMISH_RULESET_ID, observe, refreshFog } from '../dist/fog.js';
import { chartedObjectiveObservation, chartedObjectiveTargets, hasChartedIntelligence } from '../dist/campaign-intelligence.js';
import { FogRenderer, observationFacade, observationHUD } from '../dist/fog-view.js';
import { installCanvas, makeRenderer, styledCalls, digest } from './renderer-canvas.mjs';

// Synthetic observation fixtures exercise the chart boundary independently of
// the mission's balance, authored formation and campaign progression tests.
const mission = Object.freeze({
  id: 'lanterns-on-the-water', scenarioRevision: 1, rulesetId: 'frontier-campaign-lanterns', rulesetRevision: 1,
  intelligence: 'charted-customs-posts',
  markedTargets: Object.freeze([
    Object.freeze({ type: 'watchtower', x: 1950, lane: 0, name: 'North Customs Post' }),
    Object.freeze({ type: 'watchtower', x: 2090, lane: 1, name: 'Middle Customs Post' }),
    Object.freeze({ type: 'watchtower', x: 2230, lane: 2, name: 'South Customs Post' }),
  ]),
});
const ui = { paused: true, selected: null, build: null, spell: false, pointer: null };
const keys = ['originalId', 'label', 'type', 'x', 'y', 'lane', 'road', 'status', 'statusText', 'percent', 'confirmedDestroyed'];
const project = game => observationFacade(observe(game, 0));
function fixture() {
  const game = new Game({ rulesetId: FOG_SKIRMISH_RULESET_ID, ai: false, seed: 671 });
  const originals = mission.markedTargets.map(target => {
    const building = game._place(target.type, target.x, game.map.lanes[target.lane], 1);
    return { ...target, kind: 'destroy', side: 1, originalId: building.id };
  });
  refreshFog(game);
  const targets = () => originals.map(original => ({ ...original,
    building: game.state.buildings.find(b => b.id === original.originalId && b.hp > 0) || null }));
  const controls = () => chartedObjectiveTargets(mission, project(game), targets());
  return { game, originals, targets, controls };
}
function scout(game, target = mission.markedTargets[0]) {
  const unit = { id: game.nextId++, type: 'warrior', side: 0, x: target.x - 200,
    y: game.map.lanes[target.lane], lane: target.lane, hp: 180, maxHp: 180, level: 1, cooldown: 0, attack: 0, flying: false };
  game.state.units.push(unit); return unit;
}
function render(view, chartedTargets, { width = 1180, height = 466, camera = 2090, Renderer = FogRenderer } = {}) {
  installCanvas(); const r = makeRenderer(Renderer, width, height);
  r.camera = camera; r.clampCamera(); r.canvas.reset(); r.mini.reset();
  const targets = chartedTargets?.filter(t => t.status === 'visible').map(t => t.originalId) || [];
  r.draw(view, { ...ui, targets, ...(chartedTargets === undefined ? {} : { chartedTargets }) }, 0);
  return r;
}
const chartStrokes = canvas => styledCalls(canvas, 'stroke', 'strokeStyle').filter(call => call.style === '#f1d295');

test('charted intelligence belongs only to the exact Lanterns mission, ruleset and explicit policy', () => {
  assert.equal(hasChartedIntelligence(mission), true);
  for (const mutation of [null, { id: 'one-signal-is-enough' }, { scenarioRevision: 2 },
    { rulesetId: FOG_SKIRMISH_RULESET_ID }, { rulesetRevision: 2 }, { intelligence: undefined }]) {
    const candidate = mutation === null ? null : { ...mission, ...mutation };
    assert.equal(hasChartedIntelligence(candidate), false);
    assert.deepEqual(chartedObjectiveTargets(candidate, null, null), []);
  }
  assert.equal(hasChartedIntelligence({}), false);
  const { game, targets } = fixture();
  assert.throws(() => chartedObjectiveTargets(mission, game, targets()), /side observation/);
  assert.throws(() => chartedObjectiveTargets(mission, project(game), []), /original campaign identity/);
});

test('unseen chart exposes a strict primitive whitelist, never fake observations or hidden building data', () => {
  const f = fixture(), view = project(f.game), before = JSON.stringify(view);
  assert.equal(view.fog.memories.length, 0);
  const trappedTargets = f.targets().map(target => ({ ...target,
    building: new Proxy(target.building, { get() { throw new Error('Hidden building data was read'); } }),
    name: 'Private override', defenders: ['private'], progress: .8, treasury: 999,
  }));
  const rows = chartedObjectiveTargets(mission, view, trappedTargets);
  assert.equal(rows.length, mission.markedTargets.length);
  rows.forEach((row, i) => {
    assert.deepEqual(Object.keys(row), keys);
    assert.ok(Object.values(row).every(value => value === null || ['string', 'number', 'boolean'].includes(typeof value)));
    assert.equal(row.label, mission.markedTargets[i].name);
    assert.equal(row.status, 'charted'); assert.equal(row.percent, null); assert.equal(row.confirmedDestroyed, false);
    assert.equal(row.y, view.map.lanes[row.lane]); assert.match(row.statusText, /Charted.*health unknown/);
    assert.doesNotMatch(row.statusText, /level|L[123]|\d+%|Private|999/);
  });
  assert.equal(JSON.stringify(view), before);
  assert.equal(view.fog.memories.length, 0, 'chart information does not become last-seen fog memory');
});

test('hidden HP, upgrades, production, defenders and treasury permutations leave controls and both canvases identical', () => {
  const f = fixture(), view = project(f.game), rows = f.controls(), base = render(view, rows);
  for (const [hp, level, progress, gold] of [[1, 3, .99, 9999], [190, 2, .1, 0], [400, 1, .6, 213]]) {
    for (const target of f.targets()) Object.assign(target.building, { hp, level, progress, cooldown: gold, invested: gold });
    f.game.state.gold[1] = gold;
    f.game.state.units.push({ id: f.game.nextId++, type: 'warrior', side: 1, x: 2300, y: 260,
      lane: 0, hp: 180, maxHp: 180, level, cooldown: gold, attack: 0, flying: false });
    refreshFog(f.game);
    const after = project(f.game), next = f.controls(), rendered = render(after, next);
    assert.deepEqual(next, rows); assert.deepEqual(after.state, view.state); assert.deepEqual(after.fog, view.fog);
    assert.equal(digest(rendered.canvas.calls), digest(base.canvas.calls));
    assert.equal(digest(rendered.mini.calls), digest(base.mini.calls));
  }
});

test('dispatch confirmation discloses only original destruction, and a same-site rebuild cannot revive it', () => {
  const f = fixture(), beforeView = project(f.game), before = f.controls(), target = f.targets()[0];
  f.game.state.buildings = f.game.state.buildings.filter(b => b.id !== target.originalId);
  refreshFog(f.game);
  const after = f.controls();
  assert.deepEqual(project(f.game).state, beforeView.state, 'ordinary fog does not disclose hidden destruction');
  assert.deepEqual(project(f.game).fog, beforeView.fog);
  assert.deepEqual(after[0], { ...before[0], status: 'destroyed', statusText: 'Cleared · destruction confirmed', confirmedDestroyed: true });
  assert.deepEqual(after.slice(1), before.slice(1));
  const replacement = f.game._place(target.type, target.x, f.game.map.lanes[target.lane], 1);
  assert.notEqual(replacement.id, target.originalId); refreshFog(f.game);
  assert.deepEqual(f.controls(), after);
  scout(f.game); refreshFog(f.game);
  assert.ok(project(f.game).state.buildings.some(b => b.id === replacement.id), 'replacement becomes visible');
  assert.equal(f.controls()[0].status, 'destroyed'); assert.equal(f.controls()[0].percent, null);
});

test('current health disappears at sight loss; stale level/time never follow a hidden upgrade', () => {
  const f = fixture(), target = f.targets()[0], unit = scout(f.game);
  target.building.hp = target.building.maxHp / 4; f.game.state.time = 12; refreshFog(f.game);
  const current = f.controls()[0];
  assert.equal(current.status, 'visible'); assert.equal(current.percent, 25); assert.match(current.statusText, /25% HP/);
  unit.x = 800; f.game.state.time = 14; refreshFog(f.game);
  const staleView = project(f.game), stale = f.controls()[0];
  assert.equal(stale.status, 'last-seen'); assert.equal(stale.percent, null);
  assert.match(stale.statusText, /Last seen L1 at 0:12.*health unknown/);
  Object.assign(target.building, { hp: 1, maxHp: 3000, level: 3, progress: .99 }); refreshFog(f.game);
  assert.deepEqual(f.controls()[0], stale); assert.deepEqual(project(f.game).fog.memories, staleView.fog.memories);
  assert.doesNotMatch(f.controls()[0].statusText, /L3|3000|25%/);
  unit.x = target.x - 200; refreshFog(f.game);
  assert.equal(f.controls()[0].status, 'visible'); assert.equal(f.controls()[0].percent, 1);
});

test('a replacement memory never supplies last-seen evidence for the original post', () => {
  const f = fixture(), view = project(f.game), target = f.targets()[0];
  view.fog.memories.push({ id: target.originalId + 1000, type: target.type, x: target.x, y: view.map.lanes[target.lane],
    lane: target.lane, side: 1, level: 3, observedAt: 0 });
  assert.equal(chartedObjectiveTargets(mission, view, f.targets())[0].status, 'charted');
});

test('controls are detached frozen values and evaluation neither mutates inputs nor retains live references', () => {
  const f = fixture(), view = project(f.game), targets = f.targets();
  const before = JSON.stringify({ mission, view, targets }), rows = chartedObjectiveTargets(mission, view, targets), saved = JSON.stringify(rows);
  assert.equal(JSON.stringify({ mission, view, targets }), before);
  assert.ok(Object.isFrozen(rows)); assert.ok(rows.every(Object.isFrozen));
  assert.throws(() => { rows[0].percent = 100; }, TypeError);
  targets[0].name = 'Changed'; targets[0].building.hp = 1; targets[0].originalId = 999;
  view.state.gold[1] = 5000; view.fog.memories.push({ level: 3, observedAt: 888 });
  assert.equal(JSON.stringify(rows), saved);
});

test('charted hollow diamonds and chart glyphs render after each fog mask without HP bars or invented buildings', () => {
  const f = fixture(), view = project(f.game), rows = f.controls(), r = render(view, rows);
  const plain = render(view);
  for (const canvas of [r.canvas, r.mini]) {
    assert.equal(chartStrokes(canvas).length, rows.length * 2, 'each site has a hollow diamond and folded-chart glyph');
    const mask = canvas.calls.findLastIndex(call => call[0] === 'drawImage');
    const firstChart = canvas.calls.findIndex(call => call[0] === 'set' && call[1] === 'strokeStyle' && call[2] === '#f1d295');
    assert.ok(firstChart > mask, 'chart remains visible over the mask');
    assert.equal(canvas.depth(), 0);
  }
  assert.deepEqual(styledCalls(r.canvas, 'fillText'), styledCalls(plain.canvas, 'fillText'), 'names live in DOM, not new overlapping canvas badges');
  assert.deepEqual(styledCalls(r.canvas, 'fillRect'), styledCalls(plain.canvas, 'fillRect'), 'no invented building, health bar or production bar');
  assert.deepEqual(styledCalls(r.mini, 'fillRect'), styledCalls(plain.mini, 'fillRect'));
  assert.equal(view.fog.memories.length, 0);
  const offCamera = render(view, rows, { width: 390, height: 350, camera: 410 });
  assert.equal(chartStrokes(offCamera.canvas).length, 0);
  assert.equal(chartStrokes(offCamera.mini).length, rows.length * 2);
});

test('cleared chart markers disappear; visible original posts use their ordinary live objective diamond', () => {
  const f = fixture(); f.targets()[0].building.hp = 0; scout(f.game, mission.markedTargets[1]); refreshFog(f.game);
  const view = project(f.game), rows = f.controls(), r = render(view, rows);
  assert.deepEqual(rows.map(row => row.status), ['destroyed', 'visible', 'charted']);
  assert.equal(chartStrokes(r.canvas).length, 2); assert.equal(chartStrokes(r.mini).length, 2);
  assert.equal(styledCalls(r.canvas, 'fill').filter(call => call.style === '#f1d295').length, 1, 'currently visible original gets the stock filled objective diamond');
});

test('chart rendering preserves memory labels, memory data and masks across short and normal fields', () => {
  const f = fixture(), unit = scout(f.game); f.game.state.time = 12; refreshFog(f.game); unit.x = 800; refreshFog(f.game);
  const view = project(f.game), rows = f.controls(), saved = JSON.stringify(view);
  for (const [width, height] of [[320, 125], [390, 350], [844, 220], [1180, 466]]) {
    const withChart = render(view, rows, { width, height }), plain = render(view, undefined, { width, height });
    assert.deepEqual(styledCalls(withChart.canvas, 'fillText'), styledCalls(plain.canvas, 'fillText'));
    assert.equal(digest(withChart.mask.calls), digest(plain.mask.calls));
    assert.equal(digest(withChart.miniMask.calls), digest(plain.miniMask.calls));
    assert.equal(withChart.canvas.depth(), 0); assert.equal(withChart.mini.depth(), 0);
  }
  assert.equal(JSON.stringify(view), saved);
  assert.match(observationHUD(view).memoryDetails.join(' '), /Last seen Watchtower, level 1, at 0:12/);
});

test('absent or empty chart rows preserve ordinary fog commands, including terminal reveal', () => {
  class WithoutChart extends FogRenderer { drawChartedTargets() {} }
  const f = fixture(), unit = scout(f.game); refreshFog(f.game); unit.x = 800; refreshFog(f.game);
  for (const terminal of [false, true]) {
    if (terminal) f.game.state.winner = 0;
    const view = project(f.game);
    for (const rows of [undefined, [], ...(terminal ? [f.controls()] : [])]) {
      const actual = render(view, rows), plain = render(view, rows, { Renderer: WithoutChart });
      assert.equal(digest(actual.canvas.calls), digest(plain.canvas.calls));
      assert.equal(digest(actual.mini.calls), digest(plain.mini.calls));
    }
  }
});

test('dispatch-confirmed original loss removes stale field, minimap and accessible memory only from presentation', () => {
  const f = fixture(), unit = scout(f.game), id = f.originals[0].originalId;
  f.game.state.time = 12; refreshFog(f.game); unit.x = 800; refreshFog(f.game);
  f.game.state.buildings = f.game.state.buildings.filter(b => b.id !== id); refreshFog(f.game);
  const observation = observe(f.game, 0), targets = f.targets();
  assert.deepEqual(observation.fog.memories.map(m => m.id), [id]);
  const engineBefore = JSON.stringify(f.game.serialize()), inputBefore = JSON.stringify({ observation, targets });
  Object.freeze(observation.fog.memories); Object.freeze(observation.fog); Object.freeze(observation);
  const filtered = chartedObjectiveObservation(mission, observation, targets);
  assert.notEqual(filtered, observation); assert.notEqual(filtered.fog, observation.fog);
  assert.notEqual(filtered.fog.memories, observation.fog.memories);
  assert.equal(filtered.state, observation.state, 'unaffected detached data is shared without rewriting');
  assert.deepEqual(filtered.fog, { ...observation.fog, memories: [] });
  const view = observationFacade(filtered), rows = chartedObjectiveTargets(mission, view, targets), r = render(view, rows);
  assert.equal(rows[0].status, 'destroyed'); assert.equal(rows[0].confirmedDestroyed, true);
  const hud = observationHUD(view);
  assert.deepEqual(hud.memoryDetails, []); assert.equal(hud.memories, 0);
  assert.doesNotMatch(hud.description, /Last seen Watchtower/);
  for (const canvas of [r.canvas, r.mini])
    assert.equal(styledCalls(canvas, 'strokeRect', 'strokeStyle').filter(c => c.style === '#d4cec0').length, 0);
  assert.equal(JSON.stringify({ observation, targets }), inputBefore);
  assert.equal(JSON.stringify(f.game.serialize()), engineBefore, 'engine memory and checkpoint remain unchanged');
  assert.deepEqual(f.game.state.fog.sides[0].structures.map(m => m.id), [id]);
  assert.equal(chartedObjectiveObservation(mission, filtered, targets), filtered, 'filtering is idempotent');
});

test('dispatch filtering preserves unknown replacement IDs at the same coordinate and unrelated stale originals', () => {
  const f = fixture(), unit = scout(f.game), originalId = f.originals[0].originalId;
  f.game.state.time = 12; refreshFog(f.game); unit.x = 800; refreshFog(f.game);
  const originalMemory = observe(f.game, 0).fog.memories.find(m => m.id === originalId);
  f.game.state.buildings = f.game.state.buildings.filter(b => b.id !== originalId);
  const replacement = f.game._place(originalMemory.type, originalMemory.x, originalMemory.y, 1);
  unit.x = originalMemory.x - 200; f.game.state.time = 20; refreshFog(f.game);
  scout(f.game, mission.markedTargets[1]); refreshFog(f.game);
  f.game.state.units.forEach(u => { if (u.side === 0) u.x = 800; }); refreshFog(f.game);
  const observation = observe(f.game, 0), targets = f.targets(), engineBefore = JSON.stringify(f.game.serialize());
  assert.ok(observation.fog.memories.some(m => m.id === replacement.id));
  assert.ok(observation.fog.memories.some(m => m.id === f.originals[1].originalId));
  assert.equal(chartedObjectiveObservation(mission, observation, targets), observation, 'same-site replacement is not the confirmed original');
  // A mixed presentation fixture proves the filter uses identity, never site,
  // even when original and replacement records have identical type/position.
  const mixed = { ...observation, fog: { ...observation.fog, memories: [originalMemory, ...observation.fog.memories] } };
  const before = JSON.stringify(mixed), filtered = chartedObjectiveObservation(mission, mixed, targets);
  assert.deepEqual(filtered.fog.memories, observation.fog.memories);
  assert.ok(filtered.fog.memories.some(m => m.id === replacement.id));
  assert.ok(filtered.fog.memories.some(m => m.id === f.originals[1].originalId));
  filtered.fog.memories.pop();
  assert.equal(JSON.stringify(mixed), before, 'the returned memory array is independent of the input array');
  assert.equal(JSON.stringify(f.game.serialize()), engineBefore);
});

test('dispatch filter is an identity-preserving no-op without a matching confirmed destruction or exact mission policy', () => {
  const f = fixture(), unit = scout(f.game); refreshFog(f.game); unit.x = 800; refreshFog(f.game);
  const observation = observe(f.game, 0), trapped = f.targets().map(target => ({ ...target,
    building: new Proxy(target.building, { get() { throw new Error('Hidden building data was read'); } }),
  }));
  assert.equal(chartedObjectiveObservation(mission, observation, trapped), observation);
  for (const policy of [null, { ...mission, id: 'one-signal-is-enough' }, { ...mission, intelligence: undefined }])
    assert.equal(chartedObjectiveObservation(policy, observation, null), observation);
  const empty = { ...observation, fog: { ...observation.fog, memories: [] } };
  assert.equal(chartedObjectiveObservation(mission, empty, null), empty);
  const revealed = { ...observation, fog: { ...observation.fog, enabled: false, revealed: true } };
  assert.equal(chartedObjectiveObservation(mission, revealed, null), revealed);
});
