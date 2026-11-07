// Production UI coverage. Run in the authorized browser runner, never a lab
// page or hidden app-state hook. Authored checkpoint fixtures are identified;
// emulated viewport/input evidence is not physical-device or balance proof.
import {expect} from '@playwright/test';
import {Game, getMap} from '../../dist/engine.js';
import {getCampaignMission} from '../../dist/campaign.js';
import {parseBackup, BACKUP_STORAGE_KEYS as K} from '../../dist/backup.js';
import {CURRENT_PROFILE_PROTOCOL_VERSION, PROFILE_MARKER_KEY} from '../../dist/profile-session.js';
import {test, press, tapPoint, homePoint, seedOnce, saved, pause, openBackup, downloadBackup, chooseBackup, observeCanvas, canvasFrame} from './map-browser-helpers.mjs';
import {openBuildControls} from './shared-build-controls.mjs';
import {heldPointer, center, expectReachable} from './training-browser-helpers.mjs';
import {assertPassiveContinuation} from './passive-continuation.mjs';
import {prerequisiteProgress} from './expanded-campaign-fixtures.mjs';
import {flightFixture, flightCampaignFixture, staggeredFlightFixture, FLIGHT_RULES, HISTORICAL_FLIGHTLESS_RULES, AIR_PHASES} from './flight-order-fixtures.mjs';

test.setTimeout(45000);
const building = (envelope,id) => envelope.game.state.buildings.find(b=>b.id===id);
const unit = (envelope,id) => envelope.game.state.units.find(u=>u.id===id);
const profileBytes = page => page.evaluate(keys=>Object.fromEntries(keys.map(key=>[key,localStorage.getItem(key)])),Object.values(K));
async function seedFixture(page, fixture) {
  await seedOnce(page,{[K.battle]:JSON.stringify(fixture.envelope),...(fixture.progress?{[K.campaign]:JSON.stringify(fixture.progress)}:{})});
  expect(await saved(page)).toEqual(fixture.envelope); // Admission must not reinterpret the checkpoint.
  expect(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).version,PROFILE_MARKER_KEY)).toBe(CURRENT_PROFILE_PROTOCOL_VERSION);
  await press(page,'#resumeSaved');await expect(page.locator('#coachingModal')).toBeHidden();
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
}
async function planning(page,id='wings-of-ash') {
  const progress=prerequisiteProgress(id);
  await seedOnce(page,{[K.campaign]:JSON.stringify(progress)});
  await press(page,'#campaignStoryNav');await press(page,'[data-chapter="highpass"]');await press(page,`[data-mission="${id}"]`);
  await press(page,'#start');await expect(page.locator('#coachingModal')).toBeVisible();
  await expect(page.locator('#coachingModal')).toContainText('future gryphons');
  await press(page,'#coachingPlan');await expect(page.locator('#time')).toHaveText('00:00');
  const initial=await saved(page);
  expect(initial).toMatchObject({scenario:{kind:'campaign',id,revision:3},game:{rulesetId:'frontier-campaign-flight'}});
  return {initial,progress,mission:getCampaignMission(id,3),map:Game.restore(initial.game).map};
}
async function planningSnapshot(page) {
  await press(page,'#settings');const result=await saved(page);await press(page,'#settingsDone');
  await expect(page.locator('#pauseVeil')).toBeHidden();return result;
}
async function paidAerie(page,map,lane=1) {
  await openBuildControls(page);await press(page,'[data-type="aerie"]');
  await tapPoint(page,await homePoint(page,map,550,map.lanes[lane]));
  await expect(page.locator('#toast')).toContainText('Gryphon aerie raised');
  await expect(page.locator('#battle')).not.toHaveClass(/placing/);
  await expect(page.locator('.build-card.active')).toHaveCount(0);
  await expect(page.locator('#cancelBuild')).toBeHidden();
}
async function airDisclosure(page,envelope) {
  const disclosure=page.locator('#pauseFlights');await expect(disclosure).toBeVisible();
  const toggle=page.locator('#pauseFlights > summary');await expect(toggle).toHaveText('Air routes');
  if(!await disclosure.evaluate(e=>e.open)){await toggle.focus();await page.keyboard.press('Enter');}
  await expect(disclosure).toHaveJSProperty('open',true);await expect(toggle).toBeFocused();
  // Independent saved-state oracle, not the presentation implementation.
  // Groups contain only launched, living, unfinished gryphons. A warning group
  // must announce its earliest crossing, never the slowest unit's countdown.
  const groups=new Map(),map=Game.restore(envelope.game).map;
  for(const u of envelope.game.state.units){
    const r=u.airRoute;if(u.type!=='gryphon'||u.hp<=0||!r||r.phase==='done')continue;
    const key=[u.side,r.from,r.to,r.phase].join(':');
    const group=groups.get(key)||{side:u.side,from:r.from,to:r.to,phase:r.phase,count:0,remaining:Infinity};
    group.count++;group.remaining=Math.min(group.remaining,r.remaining);groups.set(key,group);
  }
  const rows=[...groups.values()],road=lane=>(map.lanes.length===2?['North road','South road']:['North road','Middle road','South road'])[lane];
  const text=await page.locator('#pauseFlightList').textContent();
  if(!rows.length)expect(text).toBe('No gryphons are changing roads.');
  else {
    const lines=text.split('\n');expect(lines).toHaveLength(rows.length);
    for(const row of rows){
      const prefix=`${row.side?'Enemy':'Your'} ${row.count} ${row.count===1?'gryphon':'gryphons'}: ${road(row.from)} to ${road(row.to)}.`;
      const suffix=row.phase==='approach'?'Approaching the crossing.':row.phase==='transit'?'Crossing now; cannot attack.':null;
      if(suffix)expect(lines).toContain(prefix+' '+suffix);
      else {
        const tenths=Math.max(1,Math.ceil(row.remaining*10-1e-7));
        expect(lines,'earliest committed warning countdown').toContain(prefix+` Next crossing starts in ${(tenths/10).toFixed(1)} seconds.`);
      }
    }
  }
  return rows;
}

