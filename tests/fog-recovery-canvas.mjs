// NEW deterministic command recorder. This is not a pixel rasterizer or browser.
// No global registry retains constructed canvases. Only a caller's live renderer owns them.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
export const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
export function recordingCanvas(width = 1180, height = 757) {
  const calls = [], raw = [], raster = [], stack = [], listeners = new Map();
  let state = { fillStyle: '#000000', strokeStyle: '#000000', lineWidth: 1 }, lost = false, gradientId = 0;
  let w = width, h = height;
  const normalize = value => {
    if (value?.raster) return { canvas: [value.width, value.height], drawing: digest(value.raster) };
    if (value?.gradient) return { gradient: value.gradient, stops: value.stops };
    return Array.isArray(value) ? value.map(normalize) : value;
  };
  const finite = value => {
    if (typeof value === 'number') assert.ok(Number.isFinite(value), 'Finite canvas coordinate');
    if (Array.isArray(value)) value.forEach(finite);
  };
  const record = (key, args) => {
    args.forEach(finite);
    const command = [key, ...args.map(normalize)];
    calls.push(command); raw.push([key, ...args]);
    if (key === 'clearRect') raster.length = 0;
    raster.push(command);
  };
  const c = new Proxy({}, {
    get: (_, key) => {
      if (key in state) return state[key];
      if (key === 'isContextLost') return () => lost;
      if (key === 'measureText') return text => ({ width: String(text).length * 7 });
      if (key === 'createLinearGradient' || key === 'createRadialGradient') return (...args) => {
        record(key, args);
        return { gradient: ++gradientId, stops: [], addColorStop(...stop) { this.stops.push(stop); } };
      };
      return (...args) => {
        record(key, args);
        if (key === 'save') stack.push({ ...state });
        if (key === 'restore') { assert.ok(stack.length, 'Balanced canvas restore'); state = stack.pop(); }
      };
    },
    set: (_, key, value) => { finite(value); state[key] = value; record('set', [key, value]); return true; },
  });
  return {
    get width() { return w; }, set width(value) { w = value; raster.length = 0; },
    get height() { return h; }, set height(value) { h = value; raster.length = 0; },
    calls, raw, raster, c, rect: { width, height }, listeners,
    getContext: () => c, getBoundingClientRect() { return this.rect; },
    reset() { calls.length = 0; raw.length = 0; }, depth: () => stack.length,
    addEventListener(type, callback) { if (!listeners.has(type)) listeners.set(type, []); listeners.get(type).push(callback); },
    dispatch(type) { for (const callback of listeners.get(type) || []) callback({ type }); },
    setContextLost(value) { lost = value; },
  };
}
export function installCanvas(dpr = 1.5) {
  globalThis.devicePixelRatio = dpr;
  globalThis.matchMedia = () => ({ matches: true });
  globalThis.document = { createElement(tag) { assert.equal(tag, 'canvas'); return recordingCanvas(); } };
}
export function makeRenderer(Renderer, width = 1180, height = 757, dpr = 1.5) {
  installCanvas(dpr);
  return new Renderer(recordingCanvas(width, height), recordingCanvas(240, 72));
}
export function resetCanvasLogs(renderer) { for (const key of ['canvas', 'mini', 'mask', 'miniMask']) renderer[key]?.reset(); }
export const methods = (canvas, name) => canvas.calls.filter(call => call[0] === name);
