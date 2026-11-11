import {expect} from '@playwright/test';
import {MAPS} from '../../dist/engine.js';
import {test,press,homePoint,pause,saved,observeCanvas,canvasFrame,expectCamera} from './map-browser-helpers.mjs';

const map = MAPS.classic;
async function start(page) {
  await observeCanvas(page);
  await page.goto('/');
  await press(page, '[data-mode="skirmish"]');
  await press(page, '#start');
  await expect(page.locator('#welcome')).toBeHidden();
  await expect(page.locator('#viewportModal')).toBeHidden();
}
async function camera(page) {
  const mini = await page.locator('#minimap').boundingBox();
  const frame = (await canvasFrame(page)).mini;
  const [x,,width] = frame.viewport;
  return ((x-.75)+(width+1.5)/2)/mini.width*map.width;
}
async function middleDrag(page, from, to) {
  await page.mouse.move(from.x,from.y);
  await page.mouse.down({button:'middle'});
  await page.mouse.move(to.x,to.y,{steps:8});
  await page.mouse.up({button:'middle'});
}
async function ownBuildings(page) {
  return (await saved(page)).game.state.buildings.filter(b=>b.side===0).map(b=>({id:b.id,type:b.type,x:b.x,y:b.y}));
}
async function settings(page) {
  await page.goto('/');
  await press(page,'#welcomeSettings');
  await expect(page.locator('#settingsModal')).toBeVisible();
}

