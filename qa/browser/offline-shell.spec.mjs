import { prepareBuildControl, openBuildControls } from './shared-build-controls.mjs';
import {test as base,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {Game} from '../../dist/engine.js';
import {FONT_FILES,loadFontFaces,normalizeNotice} from './font-browser-helpers.mjs';
const SAVE='ironroot.battle.v1';
const test=base.extend({page:async ({page},use)=>{
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await use(page);expect(errors,'uncaught browser errors').toEqual([]);
}});
async function press(page,selector){
  if (await prepareBuildControl(page, selector)) return;
  if(await page.evaluate(()=>navigator.maxTouchPoints>0))await page.locator(selector).tap();
  else await page.locator(selector).click();
}

test('real service-worker cache supports offline nonclassic play save resume field reference and bundled fonts',async ({page,context})=>{
  test.setTimeout(45000);
  // Playwright gives this test its own fresh context; never reuse another test's
  // cache or worker. Production deliberately skips automatic localhost registration.
  await page.goto('/');
  expect(await page.evaluate(()=>isSecureContext)).toBe(true);
  expect(await page.evaluate(async ()=>(await navigator.serviceWorker.getRegistrations()).length)).toBe(0);
  await page.evaluate(()=>navigator.serviceWorker.register('/service-worker.js',{scope:'/'}));
  await expect.poll(()=>page.evaluate(async ()=>{
    const registration=await navigator.serviceWorker.getRegistration('/');
    return registration?.active?.state;
  }),{timeout:15000}).toBe('activated');
  await expect.poll(()=>page.evaluate(()=>navigator.serviceWorker.controller?.state),
    {timeout:10000}).toBe('activated');

  const fromWorker=new Set();
  page.on('response',response=>{
    if(response.fromServiceWorker())fromWorker.add(new URL(response.url()).pathname);
  });
  try{
    await context.setOffline(true);
    const navigation=await page.reload({waitUntil:'load'});
    expect(navigation?.fromServiceWorker()).toBe(true);
    await expect(page.locator('#start')).toBeVisible();
    await expect.poll(()=>fromWorker.has('/app.js')).toBe(true);
    await expect.poll(()=>fromWorker.has('/engine.js')).toBe(true);
    await expect.poll(()=>fromWorker.has('/codex.js')).toBe(true);
    const faces=await loadFontFaces(page);
    for(const face of faces){expect(face.loaded).toHaveLength(1);expect(face.loaded[0].status).toBe('loaded');}
    for(const file of FONT_FILES)await expect.poll(()=>fromWorker.has('/'+file)).toBe(true);
    // Fetch is subresource access, not navigation: the actual app shell worker
    // intentionally returns index.html for navigations, including .txt URLs.
    const notice=await page.evaluate(async()=>{
      const response=await fetch('/FONTS-NOTICES.txt');return {ok:response.ok,text:await response.text()};
    });
    expect(notice.ok).toBe(true);
    expect(normalizeNotice(notice.text)).toBe(normalizeNotice(await readFile(new URL('../../dist/FONTS-NOTICES.txt',import.meta.url),'utf8')));
    await expect.poll(()=>fromWorker.has('/FONTS-NOTICES.txt')).toBe(true);

    await press(page,'[data-mode="skirmish"]');await press(page,'#mapPickerToggle');await press(page,'#mapChoices [data-map="long-march"]');
    await press(page,'#start');await expect(page.locator('#welcome')).toBeHidden();
    await expect(page.locator('#time')).not.toHaveText('00:00');
    await press(page,'#pause');await expect(page.locator('#pauseVeil')).toBeVisible();
    const saved=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),SAVE);
    expect(saved).toMatchObject({format:'ironroot-save',version:3,scenario:{kind:'skirmish',id:'standard',revision:1}});
    expect(saved.game).toMatchObject({version:3,mapId:'long-march',mapRevision:1,rulesetId:'frontier-air-local-open',rulesetRevision:1});
    expect(Game.restore(saved.game).map.width).toBe(4000);
    await press(page,'#help');
    await press(page,'#rosterGuideToggle');
    await expect(page.locator('#rosterGuide')).toHaveJSProperty('open',true);
    await expect(page.locator('[data-codex-unit]')).toHaveCount(6);
    await press(page,'[data-codex-structure="mint"] > summary');
    await expect(page.locator('[data-codex-structure="mint"]')).toContainText('159.2 s');
    await press(page,'#guideDone');await expect(page.locator('#pauseVeil')).toBeVisible();
    await press(page,'#saveExit');await expect(page.locator('#resumeSaved')).toContainText('LONG MARCH');
    const again=await page.reload({waitUntil:'load'});
    expect(again?.fromServiceWorker()).toBe(true);
    await press(page,'#resumeSaved');await press(page,'#pause');
    const resumed=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),SAVE);
    expect(resumed.game).toMatchObject({version:3,mapId:'long-march',mapRevision:1,rulesetId:'frontier-air-local-open',rulesetRevision:1});
    expect(resumed.game.state.time).toBeGreaterThanOrEqual(saved.game.state.time);
    expect(resumed.game.state.buildings.filter(b=>b.side===0).map(b=>[b.type,b.x,b.y,b.level]))
      .toEqual(saved.game.state.buildings.filter(b=>b.side===0).map(b=>[b.type,b.x,b.y,b.level]));
    await press(page,'#saveExit');await press(page,'#welcomeSettings');await press(page,'#creditsDetails > summary');
    expect(normalizeNotice(await page.locator('#fontLicenseText').textContent())).toBe(normalizeNotice(notice.text));
  }finally{
    await context.setOffline(false);
  }
});
