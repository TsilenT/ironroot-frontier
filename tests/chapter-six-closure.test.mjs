import test from 'node:test';
import assert from 'node:assert/strict';
import {runInContext} from 'node:vm';
import * as campaign from '../dist/campaign.js';
import {getMap, getRuleset} from '../dist/engine.js';
import {identityOf, scenarioForBattle} from '../dist/battle-codec.js';
import {campaignControlStatus} from '../dist/bridge-control.js';
import {missionBriefing, CURRENT_RIVER_COMPACT_EPILOGUE} from '../dist/campaign-presentation.js';
import {renderMissionScouting} from '../dist/scouting.js';
import {startupHarness} from './mobile-startup-fixture.mjs';

const chapterId = 'river-compact', river = 'a-river-between-us';
const ids = ['shared-crossing', 'one-signal-is-enough', 'lanterns-on-the-water', 'borrowed-ground', river];
const rewards = ['Unlocks One Signal Is Enough', 'Unlocks Lanterns on the Water', 'Unlocks Borrowed Ground', 'Unlocks A River Between Us', 'Unlocks False Quiet'];
const rawBytes = new Map(ids.map(id => [id, JSON.stringify(campaign.getCampaignMission(id))]));
const chapterBytes = JSON.stringify(campaign.SHARED_CROSSING_CHAPTER);
const plain = value => JSON.parse(JSON.stringify(value));
function progressBefore(id = river) {
  const progress = campaign.createCampaignProgress();
  for (const [index, mission] of campaign.CAMPAIGN_PROGRESS_MISSIONS.entries()) {
    if (mission.id === id) break;
    progress.missions[mission.id] = {completed:true, stars:index % 3 + 1, bestTime:60 + index};
  }
  return campaign.normalizeCampaignProgress(progress);
}
function setTime(game, seconds) { game.state.time = seconds; game.tick = Math.round(seconds / .05); }
function destroyPost(game) {
  const target = campaign.getCampaignTargets(game, river).find(t => t.kind === 'destroy');
  game.state.buildings = game.state.buildings.filter(b => b.id !== target.originalId);
}
function bankTime(game, clear = true) {
  game.state.campaignControl.heldSeconds = 60;
  game.state.campaignControl.bridges.forEach((bridge, index) => { bridge.owner = clear && index < 2 ? 0 : 1; });
}

// Synthetic result boundaries execute production finish, restart/replay and
// briefing code against the existing small DOM, not a browser or paid strategy.
function harness(id = river, progress = progressBefore(id)) {
  const h = startupHarness({width:390, height:650}), {c} = h;
  const uiLog = {history:[], titles:[], removals:0};
  Object.assign(c, campaign, {
    CAMPAIGN_MISSIONS:campaign.CAMPAIGN_PROGRESS_MISSIONS,
    CAMPAIGN_CHAPTERS:[campaign.ONBOARDING_CHAPTER, ...campaign.ALL_CAMPAIGN_CHAPTERS, campaign.SHARED_CROSSING_CHAPTER],
    getCampaignOverview:campaign.getProgressionCampaignOverview,
    campaignProgress:progress, selectedCampaign:id, selectedChapter:chapterId,
    mode:'campaign', campaignPage:'mission', briefingMission:null, SAVE:'battle',
    missionBriefing, getRuleset, getMap, renderMissionScouting, identityOf, scenarioForBattle,
    finishBattleReport() {}, retryHistorySave() {}, keepDialogFocus() {},
    persistProgress:() => true, trialRecords:{},
    historySession:{retain:row => uiLog.history.push(plain(row))},
    showTitle(options) {
      uiLog.titles.push({mode:c.mode, ...options}); c.started = false;
      if (c.mode === 'campaign') c.renderCampaign();
    },
  });
  Object.assign(c.battleSession, {
    remove() { uiLog.removals++; return true; },
    captureResult:() => ({remove() { uiLog.removals++; return true; }, status:() => 'current'}),
  });
  for (const [from, to] of [
    ['function renderCampaign()', "$('campaignStoryNav').onclick"],
    ['function finish()', 'let pointer ='],
    ["$('playAgain').onclick =", "$('resultMenu').onclick"],
  ]) {
    const start = h.source.indexOf(from), end = h.source.indexOf(to, start);
    assert.ok(start >= 0 && end > start, from);
    runInContext(h.source.slice(start, end), c);
  }
  c.fogRenderer = c.renderer; // No canvas rendering is claimed by this DOM fixture.
  c.start(campaign.createCampaignMission(id), null, id);
  return {...h, uiLog};
}
function finish(h) {
  const {c} = h;
  c.objectiveOutcome = campaign.evaluateCampaignMission(c.game, c.currentCampaign);
  c.finish();
  return c.objectiveOutcome;
}

