import {expect} from '@playwright/test';
import {Game,MAPS} from '../../dist/engine.js';
import {createCampaignProgress} from '../../dist/campaign.js';
import {BACKUP_STORAGE_KEYS} from '../../dist/backup.js';
import {test,press,tapPoint,selectMap,homePoint,pause} from './map-browser-helpers.mjs';
import {FONT_FILES,loadFontFaces,normalizeNotice} from './font-browser-helpers.mjs';
import {PRIOR_BUILDS,currentRoot,shellManifest} from './update-fixtures.mjs';
import {updateAndAwaitController} from './worker-update-helpers.mjs';

async function profileBytes(page){
  return page.evaluate(keys=>Object.fromEntries(keys.map(key=>[key,localStorage.getItem(key)])),Object.values(BACKUP_STORAGE_KEYS));
}
async function fetchShellHashes(page,basePath,hashes){
  return page.evaluate(async({basePath,files})=>{
    const result={};
    for(const file of files){
      const response=await fetch(basePath+file);
      if(!response.ok)throw new Error(file+' status '+response.status);
      const digest=await crypto.subtle.digest('SHA-256',await response.arrayBuffer());
      result[file]=Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,'0')).join('');
    }
    return result;
  },{basePath,files:Object.keys(hashes)});
}

for(const [from,{root:priorRoot}] of Object.entries(PRIOR_BUILDS))test('real '+from+' to 0.12 service-worker update preserves Classic progress then plays a new map with fonts offline',async ({page,context,request},testInfo)=>{
  // A measured Chromium update job took ~62s before resolving. Keep that
  // browser-controlled scheduling separate from the bounded claim phase.
  test.setTimeout(150000);
  const prior=await shellManifest(priorRoot),current=await shellManifest(currentRoot);
  // Both prior builds reference Google Fonts. Block only those external services;
  // both application shells and worker installs use the real loopback server.
  await context.route(/^https:\/\/fonts\.(?:googleapis|gstatic)\.com\//,route=>route.abort());
  const created=await request.post('/__qa_update/sessions?from='+from);expect(created.status()).toBe(201);
  const session=await created.json();expect(session.from).toBe(from);const {basePath}=session;
  const fromWorker=new Set();page.on('response',response=>{if(response.fromServiceWorker())fromWorker.add(new URL(response.url()).pathname);});
  try{
    await page.goto(basePath);await expect(page.locator('#mapPicker')).toHaveCount(0);
    const progress=createCampaignProgress();progress.missions.emberwatch={completed:true,stars:3,bestTime:60};
    await page.evaluate(({keys,progress})=>{
      localStorage.setItem(keys.campaign,JSON.stringify(progress));
      localStorage.setItem(keys.trials,JSON.stringify({shieldbreaker:{completed:true,bestTime:60}}));
      localStorage.setItem(keys.settings,JSON.stringify({sound:false,music:false,sfx:true,volume:.25,reducedMotion:true,quality:'low'}));
    },{keys:BACKUP_STORAGE_KEYS,progress});
    await page.reload();
    await page.evaluate(basePath=>navigator.serviceWorker.register(basePath+'service-worker.js',{scope:basePath}),basePath);
    await expect.poll(()=>page.evaluate(()=>navigator.serviceWorker.controller?.state),{timeout:15000}).toBe('activated');
    await expect.poll(()=>page.evaluate(()=>caches.keys())).toEqual([prior.version]);
    expect(await fetchShellHashes(page,basePath,prior.hashes)).toEqual(prior.hashes);
    await page.reload();await press(page,'#start');await press(page,'[data-type="archery"]');
    await tapPoint(page,await homePoint(page,MAPS.classic,550,450));await expect(page.locator('#toast')).toContainText('Archery range raised');
    const classic=await pause(page);expect(classic.game.version).toBe(1);expect(classic.game).not.toHaveProperty('mapId');
    await press(page,'#saveExit');const before=await profileBytes(page);
    // The active old document remains open. Only this test's server session is
    // advanced; registration.update fetches the real changed worker script.
    expect((await request.post(basePath+'advance')).status()).toBe(204);
    const updateTiming=await page.evaluate(updateAndAwaitController,{basePath,claimTimeoutMs:30000});
    await testInfo.attach('service-worker-update-timing',{body:Buffer.from(JSON.stringify(updateTiming,null,2)),contentType:'application/json'});
    await expect.poll(()=>page.evaluate(()=>caches.keys()),{timeout:15000}).toEqual([current.version]);
    expect(await profileBytes(page)).toEqual(before);
    await context.setOffline(true);fromWorker.clear();
    const updated=await page.reload({waitUntil:'load'});expect(updated?.fromServiceWorker()).toBe(true);
    await expect(page.locator('#mapPicker')).toBeVisible();await expect(page.locator('#resumeSaved')).toContainText('RESUME BATTLE');
    expect(await profileBytes(page)).toEqual(before);
    // SHA-256 every installed shell entry through the active worker while
    // offline. This catches missing or old app/engine/render/CSS/font bytes,
    // instead of inferring version consistency from a cache name alone.
    expect(await fetchShellHashes(page,basePath,current.hashes)).toEqual(current.hashes);
    for(const file of Object.keys(current.hashes))await expect.poll(()=>fromWorker.has(basePath+file)).toBe(true);
    for(const face of await loadFontFaces(page)){expect(face.loaded).toHaveLength(1);expect(face.loaded[0].status).toBe('loaded');}
    for(const file of FONT_FILES)expect(fromWorker.has(basePath+file)).toBe(true);
    await press(page,'#resumeSaved');const resumed=await pause(page);
    expect(Game.restore(resumed.game).map.id).toBe('classic');
    expect(resumed.game.state.buildings.filter(b=>b.side===0).map(b=>[b.type,b.x,b.y,b.level])).toEqual(classic.game.state.buildings.filter(b=>b.side===0).map(b=>[b.type,b.x,b.y,b.level]));
    expect(resumed.game.state.time).toBeGreaterThanOrEqual(classic.game.state.time);
    await press(page,'#saveExit');await selectMap(page,'twin-span');await press(page,'#start');
    const fresh=await pause(page);expect(fresh.game).toMatchObject({version:2,mapId:'twin-span',mapRevision:1});
    await press(page,'#saveExit');await page.reload();await expect(page.locator('#resumeSaved')).toContainText('TWIN SPAN');
    await press(page,'#resumeSaved');expect((await pause(page)).game.mapId).toBe('twin-span');await press(page,'#saveExit');
    const after=await profileBytes(page);
    for(const domain of ['campaign','trials','settings','history'])expect(after[BACKUP_STORAGE_KEYS[domain]]).toBe(before[BACKUP_STORAGE_KEYS[domain]]);
    await press(page,'#welcomeSettings');await expect(page.locator('#reduceMotion')).toBeChecked();await expect(page.locator('#effectQuality')).toHaveValue('low');
    await press(page,'#creditsDetails > summary');
    const notice=await page.evaluate(async basePath=>(await fetch(basePath+'FONTS-NOTICES.txt')).text(),basePath);
    expect(normalizeNotice(await page.locator('#fontLicenseText').textContent())).toBe(normalizeNotice(notice));
  }finally{
    await context.setOffline(false);await request.delete(basePath);
  }
});
