// Future native browser regressions. No virtual clock, app-state mutation,
// injected troops/gold, or accelerated callbacks. Synthetic prerequisite records
// are disclosed separately from paid UI placement and paid-engine checkpoints.
import { expect } from '@playwright/test';
import { Game } from '../../dist/engine.js';
import { supportsFog } from '../../dist/fog.js';
import { createProgressionCampaignMission, getProgressionCampaignOverview, recordCampaignResult } from '../../dist/campaign.js';
import { missionBriefing } from '../../dist/campaign-presentation.js';
import { campaignControlStatus, bridgeIncome } from '../../dist/bridge-control.js';
import { controlProgressLabel } from '../../dist/campaign-control-view.js';
import { getMissionScouting } from '../../dist/scouting.js';
import { BACKUP_STORAGE_KEYS as K, parseBackup } from '../../dist/backup.js';
import { CURRENT_PROFILE_PROTOCOL_VERSION, PROFILE_MARKER_KEY as MARKER } from '../../dist/profile-session.js';
import { test, press, tapPoint, homePoint, pause, saved, seedOnce, openBackup, downloadBackup } from './map-browser-helpers.mjs';
import { openBuildControls } from './shared-build-controls.mjs';
import { settlePhoneViewport } from './phone-text-evidence.mjs';
import { assertPassiveContinuation } from './passive-continuation.mjs';
import { ID, MISSION, sharedCrossingProgress, sharedCrossingFixtures, priorProfile } from './shared-crossing-fixtures.mjs';

const domains = page => page.evaluate(keys => Object.fromEntries(keys.map(key => [key, localStorage.getItem(key)])), Object.values(K));
const earned = async page => Object.fromEntries(Object.entries(await domains(page)).filter(([key]) => key !== K.battle));
const layout = battle => battle.game.state.buildings.map(b => [b.type, b.side, b.x, b.y, b.level]);
async function choose(page) {
  await press(page, '[data-mode="campaign"]'); await press(page, '#campaignStoryNav');
  await press(page, '[data-chapter="river-compact"]'); await press(page, `[data-mission="${ID}"]`);
}
function identity(battle) {
  expect(battle).toMatchObject({ version: 3, scenario: { kind: 'campaign', id: ID, revision: 1 },
    game: { version: 3, rulesetId: 'frontier-campaign-shared-crossing', rulesetRevision: 1, mapId: 'classic', mapRevision: 1 } });
  const game = Game.restore(battle.game);
  expect(supportsFog(game.ruleset)).toBe(false); expect(battle.game.state.bridgeControl).toBeUndefined();
  expect(bridgeIncome(game)).toEqual([0, 0]); return game;
}
async function controlHUD(page, battle) {
  const game = identity(battle);
  await expect(page.locator('#objectiveProgress')).toHaveText(controlProgressLabel(campaignControlStatus(game)));
  await expect(page.locator('#objectiveProgress')).toHaveAccessibleName(/seconds secured/);
  await expect(page.locator('#bridgeBattleStatus')).toContainText('Bridges award no gold in this mission.');
  await expect(page.locator('#bridgeBattleStatus')).not.toContainText(/earning|payment stopped|payout/);
  await expect(page.locator('#minimap')).toHaveAttribute('aria-describedby', 'bridgeBattleStatus');
  await expect(page.locator('#income')).not.toHaveAccessibleName(/including.*bridges/);
  await expect(page.locator('#app')).not.toHaveClass(/bridge-income/);
}
async function screenshot(page, info, name) {
  await info.attach(name, { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });
}

