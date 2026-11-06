// Paid-run persistence fixtures. These are browser transition checkpoints, not
// substitutes for a native start-to-finish human playthrough.
import assert from 'node:assert/strict';
import { Game } from '../../dist/engine.js';
import {
  ONBOARDING_MISSIONS, createCampaignProgress, createProgressionCampaignMission,
  evaluateCampaignMission, getCampaignRoster,
} from '../../dist/campaign.js';
import { encodeBattle, decodeBattle, scenarioForBattle } from '../../dist/battle-codec.js';
import { advanceObjectiveBattle } from '../../dist/objectives.js';
import { onboardingReferencePolicy } from '../../tests/onboarding-campaign-policies.mjs';

export function progressionProfile(count = 0) {
  const progress = createCampaignProgress();
  for (const mission of ONBOARDING_MISSIONS.slice(0, count))
    progress.missions[mission.id] = { completed: true, stars: 1, bestTime: 120 };
  return progress;
}
const cache = new Map();
export function progressionFixture(id, { terminal = false, ranged = true } = {}) {
  const index = ONBOARDING_MISSIONS.findIndex(mission => mission.id === id);
  assert.ok(index >= 0, 'known progression fixture');
  const key = `${id}/${terminal}/${ranged}`;
  if (cache.has(key)) return structuredClone(cache.get(key));
  const mission = ONBOARDING_MISSIONS[index], progress = progressionProfile(index);
  const game = createProgressionCampaignMission(id, progress), policy = onboardingReferencePolicy(id, { ranged });
  let checkpoint, outcome;
  for (let tick = 0; tick < (mission.timeLimit + 1) * 20; tick++) {
    if (!terminal && game.state.time >= 30) { checkpoint = game.serialize(); break; }
    if (tick >= 200 && tick % 100 === 0) policy(game);
    const before = game.serialize();
    outcome = advanceObjectiveBattle(game, .05, active => evaluateCampaignMission(active, id), mission.timeLimit);
    assert.equal(outcome.failed, false, `${id}: paid fixture route failed`);
    if (outcome.completed) { assert.equal(terminal, true); checkpoint = before; break; }
  }
  assert.ok(checkpoint, 'paid route reached its checkpoint');
  const retained = Game.restore(checkpoint);
  const envelope = encodeBattle(retained, scenarioForBattle(null, id, retained), { campaignProgress: progress });
  const admitted = decodeBattle(envelope, { campaignProgress: progress }).game;
  assert.deepEqual(admitted.serialize(), checkpoint);
  assert.equal(Object.keys(admitted.buildings).length, [2, 5, 8][index]);
  assert.equal(getCampaignRoster(progress).buildings.length, [2, 5, 8][index]);
  const beforeOutcome = evaluateCampaignMission(admitted, id);
  assert.equal(beforeOutcome.completed, false); assert.equal(beforeOutcome.failed, false);
  const next = advanceObjectiveBattle(admitted, .05, active => evaluateCampaignMission(active, id), mission.timeLimit);
  assert.equal(next.completed, terminal);
  if (terminal) {
    assert.deepEqual(admitted.serialize(), game.serialize());
    assert.deepEqual(next, outcome);
    assert.throws(() => encodeBattle(admitted, scenarioForBattle(null, id, admitted), { campaignProgress: progress }));
  }
  const result = { id, progress, envelope, outcome: next, terminal, finalGame: admitted.serialize() };
  cache.set(key, structuredClone(result));
  return structuredClone(result);
}
