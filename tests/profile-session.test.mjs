import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { createProfileSession, PROFILE_MARKER_KEY as KEY, ProfileSessionError } from '../dist/profile-session.js';
import { createStorage, createSaveSession, readHistoryState, createHistorySession, createPreferenceSession } from '../dist/persistence.js';
import { createBackup, parseBackup, restoreBackup, MAX_BACKUP_BYTES, BACKUP_STORAGE_KEYS as K } from '../dist/backup.js';
import { CAMPAIGN_MISSIONS, createCampaignProgress, getCampaignOverview, readCampaignProgress, mergeCampaignProgress, writeCampaignProgress } from '../dist/campaign.js';

import { Game } from '../dist/engine.js';
import { CHALLENGES } from '../dist/challenges.js';

const keys = Object.values(K);
const encoded = (epoch, phase) => JSON.stringify({ format: 'ironroot-profile', version: 1, epoch, phase });
function raw(entries = []) {
  const data = new Map(entries), calls = [];
  return { data, calls,
    getItem(k) { calls.push(['get', k]); return data.has(k) ? data.get(k) : null; },
    setItem(k, v) { calls.push(['set', k, v]); data.set(k, v); },
    removeItem(k) { calls.push(['remove', k]); data.delete(k); },
  };
}
let epoch = 0;
const session = r => createProfileSession(() => r, { newEpoch: () => `test-${++epoch}` });
const emptyText = () => createBackup(raw(), { createdAt: '2026-11-06T00:00:00.000Z' });
const historyRow = n => ({ won: true, draw: false, challengeId: null, campaignId: null, difficulty: 'normal', time: n, kills: 1, built: 1, date: '2026-11-06T00:00:00.000Z' });
const bad = fn => assert.throws(fn, ProfileSessionError);

test('absent marker is a legacy-ready profile; guarded storage works without writing a marker', () => {
  const r = raw(), p = session(r), s = p.status();
  assert.equal(s.phase, 'ready'); assert.equal(s.canWrite, true); assert.equal(s.canReload, true); assert.equal(s.reloadRequired, false);
  p.storage.setItem(K.settings, '{}'); assert.equal(p.storage.getItem(K.settings), '{}'); p.storage.removeItem(K.settings);
  assert.equal(r.data.size, 0); assert.equal(r.calls.filter(([op, k]) => op !== 'get' && k === KEY).length, 0);
});

test('begin publishes a verified restoring marker before permitting import reads or writes', () => {
  const r = raw(), p = session(r); bad(() => p.importStorage.getItem(K.history));
  const result = p.beginImport(); assert.equal(result.ok, true); assert.equal(result.status.phase, 'restoring'); assert.equal(result.status.ownsImport, true);
  assert.equal(JSON.parse(r.data.get(KEY)).phase, 'restoring');
  p.importStorage.setItem(K.settings, '{}'); assert.equal(p.importStorage.getItem(K.settings), '{}'); p.importStorage.removeItem(K.settings);
  bad(() => p.storage.setItem(K.history, '[]')); bad(() => p.storage.removeItem(K.history)); bad(() => p.storage.getItem(K.history));
  assert.equal(p.beginImport().code, 'import-in-progress');
});

test('all ordinary save writes and removes are blocked in stale tabs throughout restoration', () => {
  const r = raw(keys.map(k => [k, 'old'])), a = session(r), b = session(r), wrapped = createStorage(() => b.storage);
  assert.equal(a.beginImport().ok, true);
  for (const key of keys) { assert.equal(wrapped.set(key, 'stale'), false); assert.equal(wrapped.remove(key), false); assert.equal(r.data.get(key), 'old'); }
  assert.equal(wrapped.get(K.campaign), null); assert.equal(b.status().phase, 'restoring'); assert.equal(b.status().canReload, false);
  assert.equal(b.beginImport().code, 'recovery-confirmation-required');
});

