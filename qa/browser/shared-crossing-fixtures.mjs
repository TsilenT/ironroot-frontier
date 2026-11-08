// Prerequisite records are synthetic. Battle checkpoints are earned using only
// paid engine commands and ordinary ticks, not browser-played victory evidence.
import assert from 'node:assert/strict';
import { Game } from '../../dist/engine.js';
import {
  createCampaignProgress, getProgressionCampaignOverview, getCampaignLaunchMission,
  createProgressionCampaignMission, evaluateCampaignMission,
} from '../../dist/campaign.js';
import { encodeBattle, decodeBattle, scenarioForBattle } from '../../dist/battle-codec.js';
import { campaignControlStatus } from '../../dist/bridge-control.js';
import { BACKUP_STORAGE_KEYS as K } from '../../dist/backup.js';
import { paidPolicy, ROUTES } from '../../tests/shared-crossing-policies.mjs';

export const ID = 'shared-crossing';
export function sharedCrossingProgress() {
  const progress = createCampaignProgress();
  for (const [index, mission] of getProgressionCampaignOverview(progress).missions.entries()) {
    if (mission.id !== ID) progress.missions[mission.id] = { completed: true, stars: 3, bestTime: 60 + index };
  }
  return progress;
}
export const MISSION = getCampaignLaunchMission(ID, sharedCrossingProgress());
export function priorProfile(battle = null, progress = sharedCrossingProgress()) {
  const data = {
    campaign: progress,
    trials: { shieldbreaker: { completed: true, bestTime: 20 } },
    settings: { sound: false, music: false, sfx: true, volume: .25, reducedMotion: true, quality: 'low', skirmishBridgeIncome: true },
    history: [{ won: false, draw: false, challengeId: null, campaignId: null, difficulty: 'easy', time: 60, kills: 0, built: 1, date: '2026-11-06T11:00:00.000Z' }],
  };
  return Object.fromEntries([
    ...Object.entries(data).map(([domain, value]) => [K[domain], JSON.stringify(value)]),
    ...(battle ? [[K.battle, JSON.stringify(battle)]] : []),
  ]);
}

let cached;
export function sharedCrossingFixtures({ rebuild = false } = {}) {
  if (cached && !rebuild) return structuredClone(cached);
  const progress = sharedCrossingProgress(), game = createProgressionCampaignMission(ID, progress);
  const policy = paidPolicy(ROUTES.middleSouth), actions = [];
  const startingGold = game.state.gold[0];
  let spent = 0, income = 0, partial, terminal;
  const checkpoint = () => {
    const envelope = encodeBattle(game, scenarioForBattle(null, ID, game), { campaignProgress: progress });
    assert.deepEqual(decodeBattle(envelope, { campaignProgress: progress }).game.serialize(), game.serialize());
    return { envelope, progress, ledger: { startingGold, spent, income, actions: structuredClone(actions) } };
  };
  for (let tick = 0; tick < MISSION.timeLimit * 20; tick++) {
    if (tick % 40 === 0) {
      const before = game.state.gold[0], action = policy(game);
      if (action?.ok) {
        const cost = before - game.state.gold[0]; assert.ok(cost > 0); spent += cost;
        actions.push({ time: game.state.time, type: action.building?.type ?? 'upgrade', cost });
      } else assert.equal(game.state.gold[0], before);
    }
    const before = game.serialize(), beforeIncome = income;
    game.update(.05); income += game.state.income[0] * (game.state.time - before.state.time);
    assert.ok(Math.abs(game.state.gold[0] - (startingGold + income + 2 * game.state.stats.kills[0] - spent)) < 1e-6,
      'no grants or capture income: paid spending uses starting gold, ordinary income and troop kills');
    assert.equal(Object.hasOwn(game.state, 'bridgeControl'), false);
    const outcome = evaluateCampaignMission(game, ID), status = campaignControlStatus(game);
    assert.equal(outcome.failed, false, 'ordinary paid middle/south route remains viable');
    if (!partial && status.seconds >= 12 && status.count >= 2) partial = checkpoint();
    if (outcome.completed) {
      assert.ok(game.state.bases.every(base => base.hp > 0), 'control win rather than alternate core victory');
      assert.equal(status.seconds, 60);
      const active = Game.restore(before);
      const envelope = encodeBattle(active, scenarioForBattle(null, ID, active), { campaignProgress: progress });
      terminal = { envelope, progress, outcome, finalGame: game.serialize(),
        ledger: { startingGold, spent, income: beforeIncome, actions: structuredClone(actions) } };
      break;
    }
  }
  assert.ok(partial && terminal, 'both active control and last-active-tick checkpoints exist');
  cached = { partial, terminal };
  return structuredClone(cached);
}
