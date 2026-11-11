import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {createInputScopeGuard} from '../dist/input-scope.js';

const app = readFileSync(new URL('../dist/app.js', import.meta.url), 'utf8');
const begin = app.indexOf("window.addEventListener('blur', () => {\n  holdInterruptedDialogs();");
const end = app.indexOf("document.addEventListener('visibilitychange'", begin);
assert.ok(begin >= 0 && end > begin, 'exercise the actual focus interruption listener');

for (const [name, state, pauses] of [
  ['live battle', {}, 1],
  ['already paused', {paused:true}, 0],
  ['title', {started:false}, 0],
  ['won battle', {winner:0}, 0],
  ['lost battle', {winner:1}, 0],
  ['objective result', {objectiveOutcome:{completed:true}}, 0],
]) test(`focus loss interrupts input and preserves ${name} state`, () => {
  const inputScope = createInputScopeGuard('battle');
  const target = {};
  inputScope.keyDown({code:'Space', target, repeat:false});
  let blur, pauseCalls = 0, holds = 0, capturesCancelled = 0, resets = 0;
  const context = {
    started:true, paused:false, objectiveOutcome:null, game:{state:{winner:null}},
    window:{addEventListener(name, fn) { assert.equal(name, 'blur'); blur = fn; }},
    holdInterruptedDialogs() { holds++; },
    cancelKeyboardCapture() { capturesCancelled++; },
    resetBattleGesture() { resets++; }, inputScope,
    pause(value) { assert.equal(value, true); context.paused = value; pauseCalls++; },
    ...state,
  };
  context.game = {state:{winner:state.winner ?? null}};
  runInNewContext(app.slice(begin, end), context);
  blur(); blur();
  assert.equal(pauseCalls, pauses, 'only the first live interruption requests the existing pause/save path');
  assert.equal(holds, 2); assert.equal(capturesCancelled, 2); assert.equal(resets, 2);
  assert.equal(inputScope.keyUp({code:'Space', target}), true, 'release from the old scope is suppressed');
});
