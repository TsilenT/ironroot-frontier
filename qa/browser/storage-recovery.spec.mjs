// Browser/server execution is reserved for the authorized cloud runner. These
// synthetic, engine-valid saved positions are persistence regressions, not
// naturally played victories, balance evidence, or mobile hardware validation.
import {expect} from '@playwright/test';
import {BACKUP_STORAGE_KEYS,createBackup,parseBackup} from '../../dist/backup.js';
import {Game} from '../../dist/engine.js';
import {test,press,pause,seedOnce,openBackup,chooseBackup} from './map-browser-helpers.mjs';
import {reportFixture} from './battle-report-fixtures.mjs';
import {trainingProfileFixture,PROFILE_KEYS,PROFILE_MARKER} from './training-fixtures.mjs';

const {battle:SAVE,history:HISTORY,settings:SETTINGS}=BACKUP_STORAGE_KEYS;
const recentDetails='details:has(> #battleHistory)';
const initialPreferences={sound:true,music:false,sfx:false,volume:.3,reducedMotion:true,quality:'low'};

async function rawProfile(page){
  return page.evaluate(keys=>{
    // Read real durable bytes through the native method, including when the
    // app's key-specific read is faulted. Never consult private app state.
    const get=window.__qaStorageRecovery?.get??Storage.prototype.getItem;
    return Object.fromEntries(keys.map(key=>[key,get.call(localStorage,key)]));
  },PROFILE_KEYS);
}
async function seedProfile(page,{terminal=true}={}){
  const fixture=trainingProfileFixture(),result=reportFixture('skirmish-victory');
  const values={...fixture.values,[SETTINGS]:JSON.stringify(initialPreferences),
    ...(terminal?{[SAVE]:JSON.stringify(result.envelope)}:{})};
  // Report fixtures are legal engine resumes with a terminal condition awaiting
  // its next simulation tick, not importable unfinished-battle backup fixtures.
  // Validate every other profile domain through the existing backup contract.
  const backup=parseBackup(createBackup({getItem:key=>values[key]??null},{battle:null}));
  expect(Game.restore(JSON.parse(values[SAVE]).game).state.winner).toBeNull();
  await seedOnce(page,values);
  await expect(page.locator('#welcome')).toBeVisible();
  await expect(page.locator('#resumeSaved')).toBeVisible();
  await expect(page.locator('#profileRecovery')).toBeHidden();
  expect(JSON.parse((await rawProfile(page))[PROFILE_MARKER])).toMatchObject({version:2,phase:'ready'});
  expect(await rawProfile(page)).toEqual(values);
  return {values,oldHistory:backup.data.history,result};
}
async function installFaults(page,{read=[],write=[]}={}){
  // Install only AFTER app initialization and ready-v2 verification. The real
  // Storage backend, profile facade, engine, event loop and UI keep running.
  await page.evaluate(({read,write})=>{
    const get=Storage.prototype.getItem,set=Storage.prototype.setItem,remove=Storage.prototype.removeItem;
    const evidence={get,read:[...read],write:[...write],failedReads:[],writes:[],removes:[]};
    window.__qaStorageRecovery=evidence;
    Storage.prototype.getItem=function(key){
      if(this===localStorage&&evidence.read.includes(key)){
        evidence.failedReads.push(key);throw new DOMException('QA domain read denied','SecurityError');
      }
      return get.call(this,key);
    };
    Storage.prototype.setItem=function(key,value){
      if(this===localStorage){
        const blocked=evidence.write.includes(key);evidence.writes.push({key,value,blocked});
        if(blocked)throw new DOMException('QA domain quota exhausted','QuotaExceededError');
      }
      return set.call(this,key,value);
    };
    Storage.prototype.removeItem=function(key){
      if(this===localStorage)evidence.removes.push(key);
      return remove.call(this,key);
    };
  },{read,write});
}
async function restoreStorage(page){
  // Keep pass-through observation active, but restore every injected fault.
  await page.evaluate(()=>{window.__qaStorageRecovery.read=[];window.__qaStorageRecovery.write=[];});
}
async function evidence(page){
  return page.evaluate(()=>{
    const {failedReads,writes,removes}=window.__qaStorageRecovery;
    return {failedReads,writes,removes};
  });
}
async function finishSeededBattle(page){
  await press(page,'#resumeSaved');
  await expect(page.locator('#resultModal')).toBeVisible();
  await expect(page.locator('#resultTitle')).toHaveText('VICTORY');
  await expect(page.locator('#resultKills')).toHaveText('17');
  await expect(page.locator('#resultBuilt')).toHaveText('23');
}
async function expectRetryReachable(page,selector){
  const button=page.locator(selector);
  await expect(button).toBeVisible();await expect(button).toBeEnabled();
  await button.scrollIntoViewIfNeeded();await button.focus();
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  await expect(button).toBeInViewport({ratio:1});
  const geometry=await button.evaluate(element=>{
    const rect=element.getBoundingClientRect(),hit=document.elementFromPoint(rect.x+rect.width/2,rect.y+rect.height/2);
    const clips=[];
    for(let parent=element.parentElement;parent;parent=parent.parentElement){
      if(!/^(auto|scroll|hidden|clip)$/.test(getComputedStyle(parent).overflowY))continue;
      const bounds=parent.getBoundingClientRect();
      clips.push(rect.top>=bounds.top-1&&rect.bottom<=bounds.bottom+1);
    }
    return {height:rect.height,hit:!!hit&&(hit===element||element.contains(hit)),
      inDialog:!!element.closest('[role="dialog"]'),insideClips:clips.every(Boolean)};
  });
  expect(geometry.height,selector+' has a minimum 44px touch target').toBeGreaterThanOrEqual(44);
  expect(geometry.inDialog,selector+' is inside its recovery dialog').toBe(true);
  expect(geometry.insideClips,selector+' is reachable inside every scrolling/clipping ancestor').toBe(true);
  expect(geometry.hit,selector+' is genuinely hit-testable without click-time scrolling').toBe(true);
}
async function expectPendingHistory(page){
  await expect(page.locator('#resultHistoryWarning')).toContainText('1 completed battle result not verified saved');
  await expect(page.locator('#resultHistoryWarning')).toContainText('Keep this page open');
  await expect(page.locator('#retryResultHistory')).toBeVisible();
  await expectRetryReachable(page,'#retryResultHistory');
}
async function openRecentHistory(page){
  const details=page.locator(recentDetails);
  if(!await details.evaluate(element=>element.open))await press(page,recentDetails+' > summary');
  await expect(details).toHaveJSProperty('open',true);
}
function expectUnchangedDomains(actual,before,except=[]){
  for(const key of PROFILE_KEYS.filter(key=>!except.includes(key)))expect(actual[key],key+' remains byte-for-byte unchanged').toBe(before[key]);
}
function expectMergedResult(actual,fixture){
  const rows=JSON.parse(actual[HISTORY]);
  expect(rows).toHaveLength(fixture.oldHistory.length+1);
  expect(rows.slice(1)).toEqual(fixture.oldHistory);
  expect(rows[0]).toMatchObject({won:true,draw:false,challengeId:null,campaignId:null,
    difficulty:Game.restore(fixture.result.envelope.game).difficulty,kills:17,built:23});
  expect(rows[0].time).toBeGreaterThanOrEqual(fixture.result.envelope.game.state.time);
  expect(rows[0].time).toBeLessThanOrEqual(fixture.result.envelope.game.state.time+.1);
  expect(new Date(rows[0].date).toISOString()).toBe(rows[0].date);
  // The current backup validator checks the persisted schema too; pending
  // results must not add a second storage format or leak report/private data.
  expect(parseBackup(createBackup({getItem:key=>actual[key]??null})).data.history).toEqual(rows);
  return rows;
}
async function expectSingleHistoryCommit(page){
  const log=await evidence(page);
  expect(log.writes.filter(entry=>entry.key===HISTORY&&!entry.blocked)).toHaveLength(1);
}
async function reloadSavedHistory(page,bytes){
  await page.reload();
  await expect(page.locator('#welcome')).toBeVisible();
  expect((await rawProfile(page))[HISTORY]).toBe(bytes);
  await press(page,'#welcomeSettings');await openRecentHistory(page);
  await expect(page.locator('#historySaveWarning')).toBeHidden();
  await expect(page.locator('#retryHistory')).toBeHidden();
  await expect(page.locator('#battleHistory > p')).toHaveCount(2);
}

