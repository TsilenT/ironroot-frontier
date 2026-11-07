import {CURRENT_PROFILE_PROTOCOL_VERSION} from '../../dist/profile-session.js';
import { prepareBuildControl, openBuildControls } from './shared-build-controls.mjs';
import {test as base, expect} from '@playwright/test';
import {Game, BUILDINGS} from '../../dist/engine.js';
import {BACKUP_STORAGE_KEYS,createBackup,parseBackup} from '../../dist/backup.js';
import {seedOnce,chooseBackup,downloadBackup} from './map-browser-helpers.mjs';
import {trainingProfileFixture,PROFILE_KEYS,PROFILE_MARKER} from './training-fixtures.mjs';
const SAVE = 'ironroot.battle.v1', HISTORY = 'ironroot.history.v1';
// Every case fails on uncaught app errors, including errors during storage recovery.
const test = base.extend({page: async ({page}, use) => {
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await use(page); expect(errors, 'uncaught browser errors').toEqual([]);
}});
async function press(page, selector) {
  if (await prepareBuildControl(page, selector)) return;
  const target = page.locator(selector);
  if (await page.evaluate(() => navigator.maxTouchPoints > 0)) await target.tap();
  else await target.click();
}
async function open(page) {await page.goto('/'); await press(page,'[data-mode="skirmish"]'); await expect(page.locator('#start')).toBeVisible();}
async function start(page) {await open(page); await press(page, '#start'); await expect(page.locator('#welcome')).toBeHidden();}
async function saved(page) {return page.evaluate(key => {const data=JSON.parse(localStorage.getItem(key)); return data?.format === 'ironroot-save' ? data.game : data;}, SAVE);}
async function pause(page) {await press(page, '#pause'); await expect(page.locator('#pauseVeil')).toBeVisible(); return saved(page);}
async function seed(page, data) {
  await page.addInitScript(({key, value}) => localStorage.setItem(key, value), {key: SAVE, value: JSON.stringify(data)});
  await open(page); await press(page, '#resumeSaved');
}
// Coordinates are derived from the documented renderer transform after Go to base.
// No private app state or production hook is exposed; saved state is the oracle.
async function slot(page, x = 550, y = 450) {
  await press(page, '#home');
  const r = await page.locator('#battle').boundingBox(), scale = Math.max(.32, r.height / 900);
  const half = r.width / (2 * scale), camera = half >= 1600 ? 1600 : Math.max(half, 450);
  return {x: r.x + r.width / 2 + (x - camera) * scale, y: r.y + r.height / 2 + (y - 450) * scale};
}
async function tapPoint(page, p) {
  if (await page.evaluate(() => navigator.maxTouchPoints > 0)) await page.touchscreen.tap(p.x, p.y);
  else await page.mouse.click(p.x, p.y);
}
async function fits(page, selector) {
  const r = await page.locator(selector).boundingBox(), v = page.viewportSize();
  expect(r, selector).not.toBeNull(); expect(r.width).toBeGreaterThan(0); expect(r.height).toBeGreaterThan(0);
  expect(r.x, selector).toBeGreaterThanOrEqual(-1); expect(r.y, selector).toBeGreaterThanOrEqual(-1);
  expect(r.x + r.width, selector).toBeLessThanOrEqual(v.width + 1); expect(r.y + r.height, selector).toBeLessThanOrEqual(v.height + 1);
}

