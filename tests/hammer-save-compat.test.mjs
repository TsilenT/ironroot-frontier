import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Game, RULESETS, buildSites, validateEngineFields} from '../dist/engine.js';
import * as campaign from '../dist/campaign.js';
import {encodeBattle, decodeBattle, identityOf, validateBattleIdentity} from '../dist/battle-codec.js';
import {validateHistoryRow} from '../dist/history-codec.js';
import {createBackup, parseBackup, restoreBackup, BACKUP_STORAGE_KEYS as K} from '../dist/backup.js';
import {createProfileSession, CURRENT_PROFILE_PROTOCOL_VERSION, PROFILE_MARKER_KEY} from '../dist/profile-session.js';
import {createStorage, createSaveSession, writeBattle} from '../dist/persistence.js';
import {verifyHistoricalRuntime, historicalRoot} from '../qa/hammer-prototype/historical-runtime.mjs';

verifyHistoricalRuntime();
const priorCampaign = await import(new URL('dist/campaign.js', historicalRoot));
const priorEngine = await import(new URL('dist/engine.js', historicalRoot));
const priorCodec = await import(new URL('dist/battle-codec.js', historicalRoot));
const ID = 'the-hammer-turns', RULE = 'frontier-campaign-hammer-turns', QA = 'frontier-hammer-prototype';
const date = '2026-11-09T00:00:00.000Z';
const fresh = () => campaign.createCampaignMission(ID);
const progress = () => ({...campaign.createCampaignProgress(), missions:Object.fromEntries(priorCampaign.CAMPAIGN_PROGRESS_MISSIONS.map(m => [m.id, {completed:true, stars:1, bestTime:60}]))});
const scenario = {kind:'campaign', id:ID, revision:1};
const row = (game, ref = scenario) => ({won:true, draw:false, difficulty:game.difficulty, time:game.state.time, kills:game.state.stats.kills[0], built:game.state.stats.built[0], date, identity:identityOf(game, ref)});
const advance = (game, ticks) => { for (let i = 0; i < ticks; i++) game.update(.05); };
function backend(entries = []) {
  const data = new Map(entries), reads = [], writes = [];
  return {data, reads, writes, getItem(key) { reads.push(key); return data.get(key) ?? null; },
    setItem(key, value) { writes.push(['set', key, value]); data.set(key, value); },
    removeItem(key) { writes.push(['remove', key]); data.delete(key); }};
}
const backup = (game = fresh()) => JSON.parse(createBackup(backend(), {createdAt:date, campaign:progress(), history:[row(game)], battle:encodeBattle(game, scenario, {campaignProgress:progress()})}));
function rejectedBackup(value) {
  const text = JSON.stringify(value), target = backend([[K.settings, 'original bytes']]);
  assert.throws(() => parseBackup(text)); assert.equal(restoreBackup(target, text).ok, false);
  assert.deepEqual(target.reads, []); assert.deepEqual(target.writes, []); assert.equal(target.data.get(K.settings), 'original bytes');
}

test('Hammer exact identity keeps engine3 envelope3 backup2 and campaign1 schemas without extending old states', () => {
  const game = fresh(), saved = encodeBattle(game, scenario, {campaignProgress:progress()}), historical = priorCampaign.createCampaignMission('salt-in-the-stores');
  assert.deepEqual(identityOf(game, scenario), {ruleset:{id:RULE, revision:1}, map:{id:'classic', revision:1}, scenario});
  assert.equal(saved.version, 3); assert.equal(saved.game.version, 3);
  assert.equal(backup().version, 2); assert.equal(progress().version, 1);
  assert.deepEqual(Object.keys(game.serialize()).sort(), Object.keys(historical.serialize()).sort());
  assert.deepEqual(Object.keys(game.state).filter(key => key !== 'hammerCommitment').sort(), Object.keys(historical.state).sort());
  assert.deepEqual(game.state.hammerCommitment, {sides:[0,1].map(() => ({lane:null, lockUntilTick:0, cooldownUntilTick:0}))});
  assert.equal(historical.state.hammerCommitment, undefined);
  assert.deepEqual(validateHistoryRow(row(game)), row(game));
});

