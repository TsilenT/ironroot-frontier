// Current automatic-air UI contract. The superseded manual-order harness is
// archived verbatim at ../historical/manual-flight/flight-orders.spec.mjs.txt.
// These cases use real UI actions and declared, fully paid storage checkpoints.
// No live engine mutation, forced DOM clicks, lab page or synthetic balance proof.
import {expect} from '@playwright/test';
import {Game, getMap} from '../../dist/engine.js';
import {getCampaignMission} from '../../dist/campaign.js';
import {parseBackup, BACKUP_STORAGE_KEYS as K} from '../../dist/backup.js';
import {CURRENT_PROFILE_PROTOCOL_VERSION, PROFILE_MARKER_KEY} from '../../dist/profile-session.js';
import {test, press, tapPoint, homePoint, seedOnce, saved, pause, openBackup, downloadBackup, chooseBackup, observeCanvas, canvasFrame} from './map-browser-helpers.mjs';
import {openBuildControls} from './shared-build-controls.mjs';
import {expectReachable} from './training-browser-helpers.mjs';
import {trainingProfileFixture} from './training-fixtures.mjs';
import {assertPassiveContinuation} from './passive-continuation.mjs';
import {prerequisiteProgress} from './expanded-campaign-fixtures.mjs';
import {automaticAirFixture} from './autonomous-air-fixtures.mjs';
import {fullyContained} from './flight-pause-layout-geometry.mjs';

