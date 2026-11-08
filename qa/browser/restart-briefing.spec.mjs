// Native navigation/input; only persisted fixtures and storage faults are synthetic.
// No virtual clock: history reconciliation and held activation run in real time.
import {expect} from '@playwright/test';
import {test,press,pause,saved,seedOnce} from './map-browser-helpers.mjs';
import {progressionProfile} from './campaign-progression-fixtures.mjs';
import {reportFixture} from './battle-report-fixtures.mjs';
import {installPad,padButton} from './map-controller-helpers.mjs';
import {createProgressionCampaignMission,getCampaignLaunchMission,getProgressionCampaignOverview,evaluateCampaignMission} from '../../dist/campaign.js';
import {prerequisiteProgress} from './expanded-campaign-fixtures.mjs';
import {sharedCrossingProgress} from './shared-crossing-fixtures.mjs';
import {imminentHit} from './campaign-fixtures.mjs';
import {finishFirstBuild} from './campaign-teaching-helpers.mjs';
import {encodeBattle,decodeBattle,scenarioForBattle} from '../../dist/battle-codec.js';
import {advanceObjectiveBattle} from '../../dist/objectives.js';
const SAVE='ironroot.battle.v1',PROGRESS='ironroot.campaign.v1';
const DOMAINS=[PROGRESS,'ironroot.trials.v1','ironroot.settings.v1','ironroot.history.v1'];
const domains=page=>page.evaluate(keys=>Object.fromEntries(keys.map(key=>[key,localStorage.getItem(key)])),DOMAINS);
const values=tier=>({[PROGRESS]:JSON.stringify(progressionProfile(tier)),
  'ironroot.trials.v1':JSON.stringify({shieldbreaker:{completed:true,bestTime:20}}),
  'ironroot.settings.v1':JSON.stringify({sound:false,music:false,sfx:true,volume:.25,reducedMotion:true,quality:'low'}),
  'ironroot.history.v1':JSON.stringify([{won:false,draw:false,challengeId:null,campaignId:null,difficulty:'easy',time:60,kills:0,built:1,date:'2026-11-06T11:00:00.000Z'}])});
function currentVictory(id) {
  const progress=id==='shared-crossing'?sharedCrossingProgress():prerequisiteProgress(id),game=createProgressionCampaignMission(id,progress);
  // Explicitly synthetic living combatant; normal fixed-step combat earns the result.
  imminentHit(game,game.state.bases[1]);
  const envelope=encodeBattle(game,scenarioForBattle(null,id,game),{campaignProgress:progress});
  const restored=decodeBattle(envelope,{campaignProgress:progress}).game;
  const outcome=advanceObjectiveBattle(restored,.05,g=>evaluateCampaignMission(g,id));
  expect(outcome.completed).toBe(true);return {progress,envelope,outcome};
}
async function begin(page){
  await press(page,'#start');
  if(await page.locator('#coachingModal').isVisible())await press(page,'#coachingPlay');
}
async function confirm(page){await pause(page);await press(page,'#restartBattle');await press(page,'#confirmRestart');}
async function briefing(page){
  await expect(page.locator('#welcome')).toBeVisible();await expect(page.locator('#pauseVeil')).toBeHidden();
  await expect(page.locator('#restartModal')).toBeHidden();await expect(page.locator('#resumeSaved')).toBeHidden();
  await expect(page.locator('#start')).toBeFocused();expect(await saved(page)).toBeNull();
}

