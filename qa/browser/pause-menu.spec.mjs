// Real DOM/input/persistence checks. Only the standard Gamepad API is mocked.
import {expect} from '@playwright/test';
import {Game} from '../../dist/engine.js';
import {test,press,selectMap,saved,seedOnce,homePoint,tapPoint} from './map-browser-helpers.mjs';
import {installPad,padButton} from './map-controller-helpers.mjs';
import {createCampaignMission} from '../../dist/campaign.js';
import {createChallenge} from '../../dist/challenges.js';
import {encodeBattle,scenarioForBattle} from '../../dist/battle-codec.js';
const SAVE='ironroot.battle.v1';
const DOMAINS=['ironroot.campaign.v1','ironroot.trials.v1','ironroot.settings.v1','ironroot.history.v1'];
const read=(page,keys)=>page.evaluate(keys=>Object.fromEntries(keys.map(key=>[key,localStorage.getItem(key)])),keys);
const raw=page=>read(page,[SAVE,...DOMAINS]);
const domains=page=>read(page,DOMAINS);
async function start(page){await page.goto('/');await press(page,'[data-mode="skirmish"]');await press(page,'#start');}
async function pause(page){await press(page,'#pause');await expect(page.locator('#resume')).toBeFocused();return saved(page);}
async function faultWrites(page){await page.evaluate(key=>{
  const original=Storage.prototype.setItem;window.__qaBlockBattleWrite=true;
  Storage.prototype.setItem=function(k,v){if(this===localStorage&&k===key&&window.__qaBlockBattleWrite)throw new DOMException('Full','QuotaExceededError');return original.call(this,k,v);};
},SAVE);}
async function fits(page,selector){
  const box=await page.locator(selector).boundingBox(),v=page.viewportSize();
  expect(box,selector).not.toBeNull();expect(box.x).toBeGreaterThanOrEqual(0);expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.x+box.width).toBeLessThanOrEqual(v.width+1);expect(box.y+box.height).toBeLessThanOrEqual(v.height+1);
}

test('pause dialog traps focus, isolates gameplay and resumes by keyboard',async({page})=>{
  await start(page);await pause(page);await expect(page.getByRole('dialog',{name:'Paused',exact:true})).toBeVisible();
  expect(await page.locator('#pauseVeil').evaluate(el=>el.parentElement===document.body)).toBe(true);
  await expect(page.locator('#app')).toHaveJSProperty('inert',true);
  for(const selector of ['.pause-menu','#resume','#pauseSettings','#help','#saveExit','#restartBattle']){
    await fits(page,selector);if(selector!=='.pause-menu')expect((await page.locator(selector).boundingBox()).height).toBeGreaterThanOrEqual(44);
  }
  await page.keyboard.press('Shift+Tab');await expect(page.locator('#restartBattle')).toBeFocused();
  await page.keyboard.press('Tab');await expect(page.locator('#resume')).toBeFocused();const before=await raw(page);
  await page.keyboard.press('Digit2');await page.keyboard.press('KeyR');await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(160);expect(await raw(page)).toEqual(before);
  await page.keyboard.press('Escape');await expect(page.locator('#pauseVeil')).toBeHidden();await expect(page.locator('#pause')).toBeFocused();
  await page.locator('#battle').focus();await page.keyboard.press('Space');await expect(page.locator('#pauseVeil')).toBeVisible();
  await page.keyboard.press('Enter');await expect(page.locator('#pauseVeil')).toBeHidden();
});

test('options and guide return focus to their pause-menu entry without advancing or changing saves',async({page})=>{
  await start(page);await pause(page);const before=await raw(page);
  await press(page,'#pauseSettings');await expect(page.locator('#settingsDone')).toHaveText('Back to pause menu');
  await expect(page.locator('#pauseVeil')).toHaveJSProperty('inert',true);
  await expect(page.getByRole('dialog',{name:'Options',exact:true})).toBeVisible();
  await page.waitForTimeout(160);await press(page,'#settingsDone');await expect(page.locator('#pauseSettings')).toBeFocused();expect(await raw(page)).toEqual(before);
  await press(page,'#help');await expect(page.locator('#helpModal')).toBeVisible();
  await page.keyboard.press('Escape');await expect(page.locator('#help')).toBeFocused();expect(await raw(page)).toEqual(before);
  await press(page,'#resume');await press(page,'#settings');await expect(page.locator('#settingsDone')).toHaveText('Resume battle');
  await page.keyboard.press('Escape');await expect(page.locator('#pauseVeil')).toBeHidden();
});

