import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createProfileSession, CURRENT_PROFILE_PROTOCOL_VERSION as VERSION, PROFILE_MARKER_KEY as MARKER} from './fixtures/profile-session-v0320.js';
import {createStorage, createSaveSession, createHistorySession, createPreferenceSession, writeBattle} from '../dist/persistence.js';
import {createBackup, parseBackup, restoreBackup, BACKUP_STORAGE_KEYS as K} from '../dist/backup.js';
import {CAMPAIGN_PROGRESS_MISSIONS, createCampaignProgress, createCampaignMission, campaignScenarioForGame, writeCampaignProgress} from '../dist/campaign.js';
import {encodeBattle, identityOf} from '../dist/battle-codec.js';
import {verifyHistoricalRuntime, historicalRoot} from '../qa/hammer-prototype/historical-runtime.mjs';
import {protocolSeven} from './fixtures/profile-session-v0172-source.mjs';
import {protocolEight} from './fixtures/profile-session-v0181-source.mjs';
import {protocolNine} from './fixtures/profile-session-v019-source.mjs';
import {protocolTen} from './fixtures/profile-session-v020-source.mjs';

// Replay the immutable Hammer23 writer against the actual Salt22 closure.
// Live Watch25 behavior is covered separately in shared-watch-profile.test.mjs.
verifyHistoricalRuntime();
const actual22 = await import(new URL('dist/profile-session.js', historicalRoot));
const date = '2026-11-09T00:00:00.000Z', keys = Object.values(K);
const marker = (version, phase = 'ready', epoch = 'earned-profile') => JSON.stringify({format:'ironroot-profile', version, epoch, phase});
function backend(entries = []) {
  const data = new Map(entries), reads = [], writes = [];
  return {data, reads, writes,
    getItem(key) { reads.push(key); return data.get(key) ?? null; },
    setItem(key, value) { writes.push(['set', key, value]); data.set(key, value); },
    removeItem(key) { writes.push(['remove', key]); data.delete(key); },
  };
}
const current = (raw, epoch = 'hammer-import') => createProfileSession(() => raw, {requiredProtocolVersion:VERSION, newEpoch:() => epoch});
const prior = raw => actual22.createProfileSession(() => raw, {requiredProtocolVersion:22});
const domains = raw => [...raw.data].filter(([key]) => key !== MARKER);
const opaque = () => keys.map(key => [key, `  retained opaque ${key} bytes\n`]);
const row = game => ({won:true, draw:false, difficulty:game.difficulty, time:game.state.time, kills:0, built:0, date, identity:identityOf(game, campaignScenarioForGame(game, 'the-hammer-turns'))});
function earned() {
  const campaign = {...createCampaignProgress(), missions:Object.fromEntries(CAMPAIGN_PROGRESS_MISSIONS.filter(m => m.id !== 'three-minutes-more' && m.id !== 'leave-no-road-closed' && m.id !== 'the-empty-purse' && m.id !== 'wake-the-reserve' && m.id !== 'the-shared-watch' && (m.id !== 'the-long-screen')).map((m, i) => [m.id, {completed:true, stars:i % 3 + 1, bestTime:60 + i}]))};
  const game = createCampaignMission('the-hammer-turns');
  assert.ok(game.buyCitadelOption('arrows').ok);
  for (let i = 0; i < 40; i++) game.update(.05);
  return {campaign, trials:{shieldbreaker:{completed:true, bestTime:75}},
    settings:{sound:false, volume:.3, keyboard:{version:1, bindings:{build1:'KeyQ', volley:null}}, skirmishBridgeIncome:true},
    history:[row(game)], battle:encodeBattle(game, campaignScenarioForGame(game, 'the-hammer-turns'), {campaignProgress:campaign})};
}
const entries = data => Object.entries(K).filter(([domain]) => data[domain] !== null).map(([domain, key]) => [key, '  ' + JSON.stringify(data[domain]) + '\n']);
function assertBlocked(profile, raw) {
  const before = [...raw.data]; raw.reads.length = 0; raw.writes.length = 0;
  assert.equal(profile.status().canWrite, false);
  for (const key of keys) for (const storage of [profile.storage, profile.importStorage]) {
    assert.throws(() => storage.getItem(key));
    assert.throws(() => storage.setItem(key, 'forbidden'));
    assert.throws(() => storage.removeItem(key));
  }
  assert.equal(profile.beginImport().ok, false);
  assert.deepEqual([...raw.data], before); assert.deepEqual(raw.writes, []);
  assert.ok(raw.reads.every(key => key === MARKER), 'fence before accessing any earned domain');
}

