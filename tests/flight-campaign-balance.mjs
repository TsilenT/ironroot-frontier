/** Optional bounded campaign review; not included in npm test.
 * Run from the repository root: node tests/flight-campaign-balance.mjs
 * Only this runner's qa/flight-campaign-balance/results.json is written.
 * Paid scripted policies are synthetic evidence, never human win-rate estimates.
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync, readdirSync, mkdirSync, writeFileSync} from 'node:fs';
import {Game} from '../dist/engine.js';
import * as campaign from '../dist/campaign.js';
import {encodeBattle, decodeBattle} from '../dist/battle-codec.js';
import {CURRENT_PROFILE_PROTOCOL_VERSION} from '../dist/profile-session.js';
import {campaignPolicy, campaignMasteryPolicy} from './campaign-policies.mjs';
import {onboardingReferencePolicy} from './onboarding-campaign-policies.mjs';

const root = new URL('../', import.meta.url);
const out = new URL('qa/flight-campaign-balance/', root);
const hash = value => createHash('sha256').update(typeof value === 'string' || Buffer.isBuffer(value) ? value : JSON.stringify(value)).digest('hex');
const round = value => +value.toFixed(3);
const runtimeFiles = readdirSync(new URL('dist/', root)).filter(file => /\.(js|html|css)$/.test(file)).sort();
const sourceFiles = [...runtimeFiles.map(file => 'dist/' + file), 'tests/campaign-policies.mjs', 'tests/onboarding-campaign-policies.mjs', 'tests/flight-campaign-balance.mjs'];
const simulationFiles = ['dist/engine.js', 'dist/rulesets.js', 'dist/flight-orders.js', 'dist/campaign.js', 'dist/campaign-onboarding.js', 'dist/intro-campaign.js', 'dist/battle-codec.js', 'dist/challenges.js', 'dist/training.js', 'dist/profile-session.js', 'tests/campaign-policies.mjs', 'tests/onboarding-campaign-policies.mjs', 'tests/flight-campaign-balance.mjs'];
const sourceHashes = () => Object.fromEntries(sourceFiles.map(file => [file, hash(readFileSync(new URL(file, root)))]));
const started = Date.now(), inputHashes = sourceHashes();
const invariants = [];
const check = (pass, label) => {invariants.push({pass, label});};
const publishedCatalogHashes = {
  revision1: hash(campaign.CAMPAIGN_PROGRESS_MISSIONS),
  revision2: hash(campaign.PROGRESSION_CAMPAIGN_MISSIONS),
};
assert.equal(publishedCatalogHashes.revision1, '3b08ea9aa1e101b3a187e2fd9c184a6cfd871f2f2fc4f4c384e5f7693baba69e');
assert.equal(publishedCatalogHashes.revision2, '42f459c491b5653c42efe8eeb946d75bb11e6a04c7d74e161ea1a5cf755248d4');
assert.equal(CURRENT_PROFILE_PROTOCOL_VERSION, 5);
assert.equal(campaign.FLIGHT_CAMPAIGN_MISSION_IDS.length, 13);
for (const id of campaign.FLIGHT_CAMPAIGN_MISSION_IDS) {
  assert.equal(campaign.getCurrentCampaignRevision(id), 3);
  assert.equal(campaign.campaignScenarioForGame(campaign.createCampaignMission(id), id).revision, 1, 'Never silently test the legacy default as current');
  assert.ok(Object.isFrozen(campaign.getCampaignMission(id, 2)));
}

/** Only the known identity and default aerie route fields may be normalized.
 * Do not drop HP, RNG, clocks, units, counters, effects, or unknown fields.
 */
