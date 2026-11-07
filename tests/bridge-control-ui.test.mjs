import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInContext,runInNewContext} from 'node:vm';
import {Game,getRuleset} from '../dist/engine.js';
import {normalizeKeyboardMap} from '../dist/keyboard.js';
import {Renderer} from '../dist/render.js';
import {installCanvas,makeRenderer} from './renderer-canvas.mjs';
import {startupHarness} from './mobile-startup-fixture.mjs';
const app=readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');
const section=(from,to)=>{
  const start=app.indexOf(from),end=app.indexOf(to,start);
  assert.ok(start>=0&&end>start,from);return app.slice(start,end);
};

test('actual preference reader defaults off and preserves both explicit bridge choices and unrelated options',()=>{
  for(const choice of [undefined,false,true]){
    const settings={sound:false,music:false,sfx:true,volume:.37,reducedMotion:true,quality:'low',...(choice===undefined?{}:{skirmishBridgeIncome:choice})};
    const preferences=runInNewContext(section('const preferences = {','let soundOn =')+'\npreferences;',{
      renderer:{reducedMotion:false},preferenceSession:{initial:()=>({value:JSON.stringify(settings)})},normalizeKeyboardMap,
    });
    assert.equal(preferences.skirmishBridgeIncome,choice??false);
    for(const [key,value] of Object.entries(settings))assert.equal(preferences[key],value,key);
  }
});

for(const suffix of ['open','timed'])test(`actual ${suffix} setup binds the opted-in identity and changes do not alter a running battle`,()=>{
  const {c,$}=startupHarness(),saved=[];
  Object.assign(c,{getRuleset,savePreferences(){saved.push({...c.preferences});return true;}});
  c.mode='skirmish';c.preferences.skirmishBridgeIncome=false;
  runInContext(section('function updateSkirmishRules()','for (const button of document.querySelectorAll('),c);
  assert.equal($('skirmishBridgeIncome').checked,false);
  $('skirmishRules').value=`frontier-air-local-${suffix}`;$('skirmishRules').onchange();
  $('skirmishBridgeIncome').checked=true;$('skirmishBridgeIncome').onchange();
  assert.equal(saved.at(-1).skirmishBridgeIncome,true);
  c.start();assert.equal(c.game.ruleset.id,`frontier-citadel-bridge-${suffix}`);
  assert.equal(c.game.ruleset.endgame.forcedDecay,suffix==='timed');
  const same=c.game;
  $('skirmishBridgeIncome').checked=false;$('skirmishBridgeIncome').onchange();
  assert.equal(saved.at(-1).skirmishBridgeIncome,false);assert.equal(c.game,same);
  assert.equal(c.game.ruleset.id,`frontier-citadel-bridge-${suffix}`);
  c.start();assert.equal(c.game.ruleset.id,`frontier-citadel-${suffix}`);
  assert.equal(c.game.state.bridgeControl,undefined);
});

test('enabled HUD keeps total income, separate bridge contribution and non-live accessible ownership; ordinary UI returns',()=>{
  const {c,$}=startupHarness({width:320,height:430});c.mode='skirmish';
  $('skirmishBridgeIncome').checked=true;c.start();
  c.game.state.time=2;c.game.state.bridgeControl.bridges[0].owner=0;c.game.state.income[0]=5+1/6;c.updateHUD();
  assert.equal($('income').textContent,'+5.17 /s');
  assert.equal($('objectiveProgress').textContent,'Bridges +0.17 /s');
  assert.equal($('objectiveTime').textContent,'You 1 · Enemy 0');
  assert.match($('bridgeBattleStatus').textContent,/Road 1: yours, earning/);
  assert.equal($('bridgeBattleStatus').attributes['aria-live'],'off');
  assert.equal($('minimap').attributes['aria-describedby'],'bridgeBattleStatus');
  assert.match($('income').attributes['aria-label'],/including 0.17 from bridges/);
  $('skirmishBridgeIncome').checked=false;c.start();c.updateHUD();
  assert.equal($('objectiveProgress').textContent,'Destroy the enemy citadel.');
  assert.equal($('bridgeBattleStatus').classList.contains('hidden'),true);
  assert.equal($('minimap').attributes['aria-describedby'],undefined);
});

test('new bridge canvas marks physical zones, owner text, capture progress and denied payout without relying on color',()=>{
  installCanvas();const renderer=makeRenderer(Renderer,320,430);
  const game=new Game({rulesetId:'frontier-bridge-open',ai:false});game.state.time=3;
  game.state.bridgeControl.bridges[0]={owner:0,capturing:1,progress:1};
  game.state.bridgeControl.bridges[1]={owner:1,capturing:null,progress:0};
  game.state.units=[{type:'warrior',side:1,x:1600,y:260,hp:180},{type:'gryphon',side:0,x:1600,y:450,hp:125}];
  renderer.canvas.reset();renderer.drawBridgeZones(game);
  const labels=renderer.canvas.calls.filter(c=>c[0]==='fillText').map(c=>c[1]);
  assert.ok(labels.includes('1 YOU'));assert.ok(labels.includes('E → 50%'));
  assert.ok(labels.includes('2 ENEMY'));assert.ok(labels.includes('X BLOCKED'));
  assert.ok(labels.includes('3 UNOWNED'));
  for(const y of game.map.lanes)assert.ok(renderer.canvas.calls.some(c=>JSON.stringify(c)===JSON.stringify(['strokeRect',1495,y-65,210,130])));
  renderer.mini.reset();renderer.drawMinimap(game.state,game);
  const marks=renderer.mini.calls.filter(c=>c[0]==='fillText').map(c=>c[1]);
  assert.deepEqual(marks,['Y→E','EX','—']);
  renderer.canvas.reset();renderer.drawBridgeZones(new Game({rulesetId:'frontier-air-local-open'}));
  assert.equal(renderer.canvas.calls.length,0);
});
