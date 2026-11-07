import test from 'node:test';
import assert from 'node:assert/strict';
import {runInContext} from 'node:vm';
import {startupHarness} from './mobile-startup-fixture.mjs';
import {historyWindow} from './menu-history-fixture.mjs';
import {createMenuHistory} from '../dist/menu-history.js';
import {Game,getRuleset,getMap} from '../dist/engine.js';
import * as campaign from '../dist/campaign.js';
import {missionBriefing} from '../dist/campaign-presentation.js';
import {renderMissionScouting} from '../dist/scouting.js';
import {createProfileSession,PROFILE_MARKER_KEY} from '../dist/profile-session.js';
import {createStorage,createSaveSession,writeBattle,getBattleWriteFailure} from '../dist/persistence.js';
const SAVE='ironroot.battle.v1';
const hidden=(h,id)=>h.$(id).classList.contains('hidden');
function harness({mode='skirmish'}={}) {
  const h=startupHarness({width:1180,height:757}),{c,$}=h,browser=historyWindow({host:{panel:'arcade'}});
  const data=new Map(), writes=[];let fail=false;
  const raw={getItem:key=>data.get(key)??null,setItem(key,value){if(fail)throw Error('quota');data.set(key,value);writes.push([key,value]);},removeItem:key=>data.delete(key)};
  const profileSession=createProfileSession(()=>raw,{requiredProtocolVersion:4});
  const storage=createStorage(()=>profileSession.storage);
  const section=(a,b)=>h.source.slice(h.source.indexOf(a),h.source.indexOf(b,h.source.indexOf(a)));
  Object.assign(c,campaign,{
    CAMPAIGN_MISSIONS:campaign.CAMPAIGN_PROGRESS_MISSIONS,
    CAMPAIGN_CHAPTERS:[campaign.ONBOARDING_CHAPTER,...campaign.ALL_CAMPAIGN_CHAPTERS],
    getCampaignOverview:campaign.getProgressionCampaignOverview,
    campaignProgress:campaign.createCampaignProgress(),mode,campaignPage:'mission',briefingMission:null,
    selectedCampaign:'roadside-watch',selectedChapter:'opening-roads',navigationAttempt:0,navigationGame:null,
    getRuleset,getMap,missionBriefing,renderMissionScouting,renderChallenge(){},updateResume(){},
    hasLastResult:false,retryHistorySave(){},revealBattleReport(){},
    activeDialog:null,settingsWasPaused:false,helpWasPaused:false,dialogFocus:new Map(),
    pendingBackupText:null,backupWriteAttempted:false,importGeneration:0,profileSession,pendingFinalizeOutcome:null,
    syncSettings(){},updateRecoveryUI(){},
    showRecoverySettings(){c.paused=true;$('settingsModal').classList.remove('hidden');},
    progressDirty:false,persistProgress:()=>true,saveWarning:false,SAVE,writeBattle,getBattleWriteFailure,
    battleSession:createSaveSession(storage,SAVE),
  });
  c.dialogLayers=['coachingModal','pauseVeil','viewportModal','welcome','helpModal','settingsModal','resultModal','backupModal','restartModal'].map($);
  c.syncDialogs=()=>{c.syncInputScope();c.activeDialog=c.dialogLayers.findLast(n=>!n.classList.contains('hidden'))||null;};
  for(const [a,b] of [
    ['function showCampaignPage(','setMode(mode);'],['function setMode(','function updateSkirmishRules()'],
    ['function showTitle(',"$('playAgain').onclick"],["$('lastResult').onclick =","$('resultReport').addEventListener('click'"],['function showHelp()','const mapDescriptions ='],
    ['function syncPauseMenu()','let settingsWasPaused ='],['function showSettings(event)','function syncSettings()'],
    ['function save()','function updateResume()'],["$('saveExit').onclick =", "$('speed').onclick"],
    ['function updateRecoveryUI()','function reloadProfile()'],
    ['function invalidateImportRead()','function holdRecovery('],['function hideBackup()',"$('exportBackup').onclick"],
    ['function menuNavigationTrail()','menuHistory = createMenuHistory({'],
  ])runInContext(section(a,b),c);
  c.setMode(mode);c.syncDialogs();
  const nav=createMenuHistory({...browser,token:'app-document',read:c.menuNavigationTrail,apply:c.applyMenuNavigation,unknown:c.unknownMenuNavigation});
  const sync=()=>{c.syncDialogs();nav.sync();browser.flush();c.syncDialogs();};
  return {...h,browser,nav,data,writes,sync,failWrites(value){fail=value;},
    start(){c.start();sync();},click(id){$(id).onclick();sync();},
    back(){browser.back();c.syncDialogs();nav.sync();browser.flush();},
    forward(){browser.forward();c.syncDialogs();nav.sync();browser.flush();},
  };
}
test('real app Back pauses the retained battle, saves it, then returns safely; Forward cannot revive it',()=>{
  const h=harness();h.start();const game=h.c.game;game.update(0.25);
  const before=JSON.stringify(game.serialize()),pushes=h.browser.writes.filter(w=>w.method==='push').length;
  h.back();assert.equal(h.c.paused,true);assert.equal(h.c.started,true);assert.equal(h.c.game,game);
  assert.equal(hidden(h,'pauseVeil'),false);assert.equal(JSON.stringify(game.serialize()),before);
  assert.equal(JSON.parse(h.data.get(SAVE)).game.state.time,game.state.time);
  h.forward();assert.equal(h.c.paused,true,'Forward is not Resume');assert.equal(h.c.game,game);
  h.back();h.back();assert.equal(h.c.started,false);assert.equal(hidden(h,'welcome'),false);
  h.forward();assert.equal(h.c.started,false,'old attempt history cannot restart a game');
  assert.equal(h.browser.writes.filter(w=>w.method==='push').length,pushes);
});
test('real menu nesting: Back closes restart, backup preview, Options and guide without invoking actions',()=>{
  const h=harness();h.start();h.back();const bytes=h.data.get(SAVE),game=h.c.game;
  h.click('restartBattle');assert.equal(hidden(h,'restartModal'),false);h.back();assert.equal(hidden(h,'restartModal'),true);
  assert.equal(h.c.game,game);assert.equal(h.data.get(SAVE),bytes);
  h.c.showSettings();h.sync();h.c.pendingBackupText='uncommitted import';h.$('backupModal').classList.remove('hidden');h.sync();
  h.back();assert.equal(hidden(h,'backupModal'),true);assert.equal(h.c.pendingBackupText,null);assert.equal(hidden(h,'settingsModal'),false);
  h.forward();assert.equal(hidden(h,'backupModal'),true,'cancelled preview cannot be restored by Forward');
  h.back();h.back();assert.equal(hidden(h,'settingsModal'),true);assert.equal(h.c.paused,true);
  h.c.showHelp();h.sync();h.back();assert.equal(hidden(h,'helpModal'),true);assert.equal(h.c.paused,true);
  assert.equal(h.c.game,game);assert.equal(h.data.get(SAVE),bytes);
});
test('Back during teaching dismisses into frozen planning; Back from planning Options preserves the hold',()=>{
  const h=harness({mode:'campaign'});h.start();const before=JSON.stringify(h.c.game.serialize());
  assert.equal(hidden(h,'coachingModal'),false);h.back();
  assert.equal(hidden(h,'coachingModal'),true);assert.equal(h.c.coachingHold,true);assert.equal(h.c.paused,false);
  h.c.showSettings();h.sync();h.back();assert.equal(hidden(h,'settingsModal'),true);
  assert.equal(h.c.coachingHold,true);assert.equal(h.c.paused,false);assert.equal(JSON.stringify(h.c.game.serialize()),before);
  h.forward();assert.equal(h.c.coachingHold,true);assert.equal(h.c.paused,true,'Forward can only stop, never start teaching combat');
});
test('campaign direct load and explicit route changes retain Story → Chapter → Mission hierarchy',()=>{
  const h=harness({mode:'campaign'});h.back();assert.equal(h.c.campaignPage,'chapter');
  assert.equal(h.c.document.activeElement,h.$('campaignChapterTitle'));
  h.back();assert.equal(h.c.campaignPage,'story');h.forward();assert.equal(h.c.campaignPage,'chapter');
  h.c.selectCampaignMission('emberwatch');h.sync();h.back();assert.equal(h.c.campaignPage,'chapter');
  assert.equal(h.c.selectedChapter,campaign.getCampaignMission('emberwatch').chapterId);
  h.back();assert.equal(h.c.campaignPage,'story');h.back();assert.equal(h.browser.index,0);
});
test('quota failure preserves exact retained game and warning with a finite history stack',()=>{
  const h=harness();h.start();const saved=h.data.get(SAVE),game=h.c.game;game.update(1);h.failWrites(true);
  const pushes=h.browser.writes.filter(w=>w.method==='push').length;h.back();h.back();
  assert.equal(h.c.started,true);assert.equal(h.c.paused,true);assert.equal(h.c.game,game);assert.equal(h.data.get(SAVE),saved);
  assert.match(h.$('pauseSaveStatus').textContent,/Could not save/);assert.equal(h.browser.writes.filter(w=>w.method==='push').length,pushes);
  h.failWrites(false);h.click('saveExit');assert.equal(h.c.started,false);assert.equal(JSON.parse(h.data.get(SAVE)).game.state.time,game.state.time);
});
test('another tab owns the checkpoint: Back returns to title without reclaiming or overwriting it',()=>{
  const h=harness();h.start();const newer=new Game({seed:987,mapId:'long-march'}).serialize();
  const bytes=JSON.stringify({version:1,game:newer});h.data.set(SAVE,bytes);h.back();
  assert.equal(h.c.paused,true);assert.equal(h.c.battleSession.status(),'stale');h.back();
  assert.equal(h.c.started,false);assert.equal(h.data.get(SAVE),bytes);
});
test('profile recovery and viewport safety remain held during repeated Back',()=>{
  for(const kind of ['profile','viewport']){
    const h=harness();h.start();if(kind==='profile')h.c.profileGate={message:'Reload needed'};
    else {h.c.viewportPause.measure(true);h.$('viewportModal').classList.remove('hidden');h.c.pause(true);}
    h.sync();const game=h.c.game,pushes=h.browser.writes.filter(w=>w.method==='push').length;
    for(let i=0;i<3;i++)h.back();
    assert.equal(h.c.game,game);assert.ok(h.c.paused || !h.c.started, 'a saved return to title may release the viewport hold');
    if(kind==='profile')assert.equal(h.c.started,true);
    assert.equal(h.browser.writes.filter(w=>w.method==='push').length,pushes);
  }
});
test('Back retires held pointer, click and keyboard actions before revealing the next scope',()=>{
  const h=harness();h.start();h.back();h.c.showSettings();h.sync();
  const target=h.$('settingsDone'),guard=h.c.inputScope;
  guard.pointerDown({pointerId:1,pointerType:'touch'});guard.keyDown({code:'Enter',target});
  const interruptions=h.log.interruptions;h.back();
  assert.ok(h.log.interruptions>interruptions);assert.equal(guard.pointerEnd({pointerId:1}),true);
  assert.equal(guard.click({pointerId:1,pointerType:'touch',detail:1}),true);
  assert.equal(guard.keyUp({code:'Enter',target}),true);
  guard.pointerDown({pointerId:2,pointerType:'touch'});assert.equal(guard.pointerEnd({pointerId:2}),false,'fresh input is immediately actionable');
});
test('a stale attempt marker cannot replace a restarted game or change its campaign scenario identity',()=>{
  const h=harness({mode:'campaign'});h.start();h.click('coachingPlay');h.back();
  const old=h.c.menuNavigationTrail().at(-1),game=campaign.createCampaignRestart(h.c.game,'roadside-watch');
  h.c.start(game,null,'roadside-watch',{fresh:true});h.sync();const bytes=JSON.stringify(game.serialize());
  h.c.applyMenuNavigation(old,{direction:'forward'});
  assert.equal(h.c.game,game);assert.equal(JSON.stringify(game.serialize()),bytes);assert.equal(h.c.paused,true);
});
test('older saved battles retain schema, map and bytes through browser Back and Forward pause',()=>{
  const h=harness(),old=new Game({seed:42,mapId:'classic',ai:false});old.update(0.5);
  h.c.start(Game.restore(old.serialize()));h.sync();const game=h.c.game;
  h.back();const saved=h.data.get(SAVE);h.forward();
  assert.equal(h.c.game,game);assert.equal(h.c.paused,true);assert.equal(h.data.get(SAVE),saved);
  assert.equal(JSON.parse(saved).game.version,old.serialize().version);assert.equal(game.map.id,'classic');
});
test('unknown history payload uses the live menu only and cannot assign game state',()=>{
  const h=harness();h.start();const game=h.c.game,bytes=JSON.stringify(game.serialize());
  h.browser.dispatch({ironrootNavigation:{version:1,document:'app-document',entry:'fake',game:{state:{time:999}}}});
  assert.equal(h.c.game,game);assert.equal(JSON.stringify(game.serialize()),bytes);assert.equal(h.c.paused,true);
});

