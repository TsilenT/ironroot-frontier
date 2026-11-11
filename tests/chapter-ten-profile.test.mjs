import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import * as released from './fixtures/profile-session-v039.js';
import {createProfileSession, CURRENT_PROFILE_PROTOCOL_VERSION as VERSION, PROFILE_MARKER_KEY as MARKER} from './fixtures/profile-session-v0401.js';
import {createBackup, parseBackup, restoreBackup, BACKUP_STORAGE_KEYS as KEYS} from '../dist/backup.js';
import * as campaign from '../dist/campaign.js';
import {encodeBattle, decodeBattle, identityOf} from '../dist/battle-codec.js';

const COMMIT = 'd27e45c296875bc74735698a02e033e11e7ff57c';
const TREE = 'c266840dd6528a4089145ad404709ab6b13b1cb1';
const RELEASED_SHA256 = 'edcb542e6035ff87e8786922c10396cd29f624ee09c6033f2dccb8b3059f8e42';
const keys = Object.values(KEYS);
const marker = (version, phase = 'ready', epoch = 'earned') => JSON.stringify({format:'ironroot-profile', version, phase, epoch});
function backend(entries = []) {
  const data = new Map(entries), calls = [];
  return {data, calls,
    getItem(key) { calls.push(['get', key]); return data.get(key) ?? null; },
    setItem(key, value) { calls.push(['set', key]); data.set(key, String(value)); },
    removeItem(key) { calls.push(['remove', key]); data.delete(key); },
  };
}
let epoch = 0;
const current = raw => createProfileSession(() => raw, {requiredProtocolVersion:VERSION, newEpoch:() => `chapter-ten-${++epoch}`});
const old = raw => released.createProfileSession(() => raw, {requiredProtocolVersion:30, newEpoch:() => `released-${++epoch}`});
const opaque = () => keys.map((key, i) => [key, `  earned opaque ${i} \n\t`]);
const domainBytes = raw => keys.map(key => raw.data.get(key) ?? null);
function blocked(profile, raw) {
  const before = [...raw.data];
  raw.calls.length = 0;
  for (const storage of [profile.storage, profile.importStorage]) for (const key of keys) {
    for (const action of [() => storage.getItem(key), () => storage.setItem(key, 'lost'), () => storage.removeItem(key)]) {
      const start = raw.calls.length;
      assert.throws(action);
      assert.ok(raw.calls.slice(start).every(([, touched]) => touched === MARKER), 'check the fence before touching any earned domain');
      assert.deepEqual([...raw.data], before);
    }
  }
  assert.equal(profile.beginImport().ok, false);
  assert.deepEqual([...raw.data], before);
}
const chapterIds = ['below-the-ramparts', 'the-last-granary', 'no-fires-tonight', 'carry-the-crossing', 'the-last-engine'];
const earned = () => ({...campaign.createCampaignProgress(), missions:Object.fromEntries(campaign.CAMPAIGN_PROGRESS_MISSIONS.filter(m => m.id !== 'the-last-engine').map(m => [m.id, {completed:true, stars:1, bestTime:60}]))});
function dataFor(game, id) {
  const progress = earned(), scenario = campaign.campaignScenarioForGame(game, id);
  return {campaign:progress, trials:{}, settings:{sound:false}, history:[{won:false, draw:false, difficulty:game.difficulty, time:game.state.time, kills:game.state.stats.kills[0], built:game.state.stats.built[0], date:'2026-11-10T00:00:00.000Z', identity:identityOf(game, scenario)}], battle:encodeBattle(game, scenario, {campaignProgress:progress})};
}
function backupFor(data) {
  return createBackup(backend(Object.entries(KEYS).map(([domain, key]) => [key, JSON.stringify(data[domain])])), {createdAt:'2026-11-10T00:00:00.000Z'});
}

test('protocol31 changes only the marker fence from the literal released0.39 protocol30 writer', () => {
  const bytes = readFileSync(new URL('./fixtures/profile-session-v039.js', import.meta.url));
  const provenance = JSON.parse(readFileSync(new URL('./fixtures/chapter-ten-parent-v039.json', import.meta.url)));
  assert.equal(provenance.commit, COMMIT); assert.equal(provenance.tree, TREE);
  assert.equal(provenance.profileSessionSha256, RELEASED_SHA256);
  assert.equal(createHash('sha256').update(bytes).digest('hex'), RELEASED_SHA256);
  assert.equal(released.CURRENT_PROFILE_PROTOCOL_VERSION, 30); assert.equal(VERSION, 31);
  const expected = bytes.toString().replace('CURRENT_PROFILE_PROTOCOL_VERSION = 30', 'CURRENT_PROFILE_PROTOCOL_VERSION = 31')
    .replace('original-target checkpoints and exact result identities from older writers.', 'original-target checkpoints and exact result identities from older writers; protocol 31 fences Chapter Ten progress, fog and crossing checkpoints, Last Engine aftermath and exact result identities from older writers.')
    .replace('28, 29, 30].includes', '28, 29, 30, 31].includes').replace('28, 29 or 30.', '28, 29, 30 or 31.');
  assert.equal(readFileSync(new URL('./fixtures/profile-session-v0401.js', import.meta.url), 'utf8'), expected);
});

