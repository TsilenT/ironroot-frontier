import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { CAMPAIGN_MISSIONS, createCampaignMission, getCampaignTargets } from '../dist/campaign.js';
import { createProtectedObjectiveMonitor, protectedLossDetails } from '../dist/protected-objectives.js';
import { createObjectiveAlertPolicy } from '../dist/objective-alerts.js';
import { BUILDINGS, SPELL } from '../dist/engine.js';
import { campaignBuildChoices } from '../dist/campaign-flow.js';
import { nativeSpaceTarget } from '../dist/persistence.js';
import { visibleViewportRect, fitMobileViewport } from '../dist/mobile-battlefield.js';
import { createInputScopeGuard } from '../dist/input-scope.js';
const app = readFileSync(new URL('../dist/app.js', import.meta.url), 'utf8');
const html = readFileSync(new URL('../dist/index.html', import.meta.url), 'utf8');
const css = readFileSync(new URL('../dist/styles.css', import.meta.url), 'utf8');
const source = app.slice(app.indexOf('function beginProtectedObjectives()'), app.indexOf('function beginBattleReport('));
class Element {
  constructor(tag = 'div') {
    this.tagName = tag.toUpperCase(); this.children = []; this.attributes = {}; this.listeners = {}; this.dataset = {}; this.style = {};
    this.text = ''; this.disabled = false; this.classes = new Set(); this.parentNode = null;
    this.classList = {contains:name=>this.classes.has(name), add:name=>this.classes.add(name), remove:name=>this.classes.delete(name), toggle:(name,on)=>{if(on)this.classes.add(name);else this.classes.delete(name);}};
  }
  set textContent(value) { this.text = value; this.children = []; }
  get textContent() { return this.text; }
  setAttribute(name,value) { this.attributes[name] = value; }
  append(...children) { for(const child of children) {if(child.parentNode)child.parentNode.children=child.parentNode.children.filter(item=>item!==child);this.children.push(child);child.parentNode=this;} }
  insertBefore(child,next) { if(child.parentNode)child.parentNode.children=child.parentNode.children.filter(x=>x!==child);const index=this.children.indexOf(next);this.children.splice(index<0?this.children.length:index,0,child);child.parentNode=this; }
  get nextSibling() { const items=this.parentNode?.children||[];return items[items.indexOf(this)+1]||null; }
  addEventListener(name, callback) { this.listeners[name] = callback; }
  closest(selector) { if(selector==='[data-protected-id]')return this.dataset.protectedId?this:this.parentNode?.closest(selector); if(selector==='[inert]')return this.inert?this:this.parentNode?.closest(selector); return null; }
  contains(element) { return this === element || this.children.some(child=>child.contains(element)); }
  focus() { throw Error('HUD updates must not move focus.'); }
}
function harness({mission='common-ground',landscape=false,compact=false,portrait=false}={}) {
  const elements = new Map(), documentListeners = {}, windowListeners = {};
  const $ = id => {if(!elements.has(id)){const el=new Element();el.id=id;elements.set(id,el);}return elements.get(id);};
  const state = {landscape,compact,portrait,scopeUpdates:0,layoutUpdates:0,canInteract:true,clamped:0,cancelled:0,reset:0,toasts:[],ui:{build:'mint',spell:true,selected:1},started:true};
  const dialogLayers = [new Element(),new Element()];
  for(const layer of dialogLayers)layer.classes.add('hidden');
  const context = {
    visibleViewportRect,fitMobileViewport,campaignBuildChoices,expandedBuilds:false,resumedBattle:true,coachEnabled:false,coachingHold:false,firstBuildHold:false,updateCampaignDeck(){},
    $,mobileLayout:'ordinary',interruptMobileInput(){},syncViewportSafety(){},ui:state.ui,game:createCampaignMission(mission),currentCampaign:mission,currentChallenge:null,createProtectedObjectiveMonitor,protectedLossDetails,
    protectedMonitor:null,protectedAlerts:null,createObjectiveAlertPolicy,started:true,objectiveOutcome:null,battleSession:{status:()=>state.stale?'stale':'owned'},sound:(name,options)=>{(state.sounds??=[]).push({name,options});},protectedControls:new Map(),armedProtectedControl:null,follow:true,dialogLayers,
    canInteract:()=>state.canInteract,updateSelection(){},
    cancel:()=>{state.cancelled++;state.ui={build:null,spell:false,selected:null};context.ui=state.ui;},
    syncInputScope:()=>state.scopeUpdates++,resetBattleGesture:()=>state.reset++, renderer:{camera:123,resize(){},clampCamera:()=>state.clamped++},
    toast:text=>state.toasts.push(text),positionToast:()=>state.layoutUpdates++,
    document:{createElement:tag=>new Element(tag),addEventListener:(name,callback,capture)=>{assert.equal(capture,true);documentListeners[name]=callback;}},
    window:{get innerWidth(){return state.portrait?320:state.landscape?844:1280;},get innerHeight(){return state.portrait?568:state.landscape?390:900;},addEventListener:(name,callback)=>windowListeners[name]=callback,matchMedia:query=>({matches:query.includes('orientation: portrait')?state.portrait:state.landscape})},
  };
  const api = runInNewContext(source+'\n({beginProtectedObjectives,updateProtectedObjectives,focusProtectedObjective,finishProtectedObjectives,flushProtectedWarnings,syncProtectedLayout,setCompactBuildOpen,updateCompactBuildControl})',context);
  api.beginProtectedObjectives();api.updateProtectedObjectives();
  const buttons=()=>[...context.protectedControls.values()].map(control=>control.button);
  const click=(button,event={})=>button.listeners.click({detail:0,...event});
  const pointerdown=(target,pointerId=7)=>documentListeners.pointerdown({target,pointerId,pointerType:'touch',button:0});
  return {context,api,$,state,buttons,click,pointerdown,documentListeners,windowListeners};
}

