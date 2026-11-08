import { startRunning } from './campaign-teaching-helpers.mjs';
import { expect } from '@playwright/test';
import { Game } from '../../dist/engine.js';
import { ONBOARDING_MISSIONS, createCampaignProgress } from '../../dist/campaign.js';
import { decodeBattle } from '../../dist/battle-codec.js';
import { parseBackup, BACKUP_STORAGE_KEYS as K } from '../../dist/backup.js';
import { test, press, pause, saved, seedOnce, homePoint, tapPoint, openBackup, downloadBackup, chooseBackup } from './map-browser-helpers.mjs';
import { openBuildControls } from './shared-build-controls.mjs';
import { progressionFixture, progressionProfile } from './campaign-progression-fixtures.mjs';

const cardTypes = page => page.locator('.build-card:visible').evaluateAll(cards => cards.map(card => card.dataset.type));
const readProgress = page => page.evaluate(key => JSON.parse(localStorage.getItem(key)), K.campaign);
async function seedCheckpoint(page, fixture, progress = fixture.progress) {
  await seedOnce(page, { [K.battle]: JSON.stringify(fixture.envelope), [K.campaign]: JSON.stringify(progress) });
}

// These browser tests use normal native controls. Paid-run terminal fixtures are
// declared transition checkpoints, not claims of a full browser-played strategy.
test('fresh campaign exposes two real buildings, a matching guide and no All-buildings bypass', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#campaignMissionTitle')).toHaveText('Roadside Watch');
  await expect(page.locator('#campaignProgressText')).toHaveText('0/20 missions · 0/60 stars');
  await expect(page.locator('#campaignIntroProgressText')).toContainText('2/8 buildings');
  await expect(page.locator('[data-chapter="first-roads"]')).toHaveCount(0);
  await press(page, '#campaignChapterNav'); await press(page, '[data-mission="shield-at-the-fork"]');
  await expect(page.locator('#start')).toBeDisabled();
  await expect(page.locator('#campaignUnlock')).toContainText('Complete Roadside Watch');
  await press(page, '#campaignChapterNav'); await press(page, '[data-mission="roadside-watch"]'); await startRunning(page, press);
  await openBuildControls(page); expect(await cardTypes(page)).toEqual(['barracks', 'archery']);
  await expect(page.locator('#allBuildings')).toBeHidden();
  await page.keyboard.press('Digit3'); await expect(page.locator('#buildPrompt')).toHaveText('BUILD YOUR FRONTIER');
  await expect(page.locator('[data-type="wardenLodge"]')).toHaveCount(0);
  const state = await pause(page);
  expect(state).toMatchObject({ version: 3, scenario: { kind: 'campaign', id: 'roadside-watch', revision: 1 }, game: { rulesetId: 'frontier-campaign-watch' } });
  await press(page, '#help'); await press(page, '#rosterGuideToggle');
  expect(await page.locator('[data-codex-unit]').evaluateAll(nodes => nodes.map(node => node.dataset.codexUnit))).toEqual(['warrior', 'archer']);
  await expect(page.locator('[data-codex-structure]')).toHaveCount(0);
});

test('paid checkpoints earn 2 → 5 → 8 in one persistent profile, then Continue starts eight-building Emberwatch with automatic flyers', async ({ page }) => {
  test.setTimeout(45000);
  await seedCheckpoint(page, progressionFixture('roadside-watch', { terminal: true }));
  for (const [index, mission] of ONBOARDING_MISSIONS.entries()) {
    if (index) {
      const fixture = progressionFixture(mission.id, { terminal: true });
      // Only replace the active battle with a validated paid checkpoint. Keep
      // the progress earned by the previous browser result completely intact.
      await page.evaluate(({ key, text }) => localStorage.setItem(key, text), { key: K.battle, text: JSON.stringify(fixture.envelope) });
      await page.reload();
    }
    await press(page, '#resumeSaved');
    await expect(page.locator('#resultTitle')).toHaveText('MISSION COMPLETE');
    await expect(page.locator('.campaign-earned')).toHaveCount(index < 2 ? 1 : 0);
    if (index === 0) await expect(page.locator('.campaign-earned')).toContainText('Warden lodge');
    if (index === 1) await expect(page.locator('.campaign-earned')).toContainText('Siege foundry');
    const progress = await readProgress(page);
    expect(Object.keys(progress.missions)).toEqual(ONBOARDING_MISSIONS.slice(0, index + 1).map(item => item.id));
    for (const earned of ONBOARDING_MISSIONS.slice(0, index + 1)) expect(progress.missions[earned.id]).toMatchObject({ completed: true, stars: 3 });
    await press(page, '#playAgain');
    await expect(page.locator('#campaignMissionTitle')).toHaveText(['Shield at the Fork', 'Open Three Roads', 'Emberwatch'][index]);
    await expect(page.locator('#start')).toBeFocused();
    await startRunning(page, press); await openBuildControls(page);
    await expect(page.locator('.build-card:visible')).toHaveCount([5, 8, 8][index]);
    await expect(page.locator('[data-type="wardenLodge"]')).toBeVisible();
    const active = await pause(page);
    expect(active.scenario).toEqual({ kind: 'campaign', id: ['shield-at-the-fork', 'open-three-roads', 'emberwatch'][index], revision: index === 0 ? 1 : 4 });
    expect(active.game.rulesetId).toBe(index === 0 ? 'frontier-campaign-fork' : 'frontier-campaign-air-local');
    await press(page, '#saveExit'); await page.reload();
    expect(await readProgress(page)).toEqual(progress);
  }
});

