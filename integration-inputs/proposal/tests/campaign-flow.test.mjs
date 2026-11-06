import test from 'node:test';
import assert from 'node:assert/strict';
import { BUILDINGS, Game } from '../dist/engine.js';
import { CAMPAIGN_MISSIONS, createCampaignMission, currentIncome } from '../dist/campaign.js';
import { campaignBuildChoices, campaignCoach, drawCampaignGuidance } from '../dist/campaign-flow.js';

test('new campaigns introduce the roster cumulatively without locking any battle rules', () => {
  assert.deepEqual(campaignBuildChoices('emberwatch'), ['barracks', 'archery']);
  let previous = [];
  for (const mission of CAMPAIGN_MISSIONS) {
    const choices = campaignBuildChoices(mission.id);
    assert.ok(previous.every(type => choices.includes(type)), mission.id);
    assert.ok(choices.every(type => Object.hasOwn(BUILDINGS, type)));
    previous = choices;
  }
  assert.deepEqual(campaignBuildChoices('cold-forge'), Object.keys(BUILDINGS));
  const game = createCampaignMission('emberwatch');
  assert.equal(game.build('foundry', 410, game.map.lanes[1]).ok, true, 'presentation must not alter Game.build');
});

test('resumed battles and the explicit expanded bar retain every building, including old mission saves', () => {
  for (const mission of CAMPAIGN_MISSIONS) {
    for (const option of [{ expanded: true }, { resumed: true }])
      assert.deepEqual(campaignBuildChoices(mission.id, option), Object.keys(BUILDINGS));
  }
  for (const id of [null, 'skirmish', 'constructor', '__proto__'])
    assert.deepEqual(campaignBuildChoices(id), Object.keys(BUILDINGS));
  campaignBuildChoices('emberwatch').pop();
  assert.equal(campaignBuildChoices('emberwatch').length, 2);
});

test('the opening lesson observes real construction and suggests a valid site behind the starting barracks', () => {
  const game = createCampaignMission('emberwatch');
  const before = game.serialize();
  assert.equal(campaignCoach(game, 'emberwatch').control, '[data-type="archery"]');
  const hint = campaignCoach(game, 'emberwatch', { build: 'archery' });
  assert.equal(game.canBuild('archery', hint.site.x, hint.site.y).ok, true);
  assert.ok(hint.site.x < game.state.buildings.find(b => b.side === 0).x);
  assert.deepEqual(game.serialize(), before, 'guidance cannot spend, place, advance time or alter saves');
  assert.equal(game.build('archery', hint.site.x, hint.site.y).ok, true);
  assert.equal(campaignCoach(game, 'emberwatch').control, '#front');
  const restored = Game.restore(game.serialize());
  assert.deepEqual(campaignCoach(restored, 'emberwatch'), campaignCoach(game, 'emberwatch'));
});

test('hints recover after a destroyed barracks and never ring an unaffordable or occupied site', () => {
  const game = createCampaignMission('emberwatch');
  game.state.buildings = game.state.buildings.filter(b => b.side !== 0);
  assert.equal(campaignCoach(game, 'emberwatch').key, 'build-barracks');
  const hint = campaignCoach(game, 'emberwatch', { build: 'barracks' });
  assert.equal(game.build('barracks', hint.site.x, hint.site.y).ok, true);
  const next = campaignCoach(game, 'emberwatch', { build: 'archery' });
  assert.notDeepEqual(next.site, hint.site);
  game.state.gold[0] = 0;
  assert.equal(campaignCoach(game, 'emberwatch', { build: 'archery' }).site, undefined);
});

test('the economy lesson follows real mines and upgrades instead of claiming unearned completion', () => {
  const game = createCampaignMission('winter-stores');
  const hint = campaignCoach(game, 'winter-stores', { build: 'mint' });
  assert.equal(hint.key, 'build-mint');
  assert.equal(game.build('mint', hint.site.x, hint.site.y).ok, true);
  game.state.gold[0] = 1000;
  while (currentIncome(game) < 15) {
    const next = campaignCoach(game, 'winter-stores');
    assert.ok(next.buildingId);
    assert.equal(campaignCoach(game, 'winter-stores', { selected: next.buildingId }).control, '#upgrade');
    assert.equal(game.upgrade(next.buildingId).ok, true);
  }
  assert.equal(campaignCoach(game, 'winter-stores').key, 'protect');
});

test('contextual hints do not introduce a separate game, mission identity or persisted tutorial state', () => {
  for (const mission of CAMPAIGN_MISSIONS) {
    const game = createCampaignMission(mission.id), before = game.serialize();
    campaignCoach(game, mission.id);
    assert.deepEqual(game.serialize(), before);
    assert.deepEqual(Game.restore(before).serialize(), before);
  }
  assert.equal(campaignCoach(new Game(), null), null);
});

test('guidance rings use the live camera and canvas scale and restore drawing state', () => {
  const game = createCampaignMission('emberwatch'), before = game.serialize(), calls = [];
  const c = Object.fromEntries(['save','setTransform','beginPath','ellipse','stroke','restore'].map(key => [key, (...args) => calls.push([key, ...args])]));
  const renderer = { c, dpr: 2, width: 400, height: 300, scale: .5, camera: 450 };
  drawCampaignGuidance(renderer, game, { coachSite: { x: 550, y: 450 } });
  assert.deepEqual(calls[0], ['save']);
  assert.deepEqual(calls[1], ['setTransform', 2, 0, 0, 2, 0, 0]);
  assert.deepEqual(calls.find(call => call[0] === 'ellipse').slice(1,5), [250,159,33.5,18.5]);
  assert.deepEqual(calls.at(-1), ['restore']);
  assert.deepEqual(game.serialize(), before);
});

