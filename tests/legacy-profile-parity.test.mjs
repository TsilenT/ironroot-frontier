/** Actual historical client modules, rather than a current module pretending to be an old client. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game as HistoricalGame} from '../qa/fixtures/production-v012/dist/engine.js';
import * as oldCampaign from '../qa/fixtures/production-v012/dist/campaign.js';
import * as oldBackup from '../qa/fixtures/production-v012/dist/backup.js';
import {createProfileSession as oldSession} from '../qa/fixtures/production-v012/dist/profile-session.js';
import {createProfileSession, PROFILE_MARKER_KEY} from '../dist/profile-session.js';
import * as backup from '../dist/backup.js';
import {Game} from '../dist/engine.js';
import {encodeBattle} from '../dist/battle-codec.js';
import {readHistoricalProduction} from './engine-validation-source.mjs';
const date='2026-11-06T00:00:00.000Z',keys=backup.BACKUP_STORAGE_KEYS;
const storage=(entries=[])=>{const data=new Map(entries),ops=[];return {data,ops,getItem(k){ops.push(['get',k]);return data.get(k)??null;},setItem(k,v){ops.push(['set',k,v]);data.set(k,v);},removeItem(k){ops.push(['remove',k]);data.delete(k);}};};
const fullProgress=()=>{const p=oldCampaign.createCampaignProgress();for(const m of oldCampaign.CAMPAIGN_MISSIONS)p.missions[m.id]={completed:true,stars:3,bestTime:10};return p;};
const oldEnvelope=game=>({format:'ironroot-save',version:2,challengeId:null,campaignId:null,game:game.serialize()});

test('current legacy backup export and parse match genuine production bytes on all three maps and all sixteen missions',()=>{
  const campaign=fullProgress();
  const cases=[...['classic','long-march','twin-span'].map(mapId=>({game:new HistoricalGame({mapId,seed:57}),campaignId:null})),...oldCampaign.CAMPAIGN_MISSIONS.map(m=>({game:oldCampaign.createCampaignMission(m.id),campaignId:m.id}))];
  for(const {game,campaignId} of cases){
    const battle={...oldEnvelope(game),campaignId};
    const options={createdAt:date,campaign,trials:{},settings:{quality:'high'},history:[{won:false,difficulty:game.difficulty,time:10,kills:0,built:2,date,mapId:game.map.id,...(campaignId?{campaignId}:{})}],battle};
    const oldText=oldBackup.createBackup(storage(),options),text=backup.createBackup(storage(),options);
    assert.equal(text,oldText,(campaignId||game.map.id)+' exact backup JSON');
    assert.deepEqual(backup.parseBackup(oldText),oldBackup.parseBackup(oldText));
    assert.deepEqual(Game.restore(game.serialize()).serialize(),game.serialize());
    const a=storage([['unrelated','keep']]),b=storage([['unrelated','keep']]);
    assert.deepEqual(backup.restoreBackup(a,oldText),oldBackup.restoreBackup(b,oldText));
    assert.deepEqual([...a.data],[...b.data]);
  }
});

test('genuine production protocol2 ordinary reads/writes and unconfirmed imports are fenced after protocol3 without losing domain bytes',()=>{
  for(const phase of ['unmarked','ready']){
    const entries=Object.values(keys).map((k,i)=>[k,` original possibly corrupt domain ${i}\n`]);
    if(phase==='ready')entries.push([PROFILE_MARKER_KEY,JSON.stringify({format:'ironroot-profile',version:2,epoch:'historic',phase:'ready'})]);
    const s=storage(entries),old=oldSession(()=>s,{requiredProtocolVersion:2});
    assert.equal(old.status().canWrite,true);const before=new Map(s.data),oldMarker=JSON.parse(s.data.get(PROFILE_MARKER_KEY));s.ops.length=0;
    const next=createProfileSession(()=>s,{requiredProtocolVersion:3});assert.equal(next.status().canWrite,true);
    const marker=JSON.parse(s.data.get(PROFILE_MARKER_KEY));assert.equal(marker.version,3);assert.equal(marker.epoch,oldMarker.epoch);
    for(const key of Object.values(keys))assert.equal(s.data.get(key),before.get(key));
    const after=[...s.data];s.ops.length=0;
    for(const client of [old,oldSession(()=>s,{requiredProtocolVersion:2})]){
      assert.equal(client.status().canWrite,false);assert.equal(client.beginImport().ok,false);
      for(const key of Object.values(keys))for(const call of [()=>client.storage.getItem(key),()=>client.storage.setItem(key,'stale'),()=>client.storage.removeItem(key)])assert.throws(call);
    }
    assert.deepEqual([...s.data],after);assert.ok(s.ops.every(([kind])=>kind==='get'));
  }
});

test('historical importer refuses a new-format backup before any destination access',()=>{
  const game=new Game({rulesetId:'frontier-rootwarden-open'}),battle=encodeBattle(game,{kind:'skirmish',id:'standard',revision:1});
  const text=backup.createBackup(storage(),{createdAt:date,battle});assert.equal(JSON.parse(text).version,2);
  const target=storage([[keys.battle,'old resumable bytes']]);
  assert.equal(oldBackup.restoreBackup(target,text).ok,false);assert.deepEqual(target.ops,[]);assert.equal(target.data.get(keys.battle),'old resumable bytes');
});


test('documented historical negative control: explicit destructive recovery can downgrade the marker, while the modern tab blocks every subsequent write',()=>{
  // This is a historical limitation, not an unconfirmed automatic write. The old UI
  // requires a file, warns about replacement, requires recovery consent, and then
  // requires the Replace local saves action. Current future-version refusal stays strict.
  const html=String(readHistoricalProduction('index.html')),app=String(readHistoricalProduction('app.js'));
  assert.match(html,/This replaces all campaign stars, trial records, preferences, battle\s+history and the saved battle/);
  assert.match(html,/Close other Ironroot tabs before restoring a backup/);
  assert.match(html,/id="backupRecoveryConsent" type="checkbox"/);
  assert.match(html,/Replace local saves/);
  assert.match(app,/if \(recover && !\$\('backupRecoveryConsent'\)\.checked\) return;/);
  for(const fresh of [false,true]){
    const s=storage(Object.values(keys).map((k,i)=>[k,`new content ${i}`]));
    const stale=oldSession(()=>s,{requiredProtocolVersion:2});
    const next=createProfileSession(()=>s,{requiredProtocolVersion:3});
    const client=fresh?oldSession(()=>s,{requiredProtocolVersion:2}):stale;
    assert.equal(client.status().canWrite,false);assert.equal(client.beginImport().ok,false);
    const start=client.beginImport({recover:true});assert.equal(start.ok,true,'genuine cached historical behavior');
    assert.equal(JSON.parse(s.data.get(PROFILE_MARKER_KEY)).version,2);
    assert.equal(JSON.parse(s.data.get(PROFILE_MARKER_KEY)).phase,'restoring');
    const text=oldBackup.createBackup(storage(),{createdAt:date});
    assert.equal(oldBackup.restoreBackup(client.importStorage,text).ok,true);
    assert.equal(s.data.has(keys.battle),false,'explicit replacement removes battle absent from old backup');
    assert.deepEqual(JSON.parse(s.data.get(keys.campaign)),oldCampaign.createCampaignProgress());
    const before=[...s.data];s.ops.length=0;
    assert.equal(next.status().canWrite,false);assert.equal(next.beginImport().ok,false);
    for(const key of Object.values(keys))for(const call of [()=>next.storage.getItem(key),()=>next.storage.setItem(key,'overwrite'),()=>next.storage.removeItem(key)])assert.throws(call);
    assert.deepEqual([...s.data],before);assert.ok(s.ops.every(([kind])=>kind==='get'));
  }
});
