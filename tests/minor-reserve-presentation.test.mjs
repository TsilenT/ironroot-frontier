import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Game } from '../dist/engine.js';
import { createCampaignMission, getCampaignMission, getCampaignTargets, CAMPAIGN_PROGRESS_MISSIONS, createCampaignProgress } from '../dist/campaign.js';
import { minorReserveStatus } from '../dist/minor-reserve.js';
import { minorReserveView } from '../dist/minor-reserve-view.js';
import { missionBriefing } from '../dist/campaign-presentation.js';
import { getMissionScouting, renderScoutingSvg } from '../dist/scouting.js';
import { Renderer } from '../dist/render.js';
import { installCanvas, makeRenderer } from './renderer-canvas.mjs';
import { startupHarness } from './mobile-startup-fixture.mjs';

const ID = 'wake-the-reserve';
const warningGame = () => {
  const game = createCampaignMission(ID);
  game.state.buildings.find(building => building.id === game.state.minorReserve.postId).hp = 0;
  game.update(.05);
  assert.equal(minorReserveStatus(game).phase, 'warning');
  return game;
};
const unlocked = () => ({ ...createCampaignProgress(), missions: Object.fromEntries(CAMPAIGN_PROGRESS_MISSIONS
  .filter(mission => mission.id !== ID).map(mission => [mission.id, { completed: true, stars: 1, bestTime: 60 }])) });
function appHarness(size = {}) {
  const harness = startupHarness(size);
  harness.c.minorReserveView = minorReserveView;
  harness.c.campaignProgress = unlocked();
  return harness;
}

test('optional landmark and six-second warning are pure views of the original engine identity', () => {
  const game = createCampaignMission(ID), initial = JSON.stringify(game.serialize());
  const armed = minorReserveView(game);
  assert.equal(armed.title, 'Optional North Command Post');
  assert.equal(armed.landmark.id, game.state.minorReserve.postId);
  assert.equal(armed.landmark.x, 2230);
  assert.equal(armed.focus.x, 2230);
  assert.match(armed.description, /not a victory requirement/);
  assert.ok(Object.isFrozen(armed) && Object.isFrozen(armed.focus) && Object.isFrozen(armed.landmark));
  assert.equal(JSON.stringify(game.serialize()), initial);
  const warning = warningGame(), before = JSON.stringify(warning.serialize());
  for (let index = 0; index < 4; index++) {
    assert.equal(minorReserveView(warning).title, 'NORTH RESERVE · 6s');
    assert.equal(minorReserveView(warning).focus.x, 3050);
    assert.equal(minorReserveView(warning).landmark, null);
  }
  assert.equal(JSON.stringify(warning.serialize()), before);
});

test('Resume displays the saved remaining warning and cap queue/released never means defeated', () => {
  const game = warningGame();
  for (let index = 0; index < 9; index++) game.update(.25);
  const restored = Game.restore(game.serialize());
  assert.equal(minorReserveView(restored).title, 'NORTH RESERVE · 4s');
  assert.deepEqual(minorReserveView(restored), minorReserveView(game));
  // Presentation fixtures model queue records directly, not a balance run.
  const state = game.state.minorReserve;
  game.tick = state.triggerTick + 120;
  state.releases = [{ unitId: 900, tick: game.tick }, { unitId: 901, tick: game.tick }];
  const queued = minorReserveView(game);
  assert.match(queued.detail, /2\/6 released.*capacity delay/);
  assert.match(queued.description, /remaining 4/);
  state.releases.push(...[902, 903, 904, 905].map(unitId => ({ unitId, tick: game.tick })));
  const complete = minorReserveView(game);
  assert.equal(complete.phase, 'complete');
  assert.match(complete.description, /Released does not mean defeated/);
  assert.match(complete.description, /ordinary enemy production continues/);
  assert.match(complete.description, /No reserve kills are required/);
  assert.equal(minorReserveView(game, { ended: true }).ended, true);
  game.state.winner = 0;
  assert.equal(minorReserveView(game).ended, true);
  for (const id of ['the-shared-watch', 'a-river-between-us', 'false-quiet'])
    assert.equal(minorReserveView(createCampaignMission(id)), null, id);
});

test('briefing and fully visible scouting name an optional post without objective markers', () => {
  const mission = getCampaignMission(ID), before = JSON.stringify(mission);
  const brief = missionBriefing(mission), scouting = getMissionScouting(mission), svg = renderScoutingSvg(mission);
  assert.equal(brief.protection, '');
  assert.match(brief.goal, /1 HP is enough/);
  assert.match(brief.goal, /North Command Post and its reserve are optional/);
  assert.ok(brief.facts.some(fact => /3:00 and 4,500-HP stars are optional/.test(fact)));
  assert.equal(scouting.objectives.markedCount, 0);
  assert.equal(scouting.objectives.protectedCount, 0);
  const post = scouting.armies[1].buildings.find(building => building.x === 2230 && building.lane === 0 && building.type === 'watchtower');
  assert.equal(post.targetKind, null);
  assert.match(post.targetName, /North Command Post.*optional/);
  for (const pattern of [/All roads are fully visible/, /six-second warning/, /4 warriors and 2 archers/, /70-unit enemy cap/, /Paid enemy building and factory production continue/, /No post, road or reserve kill is required/, /stars are optional/])
    assert.match(scouting.objectives.summary, pattern);
  assert.doesNotMatch(svg, /class="scouting-(destroy|protect)"/);
  assert.equal(getCampaignTargets(createCampaignMission(ID), ID).length, 0);
  assert.equal(JSON.stringify(mission), before);
});

