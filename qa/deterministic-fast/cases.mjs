// Opt-in counterparts of flight-orders.spec.mjs's classic paid continuation and
// training.spec.mjs's ordinary siege completion. Original real-time gates remain
// authoritative for pacing and lifecycle timing; these files are outside them.
import {expect} from '../browser/node_modules/@playwright/test/index.mjs';
import {writeFile} from 'node:fs/promises';
import {Game,BUILDINGS} from '../../dist/engine.js';
import {BACKUP_STORAGE_KEYS as K} from '../../dist/backup.js';
import {CURRENT_PROFILE_PROTOCOL_VERSION,PROFILE_MARKER_KEY} from '../../dist/profile-session.js';
import {automaticAirFixture} from '../browser/autonomous-air-fixtures.mjs';
import {trainingProfileFixture} from '../browser/training-fixtures.mjs';
import {assertPassiveContinuation} from '../browser/passive-continuation.mjs';
import {seedOnce,saved,observeCanvas,canvasFrame} from '../browser/map-browser-helpers.mjs';
import {test,press,seedTrainingProfile,profileBytes,storageBytes,observeTrainingStorage,expectNoTrainingWrites,gold,uiState} from '../browser/training-browser-helpers.mjs';
import {virtual,hostNow,hostWait,prepareClock,nativeAction,resumeRealTime,replayTo,observeSiege,observerOverhead,assertSiegeOracle} from './helpers.mjs';

const profileKeys=[K.campaign,K.trials,K.settings,K.history];
const persistent=page=>page.evaluate(keys=>Object.fromEntries(keys.map(key=>[key,localStorage.getItem(key)])),profileKeys);
const noManualAirUI=page=>expect(page.locator('#flightOrders,#flightHold,#flightNorth,#flightSouth,#flightOrderCurrent,#flightOrderHelp,#pauseFlights,#pauseFlightList,#flightAlert')).toHaveCount(0);
async function record(info,value){
  const path=info.outputPath('state-evidence.json');await writeFile(path,JSON.stringify(value));
  await info.attach('state-evidence',{path,contentType:'application/json'});
  const {raw,...summary}=value;console.log('DETERMINISTIC '+JSON.stringify({profile:info.project.name,...summary}));
}
// Same native Canvas2D pixel proof as the reference lesson case.
async function renderedField(page){
  expect(await page.locator('#trainingBattle').evaluate(canvas=>{
    const pixels=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data,colors=new Set();
    for(let i=0;i<pixels.length;i+=Math.max(4,Math.floor(pixels.length/16000/4)*4))if(pixels[i+3])colors.add(pixels[i]+','+pixels[i+1]+','+pixels[i+2]);
    return colors.size;
  }),'actual rendered field').toBeGreaterThan(30);
}

