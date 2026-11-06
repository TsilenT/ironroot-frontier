import {test as base,expect} from '@playwright/test';
import {openBuildControls,prepareBuildControl} from './shared-build-controls.mjs';
import {Game} from '../../dist/engine.js';
import {createCampaignProgress} from '../../dist/campaign.js';
const SAVE='ironroot.battle.v1', PROGRESS='ironroot.campaign.v1';
const test=base.extend({page:async({page},use)=>{const errors=[];page.on('pageerror',e=>errors.push(e.message));await use(page);expect(errors).toEqual([]);}});
test.setTimeout(40000);
async function press(page,selector){if(await prepareBuildControl(page,selector))return;const e=page.locator(selector);if(await page.evaluate(()=>navigator.maxTouchPoints>0))await e.tap();else await e.click();}
const saved=page=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),SAVE);
async function fresh(page,id='first-watch'){
  await page.goto('/');
  if(id==='emberwatch'){await press(page,'[data-chapter="embers"]');await press(page,'[data-mission="emberwatch"]');}
  await press(page,'#start');await expect(page.locator('#coachingModal')).toBeVisible();
}
async function place(page,type,x,y=450){
  await press(page,`[data-type="${type}"]`);await press(page,'#home');
  const r=await page.locator('#battle').boundingBox(),scale=Math.max(.32,r.height/900),half=r.width/(2*scale),camera=half>=1600?1600:Math.max(half,450);
  const p={x:r.x+r.width/2+(x-camera)*scale,y:r.y+r.height/2+(y-450)*scale};
  if(await page.evaluate(()=>navigator.maxTouchPoints>0))await page.touchscreen.tap(p.x,p.y);else await page.mouse.click(p.x,p.y);
  await expect(page.locator('#toast')).toContainText('raised');
}

test('reading and paid construction stop both armies, clocks and income until explicit Resume',async({page})=>{
  await fresh(page);
  await expect(page.locator('#coachingPlan')).toBeFocused();
  await expect(page.locator('#app')).toHaveAttribute('inert','');
  const before=await saved(page);await page.waitForTimeout(1100);expect(await saved(page)).toEqual(before);
  await press(page,'#coachingPlan');await place(page,'barracks',550);await place(page,'archery',410);
  await openBuildControls(page);await expect(page.locator('#coachTitle')).toHaveText('Follow your army');
  await expect(page.locator('#time')).toHaveText('00:00');await expect(page.locator('#gold')).toHaveText('105');
  await page.waitForTimeout(1100);await expect(page.locator('#time')).toHaveText('00:00');await expect(page.locator('#gold')).toHaveText('105');
  await press(page,'#coachResume');await expect(page.locator('#time')).not.toHaveText('00:00');
  await press(page,'#pause');const result=await saved(page);
  expect(result.game.state.buildings.filter(b=>b.side===0)).toHaveLength(2);
  expect(result.game.state.gold[0]).toBeCloseTo(105+5*result.game.state.time,1);
  expect(result.game.state.units.length).toBeGreaterThan(0);Game.restore(result.game);
  expect(JSON.stringify(result)).not.toMatch(/coachingHold|teachingPause/);
});

test('another composition, legal unmarked sites and hiding hints preserve player agency',async({page})=>{
  await fresh(page);await press(page,'#coachingPlan');await press(page,'#allBuildings');
  await place(page,'foundry',410);
  await openBuildControls(page);await expect(page.locator('#coachTitle')).toHaveText('Build a barracks');
  await expect(page.locator('#time')).toHaveText('00:00');
  await press(page,'#toggleCoach');await expect(page.locator('#campaignCoach')).toBeHidden();
  await expect(page.locator('#time')).not.toHaveText('00:00');
  await press(page,'#pause');const result=await saved(page);
  expect(result.game.state.buildings.some(b=>b.side===0&&b.type==='foundry'&&b.x===410)).toBe(true);
  expect(result.game.state.buildings.some(b=>b.side===0&&b.type==='barracks')).toBe(false);
});

test('start now, manual pause, preferences and optional teaching replay require deliberate transitions',async({page})=>{
  await fresh(page,'emberwatch');await press(page,'#coachingPlay');
  await expect(page.locator('#time')).not.toHaveText('00:00');
  await press(page,'#pause');const t=await page.locator('#time').innerText();
  await press(page,'#pauseSettings');await press(page,'#closeSettings');
  await expect(page.locator('#pauseVeil')).toBeVisible();await expect(page.locator('#time')).toHaveText(t);
  await press(page,'#resume');await press(page,'#coachReplay');
  await expect(page.locator('#coachingModal')).toBeVisible();
  await page.keyboard.press('Escape');await expect(page.locator('#coachingModal')).toBeHidden();
  const frozen=await page.locator('#time').innerText();await page.waitForTimeout(1100);await expect(page.locator('#time')).toHaveText(frozen);
  await press(page,'#pause');await expect(page.locator('#time')).not.toHaveText(frozen);
});

test('saved planning construction resumes normally and completed replay skips the automatic hold',async({page})=>{
  await fresh(page);await press(page,'#coachingPlan');await place(page,'barracks',550);
  await press(page,'#pause'); // Explicitly leave teaching, then open manual pause.
  await press(page,'#pause');await press(page,'#saveExit');
  await page.reload();await press(page,'#resumeSaved');
  await expect(page.locator('#coachingModal')).toBeHidden();await expect(page.locator('#time')).not.toHaveText('00:00');
  await press(page,'#pause');const result=await saved(page);expect(result.game.state.buildings.some(b=>b.side===0&&b.x===550)).toBe(true);
  await press(page,'#saveExit');
  const completed=createCampaignProgress();completed.missions['first-watch']={completed:true,stars:1,bestTime:30};
  await page.evaluate(({key,value})=>localStorage.setItem(key,JSON.stringify(value)),{key:PROGRESS,value:completed});
  await page.reload();await press(page,'[data-chapter="first-roads"]');await press(page,'[data-mission="first-watch"]');await press(page,'#start');
  await expect(page.locator('#coachingModal')).toBeHidden();await expect(page.locator('#time')).not.toHaveText('00:00');
});

