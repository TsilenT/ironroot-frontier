import {CURRENT_PROFILE_PROTOCOL_VERSION} from '../../dist/profile-session.js';
import {expect} from '@playwright/test';
import {assertPassiveContinuation} from './passive-continuation.mjs';
import {Game} from '../../dist/engine.js';
import {parseBackup} from '../../dist/backup.js';
import {test,press,pause,selectMap,homePoint,tapPoint,openBackup,downloadBackup,chooseBackup} from './map-browser-helpers.mjs';
import {FONT_FILES,loadFontFaces,normalizeNotice} from './font-browser-helpers.mjs';
import {shellManifest,candidateIdentity,requireDistinctUpgrade} from './update-fixtures.mjs';
import {updateAndAwaitController} from './worker-update-helpers.mjs';
import {PRODUCTION_V012_ROOT,PRODUCTION_V012_PATH,PRODUCTION_V012_MANIFEST_SHA256,validateProductionV012,historicalProfile,HISTORICAL_SCENARIOS,HISTORICAL_KEYS,PROFILE_MARKER_KEY} from './production-v012-fixtures.mjs';
const SAVE='ironroot.battle.v1';
const ALL_KEYS=[...HISTORICAL_KEYS,PROFILE_MARKER_KEY];
const profile=page=>page.evaluate(keys=>Object.fromEntries(keys.map(key=>[key,localStorage.getItem(key)])),ALL_KEYS);
async function shellHashes(page,basePath,expected){
  return page.evaluate(async({basePath,files})=>{
    const actual={};
    for(const file of files){const response=await fetch(basePath+file);if(!response.ok)throw Error(file+' '+response.status);const hash=await crypto.subtle.digest('SHA-256',await response.arrayBuffer());actual[file]=Array.from(new Uint8Array(hash),byte=>byte.toString(16).padStart(2,'0')).join('');}
    return actual;
  },{basePath,files:Object.keys(expected)});
}
async function retainHistoricalModules(page,basePath){
  await page.evaluate(async basePath=>{
    const session=await import(basePath+'profile-session.js'),backup=await import(basePath+'backup.js');
    window.__historical={profile:session.createProfileSession(()=>localStorage,{requiredProtocolVersion:2}),backup};
  },basePath);
}
async function assertOrdinaryFence(page,name){
  const evidence=await page.evaluate(({name,keys})=>{
    const client=window[name].profile,attempts=[];
    for(const key of keys)for(const method of ['getItem','setItem','removeItem']){
      let blocked=false;try{client.storage[method](key,'QA forbidden stale write');}catch{blocked=true;}
      attempts.push({key,method,blocked});
    }
    return {canWrite:client.status().canWrite,importOK:client.beginImport().ok,attempts};
  },{name,keys:HISTORICAL_KEYS});
  expect(evidence.canWrite).toBe(false);expect(evidence.importOK).toBe(false);
  expect(evidence.attempts).toHaveLength(15);expect(evidence.attempts.every(a=>a.blocked)).toBe(true);
}

