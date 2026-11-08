import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { Game, MAPS, DEFAULT_SKIRMISH_RULESET_ID, FOG_RULESET_ID, FOG_SKIRMISH_RULESET_ID } from '../dist/engine.js';
import { refreshFog, observe, FOG } from '../dist/fog.js';
import { encodeBattle, decodeBattle, identityOf, validateBattleIdentity } from '../dist/battle-codec.js';
import { validateHistory, validateHistoryRow } from '../dist/history-codec.js';
import { createBackup, parseBackup, restoreBackup, BACKUP_STORAGE_KEYS as K } from '../dist/backup.js';
import { createProfileSession, CURRENT_PROFILE_PROTOCOL_VERSION, PROFILE_MARKER_KEY as MARKER } from '../dist/profile-session.js';
import { createStorage, createSaveSession, createHistorySession, createPreferenceSession, readHistoryState, writeBattle } from '../dist/persistence.js';
import { createCampaignProgress, CAMPAIGN_PROGRESS_MISSIONS, createProgressionCampaignMission, campaignScenarioForGame } from '../dist/campaign.js';
import { CURRENT_CHALLENGES, createCurrentChallenge, challengeScenarioForGame } from '../dist/challenges.js';
import { TRAINING_LESSONS } from '../dist/training.js';
import * as protocolEleven from './fixtures/profile-session-v0202.js';

const date = '2026-11-08T00:00:00.000Z';
const scenario = { kind: 'skirmish', id: 'standard', revision: 1 };
const clone = structuredClone;
const fresh = () => new Game({ rulesetId: FOG_SKIRMISH_RULESET_ID, ai: false, seed: 91 });
const marker = (version, phase = 'ready', epoch = 'retained-earned-profile') => JSON.stringify({ format: 'ironroot-profile', version, epoch, phase });
function backend(entries = []) {
  const data = new Map(entries), writes = [], reads = [];
  return {
    data, writes, reads,
    getItem(key) { reads.push(key); return data.get(key) ?? null; },
    setItem(key, value) { writes.push(['set', key, value]); data.set(key, value); },
    removeItem(key) { writes.push(['remove', key]); data.delete(key); },
  };
}
const current = (r, epoch = 'fog-import') => createProfileSession(() => r, { requiredProtocolVersion: CURRENT_PROFILE_PROTOCOL_VERSION, newEpoch: () => epoch });
const previous = r => protocolEleven.createProfileSession(() => r, { requiredProtocolVersion: 11 });
const row = game => ({ won: true, draw: false, difficulty: game.difficulty, time: game.state.time, kills: game.state.stats.kills[0], built: game.state.stats.built[0], date, identity: identityOf(game) });
function earned() {
  const game = new Game({ rulesetId: DEFAULT_SKIRMISH_RULESET_ID, ai: false, seed: 32 });
  return {
    campaign: { ...createCampaignProgress(), missions: Object.fromEntries(CAMPAIGN_PROGRESS_MISSIONS.map((m, i) => [m.id, { completed: true, stars: i % 3 + 1, bestTime: 60 + i }])) },
    trials: Object.fromEntries(CURRENT_CHALLENGES.map((c, i) => [c.id, { completed: true, bestTime: 70 + i }])),
    settings: { sound: false, music: false, sfx: true, volume: .3, reducedMotion: true, quality: 'low', keyboard: { version: 1, bindings: { build1: 'KeyQ', volley: null } }, skirmishBridgeIncome: true },
    history: [{ won: true, draw: false, challengeId: 'shieldbreaker', campaignId: null, difficulty: 'normal', time: 75, kills: 12, built: 5, date }, row(game)],
    battle: encodeBattle(game),
  };
}
const entries = data => Object.entries(K).filter(([d]) => data[d] !== null).map(([d, key]) => [key, '  ' + JSON.stringify(data[d]) + '\n']);
const domainBytes = r => [...r.data].filter(([key]) => key !== MARKER);
const advance = (game, n) => { for (let i = 0; i < n; i++) game.update(i % 3 === 0 ? .1 : .05); };
/** Synthetic engine fixture, not evidence of a played match. Both memories are earned by observation. */
function remembered() {
  const game = fresh(); game.state.time = 100; game.tick = 2000;
  assert.ok(game.buyCitadelOption('arrows', 0).ok);
  assert.ok(game.buyCitadelOption('regen', 1).ok);
  for (const side of [0, 1]) {
    game._spawn({ type: 'aerie', side, x: side ? 300 : 2900, y: 450, lane: 1, level: 1 });
    Object.assign(game.state.units.at(-1), { x: side ? 300 : 2900, y: 450, lane: 1 });
  }
  refreshFog(game);
  for (const unit of game.state.units) unit.x = unit.side ? 2200 : 1000;
  refreshFog(game);
  // A hidden upgrade must not rewrite either side's last-seen record on restore.
  assert.ok(game.upgrade(game.state.buildings.find(b => b.side === 1).id, 1).ok);
  assert.ok(game.state.fog.sides.every(s => s.structures.length === 1 && s.citadel !== null));
  assert.ok(observe(game).fog.memories.every(m => m.level === 1));
  return game;
}
const backupWith = (battle, history = []) => ({ format: 'ironroot-backup', version: 2, createdAt: date, data: { ...earned(), battle, history } });

