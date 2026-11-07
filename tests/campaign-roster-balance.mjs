/** Read-only paid-policy review of all sixteen revision-2 continuations.
 * Run: node tests/campaign-roster-balance.mjs > docs/CAMPAIGN_ROSTER_BALANCE_RESULTS.json
 * This is measured policy evidence, not a human win-rate or optimality claim.
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { Game } from '../dist/engine.js';
import {
  CAMPAIGN_MISSIONS, ONBOARDING_MISSIONS, createCampaignProgress, createCampaignMission,
  createProgressionCampaignMission, getCampaignLaunchMission, getCampaignRoster,
  getProgressionCampaignOverview, recordCampaignResult, evaluateCampaignMission,
  getCampaignTargets, campaignScenarioForGame, currentIncome,
} from '../dist/campaign.js';
import { encodeBattle, decodeBattle } from '../dist/battle-codec.js';
import { playCampaign, campaignPolicy, productionPolicy } from './campaign-policies.mjs';
import { onboardingReferencePolicy } from './onboarding-campaign-policies.mjs';

const round = x => +x.toFixed(2);
const sha = x => createHash('sha256').update(typeof x === 'string' ? x : JSON.stringify(x)).digest('hex');
const fileHash = async file => sha(await readFile(new URL(file, import.meta.url), 'utf8'));
const allLanes = mission => Array.from({ length: mission.mapId === 'twin-span' ? 2 : 3 }, (_, i) => i);
const favoredLanes = mission => ['emberwatch', 'stonegate'].includes(mission.id) ? [1] : allLanes(mission);
const inputHashes = Object.fromEntries(await Promise.all(['engine.js', 'rulesets.js', 'campaign.js', 'campaign-onboarding.js', 'battle-codec.js'].map(async file => [file, await fileHash('../dist/' + file)])));

function referenceWithWardens(id) {
  const reference = campaignPolicy(id);
  return game => {
    const original = game.build;
    game.build = (type, ...args) => original.call(game, type === 'barracks' ? 'wardenLodge' : type, ...args);
    try { reference(game); } finally { game.build = original; }
  };
}
function minesThen(mission, next) {
  // Use the same rear sites the reference later expects, so the control does
  // not accidentally deadlock its script on a fourth, differently placed mine.
  const slots = mission.id === 'river-charter' || mission.id === 'common-ground'
    ? [[410, 0], [410, 1], [270, 0]] : [[410, 0], [410, 1], [410, 2]];
  return game => {
    for (const [x, lane] of slots) {
      if (game.state.buildings.filter(b => b.side === 0 && b.type === 'mint').length >= 3) break;
      if (!game.state.buildings.some(b => b.side === 0 && b.x === x && b.lane === lane)) {
        game.build('mint', x, game.map.lanes[lane]);
        return;
      }
    }
    next(game);
  };
}
// One paid screen per relevant road, then ordinary archers and siege, with no
// access to enemy gold or synthetic units. Economy missions retain their actual
// income goals; this deliberately generic route does not waive them.
function screenedRanged(mission, { siege = true, upgradeScreens = false } = {}) {
  const lanes = favoredLanes(mission);
  const push = productionPolicy(siege ? ['archery', 'archery', 'foundry'] : ['archery'], lanes);
  return game => {
    for (const lane of lanes) {
      const screen = game.state.buildings.find(b => b.side === 0 && b.type === 'wardenLodge' && b.lane === lane);
      if (!screen) {
        for (const x of [1250, 1110, 970, 830, 690]) {
          const result = game.build('wardenLodge', x, game.map.lanes[lane]);
          if (result.ok || result.reason.startsWith('Need ')) return;
        }
      } else if (upgradeScreens && screen.level < 2) { game.upgrade(screen.id); return; }
    }
    push(game);
  };
}

function run(mission, progress, { legacy = false, policy, restore = false, seed = mission.seed,
  startDelay = 0, actionEvery = 1, maxActionsPerDecision = Infinity, name = 'reference' } = {}) {
  const initial = legacy ? createCampaignMission(mission.id) : createProgressionCampaignMission(mission.id, progress);
  if (!legacy) {
    assert.equal(campaignScenarioForGame(initial, mission.id).revision, ONBOARDING_MISSIONS.some(m => m.id === mission.id) ? 1 : 2);
    if (!ONBOARDING_MISSIONS.some(m => m.id === mission.id)) {
      assert.equal(Object.keys(initial.buildings).length, 8);
      assert.equal(initial.units.rootwarden.hp, 800);
      assert.equal(initial.units.rootwarden.damage, 8);
    }
  }
  const initialBuildings = initial.state.buildings.map(b => ({ id: b.id, side: b.side, type: b.type, level: b.level }));
  let paidActions = 0, spent = 0, restores = 0, lastSnapshot = -1, firstCitadelDamage = null;
  const purchased = {}, snapshots = [], actionLog = [];
  let castKillBaseline = null;
  let maxOwnUnits = 0, maxWardens = 0, capObserved = false;
  const player = policy || campaignPolicy(mission.id);
  const measured = game => {
    const s = game.state;
    const own = s.units.filter(u => u.side === 0);
    maxOwnUnits = Math.max(maxOwnUnits, own.length);
    maxWardens = Math.max(maxWardens, own.filter(u => u.type === 'rootwarden').length);
    capObserved ||= own.length >= 70;
    if (firstCitadelDamage === null && s.bases[0].hp < mission.startingHealth - .01) firstCitadelDamage = round(s.time);
    const bucket = Math.floor((s.time + .001) / 30);
    if (bucket !== lastSnapshot) {
      snapshots.push({ seconds: round(s.time), gold: round(s.gold[0]), income: currentIncome(game),
        citadelHP: round(s.bases[0].hp), enemyCitadelHP: round(s.bases[1].hp), ownUnits: own.length,
        ownBuildings: s.buildings.filter(b => b.side === 0).length,
        remainingTargets: getCampaignTargets(game, mission.id).filter(t => t.kind === 'destroy' && t.building).length });
      lastSnapshot = bucket;
    }
    const originalCast = game.cast;
    game.cast = (...args) => { castKillBaseline = game.state.stats.kills[0]; return originalCast.apply(game, args); };
    try { player(game); } finally { game.cast = originalCast; }
  };
  const { game, outcome } = playCampaign(() => initial, evaluateCampaignMission, mission, {
    policy: measured, seed, startDelay, actionEvery, maxActionsPerDecision,
    restore: restore ? data => {
      restores++;
      const before = Game.restore(data);
      const envelope = encodeBattle(before, campaignScenarioForGame(before, mission.id), { campaignProgress: progress });
      const after = decodeBattle(envelope, { campaignProgress: progress }).game;
      assert.deepEqual(after.serialize(), data, `restore changed ${mission.id}`);
      return after;
    } : null,
    onAction: ({ name: method, args, cost, time, game: active }) => {
      assert.ok(Number.isFinite(cost), `${mission.id} received a nonfinite action charge`);
      if (method !== 'cast') assert.ok(cost > 0, `${mission.id} received an unpaid action`);
      if (method === 'build') {
        assert.equal(cost, active.buildings[args[0]].cost);
        purchased[args[0]] = (purchased[args[0]] || 0) + 1;
      }
      if (method === 'upgrade') {
        const building = active.state.buildings.find(b => b.id === args[0]);
        assert.equal(cost, Math.round(active.buildings[building.type].cost * (.7 + .35 * (building.level - 2))));
      }
      const bounty = method === 'cast' ? 2 * (active.state.stats.kills[0] - castKillBaseline) : 0;
      if (method === 'cast') assert.equal(cost + bounty, active.ruleset.spell.cost);
      paidActions++; spent += cost + bounty;
      actionLog.push({ seconds: round(time), method, args, cost: cost + bounty, immediateKillBounty: bounty });
    },
  });
  assert.equal(game.state.stats.built[0], initialBuildings.filter(b => b.side === 0).length + Object.values(purchased).reduce((n, count) => n + count, 0), 'unexpected free building');
  const result = {
    mission: mission.id, policy: name, revision: legacy ? 1 : campaignScenarioForGame(game, mission.id).revision,
    seed, startDelay, actionEvery, maxActionsPerDecision: Number.isFinite(maxActionsPerDecision) ? maxActionsPerDecision : null,
    won: outcome.completed, failed: outcome.failed, stars: outcome.stars, seconds: round(game.state.time), label: outcome.label,
    citadelHP: round(game.state.bases[0].hp), enemyCitadelHP: round(game.state.bases[1].hp),
    income: currentIncome(game), goldRemaining: round(game.state.gold[0]), paidActions, spent, purchased, restores, initialBuildings,
    firstCitadelDamage, maxOwnUnits, maxWardens, capObserved, troopsLost: game.state.stats.kills[1],
    objectives: outcome.objectives.map(o => ({ id: o.id, type: o.type, met: o.met, failed: o.failed || false, text: o.text })),
    finalStateHash: sha({ state: game.state, seed: game.seed, tick: game.tick, nextId: game.nextId, aiTimer: game.aiTimer, accumulator: game.accumulator }),
    snapshots, actionLog,
  };
  return { game, outcome, result };
}

const onboarding = [], progression = [], results = [], legacyComparisons = [], beforeMission = {};
let progress = createCampaignProgress();
for (const mission of ONBOARDING_MISSIONS) {
  const actual = getCampaignLaunchMission(mission.id, progress);
  assert.equal(Object.keys(createProgressionCampaignMission(mission.id, progress).buildings).length, [2, 5, 8][onboarding.length]);
  const sample = run(actual, progress, { name: 'paid-onboarding', policy: onboardingReferencePolicy(mission.id), restore: true, startDelay: 10, actionEvery: 5, maxActionsPerDecision: 1 });
  assert.ok(sample.outcome.completed, `Onboarding failed: ${mission.id}`);
  onboarding.push(sample.result);
  progress = recordCampaignResult(progress, mission.id, sample.game);
}
for (const original of CAMPAIGN_MISSIONS) {
  beforeMission[original.id] = structuredClone(progress);
  const mission = getCampaignLaunchMission(original.id, progress);
  const sample = run(mission, progress, { name: 'reference' });
  assert.ok(sample.outcome.completed, `Paid reference cannot progress: ${original.id}`);
  progression.push(sample.result);
  results.push(sample.result);
  progress = recordCampaignResult(progress, mission.id, sample.game);
  process.stderr.write(`Progression ${mission.id}: ${sample.result.won ? 'win' : 'loss'} ${sample.result.seconds}s\n`);
}
assert.equal(getProgressionCampaignOverview(progress).cleared, 19);
assert.equal(getCampaignRoster(progress).buildings.length, 8);
for (const original of CAMPAIGN_MISSIONS) {
  const mission = getCampaignLaunchMission(original.id, beforeMission[original.id]);
  const earned = beforeMission[original.id];
  const seeds = [mission.seed, 57, 999];
  for (const [index, seed] of seeds.entries()) {
    const modern = index === 0 ? { result: progression.find(r => r.mission === mission.id) }
      : run(mission, earned, { name: 'reference', seed, restore: index === 2 });
    if (index !== 0) results.push(modern.result);
    const legacy = run(original, earned, { name: 'legacy-reference', legacy: true, seed, restore: index === 2 });
    const equal = modern.result.finalStateHash === legacy.result.finalStateHash;
    assert.ok(equal, `${mission.id} changed an existing policy's exact combat outcome`);
    legacyComparisons.push({ mission: mission.id, seed, exactFinalStateEqual: equal,
      modernSeconds: modern.result.seconds, legacySeconds: legacy.result.seconds, modernWon: modern.result.won,
      legacyWon: legacy.result.won, restored: index === 2, legacyStateHash: legacy.result.finalStateHash });
    results.push(run(mission, earned, { name: 'reference-warden-swap', policy: referenceWithWardens(mission.id), seed, restore: index === 2 }).result);
  }
  for (const [name, makePolicy, options] of [
    ['paced-reference-authored', () => campaignPolicy(mission.id), { startDelay: 10, actionEvery: 3, maxActionsPerDecision: 1 }],
    ['paced-reference', () => campaignPolicy(mission.id), { seed: 999, restore: true, startDelay: 10, actionEvery: 3, maxActionsPerDecision: 1 }],
    ['paced-warden-swap', () => referenceWithWardens(mission.id), { seed: 999, restore: true, startDelay: 10, actionEvery: 3, maxActionsPerDecision: 1 }],
    ['screened-archers-siege', () => screenedRanged(mission), {}],
    ['screened-archers', () => screenedRanged(mission, { siege: false }), { seed: 999, restore: true }],
    ['wardens-only', () => productionPolicy(['wardenLodge'], favoredLanes(mission)), {}],
    ['archers-only', () => productionPolicy(['archery'], favoredLanes(mission)), {}],
    ['center-only-screened', () => productionPolicy(['wardenLodge', 'archery', 'foundry'], [Math.floor(allLanes(mission).length / 2)]), {}],
    ['mines-first-reference', () => minesThen(mission, campaignPolicy(mission.id)), { startDelay: 10, actionEvery: 3, maxActionsPerDecision: 1 }],
    ['idle', () => () => {}, {}],
    ['paced-wardens-only', () => productionPolicy(['wardenLodge'], favoredLanes(mission)), { seed: 999, restore: true, startDelay: 10, actionEvery: 3, maxActionsPerDecision: 1 }],
    ['paced-warriors-only', () => productionPolicy(['barracks'], favoredLanes(mission)), { seed: 999, restore: true, startDelay: 10, actionEvery: 3, maxActionsPerDecision: 1 }],
  ]) results.push(run(mission, earned, { name, policy: makePolicy(), ...options }).result);
  for (const [index, seed] of seeds.entries()) {
    if (index > 0) results.push(run(mission, earned, { name: 'wardens-only', policy: productionPolicy(['wardenLodge'], favoredLanes(mission)), seed, restore: index === 2 }).result);
    for (const [name, types] of [['warriors-only', ['barracks']], ['generic-warriors-archers', ['barracks', 'archery']], ['generic-wardens-archers', ['wardenLodge', 'archery']]]) {
      results.push(run(mission, earned, { name, policy: productionPolicy(types, favoredLanes(mission)), seed, restore: index === 2 }).result);
    }
  }
  process.stderr.write(`Counterplay ${mission.id}: complete\n`);
}
const endHashes = Object.fromEntries(await Promise.all(Object.keys(inputHashes).map(async file => [file, await fileHash('../dist/' + file)])));
assert.deepEqual(endHashes, inputHashes, 'runtime changed during the review');
const aggregate = name => {
  const samples = results.filter(r => r.policy === name);
  return { policy: name, samples: samples.length, wins: samples.filter(r => r.won).length,
    missionsWon: [...new Set(samples.filter(r => r.won).map(r => r.mission))],
    losses: samples.filter(r => !r.won).map(r => ({ mission: r.mission, seed: r.seed, seconds: r.seconds, label: r.label })),
    paidWardens: samples.reduce((n, r) => n + (r.purchased.wardenLodge || 0), 0) };
};
console.log(JSON.stringify({ generatedAt: new Date().toISOString(), inputHashes,
  note: 'All battles begin from the normal authored formation. Progress was earned through actual paid wins, without setting completion flags, gold, HP or units. Every later player action is an audited ordinary paid command. Seeds alter combat randomness, not map, formation or policy. Existing reference actions are checked against revision 1 using exact final combat state, not only outcome. Alternative controls intentionally omit some required counters or economy; their losses are not claims of impossibility. This does not measure human win rate, prove an optimal strategy, or replace UI playtesting.',
  paidOnboarding: onboarding, paidProgression: progression, finalProgress: progress,
  roster: getCampaignRoster(progress), legacyComparisons,
  simulations: onboarding.length + results.length + legacyComparisons.length,
  summaries: [...new Set(results.map(r => r.policy))].map(aggregate), results,
}, null, 2));
