import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {CURRENT_PROFILE_PROTOCOL_VERSION,createProfileSession,PROFILE_MARKER_KEY as MARKER} from './fixtures/profile-session-v017.js';
import {CURRENT_PROFILE_PROTOCOL_VERSION as HISTORICAL_PROFILE_PROTOCOL_VERSION,createProfileSession as historicalProtocolFive} from './fixtures/profile-session-v016.js';
import {createCampaignProgress,CAMPAIGN_PROGRESS_MISSIONS,createProgressionCampaignMission} from '../dist/campaign.js';
import {encodeBattle,scenarioForBattle,identityOf,decodeBattle} from '../dist/battle-codec.js';
import {createBackup,parseBackup,restoreBackup,BACKUP_STORAGE_KEYS as K} from '../dist/backup.js';
import {createProfileSession as createCurrentProfileSession, CURRENT_PROFILE_PROTOCOL_VERSION as LATEST_PROFILE_PROTOCOL_VERSION} from '../dist/profile-session.js';
import {trainingProfileFixture} from '../qa/browser/training-fixtures.mjs';
const keys=Object.values(K),date='2026-11-07T00:00:00.000Z';
const marker=(version,phase='ready',epoch='retained')=>JSON.stringify({format:'ironroot-profile',version,epoch,phase});
function raw(entries=[]){const data=new Map(entries),calls=[];return {data,calls,
  getItem(k){calls.push(['get',k]);return data.get(k)??null;},
  setItem(k,v){calls.push(['set',k,v]);data.set(k,v);},removeItem(k){calls.push(['remove',k]);data.delete(k);},
};}
let epoch=0;
const current=r=>createProfileSession(()=>r,{requiredProtocolVersion:CURRENT_PROFILE_PROTOCOL_VERSION,newEpoch:()=>`automatic-air-${++epoch}`});
const originalDomains=()=>keys.map((key,i)=>[key,`  original possibly corrupt domain ${i}\n`]);
const domainBytes=r=>keys.map(key=>[key,r.data.get(key)??null]);
const writes=r=>r.calls.filter(([op])=>op!=='get');
const domainCalls=r=>r.calls.filter(([,key])=>keys.includes(key));
function automaticAirBackup(){
  const campaign={...createCampaignProgress(),missions:Object.fromEntries(CAMPAIGN_PROGRESS_MISSIONS.filter(m=>m.id!=='the-long-screen'&&m.id!=='the-hammer-turns'&&m.id!=='salt-in-the-stores'&&m.id!=='the-archers-quay').map(m=>[m.id,{completed:true,stars:2,bestTime:60}]))};
  const game=createProgressionCampaignMission('wings-of-ash',campaign),ref=scenarioForBattle(null,'wings-of-ash',game);
  const history=[{won:false,draw:false,difficulty:game.difficulty,time:1,kills:0,built:1,date,identity:identityOf(game,ref)}];
  return createBackup(raw(),{createdAt:date,campaign,history,settings:{quality:'low'},trials:{},battle:encodeBattle(game,ref,{campaignProgress:campaign})});
}

test('automatic-air protocol is explicitly six, historical default stays one, and actual v0.16 source stays pinned',()=>{
  assert.equal(CURRENT_PROFILE_PROTOCOL_VERSION,6);
  assert.equal(HISTORICAL_PROFILE_PROTOCOL_VERSION,5);
  assert.equal(createHash('sha256').update(readFileSync(new URL('./fixtures/profile-session-v016.js',import.meta.url))).digest('hex'),'f5e50130fe10d33d0f3c8d911e465413dcb969243d12b62e27d62eb954180f19');
  const r=raw(),p=createProfileSession(()=>r,{newEpoch:()=> 'historical-default'});
  assert.equal(r.data.has(MARKER),false);assert.equal(p.beginImport().ok,true);assert.equal(JSON.parse(r.data.get(MARKER)).version,1);
});