for(const id of ['wings-of-ash','stonegate'])test(`${id}: real paid planning aerie has free native Hold/North/South orders without advancing time, gold or RNG`,async({page})=>{
  const {initial,map,mission,progress}=await planning(page,id);await paidAerie(page,map);
  // A second bare battlefield confirmation must not repeat the paid building.
  await tapPoint(page,await homePoint(page,map,270,map.lanes[1]));
  const purchase=await planningSnapshot(page),aerie=purchase.game.state.buildings.find(b=>b.side===0&&b.type==='aerie');
  expect(aerie).toMatchObject({lane:1,flightPlan:1,invested:250});
  expect(purchase.game.state.gold[0]).toBe(mission.startingGold-250);
  expect(purchase.game.state.stats.built[0]).toBe(initial.game.state.stats.built[0]+1);
  expect(purchase.game.state.buildings.filter(b=>b.side===0&&b.type==='aerie')).toHaveLength(1);
  expect(purchase.game.state.units).toHaveLength(0);expect(purchase.game.state.time).toBe(0);
  await inspect(page,purchase,aerie.id);
  await expect(page.locator('#flightOrders')).toHaveAttribute('aria-label','Aerie flight orders');
  await expect(page.locator('#flightOrderHelp')).toContainText('Airborne gryphons keep their route');
  const handle=await page.locator('#flightSouth').elementHandle();
  for(const [key,lane] of [['North',0],['South',2],['Hold',1],['North',0],['North',0]]) {
    await expectReachable(page,'#flight'+key);await press(page,'#flight'+key);
    await expect(page.locator('#flight'+key)).toHaveAttribute('aria-pressed','true');
    const after=await planningSnapshot(page),expected=structuredClone(purchase);
    building(expected,aerie.id).flightPlan=lane;
    expect(after).toEqual(expected); // Includes clock, gold, full unit state, RNG, accumulator and costs.
  }
  await page.locator('#flightSouth').focus();await page.keyboard.press('Space');await page.waitForTimeout(350);
  expect(await handle.evaluate(e=>e.isConnected&&e===document.activeElement)).toBe(true);
  const final=await planningSnapshot(page);expect(building(final,aerie.id).flightPlan).toBe(2);
  expect(final.game.state.time).toBe(0);expect(final.game.state.gold[0]).toBe(mission.startingGold-250);
  expect(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),K.campaign)).toEqual(progress);
  await press(page,'#coachResume');await expect(page.locator('#time')).not.toHaveText('00:00');
  const running=await pause(page);expect(running.game.state.time).toBeGreaterThan(0);
  await press(page,'#saveExit');await page.reload();await press(page,'#resumeSaved');
  await expect(page.locator('#coachingModal')).toBeHidden();
  const resumed=await pause(page);expect(building(resumed,aerie.id).flightPlan).toBe(2);
  assertPassiveContinuation(running.game,resumed.game);
});

