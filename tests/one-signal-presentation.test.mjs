import test from 'node:test';
import assert from 'node:assert/strict';
import { signalProtectionSummary, missionBriefing } from '../dist/campaign-presentation.js';
import { protectedTargetLabels, isProtectedCampaignBuilding } from '../dist/protected-objectives.js';
import { createCampaignMission, getCampaignTargets } from '../dist/campaign.js';
import { getMissionScouting } from '../dist/scouting.js';
const targets = [{type:'watchtower',x:970,lane:0,name:'Ridge Signal'}, {type:'watchtower',x:1250,lane:2,name:'River Signal'}];
const mission = {id:'one-signal-is-enough',timeLimit:210,objectives:[{type:'protect',targets,minimumSurvivors:1},{type:'survive',seconds:210}],playerBuildings:targets.map(t=>[t.type,t.x,t.lane]),protectedTargets:targets};
const snapshot = () => protectedTargetLabels(targets,3).map((label,i)=>({originalId:i+1,label,status:'healthy',hp:100,maxHp:100,percent:100,loss:null}));

test('signal summary keeps time progress separate from survivor count without mutating input',()=>{
  const view=snapshot(),before=JSON.stringify(view);
  const summary=signalProtectionSummary(mission,view,105);
  assert.equal(summary.hudLabel,'2/2 signals alive; need 1');
  assert.equal(summary.evacuationLabel,'Evacuation 1:45 / 3:30');
  assert.equal(summary.evacuationProgress,.5);
  assert.equal(summary.lastSignalId,null);
  assert.equal(JSON.stringify(view),before);
  assert.ok(Object.isFrozen(summary));
  assert.equal(signalProtectionSummary({...mission,id:'last-light'},view),null);
  assert.equal(signalProtectionSummary(mission,[]),null);
});

test('either first loss names the remaining original and critical danger identifies the last signal',()=>{
  for(const index of [0,1]) {
    const view=snapshot();view[index]={...view[index],status:'lost',hp:null,loss:{scope:'observed-transition'}};
    view[1-index]={...view[1-index],hp:30,percent:30,status:'critical'};
    const summary=signalProtectionSummary(mission,view,84);
    assert.equal(summary.hudLabel,'1/2 signals alive; need 1');
    assert.equal(summary.lastSignalId,view[1-index].originalId);
    assert.ok(summary.permittedLossMessage.includes(`${view[index].label} lost.`));
    assert.ok(summary.permittedLossMessage.includes(`${view[1-index].label} remains; the evacuation can continue.`));
    assert.match(summary.criticalMessage,/Last signal at critical health/);
    assert.equal(summary.evacuationProgress,.4);
    view[1-index]={...view[1-index],status:'lost',hp:null,loss:{scope:'observed-transition'}};
    assert.equal(signalProtectionSummary(mission,view).permittedLossMessage,'');
    assert.equal(signalProtectionSummary(mission,view).hudLabel,'0/2 signals alive; need 1');
  }
});

test('restored missing signals keep historical loss time unknown',()=>{
  const view=snapshot();view[0]={...view[0],status:'lost',hp:null,loss:{scope:'already-missing',observedAt:99}};
  const summary=signalProtectionSummary(mission,view,99);
  assert.match(summary.permittedLossMessage,/already missing.*loss time is unknown/);
  assert.doesNotMatch(summary.permittedLossMessage,/lost at|1:39/);
});

test('briefing and scouting explain the permitted sacrifice and optional medal',()=>{
  const brief=missionBriefing(mission),scout=getMissionScouting(mission);
  assert.ok(brief.facts.includes('Keep at least 1 of 2 signals until 3:30'));
  for(const copy of [brief.protection,scout.objectives.summary]) {
    assert.match(copy,/losing the last fails/);assert.match(copy,/cannot be salvaged/);assert.match(copy,/optional medal/);
  }
  assert.equal(protectedTargetLabels(targets,3)[0],'Ridge Signal · North road');
  assert.equal(protectedTargetLabels([{...targets[0],name:'  '}],3)[0],'North watchtower');
});

test('salvage check resolves original IDs freshly and leaves replacement structures unprotected',()=>{
  const game=createCampaignMission('common-ground');
  const target=getCampaignTargets(game,'common-ground').find(t=>t.kind==='protect');
  assert.equal(isProtectedCampaignBuilding(game,'common-ground',target.originalId),true);
  game.state.buildings=game.state.buildings.filter(b=>b.id!==target.originalId);
  const replacement=game.build(target.type,target.x,game.map.lanes[target.lane]);assert.equal(replacement.ok,true);
  assert.equal(isProtectedCampaignBuilding(game,'common-ground',replacement.building.id),false);
  assert.equal(isProtectedCampaignBuilding(game,null,replacement.building.id),null);
  assert.throws(()=>isProtectedCampaignBuilding(game,'nonexistent',1));
});
