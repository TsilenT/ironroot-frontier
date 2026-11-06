import test from 'node:test';
import assert from 'node:assert/strict';
import { drawUnitPortrait } from '../dist/render.js';
import { UNITS } from '../dist/engine.js';
function mockCanvas() {
  let depth = 0,
    draws = 0;
  const context = new Proxy(
    {
      save() {
        depth++;
      },
      restore() {
        depth--;
        assert.ok(depth >= 0);
      },
    },
    {
      get(target, key) {
        return key in target
          ? target[key]
          : () => {
              draws++;
            };
      },
      set(target, key, value) {
        target[key] = value;
        return true;
      },
    },
  );
  return {
    canvas: { getContext: () => context },
    depth: () => depth,
    draws: () => draws,
  };
}
test('all five original unit models render static portrait draw commands with balanced transforms', () => {
  for (const type of Object.keys(UNITS))
    for (const side of [0, 1]) {
      const m = mockCanvas();
      assert.equal(drawUnitPortrait(m.canvas, type, side), true);
      assert.equal(m.canvas.width, 224);
      assert.equal(m.canvas.height, 200);
      assert.equal(m.depth(), 0);
      assert.ok(m.draws() > 10);
    }
});
test('portraits reject unknown units and unavailable canvas contexts safely', () => {
  assert.equal(drawUnitPortrait(null, 'warrior'), false);
  assert.equal(drawUnitPortrait({ getContext: () => null }, 'archer'), false);
  assert.equal(drawUnitPortrait({}, 'not-a-unit'), false);
  assert.equal(drawUnitPortrait({}, '__proto__'), false);
});
