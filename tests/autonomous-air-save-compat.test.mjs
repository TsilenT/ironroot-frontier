/** Profile-six admission and portable saves. Real paid producers, no combat-state injection. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,MAPS,worldX} from '../dist/engine.js';
import {encodeBattle,decodeBattle,identityOf,scenarioForBattle} from '../dist/battle-codec.js';
import {validateHistory,validateHistoryRow} from '../dist/history-codec.js';
import {createBackup,parseBackup,restoreBackup,BACKUP_STORAGE_KEYS as K} from '../dist/backup.js';
import {createProfileSession,CURRENT_PROFILE_PROTOCOL_VERSION,PROFILE_MARKER_KEY as MARKER} from '../dist/profile-session.js';
import {createHistorySession,createSaveSession,createStorage,writeBattle} from '../dist/persistence.js';
import {CHALLENGES,CURRENT_CHALLENGES,createCurrentChallenge,createChallenge} from '../dist/challenges.js';
const rules=['frontier-air-local-open','frontier-air-local-timed'];
const date='2026-11-07T00:00:00.000Z';
const raw=(entries=[])=>{const data=new Map(entries),calls=[];return {data,calls,getItem(k){calls.push(['get',k]);return data.get(k)??null;},setItem(k,v){calls.push(['set',k]);data.set(k,v);},removeItem(k){calls.push(['remove',k]);data.delete(k);}};};
const marker=version=>JSON.stringify({format:'ironroot-profile',version,epoch:'retained-attempt',phase:'ready'});
const current=backend=>createProfileSession(()=>backend,{requiredProtocolVersion:CURRENT_PROFILE_PROTOCOL_VERSION,newEpoch:()=> 'imported-attempt'});
const row=(game,ref)=>({won:false,draw:false,difficulty:game.difficulty,time:game.state.time,kills:game.state.stats.kills[0],built:game.state.stats.built[0],date,identity:identityOf(game,ref)});
function pursuit(rulesetId,mapId,side){
  const game=new Game({rulesetId,mapId,ai:false,seed:958});
  const before=[...game.state.gold];
  assert.equal(game.build('aerie',worldX(game.map,side,1250),game.map.lanes[0],side).ok,true);
  assert.equal(game.build('wardenLodge',worldX(game.map,1-side,1250),game.map.lanes[1],1-side).ok,true);
  assert.equal(game.state.gold[side],before[side]-game.buildings.aerie.cost);
  assert.equal(game.state.gold[1-side],before[1-side]-game.buildings.wardenLodge.cost);
  for(let tick=0;tick<1600;tick++){
    game.update(.05);
    const flyer=game.state.units.find(u=>u.side===side&&u.type==='gryphon'&&u.airTargetId!==null&&Math.abs(u.y-game.map.lanes[0])>10&&Math.abs(u.y-game.map.lanes[1])>10);
    if(flyer){game.update(.017);assert.ok(game.accumulator>0);return {game,flyer};}
  }
  assert.fail(`No paid mid-chase checkpoint: ${rulesetId}/${mapId}/${side}`);
}

test('fresh automatic-air skirmish identities and mixed history roundtrip without envelope or legacy relabeling',()=>{
  let cases=0;
  for(const rulesetId of rules)for(const mapId of Object.keys(MAPS)){
    const game=new Game({rulesetId,mapId,ai:false}),battle=encodeBattle(game),history=[{won:true,draw:false,challengeId:null,campaignId:null,difficulty:'normal',time:40,kills:2,built:1,date},row(game)];
    assert.equal(battle.version,3);assert.equal(battle.game.version,3);assert.equal(battle.scenario.revision,1);
    assert.deepEqual(decodeBattle(battle).game.serialize(),game.serialize());
    assert.deepEqual(validateHistory(history),history);
    const text=createBackup(raw(),{createdAt:date,battle,history}),parsed=parseBackup(text);
    assert.equal(parsed.version,2);assert.deepEqual(parsed.data.battle,battle);assert.deepEqual(parsed.data.history,history);
    const target=raw();assert.equal(restoreBackup(target,text).ok,true);
    assert.deepEqual(decodeBattle(target.data.get(K.battle)).game.serialize(),game.serialize());
    assert.deepEqual(JSON.parse(target.data.get(K.history)),history);cases++;
  }
  assert.equal(cases,6);
});

test('paid mid-chase backup/profile restore preserves target, nearest road, fractional time and every deterministic continuation byte',()=>{
  let cases=0,continuations=0;
  for(const rulesetId of rules)for(const mapId of Object.keys(MAPS))for(const side of [0,1]){
    const {game,flyer}=pursuit(rulesetId,mapId,side),saved=game.serialize();
    assert.ok(Number.isSafeInteger(flyer.airTargetId));assert.equal(Object.hasOwn(flyer,'airRoute'),false);
    const text=createBackup(raw(),{createdAt:date,battle:encodeBattle(game),history:[row(game)]});
    const target=raw([[MARKER,marker(5)]]),profile=current(target);
    assert.equal(profile.beginImport().ok,true);assert.equal(restoreBackup(profile.importStorage,text).ok,true);assert.equal(profile.finishImport({outcome:'restored'}).ok,true);
    const reloaded=current(target),restored=decodeBattle(reloaded.storage.getItem(K.battle)).game;
    assert.equal(JSON.parse(target.data.get(MARKER)).version,CURRENT_PROFILE_PROTOCOL_VERSION);assert.deepEqual(restored.serialize(),saved);
    const restoredFlyer=restored.state.units.find(u=>u.id===flyer.id);
    assert.deepEqual(restoredFlyer,flyer);
    for(let tick=0;tick<80;tick++){game.update(.05);restored.update(.05);assert.deepEqual(restored.serialize(),game.serialize());continuations++;}
    cases++;
  }
  assert.equal(cases,12);assert.equal(continuations,960);
});

test('nullable target metadata survives idle and locked saves; malformed state rejects before any backup destination access',()=>{
  const {game,flyer}=pursuit(rules[0],'classic',0),envelope=encodeBattle(game);
  const slot=envelope.game.state.units.findIndex(u=>u.id===flyer.id),ground=envelope.game.state.units.findIndex(u=>u.type!=='gryphon');
  assert.ok(ground>=0);
  const unlocked=structuredClone(envelope);unlocked.game.state.units[slot].airTargetId=null;assert.equal(decodeBattle(unlocked).game.state.units[slot].airTargetId,null);
  const valid=JSON.parse(createBackup(raw(),{createdAt:date,battle:envelope,history:[row(game)]}));
  for(const mutate of [
    v=>delete v.state.units[slot].airTargetId,
    ...[false,{},[],String(flyer.airTargetId),0,-1,.5,999999,flyer.id].map(value=>v=>v.state.units[slot].airTargetId=value),
    v=>v.state.units[slot].airTargetId=v.state.bases[1].id,
    v=>v.state.units[slot].airRoute={from:0,to:1,phase:'transit',remaining:0},
    v=>v.state.units[slot].airFocus={},
    v=>v.state.units[ground].airTargetId=null,
    v=>v.state.buildings.find(b=>b.type==='aerie').flightPlan=1,
    v=>v.rulesetId='frontier-flight-open',
    v=>v.rulesetId='frontier-rootwarden-open',
    v=>v.rulesetRevision=2,
  ]){
    const bad=structuredClone(valid);mutate(bad.data.battle.game);const before=structuredClone(bad),target=raw();
    assert.throws(()=>decodeBattle(bad.data.battle));assert.equal(restoreBackup(target,JSON.stringify(bad)).ok,false);assert.deepEqual(target.calls,[]);assert.deepEqual(bad,before);
  }
  for(const id of ['frontier-flight-open','frontier-rootwarden-open','frontier-legacy']){
    const old=new Game({rulesetId:id,ai:false});old._spawn(old.state.buildings[0]);const bad=encodeBattle(old);bad.game.state.units[0].airTargetId=null;assert.throws(()=>decodeBattle(bad));
  }
});

test('history and active-battle sessions preserve distinct old/new identities and reject mismatches without writes',()=>{
  const backend=raw(),profile=current(backend),storage=createStorage(()=>profile.storage),history=createHistorySession(storage,K.history);
  for(const rulesetId of ['frontier-flight-open',...rules])history.retain(row(new Game({rulesetId,ai:false})));
  assert.equal(history.retry(),true);const records=JSON.parse(backend.data.get(K.history));assert.equal(records.length,3);
  assert.deepEqual(records.map(r=>r.identity.ruleset.id).sort(),['frontier-flight-open',...rules].sort());
  const game=pursuit(rules[0],'classic',0).game,battle=createSaveSession(storage,K.battle);battle.claim();
  assert.equal(writeBattle(battle,K.battle,game),true);assert.deepEqual(decodeBattle(backend.data.get(K.battle)).game.serialize(),game.serialize());
  const before=[...backend.data];backend.calls.length=0;
  const invalid=row(game);invalid.identity=structuredClone(invalid.identity);invalid.identity.ruleset.revision=2;
  assert.throws(()=>validateHistoryRow(invalid));assert.throws(()=>history.retain(invalid));assert.deepEqual([...backend.data],before);assert.deepEqual(backend.calls,[]);
  const full=JSON.parse(createBackup(raw(),{createdAt:date,history:[row(game)]}));full.version=1;
  const target=raw();assert.equal(restoreBackup(target,JSON.stringify(full)).ok,false);assert.deepEqual(target.calls,[]);
});


test('current trial revision-two battle, history and backups retain automatic-air identity while revision-one records remain readable',()=>{
  let cases=0;
  for(const mission of CURRENT_CHALLENGES){
    const game=createCurrentChallenge(mission.id),ref=scenarioForBattle(mission.id,null,game),battle=encodeBattle(game,ref);
    assert.deepEqual(ref,{kind:'trial',id:mission.id,revision:2});assert.equal(game.ruleset.id,'frontier-authored-air-local');assert.equal(Object.keys(game.buildings).length,7);
    const history=[row(game,ref)];
    if(CHALLENGES.some(c=>c.id===mission.id)){
      const historical=createChallenge(mission.id),oldRef=scenarioForBattle(mission.id,null,historical);
      assert.deepEqual(oldRef,{kind:'trial',id:mission.id,revision:1});
      history.push(row(historical,oldRef));
    }else assert.throws(()=>createChallenge(mission.id),/Unknown challenge/);
    const text=createBackup(raw(),{createdAt:date,battle,history}),parsed=parseBackup(text);
    assert.equal(parsed.version,2);assert.deepEqual(parsed.data.history,history);assert.deepEqual(parsed.data.battle,battle);
    const destination=raw();assert.equal(restoreBackup(destination,text).ok,true);
    const restored=decodeBattle(destination.data.get(K.battle));assert.deepEqual(restored.game.serialize(),game.serialize());assert.deepEqual(restored.scenario,ref);
    const bad=structuredClone(parsed);bad.data.battle.scenario.revision=1;
    const target=raw();assert.equal(restoreBackup(target,JSON.stringify(bad)).ok,false);assert.deepEqual(target.calls,[]);
    cases++;
  }
  assert.equal(cases,CURRENT_CHALLENGES.length);assert.ok(cases>0);
});
