import { prepareBuildControl, openBuildControls } from './shared-build-controls.mjs';
import { test as base, expect } from '@playwright/test';
import { campaignReplayFixture } from './onboarding-fixtures.mjs';
import { Game } from '../../dist/engine.js';
import { createCampaignMission, createCampaignProgress } from '../../dist/campaign.js';

const SAVE = 'ironroot.battle.v1', PROGRESS = 'ironroot.campaign.v1';
const test = base.extend({ page: async ({ page }, use) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await use(page);
  expect(errors, 'uncaught browser errors').toEqual([]);
} });
async function startRunning(page) {
  await press(page, '#start');
  if (await page.locator('#coachingModal').isVisible()) await press(page, '#coachingPlay');
}
async function press(page, selector) {
  if (await prepareBuildControl(page, selector)) return;
  const control = page.locator(selector);
  if (await page.evaluate(() => navigator.maxTouchPoints > 0)) await control.tap();
  else await control.click();
}
async function readSave(page) {
  return page.evaluate(key => JSON.parse(localStorage.getItem(key)), SAVE);
}
async function seed(page, envelope, progress = createCampaignProgress()) {
  await page.addInitScript(({ envelope, progress, SAVE, PROGRESS }) => {
    localStorage.setItem(SAVE, JSON.stringify(envelope));
    localStorage.setItem(PROGRESS, JSON.stringify(progress));
  }, { envelope, progress, SAVE, PROGRESS });
  await page.goto('/');
  await press(page, '#resumeSaved');
}
async function placeAt(page, x, y) {
  await press(page, '#home');
  const rect = await page.locator('#battle').boundingBox();
  const scale = Math.max(.32, rect.height / 900), half = rect.width / (2 * scale);
  const camera = half >= 1600 ? 1600 : Math.max(half, 450);
  const px = rect.x + rect.width / 2 + (x - camera) * scale;
  const py = rect.y + rect.height / 2 + (y - 450) * scale;
  if (await page.evaluate(() => navigator.maxTouchPoints > 0)) await page.touchscreen.tap(px, py);
  else await page.mouse.click(px, py);
}

test('campaign is the entry screen and skirmish is an explicit optional route', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#campaignConfig')).toBeVisible();
  await expect(page.locator('[data-mode="campaign"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#campaignMissionTitle')).toHaveText('Roadside Watch');
  await expect(page.locator('#skirmishConfig')).toBeHidden();
  await press(page, '[data-mode="skirmish"]');
  await expect(page.locator('#skirmishConfig')).toBeVisible();
  await startRunning(page);
  await expect(page.locator('#matchType')).toHaveText('SOLO SKIRMISH');
  await openBuildControls(page);
  await expect(page.locator('.build-card:visible')).toHaveCount(8);
  await expect(page.locator('#campaignCoach')).toBeHidden();
  expect(await readSave(page)).toMatchObject({version:3,scenario:{kind:'skirmish',id:'standard',revision:1},game:{rulesetId:'frontier-flight-open'}});
});

test('opening guidance uses real build cards, normal gold costs, and real battlefield construction', async ({ page }) => {
  await page.goto('/');
  await startRunning(page);
  await openBuildControls(page);
  await expect(page.locator('.build-card:visible')).toHaveCount(2);
  await expect(page.locator('[data-type="barracks"]')).toHaveClass(/coach-highlight/);
  await expect(page.locator('#coachTitle')).toHaveText('Build a barracks');
  await press(page, '[data-type="barracks"]');
  await placeAt(page, 550, 450);
  await expect(page.locator('#battle')).not.toHaveClass(/placing/); // Successful placement finishes the order.
  await openBuildControls(page);
  await expect(page.locator('#coachTitle')).toHaveText('Add archers');
  await press(page, '[data-type="archery"]');
  await expect(page.locator('#coachText')).toContainText('gold ring');
  await placeAt(page, 410, 450);
  await expect(page.locator('#coachTitle')).toHaveText('Follow your army');
  await expect(page.locator('#front')).toHaveClass(/coach-highlight/);
  await press(page, '#pause');
  const saved = await readSave(page);
  expect(saved).toMatchObject({ version: 3, scenario: {kind:'campaign',id:'roadside-watch',revision:1}, game:{rulesetId:'frontier-campaign-watch',mapId:'intro-one-road'} });
  expect(saved.game.state.buildings.filter(b => b.side === 0 && b.type === 'archery')).toHaveLength(1);
  expect(saved.game.state.buildings.filter(b => b.side === 0)).toHaveLength(2);
  expect(saved.game.state.gold[0]).toBeCloseTo(420 - 140 - 175 + 5 * saved.game.state.time, 1);
  Game.restore(saved.game);
});

