import {beforeFinalChapter} from './historical-catalog.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import * as old26 from './fixtures/profile-session-v0350.js';
import {createProfileSession, CURRENT_PROFILE_PROTOCOL_VERSION as VERSION, PROFILE_MARKER_KEY as KEY} from './fixtures/profile-session-v039.js';
import {createBackup,parseBackup,BACKUP_STORAGE_KEYS as K} from '../dist/backup.js';
import {CAMPAIGN_PROGRESS_MISSIONS,createCampaignProgress,createCampaignMission,campaignScenarioForGame} from '../dist/campaign.js';
import {encodeBattle,decodeBattle,identityOf} from '../dist/battle-codec.js';
const stamp=(version,phase='ready')=>JSON.stringify({format:'ironroot-profile',version,phase,epoch:'earned-profile'});
function backend(entries=[]){const data=new Map(entries),reads=[],writes=[];return {data,reads,writes,getItem(k){reads.push(k);return data.get(k)??null;},setItem(k,v){writes.push(k);data.set(k,String(v));},removeItem(k){writes.push(k);data.delete(k);}};}
const current=raw=>createProfileSession(()=>raw,{requiredProtocolVersion:VERSION,newEpoch:()=> 'empty-purse-profile'});
test('profile27 is exactly four marker-only substitutions from actual released profile26',()=>{
 assert.equal(VERSION,30);assert.equal(old26.CURRENT_PROFILE_PROTOCOL_VERSION,26);
 const source=readFileSync(new URL('./fixtures/profile-session-v0350.js',import.meta.url),'utf8');
 const provenance=JSON.parse(readFileSync(new URL('./fixtures/empty-purse-parent-v0350.json',import.meta.url)));
 assert.equal(provenance.commit,'f415b9c8197b0eeb7fad22169b6b95a9cba4a9a1');
 assert.equal(createHash('sha256').update(source).digest('hex'),provenance.profileSessionSha256);
 const expected=source.replace('CURRENT_PROFILE_PROTOCOL_VERSION = 26','CURRENT_PROFILE_PROTOCOL_VERSION = 27').replace('exact result identities from older writers.','exact result identities from older writers; protocol 27 fences The Empty Purse progress, ordinary economy checkpoints and exact result identities from older writers.').replace('24, 25, 26].includes','24, 25, 26, 27].includes').replace('24, 25 or 26.','24, 25, 26 or 27.');
 assert.equal(readFileSync(new URL('./fixtures/profile-session-v0360.js',import.meta.url),'utf8'),expected);
});
test('profile27 upgrades absent and ready versions1–28 without reading or rewriting earned domain bytes',()=>{
 for(const v of [null,...Array.from({length:30},(_,i)=>i+1)]){
  const opaque=Object.values(K).map((k,i)=>[k,'  opaque-earned-byte-'+i+'\n']),raw=backend([...(v===null?[]:[[KEY,stamp(v)]]),...opaque]);
  assert.ok(current(raw).status().canWrite);assert.equal(JSON.parse(raw.data.get(KEY)).version,30);
  assert.deepEqual(opaque.map(([k])=>raw.data.get(k)),opaque.map(([,v])=>v));assert.ok(raw.reads.every(k=>k===KEY));assert.deepEqual(raw.writes,v===30?[]:[KEY]);
 }
});
test('actual open/reopened26 writers fence every normal and import domain operation after27',()=>{
 const raw=backend([[KEY,stamp(26)],...Object.values(K).map(k=>[k,'earned'])]),open=old26.createProfileSession(()=>raw,{requiredProtocolVersion:26});
 assert.ok(open.status().canWrite);assert.ok(current(raw).status().canWrite);const bytes=[...raw.data];raw.reads.length=0;raw.writes.length=0;
 for(const old of [open,old26.createProfileSession(()=>raw,{requiredProtocolVersion:26})]){
  assert.equal(old.status().canWrite,false);
  for(const storage of [old.storage,old.importStorage])for(const k of Object.values(K)){assert.throws(()=>storage.getItem(k));assert.throws(()=>storage.setItem(k,'lost'));assert.throws(()=>storage.removeItem(k));}
  assert.equal(old.beginImport({recover:true}).code,'unsupported-protocol');
 }
 assert.deepEqual([...raw.data],bytes);assert.deepEqual(raw.writes,[]);assert.ok(raw.reads.every(k=>k===KEY));
});
test('future and interrupted markers never permit profile27 domain writes',()=>{
 for(const [version,phase] of [[31,'ready'],[26,'restoring'],[27,'failed']]){
  const raw=backend([[KEY,stamp(version,phase)],[K.campaign,'earned']]),before=[...raw.data],p=current(raw);
  assert.equal(p.status().canWrite,false);assert.throws(()=>p.storage.setItem(K.campaign,'lost'));assert.deepEqual([...raw.data],before);
 }
});
test('marker27 preserves actual earned Wake records and exact active reserve checkpoint in normal backup',()=>{
 const progress={...createCampaignProgress(),missions:Object.fromEntries(CAMPAIGN_PROGRESS_MISSIONS.filter(beforeFinalChapter).filter(m=>m.id!=='cut-the-bowstrings'&&m.id!=='three-minutes-more'&&m.id!=='cut-the-bowstrings'&&m.id!=='leave-no-road-closed'&&m.id!=='the-empty-purse').map((m,i)=>[m.id,{completed:true,stars:i%3+1,bestTime:60+i}]))};
 const game=createCampaignMission('wake-the-reserve'),scenario=campaignScenarioForGame(game,'wake-the-reserve');
 const post=game.state.buildings.find(b=>b.id===game.state.minorReserve.postId);game._damage(post,post.hp,0);game.update(.05);
 const data={campaign:progress,trials:{},settings:{sound:false},history:[{won:true,draw:false,difficulty:game.difficulty,time:60,kills:0,built:0,date:'2026-11-10T00:00:00.000Z',identity:identityOf(game,scenario)}],battle:encodeBattle(game,scenario,{campaignProgress:progress})};
 const raw=backend([[KEY,stamp(26)],...Object.entries(K).map(([domain,key])=>[key,'  '+JSON.stringify(data[domain])+'\n'])]),before=[...raw.data].filter(([k])=>k!==KEY),profile=current(raw);
 assert.ok(profile.status().canWrite);assert.deepEqual([...raw.data].filter(([k])=>k!==KEY),before);
 const parsed=parseBackup(createBackup(profile.storage,{createdAt:'2026-11-10T00:00:00.000Z'}));assert.deepEqual(parsed.data,data);
 assert.deepEqual(decodeBattle(parsed.data.battle,{campaignProgress:parsed.data.campaign}).game.serialize(),game.serialize());
});
