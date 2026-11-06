import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createProfileSession,PROFILE_MARKER_KEY as MARKER} from '../dist/profile-session.js';
import {createProfileSession as priorProfile} from './fixtures/profile-session-v014.js';
import {createStorage} from '../dist/persistence.js';
import {
  createCampaignProgress,createProgressionCampaignMission,getCampaignRoster,ONBOARDING_MISSIONS,
  readCampaignProgressState,readCampaignProgress,writeCampaignProgress,
} from '../dist/campaign.js';
import {encodeBattle,decodeBattle,scenarioForBattle} from '../dist/battle-codec.js';
import {BACKUP_STORAGE_KEYS as K,createBackup,parseBackup,restoreBackup} from '../dist/backup.js';
const DATE='2026-11-06T12:00:00.000Z';
const keys=Object.values(K);
const marker=(version,phase='ready',epoch='retained')=>JSON.stringify({format:'ironroot-profile',version,epoch,phase});
const record={completed:true,stars:1,bestTime:60};
function raw(entries=[]){const data=new Map(entries),calls=[];return {data,calls,
  getItem(k){calls.push(['get',k]);return data.get(k)??null;},
  setItem(k,v){calls.push(['set',k,v]);data.set(k,v);},
  removeItem(k){calls.push(['remove',k]);data.delete(k);},
};}
let epoch=0;
const session=r=>createProfileSession(()=>r,{requiredProtocolVersion:4,newEpoch:()=>`new-${++epoch}`});
function progress(count=3){const p=createCampaignProgress();for(const m of ONBOARDING_MISSIONS.slice(0,count))p.missions[m.id]={...record};return p;}
const save=(game,id,p)=>encodeBattle(game,scenarioForBattle(null,id,game),{campaignProgress:p});
const writeCalls=r=>r.calls.filter(([op])=>op!=='get');

test('the protocol-three fixture is the actual PR1-head module, independently pinned',()=>{
  assert.equal(createHash('sha256').update(readFileSync(new URL('./fixtures/profile-session-v014.js',import.meta.url))).digest('hex'),'a74cc512340c902105e9026719e2d6a1e427443179a9e0d0a95c20737d708f89');
});

test('protocol four upgrades only a verified ready marker, retaining every domain byte and fencing actual older clients',()=>{
  for(const prior of [null,marker(1),marker(2),marker(3)]){
    const r=raw(keys.map((key,i)=>[key,`  original possibly corrupt domain ${i}\n`]));
    if(prior!==null)r.data.set(MARKER,prior);
    const before=new Map(r.data),old=priorProfile(()=>r,{requiredProtocolVersion:3});
    const bound=JSON.parse(r.data.get(MARKER));r.calls.length=0;
    const next=session(r);assert.equal(next.status().canWrite,true);
    const current=JSON.parse(r.data.get(MARKER));assert.equal(current.version,4);assert.equal(current.epoch,bound.epoch);
    for(const key of keys)assert.equal(r.data.get(key),before.get(key));
    assert.deepEqual(writeCalls(r),[['set',MARKER,r.data.get(MARKER)]]);
    r.calls.length=0;
    for(const client of [old,priorProfile(()=>r,{requiredProtocolVersion:3})]){
      assert.equal(client.status().canWrite,false);
      for(const key of keys){assert.throws(()=>client.storage.getItem(key));assert.throws(()=>client.storage.setItem(key,'stale'));assert.throws(()=>client.storage.removeItem(key));}
      assert.equal(client.beginImport().ok,false);assert.equal(client.beginImport({recover:true}).ok,false);
    }
    assert.deepEqual(writeCalls(r),[]);
  }
});

test('marker failure, uncertainty, non-ready phases and future versions never permit implicit migration or writes',()=>{
  for(const prior of [marker(3,'restoring'),marker(3,'failed'),marker(5),'broken','{}']){
    const r=raw([[MARKER,prior],[K.campaign,'untouched']]),p=session(r);
    assert.equal(p.status().canWrite,false);assert.deepEqual(writeCalls(r),[]);assert.equal(r.data.get(MARKER),prior);
    assert.throws(()=>p.storage.setItem(K.campaign,'overwrite'));
    if(prior===marker(5)){assert.equal(p.beginImport({recover:true}).ok,false);assert.deepEqual(writeCalls(r),[]);}
  }
  for(const outcome of ['drop','throw','throw-after-write','write-unreadable']){
    const r=raw([[MARKER,marker(3)],[K.battle,'original']]);let unreadable=false;
    r.getItem=k=>{if(unreadable)throw Error('denied');return r.data.get(k)??null;};
    r.setItem=(k,v)=>{if(['throw-after-write','write-unreadable'].includes(outcome))r.data.set(k,v);if(outcome==='write-unreadable')unreadable=true;if(outcome!=='drop')throw Error('quota');};
    const p=session(r);assert.equal(p.status().canWrite,outcome==='throw-after-write');assert.equal(r.data.get(K.battle),'original');
    if(outcome!=='throw-after-write'){assert.throws(()=>p.storage.getItem(K.battle));assert.throws(()=>p.storage.setItem(K.battle,'lost'));unreadable=false;assert.equal(p.status().canWrite,false);}
  }
});

