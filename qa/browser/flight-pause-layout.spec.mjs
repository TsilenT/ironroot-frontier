// Production DOM/input regression, pending execution in the authorized runner.
// No style mutation, app-state injection or relaxed clipping thresholds.
import {expect} from '@playwright/test';
import {test,press,saved} from './map-browser-helpers.mjs';
import {expectReachable} from './training-browser-helpers.mjs';
import {fullyContained} from './flight-pause-layout-geometry.mjs';

async function initialAction(page,selector) {
  const control=page.locator(selector);
  await expect(control).toBeInViewport({ratio:1});
  const measurement=await control.evaluate(element=>{
    const r=element.getBoundingClientRect(),menu=element.closest('.pause-menu'),m=menu.getBoundingClientRect();
    const hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);
    return {
      rect:{left:r.left,top:r.top,right:r.right,bottom:r.bottom},width:r.width,height:r.height,
      clip:{left:Math.max(0,m.left+menu.clientLeft),top:Math.max(0,m.top+menu.clientTop),
        right:Math.min(innerWidth,m.left+menu.clientLeft+menu.clientWidth),
        bottom:Math.min(innerHeight,m.top+menu.clientTop+menu.clientHeight)},
      hit:!!hit&&(hit===element||element.contains(hit)),scrollTop:menu.scrollTop,
    };
  });
  expect(fullyContained(measurement.rect,measurement.clip),selector+' fully fits without scrolling').toBe(true);
  expect(measurement.width).toBeGreaterThanOrEqual(44);
  expect(measurement.height).toBeGreaterThanOrEqual(44);
  expect(measurement.hit).toBe(true);
  expect(measurement.scrollTop,'initial pause has not scrolled an action into view').toBe(0);
  return measurement;
}

test('320×568 pause initially fits Air routes and every action, then keeps expanded information and keyboard return usable',async({page},info)=>{
  await page.setViewportSize({width:320,height:568});
  await page.goto('/');await page.evaluate(()=>document.fonts.ready);
  await press(page,'[data-mode="skirmish"]');await press(page,'#start');await press(page,'#pause');
  await expect(page.locator('#resume')).toBeFocused();
  await expect(page.locator('#pauseFlights')).toHaveJSProperty('open',false);
  const measurements={};
  for(const selector of ['#resume','#pauseSettings','#help','#pauseFlights > summary','#saveExit','#restartBattle'])
    measurements[selector]=await initialAction(page,selector);
  await info.attach('initial-pause-strict-bounds',{body:JSON.stringify(measurements,null,2),contentType:'application/json'});
  const before=await saved(page);
  await page.keyboard.press('Shift+Tab');await expect(page.locator('#restartBattle')).toBeFocused();
  await page.keyboard.press('Tab');await expect(page.locator('#resume')).toBeFocused();
  const toggle=page.locator('#pauseFlights > summary');
  for(let repeat=0;repeat<2;repeat++){
    await toggle.focus();await page.keyboard.press('Enter');
    await expect(page.locator('#pauseFlights')).toHaveJSProperty('open',true);
    await expect(page.locator('#pauseFlightList')).toHaveText('No gryphons are changing roads.');
    await expect(page.locator('#pauseFlights')).toContainText('Select an aerie after resuming to change future launches.');
    await expectReachable(page,'#restartBattle');
    await expectReachable(page,'#pauseFlights > summary');await page.keyboard.press('Space');
    await expect(page.locator('#pauseFlights')).toHaveJSProperty('open',false);
  }
  await press(page,'#pauseSettings');await expect(page.locator('#settingsModal')).toBeVisible();
  await press(page,'#settingsDone');await expect(page.locator('#pauseSettings')).toBeFocused();
  expect(await saved(page)).toEqual(before);
  await page.keyboard.press('Escape');await expect(page.locator('#pauseVeil')).toBeHidden();
  await expect(page.locator('#pause')).toBeFocused();
});
