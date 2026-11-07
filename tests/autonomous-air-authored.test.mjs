import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Game, BUILDINGS, UNITS, RULESETS, supportsAutonomousAir, supportsFlightOrders, LANES } from '../dist/engine.js';
import { AUTHORED_AIR_RULESET_ID } from '../dist/rulesets.js';
import { CHALLENGES, CURRENT_CHALLENGES, CURRENT_CHALLENGE_REVISION, createChallenge, createCurrentChallenge, restartChallenge, getChallenge, getChallengeForGame, challengeScenarioForGame, getChallengeTargets, evaluateChallenge } from '../dist/challenges.js';
import { TRAINING_LESSONS, TrainingSession, createCurrentTrainingSession, CURRENT_TRAINING_RULESET_ID } from '../dist/training.js';
import { encodeBattle, decodeBattle, scenarioForBattle, resolveScenario, validateBattleIdentity } from '../dist/battle-codec.js';
const step=(g,n=1)=>{for(let i=0;i<n;i++)g.update(.05);};
function production(types,lanes){let cursor=0;return game=>{const type=types[Math.floor(cursor/lanes.length)%types.length],lane=lanes[cursor%lanes.length];for(const x of [1250,1110,970,830,690,550,410,270])if(game.build(type,x,LANES[lane]).ok){cursor++;break;}};}
function economy(){let cursor=0;const plan=[['watchtower',1110,0],['watchtower',1110,2],['mint',270,0],['mint',270,1],['mint',270,2]];return game=>{if(cursor<plan.length){const [type,x,lane]=plan[cursor];if(game.build(type,x,LANES[lane]).ok)cursor++;}else if(cursor<7){const mine=game.state.buildings.filter(b=>b.side===0&&b.type==='mint')[cursor-5];if(mine&&game.upgrade(mine.id).ok)cursor++;}else{const tower=game.state.buildings.find(b=>b.side===0&&b.type==='watchtower'&&b.level<3);if(tower)game.upgrade(tower.id);}};}
const policies={shieldbreaker:()=>production(['barracks','sanctum','archery'],[1]),skyguard:()=>production(['archery'],[0,2]),siegecraft:()=>production(['barracks','foundry','archery'],[1]),goldrush:economy,holdfast:()=>production(['watchtower','archery','barracks'],[0,1,2])};
function play(id,policy,seed,restore=false){let g=createCurrentChallenge(id);if(seed!==undefined)g.seed=seed;const c=getChallengeForGame(g,id);let outcome;for(let tick=0;tick<(c.timeLimit+1)*20;tick++){if(tick%20===0)policy(g);g.update(.05);outcome=evaluateChallenge(g,id);assert.ok(outcome.progress>=0&&outcome.progress<=1);if(outcome.completed||outcome.failed)break;if(restore&&tick%200===0){const encoded=encodeBattle(g,scenarioForBattle(id,null,g));const copy=decodeBattle(encoded).game;assert.deepEqual(copy.serialize(),g.serialize());g=copy;}}return {g,outcome};}
function practiceAction(t){const s=t.snapshot();if(s.canContinue)return t.continue();if(s.canRecoverGold)return t.recoverGold();if(s.status!=='instruction')return t.update(.05);const hint=s.targetHints[0],gold=t.game.state.gold[0],time=t.game.state.time;let result,cost;if(s.step.kind==='build'){cost=t.game.buildings[s.step.type].cost;result=t.build(s.step.type,hint.x,hint.y);}else {const b=t.game.state.buildings.find(b=>b.id===hint.buildingId);cost=t.game.upgradeCost(b);result=t.upgrade(b.id);}assert.equal(result.ok,true);assert.equal(t.game.state.gold[0],gold-cost);assert.equal(t.game.state.time,time);return result;}