test('restored marker makes every old tab read-only and requires reload, including its owner', () => {
  const r = raw(), a = session(r), b = session(r);
  assert.equal(a.beginImport().ok, true); assert.equal(restoreBackup(a.importStorage, emptyText()).ok, true);
  const finished = a.finishImport({ outcome: 'restored' }); assert.equal(finished.ok, true); assert.equal(finished.phase, 'ready');
  for (const p of [a, b]) {
    const s = p.status(); assert.equal(s.canWrite, false); assert.equal(s.reloadRequired, true); assert.equal(s.canReload, true);
    for (const key of keys) { bad(() => p.storage.setItem(key, 'stale')); bad(() => p.storage.removeItem(key)); }
    assert.equal(p.beginImport().code, 'reload-required'); bad(() => p.importStorage.setItem(K.history, '[]'));
  }
  assert.equal(session(r).status().canWrite, true);
});

test('verified rollback to an originally ready profile rebinds only its owning tab', () => {
  const r = raw([[K.history, 'original']]), a = session(r), b = session(r);
  assert.equal(a.beginImport().ok, true); a.importStorage.setItem(K.history, 'temporary'); a.importStorage.setItem(K.history, 'original');
  const result = a.finishImport({ outcome: 'rolled-back' });
  assert.equal(result.ok, true); assert.equal(result.phase, 'ready'); assert.equal(result.status.canWrite, true);
  a.storage.setItem(K.settings, '{}'); assert.equal(b.status().reloadRequired, true); bad(() => b.storage.setItem(K.settings, 'old preferences'));
});

test('incomplete rollback publishes failed barrier and requires explicit recovery', () => {
  const r = raw(), a = session(r), b = session(r); a.beginImport();
  const result = a.finishImport({ outcome: 'failed' });
  assert.equal(result.ok, true); assert.equal(result.phase, 'failed');
  for (const p of [a, b, session(r)]) {
    assert.equal(p.status().recoveryRequired, true); assert.equal(p.status().canReload, false);
    bad(() => p.storage.setItem(K.campaign, '{}')); bad(() => p.storage.getItem(K.campaign));
    assert.equal(p.beginImport().code, 'recovery-confirmation-required');
  }
  assert.equal(b.beginImport({ recover: true }).ok, true); assert.equal(restoreBackup(b.importStorage, emptyText()).ok, true);
  assert.equal(b.finishImport({ outcome: 'restored' }).phase, 'ready');
});

test('rollback during recovery of a partial or abandoned profile never publishes ready', () => {
  for (const priorPhase of ['failed', 'restoring']) {
    const r = raw([[KEY, encoded('abandoned', priorPhase)], [K.history, 'partial']]), p = session(r);
    assert.equal(p.beginImport({ recover: true }).ok, true);
    const result = p.finishImport({ outcome: 'rolled-back' });
    assert.equal(result.ok, true); assert.equal(result.phase, 'failed'); assert.equal(result.status.canReload, false);
    assert.equal(JSON.parse(r.data.get(KEY)).phase, 'failed'); assert.equal(r.data.get(K.history), 'partial');
  }
});

test('invalid or incompatible markers block play writes and can be replaced only by explicit recovery', () => {
  for (const value of ['{broken', '{}', 'null', '[]', 'x'.repeat(513), encoded('bad epoch', 'ready'), encoded('ok', 'unknown'),
    JSON.stringify({ format: 'ironroot-profile', version: 99, epoch: 'future', phase: 'ready' }),
    JSON.stringify({ format: 'ironroot-profile', version: 1, epoch: 'extra', phase: 'ready', extra: true })]) {
    const r = raw([[KEY, value]]), p = session(r);
    assert.equal(p.status().phase, 'invalid'); bad(() => p.storage.setItem(K.settings, '{}'));
    assert.equal(p.beginImport().ok, false); assert.equal(r.data.get(KEY), value);
    assert.equal(p.beginImport({ recover: true }).ok, true); assert.equal(p.finishImport({ outcome: 'rolled-back' }).phase, 'failed');
  }
});

