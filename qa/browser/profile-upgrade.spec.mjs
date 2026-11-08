import {CURRENT_PROFILE_PROTOCOL_VERSION} from '../../dist/profile-session.js';
import {expect} from '@playwright/test';
import {BACKUP_STORAGE_KEYS,parseBackup} from '../../dist/backup.js';
import {CAMPAIGN_STORAGE_KEY} from '../../dist/campaign.js';
import {test,press,pause,openBackup,chooseBackup,downloadBackup} from './map-browser-helpers.mjs';
import {PROFILE_MARKER,readyMarker,progressThrough,expandedBackup} from './expanded-campaign-fixtures.mjs';
import {LEGACY_QA_PATH} from './legacy-profile-fixtures.mjs';
const SAVE=BACKUP_STORAGE_KEYS.battle,KEYS=Object.values(BACKUP_STORAGE_KEYS);
async function dataBytes(page){return page.evaluate(keys=>Object.fromEntries(keys.map(key=>[key,localStorage.getItem(key)])),KEYS);}
async function marker(page){return page.evaluate(key=>JSON.parse(localStorage.getItem(key)),PROFILE_MARKER);}

async function bootWithProtocol(page,{raw=readyMarker(),fault='none',values={}}={}){
  await page.addInitScript(({raw,fault,values,key,protocol})=>{
    // Apply once per tab. Reload must execute the real app against the actual
    // post-attempt bytes, not reseed/repair the fixture behind the test's back.
    if(sessionStorage.getItem('qa.protocol.initialized'))return;
    sessionStorage.setItem('qa.protocol.initialized','yes');
    const get=Storage.prototype.getItem,set=Storage.prototype.setItem,remove=Storage.prototype.removeItem;
    for(const [key,value] of Object.entries(values))set.call(localStorage,key,value);
    if(raw===null)remove.call(localStorage,key);else set.call(localStorage,key,raw);
    const evidence={attempts:[],readbackDenied:false,dataWrites:[],disable(){Storage.prototype.getItem=get;Storage.prototype.setItem=set;Storage.prototype.removeItem=remove;}};
    window.__qaProtocol=evidence;
    let pendingReadFailure=false;
    Storage.prototype.getItem=function(name){
      if(this===localStorage&&name===key&&pendingReadFailure){pendingReadFailure=false;evidence.readbackDenied=true;throw new DOMException('QA marker readback denied','SecurityError');}
      return get.call(this,name);
    };
    Storage.prototype.setItem=function(name,value){
      if(this!==localStorage)return set.call(this,name,value);
      if(name!==key){evidence.dataWrites.push({name,value});return set.call(this,name,value);}
      evidence.attempts.push(value);
      if(fault==='deny')throw new DOMException('QA quota denies migration','QuotaExceededError');
      if(fault==='silent-drop')return;
      const result=set.call(this,name,value);
      if(fault==='readback')pendingReadFailure=true;
      if(fault==='competing')set.call(this,name,JSON.stringify({format:'ironroot-profile',version:protocol,epoch:'other-tab-profile',phase:'ready'}));
      if(fault==='throw-after')throw new DOMException('QA adapter threw after writing','QuotaExceededError');
      return result;
    };
    Storage.prototype.removeItem=function(name){if(this===localStorage)evidence.dataWrites.push({name,value:null});return remove.call(this,name);};
  },{raw,fault,values,key:PROFILE_MARKER,protocol:CURRENT_PROFILE_PROTOCOL_VERSION});
  await page.goto('/');
}

for(const priorVersion of [null,...Array.from({length:CURRENT_PROFILE_PROTOCOL_VERSION-1},(_,index)=>index+1)])test((priorVersion===null?'absent':'ready v'+priorVersion)+' profile marker upgrades once to verified v'+CURRENT_PROFILE_PROTOCOL_VERSION+' while keeping all legacy mission records',async ({page})=>{
  const absent=priorVersion===null;
  const bytes=JSON.stringify(progressThrough());await bootWithProtocol(page,{raw:absent?null:readyMarker(priorVersion),values:{[CAMPAIGN_STORAGE_KEY]:bytes}});
  const current=await marker(page);expect(current).toMatchObject({format:'ironroot-profile',version:CURRENT_PROFILE_PROTOCOL_VERSION,phase:'ready'});
  if(!absent)expect(current.epoch).toBe('qa-legacy-profile');else expect(current.epoch).toMatch(/^[a-zA-Z0-9-]{1,80}$/);
  expect(await page.evaluate(()=>window.__qaProtocol.attempts.length)).toBe(1);await expect(page.locator('#profileRecovery')).toBeHidden();
  await press(page,'[data-mode="campaign"]');await expect(page.locator('#campaignProgressText')).toHaveText('12/24 missions · 36/72 stars');
  expect((await dataBytes(page))[CAMPAIGN_STORAGE_KEY]).toBe(bytes);await page.reload();expect(await marker(page)).toEqual(current);
  expect((await dataBytes(page))[CAMPAIGN_STORAGE_KEY]).toBe(bytes);
});