test('transient history read denial preserves seeded results and merges the retained victory only after Retry',async({page})=>{
  const fixture=await seedProfile(page);await installFaults(page,{read:[HISTORY]});
  await finishSeededBattle(page);await expectPendingHistory(page);
  const failed=await rawProfile(page);
  expect(failed[HISTORY]).toBe(fixture.values[HISTORY]);expect(failed[SAVE]).toBeNull();
  expectUnchangedDomains(failed,fixture.values,[HISTORY,SAVE]);
  const log=await evidence(page);expect(log.failedReads.length).toBeGreaterThan(0);
  expect(new Set(log.failedReads)).toEqual(new Set([HISTORY]));
  expect(log.writes.filter(entry=>entry.key===HISTORY)).toEqual([]);
  await press(page,'#retryResultHistory');await expectPendingHistory(page);
  expect((await rawProfile(page))[HISTORY]).toBe(fixture.values[HISTORY]);
  expect((await evidence(page)).writes.filter(entry=>entry.key===HISTORY)).toEqual([]);
  await restoreStorage(page);await press(page,'#retryResultHistory');
  await expect(page.locator('#resultHistoryWarning')).toBeHidden();
  await expect(page.locator('#retryResultHistory')).toBeHidden();
  const durable=await rawProfile(page);expectMergedResult(durable,fixture);
  expectUnchangedDomains(durable,fixture.values,[HISTORY,SAVE]);await expectSingleHistoryCommit(page);
  await reloadSavedHistory(page,durable[HISTORY]);
});

