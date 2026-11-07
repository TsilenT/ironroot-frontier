import test from 'node:test';
import assert from 'node:assert/strict';
import { runInContext } from 'node:vm';
import { Game, buildBounds } from '../dist/engine.js';
import { createCampaignProgress, createCampaignMission, CAMPAIGN_MISSIONS, ONBOARDING_MISSIONS, createCampaignRestart, getCampaignTargets, evaluateCampaignMission } from '../dist/campaign.js';
import { campaignCoach, campaignTeaching, recommendCampaignSite } from '../dist/campaign-flow.js';
import { advanceObjectiveBattle } from '../dist/objectives.js';
import {inspectMobileGeometry} from '../dist/mobile-battlefield.js';
import { startupHarness } from './mobile-startup-fixture.mjs';

const completed = { completed: true, stars: 1, bestTime: 60 };
const progressFor = count => {
  const progress = createCampaignProgress();
  for (const mission of ONBOARDING_MISSIONS.slice(0, count)) progress.missions[mission.id] = { ...completed };
  return progress;
};
function harness(index = 0, options = {}) {
  const h = startupHarness({ width: 390, height: 650, ...options }), { c, $ } = h;
  const section = (a, b) => h.source.slice(h.source.indexOf(a), h.source.indexOf(b, h.source.indexOf(a)));
  Object.assign(c, {
    campaignProgress: progressFor(index), selectedCampaign: ONBOARDING_MISSIONS[index].id,
    buildBounds, getCampaignTargets, evaluateCampaignMission, advanceObjectiveBattle,
    last: 0, lastProfileCheck: 0, saveTimer: 0, hudTimer: 0, toastTimer: 0,
    updateController() {}, sampleBattleReport() {}, finish() {}, updateAudio() {},
    drawCampaignGuidance() {}, flushProtectedWarnings() {},
    helpWasPaused: false, settingsWasPaused: false, dialogFocus: new Map(), invalidateImportRead() {}, syncSettings() {},
    showRecoverySettings() { c.recoveryShown = true; }, showTitle() { c.titleShown = true; c.started = false; },
  });
  c.renderer.draw = () => {};
  c.renderer.snap = point => point;
  for (const [a, b] of [
    ['function selectBuild(', 'function cancel()'],
    ['function activateBattlePoint(', 'function resetBattleGesture()'],
    ['function showHelp()', 'const mapDescriptions ='],
    ['let settingsWasPaused =', 'function syncSettings()'],
    ['function frame(now)', '\nupdateHUD();\nrequestAnimationFrame(frame);'],
  ]) runInContext(section(a, b), c);
  c.start();
  return { ...h, frame: now => c.frame(now), buy(type, lane = null) {
    const advice = recommendCampaignSite(c.game, type, lane);
    assert.ok(advice.site, advice.reason);
    c.selectBuild(type); c.activateBattlePoint(advice.site); c.cancel();
    return advice.site;
  } };
}

function assertCompleteBuildPrompt(h,open,closed) {
  const {c,$}=h,before=c.game.serialize();
  c.setCompactBuildOpen(false); c.updateCampaignDeck();
  assert.equal(c.ui.build,null);
  assert.equal($('coachText').textContent,closed);
  c.setCompactBuildOpen(true); c.updateCampaignDeck();
  assert.equal($('coachText').textContent,open);
  c.setCompactBuildOpen(false); c.updateCampaignDeck();
  assert.equal($('coachText').textContent,closed);
  assert.deepEqual(c.game.serialize(),before,'reading and toggling Build preserve the actual battle');
}