test('protocol six upgrades only the ready marker and verifies it before the first of five domain reads or writes',()=>{
  for(const prior of [null,...[1,2,3,4,5].map(version=>marker(version))]){
    const r=raw([...originalDomains(),...(prior===null?[]:[[MARKER,prior]])]),before=domainBytes(r),p=current(r);
    assert.equal(p.status().canWrite,true);assert.equal(JSON.parse(r.data.get(MARKER)).version,6);
    if(prior)assert.equal(JSON.parse(r.data.get(MARKER)).epoch,'retained');
    assert.deepEqual(domainBytes(r),before);assert.deepEqual(domainCalls(r),[]);
    assert.deepEqual(writes(r),[['set',MARKER,r.data.get(MARKER)]]);
    const setIndex=r.calls.findIndex(([op])=>op==='set');assert.ok(r.calls.slice(setIndex+1).some(([op,k])=>op==='get'&&k===MARKER));
    for(const [key,value] of before)assert.equal(p.storage.getItem(key),value);
    assert.deepEqual(domainBytes(r),before);
  }
});

test('already-open and freshly-opened real protocol-five clients refuse six including explicit recovery with exact byte retention',()=>{
  const r=raw([[MARKER,marker(5)],...originalDomains()]),old=historicalProtocolFive(()=>r,{requiredProtocolVersion:5});
  assert.equal(old.status().canWrite,true);const before=domainBytes(r),next=current(r);assert.equal(next.status().canWrite,true);
  r.calls.length=0;
  for(const client of [old,historicalProtocolFive(()=>r,{requiredProtocolVersion:5})]){
    assert.equal(client.status().canWrite,false);
    for(const key of keys){assert.throws(()=>client.storage.getItem(key));assert.throws(()=>client.storage.setItem(key,'erase'));assert.throws(()=>client.storage.removeItem(key));}
    assert.equal(client.beginImport().ok,false);const recovery=client.beginImport({recover:true});assert.equal(recovery.ok,false);assert.equal(recovery.code,'unsupported-protocol');
    for(const key of keys)assert.throws(()=>client.importStorage.setItem(key,'bypass'));
  }
  assert.deepEqual(writes(r),[]);assert.deepEqual(domainCalls(r),[]);assert.deepEqual(domainBytes(r),before);assert.equal(JSON.parse(r.data.get(MARKER)).version,6);
});

test('current marker failures and uncertain upgrades block every domain until a verified reload',()=>{
  for(const mode of ['initial-read','drop-write','throw-write','write-read-denied','competing-marker']){
    const r=raw([[MARKER,marker(5)],...originalDomains()]),before=domainBytes(r),read=r.getItem,write=r.setItem;
    let denied=mode==='initial-read';
    r.getItem=k=>{if(k===MARKER&&denied){r.calls.push(['get-denied',k]);throw Error('read blocked');}return read(k);};
    r.setItem=(k,v)=>{
      if(k!==MARKER)return write(k,v);
      if(mode==='drop-write')return;
      if(mode==='throw-write')throw Error('quota');
      if(mode==='competing-marker')return write(k,marker(6,'ready','other'));
      write(k,v);if(mode==='write-read-denied')denied=true;
    };
    const p=current(r);assert.equal(p.status().canWrite,false);
    for(const key of keys){assert.throws(()=>p.storage.getItem(key));assert.throws(()=>p.storage.setItem(key,'overwrite'));assert.throws(()=>p.storage.removeItem(key));}
    assert.deepEqual(domainCalls(r),[]);assert.deepEqual(domainBytes(r),before);
    denied=false;r.setItem=write;
    // A later successful read does not bless failed construction in this tab.
    for(const key of keys)assert.throws(()=>p.storage.getItem(key));
    assert.equal(p.beginImport({recover:true}).ok,false);assert.deepEqual(domainBytes(r),before);
    const reloaded=current(r);assert.equal(reloaded.status().canWrite,true);
    for(const [key,value] of before)assert.equal(reloaded.storage.getItem(key),value);
  }
});

test('a marker adapter throwing after a verified successful write is accepted without changing domain bytes',()=>{
  const r=raw([[MARKER,marker(5)],...originalDomains()]),before=domainBytes(r),write=r.setItem;
  r.setItem=(k,v)=>{write(k,v);throw Error('post-write error');};const p=current(r);
  assert.equal(p.status().canWrite,true);assert.deepEqual(domainBytes(r),before);assert.deepEqual(domainCalls(r),[]);
});