for (const [width, height] of [[320, 430], [390, 650], [844, 390], [1180, 768]]) {
  test(`real app optional card, manual focus, pause and terminal precedence at ${width}x${height}`, () => {
    const { c: app, $, log } = appHarness({ width, height }), game = createCampaignMission(ID);
    app.start(game, null, ID);
    app.updateHUD();
    assert.equal(app.protectedControls.size, 0);
    assert.equal($('protectedTargets').classList.contains('hidden'), true);
    assert.equal($('minorReserveHUD').classList.contains('hidden'), false);
    assert.equal($('minorReserveTitle').textContent, 'Optional North Command Post');
    assert.equal($('minorReserveLocation').textContent, 'Off-screen · focus north');
    assert.equal($('objectiveHUD').parentNode, $('protectedDock'));
    if (width <= 700 || height <= 500) {
      assert.equal(app.viewportPause.active, false);
      assert.equal(log.measures[0].length, 9, 'the optional focus control is measured separately from targets');
      assert.ok(log.measures[0].every(rect => rect.width >= 44 && rect.height >= 44));
    }
    app.ui.build = 'barracks'; app.follow = true;
    const before = JSON.stringify(game.serialize());
    $('focusMinorReserve').onclick({ detail: 0 });
    assert.equal(app.renderer.camera, 2230);
    assert.equal(app.ui.build, null);
    assert.equal(app.follow, false);
    assert.equal(JSON.stringify(game.serialize()), before);
    app.paused = true; app.renderer.camera = 450;
    $('focusMinorReserve').onclick({ detail: 0 });
    assert.equal(app.renderer.camera, 450);
    app.paused = false;
    app.objectiveOutcome = { completed: true, failed: false, label: 'Citadel victory', objectives: [] };
    app.updateHUD();
    assert.equal($('objectiveProgress').textContent, 'Citadel victory');
    assert.equal($('minorReserveHUD').classList.contains('hidden'), true);
    $('focusMinorReserve').onclick({ detail: 0 });
    assert.equal(app.renderer.camera, 450);
  });
}

test('real app announces phase transitions once, keeps resume time, and restarts the original post', () => {
  const { c: app, $ } = appHarness(), warning = warningGame();
  for (let index = 0; index < 9; index++) warning.update(.25);
  app.start(Game.restore(warning.serialize()), null, ID);
  assert.equal($('minorReserveTitle').textContent, 'NORTH RESERVE · 4s');
  assert.match($('protectedAlert').textContent, /in 4 seconds/);
  $('protectedAlert').textContent = 'Later status';
  app.updateHUD();
  assert.equal($('protectedAlert').textContent, 'Later status');
  app.start(createCampaignMission(ID), null, ID);
  assert.equal($('minorReserveTitle').textContent, 'Optional North Command Post');
  assert.equal($('protectedAlert').textContent, '');
  app.start(createCampaignMission('the-shared-watch'), null, 'the-shared-watch');
  assert.equal($('minorReserveHUD').classList.contains('hidden'), true);
  assert.equal($('app').classList.contains('minor-reserve-battle'), false);
});

test('renderer adds only optional landmark text/flag and preserves game and UI state', () => {
  installCanvas();
  const renderer = makeRenderer(Renderer, 1180, 500), game = createCampaignMission(ID);
  const ui = { paused: true, minorReserve: minorReserveView(game) }, before = JSON.stringify(game.serialize()), uiBefore = JSON.stringify(ui);
  renderer.camera = 2230; renderer.clampCamera();
  renderer.draw(game, ui, 0);
  assert.ok(renderer.canvas.calls.some(call => call[0] === 'fillText' && call[1] === 'North Command Post · optional'));
  assert.ok(renderer.mini.calls.some(call => call[0] === 'strokeRect' && call[3] === 7 && call[4] === 7));
  assert.equal(JSON.stringify(game.serialize()), before);
  assert.equal(JSON.stringify(ui), uiBefore);
  renderer.canvas.reset(); renderer.mini.reset();
  renderer.draw(game, { paused: true, minorReserve: minorReserveView(game, { ended: true }) }, 0);
  assert.equal(renderer.canvas.calls.some(call => call[0] === 'fillText' && /North Command Post/.test(call[1])), false);
});

test('runtime presentation has no QA imports, reserve state writes or UI-owned timer', () => {
  const app = readFileSync(new URL('../dist/app.js', import.meta.url), 'utf8');
  const pure = readFileSync(new URL('../dist/minor-reserve-view.js', import.meta.url), 'utf8');
  const focus = app.slice(app.indexOf("$('focusMinorReserve').onclick"), app.indexOf('function updateProtectedObjectives()'));
  assert.match(focus, /!canFocusProtectedObjective\(\)/);
  assert.match(focus, /objectivePressValid\(armedReserveControl, event\)/);
  assert.match(app.slice(app.indexOf('function objectivePressValid('),app.indexOf("document.addEventListener('pointerdown', event => {",app.indexOf('function objectivePressValid('))), /press\.pointerId !== event\.pointerId/);
  assert.match(focus, /reserve\.phase !== lastReservePhase/);
  assert.doesNotMatch(pure + focus, /from ['"][^'"]*qa\/|setInterval|setTimeout|triggerTick\s*=|releases\.push|advanceMinorReserve/);
  assert.match(app.slice(app.indexOf('function interruptMobileInput()')), /armedReserveControl = null/);
});
