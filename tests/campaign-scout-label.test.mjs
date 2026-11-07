import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {
  ALL_CAMPAIGN_MISSIONS, ONBOARDING_MISSIONS,
  PROGRESSION_CAMPAIGN_MISSIONS, FLIGHT_CAMPAIGN_MISSIONS,
  createCampaignMission, campaignScenarioForGame, getCampaignMission,
} from '../dist/campaign.js';
import {Game, getMap} from '../dist/engine.js';

// Execute the production assignment, not a duplicate formatting helper.
const app = readFileSync(new URL('../dist/app.js', import.meta.url), 'utf8');
const assignment = app.match(/^  \$\('campaignScoutToggle'\)\.textContent = .*;$/m)?.[0];
assert.ok(assignment, 'production scout label assignment must exist');
const toggle = {textContent: ''};
function label(mission) {
  runInNewContext(assignment, {$: id => {
    assert.equal(id, 'campaignScoutToggle');
    return toggle;
  }, mission, getMap});
  return toggle.textContent;
}

test('Roadside Watch scout expander names the selected mission, not its historical map', () => {
  const mission = ONBOARDING_MISSIONS.find(m => m.id === 'roadside-watch');
  assert.equal(getMap(mission.mapId).name, 'First Watch');
  assert.equal(label(mission), 'Scout battlefield · Roadside Watch');
});

test('repeated selection labels every current and legacy mission without changing authored data', () => {
  const missions = [...ALL_CAMPAIGN_MISSIONS, ...ONBOARDING_MISSIONS,
    ...PROGRESSION_CAMPAIGN_MISSIONS, ...FLIGHT_CAMPAIGN_MISSIONS];
  for (const mission of [...missions, ...missions.toReversed()]) {
    const before = JSON.stringify(mission);
    assert.equal(label(mission), `Scout battlefield · ${mission.name}`, mission.id);
    assert.equal(JSON.stringify(mission), before);
  }
});

test('restored historical attempts retain their own mission name in the scout label', () => {
  for (const original of [...ALL_CAMPAIGN_MISSIONS, ...PROGRESSION_CAMPAIGN_MISSIONS]) {
    const saved = createCampaignMission(original.id, {revision: original.scenarioRevision || 1}).serialize();
    const restored = Game.restore(saved);
    const scenario = campaignScenarioForGame(restored, original.id);
    const mission = getCampaignMission(scenario.id, scenario.revision);
    assert.equal(label(mission), `Scout battlefield · ${original.name}`, original.id);
    assert.deepEqual(restored.serialize(), saved);
  }
});
