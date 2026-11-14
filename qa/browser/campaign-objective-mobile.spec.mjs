// Native mission launch with earned prerequisite progress. Chromium viewport,
// touch and explicit safe-area emulation are not physical-device certification.
import {expect} from '@playwright/test';
import {dynamicCampaignCheckpoint} from './campaign-objective-fixtures.mjs';
import {CAMPAIGN_STORAGE_KEY,createCampaignProgress,getProgressionCampaignOverview,getCampaignLaunchMission,normalizeCampaignProgress} from '../../dist/campaign.js';
import {test,press,seedOnce,saved} from './map-browser-helpers.mjs';
import {inspectPhoneText,settlePhoneViewport} from './phone-text-evidence.mjs';
import {inspectMobileBattlefield,installViewportSafetyWatch} from './mobile-safety-evidence.mjs';

const REEDS='through-the-reed-beds';
function earnedProgress(id){
 const progress=createCampaignProgress(),missions=getProgressionCampaignOverview(progress).missions;
 const index=missions.findIndex(mission=>mission.id===id);expect(index).toBeGreaterThan(0);
 for(const mission of missions.slice(0,index))progress.missions[mission.id]={completed:true,stars:1,bestTime:120};
 expect(normalizeCampaignProgress(progress)).toEqual(progress);return progress;
}
async function startMission(page,id=REEDS){
 const progress=earnedProgress(id),mission=getCampaignLaunchMission(id,progress);
 await seedOnce(page,{[CAMPAIGN_STORAGE_KEY]:JSON.stringify(progress)});
 await page.evaluate(installViewportSafetyWatch);
 await press(page,'#campaignStoryNav');await press(page,`[data-chapter="${mission.chapterId}"]`);
 await press(page,`[data-mission="${id}"]`);await press(page,'#start');
 await expect(page.locator('#welcome')).toBeHidden();return progress;
}
async function assertSafe(page){
 await settlePhoneViewport(page);await expect(page.locator('#viewportModal')).toBeHidden();
 const g=await page.evaluate(inspectMobileBattlefield);
 expect(g.world.height).toBeGreaterThanOrEqual(211.5);expect(g.collisions).toEqual([]);expect(g.covered).toBe(false);
 for(const c of g.controls){
  expect(c.width,c.id).toBeGreaterThanOrEqual(43.5);expect(c.height,c.id).toBeGreaterThanOrEqual(43.5);expect(c.hit,c.id).toBe(true);
  expect(c.left,c.id).toBeGreaterThanOrEqual(g.safe.left-.5);expect(c.right,c.id).toBeLessThanOrEqual(g.safe.right+.5);
  expect(c.top,c.id).toBeGreaterThanOrEqual(g.safe.top-.5);expect(c.bottom,c.id).toBeLessThanOrEqual(g.safe.bottom+.5);
 }
 for(const label of await page.evaluate(inspectPhoneText,{selector:'[data-protected-id] .protected-name,[data-protected-id] .protected-health'})){
  expect(label.complete,JSON.stringify(label)).toBe(true);expect(label.overflow,label.text).toBe(false);
 }
 const clock=await page.locator('#time').textContent();await expect(page.locator('#time')).not.toHaveText(clock,{timeout:6000});
 expect(await page.evaluate(()=>window.__qaViewportSafetySamples.filter(sample=>sample.visible))).toEqual([]);
 return g;
}
// These cases choose their own boundary dimensions; run once, on the touch
// project, rather than repeating identical dimensions for every project.
test.beforeEach(async({},info)=>{test.skip(info.project.name!=='phone','explicit touch viewport matrix');});

for(const size of [{width:320,height:430},{width:320,height:568},{width:375,height:568},{width:385,height:568}]){
 test(`Reed Beds full names and native controls fit ${size.width}x${size.height}`,async({page})=>{
  await page.setViewportSize(size);await startMission(page);await assertSafe(page);
  await expect(page.locator('[data-protected-id] .protected-name')).toHaveText(['North Reed Watch','Middle Iron Works','South Ember Hall']);
  for(const target of await page.locator('[data-protected-id]').all()){
   await target.tap();await expect(page.locator('#toast')).toContainText('Showing '+await target.locator('.protected-name').textContent());
  }
  await press(page,'#compactBuild');await expect(page.locator('#commandDeck')).toBeVisible();
  await press(page,'#compactBuild');await assertSafe(page);
 });
}

test('Reed Beds rotates, crosses the usable-width boundary and resumes its real checkpoint',async({page})=>{
 test.setTimeout(45000);await page.setViewportSize({width:320,height:430});const progress=await startMission(page);await assertSafe(page);
 for(const size of [{width:568,height:320},{width:386,height:416},{width:390,height:416},{width:320,height:430}]){
  await page.setViewportSize(size);await assertSafe(page);
 }
 await press(page,'#pause');const checkpoint=await saved(page);expect(checkpoint).not.toBeNull();
 await press(page,'#saveExit');await expect(page.locator('#welcome')).toBeVisible();
 await press(page,'#resumeSaved');await assertSafe(page);
 expect(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),CAMPAIGN_STORAGE_KEY)).toEqual(progress);
});

