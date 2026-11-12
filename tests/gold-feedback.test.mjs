import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../dist/engine.js';
import {createGoldFeedbackLedger} from '../dist/strategy-feedback-view.js';

test('feedback reports actual paid builds, upgrades and refunds without changing the battle', () => {
  const game = new Game({ai:false,rulesetId:'frontier-citadel-open'});
  game.state.gold[0] = 2000.25;
  const ledger = createGoldFeedbackLedger();
  let before = game.state.gold[0];
  const built = game.build('archery',550,450);
  assert.equal(built.ok,true);
  const snapshot = game.serialize();
  const payment = ledger.record(game,`build:${built.building.id}`,before,game.state.gold[0]);
  assert.equal(payment.text,`−${game.buildings.archery.cost}`);
  assert.equal(payment.kind,'spent');
  assert.deepEqual(game.serialize(),snapshot);
  assert.equal(ledger.record(game,`build:${built.building.id}`,before,game.state.gold[0]),null);
  before = game.state.gold[0];
  const cost = game.upgradeCost(built.building), upgraded = game.upgrade(built.building.id);
  assert.equal(upgraded.ok,true);
  assert.equal(ledger.record(game,`upgrade:${built.building.id}:${built.building.level}`,before,game.state.gold[0]).amount,cost);
  before = game.state.gold[0];
  const sold = game.sell(built.building.id);
  assert.equal(sold.ok,true);
  assert.deepEqual(ledger.record(game,`sell:${built.building.id}`,before,game.state.gold[0]),
    {text:`+${sold.refund}`,kind:'refund',amount:sold.refund});
});

test('separate committed purchases can have the same price; repeated callbacks cannot', () => {
  const ledger = createGoldFeedbackLedger(), game = {};
  assert.equal(ledger.record(game,'build:1',1000.1,880.1).text,'−120');
  assert.equal(ledger.record(game,'build:2',880.1,760.1).text,'−120');
  assert.equal(ledger.record(game,'build:1',1000.1,880.1),null);
  assert.equal(ledger.record({},'build:1',1000,880).text,'−120','new game has its own command identities');
  ledger.reset();
  assert.equal(ledger.record(game,'build:1',1000,880).text,'−120');
});

test('unchanged, invalid and fractional balance observations do not become transaction cues', () => {
  const ledger = createGoldFeedbackLedger(), game = {};
  for (const [before,after] of [[10,10],[10,10.25],[NaN,1],[1,Infinity],[-1,1],[1,-1]])
    assert.equal(ledger.record(game,'build:1',before,after),null);
  assert.equal(ledger.record(null,'build:1',10,0),null);
  assert.equal(ledger.record(game,'',10,0),null);
  assert.equal(ledger.record(game,'build:1',2000,1880).amount,120,'invalid observations do not consume the identity');
});

test('citadel cue uses the one actual purchase and is not repeated by a failed second purchase', () => {
  const game = new Game({ai:false,rulesetId:'frontier-citadel-open'}), ledger = createGoldFeedbackLedger();
  game.state.gold[0] = 1000;
  const before = game.state.gold[0], bought = game.buyCitadelOption('arrows',0);
  assert.equal(bought.ok,true);
  assert.equal(ledger.record(game,'citadel:arrows',before,game.state.gold[0]).amount,190);
  const after = game.state.gold[0];
  assert.equal(game.buyCitadelOption('regen',0).ok,false);
  assert.equal(ledger.record(game,'citadel:regen',after,game.state.gold[0]),null);
});