test('tap places exactly one building, rejects occupied slot, upgrades and salvages', async ({page}) => {
  await start(page); const p = await slot(page,270);
  const baseline = await pause(page); await press(page, '#resume');
  await press(page, '[data-type="archery"]'); await tapPoint(page, p);
  await expect(page.locator('#toast')).toContainText('Archery range raised');
  await expect(page.locator('#battle')).not.toHaveClass(/placing/);
  const placed = await pause(page); await press(page, '#resume');
  expect(placed.state.buildings.filter(b => b.side === 0 && b.type === 'archery')).toHaveLength(1);
  await press(page, '[data-type="archery"]'); // A distinct order tests the occupied site.
  await tapPoint(page, p); await expect(page.locator('#toast')).toContainText('Too close');
  const snapshot = await pause(page);
  expect(snapshot.state.buildings.filter(b => b.side === 0 && b.type === 'archery')).toHaveLength(1);
  expect(placed.state.stats.built[0]).toBe(baseline.state.stats.built[0] + 1);
  expect(snapshot.state.stats.built[0]).toBe(placed.state.stats.built[0]);
  // Ordinary Pause saves bracket each action. Account for every income tick,
  // including slow browser runs, and require the occupied attempt to cost zero.
  for (const [before, after, cost] of [[baseline, placed, BUILDINGS.archery.cost], [placed, snapshot, 0]]) {
    Game.restore(before); Game.restore(after);
    for (const checkpoint of [before, after]) {
      expect(checkpoint.state.income[0]).toBe(5);
      expect(checkpoint.state.buildings.filter(b => b.side === 0 && b.type === 'mint')).toHaveLength(0);
    }
    expect(after.state.stats.kills[0]).toBe(before.state.stats.kills[0]);
    expect(after.tick).toBeGreaterThanOrEqual(before.tick);
    let expectedTime = before.state.time;
    for (let tick = before.tick; tick < after.tick; tick++) expectedTime += .05;
    expect(after.state.time).toBe(expectedTime);
    expect(after.state.gold[0]).toBe(before.state.gold[0] - cost + (after.tick - before.tick) * (5 * .05));
  }
  await press(page, '#resume'); await press(page, '#cancelBuild'); await tapPoint(page, p);
  await expect(page.locator('#selectionTitle')).toHaveText('Archery range');
  await press(page, '#upgrade'); await expect(page.locator('#selectionDetail')).toContainText('Level 2');
  await press(page, '#sell'); await expect(page.locator('#selectionPanel')).toBeHidden();
  expect((await pause(page)).state.buildings.filter(b => b.side === 0 && b.type === 'archery')).toHaveLength(0);
});

test('drag in placement mode does not build or spend gold', async ({page, context}) => {
  await start(page); await press(page, '[data-type="archery"]'); const p = await slot(page);
  if (await page.evaluate(() => navigator.maxTouchPoints > 0)) {
    const cdp = await context.newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent', {type:'touchStart', touchPoints:[p]});
    for (let step=1;step<=5;step++) {
      await page.waitForTimeout(30);
      await cdp.send('Input.dispatchTouchEvent', {type:'touchMove', touchPoints:[{x:p.x-13*step,y:p.y}]});
    }
    await page.waitForTimeout(30);
    await cdp.send('Input.dispatchTouchEvent', {type:'touchEnd', touchPoints:[]}); // Chromium suppresses synthetic clicks immediately after a touch scroll.
    await page.waitForTimeout(400);
  } else {await page.mouse.move(p.x,p.y); await page.mouse.down(); await page.mouse.move(p.x-65,p.y,{steps:5}); await page.mouse.up();}
  const s = await pause(page); expect(s.state.buildings.filter(b => b.side === 0)).toHaveLength(1); expect(s.state.gold[0]).toBeGreaterThanOrEqual(420);
});

test('controls fit the viewport and survive orientation changes', async ({page}) => {
  await start(page);
  for (const size of [page.viewportSize(), {width:844,height:390}, {width:320,height:568}, {width:390,height:650}]) {
    await page.setViewportSize(size);
    // Landscape reserves an actual 152px control rail. The battlefield still
    // fills every remaining CSS pixel; backing dimensions must match that
    // independently checked layout, not the entire browser viewport.
    await expect.poll(() => page.locator('#battle').evaluate(canvas => {
      const rect=canvas.getBoundingClientRect(),rail=document.getElementById('protectedNavigation').getBoundingClientRect();
      const landscape=matchMedia('(max-height: 500px) and (orientation: landscape)').matches;
      const dpr=Math.min(devicePixelRatio||1,2);
      return {
        viewport:[innerWidth,innerHeight],width:rect.width,
        expectedWidth:innerWidth-(landscape?152:0),
        startsAtLeft:rect.left===0,
        rightEdgeMatches:rect.right===(landscape?rail.left:innerWidth),
        railFits:!landscape||(rail.width===152&&rail.right===innerWidth),
        backingMatches:canvas.width===Math.round(rect.width*dpr)&&canvas.height===Math.round(rect.height*dpr),
      };
    })).toEqual({viewport:[size.width,size.height],width:size.width-(size.height<=500&&size.width>size.height?152:0),expectedWidth:size.width-(size.height<=500&&size.width>size.height?152:0),startsAtLeft:true,rightEdgeMatches:true,railFits:true,backingMatches:true});
    await openBuildControls(page);
    for (const selector of ['#battle','#pause','#speed','#sound','#settings','#home','#front','#rally','.command-deck']) await fits(page,selector);
    await press(page,'#pause'); await fits(page,'#help');
    await press(page,'#help'); await expect(page.locator('#helpModal')).toBeVisible(); await press(page,'#guideDone');
    await expect(page.locator('#pauseVeil')).toBeVisible(); await press(page,'#resume');
  }
  const p = await slot(page); await press(page,'[data-type="archery"]'); await tapPoint(page,p);
  await expect(page.locator('#toast')).toContainText('Archery range raised');
});