test('legacy introductory All buildings and hint controls remain reversible without changing its seven-building rules', async ({ page }) => {
  // Explicit revision-one saved lesson reveals the retained legacy chapter.
  const game = createCampaignMission('first-watch');
  await seed(page, { format: 'ironroot-save', version: 3, scenario: { kind: 'campaign', id: 'first-watch', revision: 1 }, game: game.serialize() });
  await press(page, '#pause'); await press(page, '#saveExit'); await startRunning(page);
  await press(page, '#allBuildings');
  await openBuildControls(page);
  await expect(page.locator('.build-card:visible')).toHaveCount(7);
  await press(page, '[data-type="foundry"]');
  await expect(page.locator('#buildPrompt')).toContainText('PLACE SIEGE FOUNDRY');
  await press(page, '#allBuildings');
  await openBuildControls(page);
  await expect(page.locator('.build-card:visible')).toHaveCount(2);
  await expect(page.locator('#buildPrompt')).toHaveText('BUILD YOUR FRONTIER');
  await page.keyboard.press('Digit3');
  await expect(page.locator('#buildPrompt')).toHaveText('BUILD YOUR FRONTIER');
  await expect(page.locator('#toast')).toContainText('All buildings');
  await press(page, '#toggleCoach');
  await expect(page.locator('#campaignCoach')).toBeHidden();
  await expect(page.locator('.coach-highlight')).toHaveCount(0);
  await press(page, '#toggleCoach');
  await expect(page.locator('#campaignCoach')).toBeVisible();
  await expect(page.locator('#battle')).toBeInViewport({ ratio: 1 });
  expect((await page.locator('#battle').boundingBox()).height).toBeGreaterThan(120);
});

test('an existing campaign save keeps its full roster and construction without migration', async ({ page }) => {
  const game = createCampaignMission('emberwatch');
  expect(game.build('sanctum', 270, 450).ok).toBe(true);
  game.state.time = 30;
  const layout = game.state.buildings.map(b => [b.id, b.type, b.side, b.x, b.y, b.level]);
  await seed(page, { format: 'ironroot-save', version: 2, challengeId: null, campaignId: 'emberwatch', game: game.serialize() });
  await openBuildControls(page);
  await expect(page.locator('.build-card:visible')).toHaveCount(7);
  await expect(page.locator('#allBuildings')).toBeHidden();
  await press(page, '#pause');
  const saved = await readSave(page);
  expect(saved.game.state.buildings.map(b => [b.id, b.type, b.side, b.x, b.y, b.level])).toEqual(layout);
  expect(saved.game.state.time).toBeGreaterThanOrEqual(30);
  Game.restore(saved.game);
});

test('save and exit focuses the saved mission and resumes that same battle', async ({ page }) => {
  await page.goto('/'); await startRunning(page); await press(page, '#pause');
  await press(page, '#saveExit');
  await expect(page.locator('#campaignConfig')).toBeVisible();
  await expect(page.locator('#resumeSaved')).toBeFocused();
  await press(page, '#resumeSaved');
  await expect(page.locator('#opponentLabel')).toHaveText('ROADSIDE WATCH');
  await openBuildControls(page);
  await expect(page.locator('.build-card:visible')).toHaveCount(2);
  expect((await readSave(page)).game.rulesetId).toBe('frontier-campaign-watch');
});

test('a worse replay attempt keeps the existing best stars and best time', async ({ page }) => {
  const progress = createCampaignProgress();
  progress.missions.emberwatch = { completed: true, stars: 3, bestTime: 10 };
  await seed(page, campaignReplayFixture(1,progress), progress);
  await expect(page.locator('.result-stars')).toHaveText('★☆☆');
  await press(page, '#replayMission');
  await expect(page.locator('#resultModal')).toBeHidden();
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)), PROGRESS)).toEqual(progress);
});

for (const stars of [1, 2, 3]) test(`${stars}-star result offers the correct optional replay and preserves records`, async ({ page }) => {
  await seed(page, campaignReplayFixture(stars));
  await expect(page.locator('#resultTitle')).toHaveText('MISSION COMPLETE');
  await expect(page.locator('.result-stars')).toHaveText('★'.repeat(stars) + '☆'.repeat(3 - stars));
  await expect(page.locator('#playAgain')).toBeFocused();
  if (stars < 3) {
    await expect(page.locator('#replayMission')).toBeVisible();
    await press(page, '#replayMission');
    await expect(page.locator('#resultModal')).toBeHidden();
    await expect(page.locator('#opponentLabel')).toHaveText('EMBERWATCH');
    await openBuildControls(page);
    await expect(page.locator('.build-card:visible')).toHaveCount(7);
    const saved = await readSave(page);
    expect(saved.campaignId).toBe('emberwatch');
    expect(saved.game.state.time).toBeLessThan(5);
    expect(saved.game.state.buildings.some(b => b.side === 1 && b.type === 'barracks')).toBe(true);
  } else {
    await expect(page.locator('#replayMission')).toBeHidden();
    await press(page, '#playAgain');
    await expect(page.locator('#campaignMissionTitle')).toHaveText('Three Roads');
    await expect(page.locator('#start')).toBeFocused();
  }
  const progress = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), PROGRESS);
  expect(progress.missions.emberwatch.stars).toBe(stars);
});

