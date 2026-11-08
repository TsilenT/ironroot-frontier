import test from 'node:test';
import assert from 'node:assert/strict';
import {runInContext} from 'node:vm';
import {buildBounds, SPELL} from '../dist/engine.js';
import {createCampaignProgress, ONBOARDING_MISSIONS, getCampaignTargets, evaluateCampaignMission} from '../dist/campaign.js';
import {recommendCampaignSite} from '../dist/campaign-flow.js';
import {advanceObjectiveBattle} from '../dist/objectives.js';
import {moveCursor} from '../dist/controller.js';
import {startupHarness} from './mobile-startup-fixture.mjs';

// Real app entry handlers and engine, with the existing narrow DOM fixture.
// This is not native browser, physical keyboard or gamepad evidence.
function setup(index = 0) {
  const h = startupHarness({width:390, height:650}), {c,$} = h;
  const progress = createCampaignProgress();
  for (const mission of ONBOARDING_MISSIONS.slice(0,index))
    progress.missions[mission.id] = {completed:true, stars:1, bestTime:60};
  Object.assign(c, {
    campaignProgress:progress, selectedCampaign:ONBOARDING_MISSIONS[index].id,
    buildBounds, getCampaignTargets, evaluateCampaignMission, advanceObjectiveBattle,
    last:0, lastProfileCheck:0, saveTimer:0, hudTimer:0, toastTimer:0,
    updateController(){}, sampleBattleReport(){}, finish(){}, updateAudio(){},
    drawCampaignGuidance(){}, flushProtectedWarnings(){},
    padActive:false, moveCursor, toast(text){c.lastToast = text;},
  });
  c.renderer.draw = () => {};
  c.renderer.snap = point => point;
  c.renderer.screenToWorld = point => point;
  c.document.hasFocus = () => true;
  c.window.addEventListener = (type, handler) => {if (type === 'keydown') c.keyHandler = handler;};
  for (const [from,to] of [
    ['function selectBuild(', 'function cancel()'],
    ["$('rally').onclick =", 'function pauseControl('],
    ['function activateBattlePoint(', 'function resetBattleGesture()'],
    ["window.addEventListener('keydown', (e) => {", "document.addEventListener('visibilitychange'"],
    ['function controllerScope()', 'function padControls('],
    ['function controllerBack(', 'const controller = new GamepadInput('],
    ['function frame(now)', '\nupdateHUD();\nrequestAnimationFrame(frame);'],
  ]) runInContext(h.source.slice(h.source.indexOf(from), h.source.indexOf(to,h.source.indexOf(from))),c);
  c.start();
  return {...h,
    key(code,extra={}) {const e={code,target:$('battle'),preventDefault(){this.defaultPrevented=true;},...extra};c.keyHandler(e);return e;},
    buy() {const {site}=recommendCampaignSite(c.game,'barracks');assert.ok(site);if(c.ui.build!=='barracks')c.selectBuild('barracks');c.activateBattlePoint(site);return site;},
  };
}
function state(h) {
  const {c,$,log} = h;
  return {game:c.game.serialize(), profile:structuredClone(c.campaignProgress),
    build:c.ui.build, spell:c.ui.spell, selected:c.ui.selected,
    firstBuildHold:c.firstBuildHold, coachingHold:c.coachingHold, paused:c.paused,
    saves:log.saves, claims:log.claims, drawer:$('app').classList.contains('compact-build-open')};
}
const entryPoints = {
  card:h => h.$('rally').click(),
  'shared handler':h => h.$('rally').onclick(),
  'default shortcut':h => h.key('KeyR'),
  'remapped shortcut':h => {h.c.preferences.keyboard={version:1,bindings:{volley:'KeyV'}};h.key('KeyV');},
  'controller rally action':h => h.c.handleControllerAction({action:'rally'}),
};
for (const [name,activate] of Object.entries(entryPoints)) test(`${name} cannot replace the first barracks or spend/resume`, () => {
  const h=setup(),{c}=h;c.selectBuild('barracks');
  const before=state(h);activate(h);
  assert.deepEqual(state(h),before);
  assert.equal(c.ui.spell,false);assert.equal(c.ui.build,'barracks');
  c.frame(100);c.frame(9000);assert.deepEqual(state(h),before);
});

test('first-build card is immediately disabled with visible and accessible guidance, then resets after placement', () => {
  const h=setup(),{c,$}=h;
  assert.equal($('rally').disabled,true);
  assert.match($('rallyCost').innerHTML,/Build a barracks/);
  const label=$('rally').attributes['aria-label'];
  assert.equal(label,'Arrow volley. Area damage to troops.');
  assert.equal($('rally').attributes['aria-describedby'],'rallyCost');
  c.selectBuild('barracks');h.buy();
  assert.equal(c.firstBuildHold,false);assert.equal(c.coachingHold,false);
  assert.equal($('rally').disabled,false);
  assert.match($('rallyCost').innerHTML,/75.*25s cooldown/);
  assert.equal($('rally').attributes['aria-label'],label,'status never replaces the action name and effect');
  assert.equal($('rally').attributes['aria-describedby'],'rallyCost');
});

