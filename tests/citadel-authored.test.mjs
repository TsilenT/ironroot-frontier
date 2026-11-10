import {beforeFinalChapter} from './historical-catalog.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import * as campaign from '../dist/campaign.js';
import {CHALLENGES,CURRENT_CHALLENGES,AUTONOMOUS_AIR_CHALLENGES,createChallenge,createCurrentChallenge,getChallenge,restartChallenge,challengeScenarioForGame,evaluateChallenge} from '../dist/challenges.js';
import {CITADEL_CAMPAIGN_RULESET_IDS,AUTHORED_CITADEL_RULESET_ID} from '../dist/rulesets.js';
import {createCurrentTrainingSession,TRAINING_LESSONS} from '../dist/training.js';
import {citadelOptionStatus} from '../dist/citadel-options.js';
import {encodeBattle,decodeBattle,identityOf} from '../dist/battle-codec.js';
import {validateHistoryRow} from '../dist/history-codec.js';
import {createBackup,parseBackup} from '../dist/backup.js';
import {advanceObjectiveBattle} from '../dist/objectives.js';
const full=()=>({...campaign.createCampaignProgress(),missions:Object.fromEntries(campaign.CAMPAIGN_PROGRESS_MISSIONS.map(m=>[m.id,{completed:true,stars:3,bestTime:55}]))});
const date='2026-11-07T00:00:00.000Z';
const row=(g,scenario)=>({won:true,draw:false,difficulty:g.difficulty,time:100,kills:0,built:0,date,identity:identityOf(g,scenario)});
const at=(g,time)=>{g.state.time=time;g.tick=Math.round(time/.05);return g;};
// Controlled mechanism fixtures below deliberately set time/HP/threat placement;
// these are objective-ordering checks, not paid gameplay or balance evidence.
function activeRegen(id){const g=at(campaign.createProgressionCampaignMission(id,full()),90);assert.ok(g.buyCitadelOption('regen').ok);at(g,98);assert.ok(citadelOptionStatus(g).regenWait===0);return g;}
function attack(g,target,damage=17){g._spawn({type:'archery',side:1,x:target.x+50,y:target.y,lane:target.lane??1,level:1});Object.assign(g.state.units.at(-1),{x:target.x+50,y:target.y,lane:target.lane??1,cooldown:0,damage});}

test('published v0.19 campaign-revision-four and trial-revision-two descriptors remain byte-identical',()=>{
 // Digests verified against 5ec1f967a1c8c8f9861f68b8fef3cf99c4fa460d source.
 const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
 assert.equal(digest(campaign.AUTONOMOUS_AIR_CAMPAIGN_MISSIONS),'c61422237c673749685fa16ae35e7da08d4d099eb16690a5b642790b8680d1cc');
 assert.equal(digest(campaign.AUTONOMOUS_AIR_INTRO_MISSIONS),'bdb8a883d118d29f9a462f24436245d248bc5684155b54ae47c451fffb90d9b1');
 assert.equal(digest(AUTONOMOUS_AIR_CHALLENGES),'87756b358230c8de3ff4fc46a53ca6e546e14ba061208ca8820e30f03842cca7');
});

