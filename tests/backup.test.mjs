import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  BACKUP_FORMAT, BACKUP_VERSION, MAX_BACKUP_BYTES, BACKUP_STORAGE_KEYS,
  BackupError, createBackup, parseBackup, restoreBackup,
} from '../dist/backup.js';
import { Game, LANES } from '../dist/engine.js';
import { CAMPAIGN_MISSIONS, createCampaignMission, createCampaignProgress } from '../dist/campaign.js';
import { CHALLENGES, createChallenge } from '../dist/challenges.js';

const K = BACKUP_STORAGE_KEYS, keys = Object.values(K), date = '2026-11-06T00:00:00.000Z';
const clone = x => JSON.parse(JSON.stringify(x));
function storage(entries = []) {
  const data = new Map(entries), operations = [];
  return { data, operations,
    getItem(key) { operations.push(['get', key]); return data.has(key) ? data.get(key) : null; },
    setItem(key, value) { operations.push(['set', key, value]); data.set(key, value); },
    removeItem(key) { operations.push(['remove', key]); data.delete(key); },
  };
}
function progressThrough(id = 'ironroot') {
  const progress = createCampaignProgress();
  for (const mission of CAMPAIGN_MISSIONS) {
    progress.missions[mission.id] = { completed: true, stars: 2, bestTime: 60 };
    if (mission.id === id) break;
  }
  return progress;
}
function envelope(game = new Game(), challengeId = null, campaignId = null) {
  return { format: 'ironroot-save', version: 2, challengeId, campaignId, game: game.serialize() };
}
function fixture() {
  return { format: BACKUP_FORMAT, version: BACKUP_VERSION, createdAt: date, data: {
    campaign: progressThrough(),
    trials: Object.fromEntries(CHALLENGES.map(c => [c.id, { completed: true, bestTime: 75 }])),
    settings: { sound: true, music: false, sfx: true, volume: .7, reducedMotion: false, quality: 'high' },
    history: [{ won: true, draw: false, challengeId: null, campaignId: 'emberwatch', difficulty: 'easy', time: 90, kills: 10, built: 7, date }],
    battle: envelope(),
  } };
}
function empty() { return JSON.parse(createBackup(storage(), { createdAt: date })); }
function writes(s) { return s.operations.filter(([op]) => op !== 'get'); }
function invalid(value, pattern) {
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  assert.throws(() => parseBackup(text), pattern || BackupError);
  const s = storage(keys.map((k, i) => [k, `invalid original ${i}`]));
  const before = [...s.data];
  const result = restoreBackup(s, text);
  assert.equal(result.ok, false);
  assert.deepEqual(s.operations, [], 'validation must finish before any storage access');
  assert.deepEqual([...s.data], before);
  assert.equal(result.rollback.attempted, false);
}

