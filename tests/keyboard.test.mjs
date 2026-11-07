import test from 'node:test';
import assert from 'node:assert/strict';
import {runInContext} from 'node:vm';
import * as keyboard from '../dist/keyboard.js';
import {createInputScopeGuard} from '../dist/input-scope.js';
import {startupHarness} from './mobile-startup-fixture.mjs';
const event = (code, extra = {}) => ({code, target:{}, preventDefault(){this.defaultPrevented=true;}, stopImmediatePropagation(){this.stopped=true;}, ...extra});
const map = bindings => ({version:1,bindings});

test('twelve defaults retain physical roster slots and explicit null differs from missing', () => {
  assert.equal(keyboard.ACTIONS.length,12);
  assert.deepEqual(keyboard.effectiveBindings(),keyboard.DEFAULT_BINDINGS);
  assert.equal(keyboard.effectiveBindings(map({build1:null})).build1,null);
  assert.equal(keyboard.effectiveBindings(map({build1:null})).build2,'Digit2');
  assert.equal(keyboard.keyLabel('Numpad2'),'Numpad 2');
  assert.equal(keyboard.keyLabel(null),'Unbound');
  const five = Object.fromEntries(['Barracks','Archery range','Watchtower','Mine','Warden lodge'].map((name,i)=>[i,{name}]));
  assert.equal(keyboard.actionLabel('build3',five),'Build slot 3 · Watchtower');
});
test('strict bounded map rejects malformed versions, keys, actions and effective-default conflicts', () => {
  for(const value of [null,[],{},map([]),{version:2,bindings:{}},{...map({}),extra:1},map({build9:'KeyQ'}),map({build1:undefined}),map({build1:'Enter'}),map({build1:'F11'}),map({build1:'ControlLeft'}),map({build1:'Digit2'}),map({build1:'KeyQ',build2:'KeyQ'})])
    assert.throws(()=>keyboard.normalizeKeyboardMap(value));
  for(const code of ['KeyQ','Digit0','Numpad9','ArrowUp','ArrowDown']) assert.deepEqual(keyboard.normalizeKeyboardMap(map({build1:code})),map({build1:code}));
  assert.deepEqual(keyboard.normalizeKeyboardMap(map({build1:'Digit2',build2:null})),map({build1:'Digit2',build2:null}));
});
test('lookup resolves repetition by mapped action and protects browser, IME, handled and native input', () => {
  const custom=map({panLeft:'KeyQ',build1:'ArrowLeft'});
  assert.equal(keyboard.keyboardAction(event('KeyQ',{repeat:true}),custom),'panLeft');
  assert.equal(keyboard.keyboardAction(event('ArrowLeft',{repeat:true}),custom),null);
  for(const action of ['build1','volley','pause']) assert.equal(keyboard.keyboardAction(event(keyboard.DEFAULT_BINDINGS[action],{repeat:true})),null);
  for(const extra of [{ctrlKey:true},{altKey:true},{metaKey:true},{shiftKey:true},{isComposing:true},{keyCode:229},{defaultPrevented:true},{target:{isContentEditable:true}},{target:{closest:()=>({})}}])
    assert.equal(keyboard.keyboardAction(event('Digit1',extra)),null);
  assert.equal(keyboard.keyboardAction(event('KeyQ'),custom),'panLeft');
  assert.equal(keyboard.keyboardAction(event('Digit9')),null);
  const button={closest:selector=>selector.startsWith('button')?{}:null};
  assert.equal(keyboard.keyboardAction(event('KeyP',{target:button}),map({pause:'KeyP'})),'pause');
  assert.equal(keyboard.keyboardAction(event('Space',{target:button})),null);
});

