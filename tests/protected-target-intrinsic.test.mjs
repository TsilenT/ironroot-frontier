import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const css = readFileSync(new URL('../dist/styles.css', import.meta.url), 'utf8');
// Deliberately a source-budget check, not a browser layout/font emulator.
const clean = css.replace(/\/\*[\s\S]*?\*\//g, '');
function rule(selector, occurrence = -1) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const matches = [...clean.matchAll(new RegExp(`(?:^|})\\s*${escaped}\\s*\\{([^}]*)}`, 'g'))];
  assert.ok(matches.length, `Missing standalone rule: ${selector}`);
  return matches.at(occurrence)[1];
}
const value = (body, property) => {
  const result = body.match(new RegExp(`(?:^|;)\\s*${property}:\\s*([^;]+)`));
  assert.ok(result, `Missing ${property}`);
  return result[1].trim();
};
const px = (body, property) => Number.parseFloat(value(body, property));
const name = rule('.objective-hud .protected-name');
const health = rule('.objective-hud .protected-health');
const target = rule('.protected-target', 0);
const repairSelector = '.protected-mobile.protected-short-portrait .protected-target';
const repair = rule(repairSelector);
const padding = value(repair, 'padding').split(/\s+/).map(Number.parseFloat);
const lineHeight = body => px(body, 'font-size') * px(body, 'line-height');
const border = px(target, 'border');
const rowGap = px(target, 'gap');
const minimum = px(target, 'min-height');
const intrinsic = (top, bottom) => lineHeight(name) + lineHeight(health) + rowGap + top + bottom + border * 2;

test('short portrait preserves readable type and fits two lines intrinsically inside its 44px target row', () => {
  assert.deepEqual([px(name, 'font-size'), px(health, 'font-size')], [12, 11]);
  assert.deepEqual([px(name, 'line-height'), px(health, 'line-height')], [1.2, 1.2]);
  assert.deepEqual(padding, [4, 5, 7]);
  assert.equal(minimum, 44);
  assert.ok(Math.abs(intrinsic(padding[0], padding[2]) - 43.6) < 1e-9);
  assert.equal(Math.max(minimum, intrinsic(padding[0], padding[2])), 44);
  assert.match(rule('.protected-mobile.protected-short-portrait .protected-dock .objective-hud.protect-hud'), /grid-template-rows:\s*14px 44px/);
  assert.doesNotMatch(repair, /(?:^|;)\s*(?:height|max-height|overflow|overflow-y|font-size|line-height|transform):/);
});

test('original padding is a negative control that exceeds the same row without weakening the minimum', () => {
  const original = value(rule('.protected-target'), 'padding').split(/\s+/).map(Number.parseFloat);
  assert.deepEqual(original, [5, 5, 8]);
  assert.ok(Math.abs(intrinsic(original[0], original[2]) - 45.6) < 1e-9);
  assert.ok(intrinsic(original[0], original[2]) > minimum);
  // The measured browser value was 45.578px: layout rounds fractional line boxes.
  assert.ok(Math.abs(intrinsic(original[0], original[2]) - 45.578) < .03);
});

test('padding-only override preserves state styling, full labels, and meter clearance', () => {
  assert.equal(repair.trim(), 'padding: 4px 5px 7px;');
  assert.equal(value(name, 'white-space'), 'normal');
  assert.equal(value(name, 'overflow-wrap'), 'anywhere');
  assert.equal(value(health, 'white-space'), 'normal');
  const meter = rule('.protected-target .protected-meter');
  assert.equal(value(meter, 'position'), 'absolute');
  assert.deepEqual([px(meter, 'height'), px(meter, 'bottom')], [3, 2]);
  assert.ok(padding[2] > px(meter, 'height') + px(meter, 'bottom'));
  assert.match(clean, /\.protected-target\[data-state='damaged'\]\s*\{\s*border-color:/);
  assert.match(clean, /\.protected-target\[data-state='critical'\] \.protected-health\s*\{\s*grid-column: 1 \/ -1;/);
  assert.match(clean, /\.protected-target\[data-state='critical'\] \.protected-name\s*\{\s*padding-right: 14px;/);
  assert.equal(value(rule(".protected-mobile .protected-target[data-state='lost'] .protected-focus-hint"), 'display'), 'none');
  assert.equal(value(rule(".protected-mobile .protected-target[data-state='lost'] .protected-health"), 'grid-column'), '1 / -1');
  assert.equal(px(rule('.protected-focus-icon'), 'width'), 10);
  assert.ok(clean.indexOf(repairSelector) > clean.indexOf('.protected-sidebar .protected-target {'));
});
