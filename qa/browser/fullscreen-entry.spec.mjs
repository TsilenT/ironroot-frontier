import {expect} from '@playwright/test';
import {test,press} from './map-browser-helpers.mjs';
import {startRunning} from './campaign-teaching-helpers.mjs';

// Native-request cases use trusted Playwright click/tap/keyboard activation and
// the real Fullscreen API. Failure/display-mode cases explicitly simulate only
// platform APIs. They are not physical Android/PWA or browser-chrome evidence.
async function observeRequests(page) {
  await page.addInitScript(()=>{
    window.__qaFullscreenRequests=[];
    const native=Element.prototype.requestFullscreen;
    if(native)Element.prototype.requestFullscreen=function(...args){
      window.__qaFullscreenRequests.push({active:navigator.userActivation.isActive,tag:this.tagName,options:args[0]});
      return native.apply(this,args);
    };
  });
}
async function requests(page){return page.evaluate(()=>window.__qaFullscreenRequests);}
async function active(page,value){await expect.poll(()=>page.evaluate(()=>!!document.fullscreenElement)).toBe(value);}
async function label(page,on){
  for(const id of ['welcomeFullscreen','settingsFullscreen']) {
    await expect(page.locator('#'+id)).toHaveText(on?'Exit fullscreen':'Enter fullscreen');
    await expect(page.locator('#'+id)).toHaveAttribute('aria-pressed',String(on));
  }
  expect(await page.locator('#welcomeFullscreenStatus').textContent()).toBe(await page.locator('#fullscreenStatus').textContent());
}
async function startWindowed(page){
  await press(page,'[data-mode="skirmish"]');await press(page,'#start');
  await expect(page.locator('#welcome')).toBeHidden();await expect(page.locator('#pauseVeil')).toBeHidden();
  await expect(page.locator('#viewportModal')).toBeHidden();await active(page,false);
}
async function inViewport(locator){
  await expect(locator).toBeVisible();
  expect(await locator.evaluate(el=>{const r=el.getBoundingClientRect(),v=window.visualViewport;return r.width>0&&r.height>0&&r.left>=0&&r.top>=0&&r.right<=(v?.width||innerWidth)+1&&r.bottom<=(v?.height||innerHeight)+1;})).toBe(true);
}

test('title fullscreen is an optional trusted gesture and shares exit state and dialog focus with Options',async({page})=>{
  await observeRequests(page);await page.goto('/');
  const mission=await page.locator('#campaignMissionPage h2').textContent();
  await inViewport(page.locator('#welcomeFullscreen'));await inViewport(page.locator('#welcomeFullscreenStatus'));
  await expect(page.locator('#welcomeFullscreenStatus')).toContainText('Optional');
  expect(await requests(page)).toEqual([]);await active(page,false);
  await press(page,'#welcomeFullscreen');await active(page,true);await label(page,true);
  expect(await requests(page)).toEqual([{active:true,tag:'HTML',options:{navigationUI:'hide'}}]);
  await expect(page.locator('#welcome')).not.toHaveAttribute('inert');
  await expect(page.locator('#settingsModal')).toBeHidden();
  await expect(page.locator('#campaignMissionPage h2')).toHaveText(mission);
  await press(page,'#welcomeSettings');await expect(page.locator('#settingsFullscreen')).toHaveText('Exit fullscreen');
  await press(page,'#settingsFullscreen');await active(page,false);await label(page,false);
  await press(page,'#settingsDone');await expect(page.locator('#welcomeSettings')).toBeFocused();
  await page.locator('#welcomeFullscreen').focus();await page.keyboard.press('Enter');await active(page,true);
  await page.evaluate(()=>document.exitFullscreen()); // Native exit event, not a UI state mock.
  await active(page,false);await label(page,false);
  await expect(page.locator('#welcomeFullscreen')).toBeFocused();
  await expect(page.locator('#campaignMissionPage h2')).toHaveText(mission);
});

