import test from 'node:test';
import assert from 'node:assert/strict';
import {supportsAutonomousAir} from '../dist/autonomous-air.js';
import {supportsFlightOrders} from '../dist/flight-orders.js';
import {AUTHORED_AIR_RULESET_ID,AUTHORED_CITADEL_RULESET_ID} from '../dist/rulesets.js';
import * as campaign from '../dist/campaign.js';
import {campaignBuildChoices} from '../dist/campaign-flow.js';
import {encodeBattle, decodeBattle, identityOf} from '../dist/battle-codec.js';
import {validateHistoryRow} from '../dist/history-codec.js';
import {playCampaign} from './campaign-policies.mjs';
import {introReferencePolicy} from './intro-campaign-policies.mjs';

test('historical optional lesson descriptors preserve air identity without changing their original objectives or presentation',()=>{
  assert.equal(campaign.AUTONOMOUS_AIR_INTRO_MISSIONS.length,2);
  for(const old of campaign.INTRO_MISSIONS){
    const current=campaign.getCampaignMission(old.id,4);
    assert.ok(Object.isFrozen(current)&&Object.isFrozen(current.objectives));
    assert.deepEqual(current,{...old,scenarioRevision:4,rulesetId:AUTHORED_AIR_RULESET_ID});
    assert.equal(campaign.getCampaignMission(old.id),old,'historical descriptor still resolves exactly');
    assert.equal(campaign.getCurrentCampaignRevision(old.id),5);
    assert.equal(campaign.getCampaignLaunchMission(old.id,campaign.createCampaignProgress()).scenarioRevision,5);
    assert.equal(campaign.campaignRulesetAllowed(old.id,4,AUTHORED_AIR_RULESET_ID),true);
    for(const wrong of ['frontier-legacy','frontier-campaign-air-local','frontier-air-local-open'])
      assert.equal(campaign.campaignRulesetAllowed(old.id,4,wrong),false);
  }
  assert.equal(campaign.campaignRulesetAllowed('emberwatch',4,AUTHORED_AIR_RULESET_ID),false);
});

test('both optional lessons keep seven expanded building choices, automatic flyers and separate records',()=>{
  const p=campaign.createCampaignProgress();p.missions['first-watch']={completed:true,stars:3,bestTime:60};
  const before=structuredClone(p),overview=campaign.getProgressionCampaignOverview(p);
  assert.equal(overview.total,21);assert.equal(overview.cleared,0);assert.equal(overview.roster.stage,1);
  assert.equal(overview.legacyIntroduction.cleared,1);assert.equal(overview.legacyIntroduction.stars,3);
  for(const mission of overview.legacyIntroduction.missions){
    const game=campaign.createProgressionCampaignMission(mission.id,p);
    assert.equal(game.ruleset.id,AUTHORED_CITADEL_RULESET_ID);assert.equal(supportsAutonomousAir(game.ruleset),true);
    assert.equal(supportsFlightOrders(game.ruleset),false);assert.equal(Object.keys(game.buildings).length,7);
    assert.equal(game.buildings.wardenLodge,undefined);assert.equal(game.units.rootwarden,undefined);
    assert.equal(campaignBuildChoices(mission.id,{buildings:game.buildings}).length,mission.id==='first-watch'?2:4);
    const expanded=campaignBuildChoices(mission.id,{expanded:true,buildings:game.buildings});
    assert.equal(expanded.length,7);assert.ok(expanded.includes('aerie'));assert.equal(expanded.includes('wardenLodge'),false);
    const gold=game.state.gold[0];assert.equal(game.build('wardenLodge',970,game.map.lanes[0]).ok,false);assert.equal(game.state.gold[0],gold);
    assert.equal(game.build('aerie',970,game.map.lanes[0]).ok,true);assert.equal(game.state.gold[0],gold-game.buildings.aerie.cost);
    for(let tick=0;tick<320;tick++)game.update(.05);
    const flyer=game.state.units.find(u=>u.side===0&&u.type==='gryphon');assert.ok(flyer);
    assert.ok(Object.hasOwn(flyer,'airTargetId'));assert.equal(Object.hasOwn(flyer,'airRoute'),false);
    const scenario=campaign.campaignScenarioForGame(game,mission.id);
    assert.deepEqual(scenario,{kind:'campaign',id:mission.id,revision:5});
    const envelope=encodeBattle(game,scenario,{campaignProgress:p});
    assert.equal(decodeBattle(envelope,{campaignProgress:p}).game.ruleset.id,AUTHORED_CITADEL_RULESET_ID);
    const row={won:false,draw:false,difficulty:game.difficulty,time:game.state.time,kills:0,built:1,date:'2026-11-07T10:00:00.000Z',identity:identityOf(game,scenario)};
    assert.deepEqual(validateHistoryRow(row),row);
  }
  assert.deepEqual(p,before);
});

test('both current optional lessons clear through ordinary paid commands without granting modern roster progress',t=>{
  let progress=campaign.createCampaignProgress();
  assert.equal(campaign.isMissionUnlocked(progress,'first-watch',4),true);
  assert.equal(campaign.isMissionUnlocked(progress,'forked-road',4),false);
  assert.throws(()=>campaign.createProgressionCampaignMission('forked-road',progress),/locked/);
  for(const id of ['first-watch','forked-road']){
    const mission=campaign.getCampaignLaunchMission(id,progress),actions=[];
    const {game,outcome}=playCampaign(id=>campaign.createProgressionCampaignMission(id,progress),campaign.evaluateCampaignMission,mission,{
      policy:introReferencePolicy(id),startDelay:10,actionEvery:5,maxActionsPerDecision:1,
      onAction:action=>{
        assert.ok(action.cost>0&&action.game.state.gold[0]>=0);
        if(action.name==='build')assert.equal(action.cost,action.game.buildings[action.args[0]].cost);
        if(action.name==='upgrade'){
          const b=action.game.state.buildings.find(b=>b.id===action.args[0]);
          assert.equal(action.cost,Math.round(action.game.buildings[b.type].cost*(.7+.35*(b.level-2))));
        }
        actions.push({name:action.name,cost:action.cost});
      },
    });
    assert.equal(outcome.completed,true);assert.equal(outcome.stars,3);assert.equal(game.ruleset.id,AUTHORED_CITADEL_RULESET_ID);
    const before=structuredClone(progress);progress=campaign.recordCampaignResult(progress,id,game);
    assert.equal(progress.missions[id].stars,3);assert.equal(campaign.getCampaignRoster(progress).stage,1);
    assert.equal(campaign.getProgressionCampaignOverview(progress).nextMissionId,'roadside-watch');
    for(const [oldId,oldRecord] of Object.entries(before.missions))assert.deepEqual(progress.missions[oldId],oldRecord);
    t.diagnostic(JSON.stringify({id,seconds:+game.state.time.toFixed(2),stars:outcome.stars,paidActions:actions.length,goldSpent:actions.reduce((sum,a)=>sum+a.cost,0)}));
  }
  const overview=campaign.getProgressionCampaignOverview(progress);
  assert.equal(overview.legacyIntroduction.stars,6);assert.equal(overview.cleared,0);assert.equal(overview.stars,0);
});
