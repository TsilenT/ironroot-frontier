import {test as base,expect} from '@playwright/test';
import {startLegacyTeaching,finishFirstBuild} from './campaign-teaching-helpers.mjs';
import {prepareBuildControl} from './shared-build-controls.mjs';
import {inspectMobileGeometry} from '../../dist/mobile-battlefield.js';
import {inspectPhoneText} from './phone-text-evidence.mjs';
const test=base.extend({page:async({page},use)=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));await use(page);expect(errors).toEqual([]);
}});
test.setTimeout(60000);
async function press(page,selector){
  if(await prepareBuildControl(page,selector))return;
  const target=page.locator(selector);
  if(await page.evaluate(()=>navigator.maxTouchPoints>0))await target.tap();else await target.click();
}
async function collapsed(page,{held=false}={}){
  await expect(page.locator('#campaignTeaching')).toBeHidden();
  await expect(page.locator('#campaignCoach')).toBeHidden();
  await expect(page.locator('#toggleCoach')).toBeVisible();
  await expect(page.locator('#toggleCoach')).toHaveAccessibleName('Show hints');
  await expect(page.locator('#toggleCoach')).toHaveAttribute('aria-pressed','false');
  await expect(page.locator('#coachResume'))[held?'toBeVisible':'toBeHidden']();
  await expect(page.locator('#viewportModal')).toBeHidden();
  expect(await page.locator('#coachRailStatus').count()).toBe(0);
  await page.evaluate(()=>document.fonts.ready.then(()=>true));
  const labelSelectors=['#toggleCoach',...(held?['#coachResume']:[]),...(await page.locator('#compactBuild').isVisible()?['#compactBuild']:[])];
  const labels=await page.evaluate(inspectPhoneText,{
    selector:labelSelectors.join(','),
    ownerSelector:'#toggleCoach,#coachResume,#compactBuild',minimumFont:12,
  });
  expect(labels).toHaveLength(labelSelectors.length);
  for(const label of labels){
    expect(label.complete,JSON.stringify(label)).toBe(true);
    expect(label.overflow,JSON.stringify(label)).toBe(false);
  }
  const geometry=await page.evaluate(()=>{
    const rect=e=>{const r=e.getBoundingClientRect();return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height};};
    const app=document.getElementById('app'),css=getComputedStyle(app),root=rect(app);
    const viewport={left:root.left+parseFloat(css.paddingLeft),top:root.top+parseFloat(css.paddingTop),right:root.right-parseFloat(css.paddingRight),bottom:root.bottom-parseFloat(css.paddingBottom)};
    viewport.width=viewport.right-viewport.left;viewport.height=viewport.bottom-viewport.top;
    const controls=[...document.querySelectorAll('#pause,#speed,#sound,#settings,#home,#front,#minimap,#compactBuild,[data-protected-id],#coachResume,#toggleCoach')]
      .filter(e=>e.getClientRects().length&&rect(e).width>0&&rect(e).height>0).map(e=>({...rect(e),id:e.id||e.dataset.protectedId,hit:e.contains(document.elementFromPoint(rect(e).left+rect(e).width/2,rect(e).top+rect(e).height/2))}));
    return {mobile:app.classList.contains('protected-mobile'),viewport,canvas:rect(document.getElementById('battle')),
      regions:['topbar','protectedDock','protectedNavigation'].map(id=>rect(document.getElementById(id))),controls,
      banner:rect(document.getElementById('campaignTeaching')),track:css.getPropertyValue('--mobile-teaching'),parent:document.getElementById('coachActions').parentNode.id};
  });
  expect(geometry.banner.width).toBe(0);expect(geometry.banner.height).toBe(0);
  if(geometry.mobile){
    expect(geometry.track.trim()).toBe('0px');expect(geometry.parent).toBe('protectedNavigation');
    expect(inspectMobileGeometry(geometry)).toEqual({safe:true,reason:''});
    for(const control of geometry.controls)expect(control.hit,control.id).toBe(true);
  }else expect(geometry.parent).toBe('commandDeck');
  return geometry;
}

