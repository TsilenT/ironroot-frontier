import {expect} from '@playwright/test';
import {Game, MAPS} from '../../dist/engine.js';
import {createCampaignProgress, CAMPAIGN_STORAGE_KEY} from '../../dist/campaign.js';
import {parseBackup} from '../../dist/backup.js';
import {test, press, tapPoint, homePoint, saved, seedOnce, observeCanvas, canvasFrame, expectCamera, downloadBackup} from './map-browser-helpers.mjs';
import {openBuildControls} from './shared-build-controls.mjs';

const SETTINGS = 'ironroot.settings.v1';
const row = (page, action) => page.locator(`#keyboardRows [data-keyboard-action="${action}"]`);
const change = (page, action) => row(page, action).locator('[data-keyboard-change]');
const label = (page, action) => row(page, action).locator('.keyboard-key');
const settingsBytes = page => page.evaluate(key => localStorage.getItem(key), SETTINGS);
const settings = async page => JSON.parse(await settingsBytes(page) || '{}');

async function openKeys(page, opener = '#welcomeSettings') {
  await press(page, opener);
  await expect(page.locator('#settingsModal')).toBeVisible();
  if (!await page.locator('#keyboardSettings').evaluate(el => el.open))
    await press(page, '#keyboardSettings > summary');
  await expect(page.locator('#keyboardRows [data-keyboard-action]')).toHaveCount(12);
}
async function bind(page, action, code) {
  await change(page, action).click();
  await expect(change(page, action)).toBeFocused();
  await page.keyboard.press(code);
  await expect.poll(async () => (await settings(page)).keyboard?.bindings?.[action]).toBe(code);
}
async function battlefield(page) {
  await page.locator('#battle').focus();
  await expect(page.locator('#battle')).toBeFocused();
}
async function skirmish(page) {
  await press(page, '[data-mode="skirmish"]');
  await press(page, '#start');
  await expect(page.locator('#welcome')).toBeHidden();
  await expect(page.locator('#viewportModal')).toBeHidden();
}