for (const failed of ['no placement','invalid territory','occupied site','unaffordable']) test(`${failed} retains the hold and a later legal barracks enables a paid cast`, () => {
  const h=setup(),{c,$}=h;c.selectBuild('barracks');
  if (failed==='occupied site') assert.equal(c.game.build('archery',550,450).ok,true);
  const gold=c.game.state.gold[0];
  if (failed==='unaffordable') c.game.state.gold[0]=c.game.buildings.barracks.cost-1;
  const before=state(h);
  if (failed!=='no placement') c.activateBattlePoint({x:failed==='invalid territory'?3000:550,y:450});
  assert.deepEqual(state(h),before);$('rally').onclick();assert.deepEqual(state(h),before);
  // Unit-test setup restores funds only after checking the failed command.
  if (failed==='unaffordable') c.game.state.gold[0]=gold;
  h.buy();assert.equal(c.firstBuildHold,false);assert.equal(c.ui.build,null);
  const placed=c.game.serialize();h.key('KeyR');assert.equal(c.ui.spell,true);
  assert.deepEqual(c.game.serialize(),placed,'arming does not itself charge');
  c.activateBattlePoint({x:900,y:450});assert.equal(c.ui.spell,false);
  assert.equal(c.game.state.gold[0],placed.state.gold[0]-SPELL.cost);
  assert.equal(c.game.state.spellCooldown[0],SPELL.cooldown);
  assert.equal(c.game.state.time,placed.state.time);
});

test('released entry routes retain remapping, toggle, cancellation, affordability and cooldown checks', () => {
  const h=setup(),{c,$}=h;h.buy();
  c.preferences.keyboard={version:1,bindings:{volley:'KeyV'}};
  h.key('KeyR');assert.equal(c.ui.spell,false);
  h.key('KeyV');assert.equal(c.ui.spell,true);
  h.key('KeyV',{repeat:true});assert.equal(c.ui.spell,true);
  h.key('KeyV');assert.equal(c.ui.spell,false);
  $('rally').click();assert.equal(c.ui.spell,true);
  h.key('Escape');assert.equal(c.ui.spell,false);
  c.handleControllerAction({action:'rally'});assert.equal(c.ui.spell,true);
  c.handleControllerAction({action:'cancel'});assert.equal(c.ui.spell,false);
  c.selectBuild('barracks');c.game.state.gold[0]=SPELL.cost-1;
  const poor=state(h);$('rally').onclick();assert.deepEqual(state(h),poor);assert.match(c.lastToast,/Need 75 gold/);
  c.game.state.gold[0]=SPELL.cost;c.game.state.spellCooldown[0]=2;
  const cooling=state(h);$('rally').onclick();assert.deepEqual(state(h),cooling);assert.match(c.lastToast,/ready in 2 seconds/);
  c.updateHUD();assert.match($('rallyCost').innerHTML,/2s.*Recharging/);
  assert.equal($('rally').attributes['aria-label'],'Arrow volley. Area damage to troops.');
  assert.equal($('rally').attributes['aria-describedby'],'rallyCost');
});

for (const guard of ['paused','hidden','viewport','recovery','profile','limit','coaching dialog']) test(`arming still respects the ${guard} safety boundary after release`, () => {
  const h=setup(),{c,$}=h;h.buy();c.selectBuild('barracks');
  if(guard==='paused')c.pause(true);
  if(guard==='hidden')c.document.hidden=true;
  if(guard==='viewport')c.viewportPause.measure(true);
  if(guard==='recovery')c.recoveryHold={};
  if(guard==='profile')c.profileGate={};
  if(guard==='limit')c.battleSafetyReason='limit';
  if(guard==='coaching dialog')$('coachingModal').classList.remove('hidden');
  const before=state(h);$('rally').onclick();h.key('KeyR');c.handleControllerAction({action:'rally'});assert.deepEqual(state(h),before);
});

test('later planning lessons still allow their ordinary paid volley without releasing teaching', () => {
  const h=setup(1),{c,$}=h;assert.equal(c.firstBuildHold,false);assert.equal(c.coachingHold,true);
  const reading=state(h);$('rally').onclick();assert.deepEqual(state(h),reading);
  $('coachingPlan').onclick();assert.equal($('rally').disabled,false);
  const before=c.game.serialize();h.key('KeyR');assert.equal(c.ui.spell,true);
  c.activateBattlePoint({x:900,y:450});assert.equal(c.game.state.gold[0],before.state.gold[0]-SPELL.cost);
  assert.equal(c.game.state.spellCooldown[0],SPELL.cooldown);assert.equal(c.coachingHold,true);assert.equal(c.game.state.time,0);
});