function normalizeHold(game) {
  const saved = game.serialize();
  if (saved.rulesetId === 'frontier-campaign-flight') {
    saved.rulesetId = 'frontier-campaign-open';
    for (const building of saved.state.buildings) {
      if (building.type === 'aerie') {
        assert.equal(building.flightPlan, building.lane, 'Hold must not hide an issued order');
        delete building.flightPlan;
      } else assert.ok(!Object.hasOwn(building, 'flightPlan'));
    }
  }
  assert.ok(saved.state.units.every(unit => !Object.hasOwn(unit, 'airRoute')), 'Hold must never execute a route');
  return saved;
}
function makePolicy(id, kind) {
  if (kind === 'onboarding') return onboardingReferencePolicy(id);
  const reference = kind === 'mastery' ? campaignMasteryPolicy(id) : campaignPolicy(id);
  if (kind !== 'reference-warden-swap') return reference;
  return game => {
    const build = game.build;
    game.build = (type, ...args) => build.call(game, type === 'barracks' ? 'wardenLodge' : type, ...args);
    try {reference(game);} finally {game.build = build;}
  };
}
function orderAeries(game, route) {
  if (route === 'hold') return;
  for (const building of game.state.buildings.filter(b => b.side === 0 && b.type === 'aerie' && b.hp > 0)) {
    const lane = building.lane;
    const to = route === 'lower' ? (lane > 0 ? lane - 1 : 1)
      : (lane < game.map.lanes.length - 1 ? lane + 1 : lane - 1);
    if (building.flightPlan !== to) assert.equal(game.setFlightPlan(building.id, to).ok, true);
  }
}
let simulations = 0;
function run({id, revision, progress, seed, kind = 'reference', restore = false, route = 'hold', launch = false}) {
  const mission = launch ? campaign.getCampaignLaunchMission(id, progress) : campaign.getCampaignMission(id, revision);
  let game = launch ? campaign.createProgressionCampaignMission(id, progress) : campaign.createCampaignMission(id, {revision});
  const actualRevision = campaign.campaignScenarioForGame(game, id).revision;
  if (revision !== undefined) assert.equal(actualRevision, revision);
  game.seed = seed ?? mission.seed;
  const initialSeed = game.seed, player = makePolicy(id, kind), initialBuilt = game.state.stats.built[0];
  const initialWardens = game.state.buildings.filter(b => b.side === 0 && b.type === 'wardenLodge').length;
  const combatTrace = createHash('sha256'), actionTrace = createHash('sha256');
  const purchased = {}, grossByAction = {}, routes = new Map();
  let paidActions = 0, grossSpend = 0, orderActions = 0, restoreChecks = 0, sampleChecks = 0, maxWardens = 0;
  let outcome, flightDamageDuringWarningOrTransit = 0, deathsDuringWarningOrTransit = 0;
  const observe = () => {
    maxWardens = Math.max(maxWardens, game.state.units.filter(u => u.side === 0 && u.type === 'rootwarden').length);
    for (const unit of game.state.units) if (unit.side === 0 && unit.airRoute) {
      const prior = routes.get(unit.id) || {from: unit.airRoute.from, to: unit.airRoute.to, phases: [], firstSeen: round(game.state.time)};
      if (!prior.phases.includes(unit.airRoute.phase)) prior.phases.push(unit.airRoute.phase);
      routes.set(unit.id, prior);
    }
  };
  const sample = () => {
    combatTrace.update(JSON.stringify(route === 'hold' && actualRevision >= 2 ? normalizeHold(game) : game.serialize()));
    sampleChecks++;
  };
  for (let tick = 0; tick < (mission.timeLimit + 1) * 20; tick++) {
    if (tick % 20 === 0) {
      sample();
      const names = ['build', 'upgrade', 'cast', 'setFlightPlan'];
      const previous = Object.fromEntries(names.map(name => [name, Object.getOwnPropertyDescriptor(game, name)]));
      for (const name of names) {
        const original = game[name];
        game[name] = (...args) => {
          const beforeGold = game.state.gold[0], beforeKills = game.state.stats.kills[0], beforeSeed = game.seed;
          const result = original.apply(game, args);
          if (!result.ok) return result;
          const net = beforeGold - game.state.gold[0];
          if (name === 'setFlightPlan') {
            assert.equal(net, 0);assert.equal(game.seed, beforeSeed);orderActions++;
            actionTrace.update(JSON.stringify({name, args, time: game.state.time, cost: 0}));
            return result;
          }
          let expected;
          if (name === 'build') {
            expected = game.buildings[args[0]].cost;
            purchased[args[0]] = (purchased[args[0]] || 0) + 1;
          } else if (name === 'upgrade') {
            const building = game.state.buildings.find(b => b.id === args[0]);
            expected = Math.round(game.buildings[building.type].cost * (.7 + .35 * (building.level - 2)));
          } else expected = game.ruleset.spell.cost;
          const bounty = name === 'cast' ? 2 * (game.state.stats.kills[0] - beforeKills) : 0;
          assert.equal(net + bounty, expected, 'Every ordinary player command must pay its gross cost');
          paidActions++;grossSpend += expected;grossByAction[name] = (grossByAction[name] || 0) + expected;
          actionTrace.update(JSON.stringify({name, args, time: game.state.time, cost: expected, bounty}));
          return result;
        };
      }
      try {player(game);orderAeries(game, route);} finally {
        for (const name of names) if (previous[name]) Object.defineProperty(game, name, previous[name]); else delete game[name];
      }
    }
    const exposed = route === 'hold' ? [] : game.state.units.filter(u => u.side === 0 && ['warning', 'transit'].includes(u.airRoute?.phase)).map(unit => ({unit, hp: unit.hp}));
    game.update(.05);observe();
    for (const {unit, hp} of exposed) {
      flightDamageDuringWarningOrTransit += Math.max(0, hp - unit.hp);
      if (unit.hp <= 0) deathsDuringWarningOrTransit++;
    }
    outcome = campaign.evaluateCampaignMission(game, id, actualRevision);
    if (outcome.completed || outcome.failed) break;
    if (restore && tick % 200 === 0) {
      const before = game.serialize(), scenario = campaign.campaignScenarioForGame(game, id);
      const raw = Game.restore(before);
      assert.deepEqual(raw.serialize(), before, 'Raw restore changed a live campaign state');
      const envelope = encodeBattle(raw, scenario, {campaignProgress: progress});
      const decoded = decodeBattle(JSON.stringify(envelope), {campaignProgress: progress});
      assert.deepEqual(decoded.game.serialize(), before, 'Playable save admission changed a live campaign state');
      assert.deepEqual(decoded.scenario, scenario, 'Resume changed the attempt identity');
      game = decoded.game;restoreChecks++;
    }
  }
  sample();simulations++;
  assert.equal(game.state.stats.built[0], initialBuilt + Object.values(purchased).reduce((sum, n) => sum + n, 0), 'Unexpected free player buildings');
  const summary = {
    id, revision: actualRevision, rulesetId: game.ruleset.id, mapId: game.map.id, policy: kind, route, seed: initialSeed,
    won: outcome.completed, failed: outcome.failed, stars: outcome.stars, seconds: round(game.state.time), exactSimulationSeconds: game.state.time, label: outcome.label,
    citadelHP: round(game.state.bases[0].hp), enemyCitadelHP: round(game.state.bases[1].hp),
    paidActions, grossSpend, grossByAction, purchased, initialWardens, maxWardens, orderActions,
    restores: restoreChecks, sampledStates: sampleChecks,
    finalStateHash: hash(game.serialize()), normalizedFinalStateHash: route === 'hold' && actualRevision >= 2 ? hash(normalizeHold(game)) : null,
    combatTraceHash: combatTrace.digest('hex'), actionTraceHash: actionTrace.digest('hex'), outcomeHash: hash(outcome),
    routeEvidence: {launched: routes.size, warned: [...routes.values()].filter(r => r.phases.includes('warning')).length,
      transited: [...routes.values()].filter(r => r.phases.includes('transit')).length,
      completedCrossings: [...routes.values()].filter(r => r.phases.includes('done')).length,
      damageWhileWarningOrTransit: round(flightDamageDuringWarningOrTransit), deathsWhileWarningOrTransit: deathsDuringWarningOrTransit},
  };
  return {game, outcome, summary};
}
function compare(a, b, label) {
  const equal = {
    exactOutcome: a.outcomeHash === b.outcomeHash,
    exactSeconds: a.exactSimulationSeconds === b.exactSimulationSeconds,
    exactNormalizedFinalState: a.normalizedFinalStateHash === b.normalizedFinalStateHash,
    exactSampledCombatTrace: a.combatTraceHash === b.combatTraceHash,
    exactPaidActionTrace: a.actionTraceHash === b.actionTraceHash,
  };
  for (const [field, pass] of Object.entries(equal)) check(pass, label + '/' + field);
  return equal;
}

