import { assertHistoricalEngineOracle, readHistoricalProduction } from './engine-validation-source.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { Game } from '../dist/engine.js';
import { CAMPAIGN_MISSIONS, createCampaignMission, getCampaignTargets, evaluateCampaignMission } from '../dist/campaign.js';
import { advanceObjectiveBattle } from '../dist/objectives.js';
import { createProtectedObjectiveMonitor, protectedTargetLabels, protectedLossDetails, observedBattleTime } from '../dist/protected-objectives.js';
const protectedTarget = game => getCampaignTargets(game, 'common-ground').find(target => target.kind === 'protect');

test('all authored protected structures have stable, unique names and immutable read-only health views', () => {
  let count = 0;
  for (const mission of CAMPAIGN_MISSIONS) {
    const game = createCampaignMission(mission.id), before = JSON.stringify(game.serialize());
    const monitor = createProtectedObjectiveMonitor(game, mission.id), view = monitor.read();
    assert.equal(view.length, mission.protectedTargets.length);
    assert.equal(new Set(view.map(target => target.label)).size, view.length);
    assert.ok(Object.isFrozen(view));
    for (const target of view) {
      assert.ok(Object.isFrozen(target));
      assert.equal(target.status, 'healthy');
      assert.equal(target.percent, 100);
      assert.ok(target.hp > 0 && target.maxHp >= target.hp);
      assert.equal(target.loss, null);
      count++;
    }
    monitor.observe();
    assert.equal(JSON.stringify(game.serialize()), before);
  }
  assert.ok(count >= 8);
});

test('Twin Span labels the second road South; Classic has Middle; duplicate sites are distinct without invented lore', () => {
  const game = createCampaignMission('common-ground');
  assert.deepEqual(createProtectedObjectiveMonitor(game, 'common-ground').read().map(target => target.label), ['North gold mine', 'South barracks']);
  assert.deepEqual(protectedTargetLabels([{type:'watchtower', x:410, lane:1}, {type:'watchtower', x:690, lane:1}], 3), ['Middle watchtower · site 410', 'Middle watchtower · site 690']);
  assert.deepEqual(protectedTargetLabels([{type:'mint', x:410, lane:2}], 3), ['South gold mine']);
});

test('critical health uses actual ratio and never claims an attacker; upgrades display current max health', () => {
  const game = createCampaignMission('common-ground'), monitor = createProtectedObjectiveMonitor(game, 'common-ground');
  const building = protectedTarget(game).building;
  building.hp = building.maxHp * .301;
  assert.equal(monitor.observe()[0].status, 'damaged');
  building.hp = building.maxHp * .3;
  assert.equal(monitor.observe()[0].status, 'critical');
  assert.equal(monitor.read()[0].percent, 30);
  assert.equal(game.upgrade(building.id).ok, true);
  assert.equal(monitor.observe()[0].maxHp, building.maxHp);
  assert.equal(monitor.read()[0].status, 'damaged');
  assert.doesNotMatch(JSON.stringify(monitor.read()), /attack|siege|enemy|damageCause/i);
});

test('first missing observation binds the original ID and current tick, never a later replacement', () => {
  const game = createCampaignMission('common-ground'), monitor = createProtectedObjectiveMonitor(game, 'common-ground');
  const target = protectedTarget(game);
  game.state.time = 84.35; game.tick = 1687;
  game.state.buildings = game.state.buildings.filter(building => building.id !== target.originalId);
  const replacement = game.build('mint', target.x, game.map.lanes[target.lane]);
  assert.equal(replacement.ok, true);
  assert.notEqual(replacement.building.id, target.originalId);
  const lost = monitor.observe()[0];
  assert.equal(lost.originalId, target.originalId);
  assert.equal(lost.status, 'lost');
  assert.equal(lost.hp, null);
  assert.deepEqual(lost.loss, {observedAt:84.35, observedTick:1687, scope:'observed-transition'});
  assert.ok(Object.isFrozen(lost.loss));
  assert.match(protectedLossDetails(monitor.read())[0], /North gold mine: original structure lost, first observed at 01:24\.35 battle time/);
  game.state.time = 90; game.tick = 1800;
  monitor.observe();
  assert.equal(monitor.read()[0].loss.observedAt, 84.35);
  assert.equal(evaluateCampaignMission(game, 'common-ground').failed, true);
});

test('already-invalid resumed states preserve unknown historical timing and never manufacture zero HP', () => {
  const game = createCampaignMission('common-ground');
  game.state.time = 99.2; game.tick = 1984;
  const target = protectedTarget(game);
  game.state.buildings = game.state.buildings.filter(building => building.id !== target.originalId);
  const restored = Game.restore(game.serialize());
  const monitor = createProtectedObjectiveMonitor(restored, 'common-ground');
  assert.deepEqual(monitor.read()[0].loss, {observedAt:99.2, observedTick:1984, scope:'already-missing'});
  assert.equal(monitor.read()[0].hp, null);
  assert.match(protectedLossDetails(monitor.read())[0], /missing when this view began at 01:39\.20\. Loss time unknown/);
  assert.throws(() => monitor.observe(game), /one battle/);
});

