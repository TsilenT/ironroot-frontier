import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createProfileSession, PROFILE_MARKER_KEY as KEY, ProfileSessionError } from '../dist/profile-session.js';
import { createProfileSession as frozenV09Session } from './fixtures/profile-session-v0.9.js';
import { BACKUP_STORAGE_KEYS as K, createBackup, restoreBackup } from '../dist/backup.js';
import { createStorage } from '../dist/persistence.js';

const keys = Object.values(K);
const encoded = (version = 1, epoch = 'existing', phase = 'ready') => JSON.stringify({ format: 'ironroot-profile', version, epoch, phase });
const date = '2026-11-06T00:00:00.000Z';
let serial = 0;
function raw(entries = []) {
  const data = new Map(entries), calls = [];
  return { data, calls,
    getItem(k) { calls.push(['get', k]); return data.has(k) ? data.get(k) : null; },
    setItem(k, v) { calls.push(['set', k, v]); data.set(k, v); },
    removeItem(k) { calls.push(['remove', k]); data.delete(k); },
  };
}
const expanded = (r, options = {}) => createProfileSession(() => r, { requiredProtocolVersion: 2, newEpoch: () => `expanded-${++serial}`, ...options });
const legacy = r => frozenV09Session(() => r, { newEpoch: () => `legacy-${++serial}` });
const writes = r => r.calls.filter(([op]) => op !== 'get');
const snapshot = r => [...r.data].filter(([key]) => key !== KEY);
const block = operation => assert.throws(operation, ProfileSessionError);
const empty = () => createBackup(raw(), { createdAt: date });

// The fixture is a verbatim copy from the frozen /workspace/scratch/d86b57250ea4/ironroot
// source, not a rewritten approximation of the old protocol. Pin it for portable tests.
test('the v0.9 protocol fixture matches the frozen original source digest', () => {
  const source = readFileSync(new URL('./fixtures/profile-session-v0.9.js', import.meta.url));
  assert.equal(createHash('sha256').update(source).digest('hex'), '1696d6e852cc7793fc6cf210a35a8385d10f4e9fef520fb8b97192b2279981a9');
});

test('default protocol retains absent-marker behavior and cannot bind or downgrade version 2', () => {
  const r = raw(), p = createProfileSession(() => r);
  assert.equal(p.status().canWrite, true); assert.deepEqual(writes(r), []);
  r.data.set(KEY, encoded(2));
  for (const client of [p, createProfileSession(() => r), legacy(r)]) {
    assert.equal(client.status().phase, 'invalid'); assert.equal(client.status().canWrite, false);
    assert.throws(() => client.storage.setItem(K.campaign, '{}'));
    assert.throws(() => client.storage.getItem(K.campaign));
    assert.equal(client.beginImport().ok, false);
  }
  assert.deepEqual(writes(r), []); assert.equal(r.data.get(KEY), encoded(2));
});

test('expanded initialization upgrades only the marker and preserves ready v1 epochs and raw domain bytes', () => {
  for (const prior of [null, encoded(1)]) {
    const r = raw(keys.map((key, i) => [key, `\n existing possibly corrupt bytes ${i} `]));
    if (prior !== null) r.data.set(KEY, prior);
    r.data.set('other-app', 'private'); const before = snapshot(r);
    const p = expanded(r, { newEpoch: () => 'first-expanded' });
    const value = JSON.parse(r.data.get(KEY));
    assert.deepEqual(value, { format: 'ironroot-profile', version: 2, epoch: prior ? 'existing' : 'first-expanded', phase: 'ready' });
    assert.equal(p.status().canWrite, true); assert.deepEqual(snapshot(r), before);
    assert.deepEqual(writes(r), [['set', KEY, r.data.get(KEY)]]);
    for (const key of keys) assert.equal(p.storage.getItem(key), r.data.get(key));
  }
});

test('already-ready v2 is bound without rewriting a marker or invoking the epoch factory', () => {
  const r = raw([[KEY, encoded(2)]]), p = expanded(r, { newEpoch: () => { throw Error('must not run'); } });
  assert.equal(p.status().canWrite, true); assert.deepEqual(writes(r), []);
});

