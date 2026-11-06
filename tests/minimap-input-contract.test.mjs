import test from 'node:test';
import assert from 'node:assert/strict';
import {minimapActivationTarget} from '../qa/browser/minimap-input-contract.mjs';

function sample({requested={x:244.68,y:0},pointerX=244.6799927,clickX=245,clickY=requested.y,rect={left:87,width:216},mapWidth=3200}={}){
  return {requested,rect,mapWidth,events:['pointerdown','pointerup','click'].map(type=>({
    type,target:'minimap',trusted:true,clientX:type==='click'?clickX:pointerX,clientY:type==='click'?clickY:requested.y,
  }))};
}
test('phone native x observations project the delivered click, not the requested fractional position',()=>{
  for(const mapWidth of [3200,4000,3200]){
    const input=sample({mapWidth}),before=JSON.stringify(input),target=minimapActivationTarget(input);
    assert.equal(target,(245-87)/216*mapWidth);
    assert.ok(Math.abs(target-mapWidth*.73)>3,'the old requested-coordinate oracle incorrectly fails the unchanged three-world-unit camera tolerance');
    assert.ok(Math.abs((target-mapWidth*.73)-.32/216*mapWidth)<1e-10);
    assert.equal(JSON.stringify(input),before,'observation never rewrites or rounds requested/native coordinates');
  }
});
test('passing narrow-phone coordinates preserve exact horizontal projection despite native vertical quantization',()=>{
  const input=sample({requested:{x:206,y:368.40625},pointerX:206,clickX:206,clickY:368,rect:{left:60,width:200}});
  assert.equal(minimapActivationTarget(input),2336);
});
test('native fractional click coordinates remain fractional without assuming a rounding algorithm',()=>{
  const input=sample({clickX:244.125});
  assert.equal(minimapActivationTarget(input),(244.125-87)/216*3200);
  assert.notEqual(minimapActivationTarget(input),(Math.round(244.125)-87)/216*3200);
});
test('both original one-pixel edge requests retain native targeting and exact delivered projection',()=>{
  for(const x of [88,302]){
    const input=sample({requested:{x,y:0},pointerX:x,clickX:x});
    assert.equal(minimapActivationTarget(input),(x-87)/216*3200);
  }
});
test('native event sequence still rejects wrong targets, untrusted events and extra or missing clicks',()=>{
  for(const type of ['pointerdown','pointerup','click']){
    for(const field of [{target:'front'},{trusted:false}]){
      const input=sample();Object.assign(input.events.find(event=>event.type===type),field);
      assert.throws(()=>minimapActivationTarget(input),/one native press\/release\/click/);
    }
  }
  for(const mutate of [events=>events.pop(),events=>events.push({...events[2]}),events=>events.reverse()]){
    const input=sample();mutate(input.events);
    assert.throws(()=>minimapActivationTarget(input),/one native press\/release\/click/);
  }
});
test('pointer coordinates permit only 0.01 CSS-pixel floating-point noise, independently of camera scale',()=>{
  for(const index of [0,1])for(const axis of ['clientX','clientY']){
    const input=sample();input.events[index][axis]=(axis==='clientX'?input.requested.x:input.requested.y)+.010001;
    assert.throws(()=>minimapActivationTarget(input),/maximum 0.01/);
  }
});
test('native click stays within one CSS pixel, including combined x/y drift',()=>{
  const boundary=sample({requested:{x:200,y:0},pointerX:200,clickX:201});
  assert.equal(minimapActivationTarget(boundary),(201-87)/216*3200);
  for(const [dx,dy] of [[1.000001,0],[0,1.000001],[.8,.8]]){
    const input=sample({requested:{x:200,y:0},pointerX:200,clickX:200+dx,clickY:dy});
    assert.throws(()=>minimapActivationTarget(input),/maximum 1\)/);
  }
});
test('nonfinite or invalid observations cannot create a misleading camera target',()=>{
  for(const mutate of [input=>input.mapWidth=0,input=>input.rect.width=0,input=>input.requested.x=NaN,
    input=>input.requested.x=input.rect.left-1,input=>input.events[2].clientX=Infinity]){
    const input=sample();mutate(input);assert.throws(()=>minimapActivationTarget(input));
  }
});