test('pause and field guide freeze time; resume advances it', async ({page}) => {
  await start(page); await expect(page.locator('#time')).not.toHaveText('00:00');
  const s = await pause(page), time = await page.locator('#time').innerText();
  await page.waitForTimeout(1200); await expect(page.locator('#time')).toHaveText(time);
  await page.keyboard.press('Digit2'); await expect(page.locator('#cancelBuild')).toBeHidden();
  await press(page,'#resume'); await expect(page.locator('#time')).not.toHaveText(time);
  await press(page,'#pause'); await press(page,'#help'); const helpTime = await page.locator('#time').innerText();
  await page.waitForTimeout(1200); await expect(page.locator('#time')).toHaveText(helpTime);
  await press(page,'#guideDone'); await expect(page.locator('#pauseVeil')).toBeVisible();
  await expect(page.locator('#time')).toHaveText(helpTime);
  await press(page,'#resume'); await expect(page.locator('#time')).not.toHaveText(helpTime);
  expect((await pause(page)).state.time).toBeGreaterThan(s.state.time);
});

test('save, title, reload and resume preserve buildings, gold, time and difficulty', async ({page}) => {
  await open(page); await press(page,'[data-difficulty="hard"]'); await press(page,'#start');
  await press(page,'[data-type="archery"]'); await tapPoint(page,await slot(page));
  const s = await pause(page); await press(page,'#saveExit'); await expect(page.locator('#resumeSaved')).toBeVisible();
  await page.reload(); await press(page,'#resumeSaved'); const resumed = await pause(page);
  expect(resumed.difficulty).toBe('hard');
  expect(resumed.state.buildings.filter(b=>b.side===0).map(b=>[b.type,b.x,b.y,b.level])).toEqual(s.state.buildings.filter(b=>b.side===0).map(b=>[b.type,b.x,b.y,b.level]));
  expect(resumed.state.time).toBeGreaterThanOrEqual(s.state.time); expect(resumed.state.time-s.state.time).toBeLessThan(2);
  expect(resumed.state.gold[0]).toBeGreaterThanOrEqual(s.state.gold[0]); expect(resumed.state.gold[0]-s.state.gold[0]).toBeLessThan(20);
  await press(page,'#resume'); await expect(page.locator('#pause')).toHaveAttribute('aria-label','Pause game');
});

for (const invalid of ['{broken', JSON.stringify({version:999})]) test(`invalid save is retained until explicit backup recovery: ${invalid}`, async ({page}) => {
  await seedOnce(page,{[SAVE]:invalid});await press(page,'[data-mode="skirmish"]'); await expect(page.locator('#resumeSaved')).toBeHidden();
  await expect(page.locator('#saveStatus')).toBeVisible();
  await expect(page.locator('#saveStatus')).toContainText('could not be loaded');
  expect(await page.evaluate(key=>localStorage.getItem(key),SAVE)).toBe(invalid);
  await press(page,'#start');await expect(page.locator('#settingsModal')).toBeVisible();
  expect(await page.evaluate(key=>localStorage.getItem(key),SAVE)).toBe(invalid);
  await expect(page.locator('#backupStatus')).toContainText('original saved battle is unchanged');
  if(!await page.locator('.backup-details').evaluate(e=>e.open))await press(page,'.backup-details > summary');
  const clean=createBackup({getItem:()=>null},{createdAt:'2026-11-06T00:00:00.000Z'});
  await chooseBackup(page,clean);await Promise.all([page.waitForEvent('load'),press(page,'#confirmImport')]);
  await press(page,'[data-mode="skirmish"]');await press(page,'#start');await expect(page.locator('#pause')).toBeVisible();
  const replacement = await saved(page); expect(replacement.version).toBe(3); Game.restore(replacement);
});

