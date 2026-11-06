import {test as base, expect} from '@playwright/test';
import {Game, BUILDINGS} from '../../dist/engine.js';
const SAVE = 'ironroot.battle.v1', HISTORY = 'ironroot.history.v1';
// Every case fails on uncaught app errors, including errors during storage recovery.
const test = base.extend({page: async ({page}, use) => {
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await use(page); expect(errors, 'uncaught browser errors').toEqual([]);
}});
async function press(page, selector) {
  const target = page.locator(selector);
  if (await page.evaluate(() => navigator.maxTouchPoints > 0)) await target.tap();
  else await target.click();
}
async function open(page) {await page.goto('/'); await expect(page.locator('#start')).toBeVisible();}
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
  await press(page, '[data-type="archery"]'); await tapPoint(page, p);
  await expect(page.locator('#toast')).toContainText('Archery range raised');
  await tapPoint(page, p); await expect(page.locator('#toast')).toContainText('Too close');
  const snapshot = await pause(page);
  expect(snapshot.state.buildings.filter(b => b.side === 0 && b.type === 'archery')).toHaveLength(1);
  expect(snapshot.state.gold[0]).toBeLessThan(420 - BUILDINGS.archery.cost + 25);
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
    await expect.poll(() => page.locator('#battle').evaluate(e => e.width)).toBe(Math.round(size.width * Math.min(await page.evaluate(() => devicePixelRatio),2)));
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

for (const invalid of ['{broken', JSON.stringify({version:999})]) test(`invalid save recovers: ${invalid}`, async ({page}) => {
  await page.addInitScript(({key,value})=>localStorage.setItem(key,value),{key:SAVE,value:invalid});
  await open(page); await expect(page.locator('#resumeSaved')).toBeHidden();
  await expect(page.locator('#saveStatus')).toBeVisible();
  await expect(page.locator('#saveStatus')).toContainText('could not be loaded');
  expect(await page.evaluate(key=>localStorage.getItem(key),SAVE)).toBe(invalid);
  await press(page,'#start'); await expect(page.locator('#pause')).toBeVisible();
  const replacement = await saved(page); expect(replacement.version).toBe(1); Game.restore(replacement);
});

test('denied storage keeps unsaved battle open without crashing settings or pause', async ({page}) => {
  await page.addInitScript(() => {for(const method of ['getItem','setItem','removeItem']) Storage.prototype[method] = () => {throw new DOMException('Storage blocked','SecurityError');};});
  await open(page); await press(page,'#welcomeSettings'); await press(page,'#audioEnabled'); await press(page,'#settingsDone'); await press(page,'#start'); await press(page,'#sound'); await press(page,'#pause'); await expect(page.locator('#pauseVeil')).toBeVisible(); await press(page,'#saveExit');
  await expect(page.locator('#welcome')).toBeHidden(); await expect(page.locator('#pauseVeil')).toBeVisible();
  await expect(page.locator('#toast')).toContainText(/could not save/i); await press(page,'#resume'); await expect(page.locator('#pauseVeil')).toBeHidden();
});

test('welcome and guide trap keyboard focus and restore playable focus', async ({page}) => {
  await open(page); await page.locator('#welcomeSettings').focus(); await page.keyboard.press('Tab');
  await expect(page.locator('[data-mode="skirmish"]')).toBeFocused();
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
  await page.addInitScript(() => {Storage.prototype.setItem = () => {throw new DOMException('Quota full','QuotaExceededError');};});
  await start(page); await press(page,'#pause'); await press(page,'#saveExit');
  await expect(page.locator('#toast')).toContainText(/unable|failed|storage|could not|not saved/i);
  await expect(page.locator('#welcome')).toBeHidden(); await expect(page.locator('#pauseVeil')).toBeVisible();
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
  await press(page,'#cancelBuild'); await tapPoint(page,p);
  await expect(page.locator('#selectionPanel')).toBeVisible();
  await page.waitForTimeout(350); await expect(page.locator('#selectionPanel')).toBeVisible();
  await press(page,'#closeSelection'); await expect(page.locator('#selectionPanel')).toBeHidden();
  await tapPoint(page,p); await expect(page.locator('#selectionPanel')).toBeVisible();
});

for (const value of ['{broken', 'null', '{"not":"an array"}', '[null,4,"bad",[]]']) {
  test(`malformed history recovers during settings and match end: ${value}`, async ({page}) => {
    await page.addInitScript(({key,value})=>localStorage.setItem(key,value),{key:HISTORY,value});
    const data = new Game({seed:123,ai:false}).serialize();
    data.state.time=421; data.state.overtime=true; data.state.bases[1].hp=.01;
    Game.restore(data);
    await seed(page,data);
    await expect(page.locator('#resultTitle')).toHaveText('VICTORY');
    await page.waitForTimeout(350);
    const history = await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),HISTORY);
    expect(history).toHaveLength(1); expect(history[0].won).toBe(true);
    await press(page,'#playAgain'); await press(page,'#welcomeSettings');
    await expect(page.locator('#battleHistory')).toContainText(/Victory/i);
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
