import { prepareBuildControl, openBuildControls } from './shared-build-controls.mjs';
import { startRunning } from './campaign-teaching-helpers.mjs';
import { installPad as installSyntheticPad, padButton, holdPadButton, steerTo } from './synthetic-gamepad-helpers.mjs';
// v0.7 UI integration regressions. Browser execution requires an authorized cloud runner.
import {test as base, expect} from '@playwright/test';
import {Game} from '../../dist/engine.js';
import {createBackup, parseBackup, BACKUP_STORAGE_KEYS} from '../../dist/backup.js';
import {createCampaignProgress} from '../../dist/campaign.js';
import {CHALLENGES} from '../../dist/challenges.js';
import {PROFILE_MARKER_KEY} from '../../dist/profile-session.js';
const SAVE=BACKUP_STORAGE_KEYS.battle, KEYS=Object.values(BACKUP_STORAGE_KEYS);
const test=base.extend({page:async ({page},use)=>{
  const errors=[]; page.on('pageerror',error=>errors.push(error.message));
  await use(page); expect(errors,'uncaught browser errors').toEqual([]);
}});
async function press(page,selector) {
  if (await prepareBuildControl(page, selector)) return;
  const element=page.locator(selector);
  if (await page.evaluate(()=>navigator.maxTouchPoints>0)) await element.tap();
  else await element.click();
}
function fixture(replacement=false) {
  const campaign=createCampaignProgress();
  if(replacement)campaign.missions.emberwatch={completed:true,stars:2,bestTime:60};
  const battle={format:'ironroot-save',version:2,challengeId:null,campaignId:null,
    game:new Game({difficulty:replacement?'hard':'easy',seed:replacement?77:11,ai:false}).serialize()};
  const trials=replacement?{}:{[CHALLENGES[0].id]:{completed:true,bestTime:10}};
  const history=replacement?[]:[{won:false,draw:false,challengeId:null,campaignId:null,difficulty:'easy',time:60,kills:0,built:1,date:'2026-11-06T11:00:00.000Z'}];
  const data={campaign,trials,settings:{sound:false,music:!replacement,sfx:true,volume:replacement ? .25 : .5,reducedMotion:replacement,quality:replacement?'low':'high'},history,battle};
  const values=Object.fromEntries(Object.entries(BACKUP_STORAGE_KEYS).map(([domain,key])=>[key,JSON.stringify(data[domain])]));
  const text=createBackup({getItem:key=>values[key]??null},{createdAt:'2026-11-06T12:00:00.000Z'});
  return {text,backup:parseBackup(text),values};
}
async function openSettings(page) {
  await page.goto('/');
  const initial=fixture();
  await page.evaluate(values=>{
    for(const [key,value] of Object.entries(values))localStorage.setItem(key,value);
    localStorage.setItem('qa.unrelated','keep me');
  },initial.values);
  await page.reload(); await press(page,'#welcomeSettings');
  await press(page,'.backup-details > summary');
  await expect(page.locator('.backup-details')).toHaveAttribute('open','');
  await expect(page.locator('#backupIncludeBattle')).toBeChecked();
}
async function raw(page) {
  return page.evaluate(keys=>Object.fromEntries([...keys,'qa.unrelated'].map(key=>[key,localStorage.getItem(key)])),KEYS);
}
async function chooseFile(page,text) {
  const chooserPromise=page.waitForEvent('filechooser');
  await press(page,'#importBackup');
  const chooser=await chooserPromise;
  await chooser.setFiles({name:'ironroot-test-backup.json',mimeType:'application/json',buffer:Buffer.from(text)});
}
async function preview(page) {
  await chooseFile(page,fixture(true).text);
  await expect(page.locator('#backupModal')).toBeVisible();
  await expect(page.locator('#backupSummary')).not.toBeEmpty();
  await expect(page.locator('#confirmImport')).toBeEnabled();
}
async function download(page) {
  const event=page.waitForEvent('download'); await press(page,'#exportBackup');
  const file=await event; expect(await file.failure()).toBeNull();
  const stream=await file.createReadStream(); expect(stream).not.toBeNull();
  const parts=[];for await(const chunk of stream)parts.push(chunk);
  return parseBackup(Buffer.concat(parts).toString('utf8'));
}

