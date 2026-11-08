import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInContext} from 'node:vm';
import {Game,getRuleset,getMap,MAPS,buildBounds} from '../dist/engine.js';
import {FOG_SKIRMISH_RULESET_ID,supportsFog,refreshFog} from '../dist/fog.js';
import {FogRenderer,ObservationAudio} from '../dist/fog-view.js';
import {Renderer} from '../dist/render.js';
import {citadelOptionStatus,supportsCitadelOptions,CITADEL_AI_TEXT} from '../dist/citadel-options.js';
import {citadelStatusText,observedEnemyCitadelText} from '../dist/citadel-view.js';
import {encodeBattle,decodeBattle,identityOf,scenarioForBattle} from '../dist/battle-codec.js';
import {createBackup,parseBackup,MAX_BACKUP_BYTES,BACKUP_STORAGE_KEYS} from '../dist/backup.js';
import {createCampaignProgress,getProgressionCampaignOverview as getCampaignOverview} from '../dist/campaign.js';
import {createBattleJournal} from '../dist/battle-report.js';
import {startupHarness} from './mobile-startup-fixture.mjs';
import {installCanvas,makeRenderer,digest} from './renderer-canvas.mjs';
const app=readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');
const section=(a,b)=>{const i=app.indexOf(a),j=app.indexOf(b,i);assert.ok(i>=0&&j>i,a);return app.slice(i,j);};
function harness({fog=true}={}) {
  installCanvas(); const h=startupHarness({width:1180,height:757}),{c,$}=h;
  Object.assign(c,{getRuleset,getMap,MAPS,buildBounds,citadelOptionStatus,supportsCitadelOptions,CITADEL_AI_TEXT,citadelStatusText,observedEnemyCitadelText,
    audio:{setScene(v){h.scene=v;},setIntensity(v){h.intensity=v;}},sound:(name,options)=>h.sounds.push({name,options}),sounds:[],savePreferences(){h.preferenceWrites++;},
    SAVE:'ironroot.battle.v1',saveWarning:false,fogRenderer:null,FogRenderer:class{constructor(){return makeRenderer(FogRenderer,1180,398);}},
    citadelNoticeGame:null,citadelNoticePhase:null,citadelUnsavedGame:null,
  }); h.sounds=[];h.preferenceWrites=0;
  c.renderer=makeRenderer(Renderer,1180,398);c.ordinaryRenderer=c.renderer;
  c.mode='skirmish';c.selectedMap='classic';c.selectedRuleset='frontier-air-local-open';c.preferences={reducedMotion:true,quality:'low',skirmishBridgeIncome:false};
  runInContext(section('const mapDescriptions =','for (const btn of document.querySelectorAll('),c);
  runInContext(section('function updateSkirmishRules()','for (const button of document.querySelectorAll('),c);
  for(const [a,b]of [['function selectBuild(','function cancel()'],['function activateBattlePoint(','function resetBattleGesture()'],['function updateAudio()','function frame('],['var citadelNoticeGame =','// The pause menu is a top-level dialog'],['function syncPauseMenu()','function keyboardTitle(']])runInContext(section(a,b),c);
  c.dialogLayers.push($('citadelModal'),$('pauseVeil'),$('restartModal'));
  $('skirmishFog').checked=fog;$('skirmishFog').onchange();
  h.start=()=>{c.start();c.viewportPause.clear();c.paused=false;for(const layer of c.dialogLayers)layer.classList.add('hidden');c.refreshPresentation();h.sounds=[];return c.game;};
  return h;
}
const unit=(g,side,x,y=450)=>{const u={id:g.nextId++,type:'warrior',side,x,y,lane:1,flying:false,hp:180,maxHp:180,level:1,cooldown:0,attack:0};g.state.units.push(u);return u;};
const snapshotDOM=$=>['enemyHp','enemyHpText','yourHpText','gold','army','time','battle','minimap','front','citadelEnemyStatus','citadelReadiness','buyCitadelRegen','pauseContext'].map(id=>{const n=$(id);return[id,n.textContent,{...n.attributes},{...n.style},n.disabled]});
function present(h) {const {c}=h;c.refreshPresentation();c.updateHUD();c.syncPauseMenu();c.updateAudio();const prior=c.renderer;c.renderer=makeRenderer(prior.constructor,prior.width,prior.height);c.renderer.camera=prior.camera;c.renderer.setMap(c.game.map);c.renderer.canvas.reset();c.renderer.mini.reset();c.renderer.draw(c.battleView(),{...c.ui,paused:true},0);return {dom:snapshotDOM(h.$),field:digest(c.renderer.canvas.calls),mini:digest(c.renderer.mini.calls),front:c.battleFront(),sounds:h.sounds,intensity:h.intensity};}

