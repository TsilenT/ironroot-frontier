import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createMenuHistory, seedMenuAncestors} from '../dist/menu-history.js';
import {historyWindow} from './menu-history-fixture.mjs';
const trail=(...keys)=>keys.map(key=>({key,kind:key}));
function returning(seedAncestors=false){
 const browser=historyWindow();browser.entries[0].url='/training.html';
 let current=trail('story','chapter','mission');const seen=[];
 const nav=createMenuHistory({...browser,token:'returned-document',seedAncestors,read:()=>current,
  apply(route){seen.push(route.key);current=current.slice(0,current.findIndex(r=>r.key===route.key)+1);},
  unknown(){throw Error('The preceding practice document must not dispatch a game menu route');}});
 return {browser,nav,seen,set(value){current=value;nav.sync();browser.flush();}};
}
test('practice return keeps the campaign selection in one entry, then Back leaves to practice',()=>{
 const f=returning();assert.equal(f.browser.history.length,2);assert.equal(f.browser.writes.filter(w=>w.method==='push').length,0);
 f.browser.back();assert.equal(f.browser.entries[f.browser.index].url,'/training.html');assert.deepEqual(f.seen,[]);
});
test('Options opened after practice return has its own parent, without duplicating campaign ancestry',()=>{
 const f=returning();f.set(trail('story','chapter','mission','options'));
 assert.equal(f.browser.history.length,3);f.browser.back();assert.deepEqual(f.seen,['mission']);
 f.browser.back();assert.equal(f.browser.entries[f.browser.index].url,'/training.html');assert.equal(f.browser.history.length,3);
});
test('visible campaign Back after practice return still navigates Chapter and Story before leaving',()=>{
 const f=returning();f.set(trail('story','chapter'));f.set(trail('story'));
 assert.equal(f.browser.history.length,2);f.browser.back();assert.equal(f.browser.entries[f.browser.index].url,'/training.html');
});
test('starting a battle after practice return still supplies finite paused and title boundaries',()=>{
 const f=returning();f.set(trail('story','chapter','mission','pause','play'));
 assert.equal(f.browser.history.length,4);f.browser.back();f.browser.back();
 assert.deepEqual(f.seen,['pause','mission']);f.browser.back();assert.equal(f.browser.entries[f.browser.index].url,'/training.html');
});
test('normal direct load retains Story and Chapter ancestry',()=>{
 const f=returning(true);assert.equal(f.browser.history.length,4);f.browser.back();f.browser.back();
 assert.deepEqual(f.seen,['chapter','story']);f.browser.back();assert.equal(f.browser.index,0);
});
test('practice return recognition is same-origin exact sibling path, including subdirectory hosting',()=>{
 for(const [from,to] of [['https://game.test/training.html','https://game.test/'],['https://game.test/training.html?offline=1#lesson','https://game.test/index.html'],['https://game.test/play/training.html','https://game.test/play/']])
  assert.equal(seedMenuAncestors(from,to),false,from);
 for(const from of ['', 'invalid','https://other.test/training.html','https://game.test/other/training.html','https://game.test/training.html.evil','https://game.test/training.html/','https://game.test/'])
  assert.equal(seedMenuAncestors(from,'https://game.test/'),true,from);
});
test('app passes the read-only return hint without changing storage, URLs or the practice document',()=>{
 const app=readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');
 assert.match(app,/seedAncestors: seedMenuAncestors\(document\.referrer, window\.location\.href\)/);
 const helper=seedMenuAncestors.toString();assert.doesNotMatch(helper,/Storage|pushState|replaceState|location\.(assign|replace)/);
});
