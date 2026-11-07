import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, flightGateX } from '../dist/engine.js';
import { Renderer } from '../dist/render.js';
import { installCanvas, makeRenderer } from './renderer-canvas.mjs';

// Record actual paint calls and their saved styles, not a source-order regex or
// banner bounding-box proxy. Local path vertices identify real aerie pennants.
function paints(canvas) {
  const result = [], stack = [];
  let style = {}, path = [], closed = false;
  for (const [index, [op, ...args]] of canvas.calls.entries()) {
    if (op === 'save') stack.push({ ...style });
    else if (op === 'restore') style = stack.pop();
    else if (op === 'set') style[args[0]] = args[1];
    else if (op === 'beginPath') { path = []; closed = false; }
    else if (op === 'moveTo' || op === 'lineTo') path.push(args);
    else if (op === 'closePath') closed = true;
    else if (['fill', 'stroke', 'fillRect', 'strokeRect', 'fillText'].includes(op))
      result.push({ index, op, args, ...style, path: [...path], closed });
  }
  return result;
}

function congestedBattle() {
  const game = new Game({ rulesetId: 'frontier-flight-open', ai: false });
  game.state.gold = [10000, 10000];
  const aeries = [];
  for (const side of [0, 1]) for (const [from, y] of game.map.lanes.entries()) {
    const { building } = game.build('aerie', side ? game.map.width - 1250 : 1250, y, side);
    assert.ok(building); aeries.push(building);
    for (const to of [from - 1, from + 1]) {
      if (to < 0 || to >= game.map.lanes.length) continue;
      assert.equal(game.setFlightPlan(building.id, to, side).ok, true);
      for (const phase of ['warning', 'transit']) for (let n = 0; n < 8; n++) {
        game._spawn(building);
        const unit = game.state.units.at(-1);
        unit.x = flightGateX(game.map, game.ruleset, side); unit.y = y;
        game._advanceAirRoute(unit, .05);
        game._advanceAirRoute(unit, phase === 'warning' ? .8 : 2.05);
        assert.equal(unit.airRoute.phase, phase);
      }
    }
  }
  game.state.effects = [];
  game.state.projectiles = [{ type: 'archer', x: 1500, y: 450, sx: 1450, sy: 450,
    tx: 1550, ty: 450, side: 0, life: .1, maxLife: .2 }];
  return { game, aeries };
}

for (const [width, height] of [[320, 168], [390, 240], [844, 168], [844, 240]]) {
  for (const [reducedMotion, quality] of [[false, 'high'], [true, 'high'], [false, 'low'], [true, 'low']]) {
    test(`flight glyphs clear actor pennants at ${width}×${height}, reduced=${reducedMotion}, ${quality}`, () => {
      installCanvas();
      const view = makeRenderer(Renderer, width, height), { game, aeries } = congestedBattle();
      view.camera = game.map.width / 2; view.reducedMotion = reducedMotion;
      view.vfx.reducedMotion = reducedMotion; view.vfx.quality = quality;
      const actors = [];
      for (const method of ['drawBase', 'drawBuilding', 'drawUnit']) {
        const draw = view[method].bind(view);
        view[method] = (...args) => {
          const start = view.canvas.calls.length;
          draw(...args);
          actors.push({ method, start, end: view.canvas.calls.length - 1 });
        };
      }
      const selected = aeries.find(b => b.side === 0 && b.lane === 1);
      const before = JSON.stringify(game.serialize());
      view.canvas.reset(); view.mini.reset();
      view.draw(game, { paused: true, selected: selected.id, targets: aeries.map(b => b.id),
        protectedTargets: aeries.filter(b => b.side === 0).map(b => b.id) }, 0);
      assert.equal(JSON.stringify(game.serialize()), before, 'painter layers never change simulation');
      assert.equal(view.canvas.depth(), 0); assert.equal(view.mini.depth(), 0);
      const operations = paints(view.canvas);
      const pennants = operations.filter(p => p.op === 'fill' &&
        ['#80c5ad', '#d59070'].includes(p.fillStyle) &&
        JSON.stringify(p.path) === '[[-28,-83],[-4,-78],[-28,-64]]');
      assert.equal(pennants.length, 6, 'actual building pennants are painted on both sides of every road');
      const labels = operations.filter(p => p.op === 'fillText' &&
        /^(YOU|FOE)$|^[↑↓] |^NEXT /.test(p.args[0]));
      assert.equal(labels.length, 13);
      assert.equal(labels.filter(p => p.args[0] === '↑ 1.2s×8 / AIR×8').length, 4);
      assert.equal(labels.filter(p => p.args[0] === '↓ 1.2s×8 / AIR×8').length, 4);
      assert.equal(labels.filter(p => p.args[0] === 'YOU').length, 2);
      assert.equal(labels.filter(p => p.args[0] === 'FOE').length, 2);
      assert.equal(labels.filter(p => p.args[0] === 'NEXT ↓').length, 1);
      const lastActor = Math.max(...actors.map(a => a.end));
      const lastPennant = Math.max(...pennants.map(p => p.index));
      const projectile = operations.find(p => p.op === 'fill' && p.fillStyle === '#f3e4b5' &&
        JSON.stringify(p.path) === '[[8,0],[2,-3],[2,3]]');
      assert.ok(projectile, 'real projectile arrow is present');
      const backgrounds = operations.filter(p => p.op === 'fillRect' && p.fillStyle === '#142a28');
      assert.equal(backgrounds.length, 5);
      const directionRows = labels.filter(p => /^[↑↓]/.test(p.args[0]));
      const otherLabels = labels.filter(p => !/^[↑↓]/.test(p.args[0]));
      for (const label of [...directionRows, ...otherLabels, ...backgrounds]) {
        assert.ok(label.index > lastPennant, `${label.args[0]} must be painted after all building pennants`);
        assert.ok(label.index > lastActor, 'complete banners must clear both bases and every actor');
        assert.ok(label.index > projectile.index, 'projectiles cannot erase text or direction glyphs');
        assert.equal(label.globalAlpha, 1, 'foreground banners are fully opaque');
      }
      const firstActor = Math.min(...actors.map(a => a.start));
      const routeStrokes = operations.filter(p => p.op === 'stroke' && !p.closed && p.path.length >= 2 &&
        ['#b4e3c3', '#edbb92', '#efd18e', '#fff2cf'].includes(p.strokeStyle));
      assert.ok(routeStrokes.length >= 16, 'committed/preview paths and arrows are present');
      assert.ok(routeStrokes.every(p => p.index < firstActor), 'route lines/leaders remain under actors');
      const lastLabel = Math.max(...labels.map(p => p.index));
      for (const color of ['#b6ead5', '#f1d295']) {
        const badges = operations.filter(p => p.op === 'fill' && p.fillStyle === color);
        assert.equal(badges.length, 3);
        assert.ok(badges.every(p => p.index > lastLabel), 'protected and objective badges retain overlay priority');
      }
    });
  }
}
