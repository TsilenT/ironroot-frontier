/** Structural preflight only. Candidate formations must NEVER receive a tick here. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve,dirname,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
import {Game} from '../dist/engine.js';
import {campaignControlStatus,bridgeStatus} from '../dist/bridge-control.js';
import {DESIGN,bindQAControl,createPrototype,evaluatePrototype} from '../qa/leave-no-road-closed/scenario.mjs';
import {nativePresentation,buildingPresentation} from '../qa/leave-no-road-closed/native-presentation.mjs';
import {NATIVE_SEEDS,createNativeSession,nativeEnded,nativeControlsDisabled,evaluateNative,setNativePaused,restartNative,advanceNative,paidNative} from '../qa/leave-no-road-closed/native-state.mjs';
Game.prototype._step=function(){throw Error('Natural candidate tick forbidden in structural preflight');};
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const frozen=resolve(root,'../ironroot-leave-roads-epoch2');
const bytes=p=>readFileSync(resolve(root,p));
const hash=x=>createHash('sha256').update(x).digest('hex');
function files(dir,prefix=''){return readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(resolve(dir,e.name),prefix+e.name+'/'):[prefix+e.name]).sort();}
/** This fixture is NOT createPrototype: ordinary constructor, AI off, both
 * formations explicitly empty, no units, test-owned bank. Never used for evidence. */
function emptySynthetic({tick=0,time=0,gold=1000,onTick=()=>{}}={}){
 const base=new Game({seed:1,ai:false,mapId:'classic',difficulty:'normal',rulesetId:DESIGN.parentRulesetId});
 base.state.units=[];base.state.buildings=[];base.state.effects=[];base.state.gold=[gold,0];base.state.stats.built=[0,0];
 const game=bindQAControl(base);game.tick=tick;game.state.time=time;game.accumulator=0;
 const calls={updates:0,paid:[]};
 // Clock-only stand-in. Not engine update, AI, formation, combat or balance run.
 game.update=function(dt){calls.updates++;assert.equal(dt,.05);this.tick++;this.state.time+=dt;onTick(this);};
 return {session:{seed:9305,game,paused:true,wallAccumulator:0,outcome:evaluatePrototype(game)},calls};
}
const methods=['build','upgrade','sell','cast','citadel'];

test('hard-bound frozen scenario, runner, policies, plan and exact runtime bytes',()=>{
 const expected={'scenario.mjs':'7110143f2945f9cedea462f28d61523ab864df7176537f00e5f0dbeb931058e3','run.mjs':'b3dcd59cfa0db37ad03916fba10d7c9bb19b69f237ab11c274feaba9c8929399','policies.mjs':'7f0302a72831814dec13ec7512c90b524db0f306be73fed7f6a90c295f3d5980','PLAN.json':'1d7b19d889814978cd538873a9cf6b2f88102db62d0f9b0707fbdc1e4b254949'};
 for(const [name,digest] of Object.entries(expected)){const p='qa/leave-no-road-closed/'+name;assert.equal(hash(bytes(p)),digest,p);assert.equal(hash(readFileSync(resolve(frozen,p))),digest,'frozen '+p);}
 assert.deepEqual(files(resolve(root,'dist')),files(resolve(frozen,'dist')));
 for(const p of files(resolve(root,'dist')))assert.equal(hash(bytes('dist/'+p)),hash(readFileSync(resolve(frozen,'dist',p))),p);
 assert.equal(hash(bytes('dist/engine.js')),'6837fe338e80cf0f78d8ab1784d678d1a515667e1c397c1f9c19ddf73ab2fec6');
 assert.equal(hash(bytes('dist/render.js')),'d3be07536a06c76a65ed93e5f29319db5889cfb1bdbdfaed00e2a29f8ef9ecaa');
});

