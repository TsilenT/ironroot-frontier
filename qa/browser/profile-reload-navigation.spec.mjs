import {expect} from '@playwright/test';
import {decodeBattle} from '../../dist/battle-codec.js';
import {buildSites} from '../../dist/engine.js';
import {PROFILE_MARKER_KEY} from '../../dist/profile-session.js';
import {createCampaignProgress} from '../../dist/campaign.js';
import {BACKUP_STORAGE_KEYS, createBackup, parseBackup} from '../../dist/backup.js';
import {test, press, saved, seedOnce, homePoint, tapPoint, chooseBackup, openBackup} from './map-browser-helpers.mjs';
import {startRunning} from './campaign-teaching-helpers.mjs';
import {openBuildControls} from './shared-build-controls.mjs';
import {PROFILE_RELOAD_LEDGER_KEY, installProfileReloadObservation, summarizeProfileReload} from './profile-reload-observation.mjs';

// Five logical tests × the unchanged four viewport projects = 20 instances.
// The ordinary gate has no network routing or artificial wait. The separately
// named 750 ms diagnostic holds one real document RESPONSE, not app callbacks.
// This tests a competing-navigation contract; it does not claim that history
// caused the earlier intermittent ERR_ABORTED without a matching trace.
const DOMAIN_KEYS = Object.values(BACKUP_STORAGE_KEYS);
const EMPTY_BACKUP = createBackup({getItem: () => null}, {createdAt: '2026-11-06T12:00:00.000Z'});
const EMPTY_DATA = parseBackup(EMPTY_BACKUP).data;
const backupBytes = data => Object.fromEntries(Object.entries(BACKUP_STORAGE_KEYS).map(([domain, key]) =>
  [key, domain === 'battle' && data.battle === null ? null : JSON.stringify(data[domain])]));
const EMPTY_BYTES = backupBytes(EMPTY_DATA);
const raw = page => page.evaluate(keys => Object.fromEntries(keys.map(key => [key, localStorage.getItem(key)])), DOMAIN_KEYS);
const observe = page => page.evaluate(key => JSON.parse(sessionStorage.getItem(key)), PROFILE_RELOAD_LEDGER_KEY);

function priorProfileBytes() {
  const campaign = createCampaignProgress();
  campaign.missions.emberwatch = {completed: true, stars: 2, bestTime: 60};
  // Declared profile fixture only. No battle/progress is injected after launch,
  // and no init script can silently restore these bytes after replacement.
  const data = {campaign, trials: {shieldbreaker: {completed: true, bestTime: 10}},
    settings: {sound: false, music: false, sfx: true, volume: .25, reducedMotion: true, quality: 'low'},
    history: [{won: false, draw: false, challengeId: null, campaignId: null,
      difficulty: 'easy', time: 60, kills: 0, built: 1, date: '2026-11-06T11:00:00.000Z'}]};
  return Object.fromEntries(Object.entries(data).map(([domain, value]) => [BACKUP_STORAGE_KEYS[domain], JSON.stringify(value)]));
}

async function startPaidBattle(page, mode) {
  await seedOnce(page, priorProfileBytes());
  await press(page, `[data-mode="${mode}"]`);
  await startRunning(page, press);
  await press(page, '#pause');
  await expect(page.locator('#pauseVeil')).toBeVisible();
  const before = await saved(page);
  const campaignProgress = JSON.parse((await raw(page))[BACKUP_STORAGE_KEYS.campaign]);
  const {game, scenario} = decodeBattle(before, {campaignProgress});
  expect(scenario.kind).toBe(mode === 'campaign' ? 'campaign' : 'trial');
  // Validate the public engine's legal paid position without changing the app.
  const site = buildSites(game.map, 0).filter(site => game.canBuild('barracks', site.x, site.y).ok)
    .sort((a, b) => (Math.abs(a.x - 410) + Math.abs(a.y - game.map.height / 2))
      - (Math.abs(b.x - 410) + Math.abs(b.y - game.map.height / 2)))[0];
  expect(site, 'a legal central paid site must exist').toBeDefined();
  expect(game.canBuild('barracks', site.x, site.y)).toMatchObject({ok: true});
  const cost = game.buildings.barracks.cost;
  await press(page, '#resume');
  await expect(page.locator('#pauseVeil')).toBeHidden();
  await openBuildControls(page);
  await press(page, '[data-type="barracks"]');
  const point = await homePoint(page, game.map, site.x, site.y);
  expect(await page.evaluate(point => document.elementFromPoint(point.x, point.y)?.id, point)).toBe('battle');
  await tapPoint(page, point);
  await expect(page.locator('#battle')).not.toHaveClass(/placing/);
  await press(page, '#pause');
  await expect(page.locator('#pauseVeil')).toBeVisible();
  const after = await saved(page);
  expect(decodeBattle(after, {campaignProgress}).scenario).toEqual(scenario);
  expect(after.game.state.buildings.filter(building => building.side === 0)).toHaveLength(
    before.game.state.buildings.filter(building => building.side === 0).length + 1);
  expect(after.game.state.buildings.find(building => building.side === 0 && building.x === site.x && building.y === site.y))
    .toMatchObject({type: 'barracks', invested: cost});
  expect(after.game.state.gold[0]).toBeCloseTo(
    before.game.state.gold[0] - cost + 5 * (after.game.state.time - before.game.state.time), 1);
}