test('frozen v0.9 stale tabs and freshly opened old tabs cannot erase expanded data in any domain', () => {
  for (const prior of [null, encoded(1)]) {
    const r = raw(prior ? [[KEY, prior]] : []), old = legacy(r), current = expanded(r);
    for (const key of keys) current.storage.setItem(key, `expanded progress ${key}`);
    const before = [...r.data];
    for (const p of [old, legacy(r), createProfileSession(() => r)]) {
      const storage = createStorage(() => p.storage);
      for (const key of keys) {
        assert.equal(storage.set(key, 'stale normalized state'), false);
        assert.equal(storage.remove(key), false);
      }
      assert.equal(p.beginImport().ok, false);
    }
    assert.deepEqual([...r.data], before); assert.equal(current.status().canWrite, true);
  }
});

test('failed or dropped upgrade writes leave every profile byte intact and require reload, not recovery bypass', () => {
  for (const prior of [null, encoded(1)]) for (const throws of [true, false]) {
    const r = raw([[K.campaign, 'original'], ...(prior ? [[KEY, prior]] : [])]), before = [...r.data];
    r.setItem = () => { if (throws) throw Error('QuotaExceededError'); };
    const p = expanded(r), state = p.status();
    assert.equal(state.canWrite, false); assert.equal(state.reloadRequired, true); assert.equal(state.canReload, true);
    assert.equal(state.initiallyUnavailable, false); assert.equal(state.code, 'profile-upgrade-required');
    for (const key of keys) { block(() => p.storage.getItem(key)); block(() => p.storage.setItem(key, 'new')); block(() => p.storage.removeItem(key)); }
    assert.equal(p.beginImport().code, 'reload-required'); assert.equal(p.beginImport({ recover: true }).code, 'reload-required');
    assert.deepEqual([...r.data], before);
  }
});

test('throw-after-write upgrades bind only after exact successful marker readback', () => {
  const r = raw([[KEY, encoded(1)], [K.battle, 'original']]);
  r.setItem = (k, v) => { r.data.set(k, v); throw Error('after-write'); };
  const p = expanded(r); assert.equal(p.status().canWrite, true);
  assert.equal(r.data.get(KEY), encoded(2)); assert.equal(r.data.get(K.battle), 'original');
});

test('unreadable migration readback remains gated and cannot silently bind after storage returns', () => {
  for (const apply of [false, true]) {
    const r = raw([[KEY, encoded(1)], [K.campaign, 'original']]); let denied = false;
    r.getItem = k => { if (denied) throw Error('read denied'); return r.data.get(k) ?? null; };
    r.setItem = (k, v) => { if (apply) r.data.set(k, v); denied = true; throw Error('uncertain outcome'); };
    const p = expanded(r), state = p.status();
    assert.equal(state.phase, 'unavailable'); assert.equal(state.recoveryRequired, true);
    assert.equal(state.canReload, false); assert.equal(state.initiallyUnavailable, false);
    denied = false;
    assert.equal(p.status().reloadRequired, true); assert.equal(p.status().canWrite, false);
    block(() => p.storage.getItem(K.campaign)); block(() => p.storage.setItem(K.campaign, 'new'));
    assert.equal(p.beginImport({ recover: true }).ok, false); assert.equal(r.data.get(K.campaign), 'original');
    r.setItem = (k, v) => r.data.set(k, v);
    assert.equal(expanded(r).status().canWrite, true);
  }
});

test('initial denied reads never mean an empty profile and returning access requires a fresh page', () => {
  const r = raw([[KEY, encoded(1)], [K.campaign, 'original']]); let denied = true;
  r.getItem = k => { if (denied) throw Error('denied'); return r.data.get(k) ?? null; };
  const p = expanded(r); assert.equal(p.status().initiallyUnavailable, true); assert.deepEqual(writes(r), []);
  denied = false; assert.equal(p.status().reloadRequired, true);
  block(() => p.storage.getItem(K.campaign)); block(() => p.storage.setItem(K.campaign, 'new'));
  assert.equal(p.beginImport().ok, false); assert.deepEqual(writes(r), []);
  assert.equal(r.data.get(K.campaign), 'original'); assert.equal(expanded(r).status().canWrite, true);
});