test('paid classic flyer continuation: exact saved-state replay',async({page},info)=>{
  const started=hostNow(),fixture=automaticAirFixture('classic'),before=fixture.envelope;
  await observeCanvas(page);await seedOnce(page,{...trainingProfileFixture().values,[K.battle]:JSON.stringify(before)});
  expect(await saved(page)).toEqual(before);await prepareClock(page);
  expect(await saved(page)).toEqual(before);
  expect(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).version,PROFILE_MARKER_KEY)).toBe(CURRENT_PROFILE_PROTOCOL_VERSION);
  await noManualAirUI(page);const bytes=await persistent(page),setupMs=hostNow()-started,playStart=hostNow();
  await nativeAction(page,()=>press(page,'#resumeSaved'));await expect(page.locator('#coachingModal')).toBeHidden();
  await nativeAction(page,()=>press(page,'#front'));
  const seconds=async()=>{const [m,s]=(await page.locator('#time').textContent()).split(':').map(Number);return m*60+s;};
  const target=Math.ceil(before.game.state.time)+5;
  if(virtual){for(let ms=0;ms<16000&&await seconds()<target;ms+=250)await page.clock.runFor(250);}
  else await expect.poll(seconds,{timeout:16000}).toBeGreaterThanOrEqual(target);
  expect(await seconds()).toBeGreaterThanOrEqual(target);
  await nativeAction(page,()=>press(page,'#pause'));await expect(page.locator('#pauseVeil')).toBeVisible();
  const after=await saved(page),gameplayMs=hostNow()-playStart;
  const continuation=assertPassiveContinuation(before.game,after.game,{maxSeconds:12});
  const replay=replayTo(before.game,after.game.tick);
  expect({...before,game:{...replay,accumulator:after.game.accumulator}}).toEqual(after);
  expect(after.game.rulesetId).toMatch(/^frontier-air-local-open$/);
  for(const b of after.game.state.buildings)expect(b).not.toHaveProperty('flightPlan');
  for(const u of after.game.state.units)expect(u).not.toHaveProperty('airRoute');
  const unit=(envelope,id)=>envelope.game.state.units.find(u=>u.id===id),flyer=unit(after,fixture.flyerId),enemy=unit(after,fixture.targetId);
  expect(flyer).toMatchObject({type:'gryphon',side:0,lane:fixture.destination,airTargetId:fixture.targetId});
  expect(Math.abs(flyer.y-Game.restore(before.game).map.lanes[fixture.source])).toBeGreaterThan(100);
  expect(enemy.hp).toBeLessThan(unit(before,fixture.targetId).hp);
  expect(after.game.state.stats.damage[0]).toBeGreaterThan(before.game.state.stats.damage[0]);
  expect(after.game.state.stats.built).toEqual(before.game.state.stats.built);
  for(let side=0;side<2;side++)expect(after.game.state.gold[side]).toBeCloseTo(420-[250,210][side]+5*after.game.state.time,6);
  expect((await canvasFrame(page)).battle.text.map(t=>t.text).join('\n')).not.toMatch(/NEXT LAUNCH|CROSSING|SHIFTING|AIR ROUTE/);
  await noManualAirUI(page);expect(await persistent(page)).toEqual(bytes);
  // Keep the post-pause stability observation in host time with callbacks running.
  await resumeRealTime(page);await hostWait(400);expect(await saved(page)).toEqual(after);
  await record(info,{case:'flyer',mode:virtual?'virtual':'real',setupMs,gameplayMs,totalMs:hostNow()-started,
    continuation,tick:after.game.tick,rng:after.game.seed,raw:{before,after,persistent:bytes}});
});