test('format, keys and module stay standalone, finite and local-only', () => {
  assert.equal(BACKUP_FORMAT, 'ironroot-backup'); assert.equal(BACKUP_VERSION, 1);
  assert.equal(MAX_BACKUP_BYTES, 1024 * 1024); assert.equal(new Set(keys).size, 5);
  assert.ok(Object.isFrozen(K));
  const source = readFileSync(new URL('../dist/backup.js', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /\b(?:document|navigator|fetch|XMLHttpRequest|eval)\s*[.(]/);
});

test('empty local data exports a complete valid snapshot without writing anything', () => {
  const s = storage(), text = createBackup(s, { createdAt: date });
  const backup = parseBackup(text);
  assert.deepEqual(backup, { format: BACKUP_FORMAT, version: 1, createdAt: date,
    data: { campaign: createCampaignProgress(), trials: {}, settings: {}, history: [], battle: null } });
  assert.deepEqual(writes(s), []); assert.equal(s.operations.length, 5);
});

test('full campaign, trial, preference, history and battle export round trips independently', () => {
  const original = fixture(), s = storage(keys.map((k, i) => [k, JSON.stringify(original.data[Object.keys(K)[i]])]));
  const backup = parseBackup(createBackup(s, { createdAt: date }));
  assert.deepEqual(backup, original);
  backup.data.campaign.missions.emberwatch.stars = 1;
  assert.equal(JSON.parse(s.data.get(K.campaign)).missions.emberwatch.stars, 2);
  assert.deepEqual(writes(s), []);
  const restored = storage([['unrelated.secret', 'leave untouched']]);
  const result = restoreBackup(restored, JSON.stringify(original));
  assert.equal(result.ok, true); assert.deepEqual(result.changedKeys, keys);
  assert.equal(result.rollback.attempted, false); assert.equal(restored.data.get('unrelated.secret'), 'leave untouched');
  for (const domain of Object.keys(K)) assert.deepEqual(JSON.parse(restored.data.get(K[domain])), original.data[domain]);
});

test('all authored campaigns and 5 field trials preserve their mode after active-battle restore', () => {
  for (const [list, create, domain] of [[CAMPAIGN_MISSIONS, createCampaignMission, 'campaignId'], [CHALLENGES, createChallenge, 'challengeId']]) {
    for (const mission of list) {
      const game = create(mission.id); for (let i = 0; i < 240; i++) game.update(.05);
      const b = fixture(); if (domain === 'campaignId') b.data.campaign = progressThrough(mission.id);
      b.data.battle = envelope(game, domain === 'challengeId' ? mission.id : null, domain === 'campaignId' ? mission.id : null);
      const parsed = parseBackup(JSON.stringify(b));
      assert.equal(parsed.data.battle[domain], mission.id);
      assert.deepEqual(Game.restore(parsed.data.battle.game).serialize(), game.serialize());
      const restored = storage(); assert.equal(restoreBackup(restored, JSON.stringify(b)).ok, true);
      assert.equal(JSON.parse(restored.data.get(K.battle))[domain], mission.id);
    }
  }
});

test('simulation replay remains deterministic after import, including particles and projectiles', () => {
  const game = createCampaignMission('black-ledger');
  for (let i = 0; i < 1500; i++) game.update(.05);
  const b = fixture(); b.data.battle = envelope(game, null, 'black-ledger');
  const copy = Game.restore(parseBackup(JSON.stringify(b)).data.battle.game);
  for (let i = 0; i < 500; i++) { game.update(.05); copy.update(.05); }
  assert.deepEqual(copy.serialize(), game.serialize());
});

test('in-memory overrides include unsaved progress without writing or reading replaced domains', () => {
  const s = storage(keys.map(k => [k, '{broken'])), b = fixture();
  const text = createBackup(s, { ...b.data, createdAt: date });
  assert.deepEqual(parseBackup(text), b); assert.deepEqual(s.operations, []);
  const onlyBattle = storage([[K.battle, '{broken']]);
  assert.equal(parseBackup(createBackup(onlyBattle, { battle: envelope(), createdAt: date })).data.battle.version, 2);
  assert.ok(!onlyBattle.operations.some(([, key]) => key === K.battle));
});

test('invalid stored bytes survive export attempts, parse failures and excluded battles', () => {
  for (const key of keys) {
    const s = storage([[key, ' {bad\n']]), before = [...s.data];
    assert.throws(() => createBackup(s), BackupError); assert.deepEqual([...s.data], before); assert.deepEqual(writes(s), []);
  }
  const s = storage([[K.battle, '{broken']]);
  const b = parseBackup(createBackup(s, { includeBattle: false }));
  assert.equal(b.data.battle, null); assert.equal(s.data.get(K.battle), '{broken');
  assert.ok(!s.operations.some(([, key]) => key === K.battle));
  assert.throws(() => createBackup(s, { includeBattle: false, battle: null }), /Cannot override/);
});

test('empty import replaces all progress and removes the destination battle but preserves other keys', () => {
  const s = storage(keys.map(k => [k, 'corrupt bytes'])); s.data.set('other-app', 'protected');
  const result = restoreBackup(s, JSON.stringify(empty()));
  assert.equal(result.ok, true); assert.deepEqual(result.changedKeys, keys);
  assert.equal(s.data.has(K.battle), false); assert.equal(s.data.get('other-app'), 'protected');
  assert.deepEqual(JSON.parse(s.data.get(K.campaign)), createCampaignProgress());
  assert.deepEqual(JSON.parse(s.data.get(K.settings)), {});
});

test('identical imports avoid unnecessary writes and removals', () => {
  const s = storage(), text = JSON.stringify(empty());
  assert.equal(restoreBackup(s, text).ok, true); s.operations.length = 0;
  const result = restoreBackup(s, text);
  assert.equal(result.ok, true); assert.deepEqual(result.changedKeys, []); assert.deepEqual(writes(s), []);
});

test('legacy engine and version-1 trial saves migrate without losing identity', () => {
  const game = new Game(), b = empty(); b.data.battle = game.serialize();
  assert.deepEqual(parseBackup(JSON.stringify(b)).data.battle, envelope(game));
  const trial = createChallenge('shieldbreaker');
  b.data.battle = { format: 'ironroot-save', version: 1, challengeId: 'shieldbreaker', game: trial.serialize() };
  assert.deepEqual(parseBackup(JSON.stringify(b)).data.battle, envelope(trial, 'shieldbreaker'));
  b.data.battle.campaignId = 'emberwatch'; invalid(b, /both|Version-1/);
});

test('legacy result records gain explicit nullable mode IDs and draw flag', () => {
  const b = empty(); b.data.history = [{ won: false, difficulty: 'hard', time: 350, kills: 12, built: 19, date }];
  assert.deepEqual(parseBackup(JSON.stringify(b)).data.history[0], { won: false, draw: false, challengeId: null, campaignId: null, difficulty: 'hard', time: 350, kills: 12, built: 19, date });
});

test('corrupt JSON, incomplete backups, foreign formats and all unsupported schema versions fail before reads', () => {
  for (const value of ['', 'null', 'false', '[]', '{}', '{bad', '"hello"', 4]) invalid(typeof value === 'number' ? JSON.stringify(value) : value);
  for (const mutate of [
    b => { b.format = 'foreign'; }, b => { b.version = 2; }, b => { b.version = '1'; },
    b => { delete b.createdAt; }, b => { delete b.data.trials; }, b => { b.data.extra = {}; },
    b => { b.data.campaign.version = 2; }, b => { b.data.battle.version = 3; },
    b => { b.data.battle.game.version = 2; },
  ]) { const b = fixture(); mutate(b); invalid(b); }
});

test('UTF-8 size limit rejects oversized input before parsing, including multibyte characters', () => {
  invalid(' '.repeat(MAX_BACKUP_BYTES + 1), /1 MiB/);
  invalid('é'.repeat(MAX_BACKUP_BYTES / 2 + 1), /1 MiB/);
  invalid('😀'.repeat(MAX_BACKUP_BYTES / 4 + 1), /1 MiB/);
  const exact = ' '.repeat(MAX_BACKUP_BYTES - 2) + '{}'; invalid(exact, /required field/);
  const s = storage([[K.settings, ' '.repeat(MAX_BACKUP_BYTES + 1)]]);
  assert.throws(() => createBackup(s), /1 MiB/); assert.deepEqual(writes(s), []);
});

test('structured depth, array, string and property bounds reject excessive data safely', () => {
  let nested = null; for (let i = 0; i < 30; i++) nested = { child: nested };
  for (const value of [nested, Array(257).fill(null), { value: 'x'.repeat(101) }, Object.fromEntries(Array.from({ length: 257 }, (_, i) => [`k${i}`, i]))]) invalid(JSON.stringify(value));
  invalid(JSON.stringify(Array.from({ length: 256 }, () => Array(256).fill(0))), /large/);
});

test('prototype pollution, HTML and arbitrary metadata never reach restored domains', () => {
  const poisoned = JSON.stringify(empty()).replace('"trials":{}', '"trials":{"__proto__":{"polluted":true}}'); invalid(poisoned, /unsafe/);
  for (const mutate of [
    b => { b.secret = 'do-not-export'; }, b => { b.data.settings.html = '<script>alert(1)</script>'; },
    b => { b.data.battle.game.secret = 'password'; }, b => { b.data.battle.game.state.apiToken = 'private'; },
    b => { b.data.battle.game.state.bases[0].url = 'https://example.com'; },
    b => { b.data.battle.game.state.buildings[0].notes = '<img onerror=alert(1)>'; },
    b => { b.data.history[0].date = '<script>'; }, b => { b.data.trials.constructor = { completed: true, bestTime: 1 }; },
  ]) { const b = fixture(); mutate(b); invalid(b); }
  assert.equal({}.polluted, undefined);
});

test('overrides reject getters, functions, cycles, sparse arrays, symbols and nonplain values without invoking code', () => {
  let called = false;
  const accessor = {}; Object.defineProperty(accessor, 'sound', { enumerable: true, get() { called = true; return true; } });
  const toJSON = { toJSON() { called = true; return {}; } }, cyclic = {}; cyclic.self = cyclic;
  const symbol = {}; symbol[Symbol('secret')] = 'private';
  const hidden = {}; Object.defineProperty(hidden, 'secret', { value: 'private' });
  for (const value of [accessor, toJSON, cyclic, new Date(), { volume: Infinity }, { volume: NaN }, { sound: undefined }, symbol, hidden])
    assert.throws(() => createBackup(storage(), { settings: value }), BackupError);
  assert.throws(() => createBackup(storage(), { history: Array(2) }), BackupError);
  assert.equal(called, false);
});

test('campaign normalizer is used without silently dropping invalid or orphaned records', () => {
  for (const mutate of [
    b => { b.data.campaign.missions.unknown = { completed: true, stars: 3, bestTime: 1 }; },
    b => { delete b.data.campaign.missions.emberwatch; },
    b => { b.data.campaign.missions.emberwatch.stars = 4; },
    b => { b.data.campaign.missions.emberwatch.stars = 1.5; },
    b => { b.data.campaign.missions.emberwatch.completed = false; },
    b => { b.data.campaign.missions.emberwatch.bestTime = -1; },
    b => { b.data.campaign.missions.emberwatch.bestTime = 180.26; },
    b => { b.data.campaign.missions.emberwatch.note = 'extra'; },
    b => { b.data.campaign = {}; },
  ]) { const b = fixture(); mutate(b); invalid(b); }
  const b = empty(); b.data.campaign.missions.emberwatch = { completed: true, stars: 3, bestTime: 0 };
  assert.deepEqual(parseBackup(JSON.stringify(b)).data.campaign, b.data.campaign);
});

test('trial validation rejects unknown IDs, invalid completion flags and impossible best times', () => {
  for (const value of [[], null, { unknown: { completed: true, bestTime: 1 } }, { skyguard: {} },
    ...[0, -1, 210.26, '50', null].map(bestTime => ({ skyguard: { completed: true, bestTime } })),
    { skyguard: { completed: false, bestTime: 10 } }, { skyguard: { completed: true, bestTime: 10, stars: 3 } }]) {
    const b = empty(); b.data.trials = value; invalid(b);
  }
});

test('preferences require known fields and bounded values but retain intentional partial settings', () => {
  for (const value of [[], null, { sound: 1 }, { music: 'true' }, { volume: -1 }, { volume: 1.1 }, { quality: 'ultra' }, { token: 'secret' }]) {
    const b = empty(); b.data.settings = value; invalid(b);
  }
  const b = empty(); b.data.settings = { volume: 0, music: false };
  assert.deepEqual(parseBackup(JSON.stringify(b)).data.settings, { music: false, volume: 0 });
});

test('history requires real timestamps, valid identities and plausible bounded statistics', () => {
  for (const mutate of [
    b => { b.createdAt = '2026-02-30T00:00:00.000Z'; },
    b => { b.data.history[0].date = '2026-11-06'; },
    b => { b.data.history[0].time = -1; }, b => { b.data.history[0].time = 181; },
    b => { b.data.history[0].kills = 1.5; }, b => { b.data.history[0].built = 1e10; },
    b => { b.data.history[0].draw = true; }, b => { b.data.history[0].challengeId = 'skyguard'; },
    b => { b.data.history[0].campaignId = 'unknown'; }, b => { b.data.history[0].difficulty = 'extreme'; },
    b => { b.data.history = Array(31).fill(b.data.history[0]); },
  ]) { const b = fixture(); mutate(b); invalid(b); }
});

test('battle identity rejects unknown or combined modes, locked missions and inconsistent mission rules', () => {
  for (const mutate of [
    b => { b.data.battle.challengeId = 'unknown'; }, b => { b.data.battle.campaignId = 'unknown'; },
    b => { b.data.battle.challengeId = ''; }, b => { b.data.battle.campaignId = false; },
    b => { b.data.battle.challengeId = 'skyguard'; b.data.battle.campaignId = 'emberwatch'; },
    b => { b.data.battle = envelope(createCampaignMission('three-roads'), null, 'three-roads'); b.data.campaign = createCampaignProgress(); },
    b => { b.data.battle = envelope(createCampaignMission('emberwatch'), null, 'emberwatch'); b.data.battle.game.ai = true; },
    b => { b.data.battle = envelope(createChallenge('skyguard'), 'skyguard'); b.data.battle.game.difficulty = 'hard'; },
  ]) { const b = fixture(); mutate(b); invalid(b); }
});

test('ended and corrupt battles reject even if objective completion leaves engine winner null', () => {
  for (const mutate of [
    b => { b.data.battle.game.state.bases[0].hp = 0; },
    b => { b.data.battle.game.state.bases[1].hp = 0; b.data.battle.game.state.winner = 0; },
    b => { b.data.battle.game.state.buildings[0].type = 'unknown'; },
    b => { b.data.battle.game.state.gold[0] = -1; },
    b => { b.data.battle.game.state.buildings[1].id = b.data.battle.game.state.buildings[0].id; },
    b => { b.data.battle = envelope(createChallenge('holdfast'), 'holdfast'); b.data.battle.game.state.time = 140; },
    b => { b.data.battle = envelope(createCampaignMission('emberwatch'), null, 'emberwatch'); b.data.battle.game.state.time = 180; },
    b => { b.data.battle = envelope(createCampaignMission('winter-stores'), null, 'winter-stores'); b.data.battle.game.state.buildings.find(x => x.side === 0 && x.type === 'mint').hp = 0; },
  ]) { const b = fixture(); mutate(b); invalid(b); }
});

test('raw storage reads that throw abort export/import without silently exporting empty progress', () => {
  for (const key of keys) {
    const s = storage(), get = s.getItem.bind(s);
    s.getItem = k => { if (k === key) throw Error('SecurityError'); return get(k); };
    assert.throws(() => createBackup(s), /Could not read/); assert.deepEqual(writes(s), []);
    const result = restoreBackup(s, JSON.stringify(fixture()));
    assert.equal(result.ok, false); assert.equal(result.code, 'storage-read-failed'); assert.equal(result.failedKey, key);
    assert.deepEqual(writes(s), []);
  }
  assert.equal(restoreBackup(null, JSON.stringify(fixture())).code, 'storage-unavailable');
  assert.throws(() => createBackup({ getItem: () => undefined }), /Could not read/);
});

test('strict throwing adapter works and requires explicit true for writes', () => {
  const data = new Map(), strict = { get: k => data.get(k) ?? null,
    set: (k, v) => { data.set(k, v); return true; }, remove: k => { data.delete(k); return true; } };
  const b = fixture(), text = JSON.stringify(b);
  assert.equal(restoreBackup(strict, text).ok, true);
  assert.deepEqual(parseBackup(createBackup(strict, { createdAt: date })), b);
  const refused = { get: () => null, set: () => false, remove: () => true };
  const result = restoreBackup(refused, text);
  assert.equal(result.ok, false); assert.equal(result.rollback.complete, true);
});

test('quota failure at every write position restores exact corrupt original bytes', () => {
  const text = JSON.stringify(fixture());
  for (let failAt = 1; failAt <= keys.length; failAt++) {
    const originals = keys.map((k, i) => [k, `  original corrupt {${i}\n`]), s = storage(originals), set = s.setItem.bind(s);
    let count = 0; s.setItem = (k, v) => { if (++count === failAt) throw Error('QuotaExceededError'); set(k, v); };
    const result = restoreBackup(s, text);
    assert.equal(result.ok, false); assert.equal(result.code, 'write-failed-rolled-back');
    assert.equal(result.failedKey, keys[failAt - 1]); assert.equal(result.rollback.complete, true);
    assert.deepEqual(result.changedKeys, []); assert.deepEqual([...s.data], originals);
    assert.match(result.message, /restored and verified/);
  }
});

test('failed writes that mutate before throwing or returning false are rolled back too', () => {
  for (const strict of [false, true]) {
    const s = storage([[K.campaign, 'raw old bytes']]), old = [...s.data]; let count = 0;
    const io = strict ? { get: k => s.data.get(k) ?? null,
      set: (k, v) => { s.data.set(k, v); return ++count !== 1; }, remove: k => { s.data.delete(k); return true; } } : s;
    if (!strict) s.setItem = (k, v) => { s.data.set(k, v); if (++count === 1) throw Error('write then error'); };
    const result = restoreBackup(io, JSON.stringify(fixture()));
    assert.equal(result.ok, false); assert.equal(result.rollback.complete, true); assert.deepEqual([...s.data], old);
  }
});

test('quota rollback removes newly introduced keys and does not invent previous absent data', () => {
  const s = storage(); let count = 0;
  s.setItem = (k, v) => { if (++count === 4) throw Error('quota'); s.data.set(k, v); };
  const result = restoreBackup(s, JSON.stringify(fixture()));
  assert.equal(result.rollback.complete, true); assert.equal(s.data.size, 0);
});

test('failed battle removal rolls back progress and preserves the old corrupt battle', () => {
  const original = keys.map((k, i) => [k, 'invalid ' + i]), s = storage(original);
  s.removeItem = () => { throw Error('denied'); };
  const result = restoreBackup(s, JSON.stringify(empty()));
  assert.equal(result.ok, false); assert.equal(result.failedKey, K.battle);
  assert.equal(result.rollback.complete, true); assert.deepEqual([...s.data], original);
});

test('readback catches adapters that claim success but drop or corrupt writes', () => {
  for (const mode of ['drop', 'corrupt']) {
    const s = storage([[K.campaign, 'old']]); let count = 0;
    s.setItem = (k, v) => { if (++count === 1) { if (mode === 'corrupt') s.data.set(k, 'wrong'); } else s.data.set(k, v); };
    const result = restoreBackup(s, JSON.stringify(fixture()));
    assert.equal(result.ok, false); assert.equal(result.rollback.complete, true); assert.equal(s.data.get(K.campaign), 'old');
  }
});

test('rollback failure reports exact changed keys and never claims no changes', () => {
  const s = storage([[K.campaign, 'old campaign'], [K.trials, 'old trials']]); let count = 0;
  s.setItem = (k, v) => { if (++count >= 2) throw Error('quota now permanent'); s.data.set(k, v); };
  const result = restoreBackup(s, JSON.stringify(fixture()));
  assert.equal(result.ok, false); assert.equal(result.code, 'rollback-incomplete');
  assert.equal(result.failedKey, K.trials); assert.equal(result.rollback.complete, false);
  assert.deepEqual(result.changedKeys, [K.campaign]); assert.deepEqual(result.rollback.unrestoredKeys, [K.campaign]);
  assert.deepEqual(result.rollback.unverifiedKeys, []); assert.match(result.message, /Still changed: ironroot.campaign.v1/);
  assert.match(result.message, /Keep this page open/); assert.doesNotMatch(result.message, /No local data was changed/);
});

test('permanent read denial during rollback reports unverified keys separately', () => {
  const s = storage(); let denied = false;
  s.getItem = k => { if (denied) throw Error('SecurityError'); return s.data.get(k) ?? null; };
  s.setItem = () => { denied = true; throw Error('denied'); }; s.removeItem = () => { throw Error('denied'); };
  const result = restoreBackup(s, JSON.stringify(fixture()));
  assert.equal(result.code, 'rollback-incomplete'); assert.equal(result.rollback.complete, false);
  assert.deepEqual(result.changedKeys, []); assert.deepEqual(result.rollback.unverifiedKeys, keys);
  assert.match(result.message, /Cannot verify:/);
});

test('a transient verification read failure can still restore and verify original values', () => {
  const s = storage([[K.campaign, 'old']]); let failNext = false;
  s.getItem = k => { if (failNext) { failNext = false; throw Error('transient'); } return s.data.get(k) ?? null; };
  s.setItem = (k, v) => { s.data.set(k, v); if (v !== 'old') failNext = true; };
  const result = restoreBackup(s, JSON.stringify(fixture()));
  assert.equal(result.ok, false); assert.equal(result.rollback.complete, true); assert.equal(s.data.get(K.campaign), 'old');
});

test('rollback verifies actual bytes even if restoration writes return an error afterward', () => {
  const s = storage([[K.campaign, 'old']]); let count = 0;
  s.setItem = (k, v) => { if (++count === 2) throw Error('quota'); s.data.set(k, v); if (v === 'old') throw Error('restored but reported failure'); };
  const result = restoreBackup(s, JSON.stringify(fixture()));
  assert.equal(result.ok, false); assert.equal(result.rollback.complete, true); assert.equal(s.data.get(K.campaign), 'old');
});

test('concurrent destination changes are detected and never overwritten on that key', () => {
  const s = storage(); let campaignReads = 0;
  s.getItem = k => { if (k === K.campaign && ++campaignReads === 2) s.data.set(k, 'other tab'); return s.data.get(k) ?? null; };
  const result = restoreBackup(s, JSON.stringify(fixture()));
  assert.equal(result.ok, false); assert.equal(result.rollback.attempted, false); assert.equal(result.rollback.complete, false);
  assert.deepEqual(result.changedKeys, [K.campaign]); assert.equal(s.data.get(K.campaign), 'other tab'); assert.deepEqual(writes(s), []);
});

test('validation precedes adapter construction even if storage access itself would throw', () => {
  const s = {}; Object.defineProperty(s, 'getItem', { get() { throw Error('storage must not be touched'); } });
  assert.equal(restoreBackup(s, '{broken').code, 'invalid-json');
  assert.equal(restoreBackup(s, JSON.stringify(empty())).code, 'storage-unavailable');
});

test('a real persistent capacity limit rolls back partial replacements, then permits a successful retry', () => {
  const b = fixture(), original = keys.map(k => [k, 'old']), s = storage(original);
  const length = map => [...map].reduce((n, [k, v]) => n + k.length + v.length, 0);
  const partial = new Map(original);
  for (const domain of ['campaign', 'trials']) partial.set(K[domain], JSON.stringify(b.data[domain]));
  let capacity = length(partial) + 10;
  s.setItem = (k, v) => {
    const proposed = new Map(s.data); proposed.set(k, v);
    if (length(proposed) > capacity) throw Error('QuotaExceededError');
    s.data.set(k, v);
  };
  const result = restoreBackup(s, JSON.stringify(b));
  assert.equal(result.ok, false); assert.equal(result.failedKey, K.settings);
  assert.equal(result.rollback.complete, true); assert.deepEqual([...s.data], original);
  capacity = Infinity;
  assert.equal(restoreBackup(s, JSON.stringify(b)).ok, true);
  assert.deepEqual(parseBackup(createBackup(s, { createdAt: date })), b);
});

test('a removal that deletes the old battle before throwing restores its exact original bytes', () => {
  const original = keys.map((k, i) => [k, ` corrupt ${i}\n`]), s = storage(original);
  s.removeItem = k => { s.data.delete(k); throw Error('deleted then failed'); };
  const result = restoreBackup(s, JSON.stringify(empty()));
  assert.equal(result.ok, false); assert.equal(result.rollback.complete, true);
  for (const [key, value] of original) assert.equal(s.data.get(key), value);
});

test('final readback verifies unchanged domains too and reports concurrent foreign writes exactly', () => {
  const b = empty(), s = storage(keys.filter(k => k !== K.battle).map(k => [k, JSON.stringify(b.data[Object.keys(K).find(d => K[d] === k)])]));
  let settingsReads = 0;
  s.getItem = k => {
    if (k === K.settings && ++settingsReads === 2) s.data.set(k, 'another tab changed settings');
    return s.data.get(k) ?? null;
  };
  const result = restoreBackup(s, JSON.stringify(b));
  assert.equal(result.ok, false); assert.equal(result.failedKey, K.settings);
  assert.equal(result.rollback.attempted, false); assert.deepEqual(result.changedKeys, [K.settings]);
  assert.equal(s.data.get(K.settings), 'another tab changed settings'); assert.deepEqual(writes(s), []);
});
