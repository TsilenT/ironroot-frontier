import assert from 'node:assert/strict';
import test from 'node:test';
import { Game, getRuleset } from '../dist/engine.js';
import { ONBOARDING_CHAPTER, ONBOARDING_MISSIONS, isOnboardingMission } from '../dist/campaign-onboarding.js';
import {
  CAMPAIGN_MISSIONS, INTRO_MISSIONS, createCampaignMission, createProgressionCampaignMission,
  createCampaignProgress, evaluateCampaignMission, getCampaignTargets, getCampaignRoster,
  isMissionUnlocked, recordCampaignResult, normalizeCampaignProgress,
} from '../dist/campaign.js';
import { encodeBattle, decodeBattle } from '../dist/battle-codec.js';
import { playCampaign, productionPolicy } from './campaign-policies.mjs';
import { onboardingReferencePolicy, onboardingMinesOnlyPolicy } from './onboarding-campaign-policies.mjs';

const run = (mission, options = {}) => playCampaign(createCampaignMission, evaluateCampaignMission, mission, {
  startDelay: 10, actionEvery: 5, maxActionsPerDecision: 1,
  policy: onboardingReferencePolicy(mission.id), ...options,
});
const byId = id => ONBOARDING_MISSIONS.find(mission => mission.id === id);

test('three separate opening scenarios actually bind one/two/three roads and two/five/eight building rosters', () => {
  const oldIds = [...CAMPAIGN_MISSIONS, ...INTRO_MISSIONS].map(mission => mission.id);
  assert.equal(ONBOARDING_CHAPTER.id, 'opening-roads');
  assert.deepEqual(ONBOARDING_MISSIONS.map(mission => mission.id), ['roadside-watch', 'shield-at-the-fork', 'open-three-roads']);
  assert.deepEqual(ONBOARDING_MISSIONS.map(mission => mission.prerequisites), [[], ['roadside-watch'], ['shield-at-the-fork']]);
  assert.deepEqual(ONBOARDING_MISSIONS.map(mission => mission.timeLimit), [180, 210, 240]);
  for (const [index, mission] of ONBOARDING_MISSIONS.entries()) {
    assert.equal(oldIds.includes(mission.id), false);
    assert.equal(isOnboardingMission(mission.id), true);
    assert.notEqual(mission.optional, true, 'this is the new campaign route, not another optional introduction');
    assert.equal(mission.scenarioRevision, 1);
    const game = createCampaignMission(mission.id);
    assert.equal(game.map.lanes.length, index + 1);
    assert.equal(Object.keys(game.buildings).length, [2, 5, 8][index]);
    assert.equal(game.ruleset.id, mission.rulesetId);
    assert.equal(game.ruleset.endgame.forcedDecay, false);
    assert.equal(game.state.gold[0], mission.startingGold);
    assert.equal(game.state.buildings.filter(building => building.side === 0).length, 0);
    assert.equal(game.state.stats.built[0], 0);
    assert.equal(game.state.buildings.filter(building => building.side === 1).length, [1, 3, 5][index]);
    assert.ok(getCampaignTargets(game, mission.id).every(target => target.originalId === target.building.id));
    assert.equal(game.ai, false);
    for (const type of Object.keys(getRuleset('frontier-campaign-open').buildings)) {
      const isolated = createCampaignMission(mission.id), before = isolated.state.gold[0];
      const built = isolated.build(type, 970, isolated.map.lanes[0]);
      assert.equal(built.ok, Object.hasOwn(game.buildings, type), `${mission.id}: ${type}`);
      assert.equal(before - isolated.state.gold[0], built.ok ? game.buildings[type].cost : 0);
    }
    assert.deepEqual(Game.restore(game.serialize()).serialize(), game.serialize());
  }
  for (const id of [null, {}, [], '', 'emberwatch', 'first-watch', '__proto__']) assert.equal(isOnboardingMission(id), false);
});