test('newer profile progress does not upgrade a saved two-building battle, while deliberate replay uses eight', async ({ page }) => {
  const fixture = progressionFixture('roadside-watch', { terminal: true, ranged: false }), progress = progressionProfile(2);
  await seedCheckpoint(page, fixture, progress);
  const admitted = decodeBattle(fixture.envelope, { campaignProgress: progress });
  expect(Object.keys(admitted.game.buildings)).toEqual(['barracks', 'archery']);
  await press(page, '#resumeSaved');
  await expect(page.locator('#resultTitle')).toHaveText('MISSION COMPLETE');
  await expect(page.locator('.result-stars')).toHaveText('★★☆');
  await expect(page.locator('.campaign-earned')).toHaveCount(0);
  // A terminal checkpoint completes before the drawer can be opened. The
  // constructed deck itself still proves which immutable roster was resumed.
  expect(await page.locator('.build-card').evaluateAll(cards => cards.map(card => card.dataset.type))).toEqual(['barracks', 'archery']);
  await press(page, '#replayMission'); await openBuildControls(page);
  await expect(page.locator('.build-card:visible')).toHaveCount(8);
  await expect(page.locator('[data-type="wardenLodge"]')).toBeVisible();
  const replay = await pause(page);
  expect(replay.scenario).toEqual({ kind: 'campaign', id: 'roadside-watch', revision: 4 });
  expect(replay.game.rulesetId).toBe('frontier-campaign-air-local');
  const after = await readProgress(page);
  expect(after.missions['roadside-watch'].stars).toBe(2);
  expect(after.missions['shield-at-the-fork']).toEqual(progress.missions['shield-at-the-fork']);
});

test('new main battle builds a paid Rootwarden lodge and preserves automatic-flight identity through reload and backup import', async ({ page }) => {
  test.setTimeout(35000);
  // Declared already-earned profile fixture, not browser-earned milestones.
  const progress = progressionProfile(3); await seedOnce(page, { [K.campaign]: JSON.stringify(progress) });
  await expect(page.locator('#campaignMissionTitle')).toHaveText('Emberwatch');
  await startRunning(page, press); await press(page, '[data-type="wardenLodge"]');
  await tapPoint(page, await homePoint(page, Game.restore((await saved(page)).game).map, 550, 450));
  await expect(page.locator('#toast')).toContainText('Warden lodge raised');
  const before = await pause(page);
  expect(before).toMatchObject({ version: 3, scenario: { kind: 'campaign', id: 'emberwatch', revision: 4 }, game: { rulesetId: 'frontier-campaign-air-local' } });
  expect(before.game.state.buildings.filter(building => building.side === 0 && building.type === 'wardenLodge')).toHaveLength(1);
  await press(page, '#saveExit'); await page.reload(); await press(page, '#resumeSaved');
  const resumed = await pause(page); expect(resumed.scenario).toEqual(before.scenario);
  expect(resumed.game.state.buildings.map(building => [building.id, building.type, building.side, building.x, building.y, building.level])).toEqual(before.game.state.buildings.map(building => [building.id, building.type, building.side, building.x, building.y, building.level]));
  await press(page, '#saveExit'); await openBackup(page);
  const text = await downloadBackup(page), backup = parseBackup(text);
  expect(backup.data.battle.scenario).toEqual(before.scenario); expect(backup.data.campaign).toEqual(progress);
  await chooseBackup(page, text); await Promise.all([page.waitForEvent('load'), press(page, '#confirmImport')]);
  await press(page, '#resumeSaved'); expect((await pause(page)).scenario).toEqual(before.scenario);
});

test('intro-only records remain visible without skipping the opening; returning main records keep the full roster', async ({ page }) => {
  const intro = createCampaignProgress(); intro.missions['first-watch'] = { completed: true, stars: 2, bestTime: 95 };
  await seedOnce(page, { [K.campaign]: JSON.stringify(intro) });
  await expect(page.locator('#campaignMissionTitle')).toHaveText('Roadside Watch');
  await expect(page.locator('#campaignIntroProgressText')).toContainText('2/8 buildings');
  await expect(page.locator('#campaignIntroProgressText')).toContainText('Legacy lessons: 2/6 stars retained');
  await expect(page.locator('[data-chapter="first-roads"]')).toHaveCount(1); expect(await readProgress(page)).toEqual(intro);
  const returning = createCampaignProgress(); returning.missions.emberwatch = { completed: true, stars: 3, bestTime: 60 };
  await seedOnce(page, { [K.campaign]: JSON.stringify(returning) });
  await expect(page.locator('#campaignMissionTitle')).toHaveText('Three Roads');
  await expect(page.locator('#campaignIntroProgressText')).toContainText('8/8 buildings');
  await startRunning(page, press); await openBuildControls(page); await expect(page.locator('.build-card:visible')).toHaveCount(8);
  const active = await pause(page);
  expect(active.scenario).toEqual({ kind: 'campaign', id: 'three-roads', revision: 4 });
  expect(active.game.rulesetId).toBe('frontier-campaign-air-local');
  expect(await readProgress(page)).toEqual(returning);
});

test('ordinary backup refuses unknown campaign progress without downloading or replacing original bytes', async ({ page }) => {
  const unknown = JSON.stringify({ ...createCampaignProgress(), missions: { 'future-lesson': { completed: true, stars: 1, bestTime: 60 } } });
  await seedOnce(page, { [K.campaign]: unknown }); await openBackup(page);
  const downloads = []; page.on('download', download => downloads.push(download));
  await press(page, '#exportBackup');
  await expect(page.locator('#backupStatus')).not.toHaveText('Backup download started. Keep the file somewhere safe.');
  await expect(page.locator('#backupStatus')).toContainText(/campaign|mission/i);
  expect(downloads).toHaveLength(0);
  expect(await page.evaluate(key => localStorage.getItem(key), K.campaign)).toBe(unknown);
});
