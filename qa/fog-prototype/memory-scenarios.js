/** Synthetic QA only. Deliberate deterministic state sequencing, never a paid match. */
import { Game } from '../../dist/engine.js';
import { FOG_RULESET_ID, observe, refreshFog } from '../../dist/fog.js';
import { observationFacade } from '../../dist/fog-view.js';

export const MEMORY_STAGES = Object.freeze([
  'Before contact', 'Current contact', 'Sight lost', 'Unobserved interval',
  'Return to empty ground', 'Replacement observed', 'Replacement out of sight',
]);
const at = (game, seconds) => { game.state.time = seconds; game.tick = seconds * 20; refreshFog(game); };
const unit = (game, side, x, y) => {
  const u = { id: game.nextId++, type: 'warrior', side, x, y, lane: 1,
    hp: 180, maxHp: 180, level: 1, cooldown: 0, attack: 0, flying: false };
  game.state.units.push(u); return u;
};

/** Return the same sanitized boundary used by the real shell, never the raw fixture. */
export function memoryScene(stage = 0) {
  if (!Number.isInteger(stage) || stage < 0 || stage >= MEMORY_STAGES.length) throw new Error('Choose a synthetic memory stage.');
  const game = new Game({ rulesetId: FOG_RULESET_ID, mapId: 'classic', ai: false, seed: 123 });
  const structure = game.build('watchtower', 2000, 450, 1).building;
  const scout = unit(game, 0, 1400, 450), enemy = unit(game, 1, 2050, 450);
  at(game, 0);
  if (stage >= 1) { scout.x = 1730; at(game, 12); }
  if (stage >= 2) { scout.x = 1400; at(game, 20); }
  if (stage >= 3) {
    // The hostile structure changes and is sold while unobserved. The display
    // receives none of that current state; its old memory must remain intact.
    at(game, 30); game.upgrade(structure.id, 1); structure.hp = 800;
    game.sell(structure.id, 1); enemy.x = 2700; at(game, 35);
  }
  if (stage >= 4) { scout.x = 1730; at(game, 50); }
  if (stage >= 5) { game.build('barracks', 2000, 450, 1); at(game, 60); }
  if (stage >= 6) { scout.x = 1400; at(game, 70); }
  // Static scenes test information and glyphs, without transient construction effects.
  game.state.effects = []; game.state.projectiles = [];
  return observationFacade(observe(game, 0));
}

export const memoryTime = seconds => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
export function describeMemoryScene(view) {
  const current = view.state.buildings.filter(b => b.side !== view.fog.side).map(b =>
    `Current: ${view.buildings[b.type].name}, level ${b.level}, health ${Math.ceil(b.hp)} / ${b.maxHp}.`);
  const memories = view.fog.memories.map(b =>
    `Last seen: ${view.buildings[b.type].name}, level ${b.level}, at ${memoryTime(b.observedAt)}. Current health and production unknown.`);
  const enemy = view.state.bases[1 - view.fog.side];
  return [...current, ...memories, ...(!current.length && !memories.length ? ['No current or remembered enemy building here.'] : []),
    `Visible enemy troops: ${view.state.units.filter(u => u.side !== view.fog.side).length}.`,
    `Enemy citadel: location known; health ${Number.isFinite(enemy.hp) ? Math.ceil(enemy.hp) : 'unknown'}.`];
}
