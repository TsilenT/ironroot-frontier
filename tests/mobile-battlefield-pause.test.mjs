import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext,createContext} from 'node:vm';
import {createViewportPause,inspectMobileGeometry,visibleViewportRect,fitMobileViewport,insetViewportRect} from '../dist/mobile-battlefield.js';
import {createInputScopeGuard} from '../dist/input-scope.js';
import {createCampaignMission,getCampaignTargets,evaluateCampaignMission,CAMPAIGN_MISSIONS} from '../dist/campaign.js';
import {drawCampaignGuidance} from '../dist/campaign-flow.js';
import {advanceObjectiveBattle} from '../dist/objectives.js';
import {layout,box} from './mobile-layout-fixture.mjs';
const app=readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');
const section=(a,b)=>app.slice(app.indexOf(a),app.indexOf(b,app.indexOf(a)));
function harness(w=568,h=210){
 let insets={};const geometry=()=>{const style=$('app').style;return layout(w,h,{...insets,root:box(parseFloat(style.left)||0,parseFloat(style.top)||0,style.width?parseFloat(style.width):w,style.height?parseFloat(style.height):h)});};const elements=new Map(),log={saves:0,interruptions:0,resets:0,scene:[],advances:[],toasts:[]};
 const $=id=>{if(!elements.has(id)){const classes=new Set(['viewportModal','settingsModal','helpModal','backupModal','resultModal','welcome','pauseVeil'].includes(id)?['hidden']:[]);elements.set(id,{id,style:{},disabled:false,textContent:'',classList:{contains:x=>classes.has(x),add:x=>classes.add(x),remove:x=>classes.delete(x),toggle(x,on){if(on)classes.add(x);else classes.delete(x);}},getBoundingClientRect:()=>geometry().nodes[id]??box(0,0,0,0)});}return elements.get(id);};
 $('app').classList.add('protected-mobile');$('app').classList.add('protected-compact');
 const game=createCampaignMission('winter-stores'),inputScope=createInputScopeGuard('compact-battle:landscape');
 const c={battleSafetyReason:null,drawCampaignGuidance,$,game,started:true,paused:false,protectedAlerts:null,protectedMonitor:{observe(){}},objectiveOutcome:null,mobileLayout:'landscape',viewportPause:createViewportPause(),inspectMobileGeometry,visibleViewportRect,fitMobileViewport,insetViewportRect,
  protectedControls:new Map([['a',{button:$('target0')}],['b',{button:$('target1')}]]),
  inputScope,controller:{reset(){log.resets++;}},resetBattleGesture(){log.interruptions++;},armedProtectedControl:{},closeSelectionArmed:true,padHud:true,
  recoveryHold:null,profileGate:null,battleSession:{status:()=>c.stale?'stale':'current'},showRecoverySettings(){c.recoveryShown=true;},showTitle(){c.titleShown=true;c.started=false;},
  setCompactBuildOpen(){ $('app').classList.remove('compact-build-open');},cancel(){c.ui.build=null;c.ui.spell=false;c.ui.selected=null;c.setCompactBuildOpen(false);},pauseControl(){},
  save(){log.saves++;return !c.saveFails;},persistProgress:()=>true,progressDirty:false,toast:x=>log.toasts.push(x),
  getComputedStyle:()=>Object.fromEntries(['Top','Right','Bottom','Left'].map(side=>['padding'+side,`${insets[side.toLowerCase()]||0}px`])),
  window:{innerWidth:w,innerHeight:h,visualViewport:{addEventListener(){}}},document:{},ui:{build:'mint',spell:true,selected:7},
  last:0,lastProfileCheck:0,syncProfileSafety(){},updateController(){assert.equal(c.paused||!c.viewportPause.active,true);},speed:1,follow:false,saveTimer:0,hudTimer:0,toastTimer:0,
  currentCampaign:'winter-stores',currentChallenge:null,CAMPAIGN_MISSIONS,CHALLENGES:[],evaluateCampaignMission,getCampaignTargets,
  advanceObjectiveBattle(...args){log.advances.push(args[1]);return advanceObjectiveBattle(...args);},sampleBattleReport(){},finish(){},
  renderer:{camera:450,draw(){},resize(){}},syncProtectedLayout(){},requestAnimationFrame(){},updateHUD(){},
  audio:{setScene:x=>log.scene.push(x),setIntensity(){}},heardEffects:new WeakSet(),heardProjectiles:new WeakSet(),sound(){},
  settingsWasPaused:false,helpWasPaused:false,invalidateImportRead(){},updateRecoveryUI(){},
 };
 c.dialogLayers=['viewportModal','welcome','helpModal','settingsModal','resultModal','backupModal'].map($);
 c.syncDialogs=()=>c.syncInputScope();
 createContext(c);
 for(const source of [section('function syncInputScope()','function guardInput('),section('function pause(value,',"$('pause').onclick ="),section('function viewportScope()','// Portable backups'),section('function hideSettings()','function syncSettings()'),section('function hideHelp()',"$('help').onclick"),section('function flushProtectedWarnings(now)','function finishProtectedObjectives('),section('function updateAudio()','function frame('),section('function frame(now)','\nupdateHUD();\nrequestAnimationFrame(frame);'),section("$('saveExit').onclick", "$('speed').onclick")])runInNewContext(source,c);
 return {c,$,log,resize(width,height,nextInsets={}){w=width;h=height;insets=nextInsets;c.window.innerWidth=width;c.window.innerHeight=height;c.mobileLayout=width>height?'landscape':'portrait';},frame:now=>c.frame(now),sync:()=>c.syncViewportSafety()};
}