test('actual setup starts unchecked and never persists the fog choice; incompatible combinations cannot claim or write',()=>{
 const h=harness({fog:false}),{c,$}=h;assert.equal($('skirmishFog').checked,false);assert.equal(h.preferenceWrites,0);
 for(const [map,endgame,bridge]of [['long-march','frontier-air-local-open',false],['classic','frontier-air-local-timed',false],['classic','frontier-air-local-open',true]]) {
  c.selectedMap=map;c.selectedRuleset=endgame;$('skirmishBridgeIncome').checked=bridge;$('skirmishFog').checked=false;c.updateSkirmishRules();assert.equal($('skirmishFog').disabled,true);
  const before=c.game.serialize(),counts={...h.log};$('skirmishFog').checked=true;c.start();assert.deepEqual(c.game.serialize(),before);assert.equal(h.log.claims,counts.claims);assert.equal(h.log.saves,counts.saves);assert.equal(c.selectedMap,map);assert.equal(c.selectedRuleset,endgame);assert.equal($('skirmishBridgeIncome').checked,bridge);
 }
 assert.equal(h.preferenceWrites,0);
});
test('actual supported setup locks incompatible controls without rewriting choices; live identity does not follow checkbox',()=>{
 const h=harness(),{c,$}=h;assert.equal($('skirmishRules').disabled,true);assert.equal($('skirmishBridgeIncome').disabled,true);
 for(const b of $('mapChoices').querySelectorAll('[data-map]'))assert.equal(b.disabled,b.dataset.map!=='classic');
 h.start();assert.equal(c.game.ruleset.id,FOG_SKIRMISH_RULESET_ID);assert.equal(c.renderer instanceof FogRenderer,true);
 const game=c.game;$('skirmishFog').checked=false;$('skirmishFog').onchange();assert.equal(c.game,game);assert.equal(supportsFog(c.game.ruleset),true);assert.equal(h.preferenceWrites,0);
 assert.equal($('skirmishRules').disabled,false);assert.equal($('skirmishBridgeIncome').disabled,false);
});
test('all ordinary map/endgame/bridge combinations retain existing identity, settings and stock renderer',()=>{
 for(const map of ['classic','long-march','twin-span'])for(const timed of [false,true])for(const bridges of [false,true]){
  const h=harness({fog:false}),{c,$}=h;c.selectedMap=map;c.selectedRuleset=`frontier-air-local-${timed?'timed':'open'}`;$('skirmishBridgeIncome').checked=bridges;h.start();
  assert.equal(c.game.map.id,map);assert.equal(c.game.ruleset.id,`frontier-citadel-${bridges?'bridge-':''}${timed?'timed':'open'}`);assert.equal(c.renderer,c.ordinaryRenderer);assert.equal(c.battleView(),c.game);
 }
});
test('actual HUD, aria, citadel dialog, Front, field, minimap and music ignore hidden opponent changes',()=>{
 const h=harness(),{c,$}=h,g=h.start();c.paused=false;const a=present(h);
 g.state.gold[1]=9999;g.state.income[1]=99;g.state.bases[1].hp=321;g.state.frontline=2900;
 g.state.buildings.find(b=>b.side===1).progress=.999;unit(g,1,2800);g.state.citadelOptions.sides[1]={choice:'regen',purchasedAt:0,purchasedTick:0,lastDamageAt:0,healedTotal:400,extraShots:17};refreshFog(g);
 const b=present(h);assert.deepEqual(b,a);assert.equal($('enemyHpText').textContent,'?');assert.match($('enemyHpText').attributes['aria-label'],/unknown/);assert.equal($('enemyHp').style.width,'');assert.doesNotMatch($('citadelEnemyStatus').textContent,/321|400|17|waiting|recovering/i);
});
test('current enemy HP/choice turns unknown on sight loss without carrying timers or old aria',()=>{
 const h=harness(),{c,$}=h,g=h.start();const scout=unit(g,0,2940);g.state.bases[1].hp=5400;g.state.citadelOptions.sides[1].choice='regen';refreshFog(g);present(h);
 assert.equal($('enemyHpText').textContent,'90%');assert.match($('citadelEnemyStatus').textContent,/5400.*with the Regeneration upgrade/);
 scout.x=300;refreshFog(g);present(h);assert.equal($('enemyHpText').textContent,'?');assert.match($('citadelEnemyStatus').textContent,/Scout the enemy citadel.*last seen: Regeneration/);assert.doesNotMatch($('enemyHpText').attributes['aria-label'],/90/);
});
test('own citadel remains honestly purchasable with unseen enemy HP and pays once through actual modal handler',()=>{
 const h=harness(),{c,$}=h,g=h.start();c.paused=true;$('citadelModal').classList.remove('hidden');c.updateCitadelUI();
 assert.equal(c.battleView().state.bases[1].hp,null);assert.equal($('buyCitadelRegen').disabled,false);assert.match($('citadelReadiness').textContent,/Ready/);
 const gold=g.state.gold[0];c.purchaseCitadelOption('regen');assert.equal(g.state.gold[0],gold-190);assert.equal(g.state.citadelOptions.sides[0].choice,'regen');c.purchaseCitadelOption('arrows');assert.equal(g.state.gold[0],gold-190);assert.equal($('citadelEnemyStatus').textContent,'Scout the enemy citadel to see its health and upgrade.');
});
test('actual paid command rejects hidden/lost-sight Volley, keeps invalid build free, and spends valid cost once',()=>{
 const h=harness(),{c}=h,g=h.start();c.ui.spell=true;const before=g.serialize();c.activateBattlePoint({x:2400,y:450});assert.deepEqual(g.serialize(),before);assert.equal(c.ui.spell,true);
 c.ui.spell=false;c.ui.build='barracks';c.activateBattlePoint({x:2400,y:450});assert.deepEqual(g.serialize(),before);
 c.ui.build=null;c.ui.spell=true;const scout=unit(g,0,1800);refreshFog(g);c.refreshPresentation();c.ui.pointer={x:1800,y:450};scout.x=300;refreshFog(g);const lost=g.serialize();c.activateBattlePoint({x:1800,y:450});assert.deepEqual(g.serialize(),lost);
 const gold=g.state.gold[0];c.activateBattlePoint({x:300,y:450});assert.equal(g.state.gold[0],gold-75);assert.equal(c.ui.spell,false);const paid=g.serialize();c.activateBattlePoint({x:300,y:450});assert.deepEqual(g.serialize(),paid);
});
test('fog command sounds occur once; paused and off-camera events are consumed rather than replayed',()=>{
 const h=harness(),{c}=h,g=h.start();c.ui.build='barracks';c.activateBattlePoint({x:550,y:450});c.updateAudio();assert.equal(h.sounds.filter(s=>s.name==='build').length,1);
 g._effect(300,450,'hit',0);c.refreshPresentation();c.paused=true;c.updateAudio();c.paused=false;c.updateAudio();assert.equal(h.sounds.filter(s=>s.name==='sword').length,0);
 g._effect(300,450,'hit',0);c.refreshPresentation();c.renderer.camera=3100;c.updateAudio();c.renderer.camera=300;c.updateAudio();assert.equal(h.sounds.filter(s=>s.name==='sword').length,0);
});
test('fog restore preserves knowledge while restart resets it and renderer switches clear transient consumers',()=>{
 const h=harness(),{c,$}=h,g=h.start();const scout=unit(g,0,1730);g.build('watchtower',2000,450,1);refreshFog(g);scout.x=300;refreshFog(g);c.refreshPresentation();const memory=c.battleView().fog.memories;assert.equal(memory.length,1);
 const saved=encodeBattle(g),restored=decodeBattle(saved).game;c.start(restored);assert.deepEqual(c.battleView().fog.memories,memory);const camera=c.renderer.camera;c.renderer.camera=c.battleFront();c.renderer.clampCamera();assert.equal(camera,c.renderer.camera);assert.equal(c.fogAudio.seen.size,0);assert.equal(c.ui.selected,null);
 c.paused=true;c.viewportPause.clear();c.battleSession.status=()=> 'current';$('confirmRestart').onclick();assert.equal(c.game.ruleset.id,FOG_SKIRMISH_RULESET_ID);assert.equal(c.battleView().fog.memories.length,0);assert.equal(c.game.state.time,0);
 $('skirmishFog').checked=false;c.mode='skirmish';c.start();assert.equal(c.renderer,c.ordinaryRenderer);assert.equal(c.battleView(),c.game);assert.equal($('battle').attributes['aria-description'],undefined);
 $('skirmishFog').checked=true;c.start();assert.equal(c.renderer instanceof FogRenderer,true);assert.equal(c.renderer.vfx.particles.length,0);assert.equal(c.renderer.reducedMotion,true);
});
test('a live journal cannot reveal full information; completed report identifies fog context',()=>{
 const g=new Game({rulesetId:FOG_SKIRMISH_RULESET_ID,ai:false});const journal=createBattleJournal(g,{name:'Classic skirmish · Fog · post-battle full information'});assert.throws(()=>journal.finish(g));g.state.bases[1].hp=0;g.state.winner=0;const report=journal.finish(g);assert.match(report.rules.name,/Fog/);assert.match(report.context.name,/post-battle full information/);
});

