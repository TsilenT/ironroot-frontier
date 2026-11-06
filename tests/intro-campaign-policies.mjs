/** Small reference routes. Every command pays the engine's normal gold cost. */
export function introReferencePolicy(id, { mine = true, tower = false, ranged = true } = {}) {
  const steps = id === 'first-watch'
    ? [['barracks', 970, 0], [ranged ? 'archery' : 'barracks', 830, 0], ['barracks', 1110, 0], ['barracks', 970, 0, 2]]
    : [['barracks', 970, 0], ['barracks', 970, 1],
      ...(mine ? [['mint', 410, 0]] : []),
      ['archery', 830, 0], [tower ? 'watchtower' : 'archery', tower ? 1110 : 830, 1],
      ['barracks', 970, 0, 2], ['barracks', 970, 1, 2]];
  let cursor = 0;
  return game => {
    while (cursor < steps.length) {
      const [type, x, lane, level = 1] = steps[cursor];
      const existing = game.state.buildings.find(b => b.side === 0 && b.hp > 0 && b.type === type && b.x === x && b.lane === lane);
      if (!existing) {
        if (game.build(type, x, game.map.lanes[lane]).ok) cursor++;
        return;
      }
      if (existing.level < level) {
        if (game.upgrade(existing.id).ok) cursor++;
        return;
      }
      cursor++;
    }
  };
}

export function introMinesOnlyPolicy(game) {
  for (const x of [270, 410, 550]) {
    if (!game.state.buildings.some(b => b.side === 0 && b.x === x && b.lane === 0)) {
      game.build('mint', x, game.map.lanes[0]);
      return;
    }
  }
}
