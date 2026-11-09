import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {Game, DEFAULT_SKIRMISH_RULESET_ID} from '../dist/engine.js';
import {createProfileSession, CURRENT_PROFILE_PROTOCOL_VERSION, PROFILE_MARKER_KEY as MARKER} from '../dist/profile-session.js';
import * as protocolFifteen from './fixtures/profile-session-v0241.js';
import {createBackup, parseBackup, restoreBackup, BACKUP_STORAGE_KEYS as K} from '../dist/backup.js';
import {encodeBattle, identityOf} from '../dist/battle-codec.js';
import {validateHistoryRow} from '../dist/history-codec.js';
import {createStorage, createSaveSession, createHistorySession, createPreferenceSession, writeBattle} from '../dist/persistence.js';
import {CAMPAIGN_PROGRESS_MISSIONS, createCampaignProgress, createProgressionCampaignMission, campaignScenarioForGame, normalizeCampaignProgress, recordCampaignResult, writeCampaignProgress, getProgressionCampaignOverview, getCampaignLaunchMission} from '../dist/campaign.js';
import {CURRENT_CHALLENGES} from '../dist/challenges.js';

const BORROWED_GROUND_RULESET_ID = 'frontier-campaign-borrowed-ground';
const id = 'borrowed-ground', date = '2026-11-08T00:00:00.000Z', keys = Object.values(K);
const marker = (version, phase = 'ready', epoch = 'earned-profile') => JSON.stringify({format:'ironroot-profile', version, epoch, phase});
function backend(entries = []) {
  const data = new Map(entries), reads = [], writes = [];
  return {data, reads, writes,
    getItem(key) { reads.push(key); return data.get(key) ?? null; },
    setItem(key, value) { writes.push(['set', key, value]); data.set(key, value); },
    removeItem(key) { writes.push(['remove', key]); data.delete(key); },
  };
}
const current = (raw, epoch = 'borrowed-ground-import') => createProfileSession(() => raw, {requiredProtocolVersion:CURRENT_PROFILE_PROTOCOL_VERSION, newEpoch:() => epoch});
const previous = raw => protocolFifteen.createProfileSession(() => raw, {requiredProtocolVersion:15});
const domains = raw => [...raw.data].filter(([key]) => key !== MARKER);
const entries = data => Object.entries(K).filter(([domain]) => data[domain] !== null).map(([domain, key]) => [key, '  ' + JSON.stringify(data[domain]) + '\n']);
const row = (game, scenario) => ({won:true, draw:false, difficulty:game.difficulty, time:game.state.time, kills:game.state.stats.kills[0], built:game.state.stats.built[0], date, identity:identityOf(game, scenario)});
function progress(includeBorrowed = true) {
  return {...createCampaignProgress(), missions:Object.fromEntries(CAMPAIGN_PROGRESS_MISSIONS.filter(m => m.id!=='the-long-screen'&&m.id!=='the-hammer-turns'&&m.id!=='salt-in-the-stores'&&m.id!=='the-archers-quay'&&(m.id !== 'through-the-reed-beds' && m.id !== 'the-road-we-know' && m.id !== 'false-quiet' && m.id !== 'a-river-between-us' && (includeBorrowed || m.id !== id))).map((m, i) => [m.id, {completed:true, stars:i % 3 + 1, bestTime:60 + i}]))};
}
/** Synthetic persistence fixture, not evidence of a played or balanced match. */
function earned(includeBorrowed = true) {
  const campaign = progress(includeBorrowed), mission = includeBorrowed ? id : 'lanterns-on-the-water';
  const game = createProgressionCampaignMission(mission, campaign), scenario = campaignScenarioForGame(game, mission);
  assert.ok(game.buyCitadelOption('arrows').ok);
  return {
    campaign,
    trials:Object.fromEntries(CURRENT_CHALLENGES.map((c, i) => [c.id, {completed:true, bestTime:70 + i}])),
    settings:{sound:false, music:false, sfx:true, volume:.3, reducedMotion:true, quality:'low', keyboard:{version:1, bindings:{build1:'KeyQ', volley:null}}, skirmishBridgeIncome:true},
    history:[{won:true, draw:false, challengeId:'shieldbreaker', campaignId:null, difficulty:'normal', time:75, kills:12, built:5, date}, row(game, scenario)],
    battle:encodeBattle(game, scenario, {campaignProgress:campaign}),
  };
}
function assertBlocked(profile, raw) {
  const before = [...raw.data]; raw.reads.length = 0; raw.writes.length = 0;
  assert.equal(profile.status().canWrite, false);
  for (const key of keys) for (const storage of [profile.storage, profile.importStorage]) {
    assert.throws(() => storage.getItem(key));
    assert.throws(() => storage.setItem(key, '{}'));
    assert.throws(() => storage.removeItem(key));
  }
  assert.equal(profile.beginImport().ok, false);
  assert.deepEqual(raw.writes, []); assert.deepEqual([...raw.data], before);
  assert.ok(raw.reads.every(key => key === MARKER), 'reject before reading any earned domain');
}