test('authored automatic air keeps the seven-building roster, exact paid stats/endgame/limits and no manual orders',()=>{
  const rules=RULESETS[AUTHORED_AIR_RULESET_ID];assert.equal(rules.units,UNITS);assert.equal(rules.buildings,BUILDINGS);assert.equal(Object.keys(rules.buildings).length,7);assert.equal(Object.hasOwn(rules.buildings,'wardenLodge'),false);assert.deepEqual(rules.endgame,RULESETS['frontier-legacy'].endgame);assert.equal(rules.limits,RULESETS['frontier-legacy'].limits);assert.equal(rules.authoredOnly,true);assert.equal(supportsAutonomousAir(rules),true);assert.equal(supportsFlightOrders(rules),false);
  const g=createCurrentChallenge('skyguard'),before=g.serialize();assert.equal(g.setFlightPlan(g.state.buildings.at(-1).id,1,1).ok,false);assert.deepEqual(g.serialize(),before);assert.equal(g.build('wardenLodge',1110,450).ok,false);
  assert.throws(()=>encodeBattle(new Game({rulesetId:AUTHORED_AIR_RULESET_ID,ai:false})),/authored/);
});

test('fresh revision2 descriptors preserve all published setup/objective data and historical factories remain revision1',()=>{
  assert.equal(CURRENT_CHALLENGE_REVISION,2);assert.equal(CURRENT_CHALLENGES.length,6);assert.ok(Object.isFrozen(CURRENT_CHALLENGES));
  for(const old of CHALLENGES){const current=getChallenge(old.id,2),legacy=createChallenge(old.id),fresh=createCurrentChallenge(old.id);const {scenarioRevision,rulesetId,rulesetRevision,mapId,mapRevision,...same}=current;assert.deepEqual(same,old);assert.equal(scenarioRevision,2);assert.equal(rulesetId,AUTHORED_AIR_RULESET_ID);assert.equal(mapId,'classic');assert.equal(mapRevision,1);assert.equal(legacy.serialize().version,1);assert.equal(legacy.ruleset.id,'frontier-legacy');assert.equal(fresh.serialize().version,3);assert.equal(fresh.ruleset.id,AUTHORED_AIR_RULESET_ID);assert.deepEqual(fresh.state,legacy.state);assert.deepEqual(challengeScenarioForGame(legacy,old.id),{kind:'trial',id:old.id,revision:1});assert.deepEqual(challengeScenarioForGame(fresh,old.id),{kind:'trial',id:old.id,revision:2});assert.deepEqual(getChallengeTargets(fresh,old.id),getChallengeTargets(legacy,old.id));}
});

test('all five fresh trials win recommended paid strategies across four seeds, including playable envelope restores',()=>{
  for(const c of CURRENT_CHALLENGES.filter(c=>Object.hasOwn(policies,c.id)))for(const seed of [c.seed,1,57,999]){const {g,outcome}=play(c.id,policies[c.id](),seed,seed===999);assert.equal(outcome.completed,true,`${c.id}/${seed}: ${outcome.label}`);assert.equal(outcome.failed,false);assert.ok(g.state.bases[0].hp>0);assert.ok(g.state.time<=c.timeLimit+.001);assert.doesNotThrow(()=>Game.restore(g.serialize()));}
});

test('idle fresh trials all fail and their original objective/deadline rules remain meaningful',()=>{
  for(const c of CURRENT_CHALLENGES){const {outcome}=play(c.id,()=>{});assert.equal(outcome.completed,false,c.id);assert.equal(outcome.failed,true,c.id);}
  for(const c of CURRENT_CHALLENGES){const g=createCurrentChallenge(c.id);g.state.time=c.timeLimit-.05;assert.equal(evaluateChallenge(g,c.id).failed,false);g.state.time=c.timeLimit;assert.equal(evaluateChallenge(g,c.id).completed,c.mode==='survive');}
});

