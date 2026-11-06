import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {Game} from '../dist/engine.js';
import {inspectPhoneText,savedClockText} from '../qa/browser/phone-text-evidence.mjs';
import {assertPassiveContinuation} from '../qa/browser/passive-continuation.mjs';
const box=(left,top,width,height)=>({left,top,width,height,right:left+width,bottom:top+height});

// Narrow DOM/range model for the probe's rejection behavior. This is not native
// browser typography evidence; the companion browser cases measure real glyph
// line boxes and styled clipping in the app and its script-free render fixture.
function textFixture({hidden=false,clipped=false,transparent=false,tiny=false,top=20}={}){
 const defaults={display:'block',visibility:'visible',opacity:'1',fontSize:'11px',color:'rgb(240,240,240)',overflowX:'visible',overflowY:'visible'};
 const owner={parentElement:null,clientLeft:0,clientTop:0,clientWidth:160,clientHeight:64,style:{...defaults},getBoundingClientRect:()=>box(0,0,160,64)};
 const label={parentElement:owner,clientLeft:0,clientTop:0,clientWidth:150,clientHeight:20,scrollWidth:150,textContent:'20% HP · Critical',style:{...defaults},getBoundingClientRect:()=>box(5,top,150,20),closest:()=>owner,matches:()=>false};
 const nested={parentElement:label,clientLeft:0,clientTop:0,clientWidth:clipped?8:70,clientHeight:20,style:{...defaults,display:hidden?'none':'inline-block',overflowX:clipped?'hidden':'visible',opacity:transparent?'0':'1',fontSize:tiny?'0px':'11px'},getBoundingClientRect:()=>box(59,top,clipped?8:70,20)};
 const nodes=[{textContent:'20% HP · ',parentElement:label,left:5},{textContent:'Critical',parentElement:nested,left:59}];
 const document={querySelectorAll:()=>[label],createTreeWalker(){let i=0;return {nextNode:()=>nodes[i++]||null};},createRange(){let node,start,end;return {setStart(n,s){node=n;start=s;},setEnd(n,e){end=e;},getClientRects(){return hidden&&node.parentElement===nested?[]:[box(node.left+start*6,top,(end-start)*6,13)];}};}};
 return runInNewContext(`(${inspectPhoneText.toString()})({selector:'.protected-health'})`,{document,window:{},innerWidth:160,innerHeight:64,getComputedStyle:e=>e.style});
}

test('character evidence accepts the entire nested critical-health string, not just a visible parent box',()=>{
 const [evidence]=textFixture();assert.equal(evidence.complete,true);assert.equal(evidence.visibleText,'20%HP·Critical');
 assert.equal(evidence.characters.length,evidence.expectedText.length);assert.ok(evidence.characters.every(c=>c.visible));
});
test('hidden, clipped, transparent and zero-size nested status text are individually rejected',()=>{
 for(const options of [{hidden:true},{clipped:true},{transparent:true},{tiny:true}]){
  const [evidence]=textFixture(options);assert.equal(evidence.complete,false,JSON.stringify(options));
  assert.notEqual(evidence.visibleText,evidence.expectedText);assert.ok(evidence.characters.some(c=>!c.visible&&c.reasons.length));
 }
});
test('line-box overflow remains a failure rather than being renamed a successful glyph check',()=>{
 const [evidence]=textFixture({top:-2});assert.equal(evidence.complete,false);assert.ok(evidence.characters.some(c=>c.reasons.includes('outside viewport')));
});
test('paused HUD expectations derive from the authoritative saved clock, including a just-crossed second',()=>{
 for(const [time,text]of [[0,'00:00'],[1.9999999999999998,'00:02'],[2.000000000000001,'00:02'],[61.1,'01:01']])assert.equal(savedClockText({game:{state:{time}}}),text);
});
function continuation(){
 const game=new Game({seed:120012,mapId:'long-march',ai:false});assert.equal(game.build('archery',550,450).ok,true);
 for(let i=0;i<24;i++)game.update(.05);const before=game.serialize();
 const afterGame=Game.restore(before);for(let i=0;i<4;i++)afterGame.update(.05);afterGame.update(.017);
 return {before,after:afterGame.serialize()};
}
test('passive replay accepts real spawned-unit/RNG changes after Resume and compares full simulation state',()=>{
 const {before,after}=continuation();assert.notEqual(after.seed,before.seed);assert.ok(after.state.units.length>before.state.units.length);
 assertPassiveContinuation(before,after);assertPassiveContinuation(before,before);
});
test('passive replay rejects seed, state, progression and sub-tick remainder corruption',()=>{
 const {before,after}=continuation();
 for(const mutate of [s=>s.seed=(s.seed+1)>>>0,s=>s.state.gold[0]++,s=>s.tick++,s=>s.accumulator=.07]){
  const corrupted=structuredClone(after);mutate(corrupted);assert.throws(()=>assertPassiveContinuation(before,corrupted));
 }
});
test('held-release browser contract compares baseline buildings/costs and requires one fresh paid build',()=>{
 const source=readFileSync(new URL('../qa/browser/phone-viewport.spec.mjs',import.meta.url),'utf8');
 const begin=source.indexOf("test('synthetic visualViewport: original clip50/offset1"),end=source.indexOf("test('synthetic pinch-small",begin),body=source.slice(begin,end);
 assert.match(body,/baseline=await pause\(page\)/);assert.match(body,/ownedIds\(unchanged.game\)\)\.toEqual\(ownedIds\(baseline.game\)\)/);
 assert.match(body,/stats\.built\[0\]\)\.toBe\(baseline.game.state.stats.built\[0\]\)/);
 assert.match(body,/stats\.built\[0\]\)\.toBe\(baseline.game.state.stats.built\[0\]\+1\)/);
 assert.match(body,/unchanged.game.state.gold\[0\]-210\+5\*/);assert.doesNotMatch(body,/stats\.built\[0\]\)\.toBe\([01]\)/);
});