test('protocol20 pins the exact current v0.24.1 protocol15 source without changing storage or default format identities', () => {
  assert.equal(CURRENT_PROFILE_PROTOCOL_VERSION, 24); assert.equal(protocolFifteen.CURRENT_PROFILE_PROTOCOL_VERSION, 15);
  assert.equal(createHash('sha256').update(readFileSync(new URL('./fixtures/profile-session-v0241.js', import.meta.url))).digest('hex'), '0b337448ccd44c6acade10b99ec2bd5566f8847171190528e77daf9df34094a2');
  const priorSource = readFileSync(new URL('./fixtures/profile-session-v0241.js', import.meta.url), 'utf8');
  const markerOnlySource = priorSource
    .replace('CURRENT_PROFILE_PROTOCOL_VERSION = 15', 'CURRENT_PROFILE_PROTOCOL_VERSION = 16')
    .replace('explicit result identities from older writers.', 'explicit result identities from older writers; protocol 16 fences Borrowed Ground campaign progress, checkpoints and explicit result identities from older writers.')
    .replace('13, 14, 15].includes', '13, 14, 15, 16].includes')
    .replace('13, 14 or 15.', '13, 14, 15 or 16.');
  assert.equal(readFileSync(new URL('./fixtures/profile-session-v0250.js', import.meta.url), 'utf8'), markerOnlySource, 'only protocol admission and its description advance; barrier logic stays exact');
  assert.equal(MARKER, 'ironroot.profile.v1');
  assert.deepEqual(K, {campaign:'ironroot.campaign.v1', trials:'ironroot.trials.v1', settings:'ironroot.settings.v1', history:'ironroot.history.v1', battle:'ironroot.battle.v1'});
  for (let version = 1; version <= CURRENT_PROFILE_PROTOCOL_VERSION; version++) {
    const raw = backend(); assert.ok(createProfileSession(() => raw, {requiredProtocolVersion:version}).status().canWrite);
  }
  assert.throws(() => createProfileSession(() => backend(), {requiredProtocolVersion:CURRENT_PROFILE_PROTOCOL_VERSION + 1}), TypeError);
  const raw = backend(), legacy = createProfileSession(() => raw, {newEpoch:() => 'legacy-default'});
  assert.deepEqual(raw.writes, []); assert.ok(legacy.beginImport().ok); assert.equal(JSON.parse(raw.data.get(MARKER)).version, 1);
});

