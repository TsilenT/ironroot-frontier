// Real-time gestures, history, storage and reloads. No clock installation,
// accelerated callbacks or post-launch game mutations in this suite.
import {expect} from '@playwright/test';
import {test,press,seedOnce,saved,observeCanvas,expectCamera,openBackup,chooseBackup,downloadBackup} from './map-browser-helpers.mjs';
import {openBuildControls} from './shared-build-controls.mjs';
import {inspectPhoneText,settlePhoneViewport} from './phone-text-evidence.mjs';
import {getMap} from '../../dist/engine.js';
import {parseBackup,BACKUP_STORAGE_KEYS as K} from '../../dist/backup.js';
import {CURRENT_PROFILE_PROTOCOL_VERSION,PROFILE_MARKER_KEY as MARKER} from '../../dist/profile-session.js';
import {protocolSevenSource} from '../../tests/fixtures/profile-session-v0172-source.mjs';
import {ID,NAMES,TARGETS,FIXTURES,priorProfile} from './ashen-crossroads-fixtures.mjs';
const select=async page=>{await press(page,'[data-mode="challenges"]');await press(page,'#challengeChoices button:has-text("Ashen Crossroads")');};
const target=(page,index)=>page.locator(`[data-protected-id="${TARGETS[index]}"]`);
const domains=page=>page.evaluate(keys=>Object.fromEntries(keys.map(key=>[key,localStorage.getItem(key)])),Object.values(K));
async function screenshot(page,info,name){await page.screenshot({path:info.outputPath(`${name}.png`),fullPage:true});await info.attach(name,{path:info.outputPath(`${name}.png`),contentType:'image/png'});}
async function targetGeometry(page){
  const value=await page.locator('#protectedTargets').evaluate(element=>{
    const box=element.getBoundingClientRect();
    return [...element.children].map(button=>{
      const r=button.getBoundingClientRect(),name=button.querySelector('.protected-name'),health=button.querySelector('.protected-health');
      const textFits=node=>{const range=document.createRange();range.selectNodeContents(node);const text=range.getBoundingClientRect();return text.left>=r.left-.5&&text.right<=r.right+.5&&text.top>=r.top-.5&&text.bottom<=r.bottom+.5;};
      return {name:name.textContent,width:r.width,height:r.height,within:r.left>=0&&r.right<=innerWidth+.5&&r.top>=0&&r.bottom<=innerHeight+.5,
        insideGroup:r.top>=box.top-.5&&r.bottom<=box.bottom+.5,hit:button.contains(document.elementFromPoint(r.left+r.width/2,r.top+r.height/2)),nameFits:textFits(name),healthFits:textFits(health)};
    });
  });
  expect(value).toHaveLength(3);for(const [i,row] of value.entries()){expect(row.name).toBe(NAMES[i]);expect(row.width).toBeGreaterThanOrEqual(43.5);expect(row.height).toBeGreaterThanOrEqual(43.5);expect(row).toMatchObject({within:true,insideGroup:true,hit:true,nameFits:true,healthFits:true});}
  return value;
}

