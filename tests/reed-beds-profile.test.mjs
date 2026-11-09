import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {Game, DEFAULT_SKIRMISH_RULESET_ID} from '../dist/engine.js';
import {createProfileSession, CURRENT_PROFILE_PROTOCOL_VERSION, PROFILE_MARKER_KEY as MARKER} from '../dist/profile-session.js';
import * as protocolNineteen from './fixtures/profile-session-v0280.js';
import {createBackup, parseBackup, restoreBackup, BACKUP_STORAGE_KEYS as K} from '../dist/backup.js';
import {encodeBattle, decodeBattle, identityOf, validateBattleIdentity} from '../dist/battle-codec.js';
import {validateHistoryRow} from '../dist/history-codec.js';
import {createStorage, createSaveSession, createHistorySession, createPreferenceSession, writeBattle} from '../dist/persistence.js';
import {CAMPAIGN_PROGRESS_MISSIONS, isMissionUnlocked, getCampaignTargets, evaluateCampaignMission, createCampaignProgress, createCampaignMission, createCampaignRestart, getCampaignMission, createProgressionCampaignMission, campaignScenarioForGame, normalizeCampaignProgress, recordCampaignResult, writeCampaignProgress, getProgressionCampaignOverview, getCampaignLaunchMission} from '../dist/campaign.js';
import {CURRENT_CHALLENGES} from '../dist/challenges.js';

const REED_BEDS_RULESET_ID = 'frontier-campaign-reed-beds';
const id = 'through-the-reed-beds', date = '2026-11-09T00:00:00.000Z', keys = Object.values(K);
const marker = (version, phase = 'ready', epoch = 'earned-profile') => JSON.stringify({format:'ironroot-profile', version, epoch, phase});
function backend(entries = []) {
  const data = new Map(entries), reads = [], writes = [];
  return {data, reads, writes,
    getItem(key) { reads.push(key); return data.get(key) ?? null; },
    setItem(key, value) { writes.push(['set', key, value]); data.set(key, value); },
    removeItem(key) { writes.push(['remove', key]); data.delete(key); },
  };
}
const current = (raw, epoch = 'through-the-reed-beds-import') => createProfileSession(() => raw, {requiredProtocolVersion:CURRENT_PROFILE_PROTOCOL_VERSION, newEpoch:() => epoch});
const previous = raw => protocolNineteen.createProfileSession(() => raw, {requiredProtocolVersion:19});
const domains = raw => [...raw.data].filter(([key]) => key !== MARKER);
const entries = data => Object.entries(K).filter(([domain]) => data[domain] !== null).map(([domain, key]) => [key, '  ' + JSON.stringify(data[domain]) + '\n']);
const row = (game, scenario) => ({won:true, draw:false, difficulty:game.difficulty, time:game.state.time, kills:game.state.stats.kills[0], built:game.state.stats.built[0], date, identity:identityOf(game, scenario)});
function progress(includeReed = true) {
  return {...createCampaignProgress(), missions:Object.fromEntries(CAMPAIGN_PROGRESS_MISSIONS.filter(m => m.id!=='the-hammer-turns'&&m.id!=='salt-in-the-stores'&&m.id!=='the-archers-quay'&&(includeReed || m.id !== id)).map((m, i) => [m.id, {completed:true, stars:i % 3 + 1, bestTime:60 + i}]))};
}
/** Synthetic persistence fixture, not evidence of a played or balanced match. */
function earned(includeReed = true) {
  const campaign = progress(includeReed), mission = includeReed ? id : 'the-road-we-know';
  const game = mission === id ? createCampaignMission(id) : createProgressionCampaignMission(mission, campaign), scenario = campaignScenarioForGame(game, mission);
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

test('protocol20 pins exact recovered profile19 and changes only admission and descriptive copy', () => {
  assert.equal(CURRENT_PROFILE_PROTOCOL_VERSION, 23);
  assert.equal(protocolNineteen.CURRENT_PROFILE_PROTOCOL_VERSION, 19);
  const source = readFileSync(new URL('./fixtures/profile-session-v0280.js', import.meta.url), 'utf8');
  assert.equal(createHash('sha256').update(source).digest('hex'), '6ac7fb1530c568ca462e558c3c6ae806f1cfd62f01285a83c69e1d13609201fe');
  const expected = source.replace('CURRENT_PROFILE_PROTOCOL_VERSION = 19', 'CURRENT_PROFILE_PROTOCOL_VERSION = 20')
    .replace('twin-span checkpoints and explicit result identities from older writers.', 'twin-span checkpoints and explicit result identities from older writers; protocol 20 fences Through the Reed Beds campaign progress, clear-view checkpoints and explicit result identities from older writers.')
    .replace('17, 18, 19].includes', '17, 18, 19, 20].includes').replace('17, 18 or 19.', '17, 18, 19 or 20.');
  assert.equal(readFileSync(new URL('./fixtures/profile-session-v0290.js', import.meta.url), 'utf8'), expected);
  assert.equal(MARKER, 'ironroot.profile.v1');
  assert.deepEqual(K, {campaign:'ironroot.campaign.v1', trials:'ironroot.trials.v1', settings:'ironroot.settings.v1', history:'ironroot.history.v1', battle:'ironroot.battle.v1'});
  for (let version = 1; version <= 20; version++) { const raw = backend(); assert.ok(createProfileSession(() => raw, {requiredProtocolVersion:version}).status().canWrite); }
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
    assert.deepEqual(JSON.parse(raw.data.get(MARKER)), {format:'ironroot-profile', version:CURRENT_PROFILE_PROTOCOL_VERSION, epoch:version === null ? 'through-the-reed-beds-import' : 'earned-profile', phase:'ready'});
    assert.deepEqual(raw.writes.map(write => write[1]), version === CURRENT_PROFILE_PROTOCOL_VERSION ? [] : [MARKER]);
    assert.deepEqual(domains(raw), before); assert.ok(raw.reads.every(key => key === MARKER));
    raw.reads.length = 0; raw.writes.length = 0;
    assert.ok(current(raw).status().canWrite); assert.deepEqual(raw.writes, []); assert.ok(raw.reads.every(key => key === MARKER));
    for (const [key, value] of data) assert.equal(profile.storage.getItem(key), value);
  }
});

