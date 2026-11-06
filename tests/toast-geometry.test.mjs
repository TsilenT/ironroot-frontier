import test from 'node:test';
import assert from 'node:assert/strict';
import {runInNewContext} from 'node:vm';
import {measureToastGeometry,toastGeometryIsSafe} from '../qa/browser/toast-geometry.mjs';
const rect=(left,top,width,height)=>({left,top,width,height,right:left+width,bottom:top+height});
const sample=()=>({toast:rect(80,345.75,230,31),canvas:rect(0,72,390,398),viewport:rect(0,0,390,650),
  objective:rect(0,471,390,83),controls:[{id:'target',...rect(6,507,180,44)},{id:'build',...rect(6,558,56,44)}],
  clips:[{...rect(0,72,390,398),x:true,y:true}],shown:true,objectiveVisible:true,opacity:1});

test('measured phone, landscape and desktop vertical bounds clear bottom dock without requiring below ordering',()=>{
  // Widths are supplied test rectangles, not claimed cloud measurements.
  for(const [top,bottom,fieldTop,fieldBottom,hudTop,hudBottom] of [[345.75,376.75,72,470,471,554],[244.19,275.19,48,330,331,390],[178,220,78,495.42,496.42,554]]){
    const s=sample();s.toast=rect(80,top,230,bottom-top);s.canvas=rect(0,fieldTop,390,fieldBottom-fieldTop);
    s.objective=rect(0,hudTop,390,hudBottom-hudTop);s.controls=[];s.clips=[];
    assert.equal(toastGeometryIsSafe(s),true);assert.equal(s.toast.top>=s.objective.bottom+7,false);
  }
});
test('every required visibility signal rejects hidden, fading or expired feedback',()=>{
  for(const patch of [{shown:false},{objectiveVisible:false},{opacity:0},{opacity:.98},{opacity:NaN}])assert.equal(toastGeometryIsSafe({...sample(),...patch}),false);
});
test('viewport, canvas and ancestor clipping independently reject escaped feedback',()=>{
  for(const mutation of [s=>s.viewport=rect(0,0,390,360),s=>s.canvas=rect(0,72,390,280),s=>s.toast=rect(-.1,345.75,230,31),s=>s.toast=rect(180,345.75,230,31),s=>s.clips=[{...rect(0,72,390,280),x:false,y:true}]]){const s=sample();mutation(s);assert.equal(toastGeometryIsSafe(s),false);}
});
test('objective and each target/navigation control retain at least seven CSS pixels separation',()=>{
  for(const key of ['objective','controls']){
    const s=sample();const obstacle=rect(80,s.toast.bottom+6.99,230,44);
    if(key==='objective')s.objective=obstacle;else s.controls=[obstacle];
    assert.equal(toastGeometryIsSafe(s),false);obstacle.top+=.01;obstacle.bottom+=.01;assert.equal(toastGeometryIsSafe(s),true);
    obstacle.top=s.toast.top;obstacle.bottom=obstacle.top+44;assert.equal(toastGeometryIsSafe(s),false);
  }
});
test('all four separation directions work without removing viewport/field checks',()=>{
  for(const objective of [rect(80,300,230,38.75),rect(80,383.75,230,44),rect(0,345.75,73,31),rect(317,345.75,73,31)]){const s=sample();s.objective=objective;assert.equal(toastGeometryIsSafe(s),true);}
});
test('nonfinite, inverted, absent and inconsistent rectangles cannot pass',()=>{
  assert.equal(toastGeometryIsSafe(null),false);
  for(const key of ['toast','canvas','viewport','objective'])for(const patch of [{left:NaN},{width:0},{height:-1},{right:999}]){const s=sample();Object.assign(s[key],patch);assert.equal(toastGeometryIsSafe(s),false);}
  for(const patch of [{controls:null},{clips:null},{clips:[{...rect(0,0,390,650),x:'yes',y:true}]}])assert.equal(toastGeometryIsSafe({...sample(),...patch}),false);
});

test('sampler measures the inner overflow clip, not its outside border',()=>{
  const node=(bounds,style={})=>({getBoundingClientRect:()=>bounds,getClientRects:()=>[bounds],closest:()=>null,
    getAttribute:()=>null,classList:{contains:()=>true},parentElement:null,style:{display:'block',visibility:'visible',opacity:'1',overflowX:'visible',overflowY:'visible',...style}});
  const s=sample(),toast=node(s.toast),canvas=node(s.canvas),objective=node(s.objective);
  const clip=node(rect(70,330,260,70),{overflowX:'hidden',overflowY:'hidden'});
  Object.assign(clip,{clientLeft:20,clientTop:20,clientWidth:220,clientHeight:30});toast.parentElement=clip;
  const measured=runInNewContext('('+measureToastGeometry.toString()+')()',{
    document:{querySelector:selector=>({'#toast':toast,'#battle':canvas,'#objectiveHUD':objective})[selector],querySelectorAll:()=>[]},
    window:{},innerWidth:390,innerHeight:650,getComputedStyle:node=>node.style,
  });
  assert.equal(measured.clips[0].left,90);assert.equal(measured.clips[0].top,350);
  assert.equal(toastGeometryIsSafe(measured),false,'outside border-box fit must not hide clipped text');
  // clientWidth rounds upward here; the fractional native edge still clips.
  const fractional=node(rect(70,330,240.6,70),{overflowX:'hidden',overflowY:'hidden'});
  Object.assign(fractional,{clientLeft:0,clientTop:0,clientWidth:241,clientHeight:70});
  const fractionalToast=node(rect(80,345.75,230.9,31));fractionalToast.parentElement=fractional;
  const fractionalMeasured=runInNewContext('('+measureToastGeometry.toString()+')()',{
    document:{querySelector:selector=>({'#toast':fractionalToast,'#battle':canvas,'#objectiveHUD':objective})[selector],querySelectorAll:()=>[]},
    window:{},innerWidth:390,innerHeight:650,getComputedStyle:node=>node.style,
  });
  assert.equal(fractionalMeasured.clips[0].right,310.6);
  assert.equal(toastGeometryIsSafe(fractionalMeasured),false,'rounded client width cannot authorize clipped feedback');
  fractional.style.transform='scale(2)';
  const transformed=runInNewContext('('+measureToastGeometry.toString()+')()',{
    document:{querySelector:selector=>({'#toast':fractionalToast,'#battle':canvas,'#objectiveHUD':objective})[selector],querySelectorAll:()=>[]},
    window:{},innerWidth:390,innerHeight:650,getComputedStyle:node=>node.style,
  });
  assert.equal(toastGeometryIsSafe(transformed),false);
});