for (const delayMs of [0, 750]) for (const mode of ['campaign', 'challenges']) {
  const schedule = delayMs ? `750 ms document-response scheduling diagnostic` : 'ordinary document response';
  test(`explicit ${mode} profile Reload completes without competing history: ${schedule}`, async ({page, context}, info) => {
    info.annotations.push({type: 'scope', description: delayMs
      ? 'Diagnostic only: one real reload document response is held for 750 ms. No app timer/event/state is changed; the standard 20 s deadline remains.'
      : 'Ordinary native two-tab replacement and Reload with passive observations; no routing or artificial scheduling delay.'});
    await page.addInitScript(installProfileReloadObservation, {storageKey: PROFILE_RELOAD_LEDGER_KEY});
    let newer;
    const errors = [], documentRequests = [], responseDelay = [];
    try {
      await startPaidBattle(page, mode);
      const before = await raw(page);
      for (const key of DOMAIN_KEYS) expect(before[key], `nonempty prior domain ${key}`).not.toBeNull();
      newer = await context.newPage();
      newer.on('pageerror', error => errors.push(error.message));
      await newer.goto('/');
      await openBackup(newer);
      await chooseBackup(newer, EMPTY_BACKUP);
      await expect(newer.locator('#backupModal')).toBeVisible();
      await expect(newer.locator('#confirmImport')).toBeEnabled();
      await Promise.all([newer.waitForNavigation({waitUntil: 'load'}), press(newer, '#confirmImport')]);
      await expect(newer.locator('#welcome')).toBeVisible();
      await expect(newer.locator('#resumeSaved')).toBeHidden();
      expect(await raw(newer), 'imported bytes in all five domains').toEqual(EMPTY_BYTES);

      await page.bringToFront();
      await expect(page.locator('#settingsModal')).toBeVisible();
      await expect(page.locator('#profileRecovery')).toBeVisible();
      await expect(page.locator('#settingsDone')).toBeDisabled();
      await expect(page.locator('#closeSettings')).toBeDisabled();
      await expect(page.locator('#profileReload')).toBeEnabled();
      expect(await raw(page), 'stale tab must not resurrect its paid battle or profile').toEqual(EMPTY_BYTES);
      const beforeLedger = await observe(page);
      const oldDocument = beforeLedger.events.findLast(event => event.type === 'document-start').documentId;
      const url = page.url();
      const isDocument = request => request.isNavigationRequest() && request.frame() === page.mainFrame();
      page.on('request', request => { if (isDocument(request)) documentRequests.push({event: 'request', url: request.url()}); });
      page.on('requestfailed', request => { if (isDocument(request)) documentRequests.push({event: 'failed', url: request.url(), error: request.failure()?.errorText}); });
      page.on('response', response => { if (isDocument(response.request())) documentRequests.push({event: 'response', url: response.url(), status: response.status()}); });
      if (delayMs) {
        // Loopback HTTP does not register the production service worker. Only
        // this exact page's next document response is delayed; bytes/status/
        // headers come unchanged from the same server and the route is one-shot.
        await page.route(url, async route => {
          expect(isDocument(route.request())).toBe(true);
          const response = await route.fetch();
          const startedAt = performance.now();
          const record = {url: route.request().url(), status: response.status(), requestedDelayMs: delayMs};
          responseDelay.push(record);
          await new Promise(resolve => setTimeout(resolve, delayMs));
          record.heldMs = performance.now() - startedAt;
          await route.fulfill({response});
          record.fulfilled = true;
        }, {times: 1});
      }
      // Native tap/click is the only invocation of the explicit Reload control.
      // Do not retry an aborted reload or replace it with page.reload().
      await Promise.all([page.waitForNavigation({waitUntil: 'load'}), press(page, '#profileReload')]);
      await expect(page.locator('#welcome')).toBeVisible();
      await expect(page.locator('#resumeSaved')).toBeHidden();
      await expect(page.locator('#settingsModal')).toBeHidden();
      await expect(page.locator('#profileRecovery')).toBeHidden();
      expect(page.url()).toBe(url);
      expect(await raw(page), 'fresh document preserves exact replacement bytes').toEqual(EMPTY_BYTES);
      expect(await raw(newer), 'other tab retains exact replacement bytes').toEqual(EMPTY_BYTES);
      const ledger = await observe(page), reload = summarizeProfileReload(ledger, oldDocument);
      expect(ledger.dropped, 'observation window must be complete').toBe(0);
      expect(reload.activations, 'one trusted, enabled native Reload click').toHaveLength(1);
      expect(reload.departure, 'the old document actually departed').not.toBeNull();
      expect(reload.nextDocument, 'a new document actually loaded').not.toBeNull();
      expect(reload.nextDocument.documentId).not.toBe(oldDocument);
      expect(reload.nextDocument.navigationType).toBe('reload');
      expect(reload.nextDocument.sequence).toBeGreaterThan(reload.departure.sequence);
      expect(reload.competingTraversals, 'no old-document go/back/forward after authorized Reload').toEqual([]);
      expect(reload.oldDocumentPopstates, 'no late old-document menu traversal').toEqual([]);
      expect(documentRequests.filter(event => event.event === 'failed'), 'reload document must not abort').toEqual([]);
      expect(documentRequests.filter(event => event.event === 'request')).toHaveLength(1);
      expect(documentRequests.filter(event => event.event === 'response')).toEqual([{event: 'response', url, status: 200}]);
      if (delayMs) {
        expect(responseDelay).toHaveLength(1);
        expect(responseDelay[0]).toMatchObject({requestedDelayMs: 750, status: 200, fulfilled: true});
        expect(responseDelay[0].heldMs).toBeGreaterThanOrEqual(delayMs - 1);
      } else expect(responseDelay).toEqual([]);

      // Preserving the departing menu ancestry must not disable navigation.
      // Native Back in the fresh document still dismisses Options and retains the profile.
      const freshDocument = reload.nextDocument.documentId;
      await press(page, '#welcomeSettings');
      await expect(page.locator('#settingsModal')).toBeVisible();
      const historyLength = await page.evaluate(() => history.length);
      await page.evaluate(() => history.back());
      await expect(page.locator('#settingsModal')).toBeHidden();
      await expect(page.locator('#welcomeSettings')).toBeFocused();
      await expect(page.locator('#welcome')).toBeVisible();
      await expect(page.locator('#resumeSaved')).toBeHidden();
      expect(await page.evaluate(() => history.length)).toBe(historyLength);
      expect(await raw(page)).toEqual(EMPTY_BYTES);
      expect(await raw(newer)).toEqual(EMPTY_BYTES);
      const afterBack = await observe(page);
      expect(afterBack.dropped).toBe(0);
      expect(afterBack.events.findLast(event => event.type === 'document-start').documentId).toBe(freshDocument);
      expect(afterBack.events.filter(event => event.documentId === freshDocument && event.type === 'history-call' && event.method === 'back')).toHaveLength(1);
      expect(afterBack.events.some(event => event.documentId === freshDocument && event.type === 'popstate' && event.trusted)).toBe(true);
      expect(errors, 'uncaught errors in importing tab').toEqual([]);
    } finally {
      // Retain evidence on failure too, including ERR_ABORTED. A failed or
      // missing document cannot be converted into a pass by these diagnostics.
      let ledger;
      try { ledger = await observe(page); } catch (error) { ledger = {unavailable: error.message}; }
      await info.attach('profile-reload-observation.json', {contentType: 'application/json',
        body: Buffer.from(JSON.stringify({mode, schedule, ledger, documentRequests, responseDelay, importingTabErrors: errors}, null, 2))});
      if (newer) await newer.close();
    }
  });
}