test('Hide removes the banner, preserves native focus and keeps paid first construction as the start trigger',async({page})=>{
  await page.goto('/');await page.evaluate(()=>localStorage.clear());await page.reload();await press(page,'#start');
  await expect(page.locator('#coachingModal')).toBeHidden();
  const initial=await page.evaluate(()=>localStorage.getItem('ironroot.battle.v1'));
  const shown=await page.locator('#battle').boundingBox(),banner=await page.locator('#campaignTeaching').boundingBox();
  await page.locator('#toggleCoach').focus();await page.keyboard.press('Space');
  const hidden=await collapsed(page);await expect(page.locator('#toggleCoach')).toBeFocused();
  if(hidden.mobile)expect(hidden.canvas.height).toBeCloseTo(shown.height+banner.height,1);
  await expect(page.locator('#time')).toHaveText('00:00');
  expect(await page.evaluate(()=>localStorage.getItem('ironroot.battle.v1'))).toBe(initial);
  await page.keyboard.press('Enter');await expect(page.locator('#campaignCoach')).toBeVisible();
  await expect(page.locator('#toggleCoach')).toBeFocused();await page.keyboard.press('Space');await collapsed(page);
  await finishFirstBuild(page,press);await collapsed(page);
  await expect(page.locator('#time')).not.toHaveText('00:00');
});

test('hidden manual teaching retains Start across short portrait, safe areas and rotation without a placeholder',async({page},testInfo)=>{
  await page.setViewportSize({width:320,height:430});await startLegacyTeaching(page,press);await press(page,'#coachingPlan');
  await press(page,'#toggleCoach');
  await page.locator('#app').evaluate(e=>e.style.setProperty('--mobile-inset-bottom','34px'));
  await collapsed(page,{held:true});await expect(page.locator('#time')).toHaveText('00:00');
  await page.screenshot({path:testInfo.outputPath('hidden-hints-320x430-safe-area.png')});
  await page.locator('#app').evaluate(e=>e.style.removeProperty('--mobile-inset-bottom'));
  for(const size of [{width:740,height:320},{width:390,height:650},{width:320,height:430}]){
    await page.setViewportSize(size);await collapsed(page,{held:true});await expect(page.locator('#time')).toHaveText('00:00');
  }
  await press(page,'#coachResume');await collapsed(page);await expect(page.locator('#time')).not.toHaveText('00:00');
  await press(page,'#pause');await expect(page.locator('#pauseVeil')).toBeVisible();
});

test('hidden hints stay hidden through Options and Back, while reload keeps the existing per-attempt default',async({page})=>{
  await page.goto('/');await page.evaluate(()=>localStorage.clear());await page.reload();await press(page,'#start');
  await finishFirstBuild(page,press);await press(page,'#toggleCoach');await collapsed(page);
  await press(page,'#pause');await press(page,'#pauseSettings');await expect(page.locator('#settingsModal')).toBeVisible();
  await page.goBack();await expect(page.locator('#settingsModal')).toBeHidden();await expect(page.locator('#pauseVeil')).toBeVisible();
  await press(page,'#resume');await collapsed(page);
  await press(page,'#pause');await page.reload();await press(page,'#resumeSaved');
  await expect(page.locator('#campaignCoach')).toBeVisible();await expect(page.locator('#coachResume')).toBeHidden();
  await expect(page.locator('#coachingModal')).toBeHidden();
});