test('single disclosed 9305 opening is exact frozen state, paused, with zero ticks',()=>{
 assert.deepEqual(NATIVE_SEEDS,[9305]);const s=createNativeSession();
 assert.equal(s.seed,9305);assert.equal(s.paused,true);assert.equal(s.game.tick,0);assert.equal(s.game.state.time,0);
 assert.equal(s.game.ai,true);assert.equal(s.game.difficulty,'normal');assert.deepEqual(s.game.state.gold,[900,100]);
 assert.deepEqual(s.game.serialize(),createPrototype({seed:9305}).serialize());
 assert.equal(hash(JSON.stringify(s.game.serialize())),'3840a3cdb9a0f34ba1b930250a02c7bd21cbee48ed87237afa5caf46cb1598d6');
 const before=s.game.serialize();assert.equal(advanceNative(s,100),0);
 for(const method of methods)assert.equal(paidNative(s,method,[]).ok,false);
 assert.deepEqual(s.game.serialize(),before);
 for(const seed of [0,9306,NaN,9305.5])assert.throws(()=>createNativeSession({seed}),/known seed/);
});

test('empty synthetic spies verify every paid method forwards own-side arguments',()=>{
 const {session,calls}=emptySynthetic();setNativePaused(session,false);
 const map={build:'build',upgrade:'upgrade',sell:'sell',cast:'cast',citadel:'buyCitadelOption'};
 for(const [control,method] of Object.entries(map))session.game[method]=(...args)=>{calls.paid.push([method,...args]);return {ok:true};};
 const args={build:['mint',410,260],upgrade:[4],sell:[4],cast:[1600,260],citadel:['regen']};
 for(const m of methods)assert.equal(paidNative(session,m,args[m]).ok,true);
 assert.deepEqual(calls.paid,[['build','mint',410,260,0],['upgrade',4,0],['sell',4,0],['cast',1600,260,0],['buyCitadelOption','regen',0]]);
 assert.equal(paidNative(session,'setGold',[100000]).ok,false);assert.equal(calls.paid.length,5);assert.equal(calls.updates,0);
 setNativePaused(session,true);for(const m of methods)assert.equal(paidNative(session,m,args[m]).ok,false);assert.equal(calls.paid.length,5);
});

test('explicit empty synthetic actual engine purchases charge, reject insufficient gold and refund normally',()=>{
 const {session:s}=emptySynthetic();assert.deepEqual(s.game.state.buildings,[]);assert.deepEqual(s.game.state.units,[]);setNativePaused(s,false);
 const g=s.game,price=g.buildings.mint.cost;let bank=g.state.gold[0];
 const built=paidNative(s,'build',['mint',410,g.map.lanes[0]]);assert.equal(built.ok,true);bank-=price;assert.equal(g.state.gold[0],bank);
 const b=built.building,cost=g.upgradeCost(b);assert.equal(paidNative(s,'upgrade',[b.id]).ok,true);bank-=cost;assert.equal(g.state.gold[0],bank);
 b.hp=b.maxHp*.75;const refund=Math.floor(b.invested*.5*b.hp/b.maxHp);assert.equal(paidNative(s,'sell',[b.id]).refund,refund);bank+=refund;assert.equal(g.state.gold[0],bank);
 assert.equal(paidNative(s,'cast',[1600,260]).ok,true);bank-=75;assert.equal(g.state.gold[0],bank);assert.equal(paidNative(s,'cast',[1600,260]).ok,false);assert.equal(g.state.gold[0],bank);
 assert.equal(paidNative(s,'citadel',['arrows']).ok,true);bank-=190;assert.equal(g.state.gold[0],bank);assert.equal(paidNative(s,'citadel',['regen']).ok,false);assert.equal(g.state.gold[0],bank);
 const poor=emptySynthetic({gold:0}).session;setNativePaused(poor,false);assert.equal(paidNative(poor,'build',['mint',410,260]).ok,false);assert.equal(paidNative(poor,'cast',[1600,260]).ok,false);assert.equal(paidNative(poor,'citadel',['regen']).ok,false);assert.deepEqual(poor.game.state.gold,[0,0]);
 assert.equal(g.tick,0);assert.equal(poor.game.tick,0);
});

test('clock-only pause drops partial wall time; invalid elapsed and paused frames cannot tick',()=>{
 const {session:s,calls}=emptySynthetic();assert.equal(advanceNative(s,100),0);setNativePaused(s,false);
 for(const dt of [NaN,Infinity,-1,0])assert.equal(advanceNative(s,dt),0);
 assert.equal(advanceNative(s,.025),0);setNativePaused(s,true);assert.equal(s.wallAccumulator,0);assert.equal(advanceNative(s,.25),0);
 setNativePaused(s,false);assert.equal(advanceNative(s,.025),0);assert.equal(advanceNative(s,.025),1);assert.equal(calls.updates,1);
 assert.equal(advanceNative(s,1000),5);assert.equal(calls.updates,6);
});

