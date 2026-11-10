// Isolated synthetic earned profiles/checkpoints, never live user saves.
// Native pointer/navigation checks; no human difficulty or physical-device claim.
import {expect} from '@playwright/test';
import {test,press,pause,saved,seedOnce} from './map-browser-helpers.mjs';
import * as c from '../../dist/campaign.js';import {encodeBattle} from '../../dist/battle-codec.js';
const ID='three-minutes-more',SAVE='ironroot.battle.v1',PROGRESS='ironroot.campaign.v1';
const progress=()=>({...c.createCampaignProgress(),missions:Object.fromEntries(c.CAMPAIGN_PROGRESS_MISSIONS.filter(m=>m.id!==ID).map(m=>[m.id,{completed:true,stars:1,bestTime:60}]))});
for(const width of [1180,500])test.describe(`Three Minutes More ${width}px mouse window`,()=>{
 test.use({viewport:{width,height:850},isMobile:false,hasTouch:false});
 test('briefing, Scout, countdown, saved Resume and confirmed Restart use actual mission identity',async({page})=>{
  const p=progress();await seedOnce(page,{[PROGRESS]:JSON.stringify(p)});
  await expect(page.locator('#campaignMissionTitle')).toHaveText('Three Minutes More');await expect(page.locator('#campaignGoal')).toContainText('Survive until 3:00');
  await press(page,'#campaignScoutToggle');await expect(page.locator('#campaignScoutReport')).toContainText('Twin Span');await press(page,'#campaignScoutToggle');await press(page,'#start');
  await expect(page.locator('#objectiveTime')).toContainText(/2:5\d|3:00/);const before=await pause(page);expect(before.scenario).toEqual({kind:'campaign',id:ID,revision:1});expect(before.game.rulesetId).toBe('frontier-campaign-three-minutes');
  await page.reload();await press(page,'#resumeSaved');const resumed=await pause(page);expect(resumed.game.state.time).toBeGreaterThanOrEqual(before.game.state.time);
  await press(page,'#restartBattle');await press(page,'#confirmRestart');await expect(page.locator('#campaignMissionTitle')).toHaveText('Three Minutes More');expect(await saved(page)).toBeNull();await press(page,'#start');const fresh=await pause(page);
  expect(fresh.scenario).toEqual(before.scenario);expect(fresh.game.state.buildings.map(b=>[b.type,b.side,b.x,b.y,b.level])).toEqual(c.createCampaignMission(ID).serialize().state.buildings.map(b=>[b.type,b.side,b.x,b.y,b.level]));
 });
 test('synthetic final-frame1HP survival earns primary star and returns to partial campaign',async({page})=>{
  const p=progress(),g=c.createCampaignMission(ID);g.state.time=179.95;g.tick=3599;g.aiTimer=30;g.state.bases[0].hp=1;g.state.buildings=[];g.state.units=[];g.state.projectiles=[];
  const checkpoint=encodeBattle(g,c.campaignScenarioForGame(g,ID),{campaignProgress:p});await seedOnce(page,{[PROGRESS]:JSON.stringify(p),[SAVE]:JSON.stringify(checkpoint)});await press(page,'#resumeSaved');
  await expect(page.locator('#resultTitle')).toHaveText('MISSION COMPLETE');await expect(page.locator('.result-stars')).toHaveText('★☆☆');await expect(page.locator('#playAgain')).toContainText('CAMPAIGN MISSIONS');
  const recorded=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),PROGRESS);expect(recorded.missions[ID].stars).toBe(1);expect(c.getProgressionCampaignOverview(recorded).completed).toBe(false);
  await press(page,'#playAgain');await expect(page.locator('#campaignMissionTitle')).toHaveText('Three Minutes More');await press(page,'#campaignChapterNav');await expect(page.locator('#campaignChapterProgress')).toContainText('4 available of at least 5 planned');
 });
});