test('unknown, malformed and orphaned campaign bytes are preserved by progress writes and complete-profile exports',()=>{
  const empty=createCampaignProgress();
  const invalid=[
    '{broken','null',JSON.stringify({...empty,version:2}),JSON.stringify({...empty,extra:true}),
    JSON.stringify({...empty,missions:{future:{...record}}}),JSON.stringify({...empty,missions:{'shield-at-the-fork':{...record}}}),
    JSON.stringify({...empty,missions:{'roadside-watch':{...record,extra:true}}}),
  ];
  for(const text of invalid){
    const r=raw([[K.campaign,text],[K.battle,'original battle']]),storage=createStorage(()=>r),before=[...r.data];
    assert.equal(readCampaignProgressState(storage).ok,false);
    assert.equal(writeCampaignProgress(storage,progress(1)),false);
    assert.throws(()=>createBackup(r,{createdAt:DATE,includeBattle:false}));
    assert.deepEqual([...r.data],before);assert.deepEqual(writeCalls(r),[]);
  }
  const denied={read:()=>({ok:false,value:null}),set:()=>{throw Error('must not write');}};
  assert.equal(writeCampaignProgress(denied,empty),false);assert.equal(readCampaignProgressState(denied).reason,'unavailable');
});

test('progress writes merge known achievements, refuse competing reads and verify persistence',()=>{
  const r=raw([[K.campaign,JSON.stringify(progress(2))]]),storage=createStorage(()=>r);
  assert.equal(writeCampaignProgress(storage,progress(1)),true);assert.deepEqual(readCampaignProgress(storage),progress(2));
  let reads=0,writes=0;
  const competing={get:()=>JSON.stringify(progress(++reads===1?1:2)),set:()=>{writes++;return true;}};
  assert.equal(writeCampaignProgress(competing,progress(3)),false);assert.equal(writes,0);
  const dropped={get:()=>null,set:()=>true};assert.equal(writeCampaignProgress(dropped,progress(1)),false);
  assert.equal(getCampaignRoster(readCampaignProgress(storage)).stage,3);
});

test('new progression-only and mixed-save backups roundtrip exact records and immutable replay tier',()=>{
  for(const count of [1,2,3]){
    const p=progress(count),game=createProgressionCampaignMission('roadside-watch',p),battle=save(game,'roadside-watch',p);
    for(const includeBattle of [false,true]){
      const text=createBackup(raw(),{createdAt:DATE,campaign:p,...(includeBattle?{battle}:{} )});
      assert.equal(JSON.parse(text).version,2);
      const parsed=parseBackup(text);assert.deepEqual(parsed.data.campaign,p);
      const target=raw([[K.campaign,'previous corrupt bytes'],['unrelated','keep']]);
      assert.equal(restoreBackup(target,text).ok,true);assert.equal(target.data.get('unrelated'),'keep');
      assert.deepEqual(JSON.parse(target.data.get(K.campaign)),p);
      if(includeBattle){const resumed=decodeBattle(target.data.get(K.battle),{campaignProgress:p}).game;assert.deepEqual(resumed.serialize(),game.serialize());}
      const bad=JSON.parse(text);bad.version=1;
      const untouched=raw([[K.campaign,'original']]);assert.equal(restoreBackup(untouched,JSON.stringify(bad)).ok,false);assert.deepEqual(untouched.calls,[]);
    }
  }
});

test('locked-tier and unsupported-scenario backups fail before destination access, and failed replacements restore raw bytes',()=>{
  const p=progress(),game=createProgressionCampaignMission('roadside-watch',p);
  const valid=createBackup(raw(),{createdAt:DATE,campaign:p,battle:save(game,'roadside-watch',p)});
  for(const mutate of [b=>b.data.campaign=createCampaignProgress(),b=>b.data.battle.scenario.revision=9,b=>b.data.campaign.missions.future={...record}]){
    const bad=JSON.parse(valid);mutate(bad);const target=raw([[K.battle,'original']]);
    assert.equal(restoreBackup(target,JSON.stringify(bad)).ok,false);assert.deepEqual(target.calls,[]);
  }
  const target=raw(keys.map((key,i)=>[key,` exact original raw ${i}\n`])),before=[...target.data];
  const set=target.setItem.bind(target);let failOnce=true;
  target.setItem=(key,value)=>{if(key===K.settings&&failOnce){failOnce=false;throw Error('quota');}set(key,value);};
  const result=restoreBackup(target,valid);assert.equal(result.ok,false);assert.equal(result.rollback.complete,true);assert.deepEqual([...target.data],before);
});

test('protocol-four import finalization and stale-session fences stay authoritative',()=>{
  for(const outcome of ['restored','rolled-back','failed']){
    const r=raw(),a=session(r),b=session(r),text=createBackup(raw(),{createdAt:DATE,campaign:progress(1)});
    assert.equal(a.beginImport().ok,true);assert.equal(b.status().canWrite,false);
    assert.equal(restoreBackup(a.importStorage,text).ok,true);
    assert.equal(a.finishImport({outcome}).ok,true);assert.equal(JSON.parse(r.data.get(MARKER)).version,4);
    assert.equal(b.status().canWrite,false);assert.equal(a.status().canWrite,outcome==='rolled-back');
    assert.equal(session(r).status().canWrite,outcome!=='failed');
  }
});