test('every supported ready profile upgrades only its marker and never normalizes earned bytes', () => {
  for (const version of [null, ...Array.from({length:CURRENT_PROFILE_PROTOCOL_VERSION}, (_, i) => i + 1)]) {
    const data = keys.map(key => [key, `  retained opaque ${key} bytes\n`]);
    const raw = backend([...(version === null ? [] : [[MARKER, marker(version)]]), ...data, ['unrelated', 'untouched']]);
    const before = domains(raw), profile = current(raw);
    assert.ok(profile.status().canWrite);
    assert.deepEqual(JSON.parse(raw.data.get(MARKER)), {format:'ironroot-profile', version:CURRENT_PROFILE_PROTOCOL_VERSION, epoch:version === null ? 'borrowed-ground-import' : 'earned-profile', phase:'ready'});
    assert.deepEqual(raw.writes.map(write => write[1]), version === CURRENT_PROFILE_PROTOCOL_VERSION ? [] : [MARKER]);
    assert.deepEqual(domains(raw), before); assert.ok(raw.reads.every(key => key === MARKER));
    raw.reads.length = 0; raw.writes.length = 0;
    assert.ok(current(raw).status().canWrite); assert.deepEqual(raw.writes, []); assert.ok(raw.reads.every(key => key === MARKER));
    for (const [key, value] of data) assert.equal(profile.storage.getItem(key), value);
  }
});

test('actual open and reopened v0.24.1 writers cannot discard Borrowed Ground stars, settings, results or checkpoint', () => {
  const data = earned(), raw = backend([[MARKER, marker(15)], ...entries(data), ['unrelated', 'untouched']]);
  const old = previous(raw), storage = createStorage(() => old.storage), slot = createSaveSession(storage, K.battle);
  assert.ok(slot.claim());
  const preferences = createPreferenceSession(storage, K.settings, {canWrite:() => old.status().canWrite}); preferences.stage({sound:true});
  const history = createHistorySession(storage, K.history, {canWrite:() => old.status().canWrite}); history.retain(row(new Game({ai:false})));
  const before = domains(raw), writer = current(raw);
  assert.ok(writer.status().canWrite); assert.deepEqual(raw.writes, [['set', MARKER, marker(CURRENT_PROFILE_PROTOCOL_VERSION)]]); assert.deepEqual(domains(raw), before);
  for (const stale of [old, previous(raw)]) {
    assertBlocked(stale, raw); assert.equal(stale.beginImport({recover:true}).code, 'unsupported-protocol');
    assert.equal(restoreBackup(stale.importStorage, createBackup(backend(), {createdAt:date})).ok, false);
  }
  const fenced = [...raw.data]; raw.writes.length = 0;
  assert.equal(writeCampaignProgress(storage, createCampaignProgress()), false);
  assert.equal(preferences.retry(), false); assert.equal(history.retry(), false);
  assert.equal(writeBattle(slot, K.battle, new Game({ai:false})), false);
  assert.deepEqual(raw.writes, []); assert.deepEqual([...raw.data], fenced);
  assert.deepEqual(parseBackup(createBackup(writer.storage, {createdAt:date})).data, data);
});

test('unfinished, future21 and failed or unverifiable upgrades retain all five domains', () => {
  for (const version of [15, CURRENT_PROFILE_PROTOCOL_VERSION, CURRENT_PROFILE_PROTOCOL_VERSION + 1]) for (const phase of ['ready', 'restoring', 'failed']) {
    if (phase === 'ready' && version <= CURRENT_PROFILE_PROTOCOL_VERSION) continue;
    const raw = backend([[MARKER, marker(version, phase)], ...entries(earned())]), before = [...raw.data], profile = current(raw);
    assert.deepEqual(raw.writes, []); assertBlocked(profile, raw); assert.deepEqual([...raw.data], before);
    if (version === CURRENT_PROFILE_PROTOCOL_VERSION + 1) assert.equal(profile.beginImport({recover:true}).code, 'unsupported-protocol');
  }
  for (const fault of ['drop', 'throw', 'readback', 'competing']) {
    const raw = backend([[MARKER, marker(15)], ...entries(earned())]), before = domains(raw), get = raw.getItem, set = raw.setItem;
    let unreadable = false;
    raw.getItem = key => { if (key === MARKER && unreadable) throw Error('readback unavailable'); return get(key); };
    raw.setItem = (key, value) => {
      if (key !== MARKER) return set(key, value);
      if (fault === 'drop') return;
      if (fault === 'throw') throw Error('quota');
      set(key, fault === 'competing' ? marker(CURRENT_PROFILE_PROTOCOL_VERSION, 'ready', 'another-tab') : value); unreadable = fault === 'readback';
    };
    const profile = current(raw); assertBlocked(profile, raw); assert.deepEqual(domains(raw), before);
    raw.getItem = get; raw.setItem = set; assertBlocked(profile, raw);
    assert.equal(profile.beginImport({recover:true}).ok, false);
    assert.ok(current(raw).status().canWrite); assert.deepEqual(domains(raw), before);
  }
});

