// Companion to the unchanged phone-viewport suite. Fixtures only seed a valid
// saved mission; layout, input, hit testing, time and pause state are real DOM.
import {expect} from '@playwright/test';
import {CAMPAIGN_STORAGE_KEY} from '../../dist/campaign.js';
import {campaignFixture} from './campaign-fixtures.mjs';
import {test,press,seedOnce,saved} from './map-browser-helpers.mjs';
import {inspectPhoneText,settlePhoneViewport,savedClockText} from './phone-text-evidence.mjs';
import {inspectMobileBattlefield,inspectSafetyDialog,installViewportSafetyWatch} from './mobile-safety-evidence.mjs';
import {heldPointer,center} from './training-browser-helpers.mjs';

async function resumeProtected(page){
 await page.setViewportSize({width:320,height:430});
 const fixture=campaignFixture('protected');
 await seedOnce(page,{'ironroot.battle.v1':JSON.stringify(fixture.envelope),[CAMPAIGN_STORAGE_KEY]:JSON.stringify(fixture.progress)});
 await press(page,'#resumeSaved');await settlePhoneViewport(page);
 await expect(page.locator('#app')).toHaveClass(/mobile-coaching/);
 await expect(page.locator('#viewportModal')).toBeHidden();
 return fixture;
}
async function assertLayout(page){
 await settlePhoneViewport(page);await expect(page.locator('#viewportModal')).toBeHidden();
 const g=await page.evaluate(inspectMobileBattlefield);
 const topbar=g.regions.find(r=>r.id==='topbar');expect(topbar.left).toBeCloseTo(g.safe.left,1);expect(topbar.right).toBeCloseTo(g.safe.right,1);
 expect(g.world.height).toBeGreaterThanOrEqual(211.5);expect(g.world.width).toBeGreaterThanOrEqual(128);
 expect(g.controls.length).toBeGreaterThanOrEqual(11);expect(g.collisions).toEqual([]);expect(g.covered).toBe(false);
 for(const b of [g.world,...g.controls,...g.regions]){
  expect(b.left).toBeGreaterThanOrEqual(g.safe.left-.5);expect(b.right).toBeLessThanOrEqual(g.safe.right+.5);
  expect(b.top).toBeGreaterThanOrEqual(g.safe.top-.5);expect(b.bottom).toBeLessThanOrEqual(g.safe.bottom+.5);
 }
 for(const c of g.controls){expect(c.width,c.id).toBeGreaterThanOrEqual(43.5);expect(c.height,c.id).toBeGreaterThanOrEqual(43.5);expect(c.hit,c.id).toBe(true);}
 for(const label of await page.evaluate(inspectPhoneText,{selector:'[data-protected-id] .protected-name,[data-protected-id] .protected-health,#gold,#time,#objectiveProgress,#objectiveTime'})){
  expect(label.complete,JSON.stringify(label)).toBe(true);expect(label.overflow,label.text).toBe(false);
 }
 await expect(page.locator('#campaignTeaching')).toBeVisible();await expect(page.locator('#campaignCoach')).toBeVisible();
 const next=await page.evaluate(inspectPhoneText,{selector:'#coachNext',ownerSelector:'#campaignCoach',minimumFont:12});
 expect(next).toHaveLength(1);expect(next[0].complete,JSON.stringify(next[0])).toBe(true);
 return g;
}

async function assertSafetyForeground(page){
 await expect(page.locator('#viewportModal')).toBeVisible();
 await expect(page.locator('#viewportModal [role="dialog"]')).toHaveAttribute('aria-hidden','false');
 await expect(page.locator('#viewportExit')).toBeEnabled();
 const evidence=await page.evaluate(inspectSafetyDialog);
 expect(evidence).toMatchObject({ariaHidden:'false',focusInside:true,appInert:true,pauseInert:true});
 for(const control of evidence.controls){
  expect(control.width,control.id).toBeGreaterThanOrEqual(43.5);expect(control.height,control.id).toBeGreaterThanOrEqual(43.5);
  expect(control.inside,control.id+' inside visible viewport').toBe(true);
  expect(control.inert,control.id+' belongs to the active dialog').toBe(false);
  expect(control.hit,control.id+' is above the paused battle/menu').toBe(true);
 }
}

