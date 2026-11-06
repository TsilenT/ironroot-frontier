import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Renderer} from '../dist/render.js';
import {CAMPAIGN_MISSIONS,createCampaignMission,getCampaignTargets} from '../dist/campaign.js';
import {installCanvas,makeRenderer} from './renderer-canvas.mjs';
import {inspectMobileGeometry,visibleViewportRect,protectedToastTop} from '../dist/mobile-battlefield.js';
import {layout,css,portrait,token,box} from './mobile-layout-fixture.mjs';

test('one source-derived budget supports short portrait and reviewed landscape with all persistent controls outside the world',()=>{
  assert.deepEqual(['header','dock','navigation'].map(k=>token(portrait,k)),[72,84,96]);
  for(const [w,h,insets]of [[320,430,{}],[667,300,{}],[740,320,{}],[393,659,{}],[920,420,{}],[320,480,{}],[390,500,{}],[320,568,{}],[390,500,{bottom:34}],[568,320,{}],[640,360,{}],[844,390,{}]]){
    const g=layout(w,h,insets);assert.deepEqual(inspectMobileGeometry(g),{safe:true,reason:''},`${w}x${h} ${JSON.stringify(insets)}`);
    installCanvas();const r=makeRenderer(Renderer,g.canvas.width,g.canvas.height);
    for(const mission of CAMPAIGN_MISSIONS.filter(m=>m.protectedTargets.length)){
      const game=createCampaignMission(mission.id);r.setMap(game.map);
      for(const target of getCampaignTargets(game,mission.id).filter(t=>t.kind==='protect')){
        r.camera=target.x;r.clampCamera();const p=r.worldToScreen(target.x,game.map.lanes[target.lane]);
        const label=`${w}x${h} ${mission.id} ${target.type}/${target.lane}`;
        assert.ok(p.y-112*r.scale>=8,label+' top');assert.ok(p.y+50*r.scale<=r.height-8,label+' bottom');
        assert.ok(p.x-64*r.scale>=0&&p.x+64*r.scale<=r.width,label+' horizontal');
        const b=r.worldToScreen(target.x,game.map.lanes[target.lane]-94),radius=9*Math.max(1,Math.min(2,10/(18*r.scale)))*r.scale+.75;
        assert.ok(b.y-radius>=8&&b.y+radius<=r.height-8,label+' badge');
      }
    }
  }
});
// Former 568×300 and 320×440 holds now fit by reclaiming HUD space.
// These negatives retain the same guard with actual undersized world/overflow.
test('insufficient geometry pauses instead of imposing an arbitrary portrait height rule',()=>{
  for(const [w,h,insets]of [[568,240,{}],[568,210,{}],[320,400,{}],[320,430,{bottom:34}],[320,200,{}],[320,160,{}]])assert.equal(inspectMobileGeometry(layout(w,h,insets)).safe,false,`${w}x${h}`);
  assert.equal(inspectMobileGeometry(layout(320,480)).safe,true);
  assert.equal(inspectMobileGeometry(layout(390,500,{bottom:34})).safe,true);
});
test('actual clipped, overlapping or undersized controls are rejected even with enough nominal height',()=>{
  for(const mutate of [g=>g.controls[0].width=40,g=>g.controls[0].left=-1,g=>g.controls[1]={...g.controls[0]},g=>g.controls[0]={...g.canvas,width:44,height:44,right:44,bottom:g.canvas.top+44},g=>g.canvas.height=211]){
    const g=layout(320,480);mutate(g);assert.equal(inspectMobileGeometry(g).safe,false);
  }
  const g=layout(320,480);g.viewport=visibleViewportRect(320,480,{offsetLeft:0,offsetTop:0,width:320,height:460});assert.equal(inspectMobileGeometry(g).safe,false);
  assert.deepEqual(visibleViewportRect(320,480,{offsetLeft:4,offsetTop:20,width:310,height:450}),box(4,20,310,450));
});
test('focus feedback chooses a band clear of originals, including Middle-road protected structures',()=>{
  for(const obstacles of [[{top:17,bottom:69},{top:139,bottom:191}],[{top:78,bottom:130}]]){
    const y=protectedToastTop(228,34,obstacles);assert.ok(y>=8&&y+34<=220);
    for(const o of obstacles)assert.ok(y+34<=o.top-4||y>=o.bottom+4);
  }
});
test('fallback actions stay 44px, explain scrollably, and offline shell includes the inert geometry module',()=>{
  assert.match(css,/\.viewport-pause > section \{[^}]*grid-template-rows: minmax\(0, 1fr\) auto;/);
  assert.match(css,/\.viewport-message \{[^}]*overflow: auto;/);
  assert.match(css,/\.viewport-actions button \{[^}]*min-height: 44px;/);
  assert.match(readFileSync(new URL('../dist/service-worker.js',import.meta.url),'utf8'),/'\.\/mobile-battlefield\.js'/);
});
