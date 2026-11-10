import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,getRuleset,buildSites} from '../dist/engine.js';
import {CAMPAIGN_RULESET_IDS,CITADEL_CAMPAIGN_RULESET_IDS} from '../dist/rulesets.js';
import {
  CAMPAIGN_MISSIONS,INTRO_MISSIONS,ONBOARDING_MISSIONS,ALL_CAMPAIGN_MISSIONS,
  PROGRESSION_CAMPAIGN_MISSIONS,CAMPAIGN_PROGRESS_MISSIONS,
  createCampaignProgress,createCampaignMission,createProgressionCampaignMission,
  getCampaignMission,getCampaignTargets,evaluateCampaignMission,recordCampaignResult,
  normalizeCampaignProgress,mergeCampaignProgress,isMissionUnlocked,getCampaignRoster,
  getProgressionCampaignOverview,campaignScenarioForGame,
} from '../dist/campaign.js';
import {encodeBattle,decodeBattle,identityOf,scenarioForBattle,resolveScenario} from '../dist/battle-codec.js';
import {validateHistoryRow} from '../dist/history-codec.js';
import {createBattleJournal} from '../dist/battle-report.js';
import {writeBattle} from '../dist/persistence.js';
const clone=x=>structuredClone(x);
const record={completed:true,stars:1,bestTime:60};
function progressThrough(id){let progress=createCampaignProgress();for(const mission of ONBOARDING_MISSIONS){progress.missions[mission.id]={...record};if(mission.id===id)break;}return normalizeCampaignProgress(progress);}
const full=()=>progressThrough('open-three-roads');
const returning=()=>({...createCampaignProgress(),missions:{emberwatch:{...record}}});
const envelope=(game,id,progress)=>encodeBattle(game,scenarioForBattle(null,id,game),{campaignProgress:progress});

test('catalog preserves the exact legacy entry points while retaining the compact opening and adding the five Chapter 6 missions',()=>{
  assert.equal(ALL_CAMPAIGN_MISSIONS.length,18);assert.equal(CAMPAIGN_PROGRESS_MISSIONS.length,37);
  assert.equal(PROGRESSION_CAMPAIGN_MISSIONS.length,16);
  for(const original of CAMPAIGN_MISSIONS){
    assert.equal(getCampaignMission(original.id),original);
    const next=getCampaignMission(original.id,2);
    for(const field of ['mapId','difficulty','seed','timeLimit','startingGold','startingHealth','prerequisites','playerBuildings','enemyBuildings','objectives','medals'])assert.deepEqual(next[field],original[field],`${original.id} ${field}`);
    assert.equal(next.rulesetId,'frontier-campaign-open');assert.equal(next.scenarioRevision,2);
  }
  const overview=getProgressionCampaignOverview(createCampaignProgress());
  assert.equal(overview.total,35);assert.equal(overview.maxStars,105);assert.equal(overview.nextMissionId,'roadside-watch');
  const signal=overview.missions.find(m=>m.id==='one-signal-is-enough');
  assert.ok(signal);assert.equal(signal.scenarioRevision,1);assert.equal(signal.rulesetId,'frontier-campaign-one-signal');
  assert.equal(signal.unlocked,false,'optional signal mission retains its prerequisite');
  assert.equal(overview.legacyIntroduction.total,2);assert.equal(overview.missions.filter(m=>m.unlocked).length,1);
});

test('a win, not stars or hidden cards, earns the next whole immutable roster',()=>{
  let progress=createCampaignProgress();
  for(const [index,mission] of ONBOARDING_MISSIONS.entries()){
    const game=createProgressionCampaignMission(mission.id,progress);
    assert.equal(Object.keys(game.buildings).length,[2,5,8][index]);
    assert.equal(game.ruleset.id,CITADEL_CAMPAIGN_RULESET_IDS[index]);
    assert.ok(Object.isFrozen(game.ruleset)&&Object.isFrozen(game.buildings)&&Object.isFrozen(game.units));
    assert.equal(getCampaignRoster(progress).stage,index+1);
    assert.deepEqual(decodeBattle(envelope(game,mission.id,progress),{campaignProgress:progress}).game.serialize(),game.serialize());
    game.state.bases[1].hp=0;
    progress=recordCampaignResult(progress,mission.id,game);
    assert.ok(progress.missions[mission.id]);
  }
  assert.equal(getProgressionCampaignOverview(progress).nextMissionId,'emberwatch');
  assert.equal(isMissionUnlocked(progress,'emberwatch',2),true);
  const main=createProgressionCampaignMission('emberwatch',progress);
  assert.equal(main.ruleset.id,'frontier-campaign-citadel-open');assert.equal(main.buildings.wardenLodge.unit,'rootwarden');
  assert.equal(campaignScenarioForGame(main,'emberwatch').revision,5);
  assert.equal(decodeBattle(envelope(main,'emberwatch',progress),{campaignProgress:progress}).identity.scenario.revision,5);
});