test('all nine stars have ordinary paid routes with reading time, slow decisions, seed variation and repeated exact restore', () => {
  for (const mission of ONBOARDING_MISSIONS) {
    for (const seed of [mission.seed, 57, 999]) for (const startDelay of [10, 30]) {
      const actions = [];
      let restores = 0;
      const { game, outcome } = run(mission, {
        seed, startDelay,
        restore: data => {
          const restored = Game.restore(data);
          assert.deepEqual(restored.serialize(), data);
          restores++;
          return restored;
        },
        onAction: action => actions.push({ time: action.time, cost: action.cost, gold: action.game.state.gold[0] }),
      });
      const label = `${mission.id}/${seed}/delay${startDelay}`;
      assert.equal(outcome.completed, true, `${label}: ${outcome.label}`);
      assert.equal(outcome.stars, 3, label);
      assert.ok(game.state.time < 150, `${label}: short opening, not a long unlock grind`);
      assert.ok(game.state.bases[0].hp > 5000, label);
      assert.ok(restores >= 5, label);
      assert.ok(actions.length >= 4 && actions.every(action => action.cost > 0 && action.gold >= 0), label);
      assert.ok(actions[0].time >= startDelay - 1e-7, label);
      assert.ok(actions.every((action, i) => i === 0 || action.time - actions[i - 1].time >= 4.99), label);
      assert.deepEqual(Game.restore(game.serialize()).serialize(), game.serialize());
    }
  }
});

test('earned stars are optional and legal non-Rootwarden, no-mine and focused attacks remain wins', () => {
  const first = run(ONBOARDING_MISSIONS[0], { policy: onboardingReferencePolicy('roadside-watch', { ranged: false }) });
  assert.equal(first.outcome.completed, true);
  assert.equal(first.outcome.stars, 2);
  assert.equal(first.outcome.medals.find(medal => medal.id === 'ranged-support').earned, false);

  const fork = run(ONBOARDING_MISSIONS[1], { policy: onboardingReferencePolicy('shield-at-the-fork', { wardens: false }) });
  assert.equal(fork.outcome.completed, true);
  assert.equal(fork.outcome.stars, 2);
  assert.equal(fork.outcome.medals.find(medal => medal.id === 'warden-company').earned, false);
  assert.equal(fork.game.state.buildings.some(building => building.side === 0 && building.type === 'wardenLodge'), false);

  const third = ONBOARDING_MISSIONS[2];
  const combined = run(third, { policy: productionPolicy(['barracks', 'archery', 'foundry'], [0, 1, 2]) });
  assert.equal(combined.outcome.completed, true, 'a non-Rootwarden army can answer all three roads');
  assert.equal(combined.outcome.stars, 2, 'no mine means no income star');
  const noMine = run(third, { policy: onboardingReferencePolicy(third.id, { mine: false }) });
  assert.equal(noMine.outcome.completed, true);
  assert.equal(noMine.outcome.medals.find(medal => medal.id === 'supplied-company').earned, false);

  const concentrated = run(third, { policy: productionPolicy(['wardenLodge', 'archery', 'foundry'], [1]) });
  assert.equal(concentrated.outcome.completed, true);
  assert.equal(concentrated.outcome.stars, 1);
  assert.equal(concentrated.game.state.bases[1].hp, 0);
  assert.ok(getCampaignTargets(concentrated.game, third.id).some(target => target.building), 'citadel victory is a real alternative to clearing every road');
  assert.ok(concentrated.game.state.bases[0].hp < 5000, 'leaving roads unattended costs health rather than being forbidden');
});