test('Common Ground gates Chapter 6; briefing and scouting disclose the real force and cumulative no-bonus objective', async ({ page }, info) => {
  test.setTimeout(45000);
  const locked = sharedCrossingProgress(); delete locked.missions['common-ground'];
  await seedOnce(page, priorProfile(null, locked)); const before = await earned(page);
  await choose(page); await expect(page.locator('#start')).toBeDisabled();
  await expect(page.locator('#campaignUnlock')).toContainText('Complete Common Ground');
  await expect(page.locator('#campaignChapterNav')).toContainText('Chapter 6');
  expect(await saved(page)).toBeNull(); expect(await earned(page)).toEqual(before);

  await seedOnce(page, priorProfile()); const unlocked = await earned(page);
  await expect(page.locator('#campaignMissionTitle')).toHaveText('Shared Crossing');
  await expect(page.locator('#campaignChapterNav')).toContainText('The River Compact');
  await expect(page.locator('#campaignMissionPosition')).toHaveText('Mission 1 of 2');
  await expect(page.locator('#campaignProgressText')).toHaveText('19/21 missions · 57/63 stars');
  await expect(page.locator('#start')).toBeEnabled();
  const briefing = missionBriefing(MISSION), report = getMissionScouting(MISSION);
  await expect(page.locator('#campaignGoal')).toHaveText(briefing.goal);
  await expect(page.locator('#campaignGoalFacts li')).toHaveText(briefing.facts);
  await press(page, '#campaignRules summary');
  await expect(page.locator('#campaignObjective')).toHaveText(MISSION.objective);
  for (const text of MISSION.briefing) await expect(page.locator('#campaignBriefing')).toContainText(text);
  await expect(page.locator('#campaignBriefing')).toContainText('1,369 gold');
  await expect(page.locator('#campaignBriefing')).toContainText('Ground troops capture after 2 continuous uncontested seconds');
  await page.locator('#campaignScoutToggle').focus(); await page.keyboard.press('Enter');
  await expect(page.locator('#campaignScout')).toHaveJSProperty('open', true);
  const scout = page.locator('#campaignScoutReport');
  await expect(scout.locator('.scouting-objectives')).toHaveText(report.objectives.summary);
  await expect(scout.locator('.scouting-crossing')).toHaveCount(3);
  expect(await scout.locator('.scouting-crossing').evaluateAll(nodes => nodes.map(node => ['x', 'y', 'width', 'height'].map(key => Number(node.getAttribute(key))))))
    .toEqual([[1495, 195, 210, 130], [1495, 385, 210, 130], [1495, 575, 210, 130]]);
  for (const army of report.armies) {
    await expect(scout.locator(`.scouting-army-${army.position} .scouting-roster`)).toHaveText(army.summary);
    expect(army.buildingCount).toBe(army.side === 0 ? 1 : 6);
    for (const building of army.buildings) {
      const symbol = scout.locator(`.scouting-building[data-side="${army.side}"][transform="translate(${building.x} ${building.y})"]`);
      await expect(symbol).toHaveCount(1); await expect(symbol.locator('title')).toContainText(`level ${building.level}`);
    }
  }
  await screenshot(page, info, 'shared-crossing-briefing-scouting');
  expect(await earned(page)).toEqual(unlocked); expect(await saved(page)).toBeNull();
});

test('fresh launch uses native paid placement and ordinary mine income without bridge rewards or fog', async ({ page }, info) => {
  test.setTimeout(35000);
  await seedOnce(page, priorProfile()); const before = await earned(page);
  await press(page, '#start'); await expect(page.locator('#welcome')).toBeHidden(); await settlePhoneViewport(page);
  const initial = await pause(page), fresh = identity(initial);
  expect(initial.game.state.campaignControl).toEqual({ bridges: Array.from({ length: 3 }, () => ({ owner: null, capturing: null, progress: 0 })), heldSeconds: 0 });
  expect(fresh.state.buildings.filter(b => b.side === 0).map(b => [b.type, b.x, b.y])).toEqual([['mint', 410, 450]]);
  await controlHUD(page, initial); await expect(page.locator('#income')).toHaveText('+7.5 /s');
  await press(page, '#resume'); await openBuildControls(page); await press(page, '[data-type="barracks"]');
  const point = await homePoint(page, fresh.map, 550, 450);
  expect(await page.evaluate(p => document.elementFromPoint(p.x, p.y)?.id, point)).toBe('battle');
  // Observe the real gesture only; this listener never alters input or game state.
  await page.locator('#battle').evaluate(canvas => canvas.addEventListener('pointerup', event => {
    window.__sharedCrossingPlacement = { trusted: event.isTrusted, type: event.pointerType };
  }, { once: true, passive: true }));
  await tapPoint(page, point); await expect(page.locator('#toast')).toContainText('Barracks raised');
  expect((await page.evaluate(() => window.__sharedCrossingPlacement)).trusted).toBe(true);
  await expect(page.locator('#battle')).not.toHaveClass(/placing/);
  await expect(page.locator('#app')).not.toHaveClass(/compact-build-open/);
  const paid = await pause(page), game = identity(paid);
  expect(game.state.buildings.some(b => b.side === 0 && b.type === 'barracks' && b.x === 550 && b.y === 450)).toBe(true);
  expect(game.state.stats.built[0]).toBe(2);
  expect(game.state.gold[0]).toBeCloseTo(1100 - game.buildings.barracks.cost + 7.5 * game.state.time + 2 * game.state.stats.kills[0], 7);
  await controlHUD(page, paid); expect(await earned(page)).toEqual(before);
  await info.attach('native-paid-placement-save', { body: JSON.stringify(paid, null, 2), contentType: 'application/json' });
});

