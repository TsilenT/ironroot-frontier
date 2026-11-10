import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';
import * as old from './fixtures/profile-session-v038-candidate.js';
import {createProfileSession,CURRENT_PROFILE_PROTOCOL_VERSION as VERSION,PROFILE_MARKER_KEY as KEY} from '../dist/profile-session.js';
import {createBackup,parseBackup,restoreBackup,BACKUP_STORAGE_KEYS as K} from '../dist/backup.js';
import * as c from '../dist/campaign.js';import {encodeBattle,decodeBattle,identityOf} from '../dist/battle-codec.js';
const marker=(version,phase='ready')=>JSON.stringify({format:'ironroot-profile',version,phase,epoch:'earned'});
const backend=entries=>{const data=new Map(entries),calls=[];return {data,calls,getItem(k){calls.push(['get',k]);return data.get(k)??null;},setItem(k,v){calls.push(['set',k]);data.set(k,String(v));},removeItem(k){calls.push(['remove',k]);data.delete(k);}};};
const current=b=>createProfileSession(()=>b,{requiredProtocolVersion:VERSION,newEpoch:()=> 'bowstrings'});
const progress=()=>({...c.createCampaignProgress(),missions:Object.fromEntries(c.CAMPAIGN_PROGRESS_MISSIONS.filter(m=>m.id!=='cut-the-bowstrings').map(m=>[m.id,{completed:true,stars:1,bestTime:60}]))});
test('protocol30 is only the marker fence change from reviewed pending0.38 protocol29',()=>{
 const source=readFileSync(new URL('./fixtures/profile-session-v038-candidate.js',import.meta.url),'utf8'),provenance=JSON.parse(readFileSync(new URL('./fixtures/bowstrings-parent-v038-candidate.json',import.meta.url)));
 assert.equal(provenance.commit,'85e5d8930d53deb105bf1708e54ff35fa6aa4dad');assert.equal(createHash('sha256').update(source).digest('hex'),provenance.profileSessionSha256);assert.equal(old.CURRENT_PROFILE_PROTOCOL_VERSION,29);assert.equal(VERSION,30);
 const expected=source.replace('CURRENT_PROFILE_PROTOCOL_VERSION = 29','CURRENT_PROFILE_PROTOCOL_VERSION = 30').replace('protocol 29 fences Three Minutes More progress, two-road survival checkpoints and exact result identities from older writers.','protocol 29 fences Three Minutes More progress, two-road survival checkpoints and exact result identities from older writers; protocol 30 fences Cut the Bowstrings progress, initial gryphons, original-target checkpoints and exact result identities from older writers.').replace('27, 28, 29].includes','27, 28, 29, 30].includes').replace('27, 28 or 29.','27, 28, 29 or 30.');assert.equal(readFileSync(new URL('../dist/profile-session.js',import.meta.url),'utf8'),expected);
});
test('all ready older marker versions preserve exact five-domain bytes and actual29 writers are fenced',()=>{
 for(const version of [null,...Array.from({length:30},(_,i)=>i+1)]){
  const domains=Object.values(K).map((k,i)=>[k,' opaque-earned-'+i+'\n']),b=backend([...(version===null?[]:[[KEY,marker(version)]]),...domains]);
  const writer=version===29?old.createProfileSession(()=>b,{requiredProtocolVersion:29}):null;
  assert.equal(current(b).status().canWrite,true);assert.equal(JSON.parse(b.data.get(KEY)).version,30);assert.deepEqual(domains.map(([k])=>b.data.get(k)),domains.map(([,v])=>v));
  if(writer)for(const p of [writer,old.createProfileSession(()=>b,{requiredProtocolVersion:29})]){assert.equal(p.status().canWrite,false);for(const storage of [p.storage,p.importStorage])for(const k of Object.values(K)){assert.throws(()=>storage.getItem(k));assert.throws(()=>storage.setItem(k,'lost'));assert.throws(()=>storage.removeItem(k));}assert.equal(p.beginImport({recover:true}).code,'unsupported-protocol');}
 }
 for(const [v,phase]of [[31,'ready'],[29,'restoring'],[30,'failed']]){const b=backend([[KEY,marker(v,phase)],[K.campaign,'earned']]);assert.equal(current(b).status().canWrite,false);assert.throws(()=>current(b).storage.setItem(K.campaign,'lost'));assert.equal(b.data.get(K.campaign),'earned');}
});
test('active gryphon/target checkpoint, earned prior records and exact result identity survive backup/import/restart',()=>{
 const p=progress(),g=c.createProgressionCampaignMission('cut-the-bowstrings',p);for(let i=0;i<200;i++)g.update(.05);
 const scenario=c.campaignScenarioForGame(g,'cut-the-bowstrings'),data={campaign:p,trials:{},settings:{sound:false},history:[{won:false,draw:false,difficulty:g.difficulty,time:g.state.time,kills:0,built:0,date:'2026-11-10T00:00:00.000Z',identity:identityOf(g,scenario)}],battle:encodeBattle(g,scenario,{campaignProgress:p})};
 const b=backend([[KEY,marker(29)],...Object.entries(K).map(([domain,key])=>[key,JSON.stringify(data[domain])])]),profile=current(b),backup=createBackup(profile.storage,{createdAt:'2026-11-10T00:00:00.000Z'}),parsed=parseBackup(backup);assert.deepEqual(parsed.data,data);
 const r=decodeBattle(parsed.data.battle,{campaignProgress:p}).game;assert.deepEqual(r.serialize(),g.serialize());assert.deepEqual(c.createCampaignRestart(r,'cut-the-bowstrings').serialize(),c.createCampaignMission('cut-the-bowstrings').serialize());
 const target=backend([[KEY,marker(30)]]),tp=current(target);assert.equal(tp.beginImport().ok,true);const result=restoreBackup(tp.importStorage,backup);assert.equal(result.ok,true);assert.equal(tp.finishImport({outcome:'restored'}).ok,true);assert.deepEqual(parseBackup(createBackup(current(target).storage)).data,data);
});
for(let failAt=1;failAt<=5;failAt++)test(`import rollback preserves exact five-domain bytes after failure${failAt}`,()=>{
 const p=progress(),g=c.createCampaignMission('cut-the-bowstrings'),scenario=c.campaignScenarioForGame(g,'cut-the-bowstrings'),data={campaign:p,trials:{},settings:{sound:false},history:[{won:false,draw:false,difficulty:g.difficulty,time:0,kills:0,built:5,date:'2026-11-10T00:00:00.000Z',identity:identityOf(g,scenario)}],battle:encodeBattle(g,scenario,{campaignProgress:p})};
 const source=backend(Object.entries(K).map(([domain,key])=>[key,JSON.stringify(data[domain])])),backup=createBackup(source),target=backend([[KEY,marker(30)],...Object.values(K).map((key,i)=>[key,' opaque-existing-'+i+'\n'])]),before=[...target.data].filter(([key])=>key!==KEY);
 const write=target.setItem.bind(target);let attempted=0,failed=false;target.setItem=(key,value)=>{if(key!==KEY&&!failed&&++attempted===failAt){failed=true;throw Error('single injected quota fault');}write(key,value);};
 const profile=current(target);assert.equal(profile.beginImport().ok,true);const result=restoreBackup(profile.importStorage,backup);assert.equal(result.ok,false);assert.equal(result.rollback.complete,true);assert.equal(profile.finishImport({outcome:'rolled-back'}).ok,true);assert.deepEqual([...target.data].filter(([key])=>key!==KEY),before);assert.equal(JSON.parse(target.data.get(KEY)).version,30);
});
