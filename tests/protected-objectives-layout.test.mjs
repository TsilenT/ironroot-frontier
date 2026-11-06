import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {Renderer} from '../dist/render.js';
import {CAMPAIGN_MISSIONS,createCampaignMission,getCampaignTargets} from '../dist/campaign.js';
import {installCanvas,makeRenderer} from './renderer-canvas.mjs';
const css=readFileSync(new URL('../dist/styles.css',import.meta.url),'utf8');
const app=readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');
const compact=css.slice(css.indexOf('/* Very short protected landscape'));
const metric=name=>Number(compact.match(new RegExp(`--compact-${name}: (\\d+)px;`))[1]);
const header=metric('header'),dock=metric('dock'),rail=metric('rail'),control=metric('control'),gap=metric('gap'),inset=metric('inset');
const box=(left,top,width,height)=>({left,top,right:left+width,bottom:top+height,width,height});
const intersects=(a,b)=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;
function layout(width,height){
  const field=box(0,0,width-rail,height-header-dock),railBox=box(field.width,0,rail,field.height);
  const toolWidth=2*control+gap,toolLeft=railBox.left+(rail-toolWidth)/2;
  const tools=Array.from({length:4},(_,i)=>box(toolLeft+(i%2)*(control+gap),inset+Math.floor(i/2)*(control+gap),control,control));
  const navWidth=rail-2*inset,navLeft=railBox.left+inset,navTop=field.height-inset-(2*control+gap);
  const navColumn=(navWidth-gap)/2;
  const navigation=[box(navLeft+(navColumn-control)/2,navTop,control,control),box(navLeft+navColumn+gap+(navColumn-control)/2,navTop,control,control)];
  const minimap=box(navLeft,navTop+control+gap,navWidth,control);
  return {field,railBox,tools,navigation,minimap,header:box(0,-header,width,header),dock:box(0,field.height,width,dock)};
}
function targetBounds(renderer,target){
  const center=renderer.worldToScreen(target.x,target.y);
  // Conservative envelope for the pinned protected structure models, upgrades,
  // health bars and shadows: x +/-64, y -112..50 world units. The badge is
  // separately expanded to its renderer's scale-dependent screen-pixel size.
  const model=box(center.x-64*renderer.scale,center.y-112*renderer.scale,128*renderer.scale,162*renderer.scale);
  const markerScale=Math.max(1,Math.min(2,10/(18*renderer.scale)));
  const markerRadius=9*markerScale*renderer.scale+.75;
  const badge=renderer.worldToScreen(target.x,target.y-94);
  return {model,badge:box(badge.x-markerRadius,badge.y-markerRadius,markerRadius*2,markerRadius*2)};
}

test('the measured old 568x320 field reproduces clipped originals and Front/Pause overlap',()=>{
  installCanvas();const renderer=makeRenderer(Renderer,568,126);
  const game=createCampaignMission('winter-stores');renderer.setMap(game.map);renderer.camera=410;renderer.clampCamera();
  const targets=getCampaignTargets(game,'winter-stores').filter(t=>t.kind==='protect').map(t=>({...t,y:game.map.lanes[t.lane]}));
  assert.ok(targetBounds(renderer,targets[0]).badge.top<0);
  assert.ok(targetBounds(renderer,targets[1]).model.bottom>126);
  assert.equal(intersects(box(405,62,36,36),box(408,87,34,34)),true);
});