test.describe('Battle keyboard controls on desktop', () => {
  test.beforeEach(async ({}, info) => test.skip(info.project.name !== 'desktop', 'Desktop keyboard gate; bounded touch/fit cases below.'));

  test('remap, clear, reload and restore update stored controls, badges and field guide', async ({page}) => {
    test.setTimeout(40000); // Multi-stage native UI, persistence and reload path.
    await page.goto('/');
    await openKeys(page);
    await expect(page.locator('#keyboardSettings')).toContainText(/physical/i);
    await expect(page.locator('#keyboardSettings')).toContainText(/guided practice.*default controls/i);
    await bind(page, 'build1', 'KeyQ');
    await bind(page, 'volley', 'KeyV');
    await bind(page, 'pause', 'KeyP');
    await row(page, 'build2').locator('[data-keyboard-clear]').click();
    expect((await settings(page)).keyboard.bindings.build2).toBeNull();
    await expect(label(page, 'build2')).toContainText(/unbound/i);
    await page.reload();
    await openKeys(page);
    await expect(label(page, 'build1')).toHaveText('Q');
    await expect(label(page, 'volley')).toHaveText('V');
    await expect(label(page, 'pause')).toHaveText('P');
    await expect(label(page, 'build2')).toContainText(/unbound/i);
    await press(page, '#settingsDone');
    await skirmish(page);
    await expect(page.locator('[data-type="barracks"] .hotkey')).toHaveText('Q');
    await expect(page.locator('[data-type="archery"] .hotkey')).toHaveCount(0);
    await expect(page.locator('#pause')).toHaveAttribute('title', /P/);
    await battlefield(page);
    await page.keyboard.press('Digit1');
    await expect(page.locator('#battle')).not.toHaveClass(/placing/);
    await page.keyboard.press('KeyQ');
    await expect(page.locator('[data-type="barracks"]')).toHaveClass(/active/);
    await page.keyboard.press('Escape');
    await page.keyboard.press('Digit2');
    await expect(page.locator('#battle')).not.toHaveClass(/placing/);
    await page.keyboard.press('KeyP');
    await expect(page.locator('#pauseVeil')).toBeVisible();
    await press(page, '#help');
    await expect(page.locator('#buildingKeyHelp')).toContainText('Q');
    await expect(page.locator('#battleKeyHelp')).toContainText('Volley: V');
    await expect(page.locator('#battleKeyHelp')).toContainText('Pause / resume: P');
    await press(page, '#guideDone');
    await openKeys(page, '#pauseSettings');
    await press(page, '#keyboardDefaults');
    await expect(label(page, 'build1')).toHaveText('1');
    await expect(label(page, 'build2')).toHaveText('2');
    await expect(label(page, 'volley')).toHaveText('R');
    await expect(label(page, 'pause')).toHaveText('Space');
    await page.reload();
    await openKeys(page);
    await expect(label(page, 'build1')).toHaveText('1');
    await expect(label(page, 'build2')).toHaveText('2');
  });

  test('failed keyboard persistence stays page-only, exports the pending map and retries verifiably', async ({page}) => {
    test.setTimeout(40000);
    await page.goto('/'); await openKeys(page); await bind(page, 'build1', 'KeyQ');
    const durable = await settingsBytes(page);
    await page.evaluate(key => {
      window.__keyboardSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = function(k, value) {
        if (k === key) throw new DOMException('Keyboard setting test quota', 'QuotaExceededError');
        return window.__keyboardSetItem.call(this, k, value);
      };
    }, SETTINGS);
    await change(page, 'build2').click(); await page.keyboard.press('KeyW');
    await expect(label(page, 'build2')).toHaveText('W');
    await expect(page.locator('#keyboardStatus')).toContainText(/page only/i);
    await expect(page.locator('#preferenceSaveWarning')).toBeVisible();
    expect(await settingsBytes(page)).toBe(durable);
    await press(page, '#settingsDone'); await skirmish(page); await battlefield(page);
    await page.keyboard.press('KeyW');
    await expect(page.locator('[data-type="archery"]')).toHaveClass(/active/);
    await page.keyboard.press('Escape'); await openKeys(page, '#settings');
    await press(page, '.backup-details > summary');
    const backup = parseBackup(await downloadBackup(page));
    expect(backup.data.settings.keyboard.bindings).toMatchObject({build1:'KeyQ', build2:'KeyW'});
    expect(await settingsBytes(page)).toBe(durable);
    await page.evaluate(() => { Storage.prototype.setItem = window.__keyboardSetItem; delete window.__keyboardSetItem; });
    await press(page, '#retryPreferences');
    await expect(page.locator('#preferenceSaveWarning')).toBeHidden();
    await expect(page.locator('#keyboardStatus')).toHaveText('Keyboard controls saved.');
    expect((await settings(page)).keyboard.bindings).toMatchObject({build1:'KeyQ', build2:'KeyW'});
    await page.reload(); await openKeys(page);
    await expect(label(page, 'build1')).toHaveText('Q'); await expect(label(page, 'build2')).toHaveText('W');
  });

  test('default collisions, reserved keys and modifier chords cannot steal a binding', async ({page}) => {
    await page.goto('/'); await openKeys(page);
    const before = await settingsBytes(page);
    await change(page, 'build1').click();
    await page.keyboard.press('KeyR');
    await expect(page.locator('#keyboardStatus')).toContainText(/already|used|conflict/i);
    expect(await settingsBytes(page)).toBe(before);
    await expect(label(page, 'volley')).toHaveText('R');
    for (const key of ['Enter', 'F11', 'Control+KeyQ', 'Alt+KeyQ', 'Meta+KeyQ']) {
      await page.keyboard.press(key);
      expect(await settingsBytes(page)).toBe(before);
    }
    await page.keyboard.press('Escape');
    await expect(page.locator('#settingsModal')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('#settingsModal')).toBeHidden();
  });

  for (const opener of ['Enter', 'Space']) test(`${opener} opens capture once and held activation cannot become its binding`, async ({page}) => {
    await page.goto('/'); await openKeys(page);
    await change(page, 'build1').focus();
    const before = await settingsBytes(page);
    await page.keyboard.down(opener);
    if (opener === 'Enter') {
      await page.keyboard.down(opener); // Actual repeated keydown, before release.
      expect(await settingsBytes(page)).toBe(before);
    }
    await page.keyboard.up(opener);
    await expect(change(page, 'build1')).toBeFocused();
    expect(await settingsBytes(page)).toBe(before);
    await page.keyboard.press('KeyQ');
    await expect(label(page, 'build1')).toHaveText('Q');
    expect((await settings(page)).keyboard.bindings.build1).toBe('KeyQ');
    await page.keyboard.press('KeyW');
    await expect(label(page, 'build1')).toHaveText('Q');
  });

  test('captured Space release cannot reactivate Change or leak through closed Options', async ({page}) => {
    await page.goto('/'); await openKeys(page);
    await bind(page, 'pause', 'KeyP');
    await change(page, 'volley').click();
    await page.keyboard.down('Space');
    await expect(label(page, 'volley')).toHaveText('Space');
    await page.keyboard.up('Space');
    await page.keyboard.press('KeyQ');
    await expect(label(page, 'volley')).toHaveText('Space');
    await change(page, 'build1').click();
    await page.keyboard.down('Space'); // Conflict remains a capture; release after Back must retire it.
    await page.goBack();
    await expect(page.locator('#settingsModal')).toBeHidden();
    await page.keyboard.up('Space');
    await expect(page.locator('#welcome')).toBeVisible();
    await expect(page.locator('#settingsModal')).toBeHidden();
    await openKeys(page);
    await page.keyboard.press('KeyW');
    await expect(label(page, 'build1')).toHaveText('1');
  });

  test('Tab, focus departure, disclosure closure and Back cancel capture without changing settings', async ({page}) => {
    await page.goto('/'); await openKeys(page);
    const before = await settingsBytes(page);
    await change(page, 'build1').click();
    await page.keyboard.press('Tab');
    await expect(row(page, 'build1').locator('[data-keyboard-clear]')).toBeFocused();
    await page.keyboard.press('KeyQ');
    expect(await settingsBytes(page)).toBe(before);
    await change(page, 'build1').click();
    await page.locator('#masterVolume').focus();
    await page.keyboard.press('KeyQ');
    expect(await settingsBytes(page)).toBe(before);
    await change(page, 'build1').click();
    await press(page, '#keyboardSettings > summary');
    await expect(page.locator('#keyboardSettings')).toHaveJSProperty('open', false);
    await page.keyboard.press('KeyQ');
    expect(await settingsBytes(page)).toBe(before);
    await press(page, '#keyboardSettings > summary');
    await change(page, 'build1').click();
    await page.goBack();
    await expect(page.locator('#settingsModal')).toBeHidden();
    await openKeys(page);
    await page.keyboard.press('KeyQ');
    expect(await settingsBytes(page)).toBe(before);
  });

  test('native document blur cancels capture and a fresh Change remains usable', async ({page}) => {
    await page.goto('/'); await openKeys(page);
    await change(page, 'build1').click();
    const before = await settingsBytes(page);
    // Headless browser tabs keep emulated focus. A click in a real child
    // document transfers native focus and emits trusted window blur; no event
    // is dispatched by this test. This is not an OS window-switch assertion.
    await page.evaluate(() => {
      window.__keyboardBlur = null;
      window.addEventListener('blur', event => { window.__keyboardBlur = {trusted:event.isTrusted}; }, {once:true});
      const frame = document.createElement('iframe'); frame.id = 'keyboardBlurProbe';
      frame.title = 'Native focus transfer probe'; frame.srcdoc = '<input aria-label="Other document">';
      frame.style.cssText = 'position:fixed;left:0;top:0;width:240px;height:60px;z-index:10000';
      document.body.append(frame);
    });
    await page.frameLocator('#keyboardBlurProbe').getByRole('textbox').click();
    await expect.poll(() => page.evaluate(() => window.__keyboardBlur)).toEqual({trusted:true});
    await page.evaluate(() => document.getElementById('keyboardBlurProbe').remove());
    await change(page, 'build1').focus();
    await page.keyboard.press('KeyQ');
    expect(await settingsBytes(page)).toBe(before);
    await bind(page, 'build1', 'KeyQ');
  });

  test('native disclosure, select, range and actual fullscreen activation retain keyboard behavior', async ({page}) => {
    await page.goto('/'); await press(page, '#welcomeSettings');
    const summary = page.locator('#keyboardSettings > summary');
    await summary.focus(); await page.keyboard.press('Enter');
    await expect(page.locator('#keyboardSettings')).toHaveJSProperty('open', true);
    await page.keyboard.press('Space');
    await expect(page.locator('#keyboardSettings')).toHaveJSProperty('open', false);
    await page.locator('#effectQuality').focus();
    await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter');
    await expect(page.locator('#effectQuality')).toHaveValue('low');
    await page.locator('#masterVolume').focus();
    const volume = Number(await page.locator('#masterVolume').inputValue());
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('#masterVolume')).toHaveValue(String(volume + 5));
    await page.locator('#settingsFullscreen').focus();
    await page.keyboard.press('Enter');
    await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(true);
    await expect(page.locator('#settingsFullscreen')).toBeFocused();
    await page.keyboard.press('Space');
    await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(false);
    await expect(page.locator('#settingsModal')).toBeVisible();
    await expect(page.locator('#pauseVeil')).toBeHidden();
  });

  test('delivered browser chords, native editable text, handled events and IME never arm battle commands', async ({page}) => {
    await page.goto('/'); await skirmish(page); await battlefield(page);
    await page.evaluate(() => {
      window.__keyboardDefaults = [];
      window.addEventListener('keydown', event => window.__keyboardDefaults.push({code:event.code, prevented:event.defaultPrevented, trusted:event.isTrusted}));
    });
    for (const key of ['Control+Digit1', 'Control+KeyR', 'Meta+Digit2', 'Meta+KeyR', 'Alt+ArrowLeft', 'Alt+ArrowRight']) {
      await page.keyboard.press(key);
      await expect(page.locator('#battle')).not.toHaveClass(/placing/);
    }
    const delivered = await page.evaluate(() => window.__keyboardDefaults.filter(event => /^(Digit|Key|Arrow)/.test(event.code)));
    expect(delivered.length).toBeGreaterThanOrEqual(6);
    expect(delivered.every(event => event.trusted && !event.prevented)).toBe(true);
    // These are DOM input probes only: no game state, gold or production hook is changed.
    await page.evaluate(() => {
      const wrapper = document.createElement('div'); wrapper.contentEditable = 'true';
      wrapper.id = 'keyboardEditable'; wrapper.style.cssText = 'position:fixed;top:80px;left:10px;z-index:10000;background:white;color:black';
      const child = document.createElement('span'); child.id = 'keyboardEditableChild'; child.tabIndex = 0;
      wrapper.append(child); document.body.append(wrapper); child.focus();
    });
    await page.keyboard.type('1r ');
    await expect(page.locator('#keyboardEditable')).toHaveText('1r ');
    await expect(page.locator('#battle')).not.toHaveClass(/placing/);
    await expect(page.locator('#pauseVeil')).toBeHidden();
    await page.evaluate(() => document.getElementById('keyboardEditable').remove());
    await battlefield(page);
    const prevented = await page.evaluate(() => {
      const target = document.getElementById('battle');
      target.addEventListener('keydown', event => event.preventDefault(), {once:true});
      const handled = new KeyboardEvent('keydown', {code:'Digit1', bubbles:true, cancelable:true});
      target.dispatchEvent(handled);
      const composing = new KeyboardEvent('keydown', {code:'KeyR', isComposing:true, bubbles:true, cancelable:true});
      target.dispatchEvent(composing);
      return {handled:handled.defaultPrevented, composing:composing.defaultPrevented};
    });
    expect(prevented).toEqual({handled:true, composing:false});
    await expect(page.locator('#battle')).not.toHaveClass(/placing/);
    await page.keyboard.press('Digit1');
    await expect(page.locator('[data-type="barracks"]')).toHaveClass(/active/);
  });

  test('remapped actions repeat by action: build and pause once, pan on every held keydown', async ({page}) => {
    await observeCanvas(page); await page.goto('/'); await openKeys(page);
    await bind(page, 'build1', 'KeyQ'); await bind(page, 'pause', 'KeyP'); await bind(page, 'panRight', 'KeyJ');
    await press(page, '#settingsDone'); await skirmish(page); await battlefield(page);
    await page.keyboard.down('KeyQ'); await page.keyboard.down('KeyQ');
    await expect(page.locator('[data-type="barracks"]')).toHaveClass(/active/);
    await page.keyboard.up('KeyQ'); await page.keyboard.press('Escape');
    const mini = await page.locator('#minimap').boundingBox();
    await page.mouse.click(mini.x + mini.width / 2, mini.y + mini.height / 2);
    await expectCamera(page, MAPS.classic, 1600); await battlefield(page);
    await page.keyboard.down('KeyJ'); await page.keyboard.down('KeyJ'); await page.keyboard.up('KeyJ');
    const field = await page.locator('#battle').boundingBox(), scale = Math.max(.32, field.height / 900);
    await expectCamera(page, MAPS.classic, 1600 + 150 / scale);
    await page.keyboard.down('KeyP'); await expect(page.locator('#pauseVeil')).toBeVisible();
    await page.keyboard.down('KeyP'); await page.keyboard.up('KeyP');
    await expect(page.locator('#pauseVeil')).toBeVisible();
    await expect(page.locator('#resume')).toBeFocused();
    await page.keyboard.press('KeyP'); await expect(page.locator('#pauseVeil')).toBeHidden();
    await battlefield(page); await page.keyboard.press('KeyP');
    await expect(page.locator('#pauseVeil')).toBeVisible();
    await page.keyboard.press('Enter'); await expect(page.locator('#pauseVeil')).toBeHidden();
  });

  test('remapped first roster slot uses the real paid barracks and automatic-start path', async ({page}) => {
    await page.goto('/'); await openKeys(page); await bind(page, 'build1', 'KeyQ');
    await press(page, '#settingsDone'); await press(page, '#start');
    await expect(page.locator('#time')).toHaveText('00:00');
    await expect(page.locator('#buildCards .build-card')).toHaveCount(2);
    await battlefield(page); await page.keyboard.press('Digit1');
    await expect(page.locator('#battle')).not.toHaveClass(/placing/);
    await page.keyboard.press('KeyQ'); await expect(page.locator('[data-type="barracks"]')).toHaveClass(/active/);
    const before = await saved(page), map = Game.restore(before.game).map;
    expect(before.game.state.gold[0]).toBe(420);
    await tapPoint(page, await homePoint(page, map, 550, 450));
    await expect(page.locator('#battle')).not.toHaveClass(/placing/);
    await expect(page.locator('#battleClockLabel')).toHaveText('BATTLE TIME');
    await expect(page.locator('#time')).not.toHaveText('00:00');
    await press(page, '#pause');
    const after = await saved(page);
    expect(after.game.state.buildings.filter(building => building.side === 0 && building.type === 'barracks')).toHaveLength(1);
    expect(after.game.state.gold[0]).toBeCloseTo(280 + after.game.state.time * 5, 1);
  });

  test('ordinary build and HUD clicks keep default and remapped shortcuts usable without moving focus', async ({page}) => {
    await observeCanvas(page); await page.goto('/'); await openKeys(page);
    await bind(page, 'build1', 'KeyQ'); await bind(page, 'pause', 'KeyP');
    await press(page, '#settingsDone'); await skirmish(page);
    await press(page, '[data-type="barracks"]');
    await expect(page.locator('[data-type="barracks"]')).toBeFocused();
    await page.keyboard.press('KeyR'); await expect(page.locator('#rally')).toHaveClass(/active/);
    await press(page, '#rally'); await expect(page.locator('#rally')).toBeFocused();
    await page.keyboard.press('Digit2'); await expect(page.locator('[data-type="archery"]')).toHaveClass(/active/);
    await press(page, '#home'); await expect(page.locator('#home')).toBeFocused();
    const before=(await canvasFrame(page)).mini.viewport[0];
    await page.keyboard.press('ArrowRight');
    await expect.poll(async () => (await canvasFrame(page)).mini.viewport[0]).toBeGreaterThan(before);
    await expect(page.locator('#home')).toBeFocused();
    await press(page, '#front'); await expect(page.locator('#front')).toBeFocused();
    await page.keyboard.press('KeyQ'); await expect(page.locator('[data-type="barracks"]')).toHaveClass(/active/);
    await page.keyboard.down('KeyP'); await expect(page.locator('#pauseVeil')).toBeVisible();
    await expect(page.locator('#resume')).toBeFocused();
    await page.keyboard.down('KeyP'); await page.keyboard.up('KeyP');
    await expect(page.locator('#pauseVeil')).toBeVisible();
    await page.keyboard.press('KeyP'); await expect(page.locator('#pauseVeil')).toBeHidden();
  });

  for (const tier of ['five-building campaign', 'full skirmish']) test(`${tier} keeps remapped slot three tied to its current roster`, async ({page}) => {
    if (tier === 'five-building campaign') {
      const progress = createCampaignProgress();
      progress.missions['roadside-watch'] = {completed:true, stars:1, bestTime:60};
      await seedOnce(page, {[CAMPAIGN_STORAGE_KEY]:JSON.stringify(progress)});
    } else await page.goto('/');
    await openKeys(page); await bind(page, 'build3', 'KeyQ'); await press(page, '#settingsDone');
    if (tier === 'full skirmish') await skirmish(page);
    else {
      await press(page, '#start');
      if (await page.locator('#coachingModal').isVisible()) await press(page, '#coachingPlay');
    }
    const type = tier === 'five-building campaign' ? 'watchtower' : 'foundry';
    await expect(page.locator('#buildCards .build-card')).toHaveCount(tier === 'five-building campaign' ? 5 : 8);
    await battlefield(page); await page.keyboard.press('KeyQ');
    await expect(page.locator(`[data-type="${type}"]`)).toHaveClass(/active/);
    await expect(page.locator(`[data-type="${type}"] .hotkey`)).toHaveText('Q');
    await page.keyboard.press('Escape'); await press(page, '#settings');
    if (!await page.locator('#keyboardSettings').evaluate(el => el.open)) await press(page, '#keyboardSettings > summary');
    await expect(row(page, 'build3')).toContainText(tier === 'five-building campaign' ? /tower/i : /foundry/i);
    await expect(label(page, 'build3')).toHaveText('Q');
  });
});

