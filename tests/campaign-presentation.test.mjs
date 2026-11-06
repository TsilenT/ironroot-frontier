import test from 'node:test';
import assert from 'node:assert/strict';
import {ALL_CAMPAIGN_MISSIONS as missions, createCampaignMission} from '../dist/campaign.js';
import {missionBriefing} from '../dist/campaign-presentation.js';

test('every current mission has a plain goal separate from exact rules without altering its authored state', () => {
  for (const mission of missions) {
    const before = JSON.stringify(mission), game = createCampaignMission(mission.id).serialize();
    const brief = missionBriefing(mission);
    assert.ok(brief.goal.length > 20, mission.id);
    assert.notEqual(brief.goal, mission.objective, mission.id);
    assert.ok(brief.facts.length > 0, mission.id);
    assert.equal(JSON.stringify(mission), before);
    assert.deepEqual(createCampaignMission(mission.id).serialize(), game);
  }
});

test('mandatory protection, hold, income and citadel health stay outside the optional rules', () => {
  for (const mission of missions) {
    const brief = missionBriefing(mission);
    assert.equal(!!brief.protection, mission.objectives.some(o => o.type === 'protect'), mission.id);
    if (brief.protection) {
      assert.match(brief.protection, /even if you destroy the enemy citadel/);
      assert.match(brief.protection, /salvaging.*fails.*replacing it does not count/);
    }
    for (const objective of mission.objectives) {
      if (objective.type === 'income') assert.ok(brief.facts.some(f => f.includes(`${objective.amount} gold/sec at`)), mission.id);
      if (objective.type === 'health') assert.ok(brief.facts.includes(`Keep at least ${objective.amount.toLocaleString('en-US')} citadel HP`), mission.id);
      if (objective.type === 'survive') assert.ok(brief.facts.some(f => f.startsWith('Hold for ')), mission.id);
    }
  }
  const beacon = missionBriefing(missions.find(m => m.id === 'far-beacon'));
  assert.deepEqual(beacon.facts, ['4:40 time limit', 'Hold for 3:10', 'Keep at least 2,000 citadel HP']);
});

test('future missions retain their authored goal until presentation copy is provided', () => {
  assert.equal(missionBriefing({...missions[0], id: 'future-mission', objective: 'A future authored goal.'}).goal, 'A future authored goal.');
});
