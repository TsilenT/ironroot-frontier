import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {createProfileSession, CURRENT_PROFILE_PROTOCOL_VERSION, PROFILE_MARKER_KEY as MARKER} from '../dist/profile-session.js';
import {createBackup, parseBackup, restoreBackup, BACKUP_STORAGE_KEYS as K, BackupError} from '../dist/backup.js';
import {createCampaignProgress, CAMPAIGN_PROGRESS_MISSIONS, getProgressionCampaignOverview as getCampaignOverview} from '../dist/campaign.js';
import {CHALLENGES, CURRENT_CHALLENGES, createCurrentChallenge} from '../dist/challenges.js';
import {identityOf, scenarioForBattle, encodeBattle, decodeBattle} from '../dist/battle-codec.js';
import {validateHistory} from '../dist/history-codec.js';
import {protocolSeven, protocolSevenSource, protocolSevenHash} from './fixtures/profile-session-v0172-source.mjs';

const id = 'ashen-crossroads', date = '2026-11-07T00:00:00.000Z', keys = Object.values(K);
const marker = (version, epoch = 'retained', phase = 'ready') => JSON.stringify({format:'ironroot-profile', version, epoch, phase});
function raw(entries = []) {
  const data = new Map(entries), calls = [];
  return {data, calls,
    getItem(key) { calls.push(['get', key]); return data.get(key) ?? null; },
    setItem(key, value) { calls.push(['set', key]); data.set(key, value); },
    removeItem(key) { calls.push(['remove', key]); data.delete(key); },
  };
}
let epoch = 0;
const current = r => createProfileSession(() => r, {requiredProtocolVersion:CURRENT_PROFILE_PROTOCOL_VERSION, newEpoch:() => `trial-${++epoch}`});
const old = r => protocolSeven.createProfileSession(() => r, {requiredProtocolVersion:7, newEpoch:() => `old-${++epoch}`});
const bytes = r => keys.map(key => [key, r.data.get(key) ?? null]);
const writes = r => r.calls.filter(([op]) => op !== 'get');
function data(withNew = true) {
  const campaign = {...createCampaignProgress(), missions:Object.fromEntries(CAMPAIGN_PROGRESS_MISSIONS.map(m => [m.id, {completed:true, stars:2, bestTime:60}]))};
  const trials = Object.fromEntries(CHALLENGES.map(c => [c.id, {completed:true, bestTime:75}]));
  const settings = {sound:false, music:false, sfx:true, volume:.3, reducedMotion:true, quality:'low', keyboard:{version:1, bindings:{build1:'KeyQ', volley:null}}};
  const history = [{won:true, draw:false, challengeId:'shieldbreaker', campaignId:null, difficulty:'normal', time:75, kills:12, built:5, date}];
  if (withNew) {
    trials[id] = {completed:true, bestTime:98.25};
    const game = createCurrentChallenge(id);
    history.push({won:true, draw:false, difficulty:game.difficulty, time:98.25, kills:18, built:8, date, identity:identityOf(game, scenarioForBattle(id, null, game))});
  }
  return {campaign, trials, settings, history, battle:null};
}
const entries = value => Object.entries(K).map(([domain, key]) => [key, '  ' + JSON.stringify(value[domain]) + '\n']);
const backup = (value = data()) => createBackup(raw(), {createdAt:date, ...value});

// Existing protocol clients are executed from the exact reviewed base source,
// not modeled by the new implementation with a smaller version argument.
test('current protocol pins the exact old seven source and retains the legacy default', () => {
  assert.equal(CURRENT_PROFILE_PROTOCOL_VERSION, 12);
  assert.equal(protocolSeven.CURRENT_PROFILE_PROTOCOL_VERSION, 7);
  assert.equal(createHash('sha256').update(protocolSevenSource).digest('hex'), protocolSevenHash);
  const r = raw(), p = createProfileSession(() => r, {newEpoch:() => 'default'});
  assert.equal(r.data.has(MARKER), false);
  assert.equal(p.beginImport().ok, true);
  assert.equal(JSON.parse(r.data.get(MARKER)).version, 1);
});

test('absent and all prior ready markers upgrade alone before any profile domain is accessed', () => {
  for (const prior of [null, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]) {
    const r = raw([...entries(data(false)), ...(prior === null ? [] : [[MARKER, marker(prior)]])]);
    const before = bytes(r), p = current(r);
    assert.equal(p.status().canWrite, true);
    const migrated = JSON.parse(r.data.get(MARKER));
    assert.equal(migrated.version, CURRENT_PROFILE_PROTOCOL_VERSION);
    if (prior !== null) assert.equal(migrated.epoch, 'retained');
    assert.deepEqual(bytes(r), before);
    assert.equal(writes(r).length, prior === CURRENT_PROFILE_PROTOCOL_VERSION ? 0 : 1);
    assert.ok(r.calls.every(([, key]) => key === MARKER));
    for (const [key, value] of before) assert.equal(p.storage.getItem(key), value);
    const overview = getCampaignOverview(JSON.parse(p.storage.getItem(K.campaign)));
    assert.equal(overview.total, 19); assert.equal(overview.maxStars, 57);
  }
});

