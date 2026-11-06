import { writeFileSync } from 'node:fs';
import { Game } from '../dist/engine.js';
import { INTRO_MISSIONS, createCampaignMission, evaluateCampaignMission } from '../dist/campaign.js';
import { playCampaign } from '../tests/campaign-policies.mjs';
import { introReferencePolicy, introMinesOnlyPolicy } from '../tests/intro-campaign-policies.mjs';

// A bounded content check, not a balance sweep or a human-difficulty claim.
const cases = [
  ['first-watch', 'reference', {}], ['first-watch', 'late-start', { startDelay: 30 }],
  ['first-watch', 'warriors-only', { ranged: false }],
  ['first-watch', 'idle', { idle: true }], ['first-watch', 'mines-only', { minesOnly: true }],
  ['forked-road', 'reference', {}], ['forked-road', 'late-start', { startDelay: 30 }],
  ['forked-road', 'tower-alternative', { tower: true }], ['forked-road', 'no-mine', { mine: false }],
  ['forked-road', 'idle', { idle: true }], ['forked-road', 'mines-only', { minesOnly: true }],
  ['forked-road', 'late-off-seed-recovery', { seed: 999, startDelay: 30 }],
];
const results = cases.map(([id, route, options]) => {
  const mission = INTRO_MISSIONS.find(m => m.id === id), actions = [];
  const seed = options.seed ?? mission.seed, startDelay = options.startDelay ?? 10;
  const { game, outcome } = playCampaign(createCampaignMission, evaluateCampaignMission, mission, {
    seed, startDelay, actionEvery: 5, maxActionsPerDecision: 1,
    policy: options.idle ? () => {} : options.minesOnly ? introMinesOnlyPolicy : introReferencePolicy(id, options),
    restore: data => Game.restore(data),
    onAction: a => actions.push({ action: a.name, args: a.args, time: +a.time.toFixed(2), cost: a.cost }),
  });
  return { id, route, seed, startDelay, time: +game.state.time.toFixed(2), completed: outcome.completed,
    failed: outcome.failed, stars: outcome.stars, citadelHP: game.state.bases[0].hp,
    label: outcome.label, medals: outcome.medals.map(m => ({ id: m.id, label: m.label, earned: m.earned })), actions };
});
const report = {
  scope: 'Local integrated engine, 12 short scripted cases. Every successful command uses ordinary paid actions. Authored initial formations are not player-earned progress.',
  restore: 'Game.restore every 10 simulated seconds; starting funds and all successful action costs recorded.',
  limits: 'No human, browser, mobile, input, audio or subjective difficulty certification. Extra seed 999 is an explicit slow-start limitation case.',
  results,
};
writeFileSync('qa/intro-campaign-evidence.json', JSON.stringify(report, null, 2) + '\n');
for (const result of results) console.log(`${result.id} / ${result.route}: ${result.completed ? 'win' : 'loss'}, ${result.stars} stars, ${result.time}s, ${result.citadelHP} HP`);