test('CSS budget and the real unchanged renderer keep every original model/badge inside the battle-first canvas',()=>{
  installCanvas();
  assert.deepEqual([header,dock,rail,control,gap,inset],[48,60,152,44,4,8]);
  for(const [width,height] of [[568,320],[640,320],[640,360],[844,320]]){
    const positions=layout(width,height),renderer=makeRenderer(Renderer,positions.field.width,positions.field.height);
    for(const mission of CAMPAIGN_MISSIONS.filter(m=>m.protectedTargets.length)){
      const game=createCampaignMission(mission.id);renderer.setMap(game.map);
      for(const target of getCampaignTargets(game,mission.id).filter(t=>t.kind==='protect')){
        renderer.camera=target.x;renderer.clampCamera();
        for(const [part,bounds] of Object.entries(targetBounds(renderer,{...target,y:game.map.lanes[target.lane]}))){
          const label=`${width}x${height} ${mission.id} ${target.type}/${target.lane} ${part}`;
          assert.ok(bounds.left>=0&&bounds.right<=positions.field.width,label+' horizontal bounds');
          assert.ok(bounds.top>=8&&bounds.bottom<=positions.field.height-8,label+' vertical bounds');
          for(const overlay of [positions.header,positions.dock,...positions.tools,...positions.navigation,positions.minimap])
            assert.equal(intersects(bounds,overlay),false,label+' overlay exclusion');
        }
      }
    }
    assert.equal(renderer.scale,.32,'no sprite/transform shrink to make the geometry pass');
  }
});

test('all six rail buttons retain 44px hit targets, remain separate and never cover the canvas',()=>{
  for(const [width,height] of [[568,320],[640,320],[640,360],[844,320]]){
    const positions=layout(width,height),buttons=[...positions.tools,...positions.navigation];
    for(const button of buttons){
      assert.equal(button.width,44);assert.equal(button.height,44);
      assert.ok(button.top>=8&&button.bottom<=positions.field.height-8);
      assert.equal(intersects(button,positions.field),false);
      assert.equal(intersects(button,positions.minimap),false);
    }
    for(let i=0;i<buttons.length;i++)for(let j=i+1;j<buttons.length;j++)assert.equal(intersects(buttons[i],buttons[j]),false);
    assert.equal(positions.minimap.height,44);
    assert.equal(intersects(positions.minimap,positions.field),false);
  }
  assert.match(compact,/grid-template-columns: minmax\(0, 1fr\) var\(--compact-rail\)/);
  assert.match(compact,/\.protected-compact \.icon-button,[\s\S]*?height: var\(--compact-control\)/);
});

test('native canvas-local pointer coordinates still round-trip through the frozen renderer beside the rail',()=>{
  installCanvas();const positions=layout(568,320),renderer=makeRenderer(Renderer,positions.field.width,positions.field.height);
  const game=createCampaignMission('winter-stores');renderer.setMap(game.map);
  const left=31,top=265;
  const localSource=app.slice(app.indexOf('function localPoint('),app.indexOf("$('battle').addEventListener('pointerdown'"));
  const localPoint=runInNewContext(localSource+'\nlocalPoint',{$:()=>({getBoundingClientRect:()=>({left,top})})});
  for(const target of getCampaignTargets(game,'winter-stores')){
    renderer.camera=target.x;renderer.clampCamera();
    const y=game.map.lanes[target.lane],screen=renderer.worldToScreen(target.x,y);
    const local=localPoint({clientX:left+screen.x,clientY:top+screen.y});
    const world=renderer.screenToWorld(local.x,local.y);
    assert.ok(Math.abs(world.x-target.x)<1e-9);assert.ok(Math.abs(world.y-y)<1e-9);
  }
  assert.match(app,/new ResizeObserver\(\(\) => \{ renderer\.resize\(\); positionToast\(\); syncViewportSafety\(\); \}\)\.observe\(\$\('battle'\)\)/);
});


test('build overlay is anchored to the whole grid rather than the 60px objective row',()=>{
  assert.match(compact,/\.protected-compact \.command-deck \{[^}]*position: absolute;[^}]*grid-area: 1 \/ 1 \/ -1 \/ -1;/);
  assert.match(compact,/right: var\(--compact-rail\);[^}]*bottom: var\(--compact-dock\);[^}]*max-height: calc\(100% - var\(--compact-header\) - var\(--compact-dock\)\)/);
  assert.match(compact,/\.protected-compact\.compact-build-open \.command-deck \{ display: block;/);
});
