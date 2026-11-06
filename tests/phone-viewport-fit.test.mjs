import test from 'node:test';
import assert from 'node:assert/strict';
import {MIN_PROTECTED_WORLD_HEIGHT,fitMobileViewport,visibleViewportRect,inspectMobileGeometry} from '../dist/mobile-battlefield.js';
import {startupHarness} from './mobile-startup-fixture.mjs';
import {box,layout} from './mobile-layout-fixture.mjs';

const fittedRect=style=>box(...['left','top','width','height'].map(key=>parseFloat(style[key])));
const visuals=[
 {offsetLeft:0,offsetTop:0,width:390,height:600},
 {offsetLeft:0,offsetTop:1,width:390,height:649},
 {offsetLeft:0,offsetTop:10,width:390,height:600},
 {offsetLeft:.375,offsetTop:1.125,width:389.25,height:599.4375},
];

test('650px layout and shorter/offset/fractional visible viewports share exact fitted root and safety bounds',()=>{
 for(const visual of visuals){
  const h=startupHarness({width:390,height:650});h.c.window.visualViewport=visual;h.start();
  const viewport=visibleViewportRect(390,650,visual),g=h.geometry();
  assert.deepEqual(fittedRect(h.$('app').style),viewport);
  assert.deepEqual(inspectMobileGeometry({...g,viewport}),{safe:true,reason:''});
  assert.equal(h.c.paused,false);assert.equal(h.c.viewportPause.active,false);
  assert.equal(h.c.game.state.time,0,'fitting changes presentation only');
  for(const control of g.controls){assert.ok(control.width>=44&&control.height>=44);assert.ok(control.bottom<=viewport.bottom+.5);}
 }
});

test('negative fit mutation reproduces the original clipping and one-pixel-offset false holds',()=>{
 for(const visual of visuals.slice(0,3)){
  const h=startupHarness({width:390,height:650});h.c.fitMobileViewport=()=>false;
  h.c.window.visualViewport=visual;h.start();
  assert.equal(h.c.viewportPause.blocked,true);assert.equal(h.c.paused,true);
  assert.match(h.$('viewportReason').textContent,/outside the visible screen/);
 }
});

test('fractional CSS serialization cannot repeatedly interrupt a stable viewport',()=>{
 const stored={},writes=[];const style=new Proxy(stored,{set(object,key,value){writes.push(key);object[key]=value?`${Number.parseFloat(value).toFixed(3)}px`:'';return true;}}),element={style};
 const viewport=visibleViewportRect(390,650,{offsetLeft:.333333333,offsetTop:1.111111111,width:389.333333333,height:599.222222222});
 assert.equal(fitMobileViewport(element,viewport),true);assert.equal(writes.length,4);
 assert.notEqual(style.top,`${viewport.top}px`,'fixture models CSSStyleDeclaration normalization');
 for(let frame=0;frame<120;frame++)assert.equal(fitMobileViewport(element,{...viewport}),false);
 assert.equal(writes.length,4,'no repeat writes for two seconds of 60Hz checks');
 const changed={...viewport,top:2.111111111};assert.equal(fitMobileViewport(element,changed),true);
 assert.equal(writes.length,8);
 assert.equal(fitMobileViewport(element,changed,false),true);
 assert.deepEqual(stored,{left:'',top:'',width:'',height:''});
 assert.equal(fitMobileViewport(element,viewport,false),false);
 assert.equal(fitMobileViewport(element,viewport),true,'re-entering mobile reapplies bounds');
});

test('safe fitting invalidates held pointers and activation keys once, but leaves the next fresh gesture usable',()=>{
 for(const pointerType of ['mouse','touch','pen']){
  const h=startupHarness({width:390,height:650});h.start();
  const before=h.c.game.serialize(),pointer={pointerId:71,pointerType,isPrimary:true},key={code:'Enter',target:h.$('compactBuild'),repeat:false};
  h.c.inputScope.pointerDown(pointer);h.c.inputScope.keyDown(key);
  h.c.armedProtectedControl={};h.c.closeSelectionArmed=true;const interruptions=h.log.interruptions;
  h.c.window.visualViewport={offsetTop:1.125,offsetLeft:.375,width:389.25,height:599.4375};h.c.syncViewportSafety();
  assert.ok(h.log.interruptions>interruptions);assert.equal(h.c.armedProtectedControl,null);assert.equal(h.c.closeSelectionArmed,false);
  assert.equal(h.c.inputScope.pointerEnd(pointer),true);assert.equal(h.c.inputScope.click({...pointer,detail:1,isTrusted:true}),true);assert.equal(h.c.inputScope.keyUp(key),true);
  assert.equal(h.c.viewportPause.active,false);assert.equal(h.c.paused,false);assert.deepEqual(h.c.game.serialize(),before);
  h.c.inputScope.pointerDown(pointer);h.c.inputScope.keyDown(key);const stable=h.log.interruptions;
  for(let frame=0;frame<120;frame++)h.c.syncViewportSafety();
  assert.equal(h.log.interruptions,stable);assert.equal(h.c.inputScope.pointerEnd(pointer),false);assert.equal(h.c.inputScope.click({...pointer,detail:1,isTrusted:true}),false);assert.equal(h.c.inputScope.keyUp(key),false);
 }
});

