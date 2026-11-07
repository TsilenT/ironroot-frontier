import {startLegacyTeaching} from './campaign-teaching-helpers.mjs';
// Actual browser History API coverage. history.back()/forward() exercises the
// navigation path used by hardware Back, not an Escape/Backspace key surrogate.
// Phone viewports and display-mode signals do NOT certify an installed PWA/OS.
import {expect} from '@playwright/test';
import {test,press,saved,seedOnce,chooseBackup,homePoint,tapPoint} from './map-browser-helpers.mjs';
import {Game,getMap} from '../../dist/engine.js';
import {reportFixture} from './battle-report-fixtures.mjs';
import {createCampaignMission} from '../../dist/campaign.js';
import {createBackup} from '../../dist/backup.js';
import {encodeBattle,scenarioForBattle} from '../../dist/battle-codec.js';
const SAVE='ironroot.battle.v1';
const bytes=page=>page.evaluate(key=>localStorage.getItem(key),SAVE);
const historyLength=page=>page.evaluate(()=>history.length);
async function back(page){await page.evaluate(()=>history.back());}
async function forward(page){await page.evaluate(()=>history.forward());}
async function start(page){await page.goto('/');await press(page,'[data-mode="skirmish"]');await press(page,'#start');await expect(page.locator('#welcome')).toBeHidden();}
async function paused(page){await expect(page.locator('#pauseVeil')).toBeVisible();await expect(page.locator('#resume')).toBeFocused();}
async function prior(page){await page.goto('/FONTS-NOTICES.txt');}
async function faultWrites(page){await page.evaluate(key=>{
  const original=Storage.prototype.setItem;window.__backQuota=true;
  Storage.prototype.setItem=function(k,v){if(k===key&&window.__backQuota)throw new DOMException('Full','QuotaExceededError');return original.call(this,k,v);};
},SAVE);}

test('direct briefing Back visits Chapter then Story and a further Back can leave',async({page})=>{
  await prior(page);await page.goto('/');await page.locator('#campaignMissionTitle').click();
  const length=await historyLength(page);await back(page);
  await expect(page.locator('#campaignChapterPage')).toBeVisible();await expect(page.locator('#campaignChapterTitle')).toBeFocused();
  await back(page);await expect(page.locator('#campaignStoryPage')).toBeVisible();
  expect(await historyLength(page)).toBe(length);await back(page);await expect(page).toHaveURL(/\/FONTS-NOTICES\.txt$/);
});

test('Back/Forward menu traversal preserves host state, same URL and nested focus',async({page})=>{
  await page.addInitScript(()=>history.replaceState({hostPanel:{name:'arcade'}},''));
  await page.goto('/');const url=page.url();await press(page,'#welcomeSettings');
  const length=await historyLength(page);await back(page);await expect(page.locator('#settingsModal')).toBeHidden();
  await expect(page.locator('#welcomeSettings')).toBeFocused();await forward(page);await expect(page.locator('#settingsModal')).toBeVisible();
  expect(page.url()).toBe(url);expect(await historyLength(page)).toBe(length);
  expect(await page.evaluate(()=>history.state.hostPanel)).toEqual({name:'arcade'});
  await press(page,'#settingsDone');await expect(page.locator('#settingsModal')).toBeHidden();
  await back(page);await expect(page.locator('#campaignChapterPage')).toBeVisible();
});

test('active battle Back pauses, Forward stays paused, and later Back saves and returns',async({page})=>{
  await start(page);await page.waitForTimeout(180);const length=await historyLength(page);await back(page);await paused(page);
  const checkpoint=await bytes(page);await page.waitForTimeout(180);expect(await bytes(page)).toBe(checkpoint);
  await forward(page);await paused(page);expect(await bytes(page)).toBe(checkpoint);
  await back(page);await paused(page);await back(page);await expect(page.locator('#welcome')).toBeVisible();
  await forward(page);await expect(page.locator('#welcome')).toBeVisible();expect(await bytes(page)).toBe(checkpoint);
  expect(await historyLength(page)).toBe(length);
});

test('restart and guide each dismiss to their real pause parent without restarting',async({page})=>{
  await start(page);await back(page);await paused(page);const checkpoint=await bytes(page);
  await press(page,'#restartBattle');await back(page);await expect(page.locator('#restartModal')).toBeHidden();
  await expect(page.locator('#restartBattle')).toBeFocused();expect(await bytes(page)).toBe(checkpoint);
  await press(page,'#help');await back(page);await expect(page.locator('#helpModal')).toBeHidden();
  await expect(page.locator('#help')).toBeFocused();await expect(page.locator('#pauseVeil')).toBeVisible();
  expect(await bytes(page)).toBe(checkpoint);
});