for(const [tier,id] of [[0,'roadside-watch'],[1,'shield-at-the-fork'],[2,'open-three-roads'],[3,'emberwatch']])
test(`${id}: real launch, cancel, confirm, same briefing and explicit fresh Begin`,async({page},info)=>{
  await seedOnce(page,values(tier));
  const title=await page.locator('#campaignMissionTitle').textContent(),goal=await page.locator('#campaignGoal').textContent();
  expect(title).toBe(getCampaignLaunchMission(id,progressionProfile(tier)).name);
  const profile=await domains(page);await begin(page);
  if(tier===0)await finishFirstBuild(page,press);
  await page.waitForTimeout(220);
  const before=await pause(page);await press(page,'#restartBattle');await expect(page.locator('#cancelRestart')).toBeFocused();
  await page.evaluate(()=>history.back());await expect(page.locator('#restartModal')).toBeHidden();
  await expect(page.locator('#restartBattle')).toBeFocused();expect(await saved(page)).toEqual(before);
  await press(page,'#restartBattle');await press(page,'#cancelRestart');expect(await saved(page)).toEqual(before);
  await press(page,'#restartBattle');await press(page,'#confirmRestart');await briefing(page);
  await expect(page.locator('#campaignMissionTitle')).toHaveText(title);await expect(page.locator('#campaignGoal')).toHaveText(goal);
  const frozen=await page.locator('#time').textContent(),gold=await page.locator('#gold').textContent();
  await page.waitForTimeout(5500);expect(await saved(page)).toBeNull();
  await expect(page.locator('#time')).toHaveText(frozen);await expect(page.locator('#gold')).toHaveText(gold);
  expect(await domains(page)).toEqual(profile);
  if(tier===1)await page.screenshot({path:info.outputPath('restart-briefing.png'),fullPage:true});
  await begin(page);
  // start() saves at zero before the real animation loop; inspect that checkpoint.
  const fresh=await saved(page),initial=createProgressionCampaignMission(id,progressionProfile(tier)).serialize();
  expect(fresh.game.state.time).toBe(0);expect(fresh.game.state.gold).toEqual(initial.state.gold);
  expect(fresh.game.state.buildings).toEqual(initial.state.buildings);expect(fresh.scenario).toEqual(before.scenario);
  expect(await domains(page)).toEqual(profile);
});

test('restart retires history attempt markers; Back/Forward cannot resume and Back can leave',async({page})=>{
  await page.goto('/FONTS-NOTICES.txt');await page.goto('/');await begin(page);await confirm(page);await briefing(page);
  await page.waitForTimeout(150);const length=await page.evaluate(()=>history.length);
  for(let i=0;i<3;i++){
    await page.evaluate(()=>history.forward());await page.waitForTimeout(150);
    await expect(page.locator('#welcome')).toBeVisible();expect(await saved(page)).toBeNull();
  }
  for(let i=0;i<8&&!page.url().endsWith('/FONTS-NOTICES.txt');i++){
    await page.evaluate(()=>history.back());await page.waitForTimeout(150);
    if(!page.url().endsWith('/FONTS-NOTICES.txt'))expect(await saved(page)).toBeNull();
  }
  await expect(page).toHaveURL(/\/FONTS-NOTICES\.txt$/);expect(await page.evaluate(()=>history.length)).toBe(length);
});

for(const kind of ['campaign-failure','trial-failure'])test(`${kind}: result Retry shows its briefing before a new attempt`,async({page})=>{
  const fixture=reportFixture(kind);
  await seedOnce(page,{...values(3),[PROGRESS]:JSON.stringify(fixture.progress),[SAVE]:JSON.stringify(fixture.envelope)});
  await press(page,'#resumeSaved');await expect(page.locator('#resultTitle')).toContainText('FAILED');
  const profile=await domains(page);await page.locator('#playAgain').focus();await page.keyboard.press('Enter');await briefing(page);
  if(kind.startsWith('campaign'))await expect(page.locator('#campaignMissionTitle')).toHaveText('Emberwatch');
  else await expect(page.locator('#challengeChoices .active')).toContainText('Shieldbreaker');
  await page.waitForTimeout(200);expect(await saved(page)).toBeNull();expect(await domains(page)).toEqual(profile);
  await begin(page);const fresh=await saved(page);expect(fresh.game.state.time).toBe(0);
  expect(fresh.game.state.gold[0]).toBeGreaterThan(0);expect(await domains(page)).toEqual(profile);
});

test('result Continue advances and optional Replay retains the completed mission',async({page})=>{
  const fixture=reportFixture('campaign-alternate');
  fixture.envelope.game.state.time=160; // Miss the optional speed star; still a valid imminent victory.
  await seedOnce(page,{[PROGRESS]:JSON.stringify(fixture.progress),[SAVE]:JSON.stringify(fixture.envelope)});
  await press(page,'#resumeSaved');await expect(page.locator('#resultTitle')).toHaveText('MISSION COMPLETE');
  await expect(page.locator('#replayMission')).toBeVisible();const profile=await domains(page);
  await press(page,'#playAgain');await expect(page.locator('#campaignMissionTitle')).toHaveText('Three Roads');
  await press(page,'#lastResult');await press(page,'#replayMission');await expect(page.locator('#welcome')).toBeHidden();
  const battle=await saved(page);expect(battle.campaignId??battle.scenario?.id).toBe('emberwatch');expect(await domains(page)).toEqual(profile);
});