test('result report is nested above results and the ended battlefield, without granting a restart',()=>{
  const h=harness();h.start();h.c.game.state.winner=0;h.c.resultShown=true;
  const report=h.c.document.createElement('details');report.open=false;h.$('resultReport').append(report);
  h.$('resultModal').classList.remove('hidden');h.sync();report.open=true;h.sync();
  const game=h.c.game,bytes=JSON.stringify(game.serialize());h.back();
  assert.equal(report.open,false);assert.equal(hidden(h,'resultModal'),false);
  h.back();assert.equal(hidden(h,'resultModal'),true);assert.equal(h.c.started,true);
  h.forward();assert.equal(hidden(h,'resultModal'),false);assert.equal(h.c.game,game);
  assert.equal(JSON.stringify(game.serialize()),bytes);
});

for(const phase of ['restoring','failed','invalid','newer-ready'])test(`${phase} profile gate cannot be dismissed or written through by Back/Forward`,()=>{
  const h=harness();h.start();h.c.game.update(.25);
  const marker=JSON.parse(h.data.get(PROFILE_MARKER_KEY));marker.epoch='changed-profile';marker.phase=phase==='newer-ready'?'ready':phase;
  h.data.set(PROFILE_MARKER_KEY,phase==='invalid'?'broken marker':JSON.stringify(marker));
  h.c.syncProfileSafety();h.sync();const game=h.c.game,bytes=[...h.data],pushes=h.browser.writes.filter(w=>w.method==='push').length;
  assert.equal(hidden(h,'settingsModal'),false);assert.equal(h.$('settingsDone').disabled,true);
  for(const action of ['back','forward','back','back']){
    h[action]();assert.equal(h.c.game,game);assert.equal(h.c.started,true);assert.equal(h.c.paused,true);
    assert.equal(hidden(h,'settingsModal'),false);assert.equal(hidden(h,'profileRecovery'),false);
    assert.deepEqual([...h.data],bytes);
  }
  assert.equal(h.browser.writes.filter(w=>w.method==='push').length,pushes);
});

