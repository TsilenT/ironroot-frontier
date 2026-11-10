import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInContext} from 'node:vm';
import {startupHarness} from './mobile-startup-fixture.mjs';
import {historyWindow} from './menu-history-fixture.mjs';
import {createMenuHistory, seedMenuAncestors} from '../dist/menu-history.js';
import {getRuleset, getMap} from '../dist/engine.js';
import * as campaign from '../dist/campaign.js';
import {lastEngineView} from '../dist/final-chapter-view.js';
import {missionBriefing} from '../dist/campaign-presentation.js';
import {renderMissionScouting} from '../dist/scouting.js';
import {createProfileSession, PROFILE_MARKER_KEY, CURRENT_PROFILE_PROTOCOL_VERSION} from '../dist/profile-session.js';
import {createStorage, createSaveSession, createHistorySession, createPreferenceSession, readHistoryState, writeBattle, getBattleWriteFailure} from '../dist/persistence.js';
import {createBackup, parseBackup, restoreBackup, MAX_BACKUP_BYTES, BACKUP_STORAGE_KEYS as K} from '../dist/backup.js';
import {encodeBattle, decodeBattle, scenarioForBattle} from '../dist/battle-codec.js';

// Source-derived control-flow checks, not native unload, rendering or network QA.
// The override supports running these unchanged behavioral checks on the old app.
const source = readFileSync(process.env.PROFILE_RELOAD_APP_SOURCE || new URL('../dist/app.js', import.meta.url), 'utf8');
const section = (a, b) => {
  const start = source.indexOf(a), end = source.indexOf(b, start);
  assert.ok(start >= 0 && end > start, `production section ${a}`);
  return source.slice(start, end);
};
const bytes = h => Object.fromEntries(Object.values(K).map(key => [key, h.data.get(key) ?? null]));
const gameBytes = h => JSON.stringify(h.c.game.serialize());
const hidden = (h, id) => h.$(id).classList.contains('hidden');
const memory = () => {
  const data = new Map(), writes = [];
  return {data, writes, getItem: key => data.get(key) ?? null,
    setItem(key, value) { data.set(key, value); writes.push(['set', key, value]); },
    removeItem(key) { data.delete(key); writes.push(['remove', key]); }};
};
function harness(mode = 'challenges') {
  const h = startupHarness({width:320, height:480, source}), {c, $} = h;
  const raw = memory(), {data} = raw, browser = historyWindow();
  const microtasks = [], windows = new Map(), documents = new Map(), observers = new Map(), goes = [];
  const listen = (map, type, handler) => map.set(type, [...(map.get(type) || []), handler]);
  const emit = (map, type, event = {}) => { for (const handler of map.get(type) || []) handler(event); };
  const queue = fn => microtasks.push(fn);
  const profileSession = createProfileSession(() => raw, {requiredProtocolVersion:CURRENT_PROFILE_PROTOCOL_VERSION});
  const storage = createStorage(() => profileSession.storage);
  const profileWritable = () => !c.recoveryHold && !c.profileGate && profileSession.status().canWrite;
  const battleSession = createSaveSession(storage, K.battle);
  const historySession = createHistorySession(storage, K.history, {canWrite:profileWritable});
  const preferenceSession = createPreferenceSession(storage, K.settings, {canWrite:profileWritable});
  const go = browser.history.go;
  browser.history.go = delta => { goes.push(delta); go(delta); };
  c.window.history = browser.history;
  c.window.location = {href:'https://example.test/index.html'};
  c.window.addEventListener = (type, handler) => listen(windows, type, handler);
  c.window.removeEventListener = (type, handler) => windows.set(type, (windows.get(type) || []).filter(x => x !== handler));
  c.document.hidden = false;
  c.document.referrer = '';
  c.document.addEventListener = (type, handler) => listen(documents, type, handler);
  c.document.querySelector = selector => selector === '.app' ? $('app') : c.document.body.querySelector(selector);
  Object.assign(c, campaign, {
    CAMPAIGN_MISSIONS:campaign.CAMPAIGN_PROGRESS_MISSIONS,
    CAMPAIGN_CHAPTERS:[campaign.ONBOARDING_CHAPTER, ...campaign.ALL_CAMPAIGN_CHAPTERS],
    getCampaignOverview:campaign.getProgressionCampaignOverview,
    campaignProgress:campaign.createCampaignProgress(), mode, campaignPage:'mission', briefingMission:null,
    selectedCampaign:'roadside-watch', selectedChapter:'opening-roads', selectedChallenge:c.CHALLENGES[0].id,
    navigationAttempt:0, navigationGame:null, navigationAway:false, menuHistory:null,
    getRuleset, getMap, missionBriefing, renderMissionScouting, lastEngineView, renderChallenge(){}, updateResume(){},
    hasLastResult:false, revealBattleReport(){}, activeDialog:null, settingsWasPaused:false, helpWasPaused:false,
    dialogFocus:new Map(), dialogDefaultFocus: layer => layer === $('settingsModal') ? $('settingsDone') : $('resume'),
    profileSession, storage, battleSession, historySession, preferenceSession, localStorage:raw,
    pendingFinalizeOutcome:null, allowProfileReload:false, importGeneration:0, retainedHistory:null,
    knownHistory:[], knownHistoryAvailable:true, preferences:{sound:true}, trialRecords:{}, syncSettings(){},
    progressDirty:false, saveWarning:false, SAVE:K.battle, HISTORY:K.history, TRIALS:K.trials,
    writeBattle, getBattleWriteFailure, readHistoryState, encodeBattle, decodeBattle, scenarioForBattle,
    createBackup:(raw, options) => createBackup(raw, options && JSON.parse(JSON.stringify(options))),
    parseBackup, restoreBackup, MAX_BACKUP_BYTES, URL, Blob,
    location:{protocol:'https:', reload(){ c.reloads++; if (c.reloadError) throw c.reloadError; }}, reloads:0,
    queueMicrotask:queue, seedMenuAncestors,
    createMenuHistory: options => createMenuHistory({...options, defer:queue, token:'reload-test'}),
    // Deliberately deliver even no-op class operations as queued observations.
    // This stresses reachability, not browser mutation coalescing/timing.
    MutationObserver:class { constructor(callback) { this.callback = callback; } observe(node) {
      if (!observers.has(node)) {
        observers.set(node, []);
        for (const method of ['add', 'remove', 'toggle']) {
          const original = node.classList[method];
          node.classList[method] = (...args) => {
            const result = original(...args);
            for (const callback of observers.get(node)) queue(callback);
            return result;
          };
        }
      }
      observers.get(node).push(this.callback);
    }},
  });
  c.dialogLayers = ['coachingModal','pauseVeil','viewportModal','welcome','helpModal','settingsModal','resultModal','backupModal','restartModal'].map($);
  for (const [a, b] of [
    ['function syncMenuHistory()', 'const labels ='],
    ['function updatePreferenceSaveStatus()', 'function timeText('],
    ['function showCampaignPage(', 'setMode(mode);'], ['function setMode(', 'function updateSkirmishRules()'],
    ['function showTitle(', "$('playAgain').onclick"], ['function showHelp()', 'const mapDescriptions ='],
    ['function syncPauseMenu()', 'let settingsWasPaused ='], ['function showSettings(event)', 'function syncSettings()'],
    ['function persistProgress()', 'function updateResume()'], ["$('saveExit').onclick =", "$('speed').onclick"],
    ['function syncDialogs()', 'function keepDialogFocus()'],
    ['// Portable backups', '// Experimental standard-controller'],
    ["window.addEventListener('beforeunload',", "window.addEventListener('storage',"],
    ['function menuNavigationTrail()', 'menuHistory = createMenuHistory({'],
  ]) runInContext(section(a, b), c);
  runInContext(section('for (const layer of dialogLayers)\n  new MutationObserver(syncDialogs)', "document.addEventListener('keydown', (e) => {\n  if (e.key !== 'Tab'"), c);
  runInContext('downloadBackup = text => { exportedText = text; };', c);
  c.setMode(mode); c.syncDialogs();
  browser.listen(event => emit(windows, 'popstate', event));
  runInContext(source.slice(source.indexOf('menuHistory = createMenuHistory({')), c);
  function flush() {
    for (let count = 0; ; count++) {
      if (count > 100) throw Error('microtask loop');
      browser.flush();
      if (!microtasks.length) return;
      const batch = microtasks.splice(0);
      for (const fn of batch) fn();
    }
  }
  const result = {...h, data, raw, browser, goes, flush,
    windowEvent:(type, event) => emit(windows, type, event),
    documentEvent:(type, event) => emit(documents, type, event),
    enqueue:queue,
    start() { c.start(); flush(); c.showSettings(); flush(); },
    back() { browser.back(); flush(); }, forward() { browser.forward(); flush(); },
    reload() { $('profileReload').onclick(); },
    importEmpty({own = false} = {}) {
      const importer = own ? profileSession : createProfileSession(() => raw, {requiredProtocolVersion:CURRENT_PROFILE_PROTOCOL_VERSION});
      assert.equal(importer.beginImport().ok, true);
      assert.equal(restoreBackup(importer.importStorage, createBackup(memory())).ok, true);
      if (own) c.finishProfileImport('restored');
      else { assert.equal(importer.finishImport({outcome:'restored'}).ok, true); c.syncProfileSafety(); }
    },
  };
  flush();
  return result;
}