for(const lane of [0,2])test(`edge road ${lane}: only Hold and the adjacent destination are exposed`,async({page})=>{
  const {map}=await planning(page);await paidAerie(page,map,lane);
  const snapshot=await planningSnapshot(page),aerie=snapshot.game.state.buildings.find(b=>b.side===0&&b.type==='aerie');
  await inspect(page,snapshot,aerie.id);
  await expect(page.locator(lane===0?'#flightNorth':'#flightSouth')).toBeHidden();
  await expect(page.locator(lane===0?'#flightSouth':'#flightNorth')).toHaveText('Middle road');
  await press(page,lane===0?'#flightSouth':'#flightNorth');
  const after=await planningSnapshot(page);expect(building(after,aerie.id).flightPlan).toBe(1);
  expect(after.game.state.gold).toEqual(snapshot.game.state.gold);expect(after.game.state.time).toBe(0);
});

for(const choice of ['South','Hold'])test(`authored launched gryphon keeps North while only future launches obey ${choice}`,async({page})=>{
  const fixture=flightFixture({phase:'approach'});await seedFixture(page,fixture);await inspect(page,fixture.envelope,fixture.aerieId);
  await press(page,'#flight'+choice);await expect(page.locator('#flightOrderCurrent')).toContainText(choice==='Hold'?'hold middle road':'shift to south road');
  const changed=await pause(page);
  expect(building(changed,fixture.aerieId).flightPlan).toBe(choice==='Hold'?1:2);
  expect(unit(changed,fixture.unitId).airRoute).toMatchObject({from:1,to:0});
  expect(changed.game.state.gold[0]).toBeCloseTo(170+5*changed.game.state.time,1);
  const nextWave=changed.game.state.time+(1-building(changed,fixture.aerieId).progress)*15+.2;
  await press(page,'#resume');
  await expect.poll(async()=>{
    const time=(await page.locator('#time').textContent()).split(':').map(Number);return time[0]*60+time[1];
  },{timeout:23000}).toBeGreaterThanOrEqual(Math.ceil(nextWave));
  const after=await pause(page),later=after.game.state.units.filter(u=>u.side===0&&u.type==='gryphon'&&u.id!==fixture.unitId);
  expect(later.length).toBeGreaterThan(0);expect(unit(after,fixture.unitId).airRoute.to).toBe(0);
  for(const u of later)if(choice==='Hold')expect(u).not.toHaveProperty('airRoute');else expect(u.airRoute).toMatchObject({from:1,to:2});
  assertPassiveContinuation(changed.game,after.game,{maxSeconds:25});
  expect(after.game.state.stats.built).toEqual(changed.game.state.stats.built);
});

for(const phase of AIR_PHASES)test(`authored ${phase} checkpoint: real save, reload and backup preserve exact route continuation`,async({page})=>{
  const fixture=flightFixture({phase,home:1250});expect(unit(fixture.envelope,fixture.unitId).airRoute.phase).toBe(phase);
  await seedFixture(page,fixture);const first=await pause(page);assertPassiveContinuation(fixture.envelope.game,first.game);
  expect(unit(first,fixture.unitId).airRoute).toMatchObject({from:1,to:0});await airDisclosure(page,first);
  await press(page,'#saveExit');await page.reload();expect(await saved(page)).toEqual(first);
  await openBackup(page);const text=await downloadBackup(page),backup=parseBackup(text);expect(backup.data.battle).toEqual(first);
  await chooseBackup(page,text);await Promise.all([page.waitForEvent('load'),press(page,'#confirmImport')]);
  expect(await saved(page)).toEqual(first);await press(page,'#resumeSaved');await expect(page.locator('#coachingModal')).toBeHidden();
  const restored=await pause(page);assertPassiveContinuation(first.game,restored.game);await airDisclosure(page,restored);
  await page.waitForTimeout(400);expect(await saved(page)).toEqual(restored);
  await press(page,'#resume');await page.waitForTimeout(850);const continued=await pause(page);
  assertPassiveContinuation(restored.game,continued.game);expect(continued.game.state.time).toBeGreaterThan(restored.game.state.time);
  expect(unit(continued,fixture.unitId).airRoute).toMatchObject({from:1,to:0});
});