// This candidate's admission is local. These tests do not imply production activation.
test('supported fog retains existing v3 battle and v2 backup formats with exact identity and both memories', () => {
  const game = remembered(), saved = encodeBattle(game), before = game.serialize();
  assert.equal(saved.version, 3); assert.equal(saved.game.version, 3);
  assert.equal(saved.game.rulesetId, FOG_SKIRMISH_RULESET_ID);
  assert.deepEqual(identityOf(game), { ruleset: { id: FOG_SKIRMISH_RULESET_ID, revision: 1 }, map: { id: 'classic', revision: 1 }, scenario });
  const decoded = decodeBattle(JSON.stringify(saved));
  assert.deepEqual(decoded.game.serialize(), before);
  assert.deepEqual(decoded.game.state.fog, before.state.fog);
  const text = createBackup(backend(), { createdAt: date, battle: saved, history: [row(game)] });
  const parsed = parseBackup(text);
  assert.equal(parsed.version, 2); assert.deepEqual(parsed.data.battle, saved); assert.deepEqual(parsed.data.history, [row(game)]);
  game.ai = decoded.game.ai = true;
  advance(game, 450); advance(decoded.game, 450);
  assert.deepEqual(decoded.game.serialize(), game.serialize());
});

test('identity-only history cannot pair fog with another map, campaign, trial or lesson', () => {
  const game = fresh(), identity = identityOf(game), progress = earned().campaign;
  const campaign = createProgressionCampaignMission(CAMPAIGN_PROGRESS_MISSIONS[0].id, progress);
  const trial = createCurrentChallenge(CURRENT_CHALLENGES[0].id);
  const cases = [
    ...['long-march', 'twin-span', 'intro-one-road', 'intro-two-road'].map(id => value => { value.map.id = id; }),
    value => { value.map.revision = 2; }, value => { value.ruleset.revision = 2; },
    value => { value.scenario = campaignScenarioForGame(campaign, CAMPAIGN_PROGRESS_MISSIONS[0].id); },
    value => { value.scenario = challengeScenarioForGame(trial, CURRENT_CHALLENGES[0].id); },
    value => { value.scenario = { kind: 'lesson', id: TRAINING_LESSONS[0].id, revision: 1 }; },
    value => { value.scenario.id = 'unknown'; }, value => { value.scenario.revision = 2; },
    value => { value.ruleset.id = FOG_RULESET_ID; }, value => { value.ruleset.id = 'frontier-fog-future-open'; },
    value => { value.scenario.kind = 'future'; }, value => { value.extra = true; },
  ];
  for (const mutate of cases) {
    const bad = clone(identity); mutate(bad); const before = clone(bad), record = { ...row(game), identity: bad };
    assert.throws(() => validateBattleIdentity(bad)); assert.throws(() => validateHistoryRow(record));
    assert.deepEqual(bad, before);
    const source = backend(entries(earned()));
    assert.throws(() => createBackup(source, { createdAt: date, history: [record] }));
    assert.deepEqual(source.writes, []);
    const target = backend([...entries(earned()), ['unrelated', 'untouched']]), bytes = [...target.data];
    assert.equal(restoreBackup(target, JSON.stringify(backupWith(null, [record]))).ok, false);
    assert.deepEqual(target.reads, []); assert.deepEqual(target.writes, []); assert.deepEqual([...target.data], bytes);
  }
});

