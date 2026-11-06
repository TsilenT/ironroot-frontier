import { assertHistoricalEngineOracle, readHistoricalProduction } from './engine-validation-source.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {Game,BUILDINGS,UNITS,upgradeCost} from '../dist/engine.js';
import {TrainingSession,TRAINING_LESSONS} from '../dist/training.js';

const seeds=[0,1,7,42,12012,2147483648,4294967295];
function action(session){
  const s=session.snapshot(),hint=s.targetHints[0],gold=session.game.state.gold[0],time=session.game.state.time;
  if(s.step.kind==='build'){
    assert.equal(session.game.canBuild(s.step.type,hint.x,hint.y).ok,true);
    assert.equal(session.build(s.step.type,hint.x,hint.y).ok,true);
    assert.equal(session.game.state.gold[0],gold-BUILDINGS[s.step.type].cost);
  }else if(s.step.kind==='upgrade'){
    const b=session.game.state.buildings.find(b=>b.id===hint.buildingId),cost=upgradeCost(b);
    assert.equal(session.upgrade(b.id).ok,true);assert.equal(session.game.state.gold[0],gold-cost);assert.equal(b.level,2);
  }else throw Error('No current paid action');
  assert.equal(session.game.state.time,time,'instruction actions never run the clock');
}
function finishLesson(session,limit=10000){
  for(let i=0;i<limit;i++){
    const s=session.snapshot();if(s.status==='lesson-complete')return s;
    assert.notEqual(s.status,'failed',s.feedback);
    if(s.canContinue)assert.equal(session.continue().ok,true);
    else if(s.canRecoverGold)assert.equal(session.recoverGold().ok,true);
    else if(s.status==='instruction')action(session);
    else assert.equal(session.update(.05).ok,true);
  }
  assert.fail('A lesson failed to reach its finite completion');
}
function enterWatch(session){action(session);assert.equal(session.continue().ok,true);assert.equal(session.snapshot().step.kind,'watch');assert.equal(session.snapshot().shouldRun,false);assert.equal(session.continue().ok,true);}

// No browser storage or application profile is involved anywhere in these tests.
test('training metadata and setup are explicit, bounded and deeply immutable',()=>{
  assert.equal(TRAINING_LESSONS.length,5);assert.ok(Object.isFrozen(TRAINING_LESSONS));
  for(const lesson of TRAINING_LESSONS){
    assert.ok(Object.isFrozen(lesson.steps[0]));assert.ok(lesson.briefing.length>=3);assert.ok(lesson.timeLimit<=120);
    const session=new TrainingSession({lessonId:lesson.id}),s=session.game.state;
    assert.equal(session.game.ai,false);assert.equal(session.game.map.id,'classic');assert.equal(s.gold[0],lesson.startingGold);assert.equal(s.gold[1],0);
    assert.equal(s.time,0);assert.equal(s.units.length,0);assert.equal(s.winner,null);
    assert.deepEqual(s.bases.map(b=>[b.hp,b.maxHp]),[[6000,6000],[6000,6000]]);
    assert.equal(s.buildings.length,lesson.playerBuildings.length+lesson.enemyBuildings.length);
    for(const b of s.buildings){assert.equal(b.level,1);assert.equal(b.hp,BUILDINGS[b.type].hp);assert.equal(b.maxHp,BUILDINGS[b.type].hp);}
    for(const step of lesson.steps.filter(s=>s.kind==='build'))for(const hint of step.sites)assert.equal(session.game.canBuild(step.type,hint.x,hint.y).ok,true,lesson.id);
  }
});

test('invalid IDs and seeds are rejected; snapshots cannot mutate metadata or session state',()=>{
  for(const id of [null,'','__proto__','constructor'])assert.throws(()=>new TrainingSession({lessonId:id}),/Unknown training/);
  for(const seed of [-1,NaN,Infinity,1.5,4294967296])assert.throws(()=>new TrainingSession({seed}),/seed/);
  const t=new TrainingSession(),s=t.snapshot();s.lesson.name='changed';s.targetHints[0].x=0;s.evidence.fake=true;s.results.push({outcome:'completed'});
  assert.notEqual(t.snapshot().lesson.name,'changed');assert.equal(t.snapshot().targetHints[0].x,1110);assert.deepEqual(t.snapshot().evidence,{});assert.deepEqual(t.snapshot().results,[]);
  const game=t.game;assert.equal(t.startLesson('__proto__').ok,false);assert.equal(t.game,game);
});

