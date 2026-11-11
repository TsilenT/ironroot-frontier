import {expect} from '@playwright/test';
import {Game, MAPS} from '../../dist/engine.js';
import {encodeBattle} from '../../dist/battle-codec.js';
import {BACKUP_STORAGE_KEYS as K} from '../../dist/backup.js';
import {test, press, homePoint, tapPoint, saved} from './map-browser-helpers.mjs';
import {updateAndAwaitController} from './worker-update-helpers.mjs';

const domains = page => page.evaluate(keys=>Object.fromEntries(keys.map(key=>[key,localStorage.getItem(key)])),Object.values(K));
const footer = page => page.locator('.welcome-foot').textContent();
async function session(page, request) {
  const response = await request.post('/__qa_runtime_update/sessions'); expect(response.status()).toBe(201);
  const fixture = await response.json();
  await page.goto(fixture.basePath);
  // The current UI/worker code is tested under consecutive synthetic identities,
  // with warm HTTP caching. This is not a genuine historical runtime fixture.
  await page.evaluate(async basePath => {
    await navigator.serviceWorker.register(basePath+'service-worker.js',{scope:basePath,updateViaCache:'none'});
  },fixture.basePath);
  await expect.poll(()=>page.evaluate(()=>navigator.serviceWorker.controller?.state)).toBe('activated');
  await page.reload();
  expect(await footer(page)).toContain('v'+fixture.from);
  return fixture;
}
async function advance(page, request, fixture) {
  expect((await request.post(fixture.basePath+'advance')).status()).toBe(204);
  await page.evaluate(updateAndAwaitController,{basePath:fixture.basePath,claimTimeoutMs:30000});
  await expect(page.locator('#welcomeUpdateStatus')).toContainText('Update ready');
  expect(await footer(page)).toContain('v'+fixture.from);
}
async function readyBattle(page, fixture) {
  const game = new Game({ai:false,rulesetId:'frontier-citadel-open'});
  await page.evaluate(({key,text})=>localStorage.setItem(key,text),{key:K.battle,text:JSON.stringify(encodeBattle(game))});
  await page.reload(); await press(page,'#resumeSaved');
  await press(page,'[data-type="archery"]');
  await tapPoint(page,await homePoint(page,MAPS.classic,550,450));
  await expect(page.locator('#toast')).toContainText('Archery range raised');
  return game;
}

test('skirmish keeps launch and Resume visible while a ready update remains reachable',async({page,request},info)=>{
  test.setTimeout(180000);const f=await session(page,request);
  try {
    await readyBattle(page,f);await press(page,'#pause');await press(page,'#saveExit');
    await press(page,'[data-mode="skirmish"]');const before=await domains(page);
    await advance(page,request,f);
    for(const id of ['start','resumeSaved'])await expect(page.locator('#'+id)).toBeInViewport({ratio:1});
    const setup=await page.locator('#skirmishConfig').boundingBox();expect(setup.height).toBeGreaterThanOrEqual(80);
    await page.locator('#welcome [data-runtime-update-action]').scrollIntoViewIfNeeded();
    for(const id of ['start','resumeSaved'])await expect(page.locator('#'+id)).toBeInViewport({ratio:1});
    await page.screenshot({path:info.outputPath('skirmish-update-ready.png')});
    expect(await domains(page)).toEqual(before);await press(page,'#welcome [data-runtime-update-action]');
    await expect.poll(()=>footer(page)).toContain('v'+f.to);expect(await domains(page)).toEqual(before);
  } finally {await request.delete(f.basePath);}
});

test('returning title discovers the active release and updates explicitly without changing saved domains',async({page,request},info)=>{
  test.setTimeout(180000); const f=await session(page,request);
  try {
    await page.evaluate(key=>localStorage.setItem(key,JSON.stringify({sound:false,volume:.37,musicVolume:.23,sfxVolume:.64})),K.settings);
    await page.reload(); const before=await domains(page);
    await advance(page,request,f);
    const button=page.locator('#welcome [data-runtime-update-action]');
    await expect(button).toBeVisible(); await expect(button).toHaveText('Update game');
    expect(await domains(page)).toEqual(before);
    await button.scrollIntoViewIfNeeded();
    const box=await button.boundingBox(),v=page.viewportSize();expect(box.y).toBeGreaterThanOrEqual(0);expect(box.y+box.height).toBeLessThanOrEqual(v.height);
    await page.screenshot({path:info.outputPath('title-update-ready.png')});
    await press(page,'#welcome [data-runtime-update-action]');
    await expect.poll(()=>footer(page)).toContain('v'+f.to);
    await expect(page.locator('#welcome [data-runtime-update]')).toBeHidden();
    expect(await domains(page)).toEqual(before);
  } finally {await request.delete(f.basePath);}
});

test('worker takeover leaves live combat running and Save & update retains the exact paused checkpoint',async({page,request},info)=>{
  test.setTimeout(180000); const f=await session(page,request);
  try {
    await readyBattle(page,f); await advance(page,request,f);
    await expect(page.locator('#welcome')).toBeHidden();await expect(page.locator('#pauseVeil')).toBeHidden();
    await expect(page.locator('[data-runtime-update-action]:visible')).toHaveCount(0);
    await press(page,'#pause');const checkpoint=await saved(page),before=await domains(page);
    expect(checkpoint.game.state.buildings.filter(b=>b.side===0&&b.type==='archery')).toHaveLength(1);
    await expect(page.locator('#pauseVeil [data-runtime-update-action]')).toHaveText('Save & update');
    await page.locator('#pauseVeil [data-runtime-update-action]').scrollIntoViewIfNeeded();
    await page.screenshot({path:info.outputPath('paused-update-ready.png')});
    await press(page,'#pauseVeil [data-runtime-update-action]');
    await expect.poll(()=>footer(page)).toContain('v'+f.to);
    expect(await domains(page)).toEqual(before);
    await expect(page.locator('#resumeSaved')).toBeVisible();
    expect(await saved(page)).toEqual(checkpoint);
  } finally {await request.delete(f.basePath);}
});

