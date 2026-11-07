import assert from 'node:assert/strict';
import {createCurrentChallenge, evaluateChallenge, getChallengeTargets} from '../dist/challenges.js';
import {encodeBattle, decodeBattle, scenarioForBattle} from '../dist/battle-codec.js';
export const TRIAL_ID = 'ashen-crossroads';
export const ROUTES = {
  northMiddle: {lanes:[0,1], plan:[['sanctum',830,1],['archery',550,1],['foundry',1250,0],['watchtower',830,2],['foundry',1110,1]]},
  northSouth: {lanes:[0,2], plan:[['watchtower',1250,1],['foundry',1250,0],['archery',1250,2],['archery',1110,0],['foundry',1110,2]]},
  middleSouth: {lanes:[1,2], plan:[['barracks',1250,1],['archery',1250,2],['sanctum',1110,1],['foundry',1110,2],['watchtower',830,0]]},
};
// One attempted purchase per cadence, waiting for legal placement and real income.
// This policy never grants gold, changes HP, routes flyers or changes simulation speed.
export function playRoads({plan=[], seed=719, cadence=3, delay=0, restore=false}={}) {
  let game=createCurrentChallenge(TRIAL_ID); game.seed=seed;
  let cursor=0, spent=0, outcome=evaluateChallenge(game,TRIAL_ID);
  const actions=[], transitions=[{time:0,label:outcome.label}];
  for(let tick=0;tick<4801;tick++) {
    if(tick>=delay*20 && (tick-delay*20)%(cadence*20)===0 && cursor<plan.length) {
      const [type,x,lane]=plan[cursor], before=game.state.gold[0], built=game.state.stats.built[0];
      const result=game.build(type,x,game.map.lanes[lane]);
      if(result.ok) {
        const cost=game.buildings[type].cost;
        assert.equal(game.state.gold[0],before-cost); assert.equal(game.state.stats.built[0],built+1);
        spent+=cost; actions.push({time:game.state.time,type,x,lane,cost}); cursor++;
      } else { assert.equal(game.state.gold[0],before); assert.equal(game.state.stats.built[0],built); }
    }
    game.update(.05); outcome=evaluateChallenge(game,TRIAL_ID);
    const destroyed=getChallengeTargets(game,TRIAL_ID).filter(t=>!t.building).length;
    assert.ok(Number.isFinite(game.state.gold[0])&&game.state.gold[0]>=0);
    // None of these policies buys mines, upgrades, salvage or volleys.
    assert.ok(Math.abs(game.state.gold[0]-(650+5*game.state.time+2*game.state.stats.kills[0]-spent))<1e-6);
    assert.equal(outcome.progress,outcome.completed?1:Math.min(1,destroyed/2));
    if(transitions.at(-1).label!==outcome.label) transitions.push({time:game.state.time,label:outcome.label});
    if(outcome.completed||outcome.failed)break;
    if(restore && tick%200===199) {
      const encoded=encodeBattle(game,scenarioForBattle(TRIAL_ID,null,game)),copy=decodeBattle(encoded).game;
      assert.deepEqual(copy.serialize(),game.serialize()); game=copy;
    }
  }
  const summary={seed,cadence,delay,time:+game.state.time.toFixed(2),outcome:outcome.label,
    targets:getChallengeTargets(game,TRIAL_ID).map(t=>({name:t.name,lane:t.lane,hp:+(t.building?.hp??0).toFixed(2)})),
    citadels:game.state.bases.map(b=>+b.hp.toFixed(2)),spent,gold:+game.state.gold[0].toFixed(2),
    built:game.state.stats.built[0],kills:game.state.stats.kills[0],
    actions:actions.map(a=>({...a,time:+a.time.toFixed(2)})),transitions:transitions.map(t=>({...t,time:+t.time.toFixed(2)}))};
  return {game,outcome,summary};
}
export function assertRoute(result,lanes) {
  assert.equal(result.outcome.completed,true,JSON.stringify(result.summary));
  assert.equal(result.outcome.failed,false);assert.equal(result.game.state.winner,null,'route evidence requires a living enemy citadel');
  assert.ok(result.summary.citadels.every(hp=>hp>0));
  assert.deepEqual(result.summary.targets.filter(t=>t.hp===0).map(t=>t.lane),lanes,'destroy the chosen pair, not an incidental pair');
  assert.equal(result.summary.targets.filter(t=>t.hp>0).length,1);
  assert.deepEqual(result.summary.transitions.map(t=>t.label),['0/2 targets destroyed','1/2 targets destroyed','2/2 targets destroyed · Complete.']);
}
