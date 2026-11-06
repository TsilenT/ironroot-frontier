import assert from 'node:assert/strict';
import test from 'node:test';
import {Game,LANES} from '../dist/engine.js';
import {CHALLENGES,createChallenge,evaluateChallenge,getChallengeTargets} from '../dist/challenges.js';

function advance(game,seconds) {
  for(let tick=0;tick<seconds*20;tick++)game.update(.05);
}

function productionPolicy(types,lanes) {
  let cursor=0;
  return game=>{
    const type=types[Math.floor(cursor/lanes.length)%types.length],lane=lanes[cursor%lanes.length];
    for(const x of [1250,1110,970,830,690,550,410,270]) {
      if(game.build(type,x,LANES[lane]).ok){cursor++;break;}
    }
  };
}

function economyPolicy() {
  const steps=[['watchtower',1110,0],['watchtower',1110,2],['mint',270,0],['mint',270,1],['mint',270,2]];
  let cursor=0;
  return game=>{
    if(cursor<steps.length) {
      const [type,x,lane]=steps[cursor];
      if(game.build(type,x,LANES[lane]).ok)cursor++;
    } else if(cursor<7) {
      const mine=game.state.buildings.filter(b=>b.side===0&&b.type==='mint')[cursor-5];
      if(mine&&game.upgrade(mine.id).ok)cursor++;
    } else {
      const tower=game.state.buildings.find(b=>b.side===0&&b.type==='watchtower'&&b.level<3);
      if(tower)game.upgrade(tower.id);
    }
  };
}

function play(id,policy,seed,roundtrip=false) {
  let game=createChallenge(id);
  if(seed!==undefined)game.seed=seed;
  const config=CHALLENGES.find(c=>c.id===id);
  let outcome;
  for(let tick=0;tick<(config.timeLimit+1)*20;tick++) {
    if(tick%20===0)policy(game);
    game.update(.05);
    if(roundtrip&&tick%200===0)game=Game.restore(game.serialize());
    outcome=evaluateChallenge(game,id);
    assert.ok(Number.isFinite(outcome.progress)&&outcome.progress>=0&&outcome.progress<=1);
    if(outcome.completed||outcome.failed)break;
  }
  return {game,outcome};
}

test('five authored formations use valid, deterministic, independent game saves',()=>{
  assert.equal(CHALLENGES.length,5);
  assert.equal(new Set(CHALLENGES.map(c=>c.id)).size,5);
  for(const c of CHALLENGES) {
    const a=createChallenge(c.id),b=createChallenge(c.id);
    assert.deepEqual(a.serialize(),b.serialize());
    assert.equal(a.ai,false);
    assert.equal(a.state.gold[0],c.startingGold);
    assert.equal(a.state.bases[0].hp,c.startingHealth);
    assert.equal(a.state.stats.built[0],c.playerBuildings.length);
    assert.equal(a.state.stats.built[1],c.enemyBuildings.length);
    assert.ok(c.objective&&c.hint&&c.briefing.length);
    assert.deepEqual(Game.restore(a.serialize()).serialize(),a.serialize());
    a.state.gold[0]--;
    assert.equal(b.state.gold[0],c.startingGold);
    assert.deepEqual(evaluateChallenge(b,c.id),{completed:false,failed:false,progress:0,label:c.mode==='destroy'?`0/${c.markedTargets.length} targets destroyed`:c.mode==='economy'?'5.0/15 gold/sec':'0/140s survived'});
  }
});

test('unknown challenge ids reject clearly without starting an arbitrary battle',()=>{
  for(const id of ['',null,undefined,'normal','constructor','toString']) {
    assert.throws(()=>createChallenge(id),/Unknown challenge/);
    assert.throws(()=>evaluateChallenge(new Game(),id),/Unknown challenge/);
  }
});

test('target objectives track partial destruction and survive a save roundtrip',()=>{
  for(const c of CHALLENGES.filter(c=>c.mode==='destroy')) {
    let g=createChallenge(c.id);
    const targets=getChallengeTargets(g,c.id);
    assert.equal(targets.length,c.markedTargets.length);
    assert.ok(targets.every(t=>t.building&&t.building.side===1));
    targets[0].building.hp=0;
    g=Game.restore(g.serialize());
    let result=evaluateChallenge(g,c.id);
    assert.equal(result.completed,false);
    assert.equal(result.progress,1/c.markedTargets.length);
    for(const target of getChallengeTargets(g,c.id))if(target.building)target.building.hp=0;
    result=evaluateChallenge(g,c.id);
    assert.equal(result.completed,true);assert.equal(result.failed,false);assert.equal(result.progress,1);
    assert.equal(g.state.winner,null,'objective wins do not corrupt the engine winner contract');
    assert.doesNotThrow(()=>Game.restore(g.serialize()));
  }
});

