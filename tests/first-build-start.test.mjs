import test from 'node:test';
import assert from 'node:assert/strict';
import {runInContext} from 'node:vm';
import {Game,buildBounds} from '../dist/engine.js';
import {createCampaignProgress,createCampaignRestart,ONBOARDING_MISSIONS,getCampaignTargets,evaluateCampaignMission} from '../dist/campaign.js';
import {recommendCampaignSite} from '../dist/campaign-flow.js';
import {advanceObjectiveBattle} from '../dist/objectives.js';
import {startupHarness} from './mobile-startup-fixture.mjs';

function setup(index=0) {
  const h=startupHarness({width:390,height:650}),{c,$}=h;
  const progress=createCampaignProgress();
  for(const m of ONBOARDING_MISSIONS.slice(0,index)) progress.missions[m.id]={completed:true,stars:1,bestTime:60};
  Object.assign(c,{firstBuildHold:false,campaignProgress:progress,selectedCampaign:ONBOARDING_MISSIONS[index].id,
    buildBounds,getCampaignTargets,evaluateCampaignMission,advanceObjectiveBattle,
    last:0,lastProfileCheck:0,saveTimer:0,hudTimer:0,toastTimer:0,updateController(){},sampleBattleReport(){},finish(){},updateAudio(){},drawCampaignGuidance(){},flushProtectedWarnings(){},
    helpWasPaused:false,settingsWasPaused:false,dialogFocus:new Map(),invalidateImportRead(){},syncSettings(){},
    toast(text){c.lastToast=text;},showTitle(){c.started=false;}});
  c.renderer.draw=()=>{};c.renderer.snap=p=>p;
  for(const [a,b] of [
    ['function selectBuild(','function cancel()'],['function activateBattlePoint(','function resetBattleGesture()'],
    ['function showHelp()','const mapDescriptions ='],['let settingsWasPaused =','function syncSettings()'],
    ['function frame(now)','\nupdateHUD();\nrequestAnimationFrame(frame);'],
  ]) runInContext(h.source.slice(h.source.indexOf(a),h.source.indexOf(b,h.source.indexOf(a))),c);
  c.start();
  return {...h,buy(repeatBuild=false){const site=recommendCampaignSite(c.game,'barracks').site;assert.ok(site);c.selectBuild('barracks');c.activateBattlePoint(site,{repeatBuild});return site;}};
}

test('fresh Roadside enters real build UI without a choice, stays frozen, then paid barracks starts it',()=>{
  const h=setup(),{c,$}=h;
  assert.equal(c.firstBuildHold,true);assert.equal(c.coachingHold,true);assert.equal(c.paused,false);
  assert.equal($('coachingModal').classList.contains('hidden'),true);
  assert.equal($('coachResume').classList.contains('hidden'),true);
  assert.equal($('campaignCoach').classList.contains('hidden'),false);
  assert.match($('coachText').textContent,/automatically/);
  const before=c.game.serialize();c.frame(100);c.frame(9000);assert.deepEqual(c.game.serialize(),before);
  h.buy();assert.equal(c.firstBuildHold,false);assert.equal(c.coachingHold,false);assert.equal(c.ui.build,null);
  assert.equal(c.game.state.gold[0],before.state.gold[0]-c.game.buildings.barracks.cost);
  assert.equal(c.game.state.buildings.filter(b=>b.side===0).length,1);
  c.frame(9100);assert.ok(c.game.state.time>0);assert.ok(c.game.state.gold[0]>280);
  c.activateBattlePoint({x:270,y:450});assert.equal(c.game.state.buildings.filter(b=>b.side===0).length,1);
});

test('other purchases, cancellation, inspection, bad territory and failed build do not spend or start',()=>{
  const {c}=setup();const initial=c.game.serialize();
  c.selectBuild('archery');assert.equal(c.ui.build,null);assert.match(c.lastToast,/barracks first/);
  c.ui.build='archery';c.activateBattlePoint({x:550,y:450});assert.deepEqual(c.game.serialize(),initial);
  c.cancel();c.activateBattlePoint({x:550,y:450});assert.equal(c.firstBuildHold,true);
  c.selectBuild('barracks');c.activateBattlePoint({x:3000,y:450});assert.deepEqual(c.game.serialize(),initial);
  c.cancel();assert.equal(c.firstBuildHold,true);
  c.selectBuild('barracks');const actual=c.game.build.bind(c.game);c.game.build=()=>({ok:false,reason:'Blocked'});
  c.activateBattlePoint({x:550,y:450});assert.equal(c.firstBuildHold,true);assert.deepEqual(c.game.serialize(),initial);
  c.game.build=actual;c.game.state.gold[0]=0;c.activateBattlePoint({x:550,y:450});assert.equal(c.firstBuildHold,true);assert.equal(c.game.state.gold[0],0);
});