const wrongIdentities = [
  ['map id', value => value.map.id = 'twin-span'], ['map revision', value => value.map.revision = 2],
  ['rules id', value => value.ruleset.id = 'frontier-campaign-salt-stores'], ['rules revision', value => value.ruleset.revision = 2],
  ['scenario id', value => value.scenario.id = 'salt-in-the-stores'], ['scenario revision', value => value.scenario.revision = 2],
  ['scenario kind', value => value.scenario = {kind:'skirmish', id:'standard', revision:1}],
];
for (const [label, change] of wrongIdentities) test('Hammer '+label+' relabel rejects identity history battle and both backup domains before destination access', () => {
  const game = fresh(), changed = structuredClone(identityOf(game, scenario)); change(changed);
  assert.throws(() => validateBattleIdentity(changed));
  const badRow = {...row(game), identity:changed}; assert.throws(() => validateHistoryRow(badRow));
  const badBattle = encodeBattle(game, scenario, {campaignProgress:progress()});
  Object.assign(badBattle.game, {rulesetId:changed.ruleset.id, rulesetRevision:changed.ruleset.revision, mapId:changed.map.id, mapRevision:changed.map.revision}); badBattle.scenario = changed.scenario;
  assert.throws(() => decodeBattle(badBattle, {campaignProgress:progress()}));
  const historyOnly = backup(); historyOnly.data.battle = null; historyOnly.data.history = [badRow]; rejectedBackup(historyOnly);
  const battleOnly = backup(); battleOnly.data.history = []; battleOnly.data.battle = badBattle; rejectedBackup(battleOnly);
});

test('Hammer rules cannot be relabelled as any prior campaign revision or standard Skirmish', () => {
  const identity = identityOf(fresh(), scenario), frozen = JSON.parse(readFileSync(new URL('./fixtures/salt-parent-v0300.json', import.meta.url)));
  for (const ref of [...Object.keys(frozen.descriptors), 'salt-in-the-stores@1']) {
    const [id, revision] = ref.split('@');
    assert.throws(() => validateBattleIdentity({...identity, scenario:{kind:'campaign', id, revision:+revision}}), ref);
    assert.equal(campaign.campaignRulesetAllowed(id, +revision, RULE), false, ref);
  }
  assert.throws(() => encodeBattle(fresh()));
  assert.throws(() => new Game({rulesetId:RULE, mapId:'long-march'}));
  assert.throws(() => new Game({rulesetId:RULE, mapId:'twin-span'}));
});

test('prototype qaOnly stays engine-restorable for diagnostics but barred from saves results and history-only backups', () => {
  const game = new Game({rulesetId:QA}), identity = {ruleset:{id:QA, revision:1}, map:{id:'classic', revision:1}, scenario};
  assert.deepEqual(Game.restore(game.serialize()).serialize(), game.serialize());
  assert.throws(() => validateBattleIdentity(identity), error => error.code === 'qa-only-ruleset');
  assert.throws(() => encodeBattle(game, scenario, {campaignProgress:progress()}));
  const badRow = {...row(fresh()), identity}; assert.throws(() => validateHistoryRow(badRow));
  const historyOnly = backup(); historyOnly.data.battle = null; historyOnly.data.history = [badRow]; rejectedBackup(historyOnly);
  const battleOnly = backup(); battleOnly.data.history = []; battleOnly.data.battle.game = game.serialize(); rejectedBackup(battleOnly);
  assert.throws(() => createBackup(backend(), {createdAt:date, campaign:progress(), history:[badRow]}));
});