test('initial unavailable storage is explicit and permits only unsaved app operation, never a claimed import', () => {
  let denied = true; const r = raw(), p = createProfileSession(() => { if (denied) throw Error('SecurityError'); return r; });
  let s = p.status(); assert.equal(s.phase, 'unavailable'); assert.equal(s.initiallyUnavailable, true); assert.equal(s.canWrite, false);
  const ordinary = createStorage(() => p.storage); assert.equal(ordinary.get(K.battle), null); assert.equal(ordinary.set(K.battle, 'unsaved'), false);
  assert.equal(p.beginImport().ok, false); bad(() => p.importStorage.setItem(K.battle, 'no'));
  denied = false; s = p.status(); assert.equal(s.phase, 'ready'); assert.equal(s.reloadRequired, true); assert.equal(p.beginImport().ok, false);
  assert.equal(r.data.size, 0); assert.equal(session(r).status().canWrite, true);
});

test('read failures and invalid raw read return values cannot be interpreted as an absent marker', () => {
  for (const getItem of [() => { throw Error('denied'); }, () => undefined, () => 7]) {
    const r = raw(); r.getItem = getItem; const p = session(r);
    assert.equal(p.status().phase, 'unavailable'); assert.equal(p.beginImport().ok, false);
    assert.equal(r.calls.filter(([op]) => op !== 'get').length, 0);
  }
});

test('marker begin quota failure leaves original game bytes intact and denies the import adapter', () => {
  const r = raw([[K.history, 'original']]); r.setItem = () => { throw Error('QuotaExceededError'); };
  const p = session(r), result = p.beginImport(); assert.equal(result.ok, false); assert.equal(result.code, 'marker-write-failed');
  assert.equal(r.data.has(KEY), false); assert.equal(r.data.get(K.history), 'original'); bad(() => p.importStorage.getItem(K.history));
});

test('marker writes that throw after taking effect are accepted only after exact readback', () => {
  const r = raw(); r.setItem = (k, v) => { r.data.set(k, v); if (k === KEY) throw Error('after write'); };
  const p = session(r); assert.equal(p.beginImport().ok, true); assert.equal(p.finishImport({ outcome: 'restored' }).ok, true);
});

test('an unverified begin can be resumed only after the same owned restoring marker becomes readable', () => {
  const r = raw(); let deny = false;
  r.getItem = k => { if (deny) throw Error('read denied'); return r.data.get(k) ?? null; };
  r.setItem = (k, v) => { r.data.set(k, v); if (k === KEY) deny = true; };
  const p = session(r); assert.equal(p.beginImport().ok, false); bad(() => p.importStorage.setItem(K.settings, '{}'));
  deny = false; assert.equal(p.beginImport().ok, true); p.importStorage.setItem(K.settings, '{}');
});

test('failed finalization keeps barrier closed, locks the import adapter and supports same-outcome retry', () => {
  const r = raw(), p = session(r); p.beginImport();
  const set = r.setItem.bind(r); let refuse = true;
  r.setItem = (k, v) => { if (refuse && k === KEY) throw Error('quota'); set(k, v); };
  const result = p.finishImport({ outcome: 'restored' }); assert.equal(result.ok, false); assert.equal(result.status.phase, 'restoring');
  assert.match(result.message, /Do not reload or resume/); bad(() => p.importStorage.setItem(K.history, '[]')); bad(() => p.storage.setItem(K.history, '[]'));
  assert.equal(p.beginImport().code, 'finalization-pending'); assert.equal(p.finishImport({ outcome: 'rolled-back' }).code, 'outcome-conflict');
  refuse = false; assert.equal(p.finishImport({ outcome: 'restored' }).ok, true); assert.equal(p.finishImport({ outcome: 'restored' }).ok, true);
});

test('ready marker written before a failed read can be verified by idempotent finalization retry', () => {
  const r = raw(), p = session(r); p.beginImport(); let denied = false;
  r.getItem = k => { if (denied) throw Error('read denied'); return r.data.get(k) ?? null; };
  r.setItem = (k, v) => { r.data.set(k, v); if (k === KEY) denied = true; };
  assert.equal(p.finishImport({ outcome: 'restored' }).ok, false); assert.equal(JSON.parse(r.data.get(KEY)).phase, 'ready');
  denied = false; assert.equal(p.finishImport({ outcome: 'restored' }).ok, true);
});