test('real pagehide/pageshow hooks retain a paused battle without adding history on cached return',()=>{
  const h=harness();h.start();h.c.game.update(.5);const listeners={};
  h.c.window.addEventListener=(type,handler)=>{listeners[type]=handler;};
  h.c.menuHistory=h.nav;h.c.navigationAway=false;
  runInContext(h.source.slice(h.source.lastIndexOf("window.addEventListener('pagehide',")),h.c);
  const game=h.c.game,pushes=h.browser.writes.filter(w=>w.method==='push').length;
  listeners.pagehide({persisted:true});assert.equal(h.c.navigationAway,true);assert.equal(h.c.paused,true);
  const bytes=h.data.get(SAVE);listeners.pageshow({persisted:true});
  assert.equal(h.c.navigationAway,false);assert.equal(h.c.paused,true);assert.equal(h.c.game,game);assert.equal(h.data.get(SAVE),bytes);
  assert.equal(h.browser.writes.filter(w=>w.method==='push').length,pushes);
});

test('Back closes the owned-building inspector before pausing, and Forward cannot resume its battle',()=>{
  const h=harness();h.start();const game=h.c.game,building=game.state.buildings.find(b=>b.side===0);
  h.c.ui.selected=building.id;h.c.updateSelection();h.sync();const checkpoint=h.data.get(SAVE);
  assert.equal(hidden(h,'selectionPanel'),false);h.back();assert.equal(hidden(h,'selectionPanel'),true);
  assert.equal(h.c.ui.selected,null);assert.equal(h.c.paused,false);assert.equal(h.c.game,game);assert.equal(h.data.get(SAVE),checkpoint);
  h.forward();assert.equal(h.c.paused,true);assert.equal(h.c.game,game);assert.equal(h.data.get(SAVE),checkpoint);
});

