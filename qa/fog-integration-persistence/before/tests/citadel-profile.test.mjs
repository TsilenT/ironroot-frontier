import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {Game} from '../dist/engine.js';
import {encodeBattle,decodeBattle,identityOf,validateBattleIdentity} from '../dist/battle-codec.js';
import {validateHistoryRow} from '../dist/history-codec.js';
import {createBackup,parseBackup,restoreBackup,BACKUP_STORAGE_KEYS as K} from '../dist/backup.js';
import {createProfileSession,CURRENT_PROFILE_PROTOCOL_VERSION,PROFILE_MARKER_KEY as MARKER} from '../dist/profile-session.js';
import {createCampaignProgress,CAMPAIGN_PROGRESS_MISSIONS,createProgressionCampaignMission,campaignScenarioForGame} from '../dist/campaign.js';
import {CURRENT_CHALLENGES,createCurrentChallenge,challengeScenarioForGame} from '../dist/challenges.js';
import {TRAINING_LESSONS} from '../dist/training.js';
import {protocolNine,protocolNineSource,protocolNineHash} from './fixtures/profile-session-v019-source.mjs';
const date='2026-11-07T00:00:00.000Z';
const ids=['frontier-citadel-open','frontier-citadel-timed','frontier-citadel-bridge-open','frontier-citadel-bridge-timed'];
const marker=(version,phase='ready')=>JSON.stringify({format:'ironroot-profile',version,epoch:'retained-profile',phase});
function raw(entries=[]){const data=new Map(entries),writes=[];return {data,writes,getItem:k=>data.get(k)??null,setItem(k,v){writes.push(k);data.set(k,v);},removeItem(k){writes.push(k);data.delete(k);}};}
function earned(){return {
 campaign:{...createCampaignProgress(),missions:Object.fromEntries(CAMPAIGN_PROGRESS_MISSIONS.map((m,i)=>[m.id,{completed:true,stars:i%3+1,bestTime:60+i}]))},
 trials:Object.fromEntries(CURRENT_CHALLENGES.map((c,i)=>[c.id,{completed:true,bestTime:70+i}])),
 settings:{sound:false,music:false,sfx:true,volume:.3,reducedMotion:true,quality:'low',keyboard:{version:1,bindings:{build1:'KeyQ',volley:null}},skirmishBridgeIncome:true},
 history:[{won:true,draw:false,challengeId:'shieldbreaker',campaignId:null,difficulty:'normal',time:75,kills:12,built:5,date}],battle:null
};}
const entries=v=>Object.entries(K).filter(([d])=>v[d]!==null).map(([d,k])=>[k,'  '+JSON.stringify(v[d])+'\n']);
const current=r=>createProfileSession(()=>r,{requiredProtocolVersion:CURRENT_PROFILE_PROTOCOL_VERSION,newEpoch:()=> 'citadel-import'});
const old=r=>protocolNine.createProfileSession(()=>r,{requiredProtocolVersion:9});
const row=g=>({won:true,draw:false,difficulty:g.difficulty,time:g.state.time,kills:g.state.stats.kills[0],built:g.state.stats.built[0],date,identity:identityOf(g)});
function purchased(rulesetId,kind){
 const g=new Game({rulesetId,mapId:rulesetId.includes('bridge')?'twin-span':'classic',ai:false,seed:91});
 for(let i=0;i<1800;i++)g.update(.05);
 g._damage(g.state.bases[0],150,1);g._damage(g.state.bases[1],150,0);
 assert.ok(g.buyCitadelOption(kind,0).ok);assert.ok(g.buyCitadelOption(kind==='arrows'?'regen':'arrows',1).ok);
 for(let i=0;i<20;i++)g.update(.05);
 return g;
}

