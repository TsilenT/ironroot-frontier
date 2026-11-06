// Explicitly synthetic, engine-valid saved positions. These are not played wins
// and do not establish balance. The browser still evaluates the terminal result.
import assert from 'node:assert/strict';
import {Game} from '../../dist/engine.js';
import {createCampaignMission,createCampaignProgress,evaluateCampaignMission,getCampaignTargets} from '../../dist/campaign.js';
import {createChallenge,evaluateChallenge,getChallengeTargets,CHALLENGES} from '../../dist/challenges.js';
import {prerequisiteProgress} from './expanded-campaign-fixtures.mjs';
import {advanceObjectiveBattle} from '../../dist/objectives.js';
export const REPORT_CASES=['campaign-primary-zero','campaign-alternate','campaign-failure','campaign-protected-failure','trial-primary','trial-alternate','trial-failure','skirmish-victory','skirmish-defeat','skirmish-draw'];
export function reportFixture(kind){
  assert.ok(REPORT_CASES.includes(kind));
  const campaignId=kind==='campaign-protected-failure'?'open-horizon':kind.startsWith('campaign-')?'emberwatch':null;
  const challengeId=kind.startsWith('trial-')?'shieldbreaker':null;
  const game=campaignId?createCampaignMission(campaignId):challengeId?createChallenge(challengeId):new Game({seed:110011,ai:false});
  // Trial success keeps floating-point simulation time just below a displayed
  // whole second. JSON must preserve it while report/main UI both show 0:40.
  game.state.time=kind==='campaign-primary-zero'?0:kind==='trial-primary'?40-1e-10:40;
  if(kind.includes('primary')){
    const targets=campaignId?getCampaignTargets(game,campaignId):getChallengeTargets(game,challengeId);
    const ids=new Set(targets.filter(t=>!t.kind||t.kind==='destroy').map(t=>t.building?.id));
    game.state.buildings=game.state.buildings.filter(b=>!ids.has(b.id));
  }else if(kind==='campaign-protected-failure'){
    const target=getCampaignTargets(game,campaignId).find(t=>t.kind==='protect');
    game.state.buildings=game.state.buildings.filter(b=>b.id!==target.originalId);
  }else if(kind==='campaign-failure')game.state.time=180;
  else if(kind==='trial-failure')game.state.time=CHALLENGES.find(c=>c.id===challengeId).timeLimit;
  else if(kind.endsWith('alternate')||kind==='skirmish-victory')game.state.bases[1].hp=0;
  else if(kind==='skirmish-defeat')game.state.bases[0].hp=0;
  else if(kind==='skirmish-draw')game.state.bases.forEach(base=>{base.hp=0;});
  // Known cumulative counters from before this synthetic resume. Values are
  // intentionally distinct from living composition; reports must not invent
  // historical samples or replace engine counters with observed deltas.
  game.state.stats={kills:[17,9],built:[23,19],damage:[1234.5,987.25]};
  game.state.units=[];game.state.projectiles=[];game.state.effects=[];
  const envelope={format:'ironroot-save',version:2,challengeId,campaignId,game:game.serialize()};
  const restored=Game.restore(envelope.game);
  assert.equal(restored.state.winner,null,'fixture is resumable, not an ended save');
  let outcome=null;
  if(campaignId)outcome=advanceObjectiveBattle(restored,.1,g=>evaluateCampaignMission(g,campaignId));
  else if(challengeId)outcome=advanceObjectiveBattle(restored,.1,g=>evaluateChallenge(g,challengeId));
  else restored.update(.05);
  assert.ok(outcome?.completed||outcome?.failed||restored.state.winner!==null);
  return {kind,envelope,progress:campaignId?prerequisiteProgress(campaignId):createCampaignProgress(),expected:{result:kind==='skirmish-draw'?'draw':kind.includes('failure')||kind==='skirmish-defeat'?'defeat':'victory',context:{mode:campaignId?'campaign':challengeId?'challenge':'skirmish',id:campaignId||challengeId},outcome,stats:structuredClone(game.state.stats)}};
}
