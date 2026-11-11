import {expect} from '@playwright/test';
import {Game} from '../../dist/engine.js';
import {encodeBattle} from '../../dist/battle-codec.js';
import {BACKUP_STORAGE_KEYS} from '../../dist/backup.js';
import {test,press,seedOnce,homePoint,tapPoint} from './map-browser-helpers.mjs';

async function battle(page) {
  const game = new Game({ai:false,rulesetId:'frontier-citadel-open',seed:49});
  game.state.gold[0] = 2000;
  await seedOnce(page,{[BACKUP_STORAGE_KEYS.battle]:JSON.stringify(encodeBattle(game))});
  await press(page,'#resumeSaved');
  await expect(page.locator('#goldChange')).toBeHidden();
  return game;
}
async function fits(page) {
  const label=await page.locator('#goldChange').boundingBox(), viewport=page.viewportSize();
  expect(label.x).toBeGreaterThanOrEqual(0); expect(label.x+label.width).toBeLessThanOrEqual(viewport.width);
  expect(label.y).toBeGreaterThanOrEqual(0); expect(label.y+label.height).toBeLessThanOrEqual(viewport.height);
  const header=await page.locator('#topbar').boundingBox();
  expect(label.y,'cue clears both citadel readouts, even below a portrait resource row').toBeGreaterThanOrEqual(header.y+header.height);
  for (const id of ['gold','income','army','time']) {
    const box=await page.locator('#'+id).boundingBox();
    const overlap=Math.max(0,Math.min(label.x+label.width,box.x+box.width)-Math.max(label.x,box.x))
      *Math.max(0,Math.min(label.y+label.height,box.y+box.height)-Math.max(label.y,box.y));
    expect(overlap,'cue does not cover '+id).toBe(0);
  }
}

test('paid construction shows one stationary amount; income and reload do not repeat it',async({page},info)=>{
  const game=await battle(page);
  const header=await page.locator('.resources').boundingBox();
  await press(page,'[data-type="archery"]');
  await tapPoint(page,await homePoint(page,game.map,550,450));
  await expect(page.locator('#goldChange')).toHaveText('−'+game.buildings.archery.cost);
  await expect(page.locator('#goldChange')).toHaveCount(1);
  await expect(page.locator('#goldChange')).toHaveAttribute('aria-hidden','true');
  await fits(page);
  const after=await page.locator('.resources').boundingBox();
  expect(after.height).toBe(header.height); expect(after.width).toBe(header.width);
  expect(await page.locator('#goldChange').evaluate(el=>({animation:getComputedStyle(el).animationName,transition:getComputedStyle(el).transitionDuration,active:el.getAnimations().length})))
    .toEqual({animation:'none',transition:'0s',active:0});
  await page.screenshot({path:info.outputPath('gold-purchase.png')});
  await expect(page.locator('#goldChange')).toBeHidden({timeout:3000});
  await page.waitForTimeout(350);
  await expect(page.locator('#goldChange')).toBeHidden();
  await press(page,'#pause'); await press(page,'#saveExit');
  await page.reload(); await press(page,'#resumeSaved');
  await expect(page.locator('#goldChange')).toBeHidden();
});

test('upgrade and salvage use actual amounts and the newest cue owns its full lifetime',async({page},info)=>{
  await page.clock.install({time:new Date('2026-01-01T00:00:00Z')});
  const game=await battle(page),building=game.state.buildings.find(b=>b.side===0);
  const cost=game.upgradeCost(building);
  await tapPoint(page,await homePoint(page,game.map,building.x,building.y));
  await expect(page.locator('#upgrade')).toBeVisible();
  await page.clock.pauseAt(new Date('2026-01-01T01:00:00Z'));
  // Keep the clock paused across the actual command handlers so screenshot
  // capture or actionability waits cannot consume the cue's measured lifetime.
  // Physical upgrade inputs are covered by building-upgrade-preview.spec.mjs.
  await page.locator('#upgrade').evaluate(button=>button.click());
  await expect(page.locator('#goldChange')).toHaveText('−'+cost);
  await page.clock.runFor(1100);
  const upgraded=game.upgrade(building.id); expect(upgraded.ok).toBe(true);
  const refund=game.sell(building.id).refund;
  await page.locator('#sell').evaluate(button=>button.click());
  await expect(page.locator('#goldChange')).toHaveText('+'+refund);
  await fits(page);
  await page.screenshot({path:info.outputPath('gold-refund.png')});
  await page.clock.runFor(1100);
  await expect(page.locator('#goldChange')).toBeVisible();
  await page.clock.runFor(901);
  await expect(page.locator('#goldChange')).toBeHidden();
});

test('citadel purchase appears once and retrying the committed choice adds no cue',async({page})=>{
  await battle(page); await press(page,'#pause'); await press(page,'#pauseCitadel');
  await press(page,'#buyCitadelArrows');
  await expect(page.locator('#goldChange')).toHaveText('−190');
  await page.evaluate(()=>{
    window.goldCueChanges=0;
    new MutationObserver(()=>window.goldCueChanges++).observe(document.getElementById('goldChange'),{childList:true});
    document.getElementById('buyCitadelArrows').onclick();
  });
  await page.waitForTimeout(150);
  expect(await page.evaluate(()=>window.goldCueChanges)).toBe(0);
  await press(page,'#citadelResume');
  await expect(page.locator('#goldChange')).toHaveText('−190');
});

test('reduced-motion preference keeps the successful purchase cue static and clears it at title',async({page},info)=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  const game=await battle(page);
  await press(page,'[data-type="archery"]'); await tapPoint(page,await homePoint(page,game.map,550,450));
  await expect(page.locator('#goldChange')).toHaveText('−'+game.buildings.archery.cost);
  expect(await page.locator('#goldChange').evaluate(el=>el.getAnimations().length)).toBe(0);
  await fits(page); await page.screenshot({path:info.outputPath('gold-reduced-motion.png')});
  await press(page,'#pause'); await press(page,'#saveExit');
  await expect(page.locator('#goldChange')).toBeHidden();
});