test('backup export downloads a validated file and honors include battle',async ({page})=>{
  await openSettings(page);const before=await raw(page);
  const full=await download(page);
  expect(full.data).toEqual(fixture().backup.data);
  await page.locator('#backupIncludeBattle').uncheck();
  const partial=await download(page);
  expect(partial.data.battle).toBeNull();
  expect(partial.data.campaign).toEqual(full.data.campaign);
  expect(await raw(page)).toEqual(before);
});

test('invalid backup file is refused without changing local data',async ({page})=>{
  await openSettings(page);const before=await raw(page);
  await chooseFile(page,'{broken');
  await expect(page.locator('#backupStatus')).toContainText(/invalid|not valid|could not|failed/i);
  await expect(page.locator('#backupModal')).toBeHidden();
  expect(await raw(page)).toEqual(before);
});

test('array-valued entity enums are refused before backup confirmation without any storage writes',async ({page})=>{
  await openSettings(page);
  const before=await raw(page),marker=await page.evaluate(key=>localStorage.getItem(key),PROFILE_MARKER_KEY);
  await page.evaluate(()=>{
    const set=Storage.prototype.setItem,remove=Storage.prototype.removeItem;
    window.__qaEnumImportWrites=[];
    Storage.prototype.setItem=function(key,value){
      if(this===localStorage)window.__qaEnumImportWrites.push({method:'set',key});
      return set.call(this,key,value);
    };
    Storage.prototype.removeItem=function(key){
      if(this===localStorage)window.__qaEnumImportWrites.push({method:'remove',key});
      return remove.call(this,key);
    };
  });
  // Build a genuinely engine-valid ordinary position with both entity kinds,
  // then alter only the primitive enum type. This is malformed-input QA, not
  // synthetic campaign progress or a played victory.
  const valid=structuredClone(fixture().backup),game=Game.restore(valid.data.battle.game);
  for(let i=0;i<120;i++)game.update(1/30);
  valid.data.battle.game=game.serialize();
  expect(parseBackup(JSON.stringify(valid)).data.battle.game.state.units.length).toBeGreaterThan(0);
  for(const [collection,kind] of [['buildings','building'],['units','unit']]){
    const invalid=structuredClone(valid),entity=invalid.data.battle.game.state[collection][0];
    expect(typeof entity.type).toBe('string');entity.type=[entity.type];
    await chooseFile(page,JSON.stringify(invalid));
    await expect(page.locator('#backupStatus')).toContainText('Saved battle contains invalid or incompatible engine data:');
    await expect(page.locator('#backupModal')).toBeHidden();
    expect(await raw(page)).toEqual(before);
    expect(await page.evaluate(key=>localStorage.getItem(key),PROFILE_MARKER_KEY)).toBe(marker);
    expect(await page.evaluate(()=>window.__qaEnumImportWrites)).toEqual([]);
  }
  // A rejected file must not strand the chooser or block a subsequent valid
  // preview. Cancel still leaves all saved domains and the profile marker alone.
  await chooseFile(page,JSON.stringify(valid));
  await expect(page.locator('#backupModal')).toBeVisible();
  await expect(page.locator('#confirmImport')).toBeEnabled();
  await press(page,'#cancelImport');
  await expect(page.locator('#backupModal')).toBeHidden();
  expect(await raw(page)).toEqual(before);
  expect(await page.evaluate(key=>localStorage.getItem(key),PROFILE_MARKER_KEY)).toBe(marker);
  expect(await page.evaluate(()=>window.__qaEnumImportWrites)).toEqual([]);
});

test('backup preview and cancel leave every existing storage domain unchanged',async ({page})=>{
  await openSettings(page);const before=await raw(page);
  await preview(page);expect(await raw(page)).toEqual(before);
  await press(page,'#cancelImport');await expect(page.locator('#backupModal')).toBeHidden();
  expect(await raw(page)).toEqual(before);
});