test('old earned progress stays exact, unlocks Borrowed Ground and records explicit Borrowed Ground results without schema migration', () => {
  const old = earned(false), raw = backend([[MARKER, marker(15)], ...entries(old)]), before = domains(raw), profile = current(raw);
  assert.deepEqual(domains(raw), before); assert.deepEqual(parseBackup(createBackup(profile.storage, {createdAt:date})).data, old);
  const overview = getProgressionCampaignOverview(old.campaign);
  assert.equal(overview.total, 31); assert.equal(overview.maxStars, 93); assert.equal(overview.nextMissionId, id); assert.equal(overview.completed, false);
  assert.equal(overview.chapters.find(chapter => chapter.id === 'river-compact').total, 5);
  assert.equal(getCampaignLaunchMission('lanterns-on-the-water', old.campaign).reward, 'Unlocks Borrowed Ground');
  assert.equal(getCampaignLaunchMission(id, old.campaign).reward, 'Unlocks A River Between Us');
  assert.equal(old.campaign.missions[id], undefined); assert.deepEqual(normalizeCampaignProgress(old.campaign), old.campaign);
  const game = createProgressionCampaignMission(id, old.campaign), scenario = campaignScenarioForGame(game, id);
  assert.deepEqual(scenario, {kind:'campaign', id, revision:1}); assert.equal(game.ruleset.id, BORROWED_GROUND_RULESET_ID);
  game.state.bases[1].hp = 0;
  const recorded = recordCampaignResult(old.campaign, id, game), result = row(game, scenario);
  assert.deepEqual(validateHistoryRow(result), result);
  const {identity, ...identityless} = result;
  assert.throws(() => validateHistoryRow({...identityless, campaignId:id}), /unknown campaign/);
  for (const [mission, value] of Object.entries(old.campaign.missions)) assert.deepEqual(recorded.missions[mission], value);
  assert.deepEqual(recorded.missions[id], {completed:true, stars:3, bestTime:0});
  const final = getProgressionCampaignOverview(recorded); assert.equal(final.completed, false); assert.equal(final.nextMissionId, 'a-river-between-us');
  assert.ok(writeCampaignProgress(createStorage(() => profile.storage), recorded));
  assert.equal(JSON.parse(raw.data.get(K.campaign)).version, 1);
  const data = earned(); assert.equal(data.battle.version, 3); assert.equal(data.battle.game.version, 3);
  const backup = parseBackup(createBackup(backend(entries(data)), {createdAt:date})); assert.equal(backup.version, 2); assert.deepEqual(backup.data, data);
});