for (const [index, mission] of ONBOARDING_MISSIONS.entries()) {
  if(index > 0) test(`${mission.name}: real shared-bar building is paid while clock, AI, income and production stay frozen`, () => {
    const h = harness(index), { c, $ } = h;
    assert.equal(c.coachingHold, true); assert.equal(c.paused, false);
    assert.equal($('coachingModal').classList.contains('hidden'), false);
    const initial = c.game.serialize(), records = structuredClone(c.campaignProgress);
    h.frame(1000); h.frame(9000); assert.deepEqual(c.game.serialize(), initial);
    c.selectBuild('barracks'); assert.equal(c.ui.build, null, 'reading dialog blocks battlefield commands');
    $('coachingPlan').onclick();
    const purchases = index === 0 ? [['barracks', 0], ['archery', 0]]
      : index === 1 ? [['wardenLodge', 0], ['archery', 0], ['barracks', 1]]
        : [['archery', 0], ['barracks', 1], ['foundry', 1], ['barracks', 2]];
    let cost = 0;
    for (const [type, lane] of purchases) { h.buy(type, lane); cost += c.game.buildings[type].cost; }
    assert.equal(c.game.state.gold[0], initial.state.gold[0] - cost);
    assert.equal(c.game.state.buildings.filter(b => b.side === 0).length, purchases.length);
    const planned = c.game.serialize(); h.frame(10000); h.frame(90000);
    assert.deepEqual(c.game.serialize(), planned);
    assert.deepEqual(c.campaignProgress, records, 'teaching never fabricates progress');
    assert.equal(c.game.state.time, 0); assert.equal(c.game.state.units.length, 0);
    assert.deepEqual(Object.keys(c.game.buildings), Object.keys(Game.restore(planned).buildings));
    $('coachResume').onclick(); h.frame(90100);
    assert.equal(c.coachingHold, false); assert.ok(c.game.state.time > 0);
    assert.ok(c.game.state.gold[0] > planned.state.gold[0]);
  });

  if(index > 0) test(`${mission.name}: Skip/Start works before spending and completed replays/restores never auto-teach`, () => {
    const h = harness(index), { c, $ } = h;
    const original = c.game.serialize(); $('coachingPlay').onclick();
    assert.equal(c.coachingHold, false); assert.deepEqual(c.game.serialize(), original);
    h.frame(100); assert.ok(c.game.state.time > 0);
    const saved = c.game.serialize(); c.start(Game.restore(saved), null, mission.id);
    assert.equal(c.coachingHold, false); assert.equal($('coachingModal').classList.contains('hidden'), true);
    assert.deepEqual(c.game.serialize(), saved);
    c.campaignProgress.missions[mission.id] = { ...completed }; c.start();
    assert.equal(c.coachingHold, false); assert.equal(c.coachEnabled, false);
    $('coachReplay').onclick(); assert.equal(c.coachingHold, true, 'an explicit request can repeat the lesson');
  });

  test(`${mission.name}: fresh restart repeats only unfinished teaching without changing its active identity`, () => {
    const h = harness(index), { c, $ } = h;
    $('coachingPlan').onclick(); h.buy('barracks', 0);
    const restart = createCampaignRestart(c.game, mission.id);
    const identity = game => [game.schemaVersion, game.map.id, game.map.revision, game.ruleset.id, game.ruleset.revision];
    assert.deepEqual(identity(restart), identity(c.game));
    c.start(restart, null, mission.id, { fresh: true });
    assert.equal(c.coachingHold, true); assert.equal(c.resumedBattle, false);
    assert.equal(c.game.state.time, 0); assert.equal(c.game.state.gold[0], mission.startingGold);
    assert.equal(c.game.state.buildings.filter(b => b.side === 0).length, 0);
    c.campaignProgress.missions[mission.id] = { ...completed };
    c.start(createCampaignRestart(c.game, mission.id), null, mission.id, { fresh: true });
    assert.equal(c.coachingHold, false);
  });
}

test('hiding hints and help/options round trips preserve the teaching hold and do not force a build order', () => {
  const h = harness(1), { c, $ } = h; $('coachingPlan').onclick();
  h.buy('archery', 0); assert.equal(c.game.state.buildings[0].side, 1);
  assert.equal(c.game.state.buildings.filter(b => b.side === 0 && b.type === 'barracks').length, 0);
  const snapshot = c.game.serialize();
  $('toggleCoach').onclick(); assert.equal(c.coachingHold, true); assert.equal(c.coachEnabled, false);
  h.frame(100); assert.deepEqual(c.game.serialize(), snapshot);
  c.showHelp(); assert.equal(c.paused, true); c.hideHelp();
  assert.equal(c.paused, false); assert.equal(c.coachingHold, true);
  c.showSettings({ currentTarget: $('settings') }); assert.equal(c.paused, true);
  assert.equal($('settingsDone').textContent, 'Back to planning');
  assert.equal(c.dialogFocus.get($('settingsModal')), $('settings'), 'Options keeps the original opener through teaching pause');
  c.hideSettings();
  assert.equal(c.paused, false); assert.equal(c.coachingHold, true);
  h.frame(200); assert.deepEqual(c.game.serialize(), snapshot);
  $('coachResume').onclick(); h.frame(300); assert.ok(c.game.state.time > 0);
});

