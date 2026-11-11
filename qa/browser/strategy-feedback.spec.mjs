import {expect} from '@playwright/test';
import {Game} from '../../dist/engine.js';
import {encodeBattle} from '../../dist/battle-codec.js';
import {BACKUP_STORAGE_KEYS} from '../../dist/backup.js';
import {reportFixture} from './battle-report-fixtures.mjs';
import {test, press, seedOnce, homePoint, tapPoint} from './map-browser-helpers.mjs';

// Declared synthetic checkpoints exercise real app/engine boundaries. They are
// not human playtests or claims about strategy, difficulty, or causes of loss.
test('full army has an accurate visible counter, accessible notice and contextual production explanation', async ({page}, info) => {
  const game = new Game({ai:false,rulesetId:'frontier-citadel-open'}), b = game.state.buildings[0];
  for (let count = 0; count < 70; count++) game._spawn(b);
  await seedOnce(page,{[BACKUP_STORAGE_KEYS.battle]:JSON.stringify(encodeBattle(game))});
  await press(page,'#resumeSaved');
  await expect(page.locator('#army')).toHaveText('70/70');
  await expect(page.locator('#army')).toHaveClass(/army-full/);
  await expect(page.locator('#armyCapacityStatus')).toContainText('Army full');
  const header = await page.locator('.resources').evaluate(element => ({width:element.clientWidth,scroll:element.scrollWidth}));
  expect(header.scroll).toBeLessThanOrEqual(header.width);
  await tapPoint(page,await homePoint(page,game.map,b.x,b.y));
  await expect(page.locator('#selectionCapacity')).toBeVisible();
  await expect(page.locator('#selectionCapacity')).toContainText('Missed waves are not stored');
  await page.locator('#upgrade').scrollIntoViewIfNeeded();
  await expect(page.locator('#upgrade')).toBeInViewport({ratio:1});
  await page.screenshot({path:info.outputPath('full-army-inspector.png')});
  await press(page,'#closeSelection'); await press(page,'#pause');
  await press(page,'#pauseArmySummary');
  await expect(page.locator('#pauseArmyStatus')).toBeVisible();
  await expect(page.locator('#pauseArmyStatus')).toContainText('recruitment resumes on a later wave with space');
  await page.screenshot({path:info.outputPath('army-capacity-pause.png')});
  await press(page,'#resume'); await expect(page.locator('#pauseVeil')).toBeHidden();
});

for (const kind of ['skirmish-defeat','campaign-failure','trial-failure','campaign-protected-failure','skirmish-victory','skirmish-draw']) {
  test(`${kind} shows final facts only for a loss and keeps the exact reported values`,async ({page},info) => {
    const fixture = reportFixture(kind);
    await seedOnce(page,{[BACKUP_STORAGE_KEYS.battle]:JSON.stringify(fixture.envelope),
      [BACKUP_STORAGE_KEYS.campaign]:JSON.stringify(fixture.progress)});
    await press(page,'#resumeSaved'); await expect(page.locator('#resultModal')).toBeVisible();
    const lost = kind.endsWith('defeat') || kind.includes('failure');
    if (!lost) await expect(page.locator('#resultFacts')).toBeHidden();
    else {
      await expect(page.locator('#resultFacts')).toBeVisible();
      await expect(page.locator('#resultCopy')).not.toContainText('Try a different army');
      if (kind === 'skirmish-defeat') await expect(page.locator('#resultCopy')).toHaveText('Your citadel fell.');
      await page.locator('#resultFacts').scrollIntoViewIfNeeded();
      await page.screenshot({path:info.outputPath('defeat-facts.png')});
      const report = page.locator('#resultReport details.battle-report');
      await press(page,'#resultReport details.battle-report > summary');
      const download = page.waitForEvent('download'); await press(page,'[data-report-download]');
      const stream = await (await download).createReadStream(), chunks = [];
      for await (const chunk of stream) chunks.push(chunk);
      const data = JSON.parse(Buffer.concat(chunks).toString('utf8')), enemy = data.final.sides[1], own = data.final.sides[0];
      await expect(page.locator('#resultFacts dd')).toHaveText([
        `${Math.ceil(enemy.baseHp)} / ${Math.ceil(enemy.baseMaxHp)}`,String(own.armyCount),String(Math.floor(own.gold)),
      ]);
      expect(await report.evaluate(element => element.open)).toBe(true);
    }
    for (const id of ['playAgain','resultMenu','inspectBattle']) await expect(page.locator('#'+id)).toBeInViewport({ratio:1});
    await press(page,'#inspectBattle'); await expect(page.locator('#resultModal')).toBeHidden();
  });
}