test('unknown, QA, forged-scenario and raw v3 inputs reject without rewriting input or profile bytes', () => {
  const game = fresh(), valid = encodeBattle(game), campaignGame = createProgressionCampaignMission(CAMPAIGN_PROGRESS_MISSIONS[0].id, earned().campaign);
  const cases = [
    value => { value.game.rulesetId = FOG_RULESET_ID; }, value => { value.game.rulesetId = 'future-fog'; },
    value => { value.game.rulesetRevision = 2; }, value => { value.game.mapId = 'long-march'; },
    value => { value.game.mapRevision = 2; }, value => { value.game.version = 4; },
    value => { value.version = 4; }, value => { value.game = { ...value.game, version: 2 }; },
    value => { value.extra = true; }, value => { value.scenario.extra = true; },
    value => { value.scenario = campaignScenarioForGame(campaignGame, CAMPAIGN_PROGRESS_MISSIONS[0].id); },
  ];
  assert.throws(() => decodeBattle(game.serialize()), /scenario envelope/);
  for (const [index, mutate] of cases.entries()) {
    const bad = clone(valid); mutate(bad); const before = clone(bad);
    assert.throws(() => decodeBattle(bad, { campaignProgress: earned().campaign }), `envelope mutation ${index}`); assert.deepEqual(bad, before);
    const target = backend(entries(earned())), bytes = [...target.data];
    assert.equal(restoreBackup(target, JSON.stringify(backupWith(bad))).ok, false);
    assert.deepEqual(target.reads, []); assert.deepEqual(target.writes, []); assert.deepEqual([...target.data], bytes);
  }
  const qa = new Game({ rulesetId: FOG_RULESET_ID });
  assert.throws(() => encodeBattle(qa), error => error.code === 'qa-only-ruleset');
  assert.deepEqual(Game.restore(qa.serialize()).serialize(), qa.serialize());
});