test('visibility, stale storage, profile recovery and simulation safety take precedence over teaching release', () => {
  for (const guard of ['hidden', 'stale', 'recovery', 'profile', 'limit']) {
    const h = harness(), { c, $ } = h; const before = c.game.serialize();
    if (guard === 'hidden') c.document.hidden = true;
    if (guard === 'stale') c.battleSession.status = () => 'stale';
    if (guard === 'recovery') c.recoveryHold = { reason: 'test' };
    if (guard === 'profile') c.profileGate = { reason: 'test' };
    if (guard === 'limit') c.battleSafetyReason = 'Save safety limit';
    $('coachingPlay').onclick(); assert.equal(c.coachingHold, true, guard);
    h.frame(100); assert.deepEqual(c.game.serialize(), before, guard);
    if (guard === 'stale') assert.equal(c.titleShown, true);
    if (guard === 'recovery' || guard === 'profile') assert.equal(c.recoveryShown, true);
  }
});

test('startup on an unusable viewport arms teaching before any tick and never overrides the safety latch', () => {
  const h = harness(0, { width: 568, height: 210 }), { c, $ } = h;
  assert.equal(c.viewportPause.blocked, true); assert.equal(c.coachingHold, true);
  const before = c.game.serialize(); $('coachingPlay').onclick(); h.frame(100);
  assert.equal(c.coachingHold, true); assert.equal(c.paused, true); assert.deepEqual(c.game.serialize(), before);
  h.resize(390, 650); assert.equal(c.viewportPause.blocked, false);
  c.pause(false); assert.equal(c.paused, true); assert.equal(c.coachingHold, true);
  c.pause(false, { explicit: true }); assert.equal(c.viewportPause.active, false);
  assert.equal(c.coachingHold, true); h.frame(200); assert.equal(c.game.state.time, 0);
  h.buy('barracks'); h.frame(300); assert.equal(c.coachingHold,false); assert.ok(c.game.state.time>0);
});

test('opening suggestions use the bound roster, Rootwarden screens, forward towers and real affordability', () => {
  for (let index = 0; index < 3; index++) {
    const h = harness(index), { c, $ } = h; $('coachingPlan').onclick();
    for (const type of ['barracks', 'archery', 'watchtower', 'mint', 'wardenLodge', 'foundry', 'sanctum', 'aerie']) {
      const before = c.game.serialize(), advice = recommendCampaignSite(c.game, type);
      if (!Object.hasOwn(c.game.buildings, type)) { assert.equal(advice.site, undefined); assert.equal(c.game.build(type, 550, c.game.map.lanes[0]).ok, false); }
      if (advice.site) assert.equal(c.game.canBuild(type, advice.site.x, advice.site.y).ok, true);
      assert.deepEqual(c.game.serialize(), before);
    }
  }
  const h = harness(1), { c, $ } = h; $('coachingPlan').onclick();
  const warden = h.buy('wardenLodge', 0);
  const archery = campaignCoach(c.game, 'shield-at-the-fork', { build: 'archery' });
  assert.equal(archery.site.lane, 0); assert.ok(archery.site.x < warden.x);
  const tower = recommendCampaignSite(c.game, 'watchtower', 0); assert.ok(tower.site.x > warden.x);
  const alternate = campaignCoach(c.game, 'shield-at-the-fork', { build: 'barracks' }); assert.equal(alternate.site.lane, 0);
  c.game.state.gold[0] = 0; assert.equal(recommendCampaignSite(c.game, 'watchtower', 0).site, undefined);
  assert.doesNotMatch(recommendCampaignSite(c.game, 'watchtower', 0).reason, /pause|Resume|stopped/);
  c.ui.build = 'watchtower'; c.updateCampaignDeck();
  assert.match($('coachText').textContent, /Time and income are stopped.*Resume/);
  c.pause(false, { explicit: true }); c.updateCampaignDeck();
  assert.doesNotMatch($('coachText').textContent, /pause|Resume|stopped/);
});