// Earn the real profile through normal victories rather than hand-writing flags.
let progress = campaign.createCampaignProgress();
const progression = [], progressBefore = {};
for (const descriptor of [...campaign.ONBOARDING_MISSIONS, ...campaign.CAMPAIGN_MISSIONS]) {
  const id = descriptor.id;
  progressBefore[id] = structuredClone(progress);
  const entry = run({id, progress, launch: true, restore: true,
    kind: campaign.ONBOARDING_MISSIONS.some(m => m.id === id) ? 'onboarding' : 'reference'});
  progression.push(entry.summary);
  check(entry.outcome.completed, 'Paid current-profile progression/' + id);
  if (!entry.outcome.completed) break; // Keep the negative result; never invent prerequisites.
  progress = campaign.recordCampaignResult(progress, id, entry.game);
}
const overview = campaign.getProgressionCampaignOverview(progress);
check(overview.cleared === 19, 'All 19 current-profile missions earned');
check(progression.slice(0, 3).map(r => r.rulesetId).join(',') === 'frontier-campaign-watch,frontier-campaign-fork,frontier-campaign-open', 'Opening retains the three earned roster identities');
check(progression.some(r => r.maxWardens > 0 && r.purchased.wardenLodge > 0), 'Paid Rootwardens participate in actual progression');
process.stderr.write(`Paid progression: ${overview.cleared}/19 cleared; ${overview.stars}/${overview.maxStars} stars.\n`);

