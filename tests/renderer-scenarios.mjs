import { Game } from '../dist/engine.js';
import { digest, makeRenderer } from './renderer-canvas.mjs';
export const viewports = [[1180, 757], [390, 650], [320, 568], [844, 390], [4000, 600]];
export function gameFixture(mapId = 'classic') {
  const game = new Game({ mapId, ai: false, seed: 731 });
  game.state.gold = [10000, 10000];
  const lane = game.map.startingLane, y = game.map.lanes[lane];
  for (const [index, type] of ['archery', 'foundry', 'watchtower', 'sanctum', 'aerie', 'mint'].entries())
    game._place(type, game.map.siteColumns[index + 2], y, 0);
  for (const side of [0, 1]) for (const type of ['barracks', 'archery', 'foundry', 'sanctum', 'aerie']) {
    game._spawn({ type, side, x: game.map.width / 2 + (side ? 170 : -170), y, lane, level: 2 });
  }
  game.state.effects = [];
  game.state.frontline = game.map.width / 2;
  const unit = game.state.units[0];
  unit.hit = 0.1; unit.attack = 0.1;
  game.state.projectiles = ['archer', 'wizard', 'gryphon', 'siege'].map((type, i) => ({
    type, x: game.map.width / 2 + i * 12, y, sx: unit.x, sy: y, tx: unit.x + 80, ty: y,
    side: i % 2, life: .14, maxLife: .28, sourceAir: i === 2, targetAir: i === 0,
  }));
  return game;
}
export function classicSnapshot(Renderer, drawUnitPortrait) {
  const renderer = makeRenderer(Renderer), themes = {};
  for (const theme of ['woodland', 'highland', 'ashlands', 'citadel', 'woodland']) {
    renderer.setTheme(theme);
    themes[theme] = digest(renderer.terrain.calls);
  }
  const game = gameFixture(), frames = {};
  for (const [width, height] of viewports) {
    renderer.canvas.rect = { width, height }; renderer.resize();
    renderer.camera = 1730; renderer.clampCamera();
    renderer.canvas.reset(); renderer.mini.reset();
    renderer.draw(game, { paused: true, build: 'barracks', pointer: { x: 410, y: 450 }, selected: game.state.buildings.find(b => b.type === 'watchtower').id, spell: true }, 0);
    frames[`${width}x${height}`] = { camera: renderer.camera, scale: renderer.scale, main: digest(renderer.canvas.calls), minimap: digest(renderer.mini.calls) };
  }
  const portraits = {};
  for (const type of ['warrior', 'archer', 'siege', 'wizard', 'gryphon']) for (const side of [0, 1]) {
    const canvas = renderer.canvas; canvas.reset(); drawUnitPortrait(canvas, type, side);
    portraits[`${type}:${side}`] = digest(canvas.calls);
  }
  return { themes, frames, portraits };
}