for(const rulesetId of [...FLIGHT_RULES,...HISTORICAL_FLIGHTLESS_RULES])test(`${rulesetId}: restart and export retain the active identity; old saves never gain controls`,async({page})=>{
  const fixture=flightFixture({rulesetId}),enabled=FLIGHT_RULES.includes(rulesetId);await seedFixture(page,fixture);
  await inspect(page,fixture.envelope,fixture.aerieId);
  if(enabled)await expect(page.locator('#flightOrders')).toBeVisible();else await expect(page.locator('#flightOrders')).toBeHidden();
  const before=await pause(page);assertPassiveContinuation(fixture.envelope.game,before.game);
  if(enabled)await expect(page.locator('#pauseFlights')).toBeVisible();else await expect(page.locator('#pauseFlights')).toBeHidden();
  await press(page,'#help');
  if(!await page.locator('#rosterGuide').evaluate(e=>e.open))await press(page,'#rosterGuideToggle');
  if(enabled)await expect(page.locator('#flightGuide')).toBeVisible();else await expect(page.locator('#flightGuide')).toBeHidden();
  await press(page,'#guideDone');await press(page,'#saveExit');await openBackup(page);
  expect(parseBackup(await downloadBackup(page)).data.battle).toEqual(before);await press(page,'#settingsDone');
  await press(page,'#resumeSaved');await pause(page);const domains=await profileBytes(page);
  await press(page,'#restartBattle');await press(page,'#cancelRestart');expect(await profileBytes(page)).toEqual(domains);
  await press(page,'#restartBattle');await press(page,'#confirmRestart');const restarted=await pause(page);
  expect(restarted.game).toMatchObject({version:3,rulesetId,rulesetRevision:1,mapId:'classic',mapRevision:1});
  expect(restarted.scenario).toEqual(before.scenario);expect(restarted.game.state.buildings.filter(b=>b.type==='aerie')).toHaveLength(0);
  for(const key of [K.campaign,K.history,K.trials])expect((await profileBytes(page))[key]).toBe(domains[key]);
});

for(const revision of [1,2,3])test(`saved Wings revision ${revision} resumes and restarts under its original rules`,async({page})=>{
  const fixture=flightCampaignFixture(revision);await seedFixture(page,fixture);await inspect(page,fixture.envelope,fixture.aerieId);
  if(revision===3)await expect(page.locator('#flightOrders')).toBeVisible();else await expect(page.locator('#flightOrders')).toBeHidden();
  await pause(page);await press(page,'#restartBattle');await press(page,'#confirmRestart');
  // Restart is a deliberate new attempt, so current revision-three teaching may
  // appear. Historical revisions must not acquire the flight lesson or identity.
  if(revision===3){await expect(page.locator('#coachingModal')).toBeVisible();await press(page,'#coachingPlay');}
  else await expect(page.locator('#coachingModal')).toBeHidden();
  const restarted=await pause(page);
  expect(restarted.game.rulesetId??'frontier-legacy').toBe(fixture.envelope.game.rulesetId??'frontier-legacy');
  expect(restarted.scenario??{kind:'campaign',id:restarted.campaignId,revision:1}).toEqual({kind:'campaign',id:'wings-of-ash',revision});
  expect(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),K.campaign)).toEqual(fixture.progress);
});