for (const [width,height] of [[320,480],[320,568],[390,650],[740,320],[844,390]]) {
  test(`Shield at the Fork assembles its complete mobile mine prompt at ${width}x${height}`, () => {
    const h=harness(1,{width,height}),{c,$}=h;
    $('coachingPlan').onclick();
    for(const [type,lane] of [['wardenLodge',0],['archery',0],['barracks',1]])h.buy(type,lane);
    assert.equal(c.game.state.gold[0],215); assert.equal(c.game.state.time,0);
    assertCompleteBuildPrompt(h,
      'Build a gold mine behind your front line to fund more troop buildings as the battle goes on.',
      'Open Build, then build a gold mine behind your front line to fund more troop buildings as the battle goes on.');
  });

  test(`Forked Road assembles its complete mobile mine and tower prompts at ${width}x${height}`, () => {
    const h=harness(0,{width,height}),{c,$}=h;
    c.campaignProgress.missions['first-watch']={...completed};
    c.start(createCampaignMission('forked-road'),null,'forked-road');
    c.beginCampaignCoaching({manual:true}); $('coachingPlan').onclick();
    assert.equal(c.coachingHold,true);
    h.buy('barracks',0); h.buy('barracks',1);
    assert.equal(c.game.state.gold[0],330);
    assertCompleteBuildPrompt(h,
      'Build a mine behind your troops to add 2.5 gold per second for later reinforcements.',
      'Open Build, then build a mine behind your troops to add 2.5 gold per second for later reinforcements.');
    h.buy('mint');
    assert.equal(c.game.state.gold[0],140); assert.equal(c.game.state.time,0);
    assertCompleteBuildPrompt(h,
      'Place a watchtower ahead of production to fire at nearby enemies, but use marching troops to clear a distant camp.',
      'Open Build, then place a watchtower ahead of production to fire at nearby enemies, but use marching troops to clear a distant camp.');
  });

  test(`Shield at the Fork assembles complete mobile build prompts at ${width}x${height}`, () => {
    const h = harness(1,{width,height}), {c,$} = h;
    $('coachingPlan').onclick();
    const prompts = [
      {
        open: 'Build a Warden lodge toward the front of the north road to train Rootwardens who take hits but deal little damage.',
        closed: 'Open Build, then build a Warden lodge toward the front of the north road to train Rootwardens who take hits but deal little damage.',
      },
      {
        open: 'Place an archery range behind the northern Warden lodge to add damage while the Rootwardens hold the front.',
        closed: 'Open Build, then place an archery range behind the northern Warden lodge to add damage while the Rootwardens hold the front.',
      },
    ];
    for (const [index,prompt] of prompts.entries()) {
      if (index) h.buy('wardenLodge',0);
      const before = c.game.serialize();
      c.setCompactBuildOpen(false); c.updateCampaignDeck();
      assert.equal(c.ui.build,null);
      assert.equal($('coachText').textContent,prompt.closed);
      c.setCompactBuildOpen(true); c.updateCampaignDeck();
      assert.equal($('coachText').textContent,prompt.open);
      c.setCompactBuildOpen(false); c.updateCampaignDeck();
      assert.equal($('coachText').textContent,prompt.closed);
      assert.deepEqual(c.game.serialize(),before,'reading and toggling Build preserve the actual battle');
    }
    assert.equal(c.game.state.gold[0],740-c.game.buildings.wardenLodge.cost);
    assert.equal(c.game.state.time,0);
  });
}

test('earned first lesson suppresses redundant Emberwatch teaching while later income/defense lessons remain optional', () => {
  for (const mission of ONBOARDING_MISSIONS) assert.ok(campaignTeaching(mission.id));
  assert.equal(campaignTeaching('emberwatch', { learnedBasics: true }), null);
  assert.ok(campaignTeaching('three-roads')); assert.ok(campaignTeaching('winter-stores'));
  assert.equal(campaignTeaching('constructor'), null);
});

// Execute the actual keyboard handler, not a hand-authored routing model.
test('Escape closes later teaching into planning, while a visible safety dialog keeps precedence', () => {
  const h = harness(1), { c, $ } = h;
  c.window.addEventListener = (type, handler) => { if (type === 'keydown') c.keydown = handler; };
  runInContext(h.source.slice(h.source.indexOf("window.addEventListener('keydown',"), h.source.indexOf("document.addEventListener('visibilitychange',")), c);
  const key = { code: 'Escape', repeat: false, preventDefault() {} };
  c.keydown(key);
  assert.equal($('coachingModal').classList.contains('hidden'), true);
  assert.equal(c.coachingHold, true); assert.equal(c.paused, false);
  c.setCompactBuildOpen(false); c.beginCampaignCoaching({ manual: true });
  $('viewportModal').classList.remove('hidden');
  c.keydown(key); assert.equal($('coachingModal').classList.contains('hidden'), false);
  assert.equal(c.coachingHold, true);
});