test('absent and ready markers1..30 upgrade only the marker while preserving exact opaque five-domain bytes', () => {
  for (const version of [null, ...Array.from({length:30}, (_, i) => i + 1)]) {
    const raw = backend([...(version === null ? [] : [[MARKER, marker(version)]]), ...opaque(), ['unrelated', 'untouched']]);
    const before = domainBytes(raw), profile = current(raw);
    assert.equal(profile.status().canWrite, true);
    const upgraded = JSON.parse(raw.data.get(MARKER));
    assert.equal(upgraded.version, 31); assert.equal(upgraded.phase, 'ready');
    if (version !== null) assert.equal(upgraded.epoch, 'earned');
    assert.deepEqual(domainBytes(raw), before); assert.equal(raw.data.get('unrelated'), 'untouched');
    assert.deepEqual(raw.calls.filter(([op]) => op !== 'get'), [['set', MARKER]]);
    assert.ok(raw.calls.every(([, key]) => key === MARKER));
    for (const [key, bytes] of opaque()) assert.equal(profile.storage.getItem(key), bytes);
    raw.calls.length = 0; assert.equal(current(raw).status().canWrite, true);
    assert.ok(raw.calls.every(([op, key]) => op === 'get' && key === MARKER));
  }
});

test('actual released30 sessions opened before and after upgrade are fenced before every five-domain operation and import', () => {
  const raw = backend([[MARKER, marker(30)], ...opaque()]), existing = old(raw);
  assert.equal(existing.status().canWrite, true); assert.equal(current(raw).status().canWrite, true);
  for (const writer of [existing, old(raw)]) {
    blocked(writer, raw);
    assert.equal(writer.beginImport({recover:true}).code, 'unsupported-protocol');
  }
});

test('a released30 owned import cannot touch domains after a newer marker takes ownership', () => {
  const raw = backend([[MARKER, marker(30)], ...opaque()]), writer = old(raw);
  assert.equal(writer.beginImport().ok, true);
  // Explicit synthetic competing-tab fixture: a newer restoration has replaced the old import marker.
  raw.data.set(MARKER, marker(31, 'ready', 'newer-restoration'));
  blocked(writer, raw);
  assert.equal(writer.finishImport({outcome:'rolled-back'}).ok, false);
  assert.equal(raw.data.get(MARKER), marker(31, 'ready', 'newer-restoration'));
});

test('future32, failed and restoring markers stay held with untouched opaque data', () => {
  for (const version of Array.from({length:32}, (_, i) => i + 1)) for (const phase of ['ready', 'restoring', 'failed']) {
    if (phase === 'ready' && version < 32) continue;
    const raw = backend([[MARKER, marker(version, phase)], ...opaque()]), before = [...raw.data], profile = current(raw);
    assert.equal(profile.status().canWrite, false); blocked(profile, raw);
    assert.deepEqual([...raw.data], before);
    if (version === 32) assert.equal(profile.beginImport({recover:true}).code, 'unsupported-protocol');
  }
});

for (const fault of ['rejected', 'unverified', 'competing']) test(`marker upgrade ${fault} keeps every domain held`, () => {
  const raw = backend([[MARKER, marker(30)], ...opaque()]), before = domainBytes(raw), set = raw.setItem.bind(raw), get = raw.getItem.bind(raw);
  let unreadable = false;
  raw.setItem = (key, value) => {
    if (key !== MARKER) return set(key, value);
    if (fault === 'rejected') throw Error('quota');
    set(key, fault === 'competing' ? marker(31, 'ready', 'competing') : value);
    if (fault === 'unverified') unreadable = true;
  };
  raw.getItem = key => { if (unreadable && key === MARKER) throw Error('read denied'); return get(key); };
  const profile = current(raw); assert.equal(profile.status().canWrite, false); blocked(profile, raw);
  unreadable = false; assert.equal(profile.status().canWrite, false);
  assert.deepEqual(domainBytes(raw), before);
});

test('a marker write that throws after verified success upgrades without touching earned domains', () => {
  const raw = backend([[MARKER, marker(30)], ...opaque()]), set = raw.setItem.bind(raw), before = domainBytes(raw);
  raw.setItem = (key, value) => { set(key, value); if (key === MARKER) throw Error('after write'); };
  assert.equal(current(raw).status().canWrite, true); assert.deepEqual(domainBytes(raw), before);
});