test('320x430 protected resume retains teaching, 44px controls and an advancing clock',async({page})=>{
 await resumeProtected(page);const g=await assertLayout(page);
 expect(g.world.width).toBeCloseTo(216,1);expect(g.world.height).toBeCloseTo(278,1);
 const clock=await page.locator('#time').textContent();await expect(page.locator('#time')).not.toHaveText(clock,{timeout:6000});
 await press(page,'[data-protected-id]:first-child');await expect(page.locator('#toast')).toContainText('Showing');
 await expect(page.locator('#toast')).toHaveClass(/show/);
 await expect.poll(()=>page.locator('#toast').evaluate(e=>{const t=e.getBoundingClientRect(),f=document.getElementById('battlefield').getBoundingClientRect();return t.left>=f.left-.5&&t.right<=f.right+.5&&t.top>=f.top-.5&&t.bottom<=f.bottom+.5;})).toBe(true);
 await assertLayout(page);
 await press(page,'#compactBuild');await expect(page.locator('#commandDeck')).toBeVisible();
 const drawer=await page.locator('#commandDeck').boundingBox(),field=await page.locator('#battle').boundingBox();
 expect(drawer.x).toBeCloseTo(field.x,1);expect(drawer.x+drawer.width).toBeCloseTo(field.x+field.width,1);
 expect(drawer.y).toBeGreaterThanOrEqual(field.y-.5);expect(drawer.y+drawer.height).toBeLessThanOrEqual(field.y+field.height+.5);
 await press(page,'#compactBuild');await assertLayout(page);
});

test('short coached portrait preserves explicit bottom safe area without hiding teaching',async({page})=>{
 await resumeProtected(page);
 await page.evaluate(installViewportSafetyWatch);
 const insets=await page.addStyleTag({content:'.app.protected-mobile { --mobile-inset-bottom: 21px; }'});
 const g=await assertLayout(page);expect(g.world.height).toBeCloseTo(257,1);
 const clock=await page.locator('#time').textContent();await expect(page.locator('#time')).not.toHaveText(clock,{timeout:6000});
 // Removal must also be detected without the old 431px/430px resize nudge.
 await insets.evaluate(element=>element.remove());
 const restored=await assertLayout(page);expect(restored.world.height).toBeCloseTo(278,1);
 const restoredClock=await page.locator('#time').textContent();await expect(page.locator('#time')).not.toHaveText(restoredClock,{timeout:6000});
 expect(await page.evaluate(()=>window.__qaViewportSafetySamples.filter(sample=>sample.visible))).toEqual([]);
});

test('coached portrait can resize tall, short and tall without stale side-rail geometry',async({page})=>{
 await resumeProtected(page);await assertLayout(page);
 await page.setViewportSize({width:393,height:659});await assertLayout(page);
 await page.setViewportSize({width:320,height:430});await assertLayout(page);
 await page.setViewportSize({width:393,height:659});await assertLayout(page);
 const clock=await page.locator('#time').textContent();await expect(page.locator('#time')).not.toHaveText(clock,{timeout:6000});
});


