import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {Game, DEFAULT_SKIRMISH_RULESET_ID} from '../dist/engine.js';
import {createProfileSession, CURRENT_PROFILE_PROTOCOL_VERSION as VERSION, PROFILE_MARKER_KEY as MARKER} from '../dist/profile-session.js';
import * as actual24 from './fixtures/profile-session-v0330.js';
import * as actual23 from './fixtures/profile-session-v0320.js';
import {verifyHistoricalRuntime, historicalRoot} from '../qa/hammer-prototype/historical-runtime.mjs';
import {createStorage, createSaveSession, createHistorySession, createPreferenceSession, writeBattle} from '../dist/persistence.js';
import {createBackup, parseBackup, restoreBackup, BACKUP_STORAGE_KEYS as K} from '../dist/backup.js';
import {encodeBattle, decodeBattle, identityOf, validateBattleIdentity} from '../dist/battle-codec.js';
import {validateHistoryRow} from '../dist/history-codec.js';
import {CURRENT_CHALLENGES} from '../dist/challenges.js';
import {CAMPAIGN_PROGRESS_MISSIONS, createCampaignProgress, createCampaignMission, createCampaignRestart, createProgressionCampaignMission, getCampaignMission, getCampaignLaunchMission, getProgressionCampaignOverview, isMissionUnlocked, normalizeCampaignProgress, campaignScenarioForGame, evaluateCampaignMission, recordCampaignResult, writeCampaignProgress} from '../dist/campaign.js';

verifyHistoricalRuntime();
const actual22 = await import(new URL('dist/profile-session.js', historicalRoot));
const id = 'the-long-screen', rulesetId = 'frontier-campaign-long-screen';
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
const current = (raw, epoch = 'long-screen-import') => createProfileSession(() => raw, {requiredProtocolVersion:VERSION, newEpoch:() => epoch});
const hammer = raw => actual23.createProfileSession(() => raw, {requiredProtocolVersion:23});
const domains = raw => [...raw.data].filter(([key]) => key !== MARKER);
const opaque = () => keys.map(key => [key, `  retained opaque ${key} bytes\n`]);
const entries = data => Object.entries(K).filter(([domain]) => data[domain] !== null).map(([domain, key]) => [key, '  ' + JSON.stringify(data[domain]) + '\n']);
const row = (game, scenario = campaignScenarioForGame(game, id)) => ({won:true, draw:false, difficulty:game.difficulty, time:game.state.time, kills:game.state.stats.kills[0], built:game.state.stats.built[0], date, identity:identityOf(game, scenario)});
function progress(includeScreen = false) {
  return {...createCampaignProgress(), missions:Object.fromEntries(CAMPAIGN_PROGRESS_MISSIONS.filter(m => m.id !== 'the-shared-watch' && (includeScreen || m.id !== id)).map((m, i) => [m.id, {completed:true, stars:i % 3 + 1, bestTime:60 + i}]))};
}
/** Synthetic persistence data, not evidence of a played or balanced match. */
function earned(includeScreen = true) {
  const campaign = progress(includeScreen), mission = includeScreen ? id : 'the-hammer-turns';
  const game = createCampaignMission(mission), scenario = campaignScenarioForGame(game, mission);
  assert.ok(game.buyCitadelOption('arrows').ok);
  return {campaign,
    trials:Object.fromEntries(CURRENT_CHALLENGES.map((c, i) => [c.id, {completed:true, bestTime:70 + i}])),
    settings:{sound:false, music:false, sfx:true, volume:.3, reducedMotion:true, quality:'low', keyboard:{version:1, bindings:{build1:'KeyQ', volley:null}}, skirmishBridgeIncome:true},
    history:[row(game, scenario)], battle:encodeBattle(game, scenario, {campaignProgress:campaign})};
}
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