test.setTimeout(45000);
const AUTOMATIC_RULES=['frontier-air-local-open','frontier-air-local-timed'];
const PERSISTENT_KEYS=[K.campaign,K.trials,K.settings,K.history];
const building=(envelope,id)=>envelope.game.state.buildings.find(b=>b.id===id);
const unit=(envelope,id)=>envelope.game.state.units.find(u=>u.id===id);
const profileBytes=page=>page.evaluate(keys=>Object.fromEntries(keys.map(key=>[key,localStorage.getItem(key)])),Object.values(K));
const persistentBytes=page=>page.evaluate(keys=>Object.fromEntries(keys.map(key=>[key,localStorage.getItem(key)])),PERSISTENT_KEYS);
function profileValues(progress) {
  // Synthetic existing stars, preferences, records and history are persistence
  // sentinels, not earned gameplay. The battle is always this suite's checkpoint.
  const values=trainingProfileFixture().values;delete values[K.battle];
  if(progress)values[K.campaign]=JSON.stringify(progress);
  return values;
}
async function noManualAirUI(page) {
  await expect(page.locator('#flightOrders,#flightHold,#flightNorth,#flightSouth,#flightOrderCurrent,#flightOrderHelp,#pauseFlights,#pauseFlightList,#flightAlert')).toHaveCount(0);
}
function automaticSnapshot(envelope) {
  expect(envelope.game.rulesetId).toMatch(/^frontier-(air-local-(open|timed)|campaign-air-local)$/);
  for(const b of envelope.game.state.buildings)expect(b).not.toHaveProperty('flightPlan');
  for(const u of envelope.game.state.units)expect(u).not.toHaveProperty('airRoute');
}
async function seedFixture(page,fixture) {
  await seedOnce(page,{...profileValues(),[K.battle]:JSON.stringify(fixture.envelope)});
  expect(await saved(page)).toEqual(fixture.envelope);
  expect(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).version,PROFILE_MARKER_KEY)).toBe(CURRENT_PROFILE_PROTOCOL_VERSION);
  await noManualAirUI(page);await press(page,'#resumeSaved');
  await expect(page.locator('#coachingModal')).toBeHidden();
}
async function pointAt(page,map,b) {
  const mini=await page.locator('#minimap').boundingBox();
  await tapPoint(page,{x:mini.x+b.x/map.width*mini.width,y:mini.y+mini.height/2});
  const r=await page.locator('#battle').boundingBox(),scale=Math.max(.32,r.height/900),half=r.width/(2*scale);
  const camera=half>=map.width/2?map.width/2:Math.max(half,Math.min(map.width-half,b.x));
  return {x:r.x+r.width/2+(b.x-camera)*scale,y:r.y+r.height/2+(b.y-450)*scale};
}
async function inspect(page,envelope,id) {
  await tapPoint(page,await pointAt(page,getMap(envelope.game.mapId||'classic'),building(envelope,id)));
  await expect(page.locator('#selectionPanel')).toBeVisible();
  await expect(page.locator('#selectionDescription')).toContainText('nearby enemies on their road or one road over');
  await noManualAirUI(page);
}
async function planning(page,id='wings-of-ash') {
  const progress=prerequisiteProgress(id);
  await seedOnce(page,profileValues(progress));
  const persistent=await persistentBytes(page);
  await press(page,'#campaignStoryNav');await press(page,'[data-chapter="highpass"]');await press(page,`[data-mission="${id}"]`);
  await press(page,'#start');await expect(page.locator('#coachingModal')).toBeVisible();
  await expect(page.locator('#coachingModal')).not.toContainText(/future gryphons|flight orders|Hold\/North\/South/);
  await press(page,'#coachingPlan');await expect(page.locator('#time')).toHaveText('00:00');
  const initial=await saved(page);automaticSnapshot(initial);
  expect(initial).toMatchObject({scenario:{kind:'campaign',id,revision:4},game:{rulesetId:'frontier-campaign-air-local'}});
  return {initial,persistent,mission:getCampaignMission(id,4),map:Game.restore(initial.game).map};
}
async function planningSnapshot(page) {
  await press(page,'#settings');const result=await saved(page);await press(page,'#settingsDone');
  await expect(page.locator('#settingsModal')).toBeHidden();await expect(page.locator('#pauseVeil')).toBeHidden();return result;
}
async function paidAerie(page,map) {
  await openBuildControls(page);await press(page,'[data-type="aerie"]');
  await tapPoint(page,await homePoint(page,map,550,map.lanes[1]));
  await expect(page.locator('#toast')).toContainText('Gryphon aerie raised');
  await expect(page.locator('#battle')).not.toHaveClass(/placing/);
  await expect(page.locator('.build-card.active')).toHaveCount(0);await expect(page.locator('#cancelBuild')).toBeHidden();
}
async function unclippedAction(page,selector) {
  await expectReachable(page,selector);
  const measurement=await page.locator(selector).evaluate(element=>{
    const r=element.getBoundingClientRect();
    const clip={left:0,top:0,right:innerWidth,bottom:innerHeight};
    for(let parent=element.parentElement;parent;parent=parent.parentElement){
      const style=getComputedStyle(parent),box=parent.getBoundingClientRect();
      if(/auto|scroll|hidden|clip/.test(style.overflowX)){
        clip.left=Math.max(clip.left,box.left+parent.clientLeft);
        clip.right=Math.min(clip.right,box.left+parent.clientLeft+parent.clientWidth);
      }
      if(/auto|scroll|hidden|clip/.test(style.overflowY)){
        clip.top=Math.max(clip.top,box.top+parent.clientTop);
        clip.bottom=Math.min(clip.bottom,box.top+parent.clientTop+parent.clientHeight);
      }
    }
    return {rect:{left:r.left,top:r.top,right:r.right,bottom:r.bottom},clip,width:r.width,height:r.height};
  });
  expect(fullyContained(measurement.rect,measurement.clip),selector+' fully fits every actual scrollport without fractional clipping').toBe(true);
  expect(measurement.width).toBeGreaterThanOrEqual(44);expect(measurement.height).toBeGreaterThanOrEqual(44);
  return measurement;
}
async function clockAtLeast(page,seconds) {
  await expect.poll(async()=>{
    const [m,s]=(await page.locator('#time').textContent()).split(':').map(Number);return m*60+s;
  },{timeout:16000,message:'ordinary displayed battle clock advances without orders'}).toBeGreaterThanOrEqual(seconds);
}
async function automaticGuide(page) {
  await press(page,'#help');
  if(!await page.locator('#rosterGuide').evaluate(e=>e.open))await press(page,'#rosterGuideToggle');
  await expect(page.locator('#flightGuide')).toBeVisible();
  await expect(page.locator('#flightGuideTitle')).toHaveText('Flying between roads');
  await expect(page.locator('#flightGuideText')).toContainText('on their road or one road over');
  await expect(page.locator('#flightGuideText')).toContainText('automatically');
  await expect(page.locator('#flightGuideText')).toContainText('Archers stay on their road');
  await expect(page.locator('#flightGuide')).not.toContainText(/crossing point|future launches|warning phase|North.*Hold.*South/);
  const gryphon=page.locator('[data-codex-unit="gryphon"]');
  if(!await gryphon.evaluate(e=>e.open))await press(page,'[data-codex-unit="gryphon"] > summary');
  await expect(gryphon).toContainText('300 world units');await expect(gryphon).toContainText('420 world units');
  await expect(gryphon).toContainText('after losing it, seeks another nearby enemy or advances along the nearest road');
  await expect(page.locator('#flightGuideText')).toContainText('Following fights can carry them farther across the field');
  const archer=page.locator('[data-codex-unit="archer"]');
  if(!await archer.evaluate(e=>e.open))await press(page,'[data-codex-unit="archer"] > summary');
  await expect(archer).toContainText('Archers stay on their road, but can shoot a flyer between roads when it comes within range');
  await noManualAirUI(page);await press(page,'#guideDone');
  await expect(page.locator('#help')).toBeFocused();await expect(page.locator('#pauseVeil')).toBeVisible();
}

