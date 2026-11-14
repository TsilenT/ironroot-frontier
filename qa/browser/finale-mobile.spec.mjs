// Codec-admitted synthetic production checkpoints. Native Resume, drawing and
// touch only after launch; this is emulation, not a paid campaign playthrough.
import {objectiveRegionGeometry,readObjectiveText} from './objective-region-evidence.mjs';
import {expect} from '@playwright/test';
import {test,press,seedOnce,saved} from './map-browser-helpers.mjs';
import {dynamicCampaignCheckpoint} from './campaign-objective-fixtures.mjs';
import {inspectPhoneText,settlePhoneViewport} from './phone-text-evidence.mjs';
import {inspectMobileBattlefield,installViewportSafetyWatch} from './mobile-safety-evidence.mjs';
const dist=new URL('../../dist/',import.meta.url);
test.beforeEach(async({},info)=>{test.skip(info.project.name!=='phone','explicit touch viewport matrix');});
for(const state of ['both','core-first','boss-first','approach','siege'])for(const size of [{width:320,height:416},{width:320,height:430},{width:390,height:650},{width:568,height:320}]){
 test(`revealed finale ${state} keeps goals and phase inside ${size.width}x${size.height}`,async({page})=>{
  const fixture=await dynamicCampaignCheckpoint(dist,'the-last-engine',state);
  await page.setViewportSize(size);await seedOnce(page,fixture.values);await page.evaluate(installViewportSafetyWatch);
  await press(page,'#resumeSaved');await settlePhoneViewport(page);await expect(page.locator('#viewportModal')).toBeHidden();
  const g=await page.evaluate(objectiveRegionGeometry);expect(g.world.height).toBeGreaterThanOrEqual(211.5);
  expect(g.shell.safe).toBe(true);expect(g.local.safe).toBe(true);for(const c of g.controls)expect(c.hit,c.id).toBe(true);
  for(const text of await readObjectiveText(page,inspectPhoneText,'#objectiveProgress,#objectiveTime')){
   expect(text.complete,JSON.stringify(text)).toBe(true);expect(text.overflow,text.text).toBe(false);
  }
  // Full instructions remain available to assistive technology and Pause while
  // the visual progress label keeps both required targets and current HP clear.
  const progress=page.locator('#objectiveProgress');
  await expect(progress).toHaveAttribute('aria-label',/keep your citadel standing|keep yours standing/);
  if(state==='core-first'){await expect(progress).toContainText('Citadel down');await expect(progress).toHaveAttribute('aria-label',/Defeat the Last Engine/);}
  else if(state==='boss-first'){await expect(progress).toContainText('Engine down');await expect(progress).toHaveAttribute('aria-label',/Destroy the enemy citadel/);}
  else{await expect(progress).toContainText('Destroy Engine + citadel');await expect(progress).toContainText(/\d+\/10000 HP/);}
  const clock=await page.locator('#time').textContent();await expect(page.locator('#time')).not.toHaveText(clock,{timeout:6000});
  expect(await page.evaluate(()=>window.__qaViewportSafetySamples.filter(x=>x.visible))).toEqual([]);
  await press(page,'#pause');const checkpoint=await saved(page);expect(checkpoint.scenario.id).toBe('the-last-engine');
  await expect(page.locator('#pauseObjective')).toContainText(/keep (?:your citadel|yours) standing/);
 });
}