test('Hammer requires explicit result/envelope identities and unlocked Salt even for otherwise valid state', () => {
  const game = fresh(), {identity, ...statistics} = row(game), saved = encodeBattle(game, scenario, {campaignProgress:progress()});
  assert.throws(() => validateHistoryRow({...statistics, campaignId:ID, challengeId:null}), /unknown campaign/);
  assert.throws(() => decodeBattle(saved.game, {campaignProgress:progress()}));
  assert.throws(() => decodeBattle({format:'ironroot-save', version:2, campaignId:ID, challengeId:null, game:saved.game}, {campaignProgress:progress()}));
  const locked = progress(); delete locked.missions['salt-in-the-stores'];
  assert.throws(() => decodeBattle(saved, {campaignProgress:locked}), error => error.code === 'locked-mission');
  assert.throws(() => campaign.createProgressionCampaignMission(ID, locked), /locked/);
  assert.ok(campaign.isMissionUnlocked(progress(), ID)); assert.equal(progress().missions[ID], undefined);
  const old = progress(); assert.deepEqual(campaign.normalizeCampaignProgress(old), old);
});

test('ordinary scheduled paid Hammer resume and restart/replay preserve different exact state contracts', () => {
  const game = fresh(), initial = game.serialize(), p = progress();
  assert.ok(game.build('barracks', 1250, game.map.lanes[0], 0).ok);
  assert.ok(game.buyCitadelOption('arrows').ok); advance(game, 47);
  assert.notEqual(game.state.hammerCommitment.sides[1].lane, null, 'normal AI scheduling makes a paid commitment');
  const saved = encodeBattle(game, scenario, {campaignProgress:p}), raw = backend([[PROFILE_MARKER_KEY, JSON.stringify({format:'ironroot-profile', version:22, epoch:'paid-save', phase:'ready'})]]);
  const profile = createProfileSession(() => raw, {requiredProtocolVersion:CURRENT_PROFILE_PROTOCOL_VERSION}), storage = createStorage(() => profile.storage), slot = createSaveSession(storage, K.battle);
  assert.ok(slot.claim()); assert.ok(writeBattle(slot, K.battle, game, null, ID, {campaignProgress:p}));
  const resumed = decodeBattle(raw.data.get(K.battle), {campaignProgress:p}).game; assert.deepEqual(resumed.serialize(), saved.game);
  const exported = createBackup(profile.storage, {createdAt:date, campaign:p}); assert.deepEqual(parseBackup(exported).data.battle, saved);
  advance(game, 1000); advance(resumed, 1000); assert.deepEqual(resumed.serialize(), game.serialize());
  for (const reset of [campaign.createCampaignRestart(resumed, ID), campaign.createProgressionCampaignMission(ID, p)]) {
    assert.deepEqual(identityOf(reset, scenario), identityOf(resumed, scenario)); assert.deepEqual(reset.serialize(), initial);
    assert.deepEqual(reset.state.gold, [1100,320]); assert.equal(reset.tick, 0); assert.equal(reset.state.hammerCommitment.sides[1].lane, null);
  }
});

test('restore copies pending collapse without spending selecting consuming RNG repairing support or resetting timers', () => {
  const game = fresh(); advance(game, 2); const record = game.state.hammerCommitment.sides[1];
  const foundry = game.state.buildings.find(b => b.side === 1 && b.type === 'foundry' && b.lane === record.lane); assert.ok(foundry);
  game.state.buildings = game.state.buildings.filter(b => b.id !== foundry.id);
  const saved = encodeBattle(game, scenario, {campaignProgress:progress()}), before = structuredClone(saved.game);
  const restored = decodeBattle(saved, {campaignProgress:progress()}).game;
  assert.deepEqual(restored.serialize(), before); assert.deepEqual(saved.game, before);
  assert.notEqual(restored.state.hammerCommitment, saved.game.state.hammerCommitment);
  saved.game.state.hammerCommitment.sides[1].lane = null;
  assert.equal(restored.state.hammerCommitment.sides[1].lane, record.lane, 'restored records do not alias input');
  advance(game, 150); advance(restored, 150); assert.deepEqual(restored.serialize(), game.serialize());
});