test('destroy missions fail at their advertised deadline, not before',()=>{
  for(const c of CHALLENGES.filter(c=>c.mode==='destroy')) {
    const g=createChallenge(c.id);
    g.state.time=c.timeLimit-.05;
    assert.equal(evaluateChallenge(g,c.id).failed,false);
    g.state.time=c.timeLimit;
    assert.equal(evaluateChallenge(g,c.id).failed,true);
  }
});

test('Gold Rush checks live income at the deadline and never grants an early economy win',()=>{
  const g=createChallenge('goldrush');g.state.gold[0]=5000;
  const mines=[];
  for(const y of LANES)mines.push(g.build('mint',270,y).building);
  g.upgrade(mines[0].id);g.upgrade(mines[1].id);
  assert.equal(g.state.income[0],5,'cached HUD income intentionally remains stale until a tick');
  let result=evaluateChallenge(g,'goldrush');
  assert.equal(result.completed,false);assert.match(result.label,/15.0\/15/);
  g.state.time=149.95;assert.equal(evaluateChallenge(g,'goldrush').completed,false);
  g.state.time=150;assert.equal(evaluateChallenge(g,'goldrush').completed,true);
  g.sell(mines[0].id);
  result=evaluateChallenge(g,'goldrush');assert.equal(result.completed,false);assert.equal(result.failed,true);
  assert.match(result.label,/Time expired/);
});

test('Holdfast requires the full duration and citadel defeat overrides objective success',()=>{
  const g=createChallenge('holdfast');g.state.time=139.95;
  assert.equal(evaluateChallenge(g,'holdfast').completed,false);
  g.state.time=140;assert.equal(evaluateChallenge(g,'holdfast').completed,true);
  g.state.bases[0].hp=0;
  const result=evaluateChallenge(g,'holdfast');
  assert.equal(result.completed,false);assert.equal(result.failed,true);
});

test('destroying the opposing citadel is a documented alternate win in every challenge',()=>{
  for(const c of CHALLENGES) {
    const g=createChallenge(c.id);g.state.bases[1].hp=0;g.update(.05);
    assert.equal(g.state.winner,0);
    const result=evaluateChallenge(g,c.id);
    assert.equal(result.completed,true);assert.equal(result.failed,false);assert.equal(result.progress,1);
    assert.match(result.label,/Enemy citadel destroyed/);
    assert.doesNotThrow(()=>Game.restore(g.serialize()));
  }
});

test('recommended strategies finish every challenge across four combat seeds, including restored play',()=>{
  const policies={
    shieldbreaker:()=>productionPolicy(['barracks','sanctum','archery'],[1]),
    skyguard:()=>productionPolicy(['archery'],[0,2]),
    siegecraft:()=>productionPolicy(['barracks','foundry','archery'],[1]),
    goldrush:economyPolicy,
    holdfast:()=>productionPolicy(['watchtower','archery','barracks'],[0,1,2]),
  };
  for(const c of CHALLENGES)for(const seed of [c.seed,1,57,999]) {
    const {game,outcome}=play(c.id,policies[c.id](),seed,seed===999);
    assert.equal(outcome.completed,true,`${c.id}, seed ${seed}: ${outcome.label}`);
    assert.equal(outcome.failed,false);
    assert.ok(game.state.bases[0].hp>0);
    assert.ok(game.state.time<=c.timeLimit+.001);
    assert.doesNotThrow(()=>Game.restore(game.serialize()));
  }
});

test('idle play loses all five challenges rather than completing automatically',()=>{
  for(const c of CHALLENGES) {
    const {outcome}=play(c.id,()=>{});
    assert.equal(outcome.completed,false,c.id);
    assert.equal(outcome.failed,true,c.id);
  }
});

test('counter lessons distinguish the wrong composition from a winning one',()=>{
  for(const [id,types,lanes] of [
    ['shieldbreaker',['archery'],[1]],
    ['skyguard',['sanctum'],[0,2]],
    ['siegecraft',['aerie'],[1]],
    ['holdfast',['archery'],[0,1,2]],
  ]) {
    const {outcome}=play(id,productionPolicy(types,lanes));
    assert.equal(outcome.failed,true,`${id} should punish ${types.join(', ')}`);
  }
});

test('ordinary challenge combat resumes without divergence before objective evaluation',()=>{
  for(const c of CHALLENGES) {
    const a=createChallenge(c.id);advance(a,20);const b=Game.restore(a.serialize());
    advance(a,20);advance(b,20);
    assert.deepEqual(a.serialize(),b.serialize());
    assert.deepEqual(evaluateChallenge(a,c.id),evaluateChallenge(b,c.id));
  }
});