test('real app holds a loaded undersized battle before advancement, saves once, and waits for explicit resume',()=>{
 const h=harness(),before=JSON.stringify(h.c.game.serialize());
 h.frame(1000);assert.equal(h.c.paused,true);assert.equal(h.c.viewportPause.active,true);assert.equal(h.c.viewportPause.blocked,true);assert.equal(h.$('viewportResume').disabled,true);
 assert.equal(h.c.ui.build,null);assert.equal(h.c.ui.spell,false);assert.equal(h.c.padHud,false);assert.equal(h.log.saves,1);
 for(const time of [2000,10000,60000])h.frame(time);
 assert.equal(JSON.stringify(h.c.game.serialize()),before);assert.equal(h.log.advances.length,0);assert.equal(h.log.saves,1);assert.ok(h.log.scene.every(s=>s==='paused'));
 h.resize(320,480);h.frame(60100);assert.equal(h.c.viewportPause.blocked,false);assert.equal(h.c.paused,true);assert.equal(h.$('viewportResume').disabled,false);
 h.c.pause(false);assert.equal(h.c.paused,true,'automatic callers cannot clear the latch');
 h.$('viewportResume').onclick();assert.equal(h.c.paused,false);assert.equal(h.c.viewportPause.active,false);assert.equal(h.$('viewportModal').classList.contains('hidden'),true);
 h.frame(60116);assert.deepEqual(h.log.advances,[.016],'no hidden elapsed-time catch-up');
});
test('real scope transitions cancel old pointer and activation-key releases, including blocked-to-ready',()=>{
 for(const kind of ['mouse','touch','pen']){
  const h=harness(),p={pointerId:1,pointerType:kind,isPrimary:true},key={code:'Enter',repeat:false,target:h.$('viewportResume')};
  h.c.inputScope.pointerDown(p);h.c.inputScope.keyDown(key);h.sync();
  assert.equal(h.c.inputScope.pointerEnd(p),true);assert.equal(h.c.inputScope.keyUp(key),true);
  h.c.inputScope.pointerDown(p);h.c.inputScope.keyDown(key);h.resize(320,480);h.sync();
  assert.equal(h.c.viewportScope(),'viewport-ready');assert.equal(h.c.inputScope.pointerEnd(p),true);assert.equal(h.c.inputScope.click({...p,detail:1,isTrusted:true}),true);assert.equal(h.c.inputScope.keyUp(key),true);
  h.c.inputScope.pointerDown(p);assert.equal(h.c.inputScope.pointerEnd(p),false);assert.equal(h.c.inputScope.click({...p,detail:1,isTrusted:true}),false);
 }
});
test('settings/help dismissal cannot automatically resume a viewport-paused battle after recovery',()=>{
 for(const [modal,close]of [['settingsModal','hideSettings'],['helpModal','hideHelp']]){
  const h=harness();h.$(modal).classList.remove('hidden');h.sync();h.resize(390,500);h.sync();
  assert.equal(h.$(modal).classList.contains('hidden'),false);assert.equal(h.c.viewportPause.active,true);
  h.c[close]();assert.equal(h.$(modal).classList.contains('hidden'),true);assert.equal(h.c.paused,true);assert.equal(h.c.viewportPause.active,true);
 }
});
test('recovery and stale-session checks retain precedence over explicit viewport resume',()=>{
 const h=harness();h.sync();h.resize(320,480);h.sync();h.c.recoveryHold={reason:'storage'};
 h.$('viewportResume').onclick();assert.equal(h.c.recoveryShown,true);assert.equal(h.c.paused,true);assert.equal(h.c.viewportPause.active,true);
 h.c.recoveryHold=null;h.c.stale=true;h.$('viewportResume').onclick();assert.equal(h.c.titleShown,true);assert.equal(h.c.paused,true);
});
test('the same guarded title exit is usable while blocked and retains the paused battle when saving fails',()=>{
 const h=harness(320,160);h.sync();assert.equal(h.c.viewportPause.blocked,true);h.c.saveFails=true;h.$('viewportExit').onclick();
 assert.equal(h.c.started,true);assert.equal(h.c.paused,true);assert.equal(h.c.titleShown,undefined);assert.match(h.$('viewportSaveStatus').textContent,/Saving failed.*remains paused/);
 h.c.saveFails=false;h.$('viewportExit').onclick();assert.equal(h.c.titleShown,true);assert.equal(h.c.started,false);
});
test('a genuinely too-small visual viewport is held even after fitting, without an arbitrary portrait minimum',()=>{
 const h=harness(320,480);h.sync();assert.equal(h.c.viewportPause.active,false);
 h.c.window.visualViewport.height=390;h.sync();assert.equal(h.c.viewportPause.blocked,true);
 delete h.c.window.visualViewport.height;h.sync();assert.equal(h.c.viewportPause.blocked,false);assert.equal(h.c.paused,true);
});
test('actual start and input entry points check geometry before gameplay and normal dialogs outrank the hold',()=>{
 const start=section('function start(','function beginProtectedObjectives(');
 assert.match(start,/started = true;[\s\S]*syncViewportSafety\(\);[\s\S]*?save\(\);/);
 assert.match(app,/function frame\(now\) \{\s*syncViewportSafety\(\);/);
 assert.match(app,/const dialogLayers = \[\s*\$\('viewportModal'\),\s*\$\('welcome'\),/);
 assert.match(app,/function guardInput\(event, check\) \{\s*syncViewportSafety\(\);/);
 assert.match(app,/window\.visualViewport\?\.addEventListener\('resize'/);
});
