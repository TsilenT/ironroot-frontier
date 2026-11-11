import {expect} from '@playwright/test';
import {test, press, seedOnce} from './map-browser-helpers.mjs';
import {progressionFixture} from './campaign-progression-fixtures.mjs';
import {campaignFixture} from './campaign-fixtures.mjs';
import {BACKUP_STORAGE_KEYS as K} from '../../dist/backup.js';

async function resumeResult(page, fixture, reducedMotion = false) {
  // Existing disclosed near-result checkpoints exercise presentation. They do
  // not establish human play, strategy quality or difficulty.
  await seedOnce(page, {
    [K.battle]: JSON.stringify(fixture.envelope),
    [K.campaign]: JSON.stringify(fixture.progress),
    [K.settings]: JSON.stringify({sound:false, reducedMotion, musicVolume:.3, sfxVolume:.9}),
  });
  await press(page, '#resumeSaved');
  await expect(page.locator('#resultModal')).toBeVisible();
}
async function animationNames(page) {
  return page.locator('.result-sigil,.reward-star.earned,.campaign-earned').evaluateAll(
    nodes => nodes.map(node => getComputedStyle(node).animationName));
}

for (const mode of ['default', 'OS reduced motion', 'game reduced motion']) {
  test(`reward feedback preserves controls and audio preferences with ${mode}`, async ({page}, info) => {
    await page.emulateMedia({reducedMotion: mode === 'OS reduced motion' ? 'reduce' : 'no-preference'});
    await resumeResult(page, progressionFixture('roadside-watch', {terminal:true}), mode === 'game reduced motion');
    await expect(page.locator('#resultTitle')).toHaveText('MISSION COMPLETE');
    await expect(page.locator('.result-stars')).toHaveAttribute('aria-label', '3 of 3 mission stars');
    await expect(page.locator('.reward-star.earned')).toHaveCount(3);
    await expect(page.locator('#playAgain')).toBeEnabled();
    await expect(page.locator('#playAgain')).toBeFocused();
    const box = await page.locator('#playAgain').boundingBox(), viewport = page.viewportSize();
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
    const names = await animationNames(page);
    expect(names.every(name => name === 'none')).toBe(mode !== 'default');
    expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)), K.settings)).toMatchObject({musicVolume:.3, sfxVolume:.9});
    await page.screenshot({path:info.outputPath('reward-feedback.png')});
    if (mode === 'default') {
      await page.emulateMedia({reducedMotion:'reduce'});
      expect((await animationNames(page)).every(name => name === 'none')).toBe(true);
    }
    await press(page, '#playAgain');
    await expect(page.locator('#welcome')).toBeVisible();
    await expect(page.locator('#start')).toBeFocused();
  });
}

test('mission failure does not celebrate and inspection retires reward motion', async ({page}) => {
  await resumeResult(page, campaignFixture('failure'));
  await expect(page.locator('#resultTitle')).toHaveText('MISSION FAILED');
  await expect(page.locator('.result')).not.toHaveClass(/reward-motion/);
  expect((await animationNames(page)).every(name => name === 'none')).toBe(true);
  await press(page, '#inspectBattle');
  await expect(page.locator('#resultModal')).toBeHidden();
  await expect(page.locator('.result')).not.toHaveClass(/reward-motion/);
});

test('ordinary dismissal and Last Result do not replay the reward accent', async ({page}) => {
  await page.emulateMedia({reducedMotion:'no-preference'});
  await resumeResult(page, progressionFixture('roadside-watch', {terminal:true}));
  await expect(page.locator('.result')).toHaveClass(/reward-motion/);
  const earned = await page.evaluate(key => localStorage.getItem(key), K.campaign);
  await press(page, '#resultMenu');
  await expect(page.locator('.result')).not.toHaveClass(/reward-motion/);
  await press(page, '#lastResult');
  await expect(page.locator('#resultModal')).toBeVisible();
  await expect(page.locator('.result')).not.toHaveClass(/reward-motion/);
  expect(await page.evaluate(key => localStorage.getItem(key), K.campaign)).toBe(earned);
});

test('Back and Forward retain the result without replaying its decoration', async ({page}) => {
  await page.emulateMedia({reducedMotion:'no-preference'});
  await resumeResult(page, progressionFixture('roadside-watch', {terminal:true}));
  await expect(page.locator('.result')).toHaveClass(/reward-motion/);
  const earned = await page.evaluate(key => localStorage.getItem(key), K.campaign);
  await page.goBack();
  await expect(page.locator('#resultModal')).toBeHidden();
  await expect(page.locator('.result')).not.toHaveClass(/reward-motion/);
  await page.goForward();
  await expect(page.locator('#resultModal')).toBeVisible();
  await expect(page.locator('.result')).not.toHaveClass(/reward-motion/);
  expect(await page.evaluate(key => localStorage.getItem(key), K.campaign)).toBe(earned);
});
