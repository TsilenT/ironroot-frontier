import {expect} from '@playwright/test';
import {Game} from '../../dist/engine.js';
import {encodeBattle} from '../../dist/battle-codec.js';
import {BACKUP_STORAGE_KEYS} from '../../dist/backup.js';
import {test, press, seedOnce, homePoint, tapPoint, saved} from './map-browser-helpers.mjs';

async function inspect(page, type) {
  const game = new Game({ai:false,rulesetId:'frontier-citadel-open'});
  game.state.gold[0] = 1000;
  const b = type === 'barracks' ? game.state.buildings[0] : game.build(type,550,450).building;
  b.hp -= 100;
  const envelope = encodeBattle(game);
  await seedOnce(page, {[BACKUP_STORAGE_KEYS.battle]:JSON.stringify(envelope)});
  await press(page, '#resumeSaved');
  await tapPoint(page, await homePoint(page, game.map, b.x, b.y));
  await expect(page.locator('#selectionTitle')).toHaveText(game.buildings[type].name);
  return b;
}

test('building upgrade preview remains readable and actionable at every viewport', async ({page}, info) => {
  await inspect(page, 'barracks');
  const preview = page.locator('#upgradePreview'), button = page.locator('#upgrade');
  await expect(preview).toContainText('600 / 700 → 880 / 980');
  await expect(preview).toContainText('9.0s → 7.4s');
  await expect(preview).toContainText('180 → 201.6');
  await expect(preview).toContainText('21 → 23.52');
  await expect(preview).toContainText('Future recruits only.');
  await expect(button).toHaveAttribute('aria-describedby','upgradePreview');
  await button.scrollIntoViewIfNeeded();
  const box = await button.boundingBox(), viewport = page.viewportSize();
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
  expect(await preview.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
  await page.screenshot({path:info.outputPath('building-upgrade-preview.png')});
  await press(page, '#upgrade');
  await expect(preview).toContainText('Upgrade to level 3');
  await press(page, '#upgrade');
  await expect(preview).toHaveText('Maximum level reached');
  await expect(button).toBeDisabled();
  await press(page, '#closeSelection');
  await press(page, '#pause');
  expect((await saved(page)).game.state.buildings.find(b => b.side === 0).level).toBe(3);
});

for (const [type, text] of [['mint','2.5 → 3.75'],['watchtower','29 → 37.7']]) {
  test(`${type} preview shows its actual upgrade benefit`, async ({page}) => {
    await inspect(page, type);
    await expect(page.locator('#upgradePreview')).toContainText(text);
    await expect(page.locator('#upgradePreview')).not.toContainText('Recruit');
    await press(page, '#upgrade');
    await expect(page.locator('#upgradePreview')).toContainText('Upgrade to level 3');
  });
}
