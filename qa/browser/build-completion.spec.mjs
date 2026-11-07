import {startLegacyTeaching} from './campaign-teaching-helpers.mjs';
import {expect} from '@playwright/test';
import {Game} from '../../dist/engine.js';
import {test,press,tapPoint,homePoint,saved} from './map-browser-helpers.mjs';
import {openBuildControls} from './shared-build-controls.mjs';
import {installPad,padButton,steerTo} from './synthetic-gamepad-helpers.mjs';

test.setTimeout(40000);
async function planning(page) {
  await startLegacyTeaching(page,press);
  await expect(page.locator('#coachingModal')).toBeVisible();
  await press(page,'#coachingPlan');
  await expect(page.locator('#time')).toHaveText('00:00');
  return Game.restore((await saved(page)).game).map;
}
async function choose(page,type='barracks') {
  await openBuildControls(page); await press(page,`[data-type="${type}"]`);
  await expect(page.locator('#battle')).toHaveClass(/placing/);
}
async function finished(page) {
  await expect(page.locator('#battle')).not.toHaveClass(/placing/);
  await expect(page.locator('.build-card.active')).toHaveCount(0);
  await expect(page.locator('#cancelBuild')).toBeHidden();
  await expect(page.locator('#app')).not.toHaveClass(/compact-build-open/);
  if(await page.locator('#compactBuild').isVisible()) {
    await expect(page.locator('#compactBuild')).toHaveText('Build');
    await expect(page.locator('#compactBuild')).toHaveAttribute('aria-expanded','false');
    await expect(page.locator('#commandDeck')).not.toBeVisible();
  }
}
async function snapshot(page) {
  // Preferences invokes the ordinary pause/save path without releasing the
  // teaching hold. Closing it returns to planning, with exact clock/gold state.
  await press(page,'#settings'); const result=await saved(page);
  await press(page,'#settingsDone'); return result;
}
async function frozenPurchase(page,count,gold) {
  await expect(page.locator('#time')).toHaveText('00:00');
  await expect(page.locator('#gold')).toHaveText(String(gold));
  await page.waitForTimeout(1100);
  const result=await snapshot(page); Game.restore(result.game);
  expect(result.game.state.time).toBe(0);
  expect(result.game.state.gold[0]).toBe(gold);
  expect(result.game.state.units).toHaveLength(0);
  expect(result.game.state.buildings.filter(b=>b.side===0)).toHaveLength(count);
  expect(JSON.stringify(result)).not.toMatch(/repeatBuild|coachingHold|teachingPause/);
  return result;
}

test('one placement finishes the real build controls and another bare confirmation does not buy',async({page})=>{
  const map=await planning(page);await choose(page);
  await tapPoint(page,await homePoint(page,map,550,450));await finished(page);
  await tapPoint(page,await homePoint(page,map,270,450));await finished(page);
  await frozenPurchase(page,1,280);
  await choose(page,'archery');await tapPoint(page,await homePoint(page,map,410,450));await finished(page);
  await frozenPurchase(page,2,105);
});

test('rejected territory and occupied sites keep the order, spend nothing, and allow correction',async({page})=>{
  const map=await planning(page);await choose(page);
  await press(page,'#front');
  const r=await page.locator('#battle').boundingBox();
  await tapPoint(page,{x:r.x+r.width*.8,y:r.y+r.height/2});
  await expect(page.locator('#toast')).toContainText('Build in your territory');
  await expect(page.locator('#battle')).toHaveClass(/placing/);await frozenPurchase(page,0,420);
  await tapPoint(page,await homePoint(page,map,550,450));await finished(page);
  await choose(page);await tapPoint(page,await homePoint(page,map,550,450));
  await expect(page.locator('#toast')).toContainText('Too close');
  await expect(page.locator('#battle')).toHaveClass(/placing/);await frozenPurchase(page,1,280);
  await tapPoint(page,await homePoint(page,map,410,450));await finished(page);await frozenPurchase(page,2,140);
});