test('already-open and later-opened protocol-seven clients cannot discard the new record or any other profile data', () => {
  const r = raw([[MARKER, marker(7)], ...entries(data(false))]), stale = old(r);
  assert.equal(stale.status().canWrite, true);
  // This is what the old five-ID loader would hold before the new completion.
  const fiveRecords = JSON.stringify(data(false).trials);
  const ready = current(r);
  ready.storage.setItem(K.trials, JSON.stringify(data().trials));
  ready.storage.setItem(K.history, JSON.stringify(data().history));
  const before = [...r.data]; r.calls.length = 0;
  for (const client of [stale, old(r)]) {
    assert.equal(client.status().canWrite, false);
    assert.throws(() => client.storage.setItem(K.trials, fiveRecords));
    for (const key of keys) {
      assert.throws(() => client.storage.getItem(key));
      assert.throws(() => client.storage.setItem(key, 'stale'));
      assert.throws(() => client.storage.removeItem(key));
      assert.throws(() => client.importStorage.setItem(key, 'stale'));
    }
    assert.equal(client.beginImport().ok, false);
    assert.equal(client.beginImport({recover:true}).code, 'unsupported-protocol');
  }
  assert.deepEqual([...r.data], before); assert.deepEqual(writes(r), []);
  assert.ok(r.calls.every(([, key]) => key === MARKER));
  assert.equal(JSON.parse(r.data.get(K.trials))[id].completed, true);
});

test('failed or uncertain current-marker writes block reads, saves and import until a verified reload', () => {
  for (const fault of ['initial-read', 'drop', 'throw', 'readback', 'competing']) {
    const r = raw([[MARKER, marker(7)], ...entries(data(false))]), before = bytes(r), read = r.getItem, write = r.setItem;
    let denied = fault === 'initial-read';
    r.getItem = key => { if (key === MARKER && denied) throw Error('read denied'); return read(key); };
    r.setItem = (key, value) => {
      if (key !== MARKER) return write(key, value);
      if (fault === 'drop') return;
      if (fault === 'throw') throw Error('quota');
      write(key, fault === 'competing' ? marker(8, 'other') : value);
      if (fault === 'readback') denied = true;
    };
    const p = current(r);
    assert.equal(p.status().canWrite, false, fault);
    for (const key of keys) {
      assert.throws(() => p.storage.getItem(key));
      assert.throws(() => p.storage.setItem(key, 'overwrite'));
      assert.throws(() => p.storage.removeItem(key));
    }
    assert.deepEqual(bytes(r), before);
    denied = false; r.getItem = read; r.setItem = write;
    assert.throws(() => p.storage.getItem(K.trials));
    assert.equal(p.beginImport({recover:true}).ok, false);
    assert.equal(current(r).status().canWrite, true);
    assert.deepEqual(bytes(r), before);
  }
});

test('post-write throws are accepted only after readback, while unfinished and future markers remain untouched', () => {
  const r = raw([[MARKER, marker(7)], ...entries(data())]), before = bytes(r), write = r.setItem;
  r.setItem = (key, value) => { write(key, value); throw Error('post write'); };
  assert.equal(current(r).status().canWrite, true); assert.deepEqual(bytes(r), before);
  for (const prior of [marker(7, 'retained', 'restoring'), marker(7, 'retained', 'failed'), marker(8, 'retained', 'restoring'), marker(CURRENT_PROFILE_PROTOCOL_VERSION+1), '{bad']) {
    const target = raw([[MARKER, prior], ...entries(data())]), original = [...target.data], p = current(target);
    assert.equal(p.status().canWrite, false); assert.deepEqual(writes(target), []);
    assert.throws(() => p.storage.setItem(K.trials, '{}'));
    if (prior === marker(CURRENT_PROFILE_PROTOCOL_VERSION+1)) assert.equal(p.beginImport({recover:true}).code, 'unsupported-protocol');
    assert.deepEqual([...target.data], original);
  }
});