test('failure marker publication can be retried without falsely opening partial data', () => {
  const r = raw(), p = session(r); p.beginImport(); const set = r.setItem.bind(r); let quota = true;
  r.setItem = (k, v) => { if (quota && k === KEY) throw Error('quota'); set(k, v); };
  assert.equal(p.finishImport({ outcome: 'failed' }).ok, false); assert.equal(p.status().phase, 'restoring');
  quota = false; const result = p.finishImport({ outcome: 'failed' }); assert.equal(result.ok, true); assert.equal(result.phase, 'failed'); assert.equal(result.status.canReload, false);
});

test('unexpected marker corruption after a write never grants import ownership', () => {
  const r = raw(); r.setItem = (k, v) => r.data.set(k, k === KEY ? '{corrupt' : v);
  const p = session(r); assert.equal(p.beginImport().ok, false); assert.equal(p.status().phase, 'invalid'); bad(() => p.importStorage.setItem(K.battle, 'no'));
});

test('a superseded importer cannot read, write, remove, finalize or roll back over the newer owner', () => {
  const r = raw(), a = session(r), b = session(r); a.beginImport(); b.beginImport({ recover: true });
  const newerMarker = r.data.get(KEY);
  for (const k of keys) { bad(() => a.importStorage.getItem(k)); bad(() => a.importStorage.setItem(k, 'old')); bad(() => a.importStorage.removeItem(k)); }
  assert.equal(a.finishImport({ outcome: 'failed' }).ok, false); assert.equal(r.data.get(KEY), newerMarker);
  assert.equal(b.finishImport({ outcome: 'restored' }).ok, true);
});

test('import ownership loss mid-restore prevents rollback from undoing a newer completed import', () => {
  const r = raw(), a = session(r), b = session(r); const originalSet = r.setItem.bind(r);
  a.beginImport(); let takeover = false; const newest = JSON.parse(emptyText()); newest.data.history = [historyRow(222)];
  r.setItem = (k, v) => {
    originalSet(k, v);
    if (k === K.campaign && !takeover) {
      takeover = true; assert.equal(b.beginImport({ recover: true }).ok, true);
      assert.equal(restoreBackup(b.importStorage, JSON.stringify(newest)).ok, true); assert.equal(b.finishImport({ outcome: 'restored' }).ok, true);
    }
  };
  const result = restoreBackup(a.importStorage, emptyText());
  assert.equal(result.ok, false); assert.equal(result.rollback.complete, false); assert.equal(result.rollback.unverifiedKeys.length, 5);
  assert.deepEqual(JSON.parse(r.data.get(K.history)), newest.data.history); const safe = new Map(r.data);
  assert.equal(a.finishImport({ outcome: 'failed' }).ok, false); assert.deepEqual(r.data, safe);
});

test('stale dirty campaign and trial bests cannot be reintroduced after a successful empty import', () => {
  const r = raw(), importer = session(r), stale = session(r), s = createStorage(() => stale.storage);
  const oldProgress = createCampaignProgress(); oldProgress.missions.emberwatch = { completed: true, stars: 3, bestTime: 40 };
  const oldTrials = { skyguard: { completed: true, bestTime: 80 } };
  importer.beginImport(); assert.equal(restoreBackup(importer.importStorage, emptyText()).ok, true); importer.finishImport({ outcome: 'restored' });
  const merged = mergeCampaignProgress(oldProgress, readCampaignProgress(s));
  assert.equal(writeCampaignProgress(s, merged), false); assert.equal(s.set(K.trials, JSON.stringify(oldTrials)), false);
  assert.deepEqual(JSON.parse(r.data.get(K.campaign)).missions, {}); assert.deepEqual(JSON.parse(r.data.get(K.trials)), {});
  assert.equal(stale.status().reloadRequired, true);
});

test('beforeunload-style stale history, settings and battle writes are also blocked after replacement', () => {
  const r = raw(), a = session(r), b = session(r), s = createStorage(() => b.storage); a.beginImport(); restoreBackup(a.importStorage, emptyText()); a.finishImport({ outcome: 'restored' });
  const expected = new Map(r.data);
  for (const k of keys) { assert.equal(s.set(k, 'old memory'), false); assert.equal(s.remove(k), false); }
  assert.deepEqual(r.data, expected);
});

