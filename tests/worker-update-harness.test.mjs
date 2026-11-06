// Lifecycle unit tests for the browser harness, not real worker/network proof.
import test from 'node:test';
import assert from 'node:assert/strict';
import {runInNewContext} from 'node:vm';
import {updateAndAwaitController} from '../qa/browser/worker-update-helpers.mjs';
function emitter(extra={}){
  const listeners=new Map();
  return {...extra,addEventListener(name,fn){if(!listeners.has(name))listeners.set(name,new Set());listeners.get(name).add(fn);},removeEventListener(name,fn){listeners.get(name)?.delete(fn);},emit(name){for(const fn of [...(listeners.get(name)||[])])fn();},listenerCount(){return [...listeners.values()].reduce((n,set)=>n+set.size,0);}};
}
function harness(update){
  const old=emitter({state:'activated'}),sw=emitter({controller:old}),timers=new Map();let now=0,id=0,updates=0;
  const registration={async update(){updates++;return update?.(api);}};
  sw.getRegistration=async()=>registration;
  const context={navigator:{serviceWorker:sw},performance:{now:()=>now},setTimeout(fn,ms){const key=++id;timers.set(key,{fn,ms,at:now});return key;},clearTimeout(key){timers.delete(key);}};
  const api={sw,old,timers,registration,clock(value){now=value;},get updates(){return updates;},run(){return runInNewContext('('+updateAndAwaitController.toString()+')({basePath:"/test/",claimTimeoutMs:30000})',context);}};
  return api;
}
const flush=async()=>{for(let i=0;i<8;i++)await Promise.resolve();};
test('slow browser update creates no premature claim deadline or rejected promise',async()=>{
  let finish;const h=harness(()=>new Promise(resolve=>finish=resolve));const result=h.run();await flush();
  assert.equal(h.updates,1);assert.equal(h.timers.size,0);
  h.clock(62000);h.sw.controller=emitter({state:'activated'});finish();
  const timing=await result;assert.equal(timing.updateJobMs,62000);assert.equal(timing.claimAfterUpdateMs,0);
  assert.equal(h.timers.size,0);assert.equal(h.sw.listenerCount(),0);assert.equal(h.sw.controller.listenerCount(),0);
});
test('claim deadline begins after update and waits for activation of a different controller',async()=>{
  const h=harness(api=>api.clock(62000)),result=h.run();await flush();
  assert.equal(h.timers.size,1);assert.equal([...h.timers.values()][0].at,62000);
  const next=emitter({state:'activating'});h.sw.controller=next;h.sw.emit('controllerchange');await flush();assert.equal(h.timers.size,1);
  h.clock(62500);next.state='activated';next.emit('statechange');
  assert.equal((await result).claimAfterUpdateMs,500);assert.equal(h.timers.size,0);assert.equal(h.sw.listenerCount(),0);assert.equal(next.listenerCount(),0);
});
test('a real update rejection does not leave an orphan activation timer',async()=>{
  const h=harness(()=>{throw Error('update failed');});await assert.rejects(h.run(),/update failed/);
  assert.equal(h.timers.size,0);assert.equal(h.sw.listenerCount(),0);
});
test('unchanged controller still fails the bounded post-update claim gate',async()=>{
  const h=harness(),promise=h.run();const rejected=assert.rejects(promise,/after registration.update resolved/);await flush();
  assert.equal(h.timers.size,1);[...h.timers.values()][0].fn();await rejected;
  assert.equal(h.timers.size,0);assert.equal(h.sw.listenerCount(),0);assert.equal(h.old.listenerCount(),0);
});
test('missing prior registration or control cannot be called a successful update',async()=>{
  const h=harness();h.sw.getRegistration=async()=>null;await assert.rejects(h.run(),/No prior worker/);assert.equal(h.updates,0);
  const other=harness();other.sw.controller=null;await assert.rejects(other.run(),/no controlling worker/);assert.equal(other.updates,0);
});