test('instructions and completed steps freeze time, reject premature, off-site and duplicate actions',()=>{
  const t=new TrainingSession(),before=t.game.serialize();
  assert.equal(t.continue().ok,false);assert.equal(t.build('aerie',1110,450).ok,false);assert.equal(t.build('barracks',970,450).ok,false);assert.equal(t.upgrade(3).ok,false);
  for(let i=0;i<20;i++)t.update(.25);assert.deepEqual(t.game.serialize(),before);
  action(t);const placed=t.game.serialize();assert.equal(t.build('barracks',1110,450).ok,false);t.update(.25);assert.deepEqual(t.game.serialize(),placed);
  t.continue();assert.equal(t.snapshot().status,'instruction');t.update(.25);assert.deepEqual(t.game.serialize(),placed);
  t.continue();assert.equal(t.snapshot().status,'active');assert.equal(t.continue().ok,false);assert.equal(t.build('barracks',1110,450).ok,false);
});

test('all five lessons complete through actual paid actions across seven seeds',()=>{
  for(const seed of seeds){
    const t=new TrainingSession({seed});
    for(const lesson of TRAINING_LESSONS){
      assert.equal(t.snapshot().lesson.id,lesson.id);const s=finishLesson(t);
      assert.equal(s.lastResult.outcome,'completed');assert.ok(t.game.state.time<lesson.timeLimit);assert.equal(t.game.state.winner,null);
      if(lesson.id==='first-barracks'){const unit=t.game.state.units.find(u=>u.id===s.evidence.spawnedWarriorId);assert.equal(unit.type,'warrior');assert.ok(t.game.state.time>=1.2);}
      if(lesson.id==='shield-and-arrow'){assert.ok(s.evidence.shieldHit.damage>0);assert.ok(s.evidence.supportShot.damage>0);}
      if(lesson.id==='siege-the-tower'){assert.equal(s.evidence.siegeHit.targetId,s.evidence.towerDestroyed.targetId);assert.equal(t.game.state.buildings.some(b=>b.id===s.evidence.towerDestroyed.targetId),false);}
      if(lesson.id==='answer-the-air'){assert.equal(s.evidence.airTargetId,s.evidence.archerAirHit.targetId);assert.equal(s.evidence.airTargetId,s.evidence.gryphonDefeated.targetId);assert.equal(t.game.state.units.some(u=>u.id===s.evidence.airTargetId),false);}
      assert.equal(t.continue().ok,true);
    }
    assert.equal(t.snapshot().status,'finished');assert.deepEqual(t.snapshot().summary,{untried:0,completed:5,skipped:0,failed:0,total:5});assert.equal(t.snapshot().shouldRun,false);
  }
});

test('per-instance read-only observation leaves complete serialized engine states identical',()=>{
  const prototype={spawn:Game.prototype._spawn,fire:Game.prototype._fire,damage:Game.prototype._damage};
  for(const seed of [1,42,4294967295])for(const lesson of TRAINING_LESSONS){
    const t=new TrainingSession({seed,lessonId:lesson.id});
    while(t.snapshot().status!=='lesson-complete'){
      const s=t.snapshot();assert.notEqual(s.status,'failed',s.feedback);
      if(s.canContinue)t.continue();else if(s.status==='instruction')action(t);else{
        const plain=Game.restore(t.game.serialize());plain.update(.05);t.update(.05);assert.deepEqual(t.game.serialize(),plain.serialize(),lesson.id+' seed '+seed);
      }
    }
  }
  assert.equal(Game.prototype._spawn,prototype.spawn);assert.equal(Game.prototype._fire,prototype.fire);assert.equal(Game.prototype._damage,prototype.damage);
});