test('denied storage keeps unsaved battle open without crashing settings or pause', async ({page}) => {
  await page.addInitScript(() => {for(const method of ['getItem','setItem','removeItem']) Storage.prototype[method] = () => {throw new DOMException('Storage blocked','SecurityError');};});
  await open(page); await press(page,'#welcomeSettings'); await press(page,'#audioEnabled'); await press(page,'#settingsDone'); await press(page,'#start'); await press(page,'#sound'); await press(page,'#pause'); await expect(page.locator('#pauseVeil')).toBeVisible(); await press(page,'#saveExit');
  await expect(page.locator('#welcome')).toBeHidden(); await expect(page.locator('#pauseVeil')).toBeVisible();
  await expect(page.locator('#toast')).toContainText(/could not save/i); await press(page,'#resume'); await expect(page.locator('#pauseVeil')).toBeHidden();
});

test('welcome and guide trap keyboard focus and restore playable focus', async ({page}) => {
  await open(page); await page.locator('#welcomeSettings').focus(); await page.keyboard.press('Tab');
  await expect(page.locator('[data-mode="campaign"]')).toBeFocused();
  await page.keyboard.press('Shift+Tab'); await expect(page.locator('#welcomeSettings')).toBeFocused();
  await page.locator('#welcomeHelp').focus();
  await page.keyboard.press('Enter'); await expect(page.locator('#closeHelp')).toBeFocused();
  await page.keyboard.press('Shift+Tab'); await expect(page.locator('#guideDone')).toBeFocused();
  await page.keyboard.press('Tab'); await expect(page.locator('#closeHelp')).toBeFocused();
  await page.keyboard.press('Escape'); await expect(page.locator('#welcome')).toBeVisible();
  await press(page,'#start'); await expect(page.locator('#battle')).toBeFocused();
  await page.keyboard.press('Digit2'); await expect(page.locator('[data-type="archery"]')).toHaveClass(/active/);
  await page.keyboard.press('Escape'); await expect(page.locator('#cancelBuild')).toBeHidden();
  await page.keyboard.press('Space'); await expect(page.locator('#pauseVeil')).toBeVisible();
  await page.keyboard.press('Space'); await expect(page.locator('#pauseVeil')).toBeHidden();
});

for (const outcome of ['VICTORY','DEFEAT','DRAW']) test(`near-end restored match reaches ${outcome}, clears save and supports replay`, async ({page}) => {
  const game = new Game({seed:123,ai:false}); const data = game.serialize();
  data.state.time = 421; data.state.overtime = true;
  if(outcome !== 'VICTORY') data.state.bases[0].hp = .01;
  if(outcome !== 'DEFEAT') data.state.bases[1].hp = .01;
  Game.restore(data); // Keep test fixtures within the actual persistence contract.
  await seed(page,data); await expect(page.locator('#resultTitle')).toHaveText(outcome);
  await expect(page.locator('#resultModal')).toBeVisible(); expect(await saved(page)).toBeNull();
  const history = await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),HISTORY);
  expect(history).toHaveLength(1); expect(history[0].won).toBe(outcome==='VICTORY'); expect(history[0].draw).toBe(outcome==='DRAW');
  await expect(page.locator('#playAgain')).toBeFocused();
  await page.keyboard.press('Shift+Tab'); await expect(page.locator('#resultReport details.battle-report > summary')).toBeFocused();
  await page.keyboard.press('Shift+Tab'); await expect(page.locator('#inspectBattle')).toBeFocused();
  await press(page,'#inspectBattle'); await expect(page.locator('#pause')).toHaveAttribute('aria-label','Return to title');
  await press(page,'#pause'); await expect(page.locator('#resumeSaved')).toBeHidden();
  await press(page,'#start'); await expect(page.locator('#pause')).toHaveAttribute('aria-label','Pause game');
  await pause(page);
});

