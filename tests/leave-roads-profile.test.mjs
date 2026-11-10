import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import * as old27 from './fixtures/profile-session-v0360.js';
import {createProfileSession, CURRENT_PROFILE_PROTOCOL_VERSION as VERSION, PROFILE_MARKER_KEY as KEY} from '../dist/profile-session.js';
import {createBackup,parseBackup,BACKUP_STORAGE_KEYS as K} from '../dist/backup.js';
import {CAMPAIGN_PROGRESS_MISSIONS,createCampaignProgress,createCampaignMission,campaignScenarioForGame} from '../dist/campaign.js';
import {encodeBattle,decodeBattle,identityOf} from '../dist/battle-codec.js';
const stamp=(version,phase='ready')=>JSON.stringify({format:'ironroot-profile',version,phase,epoch:'earned-profile'});
function backend(entries=[]){const data=new Map(entries),reads=[],writes=[];return {data,reads,writes,getItem(k){reads.push(k);return data.get(k)??null;},setItem(k,v){writes.push(k);data.set(k,String(v));},removeItem(k){writes.push(k);data.delete(k);}};}
const current=raw=>createProfileSession(()=>raw,{requiredProtocolVersion:VERSION,newEpoch:()=> 'leave-roads-profile'});
test('profile28 is exactly four marker-only substitutions from actual tested profile27',()=>{
 assert.equal(VERSION,28);assert.equal(old27.CURRENT_PROFILE_PROTOCOL_VERSION,27);
 const source=readFileSync(new URL('./fixtures/profile-session-v0360.js',import.meta.url),'utf8');
 const provenance=JSON.parse(readFileSync(new URL('./fixtures/leave-roads-parent-v0360.json',import.meta.url)));
 assert.equal(provenance.commit,'d52acb1de3c8f4d5bba6ca886234b3b81a8add21');
 assert.equal(createHash('sha256').update(source).digest('hex'),provenance.profileSessionSha256);
 const expected=source.replace('CURRENT_PROFILE_PROTOCOL_VERSION = 27','CURRENT_PROFILE_PROTOCOL_VERSION = 28').replace('protocol 27 fences The Empty Purse progress, ordinary economy checkpoints and exact result identities from older writers.','protocol 27 fences The Empty Purse progress, ordinary economy checkpoints and exact result identities from older writers; protocol 28 fences Leave No Road Closed progress, three-road control checkpoints and exact result identities from older writers.').replace('25, 26, 27].includes','25, 26, 27, 28].includes').replace('25, 26 or 27.','25, 26, 27 or 28.');
 assert.equal(readFileSync(new URL('../dist/profile-session.js',import.meta.url),'utf8'),expected);
});
test('profile28 upgrades absent and ready versions1–28 without reading or rewriting earned domain bytes',()=>{
 for(const v of [null,...Array.from({length:28},(_,i)=>i+1)]){
  const opaque=Object.values(K).map((k,i)=>[k,'  opaque-earned-byte-'+i+'\n']),raw=backend([...(v===null?[]:[[KEY,stamp(v)]]),...opaque]);
  assert.ok(current(raw).status().canWrite);assert.equal(JSON.parse(raw.data.get(KEY)).version,28);
  assert.deepEqual(opaque.map(([k])=>raw.data.get(k)),opaque.map(([,v])=>v));assert.ok(raw.reads.every(k=>k===KEY));assert.deepEqual(raw.writes,v===28?[]:[KEY]);
 }
});
test('actual open/reopened27 writers fence every normal and import domain operation after28',()=>{
 const raw=backend([[KEY,stamp(27)],...Object.values(K).map(k=>[k,'earned'])]),open=old27.createProfileSession(()=>raw,{requiredProtocolVersion:27});
 assert.ok(open.status().canWrite);assert.ok(current(raw).status().canWrite);const bytes=[...raw.data];raw.reads.length=0;raw.writes.length=0;
 for(const old of [open,old27.createProfileSession(()=>raw,{requiredProtocolVersion:27})]){
  assert.equal(old.status().canWrite,false);
  for(const storage of [old.storage,old.importStorage])for(const k of Object.values(K)){assert.throws(()=>storage.getItem(k));assert.throws(()=>storage.setItem(k,'lost'));assert.throws(()=>storage.removeItem(k));}
  assert.equal(old.beginImport({recover:true}).code,'unsupported-protocol');
 }
 assert.deepEqual([...raw.data],bytes);assert.deepEqual(raw.writes,[]);assert.ok(raw.reads.every(k=>k===KEY));
});
test('future and interrupted markers never permit profile28 domain writes',()=>{
 for(const [version,phase] of [[29,'ready'],[27,'restoring'],[28,'failed']]){
  const raw=backend([[KEY,stamp(version,phase)],[K.campaign,'earned']]),before=[...raw.data],p=current(raw);
  assert.equal(p.status().canWrite,false);assert.throws(()=>p.storage.setItem(K.campaign,'lost'));assert.deepEqual([...raw.data],before);
 }
});
test('marker28 preserves actual earned Wake records and exact active reserve checkpoint in normal backup',()=>{
 const progress={...createCampaignProgress(),missions:Object.fromEntries(CAMPAIGN_PROGRESS_MISSIONS.filter(m=>m.id!=='leave-no-road-closed').map((m,i)=>[m.id,{completed:true,stars:i%3+1,bestTime:60+i}]))};
 const game=createCampaignMission('wake-the-reserve'),scenario=campaignScenarioForGame(game,'wake-the-reserve');
 const post=game.state.buildings.find(b=>b.id===game.state.minorReserve.postId);game._damage(post,post.hp,0);game.update(.05);
 const data={campaign:progress,trials:{},settings:{sound:false},history:[{won:true,draw:false,difficulty:game.difficulty,time:60,kills:0,built:0,date:'2026-11-10T00:00:00.000Z',identity:identityOf(game,scenario)}],battle:encodeBattle(game,scenario,{campaignProgress:progress})};
 const raw=backend([[KEY,stamp(27)],...Object.entries(K).map(([domain,key])=>[key,'  '+JSON.stringify(data[domain])+'\n'])]),before=[...raw.data].filter(([k])=>k!==KEY),profile=current(raw);
 assert.ok(profile.status().canWrite);assert.deepEqual([...raw.data].filter(([k])=>k!==KEY),before);
 const parsed=parseBackup(createBackup(profile.storage,{createdAt:'2026-11-10T00:00:00.000Z'}));assert.deepEqual(parsed.data,data);
 assert.deepEqual(decodeBattle(parsed.data.battle,{campaignProgress:parsed.data.campaign}).game.serialize(),game.serialize());
});