test('explicit backup replacement reloads and restores all five domains',async ({page})=>{
  await openSettings(page);await preview(page);
  await Promise.all([page.waitForEvent('load'),press(page,'#confirmImport')]);
  await expect(page.locator('#welcome')).toBeVisible();
  const actual=await raw(page),expected=fixture(true).backup.data;
  for(const [domain,key] of Object.entries(BACKUP_STORAGE_KEYS))expect(JSON.parse(actual[key])).toEqual(expected[domain]);
  expect(actual['qa.unrelated']).toBe('keep me');
  await expect(page.locator('#resumeSaved')).toBeVisible();
  await press(page,'#welcomeSettings');
  await expect(page.locator('#reduceMotion')).toBeChecked();
  await expect(page.locator('#effectQuality')).toHaveValue('low');
});

test('backup export reports raw storage denial instead of downloading empty progress',async ({page})=>{
  await openSettings(page);const before=await raw(page),downloads=[];
  page.on('download',file=>downloads.push(file));
  await page.evaluate(()=>{
    window.__qaGetItem=Storage.prototype.getItem;
    Storage.prototype.getItem=()=>{throw new DOMException('Denied','SecurityError');};
  });
  await press(page,'#exportBackup');
  await expect(page.locator('#backupStatus')).toContainText(/could not|failed|unavailable|denied/i);
  await page.waitForTimeout(150);expect(downloads).toHaveLength(0);
  await page.evaluate(()=>{Storage.prototype.getItem=window.__qaGetItem;delete window.__qaGetItem;});
  expect(await raw(page)).toEqual(before);
});

test('backup import refuses a denied raw storage read without changing data',async ({page})=>{
  await openSettings(page);const before=await raw(page);
  await preview(page);
  await page.evaluate(()=>{
    window.__qaGetItem=Storage.prototype.getItem;
    Storage.prototype.getItem=()=>{throw new DOMException('Denied','SecurityError');};
  });
  await press(page,'#confirmImport');
  await expect(page.locator('#backupImportStatus')).toContainText(/could not|cannot|failed|unavailable|denied|blocked/i);
  await page.evaluate(()=>{Storage.prototype.getItem=window.__qaGetItem;delete window.__qaGetItem;});
  expect(await raw(page)).toEqual(before);
});

test('backup quota failure rolls back earlier domain writes without reloading',async ({page})=>{
  await openSettings(page);const before=await raw(page);
  await preview(page);
  await page.evaluate(key=>{
    const original=Storage.prototype.setItem;window.__qaSetItem=original;let thrown=false;
    Storage.prototype.setItem=function(k,v){
      if(k===key&&!thrown){thrown=true;throw new DOMException('Full','QuotaExceededError');}
      return original.call(this,k,v);
    };
    window.__qaNoReload='still here';
  },BACKUP_STORAGE_KEYS.settings);
  await press(page,'#confirmImport');
  await expect(page.locator('#backupImportStatus')).toContainText(/failed|restored|storage/i);
  expect(await page.evaluate(()=>window.__qaNoReload)).toBe('still here');
  expect(await raw(page)).toEqual(before);
  await page.evaluate(()=>{Storage.prototype.setItem=window.__qaSetItem;delete window.__qaSetItem;});
});

// Only the standard Gamepad API is mocked. The actual app polls it and performs
// UI/game actions. No app-private function, state, or controller object is used.
async function installPad(page) {
  await installSyntheticPad(page);
  await page.goto('/');await press(page,'[data-mode="skirmish"]');
  await expect.poll(()=>page.evaluate(()=>window.__qaPadPolls)).toBeGreaterThanOrEqual(3);
}
async function gameSave(page) {
  return page.evaluate(key=>JSON.parse(localStorage.getItem(key)),SAVE);
}

test('controller held confirm starts once without click-through and pause remains usable',async ({page})=>{
  await installPad(page);await page.locator('#start').focus();
  await holdPadButton(page,0,650);
  await expect(page.locator('#welcome')).toBeHidden();
  await expect(page.locator('#controllerCursor')).toBeVisible();
  await expect(page.locator('#selectionPanel')).toBeHidden();
  await padButton(page,9);
  await expect(page.locator('#pauseVeil')).toBeVisible();
  expect((await gameSave(page)).game.state.buildings.filter(b=>b.side===0)).toHaveLength(1);
  await page.locator('#resume').focus();await holdPadButton(page,0,650);
  await expect(page.locator('#pauseVeil')).toBeHidden();
  await expect(page.locator('#welcome')).toBeHidden();
});