test('failed save warns the player before leaving the active battle', async ({page}) => {
  // This case concerns a write failure during an already initialized battle.
  // Migration failures before startup are covered by profile-upgrade.spec.mjs.
  await start(page);
  const before = await page.evaluate(key=>localStorage.getItem(key),SAVE);
  expect(before).not.toBeNull();
  await expect(page.locator('#time')).not.toHaveText('00:00');
  await page.evaluate(key=>{
    const original=Storage.prototype.setItem;
    window.__qaFailedBattleSaves=0;
    Storage.prototype.setItem=function(name,value){
      if(this===localStorage&&name===key){window.__qaFailedBattleSaves++;throw new DOMException('Quota full','QuotaExceededError');}
      return original.call(this,name,value);
    };
  },SAVE);
  await press(page,'#pause'); await press(page,'#saveExit');
  await expect(page.locator('#toast')).toContainText(/unable|failed|storage|could not|not saved/i);
  await expect(page.locator('#welcome')).toBeHidden(); await expect(page.locator('#pauseVeil')).toBeVisible();
  expect(await page.evaluate(()=>window.__qaFailedBattleSaves)).toBeGreaterThanOrEqual(2);
  expect(await page.evaluate(key=>localStorage.getItem(key),SAVE)).toBe(before);
  await press(page,'#resume'); await expect(page.locator('#pauseVeil')).toBeHidden();
});

test('Space activates the focused Save and return button', async ({page}) => {
  await start(page); await press(page,'#pause'); await page.locator('#saveExit').focus();
  await page.keyboard.press('Space'); await expect(page.locator('#welcome')).toBeVisible();
});

// Reproduces Chromium's compatibility click landing on a newly inserted overlay.
test('a touch selecting a building keeps its details panel open', async ({page}) => {
  test.skip(page.viewportSize().width !== 390, 'Coordinate-specific phone regression');
  await start(page); const p = await slot(page,550);
  await press(page,'[data-type="archery"]'); await tapPoint(page,p);
  await expect(page.locator('#battle')).not.toHaveClass(/placing/); await tapPoint(page,p);
  await expect(page.locator('#selectionPanel')).toBeVisible();
  await page.waitForTimeout(350); await expect(page.locator('#selectionPanel')).toBeVisible();
  await press(page,'#closeSelection'); await expect(page.locator('#selectionPanel')).toBeHidden();
  await tapPoint(page,p); await expect(page.locator('#selectionPanel')).toBeVisible();
});