for (const mode of ['challenges', 'campaign']) {
  test(`${mode}: late post-reload sync retains ancestry and cannot traverse the imported empty profile`, () => {
    const h = harness(mode); h.start(); h.importEmpty(); h.flush();
    const before = bytes(h), retained = gameBytes(h), trail = JSON.stringify(h.c.menuNavigationTrail()), writes = h.raw.writes.length;
    const requests = h.goes.length, historyWrites = h.browser.writes.length;
    // Capture listener and a late queued callback both use production sync.
    h.documentEvent('click', {});
    h.reload();
    assert.equal(h.c.reloads, 1);
    assert.equal(h.c.paused, true);
    h.c.syncMenuHistory();
    h.c.syncProfileSafety(); // Real recovery class mutation -> observer -> syncDialogs -> microtask.
    h.flush();
    assert.equal(h.goes.length, requests, 'reload must not request history.go before pagehide');
    assert.equal(h.browser.writes.length, historyWrites, 'unchanged ancestry needs no History API writes');
    assert.equal(h.c.started, true); assert.equal(JSON.stringify(h.c.menuNavigationTrail()), trail);
    assert.equal(gameBytes(h), retained); assert.deepEqual(bytes(h), before);
    assert.equal(h.raw.writes.length, writes); assert.equal(h.data.has(K.battle), false);
    assert.equal(hidden(h, 'settingsModal'), false); assert.equal(h.$('profileReload').disabled, false);
  });

  test(`${mode}: own import finalization and delayed/no-document retries preserve all five domains`, () => {
    const h = harness(mode); h.start(); h.c.progressDirty = true;
    const retained = gameBytes(h); h.importEmpty({own:true});
    const before = bytes(h), requests = h.goes.length, writes = h.raw.writes.length;
    assert.equal(h.c.reloads, 1); assert.equal(h.c.profileSession.status().reloadRequired, true);
    for (let i = 0; i < 3; i++) {
      h.c.syncProfileSafety(); h.c.syncDialogs(); h.c.syncMenuHistory(); h.flush();
      h.documentEvent('visibilitychange', {}); h.windowEvent('pageshow', {persisted:false}); h.flush();
      assert.equal(h.c.save(), false); assert.equal(h.c.persistProgress(), false);
      h.c.retryHistorySave(); h.c.retryPreferences(); h.reload();
    }
    assert.equal(h.c.reloads, 4); assert.equal(h.c.started, true); assert.equal(h.c.progressDirty, true);
    assert.equal(h.c.paused, true); assert.equal(gameBytes(h), retained); assert.deepEqual(bytes(h), before);
    assert.equal(h.goes.length, requests); assert.equal(h.raw.writes.length, writes);
    let prevented = false;
    h.windowEvent('beforeunload', {preventDefault(){prevented=true;}});
    assert.equal(prevented, false, 'explicit reload retains the existing unload exemption');
    h.windowEvent('pagehide', {persisted:false}); h.flush();
    assert.equal(h.c.navigationAway, true); assert.deepEqual(bytes(h), before); assert.equal(h.goes.length, requests);
    assert.equal(gameBytes(h), retained);
  });

  test(`${mode}: an already-queued menu-history reconciliation survives reload without a new traversal`, () => {
    const h = harness(mode); h.start(); h.importEmpty(); h.flush();
    h.$('backupModal').classList.remove('hidden'); h.flush();
    h.c.hideBackup(); h.c.syncMenuHistory();
    assert.equal(h.goes.at(-1), -1, 'explicit Cancel has already requested its ordinary traversal');
    h.browser.flush(); // The real pop handler now queues its own deferred sync.
    const requests = h.goes.length, before = bytes(h), retained = gameBytes(h);
    h.reload(); h.flush();
    assert.equal(h.goes.length, requests, 'reload cannot add a traversal to an already requested one');
    assert.equal(hidden(h, 'backupModal'), true); assert.equal(hidden(h, 'settingsModal'), false);
    assert.equal(h.c.started, true); assert.equal(h.c.paused, true);
    assert.deepEqual(bytes(h), before); assert.equal(gameBytes(h), retained);
  });

  test(`${mode}: capture-before-handler and pagehide-before-late-sync controls do not traverse`, () => {
    const h = harness(mode); h.start(); h.importEmpty(); h.flush();
    const requests = h.goes.length, before = bytes(h);
    h.documentEvent('click', {}); h.flush();
    assert.equal(h.goes.length, requests);
    h.reload(); h.windowEvent('pagehide', {persisted:false});
    h.c.syncMenuHistory(); h.c.syncProfileSafety(); h.flush();
    assert.equal(h.goes.length, requests); assert.deepEqual(bytes(h), before);
  });
}

