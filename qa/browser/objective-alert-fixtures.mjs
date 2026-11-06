// Synthetic persistence checkpoints, never human-play or balance evidence.
// All state preparation happens before Resume. Browser tests only use real UI.
import assert from 'node:assert/strict';
import {Game} from '../../dist/engine.js';
import {createCampaignMission, createCampaignProgress, evaluateCampaignMission} from '../../dist/campaign.js';
import {encodeBattle, decodeBattle, scenarioForBattle} from '../../dist/battle-codec.js';
import {createProtectedObjectiveMonitor} from '../../dist/protected-objectives.js';
import {campaignFixture, imminentHit, advanceFixture, validateImminent} from './campaign-fixtures.mjs';

export const ALERT_MISSION = 'winter-stores';
export const ATTACK_DELAY = 4;

export function objectiveAlertFixture(kind = 'critical') {
  assert.ok(['critical', 'delayed', 'loss'].includes(kind));
  const {envelope: initial, progress} = campaignFixture('protected');
  const game = Game.restore(initial.game);
  const north = game.state.buildings.find(b => b.side === 0 && b.type === 'mint' && b.lane === 0);
  assert.ok(north);
  if (kind === 'critical') north.hp = north.maxHp / 4;
  else {
    const health = kind === 'loss' ? 1 : Math.floor(north.maxHp * .3) + 1;
    const hit = imminentHit(game, north, {health});
    game.state.units.find(u => u.id === hit.unitId).cooldown = kind === 'loss' ? 0 : ATTACK_DELAY;
  }
  const fixture = validateImminent(game, {campaignId: ALERT_MISSION, progress, terminal: kind === 'loss'});
  const target = createProtectedObjectiveMonitor(game, ALERT_MISSION).read().find(t => t.originalId === north.id);
  assert.equal(target.label, 'North gold mine');
  assert.equal(target.status, kind === 'delayed' ? 'damaged' : 'critical');

  // Independently decode and let real combat earn the delayed transition. Do
  // not inject a terminal objective, winner, removal or midmatch HP write.
  const proof = decodeBattle(fixture.envelope, {campaignProgress: progress}).game;
  if (kind === 'delayed') {
    while (proof.state.time < ATTACK_DELAY - .1) {
      const outcome = advanceFixture(proof, {campaignId: ALERT_MISSION});
      assert.equal(outcome.failed, false);
      assert.equal(proof.state.buildings.find(b => b.id === north.id).hp, north.hp);
    }
    for (let i = 0; i < 4 && proof.state.buildings.find(b => b.id === north.id).hp === north.hp; i++)
      advanceFixture(proof, {campaignId: ALERT_MISSION});
    assert.ok(proof.state.time >= ATTACK_DELAY && proof.state.time < ATTACK_DELAY + .1);
    assert.ok(proof.state.buildings.find(b => b.id === north.id).hp < north.hp);
  } else if (kind === 'critical') {
    for (let i = 0; i < 140; i++) {
      const outcome = advanceFixture(proof, {campaignId: ALERT_MISSION});
      assert.equal(outcome.failed, false);
      assert.equal(outcome.completed, false);
      assert.equal(proof.state.buildings.find(b => b.id === north.id).hp, north.hp);
    }
  } else {
    const outcome = advanceFixture(proof, {campaignId: ALERT_MISSION});
    assert.equal(outcome.failed, true);
    assert.ok(!proof.state.buildings.some(b => b.id === north.id));
    assert.ok(proof.state.bases.every(base => base.hp > 0));
  }
  const hp = kind === 'delayed' ? proof.state.buildings.find(b => b.id === north.id).hp : north.hp;
  const percent = Math.ceil(hp / north.maxHp * 100);
  return {...fixture, target, expectedHp: hp, expectedPercent: percent,
    message: `Critical health: North gold mine (${percent}% HP).`};
}

export function resumeLabelFixtures() {
  const entries = [];
  for (const [id, title] of [['first-watch', 'FIRST WATCH'], ['forked-road', 'FORKED ROAD']]) {
    const progress = createCampaignProgress();
    if (id === 'forked-road') progress.missions['first-watch'] = {completed: true, stars: 3, bestTime: 60};
    const game = createCampaignMission(id);
    const envelope = encodeBattle(game, scenarioForBattle(null, id), {campaignProgress: progress});
    assert.equal(envelope.version, 3);
    assert.equal(evaluateCampaignMission(game, id).completed, false);
    assert.deepEqual(decodeBattle(envelope, {campaignProgress: progress}).game.serialize(), game.serialize());
    entries.push({envelope, progress, label: `RESUME MISSION · ${title} · 00:00`, authored: true});
  }
  for (const [id, title] of [['frontier-rootwarden-timed', 'SUDDEN DEATH'], ['frontier-rootwarden-open', 'OPEN-ENDED']]) {
    const game = new Game({seed: 719, ai: false, rulesetId: id});
    const envelope = encodeBattle(game, scenarioForBattle());
    assert.equal(envelope.version, 3);
    assert.deepEqual(decodeBattle(envelope).game.serialize(), game.serialize());
    entries.push({envelope, progress: createCampaignProgress(), label: `RESUME BATTLE · ${title} · 00:00`, authored: false});
  }
  return entries;
}