test('current protocol upgrades only marker bytes, fences exact live v0.19 writers and preserves earned domains',()=>{
 assert.equal(CURRENT_PROFILE_PROTOCOL_VERSION,11);assert.equal(protocolNine.CURRENT_PROFILE_PROTOCOL_VERSION,9);
 assert.equal(createHash('sha256').update(protocolNineSource).digest('hex'),protocolNineHash);
 const value=earned();
 const domains=entries(value),r=raw([[MARKER,marker(9)],...domains]),stale=old(r);assert.ok(stale.status().canWrite);
 const fresh=current(r);assert.ok(fresh.status().canWrite);assert.deepEqual(r.writes,[MARKER]);assert.deepEqual(JSON.parse(r.data.get(MARKER)),{format:'ironroot-profile',version:CURRENT_PROFILE_PROTOCOL_VERSION,epoch:'retained-profile',phase:'ready'});
 for(const [k,v] of domains)assert.equal(r.data.get(k),v);
 const snapshot=[...r.data];r.writes.length=0;
 for(const client of [stale,old(r)]){
  assert.equal(client.status().canWrite,false);
  for(const k of Object.values(K)){assert.throws(()=>client.storage.getItem(k));assert.throws(()=>client.storage.setItem(k,'{}'));assert.throws(()=>client.storage.removeItem(k));assert.throws(()=>client.importStorage.setItem(k,'{}'));}
  assert.equal(client.beginImport({recover:true}).code,'unsupported-protocol');
 }
 assert.deepEqual([...r.data],snapshot);assert.deepEqual(r.writes,[]);
});

test('general citadel availability adds no preference and preserves optional bridge settings',()=>{
 for(const bridge of [false,true]){
  const value=earned();value.settings.skirmishBridgeIncome=bridge;
  const source=raw(entries(value)),text=createBackup(source,{createdAt:date});assert.deepEqual(parseBackup(text).data,value);assert.deepEqual(source.writes,[]);
 }
 for(const value of [false,true])assert.throws(()=>createBackup(raw(),{createdAt:date,settings:{skirmishCitadelOptions:value}}));
});

test('each citadel identity and purchased choice survives save, backup, history and exact engine restoration',()=>{
 for(const id of ids)for(const kind of ['arrows','regen']){
  const g=purchased(id,kind),value=earned();value.settings.skirmishBridgeIncome=id.includes('bridge');value.battle=encodeBattle(g);value.history.push(row(g));
  const text=createBackup(raw(entries(value)),{createdAt:date}),parsed=parseBackup(text);assert.equal(parsed.version,2);assert.deepEqual(parsed.data,value);
  assert.deepEqual(decodeBattle(parsed.data.battle).game.serialize(),g.serialize());assert.deepEqual(validateHistoryRow(value.history.at(-1)),value.history.at(-1));
  const target=raw([[MARKER,marker(9)],['unrelated','retain'],...entries(earned())]),importer=current(target),stale=current(target);
  assert.ok(importer.beginImport().ok);assert.ok(restoreBackup(importer.importStorage,text).ok);assert.ok(importer.finishImport({outcome:'restored'}).ok);assert.equal(stale.status().canWrite,false);
  const reloaded=current(target);assert.ok(reloaded.status().canWrite);const restored=decodeBattle(JSON.parse(reloaded.storage.getItem(K.battle))).game;
  assert.deepEqual(restored.serialize(),g.serialize());assert.deepEqual(parseBackup(createBackup(reloaded.storage,{createdAt:date})).data,value);assert.equal(target.data.get('unrelated'),'retain');
  for(let i=0;i<200;i++){g.update(.05);restored.update(.05);}assert.deepEqual(restored.serialize(),g.serialize());
  assert.ok(restored.state.citadelOptions.sides.find(s=>s.choice==='regen').healedTotal>0);
  assert.deepEqual(decodeBattle(encodeBattle(restored)).game.serialize(),restored.serialize());
  const restart=new Game({rulesetId:g.ruleset.id,rulesetRevision:g.ruleset.revision,mapId:g.map.id,mapRevision:g.map.revision,difficulty:g.difficulty,seed:g.seed,ai:g.ai});
  const admitted=decodeBattle(encodeBattle(restart)).game;assert.equal(admitted.ruleset.id,id);assert.equal(admitted.state.time,0);assert.deepEqual(admitted.state.gold,[420,420]);assert.ok(admitted.state.citadelOptions.sides.every(s=>s.choice===null&&s.healedTotal===0&&s.extraShots===0&&s.lastDamageAt===null));
  if(id.includes('bridge'))assert.deepEqual(admitted.state.bridgeControl.earned,[0,0]);else assert.equal(admitted.state.bridgeControl,undefined);
 }
});

