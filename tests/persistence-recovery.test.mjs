import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { createStorage, createSaveSession, createHistorySession, createPreferenceSession, readHistoryState } from '../dist/persistence.js';
import { createProfileSession, PROFILE_MARKER_KEY, CURRENT_PROFILE_PROTOCOL_VERSION } from '../dist/profile-session.js';
import { createBackup, parseBackup } from '../dist/backup.js';
const H = 'ironroot.history.v1', S = 'ironroot.settings.v1';
const row = n => ({won:false,draw:false,challengeId:null,campaignId:null,difficulty:'easy',time:n,kills:0,built:1,date:`2026-11-06T00:00:${String(n).padStart(2,'0')}.000Z`});
const marker = epoch => JSON.stringify({format:'ironroot-profile',version:CURRENT_PROFILE_PROTOCOL_VERSION,epoch,phase:'ready'});
function fixture(entries = []) {
  const data = new Map(entries), calls = [];
  const faults = {read:null, write:null, afterWrite:null, readHook:null};
  const raw = {
    getItem(key) { faults.readHook?.(key); if (faults.read === key) throw Error('private read payload'); return data.get(key) ?? null; },
    setItem(key,value) { calls.push([key,value]); if (faults.write === key) throw Error('private quota payload'); data.set(key,value); faults.afterWrite?.(key,value); },
    removeItem(key) { data.delete(key); },
  };
  const profile = createProfileSession(() => raw, {requiredProtocolVersion:CURRENT_PROFILE_PROTOCOL_VERSION});
  const storage = createStorage(() => profile.storage);
  const history = createHistorySession(storage,H,{canWrite:()=>profile.status().canWrite});
  const prefs = createPreferenceSession(storage,S,{canWrite:()=>profile.status().canWrite});
  calls.length = 0;
  return {data,calls,faults,raw,profile,storage,history,prefs};
}
const historyRows = f => JSON.parse(f.data.get(H) ?? '[]');
const historyWrites = f => f.calls.filter(([key])=>key===H);