test('clock-only exact 600-second deadline stops at 12000 ticks without shortened final tick',()=>{
 const {session:s,calls}=emptySynthetic();setNativePaused(s,false);
 while(!nativeEnded(s)){advanceNative(s,.05);assert.ok(calls.updates<=12000);}
 assert.equal(s.game.tick,12000);assert.equal(calls.updates,12000);assert.ok(Math.abs(s.game.state.time-600)<1e-7);assert.equal(s.outcome.reason,'deadline');assert.equal(s.paused,true);assert.equal(s.wallAccumulator,0);
 setNativePaused(s,false);assert.equal(advanceNative(s,.25),0);assert.equal(calls.updates,12000);
 const near=emptySynthetic({tick:11999,time:599.950000000002});setNativePaused(near.session,false);assert.equal(advanceNative(near.session,.05),1);assert.equal(near.calls.updates,1);assert.equal(near.session.outcome.reason,'deadline');
});

test('synthetic control HUD reads cumulative credit without mutation and uses all three clear roads',()=>{
 const {session:s}=emptySynthetic();const g=s.game,c=g.state.campaignControl;c.heldSeconds=17.25;
 for(const b of c.bridges)b.owner=0;
 const before=structuredClone(g.state);let status=campaignControlStatus(g);assert.equal(status.count,3);assert.equal(status.required,3);assert.equal(status.seconds,17.25);assert.equal(status.target,30);assert.equal(status.advancing,true);bridgeStatus(g);assert.deepEqual(g.state,before);
 c.bridges[2].owner=1;status=campaignControlStatus(g);assert.equal(status.count,2);assert.equal(status.advancing,false);assert.equal(status.seconds,17.25);
 setNativePaused(s,true);assert.equal(c.heldSeconds,17.25);setNativePaused(s,false);assert.equal(c.heldSeconds,17.25);assert.equal(g.tick,0);
});

test('synthetic terminal boundaries preserve own loss/draw, core priority, goal and deadline semantics',()=>{
 const cases=[
 {time:600,enemy:0,held:30,winner:null,reason:'enemy-core',completed:true},
 {time:600,enemy:6000,held:30,winner:null,reason:'control',completed:true},
 {time:600,enemy:6000,held:29.95,winner:null,reason:'deadline',completed:false},
 {time:600.001,enemy:0,held:30,winner:0,reason:'deadline',completed:false},
 {time:599.95,enemy:0,own:0,held:30,winner:'draw',reason:'player-core',completed:false},
 {time:599.95,enemy:0,held:30,winner:1,reason:'player-core',completed:false},
 {time:599.95,enemy:6000,held:30,winner:'draw',reason:'player-core',completed:false},
 ];
 for(const c of cases){const {session:s,calls}=emptySynthetic({time:c.time});s.game.state.bases[0].hp=c.own??6000;s.game.state.bases[1].hp=c.enemy;s.game.state.campaignControl.heldSeconds=c.held;s.game.state.winner=c.winner;
 evaluateNative(s);assert.equal(s.outcome.reason,c.reason);assert.equal(s.outcome.completed,c.completed);assert.equal(s.paused,true);assert.equal(nativeControlsDisabled(s),true);
 for(const method of methods)assert.equal(paidNative(s,method,[]).ok,false);assert.equal(advanceNative(s,.25),0);assert.equal(calls.updates,0);}
});

test('clock-only final-tick goals and loss stop within same frame',()=>{
 for(const kind of ['core','control','loss']){const {session:s,calls}=emptySynthetic({tick:11999,time:599.95,onTick:g=>{g.state.campaignControl.heldSeconds=30;if(kind!=='control')g.state.bases[1].hp=0;if(kind==='loss')g.state.bases[0].hp=0;}});setNativePaused(s,false);assert.equal(advanceNative(s,.25),1);assert.equal(calls.updates,1);assert.equal(s.outcome.reason,kind==='core'?'enemy-core':kind==='control'?'control':'player-core');assert.equal(s.wallAccumulator,0);}
});

