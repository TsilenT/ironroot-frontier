/** Historical roster audit setup, deliberately independent of current flight launches.
 * The three opening battles retain earned replay tiers; all sixteen continuation
 * scenarios stay revision 2, matching CAMPAIGN_ROSTER_BALANCE_RESULTS.json.
 */
import {
  isOnboardingMission, getCampaignMission, getCampaignLaunchMission,
  createCampaignMission, createProgressionCampaignMission, isMissionUnlocked,
} from '../dist/campaign.js';

export function getHistoricalRosterMission(id, progress) {
  return isOnboardingMission(id)
    ? getCampaignLaunchMission(id, progress)
    : getCampaignMission(id, 2);
}

export function createHistoricalRosterMission(id, progress) {
  if (isOnboardingMission(id)) return createProgressionCampaignMission(id, progress);
  const mission = getCampaignMission(id, 2);
  if (!isMissionUnlocked(progress, id, mission.scenarioRevision)) throw new RangeError('This campaign mission is locked.');
  return createCampaignMission(id, {revision: 2, progress});
}