// This recovery flow uses one seed and genuine UI downloads/imports. Reloads
// must observe the app's restored bytes, never an init script's old corruption.
async function historyRecoveryBytes(page) {
  return page.evaluate(keys=>Object.fromEntries(keys.map(key=>[key,localStorage.getItem(key)])),PROFILE_KEYS);
}
async function downloadRetainedHistory(page) {
  const event=page.waitForEvent('download');await press(page,'#exportRetained');
  const file=await event;expect(await file.failure()).toBeNull();
  expect(file.suggestedFilename()).toMatch(/^ironroot-retained-session-backup-\d{4}-\d{2}-\d{2}\.json$/);
  const stream=await file.createReadStream(),parts=[];expect(stream).not.toBeNull();
  for await(const chunk of stream)parts.push(chunk);
  const text=Buffer.concat(parts).toString('utf8');
  return {file,text,backup:parseBackup(text)};
}
for (const value of ['{broken', 'null', '{"not":"an array"}', '[null,4,"bad",[]]']) {
  test(`malformed history recovers through explicit retained-backup replacement: ${value}`, async ({page}) => {
    // Full recovery now includes two real downloads, confirmation and reloads,
    // rather than only observing a terminal frame. Keep individual assertions bounded.
    test.setTimeout(45000);
    const fixture=trainingProfileFixture(),data=new Game({seed:123,ai:false}).serialize();
    data.state.time=421;data.state.overtime=true;data.state.bases[1].hp=.01;
    Game.restore(data); // Synthetic legal resume; the actual engine decides the victory.
    const values={...fixture.values,[HISTORY]:value,
      [SAVE]:JSON.stringify({format:'ironroot-save',version:2,challengeId:null,campaignId:null,game:data})};
    await seedOnce(page,values);
    await expect(page.locator('#resumeSaved')).toBeVisible();
    await expect(page.locator('#profileRecovery')).toBeHidden();
    expect(await historyRecoveryBytes(page)).toEqual(values);
    await page.evaluate(keys=>{
      // Native pass-through observer only. No fake storage or private app hook.
      window.__qaMalformedHistoryMutations=[];
      for(const method of ['setItem','removeItem','clear']) {
        const original=Storage.prototype[method];
        Storage.prototype[method]=function(...args){
          if(this===localStorage&&(method==='clear'||keys.includes(args[0])))
            window.__qaMalformedHistoryMutations.push({method,args});
          return original.apply(this,args);
        };
      }
    },PROFILE_KEYS);
    await press(page,'#resumeSaved');
    await expect(page.locator('#resultModal')).toBeVisible();
    await expect(page.locator('#resultTitle')).toHaveText('VICTORY');
    await expect(page.locator('#resultTime')).toHaveText('07:01');
    await expect(page.locator('#resultHistoryWarning')).toContainText('1 completed battle result not verified saved');
    await expect(page.locator('#resultHistoryWarning')).toContainText('Existing history is unreadable and has not been replaced');
    const completed={...values,[SAVE]:null};
    expect(await historyRecoveryBytes(page)).toEqual(completed);
    for(let attempt=0;attempt<2;attempt++) {
      await press(page,'#retryResultHistory');
      await expect(page.locator('#resultHistoryWarning')).toContainText('1 completed battle result not verified saved');
      expect(await historyRecoveryBytes(page)).toEqual(completed);
    }
    await press(page,'#resultMenu');await press(page,'#welcomeSettings');
    const recent='details:has(> #battleHistory)';await press(page,recent+' > summary');
    await expect(page.locator('#historySaveWarning')).toContainText('Existing history is unreadable and has not been replaced');
    await expect(page.locator('#battleHistory > p')).toHaveCount(2);
    await expect(page.locator('#battleHistory > p').first()).toHaveText('Showing this tab’s retained results; stored history could not be checked.');
    await expect(page.locator('#battleHistory > p').last()).toHaveText('VICTORY · Skirmish · 07:01');
    await press(page,'#retryHistory');
    await expect(page.locator('#historySaveWarning')).toContainText('1 completed battle result not verified saved');
    await expect(page.locator('#battleHistory > p')).toHaveCount(2);
    expect(await historyRecoveryBytes(page)).toEqual(completed);

    await press(page,'.backup-details > summary');
    const downloads=[];page.on('download',file=>downloads.push(file));
    await press(page,'#exportBackup');
    await expect(page.locator('#backupStatus')).toContainText('Stored history cannot be read safely');
    await expect(page.locator('#backupStatus')).toContainText('not a complete saved-profile backup');
    expect(downloads).toHaveLength(0);
    expect(await historyRecoveryBytes(page)).toEqual(completed);
    const retained=await downloadRetainedHistory(page);
    expect(downloads).toEqual([retained.file]); // The refused ordinary export produced no file.
    await expect(page.locator('#backupStatus')).toContainText('Stored history was unavailable; only this tab’s retained results are included.');
    const history=retained.backup.data.history;expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({won:true,draw:false,challengeId:null,campaignId:null,
      difficulty:data.difficulty,kills:data.state.stats.kills[0],built:data.state.stats.built[0]});
    expect(history[0].time).toBeGreaterThanOrEqual(data.state.time);
    expect(history[0].time).toBeLessThanOrEqual(data.state.time+.1);
    expect(new Date(history[0].date).toISOString()).toBe(history[0].date);
    expect(retained.backup.data).toEqual({...fixture.backup.data,battle:null,history});
    expect(await historyRecoveryBytes(page)).toEqual(completed);

    // Selecting/previewing the exact downloaded bytes cannot authorize a write.
    // Only the public, explicitly named replacement control does that.
    await chooseBackup(page,retained.text);
    await expect(page.locator('#backupModal')).toBeVisible();
    await expect(page.locator('#backupSummary')).toContainText('No battle in this file');
    await expect(page.locator('#backupModal .backup-warning')).toHaveText('This replaces this browser’s campaign stars, trial records, preferences, battle history and saved battle, including your current battle. Export a backup first to keep your current progress.');
    await expect(page.locator('#confirmImport')).toHaveText('Replace local saves');
    await expect(page.locator('#confirmImport')).toBeEnabled();
    expect(await historyRecoveryBytes(page)).toEqual(completed);
    expect(await page.evaluate(key=>window.__qaMalformedHistoryMutations.filter(entry=>entry.method==='clear'||entry.args[0]!==key),SAVE),
      'history, preferences, progress and profile marker remain entirely unwritten before confirmation').toEqual([]);
    await Promise.all([page.waitForEvent('load'),press(page,'#confirmImport')]);
    await expect(page.locator('#welcome')).toBeVisible();
    await expect(page.locator('#profileRecovery')).toBeHidden();
    await expect(page.locator('#resumeSaved')).toBeHidden();
    const restored=await historyRecoveryBytes(page);
    for(const [domain,key] of Object.entries(BACKUP_STORAGE_KEYS))
      expect(JSON.parse(restored[key])).toEqual(retained.backup.data[domain]);
    expect(JSON.parse(restored[PROFILE_MARKER])).toMatchObject({format:'ironroot-profile',version:CURRENT_PROFILE_PROTOCOL_VERSION,phase:'ready'});
    expect(JSON.parse(restored[PROFILE_MARKER]).epoch).not.toBe(JSON.parse(values[PROFILE_MARKER]).epoch);
    expect(parseBackup(createBackup({getItem:key=>restored[key]??null})).data).toEqual(retained.backup.data);
    await press(page,'#welcomeSettings');await press(page,recent+' > summary');
    await expect(page.locator('#historySaveWarning')).toBeHidden();await expect(page.locator('#retryHistory')).toBeHidden();
    await expect(page.locator('#battleHistory > p')).toHaveText(['VICTORY · Skirmish · 07:01']);
    await page.reload(); // No re-seeding and no pending result may append a duplicate.
    await expect(page.locator('#welcome')).toBeVisible();expect(await historyRecoveryBytes(page)).toEqual(restored);
    await press(page,'#welcomeSettings');await press(page,recent+' > summary');
    await expect(page.locator('#historySaveWarning')).toBeHidden();await expect(page.locator('#retryHistory')).toBeHidden();
    await expect(page.locator('#battleHistory > p')).toHaveText(['VICTORY · Skirmish · 07:01']);
    await press(page,'.backup-details > summary');
    expect(parseBackup(await downloadBackup(page)).data).toEqual(retained.backup.data);
    expect(downloads).toHaveLength(2);expect(await historyRecoveryBytes(page)).toEqual(restored);
  });
}

