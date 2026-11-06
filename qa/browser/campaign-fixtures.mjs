// Browser persistence fixtures, not evidence of human play or balance. Victories
// retain the last active step of a paid run; failures cross a real deadline/hit.
import assert from 'node:assert/strict';
import {Game} from '../../dist/engine.js';
import {createCampaignMission,createCampaignProgress,evaluateCampaignMission,getCampaignTargets,isMissionUnlocked,normalizeCampaignProgress,recordCampaignResult,getCampaignMission} from '../../dist/campaign.js';
import {evaluateChallenge,CHALLENGES} from '../../dist/challenges.js';
import {encodeBattle,decodeBattle,scenarioForBattle} from '../../dist/battle-codec.js';
import {advanceObjectiveBattle} from '../../dist/objectives.js';
import {introReferencePolicy} from '../../tests/intro-campaign-policies.mjs';
import {campaignReplayFixture} from './onboarding-fixtures.mjs';
export const FIXTURE_STEP=.05;

/** Build one explicitly synthetic, valid combatant in range of a living target.
 * No winner, target deletion, damage or objective completion is injected. The
 * next ordinary simultaneous-combat tick must perform the attack. */
export function imminentHit(game,target,{health=1}={}){
  assert.ok(target&&target.hp>0);
  target.hp=health;
  const side=1-target.side,lane=target.lane??game.map.lanes.reduce((best,y,index)=>Math.abs(y-target.y)<Math.abs(game.map.lanes[best]-target.y)?index:best,0);
  const d=game.units.warrior;
  const unit={id:game.nextId++,type:'warrior',flying:d.flying,side,x:target.x+(side?-20:20),y:target.y,lane,hp:d.hp,maxHp:d.hp,level:1,cooldown:0,attack:0};
  game.state.units.push(unit);
  return {targetId:target.id,side,damage:Math.min(health,d.damage),unitId:unit.id};
}
export function advanceFixture(game,{campaignId=null,challengeId=null}={}){
  if(campaignId)return advanceObjectiveBattle(game,FIXTURE_STEP,g=>evaluateCampaignMission(g,campaignId));
  if(challengeId)return advanceObjectiveBattle(game,FIXTURE_STEP,g=>evaluateChallenge(g,challengeId),CHALLENGES.find(c=>c.id===challengeId).timeLimit);
  game.update(FIXTURE_STEP);return null;
}
/** Shared admission and two independent restored continuations must agree. */
export function validateImminent(game,{campaignId=null,challengeId=null,progress=createCampaignProgress(),terminal=true}={}){
  const envelope=encodeBattle(game,scenarioForBattle(challengeId,campaignId),{campaignProgress:progress});
  const decoded=decodeBattle(envelope,{campaignProgress:progress}),restored=Game.restore(envelope.game);
  assert.deepEqual(decoded.game.serialize(),envelope.game);
  assert.equal(restored.state.winner,null);
  assert.ok(restored.state.bases.every(base=>base.hp>0));
  const before=campaignId?evaluateCampaignMission(restored,campaignId):challengeId?evaluateChallenge(restored,challengeId):null;
  assert.ok(!before?.completed&&!before?.failed,'checkpoint is active before the browser resumes it');
  const outcome=advanceFixture(restored,{campaignId,challengeId});
  const other=advanceFixture(decoded.game,{campaignId,challengeId});
  assert.deepEqual(other,outcome);assert.deepEqual(decoded.game.serialize(),restored.serialize(),'shared decoder and raw engine restore continue identically');
  if(terminal){
    assert.ok(outcome?.completed||outcome?.failed||restored.state.winner!==null,'normal next tick earns the terminal result');
    assert.equal(restored.state.time,game.state.time+FIXTURE_STEP);
    assert.throws(()=>encodeBattle(restored,scenarioForBattle(challengeId,campaignId),{campaignProgress:progress}),'the completed position itself is not a resumable save');
  }
  return {envelope,progress,outcome,identity:decoded.identity,finalGame:restored.serialize()};
}
export function campaignFixture(kind){
  const id=kind==='protected'?'winter-stores':'emberwatch',progress=createCampaignProgress();
  let game=createCampaignMission(id);
  if(kind==='victory')game=Game.restore(campaignReplayFixture(3).game);
  else if(kind==='failure')game.state.time=180-FIXTURE_STEP;
  else if(kind==='protected')for(const id of ['emberwatch','three-roads'])progress.missions[id]={completed:true,stars:3,bestTime:10};
  else throw Error('Unknown fixture: '+kind);
  assert.ok(isMissionUnlocked(progress,id));assert.deepEqual(normalizeCampaignProgress(progress),progress);
  const fixture=validateImminent(game,{campaignId:id,progress,terminal:kind!=='protected'});
  assert.equal(fixture.outcome.completed,kind==='victory');assert.equal(fixture.outcome.failed,kind==='failure');
  if(kind==='victory')assert.equal(fixture.outcome.stars,3);
  if(kind==='failure')assert.equal(fixture.finalGame.state.time,180);
  if(kind==='protected')assert.equal(getCampaignTargets(game,id).filter(t=>t.kind==='protect'&&t.building).length,2);
  return fixture;
}

const introCheckpoints=new Map();
export function introReplayFixture(id){
  assert.ok(['first-watch','forked-road'].includes(id));
  let progress=createCampaignProgress();
  if(id==='forked-road'){
    const first=introReplayFixture('first-watch');
    progress=recordCampaignResult(progress,'first-watch',Game.restore(first.finalGame));
  }
  if(!introCheckpoints.has(id)){
    const game=createCampaignMission(id),policy=introReferencePolicy(id);
    for(let tick=0;tick<(getCampaignMission(id).timeLimit+1)*20;tick++){
      if(tick>=200&&tick%100===0)policy(game);
      const before=game.serialize();game.update(FIXTURE_STEP);
      const outcome=evaluateCampaignMission(game,id);
      assert.ok(!outcome.failed,'paid introductory reference route failed');
      if(outcome.completed){assert.equal(outcome.stars,3);introCheckpoints.set(id,before);break;}
    }
  }
  assert.ok(introCheckpoints.has(id));
  const fixture=validateImminent(Game.restore(introCheckpoints.get(id)),{campaignId:id,progress});
  assert.equal(fixture.outcome.completed,true);assert.equal(fixture.outcome.stars,3);
  return fixture;
}