// The only executable historical addition is the actual Hammer profile writer.
// Its hash and Salt22 derivation remain independent literal source oracles.
test('Screen profile24 is exactly four marker-only substitutions from immutable actual Hammer23', () => {
  assert.equal(VERSION, 25); assert.equal(actual24.CURRENT_PROFILE_PROTOCOL_VERSION, 24); assert.equal(actual23.CURRENT_PROFILE_PROTOCOL_VERSION, 23);
  const source = readFileSync(new URL('./fixtures/profile-session-v0320.js', import.meta.url), 'utf8');
  assert.equal(createHash('sha256').update(source).digest('hex'), 'a6dc605e9ac55138c6fc0d54fb57229fba8f7972ad480a09ed1f32eec911d430');
  const expected = source.replace('CURRENT_PROFILE_PROTOCOL_VERSION = 23', 'CURRENT_PROFILE_PROTOCOL_VERSION = 24')
    .replace('paid siege commitments and explicit result identities from older writers.', 'paid siege commitments and explicit result identities from older writers; protocol 24 fences The Long Screen progress, clear-view checkpoints and explicit result identities from older writers.')
    .replace('21, 22, 23].includes', '21, 22, 23, 24].includes').replace('21, 22 or 23.', '21, 22, 23 or 24.');
  assert.equal(readFileSync(new URL('./fixtures/profile-session-v0330.js', import.meta.url), 'utf8'), expected);
  for (let version = 1; version <= 25; version++) {
    const raw = backend(); assert.ok(createProfileSession(() => raw, {requiredProtocolVersion:version}).status().canWrite);
  }
  assert.throws(() => createProfileSession(() => backend(), {requiredProtocolVersion:26}), TypeError);
});

test('Screen upgrades absent and every ready protocol1 through25 without reading or rewriting opaque earned bytes', () => {
  for (const version of [null, ...Array.from({length:25}, (_, i) => i + 1)]) {
    const raw = backend([...(version === null ? [] : [[MARKER, marker(version)]]), ...opaque(), ['unrelated', 'untouched']]);
    const before = domains(raw), profile = current(raw);
    assert.ok(profile.status().canWrite);
    assert.deepEqual(JSON.parse(raw.data.get(MARKER)), {format:'ironroot-profile', version:25, epoch:version === null ? 'long-screen-import' : 'earned-profile', phase:'ready'});
    assert.deepEqual(raw.writes.map(write => write[1]), version === 25 ? [] : [MARKER]);
    assert.deepEqual(domains(raw), before); assert.ok(raw.reads.every(key => key === MARKER));
    raw.reads.length = 0; raw.writes.length = 0;
    assert.ok(current(raw).status().canWrite); assert.deepEqual(raw.writes, []); assert.ok(raw.reads.every(key => key === MARKER));
    for (const [key, value] of before) assert.equal(profile.storage.getItem(key), value);
  }
});

test('actual open and reopened Hammer23 and Salt22 writers cannot discard any of five Screen domains', () => {
  for (const [version, module] of [[23, actual23], [22, actual22]]) {
    const data = earned(), raw = backend([[MARKER, marker(version)], ...entries(data), ['unrelated', 'untouched']]);
    const open = module.createProfileSession(() => raw, {requiredProtocolVersion:version}); assert.ok(open.status().canWrite);
    const storage = createStorage(() => open.storage), slot = createSaveSession(storage, K.battle); assert.ok(slot.claim());
    const preferences = createPreferenceSession(storage, K.settings, {canWrite:() => open.status().canWrite}); preferences.stage({sound:true});
    const history = createHistorySession(storage, K.history, {canWrite:() => open.status().canWrite}); history.retain(row(createCampaignMission('the-hammer-turns'), {kind:'campaign', id:'the-hammer-turns', revision:1}));
    const before = domains(raw), writer = current(raw); assert.ok(writer.status().canWrite); assert.deepEqual(domains(raw), before);
    for (const old of [open, module.createProfileSession(() => raw, {requiredProtocolVersion:version})]) {
      assertBlocked(old, raw); assert.equal(old.beginImport({recover:true}).code, 'unsupported-protocol');
      assert.equal(restoreBackup(old.importStorage, createBackup(backend(), {createdAt:date})).ok, false);
    }
    const protectedBytes = [...raw.data]; raw.writes.length = 0;
    assert.equal(writeCampaignProgress(storage, createCampaignProgress()), false);
    assert.equal(storage.set(K.trials, '{}'), false); assert.equal(storage.remove(K.trials), false);
    assert.equal(preferences.retry(), false); assert.equal(history.retry(), false);
    assert.equal(writeBattle(slot, K.battle, createCampaignMission('the-hammer-turns'), null, 'the-hammer-turns', {campaignProgress:data.campaign}), false);
    assert.deepEqual([...raw.data], protectedBytes); assert.deepEqual(raw.writes, []);
    assert.deepEqual(parseBackup(createBackup(writer.storage, {createdAt:date})).data, data);
  }
});

