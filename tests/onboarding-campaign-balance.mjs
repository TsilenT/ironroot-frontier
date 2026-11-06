/** Reproducible authored-content evidence. Run: node tests/onboarding-campaign-balance.mjs */
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { Game } from '../dist/engine.js';
import { ONBOARDING_MISSIONS, createCampaignMission, evaluateCampaignMission, getCampaignTargets } from '../dist/campaign.js';
import { playCampaign, productionPolicy } from './campaign-policies.mjs';
import { onboardingReferencePolicy, onboardingMinesOnlyPolicy } from './onboarding-campaign-policies.mjs';

const hash = async name => createHash('sha256').update(await readFile(new URL(name, import.meta.url))).digest('hex').slice(0, 12);
const run = (mission, policy, options = {}) => {
  let paidActions = 0, spent = 0, restores = 0;
  const { game, outcome } = playCampaign(createCampaignMission, evaluateCampaignMission, mission, {
    policy, startDelay: 10, actionEvery: 5, maxActionsPerDecision: 1,
    restore: data => { restores++; return Game.restore(data); },
    onAction: ({ cost }) => { paidActions++; spent += cost; },
    ...options,
  });
  return {
    won: outcome.completed, stars: outcome.stars, seconds: +game.state.time.toFixed(2),
    citadelHP: +game.state.bases[0].hp.toFixed(2), citadelVictory: game.state.bases[1].hp <= 0,
    markedTargetsRemaining: getCampaignTargets(game, mission.id).filter(target => target.building).length,
    paidActions, spent, restores, troopsLost: game.state.stats.kills[1], label: outcome.label,
  };
};
const reference = ONBOARDING_MISSIONS.map(mission => {
  const samples = [];
  for (const seed of [mission.seed, 57, 999]) for (const startDelay of [10, 30]) {
    samples.push({ seed, startDelay, ...run(mission, onboardingReferencePolicy(mission.id), { seed, startDelay }) });
  }
  return {
    mission: mission.id, lanes: createCampaignMission(mission.id).map.lanes.length,
    roster: Object.keys(createCampaignMission(mission.id).buildings), deadline: mission.timeLimit,
    wins: samples.filter(sample => sample.won).length, threeStars: samples.filter(sample => sample.stars === 3).length,
    minSeconds: Math.min(...samples.map(sample => sample.seconds)), maxSeconds: Math.max(...samples.map(sample => sample.seconds)),
    minCitadelHP: Math.min(...samples.map(sample => sample.citadelHP)), samples,
  };
});
const [first, fork, third] = ONBOARDING_MISSIONS;
const alternatives = [
  ['first-warriors', first, onboardingReferencePolicy(first.id, { ranged: false })],
  ['fork-no-wardens', fork, onboardingReferencePolicy(fork.id, { wardens: false })],
  ['fork-unsupported-archers', fork, productionPolicy(['archery'], [0, 1])],
  ['third-no-wardens', third, productionPolicy(['barracks', 'archery', 'foundry'], [0, 1, 2])],
  ['third-no-mine', third, onboardingReferencePolicy(third.id, { mine: false })],
  ['third-center-only', third, productionPolicy(['wardenLodge', 'archery', 'foundry'], [1])],
  ['third-tanks-only', third, productionPolicy(['wardenLodge'], [0, 1, 2])],
].map(([policy, mission, player]) => ({ policy, mission: mission.id, ...run(mission, player) }));
const poorDecisions = ONBOARDING_MISSIONS.flatMap(mission => [
  { mission: mission.id, policy: 'idle', ...run(mission, () => {}) },
  mission.id === 'roadside-watch'
    ? { mission: mission.id, policy: 'archers-only', ...run(mission, productionPolicy(['archery'], [0])) }
    : { mission: mission.id, policy: 'mines-only', ...run(mission, onboardingMinesOnlyPolicy) },
]);
console.log(JSON.stringify({
  engineSha: await hash('../dist/engine.js'), contentSha: await hash('../dist/campaign-onboarding.js'),
  note: 'Paid deterministic policy outcomes, not human playtesting, proof of an optimal strategy, mobile usability evidence, or evidence that every novice route succeeds.',
  reference, alternatives, poorDecisions,
}, null, 2));