// Actual app transitions and source-derived rectangles. Browser coverage below
// checks these same nodes with native CSS layout and hit testing.
for (const [width,height,insets] of [[320,480,{bottom:34}],[320,568,{}],[390,650,{bottom:34}],[740,320,{left:21,right:21,bottom:21}],[844,390,{}]]) {
  test(`mobile teaching stays outside Build at ${width}x${height}, including hide/show and paid correction`, () => {
    const h = harness(0,{width,height,insets}),{c,$}=h;
    $('coachingPlan').onclick();c.syncViewportSafety();
    assert.equal(c.viewportPause.active,false);
    assert.equal($('campaignTeaching').parentNode,$('app'));
    assert.equal($('app').classList.contains('compact-build-open'),false);
    assert.equal($('campaignCoach').classList.contains('hidden'),false);
    assert.equal($('coachResume').classList.contains('hidden'),true);
    assert.equal(c.firstBuildHold,true);
    assert.match($('coachNext').textContent,/Paused.*Build → Barracks/);
    assert.ok($('battle').getBoundingClientRect().height>=212);
    for(const id of ['toggleCoach']) {
      const r=$(id).getBoundingClientRect();assert.ok(r.height>=44&&r.width>=44);
    }
    const canvas=$('battle').getBoundingClientRect();
    Object.assign(c.renderer,{width:canvas.width,height:canvas.height,scale:Math.max(.32,canvas.height/900)});
    const original=c.game.serialize(),site=recommendCampaignSite(c.game,'barracks').site;
    c.setCompactBuildOpen(true);c.selectBuild('barracks');c.updateHUD();
    assert.equal($('app').classList.contains('compact-build-open'),false);
    assert.match($('coachNext').textContent,/Tap any green site/);
    c.activateBattlePoint({x:3000,y:site.y});
    assert.deepEqual(c.game.serialize(),original,'failed placement spends nothing and allows correction');
    assert.equal(c.ui.build,'barracks');
    c.activateBattlePoint(site);c.updateHUD();
    assert.equal(c.game.state.gold[0],original.state.gold[0]-c.game.buildings.barracks.cost);
    assert.equal($('campaignCoach').classList.contains('hidden'),false);
    c.cancel();c.updateHUD();assert.match($('coachNext').textContent,/Archery/);
    $('toggleCoach').onclick();assert.equal($('campaignCoach').classList.contains('hidden'),true);
    assert.equal($('coachResume').classList.contains('hidden'),true);
    assert.equal($('toggleCoach').attributes['aria-label'],'Show hints');
    const before=c.game.state.time;h.frame(1000);h.frame(4000);assert.ok(c.game.state.time>before);
    assert.equal(c.firstBuildHold,false);assert.equal(c.coachingHold,false);
    $('toggleCoach').onclick();assert.equal($('campaignCoach').classList.contains('hidden'),false);
    assert.equal($('app').classList.contains('compact-build-open'),false);
    h.frame(4100);assert.ok(c.game.state.time>0);
  });
}

test('real protected teaching preserves its full right sidebar at 740x320 and the hold across rotations',()=>{
  const h=harness(0,{width:740,height:320,insets:{bottom:21}}),{c,$}=h;
  c.campaignProgress=h.fixture.progress;c.selectedCampaign='winter-stores';c.start();
  $('coachingPlan').onclick();c.syncViewportSafety();
  assert.equal(c.coachingHold,true);assert.equal(c.viewportPause.active,false);
  assert.equal(c.protectedControls.size,2);assert.equal($('app').classList.contains('protected-sidebar'),true);
  assert.equal($('battle').getBoundingClientRect().height,235);
  assert.equal($('campaignTeaching').getBoundingClientRect().height,64);
  const same=['campaignCoach','coachResume','toggleCoach','compactBuild','selectionPanel'].map($);
  for(const [w,height] of [[390,650],[740,320]]){
    const before=c.game.serialize();
    h.resize(w,height);c.syncViewportSafety();
    assert.equal(c.viewportPause.active,false);assert.equal(c.coachingHold,true);
    assert.deepEqual(['campaignCoach','coachResume','toggleCoach','compactBuild','selectionPanel'].map($),same);
    assert.deepEqual(c.game.serialize(),before);
  }
});