test('history quota failure retains the result across title and repeated reopen then Retry and reload save it exactly once',async({page})=>{
  const fixture=await seedProfile(page);await installFaults(page,{write:[HISTORY]});
  await finishSeededBattle(page);await expectPendingHistory(page);
  for(let attempt=0;attempt<2;attempt++){
    await press(page,'#resultMenu');await press(page,'#lastResult');await expectPendingHistory(page);
    expect((await rawProfile(page))[HISTORY]).toBe(fixture.values[HISTORY]);
  }
  const failedLog=await evidence(page);
  expect(failedLog.writes.filter(entry=>entry.key===HISTORY).length).toBeGreaterThanOrEqual(3);
  expect(failedLog.writes.filter(entry=>entry.key===HISTORY).every(entry=>entry.blocked)).toBe(true);
  const attemptedHistory=failedLog.writes.filter(entry=>entry.key===HISTORY).map(entry=>entry.value);
  expect(new Set(attemptedHistory).size,'reopening retries the same immutable result, including its original date').toBe(1);
  // The warning/action remain discoverable in settings after leaving a result.
  await press(page,'#resultMenu');await press(page,'#welcomeSettings');await openRecentHistory(page);
  await expect(page.locator('#historySaveWarning')).toContainText('1 completed battle result not verified saved');
  await expect(page.locator('#battleHistory > p')).toHaveCount(2);
  await expect(page.locator('#battleHistory > p').first()).toContainText('VICTORY · Skirmish · 00:40');
  await expectRetryReachable(page,'#retryHistory');
  await restoreStorage(page);await press(page,'#retryHistory');
  await expect(page.locator('#historySaveWarning')).toBeHidden();
  await expect(page.locator('#retryHistory')).toBeHidden();
  const durable=await rawProfile(page);expectMergedResult(durable,fixture);expect(durable[SAVE]).toBeNull();
  expect(durable[HISTORY]).toBe(attemptedHistory[0]);
  await expectSingleHistoryCommit(page);
  await press(page,'#settingsDone');
  for(let attempt=0;attempt<2;attempt++){
    await press(page,'#lastResult');await expect(page.locator('#resultHistoryWarning')).toBeHidden();
    await expect(page.locator('#retryResultHistory')).toBeHidden();await press(page,'#resultMenu');
  }
  expect(await rawProfile(page)).toEqual(durable);await expectSingleHistoryCommit(page);
  await reloadSavedHistory(page,durable[HISTORY]);
});

