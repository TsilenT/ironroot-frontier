// Deterministic frozen presentation states, not played outcomes. No simulation ticking.
export const PRODUCERS = ['barracks', 'archery', 'foundry', 'sanctum', 'aerie', 'wardenLodge'];
export const ROLES = ['warrior', 'archer', 'siege', 'wizard', 'gryphon', 'rootwarden'];
export function createCombatScene(Game, {
  mode = 'roster', role = 'warrior', side = 'both', event = 'attack', elapsed = 0,
} = {}) {
  const game = new Game({ seed: 731, ai: false, rulesetId: 'frontier-rootwarden-open', rulesetRevision: 1 });
  game.state.buildings = []; game.state.units = []; game.state.projectiles = []; game.state.effects = [];
  game.state.time = 18; game.state.frontline = 1600;
  const sides = side === 'both' ? [0, 1] : [Number(side)];
  const age = Math.max(0, Math.min(.22, Number.isFinite(elapsed) ? elapsed : 0));
  const spawn = (type, team, x, lane, index = 0, offset = 0) => {
    game._spawn({ type, side: team, x: x - (team ? -48 : 48), y: game.map.lanes[lane], lane, level: 1 });
    const unit = game.state.units.at(-1);
    unit.x = x; unit.y = game.map.lanes[lane] + offset; unit.hp = unit.maxHp * .6; unit.cooldown = 1;
    const state = event === 'mixed' ? ['attack', 'hit', 'overlap', 'idle'][index % 4] : event;
    unit.attack = ['attack', 'overlap'].includes(state) ? Math.max(0, .22 - age) : 0;
    unit.hit = ['hit', 'overlap'].includes(state) ? Math.max(0, .16 - age) : 0;
  };
  const ui = { paused: true, targets: [], protectedTargets: [] };
  if (mode === 'single') {
    for (const team of sides) spawn(PRODUCERS[Math.max(0, ROLES.indexOf(role))], team,
      sides.length === 1 ? 1600 : team ? 1760 : 1440, 1);
  } else if (mode === 'dense') {
    for (const team of sides) for (let i = 0; i < 70; i++)
      spawn(PRODUCERS[i % 6], team, 1420 + i % 10 * 38 + team * 22, Math.floor(i / 10) % 3, i, i % 4 * 8 - 12);
    const ally = game._place('watchtower', 1250, 450, 0), enemy = game._place('sanctum', 1950, 450, 1);
    ui.targets = [ally.id, enemy.id]; ui.protectedTargets = [ally.id];
  } else {
    for (const team of sides) PRODUCERS.forEach((type, i) => spawn(type, team, 1200 + i * 160, team ? 2 : 0, i));
  }
  // Spawn/build effects are deliberately absent; compare the poses, not a new spectacle.
  game.state.effects = []; game.state.projectiles = [];
  return { game, ui, camera: 1600 };
}