// Synthetic malformed/expired records are admission diagnostics, not paid outcome evidence.
const malformed = [
  ['missing state', s => delete s.state.hammerCommitment], ['extra state field', s => s.state.hammerCommitment.extra = 1],
  ['missing sides', s => delete s.state.hammerCommitment.sides], ['one side', s => s.state.hammerCommitment.sides.pop()],
  ['three sides', s => s.state.hammerCommitment.sides.push({...s.state.hammerCommitment.sides[0]})],
  ['sparse sides', s => delete s.state.hammerCommitment.sides[0]], ['record array', s => s.state.hammerCommitment.sides[0] = []],
  ['missing lane', s => delete s.state.hammerCommitment.sides[0].lane], ['missing lock', s => delete s.state.hammerCommitment.sides[0].lockUntilTick],
  ['missing cooldown', s => delete s.state.hammerCommitment.sides[0].cooldownUntilTick], ['extra record', s => s.state.hammerCommitment.sides[0].extra = true],
  ...[-1,3,.5,'0',true].map(value => ['lane '+value, s => s.state.hammerCommitment.sides[0].lane = value]),
  ...[-1,.5,'900',NaN,Infinity,Number.MAX_SAFE_INTEGER+1,1,899,901].map(value => ['lock '+value, s => Object.assign(s.state.hammerCommitment.sides[0], {lane:0, lockUntilTick:value})]),
  ...[-1,.5,'400',NaN,Infinity,Number.MAX_SAFE_INTEGER+1,1,399,401].map(value => ['cooldown '+value, s => s.state.hammerCommitment.sides[0].cooldownUntilTick = value]),
  ['uncommitted lock', s => s.state.hammerCommitment.sides[0].lockUntilTick = 900],
  ['committed zero lock', s => s.state.hammerCommitment.sides[0].lane = 0],
  ['committed cooldown', s => Object.assign(s.state.hammerCommitment.sides[0], {lane:0, lockUntilTick:900, cooldownUntilTick:400})],
];
for (const [label, change] of malformed) test('Hammer malformed '+label+' rejects through restore battle and backup without destination access', () => {
  const data = fresh().serialize(); change(data); assert.throws(() => Game.restore(data));
  const value = backup(); value.data.battle.game = data;
  assert.throws(() => decodeBattle(value.data.battle, {campaignProgress:progress()})); rejectedBackup(value);
});

test('legitimate earliest current and expired Hammer deadlines remain exact on either side', () => {
  for (const side of [0,1]) for (const tick of [0,900,1000]) for (const state of [
    {lane:null, lockUntilTick:0, cooldownUntilTick:0},
    {lane:0, lockUntilTick:900, cooldownUntilTick:0},
    {lane:2, lockUntilTick:tick+900, cooldownUntilTick:0},
    {lane:null, lockUntilTick:0, cooldownUntilTick:400},
    {lane:null, lockUntilTick:0, cooldownUntilTick:tick+400},
  ]) {
    const data = fresh().serialize(); data.tick = tick; data.state.time = tick*.05; data.state.hammerCommitment.sides[side] = state;
    validateEngineFields(data); assert.deepEqual(Game.restore(data).serialize(), data);
    const value = backup(); value.data.battle.game = data; assert.deepEqual(parseBackup(JSON.stringify(value)).data.battle.game, data);
  }
});

test('every prior whole ruleset rejects injected commitments and remains byte-equivalent to archived Salt', () => {
  for (const [id, rules] of Object.entries(priorEngine.RULESETS)) {
    assert.deepEqual(RULESETS[id], rules, id);
    const mapId = id === 'frontier-campaign-borrowed-ground' ? 'borrowed-yard' : 'classic';
    const game = new Game({rulesetId:id, mapId}), data = game.serialize();
    assert.equal(data.state.hammerCommitment, undefined, id); data.state.hammerCommitment = fresh().state.hammerCommitment;
    assert.throws(() => Game.restore(data), id); assert.throws(() => validateEngineFields(data), id);
  }
  for (const mapId of ['classic','long-march','twin-span']) {
    const data = new Game({mapId}).serialize(); data.state.hammerCommitment = fresh().state.hammerCommitment;
    assert.throws(() => Game.restore(data)); assert.throws(() => decodeBattle(data));
  }
});