test('verified Borrowed Ground backup replacement retains all domains and fences pending current writers until reload', () => {
  const data = earned(), text = createBackup(backend(entries(data)), {createdAt:date});
  const raw = backend([[MARKER, marker(15)], ...entries(earned(false)), ['unrelated', 'untouched']]);
  const importer = current(raw), stale = current(raw, 'stale-current'), storage = createStorage(() => stale.storage), slot = createSaveSession(storage, K.battle);
  assert.ok(slot.claim());
  const preferences = createPreferenceSession(storage, K.settings, {canWrite:() => stale.status().canWrite}); preferences.stage({sound:true});
  const history = createHistorySession(storage, K.history, {canWrite:() => stale.status().canWrite}); history.retain(row(new Game({rulesetId:DEFAULT_SKIRMISH_RULESET_ID})));
  assert.ok(importer.beginImport().ok); assert.ok(restoreBackup(importer.importStorage, text).ok); assert.ok(importer.finishImport({outcome:'restored'}).ok);
  const before = [...raw.data]; raw.writes.length = 0;
  assert.equal(importer.status().canWrite, false); assert.equal(stale.status().canWrite, false);
  assert.equal(writeCampaignProgress(storage, createCampaignProgress()), false); assert.equal(preferences.retry(), false); assert.equal(history.retry(), false);
  assert.equal(writeBattle(slot, K.battle, new Game({ai:false})), false); assert.equal(stale.beginImport().ok, false);
  assert.deepEqual([...raw.data], before); assert.deepEqual(raw.writes, []);
  const loaded = current(raw); assert.ok(loaded.status().canWrite); assert.deepEqual(parseBackup(createBackup(loaded.storage, {createdAt:date})).data, data);
  assert.equal(JSON.parse(raw.data.get(MARKER)).version, CURRENT_PROFILE_PROTOCOL_VERSION); assert.equal(raw.data.get('unrelated'), 'untouched'); assertBlocked(previous(raw), raw);
});

test('replacement faults in each save domain roll back exact prior bytes while retaining protocol20 fencing', () => {
  const replacement = earned(), text = createBackup(backend(entries(replacement)), {createdAt:date});
  for (const failedKey of keys) for (const fault of ['throw-before', 'throw-after', 'drop']) {
    const raw = backend([[MARKER, marker(15)], ...entries(earned(false)), ['unrelated', 'untouched']]);
    const before = domains(raw), importer = current(raw), stale = current(raw, 'stale-import');
    assert.ok(importer.beginImport().ok); const set = raw.setItem; let pending = true;
    raw.setItem = (key, value) => {
      if (key === failedKey && pending) {
        pending = false; if (fault === 'drop') return;
        if (fault === 'throw-after') set(key, value);
        throw Error('quota');
      }
      set(key, value);
    };
    const restored = restoreBackup(importer.importStorage, text);
    assert.equal(restored.ok, false, `${failedKey}/${fault}`); assert.equal(restored.rollback.complete, true, `${failedKey}/${fault}`);
    assert.deepEqual(domains(raw), before); assert.ok(importer.finishImport({outcome:'rolled-back'}).ok);
    assert.ok(importer.status().canWrite); assert.equal(stale.status().canWrite, false);
    assert.equal(JSON.parse(raw.data.get(MARKER)).version, CURRENT_PROFILE_PROTOCOL_VERSION); assertBlocked(previous(raw), raw);
  }
});

test('historical backups retain exact normalized data without inventing Borrowed Ground progress or identities', () => {
  for (const fixture of ['backup-v0.7-format.json', 'backup-v0.9-format.json']) {
    const text = readFileSync(new URL(`./fixtures/${fixture}`, import.meta.url), 'utf8'), expected = parseBackup(text);
    const raw = backend([[MARKER, marker(15)], ...entries(earned()), ['unrelated', 'untouched']]), importer = current(raw);
    assert.ok(importer.beginImport().ok); assert.ok(restoreBackup(importer.importStorage, text).ok); assert.ok(importer.finishImport({outcome:'restored'}).ok);
    const exported = parseBackup(createBackup(current(raw).storage, {createdAt:expected.createdAt}));
    assert.deepEqual(exported, expected); assert.equal(exported.data.campaign.missions[id], undefined); assert.equal(exported.data.battle?.game.state.fog, undefined);
    assert.ok(exported.data.history.every(result => result.identity?.ruleset.id !== BORROWED_GROUND_RULESET_ID));
    assert.equal(JSON.parse(raw.data.get(MARKER)).version, CURRENT_PROFILE_PROTOCOL_VERSION); assert.equal(raw.data.get('unrelated'), 'untouched'); assertBlocked(previous(raw), raw);
  }
});