test('ordinary facades reserve the marker; import facade is limited to the five game domains', () => {
  const r = raw(), p = session(r);
  for (const method of ['getItem', 'setItem', 'removeItem']) bad(() => p.storage[method](KEY, 'bad'));
  p.beginImport();
  for (const key of [KEY, 'unrelated.secret', '', null]) for (const method of ['getItem', 'setItem', 'removeItem']) bad(() => p.importStorage[method](key, 'bad'));
  assert.throws(() => p.importStorage.setItem(K.settings, {}), TypeError);
});

test('session checks marker before every operation, not merely before the first of five writes', () => {
  const r = raw(), p = session(r); p.storage.setItem(K.settings, '{}'); r.data.set(KEY, encoded('external', 'ready'));
  bad(() => p.storage.setItem(K.history, '[]')); assert.equal(r.data.has(K.history), false);
  const fresh = session(r); fresh.beginImport(); fresh.importStorage.setItem(K.settings, '{}'); r.data.set(KEY, encoded('different', 'restoring'));
  bad(() => fresh.importStorage.setItem(K.history, '[]')); bad(() => fresh.importStorage.removeItem(K.settings));
});

test('marker factory failures, invalid options and invalid outcomes cannot mutate game state', () => {
  for (const newEpoch of [() => '', () => 'bad epoch', () => 2, () => { throw Error('no random source'); }]) {
    const r = raw(), p = createProfileSession(() => r, { newEpoch }); assert.equal(p.beginImport().ok, false); assert.equal(r.data.size, 0);
  }
  const r = raw([[KEY, encoded('same', 'ready')]]), p = createProfileSession(() => r, { newEpoch: () => 'same' });
  assert.equal(p.beginImport().code, 'invalid-epoch'); assert.equal(p.beginImport({ recover: 1 }).ok, false);
  assert.equal(p.finishImport({ outcome: 'maybe' }).ok, false); assert.equal(p.finishImport({ outcome: 'restored' }).ok, false);
  assert.throws(() => createProfileSession(null), TypeError);
});

test('a denied marker read after initially ready play blocks saving without deleting any bytes', () => {
  const r = raw([[K.battle, 'saved']]), p = session(r); r.getItem = () => { throw Error('denied'); };
  const s = p.status(); assert.equal(s.phase, 'unavailable'); assert.equal(s.initiallyUnavailable, false); assert.equal(s.canReload, false);
  assert.equal(createStorage(() => p.storage).set(K.battle, 'new'), false); assert.equal(r.data.get(K.battle), 'saved');
});

test('fresh page opened during restoring or failed phase cannot read partial profile domains', () => {
  for (const phase of ['restoring', 'failed']) {
    const r = raw([[KEY, encoded('unfinished', phase)], [K.settings, '{partial']]), p = session(r);
    assert.equal(p.status().canReload, false);
    for (const key of keys) bad(() => p.storage.getItem(key));
    assert.equal(createStorage(() => p.storage).get(K.settings), null);
    assert.equal(p.beginImport().ok, false);
  }
});