const frozen = JSON.parse(readFileSync(new URL('./fixtures/salt-parent-v0300.json', import.meta.url)));
for (const ref of [...Object.keys(frozen.descriptors), 'salt-in-the-stores@1']) {
  const [id, revision] = ref.split('@');
  for (const variant of id === 'false-quiet' ? ['a','b'] : [null]) test('current profile23 ordinary paid-save admission and continuation preserve prior '+ref+(variant ? '/'+variant : ''), () => {
    const options = {revision:+revision, ...(variant ? {variant} : {})};
    assert.deepEqual(campaign.getCampaignMission(id, +revision), priorCampaign.getCampaignMission(id, +revision));
    const old = priorCampaign.createCampaignMission(id, options), game = campaign.createCampaignMission(id, options);
    assert.deepEqual(game.serialize(), old.serialize()); assert.equal(game.state.hammerCommitment, undefined);
    const paidBuild = g => {
      for (const site of buildSites(g.map, 0).slice().reverse()) { const action = g.build('barracks', site.x, site.y, 0); if (action.ok) return action; }
      return null;
    };
    const paid = paidBuild(game); assert.deepEqual(paid, paidBuild(old)); assert.ok(paid, ref+' has an ordinary paid opening');
    advance(old, 80); advance(game, 80); assert.deepEqual(game.serialize(), old.serialize());
    const oldScenario = priorCampaign.campaignScenarioForGame(old, id), saved = priorCodec.encodeBattle(old, oldScenario, {campaignProgress:progress()});
    const resumed = decodeBattle(saved, {campaignProgress:progress()}).game; assert.deepEqual(resumed.serialize(), old.serialize());
    const raw = backend([[PROFILE_MARKER_KEY, JSON.stringify({format:'ironroot-profile', version:22, epoch:'old-paid-save', phase:'ready'})], [K.battle, JSON.stringify(saved)], [K.campaign, JSON.stringify(progress())]]);
    const profile = createProfileSession(() => raw, {requiredProtocolVersion:23}); assert.ok(profile.status().canWrite);
    const text = createBackup(profile.storage, {createdAt:date}); assert.deepEqual(parseBackup(text).data.battle, saved);
    advance(old, 120); advance(resumed, 120); assert.deepEqual(resumed.serialize(), old.serialize());
    assert.equal(resumed.state.hammerCommitment, undefined); assert.deepEqual(campaign.createCampaignRestart(resumed, id).serialize(), priorCampaign.createCampaignRestart(old, id).serialize());
  });
}

test('earliest backup fixtures retain exact normalized identities data and continuations without invented Hammer records', () => {
  for (const name of ['backup-v0.7-format.json','backup-v0.9-format.json']) {
    const text = readFileSync(new URL('./fixtures/'+name, import.meta.url), 'utf8');
    const oldBackup = awaitablePriorBackup(text);
    assert.deepEqual(parseBackup(text), oldBackup); assert.equal(oldBackup.data.campaign.missions[ID], undefined);
    if (oldBackup.data.battle) {
      const old = priorCodec.decodeBattle(oldBackup.data.battle, {campaignProgress:oldBackup.data.campaign}).game;
      const game = decodeBattle(oldBackup.data.battle, {campaignProgress:oldBackup.data.campaign}).game;
      advance(old, 200); advance(game, 200); assert.deepEqual(game.serialize(), old.serialize()); assert.equal(game.state.hammerCommitment, undefined);
    }
  }
});
const priorBackup = await import(new URL('dist/backup.js', historicalRoot));
const awaitablePriorBackup = text => priorBackup.parseBackup(text);