test('real app mounts stable focus controls, preserves HARD/PROTECT and moves the HUD only at battle start',()=>{
  const h=harness(), original=h.buttons();
  assert.equal(original.length,2);
  assert.equal(h.$('objectiveIdentity').textContent,'HARD · PROTECT');
  assert.equal(h.$('objectiveHUD').parentNode,h.$('protectedDock'));
  assert.deepEqual(original.map(button=>button.attributes['aria-label']),['Focus North gold mine','Focus South barracks']);
  const building=getCampaignTargets(h.context.game,'common-ground').find(target=>target.kind==='protect').building;
  building.hp=building.maxHp*.2;h.context.protectedMonitor.observe();h.api.updateProtectedObjectives();
  assert.deepEqual(h.buttons(),original);
  assert.equal(original[0].dataset.state,'critical');
  assert.match(h.context.protectedControls.get(building.id).health.textContent,/20% HP · Critical/);
  h.api.flushProtectedWarnings(1);
  assert.equal(h.$('protectedAlert').textContent,'Critical health: North gold mine (20% HP).');
  assert.equal(h.state.sounds.length,1);assert.equal(h.state.sounds[0].name,'warning');
  h.$('protectedAlert').textContent='sentinel';building.hp--;h.context.protectedMonitor.observe();h.api.updateProtectedObjectives();h.api.flushProtectedWarnings(10);
  assert.equal(h.state.sounds.length,1);
  assert.equal(h.$('protectedAlert').textContent,'sentinel','no repetitive alert for each damage tick');
});

test('fresh pointer press focuses the exact original target and cancels all spending gestures without stealing focus',()=>{
  const h=harness(), second=h.buttons()[1], before=JSON.stringify(h.context.game.serialize());
  h.pointerdown(second,17);h.click(second,{detail:1,pointerId:17});
  assert.equal(h.context.renderer.camera,690);
  assert.equal(h.state.cancelled,1);assert.equal(h.state.reset,1);assert.equal(h.state.clamped,1);
  assert.equal(h.context.follow,false);
  assert.deepEqual(h.state.ui,{build:null,spell:false,selected:null});
  assert.equal(h.state.toasts[0],'Showing South barracks.');
  assert.equal(JSON.stringify(h.context.game.serialize()),before,'camera focus cannot spend or alter combat');
  h.click(second,{detail:1,pointerId:17});assert.equal(h.state.cancelled,1,'same press cannot activate twice');
});

test('a held battlefield touch or different pointer cannot activate a target appearing under its release',()=>{
  const h=harness(), [first,second]=h.buttons();
  h.pointerdown(h.$('battle'),1);h.click(first,{detail:1,pointerId:1});assert.equal(h.state.cancelled,0);
  h.pointerdown(first,2);h.click(second,{detail:1,pointerId:2});assert.equal(h.state.cancelled,0);
  h.pointerdown(first,3);h.click(first,{detail:1,pointerId:4});assert.equal(h.state.cancelled,0);
  h.documentListeners.pointercancel();h.click(first,{detail:1,pointerId:3});assert.equal(h.state.cancelled,0);
  h.pointerdown(first,5);h.windowListeners.blur();h.click(first,{detail:1,pointerId:5});assert.equal(h.state.cancelled,0);
});