test('Skirmish citadel identities cannot be substituted into authored saves or history',()=>{
 const progress=earned().campaign,mission=CAMPAIGN_PROGRESS_MISSIONS[0],campaign=createProgressionCampaignMission(mission.id,progress),trial=createCurrentChallenge(CURRENT_CHALLENGES[0].id);
 const refs=[campaignScenarioForGame(campaign,mission.id),challengeScenarioForGame(trial,CURRENT_CHALLENGES[0].id),{kind:'lesson',id:TRAINING_LESSONS[0].id,revision:1}];
 for(const id of ids){const game=new Game({rulesetId:id,ai:false});for(const scenario of refs){
   const identity={ruleset:{id,revision:1},map:{id:game.map.id,revision:1},scenario};
   assert.throws(()=>validateBattleIdentity(identity));assert.throws(()=>decodeBattle({format:'ironroot-save',version:3,scenario,game:game.serialize()},{campaignProgress:progress}));assert.throws(()=>validateHistoryRow({...row(game),identity}));
  }
 }
});

test('unfinished, future and unverified protocol upgrades retain all earned bytes',()=>{
 for(const prior of [marker(9,'restoring'),marker(9,'failed'),marker(CURRENT_PROFILE_PROTOCOL_VERSION+1)]){const r=raw([[MARKER,prior],...entries(earned())]),before=[...r.data],p=current(r);assert.equal(p.status().canWrite,false);assert.deepEqual([...r.data],before);assert.deepEqual(r.writes,[]);if(prior===marker(CURRENT_PROFILE_PROTOCOL_VERSION+1))assert.equal(p.beginImport({recover:true}).code,'unsupported-protocol');}
 for(const fault of ['drop','throw','readback']){
  const r=raw([[MARKER,marker(9)],...entries(earned())]),before=[...r.data].filter(([k])=>k!==MARKER),read=r.getItem,write=r.setItem;let unreadable=false;
  r.getItem=k=>{if(k===MARKER&&unreadable)throw Error('unverified marker');return read(k);};r.setItem=(k,v)=>{if(k!==MARKER)return write(k,v);if(fault==='drop')return;if(fault==='throw')throw Error('denied');write(k,v);unreadable=true;};
  const p=current(r);assert.equal(p.status().canWrite,false);assert.throws(()=>p.storage.setItem(K.settings,'{}'));assert.deepEqual([...r.data].filter(([k])=>k!==MARKER),before);
 }
});

test('failed citadel backup replacement rolls every domain back exactly and preserves current-protocol writer fence',()=>{
 const replacement=earned();replacement.settings.volume=.7;
 const text=createBackup(raw(entries(replacement)),{createdAt:date});
 for(const failedKey of Object.values(K)){
  const value=earned();value.settings.volume=.2;
  // All domains differ, so each fault is exercised rather than skipped.
  const prior=Object.values(K).map(k=>[k,k===K.settings?JSON.stringify(value.settings):' prior bytes '+k+'\n']);
  const r=raw([[MARKER,marker(9)],...prior]),p=current(r);assert.ok(p.beginImport().ok);
  const write=r.setItem,remove=r.removeItem;let pending=true;
  r.setItem=(k,v)=>{if(k===failedKey&&pending){pending=false;throw Error('quota');}write(k,v);};r.removeItem=k=>{if(k===failedKey&&pending){pending=false;throw Error('quota');}remove(k);};
  const result=restoreBackup(p.importStorage,text);assert.equal(result.ok,false,failedKey);assert.equal(result.rollback.complete,true,failedKey);
  for(const [k,v] of prior)assert.equal(r.data.get(k),v);assert.ok(p.finishImport({outcome:'rolled-back'}).ok);assert.ok(p.status().canWrite);assert.equal(JSON.parse(r.data.get(MARKER)).version,CURRENT_PROFILE_PROTOCOL_VERSION);
 }
});
