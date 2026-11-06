// Compatibility checkpoints, not claims of browser-earned progression or balance.
// Every restart uses native UI and the production codec; no runtime state hook.
import { expect } from '@playwright/test';
import { createCampaignMission, createProgressionCampaignMission } from '../../dist/campaign.js';
import { encodeBattle, decodeBattle, scenarioForBattle } from '../../dist/battle-codec.js';
import { progressionProfile } from './campaign-progression-fixtures.mjs';
import { test, press, pause, saved, seedOnce } from './map-browser-helpers.mjs';
import { openBuildControls } from './shared-build-controls.mjs';
const SAVE='ironroot.battle.v1', PROGRESS='ironroot.campaign.v1';
const keys=[PROGRESS,'ironroot.trials.v1','ironroot.settings.v1','ironroot.history.v1'];
const profile=page=>page.evaluate(keys=>Object.fromEntries(keys.map(key=>[key,localStorage.getItem(key)])),keys);
const cases=[
  {label:'two-building ongoing opening with newer full-roster profile',id:'roadside-watch',tier:0,count:2},
  {label:'full-roster opening replay',id:'roadside-watch',tier:3,count:8},
  {label:'five-building ongoing fork with newer full-roster profile',id:'shield-at-the-fork',tier:1,count:5},
  {label:'revision-two main mission',id:'emberwatch',tier:3,count:8},
  {label:'legacy revision-one main mission',id:'emberwatch',legacy:true,count:7},
  {label:'unfinished five-building fork and renewed teaching',id:'shield-at-the-fork',tier:1,profileTier:1,count:5,teaches:true},
];
for(const spec of cases)test(`confirmed campaign restart preserves ${spec.label}`,async({page})=>{
  const progress=progressionProfile(spec.profileTier??3);
  const identity=battle=>decodeBattle(battle,{campaignProgress:progress}).identity;
  const game=spec.legacy?createCampaignMission(spec.id):createProgressionCampaignMission(spec.id,progressionProfile(spec.tier));
  const initial=game.serialize();
  for(let i=0;i<60;i++)game.update(.05);
  const checkpoint=encodeBattle(game,scenarioForBattle(null,spec.id,game),{campaignProgress:progress});
  expect(identity(checkpoint)).toMatchObject({scenario:{kind:'campaign',id:spec.id}});
  await seedOnce(page,{[SAVE]:JSON.stringify(checkpoint),[PROGRESS]:JSON.stringify(progress),
    'ironroot.trials.v1':JSON.stringify({shieldbreaker:{completed:true,bestTime:90}})});
  await press(page,'#resumeSaved');
  await expect(page.locator('#coachingModal')).toBeHidden();
  const before=await pause(page),profileBefore=await profile(page);
  await press(page,'#restartBattle');await expect(page.locator('#cancelRestart')).toBeFocused();
  await press(page,'#confirmRestart');
  // An unfinished new attempt may explicitly offer its opening lesson again.
  // The test chooses Start through the real dialog instead of suppressing it.
  if(spec.teaches){await expect(page.locator('#coachingModal')).toBeVisible();await press(page,'#coachingPlay');}
  else await expect(page.locator('#coachingModal')).toBeHidden();
  const after=await pause(page);
  expect(identity(after)).toEqual(identity(before));
  expect(after.scenario??null).toEqual(before.scenario??null);
  expect(after.game.version).toBe(before.game.version);
  expect([after.game.difficulty,after.game.ai]).toEqual([before.game.difficulty,before.game.ai]);
  expect(after.game.rulesetId??'frontier-legacy').toBe(before.game.rulesetId??'frontier-legacy');
  expect(after.game.state.time).toBeLessThan(before.game.state.time);
  expect(after.game.state.buildings.map(({id,type,side,x,y,level})=>[id,type,side,x,y,level]))
    .toEqual(initial.state.buildings.map(({id,type,side,x,y,level})=>[id,type,side,x,y,level]));
  expect(await profile(page)).toEqual(profileBefore);
  await press(page,'#resume');await openBuildControls(page);
  await expect(page.locator('.build-card')).toHaveCount(spec.count);
  if(await page.locator('#allBuildings').isVisible())await press(page,'#allBuildings');
  await openBuildControls(page);await expect(page.locator('.build-card:visible')).toHaveCount(spec.count);
  await pause(page);await press(page,'#saveExit');await page.reload();await press(page,'#resumeSaved');
  await expect(page.locator('#coachingModal')).toBeHidden();
  const loaded=await pause(page);
  expect(identity(loaded)).toEqual(identity(after));
  expect(loaded.scenario??null).toEqual(after.scenario??null);
  expect(loaded.game.version).toBe(after.game.version);
  expect(loaded.game.rulesetId??'frontier-legacy').toBe(after.game.rulesetId??'frontier-legacy');
  expect(await profile(page)).toEqual(profileBefore);
});