test('observed methods retain original returns, exceptions, receiver and one-call effects',()=>{
  const t=new TrainingSession(),g=t.game,b=g._place('barracks',410,450,0),plain=Game.restore(g.serialize());
  assert.equal(g._spawn(b),undefined);assert.equal(plain._spawn(plain.state.buildings.find(x=>x.id===b.id)),undefined);assert.deepEqual(g.serialize(),plain.serialize());
  const before=g.state.units.length;assert.throws(()=>g._spawn(null),TypeError);assert.equal(g.state.units.length,before);
  const unit=g.state.units[0],enemy=g._place('watchtower',1950,450,1),plain2=Game.restore(g.serialize());
  assert.equal(g._fire(unit,enemy,21,'warrior'),undefined);plain2._fire(plain2.state.units[0],plain2.state.buildings.find(b=>b.id===enemy.id),21,'warrior');assert.deepEqual(g.serialize(),plain2.serialize());
  assert.throws(()=>g._fire(unit,null,1,'warrior'),TypeError);
});

test('an unrelated or preexisting allied warrior cannot satisfy the paid barracks spawn',()=>{
  for(const spawnBeforeWatch of [false,true]){
    const t=new TrainingSession();action(t);const paid=t.game.state.buildings.find(b=>b.side===0),other=t.game._place('barracks',410,450,0);
    paid.progress=0;if(spawnBeforeWatch)t.game._spawn(other);else other.progress=.999;
    t.continue();t.continue();t.update(.05);
    assert.equal(t.snapshot().status,'active');assert.equal(t.snapshot().evidence.spawnedWarriorId,undefined);
    for(let i=0;i<200&&t.snapshot().status==='active';i++)t.update(.05);
    assert.equal(t.snapshot().status,'lesson-complete');assert.equal(t.snapshot().evidence.producerId,paid.id);
  }
});

test('kill totals, target disappearance and unrelated unit spawns do not fabricate combat proof',()=>{
  for(const id of ['shield-and-arrow','siege-the-tower','answer-the-air']){
    const t=new TrainingSession({lessonId:id});enterWatch(t);t.game.state.stats.kills[0]=999;t.game.state.stats.damage[0]=999999;t.game.state.buildings=t.game.state.buildings.filter(b=>b.side===0);
    for(let i=0;i<100;i++)t.update(.05);
    assert.equal(t.snapshot().status,'active');assert.equal(t.snapshot().evidence.siegeHit,undefined);assert.equal(t.snapshot().evidence.archerAirHit,undefined);
  }
});

test('a queued archer projectile with zero actual credited damage cannot satisfy anti-air',()=>{
  const t=new TrainingSession({lessonId:'answer-the-air'});enterWatch(t);
  for(let i=0;i<30;i++)t.update(.05);
  const g=t.game,target=g.state.units.find(u=>u.id===t.snapshot().evidence.airTargetId),archer=g.state.units.find(u=>u.type==='archer'&&u.side===0);
  assert.ok(target&&archer);g.damageQueue=[];g._damage(target,target.hp,0);g._fire(archer,target,25.5,'archer');const queued=g.damageQueue;g.damageQueue=null;for(const hit of queued)g._damage(...hit);
  g.state.units=g.state.units.filter(u=>u.hp>0);t.update(.05);
  assert.equal(t.snapshot().evidence.archerAirHit,undefined);assert.equal(t.snapshot().evidence.gryphonDefeated,undefined);assert.equal(t.snapshot().status,'active');
});

test('a queued siege shot with zero credited damage cannot satisfy siege',()=>{
  const t=new TrainingSession({lessonId:'siege-the-tower'});enterWatch(t);for(let i=0;i<30;i++)t.update(.05);
  const g=t.game,target=g.state.buildings.find(b=>b.side===1),siege=g.state.units.find(u=>u.type==='siege'&&u.side===0);assert.ok(siege);
  g.damageQueue=[];g._damage(target,target.hp,0);g._fire(siege,target,90,'siege');const queued=g.damageQueue;g.damageQueue=null;for(const hit of queued)g._damage(...hit);
  g.state.buildings=g.state.buildings.filter(b=>b.hp>0);t.update(.05);
  assert.equal(t.snapshot().evidence.siegeHit,undefined);assert.equal(t.snapshot().evidence.towerDestroyed,undefined);assert.equal(t.snapshot().status,'active');
});

