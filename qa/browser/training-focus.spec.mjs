import {expect} from '@playwright/test';
import {BUILDINGS} from '../../dist/engine.js';
import {test, openTraining, selectLesson, gold, press} from './training-browser-helpers.mjs';

const lessons = [
  ['first-barracks', 'barracks'], ['shield-and-arrow', 'archery'],
  ['mine-and-upgrade', 'mint'], ['siege-the-tower', 'foundry'], ['answer-the-air', 'archery'],
];
async function tabTo(page, selector) {
  for (let i = 0; i < 25; i++) {
    if (await page.locator(selector).evaluate(node => node === document.activeElement)) return;
    await page.keyboard.press('Tab');
  }
  throw new Error('Keyboard could not reach ' + selector);
}
async function buildWithKeyboard(page, type, key = 'Enter') {
  const before = await gold(page);
  await tabTo(page, `[data-build="${type}"]`);
  await page.keyboard.press(key);
  await tabTo(page, '[data-site-index="0"]');
  await page.keyboard.press(key);
  expect(await gold(page)).toBe(before - BUILDINGS[type].cost);
  await expect(page.locator('#continueLesson')).toBeFocused();
  await expect(page.locator('body')).toHaveAttribute('data-training-status', 'step-complete');
}

for (const [id, type] of lessons) for (const key of ['Enter', 'Space']) {
  test(`${id}: ${key} placement moves keyboard focus to Continue`, async ({page}) => {
    await openTraining(page);
    if (id !== 'first-barracks') await selectLesson(page, id);
    await buildWithKeyboard(page, type, key);
    // No locator.focus() repair: immediately activate the destination.
    await page.keyboard.press(key);
    await expect(page.locator('#stepTitle')).toBeFocused();
    await expect(page.locator('#continueLesson')).toHaveText('Start observation');
    await page.keyboard.press('Tab');
    await expect(page.locator('#continueLesson')).toBeFocused();
  });
}

test('mine upgrade restores Continue focus when the selected panel disappears', async ({page}) => {
  await openTraining(page); await selectLesson(page, 'mine-and-upgrade');
  await buildWithKeyboard(page, 'mint');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Tab'); await page.keyboard.press('Enter');
  await page.keyboard.press('Tab');
  await expect(page.locator('#pauseLesson')).toBeFocused();
  await expect(page.locator('body')).toHaveAttribute('data-training-status', 'step-complete', {timeout:10000});
  await expect(page.locator('#continueLesson')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('body')).toHaveAttribute('data-step-id', 'upgrade-mine');
  await tabTo(page, '[data-building-id]'); await page.keyboard.press('Enter');
  await tabTo(page, '#upgradeBuilding');
  const before = await gold(page);
  await page.keyboard.press('Enter');
  expect(await gold(page)).toBe(before - 133);
  await expect(page.locator('#selectionPanel')).toBeHidden();
  await expect(page.locator('#continueLesson')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#stepTitle')).toBeFocused();
});

test('observation completion moves focus only when its focused Pause control disappears', async ({page}) => {
  await openTraining(page); await buildWithKeyboard(page, 'barracks');
  await page.keyboard.press('Enter'); await page.keyboard.press('Tab'); await page.keyboard.press('Enter');
  await page.keyboard.press('Tab');
  await expect(page.locator('#pauseLesson')).toBeFocused();
  await expect(page.locator('body')).toHaveAttribute('data-training-status', 'lesson-complete', {timeout:10000});
  await expect(page.locator('#continueLesson')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#lessonPicker')).toHaveValue('shield-and-arrow');
  await expect(page.locator('#stepTitle')).toBeFocused();
});

test('pointer placement preserves the existing focus behavior', async ({page}) => {
  await openTraining(page);
  const focusEvents = [];
  await page.exposeBinding('__focusObserved', (_source, id) => focusEvents.push(id));
  await page.evaluate(() => document.addEventListener('focusin', event => void window.__focusObserved(event.target.id)));
  await press(page, '[data-build="barracks"]'); await press(page, '[data-site-index="0"]');
  await expect(page.locator('body')).toHaveAttribute('data-training-status', 'step-complete');
  expect(focusEvents).not.toContain('continueLesson');
  expect(focusEvents).not.toContain('stepTitle');
});

test('completion leaves focus on another enabled control', async ({page}) => {
  await openTraining(page); await buildWithKeyboard(page, 'barracks');
  await page.keyboard.press('Enter'); await page.keyboard.press('Tab'); await page.keyboard.press('Enter');
  await tabTo(page, '#restartLesson');
  await expect(page.locator('body')).toHaveAttribute('data-training-status', 'lesson-complete', {timeout:10000});
  await expect(page.locator('#restartLesson')).toBeFocused();
});

test('held Enter cannot carry the placement activation into Continue', async ({page}) => {
  await openTraining(page);
  await tabTo(page, '[data-build="barracks"]'); await page.keyboard.press('Enter');
  await tabTo(page, '[data-site-index="0"]');
  await page.keyboard.down('Enter');
  await expect(page.locator('#continueLesson')).toBeFocused();
  for (let i = 0; i < 3; i++) await page.keyboard.down('Enter');
  await page.keyboard.up('Enter');
  await expect(page.locator('body')).toHaveAttribute('data-training-status', 'step-complete');
  expect(await gold(page)).toBe(140);
  await expect(page.locator('#battleTime')).toHaveText('0:00');
  await page.keyboard.press('Enter');
  await expect(page.locator('body')).toHaveAttribute('data-step-id', 'watch-spawn');
});

test('keyboard Cancel returns to the instruction without losing the build deck', async ({page}) => {
  await openTraining(page);
  await tabTo(page, '[data-build="barracks"]'); await page.keyboard.press('Enter');
  await page.keyboard.press('Shift+Tab');
  await expect(page.locator('#cancelChoice')).toBeFocused();
  await page.keyboard.press('Space');
  await expect(page.locator('#stepTitle')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.locator('[data-build="barracks"]')).toBeFocused();
  expect(await gold(page)).toBe(280);
});
