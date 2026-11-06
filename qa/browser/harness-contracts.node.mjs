// Dependency-free harness tests. Deliberately not *.test/spec.mjs: Playwright
// must not discover Node-only assertions as browser cases.
import test from 'node:test';
import assert from 'node:assert/strict';
import {installCanvasObservation} from './canvas-observation.mjs';
import {openBuildControls,prepareBuildControl} from './shared-build-controls.mjs';
import {Game,MAPS,buildSites} from '../../dist/engine.js';
import {Renderer} from '../../dist/render.js';
import {installCanvas,makeRenderer} from '../../tests/renderer-canvas.mjs';

class TraceContext {
  constructor(id='battle'){this.canvas={id};this.m={a:1,b:0,c:0,d:1,e:0,f:0};this.lineWidth=1;this.strokeStyle='#000';this.fillStyle='#000';this.stack=[];this.calls=[];}
  setTransform(a,b,c,d,e,f){this.m={a,b,c,d,e,f};this.calls.push(['setTransform',a,b,c,d,e,f]);}
  getTransform(){return {...this.m};}
  translate(x,y){this.m.e+=this.m.a*x+this.m.c*y;this.m.f+=this.m.b*x+this.m.d*y;}
  scale(x,y){this.m.a*=x;this.m.b*=x;this.m.c*=y;this.m.d*=y;}
  rotate(theta){const old=this.m,c=Math.cos(theta),s=Math.sin(theta);this.m={...old,a:old.a*c+old.c*s,b:old.b*c+old.d*s,c:old.c*c-old.a*s,d:old.d*c-old.b*s};}
  save(){this.stack.push({m:{...this.m},lineWidth:this.lineWidth,strokeStyle:this.strokeStyle,fillStyle:this.fillStyle});}
  restore(){Object.assign(this,this.stack.pop());}
  moveTo(...args){this.calls.push(['moveTo',...args]);}lineTo(...args){this.calls.push(['lineTo',...args]);}
  stroke(...args){this.calls.push(['stroke',...args]);}fillRect(...args){this.calls.push(['fillRect',...args]);}
  strokeRect(...args){this.calls.push(['strokeRect',...args]);}drawImage(...args){this.calls.push(['drawImage',...args]);}
  fillText(...args){this.calls.push(['fillText',...args]);}
}
function observation(){
  const prior=Object.fromEntries(['window','document','CanvasRenderingContext2D','HTMLCanvasElement'].map(key=>[key,globalThis[key]]));
  globalThis.window={};globalThis.CanvasRenderingContext2D=TraceContext;globalThis.HTMLCanvasElement=class {};
  globalThis.document={createElement:()=>({getContext:()=>new TraceContext('palette')})};
  const restore=installCanvasObservation();
  return {context:new TraceContext(),frame:()=>window.__qaCanvas.battle,close(){restore();for(const [key,value] of Object.entries(prior)){if(value===undefined)delete globalThis[key];else globalThis[key]=value;}}};
}
function site(context,{scale=.32,dpr=2,lineWidth=Math.max(1.5,1/scale),color='#d0e7a67a',width=110,height=110,a=scale*dpr,d=scale*dpr,b=0,c=0}={}){
  context.setTransform(dpr,0,0,dpr,0,0);context.m={a,b,c,d,e:50,f:0};context.lineWidth=lineWidth;context.strokeStyle=color;context.strokeRect(495,395,width,height);
}

test('scale-aware observer recognizes only site geometry/styles and preserves actual draw calls',()=>{
  const observed=observation();try{
    for(const scale of [.32,.3377777777777778,.43333333333333335,.6477777777777778,1,1.123456789])for(const dpr of [1,1.25,1.5,2])for(const color of ['#d0e7a67a','#52644733']){
      site(observed.context,{scale,dpr,color});assert.deepEqual(observed.frame().slots,[[550,450]]);
      assert.deepEqual(observed.context.calls.at(-1),['strokeRect',495,395,110,110]);
      const stroke=observed.frame().slotStrokes[0];assert.ok(Math.abs(stroke.cssStrokeWidth-stroke.expectedCssStrokeWidth)<=1e-6);
    }
    const invalid=[{lineWidth:1.5},{lineWidth:3},{lineWidth:2/.32},{color:'#edf2b4'},{color:'#d0e7a699'},{width:109.9},{height:111},{a:.64,d:.65},{b:.001},{c:.001},{a:-.64,d:-.64}];
    for(const options of invalid){site(observed.context,options);assert.deepEqual(observed.frame().slots,[],JSON.stringify(options));}
    site(observed.context,{lineWidth:(1+.5e-6)/.32});assert.equal(observed.frame().slots.length,1,'sub-micro-pixel native roundoff is accepted');
    site(observed.context,{lineWidth:(1+2e-6)/.32});assert.equal(observed.frame().slots.length,0,'bound is not widened to visible stroke differences');
  }finally{observed.close();}
});

