import test from 'node:test';
import assert from 'node:assert/strict';
import {createCurrentChallenge, getChallenge, getChallengeForGame, getChallengeTargets, evaluateChallenge, requiredChallengeTargets, restartChallenge, CHALLENGES, CURRENT_CHALLENGES} from '../dist/challenges.js';
import {getMissionScouting,renderMissionScouting} from '../dist/scouting.js';
import {getProgressionCampaignOverview as getCampaignOverview,createCampaignProgress} from '../dist/campaign.js';
import {advanceObjectiveBattle} from '../dist/objectives.js';
import {TRIAL_ID,ROUTES,playRoads,assertRoute} from './ashen-crossroads-policies.mjs';

test('current-only optional trial preserves the historical five and additive current campaign catalog',()=>{
  const g=createCurrentChallenge(TRIAL_ID),c=getChallengeForGame(g,TRIAL_ID);
  assert.equal(CHALLENGES.length,5);assert.equal(CURRENT_CHALLENGES.length,6);
  assert.throws(()=>getChallenge(TRIAL_ID,1),/Unknown challenge/);
  assert.equal(c.scenarioRevision,3);assert.equal(g.ruleset.id,'frontier-authored-citadel');
  assert.equal(Object.keys(g.buildings).length,7);assert.equal(g.ai,false);
  assert.equal(g.state.gold[0],650);assert.equal(g.state.bases[0].hp,6000);
  assert.deepEqual(restartChallenge(g,TRIAL_ID).serialize(),g.serialize());
  const overview=getCampaignOverview(createCampaignProgress());assert.equal(overview.total,31);assert.equal(overview.maxStars,93);
  assert.equal(requiredChallengeTargets(c),2);
  for(const old of CHALLENGES.filter(c=>c.mode==='destroy'))assert.equal(requiredChallengeTargets(old),old.markedTargets.length);
});

test('required target count is bounded, integral and cannot count duplicate positions twice',()=>{
  const c=getChallenge(TRIAL_ID,2);
  for(const requiredTargets of [null,undefined,0,-1,1.5,4,NaN,Infinity,'2',true])assert.throws(()=>requiredChallengeTargets({...c,requiredTargets}),RangeError);
  for(const requiredTargets of [1,2,3])assert.equal(requiredChallengeTargets({...c,requiredTargets}),requiredTargets);
  assert.throws(()=>requiredChallengeTargets({...c,markedTargets:[c.markedTargets[0],c.markedTargets[0]]}),/repeated target/);
});

test('any two named positions complete at the deadline, with loss priority and explicit citadel alternative',()=>{
  for(const {lanes} of Object.values(ROUTES)) {
    const g=createCurrentChallenge(TRIAL_ID),targets=getChallengeTargets(g,TRIAL_ID);
    targets[lanes[0]].building.hp=0;
    assert.deepEqual(evaluateChallenge(g,TRIAL_ID),{completed:false,failed:false,progress:.5,label:'1/2 targets destroyed'});
    g.state.time=240;assert.equal(evaluateChallenge(g,TRIAL_ID).failed,true);
    targets[lanes[1]].building.hp=0;const result=evaluateChallenge(g,TRIAL_ID);
    assert.equal(result.completed,true);assert.equal(result.failed,false);assert.equal(result.progress,1);
    g.state.bases[0].hp=0;assert.equal(evaluateChallenge(g,TRIAL_ID).completed,false);assert.equal(evaluateChallenge(g,TRIAL_ID).failed,true);
  }
  const g=createCurrentChallenge(TRIAL_ID);g.state.bases[1].hp=0;g.update(.05);
  assert.equal(evaluateChallenge(g,TRIAL_ID).label,'Enemy citadel destroyed.');assert.equal(evaluateChallenge(g,TRIAL_ID).completed,true);
  assert.ok(getChallengeTargets(g,TRIAL_ID).every(t=>t.building));
});

test('scouting identifies names, roads and only two required positions with escaped labels',()=>{
  const c=getChallenge(TRIAL_ID,2),report=getMissionScouting(c),html=renderMissionScouting(c);
  assert.match(report.objectives.summary,/any 2 of 3/);
  for(const target of c.markedTargets){assert.match(report.armies[1].roads[target.lane].summary,new RegExp(target.name));assert.ok(html.includes(target.name));}
  assert.match(html,/North road/);assert.match(html,/South road/);
  const hostile=structuredClone(c);hostile.markedTargets[0].name='<img onerror="attack()">';
  assert.ok(!renderMissionScouting(hostile).includes('<img'));assert.ok(renderMissionScouting(hostile).includes('&lt;img'));
});

for(const [route,{lanes,plan}] of Object.entries(ROUTES))for(const seed of [719,57,999])for(const cadence of [3,6])for(const delay of [0,6])
  test(`paid ${route}, seed ${seed}, ${cadence}s actions, ${delay}s opening delay`,()=>assertRoute(playRoads({plan,seed,cadence,delay,restore:seed===999}),lanes));

test('ordinary automatic flyers offer another paid strategy without routing orders',()=>{
  assertRoute(playRoads({plan:[['aerie',1250,0],['aerie',1250,1],['aerie',1110,0],['aerie',1110,1]]}),[1,2]);
});

test('idle, unsupported push and defensive timeout remain honest failures across combat seeds',()=>{
  for(const seed of [719,57,999]) {
    for(const plan of [[],[['foundry',1250,0]]]) {
      const result=playRoads({seed,plan});assert.equal(result.outcome.failed,true);assert.equal(result.outcome.completed,false);assert.equal(result.summary.citadels[0],0);
    }
    const result=playRoads({seed,plan:[['watchtower',830,0],['watchtower',830,1],['watchtower',830,2],['watchtower',550,1],['watchtower',550,2]]});
    assert.equal(result.outcome.failed,true);assert.equal(result.summary.time,240);assert.ok(result.summary.citadels.every(hp=>hp>0));assert.match(result.outcome.label,/Time expired/);
  }
});

test('objective stepping stops on the second target within a fast-render batch',()=>{
  const result=playRoads({plan:ROUTES.northSouth.plan}),g=result.game;
  const before=g.serialize();advanceObjectiveBattle(g,.25,x=>evaluateChallenge(x,TRIAL_ID),240);assert.deepEqual(g.serialize(),before);
});
