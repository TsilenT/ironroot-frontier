import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

export const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
export function mockCanvas(width = 1180, height = 757) {
  const calls = [], stack = [];
  let state = { fillStyle: '#000000', strokeStyle: '#000000', lineWidth: 1 }, gradientId = 0;
  const normalize = value => {
    if (value?.calls) return { canvas: [value.width, value.height], drawing: digest(value.calls) };
    if (value?.gradient) return { gradient: value.gradient, stops: value.stops };
    return value;
  };
  const finite = value => {
    if (typeof value === 'number') assert.ok(Number.isFinite(value), 'Finite canvas coordinate');
    if (Array.isArray(value)) value.forEach(finite);
  };
  const c = new Proxy({}, {
    get: (_, key) => {
      if (key in state) return state[key];
      if (key === 'measureText') return text => ({ width: String(text).length * 7 });
      if (key === 'createLinearGradient' || key === 'createRadialGradient') return (...args) => {
        args.forEach(finite); calls.push([key, ...args]);
        return { gradient: ++gradientId, stops: [], addColorStop(...stop) { this.stops.push(stop); } };
      };
      return (...args) => {
        args.forEach(finite);
        calls.push([key, ...args.map(normalize)]);
        if (key === 'save') stack.push({ ...state });
        if (key === 'restore') { assert.ok(stack.length, 'Balanced canvas restore'); state = stack.pop(); }
      };
    },
    set: (_, key, value) => {
      finite(value); state[key] = value; calls.push(['set', key, normalize(value)]); return true;
    },
  });
  return {
    width, height, calls, c, rect: { width, height },
    getContext: () => c,
    getBoundingClientRect() { return this.rect; },
    reset() { calls.length = 0; },
    depth: () => stack.length,
  };
}
export function installCanvas() {
  const created = [];
  globalThis.devicePixelRatio = 1.5;
  globalThis.matchMedia = () => ({ matches: true });
  globalThis.document = { createElement(tag) { assert.equal(tag, 'canvas'); const canvas = mockCanvas(); created.push(canvas); return canvas; } };
  return created;
}
export function makeRenderer(Renderer, width = 1180, height = 757) {
  const canvas = mockCanvas(width, height), mini = mockCanvas(240, 72);
  return new Renderer(canvas, mini);
}
export function styledCalls(canvas, method, styleKey = 'fillStyle') {
  let style;
  return canvas.calls.flatMap(call => {
    if (call[0] === 'set' && call[1] === styleKey) style = call[2];
    return call[0] === method ? [{ style, args: call.slice(1) }] : [];
  });
}
