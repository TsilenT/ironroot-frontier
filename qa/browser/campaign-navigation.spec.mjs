import { startRunning, finishFirstBuild } from './campaign-teaching-helpers.mjs';
import {test as base, expect} from '@playwright/test';
import {getProgressionCampaignOverview, createCampaignProgress, createCampaignMission} from '../../dist/campaign.js';
import {getRuleset} from '../../dist/engine.js';
import {missionBriefing} from '../../dist/campaign-presentation.js';
import {campaignFixture} from './campaign-fixtures.mjs';
const SAVE = 'ironroot.battle.v1', PROGRESS = 'ironroot.campaign.v1';
const RECORDS_NOTICE = 'Campaign records include stars and best times from earlier mission versions.';
const missions = getProgressionCampaignOverview(createCampaignProgress()).missions;
const test = base.extend({page: async ({page}, use) => {
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await use(page); expect(errors).toEqual([]);
}});
async function press(page, selector) {
  const control = page.locator(selector);
  if (await page.evaluate(() => navigator.maxTouchPoints > 0)) await control.tap();
  else await control.click();
}
async function choose(page, chapter, mission) {
  await press(page, '#campaignStoryNav');
  await press(page, `[data-chapter="${chapter}"]`);
  await press(page, `[data-mission="${mission}"]`);
}
async function seed(page, values) {
  await page.addInitScript(values => {
    if (sessionStorage.getItem('navigation-seeded')) return;
    for (const [key, value] of Object.entries(values)) localStorage.setItem(key, value);
    sessionStorage.setItem('navigation-seeded', 'true');
  }, values);
  await page.goto('/');
}
const profile = page => page.evaluate(keys => keys.map(key => localStorage.getItem(key)), [SAVE, PROGRESS]);

test('a focused briefing leads through story, chapter and mission with keyboard and visible goal', async ({page}) => {
  await page.goto('/');
  await expect(page.locator('#campaignMissionTitle')).toHaveText('Roadside Watch');
  await expect(page.locator('#campaignScoutToggle')).toHaveText('Scout battlefield · Roadside Watch');
  await expect(page.locator('#campaignStoryPage')).toBeHidden();
  await expect(page.locator('#campaignChapterPage')).toBeHidden();
  await expect(page.locator('#campaignMissionDescription')).toContainText('clear the raider camp blocking this road');
  await expect(page.locator('#campaignGoal')).toHaveText(missionBriefing(missions[0]).goal);
  await expect(page.locator('#campaignRules')).toHaveJSProperty('open', false);
  await expect(page.locator('#campaignBriefing')).toBeHidden();
  await page.locator('#campaignStoryNav').focus(); await page.keyboard.press('Enter');
  await expect(page.locator('#campaignStoryTitle')).toBeFocused();
  await expect(page.locator('#start')).toBeHidden();
  await expect(page.locator('#campaignChapters button')).toHaveCount(7);
  await page.locator('[data-chapter="opening-roads"]').focus(); await page.keyboard.press('Space');
  await expect(page.locator('#campaignChapterTitle')).toBeFocused();
  await expect(page.locator('#campaignChapterStory')).toContainText('New buildings join you after each win');
  await expect(page.locator('#campaignMissions button')).toHaveCount(3);
  await page.locator('[data-mission="shield-at-the-fork"]').focus(); await page.keyboard.press('Enter');
  await expect(page.locator('#campaignMissionTitle')).toBeFocused();
  await expect(page.locator('#campaignMissionPosition')).toHaveText('Mission 2 of 3');
  await expect(page.locator('#campaignUnlock')).toContainText('Complete Roadside Watch');
  await expect(page.locator('#start')).toBeDisabled();
  await page.keyboard.press('Enter'); expect(await profile(page)).toEqual([null, null]);
  await press(page, '#campaignPrevious');
  await expect(page.locator('#campaignMissionTitle')).toHaveText('Roadside Watch');
  await expect(page.locator('#start')).toBeEnabled();
  await page.locator('#welcomeSettings').focus(); await page.keyboard.press('Tab');
  await expect(page.locator('[data-mode="campaign"]')).toBeFocused();
  await page.keyboard.press('Shift+Tab'); await expect(page.locator('#welcomeSettings')).toBeFocused();
  await page.locator('#start').focus(); await page.keyboard.press('Enter');
  await finishFirstBuild(page,press);
  if (await page.locator('#coachingModal').isVisible()) await press(page, '#coachingPlay');
  await expect(page.locator('#welcome')).toBeHidden();
  await page.locator('#pause').focus(); await page.keyboard.press('Enter');
  await expect(page.locator('#pauseVeil')).toBeVisible();
  await page.locator('#saveExit').focus(); await page.keyboard.press('Enter');
  await expect(page.locator('#resumeSaved')).toBeFocused();
  await page.keyboard.press('Enter'); await expect(page.locator('#welcome')).toBeHidden();
});

