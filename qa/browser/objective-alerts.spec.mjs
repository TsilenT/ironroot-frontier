// Prepared browser regression. Native execution is a separate, pending gate.
// Touch projects are synthetic Chromium profiles, not physical-device proof.
import {expect} from '@playwright/test';
import {CAMPAIGN_STORAGE_KEY} from '../../dist/campaign.js';
import {PROFILE_MARKER_KEY} from '../../dist/profile-session.js';
import {test, press, seedOnce, saved} from './map-browser-helpers.mjs';
import {objectiveAlertFixture, resumeLabelFixtures, ATTACK_DELAY} from './objective-alert-fixtures.mjs';
import {installObjectiveAudioObservation, observeObjectiveStatus, statusWrites, warningTones, waitForObservedFrames} from './objective-alert-browser-helpers.mjs';

const SAVE = 'ironroot.battle.v1', SETTINGS = 'ironroot.settings.v1', HISTORY = 'ironroot.history.v1';
const UNRELATED = 'qa.objective-alerts.unrelated';
const PROFILE_KEYS = [CAMPAIGN_STORAGE_KEY, SETTINGS, HISTORY, 'ironroot.trials.v1', PROFILE_MARKER_KEY, UNRELATED];
const preferences = {sound: true, music: false, sfx: true, volume: .5, reducedMotion: true, quality: 'high'};
const profile = page => page.evaluate(keys => Object.fromEntries(keys.map(key => [key, localStorage.getItem(key)])), PROFILE_KEYS);
const criticalWrites = async page => (await statusWrites(page)).filter(write => write.text.startsWith('Critical health:'));

async function seedAlert(page, kind = 'critical') {
  await page.addInitScript(installObjectiveAudioObservation);
  const fixture = objectiveAlertFixture(kind);
  await seedOnce(page, {[SAVE]: JSON.stringify(fixture.envelope),
    [CAMPAIGN_STORAGE_KEY]: JSON.stringify(fixture.progress), [SETTINGS]: JSON.stringify(preferences),
    [UNRELATED]: 'Keep this unrelated value.'});
  await expect(page.locator('#resumeSaved')).toContainText('RESUME MISSION · WINTER STORES');
  await expect(page.locator('#saveStatus')).toBeHidden();
  return fixture;
}

async function configureRealAudio(page, mode = 'enabled') {
  await press(page, '#welcomeSettings');
  await expect(page.locator('#audioEnabled')).toBeChecked();
  await expect(page.locator('#musicEnabled')).not.toBeChecked();
  await expect(page.locator('#sfxEnabled')).toBeChecked();
  // Unlock with actual preference activations, then prove a real running
  // context exists before testing mute/SFX. Silence cannot pass by autoplay.
  await press(page, '#audioEnabled');
  await press(page, '#audioEnabled');
  await expect.poll(() => page.evaluate(() =>
    [...window.__qaObjectiveAudio.contexts].some(context => context.state === 'running')),
  {message: 'Native Web Audio context unlocked by a real user activation'}).toBe(true);
  if (mode === 'muted') await press(page, '#audioEnabled');
  if (mode === 'sfx-off') await press(page, '#sfxEnabled');
  await press(page, '#settingsDone');
  await observeObjectiveStatus(page);
}

async function expectNamedDanger(page, fixture) {
  const status = page.locator('#protectedAlert');
  await expect(status).toHaveAttribute('role', 'status');
  await expect(status).toHaveAttribute('aria-live', 'polite');
  await expect(status).toHaveAttribute('aria-atomic', 'true');
  await expect(status).toHaveText(fixture.message);
  await expect(page.getByRole('status').filter({hasText: fixture.message})).toHaveCount(1);
  const target = page.locator(`[data-protected-id="${fixture.target.originalId}"]`);
  await expect(target.locator('.protected-name')).toHaveText('North gold mine');
  await expect(target).toHaveAttribute('data-state', 'critical');
  await expect(target.locator('.protected-health')).toHaveText(`${fixture.expectedPercent}% HP · Critical`);
}

test('restored critical original announces its exact name and HP once without taking focus or repeating each frame', async ({page}) => {
  const fixture = await seedAlert(page);
  await configureRealAudio(page);
  const before = await profile(page);
  await press(page, '#resumeSaved');
  await expectNamedDanger(page, fixture);
  await expect(page.locator('#battle')).toBeFocused();
  await expect.poll(() => warningTones(page)).toHaveLength(3);
  const tones = await warningTones(page);
  expect(tones.every(tone => tone.running && !tone.resultVisible)).toBe(true);
  expect(tones[1].at - tones[0].at).toBeCloseTo(.24, 4);
  expect(tones[2].at - tones[0].at).toBeCloseTo(.48, 4);
  await waitForObservedFrames(page, 45);
  expect(await criticalWrites(page)).toEqual([{text: fixture.message, resultVisible: false}]);
  expect(await warningTones(page)).toHaveLength(3);
  await press(page, '#pause');
  const checkpoint = await saved(page);
  expect(checkpoint.game.state.buildings.find(b => b.id === fixture.target.originalId).hp).toBe(fixture.expectedHp);
  expect(await profile(page)).toEqual(before);
});

