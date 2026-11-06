import {expect} from '@playwright/test';
import {Game,getRuleset} from '../../dist/engine.js';
import {createCampaignProgress} from '../../dist/campaign.js';
import {parseBackup,BACKUP_STORAGE_KEYS} from '../../dist/backup.js';
import {test,press,pause,saved,seedOnce,homePoint,tapPoint,openBackup,downloadBackup,chooseBackup} from './map-browser-helpers.mjs';
import {openBuildControls} from './shared-build-controls.mjs';
import {introReplayFixture} from './campaign-fixtures.mjs';
import {PRODUCTION_V012_PATH} from './production-v012-fixtures.mjs';
const campaignKey=BACKUP_STORAGE_KEYS.campaign;

test('optional introduction can be left for Emberwatch without granting stars or writing a battle',async({page})=>{
  await page.goto('/');await expect(page.locator('#campaignMissionTitle')).toHaveText('First Watch');
  const before=await page.evaluate(key=>localStorage.getItem(key),campaignKey);
  await press(page,'#skipIntroduction');await expect(page.locator('#campaignMissionTitle')).toHaveText('Emberwatch');
  expect(await page.evaluate(key=>localStorage.getItem(key),campaignKey)).toBe(before);expect(await saved(page)).toBeNull();
  await press(page,'#campaignStoryNav');await press(page,'[data-chapter="first-roads"]');await press(page,'[data-mission="forked-road"]');
  await expect(page.locator('#start')).toBeDisabled();await expect(page.locator('#campaignUnlock')).toContainText('First Watch');
  await press(page,'#campaignChapterNav');await press(page,'[data-mission="first-watch"]');await press(page,'#start');
  const first=await pause(page);expect(first).toMatchObject({version:3,scenario:{kind:'campaign',id:'first-watch',revision:1},game:{mapId:'intro-one-road',rulesetId:'frontier-legacy'}});
  expect(Game.restore(first.game).map.lanes).toHaveLength(1);expect(first.game.state.buildings.filter(b=>b.side===0)).toHaveLength(0);
});

test('completed First Watch selects Forked Road with two real roads and four paid cards without changing legacy totals',async({page})=>{
  const progress=createCampaignProgress();progress.missions['first-watch']={completed:true,stars:2,bestTime:95};
  const bytes=JSON.stringify(progress);await seedOnce(page,{[campaignKey]:bytes});
  await expect(page.locator('#campaignMissionTitle')).toHaveText('Forked Road');
  await expect(page.locator('#campaignProgressText')).toContainText('0/16 missions · 0/48 stars');
  await press(page,'#start');await openBuildControls(page);
  expect(await page.locator('.build-card:visible').evaluateAll(cards=>cards.map(card=>card.dataset.type))).toEqual(['barracks','archery','watchtower','mint']);
  await press(page,'[data-type="barracks"]');
  const first=Game.restore((await saved(page)).game),map=first.map;
  expect(map.lanes).toHaveLength(2);
  await tapPoint(page,await homePoint(page,map,550,map.lanes[0]));
  await expect(page.locator('#toast')).toContainText('Barracks raised');
  const state=await pause(page);expect(state.scenario).toEqual({kind:'campaign',id:'forked-road',revision:1});
  expect(state.game.state.buildings.filter(b=>b.side===0)).toMatchObject([{type:'barracks',lane:0}]);
  expect(state.game.state.gold[0]).toBeCloseTo(610-140+5*state.game.state.time,1);
  expect(await page.evaluate(key=>localStorage.getItem(key),campaignKey)).toBe(bytes);
});

