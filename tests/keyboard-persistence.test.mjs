import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import vm from 'node:vm';
import {createBackup,parseBackup,restoreBackup,BackupError,BACKUP_STORAGE_KEYS as K} from '../dist/backup.js';
import {createStorage,createPreferenceSession} from '../dist/persistence.js';
import {createProfileSession,CURRENT_PROFILE_PROTOCOL_VERSION,PROFILE_MARKER_KEY as MARKER} from '../dist/profile-session.js';
import {createProfileSession as protocolSix,CURRENT_PROFILE_PROTOCOL_VERSION as OLD_PROTOCOL} from './fixtures/profile-session-v017.js';
import {createCampaignProgress} from '../dist/campaign.js';
import {normalizeKeyboardMap,effectiveBindings} from '../dist/keyboard.js';
const date='2026-11-07T00:00:00.000Z';
const keyboard={version:1,bindings:{build1:'KeyQ',volley:null,panLeft:'Numpad4'}};
const settings={sound:true,music:true,sfx:true,volume:.5,reducedMotion:false,quality:'high',keyboard};
const marker=(version,epoch='retained',phase='ready')=>JSON.stringify({format:'ironroot-profile',version,epoch,phase});
function raw(entries=[]){const data=new Map(entries),calls=[];return {data,calls,
  getItem(key){calls.push(['get',key]);return data.get(key)??null;},
  setItem(key,value){calls.push(['set',key]);data.set(key,value);},
  removeItem(key){calls.push(['remove',key]);data.delete(key);},
};}
let epoch=0;
const current=r=>createProfileSession(()=>r,{requiredProtocolVersion:CURRENT_PROFILE_PROTOCOL_VERSION,newEpoch:()=>`keyboard-${++epoch}`});
const domainBytes=r=>Object.values(K).map(key=>[key,r.data.get(key)??null]);
const writes=r=>r.calls.filter(([op])=>op!=='get');
const backup=(r=raw(),options={})=>createBackup(r,{createdAt:date,...options});
function preferenceFixture(initial=JSON.stringify(settings)){
  const r=raw([[K.settings,initial]]),profile=current(r),storage=createStorage(()=>profile.storage);
  const prefs=createPreferenceSession(storage,K.settings,{canWrite:()=>profile.status().canWrite});
  r.calls.length=0;return {r,profile,storage,prefs};
}

test('keyboard settings round trip through optional partial preferences and copied backup overrides',()=>{
  const source=raw([[K.settings,JSON.stringify(settings)]]),before=domainBytes(source);
  const exported=parseBackup(backup(source));assert.deepEqual(exported.data.settings,settings);
  const target=raw();assert.equal(restoreBackup(target,JSON.stringify(exported)).ok,true);
  assert.deepEqual(JSON.parse(target.data.get(K.settings)),settings);
  assert.deepEqual(domainBytes(source),before);assert.deepEqual(writes(source),[]);
  assert.deepEqual(parseBackup(backup(raw(),{settings:{keyboard}})).data.settings,{keyboard});
  assert.deepEqual(parseBackup(backup(raw(),{settings:{keyboard:{version:1,bindings:{}}}})).data.settings.keyboard,{version:1,bindings:{}});
});

test('old backups without keyboard settings restore defaults and remove a previous remap',()=>{
  for(const oldSettings of [{},{volume:0,music:false}]){
    const text=backup(raw(),{settings:oldSettings});
    const target=raw([[K.settings,JSON.stringify(settings)]]);
    assert.equal(restoreBackup(target,text).ok,true);
    const restored=JSON.parse(target.data.get(K.settings));
    assert.deepEqual(restored,oldSettings);assert.equal(Object.hasOwn(restored,'keyboard'),false);
    assert.deepEqual(effectiveBindings(restored.keyboard),effectiveBindings());
    assert.equal(effectiveBindings(restored.keyboard).build1,'Digit1');
  }
});

test('backup validation rejects malformed, excessive, reserved and duplicate effective keyboard bindings before storage access',()=>{
  const invalid=[null,[],{},'KeyQ',{version:2,bindings:{}},{version:1,bindings:{},extra:true},
    {version:1,bindings:[]},{version:1,bindings:{build9:'Digit9'}},
    {version:1,bindings:{build1:'Escape'}},{version:1,bindings:{build1:'Enter'}},
    {version:1,bindings:{build1:'ControlLeft'}},{version:1,bindings:{build1:'KeyQQ'}},
    {version:1,bindings:{build1:1}},{version:1,bindings:{build1:'Digit2'}},
    {version:1,bindings:{build1:'KeyQ',build2:'KeyQ'}},
    {version:1,bindings:Object.fromEntries(Array.from({length:100},(_,i)=>['unknown'+i,'KeyQ']))}];
  const base=JSON.parse(backup());
  for(const value of invalid){
    const candidate=structuredClone(base);candidate.data.settings.keyboard=value;
    assert.throws(()=>parseBackup(JSON.stringify(candidate)),BackupError);
    const target=raw([[K.settings,JSON.stringify(settings)]]),before=domainBytes(target);
    const result=restoreBackup(target,JSON.stringify(candidate));assert.equal(result.ok,false);
    assert.equal(target.calls.length,0);assert.deepEqual(domainBytes(target),before);
    assert.throws(()=>backup(raw(),{settings:{keyboard:value}}),BackupError);
  }
  let invoked=false;
  const accessor={version:1,get bindings(){invoked=true;return {};}};
  assert.throws(()=>backup(raw(),{settings:{keyboard:accessor}}),BackupError);assert.equal(invoked,false);
});

