import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const app=readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');
const helper=app.slice(app.indexOf('function positionToast()'),app.indexOf('\nfunction toast(',app.indexOf('function positionToast()')));
function exercise({hidden=false,top=84,height=36}={}){
  const objective={offsetTop:top,offsetHeight:height,classList:{contains:name=>name==='hidden'&&hidden}},toast={style:{top:'123px'}};
  runInNewContext(helper+'\npositionToast();',{$:id=>id==='objectiveHUD'?objective:toast});return toast.style.top;
}
test('confirmation toast sits below actual objective height on every tested layout',()=>{
  for(const [top,height] of [[84,36],[72,51],[72,64],[62,31],[62,57]])assert.equal(exercise({top,height}),`${top+height+8}px`);
});
test('skirmish toast returns to responsive CSS placement when objective is absent',()=>{
  assert.equal(exercise({hidden:true}),'');
  assert.match(app,/function toast\(text\)\s*\{[\s\S]*?positionToast\(\);/);
  assert.match(app,/new ResizeObserver\(positionToast\)\.observe\(\$\('objectiveHUD'\)\)/);
});