test('pinch-sized or genuinely tiny visible viewports keep the unchanged world and 44px control guard',()=>{
 assert.equal(MIN_PROTECTED_WORLD_HEIGHT,212);
 for(const visual of [{width:200,height:300,offsetLeft:90,offsetTop:200,scale:2},{width:390,height:390,offsetLeft:0,offsetTop:0,scale:1}]){
  const h=startupHarness({width:390,height:650});h.c.window.visualViewport=visual;h.start();
  assert.deepEqual(fittedRect(h.$('app').style),visibleViewportRect(390,650,visual),'zoom is never inverse-scaled');
  assert.equal(h.c.paused,true);assert.equal(h.c.viewportPause.blocked,true);
  const before=h.c.game.serialize();h.c.window.visualViewport={width:390,height:600,offsetTop:1};h.c.syncProtectedLayout();h.c.syncViewportSafety();
  assert.equal(h.c.viewportPause.blocked,false);assert.equal(h.c.paused,true,'recovery never restarts automatically');
  assert.deepEqual(h.c.game.serialize(),before);h.c.pause(false,{explicit:true});assert.equal(h.c.paused,false);
 }
});

test('safe-area padding remains inside the fitted root, including shifted visual viewport and sidebar',()=>{
 for(const [width,height,visual,insets]of [
  [390,650,{offsetLeft:2,offsetTop:10,width:386,height:600},{top:20,bottom:34,left:4,right:4}],
  [740,320,{offsetLeft:1,offsetTop:1,width:738,height:318},{top:10,bottom:21,left:44,right:44}],
  [320,480,{offsetLeft:0,offsetTop:1,width:320,height:479},{bottom:34}],
 ]){
  const h=startupHarness({width,height,insets});h.c.window.visualViewport=visual;h.start();
  const viewport=visibleViewportRect(width,height,visual),g=h.geometry();assert.equal(h.c.viewportPause.active,false);
  assert.deepEqual(inspectMobileGeometry({...g,viewport}),{safe:true,reason:''});
  for(const r of [g.canvas,...g.regions,...g.controls]){
   assert.ok(r.left>=viewport.left+(insets.left||0)-.5);assert.ok(r.right<=viewport.right-(insets.right||0)+.5);
   assert.ok(r.top>=viewport.top+(insets.top||0)-.5);assert.ok(r.bottom<=viewport.bottom-(insets.bottom||0)+.5);
  }
 }
 // Narrower than the authored controls or below safe grid height stays blocked.
 assert.equal(inspectMobileGeometry(layout(320,430,{bottom:34})).safe,false);
 assert.equal(inspectMobileGeometry(layout(568,300,{left:100,right:100})).safe,false);
});

test('switching back to desktop removes mobile inline fit and re-entry restores it without changing saves',()=>{
 const h=startupHarness({width:390,height:650});h.c.window.visualViewport=visuals[2];h.start();
 const before=h.c.game.serialize(),resizes=h.log.resizes;
 delete h.c.window.visualViewport;h.resize(1180,757);
 for(const key of ['left','top','width','height'])assert.equal(h.$('app').style[key],'');
 assert.equal(h.$('app').classList.contains('protected-mobile'),false);assert.equal(h.$('battleTop').parentNode,h.$('battlefield'));
 assert.ok(h.log.resizes>resizes);assert.deepEqual(h.c.game.serialize(),before);
 h.resize(667,300);assert.equal(h.$('app').classList.contains('protected-sidebar'),true);
 assert.deepEqual(fittedRect(h.$('app').style),box(0,0,667,300));assert.equal(h.c.viewportPause.active,false);
 assert.deepEqual(h.c.game.serialize(),before);
});