test('stale pre-migration checks never overwrite a newer ready, restoring, failed or corrupt marker', () => {
  for (const replacement of [encoded(1, 'another'), encoded(2, 'another'), encoded(1, 'importer', 'restoring'), encoded(2, 'failed', 'failed'), '{corrupt']) {
    const r = raw([[KEY, encoded(1)], [K.history, 'original']]); let reads = 0;
    r.getItem = k => { if (k === KEY && ++reads === 2) r.data.set(KEY, replacement); return r.data.get(k) ?? null; };
    const p = expanded(r);
    assert.equal(r.data.get(KEY), replacement); assert.deepEqual(writes(r), []);
    assert.equal(p.status().canWrite, false); block(() => p.storage.setItem(K.history, 'stale'));
    assert.equal(r.data.get(K.history), 'original');
  }
});

test('a competing marker after the upgrade write never grants ownership or gets overwritten on a status retry', () => {
  for (const phase of ['ready', 'restoring', 'failed']) {
    const r = raw([[KEY, encoded(1)], [K.history, 'original']]), replacement = encoded(2, 'winner', phase);
    r.setItem = (k, v) => r.data.set(k, k === KEY ? replacement : v);
    const p = expanded(r);
    for (let i = 0; i < 3; i++) assert.equal(p.status().canWrite, false);
    block(() => p.storage.setItem(K.history, 'old')); assert.equal(p.beginImport().ok, false);
    assert.equal(r.data.get(KEY), replacement); assert.equal(r.data.get(K.history), 'original');
  }
});

test('restoring and failed v1/v2 markers never auto-upgrade or permit reading partial data', () => {
  for (const version of [1, 2]) for (const phase of ['restoring', 'failed']) {
    const prior = encoded(version, 'owner', phase), r = raw([[KEY, prior], [K.history, 'partial']]);
    const p = expanded(r, { newEpoch: () => { throw Error('must not run'); } });
    assert.deepEqual(writes(r), []); assert.equal(r.data.get(KEY), prior);
    assert.equal(p.status().phase, phase); assert.equal(p.status().canReload, false);
    block(() => p.storage.getItem(K.history)); block(() => p.storage.setItem(K.history, 'old'));
    assert.equal(p.beginImport().code, 'recovery-confirmation-required');
  }
});

test('opening the expansion during a legacy import does not take over or silently bind its later ready state', () => {
  const r = raw(), old = legacy(r); assert.equal(old.beginImport().ok, true);
  const restoring = r.data.get(KEY), p = expanded(r);
  assert.equal(r.data.get(KEY), restoring); assert.equal(p.beginImport().ok, false);
  assert.equal(restoreBackup(old.importStorage, empty()).ok, true);
  assert.equal(old.finishImport({ outcome: 'restored' }).ok, true);
  assert.equal(p.status().reloadRequired, true); block(() => p.storage.getItem(K.campaign));
  assert.equal(expanded(r).status().canWrite, true); assert.equal(old.status().canWrite, false);
});

test('explicit recovery from a legacy partial profile stays on v2 and rollback cannot declare it safe', () => {
  for (const phase of ['restoring', 'failed']) for (const outcome of ['restored', 'rolled-back', 'failed']) {
    const r = raw([[KEY, encoded(1, 'partial', phase)], [K.history, 'original']]), p = expanded(r);
    assert.equal(p.beginImport({ recover: true }).ok, true); assert.equal(JSON.parse(r.data.get(KEY)).version, 2);
    const result = p.finishImport({ outcome });
    assert.equal(result.ok, true); assert.equal(result.phase, outcome === 'restored' ? 'ready' : 'failed');
    assert.equal(JSON.parse(r.data.get(KEY)).version, 2); assert.equal(result.status.canWrite, false);
    assert.equal(r.data.get(K.history), 'original');
  }
});

test('v2 import rollback rebinds only its owner; replacement success requires reload and fences all stale tabs', () => {
  for (const outcome of ['restored', 'rolled-back', 'failed']) {
    const r = raw(), old = legacy(r), a = expanded(r), b = expanded(r);
    assert.equal(a.beginImport().ok, true);
    for (const p of [a, b, old]) assert.equal(p.status().canWrite, false);
    assert.equal(restoreBackup(a.importStorage, empty()).ok, true);
    const result = a.finishImport({ outcome }); assert.equal(result.ok, true);
    assert.equal(JSON.parse(r.data.get(KEY)).version, 2);
    assert.equal(a.status().canWrite, outcome === 'rolled-back'); assert.equal(b.status().canWrite, false);
    assert.equal(old.status().canWrite, false);
    assert.equal(expanded(r).status().canWrite, outcome !== 'failed');
  }
});

