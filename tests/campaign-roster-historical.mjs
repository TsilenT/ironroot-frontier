/** Historical roster audit setup, deliberately independent of current automatic-air launches.
 * The three opening battles retain earned replay tiers; all sixteen continuation
 * scenarios stay revision 2, matching CAMPAIGN_ROSTER_BALANCE_RESULTS.json.
 */
import {
  ONBOARDING_MISSIONS, isOnboardingMission, getCampaignMission, getCampaignRoster,
  createCampaignMission, isMissionUnlocked,
} from '../dist/campaign.js';
import {CAMPAIGN_RULESET_IDS} from '../dist/rulesets.js';

export function getHistoricalRosterMission(id, progress) {
  return isOnboardingMission(id)
    ? {...getCampaignMission(id, 1), rulesetId: CAMPAIGN_RULESET_IDS[Math.max(ONBOARDING_MISSIONS.findIndex(m => m.id === id), getCampaignRoster(progress).stage - 1)]}
    : getCampaignMission(id, 2);
}

export function createHistoricalRosterMission(id, progress) {
  const mission = getHistoricalRosterMission(id, progress);
  if (!isMissionUnlocked(progress, id, mission.scenarioRevision)) throw new RangeError('This campaign mission is locked.');
  return createCampaignMission(id, {revision: mission.scenarioRevision, progress});
}