for (const phase of ['restoring', 'failed', 'invalid', 'pending-finalization']) test(`${phase}: blocked reload does not mutate the live attempt or history`, () => {
  const h = harness(); h.start();
  if (phase === 'pending-finalization') h.c.pendingFinalizeOutcome = 'restored';
  else {
    const importer = createProfileSession(() => h.raw, {requiredProtocolVersion:CURRENT_PROFILE_PROTOCOL_VERSION});
    assert.equal(importer.beginImport().ok, true);
    if (phase === 'failed') assert.equal(importer.finishImport({outcome:'failed'}).ok, true);
    if (phase === 'invalid') h.raw.setItem(PROFILE_MARKER_KEY, 'invalid');
  }
  h.c.syncProfileSafety(); h.flush();
  const before = bytes(h), retained = gameBytes(h), trail = JSON.stringify(h.c.menuNavigationTrail()), requests = h.goes.length;
  h.reload(); h.flush();
  assert.equal(h.c.reloads, 0); assert.equal(h.c.allowProfileReload, false); assert.equal(h.c.started, true);
  assert.equal(h.c.paused, true); assert.equal(JSON.stringify(h.c.menuNavigationTrail()), trail);
  assert.equal(h.goes.length, requests); assert.deepEqual(bytes(h), before); assert.equal(gameBytes(h), retained);
});

