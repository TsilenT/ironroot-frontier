import test from 'node:test';import assert from 'node:assert/strict';import {runInContext} from 'node:vm';
import * as campaign from '../dist/campaign.js';import {getMap,getRuleset} from '../dist/engine.js';import {identityOf,scenarioForBattle} from '../dist/battle-codec.js';import {missionBriefing,CURRENT_UNLIT_ROADS_EPILOGUE} from '../dist/campaign-presentation.js';import {renderMissionScouting} from '../dist/scouting.js';import {startupHarness} from './mobile-startup-fixture.mjs';
const ID='through-the-reed-beds',plain=value=>JSON.parse(JSON.stringify(value));
function progressBefore(id=ID){const p=campaign.createCampaignProgress();for(const m of campaign.CAMPAIGN_PROGRESS_MISSIONS){if(m.id===id)break;p.missions[m.id]={completed:true,stars:1,bestTime:60};}return campaign.normalizeCampaignProgress(p);}
const setTime=(g,t)=>{g.state.time=t;g.tick=Math.round(t/.05);};
const remove=(g,lanes)=>{const ids=campaign.getCampaignTargets(g,ID).filter(t=>lanes.includes(t.lane)).map(t=>t.originalId);g.state.buildings=g.state.buildings.filter(b=>!ids.includes(b.id));};
// Synthetic DOM/result boundaries, not native browser or paid feasibility proof.
function harness(id = ID, progress = progressBefore(id)) {
  const h = startupHarness({width:390, height:650}), {c} = h;
  const uiLog = {history:[], titles:[], removals:0};
  Object.assign(c, campaign, {
    CAMPAIGN_MISSIONS:campaign.CAMPAIGN_PROGRESS_MISSIONS,
    CAMPAIGN_CHAPTERS:campaign.CURRENT_CAMPAIGN_CHAPTERS,
    getCampaignOverview:campaign.getProgressionCampaignOverview,
    campaignProgress:progress, selectedCampaign:id, selectedChapter:'unlit-roads',
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

for(const pair of [[0,2],[0,1],[1,2]])test(`Reed pair result ${pair} reports the standing third and current Chapter7 closure`,()=>{
 const h=harness(),g=h.c.game;setTime(g,400);g.state.bases[0].hp=1;remove(g,pair);const outcome=finish(h);assert.equal(outcome.completed,true);assert.equal(outcome.stars,1);assert.match(h.$('resultCopy').textContent,/Two positions fall/);assert.match(h.$('resultObjectives').textContent,/standing · not needed/);assert.equal(h.$('campaignChapterStory').textContent,CURRENT_UNLIT_ROADS_EPILOGUE);assert.equal(h.$('playAgain').innerHTML,'SKIRMISHES <span>→</span>');h.$('replayMission').onclick();assert.equal(h.c.selectedCampaign,ID);assert.equal(h.c.briefingRestart.campaign,ID);assert.match(h.$('campaignUnlock').textContent,/Completes Chapter 7/);assert.equal(campaign.evaluateCampaignMission(h.c.briefingRestart.game,ID).objectives[0].value,0);
});
for(const count of [0,1,2,3])test(`Reed core result with ${count} originals destroyed never falsely claims a pair-only victory`,()=>{
 const h=harness(),g=h.c.game;setTime(g,400);remove(g,[0,1,2].slice(0,count));g.state.bases[1].hp=0;assert.equal(finish(h).completed,true);assert.match(h.$('resultCopy').textContent,/enemy citadel falls/);assert.doesNotMatch(h.$('resultCopy').textContent,/Two positions fall|without clearing/);if(count<3)assert.match(h.$('resultObjectives').textContent,/standing · not needed/);
});
test('one-star Road win continues to Reed and Road result replay/restart show the new reward without changing historical descriptor',()=>{
 const road='the-road-we-know',h=harness(road),g=h.c.game;setTime(g,400);g.state.bases[0].hp=1;g.state.bases[1].hp=0;assert.equal(finish(h).stars,1);assert.equal(h.$('playAgain').innerHTML,'CONTINUE CAMPAIGN <span>→</span>');h.$('playAgain').onclick();assert.equal(h.c.selectedCampaign,ID);h.$('replayMission').onclick();assert.equal(h.c.selectedCampaign,road);assert.equal(h.c.briefingRestart.campaign,road);assert.equal(h.$('campaignUnlock').textContent,'Unlocks Through the Reed Beds');assert.equal(campaign.getCampaignMission(road).reward,'Completes the current Unlit Roads route');
});
for(const ending of ['own-core','draw','deadline'])test(`Reed ${ending} result honors evaluator failure without recording a clear`,()=>{
 const h=harness(),g=h.c.game,before=plain(h.c.campaignProgress);remove(g,[0,2]);setTime(g,ending==='deadline'?600.05:400);if(ending==='own-core')g.state.bases[0].hp=0;if(ending==='draw')g.state.winner='draw';assert.equal(finish(h).failed,true);assert.equal(h.$('resultTitle').textContent,'MISSION FAILED');assert.deepEqual(h.c.campaignProgress,before);
});