// Execute the actual adapter handlers with tiny DOM stubs. These are not browser QA.
// The JSON bridge removes VM-only prototype differences absent in the real single-realm app.
const app=readFileSync(new URL('../dist/app.js', import.meta.url),'utf8');
const segment=app.slice(app.indexOf('// Portable backups'),app.indexOf('// Experimental standard-controller'));
function element(hidden=false){const cl=new Set(hidden?['hidden']:[]);return {classList:{contains:k=>cl.has(k),add:k=>cl.add(k),remove:k=>cl.delete(k),toggle(k,x){if(x)cl.add(k);else cl.delete(k);}},textContent:'',checked:false,files:[],value:'',disabled:false,click(){}};}
function uiRaw(){const data=new Map();return{data,getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};}
function harness(r=uiRaw()){const p=createProfileSession(()=>r,{requiredProtocolVersion:2}),s=createStorage(()=>p.storage),battleSession=createSaveSession(s,K.battle);battleSession.claim();const nodes=new Map();const $=id=>{if(!nodes.has(id))nodes.set(id,element(['backupModal','profileRecovery','backupRecoveryRow'].includes(id)));return nodes.get(id);};
 const c={$,profileSession:p,storage:s,battleSession,readHistoryState,historySession:createHistorySession(s,K.history,{canWrite:()=>p.status().canWrite}),preferenceSession:createPreferenceSession(s,K.settings,{canWrite:()=>p.status().canWrite}),retryHistorySave(){return true;},retryPreferences(){return true;},HISTORY:K.history,SAVE:K.battle,createBackup:(s,o)=>createBackup(s,o&&JSON.parse(JSON.stringify(o))),parseBackup,restoreBackup,MAX_BACKUP_BYTES,CAMPAIGN_MISSIONS,CHALLENGES,getCampaignOverview,timeText:String,localStorage:r,preferences:{sound:true,music:true,sfx:true,volume:.5,reducedMotion:false,quality:'high'},campaignProgress:createCampaignProgress(),trialRecords:{},currentCampaign:null,currentChallenge:null,game:new Game(),started:true,paused:true,objectiveOutcome:null,settingsWasPaused:false,recoveryHold:null,profileGate:null,pendingFinalizeOutcome:null,allowProfileReload:false,importGeneration:0,retainedHistory:null,knownHistory:[],knownHistoryAvailable:true,progressDirty:false,location:{protocol:'https:',reload(){c.reloaded=true;}},showSettings(){c.paused=true;$('settingsModal').classList.remove('hidden');},showTitle(){c.titleShown=true;c.started=false;},pauseControl(){},toast(){},save(){c.saved=(c.saved||0)+1;return true;},setTimeout,URL,Blob,document:{body:{append(){}},createElement(){return{click(){},remove(){}};}}};
 vm.createContext(c);vm.runInContext(segment,c);vm.runInContext(app.slice(app.indexOf('function pause(value)'),app.indexOf("$('pause').onclick = () => pause(!paused);")),c);vm.runInContext(app.slice(app.indexOf('function hideSettings()'),app.indexOf('function syncSettings()')),c);vm.runInContext('downloadBackup = text => { exportedText = text; };',c);return {c,r,p,$};}
const payload=n=>{const x=JSON.parse(createBackup(uiRaw()));if(n)x.data.campaign.missions.emberwatch={completed:true,stars:n,bestTime:30};return JSON.stringify(x);};
const deferred=()=>{let resolve,reject;return{promise:new Promise((a,b)=>{resolve=a;reject=b;}),resolve,reject};};
async function choose(h,text){h.$('backupFile').files=[{size:text.length,text:async()=>text}];await h.$('backupFile').onchange();}

test('UI: late older successful file read cannot replace the newer confirmed import', async () => {
  const h=harness(),a=deferred();h.$('backupFile').files=[{size:100,text:()=>a.promise}];const pending=h.$('backupFile').onchange();await choose(h,payload(2));a.resolve(payload(1));await pending;assert.ok(h.$('backupSummary').textContent.includes('1/16 campaign missions'));assert.ok(h.$('backupSummary').textContent.includes('2/48 stars'));h.$('confirmImport').onclick();assert.equal(h.c.reloaded,true);assert.equal(JSON.parse(h.r.data.get(K.campaign)).missions.emberwatch.stars,2);
});

test('UI: late older file failure cannot invalidate a newer parsed backup', async () => {
  const h=harness(),a=deferred();h.$('backupFile').files=[{size:100,text:()=>a.promise}];const pending=h.$('backupFile').onchange();await choose(h,payload(2));a.reject(Error('old error'));await pending;h.$('confirmImport').onclick();assert.equal(h.c.reloaded,true);
});

test('UI: dismissing Settings invalidates an outstanding file read across reopen', async () => {
  const h=harness(),a=deferred();h.$('backupFile').files=[{size:100,text:()=>a.promise}];const pending=h.$('backupFile').onchange();vm.runInContext('hideSettings()',h.c);h.$('settingsModal').classList.remove('hidden');a.resolve(payload(1));await pending;assert.equal(h.$('backupModal').classList.contains('hidden'),true);
});