for(const guard of ['paused','hidden','viewport','recovery','profile','stale','limit','modal']) test(`placement cannot cross ${guard} boundary`,()=>{
  const {c,$}=setup();c.selectBuild('barracks');const initial=c.game.serialize();
  if(guard==='paused')c.pause(true);
  if(guard==='hidden')c.document.hidden=true;
  if(guard==='viewport')c.viewportPause.measure(true);
  if(guard==='recovery')c.recoveryHold={};
  if(guard==='profile')c.profileGate={};
  if(guard==='stale')c.battleSession.status=()=> 'stale';
  if(guard==='limit')c.battleSafetyReason='limit';
  if(guard==='modal')$('settingsModal').classList.remove('hidden');
  c.activateBattlePoint({x:550,y:450});assert.equal(c.firstBuildHold,true);assert.deepEqual(c.game.serialize(),initial);
});

test('Pause, explicit Resume and Options return to first-build planning, never starting time',()=>{
  const h=setup(),{c,$}=h;c.toggleBattlePause();assert.equal(c.paused,true);
  c.pause(false,{explicit:true});assert.equal(c.paused,false);assert.equal(c.firstBuildHold,true);
  c.showSettings({currentTarget:$('settings')});assert.equal(c.paused,true);c.hideSettings();
  assert.equal(c.paused,false);assert.equal(c.firstBuildHold,true);
  c.frame(100);assert.equal(c.game.state.time,0);
  h.buy();c.pause(true);const before=c.game.serialize();
  c.ui.build='barracks';c.activateBattlePoint({x:270,y:450});assert.equal(c.paused,true);assert.deepEqual(c.game.serialize(),before);
});

test('successful transition invalidates held pointer/key/controller input and preserves explicit mouse repeat',()=>{
  const h=setup(),{c,log}=h;let resets=0;c.controller.reset=()=>resets++;
  c.inputScope.pointerDown({pointerId:42,pointerType:'mouse'});c.inputScope.keyDown({code:'Space',target:'battle'});
  const interrupted=log.interruptions;h.buy(true);
  assert.equal(c.ui.build,'barracks');assert.ok(log.interruptions>interrupted);assert.ok(resets>0);
  assert.equal(c.inputScope.pointerEnd({pointerId:42}),true);
  assert.equal(c.inputScope.keyDown({code:'Space',target:'battle',repeat:true}),true);
  const site=recommendCampaignSite(c.game,'barracks').site;c.activateBattlePoint(site);
  assert.equal(c.ui.build,null);assert.equal(c.game.state.buildings.filter(b=>b.side===0).length,2);
});

test('resumed saves and completed replays run; unfinished restart preserves identity and first-build gate',()=>{
  const {c,$}=setup();const saved=c.game.serialize();
  assert.doesNotMatch(JSON.stringify(saved),/firstBuildHold|coachingHold|startAfterBuild/);
  c.start(Game.restore(saved),null,'roadside-watch');assert.equal(c.firstBuildHold,false);assert.equal(c.coachingHold,false);
  const restarted=createCampaignRestart(c.game,'roadside-watch');
  const identity=g=>[g.map.id,g.map.revision,g.ruleset.id,g.ruleset.revision,g.schemaVersion];
  c.start(restarted,null,'roadside-watch',{fresh:true});assert.deepEqual(identity(c.game),identity(Game.restore(saved)));assert.equal(c.firstBuildHold,true);
  c.campaignProgress.missions['roadside-watch']={completed:true,stars:1,bestTime:60};c.start();
  assert.equal(c.firstBuildHold,false);assert.equal(c.coachingHold,false);
  $('coachReplay').onclick();assert.equal(c.firstBuildHold,false);assert.equal(c.coachingHold,true);assert.equal($('coachingModal').classList.contains('hidden'),false);
});

test('later lessons retain their explicit reading and planning choices',()=>{
  for(const index of [1,2]){const {c,$}=setup(index);assert.equal(c.firstBuildHold,false);assert.equal(c.coachingHold,true);assert.equal($('coachingModal').classList.contains('hidden'),false);$('coachingPlay').onclick();assert.equal(c.coachingHold,false);}
});

test('unavailable save storage preserves unsaved-play policy without stranding a paid barracks',()=>{
  const h=setup(),{c}=h;c.battleSession.status=()=> 'unavailable';h.buy();
  assert.equal(c.firstBuildHold,false);assert.equal(c.coachingHold,false);assert.equal(c.game.state.gold[0],280);
  c.frame(100);assert.ok(c.game.state.time>0);
});

test('an occupied real engine site cannot complete the first-build step',()=>{
  const {c}=setup();assert.equal(c.game.build('archery',550,450).ok,true);
  c.selectBuild('barracks');const before=c.game.serialize();c.activateBattlePoint({x:550,y:450});
  assert.deepEqual(c.game.serialize(),before);assert.equal(c.firstBuildHold,true);assert.equal(c.ui.build,'barracks');
});
