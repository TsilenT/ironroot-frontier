import test from 'node:test';
import {protectedToastTop} from '../dist/mobile-battlefield.js';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const app=readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');
const helper=app.slice(app.indexOf('function positionToast()'),app.indexOf('\nfunction toast(',app.indexOf('function positionToast()')));
function exercise({hidden=false,top=84,height=36}={}){
  const objective={offsetTop:top,offsetHeight:height,classList:{contains:name=>name==='hidden'&&hidden}},toast={style:{top:'123px'}};
  runInNewContext(helper+'\npositionToast();',{$:id=>id==='app'?{classList:{contains:()=>false}}:id==='objectiveHUD'?objective:toast});return toast.style.top;
}
test('confirmation toast sits below actual objective height on every tested layout',()=>{
  for(const [top,height] of [[84,36],[72,51],[72,64],[62,31],[62,57]])assert.equal(exercise({top,height}),`${top+height+8}px`);
});
test('skirmish toast returns to responsive CSS placement when objective is absent',()=>{
  assert.equal(exercise({hidden:true}),'');
  assert.match(app,/function toast\(text\)\s*\{[\s\S]*?positionToast\(\);/);
  assert.match(app,/new ResizeObserver\(positionToast\)\.observe\(\$\('objectiveHUD'\)\)/);
});

test('docked protected objectives do not push a battlefield toast beyond the map',()=>{
  const objective={classList:{contains:()=>false},closest:selector=>selector==='#protectedDock'?{}:null,offsetTop:400,offsetHeight:90};
  const toast={style:{top:'123px'}};
  runInNewContext(helper+'\npositionToast();',{$:id=>id==='app'?{classList:{contains:()=>false}}:id==='objectiveHUD'?objective:toast});
  assert.equal(toast.style.top,'');
});


test('short protected-landscape toast is measured inside the field and above the minimap',()=>{
  for(const [height,mapTop,toastHeight] of [[210,171,34],[220,181,50],[180,141,66]]){
    const toast={offsetHeight:toastHeight,style:{}},fieldTop=57;
    const elements={app:{classList:{contains:name=>name==='protected-landscape'}},
      battle:{getBoundingClientRect:()=>({top:fieldTop,height})},
      mapControls:{getBoundingClientRect:()=>({top:fieldTop+mapTop})},
      objectiveHUD:{offsetTop:400,offsetHeight:120},toast};
    runInNewContext(helper+'\npositionToast();',{$:id=>elements[id],protectedMonitor:null,protectedToastTop});
    const top=parseFloat(toast.style.top);
    assert.ok(top>=8);assert.ok(top+toastHeight<=mapTop-8);
    assert.ok(top+toastHeight<=height);
  }
  assert.match(app,/new ResizeObserver\(\(\) => \{ renderer\.resize\(\); positionToast\(\); syncViewportSafety\(\); \}\)\.observe\(\$\('battle'\)\)/);
});


test('battle-first toast uses canvas bounds rather than the side-rail minimap top',()=>{
  const toast={offsetHeight:34,style:{}},elements={toast,objectiveHUD:{},
    app:{classList:{contains:name=>['protected-mobile','protected-compact'].includes(name)}},battle:{getBoundingClientRect:()=>({top:48,height:212})},
    mapControls:{getBoundingClientRect:()=>({top:160})}};
  runInNewContext(helper+'\npositionToast();',{$:id=>elements[id],protectedMonitor:null,protectedToastTop});
  assert.equal(toast.style.top,'89px');
});