test('controller shoulders select build cards and virtual cursor confirm places one building',async ({page})=>{
  await installPad(page);await press(page,'#start');
  await padButton(page,5);const selected=await page.locator('.build-card.active').getAttribute('data-type');
  expect(selected).toBeTruthy();
  await padButton(page,4);
  expect(await page.locator('.build-card.active').getAttribute('data-type')).not.toBe(selected);
  await press(page,'[data-type="archery"]');await padButton(page,8);
  const rect=await page.locator('#battle').boundingBox(),scale=Math.max(.32,rect.height/900);
  const half=rect.width/(2*scale),camera=half>=1600?1600:Math.max(half,450);
  await steerTo(page,{x:rect.x+rect.width/2+(270-camera)*scale,y:rect.y+rect.height/2});
  await padButton(page,0);
  await expect(page.locator('#toast')).toContainText('Archery range raised');
  await padButton(page,9);await expect(page.locator('#pauseVeil')).toBeVisible();
  expect((await gameSave(page)).game.state.buildings.filter(b=>b.side===0&&b.type==='archery')).toHaveLength(1);
});

test('controller disconnect clears cursor and leaves pointer controls usable',async ({page})=>{
  await installPad(page);await press(page,'#start');
  await padButton(page,8); // Pointer Start intentionally returns control to mouse until pad activity.
  await expect(page.locator('#controllerCursor')).toBeVisible();
  await page.evaluate(()=>{window.__qaPad.connected=false;});
  await expect(page.locator('#controllerCursor')).toBeHidden();
  // Both safe policies are valid: remain paused on disconnect, or allow pausing by pointer.
  if(!await page.locator('#pauseVeil').isVisible())await press(page,'#pause');
  await expect(page.locator('#pauseVeil')).toBeVisible();
  await press(page,'#resume');await expect(page.locator('#pauseVeil')).toBeHidden();
  await press(page,'#settings');
  await expect(page.locator('#controllerStatus')).toContainText(/disconnect|not connected|no.*controller/i);
  await press(page,'#settingsDone');await press(page,'#pause');await press(page,'#help');
  await expect(page.locator('#controllerHelp')).toBeVisible();
});
// Audited integration regressions, activated after the corresponding fixes.
test('controller bumpers skip unaffordable cards to reach a later affordable card',async ({page})=>{
  const game=new Game({seed:919,ai:false});game.state.gold[0]=190;
  Game.restore(game.serialize());
  const envelope={format:'ironroot-save',version:2,challengeId:null,campaignId:null,game:game.serialize()};
  await page.addInitScript(({key,envelope})=>localStorage.setItem(key,JSON.stringify(envelope)),{key:SAVE,envelope});
  await installPad(page);await press(page,'#resumeSaved');
  await padButton(page,5);await expect(page.locator('[data-type="barracks"]')).toHaveClass(/active/);
  await padButton(page,5);await expect(page.locator('[data-type="archery"]')).toHaveClass(/active/);
  await padButton(page,5);await expect(page.locator('[data-type="mint"]')).toHaveClass(/active/);
  await padButton(page,4);await expect(page.locator('[data-type="archery"]')).toHaveClass(/active/);
  await padButton(page,9);const save=await gameSave(page);
  expect(save.game.state.gold[0]).toBeLessThan(220); // Fixture must still exclude Watchtower.
  expect(save.game.state.buildings.filter(b=>b.side===0)).toHaveLength(1);
});

test('first controller confirm after pointer build selection reveals cursor without spending',async ({page})=>{
  await installPad(page);await press(page,'#start');
  await press(page,'[data-type="archery"]');
  await expect(page.locator('#controllerCursor')).toBeHidden();
  await padButton(page,0);
  await expect(page.locator('#controllerCursor')).toBeVisible();
  await expect(page.locator('[data-type="archery"]')).toHaveClass(/active/);
  await padButton(page,9);
  const save=await gameSave(page);
  expect(save.game.state.buildings.filter(b=>b.side===0)).toHaveLength(1);
  expect(save.game.state.gold[0]).toBeGreaterThanOrEqual(420);
});