test('actual candidate renderer draws every registered map site and the placement ghost is excluded',()=>{
  for(const mapId of Object.keys(MAPS))for(const height of [288,390,583])for(const dpr of [1,2]){
    installCanvas();globalThis.devicePixelRatio=dpr;
    const renderer=makeRenderer(Renderer,692,height),game=new Game({mapId,ai:false});renderer.setMap(mapId);renderer.canvas.reset();
    renderer.draw(game,{paused:true,build:'archery',pointer:{x:550,y:game.map.lanes[0]},selected:null},0);
    const commands=renderer.canvas.calls,observed=observation();
    try{
      for(const [operation,...args] of commands){
        if(operation==='set')observed.context[args[0]]=args[1];
        else if(typeof observed.context[operation]==='function')observed.context[operation](...args);
      }
      assert.deepEqual(observed.frame().slots,buildSites(game.map,0).map(({x,y})=>[x,y]),`${mapId} height=${height} dpr=${dpr}`);
      assert.equal(observed.frame().slotStrokes.length,game.map.buildLimit);
    }finally{observed.close();}
  }
});

test('minimap observation retains exact supplied paths and viewport coordinates',()=>{
  const observed=observation();try{
    const mini=new TraceContext('minimap');mini.setTransform(2,0,0,2,0,0);mini.moveTo(0,34.125);mini.lineTo(117.75,34.125);mini.stroke();mini.strokeRect(13.236,.75,19.792,42.5);
    assert.deepEqual(window.__qaCanvas.mini.lines,[[[0,34.125],[117.75,34.125]]]);
    assert.deepEqual(window.__qaCanvas.mini.viewport,[13.236,.75,19.792,42.5]);
  }finally{observed.close();}
});

function drawerPage({touch=true,armed=true,enabled=false,exists=true,visible=true,staysDisabled=false}={}){
  const state={armed,enabled,open:false,taps:[],enabledReads:0};
  const button={count:async()=>Number(exists),isVisible:async()=>visible,isEnabled:async()=>{state.enabledReads++;return state.enabled;},getAttribute:async key=>key==='aria-label'?state.armed?'Cancel placement':state.open?'Close building controls':'Open building controls':String(state.open)};
  const activate=async kind=>{
    // Model native locator actionability waiting, not production application state.
    if(!state.enabled){await Promise.resolve();if(staysDisabled)throw Error('Control remains disabled');state.enabled=true;}
    state.taps.push(kind);if(state.armed)state.armed=false;else state.open=!state.open;
  };
  button.tap=()=>activate('tap');button.click=()=>activate('click');
  const target={count:async()=>1,isVisible:async()=>state.open,evaluate:async()=>true};
  return {state,page:{locator:selector=>selector==='#compactBuild'?button:target,evaluate:async()=>touch}};
}
for(const touch of [true,false])test(`${touch?'tap':'click'} helper model waits through pending HUD enable then Cancel and Build expose the command`,async()=>{
  const {page,state}=drawerPage({touch});const handled=await prepareBuildControl(page,'#rally');
  assert.equal(handled,false);assert.equal(state.open,true);assert.equal(state.armed,false);
  assert.deepEqual(state.taps,Array(2).fill(touch?'tap':'click'));assert.equal(state.enabledReads,0,'do not abandon the action after a stale one-shot disabled read');
});
test('permanently disabled Build remains blocked, without forced actions or app-state changes',async()=>{
  const {page,state}=drawerPage({staysDisabled:true});await assert.rejects(()=>openBuildControls(page),/remains disabled/);
  assert.deepEqual(state.taps,[]);assert.equal(state.open,false);assert.equal(state.armed,true);
});
test('desktop or historical pages without a visible mobile drawer require no synthetic action',async()=>{
  for(const config of [{exists:false},{visible:false}]){const {page,state}=drawerPage(config);await openBuildControls(page);assert.deepEqual(state.taps,[]);}
});

test('renderer converts supplied field rectangles to backing pixels on both axes and after resize',()=>{
  // Supplied rectangles test Renderer.resize only, not CSS layout. The real
  // browser orientation case independently checks the 152px rail and field edges.
  const rectangles=[{fieldWidth:1180,fieldHeight:597},{fieldWidth:390,fieldHeight:426},{fieldWidth:320,fieldHeight:344},{fieldWidth:692,fieldHeight:282,viewportWidth:844}];
  for(const dpr of [1,2])for(const {fieldWidth,fieldHeight,viewportWidth} of rectangles){
    installCanvas();globalThis.devicePixelRatio=dpr;
    const renderer=makeRenderer(Renderer,fieldWidth,fieldHeight);
    assert.equal(renderer.canvas.width,Math.round(fieldWidth*dpr));assert.equal(renderer.canvas.height,Math.round(fieldHeight*dpr));
    assert.equal(renderer.width,fieldWidth);assert.equal(renderer.height,fieldHeight);
    if(viewportWidth)assert.notEqual(renderer.canvas.width,Math.round(viewportWidth*dpr),'a wider viewport is not the supplied canvas rectangle');
    renderer.canvas.rect={width:320,height:288};renderer.resize();
    assert.equal(renderer.canvas.width,320*dpr);assert.equal(renderer.canvas.height,288*dpr);
  }
});