for(const boundary of ['pause','settings','viewport','Back/Forward'])test(`held real order across ${boundary} never applies on release or implicitly resumes`,async({page,context})=>{
  const fixture=flightFixture();await seedFixture(page,fixture);await inspect(page,fixture.envelope,fixture.aerieId);
  await expectReachable(page,'#flightSouth');const held=await heldPointer(page,context,await center(page,'#flightSouth'));
  try {
    if(boundary==='pause'||boundary==='settings') {
      // Native keyboard activation of another visible control while the pointer
      // is held exercises the real scope boundary without synthetic clicks.
      await page.locator(boundary==='pause'?'#pause':'#settings').focus();await page.keyboard.press('Enter');
      await expect(page.locator(boundary==='pause'?'#pauseVeil':'#settingsModal')).toBeVisible();
    } else if(boundary==='viewport') {
      await page.setViewportSize({width:200,height:230});await expect(page.locator('#viewportModal')).toBeVisible();
    } else {
      await page.evaluate(()=>history.back());await expect(page.locator('#selectionPanel')).toBeHidden();
      await page.evaluate(()=>history.forward());await expect(page.locator('#pauseVeil')).toBeVisible();
    }
    await held.release();
  } finally {await held.dispose();}
  const stopped=await saved(page);expect(building(stopped,fixture.aerieId).flightPlan).toBe(0);
  await page.waitForTimeout(650);expect(await saved(page)).toEqual(stopped);
  if(boundary==='viewport') {
    await page.setViewportSize({width:390,height:650});await expect(page.locator('#viewportResume')).toBeEnabled();
    await page.waitForTimeout(400);expect(await saved(page)).toEqual(stopped);await press(page,'#viewportResume');
  } else if(boundary==='settings') {
    await page.evaluate(()=>history.back());await expect(page.locator('#settingsModal')).toBeHidden();
    await expect(page.locator('#pauseVeil')).toBeVisible();await page.evaluate(()=>history.forward());
    await expect(page.locator('#settingsModal')).toBeVisible();expect(await saved(page)).toEqual(stopped);
    await press(page,'#settingsDone');await press(page,'#resume');
  } else await press(page,'#resume');
  await inspect(page,stopped,fixture.aerieId);await press(page,'#flightSouth');
  const changed=await pause(page);expect(building(changed,fixture.aerieId).flightPlan).toBe(2);
  expect(changed.game.state.stats.built).toEqual(stopped.game.state.stats.built);
  expect(changed.game.state.gold[0]).toBeCloseTo(stopped.game.state.gold[0]+5*(changed.game.state.time-stopped.game.state.time),1);
});

for(const viewport of [{width:320,height:430},{width:667,height:300}])test(`${viewport.width}×${viewport.height}: flight controls scroll into real hit targets without hiding pause or charging twice`,async({page},info)=>{
  await page.setViewportSize(viewport);const {map}=await planning(page);await paidAerie(page,map);
  const before=await planningSnapshot(page),aerie=before.game.state.buildings.find(b=>b.side===0&&b.type==='aerie');await inspect(page,before,aerie.id);
  for(const selector of ['#flightNorth','#flightHold','#flightSouth','#upgrade','#sell','#closeSelection']) {
    await expectReachable(page,selector);
    const rect=await page.locator(selector).boundingBox();expect(rect.width).toBeGreaterThanOrEqual(43.5);expect(rect.height).toBeGreaterThanOrEqual(43.5);
  }
  for(const key of ['North','South','Hold']){await expectReachable(page,'#flight'+key);await press(page,'#flight'+key);await expect(page.locator('#flight'+key)).toHaveAttribute('aria-pressed','true');}
  await test.info().attach(`flight-controls-${viewport.width}-${info.project.name}`,{body:await page.screenshot(),contentType:'image/png'});
  await expectReachable(page,'#closeSelection');await press(page,'#closeSelection');await expect(page.locator('#selectionPanel')).toBeHidden();
  await expectReachable(page,'#pause');await expectReachable(page,'#compactBuild');
  const after=await planningSnapshot(page);expect(after).toEqual(before); // Hold restored, no timer/gold/RNG advance.
});

test('enemy unlaunched plans are private: no selection controls, Air routes entry, warning or rendered route label',async({page})=>{
  await observeCanvas(page);const fixture=flightFixture({side:1});await seedFixture(page,fixture);
  const enemy=building(fixture.envelope,fixture.aerieId),map=Game.restore(fixture.envelope.game).map;
  await tapPoint(page,await pointAt(page,map,enemy));await expect(page.locator('#flightOrders')).toBeHidden();
  const stopped=await pause(page);expect(stopped.game.state.units.filter(u=>u.type==='gryphon')).toHaveLength(0);
  expect(building(stopped,fixture.aerieId).flightPlan).toBe(0);await airDisclosure(page,stopped);
  await expect(page.locator('#flightAlert')).toBeEmpty();
  expect((await canvasFrame(page)).battle.text.map(t=>t.text).join('\n')).not.toMatch(/FOE|NEXT LAUNCH|\bAIR\b|[↑↓] /);
});

