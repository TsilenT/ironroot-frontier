import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createInputScopeGuard} from '../dist/input-scope.js';

const pointer=(pointerId=1,pointerType='touch',extra={})=>({pointerId,pointerType,isPrimary:true,...extra});
const click=(pointerId=1,pointerType='touch',extra={})=>({isTrusted:true,detail:1,...pointer(pointerId,pointerType),...extra});
const key=(code,target,repeat=false)=>({code,target,repeat});

for(const type of ['touch','mouse','pen']) {
  test(`${type}: a held gesture cannot activate a new scope, but the very next press can`,()=>{
    const guard=createInputScopeGuard('battle'),held=pointer(1,type);
    guard.pointerDown(held);
    assert.equal(guard.setScope('result'),true);
    assert.equal(guard.pointerEnd(held),true);
    assert.equal(guard.click(click(1,type)),true);
    const fresh=pointer(2,type);
    guard.pointerDown(fresh);
    assert.equal(guard.pointerEnd(fresh),false);
    assert.equal(guard.click(click(2,type)),false);
  });
}

test('a compatibility MouseEvent is attributed to its touch gesture, not the new modal target',()=>{
  const guard=createInputScopeGuard('battle'),p=pointer();
  guard.pointerDown(p);guard.setScope('result');guard.pointerEnd(p);
  const legacy={isTrusted:true,detail:1,sourceCapabilities:{firesTouchEvents:true}};
  assert.equal(guard.click(legacy),true);
  guard.pointerDown(pointer(2));guard.pointerEnd(pointer(2));
  assert.equal(guard.click(legacy),false);
});

test('legacy mouse clicks without sourceCapabilities keep their originating generation',()=>{
  const guard=createInputScopeGuard('battle'),p=pointer(1,'mouse');
  guard.pointerDown(p);guard.pointerEnd(p);guard.setScope('result');
  assert.equal(guard.click({isTrusted:true,detail:1}),true);
  guard.pointerDown(p);guard.pointerEnd(p);
  assert.equal(guard.click({isTrusted:true,detail:1}),false);
});

test('touch fallback remains tied to the primary contact when another finger ends',()=>{
  const guard=createInputScopeGuard('battle');
  guard.pointerDown(pointer(1));guard.setScope('result');
  guard.pointerDown(pointer(2,'touch',{isPrimary:false}));
  guard.pointerEnd(pointer(1));guard.pointerEnd(pointer(2));
  assert.equal(guard.click({isTrusted:true,detail:1,sourceCapabilities:{firesTouchEvents:true}}),true);
});

test('old and fresh simultaneous contacts are independent, regardless of release order',()=>{
  for(const ids of [[1,2],[2,1]]) {
    const guard=createInputScopeGuard('battle');
    guard.pointerDown(pointer(1));guard.setScope('result');
    guard.pointerDown(pointer(2,'touch',{isPrimary:false}));
    for(const id of ids) {
      assert.equal(guard.pointerEnd(pointer(id)),id===1);
      assert.equal(guard.click(click(id)),id===1);
    }
  }
});

test('lost capture does not erase a held gesture; release/click remain blocked without a timer',()=>{
  const guard=createInputScopeGuard('battle');
  guard.pointerDown(pointer());
  // Capture changes alone are not a physical release. The integration cleans
  // the battlefield drag, while retaining this record until up/cancel.
  guard.setScope('result');
  assert.equal(guard.click(click()),true); // Even if no pointerup reaches document.
  assert.equal(guard.pointerEnd(pointer()),true);
});

test('pointercancel blocks any trailing click but never eats a fresh same-ID press',()=>{
  const guard=createInputScopeGuard('battle');
  guard.pointerDown(pointer());
  assert.equal(guard.pointerEnd(pointer(),true),true);
  assert.equal(guard.pointerEnd(pointer()),true); // Late up must not undo cancellation.
  assert.equal(guard.click(click()),true);
  guard.pointerDown(pointer());
  assert.equal(guard.pointerEnd(pointer()),false);
  assert.equal(guard.click(click()),false);
});

test('leaving and returning to the same scope does not re-arm a held gesture',()=>{
  const guard=createInputScopeGuard('battle');
  guard.pointerDown(pointer());
  guard.setScope('pause');guard.setScope('settings');guard.setScope('pause');guard.setScope('battle');
  assert.equal(guard.pointerEnd(pointer()),true);
  assert.equal(guard.click(click()),true);
});

test('ordinary pointer gestures and native range drags stay untouched within a scope',()=>{
  const guard=createInputScopeGuard('settings');
  for(const type of ['mouse','touch','pen']) {
    const p=pointer(1,type);
    guard.pointerDown(p);
    assert.equal(guard.setScope('settings'),false);
    // Moving a pointer, or dragging a range thumb, does not change the scope.
    assert.equal(guard.pointerEnd(p),false);
    assert.equal(guard.click(click(1,type)),false);
  }
});

test('native zero-detail keyboard/assistive clicks and synthetic controller activation remain allowed',()=>{
  const guard=createInputScopeGuard('battle');
  guard.pointerDown(pointer());guard.setScope('result');guard.pointerEnd(pointer());
  assert.equal(guard.click({isTrusted:true,detail:0,pointerId:-1}),false);
  assert.equal(guard.click({isTrusted:false,detail:0}),false);
  assert.equal(guard.click({isTrusted:false,detail:1,pointerId:1}),false);
  assert.equal(guard.click({isTrusted:true,detail:1,pointerId:987}),false);
});

