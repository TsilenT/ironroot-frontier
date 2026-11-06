// Static copy compatibility only. This does not execute Playwright or prove
// natural completion, timing, persistence, rendering, gestures or combat.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {TRAINING_LESSONS} from '../dist/training.js';

// Revised approved prose literals, not expectations derived from runtime successText.
// Combat attribution/evidence is independently checked by training and accepted-copy-parity tests.
const EXPECTED_FEEDBACK = new Map([
  ['first-barracks', 'Your barracks trained its first warrior. It will march toward enemy buildings on its own.'],
  ['shield-and-arrow', 'Enemy arrows hit your warriors. Your archers fired with a warrior still ahead of them.'],
  ['mine-and-upgrade', 'With your upgraded mine working, you earned 8.75 gold per second. Upgrades cost gold but need no extra building site.'],
  ['siege-the-tower', 'Your siege engines hit the marked tower. The tower fell.'],
  ['answer-the-air', 'Your archers hit the marked gryphon. The gryphon fell. Warriors and siege engines cannot attack flyers.'],
]);

const browserSource = readFileSync(new URL('../qa/browser/training.spec.mjs', import.meta.url), 'utf8');
const caseBlock = browserSource.match(/const LESSON_CASES=\[([\s\S]*?)\n\];/);
assert.ok(caseBlock, 'The authored browser lesson cases must remain inspectable.');
const browserProofs = new Map([...caseBlock[1].matchAll(/\{id:'([^']+)'[^\n]*proof:\/((?:\\.|[^/])*)\/([imsu]*)\}/g)]
  .map(([,id,pattern,flags]) => [id,new RegExp(pattern,flags)]));

test('browser feedback contracts cover all five authored lessons exactly once', () => {
  assert.deepEqual([...browserProofs.keys()], [...EXPECTED_FEEDBACK.keys()]);
  assert.equal((caseBlock[1].match(/\{id:/g) || []).length, EXPECTED_FEEDBACK.size);
  assert.deepEqual(TRAINING_LESSONS.map(lesson => lesson.id), [...EXPECTED_FEEDBACK.keys()]);
});

for (const [id,feedback] of EXPECTED_FEEDBACK) {
  test(`${id}: final authored success copy matches its independent contract`, () => {
    const lesson = TRAINING_LESSONS.find(lesson => lesson.id === id);
    assert.equal(lesson.steps.at(-1).successText, feedback);
  });

  test(`${id}: browser proof accepts its success copy and rejects unrelated feedback`, () => {
    const proof = browserProofs.get(id);
    assert.ok(proof, `Missing browser feedback matcher for ${id}`);
    assert.match(feedback, proof);
    for (const [otherId,otherFeedback] of EXPECTED_FEEDBACK) {
      if (otherId !== id) assert.doesNotMatch(otherFeedback, proof, `${id} must reject ${otherId} feedback`);
    }
    for (const unrelated of ['Step complete.', 'Lesson failed.', 'Observation paused.', 'Skipped by the player; not completed.']) {
      assert.doesNotMatch(unrelated, proof);
    }
  });
}

for (const [id,partialFeedback] of [
  ['siege-the-tower', 'Your siege engines hit the marked tower.'],
  ['siege-the-tower', 'The tower fell.'],
  ['answer-the-air', 'Your archers hit the marked gryphon.'],
  ['answer-the-air', 'The gryphon fell.'],
]) {
  test(`${id}: browser proof rejects incomplete attribution: ${partialFeedback}`, () => {
    assert.doesNotMatch(partialFeedback, browserProofs.get(id));
  });
}
