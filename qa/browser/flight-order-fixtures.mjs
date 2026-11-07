/** Engine-valid authored checkpoints for UI/persistence coverage, not human
 * play, campaign balance or production-AI effectiveness evidence. No fixture
 * preparation is injected into an already running browser battle. */
import assert from 'node:assert/strict';
import {Game, worldX, supportsFlightOrders} from '../../dist/engine.js';
import {createCampaignMission, campaignScenarioForGame} from '../../dist/campaign.js';
import {encodeBattle, decodeBattle} from '../../dist/battle-codec.js';
import {prerequisiteProgress} from './expanded-campaign-fixtures.mjs';
export const FLIGHT_RULES = ['frontier-flight-open', 'frontier-flight-timed'];
export const HISTORICAL_FLIGHTLESS_RULES = ['frontier-rootwarden-open', 'frontier-rootwarden-timed'];
export const AIR_PHASES = ['approach', 'warning', 'transit', 'done'];
const advance = game => game.update(.05);
function checked(game, scenario, progress) {
  const envelope = encodeBattle(game, scenario, {campaignProgress: progress});
  assert.deepEqual(decodeBattle(envelope, {campaignProgress: progress}).game.serialize(), game.serialize());
  return envelope;
}
export function flightFixture({rulesetId=FLIGHT_RULES[0], mapId='classic', side=0, lane=1, to=0, phase=null, home=550}={}) {
  const game = new Game({rulesetId, mapId, ai:false, seed:71081});
  const built = game.build('aerie', worldX(game.map, side, home), game.map.lanes[lane], side);
  assert.equal(built.ok, true); assert.equal(game.state.gold[side], 420-game.buildings.aerie.cost);
  const aerie = built.building;
  if (supportsFlightOrders(game.ruleset)) assert.equal(game.setFlightPlan(aerie.id, to, side).ok, true);
  // An explicitly authored fresh-wave checkpoint gives UI actions time to run
  // before a first launch. Phase checkpoints instead use ordinary production.
  if (!phase) aerie.progress=0;
  let unit;
  if (phase) {
    assert.ok(AIR_PHASES.includes(phase));
    for (let i=0; i<1000; i++) {
      unit=game.state.units.find(u=>u.side===side&&u.type==='gryphon');
      if (unit?.airRoute?.phase===phase) break;
      advance(game);
    }
    assert.equal(unit?.airRoute?.phase,phase);
  }
  const envelope=checked(game);
  return {envelope, aerieId:aerie.id, unitId:unit?.id, source:lane, destination:to, authored:true};
}
export function flightCampaignFixture(revision=3, id='wings-of-ash') {
  const progress=prerequisiteProgress(id), game=createCampaignMission(id,{revision});
  const result=game.build('aerie',550,game.map.lanes[1]);assert.equal(result.ok,true);
  result.building.progress=0;
  if(supportsFlightOrders(game.ruleset)) assert.equal(game.setFlightPlan(result.building.id,0).ok,true);
  return {envelope:checked(game,campaignScenarioForGame(game,id),progress),progress,aerieId:result.building.id,authored:true};
}

// Two legal, fully paid aeries. Ordinary income earns the second building;
// staggered purchase times leave both independent gryphons warning together.
export function staggeredFlightFixture() {
  const game=new Game({rulesetId:FLIGHT_RULES[0],ai:false,seed:1717});
  while(game.state.gold[0]<500)advance(game);
  for(const [index,x] of [1110,1250].entries()) {
    if(index)for(let i=0;i<30;i++)advance(game);
    const result=game.build('aerie',x,game.map.lanes[0]);assert.equal(result.ok,true);
    assert.equal(game.setFlightPlan(result.building.id,1).ok,true);
  }
  let warnings=[];
  for(let i=0;i<1000;i++) {
    advance(game);warnings=game.state.units.filter(u=>u.side===0&&u.airRoute?.phase==='warning');
    if(warnings.length===2)break;
  }
  assert.equal(warnings.length,2);assert.notEqual(warnings[0].airRoute.remaining,warnings[1].airRoute.remaining);
  assert.ok(Math.min(...warnings.map(u=>u.airRoute.remaining))>1.7);
  return {envelope:checked(game),unitIds:warnings.map(u=>u.id),authored:true};
}