test('long shortcut badges fit beside building icons and names', async ({page}, info) => {
  test.skip(info.project.name === 'phone', 'Bounded desktop, short portrait and landscape label gate.');
  test.setTimeout(40000);
  await page.goto('/'); await openKeys(page);
  await bind(page, 'panRight', 'KeyL'); await bind(page, 'build1', 'ArrowRight'); await bind(page, 'build2', 'Numpad9');
  await press(page, '#settingsDone'); await press(page, '#start'); await openBuildControls(page);
  for (const [type,text] of [['barracks','Right arrow'],['archery','Numpad 9']]) {
    const card=page.locator(`[data-type="${type}"]`); await card.scrollIntoViewIfNeeded();
    await expect(card.locator('.hotkey')).toHaveText(text);
    const bounds=await card.evaluate(el=>{
      const rect=node=>{const r=node.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom};};
      return {card:rect(el),key:rect(el.querySelector('.hotkey')),icon:rect(el.querySelector('.building-symbol')),name:rect(el.querySelector('h3'))};
    });
    expect(bounds.key.left).toBeGreaterThanOrEqual(bounds.card.left);
    expect(bounds.key.right).toBeLessThanOrEqual(bounds.card.right);
    expect(bounds.key.top).toBeGreaterThanOrEqual(bounds.card.top);
    expect(bounds.key.bottom).toBeLessThanOrEqual(bounds.card.bottom);
    for(const other of [bounds.icon,bounds.name])
      expect(bounds.key.right<=other.left || bounds.key.left>=other.right || bounds.key.bottom<=other.top || bounds.key.top>=other.bottom).toBe(true);
  }
  await page.screenshot({path:info.outputPath('long-key-labels.png')});
});