test('actual open and reopened v0.28.0 writers cannot discard Through the Reed Beds stars, settings, results or checkpoint', () => {
  const data = earned(), raw = backend([[MARKER, marker(19)], ...entries(data), ['unrelated', 'untouched']]);
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
  for (const version of [19, CURRENT_PROFILE_PROTOCOL_VERSION, CURRENT_PROFILE_PROTOCOL_VERSION + 1]) for (const phase of ['ready', 'restoring', 'failed']) {
    if (phase === 'ready' && version <= CURRENT_PROFILE_PROTOCOL_VERSION) continue;
    const raw = backend([[MARKER, marker(version, phase)], ...entries(earned())]), before = [...raw.data], profile = current(raw);
    assert.deepEqual(raw.writes, []); assertBlocked(profile, raw); assert.deepEqual([...raw.data], before);
    if (version === CURRENT_PROFILE_PROTOCOL_VERSION + 1) assert.equal(profile.beginImport({recover:true}).code, 'unsupported-protocol');
  }
  for (const fault of ['drop', 'throw', 'readback', 'competing']) {
    const raw = backend([[MARKER, marker(19)], ...entries(earned())]), before = domains(raw), get = raw.getItem, set = raw.setItem;
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

test('old earned progress stays exact, unlocks Through the Reed Beds and records explicit Through the Reed Beds results without schema migration', () => {
  const old = earned(false), raw = backend([[MARKER, marker(19)], ...entries(old)]), before = domains(raw), profile = current(raw);
  assert.deepEqual(domains(raw), before); assert.deepEqual(parseBackup(createBackup(profile.storage, {createdAt:date})).data, old);
  const overview = getProgressionCampaignOverview(old.campaign);
  assert.equal(overview.total, 30); assert.equal(overview.maxStars, 90); assert.equal(overview.nextMissionId, id); assert.equal(overview.completed, false);
  assert.equal(overview.chapters.find(c=>c.id==='unlit-roads').total, 3);
  assert.equal(getCampaignLaunchMission('the-road-we-know', old.campaign).reward, 'Unlocks Through the Reed Beds');
  assert.ok(getCampaignLaunchMission(id, old.campaign).reward);
  assert.equal(old.campaign.missions[id], undefined); assert.deepEqual(normalizeCampaignProgress(old.campaign), old.campaign);
  const game = createCampaignMission(id), scenario = campaignScenarioForGame(game, id);
  assert.deepEqual(scenario, {kind:'campaign', id, revision:1}); assert.equal(game.ruleset.id, REED_BEDS_RULESET_ID);
  game.state.bases[1].hp = 0;
  const recorded = recordCampaignResult(old.campaign, id, game), result = row(game, scenario);
  assert.deepEqual(validateHistoryRow(result), result);
  const {identity, ...identityless} = result;
  assert.throws(() => validateHistoryRow({...identityless, campaignId:id}), /unknown campaign/);
  for (const [mission, value] of Object.entries(old.campaign.missions)) assert.deepEqual(recorded.missions[mission], value);
  assert.deepEqual(recorded.missions[id], {completed:true, stars:3, bestTime:0});
  const final = getProgressionCampaignOverview(recorded); assert.equal(final.completed, false); assert.equal(final.nextMissionId, 'the-archers-quay');
  assert.ok(writeCampaignProgress(createStorage(() => profile.storage), recorded));
  assert.equal(JSON.parse(raw.data.get(K.campaign)).version, 1);
  const data = earned(); assert.equal(data.battle.version, 3); assert.equal(data.battle.game.version, 3);
  const backup = parseBackup(createBackup(backend(entries(data)), {createdAt:date})); assert.equal(backup.version, 2); assert.deepEqual(backup.data, data);
});

test('verified Through the Reed Beds backup replacement retains all domains and fences pending current writers until reload', () => {
  const data = earned(), text = createBackup(backend(entries(data)), {createdAt:date});
  const raw = backend([[MARKER, marker(19)], ...entries(earned(false)), ['unrelated', 'untouched']]);
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

test('replacement faults in each save domain roll back exact prior bytes while retaining current protocol fencing', () => {
  const replacement = earned(), text = createBackup(backend(entries(replacement)), {createdAt:date});
  for (const failedKey of keys) for (const fault of ['throw-before', 'throw-after', 'drop']) {
    const raw = backend([[MARKER, marker(19)], ...entries(earned(false)), ['unrelated', 'untouched']]);
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

test('historical backups retain exact normalized data without inventing Through the Reed Beds progress or identities', () => {
  for (const fixture of ['backup-v0.7-format.json', 'backup-v0.9-format.json']) {
    const text = readFileSync(new URL(`./fixtures/${fixture}`, import.meta.url), 'utf8'), expected = parseBackup(text);
    assert.deepEqual(expected.data.history.map(validateHistoryRow), expected.data.history);
    if (expected.data.battle) assert.deepEqual(decodeBattle(expected.data.battle, {campaignProgress:expected.data.campaign}).game.serialize(), expected.data.battle.game);
    const raw = backend([[MARKER, marker(19)], ...entries(earned()), ['unrelated', 'untouched']]), importer = current(raw);
    assert.ok(importer.beginImport().ok); assert.ok(restoreBackup(importer.importStorage, text).ok); assert.ok(importer.finishImport({outcome:'restored'}).ok);
    const exported = parseBackup(createBackup(current(raw).storage, {createdAt:expected.createdAt}));
    assert.deepEqual(exported, expected); assert.equal(exported.data.campaign.missions[id], undefined); assert.equal(exported.data.battle?.game.state.fog, undefined);
    assert.ok(exported.data.history.every(result => result.identity?.ruleset.id !== REED_BEDS_RULESET_ID));
    assert.equal(JSON.parse(raw.data.get(MARKER)).version, CURRENT_PROFILE_PROTOCOL_VERSION); assert.equal(raw.data.get('unrelated'), 'untouched'); assertBlocked(previous(raw), raw);
  }
});


test('all already-open and reopened older protocol writers fail before domain access', () => {
  for (let version = 1; version <= 19; version++) {
    const raw = backend([[MARKER, marker(version)], ...keys.map(key => [key, `opaque ${key}`])]);
    const stale = protocolNineteen.createProfileSession(() => raw, {requiredProtocolVersion:version});
    assert.ok(stale.status().canWrite);
    assert.ok(current(raw).status().canWrite);
    assertBlocked(stale, raw);
    assertBlocked(protocolNineteen.createProfileSession(() => raw, {requiredProtocolVersion:version}), raw);
  }
});

test('Through the Reed Beds retains exact checkpoint and history identities, restart identity and earned mission key', () => {
  const campaign = progress(false);
  assert.equal(getCampaignMission(id).rulesetId, REED_BEDS_RULESET_ID, 'preview retains authored ruleset');
  assert.deepEqual(getCampaignMission(id).prerequisites, ['the-road-we-know']);
  {
    const game = createCampaignMission(id), scenario = campaignScenarioForGame(game, id);
    assert.equal(game.ruleset.id, REED_BEDS_RULESET_ID);
    for (let i = 0; i < 23; i++) game.update(.05);
    assert.equal(game.ai, true);
    assert.deepEqual(Object.keys(game.buildings).sort(), ['barracks','archery','foundry','watchtower','mint','sanctum','aerie','wardenLodge'].sort());
    assert.equal(game.ruleset.revision, 1);
    assert.equal(getCampaignMission(id).timeLimit, 600);
    const envelope = encodeBattle(game, scenario, {campaignProgress:campaign});
    assert.deepEqual(envelope.scenario, {kind:'campaign', id, revision:1});
    assert.equal(envelope.game.mapId, 'classic'); assert.equal(envelope.game.mapRevision, 1);
    const restored = decodeBattle(envelope, {campaignProgress:campaign});
    assert.deepEqual(restored.game.serialize(), game.serialize());
    assert.deepEqual(identityOf(restored.game, scenario), identityOf(game, scenario));
    const result = row(restored.game, scenario);
    assert.deepEqual(validateHistoryRow(result), result);
    const restarted = createCampaignRestart(restored.game, id);
    assert.deepEqual(identityOf(restarted, scenario), identityOf(game, scenario));
    assert.deepEqual(restarted.serialize(), createCampaignMission(id).serialize());
    const data = earned(false); data.battle = envelope; data.history.push(result);
    const text = createBackup(backend(entries(data)), {createdAt:date});
    assert.deepEqual(parseBackup(text).data, data);
    const raw = backend([[MARKER, marker(19)], ...entries(earned(false))]), importer = current(raw);
    assert.ok(importer.beginImport().ok); assert.ok(restoreBackup(importer.importStorage, text).ok); assert.ok(importer.finishImport({outcome:'restored'}).ok);
    const reexport = parseBackup(createBackup(current(raw).storage, {createdAt:date}));
    assert.deepEqual(reexport.data, data);
    assert.deepEqual(decodeBattle(reexport.data.battle, {campaignProgress:campaign}).game.serialize(), game.serialize());
    game.state.bases[1].hp = 0;
    const recorded = recordCampaignResult(campaign, id, game);
    assert.ok(recorded.missions[id]?.completed);
    assert.deepEqual(Object.keys(recorded.missions).filter(key => key.startsWith('through-the-reed-beds')), [id]);
    for (const [key, value] of Object.entries(campaign.missions)) assert.deepEqual(recorded.missions[key], value);
  }
});

// Direct identity-only checks matter because history must reject relabelled Reed
// rows even when no Game is instantiated. All boundary paths use one codec.
const wrongIdentities = [
  ['map id', x => x.map.id = 'twin-span'],
  ['map revision', x => x.map.revision = 2],
  ['ruleset id', x => x.ruleset.id = DEFAULT_SKIRMISH_RULESET_ID],
  ['ruleset revision', x => x.ruleset.revision = 2],
  ['scenario id', x => x.scenario.id = 'the-road-we-know'],
  ['scenario kind', x => x.scenario = {kind:'skirmish', id:'standard', revision:1}],
  ['scenario revision', x => x.scenario.revision = 2],
];
for (const [label, mutate] of wrongIdentities) test(`Reed ${label} mismatch rejects through identity, history, battle and backup boundaries`, () => {
  const campaign = progress(false), game = createCampaignMission(id), scenario = campaignScenarioForGame(game, id);
  const valid = identityOf(game, scenario), changed = structuredClone(valid); mutate(changed);
  assert.throws(() => validateBattleIdentity(changed));
  const result = {...row(game, scenario), identity:changed};
  assert.throws(() => validateHistoryRow(result));
  const envelope = encodeBattle(game, scenario, {campaignProgress:campaign}), battle = structuredClone(envelope);
  Object.assign(battle.game, {rulesetId:changed.ruleset.id, rulesetRevision:changed.ruleset.revision, mapId:changed.map.id, mapRevision:changed.map.revision});
  battle.scenario = changed.scenario;
  assert.throws(() => decodeBattle(battle, {campaignProgress:campaign}));
  const backup = JSON.parse(createBackup(backend(), {createdAt:date, campaign, history:[row(game, scenario)], battle:envelope}));
  for (const domain of ['history', 'battle']) {
    const invalid = structuredClone(backup); invalid.data[domain] = domain === 'history' ? [result] : battle;
    assert.throws(() => parseBackup(JSON.stringify(invalid)));
    const destination = backend([[K.settings, 'original bytes']]);
    assert.equal(restoreBackup(destination, JSON.stringify(invalid)).ok, false);
    assert.deepEqual(destination.reads, []); assert.deepEqual(destination.writes, []);
    assert.equal(destination.data.get(K.settings), 'original bytes');
  }
});

test('Reed requires explicit modern history and battle identities, including in backups', () => {
  const campaign = progress(false), game = createCampaignMission(id), scenario = campaignScenarioForGame(game, id);
  const {identity, ...statistics} = row(game, scenario), legacy = {...statistics, challengeId:null, campaignId:id};
  assert.throws(() => validateHistoryRow(legacy), /unknown campaign/);
  const text = JSON.parse(createBackup(backend(), {createdAt:date, campaign, history:[row(game, scenario)]}));
  text.data.history = [legacy]; assert.throws(() => parseBackup(JSON.stringify(text)), /unknown campaign/);
  const envelope = encodeBattle(game, scenario, {campaignProgress:campaign});
  const identityless = {format:'ironroot-save', version:2, campaignId:id, challengeId:null, game:envelope.game};
  assert.throws(() => decodeBattle(identityless, {campaignProgress:campaign}));
  assert.throws(() => decodeBattle(envelope.game, {campaignProgress:campaign}));
});

test('one-star Road completion unlocks Reed without changing earned records or requiring three stars', () => {
  const campaign = progress(false);
  for (const record of Object.values(campaign.missions)) record.stars = 1;
  assert.equal(campaign.missions[id], undefined);
  assert.equal(campaign.missions['the-road-we-know'].stars, 1);
  const before = structuredClone(campaign);
  assert.ok(isMissionUnlocked(campaign, id));
  assert.ok(getCampaignLaunchMission(id, campaign));
  assert.equal(createProgressionCampaignMission(id, campaign).ruleset.id, REED_BEDS_RULESET_ID);
  assert.deepEqual(campaign, before);
  delete campaign.missions['the-road-we-know'];
  assert.equal(isMissionUnlocked(campaign, id), false);
  assert.throws(() => createProgressionCampaignMission(id, campaign), /locked/);
});

test('partial Reed checkpoint stores existing engine fields only and keeps original destruction credit across reload', () => {
  const campaign = progress(false), game = createCampaignMission(id), scenario = campaignScenarioForGame(game, id);
  const original = getCampaignTargets(game, id)[0];
  game.state.buildings = game.state.buildings.filter(b => b.id !== original.originalId);
  const before = evaluateCampaignMission(game, id);
  assert.equal(before.completed, false); assert.equal(before.objectives[0].value, 1);
  assert.equal(before.objectives[0].required, 2); assert.equal(before.objectives[0].target, 3);
  const saved = encodeBattle(game, scenario, {campaignProgress:campaign});
  assert.deepEqual(Object.keys(saved.game).sort(), Object.keys(new Game({rulesetId:DEFAULT_SKIRMISH_RULESET_ID}).serialize()).sort());
  assert.deepEqual(Object.keys(saved.game.state).sort(), Object.keys(new Game({rulesetId:DEFAULT_SKIRMISH_RULESET_ID}).serialize().state).sort());
  for (const key of ['fog', 'campaignControl', 'reserve', 'reedDestroyed', 'destroyedTargets']) assert.equal(Object.hasOwn(saved.game.state, key), false);
  const restored = decodeBattle(saved, {campaignProgress:campaign});
  assert.deepEqual(restored.game.serialize(), game.serialize());
  assert.deepEqual(evaluateCampaignMission(restored.game, id), before);
  const result = row(restored.game, scenario), backup = createBackup(backend(), {createdAt:date, campaign, history:[result], battle:saved});
  const raw = backend([[MARKER, marker(19)], ...entries(earned(false))]), importer = current(raw);
  assert.ok(importer.beginImport().ok); assert.ok(restoreBackup(importer.importStorage, backup).ok);
  assert.ok(importer.finishImport({outcome:'restored'}).ok);
  const reopened = parseBackup(createBackup(current(raw).storage, {createdAt:date}));
  assert.deepEqual(reopened.data.battle, saved); assert.deepEqual(reopened.data.history, [result]);
  assert.deepEqual(evaluateCampaignMission(decodeBattle(reopened.data.battle, {campaignProgress:campaign}).game, id), before);
});

test('only the verified current importer may read, set or remove all five domains and ownership loss stops it immediately', () => {
  const raw = backend([[MARKER, marker(19)], ...keys.map(key => [key, `old ${key}`])]);
  const owner = current(raw), other = current(raw, 'other-import');
  assert.ok(owner.beginImport().ok); assert.equal(owner.status().ownsImport, true);
  const before = [...raw.data]; raw.reads.length = 0; raw.writes.length = 0;
  for (const key of keys) {
    for (const facade of [owner.storage, other.storage, other.importStorage]) {
      assert.throws(() => facade.getItem(key)); assert.throws(() => facade.setItem(key, 'forbidden')); assert.throws(() => facade.removeItem(key));
    }
  }
  assert.equal(other.beginImport().ok, false); assert.deepEqual([...raw.data], before); assert.deepEqual(raw.writes, []);
  assert.ok(raw.reads.every(key => key === MARKER));
  for (const key of keys) {
    assert.equal(owner.importStorage.getItem(key), `old ${key}`);
    owner.importStorage.setItem(key, `new ${key}`); assert.equal(raw.data.get(key), `new ${key}`);
    owner.importStorage.removeItem(key); assert.equal(raw.data.has(key), false);
  }
  raw.data.set(MARKER, marker(20, 'restoring', 'newer-owner'));
  const lost = [...raw.data]; raw.reads.length = 0; raw.writes.length = 0;
  for (const key of keys) for (const facade of [owner.storage, owner.importStorage]) {
    assert.throws(() => facade.getItem(key)); assert.throws(() => facade.setItem(key, 'forbidden')); assert.throws(() => facade.removeItem(key));
  }
  assert.equal(owner.finishImport({outcome:'rolled-back'}).ok, false);
  assert.deepEqual([...raw.data], lost); assert.deepEqual(raw.writes, []); assert.ok(raw.reads.every(key => key === MARKER));
});

test('verified throw-after-write profile20 upgrade succeeds, but no current session silently rebinds after replacement', () => {
  const raw = backend([[MARKER, marker(19)], ...keys.map(key => [key, `opaque ${key}`])]), before = domains(raw), set = raw.setItem;
  raw.setItem = (key, value) => { set(key, value); if (key === MARKER) throw Error('after-write'); };
  const owner = current(raw); assert.ok(owner.status().canWrite); assert.deepEqual(domains(raw), before);
  raw.setItem = set;
  const stale = current(raw, 'stale-owner');
  assert.ok(owner.beginImport().ok); assert.ok(owner.finishImport({outcome:'restored'}).ok);
  const replaced = [...raw.data]; raw.writes.length = 0;
  for (const profile of [owner, stale]) {
    assert.equal(profile.status().canWrite, false); assert.equal(profile.status().reloadRequired, true);
    for (const key of keys) {
      assert.throws(() => profile.storage.setItem(key, 'stale')); assert.throws(() => profile.storage.removeItem(key));
      for (const method of ['getItem', 'setItem', 'removeItem']) assert.throws(() => profile.importStorage[method](key, 'stale'));
    }
    assert.equal(profile.beginImport().ok, false); assert.equal(profile.beginImport({recover:true}).ok, false);
  }
  assert.deepEqual([...raw.data], replaced); assert.deepEqual(raw.writes, []);
  const reloaded = current(raw); assert.ok(reloaded.status().canWrite);
  for (const key of keys) assert.equal(reloaded.storage.getItem(key), `opaque ${key}`);
});