test('actual game identity chooses trial revision, roundtrips and exact restarts without upgrading old attempts',()=>{
  for(const c of CHALLENGES)for(const current of [false,true]){const g=(current?createCurrentChallenge:createChallenge)(c.id);step(g,300);const scenario=scenarioForBattle(c.id,null,g),saved=encodeBattle(g,scenario),copy=decodeBattle(saved).game;assert.equal(scenario.revision,current?2:1);assert.equal(resolveScenario(scenario).rulesetId,current?AUTHORED_AIR_RULESET_ID:'frontier-legacy');assert.deepEqual(copy.serialize(),g.serialize());const initial=(current?createCurrentChallenge:createChallenge)(c.id);assert.deepEqual(restartChallenge(copy,c.id).serialize(),initial.serialize());step(g,300);step(copy,300);assert.deepEqual(copy.serialize(),g.serialize());assert.deepEqual(evaluateChallenge(copy,c.id),evaluateChallenge(g,c.id));
    if(!current){const explicit=g.serialize();explicit.version=3;explicit.rulesetId='frontier-legacy';explicit.rulesetRevision=1;explicit.mapId='classic';explicit.mapRevision=1;const r=restartChallenge(Game.restore(explicit),c.id);assert.equal(r.serialize().version,3);assert.equal(r.ruleset.id,'frontier-legacy');assert.equal(challengeScenarioForGame(r,c.id).revision,1);}
  }
  for(const revision of [0,3,99,'2',null])assert.throws(()=>getChallenge('skyguard',revision));assert.throws(()=>scenarioForBattle('skyguard',null,new Game({rulesetId:'frontier-air-local-open'})),/trial identity/);
});

test('trial revisions and engine identities cannot be forged or silently coerced during admission',()=>{
  for(const current of [false,true]){const g=(current?createCurrentChallenge:createChallenge)('skyguard'),scenario=scenarioForBattle('skyguard',null,g);const identity={ruleset:{id:g.ruleset.id,revision:1},map:{id:g.map.id,revision:1},scenario:{...scenario,revision:current?1:2}};assert.throws(()=>validateBattleIdentity(identity),/scenario rules/);}
  for(const revision of [3,4,'2'])assert.throws(()=>resolveScenario({kind:'trial',id:'skyguard',revision}));assert.throws(()=>resolveScenario({kind:'skirmish',id:'standard',revision:2}));
});

test('explicit fresh practice finishes all five lessons with normal costs across seven seeds and remains unsaved',()=>{
  for(const seed of [0,1,7,42,12012,2147483648,4294967295]){const t=createCurrentTrainingSession({seed});for(const lesson of TRAINING_LESSONS){assert.equal(t.game.ruleset.id,CURRENT_TRAINING_RULESET_ID);assert.equal(t.game.ruleset.id,AUTHORED_AIR_RULESET_ID);assert.equal(t.game.units,UNITS);assert.equal(t.game.buildings,BUILDINGS);let finished=false;for(let i=0;i<10000;i++){const s=t.snapshot();if(s.status==='lesson-complete'){finished=true;break;}assert.notEqual(s.status,'failed',`${seed}/${lesson.id}: ${s.feedback}`);assert.equal(practiceAction(t).ok,true);}assert.equal(finished,true);assert.equal(t.snapshot().lastResult.outcome,'completed');assert.ok(t.game.state.time<lesson.timeLimit);if(lesson.id==='answer-the-air'){const evidence=t.snapshot().evidence;assert.equal(evidence.archerAirHit.targetId,evidence.gryphonDefeated.targetId);assert.equal(evidence.airTargetId,evidence.gryphonDefeated.targetId);}assert.throws(()=>encodeBattle(t.game));assert.equal(t.continue().ok,true);}assert.equal(t.snapshot().summary.completed,5);}
  assert.equal(new TrainingSession().game.ruleset.id,'frontier-legacy');assert.equal(new TrainingSession().game.serialize().version,1);
});

test('fresh practice retry and BFCache recreation use the current factory without restoring abandoned sessions',()=>{
  const t=createCurrentTrainingSession({lessonId:'answer-the-air'}),before=t.game.serialize();practiceAction(t);t.retry();assert.deepEqual(t.game.serialize(),before);t.startLesson('first-barracks');assert.equal(t.game.ruleset.id,AUTHORED_AIR_RULESET_ID);assert.equal(t.game.serialize().version,3);
  const source=readFileSync(new URL('../dist/training-app.js',import.meta.url),'utf8');assert.match(source,/import \{ TRAINING_LESSONS, createCurrentTrainingSession \}/);assert.equal([...source.matchAll(/session = createCurrentTrainingSession\(\)/g)].length,2);assert.doesNotMatch(source,/new TrainingSession\(/);
});