test('short Options keyboard disclosure fits and touch still pays for the first placement', async ({page}, info) => {
  test.setTimeout(40000); // Scroll each end of twelve rows, then perform paid touch placement.
  test.skip(!['narrow-phone', 'landscape'].includes(info.project.name), 'Bounded 320×568 portrait and 844×390 touch gate.');
  await page.goto('/'); await openKeys(page);
  await expect(page.locator('#keyboardSettings')).toContainText(/guided practice.*default controls/i);
  expect(await page.locator('.settings-modal').evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
  for (const action of ['build1', 'panRight']) {
    for (const control of ['[data-keyboard-change]', '[data-keyboard-clear]']) {
      const element = row(page, action).locator(control); await element.scrollIntoViewIfNeeded();
      const box = await element.boundingBox(), viewport = page.viewportSize();
      expect(box.x).toBeGreaterThanOrEqual(0); expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1);
      expect(box.y).toBeGreaterThanOrEqual(0); expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + 1);
      expect(box.height).toBeGreaterThanOrEqual(44);
    }
  }
  await press(page, '#keyboardDefaults');
  await press(page, '#settingsDone'); await press(page, '#start');
  await expect(page.locator('#time')).toHaveText('00:00');
  const before = await saved(page), map = Game.restore(before.game).map;
  await openBuildControls(page); await press(page, '[data-type="barracks"]');
  const point = await homePoint(page, map, 550, 450);
  await page.locator('#battle').evaluate(el => el.addEventListener('pointerup', event => {
    window.__keyboardTouchSmoke = {trusted:event.isTrusted, type:event.pointerType};
  }, {once:true, passive:true}));
  await tapPoint(page, point);
  expect(await page.evaluate(() => window.__keyboardTouchSmoke)).toEqual({trusted:true, type:'touch'});
  await expect(page.locator('#battle')).not.toHaveClass(/placing/);
  await expect(page.locator('#time')).not.toHaveText('00:00');
  await press(page, '#pause');
  const after = await saved(page);
  expect(after.game.state.buildings.filter(building => building.side === 0 && building.type === 'barracks')).toHaveLength(1);
  expect(after.game.state.gold[0]).toBeCloseTo(280 + after.game.state.time * 5, 1);
});
