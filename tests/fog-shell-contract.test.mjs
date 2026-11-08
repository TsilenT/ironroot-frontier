import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PointerGuard } from '../qa/fog-prototype/controls.js';

const read = file => readFileSync(new URL(file, import.meta.url), 'utf8');
const script = read('../qa/fog-prototype/shell.js'), html = read('../qa/fog-prototype/index.html');

test('isolated shell has no profile/storage/backup/debug/remote access', () => {
  assert.doesNotMatch(script, /localStorage|sessionStorage|indexedDB|serviceWorker|fetch\(|XMLHttpRequest|\.serialize\(|Game\.restore|\.state\s*=/);
  assert.doesNotMatch(script, /game\.state|game\.seed|game\.nextId|game\.serialize|game\.random|game\._/);
  assert.doesNotMatch(script, /import.*(?:app|profile|persistence|backup|battle-report)/);
  assert.doesNotMatch(script, /globalThis\.|window\.(?:game|debug|qa|state)\s*=/);
  assert.doesNotMatch(html, /https?:\/\/|<iframe|profile.*(?:import|export|restore)/);
});

test('fog starts unchecked, binds only at new Game, restart reuses config, field receives projection only', () => {
  assert.match(html, /id="fogEnabled" type="checkbox">/);
  assert.doesNotMatch(script, /fogEnabled.*addEventListener\(['"]change/);
  assert.match(script, /rulesetId: config\.fog \? FOG_RULESET_ID : DEFAULT_SKIRMISH_RULESET_ID/);
  assert.match(script, /if \(config\) startBattle\(config\)/);
  assert.match(script, /view = observationFacade\(observe\(game, 0\)\)/);
  assert.match(script, /renderer\.draw\(view,/); assert.doesNotMatch(script, /renderer\.draw\(game/);
  assert.match(script, /view\.fog\.frontX/);
});

test('paid engine commands retained; pause, cancel, pointer and dialog scopes gate actions', () => {
  for (const method of ['build', 'cast', 'upgrade', 'sell', 'buyCitadelOption']) assert.match(script, new RegExp(`game\\.${method}\\(`));
  assert.match(script, /const site = renderer\.snap\(point\)/);
  assert.match(script, /if \(!canAct\(\)\) return/);
  assert.match(script, /pointInObservation\(view, point\.x, point\.y\)/);
  assert.match(script, /pointercancel/); assert.match(script, /lostpointercapture/);
  assert.match(script, /modalWasPaused/); assert.match(script, /visibilitychange/);
  assert.match(script, /modalWasPaused \|\| resumeForOrder !== true/);
  assert.match(script, /closeModal\(true\); clearOrders\(\); ui\.build/);
  assert.match(html, /id="cancel"/); assert.match(html, /id="closeBuild"/); assert.match(html, /id="closeSetup"/);
});

test('pointer click commits once and release displacement counts even without move event', () => {
  const p = new PointerGuard(); p.down(1, 10, 10); assert.equal(p.up(1, 12, 11), true); assert.equal(p.up(1), false);
  p.down(2, 10, 10); assert.equal(p.up(2, 90, 10), false);
});

test('drag, cancellation, lost capture and modal epoch change never spend orders', () => {
  const p = new PointerGuard(); p.down(1, 10, 10); assert.equal(p.move(1, 30, 10).dragged, true); assert.equal(p.up(1), false);
  p.down(2, 10, 10); p.cancel(2); assert.equal(p.up(2), false);
  p.down(3, 10, 10); p.invalidate(); assert.equal(p.up(3), false);
  p.down(4, 10, 10); assert.equal(p.up(99), false); assert.equal(p.up(4), true);
});

test('second finger cancels placement for both releases, next complete gesture works', () => {
  const p = new PointerGuard(); p.down(1, 10, 10); p.down(2, 20, 20);
  assert.equal(p.up(2), false); assert.equal(p.up(1), false);
  p.down(3, 10, 10); assert.equal(p.up(3), true);
});

test('all explicit HTML button references and dialog cancel targets exist', () => {
  const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]));
  for (const [, id] of script.matchAll(/\$\('([^']+)'\)/g)) assert.ok(ids.has(id), `Missing #${id}`);
  assert.match(html, /id="accessibleState"/); assert.match(html, /aria-label="Camera position on known terrain"/);
});