test.describe('desktop mouse controls', () => {
  test.beforeEach(async ({}, info) => test.skip(info.project.name !== 'desktop', 'Native mouse cases use the desktop profile; touch regressions run separately.'));

  test('middle drag pans in placement mode without spending, selecting, or building; left click still places', async ({page}) => {
    await start(page);
    const initial=await ownBuildings(page);
    const mini=await page.locator('#minimap').boundingBox();
    await page.mouse.click(mini.x+mini.width/2,mini.y+mini.height/2);
    await expectCamera(page,map,1600);
    const r=await page.locator('#battle').boundingBox(), scale=Math.max(.32,r.height/900);
    const p={x:r.x+r.width/2,y:r.y+r.height/2};
    await press(page,'[data-type="archery"]');
    await middleDrag(page,p,{x:p.x-120,y:p.y});
    await expectCamera(page,map,1600+120/scale);
    await expect(page.locator('#battle')).toHaveClass(/placing/);
    await expect(page.locator('#battle')).not.toHaveClass(/dragging/);
    await expect(page.locator('#selectionPanel')).toBeHidden();
    const snapshot=await pause(page);
    expect(await ownBuildings(page)).toEqual(initial);
    expect(snapshot.game.state.gold[0]).toBeGreaterThanOrEqual(420);
    await press(page,'#resume');
    const slot=await homePoint(page,map,270,450);
    await page.mouse.click(slot.x,slot.y,{button:'middle'});
    await expect(page.locator('#selectionPanel')).toBeHidden();
    await page.mouse.click(slot.x,slot.y);
    await expect(page.locator('#toast')).toContainText('Archery range raised');
    await pause(page);
    expect((await ownBuildings(page)).filter(b=>b.type==='archery')).toHaveLength(1);
  });

  test('middle drag clamps at both map edges and release outside the canvas ends the gesture', async ({page}) => {
    await start(page);
    const r=await page.locator('#battle').boundingBox(),p={x:r.x+r.width/2,y:r.y+r.height/2};
    await middleDrag(page,p,{x:p.x-5000,y:p.y});
    await expectCamera(page,map,map.width);
    await middleDrag(page,p,{x:p.x+5000,y:p.y});
    await expectCamera(page,map,0);
    await page.mouse.move(p.x,p.y);
    await page.mouse.down({button:'middle'});
    await page.mouse.move(p.x-100,r.y-10,{steps:6});
    await page.mouse.up({button:'middle'});
    await expect(page.locator('#battle')).not.toHaveClass(/dragging/);
    const after=await camera(page);
    await page.mouse.move(p.x+80,p.y,{steps:3});
    await expectCamera(page,map,after);
  });

  test('right-click cancels building and spell without opening a game context menu; outside canvas keeps browser defaults', async ({page}) => {
    await start(page);
    await page.evaluate(() => {
      window.__inputDefaults=[];
      document.addEventListener('contextmenu',event=>window.__inputDefaults.push({target:event.target.id,prevented:event.defaultPrevented}));
    });
    const p=await homePoint(page,map,270,450);
    await press(page,'[data-type="archery"]');
    await page.mouse.click(p.x,p.y,{button:'right'});
    await expect(page.locator('#battle')).not.toHaveClass(/placing/);
    await expect(page.locator('#cancelBuild')).toBeHidden();
    await expect(page.locator('[data-type="archery"]')).not.toHaveClass(/active/);
    await press(page,'#rally');
    await expect(page.locator('#battle')).toHaveClass(/placing/);
    await page.mouse.click(p.x,p.y,{button:'right'});
    await expect(page.locator('#rally')).not.toHaveClass(/active/);
    await expect(page.locator('#battle')).not.toHaveClass(/placing/);
    await page.locator('#gold').click({button:'right'});
    const events=await page.evaluate(()=>window.__inputDefaults);
    expect(events.filter(e=>e.target==='battle')).toEqual([{target:'battle',prevented:true},{target:'battle',prevented:true}]);
    expect(events.at(-1)).toEqual({target:'gold',prevented:false});
    // Headed browsers may consume Escape to dismiss their native context menu;
    // when no native menu is shown, the trusted key reaches the game and opens
    // Pause. Observe delivery instead of blindly clicking the now-inert HUD.
    await page.evaluate(()=>{
      window.__qaContextEscape=false;
      document.addEventListener('keydown',event=>{
        if(event.code==='Escape')window.__qaContextEscape=event.isTrusted;
      },{capture:true,once:true,passive:true});
    });
    await page.keyboard.press('Escape');
    if(await page.evaluate(()=>window.__qaContextEscape))
      await expect(page.locator('#pauseVeil')).toBeVisible();
    else await pause(page);
    expect((await ownBuildings(page)).filter(b=>b.type==='archery')).toHaveLength(0);
  });

  test('secondary press during a held left placement retires the gesture and never buys', async ({page}) => {
    await start(page);
    const p=await homePoint(page,map,270,450);
    await press(page,'[data-type="archery"]');
    await page.mouse.move(p.x,p.y);
    await page.mouse.down();
    await page.mouse.down({button:'right'});
    await expect(page.locator('#battle')).not.toHaveClass(/placing/);
    await page.mouse.up({button:'right'});
    await page.mouse.up();
    await expect(page.locator('#selectionPanel')).toBeHidden();
    await pause(page);
    expect((await ownBuildings(page)).filter(b=>b.type==='archery')).toHaveLength(0);
  });

  for (const interruption of ['lost capture','blur','pause']) test(`middle drag clears on ${interruption} and the next left click works`, async ({page}) => {
    await start(page);
    const p=await homePoint(page,map,270,450);
    await press(page,'[data-type="archery"]');
    await page.locator('#battle').focus();
    await page.evaluate(() => {
      document.getElementById('battle').addEventListener('gotpointercapture',e=>window.__heldPointer=e.pointerId,{once:true});
    });
    await page.mouse.move(p.x,p.y);
    await page.mouse.down({button:'middle'});
    await page.mouse.move(p.x-40,p.y,{steps:4});
    await expect(page.locator('#battle')).toHaveClass(/dragging/);
    if (interruption==='lost capture') await page.locator('#battle').evaluate(c=>c.releasePointerCapture(window.__heldPointer));
    else if (interruption==='blur') await page.evaluate(()=>window.dispatchEvent(new Event('blur')));
    else await page.keyboard.press('Space');
    await expect(page.locator('#battle')).not.toHaveClass(/dragging/);
    await page.mouse.up({button:'middle'});
    if(interruption==='pause'||interruption==='blur') await press(page,'#resume');
    const slot=await homePoint(page,map,270,450);
    await page.mouse.click(slot.x,slot.y);
    await expect(page.locator('#toast')).toContainText('Archery range raised');
  });

  test('keyboard arrows and Escape and the visible Cancel control retain their fallbacks', async ({page}) => {
    await start(page);
    await page.locator('#battle').focus();
    const before=await camera(page);
    const r=await page.locator('#battle').boundingBox(), scale=Math.max(.32,r.height/900);
    await page.keyboard.press('ArrowRight');
    await expectCamera(page,map,before+75/scale);
    await page.keyboard.press('Digit2');
    await expect(page.locator('#battle')).toHaveClass(/placing/);
    await page.keyboard.press('Escape');
    await expect(page.locator('#battle')).not.toHaveClass(/placing/);
    await press(page,'[data-type="archery"]');
    await press(page,'#cancelBuild');
    await expect(page.locator('#battle')).not.toHaveClass(/placing/);
  });

  test('pause Preferences offers fullscreen and returns to the paused battle', async ({page}) => {
    await start(page);
    await pause(page);
    await press(page,'#pauseSettings');
    await press(page,'#settingsFullscreen');
    await expect.poll(()=>page.evaluate(()=>!!document.fullscreenElement)).toBe(true);
    await expect(page.locator('#settingsFullscreen')).toHaveAttribute('aria-label','Exit fullscreen');
    await expect(page.locator('#viewportModal')).toBeHidden();
    await expect.poll(()=>page.locator('#battle').evaluate(canvas=>{
      const rect=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);
      return canvas.width===Math.round(rect.width*dpr)&&canvas.height===Math.round(rect.height*dpr);
    })).toBe(true);
    await press(page,'#settingsFullscreen');
    await expect.poll(()=>page.evaluate(()=>!!document.fullscreenElement)).toBe(false);
    await expect(page.locator('#settingsFullscreen')).toHaveAttribute('aria-label','Enter fullscreen');
    await press(page,'#settingsDone');
    await expect(page.locator('#pauseVeil')).toBeVisible();
    await press(page,'#resume');
    await expect(page.locator('#pauseVeil')).toBeHidden();
  });
});