test('quick mission navigation crosses chapters and closes optional details for a new briefing', async ({page}) => {
  await page.goto('/');
  await page.locator('#campaignRules summary').focus(); await page.keyboard.press('Enter');
  await expect(page.locator('#campaignRules')).toHaveJSProperty('open', true);
  await expect(page.locator('#campaignObjective')).toHaveText(missions[0].objective);
  await press(page, '#campaignNext');
  await expect(page.locator('#campaignMissionTitle')).toHaveText('Shield at the Fork');
  await expect(page.locator('#campaignRules')).toHaveJSProperty('open', false);
  await expect(page.locator('#campaignMissionTitle')).toBeFocused();
  await press(page, '#campaignNext');
  await expect(page.locator('#campaignMissionTitle')).toHaveText('Open Three Roads');
  await press(page, '#campaignNext');
  await expect(page.locator('#campaignChapterNav')).toContainText('Chapter 1');
  await expect(page.locator('#campaignMissionTitle')).toHaveText('Emberwatch');
  await press(page, '#campaignChapterNav');
  await expect(page.locator('[data-mission="emberwatch"]')).toHaveAttribute('aria-pressed', 'true');
  await press(page, '[data-mission="emberwatch"]');
  await expect(page.locator('#campaignConfig')).toHaveJSProperty('scrollTop', 0);
});

test('all current briefings retain authored rules and prominent mandatory objectives', async ({page}) => {
  test.setTimeout(60000); await page.goto('/');
  for (const mission of missions) {
    await expect(page.locator('#campaignMissionTitle')).toHaveText(mission.name);
    await expect(page.locator('#campaignScoutToggle')).toHaveText(`Scout battlefield · ${mission.name}`);
    const brief = missionBriefing(mission);
    await expect(page.locator('#campaignGoal')).toHaveText(brief.goal);
    await expect(page.locator('#campaignGoalFacts li')).toHaveText(brief.facts);
    if (brief.protection) await expect(page.locator('#campaignProtection')).toHaveText(brief.protection);
    else await expect(page.locator('#campaignProtection')).toBeHidden();
    await press(page, '#campaignRules summary');
    await expect(page.locator('#campaignObjective')).toHaveText(mission.objective);
    const roster = getRuleset(mission.rulesetId, mission.rulesetRevision);
    const rosterLine = 'Available here: ' + Object.values(roster.buildings).map(b => b.name).join(', ') + '.';
    const recordNote = mission.scenarioRevision >= 3 ? [RECORDS_NOTICE] : [];
    await expect(page.locator('#campaignBriefing li')).toHaveText([rosterLine, ...mission.briefing, ...recordNote]);
    await expect(page.locator('#campaignBriefing').getByText(RECORDS_NOTICE, {exact:true})).toHaveCount(mission.scenarioRevision >= 3 ? 1 : 0);
    if (mission !== missions.at(-1)) await press(page, '#campaignNext');
  }
  await expect(page.locator('#campaignNext')).toBeDisabled();
  expect(await profile(page)).toEqual([null, null]);
});

test('browsing and replay selection preserve existing progress bytes', async ({page}) => {
  const progress = createCampaignProgress();
  for (const mission of missions) progress.missions[mission.id] = {completed:true, stars:3, bestTime:10};
  const bytes = JSON.stringify(progress);
  await seed(page, {[PROGRESS]:bytes});
  await choose(page, 'frontier', 'common-ground');
  await expect(page.locator('#start')).toContainText('REPLAY MISSION');
  await expect(page.locator('#campaignMissionStatus')).toHaveText('★★★ · Complete');
  await press(page, '#campaignStoryNav');
  await press(page, '.campaign-progress summary');
  await expect(page.locator('#campaignProgressText')).toHaveText('23/23 missions · 69/69 stars');
  await expect(page.locator('#campaignIntroProgressText')).toContainText('8/8 buildings');
  await press(page, '#campaignReturnMission');
  expect(await profile(page)).toEqual([null, bytes]);
  await startRunning(page, press); await press(page, '#pause');
  expect((JSON.parse((await profile(page))[0])).scenario).toEqual({kind:'campaign',id:'common-ground',revision:4});
  expect(JSON.parse((await profile(page))[0]).game.rulesetId).toBe('frontier-campaign-air-local');
  expect((await profile(page))[1]).toBe(bytes);
});