test('save and return reloads the same map, ruleset, construction and profile',async({page})=>{
  await page.goto('/');await selectMap(page,'twin-span');await press(page,'#start');
  const point=await homePoint(page,{width:3200},270,340);await press(page,'[data-type="archery"]');await tapPoint(page,point);
  await expect(page.locator('#toast')).toContainText('Archery range raised');const before=await pause(page),profile=await domains(page);
  await expect(page.locator('#pauseSaveStatus')).toContainText('Checkpoint saved');await press(page,'#saveExit');await expect(page.locator('#resumeSaved')).toBeFocused();
  await page.reload();await press(page,'#resumeSaved');const after=await pause(page);expect(after.identity).toEqual(before.identity);expect(after.game.mapId).toBe('twin-span');
  const construction=battle=>battle.game.state.buildings.filter(b=>b.side===0).map(({id,type,x,y,level,hp,maxHp,invested})=>({id,type,x,y,level,hp,maxHp,invested}));
  expect(construction(after)).toEqual(construction(before));
  expect(after.game.state.time).toBeGreaterThanOrEqual(before.game.state.time);expect(await domains(page)).toEqual(profile);
});

test('restart confirms, cancellation is lossless and fresh attempt retains battle identity and profile',async({page})=>{
  await start(page);await page.waitForTimeout(900);const before=await pause(page),bytes=await raw(page);
  await press(page,'#restartBattle');await expect(page.locator('#cancelRestart')).toBeFocused();
  await page.keyboard.press('Escape');await expect(page.locator('#restartBattle')).toBeFocused();expect(await raw(page)).toEqual(bytes);
  await press(page,'#restartBattle');await press(page,'#cancelRestart');expect(await raw(page)).toEqual(bytes);
  await press(page,'#restartBattle');await press(page,'#confirmRestart');await expect(page.locator('#pauseVeil')).toBeHidden();
  const after=await pause(page);expect(after.identity).toEqual(before.identity);expect(after.game.state.time).toBeLessThan(before.game.state.time);
  expect(after.game.state.stats.built).toEqual([1,1]);expect(await domains(page)).toEqual(Object.fromEntries(DOMAINS.map(key=>[key,bytes[key]])));
});

test('storage failure retains the paused battle on save-exit and restart with honest retry feedback',async({page})=>{
  await start(page);await page.waitForTimeout(500);await pause(page);const before=await raw(page);await faultWrites(page);
  await press(page,'#restartBattle');await press(page,'#confirmRestart');await expect(page.locator('#restartStatus')).toContainText('could not be saved or verified');expect(await raw(page)).toEqual(before);
  // A same-byte save is a no-op; first advance beyond the last checkpoint.
  await press(page,'#cancelRestart');await press(page,'#resume');await page.waitForTimeout(180);await pause(page);
  await expect(page.locator('#pauseSaveStatus')).toContainText('Saving unavailable');await press(page,'#saveExit');await expect(page.locator('#welcome')).toBeHidden();
  await expect(page.locator('#pauseSaveStatus')).toContainText('Could not save');expect(await raw(page)).toEqual(before);
  await page.evaluate(()=>{window.__qaBlockBattleWrite=false;});await press(page,'#saveExit');await expect(page.locator('#welcome')).toBeVisible();
  expect((await saved(page)).game.state.time).toBeGreaterThan(JSON.parse(before[SAVE]).game.state.time);
});

test('newer tab checkpoint cannot be overwritten by an open restart confirmation',async({page,context})=>{
  await start(page);await pause(page);await press(page,'#restartBattle');const other=await context.newPage();
  await other.goto('/');await selectMap(other,'long-march');await press(other,'#start');await pause(other);const latest=await raw(other);
  await page.bringToFront();await press(page,'#confirmRestart');await expect(page.locator('#restartStatus')).toContainText('checkpoint changed');expect(await raw(page)).toEqual(latest);
  await press(page,'#cancelRestart');await expect(page.locator('#restartBattle')).toBeDisabled();await press(page,'#saveExit');
  await expect(page.locator('#resumeSaved')).toContainText('LONG MARCH');expect(await raw(page)).toEqual(latest);
});

for(const scenario of [{kind:'campaign',id:'first-watch',label:'mission'},{kind:'trial',id:'shieldbreaker',label:'field trial'}])
  test(`${scenario.kind} restart retains authored identity without awarding progress or history`,async({page})=>{
    const game=scenario.kind==='campaign'?createCampaignMission(scenario.id):createChallenge(scenario.id);for(let i=0;i<60;i++)game.update(1/30);
    const battle=encodeBattle(game,scenarioForBattle(scenario.kind==='trial'?scenario.id:null,scenario.kind==='campaign'?scenario.id:null));
    await seedOnce(page,{[SAVE]:JSON.stringify(battle)});await press(page,'#resumeSaved');await pause(page);const before=await domains(page);
    await expect(page.locator('#restartBattle')).toHaveText(`Restart ${scenario.label}…`);await press(page,'#restartBattle');await press(page,'#confirmRestart');const restarted=await pause(page);
    expect(restarted.identity??[restarted.campaignId,restarted.challengeId]).toEqual(battle.identity??[battle.campaignId,battle.challengeId]);
    expect(restarted.game.state.time).toBeLessThan(game.state.time);expect(await domains(page)).toEqual(before);
    await press(page,'#saveExit');await page.reload();await press(page,'#resumeSaved');const loaded=await pause(page);
    expect(loaded.identity??[loaded.campaignId,loaded.challengeId]).toEqual(restarted.identity??[restarted.campaignId,restarted.challengeId]);
  });

