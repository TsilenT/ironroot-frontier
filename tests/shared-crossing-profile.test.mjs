import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { Game, DEFAULT_SKIRMISH_RULESET_ID } from '../dist/engine.js';
import { SHARED_CROSSING_RULESET_ID } from '../dist/rulesets.js';
import { encodeBattle, decodeBattle, identityOf } from '../dist/battle-codec.js';
import { createBackup, parseBackup, restoreBackup, BACKUP_STORAGE_KEYS as K } from '../dist/backup.js';
import { createProfileSession, CURRENT_PROFILE_PROTOCOL_VERSION, PROFILE_MARKER_KEY as MARKER } from '../dist/profile-session.js';
import { createStorage, createSaveSession, createHistorySession, createPreferenceSession, writeBattle } from '../dist/persistence.js';
import { createCampaignProgress, CAMPAIGN_PROGRESS_MISSIONS, createProgressionCampaignMission, campaignScenarioForGame, normalizeCampaignProgress, recordCampaignResult, writeCampaignProgress } from '../dist/campaign.js';
import { CURRENT_CHALLENGES } from '../dist/challenges.js';
import * as protocolTwelve from './fixtures/profile-session-v0210.js';

const date = '2026-11-08T00:00:00.000Z';
const id = 'shared-crossing';
const keys = Object.values(K);
const marker = (version, phase = 'ready', epoch = 'retained-earned-profile') => JSON.stringify({ format: 'ironroot-profile', version, epoch, phase });
function backend(entries = []) {
  const data = new Map(entries), reads = [], writes = [];
  return {
    data, reads, writes,
    getItem(key) { reads.push(key); return data.get(key) ?? null; },
    setItem(key, value) { writes.push(['set', key, value]); data.set(key, value); },
    removeItem(key) { writes.push(['remove', key]); data.delete(key); },
  };
}
const current = (raw, epoch = 'shared-crossing-import') => createProfileSession(() => raw, { requiredProtocolVersion: CURRENT_PROFILE_PROTOCOL_VERSION, newEpoch: () => epoch });
const previous = raw => protocolTwelve.createProfileSession(() => raw, { requiredProtocolVersion: 12 });
const domainBytes = raw => [...raw.data].filter(([key]) => key !== MARKER);
const entries = data => Object.entries(K).filter(([domain]) => data[domain] !== null).map(([domain, key]) => [key, '  ' + JSON.stringify(data[domain]) + '\n']);
function progress() {
  return { ...createCampaignProgress(), missions: Object.fromEntries(CAMPAIGN_PROGRESS_MISSIONS.filter(m => m.id !== 'the-empty-purse' && m.id !== 'wake-the-reserve' && m.id !== 'the-shared-watch' && (m.id!=='the-long-screen'&&m.id!=='the-hammer-turns'&&m.id!=='salt-in-the-stores'&&m.id!=='the-archers-quay')).map((m, i) => [m.id, { completed: true, stars: i % 3 + 1, bestTime: 60 + i }])) };
}
const row = (game, scenario = undefined) => ({ won: true, draw: false, difficulty: game.difficulty, time: game.state.time, kills: game.state.stats.kills[0], built: game.state.stats.built[0], date, identity: identityOf(game, scenario) });
/** Synthetic persistence fixture, not evidence of a played or balanced match. */
function checkpoint(campaign = progress()) {
  const game = createProgressionCampaignMission(id, campaign);
  assert.ok(game.buyCitadelOption('arrows').ok);
  for (let i = 0; i < 100; i++) game.update(.05);
  game.state.campaignControl.bridges[0].owner = 0;
  game.state.campaignControl.bridges[1].owner = 0;
  game.state.campaignControl.heldSeconds = 1;
  return game;
}
function earned() {
  const campaign = progress(), game = checkpoint(campaign), scenario = campaignScenarioForGame(game, id);
  return {
    campaign,
    trials: Object.fromEntries(CURRENT_CHALLENGES.map((c, i) => [c.id, { completed: true, bestTime: 70 + i }])),
    settings: { sound: false, music: false, sfx: true, volume: .3, reducedMotion: true, quality: 'low', keyboard: { version: 1, bindings: { build1: 'KeyQ', volley: null } }, skirmishBridgeIncome: true },
    history: [{ won: true, draw: false, challengeId: 'shieldbreaker', campaignId: null, difficulty: 'normal', time: 75, kills: 12, built: 5, date }, row(game, scenario)],
    battle: encodeBattle(game, scenario, { campaignProgress: campaign }),
  };
}
function assertBlocked(profile, raw) {
  const before = [...raw.data]; raw.writes.length = 0; raw.reads.length = 0;
  assert.equal(profile.status().canWrite, false);
  for (const key of keys) for (const adapter of [profile.storage, profile.importStorage]) {
    assert.throws(() => adapter.getItem(key));
    assert.throws(() => adapter.setItem(key, '{}'));
    assert.throws(() => adapter.removeItem(key));
  }
  assert.equal(profile.beginImport().ok, false);
  assert.deepEqual(raw.writes, []); assert.deepEqual([...raw.data], before);
  assert.ok(raw.reads.every(key => key === MARKER), 'barrier must reject before touching a save domain');
}

