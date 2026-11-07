/** Deterministic test players, not game code. Only normal paid commands are used. */
export function onboardingSequence(steps) {
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

export function onboardingReferencePolicy(id, { wardens = true, mine = true, ranged = true } = {}) {
  if (id === 'roadside-watch') return onboardingSequence([
    ['barracks', 970, 0], [ranged ? 'archery' : 'barracks', 830, 0],
    ['barracks', 1110, 0], ['barracks', 970, 0, 2],
  ]);
  if (id === 'shield-at-the-fork') return onboardingSequence([
    [wardens ? 'wardenLodge' : 'barracks', 970, 0], ['barracks', 970, 1],
    ['archery', 830, 0], ['archery', 830, 1], ...(mine ? [['mint', 410, 1]] : []),
    ...(!wardens ? [['barracks', 1110, 0], ['barracks', 1110, 1]] : []),
    [wardens ? 'wardenLodge' : 'barracks', 970, 0, 2], ['barracks', 970, 1, 2],
    ['archery', 830, 0, 2], ['archery', 830, 1, 2],
  ]);
  if (id === 'open-three-roads') return onboardingSequence([
    ['archery', 1110, 0], ['wardenLodge', 1110, 2], ['aerie', 1110, 1],
    ['archery', 970, 0], ['archery', 970, 2], ['foundry', 970, 1],
    ...(mine ? [['mint', 410, 2]] : []),
    ['archery', 1110, 0, 2], ['foundry', 970, 1, 2], ['archery', 970, 2, 2],
    ['wardenLodge', 1110, 2, 2], ['aerie', 1110, 1, 2],
  ]);
  throw new RangeError('Unknown opening mission: ' + String(id));
}

export function onboardingMinesOnlyPolicy(game) {
  for (const x of [270, 410, 550]) {
    if (!game.state.buildings.some(b => b.side === 0 && b.x === x && b.lane === 0)) {
      game.build('mint', x, game.map.lanes[0]);
      return;
    }
  }
}
