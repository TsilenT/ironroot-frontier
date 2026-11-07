// Prepared native hit-testing regression. Requires the authorized browser runner.
// Resized touch projects are synthetic Chromium touch, not physical devices.
import {settlePhoneViewport} from './phone-text-evidence.mjs';
import {expect} from '@playwright/test';
import {CAMPAIGN_STORAGE_KEY} from '../../dist/campaign.js';
import {campaignFixture} from './campaign-fixtures.mjs';
import {test,press,tapPoint,seedOnce,saved} from './map-browser-helpers.mjs';
const SAVE='ironroot.battle.v1';
async function activateCompact(page,label,open){
  await settlePhoneViewport(page);
  const button=page.locator('#compactBuild');
  await expect(button).toHaveText(label);await expect(button).toBeEnabled();
  const hit=await button.evaluate(element=>{
    const box=element.getBoundingClientRect(),x=box.left+box.width/2,y=box.top+box.height/2;
    window.__qaCompactPointer=[];window.__qaCompactAbort?.abort();
    const abort=new AbortController();window.__qaCompactAbort=abort;
    for(const type of ['pointerdown','pointerup','click'])document.addEventListener(type,event=>{
      window.__qaCompactPointer.push({type,target:event.target.closest('button')?.id,trusted:event.isTrusted});
    },{capture:true,signal:abort.signal});
    return {x,y,width:box.width,height:box.height,own:getComputedStyle(element).pointerEvents,
      parent:getComputedStyle(element.parentElement).pointerEvents,parentId:element.parentElement.id,
      target:document.elementFromPoint(x,y)?.closest('button')?.id,inert:!!element.closest('[inert]')};
  });
  expect(hit).toMatchObject({own:'auto',target:'compactBuild',inert:false});
  expect(hit.parent).toBe(hit.parentId==='objectiveHUD'?'none':'auto');
  expect(hit.width).toBeGreaterThanOrEqual(44);expect(hit.height).toBeGreaterThanOrEqual(44);
  // Native touch on touch projects; ordinary mouse click on desktop. Never force.
  await tapPoint(page,{x:hit.x,y:hit.y});
  await expect.poll(()=>page.evaluate(()=>window.__qaCompactPointer)).toEqual([
    {type:'pointerdown',target:'compactBuild',trusted:true},
    {type:'pointerup',target:'compactBuild',trusted:true},
    {type:'click',target:'compactBuild',trusted:true},
  ]);
  await expect(button).toHaveAttribute('aria-expanded',String(open));
  if(open)await expect(page.locator('#app')).toHaveClass(/compact-build-open/);
  else await expect(page.locator('#app')).not.toHaveClass(/compact-build-open/);
  await page.evaluate(()=>window.__qaCompactAbort.abort());
}

test('compact Build Close and Cancel are native hit targets despite the noninteractive objective HUD',async({page})=>{
  test.setTimeout(40000);
  await page.setViewportSize({width:568,height:320});
  const fixture=campaignFixture('protected');
  await seedOnce(page,{[SAVE]:JSON.stringify(fixture.envelope),[CAMPAIGN_STORAGE_KEY]:JSON.stringify(fixture.progress)});
  await press(page,'#resumeSaved');await expect(page.locator('#app')).toHaveClass(/protected-compact/);
  await expect(page.locator('#welcome')).toBeHidden();
  await activateCompact(page,'Build',true);await activateCompact(page,'Close',false);
  await activateCompact(page,'Build',true);await press(page,'[data-type="barracks"]');
  await expect(page.locator('#app')).not.toHaveClass(/compact-build-open/);
  await activateCompact(page,'Cancel',false);await expect(page.locator('#battle')).not.toHaveClass(/placing/);
  await press(page,'#pause');await expect(page.locator('#compactBuild')).toBeDisabled();
  expect((await saved(page)).game.state.stats.built[0]).toBe(fixture.envelope.game.state.stats.built[0]);
  await press(page,'#resume');await activateCompact(page,'Build',true);await activateCompact(page,'Close',false);
  await press(page,'#settings');await expect(page.locator('#settingsModal')).toBeVisible();
  expect(await page.locator('#compactBuild').evaluate(e=>!!e.closest('[inert]'))).toBe(true);
  await press(page,'#settingsDone');await activateCompact(page,'Build',true);await activateCompact(page,'Close',false);
  for(const size of [{width:844,height:390},{width:320,height:480},{width:390,height:500},{width:320,height:568}]){
    await page.setViewportSize(size);await settlePhoneViewport(page);await expect(page.locator('#viewportModal')).toBeHidden();
    await activateCompact(page,'Build',true);await activateCompact(page,'Close',false);
  }
  await page.setViewportSize({width:640,height:360});
  await activateCompact(page,'Build',true);await activateCompact(page,'Close',false);
});