async function delayFileReads(page) {
  await page.evaluate(()=>{
    const original=File.prototype.text;
    window.__qaFileReads=[];
    File.prototype.text=function(){
      const text=original.call(this);
      return new Promise((resolve,reject)=>{
        window.__qaFileReads.push({release:()=>text.then(resolve,reject)});
      });
    };
  });
}
async function releaseRead(page,index) {
  await page.evaluate(index=>window.__qaFileReads[index].release(),index);
}

test('late first backup read cannot replace a newer selected file preview',async ({page})=>{
  await openSettings(page);await delayFileReads(page);
  await chooseFile(page,fixture(false).text);
  await expect.poll(()=>page.evaluate(()=>window.__qaFileReads.length)).toBe(1);
  await chooseFile(page,fixture(true).text);
  await expect.poll(()=>page.evaluate(()=>window.__qaFileReads.length)).toBe(2);
  await releaseRead(page,1);
  await expect(page.locator('#backupSummary')).toContainText('1/19 campaign missions');
  await releaseRead(page,0);
  await page.waitForTimeout(150);
  await expect(page.locator('#backupSummary')).toContainText('1/19 campaign missions');
  await Promise.all([page.waitForEvent('load'),press(page,'#confirmImport')]);
  const actual=await raw(page);
  expect(JSON.parse(actual[BACKUP_STORAGE_KEYS.campaign])).toEqual(fixture(true).backup.data.campaign);
});

test('leaving backup settings invalidates an unfinished file read',async ({page})=>{
  await openSettings(page);const before=await raw(page);await delayFileReads(page);
  await chooseFile(page,fixture(true).text);
  await expect.poll(()=>page.evaluate(()=>window.__qaFileReads.length)).toBe(1);
  await press(page,'#settingsDone');await expect(page.locator('#welcome')).toBeVisible();
  await releaseRead(page,0);await page.waitForTimeout(150);
  await expect(page.locator('#backupModal')).toBeHidden();
  expect(await raw(page)).toEqual(before);
});

test('incomplete backup rollback holds the retained session and requires explicit recovery consent',async ({page})=>{
  await openSettings(page);await press(page,'#settingsDone');await press(page,'#resumeSaved');
  await press(page,'#settings');
  if(!await page.locator('.backup-details').evaluate(element=>element.open))await press(page,'.backup-details > summary');
  const before=await raw(page);await preview(page);
  await page.evaluate(({settings,campaign,oldCampaign})=>{
    const original=Storage.prototype.setItem;window.__qaSetItem=original;let failed=false;
    Storage.prototype.setItem=function(key,value){
      if(key===settings&&!failed){failed=true;throw new DOMException('Full','QuotaExceededError');}
      if(failed&&key===campaign&&value===oldCampaign)throw new DOMException('Rollback blocked','QuotaExceededError');
      return original.call(this,key,value);
    };
  },{settings:BACKUP_STORAGE_KEYS.settings,campaign:BACKUP_STORAGE_KEYS.campaign,oldCampaign:before[BACKUP_STORAGE_KEYS.campaign]});
  await press(page,'#confirmImport');
  await expect(page.locator('#backupImportStatus')).toContainText(/could not be fully restored/i);
  const partial=await raw(page);expect(partial).not.toEqual(before);
  await press(page,'#cancelImport');
  await expect(page.locator('#profileRecovery')).toBeVisible();
  await expect(page.locator('#profileRecoveryMessage')).not.toBeEmpty();
  await expect(page.locator('#settingsDone')).toBeDisabled();
  await expect(page.locator('#closeSettings')).toBeDisabled();
  await expect(page.locator('#profileReload')).toBeDisabled();
  await page.keyboard.press('Escape');await expect(page.locator('#settingsModal')).toBeVisible();
  expect(await raw(page)).toEqual(partial);

  const downloadEvent=page.waitForEvent('download');await press(page,'#exportRecovery');
  const file=await downloadEvent,stream=await file.createReadStream(),chunks=[];
  for await(const chunk of stream)chunks.push(chunk);
  const retained=parseBackup(Buffer.concat(chunks).toString('utf8'));
  expect(retained.data.campaign).toEqual(JSON.parse(before[BACKUP_STORAGE_KEYS.campaign]));
  expect(retained.data.trials).toEqual(JSON.parse(before[BACKUP_STORAGE_KEYS.trials]));
  expect(retained.data.settings).toEqual(JSON.parse(before[BACKUP_STORAGE_KEYS.settings]));
  expect(retained.data.battle.game.difficulty).toBe('easy');
  expect(await raw(page)).toEqual(partial);

  await page.evaluate(()=>{Storage.prototype.setItem=window.__qaSetItem;delete window.__qaSetItem;});
  await chooseFile(page,fixture(true).text);
  await expect(page.locator('#backupModal')).toBeVisible();
  await expect(page.locator('#backupRecoveryConsent')).toBeVisible();
  await expect(page.locator('#backupRecoveryConsent')).not.toBeChecked();
  await expect(page.locator('#confirmImport')).toBeDisabled();
  await page.locator('#backupRecoveryConsent').check(); // Only this test tab exists.
  await expect(page.locator('#confirmImport')).toBeEnabled();
  await Promise.all([page.waitForEvent('load'),press(page,'#confirmImport')]);
  await expect(page.locator('#welcome')).toBeVisible();
  const restored=await raw(page),expected=fixture(true).backup.data;
  for(const [domain,key] of Object.entries(BACKUP_STORAGE_KEYS))expect(JSON.parse(restored[key])).toEqual(expected[domain]);
});

