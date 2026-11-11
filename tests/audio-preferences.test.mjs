import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import * as prior from './fixtures/profile-session-v0401.js';
import {createProfileSession, CURRENT_PROFILE_PROTOCOL_VERSION as VERSION, PROFILE_MARKER_KEY as MARKER} from '../dist/profile-session.js';
import {createBackup, parseBackup, restoreBackup, BACKUP_STORAGE_KEYS as KEYS} from '../dist/backup.js';

const marker = (version, phase = 'ready') => JSON.stringify({format:'ironroot-profile', version, epoch:'earned-audio', phase});
function backend(entries = []) {
  const data = new Map(entries), writes = [];
  return {data, writes, getItem:key => data.get(key) ?? null,
    setItem(key, value) { writes.push(['set', key]); data.set(key, String(value)); },
    removeItem(key) { writes.push(['remove', key]); data.delete(key); }};
}
const current = raw => createProfileSession(() => raw, {requiredProtocolVersion:VERSION, newEpoch:() => 'audio-profile'});
const old = raw => prior.createProfileSession(() => raw, {requiredProtocolVersion:31});

test('protocol32 changes only the fence from main v0.40.1 at 6544938e8b749ec42621fb0391085751edb09546', () => {
  const source = readFileSync(new URL('./fixtures/profile-session-v0401.js', import.meta.url), 'utf8');
  assert.equal(createHash('sha256').update(source).digest('hex'), '83e96e2782e454e3ea05b7ed33abe567beafce25fef8ff737179e4cde4c0ac62');
  assert.equal(prior.CURRENT_PROFILE_PROTOCOL_VERSION, 31); assert.equal(VERSION, 32);
  const expected = source.replace('CURRENT_PROFILE_PROTOCOL_VERSION = 31', 'CURRENT_PROFILE_PROTOCOL_VERSION = 32')
    .replace('Last Engine aftermath and exact result identities from older writers.', 'Last Engine aftermath and exact result identities from older writers; protocol 32 fences independent music/effects volume preferences from clients that reconstruct only the older settings fields.')
    .replace('29, 30, 31].includes', '29, 30, 31, 32].includes').replace('29, 30 or 31.', '29, 30, 31 or 32.');
  assert.equal(readFileSync(new URL('../dist/profile-session.js', import.meta.url), 'utf8'), expected);
});

test('absent and ready1..31 markers upgrade without rewriting any earned domain', () => {
  const domains = Object.values(KEYS).map((key, i) => [key, `  opaque earned ${i}\n`]);
  for (const version of [null, ...Array.from({length:31}, (_, i) => i + 1)]) {
    const raw = backend([...(version ? [[MARKER, marker(version)]] : []), ...domains]);
    assert.ok(current(raw).status().canWrite);
    assert.equal(JSON.parse(raw.data.get(MARKER)).version, 32);
    assert.deepEqual(raw.writes, [['set', MARKER]]);
    for (const [key, bytes] of domains) assert.equal(raw.data.get(key), bytes);
  }
});

test('actual v0.40.1 stale and reopened sessions are fenced before touching any domain', () => {
  const raw = backend([[MARKER, marker(31)], ...Object.values(KEYS).map(key => [key, 'earned'])]);
  const stale = old(raw); assert.ok(stale.status().canWrite); assert.ok(current(raw).status().canWrite);
  raw.writes.length = 0; const before = [...raw.data];
  for (const profile of [stale, old(raw)]) {
    assert.equal(profile.status().canWrite, false);
    for (const storage of [profile.storage, profile.importStorage]) for (const key of Object.values(KEYS)) {
      assert.throws(() => storage.getItem(key)); assert.throws(() => storage.setItem(key, 'lost')); assert.throws(() => storage.removeItem(key));
    }
    assert.equal(profile.beginImport({recover:true}).code, 'unsupported-protocol');
  }
  assert.deepEqual([...raw.data], before); assert.deepEqual(raw.writes, []);
});

test('interrupted and future markers preserve the profile and refuse ordinary writes', () => {
  for (const [version, phase] of [[31,'restoring'],[31,'failed'],[32,'restoring'],[32,'failed'],[33,'ready']]) {
    const raw = backend([[MARKER, marker(version, phase)], [KEYS.settings, 'earned']]);
    const before = [...raw.data], profile = current(raw);
    assert.equal(profile.status().canWrite, false); assert.throws(() => profile.storage.setItem(KEYS.settings, '{}'));
    assert.deepEqual([...raw.data], before); assert.deepEqual(raw.writes, []);
  }
});

test('independent channel volumes survive backup export, parse and restore, including zero', () => {
  for (const channels of [{musicVolume:0,sfxVolume:1}, {musicVolume:.35,sfxVolume:.8}]) {
    const settings = {sound:true,music:true,sfx:true,volume:.5,...channels};
    const text = createBackup(backend([[KEYS.settings, JSON.stringify(settings)]]));
    assert.deepEqual(parseBackup(text).data.settings, settings);
    const target = backend(); assert.equal(restoreBackup(target, text).ok, true);
    assert.deepEqual(JSON.parse(target.data.get(KEYS.settings)), settings);
  }
});

test('backups reject nonfinite, nonnumeric and out-of-range channel levels', () => {
  for (const key of ['musicVolume', 'sfxVolume']) for (const value of [-.1,1.1,null,'50',Infinity,NaN]) {
    assert.throws(() => createBackup(backend(), {settings:{[key]:value}}));
  }
});