test('a different producer cannot claim the paid foundry or archery range evidence',()=>{
  for(const [lessonId,buildingType,unitType,targetType] of [['siege-the-tower','foundry','siege','watchtower'],['answer-the-air','archery','archer','gryphon']]){
    const t=new TrainingSession({lessonId});enterWatch(t);for(let i=0;i<30;i++)t.update(.05);
    const g=t.game,other=g._place(buildingType,410,450,0);g._spawn(other);const unit=g.state.units.at(-1),target=[...g.state.units,...g.state.buildings].find(e=>e.side===1&&e.type===targetType);
    assert.equal(unit.type,unitType);g._fire(unit,target,target.hp,unitType);t.update(.05);
    assert.equal(t.snapshot().evidence.siegeHit,undefined);assert.equal(t.snapshot().evidence.archerAirHit,undefined);assert.equal(t.snapshot().status,'active');
  }
});

test('pause/resume and invalid elapsed time never spend, advance or speed up practice',()=>{
  const t=new TrainingSession();enterWatch(t);t.setPaused(true);const before=t.game.serialize();
  for(let i=0;i<30;i++)t.update(.25);assert.deepEqual(t.game.serialize(),before);assert.equal(t.continue().ok,false);assert.equal(t.snapshot().shouldRun,false);
  assert.equal(t.setPaused('yes').ok,false);t.setPaused(false);assert.equal(t.snapshot().shouldRun,true);
  for(const dt of [0,-1,NaN,Infinity])assert.equal(t.update(dt).ok,false);assert.deepEqual(t.game.serialize(),before);
  t.update(1000);assert.ok(t.game.state.time<=.25+.000001);
});

test('retry/skip/jump reset actual games, gold, observations, timers and stale old-game events',()=>{
  const t=new TrainingSession();enterWatch(t);const old=t.game,attempt=t.snapshot().attemptId;t.update(.5);assert.equal(t.retry().ok,true);
  const pristine=t.game.serialize();assert.notEqual(t.game,old);assert.equal(t.snapshot().attemptId,attempt+1);assert.deepEqual(t.snapshot().evidence,{});assert.equal(t.snapshot().status,'instruction');assert.equal(t.game.state.time,0);
  for(let i=0;i<300;i++)old.update(.05);assert.deepEqual(t.game.serialize(),pristine);assert.deepEqual(t.snapshot().evidence,{});
  t.skip();assert.equal(t.snapshot().lesson.id,'shield-and-arrow');assert.equal(t.snapshot().results[0].outcome,'skipped');assert.equal(t.game.state.gold[0],350);
  t.startLesson('mine-and-upgrade');assert.equal(t.game.state.time,0);assert.equal(t.game.state.gold[0],330);assert.deepEqual(t.snapshot().evidence,{});
});

test('mine instruction requires its own paid mine, correct level, actual spend and real income ticks',()=>{
  const t=new TrainingSession({lessonId:'mine-and-upgrade'});action(t);const mine=t.game.state.buildings[0];assert.equal(t.upgrade(mine.id).ok,false);
  t.continue();t.continue();for(let i=0;i<39;i++)t.update(.05);assert.equal(t.snapshot().status,'active');t.update(.05);assert.equal(t.snapshot().status,'step-complete');
  t.continue();const before=t.game.serialize();assert.equal(t.upgrade(999).ok,false);assert.deepEqual(t.game.serialize(),before);action(t);assert.equal(mine.level,2);assert.equal(t.game.state.gold[0],22);
  t.continue();t.continue();t.update(.05);assert.equal(t.game.state.income[0],8.75);assert.equal(t.snapshot().status,'active');finishLesson(t);
});