test('fog setup cannot override unsupported or pending fullscreen availability',()=>{
 const {c,$}=harness();Object.assign(c,{fullscreenButtons:[],fullscreenStatuses:[],fullscreenPending:true,fullscreenFailure:'',fullscreenAppView:{matches:false},navigator:{standalone:false},fullscreenElement:()=>null,fullscreenAPI:()=>({enabled:false})});
 // Use actual fullscreen elements from the HTML, not map-option stand-ins.
 c.fullscreenButtons=c.document.querySelectorAll('[data-fullscreen]');assert.ok(c.fullscreenButtons.length);
 runInContext(section('function syncFullscreenControls()','function fullscreenFailed('),c);
 c.syncFullscreenControls();for(const b of c.fullscreenButtons){assert.equal(b.disabled,true);assert.equal(b.attributes['aria-disabled'],'true');}
 c.fullscreenAPI=()=>({enabled:true});c.syncFullscreenControls();for(const b of c.fullscreenButtons){assert.equal(b.disabled,false);assert.equal(b.attributes['aria-disabled'],'true');}
 c.fullscreenPending=false;c.syncFullscreenControls();for(const b of c.fullscreenButtons)assert.equal(b.attributes['aria-disabled'],'false');
});
test('actual frame follow cannot move ended ordinary, fog, or authored-objective battles',()=>{
 const code=section('  refreshPresentation();\n  if (follow','  updateAudio();');
 for(const [fog,winner,outcome]of [[false,0,null],[true,1,null],[false,null,{completed:true}],[false,null,{failed:true}]]) {
  const {c}=harness({fog});c.started=true;c.paused=false;c.coachingHold=false;c.follow=true;c.dt=.1;c.objectiveOutcome=outcome;c.game.state.winner=winner;c.renderer.camera=800;
  runInContext(code,c);assert.equal(c.renderer.camera,800);
 }
 const {c}=harness();c.started=true;c.follow=true;c.dt=.1;c.renderer.camera=800;runInContext(code,c);assert.notEqual(c.renderer.camera,800);
});
test('actual upgrade and sale obey pause, refresh observation and avoid duplicate fog command audio',()=>{
 const h=harness(),{c,$}=h,g=h.start();c.ui.build='barracks';c.activateBattlePoint({x:550,y:450});const b=g.state.buildings.find(b=>b.type==='barracks'&&b.side===0);c.ui.selected=b.id;
 runInContext(section("$('upgrade').onclick =",'let closeSelectionArmed ='),c);
 c.paused=true;const held=g.serialize();$('upgrade').onclick();$('sell').onclick();assert.deepEqual(g.serialize(),held);
 c.paused=false;g.state.gold[0]=500;c.refreshPresentation();const cost=g.upgradeCost(b);$('upgrade').onclick();assert.equal(b.level,2);assert.equal(g.state.gold[0],500-cost);c.updateAudio();assert.equal(h.sounds.filter(s=>s.name==='upgrade').length,1);
 const gold=g.state.gold[0],refund=Math.floor(b.invested*.5*b.hp/b.maxHp);$('sell').onclick();assert.equal(g.state.gold[0],gold+refund);assert.equal(c.battleView().state.buildings.some(x=>x.id===b.id),false);
});

