import test from 'node:test';
import assert from 'node:assert/strict';
import { runInContext } from 'node:vm';
import { Game, buildBounds } from '../dist/engine.js';
import { createCampaignProgress, ONBOARDING_MISSIONS, createCampaignRestart, getCampaignTargets, evaluateCampaignMission } from '../dist/campaign.js';
import { campaignCoach, campaignTeaching, recommendCampaignSite } from '../dist/campaign-flow.js';
import { advanceObjectiveBattle } from '../dist/objectives.js';
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

for (const [index, mission] of ONBOARDING_MISSIONS.entries()) {
  test(`${mission.name}: real shared-bar building is paid while clock, AI, income and production stay frozen`, () => {
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

  test(`${mission.name}: Skip/Start works before spending and completed replays/restores never auto-teach`, () => {
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
  const h = harness(), { c, $ } = h; $('coachingPlan').onclick();
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
  assert.equal(c.coachingHold, false); h.frame(200); assert.ok(c.game.state.time > 0);
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

test('earned first lesson suppresses redundant Emberwatch teaching while later income/defense lessons remain optional', () => {
  for (const mission of ONBOARDING_MISSIONS) assert.ok(campaignTeaching(mission.id));
  assert.equal(campaignTeaching('emberwatch', { learnedBasics: true }), null);
  assert.ok(campaignTeaching('three-roads')); assert.ok(campaignTeaching('winter-stores'));
  assert.equal(campaignTeaching('constructor'), null);
});

// Execute the actual keyboard handler, not a hand-authored routing model.
test('Escape closes teaching into planning, while a visible safety dialog keeps precedence', () => {
  const h = harness(), { c, $ } = h;
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