test('the fork produces actual Rootwarden screening and archer fire, while unsupported archers lose', () => {
  const mission = byId('shield-at-the-fork');
  const evidence = { hitsOnWardens: 0, screenedArcherShots: 0 };
  const observe = game => {
    const fire = game._fire;
    game._fire = function (attacker, target, damage, type) {
      if (attacker.side === 1 && target.side === 0 && target.type === 'rootwarden') evidence.hitsOnWardens++;
      if (attacker.side === 0 && attacker.type === 'archer' && this.state.units.some(unit =>
        unit.side === 0 && unit.type === 'rootwarden' && unit.hp > 0 && unit.lane === attacker.lane &&
        unit.x > attacker.x && unit.x < target.x + 35)) evidence.screenedArcherShots++;
      return fire.call(this, attacker, target, damage, type);
    };
    return game;
  };
  const screened = playCampaign(id => observe(createCampaignMission(id)), evaluateCampaignMission, mission, {
    policy: onboardingReferencePolicy(mission.id), startDelay: 10, actionEvery: 5, maxActionsPerDecision: 1,
    restore: data => observe(Game.restore(data)),
  });
  assert.equal(screened.outcome.completed, true);
  assert.ok(evidence.hitsOnWardens > 20, 'enemy damage lands on the screen');
  assert.ok(evidence.screenedArcherShots > 20, 'archers actually fire from behind the screen');
  const unsupported = run(mission, { policy: productionPolicy(['archery'], [0, 1]) });
  assert.equal(unsupported.outcome.failed, true);
  assert.equal(unsupported.game.state.bases[0].hp, 0);
  const stats = screened.game.units.rootwarden;
  assert.equal(stats.hp, 800);
  assert.equal(stats.damage, 8);
  assert.equal(stats.attackTime, 1.5);
  assert.equal(stats.canAttackAir, false);
});

test('third-lesson air and area fire hurt Rootwardens without banning an expensive tank-only citadel bypass', () => {
  const mission = byId('open-three-roads');
  const evidence = { airHits: 0, wizardHits: 0, splashHits: 0, tankAirAttacks: 0 };
  const observe = game => {
    const damage = game._damage;
    game._damage = function (target, amount, side) {
      if (side === 1 && target.side === 0 && target.type === 'rootwarden' && Math.abs(amount - this.units.wizard.damage * .65) < 1e-8) evidence.splashHits++;
      return damage.call(this, target, amount, side);
    };
    const fire = game._fire;
    game._fire = function (attacker, target, damage, type) {
      if (attacker.side === 1 && target.side === 0 && target.type === 'rootwarden') {
        if (attacker.type === 'gryphon') evidence.airHits++;
        if (attacker.type === 'wizard') evidence.wizardHits++;
      }
      if (attacker.side === 0 && attacker.type === 'rootwarden' && this.units[target.type]?.flying) evidence.tankAirAttacks++;
      return fire.call(this, attacker, target, damage, type);
    };
    return game;
  };
  const tanks = playCampaign(id => observe(createCampaignMission(id)), evaluateCampaignMission, mission, {
    policy: productionPolicy(['wardenLodge'], [0, 1, 2]), startDelay: 10, actionEvery: 5, maxActionsPerDecision: 1,
  });
  const mixed = run(mission);
  assert.ok(evidence.airHits > 20);
  assert.ok(evidence.wizardHits > 20);
  assert.ok(evidence.splashHits > 0, 'a durable front unit does not block wizard area damage from reaching nearby troops');
  assert.equal(evidence.tankAirAttacks, 0);
  assert.equal(tanks.outcome.completed, true, 'do not manufacture a mandatory composition or disallow a legal alternative');
  assert.equal(tanks.game.state.bases[1].hp, 0);
  assert.ok(getCampaignTargets(tanks.game, mission.id).some(target => target.type === 'aerie' && target.building));
  assert.ok(tanks.game.state.time > mixed.game.state.time + 30);
  assert.ok(tanks.game.state.stats.kills[1] > mixed.game.state.stats.kills[1]);
});

test('idling, economy-only play and building solely to hold ground do not automatically finish lessons', () => {
  for (const mission of ONBOARDING_MISSIONS) {
    const policies = mission.id === 'roadside-watch'
      ? [() => {}, productionPolicy(['archery'], [0])]
      : [() => {}, onboardingMinesOnlyPolicy, productionPolicy(['watchtower'], mission.id === 'shield-at-the-fork' ? [0, 1] : [0, 1, 2])];
    for (const policy of policies) {
      const result = run(mission, { policy, restore: data => {
        const game = Game.restore(data);
        assert.deepEqual(game.serialize(), data);
        return game;
      } });
      assert.equal(result.outcome.completed, false, mission.id);
      assert.equal(result.outcome.failed, true, mission.id);
      assert.equal(result.outcome.stars, 0, mission.id);
    }
  }
});