test('unfinished, malformed or future markers never upgrade implicitly, and future recovery cannot downgrade',()=>{
  for(const prior of [...[1,2,3,4,5,6].flatMap(version=>[marker(version,'restoring'),marker(version,'failed')]),marker(7),'malformed','{}']){
    const r=raw([[MARKER,prior],...originalDomains()]),before=domainBytes(r),p=current(r);
    assert.equal(p.status().canWrite,false);assert.deepEqual(writes(r),[]);assert.equal(r.data.get(MARKER),prior);
    for(const key of keys){assert.throws(()=>p.storage.getItem(key));assert.throws(()=>p.storage.setItem(key,'lost'));assert.throws(()=>p.storage.removeItem(key));}
    if(prior===marker(7)){assert.equal(p.beginImport({recover:true}).code,'unsupported-protocol');assert.deepEqual(writes(r),[]);}
    assert.deepEqual(domainBytes(r),before);assert.deepEqual(domainCalls(r),[]);
  }
});

test('five-domain automatic-air backup imports retain exact identities and stale-tab fences through verified finalization',()=>{
  const r=raw([[MARKER,marker(5)],...originalDomains()]),prior=historicalProtocolFive(()=>r,{requiredProtocolVersion:5}),p=current(r),stale=current(r),text=automaticAirBackup();
  assert.equal(p.beginImport().ok,true);
  assert.equal(JSON.parse(r.data.get(MARKER)).version,6);
  for(const key of keys){assert.throws(()=>stale.storage.getItem(key));assert.throws(()=>prior.storage.getItem(key));}
  const result=restoreBackup(p.importStorage,text);assert.equal(result.ok,true);
  assert.equal(p.finishImport({outcome:'restored'}).ok,true);assert.equal(p.status().canWrite,false);assert.equal(stale.status().canWrite,false);
  const ready=current(r);assert.equal(ready.status().canWrite,true);
  const parsed=parseBackup(text),decoded=decodeBattle(ready.storage.getItem(K.battle),{campaignProgress:parsed.data.campaign});
  assert.equal(decoded.scenario.revision,5);assert.equal(decoded.game.ruleset.id,'frontier-campaign-citadel-open');
  assert.deepEqual(JSON.parse(ready.storage.getItem(K.history)),parsed.data.history);
  assert.equal(prior.beginImport({recover:true}).code,'unsupported-protocol');
});

test('a failed replacement at each of five domains rolls back exact raw bytes before returning ready',()=>{
  for(const failedKey of keys)for(const mode of ['throw','drop','throw-after-write']){
    const r=raw([[MARKER,marker(5)],...originalDomains()]),before=domainBytes(r),p=current(r),text=automaticAirBackup();
    assert.equal(p.beginImport().ok,true);const write=r.setItem;let pending=true;
    r.setItem=(k,v)=>{if(k===failedKey&&pending){pending=false;if(mode==='throw-after-write')write(k,v);if(mode!=='drop')throw Error('domain quota');return;}write(k,v);};
    const result=restoreBackup(p.importStorage,text);assert.equal(result.ok,false,failedKey+' '+mode);assert.equal(result.rollback.complete,true);
    assert.deepEqual(domainBytes(r),before);assert.equal(p.finishImport({outcome:'rolled-back'}).ok,true);assert.equal(p.status().canWrite,true);
    assert.equal(JSON.parse(r.data.get(MARKER)).version,6);
  }
});

test('unverified rollback and marker finalization remain blocked until the exact same outcome is verified',()=>{
  const r=raw([[MARKER,marker(5)],...originalDomains()]),p=current(r),text=automaticAirBackup();assert.equal(p.beginImport().ok,true);
  const write=r.setItem;let domainWrites=0;
  r.setItem=(k,v)=>{if(k!==MARKER&&++domainWrites>=2)throw Error('quota');write(k,v);};
  const failed=restoreBackup(p.importStorage,text);assert.equal(failed.ok,false);assert.equal(failed.rollback.complete,false);
  assert.equal(p.finishImport({outcome:'failed'}).ok,true);assert.equal(p.status().canWrite,false);
  for(const key of keys)assert.throws(()=>p.storage.getItem(key));
  r.setItem=write;const recovery=current(r);assert.equal(recovery.beginImport({recover:true}).ok,true);
  assert.equal(restoreBackup(recovery.importStorage,text).ok,true);
  r.setItem=(k,v)=>{if(k===MARKER&&JSON.parse(v).phase==='ready')throw Error('marker quota');write(k,v);};
  assert.equal(recovery.finishImport({outcome:'restored'}).ok,false);assert.equal(recovery.finishImport({outcome:'rolled-back'}).code,'outcome-conflict');
  assert.equal(recovery.status().canWrite,false);r.setItem=write;assert.equal(recovery.finishImport({outcome:'restored'}).ok,true);
  assert.equal(current(r).status().canWrite,true);
});