for(const code of ['Enter','NumpadEnter','Space']) {
  test(`${code}: a held key cannot cross scopes or activate a different focused control`,()=>{
    const guard=createInputScopeGuard('battle'),before={},after={};
    assert.equal(guard.keyDown(key(code,before)),false);
    guard.setScope('result');
    assert.equal(guard.keyDown(key(code,after,true)),true);
    assert.equal(guard.keyUp(key(code,after)),true);
    assert.equal(guard.keyDown(key(code,after)),false);
    assert.equal(guard.keyUp(key(code,after)),false);
    assert.equal(guard.click({isTrusted:true,detail:0}),false);
    assert.equal(guard.keyDown(key(code,before)),false);
    assert.equal(guard.keyUp(key(code,after)),true); // Same modal, new focused control.
  });
}

test('normal native repeats and Tab/Shift navigation keep browser defaults',()=>{
  const guard=createInputScopeGuard('settings'),first={},second={};
  for(const code of ['Space','Enter','ArrowRight']) {
    assert.equal(guard.keyDown(key(code,first)),false);
    assert.equal(guard.keyDown(key(code,first,true)),false);
    assert.equal(guard.keyUp(key(code,first)),false);
  }
  for(const code of ['Tab','ShiftLeft']) {
    assert.equal(guard.keyDown(key(code,first)),false);
    assert.equal(guard.keyUp(key(code,second)),false);
  }
});

test('window interruption cancels held physical inputs and repeats, not fresh input',()=>{
  const guard=createInputScopeGuard('battle'),target={};
  guard.pointerDown(pointer());guard.keyDown(key('Enter',target));
  guard.interrupt();
  assert.equal(guard.pointerEnd(pointer()),true);
  assert.equal(guard.click(click()),true);
  assert.equal(guard.keyDown(key('Enter',target,true)),true);
  assert.equal(guard.keyUp(key('Enter',target)),true);
  assert.equal(guard.keyDown(key('Enter',target,true)),true); // Orphan repeat.
  guard.keyUp(key('Enter',target));
  guard.pointerDown(pointer(2));
  assert.equal(guard.pointerEnd(pointer(2)),false);
  assert.equal(guard.click(click(2)),false);
  assert.equal(guard.keyDown(key('Enter',target)),false);
  assert.equal(guard.keyUp(key('Enter',target)),false);
});

test('repeated interruptions retire abandoned IDs into bounded completed history',()=>{
  const guard=createInputScopeGuard('battle');
  for(let id=1;id<=1000;id++) {
    guard.pointerDown(pointer(id));
    guard.interrupt(); // Browser never delivers a terminal event for this ID.
    assert.equal(guard.click(click(id)),true);
  }
  for(let id=1;id<=1000;id++)
    assert.equal(guard.click(click(id)),id>968,`retained pointer ${id}`);
  assert.equal(guard.pointerEnd(pointer(1)),false,'oldest abandoned ID is no longer active or retained');
  assert.equal(guard.pointerEnd(pointer(1000)),true,'recent stale release is still blocked');
});

test('interrupted pointer ID reuse is immediately fresh without reviving other abandoned contacts',()=>{
  const guard=createInputScopeGuard('battle');
  for(let cycle=0;cycle<20;cycle++) {
    guard.pointerDown(pointer(1));
    guard.pointerDown(pointer(2,'touch',{isPrimary:false}));
    guard.interrupt();
    guard.interrupt(); // Blur and visibilitychange may both report one interruption.
    assert.equal(guard.click(click(1)),true);
    assert.equal(guard.click(click(2)),true);
    guard.pointerDown(pointer(1));
    assert.equal(guard.pointerEnd(pointer(1)),false);
    assert.equal(guard.click(click(1)),false);
    assert.equal(guard.click(click(2)),true);
  }
});

test('retiring interrupted contacts preserves primary compatibility-click fallback through eviction',()=>{
  const guard=createInputScopeGuard('battle');
  guard.pointerDown(pointer(1));guard.interrupt();
  for(let id=2;id<=65;id++) {
    guard.pointerDown(pointer(id,'touch',{isPrimary:false}));
    guard.interrupt();
  }
  const legacy={isTrusted:true,detail:1,sourceCapabilities:{firesTouchEvents:true}};
  assert.equal(guard.click(legacy),true,'retired primary stays cancelled after its ID ages out');
  guard.pointerDown(pointer(1));
  assert.equal(guard.pointerEnd(pointer(1)),false);
  assert.equal(guard.click(legacy),false,'new primary press replaces the stale fallback');
});

test('runtime wires capture guards, scope/drag cleanup, and the offline module',()=>{
  const app=readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');
  const sw=readFileSync(new URL('../dist/service-worker.js',import.meta.url),'utf8');
  for(const method of ['pointerDown','pointerEnd','click','keyDown','keyUp','interrupt'])
    assert.ok(app.includes(`inputScope.${method}(`),method);
  assert.match(app,/function syncDialogs\(\)\s*{\s*syncInputScope\(\)/);
  assert.match(app,/if \(inputScope\.setScope\(next\)\) resetBattleGesture\(\)/);
  assert.match(app,/lostpointercapture[\s\S]*?resetBattleGesture\(\)/);
  assert.ok(sw.includes("'./input-scope.js'"));
});
