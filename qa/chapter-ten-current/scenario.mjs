import {Game, worldX} from './engine.js';
import {COLOSSUS_IDS} from './colossus.mjs';

/** Starting authoring only. Staged is explicitly synthetic, never paid evidence. */
export function createColossusScenario({mode = 'aftermath', staged = true, seed = 101} = {}) {
  if (!['aftermath', 'core-race'].includes(mode) || typeof staged !== 'boolean' || !Number.isSafeInteger(seed) || seed < 0 || seed > 0xffffffff) throw Error('Invalid lab scenario');
  const game = new Game({difficulty: 'normal', seed, ai: true, rulesetId: COLOSSUS_IDS[mode === 'aftermath' ? 0 : 1]});
  const s = game.state;
  s.buildings = []; s.effects = []; s.stats.built = [0, 0]; s.gold = [10000, 10000];
  const player = [['barracks', 830, 0], ['barracks', 830, 1], ['barracks', 830, 2], ['archery', 690, 0], ['archery', 690, 1], ['archery', 690, 2], ['mint', 410, 1]];
  const enemy = staged ? [] : [['barracks', 1110, 0], ['barracks', 1110, 1], ['barracks', 1110, 2], ['archery', 970, 0], ['archery', 970, 2], ['mint', 410, 1]];
  for (const [side, items] of [[0, player], [1, enemy]]) for (const [type, home, lane] of items) {
    const out = game.build(type, worldX(game.map, side, home), game.map.lanes[lane], side);
    if (!out.ok) throw Error(`Invalid lab formation: ${out.reason}`);
  }
  s.gold = staged ? [750, 0] : [750, 100]; s.income = [7.5, staged ? 5 : 7.5];
  if (staged) {
    s.bases[1].hp = 80;
    // This disclosed snapshot demonstrates emergence promptly, not a natural win.
    for (const lane of [0, 1, 2]) for (const type of ['warrior', 'archer', 'siege']) {
      const producer = {side: 0, type: type === 'warrior' ? 'barracks' : type === 'archer' ? 'archery' : 'foundry', x: 0, lane, level: 1};
      game._spawn(producer);
      const unit = s.units.at(-1); unit.x = type === 'siege' ? 2820 : type === 'archer' ? 2850 : 3000; unit.y = game.map.lanes[lane]; unit.cooldown = 0;
    }
  }
  return game;
}