test('sixth trial scouts three named choices and preserves native focus and compact geometry',async({page},info)=>{
  test.setTimeout(45000);await observeCanvas(page);await page.goto('/');await select(page);
  await expect(page.locator('#challengeChoices button')).toHaveCount(6);
  await expect(page.locator('#challengeObjective')).toContainText('Destroy any 2 of the 3 named positions');
  await expect(page.locator('#challengeObjective')).toContainText('or destroy the enemy citadel');
  await expect(page.locator('#challengeObjective')).toContainText('third position may remain standing');
  for(const name of NAMES)await expect(page.locator('#challengeBriefing')).toContainText(name);
  await press(page,'#challengeConfig summary:has-text("Scout the roads")');
  await expect(page.locator('#challengeScouting .scouting-objectives')).toHaveText('Destroy any 2 of 3 named enemy positions; the others may remain standing.');
  for(const name of NAMES)await expect(page.locator('#challengeScouting .scouting-army-right')).toContainText(name);
  await screenshot(page,info,'scouting');
  await press(page,'#start');await expect(page.locator('#welcome')).toBeHidden();await settlePhoneViewport(page);
  await expect(page.locator('#objectiveProgress')).toHaveText('0/2 targets destroyed');await expect(page.locator('#viewportModal')).toBeHidden();
  await targetGeometry(page);await screenshot(page,info,'targets');
  await openBuildControls(page);await press(page,'[data-type="barracks"]');await expect(page.locator('#battle')).toHaveClass(/placing/);
  await press(page,`[data-protected-id="${TARGETS[0]}"]`);await expect(page.locator('#battle')).not.toHaveClass(/placing/);
  await expect(page.locator('#app')).not.toHaveClass(/compact-build-open/);await expectCamera(page,getMap('classic'),1950);
  for(const [i,x] of [[1,2090],[2,2230]]){await target(page,i).focus();await page.keyboard.press('Enter');await expectCamera(page,getMap('classic'),x);await expect(target(page,i)).toBeFocused();}
  if(info.project.name==='narrow-phone'){
    await page.setViewportSize({width:320,height:480});await settlePhoneViewport(page);await expect(page.locator('#viewportModal')).toBeHidden();
    await targetGeometry(page);await screenshot(page,info,'short-portrait-targets');
    await page.setViewportSize({width:320,height:430});await settlePhoneViewport(page);
    await expect(page.locator('#viewportModal')).toBeHidden();await targetGeometry(page);
    const text=await page.evaluate(inspectPhoneText,{selector:'#objectiveProgress,#objectiveTime,.protected-name,.protected-health,#gold,#income,#time'});
    expect(text).toHaveLength(11);for(const row of text)expect(row.complete,JSON.stringify(row)).toBe(true);
    for(const id of ['compactBuild','pause','speed','rally','settings','home','front','minimap']){
      const control=page.locator('#'+id);await expect(control).toBeVisible();
      const geometry=await control.evaluate(element=>{const r=element.getBoundingClientRect();return {width:r.width,height:r.height,within:r.left>=0&&r.right<=innerWidth+.5&&r.top>=0&&r.bottom<=innerHeight+.5,hit:element.contains(document.elementFromPoint(r.left+r.width/2,r.top+r.height/2))};});
      expect(geometry.width,id).toBeGreaterThanOrEqual(43.5);expect(geometry.height,id).toBeGreaterThanOrEqual(43.5);expect(geometry,id).toMatchObject({within:true,hit:true});
    }
    await press(page,`[data-protected-id="${TARGETS[0]}"]`);await expectCamera(page,getMap('classic'),1950);
    const clock=await page.locator('#time').textContent();await expect.poll(()=>page.locator('#time').textContent()).not.toBe(clock);
    await expect(page.locator('#viewportModal')).toBeHidden();
    await screenshot(page,info,'shortest-portrait-targets');
  }
  await page.keyboard.press('Escape');await expect(page.locator('#pauseVeil')).toBeVisible();
  await expect(page.locator('#pauseObjective')).toContainText('any 2');await expect(page.locator('#pauseObjective')).toContainText('enemy citadel');
});