test('controller navigation, B and Start respect each menu scope',async({page})=>{
  await installPad(page);await start(page);await padButton(page,9);await expect(page.locator('#resume')).toBeFocused();
  await padButton(page,13);
  if(await page.locator('#help').evaluate(el=>el===document.activeElement))await padButton(page,14);
  await expect(page.locator('#pauseSettings')).toBeFocused();await padButton(page,0);await expect(page.locator('#settingsModal')).toBeVisible();
  await padButton(page,1);await expect(page.locator('#pauseSettings')).toBeFocused();await page.locator('#restartBattle').focus();const before=await raw(page);
  await page.evaluate(()=>{window.__qaPad.buttons[0]=true;});await expect(page.locator('#restartModal')).toBeVisible();
  await page.waitForTimeout(650);expect(await raw(page)).toEqual(before);await expect(page.locator('#restartModal')).toBeVisible();
  await page.evaluate(()=>{window.__qaPad.buttons[0]=false;});
  await expect(page.locator('#cancelRestart')).toBeFocused();await padButton(page,1);await expect(page.locator('#restartBattle')).toBeFocused();
  await padButton(page,9);await expect(page.locator('#pauseVeil')).toBeHidden();
});

for(const mapId of ['classic','long-march'])test(`legacy ${mapId} checkpoint restarts in its own schema and retains every nonempty profile domain`,async({page})=>{
  // Synthetic persisted positions verify compatibility; these are not play or balance evidence.
  const game=new Game({difficulty:'hard',ai:false,mapId,seed:41});
  expect(game.build('archery',270,450).ok).toBe(true);for(let i=0;i<60;i++)game.update(1/30);
  const battle=encodeBattle(game,scenarioForBattle(null,null));
  const profile={
    'ironroot.campaign.v1':JSON.stringify({version:1,missions:{emberwatch:{completed:true,stars:2,bestTime:60}}}),
    'ironroot.trials.v1':JSON.stringify({shieldbreaker:{completed:true,bestTime:10}}),
    'ironroot.settings.v1':JSON.stringify({sound:false,music:false,sfx:true,volume:.25,reducedMotion:true,quality:'low'}),
    'ironroot.history.v1':JSON.stringify([{won:false,draw:false,challengeId:null,campaignId:null,difficulty:'hard',time:60,kills:0,built:1,date:'2026-11-06T11:00:00.000Z'}]),
  };
  await seedOnce(page,{...profile,[SAVE]:JSON.stringify(battle)});await press(page,'#resumeSaved');const before=await pause(page),storedProfile=await domains(page);
  for(const value of Object.values(storedProfile))expect(value).not.toBeNull();
  await press(page,'#restartBattle');await press(page,'#confirmRestart');const after=await pause(page);
  expect(after.version).toBe(before.version);expect(after.game.version).toBe(before.game.version);
  expect(after.game.mapId).toBe(before.game.mapId);expect(after.game.difficulty).toBe('hard');expect(after.game.ai).toBe(false);
  expect(after.game.state.buildings.filter(b=>b.side===0)).toHaveLength(1);expect(await domains(page)).toEqual(storedProfile);
  await press(page,'#saveExit');await page.reload();await press(page,'#resumeSaved');const restored=await pause(page);
  expect(restored.game.version).toBe(after.game.version);expect(await domains(page)).toEqual(storedProfile);
});

test('viewport interruption closes restart and keeps its resume latch and checkpoint intact',async({page})=>{
  await start(page);await pause(page);await press(page,'#restartBattle');const before=await raw(page),size=page.viewportSize();
  await page.setViewportSize({width:240,height:180});await expect(page.locator('#viewportModal')).toBeVisible();
  await expect(page.locator('#restartModal')).toBeHidden();expect(await raw(page)).toEqual(before);
  await page.setViewportSize(size);await expect(page.locator('#viewportResume')).toBeEnabled();
  await page.keyboard.press('Escape');await expect(page.locator('#viewportModal')).toBeVisible();expect(await raw(page)).toEqual(before);
  await press(page,'#viewportResume');await expect(page.locator('#pauseVeil')).toBeHidden();
});