test('Back cancels an import preview; Forward never revives its pending replacement',async({page})=>{
  const backup=createBackup({getItem:()=>null},{includeBattle:false});
  await start(page);await back(page);await paused(page);const checkpoint=await bytes(page);
  await press(page,'#pauseSettings');await press(page,'.backup-details > summary');await chooseBackup(page,backup);
  await expect(page.locator('#backupModal')).toBeVisible();await back(page);await expect(page.locator('#backupModal')).toBeHidden();
  await expect(page.locator('#settingsModal')).toBeVisible();expect(await bytes(page)).toBe(checkpoint);
  await forward(page);await expect(page.locator('#backupModal')).toBeHidden();
  await expect(page.locator('#settingsModal')).toBeVisible();expect(await bytes(page)).toBe(checkpoint);
});

test('Back dismisses teaching into planning and Options returns to the same frozen hold',async({page})=>{
  await startLegacyTeaching(page,press);await expect(page.locator('#coachingModal')).toBeVisible();
  const checkpoint=await saved(page);await back(page);await expect(page.locator('#coachingModal')).toBeHidden();
  await expect(page.locator('#pauseVeil')).toBeHidden();await expect(page.locator('#battleClockLabel')).toHaveText('TEACHING PAUSE');
  await press(page,'#settings');await back(page);await expect(page.locator('#settingsModal')).toBeHidden();
  await expect(page.locator('#pauseVeil')).toBeHidden();await page.waitForTimeout(180);
  expect((await saved(page)).game.state.time).toBe(checkpoint.game.state.time);
  await press(page,'#coachResume');await expect(page.locator('#battleClockLabel')).not.toHaveText('TEACHING PAUSE');
});

test('Back cancels held activation; a fresh press still works immediately',async({page})=>{
  await start(page);await back(page);await paused(page);await press(page,'#pauseSettings');
  await page.locator('#settingsDone').focus();await page.keyboard.down('Space');await back(page);
  await expect(page.locator('#settingsModal')).toBeHidden();await page.keyboard.up('Space');
  await expect(page.locator('#pauseVeil')).toBeVisible();await press(page,'#resume');await expect(page.locator('#pauseVeil')).toBeHidden();
});

test('quota failure retains the battle and honest warning without adding entries on repeated Back',async({page})=>{
  await start(page);await faultWrites(page);await page.waitForTimeout(180);const checkpoint=await bytes(page),length=await historyLength(page);
  await back(page);await paused(page);await expect(page.locator('#pauseSaveStatus')).toContainText('Saving unavailable');
  await back(page);await expect(page.locator('#welcome')).toBeHidden();await expect(page.locator('#pauseSaveStatus')).toContainText(/Could not save|Saving unavailable/);
  expect(await bytes(page)).toBe(checkpoint);expect(await historyLength(page)).toBe(length);
  await page.evaluate(()=>{window.__backQuota=false;});await press(page,'#saveExit');await expect(page.locator('#welcome')).toBeVisible();
  expect((await saved(page)).game.state.time).toBeGreaterThan(JSON.parse(checkpoint).game.state.time);
});

test('newer tab ownership survives browser Back from a stale battle',async({page,context})=>{
  await start(page);await back(page);await paused(page);const other=await context.newPage();await start(other);
  await press(other,'#pause');await paused(other);const newer=await bytes(other);await page.bringToFront();
  await expect(page.locator('#pauseSaveStatus')).toContainText('newer battle');await back(page);
  await expect(page.locator('#welcome')).toBeVisible();expect(await bytes(page)).toBe(newer);
});

test('reload keeps direct briefing and consumes old document markers without growing history',async({page})=>{
  await prior(page);await page.goto('/');const length=await historyLength(page);
  await page.reload();await expect(page.locator('#campaignMissionPage')).toBeVisible();expect(await historyLength(page)).toBe(length);
  await page.locator('#campaignMissionTitle').click();await back(page);await expect(page.locator('#campaignChapterPage')).toBeVisible();
  await back(page);await expect(page.locator('#campaignStoryPage')).toBeVisible();expect(await historyLength(page)).toBe(length);
  await back(page);await expect(page).toHaveURL(/\/FONTS-NOTICES\.txt$/);
});

test('forged popstate cannot restore simulation or trigger a restart',async({page})=>{
  await start(page);await back(page);await paused(page);const checkpoint=await bytes(page);
  await page.evaluate(()=>window.dispatchEvent(new PopStateEvent('popstate',{state:{ironrootNavigation:{version:1,document:'forged',entry:'restart',game:{time:0}}}})));
  // Unknown state may safely return to title through Save & return, but cannot
  // execute the supplied route or write an invented Game.
  expect(await bytes(page)).toBe(checkpoint);await expect(page.locator('#restartModal')).toBeHidden();
});