// Current expectations intentionally advance to 20. Historical clients are exact
// source fixtures; the future-marker regression moves to 21, never into support.
test('protocol20 pins the exact prior protocol12 module and retains all storage and format identities', () => {
  assert.equal(createHash('sha256').update(readFileSync(new URL('./fixtures/profile-session-v0210.js', import.meta.url))).digest('hex'), '724cefd400aa4b90d4ba131147730b9441fb8c6d96a494c253ef659eb97d9508');
  assert.equal(protocolTwelve.CURRENT_PROFILE_PROTOCOL_VERSION, 12);
  assert.equal(CURRENT_PROFILE_PROTOCOL_VERSION, 27);
  assert.equal(MARKER, 'ironroot.profile.v1');
  assert.deepEqual(K, { campaign: 'ironroot.campaign.v1', trials: 'ironroot.trials.v1', settings: 'ironroot.settings.v1', history: 'ironroot.history.v1', battle: 'ironroot.battle.v1' });
  for (let requiredProtocolVersion = 1; requiredProtocolVersion <= CURRENT_PROFILE_PROTOCOL_VERSION; requiredProtocolVersion++) {
    const raw = backend();
    const profile = createProfileSession(() => raw, { requiredProtocolVersion, newEpoch: () => 'supported' });
    assert.ok(profile.status().canWrite);
  }
  assert.throws(() => createProfileSession(() => backend(), { requiredProtocolVersion: CURRENT_PROFILE_PROTOCOL_VERSION + 1 }), TypeError);
  const raw = backend(), legacy = createProfileSession(() => raw, { newEpoch: () => 'legacy-default' });
  assert.deepEqual(raw.writes, []); assert.ok(legacy.beginImport().ok);
  assert.equal(JSON.parse(raw.data.get(MARKER)).version, 1);
});

test('construction upgrades only a ready marker and repeated construction never reads or rewrites earned domains', () => {
  for (const prior of [null, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]) {
    // Deliberately opaque bytes prove the marker barrier does not normalize saves.
    const domains = keys.map(key => [key, `  opaque retained ${key} bytes\n`]);
    const raw = backend([...(prior === null ? [] : [[MARKER, marker(prior)]]), ...domains, ['unrelated', 'untouched']]);
    const before = domainBytes(raw), profile = current(raw);
    assert.ok(profile.status().canWrite);
    assert.deepEqual(JSON.parse(raw.data.get(MARKER)), { format: 'ironroot-profile', version: CURRENT_PROFILE_PROTOCOL_VERSION, epoch: prior === null ? 'shared-crossing-import' : 'retained-earned-profile', phase: 'ready' });
    assert.deepEqual(raw.writes.map(write => write[1]), prior === CURRENT_PROFILE_PROTOCOL_VERSION ? [] : [MARKER]);
    assert.deepEqual(domainBytes(raw), before); assert.ok(raw.reads.every(key => key === MARKER));
    raw.reads.length = 0; raw.writes.length = 0;
    for (let i = 0; i < 3; i++) assert.ok(current(raw).status().canWrite);
    assert.deepEqual(raw.writes, []); assert.deepEqual(domainBytes(raw), before);
    assert.ok(raw.reads.every(key => key === MARKER));
  }
});

