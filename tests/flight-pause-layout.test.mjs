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

test('read-only aerie description insets belong to the real desktop and mobile scrollports',()=>{
  const desktop=rule('.selection-panel');
  const mobile=rule('.protected-mobile .command-deck:has(.selection-panel:not(.hidden))');
  assert.match(desktop,/overflow-y: auto;/);
  assert.match(desktop,/scroll-padding-block: 8px;/);
  assert.match(mobile,/scroll-padding-block: 8px;/);
  assert.match(rule('.protected-mobile .command-deck'),/overflow-y: auto;/);
  assert.match(rule('.protected-mobile .command-deck .selection-panel'),/overflow: visible;/);
  assert.doesNotMatch(css,/flight-order-buttons|flight-orders/);
  assert.match(rule('.protected-mobile .selection-actions button, .protected-mobile #closeSelection'),/min-width: 44px; min-height: 44px;/);
});

test('short portrait pause retains readable capacity and actions in its compact layout',()=>{
  const compact=css.split('@media (max-width: 700px) and (max-height: 700px) and (orientation: portrait) {')[1]?.split('\n}')[0];
  assert.ok(compact);
  const headingSize=Number(compact.match(/\.menu-heading h2 \{ font-size: (\d+)px;/)?.[1]);
  assert.ok(headingSize>=28,'the compact heading remains readable');
  assert.doesNotMatch(compact,/display: none|overflow: hidden|transform|zoom/);
  const narrow=css.split('@media (max-width: 400px) and (max-height: 600px) and (orientation: portrait) {')[1]?.split('\n}')[0];
  // Only secondary captions disappear; action labels and the capacity control
  // remain present. Real four-viewport containment is checked in the browser.
  assert.match(narrow,/^\s*\.pause-menu \.pause-utilities small \{ display: none; \}\s*$/);
  assert.match(rule('.pause-veil .pause-menu button, .menu-confirm button'),/min-height: 44px;/);
  assert.match(rule('.bridge-details summary'),/min-height: 44px;/);
  assert.match(rule('.modal'),/overflow: auto;/);
  assert.doesNotMatch(html,/pauseFlights|pauseFlightList|flightNorth|flightHold|flightSouth/);
});

