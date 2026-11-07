import {expect} from '@playwright/test';
import {Game} from '../../dist/engine.js';
import {test,press,tapPoint,homePoint,saved} from './map-browser-helpers.mjs';
import {openBuildControls} from './shared-build-controls.mjs';

async function begin(page){
  await page.goto('/');await press(page,'#start');
  await expect(page.locator('#coachingModal')).toBeHidden();
  await expect(page.locator('#coachResume')).toBeHidden();
  await expect(page.locator('#coachText')).toContainText('Battle starts automatically');
  await expect(page.locator('#time')).toHaveText('00:00');
  return Game.restore((await saved(page)).game).map;
}
async function choose(page){await openBuildControls(page);await press(page,'[data-type="barracks"]');}
async function snapshot(page){await press(page,'#settings');const snapshot=await saved(page);await press(page,'#settingsDone');return snapshot;}

test('first lesson has no choice; real paid barracks automatically starts combat and ends placement',async({page})=>{
  const map=await begin(page);await page.waitForTimeout(1200);
  const before=await snapshot(page);expect(before.game.state.time).toBe(0);expect(before.game.state.gold[0]).toBe(420);
  await choose(page);await tapPoint(page,await homePoint(page,map,550,450));
  await expect(page.locator('#battle')).not.toHaveClass(/placing/);
  await expect(page.locator('#cancelBuild')).toBeHidden();
  await expect(page.locator('#battleClockLabel')).toHaveText('BATTLE TIME');
  await expect(page.locator('#time')).not.toHaveText('00:00');
  await press(page,'#pause');const after=await saved(page);
  expect(after.game.state.buildings.filter(b=>b.side===0&&b.type==='barracks')).toHaveLength(1);
  expect(after.game.state.gold[0]).toBeCloseTo(280+after.game.state.time*5,1);
  expect(after.game.state.time).toBeGreaterThan(0);Game.restore(after.game);
  expect(JSON.stringify(after)).not.toMatch(/firstBuildHold|coachingHold|startAfterBuild/);
});

test('other choice, invalid territory, Pause and Options cannot skip the first paid barracks',async({page})=>{
  const map=await begin(page);await openBuildControls(page);await press(page,'[data-type="archery"]');
  await expect(page.locator('#toast')).toContainText('Build a barracks first');
  await press(page,'[data-type="barracks"]');await press(page,'#front');
  const box=await page.locator('#battle').boundingBox();await tapPoint(page,{x:box.x+box.width*.8,y:box.y+box.height/2});
  await expect(page.locator('#toast')).toContainText('Build in your territory');
  await press(page,'#pause');await expect(page.locator('#pauseVeil')).toBeVisible();
  const before=await saved(page);expect(before.game.state.gold[0]).toBe(420);expect(before.game.state.time).toBe(0);
  await press(page,'#resume');await expect(page.locator('#pauseVeil')).toBeHidden();
  await page.waitForTimeout(1100);expect((await snapshot(page)).game.state.time).toBe(0);
  // Resume preserves or cancels a tool according to its input boundary. Use a
  // fresh, deliberate selection rather than depending on a held input.
  if(await page.locator('#battle').evaluate(e=>e.classList.contains('placing')))await press(page,'#cancelBuild');
  await choose(page);await tapPoint(page,await homePoint(page,map,550,450));
  await expect(page.locator('#time')).not.toHaveText('00:00');
});

test('reload of the UI-only first hold resumes the existing checkpoint normally',async({page})=>{
  await begin(page);const initial=await saved(page);await page.reload();await press(page,'#resumeSaved');
  await expect(page.locator('#coachingModal')).toBeHidden();await expect(page.locator('#coachResume')).toBeHidden();
  await expect(page.locator('#time')).not.toHaveText('00:00');await press(page,'#pause');const after=await saved(page);
  expect(after.scenario).toEqual(initial.scenario);expect(after.game.rulesetId).toBe(initial.game.rulesetId);
  expect(after.game.state.buildings.filter(b=>b.side===0)).toHaveLength(0);
});

test('mouse Shift repeats remain deliberate across the automatic transition',async({page},info)=>{
  test.skip(info.project.name!=='desktop','Explicit mouse Shift workflow.');
  const map=await begin(page);await choose(page);const first=await homePoint(page,map,550,450);
  await page.keyboard.down('Shift');await page.mouse.click(first.x,first.y);await page.keyboard.up('Shift');
  await expect(page.locator('#battle')).toHaveClass(/placing/);
  await expect(page.locator('#battleClockLabel')).toHaveText('BATTLE TIME');
  await tapPoint(page,await homePoint(page,map,410,450));await expect(page.locator('#battle')).not.toHaveClass(/placing/);
  await press(page,'#pause');expect((await saved(page)).game.state.buildings.filter(b=>b.side===0)).toHaveLength(2);
});