test('v2 failed finalization and throw-after-write retain the same-outcome retry rules', () => {
  for (const failure of ['before', 'after-read-denied']) {
    const r = raw(), p = expanded(r); assert.equal(p.beginImport().ok, true);
    let denied = false;
    r.getItem = k => { if (denied) throw Error('read denied'); return r.data.get(k) ?? null; };
    r.setItem = (k, v) => { if (failure === 'after-read-denied') { r.data.set(k, v); denied = true; } throw Error('quota'); };
    assert.equal(p.finishImport({ outcome: 'restored' }).ok, false);
    block(() => p.importStorage.setItem(K.history, 'new'));
    assert.equal(p.finishImport({ outcome: 'failed' }).code, 'outcome-conflict');
    denied = false; r.setItem = (k, v) => { r.data.set(k, v); throw Error('after-write'); };
    assert.equal(p.finishImport({ outcome: 'restored' }).ok, true);
    assert.equal(p.status().reloadRequired, true); assert.equal(JSON.parse(r.data.get(KEY)).version, 2);
  }
});

test('v2 ownership loss during restore also prevents rollback from erasing a newer profile', () => {
  const r = raw(), a = expanded(r), b = expanded(r), set = r.setItem.bind(r); let takeover = false;
  assert.equal(a.beginImport().ok, true);
  r.setItem = (k, v) => {
    set(k, v);
    if (k === K.campaign && !takeover) {
      takeover = true; assert.equal(b.beginImport({ recover: true }).ok, true);
      const newest = JSON.parse(empty()); newest.data.settings = { volume: .123 };
      assert.equal(restoreBackup(b.importStorage, JSON.stringify(newest)).ok, true);
      assert.equal(b.finishImport({ outcome: 'restored' }).ok, true);
    }
  };
  const result = restoreBackup(a.importStorage, empty());
  assert.equal(result.ok, false); assert.equal(result.rollback.complete, false);
  assert.equal(result.rollback.unverifiedKeys.length, 5);
  assert.deepEqual(JSON.parse(r.data.get(K.settings)), { volume: .123 });
  const before = [...r.data]; assert.equal(a.finishImport({ outcome: 'failed' }).ok, false);
  assert.deepEqual([...r.data], before);
});

test('explicit old-app recovery is a deliberate replacement, not an absolute cross-version lock', () => {
  const r = raw(), p = expanded(r), old = legacy(r);
  p.storage.setItem(K.campaign, 'expanded progress');
  assert.equal(old.beginImport().ok, false);
  assert.equal(old.beginImport({ recover: true }).ok, true);
  assert.equal(restoreBackup(old.importStorage, empty()).ok, true);
  assert.equal(old.finishImport({ outcome: 'restored' }).ok, true);
  assert.equal(JSON.parse(r.data.get(KEY)).version, 1);
  assert.equal(p.status().canWrite, false); block(() => p.storage.setItem(K.campaign, 'stale'));
  assert.equal(p.beginImport({ recover: true }).code, 'reload-required');
});

test('invalid marker versions, fields and migration options remain fail-closed', () => {
  for (const value of [null, false, '2', 0, 3, 999, {}, []]) {
    const r = raw(); assert.throws(() => expanded(r, { requiredProtocolVersion: value }), TypeError); assert.deepEqual(writes(r), []);
  }
  for (const prior of ['{broken', '{}', 'null', '[]', 'x'.repeat(513), encoded(3), encoded('2'), encoded(2, 'bad epoch'), encoded(2, 'epoch', 'unknown'),
    JSON.stringify({ format: 'ironroot-profile', version: 2, epoch: 'extra', phase: 'ready', extra: true })]) {
    const r = raw([[KEY, prior]]), p = expanded(r);
    assert.equal(p.status().phase, 'invalid'); assert.deepEqual(writes(r), []);
    assert.equal(p.beginImport().ok, false); block(() => p.storage.setItem(K.campaign, '{}'));
  }
  for (const newEpoch of [() => '', () => 'bad epoch', () => 2, () => { throw Error('no source'); }]) {
    const r = raw(), p = expanded(r, { newEpoch });
    assert.equal(p.status().canWrite, false); assert.equal(p.status().reloadRequired, true); assert.deepEqual(writes(r), []);
  }
});