test('earned one-target save reloads with stable remaining states and Back restart preserves identity',async({page},info)=>{
  test.setTimeout(40000);await observeCanvas(page);await seedOnce(page,priorProfile(FIXTURES.partial));await press(page,'#resumeSaved');
  await expect(page.locator('#objectiveProgress')).toHaveText('1/2 targets destroyed');
  await expect(page.locator('#protectedTargets [data-state="destroyed"]')).toHaveCount(1);
  await expect(page.locator('#protectedTargets [data-state="standing"]')).toHaveCount(2);
  await expect(page.locator('#protectedTargets [data-state="destroyed"]')).toBeDisabled();
  await targetGeometry(page);await screenshot(page,info,'one-target');
  await page.evaluate(()=>history.back());await expect(page.locator('#pauseVeil')).toBeVisible();const checkpoint=await saved(page);
  await page.waitForTimeout(250);expect(await saved(page)).toEqual(checkpoint);
  await page.evaluate(()=>history.forward());await expect(page.locator('#pauseVeil')).toBeVisible();expect(await saved(page)).toEqual(checkpoint);
  await page.reload();await expect(page.locator('#resumeSaved')).toContainText('ASHEN CROSSROADS');await press(page,'#resumeSaved');
  await expect(page.locator('#objectiveProgress')).toHaveText('1/2 targets destroyed');
  await press(page,'#pause');await press(page,'#restartBattle');await page.evaluate(()=>history.back());await expect(page.locator('#restartModal')).toBeHidden();await expect(page.locator('#pauseVeil')).toBeVisible();
  await press(page,'#restartBattle');await press(page,'#confirmRestart');await expect(page.locator('#objectiveProgress')).toHaveText('0/2 targets destroyed');
  await expect(page.locator('#protectedTargets [data-state="standing"]')).toHaveCount(3);
  await press(page,'#pause');const restarted=await saved(page);expect(restarted.scenario).toEqual({kind:'trial',id:ID,revision:2});
  expect(restarted.game.state.stats.built[0]).toBe(3);expect(restarted.game.state.gold[0]).toBeCloseTo(650+5*restarted.game.state.time,1);
  await press(page,'#saveExit');await expect(page.locator('#welcome')).toBeVisible();await expect(page.locator('#challengeChoices .active')).toContainText('Ashen Crossroads');
});

test('earned completion records the sixth trial and exports imports and reloads the whole profile',async({page},info)=>{
  test.setTimeout(45000);const initial=priorProfile(FIXTURES.nearWin);await seedOnce(page,initial);await press(page,'#resumeSaved');
  await expect(page.locator('#resultEyebrow')).toHaveText('FIELD TRIAL COMPLETE');await expect(page.locator('#resultCopy')).toContainText('2/2 targets destroyed');
  await expect(page.locator('#resultObjectives')).toContainText('Pinewatch: destroyed');await expect(page.locator('#resultObjectives')).toContainText('Stonegate: destroyed');
  await expect(page.locator('#resultObjectives')).toContainText('Ember Roost: standing · not needed');await screenshot(page,info,'complete');
  const after=await domains(page),records=JSON.parse(after[K.trials]),history=JSON.parse(after[K.history]);
  expect(records.shieldbreaker).toEqual({completed:true,bestTime:10});expect(records[ID].completed).toBe(true);expect(records[ID].bestTime).toBeGreaterThan(0);
  expect(after[K.settings]).toBe(initial[K.settings]);expect(JSON.parse(after[K.campaign])).toEqual(JSON.parse(initial[K.campaign]));expect(after[K.battle]).toBeNull();
  expect(history).toHaveLength(2);expect(history.find(row=>row.identity?.scenario.id===ID)).toMatchObject({won:true,identity:{scenario:{kind:'trial',id:ID,revision:2}}});
  await press(page,'#playAgain');await expect(page.locator('#challengeMedal')).toContainText('Best');await expect(page.locator('#challengeChoices .active')).toContainText('Ashen Crossroads');
  await openBackup(page);const text=await downloadBackup(page),backup=parseBackup(text);expect(backup.data.trials).toEqual(records);expect(backup.data.history).toEqual(history);expect(backup.data.settings).toEqual(JSON.parse(initial[K.settings]));
  await chooseBackup(page,text);await expect(page.locator('#backupSummary')).toContainText('2/6 trial records');
  await Promise.all([page.waitForNavigation({waitUntil:'load'}),press(page,'#confirmImport')]);
  await select(page);await expect(page.locator('#challengeMedal')).toContainText('Best');
  const imported=await domains(page);expect(JSON.parse(imported[K.trials])).toEqual(records);expect(JSON.parse(imported[K.history])).toEqual(history);expect(JSON.parse(imported[K.settings])).toEqual(backup.data.settings);expect(JSON.parse(imported[K.campaign])).toEqual(backup.data.campaign);
  await page.reload();await select(page);await expect(page.locator('#challengeMedal')).toContainText('Best');expect(JSON.parse((await domains(page))[K.trials])).toEqual(records);
});