test('ready-profile recovery retains export, dirty progress and retry when native reload throws', () => {
  const h = harness('campaign'); h.start();
  h.c.holdRecovery('Keep this retained attempt until it is exported.', 'storage'); h.c.showRecoverySettings(); h.flush();
  h.c.progressDirty = true;
  const before = bytes(h), retained = gameBytes(h), requests = h.goes.length;
  h.c.reloadError = new Error('native reload unavailable');
  assert.throws(() => h.reload(), /native reload unavailable/);
  assert.equal(h.c.allowProfileReload, false); assert.equal(h.c.started, true); assert.equal(h.c.progressDirty, true);
  let prevented = false;
  h.windowEvent('beforeunload', {preventDefault(){prevented=true;}});
  assert.equal(prevented, true, 'synchronous failure does not leave unload warnings bypassed');
  h.$('exportRecovery').onclick();
  assert.ok(h.c.exportedText); assert.ok(parseBackup(h.c.exportedText).data.battle);
  assert.equal(h.c.save(), false); assert.equal(h.c.persistProgress(), false);
  h.c.retryHistorySave(); h.c.retryPreferences();
  h.c.reloadError = null; h.reload(); h.c.syncProfileSafety(); h.flush();
  assert.equal(h.c.reloads, 2); assert.equal(h.c.paused, true); assert.equal(h.c.started, true);
  h.windowEvent('pagehide', {persisted:true}); h.flush();
  assert.deepEqual(bytes(h), before); assert.equal(gameBytes(h), retained); assert.equal(h.goes.length, requests);
  h.windowEvent('pageshow', {persisted:true}); h.flush();
  assert.equal(h.c.navigationAway, false); assert.equal(h.c.allowProfileReload, false);
  assert.equal(h.c.paused, true); assert.deepEqual(bytes(h), before); assert.equal(gameBytes(h), retained);
});