for(const kind of ['legacy-skirmish','legacy-campaign'])test(`${kind} Back and Forward preserve exact scenario identity`,async({page})=>{
  const game=kind==='legacy-campaign'?createCampaignMission('first-watch'):new Game({seed:71,ai:false,mapId:'twin-span'});
  for(let i=0;i<15;i++)game.update(1/30);
  const envelope=encodeBattle(game,scenarioForBattle(null,kind==='legacy-campaign'?'first-watch':null,game));
  await seedOnce(page,{[SAVE]:JSON.stringify(envelope)});await press(page,'#resumeSaved');await back(page);await paused(page);
  const checkpoint=await saved(page);await forward(page);await paused(page);expect(await saved(page)).toEqual(checkpoint);
  expect(checkpoint.identity??[checkpoint.campaignId,checkpoint.challengeId]).toEqual(envelope.identity??[envelope.campaignId,envelope.challengeId]);
  expect(checkpoint.game.version).toBe(envelope.game.version);
});

test('standalone display-mode signal uses the same finite history policy, without claiming OS interception',async({page})=>{
  test.info().annotations.push({type:'scope',description:'Signal-only integration test. Not an installed Android/iOS PWA or OS task-exit test.'});
  await page.addInitScript(()=>{
    const original=window.matchMedia.bind(window);
    window.matchMedia=query=>{const result=original(query);if(query==='(display-mode: standalone)')Object.defineProperty(result,'matches',{value:true});return result;};
  });
  await start(page);const length=await historyLength(page);await back(page);await paused(page);
  await back(page);await expect(page.locator('#welcome')).toBeVisible();expect(await historyLength(page)).toBe(length);
  expect(await page.evaluate(()=>document.fullscreenElement)).toBeNull();
});


for(const phase of ['restoring','failed','invalid','newer-ready'])test(`${phase} profile recovery remains visible through Back/Forward with unchanged storage`,async({page,context})=>{
  await start(page);const other=await context.newPage();await other.goto('/FONTS-NOTICES.txt');
  await other.evaluate(phase=>{
    const key='ironroot.profile.v1',marker=JSON.parse(localStorage.getItem(key));
    marker.epoch='navigation-profile';marker.phase=phase==='newer-ready'?'ready':phase;
    localStorage.setItem(key,phase==='invalid'?'broken marker':JSON.stringify(marker));
  },phase);
  await page.bringToFront();await expect(page.locator('#profileRecovery')).toBeVisible();
  await expect(page.locator('#settingsDone')).toBeDisabled();
  const raw=()=>page.evaluate(()=>Object.fromEntries(Object.keys(localStorage).map(key=>[key,localStorage.getItem(key)])));
  const checkpoint=await raw(),length=await historyLength(page);
  for(const action of [back,forward,back,back]){
    await action(page);await expect(page.locator('#settingsModal')).toBeVisible();
    await expect(page.locator('#profileRecovery')).toBeVisible();await expect(page.locator('#welcome')).toBeHidden();
    await expect(page.locator('#settingsDone')).toBeDisabled();expect(await raw()).toEqual(checkpoint);
  }
  expect(await historyLength(page)).toBe(length);
});

test('unsafe viewport Back/Forward cannot clear the pause latch or advance the checkpoint',async({page})=>{
  await start(page);await page.setViewportSize({width:240,height:180});
  await expect(page.locator('#viewportModal')).toBeVisible();await expect(page.locator('#viewportResume')).toBeDisabled();
  const checkpoint=await bytes(page),length=await historyLength(page);
  await back(page);await expect(page.locator('#viewportModal')).toBeVisible();await expect(page.locator('#viewportResume')).toBeDisabled();
  await forward(page);await expect(page.locator('#viewportModal')).toBeVisible();await expect(page.locator('#viewportResume')).toBeDisabled();
  expect(await bytes(page)).toBe(checkpoint);expect(await historyLength(page)).toBe(length);
});

test('rapid multi-step Back safely returns from nested Options without a history bounce',async({page})=>{
  await start(page);await back(page);await paused(page);await press(page,'#pauseSettings');
  const checkpoint=await bytes(page),length=await historyLength(page);
  await page.evaluate(()=>history.go(-2));await expect(page.locator('#welcome')).toBeVisible();
  expect(await bytes(page)).toBe(checkpoint);expect(await historyLength(page)).toBe(length);
  await forward(page);await expect(page.locator('#welcome')).toBeVisible();
});

