// Companion to the unchanged phone-viewport suite. Fixtures only seed a valid
// saved mission; layout, input, hit testing, time and pause state are real DOM.
import {expect} from '@playwright/test';
import {CAMPAIGN_STORAGE_KEY} from '../../dist/campaign.js';
import {campaignFixture} from './campaign-fixtures.mjs';
import {test,press,seedOnce,saved} from './map-browser-helpers.mjs';
import {inspectPhoneText,settlePhoneViewport,savedClockText} from './phone-text-evidence.mjs';

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
 const g=await page.evaluate(()=>{
  const r=e=>{const b=e.getBoundingClientRect();return {left:b.left,top:b.top,right:b.right,bottom:b.bottom,width:b.width,height:b.height};};
  const app=document.getElementById('app'),root=r(app),s=getComputedStyle(app);
  const safe={left:root.left+parseFloat(s.paddingLeft),right:root.right-parseFloat(s.paddingRight),top:root.top+parseFloat(s.paddingTop),bottom:root.bottom-parseFloat(s.paddingBottom)};
  const controls=[...document.querySelectorAll('#pause,#speed,#sound,#settings,#home,#front,#minimap,#compactBuild,[data-protected-id],#coachResume:not(.hidden),#toggleCoach:not(.hidden)')].map(e=>({id:e.id||e.dataset.protectedId,...r(e),hit:e.contains(document.elementFromPoint(r(e).left+r(e).width/2,r(e).top+r(e).height/2))}));
  const world=r(document.getElementById('battle')),regions=['topbar','protectedNavigation','protectedDock','campaignTeaching'].map(id=>({id,...r(document.getElementById(id))}));
  const overlaps=(a,b)=>a.left<b.right-.5&&a.right>b.left+.5&&a.top<b.bottom-.5&&a.bottom>b.top+.5;
  return {safe,world,regions,controls,collisions:controls.flatMap((a,i)=>controls.slice(i+1).filter(b=>overlaps(a,b)).map(b=>[a.id,b.id])),covered:controls.some(c=>overlaps(c,world))};
 });
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
 await page.addStyleTag({content:'.app.protected-mobile { --mobile-inset-bottom: 21px; }'});
 await page.setViewportSize({width:320,height:431});await page.setViewportSize({width:320,height:430});
 const g=await assertLayout(page);expect(g.world.height).toBeCloseTo(257,1);
 const clock=await page.locator('#time').textContent();await expect(page.locator('#time')).not.toHaveText(clock,{timeout:6000});
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
 const held=await saved(page),clock=savedClockText(held);
 await expect(page.locator('#time')).toHaveText(clock);
 await page.waitForTimeout(1100);expect(await saved(page)).toEqual(held);await expect(page.locator('#time')).toHaveText(clock);
 await page.setViewportSize({width:320,height:400});await settlePhoneViewport(page);
 await expect(page.locator('#viewportTitle')).toHaveText('Battle ready to resume');
 await expect(page.locator('#viewportResume')).toBeEnabled();
 await page.waitForTimeout(1100);expect(await saved(page)).toEqual(held);await expect(page.locator('#time')).toHaveText(clock);
 await press(page,'#viewportResume');await assertLayout(page);
 await expect(page.locator('#time')).not.toHaveText(clock,{timeout:6000});
});