test('history absence, backend failure and malformed existing bytes have distinct states',()=>{
  const f = fixture();
  assert.deepEqual(readHistoryState(f.storage,H),{ok:true,reason:'ready',rows:[],raw:null});
  f.faults.read=H; assert.equal(readHistoryState(f.storage,H).reason,'unavailable');
  f.faults.read=null;
  for(const raw of ['','{bad','null','{}','[null]', '[1]', '[[]]']) {
    f.data.set(H,raw); const state=readHistoryState(f.storage,H);
    assert.equal(state.reason,'malformed');assert.equal(state.raw,raw);
    f.history.retain(row(1));assert.equal(f.history.retry(),false);assert.equal(f.data.get(H),raw);
  }
  assert.equal(historyWrites(f).length,0);
});
test('transient history read failure never overwrites existing history, and later retry merges both',()=>{
  const f=fixture([[H,JSON.stringify([row(1)])]]);f.history.retain(row(2));f.faults.read=H;
  assert.equal(f.history.retry(),false);assert.equal(f.history.pendingCount(),1);
  assert.deepEqual(historyRows(f),[row(1)]);assert.equal(historyWrites(f).length,0);
  f.faults.read=null;assert.equal(f.history.retry(),true);assert.deepEqual(historyRows(f),[row(2),row(1)]);
  assert.equal(f.history.pendingCount(),0);assert.equal(f.history.retry(),true);assert.equal(historyWrites(f).length,1);
});
test('unavailable initial history is not an empty cache and recovery reads the real current history',()=>{
  const f=fixture([[H,JSON.stringify([row(1)])]]);f.faults.read=H;
  const history=createHistorySession(f.storage,H);assert.equal(history.snapshot().ok,false);history.retain(row(2));
  assert.equal(history.retry(),false);f.faults.read=null;assert.equal(history.retry(),true);
  assert.deepEqual(historyRows(f),[row(2),row(1)]);
});
test('failed history write retains an immutable result and repeated retries never append duplicates',()=>{
  const f=fixture([[H,JSON.stringify([row(1)])]]),result=row(2);f.history.retain(result);result.time=99;
  f.faults.write=H;assert.equal(f.history.retry(),false);assert.equal(f.history.retry(),false);
  assert.equal(f.history.pendingCount(),1);assert.deepEqual(f.history.view(),[row(2),row(1)]);
  f.faults.write=null;assert.equal(f.history.retry(),true);f.history.retain(row(2));assert.equal(f.history.retry(),true);
  assert.deepEqual(historyRows(f),[row(2),row(1)]);assert.equal(historyWrites(f).length,3);
});
test('throw-after-write and unreadable readback remain recoverable without writing a second copy',()=>{
  for(const unreadable of [false,true]) {
    const f=fixture([[H,JSON.stringify([row(1)])]]);f.history.retain(row(2));
    f.faults.afterWrite=key=>{if(key===H){if(unreadable)f.faults.read=H;throw Error('private adapter payload');}};
    assert.equal(f.history.retry(),!unreadable);assert.deepEqual(historyRows(f),[row(2),row(1)]);
    f.faults.afterWrite=null;f.faults.read=null;assert.equal(f.history.retry(),true);
    assert.equal(historyWrites(f).length,1);assert.equal(f.history.pendingCount(),0);
  }
});
test('newer history between snapshot and write aborts without damage, then merges a fresh retry',()=>{
  const f=fixture([[H,JSON.stringify([row(1)])]]);f.history.retain(row(2));let reads=0;
  f.faults.readHook=key=>{if(key===H&&++reads===2)f.data.set(H,JSON.stringify([row(3),row(1)]));};
  assert.equal(f.history.retry(),false);assert.equal(f.history.reason(),'changed');assert.equal(historyWrites(f).length,0);
  assert.deepEqual(historyRows(f),[row(3),row(1)]);f.faults.readHook=null;
  assert.equal(f.history.retry(),true);assert.deepEqual(historyRows(f),[row(2),row(3),row(1)]);
});
test('a racing history write after set is detected and is never rolled back over the winner',()=>{
  const f=fixture([[H,JSON.stringify([row(1)])]]);f.history.retain(row(2));
  f.faults.afterWrite=key=>{if(key===H)f.data.set(H,JSON.stringify([row(3),row(1)]));};
  assert.equal(f.history.retry(),false);assert.equal(f.history.pendingCount(),1);
  assert.deepEqual(historyRows(f),[row(3),row(1)]);assert.equal(historyWrites(f).length,1);
  f.faults.afterWrite=null;assert.equal(f.history.retry(),true);
  assert.deepEqual(historyRows(f),[row(2),row(3),row(1)]);
});
test('history dedupe survives backup field ordering and existing optional defaults',()=>{
  const f=fixture(),record=row(2);f.history.retain(record);
  const legacy={date:record.date,built:1,kills:0,time:2,difficulty:'easy',won:false};
  f.data.set(H,JSON.stringify([legacy]));assert.equal(f.history.retry(),true);assert.equal(historyWrites(f).length,0);
});
test('pending history honors the existing latest-30 limit and exports in the existing schema',()=>{
  const f=fixture([[H,JSON.stringify(Array.from({length:30},(_,n)=>row(n)))]]);
  f.history.retain(row(31));const exported=createBackup(f.raw,{history:f.history.view()});
  assert.equal(parseBackup(exported).data.history.length,30);assert.deepEqual(parseBackup(exported).data.history[0],row(31));
  assert.equal(f.history.retry(),true);assert.equal(historyRows(f).length,30);
  assert.deepEqual(Object.keys(historyRows(f)[0]),Object.keys(row(31)));
});
test('retained results and preferences never commit to a replaced, restoring or failed profile',()=>{
  for(const phase of ['ready','restoring','failed']){
    const f=fixture([[H,JSON.stringify([row(1)])],[S,'{"sound":true}']]);
    f.history.retain(row(2));f.prefs.stage({sound:false});
    const replacement=JSON.stringify({...JSON.parse(marker('replacement')),phase});f.data.set(PROFILE_MARKER_KEY,replacement);
    f.data.set(H,JSON.stringify([row(3)]));f.data.set(S,'{"volume":0.25}');
    assert.equal(f.history.retry(),false);assert.equal(f.prefs.retry(),false);
    assert.deepEqual(historyRows(f),[row(3)]);assert.equal(f.data.get(S),'{"volume":0.25}');assert.equal(f.calls.length,0);
  }
});
test('profile changes during the last history read prevent write even without a storage event',()=>{
  const f=fixture([[H,JSON.stringify([row(1)])]]);f.history.retain(row(2));let reads=0;
  f.faults.readHook=key=>{if(key===H&&++reads===2)f.data.set(PROFILE_MARKER_KEY,marker('replacement'));};
  assert.equal(f.history.retry(),false);assert.equal(historyWrites(f).length,0);assert.deepEqual(historyRows(f),[row(1)]);
});
test('failed preferences are retained, replaced by the newest local choice, and verified on retry',()=>{
  const f=fixture([[S,'{"sound":true}']]);f.prefs.stage({sound:false});f.faults.write=S;
  assert.equal(f.prefs.retry(),false);assert.equal(f.prefs.dirty(),true);assert.equal(f.data.get(S),'{"sound":true}');
  f.prefs.stage({sound:false,volume:0.25});f.faults.write=null;assert.equal(f.prefs.retry(),true);
  assert.deepEqual(JSON.parse(f.data.get(S)),{sound:false,volume:0.25});assert.equal(f.prefs.dirty(),false);
  const writes=f.calls.length;assert.equal(f.prefs.retry(),true);assert.equal(f.calls.length,writes);
});
test('preferences cannot overwrite a changed tab snapshot, a double-read race, or unknown startup data',()=>{
  for(const kind of ['newer','race','initial-denied']){
    const f=fixture([[S,'{"sound":true}']]);let prefs=f.prefs;
    if(kind==='initial-denied'){f.faults.read=S;prefs=createPreferenceSession(f.storage,S);f.faults.read=null;}
    prefs.stage({sound:false});
    if(kind==='newer')f.data.set(S,'{"volume":0.25}');
    if(kind==='race'){let reads=0;f.faults.readHook=k=>{if(k===S&&++reads===2)f.data.set(S,'{"volume":0.25}');};}
    assert.equal(prefs.retry(),false);assert.equal(prefs.dirty(),true);assert.equal(f.calls.length,0);
    assert.equal(f.data.get(S),kind==='initial-denied'?'{"sound":true}':'{"volume":0.25}');
  }
});
test('preferences throw-after-write and transient readback denial verify without rewriting',()=>{
  const f=fixture([[S,'{"sound":true}']]);f.prefs.stage({sound:false});
  f.faults.afterWrite=key=>{if(key===S){f.faults.read=S;throw Error('private payload');}};
  assert.equal(f.prefs.retry(),false);assert.equal(f.prefs.dirty(),true);
  f.faults.afterWrite=null;f.faults.read=null;assert.equal(f.prefs.retry(),true);
  assert.equal(f.calls.length,1);assert.equal(f.prefs.dirty(),false);
});

