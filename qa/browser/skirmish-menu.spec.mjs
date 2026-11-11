// Exercise the launch footer with real setup scrolling, saved battles and keys.
import {expect} from '@playwright/test';
import {test, press} from './map-browser-helpers.mjs';

async function exposed(page, selector) {
  const box = await page.locator(selector).boundingBox(), viewport = page.viewportSize();
  expect(box).not.toBeNull();
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
  expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
  expect(box.height).toBeGreaterThanOrEqual(44);
  expect(await page.locator(selector).evaluate(element => {
    const box = element.getBoundingClientRect();
    return element.contains(document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2));
  }), `${selector} is not covered`).toBe(true);
  return box;
}

test.beforeEach(async ({page}) => {
  await page.goto('/');
  await press(page, '[data-mode="skirmish"]');
});

test('launch stays exposed through expanded setup and alongside an unfinished battle', async ({page}) => {
  const launch = await exposed(page, '#start');
  await expect(page.locator('#skirmishDetails')).not.toHaveAttribute('open', '');
  for (const selector of ['#skirmishRules', '#skirmishBridgeIncome', '#skirmishFog']) {
    // These choices are in the main form, not behind the optional rules disclosure.
    expect(await page.locator(selector).evaluate(element => !element.closest('details'))).toBe(true);
  }
  for (const selector of ['.difficulty-choices small', '.skirmish-bridge-label small']) {
    expect(await page.locator(selector).first().evaluate(element => parseFloat(getComputedStyle(element).fontSize))).toBeGreaterThanOrEqual(12);
  }
  await press(page, '#mapPickerToggle');
  await press(page, '#skirmishDetails > summary');
  await page.locator('#skirmishFogDescription').scrollIntoViewIfNeeded();
  expect((await exposed(page, '#start')).y).toBeCloseTo(launch.y, 0);
  await press(page, '#start');
  await expect(page.locator('#welcome')).toBeHidden();
  await press(page, '#pause');
  await press(page, '#saveExit');
  await exposed(page, '#start');
  await exposed(page, '#resumeSaved');
  await page.locator('#skirmishBridgeDescription').scrollIntoViewIfNeeded();
  await exposed(page, '#start');
  await exposed(page, '#resumeSaved');
  await press(page, '#resumeSaved');
  await expect(page.locator('#welcome')).toBeHidden();
});

test('keyboard can change setup, read rules and launch with visible focus', async ({page}) => {
  await page.locator('[data-difficulty="hard"]').focus();
  await page.keyboard.press('Space');
  await expect(page.locator('[data-difficulty="hard"]')).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('Tab');
  await expect(page.locator('#mapPickerToggle')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.locator('#skirmishRules')).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('#skirmishRules')).toHaveValue('frontier-air-local-timed');
  await expect(page.locator('#skirmishRulesSummary')).toHaveText('Citadels lose health from 7:00.');
  await page.keyboard.press('Tab');
  await expect(page.locator('#skirmishBridgeIncome')).toBeFocused();
  await page.keyboard.press('Space');
  await expect(page.locator('#skirmishBridgeIncome')).toBeChecked();
  await expect(page.locator('#skirmishFog')).toBeDisabled();
  await expect(page.locator('#skirmishFogAvailability')).toContainText('Fog of war needs Classic, open endgame and bridge income off.');
  await page.keyboard.press('Tab');
  await expect(page.locator('#skirmishDetails > summary')).toBeFocused();
  const focus = await page.locator('#skirmishDetails > summary').boundingBox();
  const setup = await page.locator('#skirmishConfig').boundingBox();
  expect(focus.y).toBeGreaterThanOrEqual(setup.y);
  expect(focus.y + focus.height).toBeLessThanOrEqual(setup.y + setup.height);
  await page.keyboard.press('Space');
  await expect(page.locator('#skirmishRulesDescription')).toBeVisible();
  await page.keyboard.press('Tab');
  await expect(page.locator('#start')).toBeFocused();
  await exposed(page, '#start');
  await page.keyboard.press('Enter');
  await expect(page.locator('#welcome')).toBeHidden();
});