for(const id of ['wings-of-ash','stonegate'])test(`${id}: paid planning aerie is one-shot and Back/Forward keeps the automatic-air teaching hold`,async({page})=>{
  const {initial,map,mission,persistent}=await planning(page,id);await paidAerie(page,map);
  // A second bare-field confirmation must not repeat the paid construction.
  await tapPoint(page,await homePoint(page,map,270,map.lanes[1]));
  const purchase=await planningSnapshot(page),aerie=purchase.game.state.buildings.find(b=>b.side===0&&b.type==='aerie');
  expect(aerie).toMatchObject({lane:1,invested:250});automaticSnapshot(purchase);
  expect(purchase.game.state.gold[0]).toBe(mission.startingGold-250);
  expect(purchase.game.state.stats.built[0]).toBe(initial.game.state.stats.built[0]+1);
  expect(purchase.game.state.buildings.filter(b=>b.side===0&&b.type==='aerie')).toHaveLength(1);
  expect(purchase.game.state.units).toHaveLength(0);expect(purchase.game.state.time).toBe(0);
  await inspect(page,purchase,aerie.id);await press(page,'#settings');
  expect(await saved(page)).toEqual(purchase);
  await page.evaluate(()=>history.back());await expect(page.locator('#settingsModal')).toBeHidden();
  await expect(page.locator('#time')).toHaveText('00:00');await page.waitForTimeout(350);expect(await saved(page)).toEqual(purchase);
  await page.evaluate(()=>history.forward());await expect(page.locator('#settingsModal')).toBeVisible();
  await page.waitForTimeout(350);expect(await saved(page)).toEqual(purchase);
  await press(page,'#settingsDone');await expect(page.locator('#pauseVeil')).toBeVisible();
  expect(await persistentBytes(page)).toEqual(persistent);expect(await saved(page)).toEqual(purchase);
  await press(page,'#resume');await clockAtLeast(page,1);const running=await pause(page);
  assertPassiveContinuation(purchase.game,running.game);expect(building(running,aerie.id)).toMatchObject({invested:250,lane:1});
  expect(await persistentBytes(page)).toEqual(persistent);
});