test('paid wins advance two to five to eight, every in-progress save restores exactly, and replay retains earned tools', () => {
  let progress = createCampaignProgress();
  for (const [index, mission] of ONBOARDING_MISSIONS.entries()) {
    assert.equal(getCampaignRoster(progress).buildings.length, [2, 5, 8][index]);
    assert.equal(isMissionUnlocked(progress, mission.id), true);
    let restores = 0;
    const { game, outcome } = playCampaign(id => createProgressionCampaignMission(id, progress), evaluateCampaignMission, mission, {
      policy: onboardingReferencePolicy(mission.id), startDelay: 10, actionEvery: 5, maxActionsPerDecision: 1,
      restore: data => {
        const current = Game.restore(data);
        const envelope = encodeBattle(current, { kind: 'campaign', id: mission.id, revision: 1 }, { campaignProgress: progress });
        const restored = decodeBattle(envelope, { campaignProgress: progress }).game;
        assert.deepEqual(restored.serialize(), data);
        assert.deepEqual(getCampaignTargets(restored, mission.id), getCampaignTargets(current, mission.id));
        restores++;
        return restored;
      },
    });
    assert.equal(outcome.completed, true);
    assert.ok(restores >= 5);
    progress = recordCampaignResult(progress, mission.id, game);
    assert.equal(progress.missions[mission.id].stars, 3);
    assert.deepEqual(normalizeCampaignProgress(progress), progress);
  }
  assert.equal(isMissionUnlocked(progress, 'emberwatch', 2), true);
  assert.equal(Object.keys(createProgressionCampaignMission('emberwatch', progress).buildings).length, 8);
  const replay = createProgressionCampaignMission('roadside-watch', progress);
  assert.equal(Object.keys(replay.buildings).length, 8);
  assert.equal(replay.build('wardenLodge', 970, replay.map.lanes[0]).ok, true);
  assert.equal(decodeBattle(encodeBattle(replay, { kind: 'campaign', id: 'roadside-watch', revision: 1 }, { campaignProgress: progress }), { campaignProgress: progress }).game.ruleset.id, 'frontier-campaign-open');
});

test('one- and two-star wins advance the same route, and replay never lowers previous records', () => {
  let progress = createCampaignProgress();
  const variants = [
    () => onboardingReferencePolicy('roadside-watch', { ranged: false }),
    () => productionPolicy(['barracks', 'archery'], [0]),
    () => productionPolicy(['wardenLodge', 'archery', 'foundry'], [1]),
  ];
  for (const [index, mission] of ONBOARDING_MISSIONS.entries()) {
    const { game, outcome } = run(mission, { policy: variants[index]() });
    assert.equal(outcome.completed, true, `${mission.id}: ${outcome.label}`);
    assert.ok(outcome.stars < 3);
    const before = structuredClone(progress);
    progress = recordCampaignResult(progress, mission.id, game);
    assert.ok(progress.missions[mission.id]);
    assert.equal(Object.keys(progress.missions).length, Object.keys(before.missions).length + 1);
    if (index < 2) assert.equal(isMissionUnlocked(progress, ONBOARDING_MISSIONS[index + 1].id), true);
  }
  assert.equal(isMissionUnlocked(progress, 'emberwatch', 2), true);
  const third = ONBOARDING_MISSIONS[2], mastery = run(third);
  progress = recordCampaignResult(progress, third.id, mastery.game);
  const worse = run(third, { policy: variants[2]() });
  const replayed = recordCampaignResult(progress, third.id, worse.game);
  assert.equal(replayed.missions[third.id].stars, 3);
  assert.equal(replayed.missions[third.id].bestTime, Math.min(progress.missions[third.id].bestTime, worse.game.state.time));
});