test('every campaign and field-trial fresh attempt has citadel eligibility with unchanged deployment, roster and objective data',()=>{
 const progress=full(),before=structuredClone(progress);
 for(const old of campaign.CAMPAIGN_PROGRESS_MISSIONS.filter(beforeFinalChapter)){
  const g=campaign.createProgressionCampaignMission(old.id,progress),ref=campaign.campaignScenarioForGame(g,old.id),descriptor=campaign.getCampaignMission(old.id,['shared-crossing','one-signal-is-enough','lanterns-on-the-water','borrowed-ground','a-river-between-us','false-quiet','the-road-we-know','through-the-reed-beds','the-archers-quay','salt-in-the-stores','the-hammer-turns','the-long-screen','the-shared-watch','wake-the-reserve','the-empty-purse','leave-no-road-closed','three-minutes-more','cut-the-bowstrings'].includes(old.id)?1:5);
  assert.equal(ref.revision,['shared-crossing','one-signal-is-enough','lanterns-on-the-water','borrowed-ground','a-river-between-us','false-quiet','the-road-we-know','through-the-reed-beds','the-archers-quay','salt-in-the-stores','the-hammer-turns','the-long-screen','the-shared-watch','wake-the-reserve','the-empty-purse','leave-no-road-closed','three-minutes-more','cut-the-bowstrings'].includes(old.id)?1:5);assert.ok(g.state.citadelOptions);assert.equal(g.ruleset.id,old.id==='three-minutes-more'?'frontier-campaign-three-minutes':old.id==='cut-the-bowstrings'?'frontier-campaign-bowstrings':old.id==='leave-no-road-closed'?'frontier-campaign-leave-roads':old.id==='the-empty-purse'?'frontier-campaign-empty-purse':old.id==='wake-the-reserve'?'frontier-campaign-wake-reserve':old.id==='the-shared-watch'?'frontier-campaign-shared-watch':old.id==='the-long-screen'?'frontier-campaign-long-screen':old.id==='the-hammer-turns'?'frontier-campaign-hammer-turns':old.id==='salt-in-the-stores'?'frontier-campaign-salt-stores':old.id==='the-archers-quay'?'frontier-campaign-archers-quay':old.id==='through-the-reed-beds'?'frontier-campaign-reed-beds':old.id==='the-road-we-know'?'frontier-campaign-road-we-know':old.id==='false-quiet'?g.ruleset.id:old.id==='a-river-between-us'?'frontier-campaign-river-between':old.id==='borrowed-ground'?'frontier-campaign-borrowed-ground':old.id==='lanterns-on-the-water'?'frontier-campaign-lanterns':old.id==='one-signal-is-enough'?'frontier-campaign-one-signal':old.id==='shared-crossing'?'frontier-campaign-shared-crossing':campaign.isIntroMission(old.id)?AUTHORED_CITADEL_RULESET_ID:CITADEL_CAMPAIGN_RULESET_IDS[2]);
  for(const field of ['mapId','seed','difficulty','ai','timeLimit','startingGold','startingHealth','prerequisites','objectives','medals','playerBuildings','enemyBuildings'])assert.deepEqual(descriptor[field],old[field],old.id+'/'+field);
  if(g.state.gold[0]<190){
   assert.equal(old.id,'the-empty-purse');assert.equal(g.state.time,0);assert.equal(g.state.gold[0],0);
   const initial=g.serialize();assert.equal(g.buyCitadelOption('regen').ok,false);assert.deepEqual(g.serialize(),initial);
   // Earn the ordinary price through the real engine, not a treasury grant or clock jump.
   for(let ticks=0;g.state.gold[0]<190&&ticks<400;ticks++)g.update(.05);
   assert.ok(g.state.gold[0]>=190);assert.ok(g.state.time>0);assert.equal(g.state.winner,null);
  }
  const gold=g.state.gold[0];at(g,90);assert.ok(g.buyCitadelOption('regen').ok);assert.equal(g.state.gold[0],gold-190);assert.equal(g.state.bases[0].hp,old.startingHealth);
  const envelope=encodeBattle(g,ref,{campaignProgress:progress});assert.deepEqual(decodeBattle(envelope,{campaignProgress:progress}).game.serialize(),g.serialize());
  const restarted=campaign.createCampaignRestart(g,old.id);assert.deepEqual(campaign.campaignScenarioForGame(restarted,old.id),ref);assert.equal(restarted.state.citadelOptions.sides[0].choice,null);
 }
 for(const c of CURRENT_CHALLENGES){
  const old=getChallenge(c.id,2),{scenarioRevision,rulesetId,...same}=c,{scenarioRevision:oldRevision,rulesetId:oldRules,...prior}=old;assert.deepEqual(same,prior);
  const g=at(createCurrentChallenge(c.id),90),ref=challengeScenarioForGame(g,c.id);assert.equal(ref.revision,3);assert.equal(g.ruleset.id,AUTHORED_CITADEL_RULESET_ID);assert.equal(Object.keys(g.buildings).length,7);assert.equal(g.ai,false);
  assert.ok(g.buyCitadelOption('arrows').ok);assert.deepEqual(decodeBattle(encodeBattle(g,ref)).game.serialize(),g.serialize());assert.equal(restartChallenge(g,c.id).state.citadelOptions.sides[0].choice,null);
 }
 assert.deepEqual(progress,before);
 for(const lesson of TRAINING_LESSONS){const t=createCurrentTrainingSession({lessonId:lesson.id});assert.equal(t.game.ruleset.id,'frontier-authored-air-local');assert.equal(t.game.state.citadelOptions,undefined);}
});

test('all earned opening tiers retain their two/five/eight roster and original launch locks with revision five',()=>{
 let progress=campaign.createCampaignProgress();
 for(const [index,m] of campaign.ONBOARDING_MISSIONS.entries()){
  const g=campaign.createProgressionCampaignMission(m.id,progress);assert.equal(g.ruleset.id,CITADEL_CAMPAIGN_RULESET_IDS[index]);assert.equal(Object.keys(g.buildings).length,[2,5,8][index]);assert.ok(g.state.citadelOptions);
  for(const locked of campaign.ONBOARDING_MISSIONS.slice(index+1))assert.throws(()=>campaign.createProgressionCampaignMission(locked.id,progress),/locked/);
  if(index<2)assert.throws(()=>campaign.createProgressionCampaignMission('emberwatch',progress),/locked/);
  progress.missions[m.id]={completed:true,stars:1,bestTime:80};
 }
 assert.equal(campaign.createProgressionCampaignMission('emberwatch',progress).ruleset.id,CITADEL_CAMPAIGN_RULESET_IDS[2]);
});