test('Help and Options close preserve pause after blur/hidden/page departure, but normal close still resumes',()=>{
 for(const fog of [false,true])for(const panel of ['help','settings'])for(const interrupted of [false,true]) {
  const h=harness({fog}),{c,$}=h;h.start();c.helpWasPaused=false;c.settingsWasPaused=false;c.invalidateImportRead=()=>{};
  runInContext(section('function hideHelp()',"$('help').onclick"),c);runInContext(section('function hideSettings()','function syncSettings()'),c);
  $(panel+'Modal').classList.remove('hidden');c.paused=true;
  if(interrupted)c.holdInterruptedDialogs();
  (panel==='help'?c.hideHelp:c.hideSettings)();assert.equal(c.paused,interrupted,`${fog}/${panel}/${interrupted}`);
 }
 // Prove each real interruption hook calls the durable latch, not only the helper.
 const h=harness(),{c}=h;h.start();const events=new Map();c.window.addEventListener=(name,fn)=>events.set(name,fn);c.document.addEventListener=(name,fn)=>events.set(name,fn);
 c.holdInterruptedDialogs=()=>{h.latched=(h.latched||0)+1;};c.audio.setScene=()=>{};c.last=0;c.performance={now:()=>0};c.document.hidden=true;
 runInContext(section("document.addEventListener('visibilitychange', () => {\n  if (document.hidden)","window.addEventListener('beforeunload'"),c);events.get('visibilitychange')();assert.equal(h.latched,1);
 runInContext(section("window.addEventListener('blur', () => {\n  holdInterruptedDialogs();","document.addEventListener('visibilitychange'"),c);events.get('blur')();assert.equal(h.latched,2);
 runInContext(section("window.addEventListener('pagehide',", "window.addEventListener('pageshow'"),c);events.get('pagehide')();assert.equal(h.latched,3);
});