test('native keyboard/assistive clicks work and remain subject to existing held-key scope guards',()=>{
  const h=harness(),button=h.buttons()[0];
  h.click(button,{detail:0});assert.equal(h.context.renderer.camera,410);
  assert.equal(nativeSpaceTarget({closest:selector=>selector.includes('button')?button:null}),true);
  assert.match(app,/e\.code === 'Space' && !nativeSpaceTarget\(e\.target\)/);
  assert.match(app,/guardInput\(event, \(\) => inputScope\.keyDown\(event\)\)/);
  assert.match(app,/guardInput\(event, \(\) => inputScope\.keyUp\(event\)\)/);
  assert.match(app,/guardInput\(event, \(\) => inputScope\.click\(event\)\)/);
});

test('pause/end/profile guards and visible dialogs reject target focus even before disabled state catches up',()=>{
  for(const block of [h=>h.state.canInteract=false,h=>h.context.dialogLayers[0].classes.delete('hidden'),h=>h.$('objectiveHUD').inert=true]){
    const h=harness();block(h);h.click(h.buttons()[0]);assert.equal(h.state.cancelled,0);
    h.api.updateProtectedObjectives();assert.ok(h.buttons().every(button=>button.disabled));
  }
});

test('original loss cannot focus a replacement and result clarity names both lost originals',()=>{
  const h=harness();
  for(const target of getCampaignTargets(h.context.game,'common-ground').filter(target=>target.kind==='protect'))target.building.hp=0;
  h.api.focusProtectedObjective(Number(h.buttons()[0].dataset.protectedId));assert.equal(h.state.cancelled,0);
  h.api.updateProtectedObjectives();assert.ok(h.buttons().every(button=>button.disabled));
  h.api.finishProtectedObjectives();
  assert.equal(h.$('resultProtectedLoss').children.length,2);
  assert.match(h.$('resultProtectedLoss').children[0].textContent,/North gold mine/);
  assert.match(h.$('resultProtectedLoss').children[1].textContent,/South barracks/);
  assert.equal(h.$('resultProtectedLoss').classList.contains('hidden'),false);
});

test('changing to a mission without protect targets removes the dock and stale loss text',()=>{
  const h=harness(), mission=CAMPAIGN_MISSIONS.find(mission=>mission.protectedTargets.length===0);
  h.context.currentCampaign=mission.id;
  h.context.game=createCampaignMission(mission.id);
  h.api.beginProtectedObjectives();
  assert.equal(h.buttons().length,0);assert.equal(h.$('protectedDock').classList.contains('hidden'),true);
  assert.equal(h.$('objectiveHUD').parentNode,h.$('battlefield'));
  assert.equal(h.$('resultProtectedLoss').textContent,'');
  assert.equal(h.$('protectedAlert').textContent,'');
});