// Geometry plus ordinary input only. This is synthetic browser evidence, not a
// physical phone certification, and is unrun until the native owner authorizes it.
test('shared mobile field keeps controls outside the world and holds unsafe resize until explicit resume',async({page})=>{
  test.setTimeout(45000);
  await page.setViewportSize({width:320,height:480});
  const fixture=campaignFixture('protected');
  await seedOnce(page,{[SAVE]:JSON.stringify(fixture.envelope),[CAMPAIGN_STORAGE_KEY]:JSON.stringify(fixture.progress)});
  await press(page,'#resumeSaved');
  for(const size of [{width:320,height:480},{width:390,height:500},{width:320,height:568},{width:568,height:320},{width:844,height:390}]){
    await page.setViewportSize(size);await settlePhoneViewport(page);await expect(page.locator('#viewportModal')).toBeHidden();
    const geometry=await page.evaluate(()=>{
      const field=document.getElementById('battle').getBoundingClientRect();
      const ids=['pause','speed','rally','settings','home','front','compactBuild','minimap'];
      return {height:field.height,controls:ids.map(id=>{
        const e=document.getElementById(id),r=e.getBoundingClientRect();
        return {id,width:r.width,height:r.height,visible:r.left>=0&&r.top>=0&&r.right<=innerWidth+.5&&r.bottom<=innerHeight+.5,
          outside:r.right<=field.left+.5||r.left>=field.right-.5||r.bottom<=field.top+.5||r.top>=field.bottom-.5,
          hit:e.contains(document.elementFromPoint(r.left+r.width/2,r.top+r.height/2))};
      })};
    });
    expect(geometry.height).toBeGreaterThanOrEqual(211.5);
    for(const control of geometry.controls){expect(control.width).toBeGreaterThanOrEqual(43.5);expect(control.height).toBeGreaterThanOrEqual(43.5);expect(control.visible).toBe(true);expect(control.outside).toBe(true);expect(control.hit).toBe(true);}
    for(const target of await page.locator('[data-protected-id]').all())await target.scrollIntoViewIfNeeded();
    await activateCompact(page,'Build',true);await activateCompact(page,'Close',false);
  }
  // Former 568×300 is newly safe. 568×210 forces genuine grid overflow
  // below the 272px protected sidebar budget, preserving every hold assertion.
  await press(page,'#settings');await page.setViewportSize({width:568,height:210});
  await expect(page.locator('#settingsModal')).toBeVisible();
  await page.setViewportSize({width:320,height:480});await press(page,'#settingsDone');
  await expect(page.locator('#viewportModal')).toBeVisible();await expect(page.locator('#viewportResume')).toBeEnabled();
  const held=await saved(page);await page.waitForTimeout(700);expect(await saved(page)).toEqual(held);
  await press(page,'#viewportResume');await expect(page.locator('#viewportModal')).toBeHidden();
  await page.setViewportSize({width:568,height:210});await expect(page.locator('#viewportResume')).toBeDisabled();
  await expect(page.locator('#viewportExit')).toBeEnabled();
  const before=await saved(page);await page.waitForTimeout(700);expect(await saved(page)).toEqual(before);
  // The bounded tiny dialog keeps safe actions as initial focus, while its
  // labelled explanation remains reachable and scrollable with real keys.
  await page.setViewportSize({width:320,height:160});
  await expect(page.locator('#viewportExit')).toBeFocused();
  await page.keyboard.press('Tab');await expect(page.locator('.viewport-message')).toBeFocused();
  const scrollBefore=await page.locator('.viewport-message').evaluate(e=>e.scrollTop);
  await page.keyboard.press('PageDown');
  await expect.poll(()=>page.locator('.viewport-message').evaluate(e=>e.scrollTop)).toBeGreaterThan(scrollBefore);
  await page.keyboard.press('Tab');await expect(page.locator('#viewportExit')).toBeFocused();
  await page.setViewportSize({width:320,height:480});await expect(page.locator('#viewportResume')).toBeEnabled();
  await expect(page.locator('#viewportModal')).toBeVisible();await press(page,'#viewportResume');
  await activateCompact(page,'Build',true);await activateCompact(page,'Close',false);
});