for(const fault of ['throw','noop','readback'])test(`checkpoint removal ${fault}: honest warning retains paused attempt`,async({page})=>{
  await page.goto('/');await begin(page);const before=await pause(page);await press(page,'#restartBattle');
  await page.evaluate(({key,fault})=>{
    const remove=Storage.prototype.removeItem,read=Storage.prototype.getItem;let removed=false;
    window.__restartFault=true;
    Storage.prototype.removeItem=function(k){
      if(k===key&&window.__restartFault){if(fault==='throw')throw new DOMException('Denied','SecurityError');if(fault==='noop')return;removed=true;}
      return remove.call(this,k);
    };
    Storage.prototype.getItem=function(k){if(k===key&&removed&&window.__restartFault)throw new DOMException('Denied','SecurityError');return read.call(this,k);};
  },{key:SAVE,fault});
  await press(page,'#confirmRestart');await expect(page.locator('#restartStatus')).toContainText('could not be saved or verified');
  await expect(page.locator('#welcome')).toBeHidden();await expect(page.locator('#restartModal')).toBeVisible();
  await page.evaluate(()=>{window.__restartFault=false;});
  if(fault==='readback')expect(await saved(page)).toBeNull();else expect(await saved(page)).toEqual(before);
  await press(page,'#cancelRestart');await expect(page.locator('#pauseVeil')).toBeVisible();
  if(fault==='readback'){
    await expect(page.locator('#restartBattle')).toBeDisabled();
    expect(await page.locator('#pauseVeil').evaluate(el=>el.contains(document.activeElement))).toBe(true);
  }else await expect(page.locator('#restartBattle')).toBeFocused();
});

test('Begin write failure stays on briefing and can retry without resurrecting old attempt',async({page})=>{
  await page.goto('/');await begin(page);await confirm(page);await briefing(page);
  await page.evaluate(key=>{
    const set=Storage.prototype.setItem;window.__restartFault=true;
    Storage.prototype.setItem=function(k,v){if(k===key&&window.__restartFault)throw new DOMException('Full','QuotaExceededError');return set.call(this,k,v);};
  },SAVE);
  await press(page,'#start');await expect(page.locator('#briefingRestartStatus')).toContainText('could not be saved or verified');
  expect(await saved(page)).toBeNull();await expect(page.locator('#welcome')).toBeVisible();
  await page.evaluate(()=>{window.__restartFault=false;});await begin(page);expect((await saved(page)).game.state.time).toBe(0);
});

for(const phase of ['confirmation','briefing'])test(`newer tab checkpoint survives ${phase}`,async({page,context})=>{
  await page.goto('/');await begin(page);await pause(page);await press(page,'#restartBattle');
  if(phase==='briefing'){await press(page,'#confirmRestart');await briefing(page);}
  const other=await context.newPage();await other.goto('/');await press(other,'[data-mode="skirmish"]');await press(other,'#start');await pause(other);
  const newer=await saved(other);await page.bringToFront();await press(page,phase==='briefing'?'#start':'#confirmRestart');
  await expect(page.locator(phase==='briefing'?'#briefingRestartStatus':'#restartStatus')).toContainText('checkpoint changed');
  expect(await saved(page)).toEqual(newer);await page.waitForTimeout(200);expect(await saved(page)).toEqual(newer);
});

test('a resumed stale copy cannot autosave after another tab confirms restart',async({page,context})=>{
  await page.goto('/');await begin(page);await pause(page);
  const other=await context.newPage();await other.goto('/');await press(other,'#resumeSaved');await pause(other);
  await press(other,'#restartBattle');await press(other,'#confirmRestart');await briefing(other);
  await page.bringToFront();await expect(page.locator('#restartBattle')).toBeDisabled();await page.waitForTimeout(200);
  expect(await saved(page)).toBeNull();await press(page,'#saveExit');expect(await saved(page)).toBeNull();
});

test('queued removal retires a tab even when a fresh opening already has identical checkpoint bytes',async({page,context})=>{
  await page.goto('/');await begin(page);await pause(page);const opening=await saved(page);
  const other=await context.newPage();await other.goto('/FONTS-NOTICES.txt');
  // Model two sequential owner operations before the old tab handles storage events.
  await other.evaluate(key=>{const bytes=localStorage.getItem(key);localStorage.removeItem(key);localStorage.setItem(key,bytes);},SAVE);
  await page.bringToFront();await expect(page.locator('#restartBattle')).toBeDisabled();
  expect(await saved(page)).toEqual(opening);await press(page,'#saveExit');expect(await saved(page)).toEqual(opening);
});