test('immutable Hammer profile23 is exactly four marker-only substitutions from immutable actual Salt22', () => {
  assert.equal(VERSION, 23); assert.equal(actual22.CURRENT_PROFILE_PROTOCOL_VERSION, 22);
  const source = readFileSync(new URL('dist/profile-session.js', historicalRoot), 'utf8');
  assert.equal(createHash('sha256').update(source).digest('hex'), '2bfd3fe9525c0ffdf88ae651854e60ff689789a66db2b98750dbd7cbd561ef32');
  const expected = source.replace('CURRENT_PROFILE_PROTOCOL_VERSION = 22', 'CURRENT_PROFILE_PROTOCOL_VERSION = 23')
    .replace('coastal economy checkpoints and explicit result identities from older writers.', 'coastal economy checkpoints and explicit result identities from older writers; protocol 23 fences The Hammer Turns progress, paid siege commitments and explicit result identities from older writers.')
    .replace('20, 21, 22].includes', '20, 21, 22, 23].includes').replace('20, 21 or 22.', '20, 21, 22 or 23.');
  assert.equal(readFileSync(new URL('./fixtures/profile-session-v0320.js', import.meta.url), 'utf8'), expected);
  assert.throws(() => createProfileSession(() => backend(), {requiredProtocolVersion:24}), TypeError);
});

test('Hammer upgrades absent and every ready protocol1 through22 without reading or rewriting earned bytes', () => {
  for (const version of [null, ...Array.from({length:23}, (_, i) => i + 1)]) {
    const raw = backend([...(version === null ? [] : [[MARKER, marker(version)]]), ...opaque(), ['unrelated', 'untouched']]);
    const before = domains(raw), profile = current(raw);
    assert.ok(profile.status().canWrite);
    assert.deepEqual(JSON.parse(raw.data.get(MARKER)), {format:'ironroot-profile', version:23, epoch:version === null ? 'hammer-import' : 'earned-profile', phase:'ready'});
    assert.deepEqual(raw.writes.map(write => write[1]), version === 23 ? [] : [MARKER]);
    assert.deepEqual(domains(raw), before); assert.ok(raw.reads.every(key => key === MARKER));
    raw.writes.length = 0; assert.ok(current(raw).status().canWrite); assert.deepEqual(raw.writes, []);
    for (const [key, value] of before) assert.equal(profile.storage.getItem(key), value);
  }
});

test('actual open and reopened Salt22 writers cannot discard Hammer commitments or any of five earned domains', () => {
  const data = earned(), raw = backend([[MARKER, marker(22)], ...entries(data)]), old = prior(raw);
  const storage = createStorage(() => old.storage), slot = createSaveSession(storage, K.battle); assert.ok(slot.claim());
  const preferences = createPreferenceSession(storage, K.settings, {canWrite:() => old.status().canWrite}); preferences.stage({sound:true});
  const history = createHistorySession(storage, K.history, {canWrite:() => old.status().canWrite}); history.retain(row(createCampaignMission('the-hammer-turns')));
  const before = domains(raw), writer = current(raw); assert.ok(writer.status().canWrite); assert.deepEqual(domains(raw), before);
  for (const oldSession of [old, prior(raw)]) {
    assertBlocked(oldSession, raw); assert.equal(oldSession.beginImport({recover:true}).code, 'unsupported-protocol');
  }
  const protectedBytes = [...raw.data]; raw.writes.length = 0;
  assert.equal(writeCampaignProgress(storage, createCampaignProgress()), false);
  assert.equal(preferences.retry(), false); assert.equal(history.retry(), false);
  assert.equal(writeBattle(slot, K.battle, createCampaignMission('the-hammer-turns'), null, 'the-hammer-turns', {campaignProgress:data.campaign}), false);
  assert.deepEqual([...raw.data], protectedBytes); assert.deepEqual(raw.writes, []);
  assert.deepEqual(parseBackup(createBackup(writer.storage, {createdAt:date})).data, data);
});