test('one actual paused frame shares one detached observation across HUD, field/minimap and audio',()=>{
 const h=harness(),{c}=h;h.start();c.paused=true;let observed=0;const observe=c.observe;c.observe=(...args)=>{observed++;return observe(...args);};
 Object.assign(c,{last:0,lastProfileCheck:0,hudTimer:0,toastTimer:0,updateController(){},flushProtectedWarnings(){},sampleBattleReport(){},finish(){}});
 const seen=[];const draw=c.renderer.draw.bind(c.renderer);c.renderer.draw=(view,...args)=>{seen.push(view);return draw(view,...args);};
 const hud=c.observationHUD;c.observationHUD=view=>{seen.push(view);return hud(view);};const update=c.fogAudio.update.bind(c.fogAudio);c.fogAudio.update=(view,...args)=>{seen.push(view);return update(view,...args);};
 runInContext(section('function frame(now)','\nupdateHUD();\nrequestAnimationFrame(frame);'),c);c.frame(100);
 assert.equal(observed,1);assert.ok(seen.length>=3);assert.ok(seen.every(v=>v===seen[0]));assert.notEqual(seen[0],c.game);assert.equal(seen[0].state.bases[1].hp,null);
});
test('actual Resume, history and backup preview labels derive Fog from identity and preview does not write',async()=>{
 const h=harness(),{c,$}=h,g=h.start(),envelope=encodeBattle(g);let writes=0;
 Object.assign(c,{decodeBattle,storage:{get:()=>JSON.stringify(envelope),set(){writes++;}},downloadBackup(){},soundOn:false,
  updatePreferenceSaveStatus(){},updateHistorySaveStatus(){},knownHistory:[],knownHistoryAvailable:false,
  historySession:{read:()=>({ok:true,rows:[{identity:identityOf(g),won:true,time:12}]}),view:rows=>rows},
 });c.preferences.volume=.5;
 runInContext(section('function updateResume()','\nupdateResume();'),c);c.updateResume();assert.match($('resumeSaved').textContent,/FOG/);
 runInContext(section('function syncSettings()',"$('settings').onclick"),c);c.syncSettings();assert.match($('battleHistory').textContent,/Fog/);
 const domains={campaign:createCampaignProgress(),trials:{},settings:{},history:[],battle:envelope};
 const raw=createBackup({getItem:key=>{const domain=Object.keys(BACKUP_STORAGE_KEYS).find(d=>BACKUP_STORAGE_KEYS[d]===key);return domain?JSON.stringify(domains[domain]):null;}},{createdAt:'2026-11-08T00:00:00.000Z'});
 Object.assign(c,{parseBackup,MAX_BACKUP_BYTES,getCampaignOverview,importGeneration:0,pendingBackupText:null,backupWriteAttempted:false,updateRecoveryUI(){}});
 $('settingsModal').classList.remove('hidden');$('backupFile').files=[{size:raw.length,text:async()=>raw}];
 runInContext(section("$('backupFile').onchange =",'function finishProfileImport('),c);await $('backupFile').onchange();assert.match($('backupSummary').textContent,/Saved battle: Skirmish · Classic · Fog/);assert.equal(writes,0);
});