test('same-battle import is fenced immediately, before Cancel/Done or the next periodic profile check', () => {
  const h = harness(); h.start();
  h.c.settingsWasPaused = false;
  h.$('backupModal').classList.remove('hidden'); h.flush();
  const backup = createBackup(h.raw, {includeBattle:true}), retained = gameBytes(h);
  const savedBattle = h.data.get(K.battle);
  assert.equal(h.c.profileSession.beginImport().ok, true);
  assert.equal(restoreBackup(h.c.profileSession.importStorage, backup).ok, true);
  h.c.finishProfileImport('restored'); // Real call site clears the old gate, then calls reload.
  const before = bytes(h);
  assert.equal(h.data.get(K.battle), savedBattle, 'this edge requires identical imported checkpoint bytes');
  assert.equal(h.c.battleSession.status(), 'current');
  assert.equal(h.c.profileSession.status().canWrite, false);
  assert.equal(h.c.profileGate.reloadRequired, true, 'reload must fence the retained UI without waiting for a frame');
  h.$('cancelImport').onclick(); h.c.hideSettings(); h.c.pause(false, {explicit:true});
  assert.equal(h.c.started, true); assert.equal(h.c.paused, true);
  assert.equal(hidden(h, 'settingsModal'), false);
  assert.equal(h.c.save(), false); assert.equal(h.c.persistProgress(), false);
  assert.equal(gameBytes(h), retained); assert.deepEqual(bytes(h), before);
  h.flush();
  assert.throws(() => h.c.profileSession.storage.setItem(K.battle, 'stale'));
  assert.deepEqual(bytes(h), before);
});

test('ordinary Back/Forward and cached return retain finite history and the same paused battle', () => {
  const h = harness('challenges'); h.start();
  const retained = gameBytes(h), pushes = h.browser.writes.filter(x => x.method === 'push').length;
  h.back(); assert.equal(hidden(h, 'settingsModal'), true); assert.equal(h.c.paused, true);
  h.forward(); assert.equal(hidden(h, 'settingsModal'), false); assert.equal(h.c.paused, true);
  const before = bytes(h);
  h.windowEvent('pagehide', {persisted:true}); h.flush(); h.windowEvent('pageshow', {persisted:true}); h.flush();
  assert.equal(gameBytes(h), retained); assert.deepEqual(bytes(h), before); assert.equal(h.c.paused, true);
  assert.equal(h.browser.writes.filter(x => x.method === 'push').length, pushes);
});

test('a reload with no new document does not disable Back or grow a trapping history stack', () => {
  const h = harness(); h.start(); h.importEmpty(); h.flush();
  const before = bytes(h), retained = gameBytes(h), pushes = h.browser.writes.filter(x => x.method === 'push').length;
  h.reload(); h.flush();
  for (let i = 0; i < h.browser.history.length + 1; i++) h.back();
  assert.equal(h.browser.index, 0, 'finite browser Back can still leave the page');
  assert.equal(h.browser.writes.filter(x => x.method === 'push').length, pushes);
  assert.equal(h.c.paused, true); assert.deepEqual(bytes(h), before); assert.equal(gameBytes(h), retained);
});