for(const mapId of ['classic','twin-span','long-march'])test(`${mapId}: fully paid gryphon pursues and damages an adjacent-road enemy without any order`,async({page})=>{
  await observeCanvas(page);const fixture=automaticAirFixture(mapId);await seedFixture(page,fixture);
  const persistent=await persistentBytes(page),before=fixture.envelope;
  await press(page,'#front');await clockAtLeast(page,Math.ceil(before.game.state.time)+5);
  const after=await pause(page);assertPassiveContinuation(before.game,after.game,{maxSeconds:12});automaticSnapshot(after);
  const flyer=unit(after,fixture.flyerId),target=unit(after,fixture.targetId);
  expect(flyer).toMatchObject({type:'gryphon',side:0,lane:fixture.destination,airTargetId:fixture.targetId});
  expect(Math.abs(flyer.y-Game.restore(before.game).map.lanes[fixture.source])).toBeGreaterThan(100);
  expect(target.hp).toBeLessThan(unit(before,fixture.targetId).hp);
  expect(after.game.state.stats.damage[0]).toBeGreaterThan(before.game.state.stats.damage[0]);
  expect(after.game.state.stats.built).toEqual(before.game.state.stats.built);
  expect(after.game.state.gold[0]).toBeCloseTo(420-250+5*after.game.state.time,6);
  expect(after.game.state.gold[1]).toBeCloseTo(420-210+5*after.game.state.time,6);
  expect((await canvasFrame(page)).battle.text.map(t=>t.text).join('\n')).not.toMatch(/NEXT LAUNCH|CROSSING|SHIFTING|AIR ROUTE/);
  await noManualAirUI(page);expect(await persistentBytes(page)).toEqual(persistent);
  await page.waitForTimeout(400);expect(await saved(page)).toEqual(after);
});

test('mid-chase pause, save, reload, backup import and explicit Resume preserve exact automatic continuation',async({page})=>{
  const fixture=automaticAirFixture();await seedFixture(page,fixture);
  const first=await pause(page);assertPassiveContinuation(fixture.envelope.game,first.game);
  expect(unit(first,fixture.flyerId).airTargetId).toBe(fixture.targetId);const persistent=await persistentBytes(page);
  await press(page,'#saveExit');await page.reload();expect(await saved(page)).toEqual(first);
  expect(await persistentBytes(page)).toEqual(persistent);
  await openBackup(page);const text=await downloadBackup(page),backup=parseBackup(text);expect(backup.data.battle).toEqual(first);
  for(const [name,key] of Object.entries(K))if(name!=='battle')expect(backup.data[name]).toEqual(JSON.parse(persistent[key]));
  await chooseBackup(page,text);await expect(page.locator('#backupModal')).toBeVisible();
  await press(page,'#cancelImport');expect(await saved(page)).toEqual(first);expect(await persistentBytes(page)).toEqual(persistent);
  await chooseBackup(page,text);await Promise.all([page.waitForEvent('load'),press(page,'#confirmImport')]);
  expect(await saved(page)).toEqual(first);
  for(const key of PERSISTENT_KEYS)expect(JSON.parse((await persistentBytes(page))[key])).toEqual(JSON.parse(persistent[key]));
  await press(page,'#resumeSaved');await expect(page.locator('#coachingModal')).toBeHidden();
  const restored=await pause(page);assertPassiveContinuation(first.game,restored.game);automaticSnapshot(restored);
  await page.waitForTimeout(400);expect(await saved(page)).toEqual(restored);
  await press(page,'#resume');await clockAtLeast(page,Math.ceil(restored.game.state.time)+2);const continued=await pause(page);
  assertPassiveContinuation(restored.game,continued.game,{maxSeconds:6});
  expect(continued.game.state.time).toBeGreaterThan(restored.game.state.time);expect(unit(continued,fixture.flyerId).airTargetId).toBe(fixture.targetId);
});

for(const rulesetId of AUTOMATIC_RULES)test(`${rulesetId}: fresh roster, automatic guide and confirmed restart keep the selected rules`,async({page})=>{
  await seedOnce(page,profileValues());const persistent=await persistentBytes(page);await press(page,'[data-mode="skirmish"]');
  expect(await page.locator('#skirmishRules option').evaluateAll(options=>options.map(o=>o.value))).toEqual(AUTOMATIC_RULES);
  await page.locator('#skirmishRules').selectOption(rulesetId);
  await expect(page.locator('#skirmishRulesDescription')).toContainText('gryphons that seek nearby enemies one road over');
  await expect(page.locator('#skirmishRulesDescription')).toContainText(rulesetId.endsWith('timed')?'citadels lose health from 7:00':'citadels never decay with time');
  await press(page,'#start');await openBuildControls(page);await expect(page.locator('.build-card:visible')).toHaveCount(8);
  const before=await pause(page);automaticSnapshot(before);expect(before.game.rulesetId).toBe(rulesetId);
  expect(Game.restore(before.game).ruleset.endgame.forcedDecay).toBe(rulesetId.endsWith('timed'));
  await automaticGuide(page);expect(await saved(page)).toEqual(before);
  await press(page,'#restartBattle');await press(page,'#cancelRestart');expect(await saved(page)).toEqual(before);
  await expect(page.locator('#restartBattle')).toBeFocused();
  await press(page,'#restartBattle');await press(page,'#confirmRestart');const restarted=await pause(page);
  expect(restarted.game.rulesetId).toBe(rulesetId);expect(restarted.scenario).toEqual(before.scenario);automaticSnapshot(restarted);
  expect(restarted.game.state.stats.built).toEqual([1,1]);expect(await persistentBytes(page)).toEqual(persistent);
});