for(const rulesetId of ['frontier-rootwarden-open','frontier-rootwarden-timed'])test(rulesetId+' binds active roster paid controls resume and backup identity',async({page})=>{
  test.setTimeout(35000);
  const rules=getRuleset(rulesetId,1);await page.goto('/');await press(page,'[data-mode="skirmish"]');
  await page.locator('#skirmishRules').selectOption(rulesetId);
  await expect(page.locator('#skirmishRulesDescription')).toContainText(rules.endgame.forcedDecay?'citadels begin losing health at 7:00':'Citadels never lose health just because time passes');
  await press(page,'#start');await openBuildControls(page);
  expect(await page.locator('.build-card:visible').evaluateAll(cards=>cards.map(card=>card.dataset.type))).toEqual(Object.keys(rules.buildings));
  await expect(page.locator('[data-type="wardenLodge"]')).toContainText('210');
  await press(page,'[data-type="wardenLodge"]');await tapPoint(page,await homePoint(page,Game.restore((await saved(page)).game).map,550,450));
  await expect(page.locator('#toast')).toContainText('Warden lodge raised');
  await expect(page.locator('#time')).not.toHaveText('00:00');
  await page.waitForTimeout(1300); // Normal RAF/combat, enough for the actual first spawn.
  const state=await pause(page);
  expect(state).toMatchObject({version:3,scenario:{kind:'skirmish',id:'standard',revision:1},game:{version:3,mapId:'classic',mapRevision:1,rulesetId,rulesetRevision:1}});
  expect(state.game.state.gold[0]).toBeCloseTo(420-210+5*state.game.state.time,1);
  expect(state.game.state.buildings.filter(b=>b.side===0&&b.type==='wardenLodge')).toHaveLength(1);
  expect(state.game.state.units.some(u=>u.side===0&&u.type==='rootwarden'&&u.maxHp===800)).toBe(true);
  await press(page,'#help');await press(page,'#rosterGuideToggle');await expect(page.locator('[data-codex-unit]')).toHaveCount(6);
  await expect(page.locator('[data-codex-unit="rootwarden"]')).toBeVisible();await press(page,'#guideDone');await press(page,'#resume');
  await press(page,'#rally');await tapPoint(page,await homePoint(page,Game.restore(state.game).map,690,450));await expect(page.locator('#toast')).toHaveText('Arrow volley fired.');
  const volley=await pause(page);expect(volley.game.state.spellCooldown[0]).toBeGreaterThan(20);
  expect(volley.game.state.gold[0]).toBeCloseTo(420-210-75+5*volley.game.state.time,1);
  await press(page,'#saveExit');await expect(page.locator('#resumeSaved')).toContainText(rules.endgame.name.toUpperCase());
  await page.reload();await press(page,'#resumeSaved');const resumed=await pause(page);expect(resumed.game.rulesetId).toBe(rulesetId);
  expect(Game.restore(resumed.game).ruleset.endgame.forcedDecay).toBe(rules.endgame.forcedDecay);
  await press(page,'#saveExit');await openBackup(page);const text=await downloadBackup(page),backup=parseBackup(text);
  expect(backup.version).toBe(2);expect(backup.data.battle.game.rulesetId).toBe(rulesetId);
  const oldRefusal=await page.evaluate(async({path,text})=>{const old=await import(path+'backup.js');try{old.parseBackup(text);return false;}catch{return true;}},{path:PRODUCTION_V012_PATH,text});expect(oldRefusal).toBe(true);
  await chooseBackup(page,text);await Promise.all([page.waitForEvent('load'),press(page,'#confirmImport')]);
  await press(page,'#resumeSaved');expect((await pause(page)).game.rulesetId).toBe(rulesetId);
});

for(const [id,nextId,title,cards] of [['first-watch','forked-road','Forked Road',4],['forked-road','emberwatch','Emberwatch',7]])test(id+' paid-run completion continues into '+nextId+' using the shared controls',async({page})=>{
  const fixture=introReplayFixture(id);
  await seedOnce(page,{[BACKUP_STORAGE_KEYS.battle]:JSON.stringify(fixture.envelope),[campaignKey]:JSON.stringify(fixture.progress)});
  await press(page,'#resumeSaved');await expect(page.locator('#resultTitle')).toHaveText('MISSION COMPLETE');
  await expect(page.locator('.result-stars')).toHaveText('★★★');await expect(page.locator('#replayMission')).toBeHidden();
  const progress=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),campaignKey);
  expect(progress.missions[id]).toMatchObject({completed:true,stars:3});
  await press(page,'#playAgain');await expect(page.locator('#campaignMissionTitle')).toHaveText(title);await expect(page.locator('#start')).toBeFocused();
  await expect(page.locator('#campaignProgressText')).toContainText('0/16 missions · 0/48 stars');
  await press(page,'#start');await openBuildControls(page);await expect(page.locator('.build-card:visible')).toHaveCount(cards);
  await expect(page.locator('[data-type="wardenLodge"]')).toHaveCount(0);
  const after=await pause(page);expect(after.scenario?.id??after.campaignId).toBe(nextId);expect(Game.restore(after.game).ruleset.id).toBe('frontier-legacy');
});
