import test from 'node:test';
import assert from 'node:assert/strict';
import {createMenuHistory} from '../dist/menu-history.js';
import {historyWindow} from './menu-history-fixture.mjs';
const trail = (...keys) => keys.map(key => ({key, kind: key}));
function fixture(initial = trail('story','chapter','mission'), state = null) {
  const browser = historyWindow(state), seen = [];
  let current = initial;
  const nav = createMenuHistory({...browser, token:'test-document', read:()=>current,
    apply(route, direction) {seen.push([route.key, direction.direction]); current=current.slice(0,current.findIndex(r=>r.key===route.key)+1); if (!current.length) current=trail(route.key);},
    unknown() {seen.push(['unknown']); current=current.slice(0, Math.max(1,current.length-1));},
  });
  return {...browser, browser, nav, seen, current:()=>current,
    set(value) {current=value;nav.sync();browser.flush();},
    setPending(value) {current=value;nav.sync();},
  };
}
test('direct mission load exposes chapter and story, then ordinary Back leaves',()=>{
  const f=fixture();assert.equal(f.browser.history.length,4);
  f.browser.back();assert.deepEqual(f.seen.at(-1),['chapter','back']);
  f.browser.back();assert.deepEqual(f.seen.at(-1),['story','back']);
  f.browser.back();assert.equal(f.browser.index,0);assert.equal(f.browser.history.length,4);
});
test('Back and Forward use registered UI routes without pushing or changing URLs',()=>{
  const f=fixture();const pushes=f.writes.filter(w=>w.method==='push').length;
  f.browser.back();f.browser.forward();assert.deepEqual(f.seen.at(-1),['mission','forward']);
  assert.equal(f.writes.filter(w=>w.method==='push').length,pushes);
  assert.ok(f.writes.every(w=>w.url===undefined));
});
test('unrelated history.state fields survive replace, push, close and traversal',()=>{
  const other={host:{section:'arcade'},scroll:[1,2]};const f=fixture(trail('title'),other);
  f.set(trail('title','options'));f.set(trail('title','options','backup'));
  f.browser.back();f.browser.forward();
  for(const entry of f.browser.entries.slice(1)){
    assert.deepEqual(entry.state.host,other.host);assert.deepEqual(entry.state.scroll,other.scroll);
    assert.deepEqual(Object.keys(entry.state.ironrootNavigation).sort(),['document','entry','version']);
  }
});
test('visible Close traverses rather than leaving duplicate dialogs, and a new choice discards Forward',()=>{
  const f=fixture(trail('title'));f.set(trail('title','options'));f.set(trail('title','options','backup'));
  f.set(trail('title','options'));assert.equal(f.browser.index,2);assert.equal(f.seen.length,0);
  f.set(trail('title','help'));f.browser.back();assert.equal(f.current().at(-1).key,'title');
});
test('a click while Close traversal is pending is not undone by the older popstate',()=>{
  const f=fixture(trail('title'));f.set(trail('title','options'));
  f.setPending(trail('title'));f.setPending(trail('title','pause','play'));
  f.browser.flush();assert.equal(f.current().at(-1).key,'play');assert.equal(f.browser.index,3);
  f.browser.back();assert.equal(f.current().at(-1).key,'pause');
});
test('changing mission selection keeps its actual chapter as the Back parent',()=>{
  const f=fixture();f.set(trail('story','new-chapter','new-mission'));
  f.browser.back();assert.equal(f.current().at(-1).key,'new-chapter');
  f.browser.back();assert.equal(f.current().at(-1).key,'story');
});
test('reload replaces only the current marker and never seeds another synthetic hierarchy',()=>{
  const f=fixture();f.nav.dispose();const length=f.browser.history.length;
  let route=trail('story','chapter','mission');let unknown=0;
  const nav=createMenuHistory({...f.browser,token:'reload-document',read:()=>route,apply(){throw Error('old document route restored');},unknown(){unknown++;route=route.slice(0,Math.max(1,route.length-1));}});
  assert.equal(f.browser.history.length,length);f.browser.back();assert.equal(unknown,1);nav.sync();
  f.browser.back();assert.equal(unknown,2);f.browser.back();assert.equal(f.browser.index,0);
  assert.equal(f.browser.history.length,length);
});
test('unknown or forged state never selects an injected route and is not rewritten or re-pushed',()=>{
  const f=fixture();const writes=f.writes.length;
  f.browser.dispatch({ironrootNavigation:{version:1,document:'test-document',entry:'invented',route:{kind:'play'}}});
  assert.deepEqual(f.seen.at(-1),['unknown']);assert.equal(f.writes.length,writes);
  f.nav.sync();assert.equal(f.writes.length,writes);
});
test('even a registered ID must match the native current history state',()=>{
  const f=fixture();f.browser.dispatch(f.browser.entries[1].state);
  assert.deepEqual(f.seen.at(-1),['unknown']);
});
for(const state of ['foreign',42,[]])test(`non-object host state ${JSON.stringify(state)} is preserved without breaking UI`,()=>{
  const f=fixture(trail('title'),state);assert.equal(f.nav.available,false);assert.deepEqual(f.browser.history.state,state);
  f.set(trail('title','options'));assert.equal(f.writes.length,0);
});
test('History API denial degrades without an exception or an automatic retry loop',()=>{
  const b=historyWindow();let calls=0;
  b.history.replaceState=()=>{calls++;throw new DOMException('Disabled','SecurityError');};
  const n=createMenuHistory({...b,read:()=>trail('title','options'),apply(){},unknown(){}});
  n.sync();n.sync();assert.equal(calls,1);assert.equal(n.available,false);
});

test('bfcache reconciliation replaces one current marker without adding guards or interpreting stale data',()=>{
  const f=fixture(trail('title','pause','play'));const length=f.browser.history.length;
  f.setPending(trail('title','pause'));f.browser.flush();
  const pushes=f.writes.filter(w=>w.method==='push').length;f.nav.reconcile();f.nav.reconcile();
  assert.equal(f.browser.history.length,length);assert.equal(f.writes.filter(w=>w.method==='push').length,pushes);
  assert.equal(f.current().at(-1).key,'pause');
});
test('rapid hardware-Back-equivalent traversals are finite and never reverse direction with new pushes',()=>{
  const f=fixture(trail('title','pause','options','backup')),pushes=f.writes.filter(w=>w.method==='push').length;
  f.browser.history.go(-1);f.browser.history.go(-1);f.browser.history.go(-1);f.browser.flush();
  assert.equal(f.current().at(-1).key,'title');assert.equal(f.writes.filter(w=>w.method==='push').length,pushes);
  f.browser.back();assert.equal(f.browser.index,0);
});