for(const fault of ['deny','silent-drop','readback','competing'])test('profile migration '+fault+' blocks writes and requires reload before expanded progress is usable',async ({page})=>{
  const bytes=JSON.stringify(progressThrough()),raw=readyMarker();await bootWithProtocol(page,{raw,fault,values:{[CAMPAIGN_STORAGE_KEY]:bytes}});
  await expect(page.locator('#settingsModal')).toBeVisible();await expect(page.locator('#profileRecovery')).toBeVisible();
  await expect(page.locator('#profileRecoveryMessage')).toContainText(/reload|protected|verified/i);
  await expect(page.locator('#closeSettings')).toBeDisabled();await expect(page.locator('#settingsDone')).toBeDisabled();await expect(page.locator('#exportBackup')).toBeDisabled();
  await expect(page.locator('#profileReload')).toBeEnabled();
  const evidence=await page.evaluate(()=>({attempts:window.__qaProtocol.attempts,dataWrites:window.__qaProtocol.dataWrites,readbackDenied:window.__qaProtocol.readbackDenied}));
  expect(evidence.attempts).toHaveLength(1);expect(evidence.dataWrites).toEqual([]);if(fault==='readback')expect(evidence.readbackDenied).toBe(true);
  expect((await dataBytes(page))[CAMPAIGN_STORAGE_KEY]).toBe(bytes);
  if(['deny','silent-drop'].includes(fault))expect(await marker(page)).toEqual(JSON.parse(raw));
  if(fault==='competing')expect((await marker(page)).epoch).toBe('other-tab-profile');
  await page.evaluate(()=>window.__qaProtocol.disable());
  // Restored access does not silently authorize this unverified tab to write.
  await page.keyboard.press('Escape');await expect(page.locator('#settingsModal')).toBeVisible();await expect(page.locator('#closeSettings')).toBeDisabled();
  await Promise.all([page.waitForEvent('load'),press(page,'#profileReload')]);
  expect((await marker(page)).version).toBe(CURRENT_PROFILE_PROTOCOL_VERSION);await expect(page.locator('#profileRecovery')).toBeHidden();
  await press(page,'[data-mode="campaign"]');await expect(page.locator('#campaignProgressText')).toHaveText('12/24 missions · 36/72 stars');
  expect((await dataBytes(page))[CAMPAIGN_STORAGE_KEY]).toBe(bytes);
});

test('absent marker migration denied before write cannot create an unprotected playable profile',async ({page})=>{
  await bootWithProtocol(page,{raw:null,fault:'deny',values:{[CAMPAIGN_STORAGE_KEY]:JSON.stringify(progressThrough())}});
  await expect(page.locator('#profileRecovery')).toBeVisible();expect(await marker(page)).toBeNull();
  expect(await page.evaluate(()=>window.__qaProtocol.dataWrites)).toEqual([]);await expect(page.locator('#closeSettings')).toBeDisabled();
  await page.evaluate(()=>window.__qaProtocol.disable());await Promise.all([page.waitForEvent('load'),press(page,'#profileReload')]);
  expect((await marker(page)).version).toBe(CURRENT_PROFILE_PROTOCOL_VERSION);await expect(page.locator('#profileRecovery')).toBeHidden();
});

test('marker write that throws after persisting succeeds only because readback verifies the exact current-protocol bytes',async ({page})=>{
  await bootWithProtocol(page,{fault:'throw-after',values:{[CAMPAIGN_STORAGE_KEY]:JSON.stringify(progressThrough())}});
  expect(await marker(page)).toEqual(JSON.parse(readyMarker(CURRENT_PROFILE_PROTOCOL_VERSION)));await expect(page.locator('#profileRecovery')).toBeHidden();
  expect(await page.evaluate(()=>window.__qaProtocol.attempts)).toEqual([readyMarker(CURRENT_PROFILE_PROTOCOL_VERSION)]);
  await press(page,'[data-mode="campaign"]');await expect(page.locator('#campaignProgressText')).toHaveText('12/24 missions · 36/72 stars');
});

for(const phase of ['restoring','failed'])test('v1 '+phase+' marker is not upgraded or mistaken for a completed recovery',async ({page})=>{
  const raw=JSON.stringify({...JSON.parse(readyMarker()),phase}),bytes=JSON.stringify(progressThrough());
  await bootWithProtocol(page,{raw,values:{[CAMPAIGN_STORAGE_KEY]:bytes}});
  await expect(page.locator('#profileRecovery')).toBeVisible();await expect(page.locator('#profileReload')).toBeDisabled();
  expect(await marker(page)).toEqual(JSON.parse(raw));expect(await page.evaluate(()=>window.__qaProtocol.attempts)).toEqual([]);
  expect(await page.evaluate(()=>window.__qaProtocol.dataWrites)).toEqual([]);expect((await dataBytes(page))[CAMPAIGN_STORAGE_KEY]).toBe(bytes);
});

