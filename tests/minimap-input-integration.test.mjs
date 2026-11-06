import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {MAPS} from '../dist/engine.js';
import {createInputScopeGuard} from '../dist/input-scope.js';
const app=readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');
const source=app.slice(app.indexOf("$('minimap').addEventListener("),app.indexOf("window.addEventListener('keydown'",app.indexOf("$('minimap').addEventListener(")));
function minimap(width=3200){
  const listeners=new Map(),renderer={camera:450,clamps:0,clampCamera(){this.clamps++;}},rect={left:50,width:216};
  const element={getBoundingClientRect:()=>rect,addEventListener:(name,handler)=>listeners.set(name,handler)};
  const context={$:id=>{assert.equal(id,'minimap');return element;},renderer,game:{map:{width}},follow:true};
  runInNewContext(source,context);return {listeners,renderer,rect,context};
}
test('minimap uses native click, not press-down, for touch targeting and guarded release activation',()=>{
  const map=minimap();assert.deepEqual([...map.listeners.keys()],['click']);
  assert.equal(map.renderer.camera,450);assert.equal(map.context.follow,true);
  map.listeners.get('click')({clientX:map.rect.left+map.rect.width*.73});
  assert.equal(map.renderer.camera,3200*.73);assert.equal(map.renderer.clamps,1);assert.equal(map.context.follow,false);
});
test('native minimap edge activation preserves exact geometry for every map width',()=>{
  for(const {width} of Object.values(MAPS)){
    const map=minimap(width);
    for(const x of [1,map.rect.width*.73,map.rect.width-1]){
      map.listeners.get('click')({clientX:map.rect.left+x});
      assert.equal(map.renderer.camera,x/map.rect.width*width);
    }
    assert.equal(map.renderer.clamps,3);
  }
});
test('minimap activation remains suppressible by the shared held-gesture scope guard',()=>{
  const map=minimap(),guard=createInputScopeGuard('battle');
  const pointer={pointerId:1,pointerType:'touch',isPrimary:true};
  const click={...pointer,isTrusted:true,detail:1,clientX:map.rect.left+map.rect.width-1};
  const dispatch=()=>{if(!guard.click(click))map.listeners.get('click')(click);};
  guard.pointerDown(pointer);guard.setScope('result');assert.equal(guard.pointerEnd(pointer),true);dispatch();
  assert.equal(map.renderer.camera,450);assert.equal(map.renderer.clamps,0);
  guard.setScope('battle');guard.pointerDown(pointer);assert.equal(guard.pointerEnd(pointer),false);dispatch();
  assert.equal(map.renderer.clamps,1,'the next fresh contact is immediately usable');
});
