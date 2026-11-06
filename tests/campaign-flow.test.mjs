import test from 'node:test';
import assert from 'node:assert/strict';
import { BUILDINGS, Game } from '../dist/engine.js';
import { CAMPAIGN_MISSIONS, INTRO_MISSIONS, createCampaignMission, currentIncome } from '../dist/campaign.js';
import { campaignBuildChoices, campaignCoach, drawCampaignGuidance } from '../dist/campaign-flow.js';

test('new campaigns introduce the roster cumulatively without locking any battle rules', () => {
  assert.deepEqual(campaignBuildChoices('first-watch'), ['barracks', 'archery']);
  assert.deepEqual(campaignBuildChoices('forked-road'), ['barracks', 'archery', 'watchtower', 'mint']);
  for (const mission of CAMPAIGN_MISSIONS) assert.deepEqual(campaignBuildChoices(mission.id), Object.keys(BUILDINGS));
  let previous = [];
  for (const mission of [...INTRO_MISSIONS, ...CAMPAIGN_MISSIONS]) {
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
  for (const mission of [...INTRO_MISSIONS, ...CAMPAIGN_MISSIONS]) {
    for (const option of [{ expanded: true }, { resumed: true }])
      assert.deepEqual(campaignBuildChoices(mission.id, option), Object.keys(BUILDINGS));
  }
  for (const id of [null, 'skirmish', 'constructor', '__proto__'])
    assert.deepEqual(campaignBuildChoices(id), Object.keys(BUILDINGS));
  campaignBuildChoices('first-watch').pop();
  assert.equal(campaignBuildChoices('first-watch').length, 2);
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
  for (const mission of [...INTRO_MISSIONS, ...CAMPAIGN_MISSIONS]) {
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


test('teaching is a fresh-opening choice, not a midbattle or save migration', async () => {
  const {campaignTeaching} = await import('../dist/campaign-flow.js');
  for (const id of ['first-watch','forked-road','emberwatch','three-roads','winter-stores']) {
    assert.ok(campaignTeaching(id));
    assert.equal(campaignTeaching(id,{resumed:true}),null);
    assert.equal(campaignTeaching(id,{completed:true}),null);
  }
  assert.equal(campaignTeaching('emberwatch',{learnedBasics:true}),null);
  for (const id of [null,'constructor','__proto__','stonegate','cold-forge']) assert.equal(campaignTeaching(id),null);
});

test('towers guard in front of production and never quietly recommend an occupied rear fallback', async () => {
  const {recommendCampaignSite} = await import('../dist/campaign-flow.js');
  for (const id of ['first-watch','forked-road','three-roads','emberwatch']) {
    const game=createCampaignMission(id), lane=game.map.startingLane;
    game.state.gold[0]=10000;
    if (!game.state.buildings.some(b=>b.side===0&&b.lane===lane)) assert.ok(game.build('barracks',690,game.map.lanes[lane]).ok);
    assert.ok(game.build('archery',550,game.map.lanes[lane]).ok);
    const before=game.serialize(), hint=recommendCampaignSite(game,'watchtower',lane);
    assert.ok(hint.site.x>690,id);
    assert.equal(game.canBuild('watchtower',hint.site.x,hint.site.y).ok,true);
    assert.match(hint.explanation,/Ahead of/);
    assert.deepEqual(game.serialize(),before);
    assert.ok(game.build('watchtower',hint.site.x,hint.site.y).ok);
    const next=recommendCampaignSite(game,'watchtower',lane);
    assert.notDeepEqual(next.site,hint.site);
  }
  const game=createCampaignMission('first-watch');game.state.gold[0]=10000;
  for (const x of game.map.siteColumns.filter(x=>x>=690)) assert.ok(game.build('barracks',x,450).ok);
  const fallback=recommendCampaignSite(game,'watchtower');
  assert.equal(fallback.site,undefined);assert.match(fallback.reason,/rear tower only guards a fallback/);
});

test('mines shelter behind production, live danger is disclosed, and blocked/poor choices remain optional', async () => {
  const {recommendCampaignSite} = await import('../dist/campaign-flow.js');
  const game=createCampaignMission('emberwatch');game.state.gold[0]=10000;
  assert.ok(recommendCampaignSite(game,'mint').site.x<690);
  const tower=recommendCampaignSite(game,'watchtower',1);
  game.state.units.push({side:1,hp:20,lane:1,x:970});
  const danger=recommendCampaignSite(game,'watchtower',1);
  assert.ok(danger.site.x>690);
  // Fill all safer forward positions to exercise the honest exposure notice.
  for(const x of [830,1110,1250]) assert.ok(game.build('barracks',x,450).ok);
  // Other roads remain available; requesting a full road discloses the change.
  const alternate=recommendCampaignSite(game,'watchtower',1);
  assert.notEqual(alternate.site.lane,1);assert.match(alternate.explanation,/requested road/);
  const independent=createCampaignMission('first-watch');independent.state.gold[0]=10000;
  for(const x of [970,1110,1250]) independent.state.units.push({side:1,hp:20,lane:0,x});
  assert.match(recommendCampaignSite(independent,'watchtower').explanation,/Enemies are already close/);
  const choice=campaignCoach(game,'emberwatch',{build:'foundry'});
  assert.equal(choice.buildType,'foundry');assert.match(choice.text,/Other green sites/);
  assert.ok(game.build('foundry',choice.site.x,choice.site.y).ok);
  assert.equal(campaignCoach(game,'emberwatch').key,'build-archery','a different purchase does not fabricate the suggested action');
});

test('all suggestions survive save restoration and use the actual battle roster and legal costs', async () => {
  const {recommendCampaignSite} = await import('../dist/campaign-flow.js');
  for(const mission of [...INTRO_MISSIONS,...CAMPAIGN_MISSIONS]) {
    const game=createCampaignMission(mission.id), before=game.serialize();
    for(const type of Object.keys(game.buildings)) {
      const hint=recommendCampaignSite(game,type), restored=recommendCampaignSite(Game.restore(before),type);
      assert.deepEqual(hint,restored);
      if(hint.site) assert.equal(game.canBuild(type,hint.site.x,hint.site.y).ok,true,`${mission.id}/${type}`);
    }
    assert.deepEqual(game.serialize(),before);
  }
  const fresh=new Game({rulesetId:'frontier-rootwarden-open'});
  assert.ok(recommendCampaignSite(fresh,'wardenLodge').site);
  assert.equal(recommendCampaignSite(createCampaignMission('first-watch'),'wardenLodge').site,undefined);
});


test('selected production keeps Forked Road guidance on the uncovered road, including alternate producers', () => {
  const game=createCampaignMission('forked-road');
  const first=campaignCoach(game,'forked-road',{build:'barracks'});
  assert.equal(first.site.lane,0);
  const alternate=campaignCoach(game,'forked-road',{build:'archery'});
  assert.equal(alternate.site.lane,0);
  assert.equal(game.build('archery',alternate.site.x,alternate.site.y).ok,true);
  const second=campaignCoach(game,'forked-road',{build:'barracks'});
  assert.equal(second.site.lane,1);
  assert.equal(game.build('barracks',second.site.x,second.site.y).ok,true);
  assert.equal(campaignCoach(game,'forked-road').key,'build-mint');
  assert.equal(campaignCoach(Game.restore(game.serialize()),'forked-road').key,'build-mint');
});