test('fullscreen is explicit, enters from a real button gesture, preserves dialogs and tracks native exit', async ({page}) => {
  await settings(page);
  expect(await page.evaluate(()=>document.fullscreenElement)).toBeNull();
  await expect(page.locator('#settingsFullscreen')).toBeEnabled();
  await press(page,'#settingsFullscreen');
  await expect.poll(()=>page.evaluate(()=>document.fullscreenElement?.tagName)).toBe('HTML');
  await expect(page.locator('#settingsFullscreen')).toHaveText('Exit fullscreen');
  await expect(page.locator('#settingsFullscreen')).toHaveAttribute('aria-pressed','true');
  await expect(page.locator('#settingsModal')).toBeVisible();
  await expect(page.locator('#settingsModal')).not.toHaveAttribute('inert');
  await press(page,'#settingsDone');
  await press(page,'[data-mode="skirmish"]');
  await press(page,'#start');
  await expect(page.locator('#battle')).toBeVisible();
  await expect(page.locator('#battleTools > button:visible')).toHaveCount(4);
  await page.evaluate(()=>document.exitFullscreen()); // Native browser exit event, no UI state mock.
  await expect(page.locator('#settingsFullscreen')).toHaveAttribute('aria-pressed','false');
  await press(page,'#pause');
  await expect(page.locator('#pauseVeil')).toBeVisible();
  const before=await saved(page);
  await press(page,'#saveExit');
  await page.reload();
  await expect(page.locator('#resumeSaved')).toBeVisible();
  await press(page,'#resumeSaved');
  const after=await pause(page);
  expect(after.scenario).toEqual(before.scenario);
  expect(after.game).toMatchObject({version:before.game.version,mapId:before.game.mapId,
    mapRevision:before.game.mapRevision,rulesetId:before.game.rulesetId,rulesetRevision:before.game.rulesetRevision});
  expect(after.game.state.buildings.map(({progress,...building})=>building))
    .toEqual(before.game.state.buildings.map(({progress,...building})=>building));
  expect(after.game.state.time).toBeGreaterThanOrEqual(before.game.state.time);
});