test('usable width accounts for explicit safe areas in PWA-like portrait layout',async({page})=>{
 await page.setViewportSize({width:390,height:568});
 // Synthetic standalone flag and insets only; no mocked geometry or game state.
 await page.addInitScript(()=>Object.defineProperty(navigator,'standalone',{get:()=>true,configurable:true}));
 await startMission(page);
 const insets=await page.addStyleTag({content:'.app.protected-mobile { --mobile-inset-left: 3px; --mobile-inset-right: 3px; --mobile-inset-bottom: 21px; }'});
 const g=await assertSafe(page);expect(g.safe.right-g.safe.left).toBeCloseTo(384,1);
 await expect(page.locator('#app')).toHaveClass(/narrow-targets/);
 await insets.evaluate(element=>element.remove());await assertSafe(page);
 await expect(page.locator('#app')).not.toHaveClass(/narrow-targets/);
});

test('shorter Ashen Crossroads labels retain the original 212px battlefield',async({page})=>{
 await page.setViewportSize({width:320,height:416});await page.goto('/');await page.evaluate(installViewportSafetyWatch);
 await press(page,'[data-mode="challenges"]');
 await press(page,'#challengeChoices button:has-text("Ashen Crossroads")');await press(page,'#start');
 const g=await assertSafe(page);expect(g.world.height).toBeCloseTo(212,1);
 await expect(page.locator('#app')).not.toHaveClass(/narrow-targets/);
});

test('a genuinely undersized Reed Beds viewport still pauses and needs explicit recovery',async({page})=>{
 await page.setViewportSize({width:320,height:430});await startMission(page);await assertSafe(page);
 await page.setViewportSize({width:320,height:416});await expect(page.locator('#viewportModal')).toBeVisible();
 await expect(page.locator('#viewportResume')).toBeDisabled();const checkpoint=await saved(page);
 await page.waitForTimeout(1100);expect(await saved(page)).toEqual(checkpoint);
 await page.setViewportSize({width:320,height:430});await expect(page.locator('#viewportResume')).toBeEnabled();
 expect(await saved(page)).toEqual(checkpoint);await press(page,'#viewportResume');
 await page.evaluate(installViewportSafetyWatch);await assertSafe(page);
});

for(const size of [{width:320,height:430},{width:390,height:650},{width:402,height:568},{width:403,height:416}]){
 test(`Ramparts full names fit ${size.width}x${size.height} with the correct wrap boundary`,async({page})=>{
  await page.setViewportSize(size);await startMission(page,'below-the-ramparts');const g=await assertSafe(page);
  await expect(page.locator('[data-protected-id] .protected-name')).toHaveText(['North Breach Post','Middle Breach Post','South Breach Post']);
  if(size.width<403)await expect(page.locator('#app')).toHaveClass(/narrow-targets/);
  else{await expect(page.locator('#app')).not.toHaveClass(/narrow-targets/);expect(g.world.height).toBeCloseTo(212,1);}
  await page.locator('[data-protected-id]').nth(1).tap();await expect(page.locator('#toast')).toContainText('Showing Middle Breach Post');
 });
}
for(const id of ['the-last-granary','cut-the-bowstrings']){
 test(`${id} uses two full-width cards without reducing the short battlefield`,async({page})=>{
  await page.setViewportSize({width:320,height:416});await startMission(page,id);const g=await assertSafe(page);
  expect(g.world.height).toBeCloseTo(212,1);await expect(page.locator('[data-protected-id]')).toHaveCount(2);
  for(const target of await page.locator('[data-protected-id]').all()){
   expect((await target.boundingBox()).width).toBeGreaterThan(140);await target.tap();await expect(page.locator('#toast')).toContainText('Showing');
  }
  await page.setViewportSize({width:568,height:320});await assertSafe(page);
  await page.setViewportSize({width:320,height:416});await assertSafe(page);
 });
}

for(const id of ['through-the-reed-beds','below-the-ramparts','the-last-granary','cut-the-bowstrings']){
 test(`${id} retains full names and controls after one original position falls`,async({page})=>{
  const fixture=await dynamicCampaignCheckpoint(new URL('../../dist/',import.meta.url),id,'cleared-first');
  await page.setViewportSize({width:320,height:430});await seedOnce(page,fixture.values);
  await page.evaluate(installViewportSafetyWatch);await press(page,'#resumeSaved');
  await expect(page.locator('[data-protected-id]').first()).toBeDisabled();
  await expect(page.locator('[data-protected-id] .protected-health').first()).toHaveText('Destroyed');
  await assertSafe(page);await page.setViewportSize({width:568,height:320});await assertSafe(page);
  await page.locator('[data-protected-id]').nth(1).tap();await expect(page.locator('#toast')).toContainText('Showing');
 });
}
