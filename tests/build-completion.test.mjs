import test from 'node:test';
import assert from 'node:assert/strict';
import {runInContext} from 'node:vm';
import {buildBounds} from '../dist/engine.js';
import {startupHarness} from './mobile-startup-fixture.mjs';

// Execute the production placement handler with the real engine. These are
// source/Node checks, not a substitute for the trusted-input browser cases.
function harness() {
  const h = startupHarness({width:390,height:650});
  h.c.selectedCampaign='roadside-watch';
  // Deliberate manual replay keeps generic planning frozen; fresh first-build
  // auto-start is exercised separately in first-build-start.test.mjs.
  h.c.campaignProgress.missions['roadside-watch']={completed:true,stars:1,bestTime:60};
  h.c.start(); h.$('coachReplay').onclick(); h.$('coachingPlan').onclick();
  h.c.buildBounds = buildBounds;
  h.c.renderer.snap = point => point;
  for (const [from,to] of [['function selectBuild(','function cancel()'],['function activateBattlePoint(','function resetBattleGesture()']])
    runInContext(h.source.slice(h.source.indexOf(from),h.source.indexOf(to,h.source.indexOf(from))),h.c);
  return h;
}

test('successful paid placement finishes the order without resuming teaching or changing save identity', () => {
  const {c,$} = harness(), before = c.game.serialize();
  c.selectBuild('barracks'); c.activateBattlePoint({x:550,y:450});
  assert.equal(c.ui.build,null); assert.equal(c.ui.spell,false);
  assert.equal($('app').classList.contains('compact-build-open'),false);
  assert.equal($('compactBuild').textContent,'Build');
  assert.equal(c.game.state.gold[0],before.state.gold[0]-c.game.buildings.barracks.cost);
  assert.equal(c.coachingHold,true); assert.equal(c.game.state.time,0);
  assert.equal(c.game.serialize().rulesetId,before.rulesetId);
  const placed = c.game.serialize(); c.activateBattlePoint({x:410,y:450});
  assert.deepEqual(c.game.serialize(),placed,'another plain confirmation cannot purchase');
});

for (const failure of ['occupied','outside territory','unaffordable']) test(`${failure} preserves selection and exact engine bytes without spending`, () => {
  const {c} = harness();
  c.selectBuild('barracks');
  if(failure==='occupied') assert.equal(c.game.build('archery',550,450).ok,true);
  if(failure==='unaffordable') c.game.state.gold[0]=c.game.buildings.barracks.cost-1;
  // Controlled engine setup exercises a selection that became unaffordable.
  // No DOM or production app behavior is mocked to claim a played scenario.
  const before=c.game.serialize();
  c.activateBattlePoint({x:failure==='outside territory'?2800:550,y:450});
  assert.equal(c.ui.build,'barracks'); assert.deepEqual(c.game.serialize(),before);
  assert.equal(c.coachingHold,true);
});

test('an explicit repeat order stops as soon as another purchase is unaffordable', () => {
  const {c} = harness(); c.selectBuild('barracks');
  for(const [index,x]of [550,410,270].entries()) {
    c.activateBattlePoint({x,y:450},{repeatBuild:true});
    assert.equal(c.ui.build,index<2?'barracks':null);
  }
  assert.equal(c.game.state.gold[0],0); assert.equal(c.game.state.buildings.filter(b=>b.side===0).length,3);
  assert.equal(c.coachingHold,true); assert.equal(c.game.state.time,0);
});
