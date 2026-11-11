import test from 'node:test';
import assert from 'node:assert/strict';
import {runInContext} from 'node:vm';
import {Game} from '../dist/engine.js';
import {armyCapacityView, defeatFacts} from '../dist/strategy-feedback-view.js';
import {identityOf, scenarioForBattle} from '../dist/battle-codec.js';
import {startupHarness} from './mobile-startup-fixture.mjs';

function fillArmy(game) {
  const building = game.state.buildings.find(b => b.side === 0);
  while (armyCapacityView(game.state).count < 70) game._spawn(building);
  return building;
}

test('the 70-slot explanation matches blocked waves and the actual later replacement wave', () => {
  for (const rulesetId of ['frontier-legacy','frontier-citadel-open','frontier-fog-skirmish-open']) {
    const game = new Game({rulesetId,ai:false});
    const b = fillArmy(game), before = game.serialize(), capacity = armyCapacityView(game.state);
    assert.deepEqual(game.serialize(),before,'view does not drive the game');
    assert.equal(capacity.label,'70/70'); assert.equal(capacity.full,true);
    assert.match(capacity.description,/Missed waves are not stored/);
    game.state.buildings = [b]; b.progress = .999;
    game._step(.05);
    assert.equal(armyCapacityView(game.state).count,70);
    assert.ok(b.progress < .01,'full wave was consumed, not queued');
    game.state.units[0].hp = 0;
    assert.equal(armyCapacityView(game.state).label,'69/70','dead troops free slots');
    game._step(.05);
    assert.equal(armyCapacityView(game.state).count,69,'no immediate replacement when a slot opens');
    for (let ticks = 0; armyCapacityView(game.state).count < 70 && ticks < 190; ticks++) game._step(.05);
    assert.equal(armyCapacityView(game.state).count,70,'a later ordinary wave recruits again');
  }
});

test('capacity reads only living player troops, including support troops and flyers', () => {
  const state = {units:[{side:0,hp:1,type:'rootwarden'},{side:0,hp:1,type:'gryphon'},
    {side:0,hp:0},{side:1,get hp(){throw Error('hidden enemy health must not be read');}}]};
  assert.equal(armyCapacityView(state).label,'2/70');
  assert.equal(armyCapacityView(state).full,false);
});

test('HUD, pause explanation and producer warning follow cap changes without changing the battle', () => {
  const h = startupHarness({width:320,height:568}), game = new Game({ai:false});
  h.c.start(game); h.c.ui.selected = game.state.buildings[0].id;
  fillArmy(game); const before = game.serialize(); h.c.updateHUD();
  assert.equal(h.$('army').textContent,'70/70');
  assert.equal(h.$('army').classList.contains('army-full'),true);
  assert.match(h.$('pauseArmySummary').textContent,/70\/70.*Full/);
  assert.match(h.$('selectionCapacity').textContent,/Missed waves are not stored/);
  assert.equal(h.$('selectionCapacity').classList.contains('hidden'),false);
  assert.deepEqual(game.serialize(),before);
  game.state.units.pop(); h.c.updateHUD();
  assert.equal(h.$('army').textContent,'69/70');
  assert.equal(h.$('army').classList.contains('army-full'),false);
  assert.equal(h.$('armyCapacityStatus').textContent,'');
  assert.equal(h.$('selectionCapacity').classList.contains('hidden'),true);
  h.c.ui.selected = null; h.c.updateHUD();
  assert.equal(h.$('selectionPanel').classList.contains('hidden'),true);
});

test('defeat facts are a read-only final snapshot, with no tactical or concealed roster claims', () => {
  const game = new Game({ai:false}); game.state.gold[0] = 271.9;
  game.state.bases[1].hp = 1432.4; game._spawn(game.state.buildings[0]);
  game.state.units.push({side:1,hp:1,type:'concealed-encounter'});
  const before = game.serialize();
  assert.deepEqual(defeatFacts(game.state),[
    {label:'Enemy citadel HP',value:'1433 / 6000'},
    {label:'Your surviving troops',value:'1'},
    {label:'Your unspent gold',value:'271'},
  ]);
  assert.deepEqual(game.serialize(),before);
});

test('actual result shows facts on defeat, retains the stated outcome, and clears them on victory/draw', () => {
  const h = startupHarness(), c = h.c, game = new Game({ai:false});
  Object.assign(c,{identityOf,scenarioForBattle,finishBattleReport(){},retryHistorySave(){},keepDialogFocus(){},historySession:{retain(){}}});
  c.battleSession.captureResult = () => ({remove(){},status(){return 'current';}});
  const start = h.source.indexOf('function finish()'), end = h.source.indexOf('let pointer =',start);
  runInContext(h.source.slice(start,end),c); c.start(game);
  game.state.bases[0].hp = 0; game.state.bases[1].hp = 1234.2; game.state.winner = 1;
  const before = game.serialize(); c.finish();
  assert.equal(h.$('resultCopy').textContent,'Your citadel fell.');
  assert.equal(h.$('resultEyebrow').textContent,'BATTLE LOST');
  assert.match(h.$('resultFacts').innerHTML,/Enemy citadel HP.*1235 \/ 6000/);
  assert.equal(h.$('resultFacts').classList.contains('hidden'),false);
  assert.deepEqual(game.serialize(),before);
  for (const winner of [0,'draw']) {
    c.resultShown = false; game.state.winner = winner; c.finish();
    assert.equal(h.$('resultFacts').classList.contains('hidden'),true);
    assert.equal(h.$('resultFacts').innerHTML,'');
  }
});
