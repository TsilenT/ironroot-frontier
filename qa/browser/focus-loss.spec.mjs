import {expect} from '@playwright/test';
import {test, press, saved} from './map-browser-helpers.mjs';

const SAVE = 'ironroot.battle.v1';
const checkpoint = page => page.evaluate(key => localStorage.getItem(key), SAVE);
async function start(page) {
  await page.goto('/');
  await press(page, '[data-mode="skirmish"]');
  await press(page, '#start');
  await expect(page.locator('#pauseVeil')).toBeHidden();
}
async function loseFocus(page) {
  // A real child document emits trusted blur while the game stays visible.
  // This exercises Chromium's event path, not an OS Alt-Tab or Steam overlay.
  await page.evaluate(() => {
    window.__focusLoss = null;
    window.addEventListener('blur', event => {
      window.__focusLoss = {trusted: event.isTrusted, hidden: document.hidden};
    }, {once: true});
    const frame = document.createElement('iframe');
    frame.id = 'focusLossProbe'; frame.title = 'Other document';
    frame.srcdoc = '<input aria-label="Other document">';
    frame.style.cssText = 'position:fixed;left:0;top:0;width:180px;height:60px;z-index:10000';
    document.body.append(frame);
  });
  await page.frameLocator('#focusLossProbe').getByRole('textbox').click();
  await expect.poll(() => page.evaluate(() => window.__focusLoss)).toEqual({trusted: true, hidden: false});
  await page.evaluate(() => document.getElementById('focusLossProbe').remove());
}

test('visible focus loss saves and pauses until explicit Resume, including after reload', async ({page}) => {
  await start(page);
  await page.waitForTimeout(240);
  await loseFocus(page);
  await expect(page.locator('#pauseVeil')).toBeVisible();
  await expect(page.locator('#pauseSaveStatus')).toContainText('Checkpoint saved');
  const before = await saved(page), bytes = await checkpoint(page);
  expect(before.game.state.time).toBeGreaterThan(0);
  await page.locator('#resume').focus();
  await page.waitForTimeout(240);
  await expect(page.locator('#pauseVeil')).toBeVisible();
  await press(page, '#pauseSettings'); await press(page, '#settingsDone');
  expect(await checkpoint(page)).toBe(bytes);
  await page.reload();
  await press(page, '#resumeSaved');
  await press(page, '#pause');
  const after = await saved(page);
  expect(after.identity).toEqual(before.identity);
  expect(after.game.state.time).toBeGreaterThanOrEqual(before.game.state.time);
  await press(page, '#resume');
  await page.waitForTimeout(180);
  await press(page, '#pause');
  expect((await saved(page)).game.state.time).toBeGreaterThan(after.game.state.time);
});

for (const [open, close, modal] of [
  ['#settings', '#settingsDone', '#settingsModal'],
  ['#help', '#closeHelp', '#helpModal'],
]) test(`focus interruption while ${modal} is open keeps the battle paused when it closes`, async ({page}) => {
  await start(page);
  if (open === '#help') await press(page, '#pause');
  await press(page, open);
  await expect(page.locator(modal)).toBeVisible();
  const bytes = await checkpoint(page);
  await loseFocus(page);
  await press(page, close);
  await expect(page.locator('#pauseVeil')).toBeVisible();
  expect(await checkpoint(page)).toBe(bytes);
});

test('focus-loss save failure preserves the checkpoint and keeps the battle paused', async ({page}) => {
  await start(page);
  const bytes = await checkpoint(page);
  await page.waitForTimeout(240);
  await page.evaluate(key => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function(k, v) {
      if (this === localStorage && k === key) throw new DOMException('Full', 'QuotaExceededError');
      return original.call(this, k, v);
    };
  }, SAVE);
  await loseFocus(page);
  await expect(page.locator('#pauseVeil')).toBeVisible();
  await expect(page.locator('#pauseSaveStatus')).toContainText('Saving unavailable');
  expect(await checkpoint(page)).toBe(bytes);
});
