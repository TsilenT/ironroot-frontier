// Admissible imminent-result UI positions, not evidence of human play/balance.
// Primary completions use paid-run checkpoints. Alternate/base/protected losses
// use explicitly synthetic living combatants; normal fixed-step damage decides
// the result. No zero-HP base, removed final target or winner is stored.
import assert from 'node:assert/strict';
import {Game} from '../../dist/engine.js';
import {createCampaignMission,createCampaignProgress,evaluateCampaignMission,getCampaignTargets} from '../../dist/campaign.js';
import {createChallenge,evaluateChallenge,getChallengeTargets,CHALLENGES} from '../../dist/challenges.js';
import {decodeBattle} from '../../dist/battle-codec.js';
import {productionPolicy} from '../../tests/campaign-policies.mjs';
import {prerequisiteProgress} from './expanded-campaign-fixtures.mjs';
import {FIXTURE_STEP,campaignFixture,imminentHit,validateImminent} from './campaign-fixtures.mjs';
export const REPORT_CASES=['campaign-primary-zero','campaign-alternate','campaign-failure','campaign-protected-failure','trial-primary','trial-alternate','trial-failure','skirmish-victory','skirmish-defeat','skirmish-draw'];
let trialCheckpoint;
function trialPrimary(){
  if(trialCheckpoint)return Game.restore(trialCheckpoint);
  const game=createChallenge('shieldbreaker'),policy=productionPolicy(['barracks','sanctum','foundry'],[1]);
  for(let tick=0;tick<4200;tick++){
    if(tick%20===0)policy(game);
    const before=game.serialize();game.update(FIXTURE_STEP);const outcome=evaluateChallenge(game,'shieldbreaker');
    assert.ok(!outcome.failed);
    if(outcome.completed){assert.equal(game.state.winner,null);assert.ok(getChallengeTargets(game,'shieldbreaker').every(t=>!t.building));trialCheckpoint=before;return Game.restore(before);}
  }
  throw Error('Paid Shieldbreaker fixture did not finish.');
}
function quietCombat(game){
  game.state.units=[];game.state.projectiles=[];game.state.effects=[];
  // No other attack or production completes during the next 50ms. This keeps
  // the synthetic result's independently known counter delta exactly bounded.
  for(const building of game.state.buildings){building.cooldown=1;building.progress=0;}
  for(const base of game.state.bases)base.cooldown=1;
}
/** Preserve a real old save's map, formation and built/kill counters, then add
 * a disclosed synthetic imminent base attack for the report completion test. */
export function imminentSkirmishFixture(envelope,result='victory'){
  assert.ok(['victory','defeat','draw'].includes(result));
  const {game,scenario}=decodeBattle(envelope);assert.equal(scenario.kind,'skirmish');
  quietCombat(game);game.accumulator=0;
  const hits=[];
  if(result!=='defeat')hits.push(imminentHit(game,game.state.bases[1]));
  if(result!=='victory')hits.push(imminentHit(game,game.state.bases[0]));
  const fixture=validateImminent(game),winner=result==='draw'?'draw':result==='victory'?0:1;
  assert.equal(fixture.finalGame.state.winner,winner);
  for(const side of [0,1]){
    assert.equal(fixture.finalGame.state.stats.kills[side],game.state.stats.kills[side]);
    assert.equal(fixture.finalGame.state.stats.built[side],game.state.stats.built[side]);
    assert.equal(fixture.finalGame.state.stats.damage[side],game.state.stats.damage[side]+hits.filter(h=>h.side===side).reduce((sum,h)=>sum+h.damage,0));
  }
  return fixture;
}
export function reportFixture(kind){
  assert.ok(REPORT_CASES.includes(kind));
  const campaignId=kind==='campaign-protected-failure'?'open-horizon':kind.startsWith('campaign-')?'emberwatch':null;
  const challengeId=kind.startsWith('trial-')?'shieldbreaker':null;
  const progress=campaignId?prerequisiteProgress(campaignId):createCampaignProgress();
  let game=kind==='campaign-primary-zero'?Game.restore(campaignFixture('victory').envelope.game):kind==='trial-primary'?trialPrimary():campaignId?createCampaignMission(campaignId):challengeId?createChallenge(challengeId):new Game({seed:110011,ai:false});
  game.state.time=kind==='campaign-primary-zero'?0:kind==='trial-primary'?40-1e-10-FIXTURE_STEP:40;
  game.accumulator=0;
  // Known cumulative counters before this synthetic resume remain distinct
  // from living composition. Real next-step changes are part of the oracle.
  game.state.stats={kills:[17,9],built:[23,19],damage:[1234.5,987.25]};
  const initialStats=structuredClone(game.state.stats),hits=[];
  if(!kind.includes('primary'))quietCombat(game);
  if(kind==='campaign-protected-failure')hits.push(imminentHit(game,getCampaignTargets(game,campaignId).find(t=>t.kind==='protect').building));
  else if(kind==='campaign-failure')game.state.time=180-FIXTURE_STEP;
  else if(kind==='trial-failure')game.state.time=CHALLENGES.find(c=>c.id===challengeId).timeLimit-FIXTURE_STEP;
  else if(kind.endsWith('alternate')||kind==='skirmish-victory')hits.push(imminentHit(game,game.state.bases[1]));
  else if(kind==='skirmish-defeat')hits.push(imminentHit(game,game.state.bases[0]));
  else if(kind==='skirmish-draw')for(const base of game.state.bases)hits.push(imminentHit(game,base));
  const fixture=validateImminent(game,{campaignId,challengeId,progress}),final=Game.restore(fixture.finalGame);
  const result=kind==='skirmish-draw'?'draw':kind.includes('failure')||kind==='skirmish-defeat'?'defeat':'victory';
  if(kind.includes('primary')){
    assert.equal(final.state.winner,null);
    const targets=campaignId?getCampaignTargets(final,campaignId):getChallengeTargets(final,challengeId);
    assert.ok(targets.filter(t=>!t.kind||t.kind==='destroy').every(t=>!t.building));
    assert.equal(fixture.outcome.completed,true);assert.equal(fixture.outcome.failed,false);
  }else{
    for(const side of [0,1]){
      assert.equal(final.state.stats.kills[side],initialStats.kills[side]);assert.equal(final.state.stats.built[side],initialStats.built[side]);
      assert.equal(final.state.stats.damage[side],initialStats.damage[side]+hits.filter(h=>h.side===side).reduce((sum,h)=>sum+h.damage,0));
    }
  }
  if(kind.endsWith('alternate')){
    assert.equal(final.state.winner,0);assert.equal(fixture.outcome.completed,true);
    const targets=campaignId?getCampaignTargets(final,campaignId):getChallengeTargets(final,challengeId);
    assert.ok(targets.every(t=>t.building),'alternate victory did not fake primary target completion');
  }
  if(kind.includes('failure')){assert.equal(fixture.outcome.failed,true);assert.equal(fixture.outcome.completed,false);assert.equal(final.state.winner,null);}
  if(kind==='campaign-protected-failure')assert.equal(getCampaignTargets(final,campaignId).filter(t=>t.kind==='protect'&&!t.building).length,1);
  if(!campaignId&&!challengeId)assert.equal(final.state.winner,result==='draw'?'draw':result==='victory'?0:1);
  return {...fixture,kind,expected:{result,context:{mode:campaignId?'campaign':challengeId?'challenge':'skirmish',id:campaignId||challengeId},outcome:fixture.outcome,stats:structuredClone(final.state.stats),initialStats,time:final.state.time,winner:final.state.winner}};
}