for (const clear of [true, false]) test(`River compound result reports banked time when crossings are ${clear ? 'clear' : 'lost'}`, () => {
  const h = harness(), game = h.c.game;
  setTime(game, 120); bankTime(game, clear); destroyPost(game);
  const status = campaignControlStatus(game);
  assert.equal(status.complete, true); assert.equal(status.count, clear ? 2 : 0);
  const outcome = finish(h);
  assert.equal(outcome.completed, true); assert.ok(outcome.objectives.every(o => o.met));
  assert.equal(game.state.winner, null); assert.ok(game.state.bases[1].hp > 0);
  assert.match(h.$('resultCopy').textContent, /original North Command Post destroyed/);
  assert.match(h.$('resultCopy').textContent, /60 seconds.*banked across two crossings/);
  assert.doesNotMatch(h.$('resultCopy').textContent, /stand open|remain open|currently|citadel falls/);
});

for (const ending of ['hp', 'winner', 'both-goals']) test(`River core result follows the actual ${ending} outcome without claiming unfinished goals`, () => {
  const h = harness(), game = h.c.game;
  setTime(game, 120);
  if (ending === 'winner') game.state.winner = 0;
  else game.state.bases[1].hp = 0;
  if (ending === 'both-goals') { bankTime(game); destroyPost(game); }
  const outcome = finish(h);
  assert.equal(outcome.completed, true); assert.equal(outcome.label, 'Enemy citadel destroyed.');
  assert.equal(outcome.objectives.every(o => o.met), ending === 'both-goals');
  if (ending !== 'both-goals') {
    assert.ok(campaign.getCampaignTargets(game, river)[0].building);
    assert.equal(game.state.campaignControl.heldSeconds, 0);
  }
  assert.match(h.$('resultCopy').textContent, /enemy citadel fallen/);
  assert.doesNotMatch(h.$('resultCopy').textContent, /command post|crossings|60 seconds/i);
});

for (const ending of ['own-citadel', 'draw', 'deadline']) test(`River ${ending} failure retains evaluator copy and takes precedence over victory prose`, () => {
  const h = harness(), game = h.c.game, before = plain(h.c.campaignProgress);
  setTime(game, 120);
  if (ending === 'deadline') { setTime(game, 600.05); game.state.bases[1].hp = 0; }
  else {
    bankTime(game); destroyPost(game); game.state.bases[1].hp = 0;
    if (ending === 'draw') game.state.winner = 'draw';
    else { game.state.bases[0].hp = 0; game.state.winner = 0; }
  }
  const outcome = finish(h);
  assert.equal(outcome.completed, false); assert.equal(outcome.failed, true);
  assert.equal(h.$('resultTitle').textContent, 'MISSION FAILED');
  assert.equal(h.$('resultCopy').textContent, `A River Between Us: ${outcome.label}`);
  assert.deepEqual(h.c.campaignProgress, before);
  assert.equal(h.$('replayMission').classList.contains('hidden'), true);
});

test('the released chapter stays five missions with the exact order, rewards and completion boundary', () => {
  const progress = progressBefore(ids[0]), before = plain(progress);
  for (const [index, id] of ids.entries()) {
    const overview = campaign.getProgressionCampaignOverview(progress);
    const chapter = overview.chapters.find(c => c.id === chapterId);
    assert.deepEqual(overview.missions.filter(m => m.chapterId === chapterId).map(m => m.id), ids);
    assert.equal(overview.total, 26); assert.equal(overview.maxStars, 78);
    assert.equal(chapter.total, 5); assert.equal(chapter.maxStars, 15);
    assert.equal(chapter.cleared, index); assert.equal(chapter.completed, false);
    assert.equal(overview.nextMissionId, id);
    assert.equal(campaign.getCampaignLaunchMission(id, progress).reward, rewards[index]);
    assert.deepEqual(campaign.getCampaignMission(id).prerequisites, [index ? ids[index - 1] : 'common-ground']);
    if (index < ids.length - 1) assert.equal(campaign.isMissionUnlocked(progress, ids[index + 1]), false);
    progress.missions[id] = {completed:true, stars:1, bestTime:120};
  }
  const final = campaign.getProgressionCampaignOverview(progress), chapter = final.chapters.find(c => c.id === chapterId);
  assert.equal(final.completed, false); assert.equal(final.nextMissionId, 'false-quiet');
  assert.equal(chapter.completed, true); assert.equal(chapter.cleared, 5);
  assert.equal(chapter.epilogue, CURRENT_RIVER_COMPACT_EPILOGUE);
  assert.match(chapter.epilogue, /lantern-lit banks.*borrowed yard.*crossings and signal fires/);
  assert.match(chapter.epilogue, /next convoy.*far bank/);
  assert.doesNotMatch(chapter.epilogue, /next chapter|chapter 7|chapter 10|unlock/i);
  for (const [id, record] of Object.entries(before.missions)) assert.deepEqual(progress.missions[id], record);
});