for (const id of chapterIds) test(`${id}: exact production checkpoint, result identity, backup import and fresh Restart roundtrip`, () => {
  const game = campaign.createProgressionCampaignMission(id, earned());
  for (let i = 0; i < 200; i++) game.update(.05);
  const data = dataFor(game, id), raw = backend([[MARKER, marker(30)], ...Object.entries(KEYS).map(([domain, key]) => [key, JSON.stringify(data[domain])])]);
  const source = current(raw), backup = createBackup(source.storage), parsed = parseBackup(backup);
  assert.deepEqual(parsed.data, data); assert.deepEqual(parsed.data.history[0].identity.scenario, {kind:'campaign', id, revision:1});
  const restored = decodeBattle(parsed.data.battle, {campaignProgress:data.campaign}).game;
  assert.deepEqual(restored.serialize(), game.serialize());
  if (id === 'no-fires-tonight') assert.deepEqual(restored.state.fog, game.state.fog);
  if (id === 'carry-the-crossing') { assert.ok(game.state.campaignControl); assert.deepEqual(restored.state.campaignControl, game.state.campaignControl); }
  for (let i = 0; i < 20; i++) { game.update(.05); restored.update(.05); assert.deepEqual(restored.serialize(), game.serialize()); }
  assert.deepEqual(campaign.createCampaignRestart(restored, id).serialize(), campaign.createCampaignMission(id).serialize());
  const destination = backend([[MARKER, marker(30)], ...opaque()]), importer = current(destination);
  assert.equal(importer.beginImport().ok, true); assert.equal(restoreBackup(importer.importStorage, backup).ok, true);
  assert.equal(importer.finishImport({outcome:'restored'}).ok, true); assert.equal(importer.status().canWrite, false);
  assert.deepEqual(parseBackup(createBackup(current(destination).storage)).data, data);
  blocked(old(destination), destination);
});

for (let failAt = 1; failAt <= 5; failAt++) for (const afterWrite of [false, true]) test(`five-domain import fault${failAt} ${afterWrite ? 'after' : 'before'} write restores exact bytes and absence`, () => {
  const backup = backupFor(dataFor(campaign.createCampaignMission('no-fires-tonight'), 'no-fires-tonight'));
  const raw = backend([[MARKER, marker(30)], ...opaque().filter((_, i) => i % 2 === 0), ['unrelated', 'untouched']]);
  const before = domainBytes(raw), set = raw.setItem.bind(raw); let writes = 0, failed = false;
  raw.setItem = (key, value) => {
    if (key !== MARKER && !failed && ++writes === failAt) { failed = true; if (afterWrite) set(key, value); throw Error('injected one-time quota fault'); }
    set(key, value);
  };
  const importer = current(raw); assert.equal(importer.beginImport().ok, true);
  const result = restoreBackup(importer.importStorage, backup);
  assert.equal(result.ok, false); assert.equal(result.code, 'write-failed-rolled-back'); assert.equal(result.rollback.complete, true);
  assert.equal(result.failedKey, keys[failAt - 1]); assert.deepEqual(domainBytes(raw), before);
  assert.equal(importer.finishImport({outcome:'rolled-back'}).ok, true); assert.equal(importer.status().canWrite, true);
  assert.equal(JSON.parse(raw.data.get(MARKER)).version, 31); assert.equal(raw.data.get('unrelated'), 'untouched');
  blocked(old(raw), raw);
});

test('failed battle removal restores all domains, including the exact old battle bytes', () => {
  const data = dataFor(campaign.createCampaignMission('no-fires-tonight'), 'no-fires-tonight'); data.battle = null;
  const raw = backend([[MARKER, marker(31)], ...opaque()]), before = domainBytes(raw), remove = raw.removeItem.bind(raw);
  let failed = false;
  raw.removeItem = key => { remove(key); if (key === KEYS.battle && !failed) { failed = true; throw Error('after removal'); } };
  const importer = current(raw); assert.equal(importer.beginImport().ok, true);
  const result = restoreBackup(importer.importStorage, backupFor(data));
  assert.equal(result.ok, false); assert.equal(result.rollback.complete, true); assert.deepEqual(domainBytes(raw), before);
  assert.equal(importer.finishImport({outcome:'rolled-back'}).ok, true);
});

test('unrestored bytes leave a failed marker and block both current and released writers', () => {
  const backup = backupFor(dataFor(campaign.createCampaignMission('no-fires-tonight'), 'no-fires-tonight'));
  const raw = backend([[MARKER, marker(31)], ...opaque()]), set = raw.setItem.bind(raw); let writes = 0;
  raw.setItem = (key, value) => { if (key !== MARKER && ++writes >= 2) throw Error('persistent quota fault'); set(key, value); };
  const importer = current(raw); assert.equal(importer.beginImport().ok, true);
  const result = restoreBackup(importer.importStorage, backup);
  assert.equal(result.code, 'rollback-incomplete'); assert.equal(result.rollback.complete, false);
  assert.deepEqual(result.rollback.unrestoredKeys, [KEYS.campaign]);
  assert.equal(importer.finishImport({outcome:'failed'}).phase, 'failed');
  assert.equal(JSON.parse(raw.data.get(MARKER)).phase, 'failed');
  blocked(importer, raw); blocked(current(raw), raw); blocked(old(raw), raw);
});