for(const mode of ['campaign','challenges'])test('stale '+mode+' tab cannot resurrect medals or settings after an empty-profile import',async ({page,context})=>{
  await openSettings(page);
  // Establish both kinds of old medals before loading the stale app session.
  await page.evaluate(({key,campaign})=>localStorage.setItem(key,JSON.stringify(campaign)),
    {key:BACKUP_STORAGE_KEYS.campaign,campaign:fixture(true).backup.data.campaign});
  await page.reload();await press(page,'[data-mode="'+mode+'"]');await startRunning(page,press);
  await press(page,'#pause');await expect(page.locator('#pauseVeil')).toBeVisible();
  const newer=await context.newPage(),errors=[];
  newer.on('pageerror',error=>errors.push(error.message));
  try{
    await newer.goto('/');await press(newer,'#welcomeSettings');await press(newer,'.backup-details > summary');
    const empty=createBackup({getItem:()=>null},{createdAt:'2026-11-06T12:00:00.000Z'});
    await chooseFile(newer,empty);await expect(newer.locator('#backupModal')).toBeVisible();
    await Promise.all([newer.waitForEvent('load'),press(newer,'#confirmImport')]);
    const expected=await raw(newer);
    expect(JSON.parse(expected[BACKUP_STORAGE_KEYS.campaign]).missions).toEqual({});
    expect(JSON.parse(expected[BACKUP_STORAGE_KEYS.trials])).toEqual({});
    expect(JSON.parse(expected[BACKUP_STORAGE_KEYS.settings])).toEqual({});
    expect(expected[SAVE]).toBeNull();

    await page.bringToFront();
    await expect(page.locator('#profileRecovery')).toBeVisible();
    await expect(page.locator('#settingsDone')).toBeDisabled();
    await expect(page.locator('#closeSettings')).toBeDisabled();
    await page.keyboard.press('Escape');await expect(page.locator('#settingsModal')).toBeVisible();
    // Controls may be disabled entirely; otherwise even an attempted preference
    // change must not write this tab's old profile back over the replacement.
    if(await page.locator('#reduceMotion').isEnabled())await press(page,'#reduceMotion');
    expect(await raw(newer)).toEqual(expected);
    await expect(page.locator('#profileReload')).toBeEnabled();
    await Promise.all([page.waitForEvent('load'),press(page,'#profileReload')]);
    await expect(page.locator('#welcome')).toBeVisible();
    await expect(page.locator('#resumeSaved')).toBeHidden();
    expect(await raw(page)).toEqual(expected);
    expect(errors,'uncaught errors in importing tab').toEqual([]);
  }finally{await newer.close();}
});