test('a delayed old removal event preserves an explicitly begun different battle',async({page})=>{
  await page.goto('/');await begin(page);await pause(page);
  const removedBytes=await page.evaluate(key=>localStorage.getItem(key),SAVE);
  await press(page,'#restartBattle');await press(page,'#confirmRestart');await briefing(page);
  await press(page,'[data-mode="skirmish"]');await press(page,'#start');await pause(page);
  const newer=await saved(page);expect(newer.scenario.kind).toBe('skirmish');
  // Bounded delayed-event reproduction, while navigation and saving stay native.
  await page.evaluate(({key,oldValue})=>window.dispatchEvent(new StorageEvent('storage',
    {key,oldValue,newValue:null,storageArea:localStorage})),{key:SAVE,oldValue:removedBytes});
  await expect(page.locator('#restartBattle')).toBeEnabled();expect(await saved(page)).toEqual(newer);
  await press(page,'#resume');await page.waitForTimeout(120);await pause(page);
  expect((await saved(page)).game.state.time).toBeGreaterThan(newer.game.state.time);
});

test('held controller confirm reaches briefing once; a fresh activation explicitly begins',async({page})=>{
  await installPad(page);await page.goto('/');await begin(page);await pause(page);
  await page.locator('#restartBattle').focus();await padButton(page,0);await padButton(page,1);
  await expect(page.locator('#restartBattle')).toBeFocused();await padButton(page,0);
  await page.locator('#confirmRestart').focus();await page.evaluate(()=>{window.__qaPad.buttons[0]=true;});await briefing(page);
  await page.waitForTimeout(700);expect(await saved(page)).toBeNull();await expect(page.locator('#welcome')).toBeVisible();
  await page.evaluate(()=>{window.__qaPad.buttons[0]=false;});await padButton(page,0);
  await expect(page.locator('#welcome')).toBeHidden();expect((await saved(page)).game.state.time).toBe(0);
});

test('native keyboard Restart and held Enter confirm cannot also activate Begin',async({page})=>{
  await page.goto('/');await begin(page);await pause(page);await page.locator('#restartBattle').focus();
  await page.keyboard.press('Enter');await expect(page.locator('#cancelRestart')).toBeFocused();
  await page.keyboard.press('Escape');await expect(page.locator('#restartBattle')).toBeFocused();
  await page.keyboard.press('Enter');await page.locator('#confirmRestart').focus();
  await page.keyboard.down('Enter');await briefing(page);await page.keyboard.down('Enter');
  await page.waitForTimeout(200);expect(await saved(page)).toBeNull();await page.keyboard.up('Enter');
  await page.keyboard.press('Enter');await expect(page.locator('#welcome')).toBeHidden();expect((await saved(page)).game.state.time).toBe(0);
});