// Execute actual production finish, retry, reopen and unloading functions. The
// tiny DOM is deliberately not described as browser/focus/rendering coverage.
const app=readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');
function element(){const classes=new Set(['hidden']);return{textContent:'',innerHTML:'',children:[],classList:{toggle(k,on){if(on)classes.add(k);else classes.delete(k);},add:k=>classes.add(k),remove:k=>classes.delete(k),contains:k=>classes.has(k)},append(child){this.children.push(child);},querySelector:()=>null};}
function ui(f=fixture([[H,JSON.stringify([row(1)])],[S,'{"sound":true}']])){
  const elements=new Map(),$=id=>{if(!elements.has(id))elements.set(id,element());return elements.get(id);};
  const c={keyboardLoadWarning:'',keyboardSavePending:false,$,historySession:f.history,preferenceSession:f.prefs,knownHistory:f.history.snapshot().rows,knownHistoryAvailable:true,toast:message=>c.toasts.push(message),toasts:[],preferences:{sound:true,music:true,sfx:true,volume:.5,reducedMotion:false,quality:'high'},soundOn:false,
    resultShown:false,game:{state:{winner:1,time:2,stats:{kills:[0],built:[1]}},difficulty:'easy',map:{id:'classic'}},objectiveOutcome:null,currentCampaign:null,currentChallenge:null,
    CAMPAIGN_MISSIONS:[],CHALLENGES:[],cancel(){},document:{querySelector:()=>element(),createElement:element},finishBattleReport(){},finishProtectedObjectives(){},timeText:String,sound(){},battleSession:{captureResult(){return{status:()=> 'current',remove(){c.removed=true;return true;}};}},progressDirty:false,syncDialogs(){},requestAnimationFrame(){},keepDialogFocus(){},hasLastResult:true,recoveryHold:null,profileGate:null,
    allowProfileReload:false,profileSession:f.profile,started:true,save:()=>true,persistProgress(){},window:{addEventListener:(name,callback)=>{c[name]=callback;}}};
  vm.createContext(c);
  vm.runInContext(app.slice(app.indexOf('function updatePreferenceSaveStatus()'),app.indexOf('function timeText(')),c);
  vm.runInContext(app.slice(app.indexOf('function finish()'),app.indexOf('let pointer = null;')),c);
  vm.runInContext(app.slice(app.indexOf("$('lastResult').onclick"),app.indexOf("$('resultReport').addEventListener('click'")),c);
  vm.runInContext(app.slice(app.indexOf("window.addEventListener('beforeunload',"),app.indexOf("window.addEventListener('storage',")),c);
  return {f,c,$};
}
test('actual finish warns on a history read failure, retains result after battle removal and recovers exactly once',()=>{
  const h=ui();h.f.faults.read=H;vm.runInContext('finish()',h.c);
  assert.equal(h.c.removed,true);assert.equal(h.f.history.pendingCount(),1);assert.deepEqual(historyRows(h.f),[row(1)]);
  assert.match(h.$('resultHistoryWarning').textContent,/not verified saved/);assert.equal(h.$('retryResultHistory').classList.contains('hidden'),false);
  vm.runInContext('finish()',h.c);assert.equal(h.f.history.pendingCount(),1);
  h.f.faults.read=null;h.$('retryResultHistory').onclick();assert.equal(historyRows(h.f).length,2);assert.equal(h.$('resultHistoryWarning').classList.contains('hidden'),true);
  const writes=historyWrites(h.f).length;h.$('lastResult').onclick();h.$('retryResultHistory').onclick();assert.equal(historyWrites(h.f).length,writes);
});
test('actual finish survives write denial without a false saved claim; beforeunload warns until retry succeeds',()=>{
  const h=ui();h.f.faults.write=H;vm.runInContext('finish()',h.c);let prevented=0;
  h.c.beforeunload({preventDefault(){prevented++;}});assert.equal(prevented,1);assert.equal(h.f.history.pendingCount(),1);
  assert.ok(!h.c.toasts.some(t=>/history saved/i.test(t)));
  h.f.faults.write=null;h.c.beforeunload({preventDefault(){prevented++;}});assert.equal(prevented,1);
  assert.equal(h.f.history.pendingCount(),0);assert.equal(historyRows(h.f).length,2);
});
test('actual preference handler applies in memory but visibly reports unsaved until explicit verified retry',()=>{
  const h=ui();h.f.faults.write=S;assert.equal(vm.runInContext('savePreferences()',h.c),false);
  assert.equal(h.c.preferences.sound,false);assert.equal(h.f.data.get(S),'{"sound":true}');
  assert.match(h.$('preferenceSaveWarning').textContent,/only to this page/);assert.equal(h.$('retryPreferences').classList.contains('hidden'),false);
  assert.ok(!h.$('preferenceSaveWarning').textContent.includes('private'));
  let prevented=false;h.c.beforeunload({preventDefault(){prevented=true;}});assert.equal(prevented,true);
  h.f.faults.write=null;h.$('retryPreferences').onclick();assert.equal(h.f.prefs.dirty(),false);assert.equal(h.$('preferenceSaveWarning').classList.contains('hidden'),true);
  assert.equal(JSON.parse(h.f.data.get(S)).sound,false);assert.ok(h.c.toasts.includes('Preferences saved.'));
});
test('actual retries stay blocked after profile change and still expose retained result for export',()=>{
  const h=ui();h.f.faults.write=H;vm.runInContext('finish()',h.c);h.f.faults.write=null;
  h.f.data.set(PROFILE_MARKER_KEY,marker('other'));h.f.data.set(H,JSON.stringify([row(3)]));h.$('retryResultHistory').onclick();
  assert.equal(h.f.history.pendingCount(),1);assert.deepEqual(historyRows(h.f),[row(3)]);
  assert.match(h.$('resultHistoryWarning').textContent,/profile or battle save changed/);
  assert.equal(h.f.history.view(h.c.knownHistory).length,2);
});

