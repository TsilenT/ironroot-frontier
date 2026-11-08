import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const app = readFileSync(new URL('../dist/app.js', import.meta.url), 'utf8');
const start = app.indexOf('function keepDialogFocus()');
const end = app.indexOf("for (const event of ['focusin', 'focusout', 'click'])", start);
assert.ok(start >= 0 && end > start);
const source = app.slice(start, end);

function focusHarness({hidden = false, inside = false, hasDialog = true} = {}) {
  const state = {scrollTop: 480, calls: 0};
  const document = {activeElement: {id: inside ? 'skirmishFog' : 'body'}};
  const target = {id: 'firstMenuButton', focus(options) {
    state.calls++;
    if (!options?.preventScroll) state.scrollTop = 0;
    document.activeElement = target;
  }};
  const dialog = {classList: {contains: () => hidden}, contains: element =>
    element === target || element.id === 'skirmishFog'};
  const keep = runInNewContext(source + '\nkeepDialogFocus', {
    activeDialog: hasDialog ? dialog : null, document,
    dialogDefaultFocus: () => target,
  });
  return {state, document, keep};
}

test('passive dialog focus repair does not scroll a portrait menu after a non-focusable tap', () => {
  const {state, document, keep} = focusHarness();
  keep();
  assert.equal(document.activeElement.id, 'firstMenuButton', 'focus remains trapped in the dialog');
  assert.equal(state.scrollTop, 480, 'reading position does not jump to the first menu control');
  keep(); keep();
  assert.equal(state.calls, 1, 'later queued focus repairs are inert');
});

test('passive focus repair leaves an enabled fog checkbox or absent/hidden dialog alone', () => {
  for (const options of [{inside: true}, {hidden: true}, {hasDialog: false}]) {
    const {state, keep} = focusHarness(options);
    keep();
    assert.equal(state.calls, 0);
    assert.equal(state.scrollTop, 480);
  }
});