test('failed save retains the previous durable snapshot and can recover', async ({page}) => {
  await start(page); await pause(page);
  const prior = await page.evaluate(key=>localStorage.getItem(key),SAVE);
  // Identical paused snapshots deliberately skip writes. Advance the real
  // simulation below the five-second autosave interval before testing failure.
  await press(page,'#resume'); await page.waitForTimeout(350);
  await page.evaluate(() => {
    window.originalSetItem=Storage.prototype.setItem;
    Storage.prototype.setItem=()=>{throw new DOMException('Quota full','QuotaExceededError');};
  });
  await press(page,'#pause'); await expect(page.locator('#pauseVeil')).toBeVisible();
  await press(page,'#saveExit'); await expect(page.locator('#pauseVeil')).toBeVisible();
  await expect(page.locator('#welcome')).toBeHidden();
  expect(await page.evaluate(key=>localStorage.getItem(key),SAVE)).toBe(prior);
  await page.evaluate(() => {Storage.prototype.setItem=window.originalSetItem; delete window.originalSetItem;});
  await press(page,'#saveExit'); await expect(page.locator('#welcome')).toBeVisible();
  await expect(page.locator('#resumeSaved')).toBeVisible();
  await press(page,'#resumeSaved'); await pause(page);
});

test('preferences persist after reload and Space activates a focused checkbox', async ({page}) => {
  await open(page); await press(page,'#welcomeSettings');
  await page.locator('#reduceMotion').focus();
  const prior = await page.locator('#reduceMotion').isChecked();
  await page.keyboard.press('Space');
  await expect(page.locator('#reduceMotion')).toBeChecked({checked:!prior});
  await page.selectOption('#effectQuality','low');
  await press(page,'#settingsDone'); await page.reload(); await press(page,'#welcomeSettings');
  await expect(page.locator('#reduceMotion')).toBeChecked({checked:!prior});
  await expect(page.locator('#effectQuality')).toHaveValue('low');
});
