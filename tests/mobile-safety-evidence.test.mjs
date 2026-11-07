// Observer-contract checks only. Supplied fake DOM state is not browser layout
// evidence; the companion Playwright specs must run against the final runtime.
import test from 'node:test';
import assert from 'node:assert/strict';
import {installViewportSafetyWatch} from '../qa/browser/mobile-safety-evidence.mjs';

function watchFixture(run){
 const prior=Object.fromEntries(['window','document','MutationObserver'].map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
 const state={hidden:true,title:'Battle paused for screen size',disabled:true};
 const panel={classList:{contains:name=>name==='hidden'&&state.hidden}},title={get textContent(){return state.title;}},resume={get disabled(){return state.disabled;}};
 const observers=[];
 globalThis.window={};
 globalThis.document={getElementById:id=>({viewportModal:panel,viewportTitle:title,viewportResume:resume})[id]};
 globalThis.MutationObserver=class {
  constructor(callback){this.callback=callback;this.disconnected=false;observers.push(this);}
  observe(target,options){this.target=target;this.options=options;}
  disconnect(){this.disconnected=true;}
 };
 try{run({state,panel,observers,samples:()=>window.__qaViewportSafetySamples});}
 finally{for(const [key,descriptor] of Object.entries(prior))if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}
}

test('viewport watch records the initial snapshot and observes visibility, disable and title changes',()=>watchFixture(({state,panel,observers,samples})=>{
 installViewportSafetyWatch();
 assert.deepEqual(samples(),[{visible:false,title:'Battle paused for screen size',resumeDisabled:true}]);
 assert.equal(observers[0].target,panel);
 assert.deepEqual(observers[0].options,{attributes:true,attributeFilter:['class','disabled'],childList:true,characterData:true,subtree:true});
 state.hidden=false;observers[0].callback();
 assert.equal(samples().at(-1).visible,true);
}));

test('viewport watch preserves an intervening false-ready state even after it becomes blocked again',()=>watchFixture(({state,observers,samples})=>{
 state.hidden=false;installViewportSafetyWatch();
 state.title='Battle ready to resume';state.disabled=false;observers[0].callback();
 state.title='Battle paused for screen size';state.disabled=true;observers[0].callback();
 assert.deepEqual(samples(),[
  {visible:true,title:'Battle paused for screen size',resumeDisabled:true},
  {visible:true,title:'Battle ready to resume',resumeDisabled:false},
  {visible:true,title:'Battle paused for screen size',resumeDisabled:true},
 ]);
 assert.equal(samples().every(sample=>sample.visible&&sample.resumeDisabled&&sample.title==='Battle paused for screen size'),false);
}));

test('a new observation window disconnects the old watcher and starts from current state',()=>watchFixture(({state,observers,samples})=>{
 installViewportSafetyWatch();state.hidden=false;observers[0].callback();
 state.hidden=true;installViewportSafetyWatch();
 assert.equal(observers[0].disconnected,true);assert.equal(observers[1].disconnected,false);
 assert.deepEqual(samples(),[{visible:false,title:'Battle paused for screen size',resumeDisabled:true}]);
 assert.equal(window.__qaViewportSafetyWatch,observers[1]);
}));