test('completed battle → title → Last battle report → Back twice restores the visible title',()=>{
  const h=harness();h.start();h.c.game.state.winner=0;h.c.resultShown=true;h.c.hasLastResult=true;
  const report=h.c.document.createElement('details');h.$('resultReport').append(report);
  h.$('resultModal').classList.remove('hidden');h.sync();h.c.showTitle();h.sync();
  const game=h.c.game,bytes=[...h.data];h.click('lastResult');
  assert.equal(report.open,true);assert.equal(hidden(h,'welcome'),true);assert.equal(h.c.started,false);
  h.back();assert.equal(report.open,false);assert.equal(hidden(h,'resultModal'),false);
  h.back();assert.equal(hidden(h,'welcome'),false);assert.equal(hidden(h,'resultModal'),true);
  assert.equal(h.c.started,false);assert.equal(h.c.game,game);assert.deepEqual([...h.data],bytes);
});

test('five Back → Forward → explicit Resume cycles reuse the existing pause/play ancestry',()=>{
  const h=harness();h.start();const length=h.browser.history.length,game=h.c.game;
  for(let i=0;i<5;i++){
    h.back();assert.equal(h.c.paused,true);h.forward();assert.equal(h.c.paused,true);
    h.c.pause(false,{explicit:true});h.sync();assert.equal(h.c.paused,false);
    assert.equal(h.browser.history.length,length,`cycle ${i+1} must not append duplicate pause entries`);
    assert.equal(h.c.game,game);
  }
  h.back();assert.equal(h.c.paused,true);assert.equal(h.c.started,true);
  h.back();assert.equal(h.c.started,false);assert.equal(hidden(h,'welcome'),false);
});