// Clock/state mutations below are admission diagnostics, never played outcomes.
const clockTolerance = time => Math.min(.001,1e-7+time*1e-9);
function clockSnapshot(rulesetId,tick,time=tick*.05) {
  const game=rulesetId===RULE?fresh():new Game({rulesetId});
  const data=game.serialize();data.tick=tick;data.state.time=time;data.state.overtime=time>=300;return data;
}
function adjacentFloat(value,direction) {
  if(value===0)return direction>0?Number.MIN_VALUE:-Number.MIN_VALUE;
  const view=new DataView(new ArrayBuffer(8));view.setFloat64(0,value,false);
  const bits=view.getBigUint64(0,false),up=(value>0)===(direction>0);
  view.setBigUint64(0,bits+(up?1n:-1n),false);return view.getFloat64(0,false);
}
function toleranceNeighbors(tick,direction) {
  const center=tick*.05;
  // Solve the approved inequality on either side before bracketing the two
  // adjacent representable doubles. The tolerance itself depends on saved time.
  let candidate=center+direction*(clockTolerance(center)/(1-direction*1e-9));
  const accepted=time=>Math.abs(time-center)<=clockTolerance(time);
  let inside,outside,steps=0;
  if(accepted(candidate)) {
    inside=candidate;outside=adjacentFloat(inside,direction);
    while(accepted(outside)){inside=outside;outside=adjacentFloat(outside,direction);assert.ok(++steps<8);}
  } else {
    outside=candidate;inside=adjacentFloat(outside,-direction);
    while(!accepted(inside)){outside=inside;inside=adjacentFloat(inside,-direction);assert.ok(++steps<8);}
  }
  assert.equal(adjacentFloat(inside,direction),outside);assert.ok(accepted(inside));assert.equal(accepted(outside),false);
  return{inside,outside};
}

for(const rulesetId of[RULE,QA]) test('Hammer clock '+rulesetId+' rejects impossible pairs and whole-tick skew before profile destination access',()=>{
  for(const[tick,time]of[[1000,0],[0,50],[0,.05],[1000,49.95],[1000,50.05],[12095999,604799.9],[12095999,604800]]){
    const data=clockSnapshot(rulesetId,tick,time);
    data.state.hammerCommitment.sides[1]={lane:0,lockUntilTick:900,cooldownUntilTick:0};
    assert.throws(()=>Game.restore(data),/Hammer time does not match/);
    const value=backup();value.data.battle.game=data;
    assert.throws(()=>decodeBattle(value.data.battle,{campaignProgress:progress()}),/Hammer time does not match/);
    rejectedBackup(value);
  }
});

for(const rulesetId of[RULE,QA]) test('Hammer clock '+rulesetId+' admits the nearest in-tolerance double and rejects its adjacent out-of-tolerance neighbor',()=>{
  for(const tick of[0,1,1000,11999,12000,1000000,12096000])for(const direction of tick===0?[1]:[-1,1]){
    const{inside,outside}=toleranceNeighbors(tick,direction),valid=clockSnapshot(rulesetId,tick,inside),invalid=clockSnapshot(rulesetId,tick,outside);
    assert.deepEqual(Game.restore(valid).serialize(),valid);
    assert.throws(()=>Game.restore(invalid),/Hammer time does not match/);
    if(rulesetId===RULE&&inside<599.9){
      const value=backup();value.data.battle.game=valid;
      assert.deepEqual(decodeBattle(value.data.battle,{campaignProgress:progress()}).game.serialize(),valid);
      assert.deepEqual(parseBackup(JSON.stringify(value)).data.battle.game,valid);
      value.data.battle.game=invalid;rejectedBackup(value);
    }
  }
});

for(const rulesetId of[RULE,QA]) test('Hammer clock '+rulesetId+' preserves fresh minimum upper and expired commitment deadlines with active accumulators',()=>{
  for(const tick of[0,1000,12000,1000000,12096000])for(const accumulator of[.001,.017,.049]){
    const records=[
      {lane:null,lockUntilTick:0,cooldownUntilTick:0},
      {lane:0,lockUntilTick:900,cooldownUntilTick:0},
      {lane:2,lockUntilTick:tick+900,cooldownUntilTick:0},
      {lane:null,lockUntilTick:0,cooldownUntilTick:400},
      {lane:null,lockUntilTick:0,cooldownUntilTick:tick+400},
    ];
    for(const side of[0,1])for(const record of records){
      const data=clockSnapshot(rulesetId,tick);data.accumulator=accumulator;data.state.hammerCommitment.sides[side]=record;
      const before=structuredClone(data),restored=Game.restore(data);
      assert.deepEqual(restored.serialize(),before,'restore preserves treasury/RNG/timers/accumulator and does not repair pending support');
      assert.deepEqual(data,before);assert.notEqual(restored.state.hammerCommitment,data.state.hammerCommitment);
    }
  }
});