for(const activation of ['keyboard','controller'])test(`current finale offers Skirmish setup and optional three-star Replay via ${activation}`,async({page},info)=>{
  if(activation==='controller')await installPad(page);
  const id=getProgressionCampaignOverview(progressionProfile(3)).missions.at(-1).id;
  expect(id).toBe('shared-crossing');expect(id).not.toBe('common-ground');
  const fixture=currentVictory(id);expect(fixture.outcome.stars).toBe(3);
  await seedOnce(page,{...values(3),[PROGRESS]:JSON.stringify(fixture.progress),[SAVE]:JSON.stringify(fixture.envelope)});
  await press(page,'#resumeSaved');await expect(page.locator('#resultTitle')).toHaveText('MISSION COMPLETE');
  await expect(page.locator('#playAgain')).toHaveText('SKIRMISHES →');await expect(page.locator('#playAgain')).toBeFocused();
  await expect(page.locator('#replayMission')).toHaveText('Replay mission');await expect(page.locator('#replayMission')).toBeVisible();
  const profile=await domains(page);expect(JSON.parse(profile[PROGRESS]).missions[id].stars).toBe(3);
  if(activation==='keyboard')await page.keyboard.press('Enter');else await padButton(page,0);
  await expect(page.locator('#skirmishConfig')).toBeVisible();await expect(page.locator('#start')).toBeFocused();
  await expect(page.locator('#start')).toHaveText('BEGIN SKIRMISH →');expect(await saved(page)).toBeNull();
  await page.waitForTimeout(200);expect(await saved(page)).toBeNull();expect(await domains(page)).toEqual(profile);
  if(activation==='keyboard')await page.screenshot({path:info.outputPath('finale-skirmish-setup.png'),fullPage:true});
  await press(page,'#welcomeSettings');await page.evaluate(()=>history.back());await expect(page.locator('#welcomeSettings')).toBeFocused();
  await expect(page.locator('#skirmishConfig')).toBeVisible();expect(await saved(page)).toBeNull();
  await press(page,'#lastResult');await page.locator('#replayMission').focus();
  if(activation==='keyboard')await page.keyboard.press('Enter');else await padButton(page,0);
  await expect(page.locator('#welcome')).toBeHidden();const replay=await saved(page);
  expect(replay.scenario.id).toBe(id);expect(replay.scenario.revision).toBe(1);expect(replay.game.state.time).toBe(0);
  expect(await domains(page)).toEqual(profile);
  // Retire the replay before reload: no old Resume should be manufactured.
  await confirm(page);await briefing(page);await page.reload();
  await expect(page.locator('#skirmishConfig')).toBeVisible();expect(await saved(page)).toBeNull();
  await press(page,'[data-mode="campaign"]');await expect(page.locator('#campaignMissionTitle')).toHaveText('Shared Crossing');
  await expect(page.locator('#start')).toHaveText('REPLAY MISSION →');expect(await domains(page)).toEqual(profile);
});

test('Common Ground now continues to the Chapter 6 briefing instead of Skirmishes',async({page})=>{
  const fixture=currentVictory('common-ground');
  await seedOnce(page,{...values(3),[PROGRESS]:JSON.stringify(fixture.progress),[SAVE]:JSON.stringify(fixture.envelope)});
  await press(page,'#resumeSaved');await expect(page.locator('#resultTitle')).toHaveText('MISSION COMPLETE');
  await expect(page.locator('#playAgain')).toHaveText('CONTINUE CAMPAIGN →');
  await expect(page.locator('#replayMission')).toBeHidden();
  const earned=await domains(page);expect(JSON.parse(earned[PROGRESS]).missions['common-ground'].stars).toBe(3);
  await press(page,'#playAgain');await expect(page.locator('#campaignMissionTitle')).toHaveText('Shared Crossing');
  await expect(page.locator('#campaignChapterNav')).toContainText('Chapter 6');
  await expect(page.locator('#start')).toHaveText('BEGIN MISSION →');await expect(page.locator('#start')).toBeFocused();
  expect(await saved(page)).toBeNull();expect(await domains(page)).toEqual(earned);
});

test('Ironroot is an earlier story victory and still continues to Open Horizon',async({page})=>{
  const fixture=currentVictory('ironroot');
  await seedOnce(page,{[PROGRESS]:JSON.stringify(fixture.progress),[SAVE]:JSON.stringify(fixture.envelope)});
  await press(page,'#resumeSaved');await expect(page.locator('#resultTitle')).toHaveText('MISSION COMPLETE');
  await expect(page.locator('#playAgain')).toHaveText('CONTINUE CAMPAIGN →');await press(page,'#playAgain');
  await expect(page.locator('#campaignMissionTitle')).toHaveText('Open Horizon');expect(await saved(page)).toBeNull();
});

test('profile change during restart confirmation preserves the recovery hold and all stored bytes',async({page,context})=>{
  await page.goto('/');await begin(page);await pause(page);await press(page,'#restartBattle');
  const other=await context.newPage();await other.goto('/FONTS-NOTICES.txt');
  await other.evaluate(()=>{const key='ironroot.profile.v1',m=JSON.parse(localStorage.getItem(key));m.epoch='restart-other-profile';localStorage.setItem(key,JSON.stringify(m));});
  const before=await domains(other),battle=await saved(other);await page.bringToFront();
  await expect(page.locator('#profileRecovery')).toBeVisible();await expect(page.locator('#settingsDone')).toBeDisabled();
  await page.evaluate(()=>history.back());await expect(page.locator('#profileRecovery')).toBeVisible();
  expect(await saved(page)).toEqual(battle);expect(await domains(page)).toEqual(before);
});