test('actual Pause memory disclosure preserves frozen details and focus, then clears on re-observation, terminal and ordinary reset',()=>{
 const h=harness(),{c,$}=h,g=h.start();g.state.gold[1]=1000;assert.equal(g.build('watchtower',2090,450,1).ok,true);const scout=unit(g,0,2090);g.state.time=125;refreshFog(g);scout.x=300;refreshFog(g);present(h);
 assert.equal($('pauseFogDetails').classList.contains('hidden'),false);assert.equal($('fogMemoryHint').classList.contains('hidden'),false);assert.equal($('mapDefaultNote').classList.contains('hidden'),true);assert.equal($('pause').attributes['aria-describedby'],'fogMemoryHint');
 const entry=$('pauseFogList').children[0];assert.match(entry.textContent,/Watchtower, level 1, at 2:05/);assert.match(entry.textContent,/Road 2, position 2090/);assert.match(entry.textContent,/health and production unknown/);assert.equal(entry.attributes.tabindex,'0');entry.focus();$('pauseFogDetails').open=true;
 const serialized=g.serialize();for(let i=0;i<5;i++)c.updateHUD();assert.equal($('pauseFogList').children[0],entry);assert.equal(c.document.activeElement,entry);assert.equal($('pauseFogDetails').open,true);assert.deepEqual(g.serialize(),serialized);
 const building=g.state.buildings.find(b=>b.x===2090);building.hp=1;building.level=3;building.progress=.99;g.state.buildings=g.state.buildings.filter(b=>b!==building);refreshFog(g);present(h);assert.equal($('pauseFogList').children[0],entry);assert.doesNotMatch(entry.textContent,/level 3|sold/);
 scout.x=2090;refreshFog(g);present(h);assert.equal($('pauseFogList').children.length,0);assert.equal($('pauseFogDetails').open,false);assert.equal($('pauseFogDetails').classList.contains('hidden'),true);assert.equal($('fogMemoryHint').classList.contains('hidden'),true);
 // Restore the genuine remembered observation and reveal only at terminal state.
 const restored=Game.restore(serialized);c.start(restored);present(h);assert.ok($('pauseFogList').children.length);$('pauseFogSummary').focus();c.paused=true;restored.state.winner=0;refreshFog(restored);present(h);assert.equal($('pauseFogList').children.length,0);assert.equal(c.document.activeElement,$('resume'));assert.equal($('pause').attributes['aria-describedby'],undefined);
 c.start(new Game({rulesetId:'frontier-citadel-open',ai:false}));present(h);assert.equal($('mapDefaultNote').classList.contains('hidden'),false);assert.equal($('pauseFogDetails').classList.contains('hidden'),true);
});
test('Regeneration full-health toast is neutral and does not change purchase or recovery mechanics',()=>{
 const h=harness(),{c,$}=h,g=h.start();const notices=[];c.toast=text=>notices.push(text);c.paused=true;$('citadelModal').classList.remove('hidden');c.updateCitadelUI();const before=g.serialize();c.purchaseCitadelOption('regen');
 assert.equal(g.state.gold[0],before.state.gold[0]-190);assert.equal(g.state.bases[0].hp,before.state.bases[0].hp);assert.match($('citadelPurchaseStatus').textContent,/Regeneration chosen/);assert.match($('citadelPlayerStatus').textContent,/waiting.*0 HP restored/);
 c.paused=false;c.updateCitadelUI();assert.ok(notices.includes('Citadel at full health.'));assert.equal(notices.some(t=>/repaired/i.test(t)),false);assert.equal(g.state.citadelOptions.sides[0].healedTotal,0);
});
test('shared guide distinguishes timed decay from open endgame without changing rules',()=>{
 const html=readFileSync(new URL('../dist/index.html',import.meta.url),'utf8'),copy=html.match(/<div class="guide-tip">([\s\S]*?)<\/div>/)[1].replace(/<[^>]+>/g,'').replace(/\s+/g,' ');
 assert.match(copy,/Only in timed endgame, both citadels begin to crumble after 7 minutes/);assert.match(copy,/Open endgame has no timed citadel decay/);
 const open=new Game({rulesetId:FOG_SKIRMISH_RULESET_ID}),timed=new Game({rulesetId:'frontier-citadel-timed'});assert.equal(open.ruleset.endgame.forcedDecay,false);assert.equal(open.ruleset.endgame.decayAt,null);assert.equal(timed.ruleset.endgame.forcedDecay,true);assert.equal(timed.ruleset.endgame.decayAt,420);
});

test('enemy citadel prose is actionable, clearly stale when remembered, and never reads hidden option counters',()=>{
 const h=harness(),{c}=h,g=h.start();const hidden=c.battleView();
 hidden.state.citadelOptions.sides[1]=new Proxy({}, {get(){throw Error('Hidden options must not be consulted');}});
 assert.equal(observedEnemyCitadelText(hidden),'Scout the enemy citadel to see its health and upgrade.');
 hidden.fog.rememberedCitadel={choice:'arrows',observedAt:125};assert.equal(observedEnemyCitadelText(hidden),'Scout the enemy citadel for its current health and upgrade (last seen: Extra Arrow).');
 const scout=unit(g,0,2940);g.state.bases[1].hp=5400;g.state.citadelOptions.sides[1].choice='regen';refreshFog(g);c.refreshPresentation();assert.equal(observedEnemyCitadelText(c.battleView()),'The enemy citadel has 5400 / 6000 HP with the Regeneration upgrade.');
 scout.x=300;refreshFog(g);c.refreshPresentation();const text=observedEnemyCitadelText(c.battleView());assert.match(text,/last seen: Regeneration/);assert.doesNotMatch(text,/5400|6000|timer|counter|purchase|recovery|waiting/);
});
