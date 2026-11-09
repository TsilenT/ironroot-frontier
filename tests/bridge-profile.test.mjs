import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../dist/engine.js';
import {identityOf, encodeBattle, decodeBattle} from '../dist/battle-codec.js';
import {createBackup, parseBackup, restoreBackup, BACKUP_STORAGE_KEYS as K} from '../dist/backup.js';
import {createProfileSession, CURRENT_PROFILE_PROTOCOL_VERSION, PROFILE_MARKER_KEY as MARKER} from '../dist/profile-session.js';
import {createCampaignProgress, CAMPAIGN_PROGRESS_MISSIONS} from '../dist/campaign.js';
import {CURRENT_CHALLENGES} from '../dist/challenges.js';
import {protocolEight} from './fixtures/profile-session-v0181-source.mjs';
const date='2026-11-07T00:00:00.000Z';
const marker=(version,phase='ready')=>JSON.stringify({format:'ironroot-profile',version,epoch:'earned-profile',phase});
function storage(entries=[]) {const data=new Map(entries),writes=[];return {data,writes,getItem:k=>data.get(k)??null,setItem(k,v){writes.push(k);data.set(k,v);},removeItem(k){writes.push(k);data.delete(k);}};}
function earned() {
  return {
    campaign:{...createCampaignProgress(),missions:Object.fromEntries(CAMPAIGN_PROGRESS_MISSIONS.filter(m => m.id !== 'the-shared-watch' && (m.id!=='the-long-screen'&&m.id!=='the-hammer-turns'&&m.id!=='salt-in-the-stores'&&m.id!=='the-archers-quay')).map((m,i)=>[m.id,{completed:true,stars:i%3+1,bestTime:60+i}]))},
    trials:Object.fromEntries(CURRENT_CHALLENGES.map((c,i)=>[c.id,{completed:true,bestTime:70+i}])),
    settings:{sound:false,music:false,sfx:true,volume:.3,reducedMotion:true,quality:'low',keyboard:{version:1,bindings:{build1:'KeyQ',volley:null}}},
    history:[{won:true,draw:false,challengeId:'shieldbreaker',campaignId:null,difficulty:'normal',time:75,kills:12,built:5,date}],
    battle:null
  };
}
const entries=value=>Object.entries(K).filter(([domain])=>value[domain]!==null).map(([domain,key])=>[key,'  '+JSON.stringify(value[domain])+'\n']);
const current=r=>createProfileSession(()=>r,{requiredProtocolVersion:CURRENT_PROFILE_PROTOCOL_VERSION,newEpoch:()=> 'new-profile'});
const old=r=>protocolEight.createProfileSession(()=>r,{requiredProtocolVersion:8});

test('current protocol advances only the marker and fences real v0.18.1 clients before they erase bridge choice or earned history',()=>{
  assert.equal(CURRENT_PROFILE_PROTOCOL_VERSION, 25);assert.equal(protocolEight.CURRENT_PROFILE_PROTOCOL_VERSION,8);
  const domains=entries(earned()),r=storage([[MARKER,marker(8)],...domains]),stale=old(r);
  assert.equal(stale.status().canWrite,true);
  const ready=current(r);assert.equal(ready.status().canWrite,true);
  assert.deepEqual(r.writes,[MARKER]);for(const [key,value]of domains)assert.equal(r.data.get(key),value);
  assert.deepEqual(JSON.parse(r.data.get(MARKER)),{format:'ironroot-profile',version:CURRENT_PROFILE_PROTOCOL_VERSION,epoch:'earned-profile',phase:'ready'});
  ready.storage.setItem(K.settings,JSON.stringify({...earned().settings,skirmishBridgeIncome:true}));
  const game=new Game({rulesetId:'frontier-bridge-open',ai:false});
  ready.storage.setItem(K.history,JSON.stringify([...earned().history,{won:true,draw:false,difficulty:'normal',time:100,kills:10,built:4,date,identity:identityOf(game)}]));
  const before=[...r.data];r.writes.length=0;
  for(const client of [stale,old(r)]) {
    assert.equal(client.status().canWrite,false);
    for(const key of Object.values(K)) {assert.throws(()=>client.storage.setItem(key,'stale'));assert.throws(()=>client.storage.removeItem(key));}
    assert.equal(client.beginImport({recover:true}).code,'unsupported-protocol');
  }
  assert.deepEqual([...r.data],before);assert.deepEqual(r.writes,[]);
});