test('fullscreen button supports native Enter and Space with consistent exit state', async ({page}) => {
  await page.addInitScript(()=>{
    const native=Element.prototype.requestFullscreen;
    // Exercise a real request with a delayed settlement, so focus behavior is
    // checked across animation frames instead of depending on a fast promise.
    Element.prototype.requestFullscreen=function(...args){
      return native.apply(this,args).then(()=>new Promise(resolve=>setTimeout(resolve,150)));
    };
  });
  await settings(page);
  await page.locator('#settingsFullscreen').focus();
  await page.keyboard.press('Enter');
  await expect.poll(()=>page.evaluate(()=>!!document.fullscreenElement)).toBe(true);
  await expect(page.locator('#settingsFullscreen')).toHaveAttribute('aria-disabled','false');
  await expect(page.locator('#settingsFullscreen')).toHaveAttribute('aria-label','Exit fullscreen');
  await expect(page.locator('#settingsFullscreen')).toBeFocused();
  await page.keyboard.press('Space');
  await expect.poll(()=>page.evaluate(()=>!!document.fullscreenElement)).toBe(false);
  await expect(page.locator('#settingsFullscreen')).toHaveAttribute('aria-pressed','false');
  await expect(page.locator('#settingsFullscreen')).toBeFocused();
});

for (const unavailable of ['policy disabled','API absent']) test(`${unavailable} fullscreen shows an accessible windowed fallback`, async ({page}) => {
  await page.addInitScript(unavailable=>{
    if (unavailable==='policy disabled') Object.defineProperty(document,'fullscreenEnabled',{value:false,configurable:true});
    else {
      Object.defineProperty(Element.prototype,'requestFullscreen',{value:undefined,configurable:true});
      Object.defineProperty(Element.prototype,'webkitRequestFullscreen',{value:undefined,configurable:true});
    }
  },unavailable);
  await settings(page);
  await expect(page.locator('#settingsFullscreen')).toBeDisabled();
  await expect(page.locator('#fullscreenStatus')).toContainText('unavailable');
  await expect(page.locator('#fullscreenStatus')).toHaveAttribute('role','status');
  await press(page,'#settingsDone');
  await press(page,'[data-mode="skirmish"]');
  await press(page,'#start');
  await expect(page.locator('#pauseVeil')).toBeHidden();
  await pause(page);
  expect(await saved(page)).not.toBeNull();
});

test('a rejected fullscreen request reports failure and allows another genuine request', async ({page}) => {
  await page.addInitScript(()=> {
    const native=Element.prototype.requestFullscreen;
    Element.prototype.requestFullscreen=function(...args) {
      Element.prototype.requestFullscreen=native;
      return Promise.reject(new DOMException('Denied by browser policy','NotAllowedError'));
    };
  });
  await settings(page);
  await press(page,'#settingsFullscreen');
  await expect(page.locator('#fullscreenStatus')).toContainText('Could not enter fullscreen');
  await expect(page.locator('#settingsFullscreen')).toBeEnabled();
  await expect(page.locator('#settingsFullscreen')).toHaveAttribute('aria-pressed','false');
  await press(page,'#settingsFullscreen');
  await expect.poll(()=>page.evaluate(()=>!!document.fullscreenElement)).toBe(true);
  await press(page,'#settingsFullscreen');
  await expect.poll(()=>page.evaluate(()=>!!document.fullscreenElement)).toBe(false);
});

for (const ending of ['two contacts','touch cancel']) test(`${ending} never builds and the next fresh touch still places`, async ({page,context}) => {
  await start(page);
  const p=await homePoint(page,map,270,450);
  await press(page,'[data-type="archery"]');
  const cdp=await context.newCDPSession(page);
  try {
    const first={...p,id:1};
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[first]});
    if (ending==='two contacts') {
      await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[first,{x:p.x+30,y:p.y+30,id:2}]});
      await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    } else await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});
    await expect(page.locator('#battle')).not.toHaveClass(/dragging/);
    await expect(page.locator('#battle')).toHaveClass(/placing/);
    const snapshot=await pause(page);
    expect(snapshot.game.state.buildings.filter(b=>b.side===0&&b.type==='archery')).toHaveLength(0);
    expect(snapshot.game.state.gold[0]).toBeGreaterThanOrEqual(420);
    await press(page,'#resume');
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[first]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    await expect(page.locator('#toast')).toContainText('Archery range raised');
  } finally { await cdp.detach(); }
});
