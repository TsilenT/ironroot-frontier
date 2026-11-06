import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../dist/engine.js';
import { encodeBattle, identityOf } from '../dist/battle-codec.js';
import { createBackup, parseBackup, restoreBackup, BACKUP_STORAGE_KEYS as K } from '../dist/backup.js';
import { validateHistory } from '../dist/history-codec.js';
import { createProfileSession, PROFILE_MARKER_KEY as KEY } from '../dist/profile-session.js';
const date = '2026-11-06T00:00:00.000Z';
const scenario = {kind:'skirmish',id:'standard',revision:1};
const makeGame = () => new Game({ rulesetId:'frontier-rootwarden-open',rulesetRevision:1,mapId:'classic',mapRevision:1,ai:false });
const storage = entries => { const data = new Map(entries), writes=[]; return {data,writes,getItem:k=>data.get(k)??null,setItem(k,v){writes.push([k,v]);data.set(k,v);},removeItem(k){writes.push([k,null]);data.delete(k);}}; };
const marker = (version,phase='ready') => JSON.stringify({format:'ironroot-profile',version,epoch:'old',phase});
function result(game) { return {won:true,draw:false,difficulty:'normal',time:10800,kills:1e10,built:1e10,date,identity:identityOf(game,scenario)}; }
test('legacy export remains v1; mixed new battle/history exports v2 and restores full identities',()=>{
 const s=storage(); assert.equal(JSON.parse(createBackup(s,{createdAt:date})).version,1);
 const game=makeGame(); game.state.time=10800;game.tick=216000;
 const battle=encodeBattle(game,scenario), row=result(game);
 const text=createBackup(s,{createdAt:date,battle,history:[{won:false,difficulty:'normal',time:60,kills:0,built:2,date},row]});
 const parsed=parseBackup(text);assert.equal(parsed.version,2);assert.deepEqual(parsed.data.battle,battle);assert.deepEqual(parsed.data.history[1],row);
 const target=storage();assert.equal(restoreBackup(target,text).ok,true);assert.deepEqual(JSON.parse(target.data.get(K.battle)),battle);
});
test('history-only open results retain supported long duration and reject unknown identities or old bounds',()=>{
 const game=makeGame(),row=result(game),text=createBackup(storage(),{createdAt:date,history:[row]});
 assert.equal(parseBackup(text).version,2);assert.equal(parseBackup(text).data.battle,null);
 const horizon=structuredClone(row);horizon.time=604800.01;horizon.kills=1e12;horizon.built=1e12;assert.deepEqual(validateHistory([horizon]),[horizon]);
 for(const mutate of [r=>r.identity.ruleset.revision++,r=>r.identity.map.revision++,r=>r.identity.scenario.revision++,r=>r.identity.ruleset.id='frontier-legacy',r=>r.time=604800.02,r=>r.kills=1e12+1,r=>r.campaignId=null]){
  const changed=structuredClone(row);mutate(changed);assert.throws(()=>validateHistory([changed]));
 }
});
test('v1 refuses v3 domain data and failed import never accesses destination',()=>{
 const b=JSON.parse(createBackup(storage(),{createdAt:date,battle:encodeBattle(makeGame(),scenario)}));b.version=1;
 const s=storage([[K.battle,'source bytes']]);let reads=0;const get=s.getItem;s.getItem=k=>{reads++;return get(k);};
 assert.equal(restoreBackup(s,JSON.stringify(b)).ok,false);assert.equal(reads,0);assert.deepEqual(s.writes,[]);assert.equal(s.data.get(K.battle),'source bytes');
});
test('protocol3 ready upgrade fences cached protocol2 client without changing domain bytes',()=>{
 const s=storage([[KEY,marker(2)],[K.battle,'original']]);
 const old=createProfileSession(()=>s,{requiredProtocolVersion:2});assert.equal(old.status().canWrite,true);
 const next=createProfileSession(()=>s,{requiredProtocolVersion:3});assert.equal(next.status().canWrite,true);assert.equal(JSON.parse(s.data.get(KEY)).version,3);assert.equal(s.data.get(K.battle),'original');
 assert.equal(old.status().canWrite,false);assert.throws(()=>old.storage.setItem(K.battle,'overwrite'));
 assert.equal(old.beginImport({recover:true}).ok,false);assert.equal(JSON.parse(s.data.get(KEY)).version,3);
});
test('protocol3 upgrades only verified ready markers and never recovers over future versions',()=>{
 for(const phase of ['restoring','failed']){const s=storage([[KEY,marker(2,phase)]]),p=createProfileSession(()=>s,{requiredProtocolVersion:3});assert.equal(p.status().canWrite,false);assert.deepEqual(s.writes,[]);}
 const s=storage([[KEY,marker(4)]]),p=createProfileSession(()=>s,{requiredProtocolVersion:3});assert.equal(p.beginImport({recover:true}).ok,false);assert.deepEqual(s.writes,[]);
 const denied=storage([[KEY,marker(2)]]);denied.setItem=()=>{};const q=createProfileSession(()=>denied,{requiredProtocolVersion:3});assert.equal(q.status().canWrite,false);assert.throws(()=>q.storage.getItem(K.battle));
});
test('new intro progress and authored v3 battles preserve separate IDs through backup', async()=>{
 const {createCampaignMission,createCampaignProgress}=await import('../dist/campaign.js');
 const progress=createCampaignProgress();progress.missions['first-watch']={completed:true,stars:2,bestTime:80};
 const game=createCampaignMission('forked-road'),ref={kind:'campaign',id:'forked-road',revision:1};
 const battle=encodeBattle(game,ref,{campaignProgress:progress});
 const text=createBackup(storage(),{createdAt:date,campaign:progress,battle});
 const b=parseBackup(text);assert.equal(b.version,2);assert.deepEqual(b.data.campaign,progress);assert.deepEqual(b.data.battle,battle);
 const history={won:true,draw:false,difficulty:'easy',time:80,kills:10,built:4,date,identity:identityOf(game,ref)};
 assert.deepEqual(parseBackup(createBackup(storage(),{createdAt:date,campaign:progress,history:[history]})).data.history,[history]);
 const invalid=structuredClone(b);invalid.data.campaign=createCampaignProgress();assert.throws(()=>parseBackup(JSON.stringify(invalid)),/locked/);
 const onlyProgress=parseBackup(createBackup(storage(),{createdAt:date,campaign:progress}));assert.equal(onlyProgress.version,2);
});
