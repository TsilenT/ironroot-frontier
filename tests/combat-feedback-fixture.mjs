import { Renderer } from '../dist/render.js';
import { getRuleset } from '../dist/engine.js';
import { digest, mockCanvas } from './renderer-canvas.mjs';

export const units = getRuleset('frontier-rootwarden-open').units;
export const poses = Object.freeze({
  idle: { attack: 0, hit: 0 },
  contact: { attack: .22, hit: 0 },
  recovery: { attack: .11, hit: 0 },
  settled: { attack: .01, hit: 0 },
  hit: { attack: 0, hit: .16 },
  hitRecovery: { attack: 0, hit: .08 },
  overlapping: { attack: .22, hit: .16 },
});
export function unit(type, side = 0, pose = 'idle') {
  return { id: 7, type, side, x: 800, y: 450, hp: units[type].hp / 2,
    maxHp: units[type].hp, flying: units[type].flying, cooldown: .8, ...poses[pose] };
}
export function recordUnit(type, side, pose, scale = .32, reducedMotion = false, time = 1.2) {
  const canvas = mockCanvas(), renderer = Object.create(Renderer.prototype);
  Object.assign(renderer, { c: canvas.c, scale, reducedMotion, rootwardenMotion: new Map() });
  const data = typeof pose === 'string' ? unit(type, side, pose) : { ...unit(type, side), ...pose };
  renderer.drawUnit(Object.freeze(data), time);
  return canvas;
}
export function combatSnapshots() {
  const frames = {};
  for (const type of Object.keys(units)) for (const side of [0, 1])
    for (const scale of [.12, .32, 1]) for (const reducedMotion of [false, true]) {
      const key = `${type}:${side}:${scale}:${reducedMotion ? 'reduced' : 'normal'}`;
      frames[key] = Object.fromEntries(Object.keys(poses).map(pose =>
        [pose, digest(recordUnit(type, side, pose, scale, reducedMotion).calls)]));
    }
  return frames;
}