test('profile28 five-domain backup retains Road control checkpoint and all 36 earlier current/legacy records',()=>{
 const id='leave-no-road-closed',progress={...createCampaignProgress(),missions:Object.fromEntries(CAMPAIGN_PROGRESS_MISSIONS.filter(m=>m.id!==id).map(m=>[m.id,{completed:true,stars:1,bestTime:60}]))};
 const g=createCampaignMission(id);g.state.time=20;g.tick=400;g.state.campaignControl.heldSeconds=9.5;g.state.campaignControl.bridges.forEach(b=>b.owner=0);
 const scenario=campaignScenarioForGame(g,id),data={campaign:progress,trials:{},settings:{sound:false},history:[{won:true,draw:false,difficulty:g.difficulty,time:500,kills:0,built:0,date:'2026-11-10T00:00:00.000Z',identity:identityOf(g,scenario)}],battle:encodeBattle(g,scenario,{campaignProgress:progress})};
 const raw=backend([[KEY,stamp(28)],...Object.entries(K).map(([domain,key])=>[key,JSON.stringify(data[domain])])]);
 const parsed=parseBackup(createBackup(current(raw).storage,{createdAt:'2026-11-10T00:00:00.000Z'}));assert.deepEqual(parsed.data,data);assert.equal(Object.keys(parsed.data.campaign.missions).length,36);assert.deepEqual(decodeBattle(parsed.data.battle,{campaignProgress:progress}).game.serialize(),g.serialize());
});