const holdComparisons = [], restoredContinuations = [];
for (const id of campaign.FLIGHT_CAMPAIGN_MISSION_IDS) {
  const mission = campaign.getCampaignMission(id, 3);
  if (!progressBefore[id]) continue;
  for (const kind of ['reference', 'mastery']) for (const seed of [mission.seed, 57, 999]) {
    const spec = {id, progress: progressBefore[id], seed, kind};
    const old = run({...spec, revision: 2}).summary, current = run({...spec, revision: 3}).summary;
    holdComparisons.push({id, policy: kind, seed, comparison: compare(old, current, `Hold ${id}/${kind}/${seed}`), revision2: old, revision3: current});
    if (seed === 999) {
      for (const revision of [2, 3]) {
        const resumed = run({...spec, revision, restore: true}).summary;
        const direct = revision === 2 ? old : current;
        restoredContinuations.push({id, policy: kind, seed, revision, restores: resumed.restores,
          exactFinalState: direct.finalStateHash === resumed.finalStateHash,
          comparison: compare(direct, resumed, `Resumed ${id}/${kind}/${seed}/r${revision}`)});
        check(direct.finalStateHash === resumed.finalStateHash, `Exact restored identity and end state ${id}/${kind}/r${revision}`);
      }
    }
  }
  process.stderr.write(`Hold parity: ${id} reference/mastery × three seeds; both revisions resumed at seed 999.\n`);
}