test('future malformed restoring and failed Screen markers never grant partial domain access', () => {
  for (const version of [1,22,23,24,25,99]) for (const phase of ['ready','restoring','failed']) {
    if (phase === 'ready' && version <= 25) continue;
    const raw = backend([[MARKER, marker(version, phase)], ...opaque()]), before = [...raw.data], profile = current(raw);
    assertBlocked(profile, raw); assert.deepEqual([...raw.data], before);
    if (version > 25) assert.equal(profile.beginImport({recover:true}).code, 'unsupported-protocol');
  }
  for (const invalid of ['{', '{}', '[]', marker(0), marker('24'), JSON.stringify({...JSON.parse(marker(24)), extra:true})]) {
    const raw = backend([[MARKER, invalid], ...opaque()]), before = [...raw.data]; assertBlocked(current(raw), raw); assert.deepEqual([...raw.data], before);
  }
});

for (const fault of ['drop','throw-before','throw-after','readback','competing']) test('Screen marker verification fault '+fault+' retains opaque domains and never silently rebinds', () => {
  const raw = backend([[MARKER, marker(23)], ...opaque()]), before = domains(raw), get = raw.getItem, set = raw.setItem;
  let unreadable = false;
  raw.getItem = key => { if (key === MARKER && unreadable) throw Error('unreadable'); return get(key); };
  raw.setItem = (key, value) => {
    if (key !== MARKER) return set(key, value);
    if (fault === 'drop') return;
    if (fault === 'throw-before') throw Error('quota');
    set(key, fault === 'competing' ? marker(24, 'ready', 'other-tab') : value);
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

test('old earned Hammer progress stays exact and one-star completion unlocks Screen as chapter8 fourth mission', () => {
  const data = earned(false), raw = backend([[MARKER, marker(23)], ...entries(data)]), before = domains(raw), profile = current(raw);
  assert.deepEqual(domains(raw), before); assert.deepEqual(parseBackup(createBackup(profile.storage, {createdAt:date})).data, data);
  assert.equal(data.campaign.missions[id], undefined); assert.deepEqual(normalizeCampaignProgress(data.campaign), data.campaign);
  const overview = getProgressionCampaignOverview(data.campaign), chapter = overview.chapters.find(c => c.id === 'siege-coast');
  assert.equal(overview.total, 32); assert.equal(overview.maxStars, 96); assert.equal(overview.nextMissionId, id); assert.equal(overview.completed, false);
  assert.equal(chapter.total, 5); assert.equal(chapter.maxStars, 15); assert.equal(chapter.completed, false);
  assert.deepEqual(getCampaignMission(id).prerequisites, ['the-hammer-turns']);
  assert.equal(getCampaignLaunchMission('the-hammer-turns', data.campaign).reward, 'Unlocks The Long Screen');
  const campaign = structuredClone(data.campaign); campaign.missions['the-hammer-turns'].stars = 1;
  const retained = structuredClone(campaign); assert.ok(isMissionUnlocked(campaign, id));
  assert.equal(createProgressionCampaignMission(id, campaign).ruleset.id, rulesetId); assert.deepEqual(campaign, retained);
  delete campaign.missions['the-hammer-turns']; assert.equal(isMissionUnlocked(campaign, id), false);
  assert.throws(() => createProgressionCampaignMission(id, campaign), /locked/);
});

test('genuine current Screen checkpoint save restore restart and result retain explicit identities and existing schemas', () => {
  const campaign = progress(), game = createProgressionCampaignMission(id, campaign), scenario = campaignScenarioForGame(game, id);
  assert.equal(getCampaignMission(id).seed, 8404); assert.equal(game.ruleset.id, rulesetId); assert.equal(game.ruleset.revision, 1);
  assert.deepEqual(scenario, {kind:'campaign', id, revision:1});
  assert.ok(game.buyCitadelOption('arrows').ok);
  const expectedIdentity = {ruleset:{id:rulesetId, revision:1}, map:{id:'classic', revision:1}, scenario};
  const raw = backend([[MARKER, marker(23)], [K.campaign, JSON.stringify(campaign)]]), profile = current(raw), storage = createStorage(() => profile.storage), slot = createSaveSession(storage, K.battle);
  assert.ok(slot.claim()); assert.ok(writeBattle(slot, K.battle, game, null, id, {campaignProgress:campaign}));
  const envelope = JSON.parse(raw.data.get(K.battle)); assert.equal(envelope.version, 3); assert.equal(envelope.game.version, 3);
  assert.deepEqual(Object.keys(envelope.game).sort(), Object.keys(new Game({rulesetId:DEFAULT_SKIRMISH_RULESET_ID}).serialize()).sort());
  assert.deepEqual(Object.keys(envelope.game.state).sort(), Object.keys(new Game({rulesetId:DEFAULT_SKIRMISH_RULESET_ID}).serialize().state).sort());
  const restored = decodeBattle(envelope, {campaignProgress:campaign});
  assert.deepEqual(restored.game.serialize(), game.serialize()); assert.deepEqual(restored.identity, expectedIdentity);
  assert.deepEqual(identityOf(createCampaignRestart(restored.game, id), scenario), expectedIdentity);
  assert.deepEqual(createCampaignRestart(restored.game, id).serialize(), createCampaignMission(id).serialize());
  const backed = parseBackup(createBackup(profile.storage, {createdAt:date})); assert.equal(backed.version, 2); assert.deepEqual(backed.data.battle, envelope);
  // Deliberate terminal fixture exercises recording; no gameplay/balance claim.
  restored.game.state.bases[1].hp = 0;
  assert.ok(evaluateCampaignMission(restored.game, id).completed);
  const result = row(restored.game, scenario), recorded = recordCampaignResult(campaign, id, restored.game);
  assert.deepEqual(validateHistoryRow(result), result); assert.deepEqual(result.identity, expectedIdentity);
  for (const [mission, value] of Object.entries(campaign.missions)) assert.deepEqual(recorded.missions[mission], value);
  assert.deepEqual(recorded.missions[id], {completed:true, stars:3, bestTime:0});
  assert.deepEqual(Object.keys(recorded.missions).filter(key => key.startsWith(id)), [id]);
  assert.ok(writeCampaignProgress(storage, recorded)); assert.equal(JSON.parse(raw.data.get(K.campaign)).version, 1);
  const history = createHistorySession(storage, K.history, {canWrite:() => profile.status().canWrite}); history.retain(result); assert.ok(history.retry());
  assert.deepEqual(JSON.parse(raw.data.get(K.history)), [result]);
  const finished = getProgressionCampaignOverview(recorded); assert.equal(finished.completed, false); assert.equal(finished.nextMissionId, 'the-shared-watch');
});

for (const [label, mutate] of [
  ['map id', x => x.map.id = 'twin-span'], ['map revision', x => x.map.revision = 2],
  ['ruleset id', x => x.ruleset.id = DEFAULT_SKIRMISH_RULESET_ID], ['ruleset revision', x => x.ruleset.revision = 2],
  ['scenario id', x => x.scenario.id = 'the-hammer-turns'],
  ['scenario kind', x => x.scenario = {kind:'skirmish', id:'standard', revision:1}], ['scenario revision', x => x.scenario.revision = 2],
]) test(`Screen ${label} mismatch rejects identity history battle and backup before destination access`, () => {
  const campaign = progress(), game = createCampaignMission(id), scenario = campaignScenarioForGame(game, id);
  const identity = structuredClone(identityOf(game, scenario)); mutate(identity); assert.throws(() => validateBattleIdentity(identity));
  const result = {...row(game, scenario), identity}; assert.throws(() => validateHistoryRow(result));
  const envelope = encodeBattle(game, scenario, {campaignProgress:campaign}), changed = structuredClone(envelope);
  Object.assign(changed.game, {rulesetId:identity.ruleset.id, rulesetRevision:identity.ruleset.revision, mapId:identity.map.id, mapRevision:identity.map.revision}); changed.scenario = identity.scenario;
  assert.throws(() => decodeBattle(changed, {campaignProgress:campaign}));
  const backup = JSON.parse(createBackup(backend(), {createdAt:date, campaign, history:[row(game, scenario)], battle:envelope}));
  for (const domain of ['history','battle']) {
    const invalid = structuredClone(backup); invalid.data[domain] = domain === 'history' ? [result] : changed;
    assert.throws(() => parseBackup(JSON.stringify(invalid)));
    const destination = backend([[K.settings, 'retained destination bytes']]);
    assert.equal(restoreBackup(destination, JSON.stringify(invalid)).ok, false); assert.deepEqual(destination.reads, []); assert.deepEqual(destination.writes, []);
    assert.equal(destination.data.get(K.settings), 'retained destination bytes');
  }
});

test('Screen history and checkpoints require modern explicit identities', () => {
  const campaign = progress(), game = createCampaignMission(id), scenario = campaignScenarioForGame(game, id);
  const {identity, ...statistics} = row(game, scenario), legacy = {...statistics, campaignId:id, challengeId:null};
  assert.throws(() => validateHistoryRow(legacy), /unknown campaign/);
  const backup = JSON.parse(createBackup(backend(), {createdAt:date, campaign, history:[row(game, scenario)]}));
  backup.data.history = [legacy]; assert.throws(() => parseBackup(JSON.stringify(backup)), /unknown campaign/);
  const envelope = encodeBattle(game, scenario, {campaignProgress:campaign});
  assert.throws(() => decodeBattle({format:'ironroot-save', version:2, campaignId:id, challengeId:null, game:envelope.game}, {campaignProgress:campaign}));
  assert.throws(() => decodeBattle(envelope.game, {campaignProgress:campaign}));
});

test('Screen backup replacement fences pending current owners until reload and retains same-version ready reads', () => {
  const data = earned(), text = createBackup(backend(entries(data)), {createdAt:date});
  const raw = backend([[MARKER, marker(23)], ...entries(earned(false)), ['unrelated', 'untouched']]), owner = current(raw), stale = current(raw, 'stale-owner');
  const storage = createStorage(() => stale.storage), slot = createSaveSession(storage, K.battle); assert.ok(slot.claim());
  const preferences = createPreferenceSession(storage, K.settings, {canWrite:() => stale.status().canWrite}); preferences.stage({sound:true});
  const history = createHistorySession(storage, K.history, {canWrite:() => stale.status().canWrite}); history.retain(row(createCampaignMission(id)));
  assert.ok(owner.beginImport().ok); assert.ok(restoreBackup(owner.importStorage, text).ok); assert.ok(owner.finishImport({outcome:'restored'}).ok);
  const before = [...raw.data]; raw.writes.length = 0;
  for (const profile of [owner, stale]) {
    assert.equal(profile.status().canWrite, false); assert.equal(profile.status().reloadRequired, true);
    for (const key of keys) {
      assert.equal(profile.storage.getItem(key), raw.data.get(key), 'existing same-version ready read contract');
      assert.throws(() => profile.storage.setItem(key, 'stale')); assert.throws(() => profile.storage.removeItem(key));
      for (const method of ['getItem','setItem','removeItem']) assert.throws(() => profile.importStorage[method](key, 'stale'));
    }
    assert.equal(profile.beginImport().ok, false); assert.equal(profile.beginImport({recover:true}).ok, false);
  }
  assert.equal(writeCampaignProgress(storage, createCampaignProgress()), false); assert.equal(storage.set(K.trials, '{}'), false);
  assert.equal(preferences.retry(), false); assert.equal(history.retry(), false);
  assert.equal(writeBattle(slot, K.battle, createCampaignMission(id), null, id, {campaignProgress:data.campaign}), false);
  assert.deepEqual([...raw.data], before); assert.deepEqual(raw.writes, []);
  assert.deepEqual(parseBackup(createBackup(current(raw).storage, {createdAt:date})).data, data);
  assert.equal(JSON.parse(raw.data.get(MARKER)).version, 25); assert.equal(raw.data.get('unrelated'), 'untouched'); assertBlocked(hammer(raw), raw);
});

test('Screen replacement faults roll back every domain exact byte and retain profile25 fencing', () => {
  const text = createBackup(backend(entries(earned())), {createdAt:date});
  for (const failedKey of keys) for (const fault of ['throw-before','throw-after','drop']) {
    const raw = backend([[MARKER, marker(23)], ...opaque(), ['unrelated', 'untouched']]), before = domains(raw), profile = current(raw), stale = current(raw, 'stale');
    assert.ok(profile.beginImport().ok); const set = raw.setItem; let pending = true;
    raw.setItem = (key, value) => {
      if (key === failedKey && pending) { pending = false; if (fault === 'drop') return; if (fault === 'throw-after') set(key, value); throw Error('quota'); }
      set(key, value);
    };
    const result = restoreBackup(profile.importStorage, text);
    assert.equal(result.ok, false, `${failedKey}/${fault}`); assert.equal(result.rollback.complete, true); assert.deepEqual(domains(raw), before);
    assert.ok(profile.finishImport({outcome:'rolled-back'}).ok); assert.ok(profile.status().canWrite); assert.equal(stale.status().canWrite, false);
    assert.equal(JSON.parse(raw.data.get(MARKER)).version, 25); assertBlocked(hammer(raw), raw);
  }
});

test('only the verified Screen importer may access five domains and ownership loss forbids writes and rollback', () => {
  const raw = backend([[MARKER, marker(23)], ...opaque()]), owner = current(raw), other = current(raw, 'other-import');
  assert.ok(owner.beginImport().ok); assert.equal(owner.status().ownsImport, true);
  assertBlocked(other, raw); const before = [...raw.data]; raw.reads.length = 0; raw.writes.length = 0;
  for (const key of keys) for (const method of ['getItem','setItem','removeItem']) assert.throws(() => owner.storage[method](key, 'forbidden'));
  assert.deepEqual([...raw.data], before); assert.deepEqual(raw.writes, []); assert.ok(raw.reads.every(key => key === MARKER));
  for (const key of keys) {
    assert.equal(owner.importStorage.getItem(key), `  retained opaque ${key} bytes\n`);
    owner.importStorage.setItem(key, `replacement ${key}`); assert.equal(raw.data.get(key), `replacement ${key}`);
    owner.importStorage.removeItem(key); assert.equal(raw.data.has(key), false);
  }
  raw.data.set(MARKER, marker(24, 'restoring', 'competing-owner'));
  const lost = [...raw.data]; assertBlocked(owner, raw); assert.equal(owner.finishImport({outcome:'rolled-back'}).ok, false);
  assert.deepEqual([...raw.data], lost); assert.deepEqual(raw.writes, []);
});

test('Screen finalization retry preserves outcome and verified restoration never silently rebinds its owner', () => {
  const raw = backend([[MARKER, marker(23)], ...opaque()]), owner = current(raw); assert.ok(owner.beginImport().ok);
  const set = raw.setItem; raw.setItem = (key, value) => { if (key !== MARKER) set(key, value); };
  assert.equal(owner.finishImport({outcome:'restored'}).ok, false);
  assert.equal(owner.finishImport({outcome:'rolled-back'}).code, 'outcome-conflict'); assert.equal(owner.status().canWrite, false);
  raw.setItem = set; assert.ok(owner.finishImport({outcome:'restored'}).ok); assert.equal(owner.status().canWrite, false);
  assert.equal(owner.status().reloadRequired, true); assert.ok(current(raw).status().canWrite); assertBlocked(hammer(raw), raw);
});

test('historical backup restore does not invent Screen progress checkpoint or result identities', () => {
  for (const fixture of ['backup-v0.7-format.json','backup-v0.9-format.json']) {
    const text = readFileSync(new URL(`./fixtures/${fixture}`, import.meta.url), 'utf8'), expected = parseBackup(text);
    const raw = backend([[MARKER, marker(23)], ...entries(earned()), ['unrelated', 'untouched']]), owner = current(raw);
    assert.ok(owner.beginImport().ok); assert.ok(restoreBackup(owner.importStorage, text).ok); assert.ok(owner.finishImport({outcome:'restored'}).ok);
    const actual = parseBackup(createBackup(current(raw).storage, {createdAt:expected.createdAt})); assert.deepEqual(actual, expected);
    assert.equal(actual.data.campaign.missions[id], undefined); assert.notEqual(actual.data.battle?.scenario?.id, id);
    assert.ok(actual.data.history.every(result => result.identity?.ruleset.id !== rulesetId));
    assert.equal(JSON.parse(raw.data.get(MARKER)).version, 25); assert.equal(raw.data.get('unrelated'), 'untouched'); assertBlocked(hammer(raw), raw);
  }
});

test('ownership lost during Screen replacement prevents rollback over a competing profile', () => {
  const text = createBackup(backend(entries(earned())), {createdAt:date});
  const raw = backend([[MARKER, marker(23)], ...opaque()]), owner = current(raw); assert.ok(owner.beginImport().ok);
  const set = raw.setItem; let competingBytes = null;
  raw.setItem = (key, value) => {
    set(key, value);
    if (key !== K.campaign || competingBytes) return;
    // Simulate another tab taking ownership immediately after the first write.
    raw.data.set(MARKER, marker(24, 'restoring', 'competing-owner'));
    for (const domainKey of keys) raw.data.set(domainKey, `newer owner ${domainKey}`);
    competingBytes = [...raw.data]; raw.reads.length = 0; raw.writes.length = 0;
  };
  const result = restoreBackup(owner.importStorage, text);
  assert.equal(result.ok, false); assert.equal(result.code, 'rollback-incomplete'); assert.equal(result.rollback.complete, false);
  assert.deepEqual(result.rollback.unverifiedKeys, keys); assert.deepEqual([...raw.data], competingBytes); assert.deepEqual(raw.writes, []);
  assert.ok(raw.reads.every(key => key === MARKER));
  assert.equal(owner.finishImport({outcome:'rolled-back'}).ok, false); assert.deepEqual([...raw.data], competingBytes); assert.deepEqual(raw.writes, []);
});

test('incomplete Screen rollback keeps profile25 failed until explicit verified recovery', () => {
  const text = createBackup(backend(entries(earned())), {createdAt:date});
  const raw = backend([[MARKER, marker(23)], ...opaque()]), owner = current(raw); assert.ok(owner.beginImport().ok);
  const set = raw.setItem; let writes = 0;
  raw.setItem = (key, value) => {
    if (key === K.campaign && ++writes <= 2) {
      if (writes === 1) set(key, value);
      throw Error('persistent quota fault');
    }
    set(key, value);
  };
  const result = restoreBackup(owner.importStorage, text);
  assert.equal(result.ok, false); assert.equal(result.rollback.complete, false); assert.deepEqual(result.rollback.unrestoredKeys, [K.campaign]);
  assert.ok(owner.finishImport({outcome:'failed'}).ok); assert.equal(owner.status().phase, 'failed');
  assert.deepEqual(JSON.parse(raw.data.get(MARKER)), {format:'ironroot-profile', version:25, epoch:'long-screen-import', phase:'failed'});
  assertBlocked(owner, raw); assertBlocked(hammer(raw), raw);
  raw.setItem = set;
  const recovery = current(raw, 'verified-recovery');
  assert.equal(recovery.beginImport().code, 'recovery-confirmation-required');
  assert.ok(recovery.beginImport({recover:true}).ok); assert.ok(restoreBackup(recovery.importStorage, text).ok);
  assert.ok(recovery.finishImport({outcome:'restored'}).ok); assert.equal(recovery.status().canWrite, false);
  assert.deepEqual(parseBackup(createBackup(current(raw).storage, {createdAt:date})).data, earned()); assertBlocked(hammer(raw), raw);
});
