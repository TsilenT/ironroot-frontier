import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {createSaveSession,createStorage} from '../dist/persistence.js';

// Execute the actual app event handler against real save sessions. Event order
// is controlled here; this does not claim a particular native delivery frequency.
const app=readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');
const start=app.indexOf("window.addEventListener('storage', (event) => {");
const end=app.indexOf('new ResizeObserver(',start);
assert.ok(start>=0&&end>start);
const SAVE='ironroot.battle.v1';
function harness(){
  const data=new Map([[SAVE,'old checkpoint']]);
  const storage=createStorage(()=>({getItem:key=>data.get(key)??null,
    setItem:(key,value)=>data.set(key,value),removeItem:key=>data.delete(key)}));
  const a=createSaveSession(storage,SAVE),b=createSaveSession(storage,SAVE);
  a.claim();b.claim();
  let handler;const effects=[];
  const c={window:{addEventListener(type,fn){assert.equal(type,'storage');handler=fn;}},
    syncProfileSafety(){},PROFILE_MARKER_KEY:'profile',recoveryHold:false,profileGate:false,
    SAVE,battleSession:b,started:true,paused:false,game:{state:{winner:null}},objectiveOutcome:null,
    setCompactBuildOpen:()=>effects.push('close-build'),
    $:()=>({classList:{remove:()=>effects.push('pause-veil')}}),
    pauseControl:()=>effects.push('resume-control'),toast:()=>effects.push('warning'),
    updateResume:()=>effects.push('update-resume')};
  runInNewContext(app.slice(start,end),c);
  return {a,b,c,data,effects,removal:()=>handler({key:SAVE,oldValue:'old checkpoint',newValue:null})};
}

for(const order of ['before','after'])test(`removed checkpoint event ${order} explicit newer claim preserves that new claim`,()=>{
  const h=harness();assert.equal(h.a.remove(),true);
  if(order==='before'){
    h.removal();assert.equal(h.b.status(),'stale');assert.equal(h.c.paused,true);
    h.c.paused=false;h.effects.length=0;
  }
  assert.equal(h.b.claim(),true);
  assert.equal(h.b.set(SAVE,'different new checkpoint'),true);
  if(order==='after')h.removal();
  assert.equal(h.b.status(),'current');assert.equal(h.c.paused,false);
  assert.deepEqual(h.effects,[]);
  assert.equal(h.b.set(SAVE,'new attempt advanced'),true);
  assert.equal(h.data.get(SAVE),'new attempt advanced');
});

test('queued removal fences an old claim after an identical opening is re-saved',()=>{
  const h=harness();assert.equal(h.a.remove(),true);
  assert.equal(h.a.set(SAVE,'old checkpoint'),true);
  assert.equal(h.b.status(),'current');h.removal();
  assert.equal(h.b.status(),'stale');assert.equal(h.c.paused,true);
  assert.ok(h.effects.includes('warning'));
  assert.equal(h.b.set(SAVE,'abandoned attempt advanced'),false);
  assert.equal(h.data.get(SAVE),'old checkpoint');
});

test('identical newer claim remains conservatively fenced until explicit re-claim',()=>{
  const h=harness();assert.equal(h.a.remove(),true);
  assert.equal(h.b.claim(),true);assert.equal(h.b.set(SAVE,'old checkpoint'),true);
  h.removal();assert.equal(h.b.status(),'stale');assert.equal(h.c.paused,true);
  assert.equal(h.b.set(SAVE,'unverified advance'),false);
  assert.equal(h.data.get(SAVE),'old checkpoint');
  assert.equal(h.b.claim(),true);assert.equal(h.b.set(SAVE,'explicit resumed advance'),true);
});
