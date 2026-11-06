// Static copy compatibility only. This does not execute Playwright or prove
// natural completion, timing, persistence, rendering, gestures or combat.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {TRAINING_LESSONS} from '../dist/training.js';

// Independent approved copy, not expectations derived from runtime successText.
const EXPECTED_FEEDBACK = new Map([
  ['first-barracks', 'A real warrior spawned from your paid barracks. It will march toward enemy buildings automatically.'],
  ['shield-and-arrow', 'Enemy arrows hit your warrior screen, and your archers fired from behind it. Both observations came from actual combat.'],
  ['mine-and-upgrade', 'The upgraded mine produced real income at 8.75 gold per second. Upgrades use existing space but still need gold.'],
  ['siege-the-tower', 'Your siege engines damaged the marked tower, which was destroyed in actual combat.'],
  ['answer-the-air', 'Your archers struck the tracked gryphon, which was defeated. Warriors and siege cannot provide this air cover.'],
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
  ['siege-the-tower', 'Your siege engines damaged the marked tower.'],
  ['siege-the-tower', 'The marked tower was destroyed in actual combat.'],
  ['answer-the-air', 'Your archers struck the tracked gryphon.'],
  ['answer-the-air', 'The tracked gryphon was defeated.'],
]) {
  test(`${id}: browser proof rejects incomplete attribution: ${partialFeedback}`, () => {
    assert.doesNotMatch(partialFeedback, browserProofs.get(id));
  });
}
