/** Diagnostic bots: only public, paid player actions; no injected resources. */
import {BUILDINGS, homeX, worldX} from './engine.js';

export const POLICIES = Object.freeze(['rush', 'mixed', 'economy', 'air', 'screened-air', 'focused']);

export function createPolicyMemory() {
  return {supportBuilt: 0, decisions: 0, builds: 0, upgrades: 0, spent: 0};
}

/** One decision every five seconds. Failed purchases save for the intended unit. */
export function actPolicy(game, side, policy, memory) {
  if (!POLICIES.includes(policy)) throw new Error('Unknown lab policy: ' + policy);
  if (game.state.winner !== null) return;
  memory.decisions++;
  const map = game.map;
  const own = game.state.buildings.filter(b => b.side === side);
  const producers = own.filter(b => BUILDINGS[b.type].unit);
  const count = type => own.filter(b => b.type === type).length;
  const lanes = map.lanes.map((_, lane) => lane).sort((a, b) =>
    producers.filter(v => v.lane === a).length - producers.filter(v => v.lane === b).length || a - b);
  const forwardBarracks = lane => producers.some(b => b.lane === lane && b.type === 'barracks' && homeX(map, side, b.x) > 550);
  let type = 'barracks';
  let candidates = lanes;
  let support = false;
  if (policy === 'focused') candidates = [map.startingLane];
  if (policy === 'air') {
    type = ['aerie', 'archery'][memory.supportBuilt % 2];
    support = true;
  } else if (policy === 'mixed' || policy === 'focused' || policy === 'screened-air') {
    const unscreened = candidates.filter(lane => !forwardBarracks(lane));
    if (unscreened.length) candidates = unscreened;
    else {
      const cycle = policy === 'screened-air' ? ['archery', 'aerie'] : ['archery', 'foundry', 'barracks', 'archery', 'sanctum'];
      type = cycle[memory.supportBuilt % cycle.length];
      support = true;
    }
  } else if (policy === 'economy') {
    // Deliberately greedy: expose the cost of buying all three mines before defense.
    if (count('mint') < 3) type = 'mint';
    else {
      const unscreened = lanes.filter(lane => !forwardBarracks(lane));
      if (unscreened.length) candidates = unscreened;
      else {
        type = ['archery', 'foundry', 'barracks', 'sanctum'][memory.supportBuilt % 4];
        support = true;
      }
    }
  }
  const goldBefore = game.state.gold[side];
  if (goldBefore < BUILDINGS[type].cost) return;
  const distances = type === 'mint' ? [270, 410, 550, 690, 830, 970, 1110, 1250] : [1250, 1110, 970, 830, 690, 550, 410, 270];
  for (const lane of candidates) for (const distance of distances) {
    const result = game.build(type, worldX(map, side, distance), map.lanes[lane], side);
    if (result.ok) {
      memory.builds++;
      memory.spent += goldBefore - game.state.gold[side];
      if (support) memory.supportBuilt++;
      return {type: 'build', building: type, lane, distance};
    }
  }
  // Only exhausted sites allow upgrades; never spend intended build savings early.
  const upgrades = own.filter(b => b.level < 3 && candidates.includes(b.lane) && BUILDINGS[b.type].unit)
    .sort((a, b) => a.level - b.level || a.id - b.id);
  for (const b of upgrades) if (game.upgrade(b.id, side).ok) {
    memory.upgrades++;
    memory.spent += goldBefore - game.state.gold[side];
    return {type: 'upgrade', building: b.type, lane: b.lane, level: b.level};
  }
}