test('new observations after a healthy resume record a transition without inventing pre-resume history', () => {
  const game = createCampaignMission('common-ground');
  game.state.time = 100; game.tick = 2000;
  const restored = Game.restore(game.serialize()), monitor = createProtectedObjectiveMonitor(restored, 'common-ground');
  const building = protectedTarget(restored).building;
  restored.state.time = 100.05; restored.tick = 2001; building.hp = 0;
  assert.equal(monitor.observe()[0].loss.scope, 'observed-transition');
  assert.equal(monitor.read()[0].loss.observedAt, 100.05);
  assert.match(protectedLossDetails(monitor.read())[0], /01:40\.05/);
});

test('simultaneous protected losses both appear, with no inference about the cause', () => {
  const game = createCampaignMission('common-ground'), monitor = createProtectedObjectiveMonitor(game, 'common-ground');
  for (const target of getCampaignTargets(game, 'common-ground').filter(target => target.kind === 'protect')) target.building.hp = 0;
  const details = protectedLossDetails(monitor.observe());
  assert.equal(details.length, 2);
  assert.match(details[1], /South barracks/);
  assert.doesNotMatch(details.join(' '), /enemy|attacker|siege|destroyed by/);
});

test('observations do not change the engine, RNG or campaign outcome at 1x/2x subdivisions', () => {
  for (const delta of [.05, .2]) {
    const game = createCampaignMission('common-ground'), control = Game.restore(game.serialize());
    const monitor = createProtectedObjectiveMonitor(game, 'common-ground');
    const evaluate = current => { monitor.observe(current); return evaluateCampaignMission(current, 'common-ground'); };
    let observed, expected;
    for (let i = 0; i < 1500; i++) {
      observed = advanceObjectiveBattle(game, delta, evaluate, 300);
      expected = advanceObjectiveBattle(control, delta, current => evaluateCampaignMission(current, 'common-ground'), 300);
      assert.deepEqual(observed, expected);
      if (observed.completed || observed.failed) break;
    }
    assert.deepEqual(game.serialize(), control.serialize());
    if (monitor.read().some(target => target.loss)) {
      const loss = monitor.read().find(target => target.loss).loss;
      assert.equal(loss.observedAt, game.state.time);
      assert.equal(loss.observedTick, game.tick);
    }
  }
});

test('fixed-step observation timestamps match the current failed tick, not the frame start or batch end', () => {
  const game = createCampaignMission('common-ground'), monitor = createProtectedObjectiveMonitor(game, 'common-ground');
  const target = protectedTarget(game), originalUpdate = game.update.bind(game);
  game.update = delta => { originalUpdate(delta); if (game.tick === 2) target.building.hp = 0; };
  const outcome = advanceObjectiveBattle(game, .2, current => { monitor.observe(current); return evaluateCampaignMission(current, 'common-ground'); }, 300);
  assert.equal(outcome.failed, true);
  assert.equal(game.tick, 2);
  assert.deepEqual(monitor.read()[0].loss, {observedAt:.1, observedTick:2, scope:'observed-transition'});
});

test('observed time formatting handles tick rounding and explicitly unknown data', () => {
  assert.equal(observedBattleTime(59.9999999), '01:00.00');
  assert.equal(observedBattleTime(84.3499999999), '01:24.35');
  assert.equal(observedBattleTime(null), 'an unknown battle time');
});

test('historical campaign/combat/objective/save oracle retains its original source pins', () => {
  const baseline = JSON.parse(readFileSync(new URL('../BASELINE_0_11.json', import.meta.url)));
  assertHistoricalEngineOracle();
  for (const file of ['campaign.js','objectives.js','challenges.js','backup.js','profile-session.js','input-scope.js']) {
    const hash = path => createHash('sha256').update(readFileSync(path)).digest('hex');
    assert.equal(createHash('sha256').update(readHistoricalProduction(file)).digest('hex'), baseline.files['dist/'+file], file);
  }
});


test('historical production fixture preserves the corrected persistence and training source oracle', () => {
  const repaired = JSON.parse(readFileSync(new URL('../QA_REPAIR_VALIDATION.json', import.meta.url)));
  for (const file of ['persistence.js', 'training-app.js', 'training.js', 'training.html', 'training.css']) {
    const hash = createHash('sha256').update(readHistoricalProduction(file)).digest('hex');
    assert.equal(hash, repaired.runtime[file], file);
  }
});