test('engine build paths, restores and scenario admission reject unavailable rosters without charging gold',()=>{
  const empty=createCampaignProgress(),game=createProgressionCampaignMission('roadside-watch',empty);
  const before=game.serialize();
  for(const type of ['watchtower','mint','wardenLodge','foundry','sanctum','aerie']){
    assert.equal(game.canBuild(type,550,450).ok,false);assert.equal(game.build(type,550,450).ok,false);
    assert.deepEqual(game.serialize(),before);
  }
  const rich=createProgressionCampaignMission('roadside-watch',full());
  rich.state.gold[0]=1000;const lodge=rich.build('wardenLodge',550,450).building;rich._spawn(lodge);
  const forged=rich.serialize();forged.rulesetId='frontier-campaign-citadel-watch';
  assert.throws(()=>Game.restore(forged),/unknown (building|unit) type/);
  forged.state.buildings=forged.state.buildings.filter(b=>b.side!==0);
  assert.throws(()=>Game.restore(forged),/unknown unit type/);
  const other=clone(envelope(game,'roadside-watch',empty));other.game.rulesetId='frontier-campaign-citadel-open';
  assert.throws(()=>decodeBattle(other,{campaignProgress:empty}),error=>error.code==='locked-roster');
  const unearned=createCampaignMission('shield-at-the-fork');
  assert.throws(()=>envelope(unearned,'shield-at-the-fork',empty),error=>error.code==='locked-mission');
  assert.throws(()=>createProgressionCampaignMission('emberwatch',empty),/locked/);
  assert.throws(()=>encodeBattle(new Game({rulesetId:'frontier-campaign-watch'})),/authored scenario/);
});

test('earned replay tiers persist without retroactively upgrading ongoing battles',()=>{
  const empty=createCampaignProgress(),first=createProgressionCampaignMission('roadside-watch',empty);
  const bytes=envelope(first,'roadside-watch',empty),later=progressThrough('shield-at-the-fork');
  const restored=decodeBattle(bytes,{campaignProgress:later}).game;
  assert.equal(Object.keys(restored.buildings).length,2);assert.deepEqual(restored.serialize(),first.serialize());
  assert.equal(restored.build('wardenLodge',550,450).ok,false);
  const replay=createProgressionCampaignMission('roadside-watch',later);
  assert.equal(Object.keys(replay.buildings).length,8);
  assert.equal(replay.build('wardenLodge',550,450).ok,true);
  const saved=envelope(replay,'roadside-watch',later);
  assert.deepEqual(decodeBattle(saved,{campaignProgress:later}).game.serialize(),replay.serialize());
  assert.throws(()=>decodeBattle(saved,{campaignProgress:empty}),error=>error.code==='locked-roster');
  const middle=createProgressionCampaignMission('roadside-watch',progressThrough('roadside-watch'));
  assert.equal(Object.keys(middle.buildings).length,5);
});

test('all sixteen revision-two battles retain the earned Rootwarden and revision-one remains seven buildings',()=>{
  const progress=full();for(const mission of CAMPAIGN_MISSIONS)progress.missions[mission.id]={...record};
  for(const mission of CAMPAIGN_MISSIONS){
    const legacy=createCampaignMission(mission.id),modern=createCampaignMission(mission.id,{revision:2});
    assert.equal(Object.keys(legacy.buildings).length,7);assert.equal(Object.keys(modern.buildings).length,8);
    assert.equal(modern.units.rootwarden,getRuleset('frontier-rootwarden-open').units.rootwarden);
    assert.deepEqual(getCampaignTargets(modern,mission.id).map(t=>[t.originalId,t.kind]),getCampaignTargets(legacy,mission.id).map(t=>[t.originalId,t.kind]));
    const slot=buildSites(modern.map,0).find(p=>modern.canBuild('wardenLodge',p.x,p.y).ok);
    assert.ok(slot,mission.id);assert.equal(modern.build('wardenLodge',slot.x,slot.y).ok,true);
    assert.deepEqual(decodeBattle(envelope(modern,mission.id,progress),{campaignProgress:progress}).game.serialize(),modern.serialize());
    const oldBytes=envelope(legacy,mission.id,progress);
    assert.deepEqual(decodeBattle(oldBytes,{campaignProgress:progress}).game.serialize(),legacy.serialize());
    const mixed=clone(envelope(modern,mission.id,progress));mixed.scenario.revision=1;
    assert.throws(()=>decodeBattle(mixed,{campaignProgress:progress}),/scenario rules/);
  }
});