test('published campaign and trial histories coexist with fresh citadel identities in a verified backup without earned-record changes',()=>{
 const progress=full(),history=[];
 for(const m of campaign.CAMPAIGN_PROGRESS_MISSIONS.filter(beforeFinalChapter))for(const revision of [1,2,3,4,5]){
  let g;try{campaign.getCampaignMission(m.id,revision);}catch{continue;}
  g=campaign.createCampaignMission(m.id,{revision,progress});const ref=campaign.campaignScenarioForGame(g,m.id),r=row(g,ref);assert.deepEqual(validateHistoryRow(r),r);history.push(r);
 }
 for(const c of CURRENT_CHALLENGES)for(const revision of [1,2,3]){
  if(revision===1&&!CHALLENGES.some(x=>x.id===c.id))continue;
  const g=createChallenge(c.id,revision),r=row(g,challengeScenarioForGame(g,c.id));assert.deepEqual(validateHistoryRow(r),r);history.push(r);
 }
 const trials=Object.fromEntries(CURRENT_CHALLENGES.map(c=>[c.id,{completed:true,bestTime:70}])),settings={volume:.4,skirmishBridgeIncome:true};
 for(let i=0;i<history.length;i+=30){const rows=history.slice(i,i+30),backup=parseBackup(createBackup({getItem:()=>null},{createdAt:date,campaign:progress,trials,settings,history:rows}));assert.deepEqual(backup.data,{campaign:progress,trials,settings,history:rows,battle:null});}
});

test('actual damage below 2000 HP fails Furnace Heart and Far Beacon on its first tick before regeneration can recover',()=>{
 for(const id of ['furnace-heart','far-beacon']){
  const g=activeRegen(id),base=g.state.bases[0];base.hp=2001;attack(g,base);const deadline=campaign.getCampaignMission(id,5).timeLimit,evaluate=x=>campaign.evaluateCampaignMission(x,id);
  assert.equal(evaluate(g).failed,false);const result=advanceObjectiveBattle(g,.25,evaluate,deadline);assert.equal(result.failed,true);assert.equal(result.completed,false);assert.equal(g.state.time,98.05);assert.equal(base.hp,1984);assert.equal(g.state.citadelOptions.sides[0].lastDamageAt,98.05);
  const bytes=g.serialize();assert.equal(advanceObjectiveBattle(g,.25,evaluate,deadline).failed,true);assert.deepEqual(g.serialize(),bytes);
 }
});

test('regeneration never bypasses an actual protected loss or the authored deadline',()=>{
 const id='winter-stores',g=activeRegen(id),protectedTarget=campaign.getCampaignTargets(g,id).find(t=>t.kind==='protect').building;protectedTarget.hp=1;attack(g,protectedTarget);
 const evaluate=x=>campaign.evaluateCampaignMission(x,id),limit=campaign.getCampaignMission(id,5).timeLimit;
 assert.equal(advanceObjectiveBattle(g,.25,evaluate,limit).failed,true);assert.equal(g.state.time,98.05);const ended=g.serialize();assert.equal(advanceObjectiveBattle(g,.25,evaluate,limit).failed,true);assert.deepEqual(g.serialize(),ended);
 for(const kind of ['arrows','regen']){
  const expired=at(campaign.createProgressionCampaignMission('emberwatch',full()),90);assert.ok(expired.buyCitadelOption(kind).ok);const deadline=campaign.getCampaignMission('emberwatch',5).timeLimit;at(expired,deadline-.05);expired.state.bases[0].hp=5500;
  const result=advanceObjectiveBattle(expired,.25,x=>campaign.evaluateCampaignMission(x,'emberwatch'),deadline);assert.equal(result.failed,true);assert.equal(expired.state.time,deadline);const bytes=expired.serialize();advanceObjectiveBattle(expired,.25,x=>campaign.evaluateCampaignMission(x,'emberwatch'),deadline);assert.deepEqual(expired.serialize(),bytes);
  const trial=at(createCurrentChallenge('skyguard'),90);assert.ok(trial.buyCitadelOption(kind).ok);const end=getChallenge('skyguard',3).timeLimit;at(trial,end-.05);assert.equal(advanceObjectiveBattle(trial,.25,x=>evaluateChallenge(x,'skyguard'),end).failed,true);assert.equal(trial.state.time,end);
 }
});

test('authored starting damage can recover toward the ordinary 6000 maximum and recovered final HP can earn an existing medal',()=>{
 const g=activeRegen('furnace-heart'),starting=g.state.bases[0].hp;advanceObjectiveBattle(g,.05,x=>campaign.evaluateCampaignMission(x,'furnace-heart'),270);assert.ok(g.state.bases[0].hp>starting);assert.equal(g.state.bases[0].maxHp,6000);
 g.state.bases[0].hp=4199.9;advanceObjectiveBattle(g,.05,x=>campaign.evaluateCampaignMission(x,'furnace-heart'),270);g.state.bases[1].hp=0;const result=campaign.evaluateCampaignMission(g,'furnace-heart');assert.equal(result.completed,true);assert.equal(result.medals.find(m=>m.id==='intact').earned,true);
});
