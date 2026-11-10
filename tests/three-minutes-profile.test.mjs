import {beforeFinalChapter} from './historical-catalog.mjs';
import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';
import * as old from './fixtures/profile-session-v0370.js';
import {createProfileSession,CURRENT_PROFILE_PROTOCOL_VERSION as VERSION,PROFILE_MARKER_KEY as KEY} from './fixtures/profile-session-v039.js';
import {createBackup,parseBackup,restoreBackup,BACKUP_STORAGE_KEYS as K} from '../dist/backup.js';
import * as c from '../dist/campaign.js';import {encodeBattle,decodeBattle,identityOf} from '../dist/battle-codec.js';
const marker=(version,phase='ready')=>JSON.stringify({format:'ironroot-profile',version,phase,epoch:'earned'});
const backend=entries=>{const data=new Map(entries),calls=[];return {data,calls,getItem(k){calls.push(['get',k]);return data.get(k)??null;},setItem(k,v){calls.push(['set',k]);data.set(k,String(v));},removeItem(k){calls.push(['remove',k]);data.delete(k);}};};
const current=b=>createProfileSession(()=>b,{requiredProtocolVersion:VERSION,newEpoch:()=> 'three-minutes'});
const progress=()=>({...c.createCampaignProgress(),missions:Object.fromEntries(c.CAMPAIGN_PROGRESS_MISSIONS.filter(beforeFinalChapter).filter(m=>m.id!=='cut-the-bowstrings'&&m.id!=='three-minutes-more').map(m=>[m.id,{completed:true,stars:1,bestTime:60}]))});
test('protocol29 is only the marker fence change from actual main60588dd protocol28',()=>{
 const source=readFileSync(new URL('./fixtures/profile-session-v0370.js',import.meta.url),'utf8'),provenance=JSON.parse(readFileSync(new URL('./fixtures/three-minutes-parent-v0370.json',import.meta.url)));
 assert.equal(provenance.commit,'60588dd0c5cea3f21785ae80777de4128f13feb3');assert.equal(createHash('sha256').update(source).digest('hex'),provenance.profileSessionSha256);assert.equal(old.CURRENT_PROFILE_PROTOCOL_VERSION,28);assert.equal(VERSION,30);
 const expected=source.replace('CURRENT_PROFILE_PROTOCOL_VERSION = 28','CURRENT_PROFILE_PROTOCOL_VERSION = 29').replace('protocol 28 fences Leave No Road Closed progress, three-road control checkpoints and exact result identities from older writers.','protocol 28 fences Leave No Road Closed progress, three-road control checkpoints and exact result identities from older writers; protocol 29 fences Three Minutes More progress, two-road survival checkpoints and exact result identities from older writers.').replace('26, 27, 28].includes','26, 27, 28, 29].includes').replace('26, 27 or 28.','26, 27, 28 or 29.');assert.equal(readFileSync(new URL('./fixtures/profile-session-v038-candidate.js',import.meta.url),'utf8'),expected);
});
test('all ready older marker versions preserve exact five-domain bytes and actual28 writers are fenced',()=>{
 for(const version of [null,...Array.from({length:30},(_,i)=>i+1)]){
  const domains=Object.values(K).map((k,i)=>[k,' opaque-earned-'+i+'\n']),b=backend([...(version===null?[]:[[KEY,marker(version)]]),...domains]);
  const writer=version===28?old.createProfileSession(()=>b,{requiredProtocolVersion:28}):null;
  assert.equal(current(b).status().canWrite,true);assert.equal(JSON.parse(b.data.get(KEY)).version,30);assert.deepEqual(domains.map(([k])=>b.data.get(k)),domains.map(([,v])=>v));
  if(writer)for(const p of [writer,old.createProfileSession(()=>b,{requiredProtocolVersion:28})]){assert.equal(p.status().canWrite,false);for(const storage of [p.storage,p.importStorage])for(const k of Object.values(K)){assert.throws(()=>storage.getItem(k));assert.throws(()=>storage.setItem(k,'lost'));assert.throws(()=>storage.removeItem(k));}assert.equal(p.beginImport({recover:true}).code,'unsupported-protocol');}
 }
 for(const [v,phase]of [[31,'ready'],[28,'restoring'],[29,'failed']]){const b=backend([[KEY,marker(v,phase)],[K.campaign,'earned']]);assert.equal(current(b).status().canWrite,false);assert.throws(()=>current(b).storage.setItem(K.campaign,'lost'));assert.equal(b.data.get(K.campaign),'earned');}
});
test('active survival checkpoint, earned prior records and exact result identity survive backup/import/restart',()=>{
 const p=progress(),g=c.createProgressionCampaignMission('three-minutes-more',p);for(let i=0;i<200;i++)g.update(.05);
 const scenario=c.campaignScenarioForGame(g,'three-minutes-more'),data={campaign:p,trials:{},settings:{sound:false},history:[{won:false,draw:false,difficulty:g.difficulty,time:g.state.time,kills:0,built:0,date:'2026-11-10T00:00:00.000Z',identity:identityOf(g,scenario)}],battle:encodeBattle(g,scenario,{campaignProgress:p})};
 const b=backend([[KEY,marker(28)],...Object.entries(K).map(([domain,key])=>[key,JSON.stringify(data[domain])])]),profile=current(b),backup=createBackup(profile.storage,{createdAt:'2026-11-10T00:00:00.000Z'}),parsed=parseBackup(backup);assert.deepEqual(parsed.data,data);
 const r=decodeBattle(parsed.data.battle,{campaignProgress:p}).game;assert.deepEqual(r.serialize(),g.serialize());assert.deepEqual(c.createCampaignRestart(r,'three-minutes-more').serialize(),c.createCampaignMission('three-minutes-more').serialize());
 const target=backend([[KEY,marker(29)]]),tp=current(target);assert.equal(tp.beginImport().ok,true);const result=restoreBackup(tp.importStorage,backup);assert.equal(result.ok,true);assert.equal(tp.finishImport({outcome:'restored'}).ok,true);assert.deepEqual(parseBackup(createBackup(current(target).storage)).data,data);
});
