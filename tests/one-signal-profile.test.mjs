import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {getRuleset,ONE_SIGNAL_RULESET_ID} from '../dist/rulesets.js';
import {createProfileSession,CURRENT_PROFILE_PROTOCOL_VERSION,PROFILE_MARKER_KEY as MARKER} from '../dist/profile-session.js';
import * as previous from './fixtures/profile-session-v0220.js';
import {CAMPAIGN_PROGRESS_MISSIONS,createCampaignProgress,normalizeCampaignProgress,createProgressionCampaignMission,createCampaignRestart,getCampaignTargets,campaignScenarioForGame} from '../dist/campaign.js';
import {encodeBattle,decodeBattle,identityOf,validateBattleIdentity} from '../dist/battle-codec.js';
import {validateHistoryRow} from '../dist/history-codec.js';
import {createBackup,parseBackup,BACKUP_STORAGE_KEYS as K} from '../dist/backup.js';
const id='one-signal-is-enough';
const date='2026-11-08T00:00:00.000Z';
const marker=version=>JSON.stringify({format:'ironroot-profile',version,epoch:'earned-profile',phase:'ready'});
function backend(entries=[]){const data=new Map(entries),writes=[];return {data,writes,getItem:k=>data.get(k)??null,setItem(k,v){writes.push(k);data.set(k,v);},removeItem(k){writes.push(k);data.delete(k);}};}
function progress(){return {...createCampaignProgress(),missions:Object.fromEntries(CAMPAIGN_PROGRESS_MISSIONS.map((m,i)=>[m.id,{completed:true,stars:i%3+1,bestTime:60+i}]))};}
function checkpoint(lost=0){const campaign=progress(),game=createProgressionCampaignMission(id,campaign);for(const t of getCampaignTargets(game,id).slice(0,lost))game.state.buildings=game.state.buildings.filter(b=>b.id!==t.originalId);return {campaign,game,scenario:campaignScenarioForGame(game,id)};}

test('protocol14 fences exact released protocol13 without touching earned domain bytes',()=>{
 assert.equal(CURRENT_PROFILE_PROTOCOL_VERSION,14);assert.equal(previous.CURRENT_PROFILE_PROTOCOL_VERSION,13);
 assert.equal(createHash('sha256').update(readFileSync(new URL('./fixtures/profile-session-v0220.js',import.meta.url))).digest('hex'),'b98558379a2ad6de0241f6ecfc060c92b21edc477a9186715d4990dec9d82d73');
 for(const prior of [1,7,12,13,14]){
  const domains=Object.values(K).map(k=>[k,` opaque earned ${k}\n`]),raw=backend([[MARKER,marker(prior)],...domains]);
  const old=previous.createProfileSession(()=>raw,{requiredProtocolVersion:13});raw.writes.length=0;
  const current=createProfileSession(()=>raw,{requiredProtocolVersion:14});assert.ok(current.status().canWrite);
  assert.deepEqual(raw.writes,prior===14?[]:[MARKER]);assert.deepEqual(Object.values(K).map(k=>[k,raw.getItem(k)]),domains);raw.writes.length=0;
  for(const stale of [old,previous.createProfileSession(()=>raw,{requiredProtocolVersion:13})]){
   assert.equal(stale.status().canWrite,false);
   for(const key of Object.values(K)){assert.throws(()=>stale.storage.getItem(key));assert.throws(()=>stale.storage.setItem(key,'{}'));assert.throws(()=>stale.storage.removeItem(key));}
   assert.equal(stale.beginImport({recover:true}).code,'unsupported-protocol');
  }
  assert.deepEqual(raw.writes,[]);
 }
});

test('new identity is campaign-only ordinary economy with full automatic-air roster and no extra state',()=>{
 const rules=getRuleset(ONE_SIGNAL_RULESET_ID);assert.equal(rules.revision,1);assert.equal(rules.campaignOnly,true);assert.equal(rules.movement.policy,'autonomous-air-local-v1');assert.equal(rules.economy.policy,'legacy');assert.ok(rules.citadel);assert.ok(rules.buildings.wardenLodge);assert.ok(rules.buildings.aerie);
 for(const key of ['fog','campaignControl'])assert.equal(rules[key],undefined);
 const {game,scenario}=checkpoint();assert.deepEqual(scenario,{kind:'campaign',id,revision:1});
 for(const key of ['fog','bridgeControl','campaignControl'])assert.equal(game.state[key],undefined);
 const identity=identityOf(game,scenario);assert.equal(identity.ruleset.id,ONE_SIGNAL_RULESET_ID);
 for(const wrong of [{...identity,scenario:{kind:'skirmish',id:'standard',revision:1}},{...identity,scenario:{...scenario,revision:2}},{...identity,ruleset:{id:'frontier-campaign-shared-crossing',revision:1}}])assert.throws(()=>validateBattleIdentity(wrong));
});

test('either permitted original loss round-trips, restarts both signals and survives backup normalization',()=>{
 for(const lostIndex of [0,1]){
  const {game,campaign,scenario}=checkpoint();const target=getCampaignTargets(game,id)[lostIndex];game.state.buildings=game.state.buildings.filter(b=>b.id!==target.originalId);
  assert.ok(game.buyCitadelOption('arrows').ok);
  const battle=encodeBattle(game,scenario,{campaignProgress:campaign});assert.deepEqual(decodeBattle(battle,{campaignProgress:campaign}).game.serialize(),game.serialize());
  const restart=createCampaignRestart(game,id);assert.deepEqual(identityOf(restart,scenario),identityOf(game,scenario));assert.equal(getCampaignTargets(restart,id).filter(t=>t.building).length,2);
  const history=[{won:true,draw:false,difficulty:game.difficulty,time:0,kills:0,built:0,date,identity:identityOf(game,scenario)}];assert.deepEqual(validateHistoryRow(history[0]),history[0]);
  const raw=backend([[K.campaign,JSON.stringify(campaign)],[K.battle,JSON.stringify(battle)],[K.history,JSON.stringify(history)],[K.settings,JSON.stringify({sound:false,music:false,sfx:true,volume:.3,reducedMotion:true,quality:'low'})]]);
  const restored=parseBackup(createBackup(raw,{createdAt:date})).data;
  assert.deepEqual(restored.campaign,campaign);assert.deepEqual(restored.battle,battle);assert.deepEqual(restored.history,history);assert.equal(restored.settings.sound,false);assert.deepEqual(normalizeCampaignProgress(campaign),campaign);
 }
});

test('ended checkpoints and identity-less new mission history are rejected',()=>{
 const {game,campaign,scenario}=checkpoint(2);assert.throws(()=>encodeBattle(game,scenario,{campaignProgress:campaign}),/ended/);
 assert.throws(()=>validateHistoryRow({won:true,difficulty:'normal',time:30,kills:0,built:0,date,campaignId:id}),/unknown campaign/);
 for(const end of ['timer','player','enemy']){const {game,campaign,scenario}=checkpoint(1);if(end==='timer')game.state.time=210;else game.state.bases[end==='player'?0:1].hp=0;assert.throws(()=>encodeBattle(game,scenario,{campaignProgress:campaign}),/ended/);}
});