test('strict malformed, oversized and recycled knowledge fails before write across save and backup boundaries', () => {
  const game = remembered(), valid = encodeBattle(game);
  const cases = [
    data => { delete data.state.fog; }, data => { data.state.fog.extra = true; }, data => { data.state.fog.version = 2; },
    data => { data.state.fog.sides.pop(); }, data => { data.state.fog.sides[0].extra = true; },
    data => { data.state.fog.sides[0].structures[0].side = 0; },
    data => { data.state.fog.sides[0].structures[0].type = 'gryphon'; },
    data => { data.state.fog.sides[0].structures[0].id = data.nextId; },
    data => { data.state.fog.sides[0].structures[0].id = data.state.units[0].id; },
    data => { data.state.fog.sides[0].structures[0].x = -1; },
    data => { data.state.fog.sides[0].structures[0].y = 721; },
    data => { data.state.fog.sides[0].structures[0].lane = 0; },
    data => { data.state.fog.sides[0].structures[0].level = 4; },
    data => { data.state.fog.sides[0].structures[0].observedAt = data.state.time + 1; },
    data => { data.state.fog.sides[0].structures[0].hp = 700; },
    data => { data.state.fog.sides[0].structures.push(clone(data.state.fog.sides[0].structures[0])); },
    data => { data.state.fog.sides[0].structures = Array.from({ length: FOG.maxMemories + 1 }, () => clone(data.state.fog.sides[0].structures[0])); },
    data => { data.state.fog.sides[1].structures = Array.from({ length: 257 }, () => clone(data.state.fog.sides[1].structures[0])); },
    data => { data.state.fog.sides[1].citadel.choice = 'shield'; },
    data => { data.state.fog.sides[1].citadel.observedAt = data.state.time + 1; },
    data => { data.state.fog.sides[1].citadel.extraShots = 1; },
    data => { data.state.effects[0].fogSeen = 0; }, data => { data.state.effects[0].fogSeen = 4; },
    data => { data.state.effects = Array.from({ length: FOG.maxEffectsPerSide + 1 }, () => ({ ...data.state.effects[0], fogSeen: 1 })); },
    data => { data.state.projectiles.push({ x: 110, y: 450, sx: 110, sy: 450, tx: 200, ty: 450, side: 0, type: 'tower', sourceAir: false, targetAir: false, fogSeen: 1, life: .28, maxLife: .28 }); },
  ];
  for (const [index, mutate] of cases.entries()) {
    const bad = clone(valid); mutate(bad.game); const before = clone(bad);
    assert.throws(() => decodeBattle(bad), `mutation ${index}`); assert.deepEqual(bad, before);
    const raw = backend(entries(earned())), storage = createStorage(() => raw), bytes = [...raw.data];
    const forged = { ruleset: game.ruleset, map: game.map, serialize: () => bad.game };
    assert.equal(writeBattle(storage, K.battle, forged), false, `write mutation ${index}`);
    assert.deepEqual(raw.reads, []); assert.deepEqual(raw.writes, []); assert.deepEqual([...raw.data], bytes);
    assert.equal(restoreBackup(raw, JSON.stringify(backupWith(bad))).ok, false, `backup mutation ${index}`);
    assert.deepEqual(raw.reads, []); assert.deepEqual(raw.writes, []); assert.deepEqual([...raw.data], bytes);
  }
});

test('non-JSON knowledge never invokes a getter and non-fog identities cannot smuggle fog fields', () => {
  const valid = encodeBattle(remembered());
  for (const field of ['observedAt', 'x']) {
    const bad = clone(valid); let invoked = false;
    Object.defineProperty(bad.game.state.fog.sides[0].structures[0], field, { enumerable: true, get() { invoked = true; return 100; } });
    assert.throws(() => decodeBattle(bad)); assert.equal(invoked, false);
  }
  for (const id of ['frontier-legacy', DEFAULT_SKIRMISH_RULESET_ID]) {
    const plain = encodeBattle(new Game({ rulesetId: id, ai: false })); plain.game.state.fog = clone(valid.game.state.fog);
    assert.throws(() => decodeBattle(plain));
  }
  const changedIdentity = clone(valid); changedIdentity.game.rulesetId = DEFAULT_SKIRMISH_RULESET_ID;
  assert.throws(() => decodeBattle(changedIdentity));
});

test('scenario validation rejects unknown fields and accessors before selection for fog and legacy games', () => {
  for (const game of [fresh(), new Game({ ai: false }), new Game({ mapId: 'twin-span', ai: false })]) {
    const original = game.serialize(), invalid = { ...scenario, ignored: 'must not be discarded' }, before = clone(invalid);
    assert.throws(() => identityOf(game, invalid)); assert.throws(() => encodeBattle(game, invalid));
    assert.deepEqual(invalid, before); assert.deepEqual(game.serialize(), original);
    for (const key of ['kind', 'id', 'revision']) {
      let invoked = false; const accessor = { ...scenario };
      Object.defineProperty(accessor, key, { enumerable: true, get() { invoked = true; return scenario[key]; } });
      assert.throws(() => identityOf(game, accessor)); assert.throws(() => encodeBattle(game, accessor));
      assert.equal(invoked, false); assert.deepEqual(game.serialize(), original);
    }
    // Existing valid identities/envelopes remain unchanged, including legacy v1/v2 engine formats.
    assert.deepEqual(decodeBattle(encodeBattle(game, scenario)).game.serialize(), original);
  }
});

