import {test as base, expect} from '@playwright/test';
import {Game, LANES} from '../../dist/engine.js';
import {CAMPAIGN_STORAGE_KEY} from '../../dist/campaign.js';
import {campaignFixture} from './campaign-fixtures.mjs';

const SAVE='ironroot.battle.v1', HISTORY='ironroot.history.v1';
const test = base.extend({page:async ({page},use)=>{
  const errors=[]; page.on('pageerror',error=>errors.push(error.message));
  await use(page); expect(errors,'uncaught browser errors').toEqual([]);
}});
async function press(page,selector) {
  const control=page.locator(selector);
  if (await page.evaluate(()=>navigator.maxTouchPoints>0)) await control.tap();
  else await control.click();
}
async function openCampaign(page) {
  await page.goto('/'); await press(page,'[data-mode="campaign"]');
  await expect(page.locator('#campaignConfig')).toBeVisible();
}
async function snapshot(page) {
  return page.evaluate(key=>JSON.parse(localStorage.getItem(key)),SAVE);
}
async function pause(page) {
  await press(page,'#pause'); await expect(page.locator('#pauseVeil')).toBeVisible();
  return snapshot(page);
}
async function seed(page,kind) {
  const fixture=campaignFixture(kind);
  await page.addInitScript(({fixture,save,progress})=>{
    localStorage.setItem(save,JSON.stringify(fixture.envelope));
    localStorage.setItem(progress,JSON.stringify(fixture.progress));
  },{fixture,save:SAVE,progress:CAMPAIGN_STORAGE_KEY});
  await page.goto('/'); await expect(page.locator('#resumeSaved')).toContainText('RESUME MISSION');
  await press(page,'#resumeSaved');
  return fixture;
}
async function worldPoint(page,x,y) {
  await press(page,'#home');
  const rect=await page.locator('#battle').boundingBox();
  const scale=Math.max(.32,rect.height/900),half=rect.width/(2*scale);
  const camera=half>=1600?1600:Math.max(half,450);
  return {x:rect.x+rect.width/2+(x-camera)*scale,y:rect.y+rect.height/2+(y-450)*scale};
}
async function tapPoint(page,p) {
  if (await page.evaluate(()=>navigator.maxTouchPoints>0)) await page.touchscreen.tap(p.x,p.y);
  else await page.mouse.click(p.x,p.y);
}

test('campaign locked mission cannot launch and an unlocked mission can',async ({page})=>{
  await openCampaign(page); await press(page,'[data-mission="three-roads"]');
  await expect(page.locator('#campaignMissionTitle')).toHaveText('Three Roads');
  await expect(page.locator('#campaignUnlock')).toContainText('Complete Emberwatch');
  await expect(page.locator('#start')).toBeDisabled();
  await expect(page.locator('#start')).toContainText('MISSION LOCKED');
  await page.keyboard.press('Enter'); await expect(page.locator('#welcome')).toBeVisible();
  expect(await snapshot(page)).toBeNull();
  await press(page,'[data-mission="emberwatch"]'); await expect(page.locator('#start')).toBeEnabled();
  await press(page,'#start'); await expect(page.locator('#welcome')).toBeHidden();
  const save=await pause(page); expect(save.campaignId).toBe('emberwatch');
});

test('campaign chapter and mission choices retain keyboard focus after rerender',async ({page})=>{
  await openCampaign(page);
  await page.locator('[data-chapter="highpass"]').focus(); await page.keyboard.press('Enter');
  await expect(page.locator('[data-chapter="highpass"]')).toBeFocused();
  await expect(page.locator('#start')).toBeDisabled();
  await page.locator('[data-chapter="embers"]').focus(); await page.keyboard.press('Space');
  await expect(page.locator('[data-chapter="embers"]')).toBeFocused();
  await page.locator('[data-mission="three-roads"]').focus(); await page.keyboard.press('Enter');
  await expect(page.locator('[data-mission="three-roads"]')).toBeFocused();
  await page.locator('[data-mission="emberwatch"]').focus(); await page.keyboard.press('Space');
  await expect(page.locator('[data-mission="emberwatch"]')).toBeFocused();
  await expect(page.locator('#start')).toBeEnabled();
});