for(const input of ['touch','pen']) test(`${input} with a real Shift modifier is one-shot`,async({page,context})=>{
  const map=await planning(page);await choose(page);
  const p=await homePoint(page,map,550,450),cdp=await context.newCDPSession(page);
  await page.evaluate(()=>document.getElementById('battle').addEventListener('pointerup',e=>{
    window.__placementInput={type:e.pointerType,shift:e.shiftKey,trusted:e.isTrusted};
  },{once:true}));
  try {
    if(input==='touch') {
      await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[p],modifiers:8});
      await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[],modifiers:8});
    } else {
      await cdp.send('Input.dispatchMouseEvent',{type:'mousePressed',...p,button:'left',buttons:1,clickCount:1,pointerType:'pen',modifiers:8});
      await cdp.send('Input.dispatchMouseEvent',{type:'mouseReleased',...p,button:'left',buttons:0,clickCount:1,pointerType:'pen',modifiers:8});
    }
    expect(await page.evaluate(()=>window.__placementInput)).toEqual({type:input,shift:true,trusted:true});
    await expect(page.locator('#toast')).toContainText('Barracks raised');await finished(page);
    await frozenPurchase(page,1,280);
  } finally {await cdp.detach();}
});

for(const narrow of [false,true]) test(`mouse Shift-repeat is explicit${narrow?' in a narrow desktop window':''} and ends on a normal click`,async({page},info)=>{
  test.skip(info.project.name!=='desktop','Mouse workflow, including a narrow desktop viewport; touch/pen are covered separately.');
  if(narrow)await page.setViewportSize({width:390,height:650});
  const map=await planning(page);await choose(page);
  const p=await homePoint(page,map,550,450);
  await page.keyboard.down('Shift');await page.mouse.click(p.x,p.y);await page.keyboard.up('Shift');
  await expect(page.locator('[data-type="barracks"]')).toHaveClass(/active/);
  await expect(page.locator('#battle')).toHaveClass(/placing/);
  const next=await homePoint(page,map,410,450);await page.mouse.click(next.x,next.y);
  await finished(page);await frozenPurchase(page,2,140);
});

test('mouse Shift-repeat stops automatically when another building is unaffordable',async({page},info)=>{
  test.skip(info.project.name!=='desktop','Desktop mouse repeat affordability; default placement runs in every profile.');
  const map=await planning(page);await choose(page);
  for(const [index,x]of [550,410,270].entries()) {
    const p=await homePoint(page,map,x,450);await page.keyboard.down('Shift');
    await page.mouse.click(p.x,p.y);await page.keyboard.up('Shift');
    if(index<2)await expect(page.locator('#battle')).toHaveClass(/placing/);
  }
  await finished(page);await frozenPurchase(page,3,0);
});

test('controller confirm remains one-shot even with a keyboard Shift held',async({page})=>{
  await installPad(page);const map=await planning(page);await choose(page);
  const p=await homePoint(page,map,550,450);await page.keyboard.down('Shift');
  await padButton(page,8);await steerTo(page,p);await padButton(page,0);await page.keyboard.up('Shift');
  await expect(page.locator('#toast')).toContainText('Barracks raised');await finished(page);
  await frozenPurchase(page,1,280);
});

test('a held placement crossing a pause boundary cannot buy on release',async({page,context})=>{
  const map=await planning(page);await choose(page);const p=await homePoint(page,map,550,450);
  const touch=await page.evaluate(()=>navigator.maxTouchPoints>0),cdp=touch?await context.newCDPSession(page):null;
  if(touch)await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[p],modifiers:8});
  else {await page.keyboard.down('Shift');await page.mouse.move(p.x,p.y);await page.mouse.down();}
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});
  await expect(page.locator('#pauseVeil')).toBeVisible();
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>false});document.dispatchEvent(new Event('visibilitychange'));});
  if(touch){await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[],modifiers:8});await cdp.detach();}
  else {await page.mouse.up();await page.keyboard.up('Shift');}
  const result=await saved(page);expect(result.game.state.time).toBe(0);
  expect(result.game.state.gold[0]).toBe(420);expect(result.game.state.buildings.filter(b=>b.side===0)).toHaveLength(0);
});