for(const viewport of [{width:320,height:430},{width:667,height:300}])test(`${viewport.width}×${viewport.height}: aerie inspection and ordinary actions fit without resurrecting orders or charging twice`,async({page},info)=>{
  await page.setViewportSize(viewport);const {map,persistent}=await planning(page);await paidAerie(page,map);
  const before=await planningSnapshot(page),aerie=before.game.state.buildings.find(b=>b.side===0&&b.type==='aerie');await inspect(page,before,aerie.id);
  const bounds={};
  for(const selector of ['#upgrade','#sell','#closeSelection'])bounds[selector]=await unclippedAction(page,selector);
  await info.attach('automatic-air-strict-action-bounds',{body:JSON.stringify(bounds,null,2),contentType:'application/json'});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
  await info.attach(`automatic-air-controls-${viewport.width}-${info.project.name}`,{body:await page.screenshot(),contentType:'image/png'});
  await press(page,'#closeSelection');await expect(page.locator('#selectionPanel')).toBeHidden();
  for(const selector of ['#pause','#compactBuild'])await expectReachable(page,selector);
  const after=await planningSnapshot(page);expect(after).toEqual(before);expect(await persistentBytes(page)).toEqual(persistent);
});

test('newer tab automatic chase checkpoint cannot be overwritten by stale Save or restart',async({page,context})=>{
  const fixture=automaticAirFixture();await seedFixture(page,fixture);await pause(page);await press(page,'#restartBattle');
  const other=await context.newPage(),errors=[];other.on('pageerror',error=>errors.push(error.message));
  try {
    await other.goto('/');await press(other,'#resumeSaved');await clockAtLeast(other,Math.ceil(fixture.envelope.game.state.time)+1);
    const newest=await pause(other);automaticSnapshot(newest);const exact=await profileBytes(other);
    await page.bringToFront();await press(page,'#confirmRestart');
    await expect(page.locator('#restartStatus')).toContainText('checkpoint changed');expect(await profileBytes(page)).toEqual(exact);
    await press(page,'#cancelRestart');await expect(page.locator('#restartBattle')).toBeDisabled();
    await press(page,'#saveExit');await expect(page.locator('#welcome')).toBeVisible();expect(await profileBytes(page)).toEqual(exact);
    await openBackup(page);expect(parseBackup(await downloadBackup(page)).data.battle).toEqual(newest);
  } finally {await other.close();expect(errors).toEqual([]);}
});

test('completed Wings replay starts current automatic rules without repeating teaching or changing stars/settings/history',async({page})=>{
  const progress=prerequisiteProgress('wings-of-ash');progress.missions['wings-of-ash']={completed:true,stars:2,bestTime:150};
  await seedOnce(page,profileValues(progress));const persistent=await persistentBytes(page);
  await press(page,'#campaignStoryNav');await press(page,'[data-chapter="highpass"]');await press(page,'[data-mission="wings-of-ash"]');
  await press(page,'#start');await expect(page.locator('#coachingModal')).toBeHidden();await clockAtLeast(page,1);
  const checkpoint=await pause(page);automaticSnapshot(checkpoint);
  expect(checkpoint).toMatchObject({scenario:{kind:'campaign',id:'wings-of-ash',revision:4},game:{rulesetId:'frontier-campaign-air-local'}});
  expect(await persistentBytes(page)).toEqual(persistent);await noManualAirUI(page);
});