test('visibility interruption while planning requires explicit resume and cannot buy with a held gesture',async({page,context})=>{
  await fresh(page);await press(page,'#coachingPlan');await press(page,'[data-type="barracks"]');
  const r=await page.locator('#battle').boundingBox(),p={x:r.x+r.width/2,y:r.y+r.height/2};
  const touch=await page.evaluate(()=>navigator.maxTouchPoints>0),cdp=touch?await context.newCDPSession(page):null;
  if(touch)await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[p]});else{await page.mouse.move(p.x,p.y);await page.mouse.down();}
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});
  await expect(page.locator('#pauseVeil')).toBeVisible();
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>false});document.dispatchEvent(new Event('visibilitychange'));});
  if(touch)await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});else await page.mouse.up();
  await page.waitForTimeout(1100);await expect(page.locator('#time')).toHaveText('00:00');
  expect((await saved(page)).game.state.buildings.filter(b=>b.side===0)).toHaveLength(0);
  await press(page,'#resume');await expect(page.locator('#time')).not.toHaveText('00:00');
});

test('keyboard focus stays in the teaching dialog and Space on its buttons does not leak into battle',async({page})=>{
  await fresh(page);await page.keyboard.press('Shift+Tab');await expect(page.locator('#coachingPlay')).toBeFocused();
  await page.keyboard.press('Tab');await expect(page.locator('#coachingPlan')).toBeFocused();
  await page.keyboard.press('Space');await expect(page.locator('#coachingModal')).toBeHidden();
  await page.waitForTimeout(1100);await expect(page.locator('#time')).toHaveText('00:00');
  await page.locator('#battle').focus();await page.keyboard.press('Space');await expect(page.locator('#time')).not.toHaveText('00:00');
});

test('a fresh suggested army earns a real win and Continue opens the next teaching mission',async({page},testInfo)=>{
  test.skip(testInfo.project.name!=='desktop','One complete real-time route; touch paid construction is covered separately.');
  test.setTimeout(110000);
  await fresh(page);await press(page,'#coachingPlan');
  // The documented renderer transform includes camera clamping on wide views.
  // These are the independently verified opening suggestions, paid through UI.
  await place(page,'barracks',970);
  await place(page,'archery',830);
  await openBuildControls(page);await expect(page.locator('#coachTitle')).toHaveText('Follow your army');
  await press(page,'#coachResume');await press(page,'#speed');await press(page,'#speed');
  await expect(page.locator('#resultTitle')).toHaveText('MISSION COMPLETE',{timeout:95000});
  const result=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),PROGRESS);
  expect(result.missions['first-watch'].completed).toBe(true);
  await press(page,'#playAgain');await expect(page.locator('#campaignMissionTitle')).toHaveText('Forked Road');
  await press(page,'#start');await expect(page.locator('#coachingTitle')).toHaveText('Plan for both roads');
  expect((await saved(page)).game.state.time).toBe(0);
  await press(page,'#coachingPlan');
  await place(page,'barracks',970,340);await press(page,'#cancelBuild');
  await place(page,'barracks',970,560);await press(page,'#cancelBuild');
  await openBuildControls(page);await expect(page.locator('#coachTitle')).toHaveText('Build a gold mine');
  await expect(page.locator('#gold')).toHaveText('330');
  await expect(page.locator('#time')).toHaveText('00:00');
});

test('teaching dialog, real controls and a suggestion are visible at the current viewport',async({page},testInfo)=>{
  await fresh(page);
  const dialog=page.locator('#coachingModal [role="dialog"]');
  const r=await dialog.boundingBox(),v=page.viewportSize();expect(r.x).toBeGreaterThanOrEqual(0);expect(r.y).toBeGreaterThanOrEqual(0);expect(r.y+r.height).toBeLessThanOrEqual(v.height);
  for(const id of ['coachingPlan','coachingPlay']){const b=await page.locator('#'+id).boundingBox();expect(b.height).toBeGreaterThanOrEqual(44);}
  await page.screenshot({path:testInfo.outputPath('teaching-dialog.png')});
  await press(page,'#coachingPlan');await press(page,'[data-type="barracks"]');
  await expect(page.locator('#battle')).toBeVisible();await expect(page.locator('#pause')).toHaveAttribute('aria-label','Resume game');
  await page.screenshot({path:testInfo.outputPath('suggested-site.png')});
});

test('viewport safety covers the reading dialog and remains usable until an explicit safe Resume',async({page})=>{
  await fresh(page);const original=page.viewportSize();
  await page.setViewportSize({width:320,height:250});
  await expect(page.locator('#viewportModal')).toBeVisible();
  await expect(page.locator('#viewportResume')).toBeDisabled();
  await page.setViewportSize(original);
  await expect(page.locator('#viewportResume')).toBeEnabled();
  const hit=await page.locator('#viewportResume').evaluate(e=>{const r=e.getBoundingClientRect();return document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest('button')===e;});
  expect(hit,'the foreground safety control must be hit-testable above the inert teaching dialog').toBe(true);
  await expect(page.locator('#time')).toHaveText('00:00');
  await press(page,'#viewportResume');
  await expect(page.locator('#coachingModal')).toBeHidden();
  await expect(page.locator('#time')).not.toHaveText('00:00');
});