test('campaign UI-created version 2 save reloads the same mission and construction',async ({page})=>{
  await openCampaign(page); await press(page,'#start');
  const point=await worldPoint(page,270,450);
  await press(page,'[data-type="archery"]'); await tapPoint(page,point);
  await expect(page.locator('#toast')).toContainText('Archery range raised');
  const before=await pause(page);
  expect(before).toMatchObject({format:'ironroot-save',version:2,challengeId:null,campaignId:'emberwatch'});
  expect(before.game.state.buildings.some(b=>b.side===0&&b.type==='archery')).toBe(true);
  Game.restore(before.game);
  await press(page,'#saveExit'); await page.reload();
  await expect(page.locator('#resumeSaved')).toContainText('RESUME MISSION');
  await press(page,'#resumeSaved'); await expect(page.locator('#matchType')).toHaveText('CAMPAIGN');
  await expect(page.locator('#opponentLabel')).toHaveText('EMBERWATCH');
  const after=await pause(page);
  expect(after.campaignId).toBe('emberwatch'); expect(after.version).toBe(2);
  const layout=data=>data.game.state.buildings.filter(b=>b.side===0).map(b=>[b.type,b.x,b.y,b.level]);
  expect(layout(after)).toEqual(layout(before));
  expect(after.game.state.time).toBeGreaterThanOrEqual(before.game.state.time);
  expect(after.game.state.time-before.game.state.time).toBeLessThan(3);
});

test('campaign victory awards stars once and Continue unlocks the next mission',async ({page})=>{
  await seed(page,'victory');
  await expect(page.locator('#resultTitle')).toHaveText('MISSION COMPLETE');
  await expect(page.locator('#playAgain')).toBeFocused();
  await expect(page.locator('.result-stars')).toHaveText('★★★');
  await expect(page.locator('#playAgain')).toContainText('CONTINUE CAMPAIGN');
  await page.waitForTimeout(350);
  expect(await snapshot(page)).toBeNull();
  const progress=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),CAMPAIGN_STORAGE_KEY);
  expect(progress.missions.emberwatch).toMatchObject({completed:true,stars:3});
  expect(Object.keys(progress.missions)).toEqual(['emberwatch']);
  const history=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),HISTORY);
  expect(history).toHaveLength(1); expect(history[0]).toMatchObject({campaignId:'emberwatch',won:true});
  await press(page,'#playAgain');
  await expect(page.locator('#welcome')).toBeVisible();
  await expect(page.locator('#campaignMissionTitle')).toHaveText('Three Roads');
  await expect(page.locator('[data-mission="three-roads"]')).toHaveClass(/active/);
  await expect(page.locator('#start')).toBeEnabled();
  await expect(page.locator('#campaignProgressText')).toContainText('1/12 missions');
  await press(page,'#start'); const save=await pause(page);
  expect(save.campaignId).toBe('three-roads');
});

test('campaign deadline failure focuses Retry and restarts without granting progress',async ({page})=>{
  await seed(page,'failure');
  await expect(page.locator('#resultTitle')).toHaveText('MISSION FAILED');
  await expect(page.locator('#playAgain')).toBeFocused();
  await expect(page.locator('#playAgain')).toContainText('RETRY MISSION');
  await expect(page.locator('.result-stars')).toHaveText('☆☆☆');
  expect(await snapshot(page)).toBeNull();
  const progress=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),CAMPAIGN_STORAGE_KEY);
  expect(progress.missions).toEqual({});
  await page.keyboard.press('Shift+Tab'); await expect(page.locator('#inspectBattle')).toBeFocused();
  await page.keyboard.press('Tab'); await expect(page.locator('#playAgain')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#resultModal')).toBeHidden();
  await expect(page.locator('#welcome')).toBeHidden();
  const retry=await pause(page); expect(retry.campaignId).toBe('emberwatch');
  expect(retry.game.state.time).toBeLessThan(5);
  expect(retry.game.state.buildings.some(b=>b.side===1&&b.type==='barracks'&&b.x===2230)).toBe(true);
});