test('gold recovery uses only real income, pauses when affordable, and does not auto-spend or advance',()=>{
  for(const id of ['first-barracks','mine-and-upgrade','siege-the-tower','answer-the-air']){
    const t=new TrainingSession({lessonId:id});t.game.state.gold[0]=0;const hint=t.snapshot().targetHints[0];assert.equal(t.build(t.snapshot().step.type,hint.x,hint.y).ok,false);assert.equal(t.snapshot().canRecoverGold,true);
    const step=t.snapshot().step.id,cost=t.snapshot().requiredGold;assert.equal(t.recoverGold().ok,true);assert.equal(t.recoverGold().ok,false);assert.equal(t.continue().ok,false);
    for(let i=0;i<2000&&t.snapshot().recovering;i++)t.update(.05);
    assert.equal(t.snapshot().status,'instruction');assert.equal(t.snapshot().step.id,step);assert.equal(t.snapshot().shouldRun,false);assert.ok(t.game.state.gold[0]>=cost);assert.ok(t.game.state.gold[0]<cost+2.3);finishLesson(t);
  }
});

test('a recovery that changes the enemy field can always retry with disclosed grants',()=>{
  const t=new TrainingSession({lessonId:'shield-and-arrow'});t.game.state.gold[0]=0;t.recoverGold();
  for(let i=0;i<2000&&t.snapshot().recovering;i++)t.update(.05);
  assert.equal(t.snapshot().status,'instruction');assert.ok(t.game.state.gold[0]>=175);t.retry();assert.equal(t.game.state.gold[0],350);assert.equal(t.game.state.time,0);finishLesson(t);
});

test('every watch has a strict finite attempt limit and timeout stays recoverable by retry',()=>{
  for(const lesson of TRAINING_LESSONS){const t=new TrainingSession({lessonId:lesson.id});enterWatch(t);t.game.state.time=lesson.timeLimit-.05;t.update(.05);assert.equal(t.snapshot().status,'failed');assert.match(t.snapshot().feedback,/Time is up after/);assert.equal(t.snapshot().shouldRun,false);assert.equal(t.continue().ok,false);t.retry();assert.equal(t.game.state.time,0);assert.equal(t.snapshot().status,'instruction');}
});

test('real engine win, loss and draw cannot silently count as lesson success',()=>{
  for(const outcome of [0,1,'draw']){
    const t=new TrainingSession();enterWatch(t);if(outcome===0)t.game.state.bases[1].hp=0;else if(outcome===1)t.game.state.bases[0].hp=0;else t.game.state.bases.forEach(b=>b.hp=0);
    t.update(.05);assert.equal(t.game.state.winner,outcome);assert.equal(t.snapshot().status,'failed');assert.equal(t.snapshot().summary.completed,0);assert.equal(t.snapshot().lastResult.outcome,'failed');assert.equal(t.retry().ok,true);
  }
});

test('final summary distinguishes skipped, failed, untried and completed; exit is inert',()=>{
  const t=new TrainingSession();finishLesson(t);t.continue();t.skip();t.startLesson('answer-the-air');t.skip();
  const s=t.snapshot();assert.equal(s.status,'finished');assert.deepEqual(s.summary,{untried:2,completed:1,skipped:2,failed:0,total:5});
  assert.equal(t.startLesson('first-barracks').ok,true);assert.equal(t.snapshot().summary.completed,0,'replay clears only this lesson’s prior result');assert.equal(t.snapshot().summary.untried,3);
  t.exit();const before=t.game.serialize();t.update(.25);assert.equal(t.continue().ok,false);assert.equal(t.retry().ok,false);assert.equal(t.skip().ok,false);assert.equal(t.startLesson('first-barracks').ok,false);assert.deepEqual(t.game.serialize(),before);
});

test('isolated practice cannot overwrite an existing game and uses no persistence API',()=>{
  const active=new Game({seed:817}),before=active.serialize();const t=new TrainingSession({game:active});finishLesson(t);t.retry();t.skip();t.exit();assert.deepEqual(active.serialize(),before);assert.notEqual(t.game,active);
  const source=readFileSync(new URL('../dist/training.js',import.meta.url),'utf8');
  assert.deepEqual([...source.matchAll(/^import .* from ['"]([^'"]+)/gm)].map(m=>m[1]),['./engine.js']);
  for(const name of ['localStorage','sessionStorage','indexedDB','fetch(','writeCampaign','recordCampaign','recordResult','saveGame','profile-session','persistence.js'])assert.equal(source.includes(name),false,name);
  assert.equal(typeof t.serialize,'undefined');assert.equal(typeof TrainingSession.restore,'undefined');
  assertHistoricalEngineOracle();
});
