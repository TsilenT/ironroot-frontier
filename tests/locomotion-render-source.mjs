/** Reverse only the declared locomotion change; keep historical render oracles literal. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {rendererBeforeImpact} from './impact-render-source.mjs';

export function rendererBeforeLocomotion() {
  let source = rendererBeforeImpact();
  assert.equal(source.split('unitMotion').length - 1, 8);
  source = source.replaceAll('unitMotion', 'rootwardenMotion');
  const changes = [
    [`    const unitIds = new Set();
    for (const u of s.units) {
      unitIds.add(u.id);`, `    const wardenIds = new Set();
    for (const u of s.units) if (u.type === 'rootwarden') {
      wardenIds.add(u.id);`],
    [`      if (!old || old.time !== s.time) {
        const distance = old && s.time > old.time ? Math.hypot(u.x - old.x, u.y - old.y) : 0;
        const phase = old && s.time > old.time ? old.phase : s.time * 11 + u.id;
        this.rootwardenMotion.set(u.id, {
          x: u.x, y: u.y, time: s.time, moving: distance > 0.001,
          phase: (phase + distance * 11 / this.units[u.type].speed) % (2 * Math.PI),
        });
      }`, `      if (!old || old.time !== s.time) this.rootwardenMotion.set(u.id, {
        x: u.x, y: u.y, time: s.time,
        moving: !!old && Math.hypot(u.x - old.x, u.y - old.y) > 0.001,
      });`],
    ['if (!unitIds.has(id))', 'if (!wardenIds.has(id))'],
    [`      locomotion = battlefield ? this.rootwardenMotion?.get(u.id) : null,
      moving = battlefield ? !!locomotion?.moving : u.cooldown <= 0,
      walk = this.reducedMotion ? 0 : Math.sin(locomotion?.phase ?? time * 11 + u.id) * 2;`,
    `      moving = u.cooldown <= 0,
      walk = this.reducedMotion ? 0 : Math.sin(time * 11 + u.id) * 2;`],
  ];
  for (const [addition, prior] of changes) {
    assert.equal(source.split(addition).length - 1, 1, 'exact declared locomotion hunk');
    source = source.replace(addition, prior);
  }
  // Current main e719cff14f29f225c4c71e77af10c8ca31bdc11f release v0.40.2, independently read before editing.
  assert.equal(createHash('sha256').update(source).digest('hex'), '5cbbec3a347272527adbd71a9cf2981befdc7d2fc435486d2572c4d1daaa61cb');
  return source;
}

export function fogViewBeforeLocomotion() {
  const source = readFileSync(new URL('../dist/fog-view.js', import.meta.url), 'utf8');
  assert.equal(source.split('this.unitMotion.clear()').length - 1, 1);
  const prior = source.replace('this.unitMotion.clear()', 'this.rootwardenMotion.clear()');
  assert.equal(createHash('sha256').update(prior).digest('hex'), 'a4a4fbbe63f676b4a86917dbefa5e89668f021dc68d82cf69620d2b3b5559145');
  return prior;
}
