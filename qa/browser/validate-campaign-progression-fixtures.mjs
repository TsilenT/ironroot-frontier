import assert from 'node:assert/strict';
import { Game } from '../../dist/engine.js';
import { ONBOARDING_MISSIONS, createProgressionCampaignMission, getCampaignRoster, recordCampaignResult } from '../../dist/campaign.js';
import { decodeBattle, scenarioForBattle } from '../../dist/battle-codec.js';
import { createBackup, parseBackup } from '../../dist/backup.js';
import { progressionFixture, progressionProfile } from './campaign-progression-fixtures.mjs';
let progress = progressionProfile();
for (const mission of ONBOARDING_MISSIONS) {
  for (const terminal of [false, true]) {
    const fixture = progressionFixture(mission.id, { terminal });
    const decoded = decodeBattle(fixture.envelope, { campaignProgress: fixture.progress });
    assert.deepEqual(decoded.game.serialize(), fixture.envelope.game);
    const text = createBackup({ getItem: () => null }, { campaign: fixture.progress, battle: fixture.envelope });
    assert.deepEqual(parseBackup(text).data.battle, fixture.envelope);
    if (terminal) progress = recordCampaignResult(progress, mission.id, Game.restore(fixture.finalGame));
    console.log(`${mission.id}: paid ${terminal ? 'last active tick' : '30-second'} checkpoint at ${fixture.envelope.game.state.time}s, roster ${Object.keys(decoded.game.buildings).length}, next-tick complete=${fixture.outcome.completed}.`);
  }
}
assert.equal(getCampaignRoster(progress).buildings.length, 8);
const main = createProgressionCampaignMission('emberwatch', progress);
assert.deepEqual(scenarioForBattle(null, 'emberwatch', main), { kind: 'campaign', id: 'emberwatch', revision: 5 });
assert.equal(main.ruleset.id, 'frontier-campaign-citadel-open');
assert.equal(main.ruleset.revision, 1);
const lower = progressionFixture('roadside-watch', { terminal: true, ranged: false });
assert.equal(lower.outcome.stars, 2);
const restored = decodeBattle(lower.envelope, { campaignProgress: progressionProfile(2) }).game;
assert.equal(Object.keys(restored.buildings).length, 2);
assert.equal(Object.keys(createProgressionCampaignMission('roadside-watch', progressionProfile(2)).buildings).length, 8);
console.log('Validated paid two-star lower-roster replay boundary, newer-progress restore and revision-five citadel main launch (preexisting current-fixture expectation drift).');