function handlerHarness() {
  const h=startupHarness(), {c,$}=h;
  c.started=true; c.paused=false; c.document.hidden=false;
  for(const id of ['welcome','pauseVeil','coachingModal','restartModal','backupModal','settingsModal','helpModal','resultModal','viewportModal']) $(id).classList.add('hidden');
  c.document.activeElement=$('battle');
  const calls=[];
  c.selectBuild=type=>calls.push(['build',type]);c.toggleBattlePause=()=>calls.push(['pause']);
  c.renderer.pan=value=>calls.push(['pan',value]);$('rally').onclick=()=>calls.push(['volley']);
  c.window.addEventListener=(type,handler)=>{if(type==='keydown')c.handler=handler;};
  const start=h.source.indexOf("window.addEventListener('keydown', (e) => {");
  runInContext(h.source.slice(start,h.source.indexOf("document.addEventListener('visibilitychange'",start)),c);
  return {...h,calls,send(code,extra={}){const e=event(code,extra);c.handler(e);return e;}};
}
test('actual app handler routes remapped actions, active roster slots and only handled keys prevent defaults', () => {
  const h=handlerHarness();
  h.c.preferences.keyboard=map({build3:'KeyQ',panLeft:'KeyA'});
  h.c.game={...h.c.game,buildings:Object.fromEntries(['barracks','archery','watchtower','mint','wardenLodge'].map(id=>[id,{name:id}]))};
  assert.equal(h.send('KeyQ').defaultPrevented,true);
  assert.deepEqual(h.calls.pop(),['build','watchtower']);
  assert.equal(h.send('Digit8').defaultPrevented,undefined);
  assert.equal(h.send('Digit3').defaultPrevented,undefined);
  h.send('KeyA',{repeat:true});assert.deepEqual(h.calls.pop(),['pan',75]);
  h.send('Space');assert.deepEqual(h.calls.pop(),['pause']);
  h.send('KeyR');assert.deepEqual(h.calls.pop(),['volley']);
  for(const extra of [{ctrlKey:true},{metaKey:true},{altKey:true},{shiftKey:true},{defaultPrevented:true},{isComposing:true},{keyCode:229},{target:{isContentEditable:true}},{target:{closest:()=>({})}},{repeat:true}]) h.send('KeyQ',extra);
  assert.deepEqual(h.calls,[]);
  h.c.paused=true;assert.equal(h.send('KeyQ').defaultPrevented,undefined);
  h.c.preferences.keyboard=map({pause:'KeyP'});
  h.send('KeyP',{target:{closest:selector=>selector.startsWith('button')?{}:null}});assert.deepEqual(h.calls.pop(),['pause']);
  h.c.paused=false;h.c.recoveryHold={};assert.equal(h.send('KeyQ').defaultPrevented,undefined);
  h.c.recoveryHold=null;h.$('helpModal').classList.remove('hidden');assert.equal(h.send('KeyQ').defaultPrevented,undefined);
});
test('actual capture consumes a fresh binding and retires releases; conflict, Escape and Tab cancel safely', () => {
  const h=startupHarness(),{c,$}=h;const scope=createInputScopeGuard('options');
  Object.assign(c,{...keyboard,preferences:{},keyboardCapture:null,keyboardLoadWarning:'',inputScope:scope,
    syncInputScope(){scope.setScope(c.keyboardCapture||'options');},savePreferences:()=>true,syncKeyboardSettings(){},populateBuildCards(){},pauseControl(){},updateCampaignDeck(){},updateHUD(){}});
  const source=h.source;
  runInContext(source.slice(source.indexOf('function cancelKeyboardCapture('),source.indexOf("$('keyboardDefaults').onclick")),c);
  const begin=()=>{c.keyboardCapture={action:'build1'};c.syncInputScope();};
  // Native Enter keydown opened Change: the next repeat and keyup are stale.
  scope.keyDown(event('Enter'));begin();assert.equal(scope.keyDown(event('Enter',{repeat:true})),true);assert.equal(scope.keyUp(event('Enter')),true);
  const q=event('KeyQ');scope.keyDown(q);c.captureKeyboardInput(q);
  assert.equal(c.preferences.keyboard.bindings.build1,'KeyQ');assert.equal(q.defaultPrevented,true);assert.equal(c.keyboardCapture,null);assert.equal(scope.keyUp(event('KeyQ')),true);
  begin();const conflict=event('Digit2');scope.keyDown(conflict);c.captureKeyboardInput(conflict);
  assert.notEqual(c.keyboardCapture,null);assert.match($('keyboardStatus').textContent,/already used/);assert.equal(scope.keyUp(event('Digit2')),true);
  const esc=event('Escape');scope.keyDown(esc);c.captureKeyboardInput(esc);assert.equal(esc.stopped,true);assert.equal(c.keyboardCapture,null);assert.equal(scope.keyUp(event('Escape')),true);
  begin();const tab=event('Tab');scope.keyDown(tab);c.captureKeyboardInput(tab);assert.equal(c.keyboardCapture,null);assert.equal(tab.defaultPrevented,undefined);
});
test('actual scope synchronization cancels capture on closure, hidden page and profile recovery', () => {
  for (const reason of ['dialog', 'disclosure', 'hidden', 'recovery', 'profile']) {
    const h=startupHarness(), {c,$}=h;
    c.keyboardCapture={action:'build1'};
    c.document.hidden=false; $('settingsModal').classList.remove('hidden'); $('keyboardSettings').open=true;
    runInContext(h.source.slice(h.source.indexOf('function cancelKeyboardCapture('),h.source.indexOf('function setKeyboardBinding(')),c);
    c.inputScope.keyDown(event('Space'));
    if(reason==='dialog') $('settingsModal').classList.add('hidden');
    if(reason==='disclosure') $('keyboardSettings').open=false;
    if(reason==='hidden') c.document.hidden=true;
    if(reason==='recovery') c.recoveryHold={};
    if(reason==='profile') c.profileGate={};
    c.syncInputScope();
    assert.equal(c.keyboardCapture,null,reason);
    assert.equal(c.inputScope.keyUp(event('Space')),true,reason+' retires release');
  }
});
test('capture key retirement preserves the deliberate native pointer focus gesture', () => {
  const scope=createInputScopeGuard('options'),pointer={pointerId:1,pointerType:'mouse',detail:1,isTrusted:true};
  scope.keyDown(event('Enter'));scope.pointerDown(pointer);scope.interruptKeys();
  assert.equal(scope.keyUp(event('Enter')),true);
  assert.equal(scope.pointerEnd(pointer),false);assert.equal(scope.click(pointer),false);
  assert.equal(scope.keyDown(event('Enter')),false,'next independent key is immediately usable');
});