test('saved battle survives browsing, reload and resume with its original formation', async ({page}) => {
  const game = createCampaignMission('emberwatch');
  game.build('sanctum', 270, 450); game.state.time = 30;
  const envelope = {format:'ironroot-save',version:2,challengeId:null,campaignId:'emberwatch',game:game.serialize()};
  const bytes = JSON.stringify(envelope);
  await seed(page, {[SAVE]:bytes});
  await choose(page, 'frontier', 'common-ground');
  expect((await profile(page))[0]).toBe(bytes);
  await page.reload(); await press(page, '#resumeSaved');
  await expect(page.locator('#opponentLabel')).toHaveText('EMBERWATCH');
  await press(page, '#pause'); await press(page, '#saveExit');
  await expect(page.locator('#resumeSaved')).toBeFocused();
  await expect(page.locator('#campaignMissionTitle')).toHaveText('Emberwatch');
  await press(page, '#campaignStoryNav'); await press(page, '#resumeSaved'); await press(page, '#pause');
  const saved = JSON.parse((await profile(page))[0]);
  expect(saved.campaignId).toBe('emberwatch');
  expect(saved.game.state.buildings.map(b => [b.id,b.type,b.side,b.x,b.y,b.level]))
    .toEqual(envelope.game.state.buildings.map(b => [b.id,b.type,b.side,b.x,b.y,b.level]));
  expect(saved.game.state.time).toBeGreaterThanOrEqual(30);
});

test('Continue from victory opens the next briefing directly and preserves earned stars', async ({page}) => {
  const fixture = campaignFixture('victory');
  await seed(page, {[SAVE]:JSON.stringify(fixture.envelope),[PROGRESS]:JSON.stringify(fixture.progress)});
  await press(page, '#resumeSaved');
  await expect(page.locator('#resultTitle')).toHaveText('MISSION COMPLETE');
  await press(page, '#playAgain');
  await expect(page.locator('#campaignMissionTitle')).toHaveText('Three Roads');
  await expect(page.locator('#campaignMissionPage')).toBeVisible();
  await expect(page.locator('#start')).toBeFocused();
  const progress = JSON.parse((await profile(page))[1]);
  expect(progress.missions.emberwatch).toMatchObject({completed:true,stars:3});
  await startRunning(page, press); await press(page, '#pause');
  expect(JSON.parse((await profile(page))[0]).scenario).toEqual({kind:'campaign',id:'three-roads',revision:4});
});

test('briefing and launch remain usable on narrow phones, landscape and desktop with a saved battle', async ({page}, testInfo) => {
  await page.goto('/'); await startRunning(page, press); await press(page, '#pause'); await press(page, '#saveExit');
  for (const viewport of [{width:320,height:568},{width:844,height:390},{width:1180,height:757}]) {
    await page.setViewportSize(viewport);
    await page.locator('#campaignGoal').scrollIntoViewIfNeeded();
    const geometry = await page.locator('#campaignConfig').evaluate(el => {
      const r = el.getBoundingClientRect();
      return {height:Math.min(el.clientHeight, Math.min(r.bottom,innerHeight)-Math.max(r.top,0)), overflow:document.documentElement.scrollWidth > innerWidth};
    });
    expect(geometry.height).toBeGreaterThan(120); expect(geometry.overflow).toBe(false);
    await expect(page.locator('#start')).toBeInViewport({ratio:1});
    await expect(page.locator('#resumeSaved')).toBeInViewport({ratio:1});
    await press(page, '#campaignRules summary');
    await expect(page.locator('#campaignObjective')).toBeVisible();
    await page.screenshot({path:testInfo.outputPath(`briefing-${viewport.width}.png`)});
    await press(page, '#campaignRules summary');
  }
  await page.locator('#campaignRules summary').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#campaignRules summary')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.locator('#campaignScoutToggle')).toBeFocused();
  await startRunning(page, press); await expect(page.locator('#welcome')).toBeHidden();
});