test('exact protocol12 open and reopened clients cannot erase new campaign stars, options, history or checkpoints', () => {
  const data = earned(), raw = backend([[MARKER, marker(12)], ...entries(data), ['unrelated', 'untouched']]);
  const stale = previous(raw), oldStorage = createStorage(() => stale.storage), oldSlot = createSaveSession(oldStorage, K.battle);
  assert.ok(stale.status().canWrite); assert.ok(oldSlot.claim());
  const oldPreferences = createPreferenceSession(oldStorage, K.settings, { canWrite: () => stale.status().canWrite }); oldPreferences.stage({ sound: true });
  const oldHistory = createHistorySession(oldStorage, K.history, { canWrite: () => stale.status().canWrite }); oldHistory.retain(row(new Game({ ai: false })));
  const beforeUpgrade = domainBytes(raw), writer = current(raw);
  assert.ok(writer.status().canWrite); assert.deepEqual(raw.writes, [['set', MARKER, marker(CURRENT_PROFILE_PROTOCOL_VERSION)]]); assert.deepEqual(domainBytes(raw), beforeUpgrade);
  const before = [...raw.data]; raw.writes.length = 0;
  for (const old of [stale, previous(raw)]) {
    assertBlocked(old, raw);
    assert.equal(old.beginImport({ recover: true }).code, 'unsupported-protocol');
    assert.equal(restoreBackup(old.importStorage, createBackup(backend(), { createdAt: date })).ok, false);
  }
  assert.equal(writeCampaignProgress(oldStorage, createCampaignProgress()), false);
  assert.equal(oldPreferences.retry(), false); assert.equal(oldHistory.retry(), false);
  assert.equal(writeBattle(oldSlot, K.battle, new Game({ ai: false })), false);
  assert.deepEqual(raw.writes, []); assert.deepEqual([...raw.data], before);
  assert.deepEqual(parseBackup(createBackup(writer.storage, { createdAt: date })).data, data);
});

test('unfinished and future21 markers are never automatically upgraded or downgraded', () => {
  for (const version of [12, CURRENT_PROFILE_PROTOCOL_VERSION, CURRENT_PROFILE_PROTOCOL_VERSION + 1]) for (const phase of ['ready', 'restoring', 'failed']) {
    if (phase === 'ready' && version <= CURRENT_PROFILE_PROTOCOL_VERSION) continue;
    const raw = backend([[MARKER, marker(version, phase)], ...entries(earned())]), before = [...raw.data], profile = current(raw);
    assert.equal(profile.status().canWrite, false); assert.deepEqual(raw.writes, []); assert.deepEqual([...raw.data], before);
    assertBlocked(profile, raw);
    if (version === CURRENT_PROFILE_PROTOCOL_VERSION + 1) {
      assert.equal(profile.beginImport({ recover: true }).code, 'unsupported-protocol');
      assert.deepEqual([...raw.data], before); assert.deepEqual(raw.writes, []);
    }
  }
});

test('failed, uncertain and competing upgrades keep all five domains closed until a fresh verified construction', () => {
  for (const fault of ['drop', 'throw', 'readback', 'competing']) {
    const raw = backend([[MARKER, marker(12)], ...entries(earned())]), before = domainBytes(raw);
    const get = raw.getItem, set = raw.setItem; let unreadable = false;
    raw.getItem = key => { if (key === MARKER && unreadable) throw Error('readback unavailable'); return get(key); };
    raw.setItem = (key, value) => {
      if (key !== MARKER) return set(key, value);
      if (fault === 'drop') return;
      if (fault === 'throw') throw Error('quota');
      set(key, fault === 'competing' ? marker(CURRENT_PROFILE_PROTOCOL_VERSION, 'ready', 'another-tab') : value);
      unreadable = fault === 'readback';
    };
    const profile = current(raw); assertBlocked(profile, raw);
    assert.deepEqual(domainBytes(raw), before);
    raw.getItem = get; raw.setItem = set;
    assertBlocked(profile, raw); assert.equal(profile.beginImport({ recover: true }).ok, false);
    assert.ok(current(raw).status().canWrite); assert.deepEqual(domainBytes(raw), before);
  }
});