test('restored enabled hints use the rail while completed disabled hints keep the drawer until requested',()=>{
  const h=harness(),{c,$}=h;
  $('coachingPlan').onclick();const saved=c.game.serialize();
  c.start(Game.restore(saved),null,'roadside-watch');c.updateHUD();
  assert.equal(c.coachingHold,false);assert.equal($('app').classList.contains('mobile-coaching'),true);
  assert.equal($('campaignTeaching').parentNode,$('app'));
  assert.deepEqual(c.game.serialize(),saved,'showing resumed hints does not alter the checkpoint');
  c.campaignProgress.missions['roadside-watch']={...completed};c.start();c.updateHUD();
  assert.equal(c.coachingHold,false);assert.equal($('app').classList.contains('mobile-coaching'),false);
  $('toggleCoach').onclick();
  assert.equal(c.coachingHold,false);assert.equal($('campaignTeaching').parentNode,$('app'));
  assert.equal($('app').classList.contains('compact-build-open'),false);
  $('toggleCoach').onclick();assert.equal($('toggleCoach').attributes['aria-label'],'Show hints');
  assert.equal($('campaignTeaching').parentNode,$('app'),'Show remains reachable after Hide');
  $('coachReplay').onclick();$('coachingPlan').onclick();
  assert.equal(c.coachingHold,true);assert.equal($('campaignTeaching').parentNode,$('app'));
});

test('Space on the focused scrollable lesson never releases planning or becomes a battle command',()=>{
  const h=harness(),{c,$}=h;$('coachingPlan').onclick();
  c.window.addEventListener=(type,handler)=>{if(type==='keydown')c.keydown=handler;};
  runInContext(h.source.slice(h.source.indexOf("window.addEventListener('keydown',"),h.source.indexOf("document.addEventListener('visibilitychange',")),c);
  const before=c.game.serialize();let prevented=false;
  c.keydown({code:'Space',target:$('campaignCoach'),repeat:false,preventDefault(){prevented=true;}});
  assert.equal(prevented,false,'native scrolling remains available');
  assert.equal(c.coachingHold,true);assert.deepEqual(c.game.serialize(),before);
});

for(const id of ['first-watch','forked-road','roadside-watch','shield-at-the-fork','open-three-roads'])test(`${id}: enabled resumed hints are outside Build without a teaching pause or checkpoint rewrite`,()=>{
  const index=Math.max(0,ONBOARDING_MISSIONS.findIndex(m=>m.id===id));
  for(const [width,height,insets] of [[320,480,{bottom:34}],[390,650,{}],[740,320,{bottom:21}]]){
    const h=harness(index,{width,height,insets}),{c,$}=h;
    const legacy=id==='first-watch'||id==='forked-road';
    if(id==='forked-road')c.campaignProgress.missions['first-watch']={...completed};
    const savedGame=legacy?createCampaignMission(id):Game.restore(c.game.serialize());
    const site=recommendCampaignSite(savedGame,'barracks').site;
    assert.equal(savedGame.build('barracks',site.x,site.y).ok,true);
    for(let tick=0;tick<20;tick++)savedGame.update(.05);
    const snapshot=savedGame.serialize();
    c.start(Game.restore(snapshot),null,id);c.updateHUD();c.syncViewportSafety();
    assert.deepEqual(c.game.serialize(),snapshot);
    assert.equal(c.resumedBattle,true);assert.equal(c.coachingHold,false);assert.equal(c.paused,false);
    assert.equal(c.viewportPause.active,false);assert.equal($('coachingModal').classList.contains('hidden'),true);
    assert.equal($('app').classList.contains('compact-build-open'),false);
    assert.equal($('campaignTeaching').parentNode,$('app'));assert.equal($('campaignCoach').classList.contains('hidden'),false);
    assert.equal($('coachResume').classList.contains('hidden'),true,'running saves must not claim to be paused');
    assert.doesNotMatch($('coachNext').textContent,/Paused/);
    assert.ok($('battle').getBoundingClientRect().height>=212);
    $('toggleCoach').onclick();assert.equal($('campaignCoach').classList.contains('hidden'),true);
    assert.equal($('toggleCoach').attributes['aria-label'],'Show hints');assert.equal($('campaignTeaching').parentNode,$('app'));
    $('toggleCoach').onclick();assert.equal($('campaignCoach').classList.contains('hidden'),false);
    assert.equal(c.coachingHold,false);assert.deepEqual(c.game.serialize(),snapshot);
    h.frame(100);assert.ok(c.game.state.time>snapshot.state.time,'resumed simulation keeps advancing normally');
  }
});

