/** Fast setup checks for the optional historical audit, never its full matrix. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  CAMPAIGN_MISSIONS, ONBOARDING_MISSIONS, FLIGHT_CAMPAIGN_MISSION_IDS,
  createCampaignProgress, createCampaignMission, createProgressionCampaignMission,
  getCampaignMission, getCampaignLaunchMission, getCurrentCampaignRevision,
  campaignScenarioForGame,
} from '../dist/campaign.js';
import {encodeBattle, decodeBattle} from '../dist/battle-codec.js';
import {campaignPolicy} from './campaign-policies.mjs';
import {getHistoricalRosterMission, createHistoricalRosterMission} from './campaign-roster-historical.mjs';

// Synthetic unlock fixtures test factory routing only, not campaign attainability.
const record = () => ({completed: true, stars: 1, bestTime: 60});
const fullProgress = () => ({...createCampaignProgress(), missions: Object.fromEntries(
  [...ONBOARDING_MISSIONS, ...CAMPAIGN_MISSIONS].map(m => [m.id, record()]),
)});

test('historical audit retains the exact earned two/five/eight opening rosters and returning replays', () => {
  const progress = createCampaignProgress();
  for (const [index, mission] of ONBOARDING_MISSIONS.entries()) {
    assert.equal(getHistoricalRosterMission(mission.id, progress).scenarioRevision, 1);
    const historical = createHistoricalRosterMission(mission.id, progress);
    assert.deepEqual(historical.serialize(), createCampaignMission(mission.id, {revision: 1, progress}).serialize());
    assert.equal(Object.keys(historical.buildings).length, [2, 5, 8][index]);
    assert.equal(campaignScenarioForGame(historical, mission.id).revision, 1);
    progress.missions[mission.id] = record();
  }
  const returning = fullProgress();
  for (const mission of ONBOARDING_MISSIONS) {
    const historical = createHistoricalRosterMission(mission.id, returning);
    assert.equal(historical.ruleset.id, 'frontier-campaign-open');
    assert.deepEqual(historical.serialize(), createCampaignMission(mission.id, {revision: 1, progress: returning}).serialize());
  }
});

test('all sixteen historical continuation descriptors and factories stay exact revision 2 despite current citadel starts', () => {
  const progress = fullProgress(), before = JSON.stringify(progress);
  for (const mission of CAMPAIGN_MISSIONS) {
    const descriptor = getHistoricalRosterMission(mission.id, progress);
    assert.equal(descriptor, getCampaignMission(mission.id, 2));
    assert.equal(descriptor.scenarioRevision, 2);
    const game = createHistoricalRosterMission(mission.id, progress);
    assert.deepEqual(game.serialize(), createCampaignMission(mission.id, {revision: 2, progress}).serialize());
    assert.equal(campaignScenarioForGame(game, mission.id).revision, 2);
    assert.equal(game.ruleset.id, 'frontier-campaign-open');
    assert.equal(game.ruleset.combat.flyingCrossLanes, false);
    assert.equal(Object.keys(game.buildings).length, 8);
    if (FLIGHT_CAMPAIGN_MISSION_IDS.includes(mission.id)) assert.equal(getCurrentCampaignRevision(mission.id), 5);
  }
  assert.equal(JSON.stringify(progress), before);
});

test('historical factory retains mission locks and rejects unknown/non-continuation identities', () => {
  const progress = createCampaignProgress(), before = JSON.stringify(progress);
  for (const id of ['emberwatch', 'wings-of-ash', 'common-ground']) assert.throws(() => createHistoricalRosterMission(id, progress), /locked/);
  for (const id of ['missing', 'first-watch']) {
    assert.throws(() => getHistoricalRosterMission(id, fullProgress()), /Unknown campaign/);
    assert.throws(() => createHistoricalRosterMission(id, fullProgress()), /Unknown campaign/);
  }
  assert.equal(JSON.stringify(progress), before);
});

test('representative historical paid setups save and continue with exact revision-2 identities on all three maps', () => {
  const progress = fullProgress(), maps = new Set();
  for (const id of ['cold-forge', 'river-charter', 'open-horizon']) {
    const game = createHistoricalRosterMission(id, progress), policy = campaignPolicy(id);
    maps.add(game.map.id);
    for (let tick = 0; tick < 40; tick++) {if (tick % 20 === 0) policy(game);game.update(.05);}
    game.update(.017);
    const scenario = campaignScenarioForGame(game, id);
    const restored = decodeBattle(JSON.stringify(encodeBattle(game, scenario, {campaignProgress: progress})), {campaignProgress: progress});
    assert.equal(restored.scenario.revision, 2);
    assert.equal(restored.identity.ruleset.id, 'frontier-campaign-open');
    assert.deepEqual(restored.game.serialize(), game.serialize());
    for (let tick = 0; tick < 20; tick++) {game.update(.05);restored.game.update(.05);}
    assert.deepEqual(restored.game.serialize(), game.serialize());
  }
  assert.deepEqual([...maps].sort(), ['classic', 'long-march', 'twin-span']);
});

test('optional historical runner uses the pinned helpers rather than unqualified current launchers', () => {
  const source = readFileSync(new URL('./campaign-roster-balance.mjs', import.meta.url), 'utf8');
  assert.match(source, /import \{ createHistoricalRosterMission, getHistoricalRosterMission \} from '\.\/campaign-roster-historical\.mjs'/);
  assert.doesNotMatch(source, /\b(?:createProgressionCampaignMission|getCampaignLaunchMission)\b/);
  assert.match(source, /Current flight campaign review: node tests\/flight-campaign-balance\.mjs/);
});