test('an enemy committed warning is accessible and Air routes disclosure never resumes battle',async({page})=>{
  const fixture=flightFixture({side:1,phase:'warning',home:1250});await seedFixture(page,fixture);
  await expect(page.locator('#flightAlert')).toHaveAttribute('role','status');await expect(page.locator('#flightAlert')).toHaveAttribute('aria-live','polite');
  await expect(page.locator('#flightAlert')).toContainText('Enemy gryphons are about to cross toward north road');
  const stopped=await pause(page);const rows=await airDisclosure(page,stopped);expect(rows.some(r=>r.side===1&&r.from===1&&r.to===0)).toBe(true);
  await page.keyboard.press('Space');await expect(page.locator('#pauseFlights')).toHaveJSProperty('open',false);
  await page.keyboard.press('Enter');await expect(page.locator('#pauseFlights')).toHaveJSProperty('open',true);
  await page.waitForTimeout(700);expect(await saved(page)).toEqual(stopped);await expect(page.locator('#pauseVeil')).toBeVisible();
});

test('fresh skirmish selection offers only explicit flight identities while retaining ordinary timed/open rules',async({page})=>{
  await page.goto('/');await press(page,'[data-mode="skirmish"]');
  await expect(page.locator('#skirmishRules')).toHaveValue('frontier-flight-open');
  expect(await page.locator('#skirmishRules option').evaluateAll(options=>options.map(o=>o.value))).toEqual(FLIGHT_RULES);
  for(const rulesetId of FLIGHT_RULES){
    await page.locator('#skirmishRules').selectOption(rulesetId);
    await expect(page.locator('#skirmishRulesDescription')).toContainText('aerie flight orders');
    await expect(page.locator('#skirmishRulesDescription')).toContainText(rulesetId.endsWith('timed')?'citadels lose health from 7:00':'citadels never decay with time');
  }
  await press(page,'#start');const started=await pause(page);
  expect(started.game.rulesetId).toBe('frontier-flight-timed');expect(Game.restore(started.game).ruleset.endgame.forcedDecay).toBe(true);
});

test('a newer tab owns its saved flight plan; stale Save and restart cannot overwrite it',async({page,context})=>{
  const fixture=flightFixture();await seedFixture(page,fixture);await pause(page);await press(page,'#restartBattle');
  const other=await context.newPage(),errors=[];other.on('pageerror',error=>errors.push(error.message));
  try {
    await other.goto('/');await press(other,'#resumeSaved');await inspect(other,fixture.envelope,fixture.aerieId);
    await press(other,'#flightSouth');const newest=await pause(other);expect(building(newest,fixture.aerieId).flightPlan).toBe(2);
    const exact=await profileBytes(other);await page.bringToFront();await press(page,'#confirmRestart');
    await expect(page.locator('#restartStatus')).toContainText('checkpoint changed');expect(await profileBytes(page)).toEqual(exact);
    await press(page,'#cancelRestart');await expect(page.locator('#restartBattle')).toBeDisabled();
    await press(page,'#saveExit');await expect(page.locator('#welcome')).toBeVisible();expect(await profileBytes(page)).toEqual(exact);
    await openBackup(page);expect(parseBackup(await downloadBackup(page)).data.battle).toEqual(newest);
  } finally {await other.close();expect(errors).toEqual([]);}
});

test('completed Wings deliberate replay uses current flight rules without restarting automatic teaching',async({page})=>{
  const progress=prerequisiteProgress('wings-of-ash');progress.missions['wings-of-ash']={completed:true,stars:2,bestTime:150};
  const bytes=JSON.stringify(progress);await seedOnce(page,{[K.campaign]:bytes});
  await press(page,'#campaignStoryNav');await press(page,'[data-chapter="highpass"]');await press(page,'[data-mission="wings-of-ash"]');
  await press(page,'#start');await expect(page.locator('#coachingModal')).toBeHidden();
  await expect(page.locator('#time')).not.toHaveText('00:00');const checkpoint=await pause(page);
  expect(checkpoint).toMatchObject({scenario:{kind:'campaign',id:'wings-of-ash',revision:3},game:{rulesetId:'frontier-campaign-flight'}});
  expect(await page.evaluate(key=>localStorage.getItem(key),K.campaign)).toBe(bytes);
});

