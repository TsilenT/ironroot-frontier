import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fitMobileViewport,insetViewportRect,visibleViewportRect,inspectMobileGeometry,MIN_PROTECTED_WORLD_HEIGHT} from '../dist/mobile-battlefield.js';
import {startupHarness} from './mobile-startup-fixture.mjs';
import {layout,box} from './mobile-layout-fixture.mjs';

const app=readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../dist/styles.css',import.meta.url),'utf8');
const html=readFileSync(new URL('../dist/index.html',import.meta.url),'utf8');
const rule=(source,selector)=>[...source.replace(/\/\*[\s\S]*?\*\//g,'').matchAll(/([^{}]+)\{([^{}]*)\}/g)].filter(m=>m[1].trim()===selector).map(m=>m[2]).join('\n');
const coachSelector='.protected-mobile.mobile-coaching .campaign-teaching > .campaign-coach';
const actionsSelector='.protected-mobile.mobile-coaching .campaign-teaching > .teaching-actions';

// Execute the actual app startup/layout/pause/HUD functions. Extend only this
// test's DOM rect provider with the source-derived mobile content grid; the
// existing shared fixture intentionally still selects tracks from outer height.
// This is arithmetic and DOM-state coverage, not a CSS engine or browser proof.
function contentHarness({width=320,height=568,insets={},source=app,styleSource=css}={}) {
 const h=startupHarness({width,height,source});
 const pinnedActions=/grid-column:\s*2;/.test(rule(styleSource,actionsSelector));
 h.log.mobileInterruptions=0;const interrupt=h.c.interruptMobileInput;
 h.c.interruptMobileInput=()=>{h.log.mobileInterruptions++;return interrupt();};
 const baseStyle=h.c.getComputedStyle;
 h.c.getComputedStyle=element=>({ ...baseStyle(element), ...Object.fromEntries(['Top','Right','Bottom','Left'].map(side=>[
  'padding'+side,`${h.$('app').classList.contains('protected-mobile') ? insets[side.toLowerCase()]||0 : 0}px`,
 ])) });
 const geometry=()=>{
  const root=h.$('app'),style=root.style,w=h.c.window.innerWidth,ht=h.c.window.innerHeight;
  const outer=box(parseFloat(style.left)||0,parseFloat(style.top)||0,style.width?parseFloat(style.width):w,style.height?parseFloat(style.height):ht);
  const content=insetViewportRect(outer,h.c.getComputedStyle(root));
  const g=layout(w,ht,{root:content,viewport:content,protect:!root.classList.contains('mobile-ordinary'),teaching:root.classList.contains('mobile-coaching'),collapsed:root.classList.contains('coach-collapsed'),hold:!h.$('coachResume').classList.contains('hidden')});
  // Reproduce the confirmed auto-placement defect when the explicit CSS cell
  // is removed: hidden hint text leaves actions in the first grid column.
  if(h.$('campaignCoach').classList.contains('hidden') && h.$('coachActions').parentNode===h.$('campaignTeaching') && !pinnedActions){
   const delta=g.nodes.toggleCoach.left-(g.nodes.campaignTeaching.left+6);
   for(const id of ['coachResume','toggleCoach']){g.nodes[id].left-=delta;g.nodes[id].right-=delta;}
  }
  return g;
 };
 const install=element=>{
  const original=element.getBoundingClientRect.bind(element);
  element.getBoundingClientRect=()=>{
   if(element.closest('.hidden'))return box(0,0,0,0);
   const g=geometry();
   return element.dataset.protectedId ? g.nodes['target'+element.parentNode.children.indexOf(element)] : g.nodes[element.id]||original();
  };
  return element;
 };
 for(const id of ['battle','topbar','protectedDock','protectedNavigation','campaignTeaching','campaignCoach','coachResume','toggleCoach','pause','speed','sound','settings','home','front','minimap','compactBuild'])install(h.$(id));
 const create=h.c.document.createElement;h.c.document.createElement=tag=>install(create(tag));
 const inspect=h.c.inspectMobileGeometry;
 h.c.inspectMobileGeometry=g=>{
  if(h.$('app').classList.contains('protected-portrait'))assert.equal(h.$('app').classList.contains('protected-short-portrait'),g.viewport.height<560,'real app selects tracks from effective content before inspection');
  return inspect(g);
 };
 return {...h,geometry,insets};
}

test('first inset phone launch and restore use 304x535 content and retain the 200x383 coached field',()=>{
 for(const restored of [false,true]){
  const h=contentHarness({insets:{top:12,bottom:21,left:8,right:8}});h.start(restored);
  assert.equal(h.$('app').classList.contains('protected-short-portrait'),true);
  assert.deepEqual(h.geometry().viewport,box(8,12,304,535));
  assert.equal(h.geometry().canvas.width,200);assert.equal(h.geometry().canvas.height,383);
  assert.equal(h.$('app').style.width,'320px');assert.equal(h.$('app').style.height,'568px');
  assert.equal(h.c.paused,false);assert.equal(h.c.viewportPause.active,false);
  assert.equal(h.c.game.state.time,0);assert.equal(MIN_PROTECTED_WORLD_HEIGHT,212);
 }
});

test('mobile shell padding is read on the first desktop-to-phone transition, not a later resize',()=>{
 const h=contentHarness({width:1180,height:757,insets:{top:12,bottom:21,left:8,right:8}});h.start(true);
 assert.equal(h.$('app').classList.contains('protected-mobile'),false);
 const before=h.c.game.serialize();h.resize(320,568);
 assert.equal(h.$('app').classList.contains('protected-short-portrait'),true);
 assert.equal(h.geometry().canvas.height,383);assert.equal(h.c.viewportPause.active,false);
 assert.deepEqual(h.c.game.serialize(),before);
 h.resize(1180,757);assert.equal(h.$('app').style.height,'');
 h.resize(320,568);assert.equal(h.c.viewportPause.active,false);
});

test('negative outer-height selection reproduces the inset startup classification defect',()=>{
 const old=app.replace('portrait && content.height < 560','portrait && viewport.height < 560');
 assert.notEqual(old,app);
 assert.throws(()=>contentHarness({source:old,insets:{top:12,bottom:21,left:8,right:8}}).start(true),/effective content/);
});

test('560px content boundary is exact, and visual zoom does not change outer fitting or orientation predicates',()=>{
 for(const [bottom,short] of [[0,false],[8,false],[8.001,true],[21,true]]){
  const h=contentHarness({insets:{bottom}});h.start(true);
  assert.equal(h.$('app').classList.contains('protected-short-portrait'),short);
 }
 const h=contentHarness({width:390,height:650,insets:{top:12,bottom:21}});
 h.c.window.visualViewport={offsetTop:10,offsetLeft:4,width:320,height:568,scale:2};h.start(true);
 assert.equal(h.$('app').classList.contains('protected-short-portrait'),true);
 assert.deepEqual(h.geometry().viewport,box(4,22,320,535));
 assert.equal(h.$('app').style.width,'320px');assert.equal(h.$('app').style.height,'568px');
 const desktop=contentHarness({width:701,height:800,insets:{bottom:500}});desktop.start(true);
 assert.equal(desktop.$('app').classList.contains('protected-mobile'),false,'unchanged 700px portrait predicate');
});

test('padding-only add, move and removal cancel held gestures once, then leave stable fresh input usable',()=>{
 for(const pointerType of ['mouse','touch','pen']){
  const h=contentHarness();h.start(true);
  const before=h.c.game.serialize();
  for(const next of [{top:12,bottom:21,left:8,right:8},{top:13,bottom:20,left:9,right:7},{top:0,bottom:0,left:0,right:0}]){
   const pointer={pointerId:61,pointerType,isPrimary:true},key={code:'Enter',target:h.$('compactBuild'),repeat:false};
   h.c.inputScope.pointerDown(pointer);h.c.inputScope.keyDown(key);h.c.armedProtectedControl={};h.c.closeSelectionArmed=true;
   const interruptions=h.log.mobileInterruptions;Object.assign(h.insets,next);h.c.syncViewportSafety();
   assert.equal(h.log.mobileInterruptions,interruptions+1,'one invalidation for a changed content rectangle');
   assert.equal(h.c.armedProtectedControl,null);assert.equal(h.c.closeSelectionArmed,false);
   assert.equal(h.c.inputScope.pointerEnd(pointer),true);assert.equal(h.c.inputScope.keyUp(key),true);
   assert.equal(h.c.viewportPause.active,false);assert.equal(h.c.paused,false);
   h.c.inputScope.pointerDown(pointer);h.c.inputScope.keyDown(key);const stable=h.log.interruptions;
   for(let i=0;i<120;i++)h.c.syncViewportSafety();
   assert.equal(h.log.interruptions,stable);assert.equal(h.c.inputScope.pointerEnd(pointer),false);assert.equal(h.c.inputScope.keyUp(key),false);
  }
  assert.deepEqual(h.c.game.serialize(),before);
 }
});

test('content signatures compare effective numeric bounds, preserve fractional fitting, and reset across desktop',()=>{
 const element={style:{}},viewport=visibleViewportRect(390,650,{offsetTop:1.11111111,offsetLeft:.33333333,width:389.33333333,height:599.22222222,scale:2});
 const padding={paddingTop:'12px',paddingBottom:'21px',paddingLeft:'8px',paddingRight:'8px'};
 assert.equal(fitMobileViewport(element,viewport,true,padding),true);
 const outer={...element.style};
 for(let i=0;i<120;i++)assert.equal(fitMobileViewport(element,{...viewport},true,{...padding,paddingTop:'12.000px'}),false);
 assert.equal(fitMobileViewport(element,viewport,true,{...padding,paddingTop:'13px',paddingBottom:'20px'}),true,'equal content height but changed origin invalidates');
 assert.deepEqual(element.style,outer,'content signature does not inset the fitted root twice');
 assert.equal(fitMobileViewport(element,viewport,false,padding),true);
 assert.equal(fitMobileViewport(element,viewport,false,{}),false);
 assert.equal(fitMobileViewport(element,viewport,true,padding),true);
});

test('manual pauses survive padding-only changes without gaining a screen-size latch or resuming themselves',()=>{
 const h=contentHarness();h.start(true);h.c.pause(true);h.c.updateHUD();
 const before=h.c.game.serialize(),saves=h.log.saves;
 for(const next of [{top:12,bottom:21,left:8,right:8},{top:0,bottom:0,left:0,right:0}]){
  Object.assign(h.insets,next);h.c.syncViewportSafety();h.c.updateHUD();
  assert.equal(h.c.paused,true);assert.equal(h.c.viewportPause.active,false);
 }
 assert.deepEqual(h.c.game.serialize(),before);assert.equal(h.log.saves,saves);
 h.c.pause(false,{explicit:true});h.c.updateHUD();h.c.syncViewportSafety();assert.equal(h.c.paused,false);
});

test('370px safety stays blocked across hidden-hint HUD cycles; 400px recovery still requires explicit Resume',()=>{
 const h=contentHarness({height:370});h.start(true);
 const before=h.c.game.serialize(),saves=h.log.saves;
 for(let cycle=0;cycle<3;cycle++){
  h.c.syncViewportSafety();h.c.updateHUD();h.c.syncViewportSafety();
  assert.equal(h.$('campaignCoach').classList.contains('hidden'),true);
  assert.equal(h.c.viewportPause.blocked,true);assert.equal(h.$('viewportResume').disabled,true);
  h.c.pause(false,{explicit:true});assert.equal(h.c.paused,true);
 }
 assert.equal(h.log.saves,saves);assert.deepEqual(h.c.game.serialize(),before);
 h.resize(320,400);assert.equal(h.c.viewportPause.blocked,false);assert.equal(h.c.viewportPause.active,true);assert.equal(h.c.paused,true);
 h.c.pause(false);assert.equal(h.c.paused,true);
 h.c.pause(false,{explicit:true});h.c.updateHUD();
 for(let i=0;i<3;i++){h.c.syncViewportSafety();h.c.updateHUD();assert.equal(h.c.viewportPause.active,false);assert.equal(h.c.paused,false);}
 assert.deepEqual(h.c.game.serialize(),before);
 h.resize(320,370);h.c.updateHUD();h.c.syncViewportSafety();assert.equal(h.c.viewportPause.blocked,true);
});

test('removing the pinned action cell reproduces false Ready once the hint becomes hidden',()=>{
 const old=css.replace(/\.protected-mobile\.mobile-coaching \.campaign-teaching > \.teaching-actions \{[^}]*\}/,'');assert.notEqual(old,css);
 const h=contentHarness({height:370,styleSource:old});h.start(true);assert.equal(h.c.viewportPause.blocked,true);
 h.c.updateHUD();h.c.syncViewportSafety();assert.equal(h.c.viewportPause.blocked,false,'negative model reproduces the old false recovery');
});

test('teaching pins are direct-child-only and viewport painting order matches logical dialog precedence',()=>{
 assert.match(rule(css,coachSelector),/grid-column:\s*1;\s*grid-row:\s*1;/);
 assert.match(rule(css,actionsSelector),/grid-column:\s*2;\s*grid-row:\s*1;/);
 assert.doesNotMatch(rule(css,'.protected-mobile.mobile-coaching .teaching-actions'),/grid-column|grid-row/,'reparented hidden-hint actions are unaffected');
 const z=selector=>Number(rule(css,selector).match(/z-index:\s*(\d+)/)[1]);
 assert.equal(z('.viewport-pause'),10);assert.equal(z('.pause-veil.modal-backdrop'),10);assert.equal(z('.modal-backdrop'),10);
 const layers=['coachingModal','pauseVeil','viewportModal','welcome','helpModal','settingsModal','resultModal','backupModal','restartModal'];
 assert.ok(z('#coachingModal')<z('.viewport-pause'));
 assert.ok(html.indexOf('id="pauseVeil"')<html.indexOf('id="viewportModal"'));
 for(const id of layers.slice(3))assert.ok(html.indexOf('id="viewportModal"')<html.indexOf(`id="${id}"`),id+' paints above viewport safety');
 const logical=app.slice(app.indexOf('const dialogLayers = ['),app.indexOf('let activeDialog = null;'));
 for(let i=1;i<layers.length;i++)assert.ok(logical.indexOf(`$('${layers[i-1]}')`)<logical.indexOf(`$('${layers[i]}')`));
});