test('failed checkpoint retains the paused page and update retries only after storage recovers',async({page,request})=>{
  test.setTimeout(180000); const f=await session(page,request);
  try {
    await readyBattle(page,f);await press(page,'#pause');const before=await domains(page);
    await page.evaluate(key=>{const write=Storage.prototype.setItem;window.__blockUpdateSave=true;
      Storage.prototype.setItem=function(k,v){if(k===key&&window.__blockUpdateSave)throw Error('quota');return write.call(this,k,v);};},K.battle);
    await press(page,'#resume');await page.waitForTimeout(200);await press(page,'#pause');
    await advance(page,request,f);await press(page,'#pauseVeil [data-runtime-update-action]');
    await expect(page.locator('#pauseUpdateStatus')).toContainText('battle could not be saved');
    await expect(page.locator('#pauseVeil')).toBeVisible();expect(await domains(page)).toEqual(before);
    expect(await footer(page)).toContain('v'+f.from);
    await page.evaluate(()=>{window.__blockUpdateSave=false;});await press(page,'#pauseVeil [data-runtime-update-action]');
    await expect.poll(()=>footer(page)).toContain('v'+f.to);
    expect((await saved(page)).game.state.time).toBeGreaterThan(JSON.parse(before[K.battle]).game.state.time);
  } finally {await request.delete(f.basePath);}
});

test('pending preferences prevent an update until their exact levels are saved',async({page,request},info)=>{
  test.skip(info.project.name!=='desktop','The domain guard uses the same storage path on all profiles.');
  test.setTimeout(180000);const f=await session(page,request);
  try {
    const before=await domains(page);
    await page.evaluate(key=>{const write=Storage.prototype.setItem;window.__blockUpdatePreferences=true;
      Storage.prototype.setItem=function(k,v){if(k===key&&window.__blockUpdatePreferences)throw Error('quota');return write.call(this,k,v);};},K.settings);
    await press(page,'#welcomeSettings');await page.locator('#musicVolume').focus();await page.locator('#musicVolume').press('Home');
    await expect(page.locator('#preferenceSaveWarning')).toBeVisible();await press(page,'#settingsDone');
    await advance(page,request,f);await press(page,'#welcome [data-runtime-update-action]');
    await expect(page.locator('#welcomeUpdateStatus')).toContainText('Saving could not be verified');
    expect(await domains(page)).toEqual(before);expect(await footer(page)).toContain('v'+f.from);
    await page.evaluate(()=>{window.__blockUpdatePreferences=false;});await press(page,'#welcome [data-runtime-update-action]');
    await expect.poll(()=>footer(page)).toContain('v'+f.to);
    expect(JSON.parse((await domains(page))[K.settings]).musicVolume).toBe(0);
  } finally {await request.delete(f.basePath);}
});

test('an installed update reloads fully offline while preserving the exact paused checkpoint',async({page,context,request},info)=>{
  test.skip(info.project.name!=='desktop','Worker/cache behavior uses the same Chromium path on all profiles.');
  test.setTimeout(180000);const f=await session(page,request);
  try {
    await readyBattle(page,f);await press(page,'#pause');await advance(page,request,f);
    const before=await domains(page),checkpoint=await saved(page),navigations=[];
    page.on('response',response=>{if(response.request().isNavigationRequest())navigations.push(response.fromServiceWorker());});
    await context.setOffline(true);await press(page,'#pauseVeil [data-runtime-update-action]');
    await expect.poll(()=>footer(page)).toContain('v'+f.to);
    expect(navigations).toContain(true);expect(await domains(page)).toEqual(before);
    expect(await saved(page)).toEqual(checkpoint);await expect(page.locator('#resumeSaved')).toBeVisible();
    await expect(page.locator('#welcome [data-runtime-update]')).toBeHidden();
  } finally {await context.setOffline(false);await request.delete(f.basePath);}
});

test('a stale tab cannot update over another tab’s checkpoint and can update safely after returning to title',async({page,context,request},info)=>{
  test.skip(info.project.name!=='desktop','Cross-tab ownership uses the same storage path on all profiles.');
  test.setTimeout(180000);const f=await session(page,request);let other;
  try {
    await readyBattle(page,f);await press(page,'#pause');const earlier=await domains(page);
    await advance(page,request,f);other=await context.newPage();await other.goto(f.basePath);
    await press(other,'#resumeSaved');await other.waitForTimeout(250);await press(other,'#pause');
    const latest=await domains(other);expect(latest[K.battle]).not.toBe(earlier[K.battle]);
    await page.bringToFront();await press(page,'#pauseVeil [data-runtime-update-action]');
    await expect(page.locator('#pauseUpdateStatus')).toContainText('battle cannot be safely saved');
    await expect(page.locator('#pauseVeil')).toBeVisible();expect(await footer(page)).toContain('v'+f.from);
    expect(await domains(page)).toEqual(latest);expect(await domains(other)).toEqual(latest);
    await press(page,'#saveExit');await expect(page.locator('#welcome')).toBeVisible();
    await press(page,'#welcome [data-runtime-update-action]');
    await expect.poll(()=>footer(page)).toContain('v'+f.to);
    expect(await domains(page)).toEqual(latest);expect(await domains(other)).toEqual(latest);
    await expect(page.locator('#resumeSaved')).toBeVisible();
  } finally {await other?.close();await request.delete(f.basePath);}
});