test('Back and Forward through flight planning Options preserve the paid order and teaching hold',async({page})=>{
  const {map}=await planning(page);await paidAerie(page,map);
  const purchased=await planningSnapshot(page),aerie=purchased.game.state.buildings.find(b=>b.side===0&&b.type==='aerie');
  await inspect(page,purchased,aerie.id);await press(page,'#flightNorth');await press(page,'#settings');
  const stopped=await saved(page);expect(building(stopped,aerie.id).flightPlan).toBe(0);expect(stopped.game.state.time).toBe(0);
  await page.evaluate(()=>history.back());await expect(page.locator('#settingsModal')).toBeHidden();
  await expect(page.locator('#time')).toHaveText('00:00');await page.waitForTimeout(650);expect(await saved(page)).toEqual(stopped);
  await page.evaluate(()=>history.forward());await expect(page.locator('#settingsModal')).toBeVisible();
  await page.waitForTimeout(650);expect(await saved(page)).toEqual(stopped);await expect(page.locator('#time')).toHaveText('00:00');
  await press(page,'#settingsDone');await expect(page.locator('#pauseVeil')).toBeVisible();
  expect(await saved(page)).toEqual(stopped);await press(page,'#resume');
  await expect(page.locator('#time')).not.toHaveText('00:00');const running=await pause(page);
  expect(building(running,aerie.id).flightPlan).toBe(0);assertPassiveContinuation(stopped.game,running.game);
});


test('staggered legal paid launches announce the earliest saved warning, not the latest flyer',async({page})=>{
  const fixture=staggeredFlightFixture();await seedFixture(page,fixture);const stopped=await pause(page);
  assertPassiveContinuation(fixture.envelope.game,stopped.game);
  const warnings=stopped.game.state.units.filter(u=>fixture.unitIds.includes(u.id));
  expect(warnings).toHaveLength(2);expect(warnings.every(u=>u.airRoute.phase==='warning')).toBe(true);
  expect(new Set(warnings.map(u=>u.airRoute.remaining)).size).toBe(2);
  const rows=await airDisclosure(page,stopped);expect(rows).toMatchObject([{side:0,from:0,to:1,phase:'warning',count:2}]);
  expect(rows[0].remaining).toBe(Math.min(...warnings.map(u=>u.airRoute.remaining)));
  await page.waitForTimeout(500);expect(await saved(page)).toEqual(stopped);
});

test('native pause retains an approaching enemy warning, then Resume announces it once',async({page})=>{
  const fixture=flightFixture({side:1,phase:'approach',home:1250});await seedFixture(page,fixture);
  const stopped=await pause(page);expect(unit(stopped,fixture.unitId).airRoute.phase).toBe('approach');
  await expect(page.locator('#flightAlert')).toBeEmpty();
  // Pass-through observation of live-region changes, never an announcement or
  // state injection. This asserts text delivery, not audio quality or a device.
  await page.evaluate(()=>{
    window.__qaFlightAnnouncements=[];
    new MutationObserver(()=>{const text=document.getElementById('flightAlert').textContent;if(text)window.__qaFlightAnnouncements.push(text);})
      .observe(document.getElementById('flightAlert'),{childList:true,subtree:true,characterData:true});
  });
  await page.waitForTimeout(700);expect(await saved(page)).toEqual(stopped);await expect(page.locator('#flightAlert')).toBeEmpty();
  await press(page,'#resume');await expect(page.locator('#flightAlert')).toContainText('Enemy gryphons are about to cross toward north road');
  const announced=await pause(page);expect(unit(announced,fixture.unitId).airRoute).toMatchObject({from:1,to:0});
  await page.waitForTimeout(300);expect(await saved(page)).toEqual(announced);
  await press(page,'#resume');await page.waitForTimeout(350);await pause(page);
  expect(await page.evaluate(()=>window.__qaFlightAnnouncements)).toEqual(['Enemy gryphons are about to cross toward north road. Archers can hit them in the air.']);
});