test('maximum valid memory is retained exactly without truncation or knowledge synthesis', () => {
  const game = fresh(); game.state.time = 100; game.tick = 2000;
  for (const side of [0, 1]) game.state.fog.sides[side].structures = Array.from({ length: FOG.maxMemories }, (_, i) => ({
    id: game.nextId++, type: 'watchtower', side: 1 - side, x: side ? 500 + i : 2200 + i, y: 260, lane: 0, level: 1, observedAt: i,
  }));
  const saved = encodeBattle(game), decoded = decodeBattle(saved);
  assert.deepEqual(decoded.game.serialize(), game.serialize());
  assert.deepEqual(parseBackup(createBackup(backend(), { createdAt: date, battle: saved })).data.battle, saved);
});

test('current protocol changes only marker bytes and fences exact pinned protocol11 stale and reopened writers', () => {
  const source = readFileSync(new URL('./fixtures/profile-session-v0202.js', import.meta.url));
  assert.equal(createHash('sha256').update(source).digest('hex'), '3a008d9e0fae2f1d15929ab888482b67cacb501b6a4141c5109104b30660a64e');
  assert.equal(protocolEleven.CURRENT_PROFILE_PROTOCOL_VERSION, 11); assert.equal(CURRENT_PROFILE_PROTOCOL_VERSION, 16);
  const domains = entries(earned()), raw = backend([[MARKER, marker(11)], ...domains, ['unrelated', 'untouched']]);
  const stale = previous(raw); assert.ok(stale.status().canWrite);
  const writer = current(raw); assert.ok(writer.status().canWrite);
  assert.deepEqual(raw.writes, [['set', MARKER, marker(CURRENT_PROFILE_PROTOCOL_VERSION)]]);
  for (const [key, value] of domains) assert.equal(raw.data.get(key), value);
  // Exercise the old writer against actual candidate-domain bytes, not just a new marker.
  const storage = createStorage(() => writer.storage), game = remembered();
  assert.ok(writeBattle(storage, K.battle, game));
  const history = createHistorySession(storage, K.history, { canWrite: () => writer.status().canWrite });
  history.retain(row(game)); assert.ok(history.retry());
  for (const key of [K.campaign, K.trials, K.settings]) assert.equal(raw.data.get(key), new Map(domains).get(key));
  const before = [...raw.data]; raw.writes.length = 0;
  for (const old of [stale, previous(raw)]) {
    assert.equal(old.status().canWrite, false);
    for (const key of Object.values(K)) for (const adapter of [old.storage, old.importStorage]) {
      assert.throws(() => adapter.getItem(key)); assert.throws(() => adapter.setItem(key, '{}')); assert.throws(() => adapter.removeItem(key));
    }
    assert.equal(old.beginImport().ok, false); assert.equal(old.beginImport({ recover: true }).code, 'unsupported-protocol');
  }
  assert.deepEqual([...raw.data], before); assert.deepEqual(raw.writes, []);
});

test('current protocol never rewrites unfinished/future markers and blocks unverifiable upgrades without changing earned data', () => {
  for (const prior of [marker(11, 'restoring'), marker(11, 'failed'), marker(CURRENT_PROFILE_PROTOCOL_VERSION + 1)]) {
    const raw = backend([[MARKER, prior], ...entries(earned())]), before = [...raw.data], profile = current(raw);
    assert.equal(profile.status().canWrite, false); assert.deepEqual(raw.writes, []); assert.deepEqual([...raw.data], before);
    if (prior === marker(CURRENT_PROFILE_PROTOCOL_VERSION + 1)) assert.equal(profile.beginImport({ recover: true }).code, 'unsupported-protocol');
  }
  for (const fault of ['drop', 'throw', 'readback']) {
    const raw = backend([[MARKER, marker(11)], ...entries(earned())]), before = domainBytes(raw);
    const get = raw.getItem, set = raw.setItem; let unreadable = false;
    raw.getItem = key => { if (key === MARKER && unreadable) throw Error('readback failed'); return get(key); };
    raw.setItem = (key, value) => {
      if (key !== MARKER) return set(key, value);
      if (fault === 'drop') return; if (fault === 'throw') throw Error('quota'); set(key, value); unreadable = true;
    };
    const profile = current(raw); assert.equal(profile.status().canWrite, false);
    for (const key of Object.values(K)) { assert.throws(() => profile.storage.getItem(key)); assert.throws(() => profile.storage.setItem(key, '{}')); }
    assert.deepEqual(domainBytes(raw), before);
  }
});