test('paid-engine control checkpoint pauses exactly, survives save/reload, and restarts through the same fresh briefing', async ({ page }, info) => {
  test.setTimeout(45000);
  const fixture = sharedCrossingFixtures().partial;
  info.annotations.push({ type: 'fixture', description: 'Paid-engine middle/south checkpoint with synthetic prerequisite records; not a full browser-played route.' });
  await seedOnce(page, priorProfile(fixture.envelope)); const before = await earned(page);
  expect(await saved(page)).toEqual(fixture.envelope); await press(page, '#resumeSaved');
  const held = await pause(page); assertPassiveContinuation(fixture.envelope.game, held.game, { maxSeconds: 5 });
  expect(held.game.state.campaignControl.heldSeconds).toBeGreaterThanOrEqual(12);
  await controlHUD(page, held); await expect(page.locator('#pauseBridgeTitle')).toHaveText('Supply crossings');
  await press(page, '#pauseBridgeDetails > summary');
  await expect(page.locator('#pauseBridgeRules')).toContainText('Bridges grant no income or capture bounty');
  await expect(page.locator('#pauseBridgeLegend')).toContainText('X = contested');
  const hud = await page.locator('#objectiveProgress').textContent();
  await page.waitForTimeout(300); expect(await saved(page)).toEqual(held);
  await expect(page.locator('#objectiveProgress')).toHaveText(hud);
  await press(page, '#pauseSettings'); await expect(page.locator('#settingsModal')).toBeVisible();
  await page.evaluate(() => history.back()); await expect(page.locator('#settingsModal')).toBeHidden();
  await expect(page.locator('#pauseVeil')).toBeVisible(); expect(await saved(page)).toEqual(held);
  await press(page, '#saveExit'); await page.reload(); expect(await saved(page)).toEqual(held);
  await expect(page.locator('#resumeSaved')).toContainText('SHARED CROSSING'); await press(page, '#resumeSaved');
  const resumed = await pause(page); assertPassiveContinuation(held.game, resumed.game, { maxSeconds: 5 });
  await controlHUD(page, resumed); expect(await earned(page)).toEqual(before);
  await press(page, '#restartBattle'); await page.evaluate(() => history.back());
  await expect(page.locator('#restartModal')).toBeHidden(); await expect(page.locator('#pauseVeil')).toBeVisible();
  expect(await saved(page)).toEqual(resumed);
  await press(page, '#restartBattle'); await press(page, '#confirmRestart');
  await expect(page.locator('#welcome')).toBeVisible(); await expect(page.locator('#campaignMissionTitle')).toHaveText('Shared Crossing');
  await expect(page.locator('#start')).toBeFocused(); await expect(page.locator('#resumeSaved')).toBeHidden();
  expect(await saved(page)).toBeNull(); expect(await earned(page)).toEqual(before);
  await press(page, '#start'); const restart = await pause(page); identity(restart);
  expect(restart.game.state.campaignControl).toEqual({ bridges: Array.from({ length: 3 }, () => ({ owner: null, capturing: null, progress: 0 })), heldSeconds: 0 });
  expect(restart.game.state.stats.built[0]).toBe(1);
  expect(layout(restart)).toEqual(layout({ game: createProgressionCampaignMission(ID, sharedCrossingProgress()).serialize() }));
  expect(restart.game.state.gold[0]).toBeCloseTo(1100 + 7.5 * restart.game.state.time, 7);
  expect(await earned(page)).toEqual(before);
  await screenshot(page, info, 'shared-crossing-restarted');
  await info.attach('paid-control-persistence', { body: JSON.stringify({ held, resumed, restart }, null, 2), contentType: 'application/json' });
});