test('retrying a prior retained result cannot delete or rewrite a newer same-profile battle save',async({page})=>{
  const fixture=await seedProfile(page);await installFaults(page,{write:[HISTORY]});
  await finishSeededBattle(page);await expectPendingHistory(page);await press(page,'#resultMenu');
  await press(page,'[data-mode="skirmish"]');await press(page,'#start');
  const newer=await pause(page);expect(newer.game.state.winner).toBeNull();
  expect(newer.game.state.time).toBeLessThan(fixture.result.envelope.game.state.time);
  expect(newer.game.state.bases[1].hp).toBeGreaterThan(0);
  const before=await rawProfile(page),beforeLog=await evidence(page);
  await press(page,'#pauseSettings');await openRecentHistory(page);
  await expect(page.locator('#historySaveWarning')).toContainText('1 completed battle result not verified saved');
  await expectRetryReachable(page,'#retryHistory');
  await restoreStorage(page);await press(page,'#retryHistory');
  await expect(page.locator('#historySaveWarning')).toBeHidden();
  const durable=await rawProfile(page);expectMergedResult(durable,fixture);
  expectUnchangedDomains(durable,before,[HISTORY]);
  const afterLog=await evidence(page);
  expect(afterLog.removes).toEqual(beforeLog.removes);
  expect(afterLog.writes.filter(entry=>entry.key===SAVE)).toEqual(beforeLog.writes.filter(entry=>entry.key===SAVE));
  await expectSingleHistoryCommit(page);
  await press(page,'#settingsDone');await expect(page.locator('#pauseVeil')).toBeVisible();
  await press(page,'#saveExit');await expect(page.locator('#welcome')).toBeVisible();
  expect((await rawProfile(page))[SAVE]).toBe(before[SAVE]);
  await page.reload();await expect(page.locator('#resumeSaved')).toBeVisible();
  expect(await rawProfile(page)).toEqual(durable);
  await press(page,'#resumeSaved');const resumed=await pause(page);
  expect(resumed.game.difficulty).toBe(newer.game.difficulty);
  expect(resumed.game.state.time).toBeGreaterThanOrEqual(newer.game.state.time);
  expect(resumed.game.state.time).toBeLessThan(fixture.result.envelope.game.state.time);
  const layout=save=>save.game.state.buildings.filter(building=>building.side===0).map(({id,type,x,y,level})=>({id,type,x,y,level}));
  expect(layout(resumed)).toEqual(layout(newer));
  expect(resumed.game.state.bases[1].hp).toBeGreaterThan(0);
  expect((await rawProfile(page))[HISTORY]).toBe(durable[HISTORY]);
});

test('preference quota failure applies choices immediately but warns until verified Retry and survives reload',async({page})=>{
  const fixture=await seedProfile(page,{terminal:false});await press(page,'#welcomeSettings');
  await installFaults(page,{write:[SETTINGS]});
  await page.locator('#audioEnabled').uncheck();
  await expect(page.locator('#sound')).toHaveAttribute('aria-label','Enable audio');
  await page.locator('#reduceMotion').uncheck();await page.locator('#effectQuality').selectOption('high');
  const expected={...initialPreferences,sound:false,reducedMotion:false,quality:'high'};
  await expect(page.locator('#preferenceSaveWarning')).toContainText('apply only to this page and are not verified saved');
  await expectRetryReachable(page,'#retryPreferences');
  expect(await rawProfile(page)).toEqual(fixture.values);
  await press(page,'#retryPreferences');await expect(page.locator('#preferenceSaveWarning')).toBeVisible();
  expect(await rawProfile(page)).toEqual(fixture.values);
  await press(page,'#settingsDone');await press(page,'#welcomeSettings');
  await expect(page.locator('#audioEnabled')).not.toBeChecked();await expect(page.locator('#reduceMotion')).not.toBeChecked();
  await expect(page.locator('#effectQuality')).toHaveValue('high');await expect(page.locator('#preferenceSaveWarning')).toBeVisible();
  const failedWrites=(await evidence(page)).writes.filter(entry=>entry.key===SETTINGS);
  expect(failedWrites.length).toBeGreaterThanOrEqual(4);expect(failedWrites.every(entry=>entry.blocked)).toBe(true);
  await restoreStorage(page);await press(page,'#retryPreferences');
  await expect(page.locator('#preferenceSaveWarning')).toBeHidden();await expect(page.locator('#retryPreferences')).toBeHidden();
  const durable=await rawProfile(page);expect(JSON.parse(durable[SETTINGS])).toEqual(expected);
  expectUnchangedDomains(durable,fixture.values,[SETTINGS]);
  expect((await evidence(page)).writes.filter(entry=>entry.key===SETTINGS&&!entry.blocked)).toHaveLength(1);
  await page.reload();expect(await rawProfile(page)).toEqual(durable);await press(page,'#welcomeSettings');
  await expect(page.locator('#audioEnabled')).not.toBeChecked();await expect(page.locator('#reduceMotion')).not.toBeChecked();
  await expect(page.locator('#effectQuality')).toHaveValue('high');
  await expect(page.locator('#sound')).toHaveAttribute('aria-label','Enable audio');
  await expect(page.locator('#preferenceSaveWarning')).toBeHidden();
});