test('normal fog save/export preserves every earned byte and preference including true bridge selection', () => {
  const data = earned(), raw = backend([[MARKER, marker(11)], ...entries(data), ['unrelated', 'untouched']]);
  const prior = new Map(raw.data), profile = current(raw), storage = createStorage(() => profile.storage), slot = createSaveSession(storage, K.battle), game = remembered();
  assert.ok(slot.claim()); raw.writes.length = 0;
  assert.equal(writeBattle(slot, K.battle, game), true); assert.deepEqual(raw.writes.map(write => write[1]), [K.battle]);
  for (const key of [K.campaign, K.trials, K.settings, K.history, 'unrelated']) assert.equal(raw.data.get(key), prior.get(key));
  const beforeExport = [...raw.data]; raw.writes.length = 0;
  const backup = parseBackup(createBackup(profile.storage, { createdAt: date }));
  assert.equal(backup.version, 2); assert.deepEqual(backup.data, { ...data, battle: encodeBattle(game) });
  assert.deepEqual([...raw.data], beforeExport); assert.deepEqual(raw.writes, []);
  for (const value of [false, true]) assert.throws(() => createBackup(backend(), { createdAt: date, settings: { skirmishFog: value } }));
});

test('fog backup restore retains both knowledge records, every earned domain and unrelated keys while fencing current stale tabs', () => {
  const game = remembered(), data = { ...earned(), battle: encodeBattle(game), history: [...earned().history, row(game)] };
  const text = createBackup(backend(entries(data)), { createdAt: date });
  const raw = backend([[MARKER, marker(11)], ...entries(earned()), ['unrelated', 'untouched']]);
  const importer = current(raw), stale = current(raw, 'other-tab'), staleStorage = createStorage(() => stale.storage);
  const staleBattle = createSaveSession(staleStorage, K.battle); assert.ok(staleBattle.claim());
  const staleHistory = createHistorySession(staleStorage, K.history, { canWrite: () => stale.status().canWrite }); staleHistory.retain(row(game));
  const stalePreferences = createPreferenceSession(staleStorage, K.settings, { canWrite: () => stale.status().canWrite }); stalePreferences.stage({ sound: true });
  assert.ok(importer.beginImport().ok); assert.ok(restoreBackup(importer.importStorage, text).ok); assert.ok(importer.finishImport({ outcome: 'restored' }).ok);
  assert.equal(stale.status().canWrite, false); assert.equal(importer.status().canWrite, false);
  const before = [...raw.data]; raw.writes.length = 0;
  assert.equal(writeBattle(staleBattle, K.battle, fresh()), false); assert.equal(staleHistory.retry(), false); assert.equal(stalePreferences.retry(), false);
  assert.equal(stale.beginImport().ok, false); assert.deepEqual([...raw.data], before); assert.deepEqual(raw.writes, []);
  const reloaded = current(raw); assert.ok(reloaded.status().canWrite);
  const result = parseBackup(createBackup(reloaded.storage, { createdAt: date })); assert.deepEqual(result.data, data);
  const restored = decodeBattle(result.data.battle).game; assert.deepEqual(restored.serialize(), game.serialize());
  advance(game, 200); advance(restored, 200); assert.deepEqual(restored.serialize(), game.serialize());
  assert.equal(raw.data.get('unrelated'), 'untouched'); assert.equal(JSON.parse(raw.data.get(MARKER)).version, CURRENT_PROFILE_PROTOCOL_VERSION);
});