for (const action of ['continue', 'replay']) test(`paid-engine control victory preserves prior records and offers ${action} after the Chapter 6 opener`, async ({ page }, info) => {
  test.setTimeout(35000);
  const fixture = sharedCrossingFixtures().terminal, initial = priorProfile(fixture.envelope);
  info.annotations.push({ type: 'fixture', description: 'Ordinary paid-engine last active tick (59.95/60 seconds), not a browser-played victory or injected completion.' });
  // Protocol 12 is intentionally historical input. The current UI may advance
  // only its marker; it must retain all five domain bytes until an actual result.
  await seedOnce(page, { ...initial, [MARKER]: JSON.stringify({ format: 'ironroot-profile', version: 12, epoch: 'shared-crossing-prior', phase: 'ready' }) });
  const migrated = await domains(page); for (const [key, text] of Object.entries(initial)) expect(migrated[key]).toBe(text);
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)), MARKER)).toEqual({ format: 'ironroot-profile', version: CURRENT_PROFILE_PROTOCOL_VERSION, epoch: 'shared-crossing-prior', phase: 'ready' });
  await press(page, '#resumeSaved'); await expect(page.locator('#resultTitle')).toHaveText('MISSION COMPLETE');
  await expect(page.locator('#resultCopy')).toContainText('shared supply route is open');
  await expect(page.locator('.result-stars')).toHaveText('★'.repeat(fixture.outcome.stars) + '☆'.repeat(3 - fixture.outcome.stars));
  await expect(page.locator('#playAgain')).toHaveText('CONTINUE CAMPAIGN →'); await expect(page.locator('#playAgain')).toBeFocused();
  await expect(page.locator('#replayMission')).toHaveText('Replay for more stars');
  if (fixture.outcome.stars < 3) await expect(page.locator('#replayMission')).toBeVisible();
  else await expect(page.locator('#replayMission')).toBeHidden();
  const after = await domains(page), expected = recordCampaignResult(fixture.progress, ID, Game.restore(fixture.finalGame));
  expect(JSON.parse(after[K.campaign])).toEqual(expected); expect(getProgressionCampaignOverview(expected).completed).toBe(false);
  expect(getProgressionCampaignOverview(expected).nextMissionId).toBe('one-signal-is-enough');
  expect(expected.missions['one-signal-is-enough']).toBeUndefined();
  for (const key of [K.settings, K.trials]) expect(after[key]).toBe(initial[key]);
  expect(after[K.battle]).toBeNull();
  const history = JSON.parse(after[K.history]); expect(history).toHaveLength(2);
  expect(history).toContainEqual(JSON.parse(initial[K.history])[0]);
  expect(history.find(row => row.identity?.scenario.id === ID)).toMatchObject({ won: true, time: fixture.finalGame.state.time,
    identity: { scenario: { kind: 'campaign', id: ID, revision: 1 }, ruleset: { id: 'frontier-campaign-shared-crossing', revision: 1 }, map: { id: 'classic', revision: 1 } } });
  await page.waitForTimeout(250); expect(await domains(page)).toEqual(after);
  await screenshot(page, info, `shared-crossing-control-result-${action}`);
  if (action === 'replay') {
    if (fixture.outcome.stars < 3) await press(page, '#replayMission');
    else {
      await press(page, '#resultMenu'); await choose(page);
    }
    await expect(page.locator('#start')).toHaveText('REPLAY MISSION →'); await press(page, '#start');
    const replay = await pause(page); identity(replay);
    expect(replay.game.state.campaignControl.heldSeconds).toBe(0);
    expect(replay.game.state.stats.built[0]).toBe(1); expect(await earned(page)).toEqual(Object.fromEntries(Object.entries(after).filter(([key]) => key !== K.battle)));
  } else {
    await page.keyboard.press('Enter'); await expect(page.locator('#campaignMissionTitle')).toHaveText('One Signal Is Enough');
    await expect(page.locator('#start')).toHaveText('BEGIN MISSION →'); expect(await domains(page)).toEqual(after);
    await openBackup(page); const backup = parseBackup(await downloadBackup(page));
    expect(backup.data.campaign).toEqual(expected); expect(backup.data.history).toEqual(history);
    expect(backup.data.settings).toEqual(JSON.parse(initial[K.settings])); expect(backup.data.trials).toEqual(JSON.parse(initial[K.trials]));
    await press(page, '#settingsDone'); await page.reload(); expect(await domains(page)).toEqual(after);
    await choose(page); await expect(page.locator('#start')).toHaveText('REPLAY MISSION →');
    const summary = getProgressionCampaignOverview(expected);
    await expect(page.locator('#campaignProgressText')).toHaveText(`${summary.cleared}/21 missions · ${summary.stars}/63 stars`);
  }
});