test('Start, pause, title return, reload and saved-battle resume never request fullscreen',async({page})=>{
  await observeRequests(page);await page.goto('/');await startWindowed(page);
  await press(page,'#pause');await press(page,'#pauseSettings');await press(page,'#settingsDone');
  await expect(page.locator('#pauseVeil')).toBeVisible();await press(page,'#saveExit');
  await expect(page.locator('#welcome')).toBeVisible();expect(await requests(page)).toEqual([]);
  await page.reload();await press(page,'#resumeSaved');await expect(page.locator('#welcome')).toBeHidden();
  await active(page,false);expect(await requests(page)).toEqual([]);
});

test('title keyboard Enter and Space preserve focus through a delayed request without leaking into battle',async({page})=>{
  await observeRequests(page);
  await page.addInitScript(()=>{
    const native=Element.prototype.requestFullscreen;
    Element.prototype.requestFullscreen=function(...args){return native.apply(this,args).then(()=>new Promise(resolve=>{window.__qaSettleFullscreen=resolve;}));};
  });
  await page.goto('/');await page.locator('#welcomeFullscreen').focus();await page.keyboard.press('Enter');
  await active(page,true);await expect(page.locator('#welcomeFullscreen')).toHaveAttribute('aria-disabled','true');
  await page.keyboard.press('Enter');
  await expect.poll(()=>page.evaluate(()=>typeof window.__qaSettleFullscreen)).toBe('function');
  await page.evaluate(()=>window.__qaSettleFullscreen());
  await expect(page.locator('#welcomeFullscreen')).toHaveAttribute('aria-disabled','false');
  expect(await requests(page)).toHaveLength(1);await expect(page.locator('#welcomeFullscreen')).toBeFocused();
  await page.keyboard.press('Space');await active(page,false);await label(page,false);
  await expect(page.locator('#welcomeFullscreen')).toBeFocused();await expect(page.locator('#welcome')).toBeVisible();
  await expect(page.locator('#pauseVeil')).toBeHidden();
});

test('denied title fullscreen remains windowed with an announced fallback and permits an explicit retry',async({page})=>{
  await page.addInitScript(()=>{
    const native=Element.prototype.requestFullscreen;
    Element.prototype.requestFullscreen=function(...args){Element.prototype.requestFullscreen=native;return Promise.reject(new DOMException('Denied for test','NotAllowedError'));};
  });
  await page.goto('/');await press(page,'#welcomeFullscreen');await active(page,false);
  await expect(page.locator('#welcomeFullscreenStatus')).toHaveAttribute('role','status');
  await expect(page.locator('#welcomeFullscreenStatus')).toContainText('Could not enter fullscreen');
  await expect(page.locator('#welcomeFullscreenStatus')).toContainText('keep playing');
  await label(page,false);await expect(page.locator('#welcomeFullscreen')).toBeEnabled();
  await startWindowed(page);await press(page,'#pause');await press(page,'#saveExit');
  await expect(page.locator('#welcome')).toBeVisible();
  await press(page,'#welcomeFullscreen');await active(page,true);
  await press(page,'#welcomeFullscreen');await active(page,false);await label(page,false);
});

for(const unavailable of ['policy disabled','API absent'])test(`title ${unavailable} fallback leaves mission launch usable`,async({page})=>{
  await observeRequests(page);
  await page.addInitScript(reason=>{
    if(reason==='policy disabled')Object.defineProperty(document,'fullscreenEnabled',{value:false,configurable:true});
    else for(const name of ['requestFullscreen','webkitRequestFullscreen'])Object.defineProperty(Element.prototype,name,{value:undefined,configurable:true});
  },unavailable);
  await page.goto('/');await expect(page.locator('#welcomeFullscreen')).toBeDisabled();
  await expect(page.locator('#welcomeFullscreenStatus')).toContainText('unavailable');
  await inViewport(page.locator('#welcomeFullscreenStatus'));
  await press(page,'#welcomeSettings');await expect(page.locator('#settingsFullscreen')).toBeDisabled();
  await expect(page.locator('#fullscreenStatus')).toContainText('Keep playing');
  await press(page,'#settingsDone');await startWindowed(page);expect(await requests(page)).toEqual([]);
});