// This repeats the engine's actual time += .05 arithmetic, without simulating
// a seven-day battle or presenting synthetic terminal state as campaign evidence.
const recurrenceClocks=new Map();let recurrenceTime=0,maximumClockDrift=0;
for(let tick=1;tick<=12096000;tick++){
  recurrenceTime+=.05;const drift=Math.abs(recurrenceTime-tick*.05);
  maximumClockDrift=Math.max(maximumClockDrift,drift);
  if(drift>clockTolerance(recurrenceTime))throw Error('Ordinary repeated clock exceeds its approved tolerance at tick '+tick);
  if([12000,1000000,12096000].includes(tick))recurrenceClocks.set(tick,recurrenceTime);
}
for(const rulesetId of[RULE,QA]) test('Hammer clock '+rulesetId+' accepts real plus-.05 recurrence through600s50000s and seven days without changing its saved state',()=>{
  assert.equal(recurrenceClocks.size,3);assert.ok(maximumClockDrift>1e-7,'the old fixed epsilon would reject valid long recurrence');
  assert.ok(maximumClockDrift<.001,'all measured error remains far below a whole fixed tick');
  for(const[tick,time]of recurrenceClocks){
    const data=clockSnapshot(rulesetId,tick,time);data.accumulator=.017;
    data.state.hammerCommitment.sides[1]={lane:1,lockUntilTick:900,cooldownUntilTick:0};
    const restored=Game.restore(data);assert.deepEqual(restored.serialize(),data);
    if(tick===12096000){const before=restored.serialize();assert.ok(restored.limitReason);restored.update(.05);assert.deepEqual(restored.serialize(),before);}
    if(rulesetId===RULE)assert.throws(()=>decodeBattle({format:'ironroot-save',version:3,scenario,game:data},{campaignProgress:progress()}),error=>error.code==='ended-battle','engine clock admission does not bypass the600second mission deadline');
  }
});

for(const rulesetId of[RULE,QA]) test('Hammer clock '+rulesetId+' restores a naturally active accumulator and continues exact ordinary scheduling',()=>{
  const game=rulesetId===RULE?fresh():new Game({rulesetId});game.update(.017);
  assert.equal(game.tick,0);assert.equal(game.state.time,0);assert.equal(game.accumulator,.017);
  const data=game.serialize(),restored=Game.restore(data);assert.deepEqual(restored.serialize(),data);
  if(rulesetId===RULE){const value=backup(game);assert.deepEqual(parseBackup(JSON.stringify(value)).data.battle.game,data);}
  for(let frame=0;frame<80;frame++)for(const dt of[.017,.083,.011,.25,.05]){game.update(dt);restored.update(dt);}
  assert.deepEqual(restored.serialize(),game.serialize());
  assert.deepEqual(Game.restore(restored.serialize()).serialize(),restored.serialize());
});

test('Hammer-only clock guard leaves actual legacy and Salt off-grid save admission and continuation unchanged',()=>{
  for(const rulesetId of[null,'frontier-campaign-salt-stores'])for(const[tick,time]of[[1000,0],[0,.05],[1000,49.95],[1000,50.05]]){
    const original=rulesetId?priorCampaign.createCampaignMission('salt-in-the-stores'):new priorEngine.Game();
    const data=original.serialize();data.tick=tick;data.state.time=time;data.accumulator=.017;
    const old=priorEngine.Game.restore(data),current=Game.restore(data);assert.deepEqual(current.serialize(),old.serialize());
    const ref=rulesetId?{kind:'campaign',id:'salt-in-the-stores',revision:1}:{kind:'skirmish',id:'standard',revision:1};
    const saved=priorCodec.encodeBattle(old,ref,{campaignProgress:progress()});
    assert.deepEqual(decodeBattle(saved,{campaignProgress:progress()}).game.serialize(),old.serialize());
    advance(old,80);advance(current,80);assert.deepEqual(current.serialize(),old.serialize());
  }
});
