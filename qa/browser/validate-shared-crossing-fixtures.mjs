// Node-only fixture/codec checks. This never starts a browser or a server.
import assert from 'node:assert/strict';
import { Game } from '../../dist/engine.js';
import { createCampaignProgress, getProgressionCampaignOverview, evaluateCampaignMission, recordCampaignResult } from '../../dist/campaign.js';
import { decodeBattle, encodeBattle, scenarioForBattle } from '../../dist/battle-codec.js';
import { campaignControlStatus, bridgeIncome } from '../../dist/bridge-control.js';
import { createBackup, parseBackup } from '../../dist/backup.js';
import { advanceObjectiveBattle } from '../../dist/objectives.js';
import { CURRENT_PROFILE_PROTOCOL_VERSION } from '../../dist/profile-session.js';
import { ID, MISSION, priorProfile, sharedCrossingFixtures } from './shared-crossing-fixtures.mjs';

assert.equal(CURRENT_PROFILE_PROTOCOL_VERSION, 15);
const overview = getProgressionCampaignOverview(createCampaignProgress());
assert.equal(overview.total, 22); assert.equal(overview.maxStars, 66); assert.equal(overview.chapters.length, 7);
assert.equal(overview.missions.at(-3).id, ID);
assert.equal(overview.missions.at(-2).id, 'one-signal-is-enough');
assert.equal(overview.missions.at(-1).id, 'lanterns-on-the-water');
assert.equal(overview.chapters.at(-1).total, 3);
const fixtures = sharedCrossingFixtures();
assert.deepEqual(sharedCrossingFixtures({ rebuild: true }), fixtures, 'independent paid simulations are deterministic');
for (const [kind, fixture] of Object.entries(fixtures)) {
  const { envelope, progress, ledger } = fixture, game = decodeBattle(envelope, { campaignProgress: progress }).game;
  assert.deepEqual(envelope.scenario, { kind: 'campaign', id: ID, revision: 1 });
  assert.equal(game.ruleset.id, 'frontier-campaign-shared-crossing');
  assert.equal(game.map.id, 'classic'); assert.equal(game.state.winner, null);
  assert.equal(Object.hasOwn(game.state, 'bridgeControl'), false);
  assert.deepEqual(bridgeIncome(game), [0, 0]);
  assert.equal(evaluateCampaignMission(game, ID).completed, false);
  assert.ok(Math.abs(game.state.gold[0] - (ledger.startingGold + ledger.income + 2 * game.state.stats.kills[0] - ledger.spent)) < 1e-6);
  assert.ok(ledger.actions.length > 0 && ledger.actions.every(action => action.cost > 0));
  const values = priorProfile(envelope, progress), backup = parseBackup(createBackup({ getItem: key => values[key] ?? null }));
  assert.deepEqual(backup.data.battle, envelope); assert.deepEqual(backup.data.campaign, progress);
  const before = game.serialize();
  for (let i = 0; i < 10; i++) { campaignControlStatus(game); evaluateCampaignMission(game, ID); game.serialize(); }
  assert.deepEqual(game.serialize(), before, 'status/evaluation/save inspection never advances capture or control');
  const copy = Game.restore(before), steps = kind === 'terminal' ? 1 : 20;
  let result;
  for (let tick = 0; tick < steps; tick++) {
    result = advanceObjectiveBattle(game, .05, active => evaluateCampaignMission(active, ID), MISSION.timeLimit);
    assert.deepEqual(advanceObjectiveBattle(copy, .05, active => evaluateCampaignMission(active, ID), MISSION.timeLimit), result);
    assert.deepEqual(game.serialize(), copy.serialize());
  }
  assert.equal(result.completed, kind === 'terminal');
  if (kind === 'terminal') {
    assert.deepEqual(game.serialize(), fixture.finalGame); assert.deepEqual(result, fixture.outcome);
    assert.equal(campaignControlStatus(game).seconds, 60);
    assert.throws(() => encodeBattle(game, scenarioForBattle(null, ID, game), { campaignProgress: progress }));
    const earned = recordCampaignResult(progress, ID, game);
    for (const [id, record] of Object.entries(progress.missions)) assert.deepEqual(earned.missions[id], record);
    assert.equal(earned.missions[ID].stars, result.stars); assert.equal(earned.missions[ID].bestTime, game.state.time);
    const continued = getProgressionCampaignOverview(earned);
    assert.equal(continued.completed, false); assert.equal(continued.nextMissionId, 'one-signal-is-enough');
    assert.equal(continued.cleared, 20); assert.equal(earned.missions['one-signal-is-enough'], undefined);
    assert.equal(continued.missions.find(mission => mission.id === 'one-signal-is-enough').unlocked, true);
  } else {
    assert.ok(campaignControlStatus(Game.restore(envelope.game)).seconds >= 12);
    assert.ok(campaignControlStatus(Game.restore(envelope.game)).seconds < 60);
    assert.equal(campaignControlStatus(Game.restore(envelope.game)).count, 2);
  }
  console.log(`${kind}: paid ${envelope.game.state.time.toFixed(2)}s checkpoint, ${envelope.game.state.campaignControl.heldSeconds.toFixed(2)}s control, ${ledger.spent} gold spent; codec, backup and exact continuation passed.`);
}
console.log('Shared Crossing fixture validation passed. Browser spec has not been executed by this check.');