for(const scenario of HISTORICAL_SCENARIOS)test('production 0.12 '+scenario+' real worker takeover preserves all five domains and legacy identity offline',async({page,context,request},testInfo)=>{
  test.setTimeout(180000);
  const manifest=await validateProductionV012(),prior=await shellManifest(PRODUCTION_V012_ROOT),candidate=await candidateIdentity();
  requireDistinctUpgrade(prior,candidate); // Fail, never skip or silently accept 0.12 → 0.12.
  const created=await request.post('/__qa_update/sessions?from=0.12.0');expect(created.status()).toBe(201);
  const {basePath}=await created.json();const fixture=historicalProfile(scenario);
  let modern;const consoleErrors=[];page.on('console',entry=>{if(entry.type()==='error')consoleErrors.push(entry.text());});
  try{
    await page.goto(basePath);
    await page.evaluate(values=>{for(const [key,value] of Object.entries(values))localStorage.setItem(key,value);},fixture.values);
    await page.reload();
    // Replace the seeded battle by actually starting the historical UI. The
    // other four domains came from real historical validators, not candidate code.
    if(scenario==='far-beacon'){
      await press(page,'[data-mode="campaign"]');await press(page,'[data-chapter="frontier"]');await press(page,'[data-mission="far-beacon"]');
    }else await selectMap(page,scenario);
    await press(page,'#start');
    if(scenario!=='far-beacon'){
      await press(page,'[data-type="archery"]');
      await tapPoint(page,await homePoint(page,Game.restore(fixture.domains.battle.game).map,550,450));
      await expect(page.locator('#toast')).toContainText('Archery range raised');
    }
    const historical=await pause(page);await press(page,'#saveExit');
    expect(Game.restore(historical.game).serialize()).toEqual(historical.game); // Exact pre-time advancement admission.
    expect(historical.game.version).toBe(scenario==='classic'?1:2);
    if(scenario==='classic'){expect(historical.game).not.toHaveProperty('mapId');expect(historical.game).not.toHaveProperty('mapRevision');}
    else expect(historical.game).toMatchObject({mapId:scenario==='far-beacon'?'long-march':scenario,mapRevision:1});
    await retainHistoricalModules(page,basePath);
    const oldBackup=await page.evaluate(()=>window.__historical.backup.createBackup(window.__historical.profile.storage,{createdAt:'2026-11-06T00:00:00.000Z'}));
    expect(parseBackup(oldBackup).data.battle).toEqual(historical);
    const before=await profile(page),oldMarker=JSON.parse(before[PROFILE_MARKER_KEY]);expect(oldMarker).toMatchObject({version:2,phase:'ready'});
    for(const key of HISTORICAL_KEYS.filter(key=>key!==SAVE))expect(before[key]).toBe(fixture.values[key]);
    await page.evaluate(async basePath=>{await caches.open('qa-unrelated-cache');await navigator.serviceWorker.register(basePath+'service-worker.js',{scope:basePath});},basePath);
    await expect.poll(()=>page.evaluate(()=>navigator.serviceWorker.controller?.state),{timeout:15000}).toBe('activated');
    await expect.poll(()=>page.evaluate(async()=>(await caches.keys()).sort())).toEqual([prior.version,'qa-unrelated-cache'].sort());
    expect(await shellHashes(page,basePath,prior.hashes)).toEqual(prior.hashes);
    // Worker itself is intentionally not a precached resource. Verify its real
    // HTTP bytes independently before advancing the isolated session.
    expect(await shellHashes(page,basePath,{'service-worker.js':manifest.files['service-worker.js']})).toEqual({'service-worker.js':manifest.files['service-worker.js']});
    expect((await request.post(basePath+'advance')).status()).toBe(204);
    const timing=await page.evaluate(updateAndAwaitController,{basePath,claimTimeoutMs:30000});
    await expect.poll(()=>page.evaluate(async()=>(await caches.keys()).sort()),{timeout:15000}).toEqual([candidate.version,'qa-unrelated-cache'].sort());
    expect(await profile(page)).toEqual(before); // Takeover alone has not run the new app.
    await context.setOffline(true);
    modern=await context.newPage();const errors=[];modern.on('pageerror',error=>errors.push(error.message));modern.on('console',entry=>{if(entry.type()==='error')consoleErrors.push(entry.text());});
    const served=new Set();modern.on('response',response=>{if(response.fromServiceWorker())served.add(new URL(response.url()).pathname);});
    expect((await modern.goto(basePath))?.fromServiceWorker()).toBe(true);
    const migrated=await profile(modern);for(const key of HISTORICAL_KEYS)expect(migrated[key]).toBe(before[key]);
    expect(JSON.parse(migrated[PROFILE_MARKER_KEY])).toEqual({...oldMarker,version:CURRENT_PROFILE_PROTOCOL_VERSION});
    await expect(page.locator('#profileRecovery')).toBeVisible();await assertOrdinaryFence(page,'__historical');expect(await profile(modern)).toEqual(migrated);
    expect(await shellHashes(modern,basePath,candidate.hashes)).toEqual(candidate.hashes);
    for(const file of Object.keys(candidate.hashes))expect(served.has(basePath+file),file+' served by active worker').toBe(true);
    for(const face of await loadFontFaces(modern)){expect(face.loaded).toHaveLength(1);expect(face.loaded[0].status).toBe('loaded');}
    for(const file of FONT_FILES)expect(served.has(basePath+file)).toBe(true);
    await expect(modern.locator('#campaignProgressText')).toContainText(scenario==='far-beacon'?'13/19 missions · 39/57 stars':'16/19 missions · 48/57 stars');
    await press(modern,'#resumeSaved');const resumed=await pause(modern);
    expect(resumed.version).toBe(2);expect(resumed.campaignId).toBe(historical.campaignId);
    expect(resumed.game.version).toBe(historical.game.version);
    // RNG and spawned units may advance between Resume and the next Pause.
    // Preserve exact simulation/seed verification through bounded tick replay.
    const resumedContinuation=assertPassiveContinuation(historical.game,resumed.game);
    expect(Game.restore(resumed.game).ruleset.id).toBe('frontier-legacy');
    expect(resumed.game.state.buildings.map(b=>[b.id,b.type,b.side,b.x,b.y,b.lane,b.level])).toEqual(historical.game.state.buildings.map(b=>[b.id,b.type,b.side,b.x,b.y,b.lane,b.level]));
    expect(resumed.game.state.time).toBeGreaterThanOrEqual(historical.game.state.time);
    expect(resumed.game.state.time-historical.game.state.time).toBeLessThan(3);
    await press(modern,'#saveExit');await modern.reload();await press(modern,'#resumeSaved');const twice=await pause(modern);
    expect(twice.game.version).toBe(historical.game.version);expect(twice.campaignId).toBe(historical.campaignId);
    const repeatedContinuation=assertPassiveContinuation(resumed.game,twice.game);
    await press(modern,'#saveExit');await openBackup(modern);
    const exported=parseBackup(await downloadBackup(modern));
    for(const domain of ['campaign','trials','settings','history'])expect(exported.data[domain]).toEqual(fixture.domains[domain]);
    await expect(modern.locator('#reduceMotion')).toBeChecked();await expect(modern.locator('#effectQuality')).toHaveValue('low');
    await press(modern,'#creditsDetails > summary');
    const notice=await modern.evaluate(async basePath=>(await fetch(basePath+'FONTS-NOTICES.txt')).text(),basePath);
    expect(normalizeNotice(await modern.locator('#fontLicenseText').textContent())).toBe(normalizeNotice(notice));
    await press(modern,'#settingsDone');
    const prePractice=await profile(modern);
    expect((await modern.goto(basePath+'training.html'))?.fromServiceWorker()).toBe(true);await expect(modern.locator('#lessonPicker')).toBeVisible();
    expect((await modern.reload())?.fromServiceWorker()).toBe(true);await expect(modern.locator('#lessonPicker')).toBeVisible();expect(await profile(modern)).toEqual(prePractice);
    await expect(modern.locator('#gold')).toHaveText('280');
    await press(modern,'[data-build="barracks"]');await press(modern,'[data-site-index="0"]');
    await expect(modern.locator('#gold')).toHaveText('140');await expect(modern.locator('#feedback')).toContainText('140 gold spent');
    await press(modern,'#continueLesson');await expect(modern.locator('#continueLesson')).toHaveText('Start observation');
    await press(modern,'#continueLesson');await expect(modern.locator('#feedback')).toContainText('Your barracks trained its first warrior',{timeout:10000});
    await press(modern,'#restartLesson');await expect(modern.locator('#gold')).toHaveText('280');
    await press(modern,'#skipLesson');await expect(modern.locator('#lessonPicker')).toHaveValue('shield-and-arrow');
    await press(modern,'#returnGame');await expect(modern.locator('#welcome')).toBeVisible();expect(await profile(modern)).toEqual(prePractice);
    await selectMap(modern,'twin-span');await press(modern,'#start');
    const fresh=await pause(modern);expect(fresh).toMatchObject({version:3,scenario:{kind:'skirmish',id:'standard',revision:1},game:{version:3,mapId:'twin-span',rulesetId:'frontier-flight-open'}});
    await press(modern,'#saveExit');await modern.reload();await press(modern,'#resumeSaved');expect((await pause(modern)).game.rulesetId).toBe('frontier-flight-open');
    const after=await profile(modern);for(const key of HISTORICAL_KEYS.filter(key=>key!==SAVE))expect(after[key]).toBe(before[key]);
    expect(errors).toEqual([]);expect(consoleErrors).toEqual([]);
    await testInfo.attach('production-upgrade-evidence',{contentType:'application/json',body:Buffer.from(JSON.stringify({scenario,manifestPin:PRODUCTION_V012_MANIFEST_SHA256,priorVersion:prior.version,candidateVersion:candidate.version,priorWorkerHash:prior.workerHash,candidateWorkerHash:candidate.workerHash,priorHashes:prior.hashes,candidateHashes:candidate.hashes,timing,migration:{from:oldMarker,to:JSON.parse(migrated[PROFILE_MARKER_KEY])},historicalSave:historical,resumedSave:resumed,repeatedSave:twice,continuations:{resumed:resumedContinuation,repeated:repeatedContinuation}},null,2))});
  }finally{await context.setOffline(false);if(modern)await modern.close();await request.delete(basePath);}
});