for(const mode of ['display mode','iOS standalone','standalone without API'])test(`${mode} acknowledges app view without automatically asking for extra fullscreen`,async({page})=>{
  await observeRequests(page);
  await page.addInitScript(mode=>{
    if(mode==='iOS standalone')Object.defineProperty(navigator,'standalone',{value:true,configurable:true});
    else {
      const native=window.matchMedia;
      window.matchMedia=function(query){const result=native.call(this,query);if(query.includes('display-mode:'))Object.defineProperty(result,'matches',{value:true,configurable:true});return result;};
    }
    if(mode==='standalone without API')for(const name of ['requestFullscreen','webkitRequestFullscreen'])Object.defineProperty(Element.prototype,name,{value:undefined,configurable:true});
  },mode);
  await page.goto('/');await expect(page.locator('#welcomeFullscreenStatus')).toContainText('App view is already active');
  await label(page,false);expect(await requests(page)).toEqual([]);
  if(mode==='standalone without API')await expect(page.locator('#welcomeFullscreen')).toBeDisabled();
  else await expect(page.locator('#welcomeFullscreenStatus')).toContainText('optional');
  await startWindowed(page);expect(await requests(page)).toEqual([]);
});

test('fullscreen entry, launch and briefing remain reachable through portrait and short-landscape resizing',async({page})=>{
  await observeRequests(page);await page.goto('/');
  for(const viewport of [{width:320,height:568},{width:844,height:390},{width:390,height:650}]){
    await page.setViewportSize(viewport);
    await inViewport(page.locator('#welcomeFullscreen'));await inViewport(page.locator('#welcomeFullscreenStatus'));await inViewport(page.locator('#start'));
    expect(await page.locator('#campaignConfig').evaluate(el=>el.clientHeight)).toBeGreaterThan(120);
    expect(await page.locator('#welcome .welcome').evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);
  }
  expect(await requests(page)).toEqual([]);await press(page,'#welcomeFullscreen');await active(page,true);
  await page.setViewportSize({width:844,height:390});await inViewport(page.locator('#welcomeFullscreen'));await inViewport(page.locator('#start'));
  await press(page,'#welcomeFullscreen');await active(page,false);await label(page,false);
  await press(page,'#start');await expect(page.locator('#welcome')).toBeHidden();
  expect(await requests(page)).toHaveLength(1);
});

test('saved campaign keeps a real briefing and reachable Begin and Resume with fullscreen off and on',async({page},testInfo)=>{
  await observeRequests(page);await page.goto('/');await startRunning(page,press);
  await press(page,'#pause');await press(page,'#saveExit');
  await expect(page.locator('#resumeSaved')).toContainText('RESUME MISSION');
  for(const viewport of [{width:320,height:568},{width:844,height:390}]){
    await page.setViewportSize(viewport);
    for(const full of [false,true]){
      if(full)await press(page,'#welcomeFullscreen');
      await active(page,full);await label(page,full);
      await page.locator('#campaignGoal').scrollIntoViewIfNeeded();
      const geometry=await page.locator('#campaignConfig').evaluate(el=>{
        const r=el.getBoundingClientRect(),dialog=el.closest('.welcome').getBoundingClientRect(),v=visualViewport;
        const top=v?.offsetTop||0,bottom=top+(v?.height||innerHeight);
        return {visibleHeight:Math.max(0,Math.min(el.clientHeight,Math.min(r.bottom,dialog.bottom,bottom)-Math.max(r.top,dialog.top,top))),
          overflow:document.documentElement.scrollWidth>innerWidth};
      });
      expect(geometry.visibleHeight).toBeGreaterThan(120);expect(geometry.overflow).toBe(false);
      for(const id of ['start','resumeSaved','welcomeFullscreen','welcomeFullscreenStatus'])await inViewport(page.locator('#'+id));
      await page.screenshot({path:testInfo.outputPath(`fullscreen-entry-saved-${viewport.width}x${viewport.height}-${full?'on':'off'}.png`)});
    }
    await press(page,'#welcomeFullscreen');await active(page,false);
  }
  expect(await requests(page)).toHaveLength(2);
  await press(page,'#resumeSaved');await expect(page.locator('#welcome')).toBeHidden();
  await active(page,false);expect(await requests(page)).toHaveLength(2);
});