test('failed fog backup replacement rolls back each of five domains exactly and retains current protocol fencing', () => {
  const replacement = { ...earned(), battle: encodeBattle(remembered()) };
  replacement.settings.volume = .7; replacement.history.push(row(fresh()));
  const text = createBackup(backend(entries(replacement)), { createdAt: date });
  for (const failedKey of Object.values(K)) for (const fault of ['throw-before', 'throw-after', 'drop']) {
    const original = entries(earned()), raw = backend([[MARKER, marker(11)], ...original, ['unrelated', 'untouched']]);
    const writer = current(raw), stale = current(raw, 'stale-import'); assert.ok(writer.beginImport().ok);
    const set = raw.setItem; let pending = true;
    raw.setItem = (key, value) => {
      if (key === failedKey && pending) {
        pending = false;
        if (fault === 'drop') return;
        if (fault === 'throw-after') set(key, value);
        throw Error('quota');
      }
      set(key, value);
    };
    const result = restoreBackup(writer.importStorage, text);
    assert.equal(result.ok, false, `${failedKey}/${fault}`); assert.equal(result.rollback.complete, true, `${failedKey}/${fault}`);
    for (const [key, value] of original) assert.equal(raw.data.get(key), value);
    assert.ok(writer.finishImport({ outcome: 'rolled-back' }).ok); assert.ok(writer.status().canWrite); assert.equal(stale.status().canWrite, false);
    assert.equal(JSON.parse(raw.data.get(MARKER)).version, CURRENT_PROFILE_PROTOCOL_VERSION); assert.equal(previous(raw).beginImport({ recover: true }).code, 'unsupported-protocol');
    assert.equal(raw.data.get('unrelated'), 'untouched');
  }
});

test('fog history uses its immutable identity for deduplication without changing plain rows', () => {
  const plain = row(new Game({ rulesetId: DEFAULT_SKIRMISH_RULESET_ID, ai: false, seed: 91 })), fog = row(fresh());
  assert.deepEqual({ ...fog, identity: null }, { ...plain, identity: null });
  const raw = backend([[K.history, JSON.stringify([plain])]]), storage = createStorage(() => raw), session = createHistorySession(storage, K.history);
  session.retain(fog); session.retain(clone(fog)); assert.equal(session.pendingCount(), 1); assert.ok(session.retry());
  assert.deepEqual(validateHistory(JSON.parse(raw.data.get(K.history))), [fog, plain]);
  const before = raw.data.get(K.history); raw.writes.length = 0; session.retain(fog); assert.ok(session.retry());
  assert.equal(raw.data.get(K.history), before); assert.deepEqual(raw.writes, []);
  const decoded = readHistoryState(storage, K.history); assert.ok(decoded.ok); assert.equal(decoded.rows[0].identity.ruleset.id, FOG_SKIRMISH_RULESET_ID);
  const bad = clone(fog); bad.identity.ruleset.id = FOG_RULESET_ID;
  assert.throws(() => session.retain(bad)); assert.equal(session.pendingCount(), 0); assert.equal(raw.data.get(K.history), before);
  raw.data.set(K.history, '  ' + JSON.stringify([bad]) + '\n'); const unknownBytes = raw.data.get(K.history);
  session.retain(fog); assert.equal(session.retry(), false); assert.equal(session.reason(), 'malformed');
  assert.equal(raw.data.get(K.history), unknownBytes); assert.deepEqual(raw.writes, []);
});