test('current synthetic training profile is already the current protocol and preserves every domain without migration',()=>{
  const fixture=trainingProfileFixture(),r=raw(Object.entries(fixture.values)),before=[...r.data];
  assert.equal(JSON.parse(r.data.get(MARKER)).version,LATEST_PROFILE_PROTOCOL_VERSION);
  const p=createCurrentProfileSession(()=>r,{requiredProtocolVersion:LATEST_PROFILE_PROTOCOL_VERSION});assert.equal(p.status().canWrite,true);for(const key of keys)assert.equal(p.storage.getItem(key),fixture.values[key]);
  assert.deepEqual([...r.data],before);assert.deepEqual(writes(r),[]);
  assert.equal(fixture.backup.data.battle.version,2,'current profile protocol does not relabel a historical battle envelope');
});


test('an actual protocol-five importer loses every operation when explicit protocol-six recovery supersedes it',()=>{
  const r=raw([[MARKER,marker(5)],...originalDomains()]),before=domainBytes(r);
  const old=historicalProtocolFive(()=>r,{requiredProtocolVersion:5,newEpoch:()=> 'old-import'});
  assert.equal(old.beginImport().ok,true);
  const fresh=current(r);assert.equal(fresh.status().canWrite,false);assert.equal(JSON.parse(r.data.get(MARKER)).version,5);
  assert.equal(fresh.beginImport({recover:true}).ok,true);assert.equal(JSON.parse(r.data.get(MARKER)).version,6);
  const ownedMarker=r.data.get(MARKER);r.calls.length=0;
  for(const storage of [old.storage,old.importStorage])for(const key of keys){
    assert.throws(()=>storage.getItem(key));assert.throws(()=>storage.setItem(key,'stale'));assert.throws(()=>storage.removeItem(key));
  }
  assert.equal(old.finishImport({outcome:'restored'}).ok,false);
  assert.equal(old.finishImport({outcome:'rolled-back'}).ok,false);
  assert.equal(old.beginImport({recover:true}).code,'unsupported-protocol');
  assert.equal(r.data.get(MARKER),ownedMarker);assert.deepEqual(writes(r),[]);assert.deepEqual(domainCalls(r),[]);assert.deepEqual(domainBytes(r),before);
  assert.equal(restoreBackup(fresh.importStorage,automaticAirBackup()).ok,true);
  assert.equal(fresh.finishImport({outcome:'restored'}).ok,true);
  assert.equal(current(r).status().canWrite,true);
});

test('two protocol-six importers retain ownership fences and cannot roll back over a newer recovered profile',()=>{
  const r=raw([[MARKER,marker(6)],...originalDomains()]),first=current(r),second=current(r);
  assert.equal(first.beginImport().ok,true);first.importStorage.setItem(K.settings,'first partial write');
  assert.equal(second.beginImport({recover:true}).ok,true);assert.equal(restoreBackup(second.importStorage,automaticAirBackup()).ok,true);
  assert.equal(second.finishImport({outcome:'restored'}).ok,true);
  const before=[...r.data];r.calls.length=0;
  for(const key of keys){
    assert.throws(()=>first.importStorage.getItem(key));
    for(const storage of [first.storage,first.importStorage]){assert.throws(()=>storage.setItem(key,'stale'));assert.throws(()=>storage.removeItem(key));}
  }
  assert.equal(first.finishImport({outcome:'rolled-back'}).ok,false);assert.equal(first.beginImport({recover:true}).ok,false);
  assert.deepEqual(writes(r),[]);assert.deepEqual(domainCalls(r),[]);assert.deepEqual([...r.data],before);
});