test('campaign protected mine has disabled salvage while normal buildings remain salvageable',async ({page})=>{
  await seed(page,'protected');
  await tapPoint(page,await worldPoint(page,410,LANES[2]));
  await expect(page.locator('#selectionPanel')).toBeVisible();
  await expect(page.locator('#sell')).toBeDisabled();
  await expect(page.locator('#sell')).toHaveText('Protected objective');
  await expect(page.locator('#selectionDescription')).toContainText('Keep this objective alive');
  await press(page,'#closeSelection');
  await tapPoint(page,await worldPoint(page,690,450));
  await expect(page.locator('#selectionPanel')).toBeVisible();
  await expect(page.locator('#sell')).toBeEnabled();
  const save=await pause(page);
  expect(save.game.state.buildings.filter(b=>b.side===0&&b.type==='mint')).toHaveLength(2);
});

test('campaign briefing and launch remain reachable across viewport changes',async ({page})=>{
  await openCampaign(page);
  for (const viewport of [{width:320,height:568},{width:844,height:390},{width:390,height:650}]) {
    await page.setViewportSize(viewport);
    await page.locator('[data-mission="emberwatch"]').scrollIntoViewIfNeeded();
    await press(page,'[data-mission="emberwatch"]');
    await page.locator('#start').scrollIntoViewIfNeeded();
    await expect(page.locator('#start')).toBeInViewport({ratio:1});
    await expect(page.locator('#start')).toBeEnabled();
    const bounds=await page.locator('#start').boundingBox();
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.x+bounds.width).toBeLessThanOrEqual(viewport.width+1);
  }
  await press(page,'#start'); await expect(page.locator('#welcome')).toBeHidden();
  expect((await pause(page)).campaignId).toBe('emberwatch');
});

// Known regression from independent UI review: a stale paused tab used to write
// over a newer battle during beforeunload. Keep this assertion red until fixed.
test('closing a stale paused campaign tab preserves the newer shared-context skirmish save',async ({page,context})=>{
  await openCampaign(page); await press(page,'#start');
  expect((await pause(page)).campaignId).toBe('emberwatch');

  const newer=await context.newPage(),errors=[];
  newer.on('pageerror',error=>errors.push(error.message));
  try {
    await newer.goto('/');
    await expect(newer.locator('#resumeSaved')).toContainText('RESUME MISSION');
    await press(newer,'[data-difficulty="hard"]'); await press(newer,'#start');
    const newerSave=await pause(newer);
    expect(newerSave).toMatchObject({campaignId:null,challengeId:null});
    expect(newerSave.game.difficulty).toBe('hard');
    const durable=await newer.evaluate(key=>localStorage.getItem(key),SAVE);

    // Explicitly run beforeunload: Playwright's default page.close() skips it.
    // A conflict warning is allowed; accepting means leave the stale tab, not
    // consent to overwrite the other tab's independently saved battle.
    page.on('dialog',dialog=>dialog.accept());
    await Promise.all([
      page.waitForEvent('close'),
      page.close({runBeforeUnload:true}),
    ]);
    expect(await newer.evaluate(key=>localStorage.getItem(key),SAVE)).toBe(durable);
    expect(await snapshot(newer)).toMatchObject({campaignId:null,challengeId:null});
    expect(errors,'uncaught errors in the newer tab').toEqual([]);
  } finally {
    await newer.close();
  }
});

test('landscape campaign content keeps more than 120px usable height with a saved mission',async ({page})=>{
  await openCampaign(page); await press(page,'#start'); await pause(page);
  await press(page,'#saveExit');
  await expect(page.locator('#resumeSaved')).toBeVisible();
  await expect(page.locator('#campaignConfig')).toBeVisible();
  await page.setViewportSize({width:844,height:390});
  await page.locator('#campaignConfig').scrollIntoViewIfNeeded();
  await expect(page.locator('#resumeSaved')).toBeVisible();
  await expect.poll(()=>page.locator('#campaignConfig').evaluate(element=>{
    const r=element.getBoundingClientRect();
    return Math.min(element.clientHeight,Math.min(r.bottom,innerHeight)-Math.max(r.top,0));
  }),{message:'Landscape mission content must not collapse to a roughly 10px scroll strip'}).toBeGreaterThan(120);
});