test('restart keeps supported fog identity but resets memory, time, purchases and resources without changing earned data', () => {
  const game = remembered(), raw = backend(entries(earned())), before = new Map(raw.data), storage = createStorage(() => raw), slot = createSaveSession(storage, K.battle);
  const restart = new Game({ rulesetId: game.ruleset.id, rulesetRevision: game.ruleset.revision, mapId: game.map.id, mapRevision: game.map.revision, difficulty: game.difficulty, seed: game.seed, ai: game.ai });
  assert.ok(slot.claim()); assert.ok(writeBattle(slot, K.battle, restart));
  const saved = decodeBattle(raw.data.get(K.battle)).game;
  assert.equal(saved.ruleset.id, FOG_SKIRMISH_RULESET_ID); assert.equal(saved.state.time, 0); assert.equal(saved.tick, 0); assert.deepEqual(saved.state.gold, [420, 420]);
  assert.deepEqual(saved.state.fog, { version: 1, sides: [{ structures: [], citadel: null }, { structures: [], citadel: null }] });
  assert.ok(saved.state.citadelOptions.sides.every(s => s.choice === null && s.purchasedAt === null && s.healedTotal === 0 && s.extraShots === 0));
  for (const key of [K.campaign, K.trials, K.settings, K.history]) assert.equal(raw.data.get(key), before.get(key));
});

test('paid fog citadel checkpoint failure is retryable without a duplicate charge or lost prior save', () => {
  const game = fresh(), raw = backend(), profile = current(raw), storage = createStorage(() => profile.storage), slot = createSaveSession(storage, K.battle);
  assert.ok(slot.claim()); assert.ok(writeBattle(slot, K.battle, game)); const original = raw.data.get(K.battle), gold = game.state.gold[0];
  assert.ok(game.buyCitadelOption('regen').ok); assert.equal(game.state.gold[0], gold - 190); const bought = game.serialize();
  const set = raw.setItem; raw.setItem = (key, value) => { if (key === K.battle) throw Error('quota'); set(key, value); };
  assert.equal(writeBattle(slot, K.battle, game), false); assert.equal(raw.data.get(K.battle), original); assert.deepEqual(game.serialize(), bought);
  raw.setItem = set; assert.ok(writeBattle(slot, K.battle, game)); assert.deepEqual(decodeBattle(raw.data.get(K.battle)).game.serialize(), bought);
  assert.equal(game.buyCitadelOption('arrows').ok, false); assert.deepEqual(game.serialize(), bought);
});

test('a stale same-protocol battle slot cannot overwrite a newer fog or ordinary checkpoint', () => {
  for (const nextGame of [fresh(), new Game({ rulesetId: DEFAULT_SKIRMISH_RULESET_ID, ai: false, seed: 14 })]) {
    const raw = backend(), profile = current(raw), storage = createStorage(() => profile.storage);
    const old = createSaveSession(storage, K.battle); assert.ok(old.claim()); assert.ok(writeBattle(old, K.battle, fresh()));
    const next = createSaveSession(storage, K.battle); assert.ok(next.claim()); nextGame.update(.05); assert.ok(writeBattle(next, K.battle, nextGame));
    const before = [...raw.data]; raw.writes.length = 0;
    assert.equal(writeBattle(old, K.battle, remembered()), false); assert.deepEqual([...raw.data], before); assert.deepEqual(raw.writes, []);
  }
});

test('every existing ordinary map/endgame/bridge combination retains its save identity and earned-profile round trip', () => {
  const ids = ['frontier-citadel-open', 'frontier-citadel-timed', 'frontier-citadel-bridge-open', 'frontier-citadel-bridge-timed'];
  for (const mapId of Object.keys(MAPS)) for (const rulesetId of ids) {
    const game = new Game({ rulesetId, mapId, ai: false, seed: 35 }), saved = encodeBattle(game);
    assert.equal(game.state.fog, undefined); assert.deepEqual(decodeBattle(saved).game.serialize(), game.serialize());
    const data = { ...earned(), battle: saved, history: [...earned().history, row(game)] };
    assert.deepEqual(parseBackup(createBackup(backend(entries(data)), { createdAt: date })).data, data);
  }
  const legacy = new Game({ ai: false }); assert.equal(encodeBattle(legacy).version, 2); assert.deepEqual(decodeBattle(encodeBattle(legacy)).game.serialize(), legacy.serialize());
});