test('paid ordinary siege lesson: exact game and objective evidence',async({page},info)=>{
  const started=hostNow(),fixture=await seedTrainingProfile(page);await prepareClock(page);
  expect(await profileBytes(page)).toEqual(fixture.values);
  const before=await storageBytes(page),operations=await observeTrainingStorage(page);
  await nativeAction(page,()=>press(page,'#welcomeTraining'));
  await expect(page.locator('#lessonPicker option')).toHaveCount(5);
  await expect(page.locator('#stepTitle')).not.toHaveText('Preparing your lesson…');await page.evaluate(()=>document.fonts.ready);
  await observeSiege(page);
  await nativeAction(page,()=>page.locator('#lessonPicker').selectOption('siege-the-tower'));
  await expect(page.locator('body')).toHaveAttribute('data-step-id','place-foundry');
  await expect(page.locator('body')).toHaveAttribute('data-training-status','instruction');
  await expect(page.locator('#stepPrompt')).toContainText(String(BUILDINGS.foundry.cost));
  expect(await gold(page)).toBe(540);await expect(page.locator('#battleTime')).toHaveText('0:00');
  const type=await page.locator('#buildDeck [data-build]').first().getAttribute('data-build');expect(type).toBe('foundry');
  await nativeAction(page,()=>press(page,'[data-build="foundry"]'));await nativeAction(page,()=>press(page,'[data-site-index="0"]'));
  expect(await gold(page)).toBe(540-BUILDINGS.foundry.cost);await expect(page.locator('#stepKind')).toHaveText('WELL DONE');
  await expect(page.locator('body')).toHaveAttribute('data-training-status','step-complete');
  // Preserve the reference's 250ms instruction hold in host time, with callbacks
  // running. The virtual clock remains paused between these callback-preserving
  // runFor calls; no second pauseAt skips already-scheduled game callbacks.
  if(virtual){const held=hostNow();let advanced=0;while(hostNow()-held<250){await hostWait(16);const elapsed=Math.floor(hostNow()-held);await page.clock.runFor(elapsed-advanced);advanced=elapsed;}}
  else await hostWait(250);
  await expect(page.locator('#battleTime')).toHaveText('0:00');
  await nativeAction(page,()=>press(page,'#continueLesson'));
  await expect(page.locator('body')).toHaveAttribute('data-step-id','watch-siege');
  await expect(page.locator('body')).toHaveAttribute('data-training-status','instruction');
  await expect(page.locator('#continueLesson')).toHaveText('Start observation');await renderedField(page);
  const initial=await page.evaluate(()=>window.__qaSiegeEvidence.last),overheadBefore=await observerOverhead(page);
  const setupMs=hostNow()-started,playStart=hostNow();
  await nativeAction(page,()=>press(page,'#continueLesson'));await expect(page.locator('body')).toHaveAttribute('data-training-status','active');
  if(virtual){for(let ms=0;ms<45000&&await page.locator('body').getAttribute('data-training-status')!=='lesson-complete';ms+=250)await page.clock.runFor(250);}
  await expect(page.locator('#stepKind')).toHaveText('WELL DONE',{timeout:65000});
  await expect(page.locator('#continueLesson')).toHaveText(/Next lesson|Review training/);
  await expect(page.locator('#fieldState')).toContainText('TIME STOPPED');
  await expect(page.locator('body')).toHaveAttribute('data-training-status','lesson-complete');
  await expect(page.locator('#feedback')).toContainText('After taking fire from your siege engines, the marked tower fell.');
  const seconds=await page.locator('#battleTime').evaluate(e=>{const [m,s]=e.textContent.split(':').map(Number);return m*60+s;});
  expect(seconds).toBeGreaterThanOrEqual(31);expect(seconds).toBeLessThanOrEqual(35);
  const gameplayMs=hostNow()-playStart;
  if(!virtual)expect(gameplayMs,'equivalent real-time control preserves the natural wall-time proof').toBeGreaterThanOrEqual(31*900);
  await resumeRealTime(page);const complete=await uiState(page);await hostWait(400);expect(await uiState(page)).toEqual(complete);
  await renderedField(page);await expectNoTrainingWrites(page,operations);expect(await storageBytes(page)).toEqual(before);
  await info.attach('rendered-siege-'+(virtual?'virtual':'real'),{body:await page.screenshot({fullPage:true}),contentType:'image/png'});
  const fetchStart=hostNow();
  const observed=await page.evaluate(()=>{const d=window.__qaSiegeEvidence;return {calls:d.calls,captures:d.captures,last:d.last,updateCalls:d.updateCalls,maxDt:d.maxDt};});
  const readbackMs=hostNow()-fetchStart,overheadAfter=await observerOverhead(page),oracle=assertSiegeOracle(initial,observed);
  expect(observed.maxDt).toBeLessThanOrEqual(.1);
  await press(page,'#continueLesson');await expect(page.locator('#lessonPicker')).toHaveValue('answer-the-air');
  await expect(page.locator('body')).toHaveAttribute('data-training-status','instruction');expect(await gold(page)).toBe(350);
  await expectNoTrainingWrites(page,operations);expect(await storageBytes(page)).toEqual(before);
  await record(info,{case:'siege',mode:virtual?'virtual':'real',setupMs,gameplayMs,totalMs:hostNow()-started,
    ...oracle,observer:{calls:observed.calls,captures:observed.captures.length,readbackMs,overheadBefore,overheadAfter},
    raw:{initial,observed,storageBefore:before,storageAfter:await storageBytes(page)}});
});