test('actual supported earlier writer fixtures remain fenced before domain access', async () => {
  const modules = [
    [1, await import('./fixtures/profile-session-v0.9.js')],
    [2, await import('../qa/fixtures/production-v012/dist/profile-session.js')],
    [3, await import('./fixtures/profile-session-v014.js')], [4, await import('./fixtures/profile-session-v015.js')],
    [5, await import('./fixtures/profile-session-v016.js')], [6, await import('./fixtures/profile-session-v017.js')],
    [7, protocolSeven], [8, protocolEight], [9, protocolNine], [10, protocolTen],
  ];
  for (const [version, file] of [[11,'0202'],[12,'0210'],[13,'0220'],[14,'0230'],[15,'0241'],[16,'0250'],[17,'0261'],[18,'0270'],[19,'0280'],[20,'0290'],[21,'0300']])
    modules.push([version, await import(`./fixtures/profile-session-v${file}.js`)]);
  for (const [version, module] of modules) {
    const raw = backend([[MARKER, marker(version)], ...opaque()]);
    const open = module.createProfileSession(() => raw, {requiredProtocolVersion:version}); assert.ok(open.status().canWrite, `actual writer ${version}`);
    assert.ok(current(raw).status().canWrite);
    assertBlocked(open, raw); assertBlocked(module.createProfileSession(() => raw, {requiredProtocolVersion:version}), raw);
  }
});

test('future malformed restoring and failed Hammer markers never grant partial profile access', () => {
  for (const version of [1,22,23,24,99]) for (const phase of ['ready','restoring','failed']) {
    if (phase === 'ready' && version <= 23) continue;
    const raw = backend([[MARKER, marker(version, phase)], ...opaque()]), before = [...raw.data], profile = current(raw);
    assertBlocked(profile, raw); assert.deepEqual([...raw.data], before);
    if (version > 23) assert.equal(profile.beginImport({recover:true}).code, 'unsupported-protocol');
  }
  for (const malformed of ['{', '{}', '[]', marker(0), marker('23'), JSON.stringify({...JSON.parse(marker(23)), extra:true})]) {
    const raw = backend([[MARKER, malformed], ...opaque()]), before = [...raw.data]; assertBlocked(current(raw), raw); assert.deepEqual([...raw.data], before);
  }
});

for (const fault of ['drop','throw-before','throw-after','readback','competing']) test('Hammer marker verification fault '+fault+' retains opaque domains and never silently rebinds', () => {
  const raw = backend([[MARKER, marker(22)], ...opaque()]), before = domains(raw), get = raw.getItem, set = raw.setItem;
  let unreadable = false;
  raw.getItem = key => { if (key === MARKER && unreadable) throw Error('unreadable'); return get(key); };
  raw.setItem = (key, value) => {
    if (key !== MARKER) return set(key, value);
    if (fault === 'drop') return;
    if (fault === 'throw-before') throw Error('quota');
    set(key, fault === 'competing' ? marker(23, 'ready', 'other-tab') : value);
    if (fault === 'throw-after') throw Error('after-write');
    unreadable = fault === 'readback';
  };
  const profile = current(raw); assert.deepEqual(domains(raw), before);
  if (fault === 'throw-after') assert.ok(profile.status().canWrite);
  else {
    assertBlocked(profile, raw); raw.getItem = get; raw.setItem = set;
    assert.equal(profile.status().canWrite, false); assert.equal(profile.beginImport({recover:true}).ok, false);
    assert.ok(current(raw).status().canWrite);
  }
  assert.deepEqual(domains(raw), before);
});

