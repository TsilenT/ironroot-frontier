import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {newerRuntime, readWorkerVersion, createRuntimeUpdate} from '../dist/runtime-update.js';
import {Game} from '../dist/engine.js';
import {createSaveSession, createStorage, writeBattle} from '../dist/persistence.js';

const current='ironroot-v0.40.7', next='ironroot-v0.40.8';
const turn=()=>new Promise(resolve=>setImmediate(resolve));
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
function harness(options={}) {
  const serviceWorker=new EventTarget();serviceWorker.controller={version:current};
  let checks=0, reloads=0, saves=0, clock=0;
  serviceWorker.getRegistration=async()=>({update:async()=>{checks++;}});
  const controller=createRuntimeUpdate({serviceWorker,version:current,readVersion:async worker=>worker?.version,
    prepareReload(){saves++;return {ok:true};},reload(){reloads++;},now:()=>clock,...options});
  return {controller,serviceWorker,get checks(){return checks;},get reloads(){return reloads;},get saves(){return saves;},set clock(value){clock=value;},
    async change(version=next){serviceWorker.controller={version};serviceWorker.dispatchEvent(new Event('controllerchange'));await turn();}};
}
test('release comparison is numeric and rejects malformed, old or unsafe identities',()=>{
  for(const value of ['ironroot-v0.40.8','ironroot-v0.40.10','ironroot-v0.41.0','ironroot-v1.0.0'])assert.equal(newerRuntime(value,current),true);
  for(const value of [current,'ironroot-v0.40.2','ironroot-v0.39.99','future',null,'ironroot-v999999999999999999999.0.0'])assert.equal(newerRuntime(value,current),false);
});
test('private-port worker discovery is bounded, including legacy workers and invalid replies',async()=>{
  assert.equal(await readWorkerVersion({postMessage(message,[port]){assert.equal(message.type,'IRONROOT_RUNTIME_VERSION');port.postMessage({type:message.type,version:next});}}),next);
  assert.equal(await readWorkerVersion({postMessage(_,[port]){port.postMessage({type:'other',version:next});}}),null);
  assert.equal(await readWorkerVersion({postMessage(){}},{timeoutMs:5}),null);
  assert.equal(await readWorkerVersion(null),null);
});
test('discovery never saves, pauses or reloads; explicit apply requires the guard',async()=>{
  const h=harness();h.controller.start();await turn();await h.change();
  assert.equal(h.controller.state().available,true);assert.equal(h.reloads,0);assert.equal(h.saves,0);
  assert.equal(await h.controller.apply(),true);assert.equal(h.reloads,1);assert.equal(h.saves,1);
  h.controller.stop();
});
test('failed saving leaves the update retryable and never claims an updated page',async()=>{
  let safe=false, reloads=0;const h=harness({prepareReload:()=>({ok:safe,message:'Retain this battle'}),reload(){reloads++;}});
  h.controller.start();await h.change();assert.equal(await h.controller.apply(),false);
  assert.equal(reloads,0);assert.equal(h.controller.state().pending,false);assert.equal(h.controller.state().message,'Retain this battle');
  safe=true;assert.equal(await h.controller.apply(),true);assert.equal(reloads,1);h.controller.stop();
});
test('the save guard sees the latest battle state after an asynchronous worker check',async()=>{
  const h=harness();h.controller.start();await h.change();
  const gate=deferred();let paused=true, reloads=0;
  const container=h.serviceWorker;
  // Discover readiness with the ordinary controller, then delay only Apply's probe.
  let reads=0;const delayed=createRuntimeUpdate({serviceWorker:container,version:current,
    readVersion:async()=>++reads<=2?next:gate.promise,prepareReload:()=>({ok:paused}),reload(){reloads++;}});
  delayed.start();await turn();
  const pending=delayed.apply();paused=false;gate.resolve(next);
  assert.equal(await pending,false);assert.equal(reloads,0);delayed.stop();h.controller.stop();
});
test('page departure cancels a pending action and duplicate clicks cannot reload twice',async()=>{
  const gate=deferred();let reads=0,reloads=0;
  const h=harness({readVersion:async()=>++reads<=2?next:gate.promise,reload(){reloads++;}});
  h.controller.start();await turn();const pending=h.controller.apply();
  assert.equal(await h.controller.apply(),false);h.controller.stop();gate.resolve(next);
  assert.equal(await pending,false);assert.equal(reloads,0);
});
test('a controller replacement during Apply requires another explicit attempt',async()=>{
  const gate=deferred();let hold=false;
  const h=harness({readVersion:worker=>hold?gate.promise:Promise.resolve(worker?.version)});
  h.controller.start();await h.change();hold=true;const pending=h.controller.apply();
  h.serviceWorker.controller={version:next};h.serviceWorker.dispatchEvent(new Event('controllerchange'));
  gate.resolve(next);assert.equal(await pending,false);assert.equal(h.saves,0);assert.equal(h.reloads,0);
  hold=false;assert.equal(await h.controller.apply(),true);assert.equal(h.reloads,1);h.controller.stop();
});
test('a restored page cannot be reloaded by its departed lifetime’s pending action',async()=>{
  const gate=deferred();let hold=false;
  const h=harness({readVersion:worker=>hold?gate.promise:Promise.resolve(worker?.version)});
  h.controller.start();await h.change();hold=true;const pending=h.controller.apply();
  h.controller.stop();hold=false;h.controller.start();await turn();gate.resolve(next);
  assert.equal(await pending,false);assert.equal(h.reloads,0);assert.equal(h.controller.state().pending,false);
  assert.equal(await h.controller.apply(),true);assert.equal(h.reloads,1);h.controller.stop();
});
test('foreground checks are throttled and offline failures do not navigate',async()=>{
  const h=harness();h.controller.start();await turn();assert.equal(h.checks,1);
  await h.controller.check();assert.equal(h.checks,1);h.clock=60001;await h.controller.check();assert.equal(h.checks,2);
  h.serviceWorker.getRegistration=async()=>{throw Error('offline');};h.clock=120002;await h.controller.check();
  assert.equal(h.reloads,0);h.controller.stop();
});