// Small actual-campaign supplements: all formations, gold, HP, rules and goals
// stay authored. A swapped paid Warden lodge is deliberately not a tuned route.
const flightExamples = [];
for (const [id, kind] of [['cold-forge', 'reference'], ['river-charter', 'reference'], ['far-beacon', 'reference'], ['last-light', 'reference-warden-swap']]) {
  if (!progressBefore[id]) continue;
  const mission = campaign.getCampaignMission(id, 3);
  // Cold Forge's outer aeries and Last Light's single outer aerie have only
  // one distinct adjacent direction. Do not double-count that same strategy.
  const routes = id === 'far-beacon' ? ['hold', 'lower', 'higher'] : ['hold', 'lower'];
  for (const seed of [mission.seed, 999]) {
    let hold;
    for (const route of routes) {
      const result = run({id, revision: 3, progress: progressBefore[id], seed, kind, route, restore: true}).summary;
      if (route === 'hold') hold = result;
      flightExamples.push({...result, versusHold: {
        wonChanged: result.won !== hold.won, starDelta: result.stars - hold.stars,
        secondsDelta: round(result.seconds - hold.seconds), citadelHPDelta: round(result.citadelHP - hold.citadelHP),
        grossSpendDelta: result.grossSpend - hold.grossSpend,
      }});
    }
  }
}
const failures = [
  ...holdComparisons.flatMap(row => [row.revision2, row.revision3]),
  ...progression, ...flightExamples,
].filter(r => !r.won).map(r => ({id: r.id, revision: r.revision, policy: r.policy, seed: r.seed, route: r.route, stars: r.stars, seconds: r.seconds, label: r.label}));
const adverseFlightComparisons = flightExamples.filter(r => r.route !== 'hold' && (r.versusHold.starDelta < 0 || r.versusHold.citadelHPDelta < 0 || r.versusHold.secondsDelta > 0 || r.versusHold.wonChanged));
check(holdComparisons.length === 78, 'Complete thirteen-mission, two-policy, three-seed Hold matrix');
check(restoredContinuations.length === 52, 'Both revisions fully resumed for every mission/policy at seed 999');
check(flightExamples.some(r => r.routeEvidence.completedCrossings > 0), 'Paid campaign examples actually execute crossings');
check(flightExamples.some(r => r.orderActions > 0 && r.purchased.wardenLodge > 0 && r.maxWardens > 0), 'Paid Rootwardens and issued flight orders coexist in a campaign attempt');
const finalHashes = sourceHashes();
const sourceChangesDuringRun = Object.keys(inputHashes).filter(file => inputHashes[file] !== finalHashes[file]).map(file => ({file, before: inputHashes[file], after: finalHashes[file], simulationDependency: simulationFiles.includes(file)}));
check(simulationFiles.every(file => inputHashes[file] === finalHashes[file]), 'Imported simulation sources and policies remained byte-identical during the entire evaluation');
const report = {
  format: 'ironroot-flight-campaign-balance', version: 1, generatedAt: new Date().toISOString(),
  node: process.version, durationSeconds: round((Date.now() - started) / 1000), sourceHashes: inputHashes,
  profileProtocol: CURRENT_PROFILE_PROTOCOL_VERSION, publishedCatalogHashes, simulationFiles, sourceChangesDuringRun,
  scope: {
    missions: [...campaign.FLIGHT_CAMPAIGN_MISSION_IDS], revisions: [2, 3], policies: ['reference', 'mastery'],
    seedChoices: ['authored mission seed', 57, 999], timeStepSeconds: .05, decisionEverySeconds: 1,
    actionLimitPerDecision: null, restoreEverySeconds: 10, restoreSeed: 999,
    normalizedFields: ['rulesetId frontier-campaign-flight → frontier-campaign-open', 'remove aerie flightPlan only after checking it equals its source lane'],
    limits: 'Scripted paid policies are not human play or optimality claims. No combat tuning, free buildings, HP/gold edits, synthetic troops, or automatic wins. Seed is the only initial battle override. Trace hashes sample before each one-second decision and at the exact end, not every simulation tick. Current progression and optional flight examples also use playable save roundtrips. Terminal states use raw engine hashes because the playable codec intentionally rejects ended battles. No browser, physical-device, performance, network, deployment or live-release certification. Historical identity compatibility is covered separately by existing frozen-oracle/identity tests.',
  },
  summary: {
    simulations, holdPairs: holdComparisons.length,
    equalHoldPairs: holdComparisons.filter(r => Object.values(r.comparison).every(Boolean)).length,
    fullRestoredContinuations: restoredContinuations.length,
    exactRestoredContinuations: restoredContinuations.filter(r => r.exactFinalState && Object.values(r.comparison).every(Boolean)).length,
    restoredSaveChecks: progression.reduce((n, r) => n + r.restores, 0) + restoredContinuations.reduce((n, r) => n + r.restores, 0) + flightExamples.reduce((n, r) => n + r.restores, 0),
    progressionCleared: overview.cleared, progressionStars: overview.stars,
    referenceCurrentWins: holdComparisons.filter(r => r.policy === 'reference' && r.revision3.won).length,
    masteryCurrentWins: holdComparisons.filter(r => r.policy === 'mastery' && r.revision3.won).length,
    referenceCurrentThreeStars: holdComparisons.filter(r => r.policy === 'reference' && r.revision3.stars === 3).length,
    masteryCurrentThreeStars: holdComparisons.filter(r => r.policy === 'mastery' && r.revision3.stars === 3).length,
    flightExamples: flightExamples.length, adverseFlightComparisons: adverseFlightComparisons.length,
    failedOutcomes: failures.length, invariantChecks: invariants.length, failedInvariants: invariants.filter(c => !c.pass),
  },
  progression, finalProgress: progress, holdComparisons, restoredContinuations, flightExamples,
  negativeResults: failures,
  adverseFlightComparisons: adverseFlightComparisons.map(r => ({id: r.id, seed: r.seed, policy: r.policy, route: r.route, versusHold: r.versusHold, won: r.won, stars: r.stars, seconds: r.seconds, label: r.label})),
};
mkdirSync(out, {recursive: true});
writeFileSync(new URL('results.json', out), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report.summary, null, 2));
if (report.summary.failedInvariants.length) process.exitCode = 1;
