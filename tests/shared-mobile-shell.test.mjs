import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../dist/engine.js';
import { createCampaignMission } from '../dist/campaign.js';
import { CHALLENGES, createChallenge } from '../dist/challenges.js';
import { inspectMobileGeometry } from '../dist/mobile-battlefield.js';
import { startupHarness } from './mobile-startup-fixture.mjs';
import { layout } from './mobile-layout-fixture.mjs';
const cases=[
  {name:'first campaign lesson',mode:'campaign',id:'emberwatch',make:()=>createCampaignMission('emberwatch'),identity:'EASY · MISSION'},
  {name:'field trial',mode:'challenges',id:CHALLENGES[0].id,make:()=>createChallenge(CHALLENGES[0].id),identity:'NORMAL · FIELD TRIAL'},
  {name:'skirmish',mode:'skirmish',id:null,make:()=>new Game({seed:42,ai:false,difficulty:'easy'}),identity:'EASY · SKIRMISH'},
];
function begin(h,scenario,restored=false){
 h.c.mode=scenario.mode;h.c.selectedCampaign=scenario.mode==='campaign'?scenario.id:'emberwatch';h.c.selectedChallenge=scenario.mode==='challenges'?scenario.id:null;
 const game=restored?Game.restore(scenario.make().serialize()):null;
 h.c.start(game,restored&&scenario.mode==='challenges'?scenario.id:null,restored&&scenario.mode==='campaign'?scenario.id:null);return game;
}
for(const scenario of cases)for(const restored of [false,true])test(`${scenario.name} ${restored?'restores':'starts'} with the same dock, Build drawer and measured geometry`,()=>{
 for(const [width,height]of [[320,480],[390,500],[320,568],[568,320],[844,390]]){
  const h=startupHarness({width,height}),game=begin(h,scenario,restored);
  assert.equal(h.c.paused,false,`${width}x${height}`);assert.equal(h.c.viewportPause.active,false);
  assert.equal(h.$('app').classList.contains('protected-mobile'),true);
  assert.equal(h.$('app').classList.contains('mobile-ordinary'),true);
  assert.equal(h.$('objectiveHUD').classList.contains('hidden'),false);
  assert.equal(h.$('objectiveHUD').parentNode,h.$('protectedDock'));
  assert.equal(h.$('objectiveIdentity').textContent,scenario.identity);
  assert.equal(h.c.protectedControls.size,0);assert.equal(h.$('protectedTargets').classList.contains('hidden'),true);
  assert.equal(h.log.measures[0].length,8,'no fake protected controls enter geometry');
  assert.ok(h.log.measures[0].every(r=>r.width>=44&&r.height>=44));
  h.$('compactBuild').onclick();assert.equal(h.$('app').classList.contains('compact-build-open'),true);
  h.$('compactBuild').onclick();assert.equal(h.$('app').classList.contains('compact-build-open'),false);
  if(restored){assert.equal(h.c.game,game);assert.deepEqual(h.c.game.serialize(),scenario.make().serialize());}
 }
});

test('ordinary mobile dock uses its smaller source budget without weakening the visible-world minimum',()=>{
 for(const [width,height]of [[320,480],[390,500],[568,320]]){
  const g=layout(width,height,{protect:false});assert.equal(g.controls.length,8);
  assert.deepEqual(inspectMobileGeometry(g),{safe:true,reason:''});
 }
 assert.equal(layout(320,480,{protect:false}).canvas.height,256);
 assert.equal(inspectMobileGeometry(layout(320,480,{protect:false,bottom:34})).safe,true);
 assert.equal(inspectMobileGeometry(layout(320,430,{protect:false})).safe,false);
 assert.equal(inspectMobileGeometry(layout(568,300,{protect:false})).safe,false);
});

test('all modes pause on insufficient actual geometry and remain paused after growing until explicit Resume',()=>{
 for(const scenario of cases)for(const restored of [false,true]){
  const h=startupHarness({width:568,height:300});begin(h,scenario,restored);
  const before=h.c.game.serialize();assert.equal(h.c.paused,true);assert.equal(h.c.viewportPause.blocked,true);
  h.resize(568,320);assert.equal(h.c.viewportPause.blocked,false);assert.equal(h.c.paused,true);
  assert.deepEqual(h.c.game.serialize(),before);
  h.c.pause(false);assert.equal(h.c.paused,true,'automatic calls cannot resume');
  h.c.pause(false,{explicit:true});assert.equal(h.c.paused,false);assert.equal(h.c.viewportPause.active,false);
  assert.deepEqual(h.c.game.serialize(),before);
 }
});

test('same-page transitions preserve node identity across campaign, protected mission, trial, skirmish and rotation',()=>{
 const h=startupHarness(),ids=['battleTop','battleTools','mapControls','compactBuild','selectionPanel'],nodes=ids.map(h.$);
 for(const scenario of [cases[0],{...cases[0],id:'winter-stores',make:()=>createCampaignMission('winter-stores')},cases[1],cases[2],cases[0]]){
  begin(h,scenario);assert.equal(h.c.paused,false);assert.equal(h.c.viewportPause.active,false);
  assert.deepEqual(ids.map(h.$),nodes);
  const protect=scenario.id==='winter-stores';assert.equal(h.c.protectedControls.size,protect?2:0);
  assert.equal(h.$('protectedTargets').classList.contains('hidden'),!protect);
  h.$('compactBuild').onclick();h.resize(568,320);
  assert.equal(h.$('app').classList.contains('compact-build-open'),false);
  assert.equal(h.$('compactBuild').parentNode,h.$('objectiveHUD'));
  h.resize(320,480);assert.equal(h.$('compactBuild').parentNode,h.$('protectedNavigation'));
  assert.deepEqual(ids.map(h.$),nodes);
 }
});