test('semantic HTML and responsive CSS reserve a real dock without reducing build-button targets',()=>{
  assert.match(html,/<div id="protectedDock" class="protected-dock hidden"><\/div>\s*<nav[^>]+id="protectedNavigation"[^>]*><\/nav>\s*<section class="command-deck"[^>]*>/);
  assert.match(html,/id="protectedTargets"[^>]+role="group"/);
  assert.match(html,/id="protectedAlert"[^>]+role="status"[^>]+aria-live="polite"/);
  assert.match(html,/id="resultProtectedLoss"[^>]+aria-label="Protected structure losses"/);
  assert.match(css,/\.protected-target \{[\s\S]*?min-height: 44px;[\s\S]*?min-width: 44px;/);
  assert.match(css,/\.protected-dock \.objective-hud\.protect-hud \{[\s\S]*?position: static;/);
  assert.match(css,/\.objective-hud \.protected-name \{[\s\S]*?font-size: 12px;/);
  const added=css.slice(css.indexOf('/* The protected-objective dock'),css.indexOf('/* A protected landscape battle'));
  assert.doesNotMatch(added,/\.build-card\s*\{|\.command-deck\s*\{|\.battlefield\s*\{|\.app\s*\{/);
  assert.match(app,/const snapshot = protectedMonitor\?\.observe\(g\);\s*if \(snapshot\) protectedAlerts\?\.observe\(snapshot,\{battleKey:protectedMonitor\}\);\s*return currentCampaign/);
  assert.match(app,/finishProtectedObjectives\(\);\s*\$\('resultTime'\)/);
  assert.match(readFileSync(new URL('../dist/service-worker.js',import.meta.url),'utf8'),/'\.\/protected-objectives\.js'/);
});

test('already-missing app state names the original and explicitly marks historical loss time unknown',()=>{
  const h=harness(), target=getCampaignTargets(h.context.game,'common-ground').find(target=>target.kind==='protect');
  h.context.game.state.time=77.15;h.context.game.tick=1543;
  h.context.game.state.buildings=h.context.game.state.buildings.filter(building=>building.id!==target.originalId);
  h.api.beginProtectedObjectives();h.api.finishProtectedObjectives();
  assert.equal(h.$('resultProtectedLoss').children.length,1);
  assert.match(h.$('resultProtectedLoss').children[0].textContent,/North gold mine: original structure missing when this view began at 01:17\.15\. Loss time unknown/);
});

test('portrait protected battles declare a two-row 44px toolbelt without shrinking controls',()=>{
  assert.match(css,/@media \(max-width: 700px\) and \(orientation: portrait\)[\s\S]*?\.battlefield\.protected-battle \.toolbelt \{[\s\S]*?grid-template-columns: repeat\(2, 44px\);/);
  assert.match(app,/\$\('battlefield'\)\.classList\.toggle\('protected-battle', !!targets\.length\)/);
});


test('retry creates fresh controls and clears prior loss, critical alerts and armed presses',()=>{
  const h=harness(),old=h.buttons()[0];
  getCampaignTargets(h.context.game,'common-ground').find(target=>target.kind==='protect').building.hp=0;
  h.context.protectedMonitor.observe();h.api.updateProtectedObjectives();h.api.finishProtectedObjectives();
  h.pointerdown(old,19);
  h.context.game=createCampaignMission('common-ground');
  h.api.beginProtectedObjectives();h.api.updateProtectedObjectives();
  assert.notEqual(h.buttons()[0],old);
  assert.equal(h.context.armedProtectedControl,null);
  assert.equal(h.$('resultProtectedLoss').textContent,'');
  assert.equal(h.$('resultProtectedLoss').classList.contains('hidden'),true);
  assert.equal(h.$('protectedAlert').textContent,'');
  assert.ok(h.buttons().every(button=>button.dataset.state==='healthy'&&!button.disabled));
  h.click(h.buttons()[0],{detail:1,pointerId:19});assert.equal(h.state.cancelled,0);
});

test('switching from protected campaign to skirmish removes every stale target and identity',()=>{
  const h=harness();h.context.currentCampaign=null;
  h.api.beginProtectedObjectives();h.api.updateProtectedObjectives();h.api.finishProtectedObjectives();
  assert.equal(h.context.protectedMonitor,null);
  assert.equal(h.buttons().length,0);
  assert.equal(h.$('protectedDock').classList.contains('hidden'),true);
  assert.equal(h.$('objectiveIdentity').textContent,'');
  assert.equal(h.$('objectiveHUD').parentNode,h.$('battlefield'));
  assert.equal(h.$('resultProtectedLoss').classList.contains('hidden'),true);
});

test('real scope guard blocks a protected press spanning pause, modal or result and permits the next fresh press',()=>{
  for(const scope of ['paused','settings','result']){
    const h=harness(),button=h.buttons()[0],guard=createInputScopeGuard('battle');
    const pointer={pointerId:41,pointerType:'touch',isPrimary:true};
    const event={...pointer,detail:1,isTrusted:true};
    const dispatch=()=>{if(!guard.click(event))h.click(button,event);};
    guard.pointerDown(pointer);h.pointerdown(button,pointer.pointerId);
    guard.setScope(scope);assert.equal(guard.pointerEnd(pointer),true);
    guard.setScope('battle');dispatch();assert.equal(h.state.cancelled,0);
    guard.pointerDown(pointer);h.pointerdown(button,pointer.pointerId);
    assert.equal(guard.pointerEnd(pointer),false);dispatch();assert.equal(h.state.cancelled,1);
  }
});

test('real held Space guard preserves native activation only for a fresh press in the current scope',()=>{
  const h=harness(),button=h.buttons()[0],guard=createInputScopeGuard('battle');
  const key={code:'Space',target:button,repeat:false};
  assert.equal(guard.keyDown(key),false);guard.setScope('settings');guard.setScope('battle');
  const staleRelease=guard.keyUp(key);assert.equal(staleRelease,true);
  if(!staleRelease)h.click(button);assert.equal(h.state.cancelled,0);
  assert.equal(guard.keyDown(key),false);assert.equal(guard.keyUp(key),false);
  h.click(button);assert.equal(h.state.cancelled,1);
});


test('short landscape moves the existing citadel HUD into the header without cloning HP or rebuilding focus controls',()=>{
  const h=harness({landscape:true}),hud=h.$('battleTop'),buttons=h.buttons();
  assert.equal(hud.parentNode,h.$('topbar'));
  assert.equal(h.$('app').classList.contains('protected-landscape'),true);
  h.state.landscape=false;h.windowListeners.resize();
  assert.equal(hud.parentNode,h.$('battlefield'));
  assert.equal(h.$('app').classList.contains('protected-landscape'),false);
  assert.deepEqual(h.buttons(),buttons);
  h.state.landscape=true;h.windowListeners.resize();
  assert.equal(hud.parentNode,h.$('topbar'));assert.deepEqual(h.buttons(),buttons);
  assert.equal(h.$('topbar').children.filter(node=>node===hud).length,1);
  assert.equal(h.state.layoutUpdates,3);
});

test('leaving a protected battle for skirmish keeps the same mobile shell without stale HP targets',()=>{
  const h=harness({landscape:true});h.context.currentCampaign=null;h.api.beginProtectedObjectives();
  assert.equal(h.$('app').classList.contains('protected-landscape'),true);
  assert.equal(h.$('app').classList.contains('mobile-ordinary'),true);
  assert.equal(h.$('battleTop').parentNode,h.$('topbar'));
  assert.equal(h.$('protectedDock').classList.contains('hidden'),false);
  assert.equal(h.$('objectiveIdentity').textContent,'HARD · SKIRMISH');
  assert.equal(h.buttons().length,0);
});

test('shared mobile grid reserves world, navigation and dock with no renderer scaling',()=>{
  const added=css.slice(css.indexOf('/* One protected mobile battlefield'));
  assert.match(added,/grid-template-columns: minmax\(0, 1fr\) var\(--mobile-rail\)/);
  assert.match(added,/\.protected-mobile \.battlefield \{[^}]*grid-column: 1; grid-row: 2; display: block;/);
  assert.match(added,/--mobile-header: 72px/);assert.match(added,/--mobile-dock: 84px/);assert.match(added,/--mobile-navigation: 96px/);
  assert.doesNotMatch(added,/transform: scale/);
  assert.equal((html.match(/id="yourHpText"/g)||[]).length,1);
  assert.equal((html.match(/id="enemyHpText"/g)||[]).length,1);
});

test('focus direction mark is CSS-drawn even when critical portrait hides the word Focus',()=>{
  const h=harness(),button=h.buttons()[0],hint=button.children.at(-1);
  assert.equal(hint.textContent,'Focus');
  assert.equal(hint.children[0].className,'protected-focus-icon');
  assert.equal(hint.attributes['aria-hidden'],'true');
  assert.equal(button.attributes['aria-label'],'Focus North gold mine');
  assert.match(css,/\.protected-focus-icon::before \{[^}]*border-top: 2px solid currentColor;[^}]*border-right: 2px solid currentColor;/);
  assert.match(css,/\.protected-focus-icon::after \{[^}]*transform: rotate\(-45deg\)/);
  assert.doesNotMatch(source,/Focus ↗/);
  assert.doesNotMatch(css,/content: '↗'/);
});


test('very short landscape exposes explicit build controls and closes them when focusing an original',()=>{
  const h=harness({landscape:true,compact:true}),buttons=h.buttons();
  h.context.ui.build=null;h.context.ui.spell=false;h.api.updateCompactBuildControl();
  assert.equal(h.$('app').classList.contains('protected-compact'),true);
  assert.equal(h.$('compactBuild').textContent,'Build');
  h.$('compactBuild').onclick();
  assert.equal(h.$('app').classList.contains('compact-build-open'),true);
  assert.equal(h.$('compactBuild').attributes['aria-expanded'],'true');
  assert.equal(h.$('compactBuild').textContent,'Close');
  h.api.focusProtectedObjective(Number(buttons[0].dataset.protectedId));
  assert.equal(h.$('app').classList.contains('compact-build-open'),false);
  assert.equal(h.$('compactBuild').attributes['aria-expanded'],'false');
  assert.deepEqual(h.buttons(),buttons);
  assert.equal(h.context.renderer.camera,410);
});

test('drawer closure returns keyboard focus only when it would otherwise hide the active build control',()=>{
  const h=harness({landscape:true,compact:true}),card=new Element('button');
  h.$('commandDeck').append(card);let focused=0;
  h.$('compactBuild').focus=()=>focused++;
  h.api.setCompactBuildOpen(true);h.context.document.activeElement=card;
  h.api.setCompactBuildOpen(false);assert.equal(focused,1);
  h.api.setCompactBuildOpen(true);h.context.document.activeElement=h.buttons()[0];
  h.api.setCompactBuildOpen(false);assert.equal(focused,1,'protected target focus must remain on that target');
});

test('rotation to portrait closes the shared drawer without rebuilding protected controls',()=>{
  const h=harness({landscape:true,compact:true}),buttons=h.buttons();h.api.setCompactBuildOpen(true);
  h.state.landscape=false;h.state.portrait=true;h.windowListeners.resize();
  assert.equal(h.$('app').classList.contains('protected-compact'),true);
  assert.equal(h.$('app').classList.contains('protected-portrait'),true);
  assert.equal(h.$('app').classList.contains('compact-build-open'),false);
  assert.equal(h.$('app').classList.contains('protected-landscape'),false);
  assert.equal(h.$('compactBuild').parentNode,h.$('protectedNavigation'));
  assert.deepEqual(h.buttons(),buttons);
});

test('drawer transitions use a distinct held-input scope and reject battlefield spending until closed',()=>{
  assert.match(app,/classList\.contains\('compact-build-open'\) \? 'compact-build'/);
  assert.match(app,/classList\.contains\('protected-compact'\) \? `compact-battle:\$\{mobileLayout\}`/);
  assert.match(app,/function activateBattlePoint\(w, \{ repeatBuild = false \} = \{\}\) \{\s*if \(!canInteract\(\) \|\| \$\('app'\)\.classList\.contains\('compact-build-open'\)\) return;/);
  const guard=createInputScopeGuard('compact-battle'),pointer={pointerId:71,pointerType:'touch',isPrimary:true};
  guard.pointerDown(pointer);guard.setScope('compact-build');guard.setScope('compact-battle');
  assert.equal(guard.pointerEnd(pointer),true);
  assert.equal(guard.click({...pointer,detail:1,isTrusted:true}),true);
  guard.pointerDown(pointer);assert.equal(guard.pointerEnd(pointer),false);
  assert.equal(guard.click({...pointer,detail:1,isTrusted:true}),false);
});


test('actual build/rally selection closes the drawer without spending and Cancel restores the battle-first control',()=>{
  const h=harness({landscape:true,compact:true});
  Object.assign(h.context,{BUILDINGS,SPELL,sound(){},updateSelection(){},syncChoice:()=>h.api.updateCompactBuildControl()});
  const choose=app.slice(app.indexOf('function selectBuild('),app.indexOf('function syncChoice('));
  const rally=app.slice(app.indexOf("$('rally').onclick"),app.indexOf('function pauseControl('));
  const point=app.slice(app.indexOf('function activateBattlePoint('),app.indexOf('function resetBattleGesture('));
  const api=runInNewContext(choose+'\n'+rally+'\n'+point+'\n({selectBuild,cancel,activateBattlePoint})',h.context);
  api.cancel();const before=JSON.stringify(h.context.game.serialize());
  h.api.setCompactBuildOpen(true);api.selectBuild('barracks');
  assert.equal(h.$('app').classList.contains('compact-build-open'),false);
  assert.equal(h.context.ui.build,'barracks');assert.equal(h.$('compactBuild').textContent,'Cancel');
  h.$('compactBuild').onclick();assert.equal(h.context.ui.build,null);assert.equal(h.$('compactBuild').textContent,'Build');
  h.api.setCompactBuildOpen(true);h.$('rally').onclick();
  assert.equal(h.$('app').classList.contains('compact-build-open'),false);assert.equal(h.context.ui.spell,true);
  api.cancel();h.api.setCompactBuildOpen(true);h.context.ui.build='barracks';
  api.activateBattlePoint({x:270,y:260});
  assert.equal(JSON.stringify(h.context.game.serialize()),before,'neither opening/choosing/cancelling nor a covered canvas activation spends');
  assert.match(app,/if \(value\) setCompactBuildOpen\(false\);\s*paused = value;/);
});


test('actual storage-conflict auto-pause closes the drawer before showing the pause veil',()=>{
  const h=harness({landscape:true,compact:true});
  Object.assign(h.context,{syncProfileSafety(){},PROFILE_MARKER_KEY:'profile',SAVE:'battle',recoveryHold:null,profileGate:null,
    started:true,paused:false,objectiveOutcome:null,battleSession:{isCurrent:()=>false},pauseControl(){}});
  h.$('pauseVeil').classList.add('hidden');h.api.setCompactBuildOpen(true);
  const registration=app.slice(app.indexOf("window.addEventListener('storage',"),app.indexOf('new ResizeObserver(() => { renderer.resize();'));
  runInNewContext(registration,h.context);h.windowListeners.storage({key:'battle'});
  assert.equal(h.context.paused,true);
  assert.equal(h.$('app').classList.contains('compact-build-open'),false);
  assert.equal(h.$('pauseVeil').classList.contains('hidden'),false);
  for(const occurrence of app.matchAll(/paused = true;/g))
    assert.match(app.slice(Math.max(0,occurrence.index-55),occurrence.index),/setCompactBuildOpen\(false\);\s*$/);
});

test('actual controller focus-toggle closes the drawer and returns from HUD to battlefield gameplay',()=>{
  const h=harness({landscape:true,compact:true});h.api.setCompactBuildOpen(true);
  let focused=null,resets=0;
  h.$('battle').focus=()=>focused='battle';
  Object.assign(h.context,{padHud:true,padActive:true,padPoint:{x:0,y:0},paused:false,
    moveCursor:point=>point,controller:{reset:()=>resets++}});
  h.context.document.hidden=false;h.context.document.hasFocus=()=>true;
  h.context.document.body={classList:{add(){}}};h.context.document.querySelector=()=>h.$('app');
  const scope=app.slice(app.indexOf('function controllerScope()'),app.indexOf('function padControls('));
  const handler=app.slice(app.indexOf('function handleControllerAction('),app.indexOf('const controller = new GamepadInput'));
  const api=runInNewContext(scope+'\n'+handler+'\n({controllerScope,handleControllerAction})',h.context);
  assert.equal(api.controllerScope().key,'hud');api.handleControllerAction({action:'focus'});
  assert.equal(h.context.padHud,false);assert.equal(h.$('app').classList.contains('compact-build-open'),false);
  assert.equal(focused,'battle');assert.equal(api.controllerScope().key,'battle');assert.equal(api.controllerScope().mode,'gameplay');
  assert.equal(resets,1);
});


test('portrait reuses navigation nodes and opens inspection intentionally, while the next Build returns to cards',()=>{
  const h=harness({portrait:true});
  assert.equal(h.$('battleTools').parentNode,h.$('protectedNavigation'));
  assert.equal(h.$('mapControls').parentNode,h.$('protectedNavigation'));
  assert.equal(h.$('compactBuild').nextSibling,h.$('battleTools'));
  assert.equal(h.$('selectionPanel').parentNode,h.$('commandDeck'));
  h.context.ui.build=null;h.context.ui.spell=false;h.context.ui.selected=null;
  Object.assign(h.context,{sound(){},requestAnimationFrame:callback=>callback()});
  const point=app.slice(app.indexOf('function activateBattlePoint('),app.indexOf('function resetBattleGesture('));
  const api=runInNewContext(point+'\n({activateBattlePoint})',h.context);
  const building=h.context.game.state.buildings.find(b=>b.side===0),before=JSON.stringify(h.context.game.serialize());
  api.activateBattlePoint({x:building.x,y:building.y});
  assert.equal(h.context.ui.selected,building.id);assert.equal(h.$('app').classList.contains('compact-build-open'),true);
  h.$('compactBuild').onclick();assert.equal(h.$('app').classList.contains('compact-build-open'),false);
  h.$('compactBuild').onclick();assert.equal(h.context.ui.selected,null);assert.equal(h.$('app').classList.contains('compact-build-open'),true);
  assert.equal(JSON.stringify(h.context.game.serialize()),before);
  h.state.portrait=false;h.windowListeners.resize();
  assert.equal(h.$('battleTools').parentNode,h.$('battlefield'));
  assert.equal(h.$('mapControls').parentNode,h.$('battlefield'));
  assert.equal(h.$('selectionPanel').parentNode,h.$('battlefield'));
});


test('warning delivery waits through pause, help and hidden-page state without stealing focus or paid-action toast',()=>{
  const h=harness(),target=getCampaignTargets(h.context.game,'common-ground').find(t=>t.kind==='protect').building;
  target.hp=target.maxHp*.2;h.context.protectedMonitor.observe();h.api.updateProtectedObjectives();
  const before=JSON.stringify(h.context.game.serialize()),toasts=[...h.state.toasts];
  h.state.canInteract=false;h.api.flushProtectedWarnings(1);assert.equal(h.state.sounds,undefined);
  h.state.canInteract=true;h.context.dialogLayers[0].classList.remove('hidden');h.api.flushProtectedWarnings(2);assert.equal(h.state.sounds,undefined);
  h.context.dialogLayers[0].classList.add('hidden');h.context.document.hidden=true;h.api.flushProtectedWarnings(3);assert.equal(h.state.sounds,undefined);
  h.context.document.hidden=false;h.api.flushProtectedWarnings(4);assert.equal(h.state.sounds.length,1);
  assert.match(h.$('protectedAlert').textContent,/North gold mine \(20% HP\)/);
  assert.deepEqual(h.state.toasts,toasts);assert.equal(JSON.stringify(h.context.game.serialize()),before);
  h.api.flushProtectedWarnings(100);assert.equal(h.state.sounds.length,1,'wall-clock elapsed alone is not another alert');
});
test('simultaneous critical originals share one warning and retain both accurate names',()=>{
  const h=harness();for(const t of getCampaignTargets(h.context.game,'common-ground').filter(t=>t.kind==='protect'))t.building.hp=t.building.maxHp*.25;
  h.context.protectedMonitor.observe();h.api.updateProtectedObjectives();h.api.flushProtectedWarnings(1);
  assert.equal(h.state.sounds.length,1);assert.match(h.$('protectedAlert').textContent,/North gold mine \(25% HP\)/);assert.match(h.$('protectedAlert').textContent,/South barracks \(25% HP\)/);
});
test('new current-page restored critical state warns once, without invented damage history',()=>{
  const h=harness(),target=getCampaignTargets(h.context.game,'common-ground').find(t=>t.kind==='protect').building;
  target.hp=target.maxHp*.1;h.api.beginProtectedObjectives();h.api.updateProtectedObjectives();
  h.api.flushProtectedWarnings(1);assert.equal(h.state.sounds.length,1);assert.match(h.$('protectedAlert').textContent,/Critical health:/);
  assert.doesNotMatch(h.$('protectedAlert').textContent,/attacked|enemy|since|ago/i);h.api.flushProtectedWarnings(10);assert.equal(h.state.sounds.length,1);
});
test('result and stale ownership discard pending warnings until a genuinely new battle monitor',()=>{
  for(const stop of [h=>h.context.objectiveOutcome={failed:true},h=>h.state.stale=true,h=>h.context.started=false]){
    const h=harness(),target=getCampaignTargets(h.context.game,'common-ground').find(t=>t.kind==='protect').building;
    target.hp=target.maxHp*.2;h.context.protectedMonitor.observe();stop(h);h.api.flushProtectedWarnings(1);assert.equal(h.state.sounds,undefined);
    h.context.objectiveOutcome=null;h.state.stale=false;h.context.started=true;h.api.flushProtectedWarnings(10);assert.equal(h.state.sounds,undefined);
    h.api.beginProtectedObjectives();h.api.flushProtectedWarnings(11);assert.equal(h.state.sounds.length,1);
  }
});
test('fixed-step observations precede objective evaluation and warning flush follows normal audio/HUD work',()=>{
  const frame=app.slice(app.indexOf('function frame(now)'),app.indexOf('\nupdateHUD();',app.indexOf('function frame(now)')));
  assert.ok(frame.indexOf('protectedAlerts?.observe')<frame.indexOf('evaluateCampaignMission(g'));
  assert.ok(frame.indexOf('flushProtectedWarnings(now / 1000)')>frame.indexOf('updateAudio();'));
  assert.ok(frame.indexOf('flushProtectedWarnings(now / 1000)')>frame.indexOf('updateHUD();'));
  assert.match(app,/function sound\(name, options\) \{\s*audio\.play\(name, options\);/);
});
