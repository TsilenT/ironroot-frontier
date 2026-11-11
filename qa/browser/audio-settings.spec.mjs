import {expect} from '@playwright/test';
import {parseBackup} from '../../dist/backup.js';
import {test, press, downloadBackup} from './map-browser-helpers.mjs';

const SETTINGS = 'ironroot.settings.v1';
const values = page => page.evaluate(key => JSON.parse(localStorage.getItem(key) || '{}'), SETTINGS);
async function open(page) { await press(page, '#welcomeSettings'); await expect(page.locator('#settingsModal')).toBeVisible(); }
async function level(page, name, percent) {
  const slider = page.getByRole('slider', {name, exact:true});
  await slider.focus(); await slider.press('Home');
  for (let i = 0; i < percent / 5; i++) await slider.press('ArrowRight');
  await expect(slider).toHaveValue(String(percent));
  await expect(slider).toHaveAttribute('aria-valuetext', percent + '%');
}
async function observeAudio(page) {
  // Pass-through observation of actual Web Audio nodes, without changing app code.
  await page.addInitScript(() => {
    window.__qaAudioGains = [];
    const native = AudioContext.prototype.createGain;
    AudioContext.prototype.createGain = function(...args) {
      const node = native.apply(this, args); window.__qaAudioGains.push(node); return node;
    };
  });
}
async function gains(page, expected) {
  // The graph creates master, music, duck and effects in that order.
  await expect.poll(() => page.evaluate(() => {
    const nodes = window.__qaAudioGains;
    return nodes?.length >= 4 ? [nodes[0],nodes[1],nodes[3]].map(node => +node.gain.value.toFixed(3)) : [];
  })).toEqual(expected);
}

test('legacy settings retain the current mix; independent levels persist and export', async ({page}) => {
  await page.addInitScript(key => {
    if (!sessionStorage.getItem('audio-seeded')) {
      localStorage.setItem(key, JSON.stringify({sound:true,music:true,sfx:true,volume:.5}));
      sessionStorage.setItem('audio-seeded', 'yes');
    }
  }, SETTINGS);
  await page.goto('/'); await open(page);
  await expect(page.getByRole('slider', {name:'Music volume',exact:true})).toHaveValue('70');
  await expect(page.getByRole('slider', {name:'Effects volume',exact:true})).toHaveValue('85');
  await level(page, 'Music volume', 30); await level(page, 'Effects volume', 90);
  expect(await values(page)).toMatchObject({volume:.5,musicVolume:.3,sfxVolume:.9});
  await page.reload(); await open(page);
  await expect(page.locator('#musicVolume')).toHaveValue('30');
  await expect(page.locator('#sfxVolume')).toHaveValue('90');
  await press(page, '.backup-details > summary');
  expect(parseBackup(await downloadBackup(page)).data.settings).toMatchObject({volume:.5,musicVolume:.3,sfxVolume:.9});
});

test('native Web Audio channels change independently and mute toggles retain the mix', async ({page}) => {
  await observeAudio(page); await page.goto('/'); await open(page);
  await press(page, '#audioEnabled'); await press(page, '#audioEnabled');
  await gains(page, [.33,.7,.85]);
  // Chromium stops evaluating an idle bus after the last effects voice ends.
  // Keep it active with a negligible test-only DC signal so gain.value remains
  // observable even at zero. Production sound generation is unchanged.
  await page.evaluate(() => {
    const effects = window.__qaAudioGains[3];
    const source = effects.context.createConstantSource();
    source.offset.value = .000001; source.connect(effects); source.start();
  });
  await level(page, 'Music volume', 25); await gains(page, [.33,.25,.85]);
  await level(page, 'Effects volume', 60); await gains(page, [.33,.25,.6]);
  await level(page, 'Master volume', 80); await gains(page, [.528,.25,.6]);
  await press(page, '#musicEnabled'); await gains(page, [.528,0,.6]);
  await press(page, '#musicEnabled'); await gains(page, [.528,.25,.6]);
  await press(page, '#sfxEnabled'); await gains(page, [.528,.25,0]);
  await press(page, '#sfxEnabled'); await gains(page, [.528,.25,.6]);
  await level(page, 'Effects volume', 0); await gains(page, [.528,.25,0]);
  await press(page, '#audioEnabled'); await gains(page, [0,.25,0]);
  await press(page, '#audioEnabled'); await gains(page, [.528,.25,0]);
  expect(await values(page)).toMatchObject({volume:.8,musicVolume:.25,sfxVolume:0});
});

test('pointer adjustment reaches each channel and settings remain scrollable', async ({page}, info) => {
  await page.goto('/'); await open(page);
  for (const [id,key] of [['musicVolume','musicVolume'], ['sfxVolume','sfxVolume']]) {
    const slider = page.locator('#'+id); await slider.scrollIntoViewIfNeeded();
    const box = await slider.boundingBox();
    expect(box.width).toBeGreaterThan(100);
    const point = {x:box.x+box.width/2,y:box.y+box.height/2};
    if (info.project.use.hasTouch) await page.touchscreen.tap(point.x, point.y);
    else await page.mouse.click(point.x, point.y);
    await expect(slider).toHaveValue('50');
    expect((await values(page))[key]).toBe(.5);
  }
  await expect(page.locator('#settingsModal')).toBeVisible();
  await press(page, '#settingsDone'); await expect(page.locator('#settingsModal')).toBeHidden();
});

test('failed storage keeps pending levels exportable and retry saves both channels', async ({page}) => {
  await page.goto('/'); await open(page);
  await level(page, 'Music volume', 40);
  await page.evaluate(key => {
    const native = Storage.prototype.setItem;
    window.__qaRestoreAudioStorage = () => { Storage.prototype.setItem = native; };
    Storage.prototype.setItem = function(k, value) {
      if (k === key) throw new DOMException('audio test quota', 'QuotaExceededError');
      return native.call(this, k, value);
    };
  }, SETTINGS);
  await level(page, 'Effects volume', 20);
  await expect(page.locator('#preferenceSaveWarning')).toBeVisible();
  expect((await values(page)).sfxVolume).toBe(.85);
  await press(page, '.backup-details > summary');
  expect(parseBackup(await downloadBackup(page)).data.settings).toMatchObject({musicVolume:.4,sfxVolume:.2});
  await page.evaluate(() => window.__qaRestoreAudioStorage());
  await press(page, '#retryPreferences');
  await expect(page.locator('#preferenceSaveWarning')).toBeHidden();
  expect(await values(page)).toMatchObject({musicVolume:.4,sfxVolume:.2});
});