// Native coordinates are used only where a deliberately rejected navigation or
// disabled control must not make locator actionability wait for a non-event.
// Hit testing and the passive ledger prove the actual visible control received
// the user's pointer. No force-click, event dispatch or app handler is used.
async function nativeControlTap(page, selector) {
  const control = page.locator(selector);
  await expect(control).toBeVisible();
  await control.scrollIntoViewIfNeeded();
  const bounds = await control.boundingBox();
  expect(bounds).not.toBeNull();
  const point = {x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2};
  expect(await page.evaluate(({point, selector}) => !!document.elementFromPoint(point.x, point.y)?.closest(selector),
    {point, selector})).toBe(true);
  await tapPoint(page, point);
}

test('same-tab identical-battle import stays fenced after one aborted reload: network-fault diagnostic', async ({page}, info) => {
  info.annotations.push({type: 'scope', description:
    'Network-fault diagnostic, not reproduction proof: abort only the first real import-reload document request; then native Cancel/Escape/disabled Done and one successful explicit recovery Reload. The standard 20 s deadline remains.'});
  await page.addInitScript(installProfileReloadObservation, {storageKey: PROFILE_RELOAD_LEDGER_KEY});
  const documentRequests = [], forcedAborts = [];
  try {
    await startPaidBattle(page, 'challenges');
    // Open Options from running play, so a wrongly permitted Done would resume
    // the retained game rather than merely return it to an existing pause.
    await press(page, '#resume');
    await expect(page.locator('#pauseVeil')).toBeHidden();
    await press(page, '#settings');
    await expect(page.locator('#settingsModal')).toBeVisible();
    const before = await raw(page);
    const beforeMarker = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), PROFILE_MARKER_KEY);
    const text = createBackup({getItem: key => before[key] ?? null}, {
      createdAt: '2026-11-06T12:00:00.000Z', campaign: createCampaignProgress(),
      trials: {}, settings: {}, history: [], battle: JSON.parse(before[BACKUP_STORAGE_KEYS.battle]),
    });
    const expected = backupBytes(parseBackup(text).data);
    expect(expected[BACKUP_STORAGE_KEYS.battle], 'the imported battle is byte-identical to the retained checkpoint')
      .toBe(before[BACKUP_STORAGE_KEYS.battle]);
    for (const domain of ['campaign', 'trials', 'settings', 'history'])
      expect(expected[BACKUP_STORAGE_KEYS[domain]], `${domain} really changes`).not.toBe(before[BACKUP_STORAGE_KEYS[domain]]);
    if (!await page.locator('.backup-details').evaluate(element => element.open)) await press(page, '.backup-details > summary');
    await chooseBackup(page, text);
    await expect(page.locator('#backupModal')).toBeVisible();
    await expect(page.locator('#confirmImport')).toBeEnabled();
    const clock = await page.locator('#time').textContent();
    const beforeLedger = await observe(page);
    const oldDocument = beforeLedger.events.findLast(event => event.type === 'document-start').documentId;
    const url = page.url();
    const isDocument = request => request.isNavigationRequest() && request.frame() === page.mainFrame();
    page.on('request', request => { if (isDocument(request)) documentRequests.push({event: 'request', url: request.url()}); });
    page.on('requestfailed', request => { if (isDocument(request)) documentRequests.push({event: 'failed', url: request.url(), error: request.failure()?.errorText}); });
    page.on('response', response => { if (isDocument(response.request())) documentRequests.push({event: 'response', url: response.url(), status: response.status()}); });
    await page.route(url, async route => {
      expect(isDocument(route.request())).toBe(true);
      forcedAborts.push({url: route.request().url(), errorCode: 'aborted'});
      await route.abort('aborted');
    }, {times: 1});
    const failedRequest = page.waitForEvent('requestfailed', {predicate: isDocument});
    const [failure] = await Promise.all([failedRequest, nativeControlTap(page, '#confirmImport')]);
    expect(failure.url()).toBe(url);
    expect(failure.failure()?.errorText).toBe('net::ERR_ABORTED');
    expect(forcedAborts).toEqual([{url, errorCode: 'aborted'}]);
    expect(await raw(page)).toEqual(expected);
    const importedMarker = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), PROFILE_MARKER_KEY);
    expect(importedMarker.epoch).not.toBe(beforeMarker.epoch);
    expect(importedMarker.phase).toBe('ready');
    const afterAbort = await observe(page);
    expect(afterAbort.events.findLast(event => event.type === 'document-start').documentId).toBe(oldDocument);
    expect(afterAbort.events.filter(event => event.documentId === oldDocument && event.type === 'click' &&
      event.target === 'confirmImport' && event.trusted && event.enabled)).toHaveLength(1);
    await expect(page.locator('#backupModal')).toBeVisible();
    await expect(page.locator('#time')).toHaveText(clock);

    // The existing import preview may be dismissed, but never the stale-profile
    // fence behind it. Cancel is not required to leave the preview open.
    await press(page, '#cancelImport');
    await expect(page.locator('#backupModal')).toBeHidden();
    await expect(page.locator('#settingsModal')).toBeVisible();
    await expect(page.locator('#profileRecovery')).toBeVisible();
    await expect(page.locator('#settingsDone')).toBeDisabled();
    await expect(page.locator('#closeSettings')).toBeDisabled();
    await expect(page.locator('#profileReload')).toBeEnabled();
    expect(await raw(page)).toEqual(expected);
    await page.keyboard.press('Escape');
    await expect(page.locator('#settingsModal')).toBeVisible();
    await expect(page.locator('#profileRecovery')).toBeVisible();
    await nativeControlTap(page, '#settingsDone'); // Native disabled-control input must not resume.
    await expect(page.locator('#settingsModal')).toBeVisible();
    await expect(page.locator('#settingsDone')).toBeDisabled();
    // A bounded observation interval spans a displayed clock tick. It does not
    // delay app handlers, retry the failed navigation or change the deadline.
    await page.waitForTimeout(1100);
    await expect(page.locator('#time')).toHaveText(clock);
    await expect(page.locator('#settingsModal')).toBeVisible();
    await expect(page.locator('#welcome')).toBeHidden();
    expect(await raw(page), 'Cancel/Escape/Done must not restore any old profile bytes').toEqual(expected);
    const held = await observe(page);
    expect(held.dropped).toBe(0);
    expect(held.events.findLast(event => event.type === 'document-start').documentId).toBe(oldDocument);
    // Disabled controls can suppress pointer/click delivery in Chromium. The
    // hit-tested native input plus the unchanged hold/clock/profile is the
    // contract; any disabled-control ledger event remains diagnostic only.

    // This single explicit retry is the tested recovery action for the injected
    // network fault, never an automatic retry of an unexplained failing gate.
    await Promise.all([page.waitForNavigation({waitUntil: 'load'}), press(page, '#profileReload')]);
    await expect(page.locator('#welcome')).toBeVisible();
    await expect(page.locator('#resumeSaved')).toBeVisible();
    await expect(page.locator('#settingsModal')).toBeHidden();
    await expect(page.locator('#profileRecovery')).toBeHidden();
    expect(page.url()).toBe(url);
    expect(await raw(page), 'successful retry preserves all five imported domains including the identical battle').toEqual(expected);
    const ledger = await observe(page), reload = summarizeProfileReload(ledger, oldDocument);
    expect(ledger.dropped).toBe(0);
    expect(reload.activations).toHaveLength(1);
    expect(reload.departure).not.toBeNull();
    expect(reload.nextDocument).not.toBeNull();
    expect(reload.nextDocument.documentId).not.toBe(oldDocument);
    expect(reload.nextDocument.navigationType).toBe('reload');
    expect(reload.nextDocument.sequence).toBeGreaterThan(reload.departure.sequence);
    expect(reload.competingTraversals).toEqual([]);
    expect(reload.oldDocumentPopstates).toEqual([]);
    expect(documentRequests.filter(event => event.event === 'request')).toHaveLength(2);
    expect(documentRequests.filter(event => event.event === 'failed')).toEqual([{event: 'failed', url, error: 'net::ERR_ABORTED'}]);
    expect(documentRequests.filter(event => event.event === 'response')).toEqual([{event: 'response', url, status: 200}]);
  } finally {
    let ledger;
    try { ledger = await observe(page); } catch (error) { ledger = {unavailable: error.message}; }
    await info.attach('profile-reload-network-fault.json', {contentType: 'application/json',
      body: Buffer.from(JSON.stringify({ledger, documentRequests, forcedAborts}, null, 2))});
  }
});
