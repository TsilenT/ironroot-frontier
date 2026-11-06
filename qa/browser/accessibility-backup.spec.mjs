// v0.7 UI integration regressions. Browser execution requires an authorized cloud runner.
import {test as base, expect} from '@playwright/test';
import {Game} from '../../dist/engine.js';
import {createBackup, parseBackup, BACKUP_STORAGE_KEYS} from '../../dist/backup.js';
import {createCampaignProgress} from '../../dist/campaign.js';
import {CHALLENGES} from '../../dist/challenges.js';
const SAVE=BACKUP_STORAGE_KEYS.battle, KEYS=Object.values(BACKUP_STORAGE_KEYS);
const test=base.extend({page:async ({page},use)=>{
  const errors=[]; page.on('pageerror',error=>errors.push(error.message));
  await use(page); expect(errors,'uncaught browser errors').toEqual([]);
}});
async function press(page,selector) {
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
  await expect(page.locator('#backupImportStatus')).toContainText(/could not|failed|unavailable|denied/i);
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
  await page.addInitScript(()=>{
    window.__qaPad={connected:true,axes:[0,0,0,0],buttons:Array(17).fill(false)};
    window.__qaPadPolls=0;
    Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>{
      window.__qaPadPolls++;const p=window.__qaPad;
      return p.connected?[{id:'QA Standard Controller',index:0,mapping:'standard',connected:true,timestamp:performance.now(),
        axes:p.axes,buttons:p.buttons.map(pressed=>({pressed,touched:pressed,value:pressed?1:0}))}]:[];
    }});
  });
  await page.goto('/');
  await expect.poll(()=>page.evaluate(()=>window.__qaPadPolls)).toBeGreaterThanOrEqual(3);
}
async function padButton(page,index,hold=100) {
  await page.evaluate(index=>{window.__qaPad.buttons[index]=true;},index);
  await page.waitForTimeout(hold);
  await page.evaluate(index=>{window.__qaPad.buttons[index]=false;},index);
  await page.waitForTimeout(100);
}
async function gameSave(page) {
  return page.evaluate(key=>JSON.parse(localStorage.getItem(key)),SAVE);
}
async function steerTo(page,target) {
  // Read visible cursor geometry and steer through the mocked left stick,
  // rather than editing any application cursor coordinates.
  await page.evaluate(()=>{window.__qaPad.buttons[6]=true;});
  for(let step=0;step<160;step++){
    const box=await page.locator('#controllerCursor').boundingBox();
    expect(box).not.toBeNull();
    const dx=target.x-(box.x+box.width/2),dy=target.y-(box.y+box.height/2);
    if(Math.hypot(dx,dy)<8)break;
    await page.evaluate(({dx,dy})=>{
      const length=Math.hypot(dx,dy),magnitude=length>25?1:.5;
      window.__qaPad.axes=[dx/length*magnitude,dy/length*magnitude,0,0];
    },{dx,dy});
    await page.waitForTimeout(40);
  }
  await page.evaluate(()=>{window.__qaPad.axes=[0,0,0,0];window.__qaPad.buttons[6]=false;});
  await page.waitForTimeout(80);
  const box=await page.locator('#controllerCursor').boundingBox();
  expect(Math.hypot(target.x-box.x-box.width/2,target.y-box.y-box.height/2)).toBeLessThan(15);
}

test('controller held confirm starts once without click-through and pause remains usable',async ({page})=>{
  await installPad(page);await page.locator('#start').focus();
  await padButton(page,0,650);
  await expect(page.locator('#welcome')).toBeHidden();
  await expect(page.locator('#controllerCursor')).toBeVisible();
  await expect(page.locator('#selectionPanel')).toBeHidden();
  await padButton(page,9);
  await expect(page.locator('#pauseVeil')).toBeVisible();
  expect((await gameSave(page)).game.state.buildings.filter(b=>b.side===0)).toHaveLength(1);
  await page.locator('#resume').focus();await padButton(page,0,650);
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