test('unsafe short coached rail freezes the save and needs explicit Resume after safe recovery',async({page})=>{
 await resumeProtected(page);await assertLayout(page);
 const initialClock=await page.locator('#time').textContent();
 await expect(page.locator('#time')).not.toHaveText(initialClock,{timeout:6000});
 await page.setViewportSize({width:320,height:370});await settlePhoneViewport(page);
 await expect(page.locator('#viewportTitle')).toHaveText('Battle paused for screen size');
 await expect(page.locator('#viewportResume')).toBeDisabled();
 await assertSafetyForeground(page);await expect(page.locator('#viewportExit')).toBeFocused();
 // This boundary is unsafe despite adequate world height. Pausing must not
 // reflow Hide/minimap into a different, falsely resumable geometry.
 expect((await page.evaluate(inspectMobileBattlefield)).world.height).toBeGreaterThanOrEqual(211.5);
 await page.evaluate(installViewportSafetyWatch);
 const held=await saved(page),clock=savedClockText(held);
 await expect(page.locator('#time')).toHaveText(clock);
 await page.waitForTimeout(1100);expect(await saved(page)).toEqual(held);await expect(page.locator('#time')).toHaveText(clock);
 for(let cycle=0;cycle<2;cycle++){
  await page.keyboard.press('Tab');await expect(page.locator('.viewport-message')).toBeFocused();
  await page.keyboard.press('Tab');await expect(page.locator('#viewportExit')).toBeFocused();
  await page.waitForTimeout(1100);
  await expect(page.locator('#viewportTitle')).toHaveText('Battle paused for screen size');
  await expect(page.locator('#viewportResume')).toBeDisabled();await assertSafetyForeground(page);
  expect(await saved(page)).toEqual(held);await expect(page.locator('#time')).toHaveText(clock);
 }
 expect(await page.evaluate(()=>window.__qaViewportSafetySamples.every(sample=>sample.visible&&sample.resumeDisabled&&sample.title==='Battle paused for screen size')),'blocked safety state must survive every HUD cycle').toBe(true);
 await page.setViewportSize({width:320,height:400});await settlePhoneViewport(page);
 await expect(page.locator('#viewportTitle')).toHaveText('Battle ready to resume');
 await expect(page.locator('#viewportResume')).toBeEnabled();await assertSafetyForeground(page);
 await page.keyboard.press('Tab');await expect(page.locator('.viewport-message')).toBeFocused();
 await page.keyboard.press('Tab');await expect(page.locator('#viewportResume')).toBeFocused();
 await page.waitForTimeout(1100);expect(await saved(page)).toEqual(held);await expect(page.locator('#time')).toHaveText(clock);
 await press(page,'#viewportResume');await assertLayout(page);
 await expect(page.locator('#time')).not.toHaveText(clock,{timeout:6000});
 await page.evaluate(installViewportSafetyWatch);
 for(let cycle=0;cycle<2;cycle++){
  const playingClock=await page.locator('#time').textContent();
  await expect(page.locator('#time')).not.toHaveText(playingClock,{timeout:6000});await assertLayout(page);
  await expect(page.locator('#pause')).toHaveAttribute('aria-label','Pause game');
 }
 expect(await page.evaluate(()=>window.__qaViewportSafetySamples.filter(sample=>sample.visible)),'explicit safe Resume must not enter another pause loop').toEqual([]);
});

test('padding-only changes cancel a held control once while stable inset geometry accepts fresh gestures',async({page,context})=>{
 await resumeProtected(page);await assertLayout(page);await page.evaluate(installViewportSafetyWatch);
 const sound=page.locator('#sound'),before=await sound.getAttribute('aria-label');
 const point=await center(page,'#sound'),held=await heldPointer(page,context,point);
 let insets;
 try{
  insets=await page.addStyleTag({content:'.app.protected-mobile { --mobile-inset-bottom: 21px; }'});
  await assertLayout(page);await page.waitForTimeout(350);
  // The target itself has not moved away from the native release location.
  // Only the content-rectangle change should invalidate the old gesture.
  expect(await center(page,'#sound')).toEqual(point);
  await held.release();
 }finally{await held.dispose();}
 await expect(sound).toHaveAttribute('aria-label',before);
 // A stable signature must not cancel a later valid gesture on every HUD pass.
 const fresh=await heldPointer(page,context,await center(page,'#sound'));
 try{await page.waitForTimeout(350);await fresh.release();}finally{await fresh.dispose();}
 await expect(sound).not.toHaveAttribute('aria-label',before);
 const changed=await sound.getAttribute('aria-label'),heldForRemoval=await heldPointer(page,context,await center(page,'#sound'));
 try{
  await insets.evaluate(element=>element.remove());await assertLayout(page);await page.waitForTimeout(350);
  await heldForRemoval.release();
 }finally{await heldForRemoval.dispose();}
 await expect(sound).toHaveAttribute('aria-label',changed);
 await press(page,'#sound');await expect(sound).toHaveAttribute('aria-label',before);
 await assertLayout(page);
 expect(await page.evaluate(()=>window.__qaViewportSafetySamples.filter(sample=>sample.visible))).toEqual([]);
});