test('a fresh legacy attempt shows the same visible hint and remains frozen until explicit Start',()=>{
  for(const id of ['first-watch','forked-road']){
    const h=harness(),{c,$}=h;if(id==='forked-road')c.campaignProgress.missions['first-watch']={...completed};
    c.selectedCampaign=id;c.start();assert.equal(c.coachingHold,true);
    const snapshot=c.game.serialize();$('coachingPlan').onclick();c.syncViewportSafety();
    assert.equal($('campaignTeaching').parentNode,$('app'));assert.equal($('campaignCoach').classList.contains('hidden'),false);
    assert.equal($('app').classList.contains('compact-build-open'),false);
    assert.equal($('coachResume').classList.contains('hidden'),false);
    h.frame(1000);assert.deepEqual(c.game.serialize(),snapshot);
    $('coachResume').onclick();h.frame(1100);assert.equal(c.coachingHold,false);assert.ok(c.game.state.time>0);
  }
});

test('protected battles without applicable hints retain their original small-portrait layout',()=>{
  const h=harness(0,{width:320,height:430}),{c,$}=h;
  c.campaignProgress=createCampaignProgress();
  for(const mission of CAMPAIGN_MISSIONS)if(mission.id!=='common-ground')c.campaignProgress.missions[mission.id]={...completed};
  c.selectedCampaign='common-ground';c.start();c.syncViewportSafety();
  assert.equal(c.coachEnabled,true);assert.equal(campaignCoach(c.game,'common-ground',c.ui),null);
  assert.equal(c.coachingHold,false);assert.equal(c.protectedControls.size,2);
  assert.equal($('app').classList.contains('mobile-coaching'),false);assert.equal(c.viewportPause.active,false);
  assert.equal($('battle').getBoundingClientRect().height,226);
});

test('a genuinely guided restored protected mission keeps strict geometry safety rather than forcing a teaching hold',()=>{
  const h=harness(),{c,$}=h;c.campaignProgress=h.fixture.progress;
  const snapshot=h.fixture.envelope.game;
  c.start(Game.restore(snapshot),null,'winter-stores');h.resize(740,320);
  assert.equal(c.coachingHold,false);assert.equal(c.viewportPause.active,false);
  assert.equal($('campaignTeaching').parentNode,$('app'));assert.equal($('campaignCoach').classList.contains('hidden'),false);
  // The repaired side rail makes both formerly constrained sizes safe.
  for(const height of [430,400]){
    h.resize(320,height);
    const geometry=h.geometry();assert.equal(geometry.canvas.width,216);assert.equal(geometry.canvas.height,height-152);
    assert.deepEqual(inspectMobileGeometry(geometry),{safe:true,reason:''});
    assert.equal(c.coachingHold,false);assert.equal(c.viewportPause.active,false);assert.equal(c.paused,false);
  }
  // At 370px the unchanged 44px rail controls genuinely overflow their row.
  h.resize(320,370);
  const unsafe=h.geometry();
  assert.equal(inspectMobileGeometry(unsafe).safe,false);
  assert.equal(c.coachingHold,false);assert.equal(c.viewportPause.blocked,true);assert.equal(c.paused,true);
  assert.match($('viewportReason').textContent,/controls/i);
  h.frame(1000);assert.deepEqual(c.game.serialize(),snapshot,'the normal geometry latch, not coaching, protects this small layout');
  h.resize(390,650);assert.equal(c.viewportPause.blocked,false);assert.equal(c.paused,true);
  c.pause(false);assert.equal(c.paused,true);c.pause(false,{explicit:true});assert.equal(c.paused,false);
});