test('the full Resume label fits its 44px collapsed control during a later manual hold',async({page},testInfo)=>{
  await page.setViewportSize({width:320,height:430});
  await startLegacyTeaching(page,press);await press(page,'#coachingPlay');
  await expect(page.locator('#time')).not.toHaveText('00:00');
  await press(page,'#coachReplay');await press(page,'#coachingPlan');
  await expect(page.locator('#coachResume')).toHaveText('Resume');
  await expect(page.locator('#coachResume')).toHaveAccessibleName('Resume battle');
  await press(page,'#toggleCoach');
  const time=await page.locator('#time').textContent();
  for(const bottom of [0,34]){
    await page.locator('#app').evaluate((e,bottom)=>e.style.setProperty('--mobile-inset-bottom',`${bottom}px`),bottom);
    await collapsed(page,{held:true});
    const label=await page.evaluate(inspectPhoneText,{selector:'#coachResume',ownerSelector:'#coachResume',minimumFont:12});
    expect(label[0].text).toBe('Resume');expect(label[0].visibleText).toBe('Resume');
    expect(label[0].complete,JSON.stringify(label[0])).toBe(true);expect(label[0].overflow).toBe(false);
    const button=await page.locator('#coachResume').boundingBox();
    expect(button.width).toBe(44);expect(button.height).toBe(44);
    await expect(page.locator('#time')).toHaveText(time);
    await testInfo.attach(`resume-label-ink-bottom-${bottom}`,{body:JSON.stringify({button,label},null,2),contentType:'application/json'});
  }
  await page.screenshot({path:testInfo.outputPath('hidden-resume-label-320x430.png')});
  await press(page,'#coachResume');await expect(page.locator('#time')).not.toHaveText(time);
});


test('Build, Close and Cancel labels fit their own collapsed targets without changing the paid opening',async({page},testInfo)=>{
  await page.setViewportSize({width:320,height:430});
  await page.goto('/');await page.evaluate(()=>localStorage.clear());await page.reload();await press(page,'#start');
  await press(page,'#toggleCoach');await collapsed(page);
  const before=await page.evaluate(()=>JSON.parse(localStorage.getItem('ironroot.battle.v1')));
  const gold=await page.locator('#gold').textContent();
  await expect(page.locator('#compactBuild')).toHaveText('Build');
  await press(page,'#compactBuild');await expect(page.locator('#compactBuild')).toHaveText('Close');
  await collapsed(page);
  await press(page,'[data-type="barracks"]');await expect(page.locator('#compactBuild')).toHaveText('Cancel');
  await expect(page.locator('#compactBuild')).toHaveAccessibleName('Cancel placement');
  await collapsed(page);
  const labels=await page.evaluate(inspectPhoneText,{selector:'#compactBuild,#toggleCoach',ownerSelector:'#compactBuild,#toggleCoach',minimumFont:12});
  for(const label of labels){expect(label.complete,JSON.stringify(label)).toBe(true);expect(label.overflow).toBe(false);}
  expect(labels.find(label=>label.text==='Cancel')?.visibleText).toBe('Cancel');
  const cancel=await page.locator('#compactBuild').boundingBox(),show=await page.locator('#toggleCoach').boundingBox();
  expect(cancel.width).toBe(44);expect(cancel.height).toBe(44);
  for(const ink of labels.find(label=>label.text==='Cancel').rects)expect(ink.right).toBeLessThanOrEqual(show.x);
  await testInfo.attach('cancel-label-ink',{body:JSON.stringify({cancel,show,labels},null,2),contentType:'application/json'});
  await page.screenshot({path:testInfo.outputPath('hidden-cancel-label-320x430.png')});
  await press(page,'#compactBuild');await expect(page.locator('#compactBuild')).toHaveText('Build');
  await expect(page.locator('#compactBuild')).toHaveAccessibleName('Open building controls');
  await collapsed(page);await expect(page.locator('#time')).toHaveText('00:00');
  await expect(page.locator('#gold')).toHaveText(gold);
  const after=await page.evaluate(()=>JSON.parse(localStorage.getItem('ironroot.battle.v1')));
  expect(after.game).toEqual(before.game);expect(after.scenario).toEqual(before.scenario);
  await finishFirstBuild(page,press);await expect(page.locator('#time')).not.toHaveText('00:00');
});
