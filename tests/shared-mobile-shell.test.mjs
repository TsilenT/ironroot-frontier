import test from 'node:test';
import assert from 'node:assert/strict';
import {runInContext} from 'node:vm';
import { Game, buildBounds, SPELL } from '../dist/engine.js';
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
 for(const [width,height]of [[320,430],[667,300],[740,320],[393,659],[920,420],[320,480],[390,500],[320,568],[568,320],[844,390]]){
  const h=startupHarness({width,height}),game=begin(h,scenario,restored);
  assert.equal(h.c.paused,false,`${width}x${height}`);assert.equal(h.c.viewportPause.active,false);
  assert.equal(h.$('app').classList.contains('protected-mobile'),true);
  assert.equal(h.$('app').classList.contains('mobile-ordinary'),true);
  assert.equal(h.$('objectiveHUD').classList.contains('hidden'),false);
  assert.equal(h.$('objectiveHUD').parentNode,h.$('protectedDock'));
  assert.equal(h.$('objectiveIdentity').textContent,scenario.identity);
  assert.equal(h.c.protectedControls.size,0);assert.equal(h.$('protectedTargets').classList.contains('hidden'),true);
  assert.equal(h.log.measures[0].length,9,'fixed navigation and the objective port are measured without fake protected controls');
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
 assert.equal(layout(320,480,{protect:false}).canvas.height,292);
 assert.equal(inspectMobileGeometry(layout(320,480,{protect:false,bottom:34})).safe,true);
 assert.equal(inspectMobileGeometry(layout(320,430,{protect:false})).safe,true);
 assert.equal(inspectMobileGeometry(layout(568,300,{protect:false})).safe,true);
});

// 568×300 now has a safe full-height world. 568×210 is genuinely too
// short for either sidebar and must retain the identical pause/resume latch.
test('all modes pause on insufficient actual geometry and remain paused after growing until explicit Resume',()=>{
 for(const scenario of cases)for(const restored of [false,true]){
  const h=startupHarness({width:568,height:210});begin(h,scenario,restored);
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
  assert.equal(h.$('compactBuild').parentNode,h.$('protectedNavigation'));
  h.resize(320,480);assert.equal(h.$('compactBuild').parentNode,h.$('protectedNavigation'));
  assert.deepEqual(ids.map(h.$),nodes);
 }
});

// Real production handlers, ordinary paid commands and HUD refresh. This is
// source/Node evidence; click/touch actionability is separately browser-gated.
for(const rulesetId of ['frontier-rootwarden-open','frontier-rootwarden-timed'])test(`${rulesetId} armed placement survives help and the next HUD refresh enables real Cancel, Build and Volley`,()=>{
 for(const [width,height] of [[390,650],[320,568],[844,390]]){
  const h=startupHarness({width,height}),source=h.source;
  h.c.mode='skirmish';h.c.selectedRuleset=rulesetId;h.c.start();
  for(const [from,to]of [['function selectBuild(','function cancel()'],["$('rally').onclick =",'function pauseControl('],['function showHelp()','const mapDescriptions ='],['function activateBattlePoint(','function resetBattleGesture()']])
    runInContext(source.slice(source.indexOf(from),source.indexOf(to,source.indexOf(from))),h.c);
  h.c.buildBounds=buildBounds;h.c.renderer.snap=point=>point;h.c.selectBuild('wardenLodge');h.c.activateBattlePoint({x:550,y:450});
  assert.equal(h.c.ui.build,null,'a successful normal placement finishes the order');
  h.c.selectBuild('wardenLodge');
  assert.equal(h.c.ui.build,'wardenLodge','a distinct order can remain armed through help');
  assert.equal(h.c.game.state.gold[0],210);assert.equal(h.c.game.state.buildings.filter(b=>b.type==='wardenLodge').length,1);
  for(let tick=0;tick<26;tick++)h.c.game.update(.05);
  h.c.pause(true);h.c.updateHUD();h.$('help').onclick();
  const before=h.c.game.serialize();h.$('rally').onclick();assert.deepEqual(h.c.game.serialize(),before,'paused help cannot spend');
  h.$('guideDone').onclick();assert.equal(h.c.paused,true);h.c.pause(false,{explicit:true});assert.equal(h.c.paused,false);
  // Native actions wait for the app's normal enabled refresh rather than
  // abandoning the requested drawer open after one disabled observation.
  h.c.updateHUD();assert.equal(h.$('compactBuild').disabled,false);
  h.$('compactBuild').onclick();assert.equal(h.c.ui.build,null);assert.equal(h.$('app').classList.contains('compact-build-open'),false);
  h.$('compactBuild').onclick();assert.equal(h.$('app').classList.contains('compact-build-open'),true);
  h.c.updateHUD();assert.equal(h.$('app').classList.contains('compact-build-open'),true,'HUD does not spontaneously close an open drawer');
  h.$('rally').onclick();assert.equal(h.c.ui.spell,true);assert.equal(h.$('app').classList.contains('compact-build-open'),false);
  const gold=h.c.game.state.gold[0];h.c.activateBattlePoint({x:690,y:450});
  assert.equal(h.c.game.state.gold[0],gold-SPELL.cost);assert.equal(h.c.game.state.spellCooldown[0],SPELL.cooldown);assert.equal(h.c.ui.spell,false);
 }
});
