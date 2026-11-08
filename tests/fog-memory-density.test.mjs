import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, buildSites } from '../dist/engine.js';
import { FOG_SKIRMISH_RULESET_ID, observe, refreshFog } from '../dist/fog.js';
import { FogRenderer, observationFacade, observationHUD, layoutMemoryBadges } from '../dist/fog-view.js';
import { installCanvas, makeRenderer, styledCalls, digest } from './renderer-canvas.mjs';
const ui = { paused: true, selected: null, build: null, spell: false, pointer: null };
const overlap = (a,b) => a.x < b.x+b.width && a.x+a.width > b.x && a.y < b.y+b.height && a.y+a.height > b.y;
function dense(sites = [['sanctum',1950,450],['archery',2090,450],['foundry',2230,450],['aerie',2370,450]]) {
 const g=new Game({rulesetId:FOG_SKIRMISH_RULESET_ID,mapId:'classic',ai:false,seed:321});g.state.gold[1]=10000;
 for(const [type,x,y] of sites){assert.ok(buildSites(g.map,1).some(p=>p.x===x&&p.y===y));const receipt=g.build(type,x,y,1);assert.equal(receipt.ok,true,receipt.reason);g.state.units.push({id:g.nextId++,type:'warrior',side:0,x,y,lane:g.map.lanes.indexOf(y),hp:180,maxHp:180,level:1,flying:false,cooldown:0,attack:0});}
 g.state.time=125;refreshFog(g);g.state.units=[];refreshFog(g);return g;
}
function draw(view,width=1139,height=398,camera=2200,zoom=1){
 installCanvas();const r=makeRenderer(FogRenderer,width,height);r.zoom=zoom;r.resize();r.camera=camera;r.clampCamera();r.canvas.reset();r.mini.reset();r.draw(view,ui,0);
 const layout=layoutMemoryBadges(view,{width:r.width,height:r.height,scale:r.scale,project:(x,y)=>r.worldToScreen(x,y),measure:text=>text.length*7});return {r,layout};
}
function safe({r,layout}){
 const badges=layout.map(g=>g.badge).filter(Boolean);
 for(const b of badges){assert.ok(b.x>=4&&b.x+b.width<=r.width-64);assert.ok(b.y>=84&&b.y+b.height<=r.height-90);for(const g of layout)assert.equal(overlap(b,g.rect),false);for(const other of badges)if(b!==other)assert.equal(overlap(b,other),false);}
 const painted=styledCalls(r.canvas,'fillRect').filter(c=>c.style==='#122720f2');assert.equal(painted.length,badges.length);
 assert.equal(r.canvas.depth(),0);assert.equal(r.mini.depth(),0);return badges;
}
test('real snapped adjacent sites retain all true glyphs and admit only unobscured badges',()=>{
 const view=observationFacade(observe(dense()));const result=draw(view);assert.equal(view.fog.memories.length,4);assert.equal(result.layout.length,4);
 const badges=safe(result);assert.ok(badges.length>0&&badges.length<4,'crowded full badges fall back honestly');
 const glyphRects=styledCalls(result.r.canvas,'strokeRect','strokeStyle').filter(c=>c.style==='#d4cec0');assert.equal(glyphRects.length,4);
 for(let i=0;i<4;i++)assert.deepEqual(glyphRects[i].args,[result.layout[i].rect.x,result.layout[i].rect.y,result.layout[i].w,result.layout[i].h]);
 const details=observationHUD(view).memoryDetails;assert.equal(details.length,4);for(const text of details){assert.match(text,/Last seen .*level 1, at 2:05/);assert.match(text,/Road 2, position/);assert.match(text,/Current health and production unknown/);}
});
test('edge, multi-road and short-field layouts never clip admitted badges or cover later glyphs',()=>{
 const fixtures=[dense([['watchtower',2090,450],['barracks',2230,450]]),dense([['sanctum',2510,260],['archery',2650,260]]),dense([['sanctum',2090,260],['archery',2230,260],['watchtower',2090,450],['barracks',2230,450],['foundry',2090,640],['aerie',2230,640]])];
 for(const g of fixtures)for(const [w,h]of[[1139,398],[390,350],[844,220],[320,125]])for(const zoom of[.7,1,1.7])for(const camera of[1362.185929,2200,2591.428571,3000])safe(draw(observationFacade(observe(g)),w,h,camera,zoom));
 const short=draw(observationFacade(observe(fixtures[2])),320,125,2200);assert.equal(short.layout.filter(g=>g.badge).length,0);assert.ok(short.layout.length);assert.equal(observationHUD(observationFacade(observe(fixtures[2]))).memoryDetails.length,6);
});
test('hidden upgrades, damage and sales cannot change badge decisions, text, glyphs, minimap or accessible details',()=>{
 const g=dense(),before=observationFacade(observe(g));for(const b of g.state.buildings.filter(b=>b.side===1)){b.level=3;b.hp=17;b.progress=.99;}g.state.buildings=g.state.buildings.filter(b=>b.side!==1);g.state.bases[1].hp=123;g.state.gold[1]=1;refreshFog(g);const after=observationFacade(observe(g));
 assert.deepEqual(after.fog.memories,before.fog.memories);assert.deepEqual(observationHUD(after),observationHUD(before));const a=draw(before),b=draw(after);assert.deepEqual(a.layout,b.layout);assert.equal(digest(a.r.canvas.calls),digest(b.r.canvas.calls));assert.equal(digest(a.r.mini.calls),digest(b.r.mini.calls));
});
test('label layout is deterministic without mutating the observation and ignores incoming record order',()=>{
 const view=observationFacade(observe(dense())),original=JSON.stringify(view),a=draw(view);const shuffled={...view,fog:{...view.fog,memories:[...view.fog.memories].reverse()}},b=draw(shuffled);assert.equal(JSON.stringify(view),original);assert.deepEqual(a.layout,b.layout);assert.deepEqual(observationHUD(view).memoryDetails,observationHUD(shuffled).memoryDetails);
});

test('separate dense QA sequence uses legal sites and preserves hidden-state identity through replacement',async()=>{
 const {denseScene,DENSE_LAYOUTS}=await import('../qa/fog-prototype/dense-scenarios.js');
 for(const name of Object.keys(DENSE_LAYOUTS)){
  const current=denseScene(name,0),stale=denseScene(name,1),hidden=denseScene(name,2),empty=denseScene(name,3),replacement=denseScene(name,4),again=denseScene(name,5);
  assert.equal(current.fog.memories.length,0);assert.ok(current.state.buildings.some(b=>b.side===1));assert.equal(stale.fog.memories.length,DENSE_LAYOUTS[name].length);assert.deepEqual(hidden.fog.memories,stale.fog.memories);assert.equal(empty.fog.memories.length,0);assert.equal(again.fog.memories.length,DENSE_LAYOUTS[name].length);assert.ok(again.fog.memories.every(m=>m.type==='barracks'&&m.observedAt===170));assert.equal(replacement.fog.memories.length,0);
 }
});