test('returning records stay exact, skip teaching gates, and neither old intro-only nor corrupt records invent unlocks',()=>{
  const progress=returning(),before=JSON.stringify(progress),view=getProgressionCampaignOverview(progress);
  assert.equal(view.returning,true);assert.equal(view.roster.stage,3);assert.equal(view.nextMissionId,'three-roads');
  assert.equal(JSON.stringify(normalizeCampaignProgress(progress)),before);
  assert.ok(createProgressionCampaignMission('shield-at-the-fork',progress).buildings.wardenLodge);
  assert.equal(Object.keys(progress.missions).length,1);
  const oldIntro={...createCampaignProgress(),missions:{'first-watch':{...record},'forked-road':{...record}}};
  const oldView=getProgressionCampaignOverview(oldIntro);
  assert.equal(oldView.roster.stage,1);assert.equal(oldView.nextMissionId,'roadside-watch');assert.equal(oldView.legacyIntroduction.cleared,2);
  for(const mission of INTRO_MISSIONS){const game=createCampaignMission(mission.id);assert.deepEqual(decodeBattle(envelope(game,mission.id,oldIntro),{campaignProgress:oldIntro}).game.serialize(),game.serialize());}
  const invalid={...createCampaignProgress(),missions:{ironroot:{...record},'open-three-roads':{...record},unknown:{...record}}};
  assert.equal(getCampaignRoster(invalid).stage,1);assert.equal(getProgressionCampaignOverview(invalid).nextMissionId,'roadside-watch');
  const merged=mergeCampaignProgress(progressThrough('roadside-watch'),full());assert.deepEqual(merged,full());
});

test('modern identity plumbing covers saves, histories, reports and exact scenario revisions',()=>{
  const progress=full(),game=createProgressionCampaignMission('emberwatch',progress);
  const identity=identityOf(game,scenarioForBattle(null,'emberwatch',game));
  assert.equal(resolveScenario(identity.scenario).mission.rulesetId,'frontier-campaign-citadel-open');
  const row=validateHistoryRow({won:true,difficulty:game.difficulty,time:60,kills:0,built:1,date:'2026-11-06T12:00:00.000Z',identity});
  assert.equal(row.identity.scenario.revision,5);
  assert.ok(createBattleJournal(game,{mode:'campaign',id:'emberwatch'}));
  let value=null;const storage={get:()=>value,set:(_,v)=>(value=v,true)};
  assert.equal(writeBattle(storage,'battle',game,null,'emberwatch',{campaignProgress:progress}),true);
  assert.equal(JSON.parse(value).scenario.revision,5);
  for(const revision of [0,3,99])assert.throws(()=>resolveScenario({kind:'campaign',id:'emberwatch',revision}));
  assert.throws(()=>resolveScenario({kind:'campaign',id:'first-watch',revision:2}));
  assert.throws(()=>resolveScenario({kind:'campaign',id:'roadside-watch',revision:2}));
});

test('the citadel can fire and restore tower-type projectiles before watchtowers are earned',()=>{
  const game=createProgressionCampaignMission('roadside-watch',createCampaignProgress());
  const enemy=game.state.buildings.find(b=>b.side===1);game._spawn(enemy);
  const unit=game.state.units[0];unit.x=300;
  game._fire(game.state.bases[0],unit,10,'tower');
  assert.ok(game.state.projectiles.some(p=>p.type==='tower'));
  assert.deepEqual(Game.restore(game.serialize()).serialize(),game.serialize());
  const forged=game.serialize();forged.state.projectiles[0].type='siege';
  assert.throws(()=>Game.restore(forged),/outside this campaign roster/);
});