test('Hammer backup replacement reload fence and stale-ready same-version reads retain existing behavior', () => {
  const data = earned(), text = createBackup(backend(entries(data)), {createdAt:date});
  const raw = backend([[MARKER, marker(22)], ...opaque()]), owner = current(raw), stale = current(raw, 'stale');
  assert.ok(owner.beginImport().ok); assert.ok(restoreBackup(owner.importStorage, text).ok); assert.ok(owner.finishImport({outcome:'restored'}).ok);
  const before = [...raw.data]; raw.writes.length = 0;
  for (const profile of [owner, stale]) {
    assert.equal(profile.status().canWrite, false); assert.equal(profile.status().reloadRequired, true);
    for (const key of keys) {
      assert.equal(profile.storage.getItem(key), raw.data.get(key), 'existing ready same-version read contract');
      assert.throws(() => profile.storage.setItem(key, 'stale')); assert.throws(() => profile.storage.removeItem(key));
    }
    assert.equal(profile.beginImport().ok, false);
  }
  assert.deepEqual([...raw.data], before); assert.deepEqual(raw.writes, []);
  assert.deepEqual(parseBackup(createBackup(current(raw).storage, {createdAt:date})).data, data); assertBlocked(prior(raw), raw);
});

test('Hammer replacement faults roll back all five domain bytes and retain profile23', () => {
  const text = createBackup(backend(entries(earned())), {createdAt:date});
  for (const failedKey of keys) for (const fault of ['throw-before','throw-after','drop']) {
    const raw = backend([[MARKER, marker(22)], ...opaque()]), before = domains(raw), profile = current(raw);
    assert.ok(profile.beginImport().ok); const set = raw.setItem; let pending = true;
    raw.setItem = (key, value) => {
      if (key === failedKey && pending) { pending = false; if (fault === 'drop') return; if (fault === 'throw-after') set(key, value); throw Error('quota'); }
      set(key, value);
    };
    const result = restoreBackup(profile.importStorage, text);
    assert.equal(result.ok, false); assert.equal(result.rollback.complete, true); assert.deepEqual(domains(raw), before);
    assert.ok(profile.finishImport({outcome:'rolled-back'}).ok); assert.ok(profile.status().canWrite);
    assert.equal(JSON.parse(raw.data.get(MARKER)).version, 23); assertBlocked(prior(raw), raw);
  }
});

test('Hammer finalization retry keeps its outcome and competing ownership forbids rollback', () => {
  const raw = backend([[MARKER, marker(22)], ...opaque()]), owner = current(raw); assert.ok(owner.beginImport().ok);
  const set = raw.setItem; raw.setItem = (key, value) => { if (key !== MARKER) set(key, value); };
  assert.equal(owner.finishImport({outcome:'restored'}).ok, false);
  assert.equal(owner.finishImport({outcome:'rolled-back'}).code, 'outcome-conflict'); assert.equal(owner.status().canWrite, false);
  raw.setItem = set; assert.ok(owner.finishImport({outcome:'restored'}).ok); assert.equal(owner.status().canWrite, false);
  const reloaded = current(raw, 'next-import'); assert.ok(reloaded.beginImport().ok);
  raw.data.set(MARKER, marker(23, 'restoring', 'competing-owner'));
  const before = [...raw.data]; assertBlocked(reloaded, raw); assert.equal(reloaded.finishImport({outcome:'rolled-back'}).ok, false); assert.deepEqual([...raw.data], before);
});