test('UI: incomplete rollback preserves the paused session and warning after cancellation', async () => {
  const h=harness(),text=JSON.parse(payload(2));h.r.data.set(K.campaign,JSON.stringify(createCampaignProgress()));text.data.trials.skyguard={completed:true,bestTime:60};await choose(h,JSON.stringify(text));let domainWrites=0;const set=h.r.setItem;h.r.setItem=(k,v)=>{if(k!== 'ironroot.profile.v1' && ++domainWrites>=2)throw Error('quota');return set(k,v);};h.$('confirmImport').onclick();assert.equal(h.p.status().phase,'failed');assert.ok(h.c.recoveryHold);h.$('cancelImport').onclick();vm.runInContext('hideSettings()',h.c);assert.equal(h.c.started,true);assert.equal(h.c.paused,true);assert.equal(h.c.titleShown,undefined);assert.equal(h.$('profileRecovery').classList.contains('hidden'),false);
});

test('UI: failed marker finalization blocks reload until the same-outcome retry succeeds', async () => {
  const h=harness();await choose(h,payload(2));const set=h.r.setItem;let refuse=true;h.r.setItem=(k,v)=>{if(k==='ironroot.profile.v1'&&JSON.parse(v).phase==='ready'&&refuse)throw Error('quota');return set(k,v);};h.$('confirmImport').onclick();assert.equal(h.c.pendingFinalizeOutcome,'restored');assert.equal(h.c.reloaded,undefined);assert.equal(h.p.status().phase,'restoring');refuse=false;h.$('retryProfileFinish').onclick();assert.equal(h.c.pendingFinalizeOutcome,null);assert.equal(h.c.reloaded,true);
});

test('UI: normal export is blocked during recovery while retained-game export remains available', async () => {
  const h=harness();h.r.data.set('ironroot.profile.v1',JSON.stringify({format:'ironroot-profile',version:1,epoch:'other',phase:'failed'}));h.$('exportBackup').onclick();assert.equal(h.c.exportedText,undefined);assert.match(h.$('backupStatus').textContent,/Export in-memory session/);h.$('exportRecovery').onclick();const exported=parseBackup(h.c.exportedText);assert.deepEqual(exported.data.battle.game,h.c.game.serialize());
});

test('UI: blocked result persistence marks newly earned progress dirty', async () => {
  const h=harness();vm.runInContext(app.slice(app.indexOf('function persistProgress()'),app.indexOf('function save()')),h.c);h.c.profileSession={status:()=>({canWrite:false})};assert.equal(vm.runInContext('persistProgress()',h.c),false);assert.equal(h.c.progressDirty,true);
});


test('UI: storage-unavailable autosave warns once without discarding the active game', () => {
  const h=harness(); h.c.saveWarning=false; let warnings=0;
  h.c.toast=()=>warnings++; h.c.battleSession={status:()=> 'unavailable'};
  vm.runInContext(app.slice(app.indexOf('function save()'), app.indexOf('function updateResume()')),h.c);
  assert.equal(vm.runInContext('save()',h.c),false); assert.equal(vm.runInContext('save()',h.c),false);
  assert.equal(warnings,1); assert.equal(h.c.started,true);
});

test('UI: beforeunload during recovery warns without saving old in-memory data', () => {
  const h=harness(); h.c.recoveryHold={message:'Keep this session open',reason:'rollback'};
  let callback, writes=0, prevented=false;
  h.c.window={addEventListener:(name,fn)=>{assert.equal(name,'beforeunload');callback=fn;}};
  h.c.persistProgress=()=>writes++; h.c.save=()=>writes++;
  vm.runInContext(app.slice(app.indexOf("window.addEventListener('beforeunload',"),app.indexOf("window.addEventListener('storage',")),h.c);
  const event={preventDefault(){prevented=true;}};callback(event);
  assert.equal(prevented,true);assert.equal(event.returnValue,'');assert.equal(writes,0);
});


