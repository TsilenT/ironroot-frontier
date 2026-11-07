import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fullyContained} from '../qa/browser/flight-pause-layout-geometry.mjs';

const css=readFileSync(new URL('../dist/styles.css',import.meta.url),'utf8');
const html=readFileSync(new URL('../dist/index.html',import.meta.url),'utf8');
const rules=[...css.replace(/\/\*[\s\S]*?\*\//g,'').matchAll(/([^{}]+)\{([^{}]*)\}/g)];
const rule=selector=>rules.filter(match=>match[1].trim()===selector).map(match=>match[2]).join('\n');

test('strict geometry rejects the recorded fractional North clip and initial Restart overflow',()=>{
  // Retained native observations from the unchanged 598925c cloud report.
  // These test the oracle, not a source-derived claim that repaired CSS fits.
  const north={left:25,top:296.375,right:76.328125,bottom:342.375};
  const deck={left:0,top:49,right:216,bottom:342};
  assert.equal(fullyContained(north,deck),false,'0.375px clipping must fail');
  assert.ok((north.top+north.bottom)/2<deck.bottom,'a passing centre hit is insufficient');
  assert.equal(fullyContained({...north,bottom:342},deck),true);
  assert.equal(fullyContained({left:16,top:542.765625,right:304,bottom:586.765625},
    {left:0,top:0,right:320,bottom:568}),false,'initial Restart overflow must fail');
});

test('flight insets belong to the real desktop and mobile scrollports without shrinking controls',()=>{
  const desktop=rule('.selection-panel:has(.flight-orders:not(.hidden))');
  const mobile=rule('.protected-mobile .command-deck:has(.flight-orders:not(.hidden))');
  assert.match(desktop,/overflow-y: auto;/);
  assert.match(desktop,/scroll-padding-block: 8px;/);
  assert.match(mobile,/scroll-padding-block: 8px;/);
  assert.match(rule('.protected-mobile .command-deck'),/overflow-y: auto;/);
  assert.match(rule('.protected-mobile .command-deck .selection-panel:has(.flight-orders:not(.hidden))'),/overflow: visible;/);
  const control=rule('.flight-order-buttons button');
  assert.match(control,/min-width: 44px;/);assert.match(control,/min-height: 44px;/);
  assert.match(control,/font-size: 12px;/);
});

test('short portrait pause reclaims only whitespace and retains readable disclosure and actions',()=>{
  const compact=css.split('@media (max-width: 400px) and (max-height: 600px) and (orientation: portrait) {')[1]?.split('\n}')[0];
  assert.ok(compact);
  assert.match(compact,/\.pause-menu \{ padding: 16px 18px; \}/);
  assert.match(compact,/\.pause-menu \.pause-briefing \{ margin: 10px 0; padding: 10px 0; \}/);
  assert.match(compact,/\.pause-menu \.pause-utilities, \.pause-menu \.pause-flights \{ margin: 8px 0; \}/);
  assert.match(compact,/\.pause-menu \.menu-status \{ margin: 8px 0; \}/);
  assert.doesNotMatch(compact,/font-size|line-height|display: none|overflow: hidden|transform|zoom/);
  assert.match(rule('.pause-veil .pause-menu button, .menu-confirm button'),/min-height: 44px;/);
  assert.match(rule('.pause-flights summary'),/min-height: 44px;.*font-size: 14px;/s);
  assert.match(rule('.pause-flights p'),/font-size: 13px; line-height: 1.5;/);
  assert.match(rule('.modal'),/overflow: auto;/);
  assert.match(html,/<details id="pauseFlights"[^>]*>[\s\S]*?<summary>Air routes<\/summary>[\s\S]*?<p id="pauseFlightList"><\/p>[\s\S]*?Select an aerie after resuming to change future launches\./);
});