test('five old records and modern sixth record/history export and import without changing campaign totals or preferences', () => {
  const value = data(), source = raw(entries(value)), before = [...source.data];
  const text = createBackup(source, {createdAt:date}), parsed = parseBackup(text);
  assert.equal(parsed.version, 2); assert.deepEqual(parsed.data, value);
  assert.deepEqual([...source.data], before); assert.deepEqual(writes(source), []);
  const target = raw([[MARKER, marker(7)], ...entries(data(false)), ['unrelated', 'retained']]);
  const stale = old(target), importer = current(target), sibling = current(target);
  assert.equal(importer.beginImport().ok, true);
  assert.equal(restoreBackup(importer.importStorage, text).ok, true);
  assert.equal(importer.finishImport({outcome:'restored'}).ok, true);
  assert.equal(importer.status().canWrite, false); assert.equal(sibling.status().canWrite, false);
  assert.equal(stale.beginImport({recover:true}).code, 'unsupported-protocol');
  const ready = current(target); assert.equal(ready.status().canWrite, true);
  for (const domain of ['campaign', 'trials', 'settings', 'history']) assert.deepEqual(JSON.parse(ready.storage.getItem(K[domain])), value[domain]);
  assert.equal(ready.storage.getItem(K.battle), null);
  assert.equal(target.data.get('unrelated'), 'retained');
  assert.equal(JSON.parse(target.data.get(MARKER)).version, CURRENT_PROFILE_PROTOCOL_VERSION);
});

test('old backups still restore all five records and leave the current protocol in force', () => {
  const value = data(false), r = raw([[MARKER, marker(7)], ...entries(data())]), p = current(r);
  assert.equal(p.beginImport().ok, true);
  assert.equal(restoreBackup(p.importStorage, backup(value)).ok, true);
  assert.equal(p.finishImport({outcome:'restored'}).ok, true);
  assert.deepEqual(parseBackup(createBackup(current(r).storage, {createdAt:date})).data, value);
  assert.equal(JSON.parse(r.data.get(MARKER)).version, CURRENT_PROFILE_PROTOCOL_VERSION);
});

test('a failed replacement rolls back each domain exactly and preserves the new trial record', () => {
  for (const failedKey of keys) for (const fault of ['throw', 'drop', 'throw-after-write']) {
    const r = raw([[MARKER, marker(8)], ...entries(data())]), before = bytes(r), p = current(r);
    assert.equal(p.beginImport().ok, true);
    const write = r.setItem, remove = r.removeItem; let pending = true;
    const apply = (key, operation) => {
      if (key === failedKey && pending) { pending = false; if (fault === 'throw-after-write') operation(); if (fault !== 'drop') throw Error('quota'); return; }
      operation();
    };
    r.setItem = (key, value) => apply(key, () => write(key, value)); r.removeItem = key => apply(key, () => remove(key));
    const result = restoreBackup(p.importStorage, backup(data(false)));
    assert.equal(result.ok, false, `${failedKey}/${fault}`); assert.equal(result.rollback.complete, true);
    assert.deepEqual(bytes(r), before);
    assert.equal(p.finishImport({outcome:'rolled-back'}).ok, true); assert.equal(p.status().canWrite, true);
  }
});

test('new trial records validate current IDs and deadlines without broadening legacy result identities', () => {
  assert.equal(CHALLENGES.length, 5); assert.equal(CURRENT_CHALLENGES.length, 6);
  assert.equal(CHALLENGES.some(c => c.id === id), false);
  const original = data();
  for (const invalid of [{completed:true, bestTime:0}, {completed:true, bestTime:240.3}, {completed:false, bestTime:90}, {completed:true, bestTime:90, extra:true}]) {
    const value = structuredClone(original); value.trials[id] = invalid;
    assert.throws(() => backup(value), BackupError);
  }
  const unknown = structuredClone(original); unknown.trials['unknown-trial'] = {completed:true, bestTime:90};
  assert.throws(() => backup(unknown), BackupError);
  const legacy = {...original.history[0], challengeId:id};
  assert.throws(() => validateHistory([legacy]), /unknown trial/);
  assert.deepEqual(validateHistory([original.history[1]]), [original.history[1]]);
  const noHistory = {...original, history:[]};
  assert.equal(parseBackup(backup(noHistory)).data.trials[id].bestTime, 98.25);
});

test('current trial attempt identity is admitted in the existing battle/backup schema', () => {
  const game = createCurrentChallenge(id), scenario = scenarioForBattle(id, null, game);
  const battle = encodeBattle(game, scenario), parsed = parseBackup(backup({...data(), battle}));
  assert.equal(parsed.version, 2); assert.equal(parsed.data.battle.version, 3);
  assert.deepEqual(scenario, {kind:'trial', id, revision:3});
  assert.deepEqual(decodeBattle(parsed.data.battle).game.serialize(), game.serialize());
  const source = readFileSync(new URL('../dist/backup.js', import.meta.url), 'utf8');
  assert.match(source, /CURRENT_CHALLENGES as CHALLENGES/);
});