test('ordinary idle defeat offers a fresh retry without awarding a trial record',async({page},info)=>{
  await seedOnce(page,priorProfile(FIXTURES.nearLoss));await press(page,'#resumeSaved');await expect(page.locator('#resultTitle')).toHaveText('TRIAL FAILED');
  await expect(page.locator('#resultCopy')).toContainText('Your citadel fell');await expect(page.locator('#playAgain')).toContainText('RETRY FIELD TRIAL');
  expect(JSON.parse((await domains(page))[K.trials])).toEqual({shieldbreaker:{completed:true,bestTime:10}});await screenshot(page,info,'failed');
  await press(page,'#playAgain');await expect(page.locator('#objectiveProgress')).toHaveText('0/2 targets destroyed');await expect(page.locator('#protectedTargets [data-state="standing"]')).toHaveCount(3);
  await press(page,'#pause');const battle=await saved(page);expect(battle.scenario).toEqual({kind:'trial',id:ID,revision:2});expect(battle.game.state.stats.built[0]).toBe(3);expect(battle.game.state.gold[0]).toBeCloseTo(650+5*battle.game.state.time,1);
});

test('protocol seven open and later clients cannot discard the new trial record after migration',async({page,context})=>{
  test.setTimeout(45000);await context.route('**/__qa_protocol7.js',route=>route.fulfill({status:200,contentType:'text/javascript',body:protocolSevenSource}));
  const old=await context.newPage();await old.goto('/FONTS-NOTICES.txt');const initial=priorProfile(FIXTURES.nearWin);
  await old.evaluate(({initial,key})=>{for(const [k,v]of Object.entries(initial))localStorage.setItem(k,v);localStorage.setItem(key,JSON.stringify({format:'ironroot-profile',version:7,epoch:'trial-prior',phase:'ready'}));}, {initial,key:MARKER});
  await old.evaluate(async()=>{const {createProfileSession}=await import('/__qa_protocol7.js');window.__oldTrialProfile=createProfileSession(()=>localStorage,{requiredProtocolVersion:7});});
  expect(await old.evaluate(()=>window.__oldTrialProfile.status().canWrite)).toBe(true);
  await page.goto('/');expect(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),MARKER)).toMatchObject({version:CURRENT_PROFILE_PROTOCOL_VERSION,epoch:'trial-prior'});
  const migrated=await domains(page);for(const key of Object.keys(initial))expect(migrated[key]).toBe(initial[key]);
  await press(page,'#resumeSaved');await expect(page.locator('#resultEyebrow')).toHaveText('FIELD TRIAL COMPLETE');const complete=await domains(page);expect(JSON.parse(complete[K.trials])[ID].completed).toBe(true);
  const attempts=await old.evaluate(async({keys,trials})=>{
    const {createProfileSession}=await import('/__qa_protocol7.js');const later=createProfileSession(()=>localStorage,{requiredProtocolVersion:7});
    return [window.__oldTrialProfile,later].map(client=>{
      const blocked=[];for(const key of keys){for(const action of [()=>client.storage.setItem(key,key===trials?JSON.stringify({shieldbreaker:{completed:true,bestTime:10}}):'stale'),()=>client.storage.removeItem(key)]){try{action();blocked.push(false);}catch{blocked.push(true);}}}
      return {canWrite:client.status().canWrite,blocked,begin:client.beginImport().ok,recover:client.beginImport({recover:true}).code};
    });
  },{keys:Object.values(K),trials:K.trials});
  for(const result of attempts){expect(result).toEqual({canWrite:false,blocked:Array(10).fill(true),begin:false,recover:'unsupported-protocol'});}
  expect(await domains(page)).toEqual(complete);await old.close();
});