for (const [index, id] of ids.entries()) test(`${id} fresh, restart and replay briefings keep current copy and exact historical rules`, () => {
  const h = harness(id), {c, $} = h;
  const raw = campaign.getCampaignMission(id), initial = c.game.serialize();
  c.renderCampaign();
  const checkBrief = () => {
    assert.equal($('campaignUnlock').textContent, rewards[index]);
    assert.equal($('campaignMissionSubtitle').textContent, id === ids[0] ? 'Secure the convoy route' : raw.subtitle);
    assert.doesNotMatch($('campaignMissionSubtitle').textContent, /preview/i);
    assert.equal($('campaignObjective').textContent, raw.objective);
    assert.equal($('campaignHint').textContent, raw.hint);
    assert.equal($('campaignGoal').textContent, missionBriefing(raw).goal);
    assert.ok(raw.briefing.every(line => $('campaignBriefing').innerHTML.includes(`<li>${line}</li>`)));
  };
  checkBrief();
  setTime(c.game, 30);
  c.returnToBriefing('restartStatus');
  assert.ok(c.briefingRestart, $('restartStatus').textContent); checkBrief();
  assert.deepEqual(c.briefingRestart.game.serialize(), initial);
  $('start').onclick(); assert.equal(c.started, true); assert.equal(c.briefingRestart, null);
  assert.deepEqual(c.game.serialize(), initial);
  // All five have a legal citadel result; finish late enough to omit the swift medal.
  setTime(c.game, 250);
  if (id === 'one-signal-is-enough') setTime(c.game, 200);
  c.game.state.bases[1].hp = 0;
  const outcome = finish(h); assert.equal(outcome.completed, true); assert.ok(outcome.stars < 3);
  const records = plain(c.campaignProgress);
  $('replayMission').onclick();
  assert.ok(c.briefingRestart, $('resultRestartStatus').textContent); checkBrief();
  assert.deepEqual(c.briefingRestart.game.serialize(), initial);
  assert.deepEqual(c.campaignProgress, records);
  assert.equal(JSON.stringify(raw), rawBytes.get(id));
});

for (const stars of [1, 3]) test(`Chapter 6 ${stars}-star result continues into Chapter 7 and retains optional replay`, () => {
  const h = harness(), {c, $} = h;
  if (stars === 1) { setTime(c.game, 250); c.game.state.bases[0].hp = 1; }
  c.game.state.bases[1].hp = 0;
  assert.equal(finish(h).stars, stars);
  assert.equal($('playAgain').innerHTML, 'CONTINUE CAMPAIGN <span>→</span>');
  assert.equal($('replayMission').textContent, 'Replay for more stars');
  assert.equal($('replayMission').classList.contains('hidden'), stars === 3);
  assert.equal($('campaignChapterStory').textContent, CURRENT_RIVER_COMPACT_EPILOGUE);
  const records = plain(c.campaignProgress), game = c.game;
  $('playAgain').onclick();
  assert.equal(c.mode, 'campaign'); assert.equal(c.started, false); assert.equal(c.game, game);
  assert.deepEqual(h.uiLog.titles.at(-1), {mode:'campaign', focusStart:true});
  if (stars === 3) { assert.equal(c.selectedCampaign, 'false-quiet'); return; }
  $('replayMission').onclick();
  assert.equal(c.mode, 'campaign'); assert.equal(c.selectedCampaign, river); assert.equal(c.started, false);
  assert.equal(c.briefingRestart.campaign, river);
  assert.equal(c.briefingRestart.game.state.time, 0);
  assert.deepEqual(c.campaignProgress, records);
  assert.equal(campaign.getProgressionCampaignOverview(records).missions.at(-1).id, 'the-road-we-know');
});

test('current presentation never rewrites published chapter or mission descriptors', () => {
  const progress = progressBefore();
  for (const id of ids) {
    const raw = campaign.getCampaignMission(id), launch = campaign.getCampaignLaunchMission(id, progress);
    assert.ok(Object.isFrozen(raw));
    for (const key of Object.keys(raw).filter(key => !['reward', 'subtitle'].includes(key))) assert.deepEqual(launch[key], raw[key], `${id}: ${key}`);
    assert.equal(JSON.stringify(raw), rawBytes.get(id));
  }
  assert.equal(campaign.getCampaignMission(ids[0]).subtitle, 'Chapter 6 preview · Secure the convoy route');
  assert.equal(campaign.getCampaignMission(ids[0]).reward, 'Unlocks the campaign epilogue');
  assert.equal(campaign.getCampaignMission('borrowed-ground').reward, 'Completes the current Chapter 6 route');
  assert.equal(campaign.getCampaignMission(river).victoryText, 'The command post falls and the shared crossings stand open. The River Compact can keep its own roads supplied.');
  assert.equal(JSON.stringify(campaign.SHARED_CROSSING_CHAPTER), chapterBytes);
});