test('null unbinds survive export and allow another action to use that vacated default',()=>{
  const value={version:1,bindings:{build1:'Digit2',build2:null,pause:null}};
  const restored=parseBackup(backup(raw(),{settings:{keyboard:value}})).data.settings.keyboard;
  assert.deepEqual(restored,value);const effective=effectiveBindings(restored);
  assert.equal(effective.build1,'Digit2');assert.equal(effective.build2,null);assert.equal(effective.pause,null);
  assert.equal(effective.build3,'Digit3');
});

test('keyboard preference writes are immutable, verified and retried after quota and readback failures',()=>{
  for(const mode of ['drop','throw','throw-after-write','readback']){
    const {r,prefs}=preferenceFixture(),write=r.setItem,read=r.getItem;
    const next=structuredClone(settings);next.keyboard.bindings.build1='KeyW';prefs.stage(next);
    next.keyboard.bindings.build1='KeyE';let unreadable=false;
    r.setItem=(key,value)=>{if(mode==='drop')return;if(mode==='throw')throw Error('quota');write(key,value);if(mode==='readback')unreadable=true;else throw Error('post write');};
    r.getItem=key=>{if(unreadable&&key===K.settings)throw Error('read unavailable');return read(key);};
    assert.equal(prefs.retry(),mode==='throw-after-write',mode);
    if(mode!=='throw-after-write')assert.equal(prefs.dirty(),true);
    r.setItem=write;r.getItem=read;assert.equal(prefs.retry(),true);
    assert.equal(prefs.dirty(),false);assert.equal(JSON.parse(r.data.get(K.settings)).keyboard.bindings.build1,'KeyW');
    const count=writes(r).length;assert.equal(prefs.retry(),true);assert.equal(writes(r).length,count);
  }
});

test('stale preferences and changed profile epochs cannot replace newer keyboard or campaign settings',()=>{
  for(const changed of ['settings','profile']){
    const {r,prefs}=preferenceFixture();prefs.stage({...settings,keyboard:{version:1,bindings:{build1:'KeyW'}}});
    if(changed==='settings')r.data.set(K.settings,JSON.stringify({...settings,volume:.25}));
    else r.data.set(MARKER,marker(CURRENT_PROFILE_PROTOCOL_VERSION,'new-profile'));
    r.data.set(K.campaign,JSON.stringify(createCampaignProgress()));const before=[...r.data];r.calls.length=0;
    assert.equal(prefs.retry(),false);assert.equal(prefs.dirty(),true);assert.deepEqual(writes(r),[]);
    assert.deepEqual([...r.data],before);assert.equal(prefs.reason(),changed==='settings'?'changed':'blocked');
  }
});

test('absent, unavailable and malformed preference bytes never trigger startup writes',()=>{
  for(const initial of [null,'{malformed',JSON.stringify({keyboard:{version:99,bindings:{}}})]){
    const {r,prefs}=preferenceFixture(initial),before=[...r.data];
    assert.equal(prefs.dirty(),false);assert.equal(prefs.retry(),true);assert.deepEqual([...r.data],before);assert.deepEqual(writes(r),[]);
    if(initial!==null){try{normalizeKeyboardMap(JSON.parse(prefs.initial().value).keyboard);}catch{}}
    assert.deepEqual([...r.data],before);
  }
  const r=raw([[K.settings,JSON.stringify(settings)]]),p=current(r),storage=createStorage(()=>p.storage),read=r.getItem;
  r.getItem=key=>{if(key===K.settings)throw Error('unreadable');return read(key);};
  const prefs=createPreferenceSession(storage,K.settings);prefs.stage({...settings,volume:0});r.getItem=read;r.calls.length=0;
  assert.equal(prefs.retry(),false);assert.equal(prefs.reason(),'initial-unavailable');assert.deepEqual(writes(r),[]);
  assert.deepEqual(JSON.parse(r.data.get(K.settings)),settings);
});