test('reset preserves the 9305 seed, exact fresh opening, paused state and URL identity',()=>{
 const s=createNativeSession();s.wallAccumulator=.025;s.paused=false;restartNative(s);assert.equal(s.seed,9305);assert.equal(s.paused,true);assert.equal(s.wallAccumulator,0);assert.equal(hash(JSON.stringify(s.game.serialize())),'3840a3cdb9a0f34ba1b930250a02c7bd21cbee48ed87237afa5caf46cb1598d6');
 const before=s.game.serialize();assert.throws(()=>restartNative(s,{seed:9306}),/known seed/);assert.deepEqual(s.game.serialize(),before);
 const shell=bytes('qa/leave-no-road-closed/native-shell.mjs').toString();assert.match(shell,/location\.search/);assert.doesNotMatch(shell,/(?:location\.(?:href|search|hash)\s*=|history\.(?:pushState|replaceState)|location\.(?:assign|replace)\()/);
});

test('transitive browser module closure excludes persistence, app, experiment runners and player policy controls',()=>{
 const seen=new Set();function visit(p){p=resolve(p);if(seen.has(p))return;assert.ok(p.startsWith(root+'/'));seen.add(p);const source=readFileSync(p,'utf8');
 assert.doesNotMatch(relative(root,p),/(?:^|\/)(?:app|profile|storage|service-worker|policies|run|experiment)\.(?:m?js)$/);
 assert.doesNotMatch(source,/\b(?:localStorage|sessionStorage|indexedDB|serviceWorker|createPolicy|POLICIES)\b/);
 for(const [,imp] of source.matchAll(/(?:^|\n)\s*(?:import\s+(?:[^;]*?\sfrom\s*)?|export\s+[^;]*?\sfrom\s*)["']([^"']+)["']/g)){assert.ok(imp.startsWith('.'),'only local modules: '+imp);visit(resolve(dirname(p),imp));}}
 visit(resolve(root,'qa/leave-no-road-closed/native-shell.mjs'));assert.ok(seen.has(resolve(root,'dist/render.js')));assert.ok(seen.has(resolve(root,'dist/engine.js')));assert.ok(seen.has(resolve(root,'qa/leave-no-road-closed/scenario.mjs')));
 const html=bytes('qa/leave-no-road-closed/index.html').toString();assert.match(html,/native-shell\.mjs/);assert.doesNotMatch(html,/(?:app\.js|service-worker|onclick=|<iframe|type=["']?(?:file|password))/);
 const shell=bytes('qa/leave-no-road-closed/native-shell.mjs').toString();assert.match(shell,/nativeControlsDisabled\(session\)/);assert.match(shell,/button\.disabled=disabled/);assert.doesNotMatch(shell,/state\.(?:gold|units|buildings)\s*=/);
});

test('pure presentation rounds HP, exposes only own treasury and shows truthful retained road time',()=>{
 const {session:s}=emptySynthetic();s.game.state.gold=[123.7,987654321];s.game.state.campaignControl.heldSeconds=12.3;
 const before=structuredClone(s.game.state),view=nativePresentation(s);assert.deepEqual(s.game.state,before);assert.match(view.status,/Your gold 123/);assert.match(view.status,/Paused/);assert.match(view.status,/0:00 \/ 10:00/);assert.doesNotMatch(JSON.stringify(view),/987654321/);assert.match(view.goal,/Clear bridges 0 \/ 3/);assert.match(view.goal,/Cumulative 12\.3 \/ 30 sec/);assert.match(view.goal,/enemy core/);assert.match(view.goal,/5:00/);
 s.paused=false;assert.match(nativePresentation(s).goal,/earned time retained/);
 const b={side:0,type:'mint',hp:91.2,maxHp:100.4,level:2,invested:400};const snapshot=structuredClone(b),label=buildingPresentation(s.game,b);assert.match(label,/92\/101 HP/);assert.ok(label.includes('Income '+(s.game.buildings.mint.income*1.5).toFixed(1)+'/sec'));assert.match(label,/salvage 181 gold/);assert.deepEqual(b,snapshot);assert.equal(buildingPresentation(s.game,{...b,side:1}),'No owned building selected.');assert.deepEqual(s.game.state,before);
});

test('fake-DOM runtime smoke imports ordinary renderer and shell paused, cancels modes and resets without executing animation frames',async()=>{
 // This checks module/DOM wiring, NOT visual quality, browser hosting or a battle.
 const names=['document','window','location','devicePixelRatio','matchMedia','requestAnimationFrame'];
 const old=new Map(names.map(n=>[n,Object.getOwnPropertyDescriptor(globalThis,n)]));const elements=new Map(),listeners={},frames=[];let draws=0;
 const context=new Proxy({}, {get(target,key){if(key in target)return target[key];if(key==='measureText')return text=>({width:String(text).length*7});if(key==='createLinearGradient'||key==='createRadialGradient')return ()=>({addColorStop(){}});return (...args)=>{draws++;};},set(target,key,v){target[key]=v;return true;}});
 function element(tag='div'){return {tagName:tag.toUpperCase(),children:[],value:'',textContent:'',disabled:false,attrs:{},style:{},append(...children){this.children.push(...children);},replaceChildren(...children){this.children=children;if(tag==='select'&&!children.some(c=>String(c.value)===String(this.value)))this.value=children[0]?.value??'';},setAttribute(k,v){this.attrs[k]=v;},getContext(){return context;},getBoundingClientRect(){return {left:0,top:0,width:1000,height:500};}};}
 const html=bytes('qa/leave-no-road-closed/index.html').toString();for(const [,tag,id] of html.matchAll(/<(\w+)[^>]*\bid="([^"]+)"/g))elements.set(id,element(tag));
 Object.defineProperties(globalThis,{document:{configurable:true,value:{hidden:false,getElementById:id=>{assert.ok(elements.has(id),'known element '+id);return elements.get(id);},createElement:element,addEventListener:(event,fn)=>{listeners[event]=fn;}}},window:{configurable:true,value:{addEventListener(){}}},location:{configurable:true,value:Object.freeze({search:'?seed=9305',href:'http://127.0.0.1:43893/qa/leave-no-road-closed/?seed=9305'})},devicePixelRatio:{configurable:true,value:1},matchMedia:{configurable:true,value:()=>({matches:false})},requestAnimationFrame:{configurable:true,value:fn=>{frames.push(fn);return frames.length;}}});
 try{
  await import('../qa/leave-no-road-closed/native-shell.mjs');
  assert.ok(draws>0);assert.equal(frames.length,1);assert.match(elements.get('status').textContent,/Seed 9305.*0:00.*Paused/);assert.equal(elements.get('purchaseStatus').textContent,elements.get('status').textContent);assert.match(elements.get('goal').textContent,/Clear bridges 0 \/ 3/);
  assert.ok(elements.get('builds').children.every(b=>b.disabled));for(const id of ['upgrade','sell','arrows','regen','volley'])assert.equal(elements.get(id).disabled,true);
  elements.get('volley').onclick();assert.doesNotMatch(elements.get('feedback').textContent,/Click the ordinary volley target/);
  elements.get('pause').onclick(); // Resume state, but deliberately never execute rAF.
  elements.get('builds').children[0].onclick();assert.match(elements.get('feedback').textContent,/marked site/);elements.get('cancel').onclick();assert.equal(elements.get('feedback').textContent,'Selection canceled.');
  elements.get('volley').onclick();assert.match(elements.get('feedback').textContent,/volley target/);elements.get('purchasePause').onclick();assert.equal(elements.get('feedback').textContent,'Paused. Selection canceled.');
  elements.get('restart').onclick();assert.equal(Number(elements.get('seed').value),9305);assert.match(elements.get('feedback').textContent,/paused/);assert.equal(location.search,'?seed=9305');assert.equal(frames.length,1);
  document.hidden=true;listeners.visibilitychange();assert.equal(elements.get('feedback').textContent,'Paused while hidden. Selection canceled.');
 }finally{for(const n of names){const d=old.get(n);if(d)Object.defineProperty(globalThis,n,d);else delete globalThis[n];}}
});
