import {expect} from '@playwright/test';
import {test,press,pause,selectMap,openBackup,downloadBackup} from './map-browser-helpers.mjs';
import {loadFontFaces} from './font-browser-helpers.mjs';
import {assertPassiveContinuation} from './passive-continuation.mjs';
import {updateAndAwaitController} from './worker-update-helpers.mjs';
import {shellManifest,candidateIdentity,requireDistinctUpgrade} from './update-fixtures.mjs';
import {validateProductionV015,productionV015Profile,V015_SCENARIOS,V015_KEYS,PROFILE_MARKER_KEY,PRODUCTION_V015_ROOT,PRODUCTION_V015_MANIFEST_SHA256} from './production-v015-fixtures.mjs';
import {parseBackup} from '../../dist/backup.js';
const keys=[...V015_KEYS,PROFILE_MARKER_KEY],saveKey='ironroot.battle.v1';
const profile=page=>page.evaluate(keys=>Object.fromEntries(keys.map(k=>[k,localStorage.getItem(k)])),keys);
async function hashes(page,basePath,expected){
  return page.evaluate(async({basePath,files})=>{
    const result={};for(const file of files){const response=await fetch(basePath+file);if(!response.ok)throw Error(file+' '+response.status);result[file]=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await response.arrayBuffer())),b=>b.toString(16).padStart(2,'0')).join('');}return result;
  },{basePath,files:Object.keys(expected)});
}
for(const name of V015_SCENARIOS)test(`production 0.15 ${name}: offline takeover preserves earned profile and fences protocol 4 recovery`,async({page,context,request},testInfo)=>{
  test.setTimeout(180000);
  const manifest=await validateProductionV015(),prior=await shellManifest(PRODUCTION_V015_ROOT),candidate=await candidateIdentity();requireDistinctUpgrade(prior,candidate);
  const response=await request.post('/__qa_update/sessions?from=0.15.0');expect(response.status()).toBe(201);
  const {basePath}=await response.json(),fixture=productionV015Profile(name);let modern;
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  try{
    await page.goto(basePath);await page.evaluate(values=>{for(const [key,value] of Object.entries(values))localStorage.setItem(key,value);},fixture.values);await page.reload();
    await page.evaluate(async basePath=>{const session=await import(basePath+'profile-session.js');window.__v015={session,profile:session.createProfileSession(()=>localStorage,{requiredProtocolVersion:4})};},basePath);
    const before=await profile(page),marker=JSON.parse(before[PROFILE_MARKER_KEY]);expect(marker.version).toBe(4);
    expect(before).toEqual(fixture.values);
    await page.evaluate(async basePath=>{await caches.open('qa-unrelated-cache');await navigator.serviceWorker.register(basePath+'service-worker.js',{scope:basePath});},basePath);
    await expect.poll(()=>page.evaluate(()=>navigator.serviceWorker.controller?.state),{timeout:15000}).toBe('activated');
    expect(await hashes(page,basePath,prior.hashes)).toEqual(prior.hashes);
    expect(await hashes(page,basePath,{'service-worker.js':manifest.files['service-worker.js']})).toEqual({'service-worker.js':manifest.files['service-worker.js']});
    expect((await request.post(basePath+'advance')).status()).toBe(204);
    const timing=await page.evaluate(updateAndAwaitController,{basePath,claimTimeoutMs:30000});
    await expect.poll(()=>page.evaluate(async()=>(await caches.keys()).sort()),{timeout:15000}).toEqual([candidate.version,'qa-unrelated-cache'].sort());
    expect(await profile(page)).toEqual(before);
    await context.setOffline(true);modern=await context.newPage();modern.on('pageerror',e=>errors.push(e.message));
    expect((await modern.goto(basePath))?.fromServiceWorker()).toBe(true);
    const migrated=await profile(modern);for(const key of V015_KEYS)expect(migrated[key]).toBe(before[key]);
    expect(JSON.parse(migrated[PROFILE_MARKER_KEY])).toEqual({...marker,version:5});
    await expect(page.locator('#profileRecovery')).toBeVisible();
    const fence=await page.evaluate(keys=>{
      const clients=[window.__v015.profile,window.__v015.session.createProfileSession(()=>localStorage,{requiredProtocolVersion:4})];
      return clients.map(client=>({canWrite:client.status().canWrite,ordinary:client.beginImport().ok,recovery:client.beginImport({recover:true}).ok,attempts:keys.flatMap(key=>['getItem','setItem','removeItem'].map(method=>{try{client.storage[method](key,'forbidden stale access');return false;}catch{return true;}}))}));
    },V015_KEYS);
    for(const result of fence){expect(result.canWrite).toBe(false);expect(result.ordinary).toBe(false);expect(result.recovery).toBe(false);expect(result.attempts).toEqual(Array(15).fill(true));}
    expect(await profile(modern)).toEqual(migrated);
    expect(await hashes(modern,basePath,candidate.hashes)).toEqual(candidate.hashes);
    for(const face of await loadFontFaces(modern)){expect(face.loaded).toHaveLength(1);expect(face.loaded[0].status).toBe('loaded');}
    await press(modern,'#resumeSaved');const resumed=await pause(modern);
    expect(resumed.scenario).toEqual(fixture.domains.battle.scenario);
    expect(resumed.game.rulesetId).toBe(fixture.domains.battle.game.rulesetId);
    assertPassiveContinuation(fixture.domains.battle.game,resumed.game);
    await press(modern,'#saveExit');await modern.reload();await press(modern,'#resumeSaved');const twice=await pause(modern);
    expect(twice.scenario).toEqual(resumed.scenario);assertPassiveContinuation(resumed.game,twice.game);
    await press(modern,'#saveExit');await openBackup(modern);
    const exported=parseBackup(await downloadBackup(modern));for(const domain of ['campaign','trials','settings','history'])expect(exported.data[domain]).toEqual(fixture.domains[domain]);
    await expect(modern.locator('#reduceMotion')).toBeChecked();await expect(modern.locator('#effectQuality')).toHaveValue('low');await press(modern,'#settingsDone');
    if(name==='saved-wings'){
      await press(modern,'[data-mode="campaign"]');await press(modern,'#campaignStoryNav');await press(modern,'[data-chapter="highpass"]');await press(modern,'[data-mission="wings-of-ash"]');
    }else await selectMap(modern,'twin-span');
    await press(modern,'#start');
    if(name==='saved-wings'){await expect(modern.locator('#coachingModal')).toBeVisible();await press(modern,'#coachingPlay');}
    const fresh=await pause(modern);
    expect(fresh.game.rulesetId).toBe(name==='saved-wings'?'frontier-campaign-flight':'frontier-flight-open');
    expect(fresh.scenario).toEqual(name==='saved-wings'?{kind:'campaign',id:'wings-of-ash',revision:3}:{kind:'skirmish',id:'standard',revision:1});
    await press(modern,'#saveExit');await modern.reload();await press(modern,'#resumeSaved');const reloaded=await pause(modern);
    expect(reloaded.scenario).toEqual(fresh.scenario);expect(reloaded.game.rulesetId).toBe(fresh.game.rulesetId);assertPassiveContinuation(fresh.game,reloaded.game);
    const after=await profile(modern);for(const key of V015_KEYS.filter(k=>k!==saveKey))expect(after[key]).toBe(before[key]);expect(errors).toEqual([]);
    await testInfo.attach('production-v015-upgrade-evidence',{contentType:'application/json',body:Buffer.from(JSON.stringify({name,manifestPin:PRODUCTION_V015_MANIFEST_SHA256,prior,candidate,earned:fixture.earned,roster:fixture.roster,timing,fence,oldSave:fixture.domains.battle,resumed,fresh},null,2))});
  }finally{await context.setOffline(false);if(modern)await modern.close();await request.delete(basePath);}
});