test('synthetic core-dead active finale aftermath survives all five domains and deterministic continuation; terminal saves are rejected', () => {
  const id = 'the-last-engine', game = campaign.createCampaignMission(id);
  // Explicit synthetic persistence fixture, not a paid route or route outcome claim.
  game.state.buildings = []; game.state.units = []; game.state.bases[1].hp = 0; game.update(.05);
  assert.equal(game.state.colossus.phase, 'active'); assert.equal(game.state.winner, null);
  const data = dataFor(game, id), backup = backupFor(data), raw = backend([[MARKER, marker(30)], ...opaque()]), importer = current(raw);
  assert.equal(importer.beginImport().ok, true); assert.equal(restoreBackup(importer.importStorage, backup).ok, true);
  assert.equal(importer.finishImport({outcome:'restored'}).ok, true);
  const parsed = parseBackup(createBackup(current(raw).storage)); assert.deepEqual(parsed.data, data);
  const restored = decodeBattle(parsed.data.battle, {campaignProgress:data.campaign}).game;
  assert.deepEqual(restored.serialize(), game.serialize());
  for (let i = 0; i < 100; i++) { game.update(.05); restored.update(.05); assert.deepEqual(restored.serialize(), game.serialize()); }
  const boss = restored.state.units.find(unit => unit.type === 'colossus'); restored._damage(boss, boss.hp, 0); restored.update(.05);
  assert.equal(restored.state.colossus.phase, 'defeated'); assert.equal(restored.state.winner, 0);
  assert.throws(() => encodeBattle(restored, campaign.campaignScenarioForGame(restored, id), {campaignProgress:data.campaign}), error => error.code === 'ended-battle');
  assert.deepEqual(campaign.createCampaignRestart(restored, id).serialize(), campaign.createCampaignMission(id).serialize());
});

test('protocol31 successful import stays restoring and unreadable until marker finalization is verified', () => {
  const data = dataFor(campaign.createCampaignMission('no-fires-tonight'), 'no-fires-tonight'), raw = backend([[MARKER, marker(30)], ...opaque()]);
  const importer = current(raw), set = raw.setItem.bind(raw);
  assert.equal(importer.beginImport().ok, true); assert.equal(restoreBackup(importer.importStorage, backupFor(data)).ok, true);
  let refuse = true;
  raw.setItem = (key, value) => { if (key === MARKER && JSON.parse(value).phase === 'ready' && refuse) throw Error('marker quota'); set(key, value); };
  assert.equal(importer.finishImport({outcome:'restored'}).ok, false);
  assert.equal(importer.status().phase, 'restoring'); assert.equal(importer.status().canWrite, false);
  assert.throws(() => importer.storage.getItem(KEYS.battle)); assert.throws(() => importer.importStorage.getItem(KEYS.battle));
  assert.equal(importer.finishImport({outcome:'rolled-back'}).code, 'outcome-conflict');
  assert.equal(current(raw).status().canWrite, false); blocked(old(raw), raw);
  refuse = false; assert.equal(importer.finishImport({outcome:'restored'}).ok, true);
  assert.deepEqual(parseBackup(createBackup(current(raw).storage)).data, data);
});

test('synthetic partially earned two-road control survives backup and deterministic continuation', () => {
  const id = 'carry-the-crossing', game = campaign.createCampaignMission(id);
  for (let i = 0; i < 200; i++) game.update(.05);
  // Explicit synthetic persistence fixture, not a paid crossing route claim.
  game.state.campaignControl = {bridges:[{owner:0, capturing:1, progress:.75}, {owner:0, capturing:null, progress:0}], heldSeconds:5};
  const data = dataFor(game, id), parsed = parseBackup(backupFor(data)), restored = decodeBattle(parsed.data.battle, {campaignProgress:data.campaign}).game;
  assert.deepEqual(restored.state.campaignControl, game.state.campaignControl);
  assert.equal(restored.state.campaignControl.heldSeconds, 5);
  assert.equal(restored.state.campaignControl.bridges[0].progress, .75);
  for (let i = 0; i < 20; i++) { game.update(.05); restored.update(.05); assert.deepEqual(restored.serialize(), game.serialize()); }
  assert.deepEqual(campaign.createCampaignRestart(restored, id).state.campaignControl, {bridges:[{owner:null, capturing:null, progress:0}, {owner:null, capturing:null, progress:0}], heldSeconds:0});
});