test('pause and Field guide hold a new combat danger cue until the battle is explicitly resumed', async ({page}) => {
  test.setTimeout(30000);
  const fixture = await seedAlert(page, 'delayed');
  await configureRealAudio(page);
  await press(page, '#resumeSaved');
  await press(page, '#pause');
  await expect(page.locator('#pauseVeil')).toBeVisible();
  const checkpoint = await saved(page), before = await profile(page);
  expect(checkpoint.game.state.time).toBeLessThan(ATTACK_DELAY);
  await waitForObservedFrames(page);
  expect(await statusWrites(page)).toEqual([]);
  expect(await warningTones(page)).toEqual([]);
  expect(await saved(page)).toEqual(checkpoint);
  await press(page, '#help');
  await expect(page.locator('#helpModal')).toBeVisible();
  await waitForObservedFrames(page);
  expect(await statusWrites(page)).toEqual([]);
  expect(await warningTones(page)).toEqual([]);
  expect(await saved(page)).toEqual(checkpoint);
  await press(page, '#closeHelp');
  await expect(page.locator('#pauseVeil')).toBeVisible();
  await waitForObservedFrames(page, 10);
  expect(await statusWrites(page)).toEqual([]);
  await press(page, '#resume');
  await expectNamedDanger(page, fixture);
  await press(page, '#pause');
  expect(await criticalWrites(page)).toEqual([{text: fixture.message, resultVisible: false}]);
  expect(await warningTones(page)).toHaveLength(3);
  expect((await saved(page)).game.state.time).toBeGreaterThanOrEqual(ATTACK_DELAY);
  expect(await profile(page)).toEqual(before);
});

test('a real protected-original loss names the loss and never emits critical danger after the result', async ({page}) => {
  const fixture = await seedAlert(page, 'loss');
  await configureRealAudio(page);
  const before = await profile(page);
  await press(page, '#resumeSaved');
  await expect(page.locator('#resultTitle')).toHaveText('MISSION FAILED');
  const loss = page.locator('#resultProtectedLoss li');
  await expect(loss).toHaveCount(1);
  await expect(loss).toHaveText(/^North gold mine: original structure lost, first observed at \d{2}:\d{2}\.\d{2} battle time\.$/);
  await expect(page.locator('#protectedAlert')).toHaveText('North gold mine: original structure lost.');
  await expect(page.locator(`[data-protected-id="${fixture.target.originalId}"]`)).toHaveAttribute('data-state', 'lost');
  await expect(page.locator(`[data-protected-id="${fixture.target.originalId}"]`)).toBeDisabled();
  expect(await saved(page)).toBeNull();
  const writes = await statusWrites(page), tones = await warningTones(page);
  expect(writes.filter(write => write.resultVisible && write.text.startsWith('Critical health:'))).toEqual([]);
  expect(tones.filter(tone => tone.resultVisible)).toEqual([]);
  await waitForObservedFrames(page, 45);
  expect(await statusWrites(page)).toEqual(writes);
  expect(await warningTones(page)).toEqual(tones);
  const after = await profile(page);
  for (const key of PROFILE_KEYS.filter(key => key !== HISTORY)) expect(after[key], key).toBe(before[key]);
  const history = JSON.parse(after[HISTORY]);
  expect(history).toHaveLength(1);
  const match = (await loss.textContent()).match(/at (\d{2}):(\d{2})\.(\d{2}) battle time\.$/);
  expect(match).not.toBeNull();
  const observedTime = Number(match[1]) * 60 + Number(match[2]) + Number(match[3]) / 100;
  // The displayed observation must agree with this browser's actual retained
  // terminal time, not merely repeat the standalone fixture oracle's timestamp.
  expect(observedTime).toBeGreaterThan(0);
  expect(observedTime).toBeLessThanOrEqual(.1);
  expect(observedTime).toBeCloseTo(history[0].time, 2);
});

for (const mode of ['muted', 'sfx-off']) {
  test(`${mode} keeps the named danger text but schedules no warning voices in an unlocked real audio context`, async ({page}) => {
    const fixture = await seedAlert(page);
    await configureRealAudio(page, mode);
    const before = await profile(page);
    await press(page, '#resumeSaved');
    await expectNamedDanger(page, fixture);
    await waitForObservedFrames(page, 30);
    expect(await criticalWrites(page)).toEqual([{text: fixture.message, resultVisible: false}]);
    expect(await warningTones(page)).toEqual([]);
    await press(page, '#pause');
    expect(await profile(page)).toEqual(before);
    const stored = JSON.parse(before[SETTINGS]);
    expect(stored.sound).toBe(mode !== 'muted');
    expect(stored.sfx).toBe(mode !== 'sfx-off');
    await press(page, '#pauseSettings');
    await expect(page.locator('#audioEnabled')).toBeChecked({checked: mode !== 'muted'});
    await expect(page.locator('#sfxEnabled')).toBeChecked({checked: mode !== 'sfx-off'});
  });
}

test('intro Resume labels omit skirmish rules while timed and open-ended skirmishes keep their actual rule', async ({page}) => {
  test.setTimeout(30000);
  for (const fixture of resumeLabelFixtures()) {
    // Each fixture is only seeded at the title screen, never into an active
    // battle. A one-time seed/reload cannot hide future real save writes.
    await seedOnce(page, {[SAVE]: JSON.stringify(fixture.envelope),
      [CAMPAIGN_STORAGE_KEY]: JSON.stringify(fixture.progress)});
    const before = await profile(page), original = await saved(page);
    await expect(page.locator('#resumeSaved')).toBeVisible();
    await expect(page.locator('#resumeSaved')).toBeEnabled();
    await expect(page.locator('#resumeSaved')).toHaveText(fixture.label);
    if (fixture.authored) await expect(page.locator('#resumeSaved')).not.toContainText(/SUDDEN DEATH|OPEN[ -]ENDED/);
    await expect(page.locator('#saveStatus')).toBeHidden();
    expect(await saved(page)).toEqual(original);
    expect(await profile(page)).toEqual(before);
  }
});