test('actual application startup uses validated defaults for malformed maps without rewriting retained preferences',()=>{
  const app=readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');
  const boot=app.slice(app.indexOf('const preferences = {'),app.indexOf('let soundOn = preferences.sound;'));
  for(const initial of [null,'{malformed',JSON.stringify({volume:.25,keyboard:{version:99,bindings:{}}}),
    JSON.stringify({keyboard:{version:1,bindings:{build1:'Digit2'}}}),JSON.stringify(settings)]){
    const {r,prefs}=preferenceFixture(initial),before=[...r.data];
    const context={renderer:{reducedMotion:false},preferenceSession:prefs,normalizeKeyboardMap};vm.createContext(context);vm.runInContext(boot,context);
    const loaded=JSON.parse(vm.runInContext('JSON.stringify(preferences)',context));
    assert.deepEqual(effectiveBindings(loaded.keyboard),effectiveBindings(initial===JSON.stringify(settings)?keyboard:undefined));
    if(initial?.includes('version'))assert.equal(vm.runInContext('!!keyboardLoadWarning',context),initial!==JSON.stringify(settings));
    if(initial?.includes('0.25'))assert.equal(loaded.volume,.25);
    assert.equal(prefs.dirty(),false);assert.deepEqual([...r.data],before);assert.deepEqual(writes(r),[]);
  }
});

test('actual retained-session and dirty full-backup handlers export the page keyboard map without saving it',()=>{
  const app=readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');
  for(const retained of [true,false]){
    const {r,profile,prefs}=preferenceFixture();const pageSettings=structuredClone(settings);pageSettings.keyboard.bindings.build1='KeyW';prefs.stage(pageSettings);
    const nodes=new Map(),$=id=>{if(!nodes.has(id))nodes.set(id,{checked:false,textContent:''});return nodes.get(id);};
    let downloaded=null;const before=[...r.data];r.calls.length=0;
    const context={$,started:false,profileSession:profile,preferenceSession:prefs,preferences:pageSettings,localStorage:r,
      recoveryHold:null,profileGate:null,progressDirty:false,campaignProgress:createCampaignProgress(),trialRecords:{},retainedHistory:null,knownHistory:[],knownHistoryAvailable:true,
      historySession:{view:()=>[],pendingCount:()=>0},createBackup:(storage,options)=>createBackup(storage,JSON.parse(JSON.stringify(options))),downloadBackup:text=>{downloaded=text;}};
    vm.createContext(context);
    const start=app.indexOf(retained?"$('exportRecovery').onclick":"$('exportBackup').onclick"),end=app.indexOf(retained?"$('exportRetained').onclick":"$('importBackup').onclick",start);
    vm.runInContext(app.slice(start,end),context);$(retained?'exportRecovery':'exportBackup').onclick();
    assert.ok(downloaded,$('backupStatus').textContent);assert.deepEqual(parseBackup(downloaded).data.settings,pageSettings);
    assert.deepEqual([...r.data],before);assert.deepEqual(writes(r),[]);assert.equal(prefs.dirty(),true);
    if(retained)assert.deepEqual(r.calls,[],'retained export reads none of a partly restored profile');
  }
});

test('current protocol advances only a verified marker and the old real protocol-six source remains pinned',()=>{
  assert.equal(CURRENT_PROFILE_PROTOCOL_VERSION, 28);assert.equal(OLD_PROTOCOL,6);
  assert.equal(createHash('sha256').update(readFileSync(new URL('./fixtures/profile-session-v017.js',import.meta.url))).digest('hex'),'980297cd20ab3ca653d132c1acb71bd7c793bed482bbaba05b53d078acbd45d0');
  for(const prior of [null,1,2,3,4,5,6,7,8,9,10,11,12,13]){
    const r=raw([[K.settings,JSON.stringify(settings)],[K.campaign,'  retained campaign bytes\n'],...(prior===null?[]:[[MARKER,marker(prior)]])]),before=domainBytes(r);
    const p=current(r);assert.equal(p.status().canWrite,true);assert.equal(JSON.parse(r.data.get(MARKER)).version,CURRENT_PROFILE_PROTOCOL_VERSION);
    assert.deepEqual(domainBytes(r),before);assert.ok(r.calls.every(([,key])=>key===MARKER));
    assert.equal(writes(r).length,prior===CURRENT_PROFILE_PROTOCOL_VERSION?0:1);
    if(prior!==null)assert.equal(JSON.parse(r.data.get(MARKER)).epoch,'retained');
  }
});