test('old earned profile and checked/unchecked bridge choices survive verified backup replacement independently',()=>{
  for(const choice of [undefined,false,true]) {
    const value=earned();if(choice!==undefined)value.settings.skirmishBridgeIncome=choice;
    if(choice===true) {
      const game=new Game({rulesetId:'frontier-bridge-timed',mapId:'twin-span',ai:false});
      value.battle=encodeBattle(game);
      value.history.push({won:true,draw:false,difficulty:'normal',time:120,kills:14,built:6,date,identity:identityOf(game)});
    }
    const source=storage(entries(value)),text=createBackup(source,{createdAt:date});
    assert.deepEqual(parseBackup(text).data,value);assert.deepEqual(source.writes,[]);
    const target=storage([[MARKER,marker(8)],['unrelated','retain']]),p=current(target);
    assert.equal(p.beginImport().ok,true);assert.equal(restoreBackup(p.importStorage,text).ok,true);assert.equal(p.finishImport({outcome:'restored'}).ok,true);
    const next=current(target);assert.equal(next.status().canWrite,true);
    assert.deepEqual(parseBackup(createBackup(next.storage,{createdAt:date})).data,value);
    if(value.battle)assert.deepEqual(decodeBattle(JSON.parse(next.storage.getItem(K.battle))).game.serialize(),value.battle.game);
    assert.equal(target.data.get('unrelated'),'retain');assert.equal(JSON.parse(target.data.get(MARKER)).version,CURRENT_PROFILE_PROTOCOL_VERSION);
  }
});

test('bridge setup preference admits only optional booleans, preserving other strict settings boundaries',()=>{
  for(const choice of [null,0,1,'true',[],{},NaN])assert.throws(()=>createBackup(storage(),{createdAt:date,settings:{...earned().settings,skirmishBridgeIncome:choice}}));
  assert.throws(()=>createBackup(storage(),{createdAt:date,settings:{campaignBridgeIncome:true}}));
  for(const choice of [false,true])assert.equal(parseBackup(createBackup(storage(),{createdAt:date,settings:{skirmishBridgeIncome:choice}})).data.settings.skirmishBridgeIncome,choice);
});

test('unfinished, future and unverified protocol upgrades never alter earned domains',()=>{
  for(const prior of [marker(8,'restoring'),marker(8,'failed'),marker(CURRENT_PROFILE_PROTOCOL_VERSION+1)]) {
    const r=storage([[MARKER,prior],...entries(earned())]),before=[...r.data],p=current(r);
    assert.equal(p.status().canWrite,false);assert.deepEqual([...r.data],before);assert.deepEqual(r.writes,[]);
  }
  for(const fault of ['drop','throw','readback']) {
    const r=storage([[MARKER,marker(8)],...entries(earned())]),before=[...r.data].filter(([k])=>k!==MARKER),read=r.getItem,write=r.setItem;let denied=false;
    r.getItem=k=>{if(k===MARKER&&denied)throw Error('unverified');return read(k);};
    r.setItem=(k,v)=>{if(k!==MARKER)return write(k,v);if(fault==='drop')return;if(fault==='throw')throw Error('denied');write(k,v);denied=true;};
    const p=current(r);assert.equal(p.status().canWrite,false);assert.throws(()=>p.storage.setItem(K.campaign,'erase'));
    assert.deepEqual([...r.data].filter(([k])=>k!==MARKER),before);
  }
});