test('a retained preference retry refuses newer choices saved through another live tab',async({page,context})=>{
  await seedProfile(page,{terminal:false});await press(page,'#welcomeSettings');await installFaults(page,{write:[SETTINGS]});
  await page.locator('#audioEnabled').uncheck();await expect(page.locator('#preferenceSaveWarning')).toBeVisible();
  const other=await context.newPage(),errors=[];other.on('pageerror',error=>errors.push(error.message));
  try{
    await other.goto('/');await press(other,'#welcomeSettings');await other.locator('#effectQuality').selectOption('high');
    await expect(other.locator('#preferenceSaveWarning')).toBeHidden();
    const newer=await rawProfile(other);expect(JSON.parse(newer[SETTINGS])).toEqual({...initialPreferences,quality:'high'});
    await page.bringToFront();await restoreStorage(page);
    for(let attempt=0;attempt<2;attempt++){
      await press(page,'#retryPreferences');
      await expect(page.locator('#preferenceSaveWarning')).toContainText('cannot be safely replaced by this tab');
      expect(await rawProfile(page)).toEqual(newer);
    }
    await expect(page.locator('#audioEnabled')).not.toBeChecked();
    expect((await evidence(page)).writes.filter(entry=>entry.key===SETTINGS&&!entry.blocked)).toEqual([]);
    expect(errors).toEqual([]);
  }finally{await other.close();}
});

test('a real backup replacement fences both retained history and preference retries in the stale tab',async({page,context})=>{
  await seedProfile(page);await installFaults(page,{write:[HISTORY,SETTINGS]});
  await finishSeededBattle(page);await expectPendingHistory(page);await press(page,'#resultMenu');
  await press(page,'#welcomeSettings');await page.locator('#audioEnabled').uncheck();
  await expect(page.locator('#preferenceSaveWarning')).toBeVisible();await openRecentHistory(page);
  const other=await context.newPage(),errors=[];other.on('pageerror',error=>errors.push(error.message));
  try{
    await other.goto('/');await openBackup(other);
    const replacement=trainingProfileFixture();
    const text=createBackup({getItem:key=>replacement.values[key]??null},{history:[],settings:{...initialPreferences,volume:.65,quality:'high'}});
    const expected=parseBackup(text);
    await chooseBackup(other,text);await expect(other.locator('#backupModal')).toBeVisible();
    await Promise.all([other.waitForEvent('load'),press(other,'#confirmImport')]);
    await expect(other.locator('#welcome')).toBeVisible();
    const durable=await rawProfile(other);
    for(const [domain,key] of Object.entries(BACKUP_STORAGE_KEYS))expect(JSON.parse(durable[key])).toEqual(expected.data[domain]);
    expect(JSON.parse(durable[PROFILE_MARKER])).toMatchObject({version:2,phase:'ready'});
    expect(durable[PROFILE_MARKER]).not.toBe(replacement.values[PROFILE_MARKER]);
    await page.bringToFront();await expect(page.locator('#profileRecovery')).toBeVisible();
    await expect(page.locator('#profileRecoveryMessage')).toContainText(/replaced|reload/i);
    await restoreStorage(page);const beforeLog=await evidence(page);
    await press(page,'#retryPreferences');await openRecentHistory(page);await press(page,'#retryHistory');
    await expect(page.locator('#preferenceSaveWarning')).toContainText('cannot be safely replaced by this tab');
    await expect(page.locator('#historySaveWarning')).toContainText('profile or battle save changed');
    await expect(page.locator('#retryPreferences')).toBeVisible();await expect(page.locator('#retryHistory')).toBeVisible();
    expect(await rawProfile(page)).toEqual(durable);
    const afterLog=await evidence(page);expect(afterLog.writes).toEqual(beforeLog.writes);expect(afterLog.removes).toEqual(beforeLog.removes);
    await expect(page.locator('#closeSettings')).toBeDisabled();await expect(page.locator('#settingsDone')).toBeDisabled();
    await Promise.all([page.waitForEvent('load'),press(page,'#profileReload')]);
    await expect(page.locator('#profileRecovery')).toBeHidden();expect(await rawProfile(page)).toEqual(durable);
    await press(page,'#welcomeSettings');await openRecentHistory(page);
    await expect(page.locator('#preferenceSaveWarning')).toBeHidden();await expect(page.locator('#historySaveWarning')).toBeHidden();
    await expect(page.locator('#battleHistory')).toHaveText('Your completed battles will appear here.');
    await expect(page.locator('#audioEnabled')).toBeChecked();await expect(page.locator('#masterVolume')).toHaveValue('65');
    expect(errors).toEqual([]);
  }finally{await other.close();}
});