test('UI: actual application startup protects expanded progress before constructing ordinary storage', () => {
  const r=uiRaw(),boot=app.slice(app.indexOf('const profileSession = '),app.indexOf('let recoveryHold = '));
  const context={localStorage:r,createProfileSession,createStorage}; vm.createContext(context);vm.runInContext(boot,context);
  assert.equal(JSON.parse(r.data.get(KEY)).version,2);
  assert.equal(vm.runInContext('profileSession.status().canWrite',context),true);
});

test('UI: failed profile upgrade pauses play and cannot bypass protection through import recovery', async () => {
  const r=uiRaw();r.data.set(K.history,'original');const before=[...r.data];
  r.setItem=()=>{throw Error('quota');};const h=harness(r);
  vm.runInContext('syncProfileSafety()',h.c);
  assert.equal(h.c.profileGate.code,'profile-upgrade-required');assert.equal(h.c.paused,true);
  assert.equal(h.$('profileRecovery').classList.contains('hidden'),false);
  await choose(h,payload(2));h.$('backupRecoveryConsent').checked=true;h.$('confirmImport').onclick();
  assert.equal(h.c.reloaded,undefined);assert.equal(h.p.status().canWrite,false);assert.deepEqual([...r.data],before);
});

test('UI: uncertain profile upgrade stays visibly paused while its verification read is denied', () => {
  const r=uiRaw();let denied=false;const read=r.getItem,set=r.setItem;
  r.getItem=k=>{if(denied)throw Error('read denied');return read(k);};
  r.setItem=(k,v)=>{set(k,v);if(k===KEY)denied=true;};const h=harness(r);
  vm.runInContext('syncProfileSafety()',h.c);
  assert.equal(h.c.profileGate.phase,'unavailable');assert.equal(h.c.profileGate.recoveryRequired,true);assert.equal(h.c.paused,true);
  assert.equal(h.$('profileRecovery').classList.contains('hidden'),false);
  denied=false;vm.runInContext('syncProfileSafety()',h.c);
  assert.equal(h.c.profileGate.reloadRequired,true);assert.equal(h.p.status().canWrite,false);assert.equal(h.c.reloaded,undefined);
});

test('UI: unreadable current history prevents a falsely complete backup but retained export includes known and pending results',()=>{
  const h=harness(),record=n=>({won:false,draw:false,challengeId:null,campaignId:null,difficulty:'easy',time:n,kills:0,built:1,date:`2026-11-06T00:00:0${n}.000Z`});
  h.r.data.set(K.history,JSON.stringify([record(1)]));h.c.knownHistory=[record(1)];h.c.historySession.read();h.c.historySession.retain(record(2));
  const get=h.r.getItem;h.r.getItem=key=>{if(key===K.history)throw Error('private read payload');return get(key);};
  h.$('exportBackup').onclick();assert.equal(h.c.exportedText,undefined);
  assert.match(h.$('backupStatus').textContent,/not a complete saved-profile backup/);
  h.$('exportRetained').onclick();const exported=parseBackup(h.c.exportedText);
  assert.deepEqual(exported.data.history,[record(2),record(1)]);assert.match(h.$('backupStatus').textContent,/may omit newer results/);
  assert.ok(!h.$('backupStatus').textContent.includes('private'));
});
test('UI: pending results and unsaved preferences are included in a readable full backup without changing browser storage',()=>{
  const h=harness(),record={won:false,draw:false,challengeId:null,campaignId:null,difficulty:'easy',time:2,kills:0,built:1,date:'2026-11-06T00:00:02.000Z'};
  h.c.historySession.retain(record);h.c.preferences.volume=.25;h.c.preferenceSession.stage(h.c.preferences);
  const before=[...h.r.data];h.$('exportBackup').onclick();const exported=parseBackup(h.c.exportedText);
  assert.deepEqual(exported.data.history,[record]);assert.equal(exported.data.settings.volume,.25);
  assert.deepEqual([...h.r.data],before);assert.equal(h.c.historySession.pendingCount(),1);assert.equal(h.c.preferenceSession.dirty(),true);
});