test('already-open and later-opened actual six-field clients cannot erase keyboard controls or campaign progress',()=>{
  const r=raw([[MARKER,marker(6)],[K.settings,JSON.stringify(settings)],[K.campaign,'retained campaign bytes']]);
  const old=protocolSix(()=>r,{requiredProtocolVersion:6});assert.equal(old.status().canWrite,true);
  assert.equal(current(r).status().canWrite,true);const before=[...r.data];r.calls.length=0;
  const oldPreferences={...settings};delete oldPreferences.keyboard;
  for(const client of [old,protocolSix(()=>r,{requiredProtocolVersion:6})]){
    assert.equal(client.status().canWrite,false);
    assert.throws(()=>client.storage.setItem(K.settings,JSON.stringify(oldPreferences)));
    assert.throws(()=>client.storage.setItem(K.campaign,JSON.stringify(createCampaignProgress())));
    for(const key of Object.values(K)){assert.throws(()=>client.storage.getItem(key));assert.throws(()=>client.storage.removeItem(key));assert.throws(()=>client.importStorage.setItem(key,'stale'));}
    assert.equal(client.beginImport().ok,false);assert.equal(client.beginImport({recover:true}).code,'unsupported-protocol');
  }
  assert.deepEqual([...r.data],before);assert.deepEqual(writes(r),[]);assert.ok(r.calls.every(([,key])=>key===MARKER));
});

test('current-marker write and readback failures leave existing domain bytes protected until verified reload',()=>{
  for(const mode of ['drop','throw','readback','competing']){
    const r=raw([[MARKER,marker(6)],[K.settings,JSON.stringify(settings)]]),before=domainBytes(r),read=r.getItem,write=r.setItem;let denied=false;
    r.setItem=(key,value)=>{if(key!==MARKER)return write(key,value);if(mode==='drop')return;if(mode==='throw')throw Error('quota');write(key,mode==='competing'?marker(8,'other'):value);if(mode==='readback')denied=true;};
    r.getItem=key=>{if(key===MARKER&&denied)throw Error('readback unavailable');return read(key);};
    const p=current(r);assert.equal(p.status().canWrite,false);assert.throws(()=>p.storage.setItem(K.settings,'overwrite'));assert.deepEqual(domainBytes(r),before);
    r.setItem=write;r.getItem=read;assert.throws(()=>p.storage.getItem(K.settings));assert.equal(p.beginImport({recover:true}).ok,false);
    assert.equal(current(r).status().canWrite,true);assert.deepEqual(domainBytes(r),before);
  }
});

test('keyboard import readback and rollback retain exact prior bytes and leave stale current tabs fenced',()=>{
  const text=backup(raw(),{settings:{...settings,keyboard:{version:1,bindings:{build2:'KeyW'}}}});
  for(const failedKey of Object.values(K))for(const mode of ['throw','drop','throw-after-write']){
    const original=Object.values(K).map(key=>[key,key===K.settings?JSON.stringify(settings):` exact original ${key}\n`]);
    const r=raw([[MARKER,marker(6)],...original]),p=current(r),stale=current(r),before=domainBytes(r);
    assert.equal(p.beginImport().ok,true);const write=r.setItem,remove=r.removeItem;let pending=true;
    const fault=(key,value,operation)=>{if(key===failedKey&&pending){pending=false;if(mode==='throw-after-write')operation();if(mode!=='drop')throw Error('quota');return;}operation();};
    r.setItem=(key,value)=>fault(key,value,()=>write(key,value));r.removeItem=key=>fault(key,null,()=>remove(key));
    const result=restoreBackup(p.importStorage,text);assert.equal(result.ok,false,`${failedKey} ${mode}`);assert.equal(result.rollback.complete,true);
    assert.deepEqual(domainBytes(r),before);assert.equal(p.finishImport({outcome:'rolled-back'}).ok,true);assert.equal(p.status().canWrite,true);
    assert.equal(stale.status().canWrite,false);assert.throws(()=>stale.storage.setItem(K.settings,'lost'));assert.deepEqual(domainBytes(r),before);
  }
});

test('successful keyboard import verifies the new epoch, settings and current-tab fence',()=>{
  const r=raw([[K.settings,JSON.stringify(settings)]]),p=current(r),stale=current(r),value={version:1,bindings:{pause:null,build3:'KeyP'}};
  assert.equal(p.beginImport().ok,true);assert.equal(restoreBackup(p.importStorage,backup(raw(),{settings:{keyboard:value}})).ok,true);
  assert.equal(p.finishImport({outcome:'restored'}).ok,true);assert.equal(p.status().canWrite,false);assert.equal(stale.status().canWrite,false);
  const reloaded=current(r);assert.equal(reloaded.status().canWrite,true);assert.deepEqual(JSON.parse(reloaded.storage.getItem(K.settings)),{keyboard:value});
  assert.equal(JSON.parse(r.data.get(MARKER)).version,CURRENT_PROFILE_PROTOCOL_VERSION);
});
