import test from 'node:test';
import assert from 'node:assert/strict';
import {runInContext} from 'node:vm';
import {startupHarness} from './mobile-startup-fixture.mjs';
const handler=h=>runInContext(h.source.slice(h.source.indexOf("$('rally').onclick ="),h.source.indexOf('function pauseControl(')),h.c);
function setup(){const h=startupHarness({width:390,height:650});h.c.mode='skirmish';h.c.start();handler(h);return h;}

test('same spell action refuses unavailable and first-building states without touching engine bytes',()=>{
 const h=setup(),button=h.$('rally');
 for(const state of ['gold','cooldown','teaching','pause']){
  h.c.game.state.gold[0]=state==='gold'?74:420;h.c.game.state.spellCooldown[0]=state==='cooldown'?12.1:0;
  h.c.firstBuildHold=state==='teaching';h.c.paused=state==='pause';h.c.updateRally();
  assert.equal(button.attributes['aria-disabled'],'true');
  assert.equal(h.$('rallyStatus').textContent,({gold:'No gold',cooldown:'13s',teaching:'Build',pause:'Paused'})[state]);
  const before=h.c.game.serialize();button.onclick();assert.deepEqual(h.c.game.serialize(),before);assert.equal(h.c.ui.spell,false);
 }
});
test('arming is free, and armed cancellation remains free after funds become insufficient',()=>{
 const h=setup(),button=h.$('rally'),name=h.$('rallyName'),status=h.$('rallyStatus');
 h.c.updateRally();assert.equal(status.textContent,'Ready');const before=h.c.game.serialize();
 const interruptions=h.log.interruptions;button.onclick();assert.ok(h.log.interruptions>interruptions,'arming retires a pre-existing field gesture');assert.equal(h.c.ui.spell,true);assert.equal(button.attributes['aria-pressed'],'true');assert.equal(status.textContent,'Cancel');assert.deepEqual(h.c.game.serialize(),before);
 h.c.game.state.gold[0]=0;h.c.updateRally();assert.equal(button.attributes['aria-disabled'],'false');const poor=h.c.game.serialize();button.onclick();
 assert.deepEqual(h.c.game.serialize(),poor);assert.equal(h.c.ui.spell,false);assert.equal(button.attributes['aria-pressed'],'false');assert.equal(status.textContent,'No gold');
 assert.equal(name,h.$('rallyName'));assert.equal(status,h.$('rallyStatus'));
});
test('layout transfers one stable spell node and restores desktop card without engine mutation',()=>{
 const h=setup(),button=h.$('rally'),cost=h.$('rallyCost'),before=h.c.game.serialize();
 for(const [width,height,parent] of [[320,430,'battleTools'],[844,390,'battleTools'],[1180,757,'deckBody'],[390,650,'battleTools']]){
  h.resize(width,height);assert.equal(button,h.$('rally'));assert.equal(cost,h.$('rallyCost'));assert.equal(button.parentNode,h.$(parent));assert.deepEqual(h.c.game.serialize(),before);
 }
});

test('recharge changes visible seconds without changing the accessible name each tick',()=>{
 const h=setup(),button=h.$('rally');h.c.game.state.spellCooldown[0]=24.2;h.c.updateRally();
 assert.equal(h.$('rallyStatus').textContent,'25s');const name=button.getAttribute('aria-label');
 h.c.game.state.spellCooldown[0]=23.2;h.c.updateRally();assert.equal(h.$('rallyStatus').textContent,'24s');
 assert.equal(button.getAttribute('aria-label'),name);assert.match(name,/Recharging/);
 h.c.game.state.spellCooldown[0]=0;h.c.updateRally();assert.match(button.getAttribute('aria-label'),/Ready/);
});
