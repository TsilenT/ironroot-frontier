// Real browser input against the unchanged setup controls. No game-state hooks.
import {expect} from '@playwright/test';
import {test, press, selectMap} from './map-browser-helpers.mjs';

const fogLabel = 'label[for="skirmishFog"] span';
const scroll = page => page.locator('#welcome .welcome').evaluate(element => element.scrollTop);
const setup = page => page.evaluate(() => ({
  fog: document.getElementById('skirmishFog').checked,
  disabled: document.getElementById('skirmishFog').disabled,
  endgame: document.getElementById('skirmishRules').value,
  bridge: document.getElementById('skirmishBridgeIncome').checked,
  map: document.querySelector('#mapChoices [aria-pressed="true"]').dataset.map,
}));

async function settleFocus(page) {
  // Passive focus repair is queued with requestAnimationFrame, not a timer.
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}

test.beforeEach(async ({page}) => {
  await page.goto('/');
  await press(page, '[data-mode="skirmish"]');
});

test('supported fog toggles repeatedly through its label, checkbox and keyboard without a scroll jump', async ({page}, info) => {
  const fog = page.locator('#skirmishFog');
  await expect(fog).toBeEnabled();
  await expect(fog).not.toBeChecked();
  for (const selector of [fogLabel, '#skirmishFog', fogLabel, fogLabel]) {
    await page.locator(selector).scrollIntoViewIfNeeded();
    const before = await scroll(page), checked = await fog.isChecked();
    await press(page, selector);
    await settleFocus(page);
    await expect(fog).toBeChecked({checked: !checked});
    expect(Math.abs(await scroll(page) - before)).toBeLessThanOrEqual(2);
    await expect(page.locator('#skirmishRules')).toBeEnabled({enabled: checked});
    await expect(page.locator('#skirmishBridgeIncome')).toBeEnabled({enabled: checked});
  }
  await fog.focus();
  const before = await scroll(page);
  await fog.press('Space');
  await expect(fog).toBeChecked();
  await fog.press('Space');
  await expect(fog).not.toBeChecked();
  expect(Math.abs(await scroll(page) - before)).toBeLessThanOrEqual(2);
  await info.attach('supported-fog-setup', {body: JSON.stringify(await setup(page)), contentType: 'application/json'});
});

for (const reason of ['map', 'endgame', 'bridge']) {
  test(`unavailable fog label keeps the reading position and selections with incompatible ${reason}`, async ({page}, info) => {
    if (reason === 'map') await selectMap(page, 'long-march');
    if (reason === 'endgame') await page.locator('#skirmishRules').selectOption('frontier-air-local-timed');
    if (reason === 'bridge') await press(page, '#skirmishBridgeIncome');
    await expect(page.locator('#skirmishFog')).toBeDisabled();
    const original = await setup(page);
    await page.locator(fogLabel).scrollIntoViewIfNeeded();
    const before = await scroll(page);
    if (info.project.name.includes('phone')) expect(before).toBeGreaterThan(100);
    for (let attempt = 0; attempt < 3; attempt++) {
      await press(page, fogLabel);
      await settleFocus(page);
      expect(Math.abs(await scroll(page) - before)).toBeLessThanOrEqual(2);
      expect(await setup(page)).toEqual(original);
    }
    await page.screenshot({path: info.outputPath(`unavailable-fog-${reason}.png`)});
    await info.attach('reading-position', {body: JSON.stringify({before, after: await scroll(page), setup: await setup(page)}), contentType: 'application/json'});
  });
}

test('reading the fog explanation does not jump, and deliberate keyboard navigation still reveals focus', async ({page}) => {
  await page.locator('#skirmishFogDescription').scrollIntoViewIfNeeded();
  const before = await scroll(page);
  await press(page, '#skirmishFogDescription');
  await settleFocus(page);
  expect(Math.abs(await scroll(page) - before)).toBeLessThanOrEqual(2);
  // Repair still traps focus inside the dialog, rather than the live game.
  expect(await page.evaluate(() => document.getElementById('welcome').contains(document.activeElement))).toBe(true);
  await page.keyboard.press('Tab');
  const focus = await page.evaluate(() => {
    const element = document.activeElement, box = element.getBoundingClientRect();
    return {inside: document.getElementById('welcome').contains(element), top: box.top, bottom: box.bottom, height: innerHeight};
  });
  expect(focus.inside).toBe(true);
  expect(focus.top).toBeGreaterThanOrEqual(0);
  expect(focus.bottom).toBeLessThanOrEqual(focus.height);
});