for(const [kind,raw] of [['malformed','{bad'],['future',readyMarker(CURRENT_PROFILE_PROTOCOL_VERSION+1)]])test(kind+' profile marker remains byte-for-byte untouched with recovery required',async ({page})=>{
  await bootWithProtocol(page,{raw,values:{[CAMPAIGN_STORAGE_KEY]:JSON.stringify(progressThrough())}});
  await expect(page.locator('#profileRecovery')).toBeVisible();await expect(page.locator('#profileReload')).toBeDisabled();
  expect(await page.evaluate(key=>localStorage.getItem(key),PROFILE_MARKER)).toBe(raw);expect(await page.evaluate(()=>window.__qaProtocol.attempts)).toEqual([]);
  expect(await page.evaluate(()=>window.__qaProtocol.dataWrites)).toEqual([]);
});

test('real frozen QA-baseline 0.9 open tab is fenced before it can erase chapter five progress or overwrite the current battle',async ({page,context})=>{
  test.setTimeout(35000);await page.goto(LEGACY_QA_PATH);
  await expect(page.locator('.welcome-foot')).toContainText('v0.9');
  await page.evaluate(({key,raw,campaign,progress})=>{localStorage.setItem(key,raw);localStorage.setItem(campaign,JSON.stringify(progress));},{key:PROFILE_MARKER,raw:readyMarker(),campaign:CAMPAIGN_STORAGE_KEY,progress:progressThrough()});
  await page.reload();await press(page,'#start');await pause(page);
  const current=await context.newPage(),errors=[];current.on('pageerror',error=>errors.push(error.message));
  try{
    await current.goto('/');expect((await marker(current)).version).toBe(CURRENT_PROFILE_PROTOCOL_VERSION);
    await expect(page.locator('#profileRecovery')).toBeVisible();await expect(page.locator('#profileReload')).toBeDisabled();
    await openBackup(current);const expanded=expandedBackup('common-ground');await chooseBackup(current,expanded.text);
    await Promise.all([current.waitForEvent('load'),press(current,'#confirmImport')]);
    const durable=await dataBytes(current),durableMarker=await marker(current);
    expect(JSON.parse(durable[CAMPAIGN_STORAGE_KEY]).missions['far-beacon']).toBeTruthy();
    await page.keyboard.press('Escape');await expect(page.locator('#settingsModal')).toBeVisible();await expect(page.locator('#closeSettings')).toBeDisabled();
    // Dispatch native beforeunload, not Playwright's default close which skips
    // application lifecycle handlers. An old-tab warning may be accepted to leave.
    page.on('dialog',dialog=>dialog.accept());
    await Promise.all([page.waitForEvent('close'),page.close({runBeforeUnload:true})]);
    expect(await dataBytes(current)).toEqual(durable);expect(await marker(current)).toEqual(durableMarker);
    await current.reload();await press(current,'#resumeSaved');expect((await pause(current)).campaignId).toBe('common-ground');
    expect(errors).toEqual([]);
  }finally{await current.close();}
});

test('native backup exported by the real frozen 0.9 QA app remains importable after protocol migration',async ({page})=>{
  await page.goto(LEGACY_QA_PATH);await page.evaluate(({key,raw,campaign,progress})=>{localStorage.setItem(key,raw);localStorage.setItem(campaign,JSON.stringify(progress));},{key:PROFILE_MARKER,raw:readyMarker(),campaign:CAMPAIGN_STORAGE_KEY,progress:progressThrough()});
  await page.reload();await press(page,'#start');const old=await pause(page);await press(page,'#saveExit');await openBackup(page);
  const text=await downloadBackup(page);expect(parseBackup(text).data.campaign).toEqual(progressThrough());
  await page.goto('/');expect((await marker(page)).version).toBe(CURRENT_PROFILE_PROTOCOL_VERSION);await openBackup(page);await chooseBackup(page,text);
  await Promise.all([page.waitForEvent('load'),press(page,'#confirmImport')]);expect((await marker(page)).version).toBe(CURRENT_PROFILE_PROTOCOL_VERSION);
  expect(JSON.parse((await dataBytes(page))[CAMPAIGN_STORAGE_KEY])).toEqual(progressThrough());
  await press(page,'#resumeSaved');const resumed=await pause(page);expect(resumed.game.version).toBe(1);expect(resumed.game.state.buildings.map(b=>[b.id,b.side,b.type,b.x,b.y,b.level])).toEqual(old.game.state.buildings.map(b=>[b.id,b.side,b.type,b.x,b.y,b.level]));
  expect(resumed.game.state.time).toBeGreaterThanOrEqual(old.game.state.time);
});