test('returning from another document keeps a cached battle paused or offers its saved checkpoint',async({page})=>{
  await page.addInitScript(()=>window.addEventListener('pageshow',event=>{window.__backPersisted=event.persisted;}));
  await start(page);await page.waitForTimeout(180);await page.goto('/FONTS-NOTICES.txt');await page.goBack();
  await expect(page.locator('#welcome:not(.hidden), #pauseVeil:not(.hidden)')).toBeVisible();
  const checkpoint=await bytes(page),length=await historyLength(page);
  test.info().annotations.push({type:'bfcache',description:await page.evaluate(()=>window.__backPersisted?'Browser retained the document.':'Browser reloaded; cached-document retention is not guaranteed.')});
  await page.waitForTimeout(180);expect(await bytes(page)).toBe(checkpoint);expect(await historyLength(page)).toBe(length);
});

test('native fullscreen exit and browser Back remain independent',async({page})=>{
  await page.goto('/');await press(page,'#welcomeSettings');const length=await historyLength(page);
  if(await page.locator('#settingsFullscreen').isDisabled()){
    await expect(page.locator('#fullscreenStatus')).toContainText('unavailable');
    test.info().annotations.push({type:'fullscreen',description:'Native fullscreen is unavailable on this browser; fallback checked.'});
  }else{
    await press(page,'#settingsFullscreen');await expect(page.locator('#settingsFullscreen')).toHaveAttribute('aria-disabled','false');
    if(await page.evaluate(()=>!!document.fullscreenElement)){
      // Use the actual browser API to leave fullscreen, not a fake popstate.
      await page.evaluate(()=>document.exitFullscreen());await expect(page.locator('#settingsModal')).toBeVisible();
    }else{
      await expect(page.locator('#fullscreenStatus')).toContainText('Could not enter');
      test.info().annotations.push({type:'fullscreen',description:'Native request was declined; no browser-security bypass attempted.'});
    }
  }
  expect(await historyLength(page)).toBe(length);await back(page);await expect(page.locator('#settingsModal')).toBeHidden();
});


test('Back unwinds the result report, result menu and ended field without changing rewards',async({page})=>{
  const fixture=reportFixture('skirmish-victory');await seedOnce(page,{[SAVE]:JSON.stringify(fixture.envelope)});
  await press(page,'#resumeSaved');await expect(page.locator('#resultModal')).toBeVisible();
  const domains=()=>page.evaluate(()=>Object.fromEntries(['ironroot.campaign.v1','ironroot.history.v1','ironroot.trials.v1','ironroot.battle.v1'].map(key=>[key,localStorage.getItem(key)])));
  const checkpoint=await domains();await press(page,'#resultReport details.battle-report > summary');
  await expect(page.locator('#resultReport details.battle-report')).toHaveJSProperty('open',true);
  await back(page);await expect(page.locator('#resultReport details.battle-report')).toHaveJSProperty('open',false);
  await expect(page.locator('#resultModal')).toBeVisible();await back(page);await expect(page.locator('#resultModal')).toBeHidden();
  await forward(page);await expect(page.locator('#resultModal')).toBeVisible();expect(await domains()).toEqual(checkpoint);
  await press(page,'#resultMenu');await expect(page.locator('#welcome')).toBeVisible();await press(page,'#lastResult');
  await expect(page.locator('#resultReport details.battle-report')).toHaveJSProperty('open',true);
  await back(page);await expect(page.locator('#resultReport details.battle-report')).toHaveJSProperty('open',false);
  await back(page);await expect(page.locator('#welcome')).toBeVisible();await expect(page.locator('#resultModal')).toBeHidden();
  expect(await domains()).toEqual(checkpoint);
});


test('Back closes the owned-building details before it pauses live combat',async({page})=>{
  await start(page);const checkpoint=await saved(page),building=checkpoint.game.state.buildings.find(b=>b.side===0);
  const map=getMap(checkpoint.game.mapId||'classic');await tapPoint(page,await homePoint(page,map,building.x,building.y));
  await expect(page.locator('#selectionPanel')).toBeVisible();await back(page);
  await expect(page.locator('#selectionPanel')).toBeHidden();await expect(page.locator('#pauseVeil')).toBeHidden();
  await expect(page.locator('#welcome')).toBeHidden();
});


test('repeated Back Forward Resume cycles do not accumulate duplicate pause entries',async({page})=>{
  await start(page);const length=await historyLength(page);
  for(let i=0;i<5;i++){
    await back(page);await paused(page);await forward(page);await paused(page);
    await press(page,'#resume');await expect(page.locator('#pauseVeil')).toBeHidden();
    expect(await historyLength(page),`cycle ${i+1}`).toBe(length);
  }
  await back(page);await paused(page);await back(page);await expect(page.locator('#welcome')).toBeVisible();
});