test('captured completion remains eligible after a new same-profile battle without deleting its save',()=>{
  const f=fixture(),key='ironroot.battle.v1',battle=createSaveSession(f.storage,key);battle.claim();battle.set(key,'finished-battle-snapshot');
  const completion=battle.captureResult();assert.equal(completion.status(),'current');completion.remove();
  f.history.retain(row(2),{ownership:completion.status,onSaved:completion.remove});f.faults.write=H;assert.equal(f.history.retry(),false);
  battle.claim();assert.equal(battle.set(key,'new-battle'),true);f.faults.write=null;
  assert.equal(f.history.retry(),true);assert.equal(f.data.get(key),'new-battle');assert.deepEqual(historyRows(f),[row(2)]);
});
test('stale completion never acquires a newer battle or blocks a later valid result from saving',()=>{
  const f=fixture(),key='ironroot.battle.v1',battle=createSaveSession(f.storage,key);battle.claim();battle.set(key,'old');f.data.set(key,'newer');
  const completion=battle.captureResult();assert.equal(completion.status(),'stale');assert.equal(completion.remove(),false);
  f.history.retain(row(2),{ownership:completion.status,onSaved:completion.remove});f.history.retain(row(3));
  assert.equal(f.history.retry(),false);assert.equal(f.history.pendingCount(),1);assert.equal(f.history.reason(),'battle-stale');
  assert.deepEqual(historyRows(f),[row(3)]);assert.equal(f.data.get(key),'newer');
  f.data.set(key,'old');assert.equal(f.history.retry(),false);assert.deepEqual(historyRows(f),[row(3)]);
});
test('completion with unavailable ownership only recovers if its original battle can still be verified',()=>{
  for(const newer of [false,true]){
    const f=fixture(),key='ironroot.battle.v1',battle=createSaveSession(f.storage,key);battle.claim();battle.set(key,'original');f.faults.read=key;
    const completion=battle.captureResult();assert.equal(completion.status(),'unavailable');assert.equal(completion.remove(),false);
    f.history.retain(row(2),{ownership:completion.status,onSaved:completion.remove});assert.equal(f.history.retry(),false);
    f.faults.read=null;if(newer)f.data.set(key,'newer');assert.equal(f.history.retry(),!newer);
    assert.equal(f.data.get(key),newer?'newer':undefined);assert.equal(f.history.pendingCount(),newer?1:0);
  }
});
test('actual finish captures stale battle ownership and keeps the result unsaved/exportable',()=>{
  const h=ui(),key='ironroot.battle.v1',battle=createSaveSession(h.f.storage,key);battle.claim();battle.set(key,'old');h.f.data.set(key,'newer');h.c.battleSession=battle;
  vm.runInContext('finish()',h.c);assert.equal(h.f.data.get(key),'newer');assert.deepEqual(historyRows(h.f),[row(1)]);
  assert.equal(h.f.history.pendingCount(),1);assert.match(h.$('resultHistoryWarning').textContent,/battle save changed/);
});
test('a captured valid completion still cannot cross a later imported profile boundary',()=>{
  const f=fixture(),key='ironroot.battle.v1',battle=createSaveSession(f.storage,key);battle.claim();battle.set(key,'old');
  const completion=battle.captureResult();completion.remove();f.history.retain(row(2),{ownership:completion.status,onSaved:completion.remove});
  f.data.set(PROFILE_MARKER_KEY,marker('new-profile'));f.data.set(H,JSON.stringify([row(3)]));f.data.set(key,'imported');
  assert.equal(f.history.retry(),false);assert.deepEqual(historyRows(f),[row(3)]);assert.equal(f.data.get(key),'imported');
});
test('profile recovery views never replace retained old-profile history with imported records',()=>{
  const f=fixture([[H,JSON.stringify([row(1)])]]);f.history.retain(row(2));
  f.data.set(PROFILE_MARKER_KEY,marker('imported-profile'));f.data.set(H,JSON.stringify([row(3)]));
  assert.equal(f.history.read().reason,'blocked');assert.deepEqual(f.history.snapshot().rows,[row(1)]);
  assert.deepEqual(f.history.view(),[row(2),row(1)]);
});