test('historical 0.12 explicit recovery is a documented destructive exception and the modern client then stops writes',async({page,context})=>{
  test.setTimeout(45000);await validateProductionV012();
  const fixture=historicalProfile('classic');await page.goto(PRODUCTION_V012_PATH);
  await page.evaluate(values=>{for(const [key,value] of Object.entries(values))localStorage.setItem(key,value);},fixture.values);await page.reload();
  await retainHistoricalModules(page,PRODUCTION_V012_PATH);
  const modern=await context.newPage();
  try{
    await modern.goto('/');
    await modern.evaluate(async()=>{const {createProfileSession,CURRENT_PROFILE_PROTOCOL_VERSION}=await import('/profile-session.js');window.__modern={profile:createProfileSession(()=>localStorage,{requiredProtocolVersion:CURRENT_PROFILE_PROTOCOL_VERSION})};});
    const upgraded=await profile(modern);await assertOrdinaryFence(page,'__historical');expect(await profile(modern)).toEqual(upgraded);
    await expect(page.locator('#profileRecovery')).toBeVisible();
    if(!await page.locator('.backup-details').evaluate(e=>e.open))await press(page,'.backup-details > summary');
    await chooseBackup(page,fixture.text);
    await expect(page.locator('#backupModal')).toContainText('This replaces all campaign stars');
    await expect(page.locator('#backupModal')).toContainText('Close other Ironroot tabs');
    await expect(page.locator('#backupRecoveryConsent')).toBeVisible();await expect(page.locator('#confirmImport')).toBeDisabled();
    // Negative control on disposable data: deliberately acknowledge the real
    // historical warning while retaining the modern tab to test its fence.
    await press(page,'#backupRecoveryConsent');await expect(page.locator('#confirmImport')).toBeEnabled();
    await Promise.all([page.waitForEvent('load'),press(page,'#confirmImport')]);
    const recovered=await profile(page);expect(JSON.parse(recovered[PROFILE_MARKER_KEY])).toMatchObject({version:2,phase:'ready'});
    expect(JSON.parse(recovered[PROFILE_MARKER_KEY]).epoch).not.toBe(JSON.parse(upgraded[PROFILE_MARKER_KEY]).epoch);
    for(const key of HISTORICAL_KEYS)expect(JSON.parse(recovered[key])).toEqual(JSON.parse(fixture.values[key]));
    await expect(modern.locator('#profileRecovery')).toBeVisible();await assertOrdinaryFence(modern,'__modern');expect(await profile(page)).toEqual(recovered);
    await modern.keyboard.press('Escape');await expect(modern.locator('#settingsModal')).toBeVisible();await expect(modern.locator('#closeSettings')).toBeDisabled();
  }finally{await modern.close();}
});