const app=readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');
test('document, package and worker identify the same runtime before discovery',()=>{
  const html=readFileSync(new URL('../dist/index.html',import.meta.url),'utf8');
  const worker=readFileSync(new URL('../dist/service-worker.js',import.meta.url),'utf8');
  const pkg=JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8'));
  assert.equal(html.match(/data-runtime-version="([^"]+)"/)[1],'ironroot-v'+pkg.version);
  assert.equal(worker.match(/const VERSION = '([^']+)'/)[1],'ironroot-v'+pkg.version);
});
const begin=app.indexOf('function prepareRuntimeReload()'),end=app.indexOf("\nif ('serviceWorker' in navigator",begin);
assert.ok(begin>=0&&end>begin);
function safety() {
  const game=new Game({ai:false,rulesetId:'frontier-citadel-open'}),data=new Map();let fail=false;
  const backend={getItem:key=>data.get(key)??null,setItem(key,value){if(fail)throw Error('quota');data.set(key,value);},removeItem:key=>data.delete(key)};
  const session=createSaveSession(createStorage(()=>backend),'battle');session.claim();
  const context={started:true,paused:true,game,objectiveOutcome:null,recoveryHold:null,profileGate:null,pendingFinalizeOutcome:null,
    profileSession:{status:()=>({canWrite:true})},battleSession:session,progressDirty:false,
    persistProgress:()=>true,retryHistorySave(){},retryPreferences(){},historySession:{pendingCount:()=>0},preferenceSession:{dirty:()=>false},
    save:()=>writeBattle(session,'battle',game,null,null)};
  runInNewContext(app.slice(begin,end),context);
  return {context,game,data,set fail(value){fail=value;}};
}
test('real guard checkpoints an actual paused battle and quota failure retains previous bytes',()=>{
  const h=safety();assert.equal(h.context.prepareRuntimeReload().ok,true);const before=h.data.get('battle');
  h.game.update(.25);h.fail=true;assert.equal(h.context.prepareRuntimeReload().ok,false);assert.equal(h.data.get('battle'),before);
  h.fail=false;assert.equal(h.context.prepareRuntimeReload().ok,true);assert.notEqual(h.data.get('battle'),before);
});
for(const [name,change] of [
  ['running battle',c=>c.paused=false],['recovery hold',c=>c.recoveryHold={}],['profile replacement',c=>c.profileGate={}],
  ['incomplete import',c=>c.pendingFinalizeOutcome='restored'],['unavailable profile',c=>c.profileSession.status=()=>({canWrite:false})],
  ['stale battle',c=>c.battleSession.status=()=> 'stale'],['pending history',c=>c.historySession.pendingCount=()=>1],
  ['pending preferences',c=>c.preferenceSession.dirty=()=>true],['pending progress',c=>{c.progressDirty=true;c.persistProgress=()=>false;}],
])test(`real guard blocks reload with ${name}`,()=>{
  const h=safety();change(h.context);assert.equal(h.context.prepareRuntimeReload().ok,false);assert.equal(h.data.size,0);
});
test('ownership loss during final checkpoint verification blocks reload',()=>{
  const h=safety();h.context.save=()=>{h.context.profileSession.status=()=>({canWrite:false});return true;};
  assert.equal(h.context.prepareRuntimeReload().ok,false);
});