test('initial unavailable storage and marker reads cannot become silently writable after access returns', () => {
  for (const fault of ['backend', 'marker-read']) for (const prior of [12, CURRENT_PROFILE_PROTOCOL_VERSION]) {
    const raw = backend([[MARKER, marker(prior)], ...entries(earned())]), before = [...raw.data], get = raw.getItem;
    let unavailable = true;
    raw.getItem = key => { if (unavailable && fault === 'marker-read' && key === MARKER) throw Error('denied'); return get(key); };
    const profile = createProfileSession(() => { if (unavailable && fault === 'backend') throw Error('denied'); return raw; }, { requiredProtocolVersion: CURRENT_PROFILE_PROTOCOL_VERSION });
    assert.equal(profile.status().initiallyUnavailable, true); assertBlocked(profile, raw);
    unavailable = false; assertBlocked(profile, raw);
    assert.equal(profile.beginImport({ recover: true }).ok, false); assert.deepEqual([...raw.data], before);
    assert.ok(current(raw).status().canWrite); assert.deepEqual(domainBytes(raw), before.filter(([key]) => key !== MARKER));
  }
});

test('a marker upgrade that throws after writing is accepted only after exact readback', () => {
  const raw = backend([[MARKER, marker(12)], ...entries(earned())]), before = domainBytes(raw), set = raw.setItem;
  raw.setItem = (key, value) => { set(key, value); if (key === MARKER) throw Error('after write'); };
  assert.ok(current(raw).status().canWrite); assert.deepEqual(raw.writes, [['set', MARKER, marker(CURRENT_PROFILE_PROTOCOL_VERSION)]]);
  assert.deepEqual(domainBytes(raw), before); assertBlocked(previous(raw), raw);
});

test('new campaign records and exact scenario identity round-trip without changing campaign, save or backup schemas', () => {
  const data = earned(), game = checkpoint(data.campaign), scenario = campaignScenarioForGame(game, id);
  assert.deepEqual(scenario, { kind: 'campaign', id, revision: 1 });
  assert.equal(game.ruleset.id, SHARED_CROSSING_RULESET_ID);
  assert.deepEqual(normalizeCampaignProgress(data.campaign), data.campaign); assert.equal(data.campaign.version, 1);
  assert.equal(data.battle.version, 3); assert.equal(data.battle.game.version, 3);
  assert.deepEqual(decodeBattle(data.battle, { campaignProgress: data.campaign }).game.serialize(), game.serialize());
  assert.equal(data.battle.game.state.campaignControl.heldSeconds, 1);
  assert.equal(data.battle.game.state.citadelOptions.sides[0].choice, 'arrows');
  const raw = backend([[MARKER, marker(12)], ...entries(data), ['unrelated', 'untouched']]), profile = current(raw), before = [...raw.data]; raw.writes.length = 0;
  const exported = parseBackup(createBackup(profile.storage, { createdAt: date }));
  assert.equal(exported.version, 2); assert.deepEqual(exported.data, data);
  assert.deepEqual([...raw.data], before); assert.deepEqual(raw.writes, []);
  // Synthetic completed result verifies the actual record writer, not a fabricated schema.
  const unlocked = progress(); delete unlocked.missions[id];
  const won = createProgressionCampaignMission(id, unlocked); won.state.bases[1].hp = 0;
  const completed = recordCampaignResult(unlocked, id, won);
  assert.deepEqual(completed.missions[id], { completed: true, stars: 3, bestTime: 0 });
  const storage = createStorage(() => profile.storage);
  assert.ok(writeCampaignProgress(storage, completed));
  assert.deepEqual(JSON.parse(raw.data.get(K.campaign)).missions[id], { completed: true, stars: 3, bestTime: 0 });
  for (const key of [K.trials, K.settings, K.history, K.battle, 'unrelated']) assert.equal(raw.data.get(key), new Map(before).get(key));
});

