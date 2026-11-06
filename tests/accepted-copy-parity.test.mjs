import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {TrainingSession, TRAINING_LESSONS} from '../dist/training.js';
import {TrainingSession as HistoricalTraining} from '../qa/fixtures/production-v012/dist/training.js';
import {CHALLENGES, createChallenge, evaluateChallenge} from '../dist/challenges.js';
import {CHALLENGES as HISTORICAL_CHALLENGES, createChallenge as historicalChallenge, evaluateChallenge as historicalOutcome} from '../qa/fixtures/production-v012/dist/challenges.js';

const behavior = snapshot => Object.fromEntries(['status','stepIndex','canContinue','canRecoverGold','shouldRun','paused','recovering','evidence','summary'].map(key => [key,snapshot[key]]));
function act(session) {
  const s = session.snapshot();
  if (s.canContinue) return session.continue();
  if (s.canRecoverGold) return session.recoverGold();
  if (s.status !== 'instruction') return session.update(.05);
  const hint = s.targetHints[0];
  if (s.step.kind === 'build') return session.build(s.step.type,hint.x,hint.y);
  if (s.step.kind === 'upgrade') return session.upgrade(hint.buildingId);
  throw Error('Unexpected instruction '+s.step.id);
}

test('accepted practice prose preserves every paid action, observation, RNG state and learning result', () => {
  for (const seed of [1,42,4294967295]) for (const lesson of TRAINING_LESSONS) {
    const current = new TrainingSession({lessonId:lesson.id,seed});
    const historical = new HistoricalTraining({lessonId:lesson.id,seed});
    let complete = false;
    for (let i=0;i<10000;i++) {
      assert.deepEqual(current.game.serialize(),historical.game.serialize(),lesson.id+' state');
      assert.deepEqual(behavior(current.snapshot()),behavior(historical.snapshot()),lesson.id+' learning evidence');
      if (current.snapshot().status === 'lesson-complete') { complete=true; break; }
      assert.notEqual(current.snapshot().status,'failed',lesson.id);
      assert.equal(act(current).ok,act(historical).ok,lesson.id+' command');
    }
    assert.equal(complete,true,lesson.id+' must actually finish');
  }
});

test('trial wording leaves every setup, deadline, target and outcome rule unchanged', () => {
  const numeric = value => Object.fromEntries(Object.entries(value).filter(([key]) => !['description','hint'].includes(key)));
  assert.deepEqual(CHALLENGES.map(numeric),HISTORICAL_CHALLENGES.map(numeric));
  for (const trial of CHALLENGES) {
    const current=createChallenge(trial.id), historical=historicalChallenge(trial.id);
    for (let step=0;step<Math.ceil(trial.timeLimit/.05)+2;step++) {
      if (step%100===0 || current.state.winner!==null) {
        assert.deepEqual(current.serialize(),historical.serialize(),trial.id+' continuation');
        assert.deepEqual(evaluateChallenge(current,trial.id),historicalOutcome(historical,trial.id));
      }
      if (current.state.winner!==null) break;
      current.update(.05); historical.update(.05);
    }
  }
});

test('accepted optional practice and trial text does not retain mechanical developer wording', () => {
  const trialText=CHALLENGES.map(({description,hint})=>description+' '+hint).join('\n');
  assert.doesNotMatch(trialText,/a arrow volley|rally strike/i);
  const html=readFileSync(new URL('../dist/training.html',import.meta.url),'utf8');
  assert.doesNotMatch(html,/simulation clock|honestly|actual casualty/i);
});
