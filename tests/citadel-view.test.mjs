import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../dist/engine.js';
import {skirmishRulesetId,citadelStatusText} from '../dist/citadel-view.js';
import {citadelOptionStatus} from '../dist/citadel-options.js';
// Synthetic clock/HP states isolate disclosure; paid histories are browser fixtures.
function viewGame(time=90,timed=false){const g=new Game({ai:false,rulesetId:skirmishRulesetId(timed?'frontier-air-local-timed':'frontier-air-local-open')});g.tick=Math.round(time*20);g.state.time=time;return g;}
test('fresh Skirmish always has choices, independently of bridge and endgame',()=>{
  for(const timed of [false,true])for(const bridge of [false,true]){
    const id=skirmishRulesetId(timed?'frontier-air-local-timed':'frontier-air-local-open',bridge);
    const g=new Game({rulesetId:id});assert.ok(g.state.citadelOptions);
    assert.equal(!!g.state.bridgeControl,bridge);assert.equal(g.ruleset.endgame.forcedDecay,timed);
  }
});
test('availability disclosure starts at time zero and reflects ordinary gold',()=>{
  const g=viewGame(0);assert.equal(g.canBuyCitadelOption('arrows').ok,true);
  assert.match(citadelStatusText(g),/Choose one option/);assert.doesNotMatch(citadelStatusText(g),/available in|1:30/i);
  g.state.gold[0]=189;assert.match(citadelStatusText(g),/Need 190 gold/);
});
test('regen text preserves purchase wait at full health, actual damage wait, paused readiness and decay',()=>{
  const g=viewGame();assert.equal(g.buyCitadelOption('regen').ok,true);assert.match(citadelStatusText(g),/8s remaining/);
  g.state.bases[0].hp=5990;g.state.time=98;g.tick=1960;
  assert.match(citadelStatusText(g,{},{paused:true}),/^$/); // invalid side is never presented as a valid choice
  assert.match(citadelStatusText(g,0,{paused:true}),/Ready to recover/);
  assert.match(citadelStatusText(g),/Recovering/);
  g._damage(g.state.bases[0],1,1);assert.match(citadelStatusText(g),/interrupted.*8s remaining/);
  const timed=viewGame(420,true);timed.state.bases[0].hp=5900;assert.equal(timed.buyCitadelOption('regen').ok,true);
  timed.state.time=428;timed.tick=8560;assert.match(citadelStatusText(timed),/stopped during timed decay/);
  timed.state.bases[0].hp=0;timed.state.winner=1;assert.match(citadelStatusText(timed),/battle ended/);
});