test('valid campaign backup replacement retains five domains and fences stale current pending saves', () => {
  const data = earned(), text = createBackup(backend(entries(data)), { createdAt: date });
  const raw = backend([[MARKER, marker(12)], ['unrelated', 'untouched']]), importer = current(raw), stale = current(raw, 'stale-current'), storage = createStorage(() => stale.storage);
  const slot = createSaveSession(storage, K.battle); assert.ok(slot.claim());
  const preferences = createPreferenceSession(storage, K.settings, { canWrite: () => stale.status().canWrite }); preferences.stage({ sound: true });
  const history = createHistorySession(storage, K.history, { canWrite: () => stale.status().canWrite }); history.retain(row(new Game({ rulesetId: DEFAULT_SKIRMISH_RULESET_ID })));
  assert.ok(importer.beginImport().ok); assert.ok(restoreBackup(importer.importStorage, text).ok); assert.ok(importer.finishImport({ outcome: 'restored' }).ok);
  const before = [...raw.data]; raw.writes.length = 0;
  assert.equal(stale.status().canWrite, false); assert.equal(importer.status().canWrite, false);
  assert.equal(writeCampaignProgress(storage, createCampaignProgress()), false); assert.equal(preferences.retry(), false); assert.equal(history.retry(), false);
  assert.equal(writeBattle(slot, K.battle, new Game({ ai: false })), false); assert.equal(stale.beginImport().ok, false);
  assert.deepEqual([...raw.data], before); assert.deepEqual(raw.writes, []);
  const loaded = current(raw); assert.ok(loaded.status().canWrite);
  assert.deepEqual(parseBackup(createBackup(loaded.storage, { createdAt: date })).data, data);
  assert.equal(JSON.parse(raw.data.get(MARKER)).version, CURRENT_PROFILE_PROTOCOL_VERSION); assert.equal(raw.data.get('unrelated'), 'untouched');
  assertBlocked(previous(raw), raw);
});

test('failed replacement rolls back exact bytes across all five domains while keeping protocol20 fencing', () => {
  const replacement = earned(); replacement.settings.volume = .7; replacement.history = [];
  const text = createBackup(backend(entries(replacement)), { createdAt: date });
  for (const failedKey of keys) for (const fault of ['throw-before', 'throw-after', 'drop']) {
    const raw = backend([[MARKER, marker(12)], ...entries(earned()), ['unrelated', 'untouched']]);
    const before = domainBytes(raw), importer = current(raw), stale = current(raw, 'stale-import');
    assert.ok(importer.beginImport().ok); const set = raw.setItem; let pending = true;
    raw.setItem = (key, value) => {
      if (key === failedKey && pending) {
        pending = false;
        if (fault === 'drop') return;
        if (fault === 'throw-after') set(key, value);
        throw Error('quota');
      }
      set(key, value);
    };
    const restored = restoreBackup(importer.importStorage, text);
    assert.equal(restored.ok, false, `${failedKey}/${fault}`); assert.equal(restored.rollback.complete, true, `${failedKey}/${fault}`);
    assert.deepEqual(domainBytes(raw), before); assert.ok(importer.finishImport({ outcome: 'rolled-back' }).ok);
    assert.ok(importer.status().canWrite); assert.equal(stale.status().canWrite, false);
    assert.equal(JSON.parse(raw.data.get(MARKER)).version, CURRENT_PROFILE_PROTOCOL_VERSION); assertBlocked(previous(raw), raw);
  }
});

test('historical v0.7 and v0.9 backups still import under protocol20 without new progress or checkpoint synthesis', () => {
  for (const fixture of ['backup-v0.7-format.json', 'backup-v0.9-format.json']) {
    const text = readFileSync(new URL(`./fixtures/${fixture}`, import.meta.url), 'utf8'), expected = parseBackup(text);
    const raw = backend([[MARKER, marker(12)], ...entries(earned()), ['unrelated', 'untouched']]), importer = current(raw);
    assert.ok(importer.beginImport().ok); assert.ok(restoreBackup(importer.importStorage, text).ok); assert.ok(importer.finishImport({ outcome: 'restored' }).ok);
    const loaded = current(raw), exported = parseBackup(createBackup(loaded.storage, { createdAt: expected.createdAt }));
    assert.deepEqual(exported, expected);
    assert.equal(exported.data.campaign.missions[id], undefined);
    assert.equal(exported.data.battle?.game.state.campaignControl, undefined);
    assert.equal(JSON.parse(raw.data.get(MARKER)).version, CURRENT_PROFILE_PROTOCOL_VERSION); assert.equal(raw.data.get('unrelated'), 'untouched');
    assertBlocked(previous(raw), raw);
  }
});
