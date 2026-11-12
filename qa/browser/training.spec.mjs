// 0.12 browser gates. Never run locally without the separately authorized runner.
// Persisted profile fixtures and lifecycle-event adapters are explicitly synthetic.
// Natural lesson cases use public UI, real RAF time, engine actions and observations.
import {expect} from '@playwright/test';
import {Game,BUILDINGS} from '../../dist/engine.js';
import {BACKUP_STORAGE_KEYS} from '../../dist/backup.js';
import {dragPoint,tapPoint} from './map-browser-helpers.mjs';
import {TRAINING_PATH,TRAINING_FILES,PROFILE_DOMAINS} from './training-fixtures.mjs';
import {test,press,profileBytes,storageBytes,seedTrainingProfile,observeTrainingStorage,openTraining,selectLesson,gold,uiState,expectNoTrainingWrites,expectReachable,heldPointer,center} from './training-browser-helpers.mjs';

async function lessonIds(page){return page.locator('#lessonPicker option').evaluateAll(options=>options.map(option=>option.value));}
async function chooseIndex(page,index){await selectLesson(page,(await lessonIds(page))[index]);}
async function continueStep(page){await expect(page.locator('#continueLesson')).toBeVisible();await press(page,'#continueLesson');}
async function firstBuild(page){
  const button=page.locator('#buildDeck [data-build]').first();
  const type=await button.getAttribute('data-build'),before=await gold(page);
  await press(page,'[data-build="'+type+'"]');await press(page,'[data-site-index="0"]');
  expect(await gold(page)).toBe(before-BUILDINGS[type].cost);
  await expect(page.locator('#stepKind')).toHaveText('WELL DONE');
}
async function startFirstObservation(page){await firstBuild(page);await continueStep(page);await continueStep(page);await expect(page.locator('#fieldState')).toContainText('TIME RUNNING');}
async function completedObservation(page,{last=true,timeout=65000}={}){
  await expect(page.locator('#stepKind')).toHaveText('WELL DONE',{timeout});
  await expect(page.locator('#continueLesson')).toHaveText(last?/Next lesson|Review training/:'Continue');
  await expect(page.locator('#fieldState')).toContainText('TIME STOPPED');
}
async function expectObservationFeedback(page,paused){
  const feedback=page.locator('#feedback');
  if(paused){
    await expect(feedback).toContainText(/paused/i);
    await expect(feedback).toContainText(/resume/i);
    await expect(feedback).not.toContainText(/running at normal speed/i);
  }else{
    await expect(feedback).toContainText(/running at normal speed/i);
    await expect(feedback).not.toContainText(/paused|resume when ready/i);
  }
}
async function renderedField(page){
  expect(await page.locator('#trainingBattle').evaluate(canvas=>{
    const context=canvas.getContext('2d'),pixels=context.getImageData(0,0,canvas.width,canvas.height).data,colors=new Set();
    for(let i=0;i<pixels.length;i+=Math.max(4,Math.floor(pixels.length/16000/4)*4))if(pixels[i+3])colors.add(pixels[i]+','+pixels[i+1]+','+pixels[i+2]);
    return colors.size;
  }),'actual canvas contains a rendered field, not a blank placeholder').toBeGreaterThan(30);
}
async function expectMapWithAction(page,selector){
  // No scroll or click inside this assertion: the ordinary selection/scroll
  // immediately before it must already leave both targets usable together.
  // Let the real UI's scheduled sticky-position correction settle first.
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const before=await page.evaluate(()=>({x:scrollX,y:scrollY}));
  for(const target of ['#trainingBattle',selector]){
    const element=page.locator(target);await expect(element).toBeInViewport({ratio:1});
    expect(await element.evaluate(node=>{
      const r=node.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);
      return !!hit&&(node===hit||node.contains(hit));
    }),target+' remains genuinely hit-testable beside the sticky portrait battlefield').toBe(true);
  }
  expect(await page.evaluate(()=>({x:scrollX,y:scrollY}))).toEqual(before);
}
async function trainingReady(page){await expect(page.locator('#lessonPicker option')).toHaveCount(5);await expect(page.locator('#stepTitle')).not.toHaveText('Preparing your lesson…');}

// A real control can be partly exposed at the bottom of a scrolling phone.
// These are native pointer events, not DOM click(), focus() or state adapters.
async function tapVisibleBottomEdge(page,selector){
  const control=page.locator(selector);await expect(control).toBeVisible();await expect(control).toBeEnabled();
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const point=await control.evaluate(target=>{
    window.scrollBy(0,target.getBoundingClientRect().top-(innerHeight-6));
    const rect=target.getBoundingClientRect(),point={x:rect.left+rect.width/2,y:innerHeight-3};
    const hit=document.elementFromPoint(point.x,point.y);
    if(rect.top>=point.y||rect.bottom<=point.y||!hit||!(hit===target||target.contains(hit)))throw new Error('Ordinary bottom-edge scroll did not expose the intended native tap target.');
    window.__qaCoachTapTarget=target;window.__qaCoachTapEvents=[];
    return point;
  });
  await expect(page.locator('#trainingBattle')).toBeInViewport({ratio:1});
  await tapPoint(page,point); // Exactly one independent native activation.
  const events=await page.evaluate(()=>window.__qaCoachTapEvents);
  const down=events.find(event=>event.type==='pointerdown'),clicks=events.filter(event=>event.type==='click');
  expect(down?.hitsTarget,'native pointerdown hits the exposed real control').toBe(true);
  expect(clicks,'the first tap produces one native click, without retry').toHaveLength(1);
  expect(clicks[0].hitsTarget,'focus cannot retarget the native click to the coach background').toBe(true);
  for(const event of events.slice(0,events.findIndex(event=>event.type==='click')+1))
    expect(event.scrollY,'no custom focus scroll before click capture: '+event.type).toBe(down.scrollY);
}

for(const width of [320,390])test('first native bottom-edge taps preserve training controls at '+width+'px',async({page})=>{
  await page.setViewportSize({width,height:width===320?568:650});
  await page.addInitScript(()=>{
    window.__qaCoachTapEvents=[];
    for(const type of ['pointerdown','mousedown','focusin','mouseup','click'])document.addEventListener(type,event=>{
      const target=window.__qaCoachTapTarget;
      if(target)window.__qaCoachTapEvents.push({type,scrollY,hitsTarget:target===event.target||target.contains(event.target)});
    },{capture:true,passive:true});
  });
  await openTraining(page);await selectLesson(page,'siege-the-tower');
  const initial=await gold(page);
  await tapVisibleBottomEdge(page,'[data-build="foundry"]');
  await expect(page.locator('[data-build="foundry"]')).toHaveAttribute('aria-pressed','true');
  expect(await gold(page)).toBe(initial);await expectMapWithAction(page,'[data-build="foundry"]');
  await tapVisibleBottomEdge(page,'[data-site-index="0"]');
  expect(await gold(page)).toBe(initial-BUILDINGS.foundry.cost);
  await expect(page.locator('#stepKind')).toHaveText('WELL DONE');
  await tapVisibleBottomEdge(page,'#continueLesson');
  await expect(page.locator('#continueLesson')).toHaveText('Start observation');
  await expect(page.locator('#stepTitle')).toBeFocused();
  await tapVisibleBottomEdge(page,'#continueLesson');
  await expect(page.locator('#fieldState')).toContainText('TIME RUNNING');
  await tapVisibleBottomEdge(page,'#pauseLesson');await expectObservationFeedback(page,true);
  await expectMapWithAction(page,'#pauseLesson');
  await tapVisibleBottomEdge(page,'#pauseLesson');await expectObservationFeedback(page,false);
  await tapVisibleBottomEdge(page,'#restartLesson');
  await expect(page.locator('body')).toHaveAttribute('data-training-status','instruction');
  expect(await gold(page)).toBe(initial);await expect(page.locator('#stepTitle')).toBeFocused();
  await tapVisibleBottomEdge(page,'#skipLesson');
  await expect(page.locator('#lessonPicker')).toHaveValue('answer-the-air');
  expect(await gold(page)).toBe(350);await expect(page.locator('#stepTitle')).toBeFocused();
});

// The genuine saved battle is deliberately independent from every lesson. Its
// synthetic origin is not evidence of a played match or a completed lesson.
test('title entry and return preserve all five exact profile domains including active battle',async({page})=>{
  const fixture=await seedTrainingProfile(page),before=await storageBytes(page),operations=await observeTrainingStorage(page);
  await expect(page.locator('#welcomeTraining')).toHaveAttribute('href','./training.html');
  await expect(page.locator('#welcomeTraining')).toContainText('Guided practice');
  await press(page,'#welcomeTraining');await trainingReady(page);
  await expect(page).toHaveURL(/\/training\.html$/);await expect(page.locator('#start')).toHaveCount(0);
  expect(await profileBytes(page)).toEqual(fixture.values);
  await expectNoTrainingWrites(page,operations);
  await press(page,'#returnGame');await expect(page.locator('#welcome')).toBeVisible();
  await expect(page.locator('#resumeSaved')).toBeVisible();
  expect(await storageBytes(page)).toEqual(before);expect(operations).toEqual([]);
  for(const key of PROFILE_DOMAINS)expect((await profileBytes(page))[key]).toBe(fixture.values[key]);
  const original=JSON.parse(fixture.values[BACKUP_STORAGE_KEYS.battle]);
  await press(page,'#resumeSaved');await press(page,'#pause');
  const resumed=JSON.parse((await profileBytes(page))[BACKUP_STORAGE_KEYS.battle]);
  expect(Game.restore(resumed.game).map.id).toBe('twin-span');
  expect(resumed.game.state.time).toBeGreaterThanOrEqual(original.game.state.time);
  expect(resumed.game.state.buildings.map(b=>[b.type,b.side,b.x,b.y,b.level])).toEqual(original.game.state.buildings.map(b=>[b.type,b.side,b.x,b.y,b.level]));
});

// Natural lesson flow cases are filled from the fixed authored UI contract,
// rather than completing a seeded state or calling a live session method.

for(const viewport of [{width:320,height:568},{width:844,height:390}])test('initial '+viewport.width+'px training layout keeps every primary control reachable with ordinary page scrolling',async({page},testInfo)=>{
  await page.setViewportSize(viewport);await openTraining(page);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width+1);
  for(const selector of ['#returnGame','#lessonPicker','#restartLesson','#skipLesson','#homeCamera','#frontCamera'])await expectReachable(page,selector);
  for(const selector of ['#trainingBattle','#trainingMinimap']){
    const box=await page.locator(selector).boundingBox();expect(box.width).toBeGreaterThan(60);expect(box.height).toBeGreaterThan(30);
  }
  await page.evaluate(()=>scrollTo(0,0));
  await testInfo.attach('training-initial-'+viewport.width,{body:await page.screenshot({fullPage:true}),contentType:'image/png'});
  await press(page,'#buildDeck button');
  if(viewport.width===320)await expectMapWithAction(page,'#buildDeck [aria-pressed="true"]');
  for(const selector of await page.locator('#buildDeck button:not(:disabled),#siteActions button:not(:disabled)').evaluateAll(nodes=>nodes.map(node=>node.dataset.build?'[data-build="'+node.dataset.build+'"]':'[data-site-index="'+node.dataset.siteIndex+'"]'))){
    await expectReachable(page,selector);
    if(viewport.width===320)await expectMapWithAction(page,selector);
  }
  await press(page,'[data-site-index="0"]');await expectReachable(page,'#continueLesson');await continueStep(page);await expectReachable(page,'#continueLesson');
});

for(const blocked of [false,true])test((blocked?'blocked local and session storage':'empty first-visit storage')+' supports practice without even attempting a profile write',async({page})=>{
  const operations=await observeTrainingStorage(page,{blocked});await openTraining(page);
  const initial=await uiState(page);
  await press(page,'#restartLesson');await expect(page.locator('#stepTitle')).toHaveText(initial.stepTitle);
  await press(page,'#skipLesson');await expect(page.locator('#lessonPicker')).not.toHaveValue(initial.lessonPicker);
  await chooseIndex(page,4);await chooseIndex(page,0);await firstBuild(page);
  await expectNoTrainingWrites(page,operations);
  if(!blocked)expect(await storageBytes(page)).toEqual({localStorage:{},sessionStorage:{}});
  await page.reload();await trainingReady(page);await expectNoTrainingWrites(page,operations);
  if(!blocked)expect(await storageBytes(page)).toEqual({localStorage:{},sessionStorage:{}});
});

test('offline direct training navigation loads the actual separate lesson shell and returns to the normal game',async({page,context})=>{
  test.setTimeout(45000);
  await seedTrainingProfile(page);const before=await storageBytes(page),operations=await observeTrainingStorage(page);
  await page.evaluate(()=>navigator.serviceWorker.register('/service-worker.js',{scope:'/'}));
  await expect.poll(()=>page.evaluate(()=>navigator.serviceWorker.controller?.state),{timeout:15000}).toBe('activated');
  const fromWorker=new Set();page.on('response',response=>{if(response.fromServiceWorker())fromWorker.add(new URL(response.url()).pathname);});
  try{
    await context.setOffline(true);
    const response=await page.goto(TRAINING_PATH+'?offline-route=1',{waitUntil:'load'});expect(response?.fromServiceWorker()).toBe(true);
    await trainingReady(page);await expect(page).toHaveTitle('Guided practice · Ironroot Frontier');
    await expect(page.locator('#welcome,#start')).toHaveCount(0);
    for(const file of [...TRAINING_FILES,'engine.js','render.js'])await expect.poll(()=>fromWorker.has('/'+file)).toBe(true);
    await firstBuild(page);await expectNoTrainingWrites(page,operations);
    const reloaded=await page.reload();expect(reloaded?.fromServiceWorker()).toBe(true);await trainingReady(page);
    await press(page,'#returnGame');await expect(page.locator('#welcome')).toBeVisible();await expect(page.locator('#resumeSaved')).toBeVisible();
    expect(await storageBytes(page)).toEqual(before);expect(operations).toEqual([]);
  }finally{await context.setOffline(false);}
});

test('repeated interrupted navigation retry and lesson jumps never award or mutate a retained profile',async({page})=>{
  test.setTimeout(45000);
  await seedTrainingProfile(page);const before=await storageBytes(page),operations=await observeTrainingStorage(page);
  for(let repeat=0;repeat<3;repeat++){
    await press(page,'#welcomeTraining');await trainingReady(page);await firstBuild(page);
    await press(page,'#restartLesson');await press(page,'#skipLesson');await chooseIndex(page,4);await chooseIndex(page,0);
    await expectNoTrainingWrites(page,operations);
    await page.reload();await trainingReady(page);
    await press(page,'#returnGame');await expect(page.locator('#welcome')).toBeVisible();
    expect(await storageBytes(page)).toEqual(before);
    await page.goBack();await trainingReady(page);await page.goForward();await expect(page.locator('#welcome')).toBeVisible();
    expect(await storageBytes(page)).toEqual(before);expect(operations).toEqual([]);
  }
});

const LESSON_CASES=[
  {id:'first-barracks',type:'barracks',start:280,step:'place-barracks',watch:'watch-spawn',minimum:1,maximum:3,proof:/Your barracks has trained its first warrior, who will march toward enemy buildings on its own\./i},
  {id:'shield-and-arrow',type:'archery',start:350,step:'place-support',watch:'watch-screen',minimum:8,maximum:11,proof:/Your archers fired with a warrior still ahead of them, and enemy arrows hit your warriors\./i},
  {id:'mine-and-upgrade',type:'mint',start:330,step:'place-mine',watch:'watch-income',minimum:4,maximum:6,proof:/The upgrade cost gold but no extra building site, raising your observed income to 8\.75 gold per second\./i},
  {id:'siege-the-tower',type:'foundry',start:540,step:'place-foundry',watch:'watch-siege',minimum:31,maximum:35,proof:/After taking fire from your siege engines, the marked tower fell\./i},
  {id:'answer-the-air',type:'archery',start:350,step:'place-anti-air',watch:'watch-anti-air',minimum:14,maximum:17,proof:/Your archers hit the marked gryphon before it fell, doing what warriors and siege engines cannot: attack flyers\./i},
];
for(const lesson of LESSON_CASES)test('ordinary unmodified '+lesson.id+' lesson pays actual costs and completes its normal-time observation',async({page},testInfo)=>{
  test.setTimeout(90000);
  await seedTrainingProfile(page);const before=await storageBytes(page),operations=await observeTrainingStorage(page);
  await openTraining(page);await selectLesson(page,lesson.id);
  await expect(page.locator('body')).toHaveAttribute('data-step-id',lesson.step);
  await expect(page.locator('body')).toHaveAttribute('data-training-status','instruction');
  await expect(page.locator('#stepPrompt')).toContainText(String(BUILDINGS[lesson.type].cost));
  expect(await gold(page)).toBe(lesson.start);await expect(page.locator('#battleTime')).toHaveText('0:00');
  await firstBuild(page);await expect(page.locator('body')).toHaveAttribute('data-training-status','step-complete');
  await page.waitForTimeout(250);await expect(page.locator('#battleTime')).toHaveText('0:00');
  await continueStep(page);
  await expect(page.locator('body')).toHaveAttribute('data-step-id',lesson.watch);
  await expect(page.locator('body')).toHaveAttribute('data-training-status','instruction');
  await expect(page.locator('#continueLesson')).toHaveText('Start observation');
  await renderedField(page);
  const started=Date.now();await continueStep(page);
  await expect(page.locator('body')).toHaveAttribute('data-training-status','active');
  if(lesson.id==='mine-and-upgrade'){
    await completedObservation(page,{last:false});await expect(page.locator('#income')).toHaveText('+7.5/s');
    expect(await gold(page)).toBeGreaterThanOrEqual(155);
    await continueStep(page);await expect(page.locator('body')).toHaveAttribute('data-step-id','upgrade-mine');
    await press(page,'#buildingActions [data-building-id]');await expect(page.locator('#selectionName')).toContainText('Level 1');
    await expect(page.locator('#upgradeBuilding')).toHaveText('Upgrade · 133 gold');
    const goldBefore=await gold(page),timeBefore=await page.locator('#battleTime').textContent();
    await press(page,'#upgradeBuilding');expect(await gold(page)).toBe(goldBefore-133);
    await expect(page.locator('#battleTime')).toHaveText(timeBefore);
    await expect(page.locator('#feedback')).toHaveText('The paid upgrade gives your level-2 mine more health and income.');
    await continueStep(page);await expect(page.locator('body')).toHaveAttribute('data-step-id','watch-upgraded-income');
    await continueStep(page);
  }
  await completedObservation(page);
  await expect(page.locator('body')).toHaveAttribute('data-training-status','lesson-complete');
  await expect(page.locator('#feedback')).toContainText(lesson.proof);
  const seconds=await page.locator('#battleTime').evaluate(element=>{const [minutes,seconds]=element.textContent.split(':').map(Number);return minutes*60+seconds;});
  expect(seconds).toBeGreaterThanOrEqual(lesson.minimum);expect(seconds).toBeLessThanOrEqual(lesson.maximum);
  expect(Date.now()-started,'normal 1x lesson cannot complete using a fast-forwarded or seeded result').toBeGreaterThanOrEqual(lesson.minimum*900);
  if(lesson.id==='mine-and-upgrade')await expect(page.locator('#income')).toHaveText('+8.75/s');
  const complete=await uiState(page);await page.waitForTimeout(400);expect(await uiState(page)).toEqual(complete);
  await renderedField(page);await expectNoTrainingWrites(page,operations);expect(await storageBytes(page)).toEqual(before);
  await testInfo.attach('natural-'+lesson.id,{body:await page.screenshot({fullPage:true}),contentType:'image/png'});
  await continueStep(page);const index=LESSON_CASES.findIndex(item=>item.id===lesson.id);
  if(index===LESSON_CASES.length-1){
    await expect(page.locator('body')).toHaveAttribute('data-training-status','finished');
    await expect(page.locator('#lessonSubtitle')).toContainText('1 completed');
    await expect(page.locator('#reviewResults')).toContainText('not attempted');
  }else{
    await expect(page.locator('#lessonPicker')).toHaveValue(LESSON_CASES[index+1].id);
    await expect(page.locator('body')).toHaveAttribute('data-training-status','instruction');
    expect(await gold(page)).toBe(LESSON_CASES[index+1].start);
  }
  await expectNoTrainingWrites(page,operations);expect(await storageBytes(page)).toEqual(before);
  testInfo.annotations.push({type:'coverage',description:'Unmodified runtime, ordinary controls, actual rendered field and real-time completion. DOM feedback is paired with independent Node causality tests; no independent browser-level combat attribution, seeded completion, time patch or private state hook is claimed.'});
});

test('unavailable action cancel off-site tap and greater-than-eight-pixel drag never spend practice gold',async({page,context})=>{
  await openTraining(page);const initial=await gold(page);
  await page.locator('#trainingBattle').focus();await page.keyboard.press('Digit2');
  await expect(page.locator('#feedback')).toContainText('not available');expect(await gold(page)).toBe(initial);
  await press(page,'[data-build="barracks"]');await expect(page.locator('[data-build="barracks"]')).toHaveAttribute('aria-pressed','true');
  await press(page,'#cancelChoice');await expect(page.locator('[data-site-index="0"]')).toBeDisabled();expect(await gold(page)).toBe(initial);
  await press(page,'[data-build="barracks"]');
  await page.locator('#trainingBattle').scrollIntoViewIfNeeded();const point=await center(page,'#trainingBattle');
  await dragPoint(page,context,point);expect(await gold(page)).toBe(initial);
  await expect(page.locator('body')).toHaveAttribute('data-step-id','place-barracks');
  const field=await page.locator('#trainingBattle').boundingBox();
  await tapPoint(page,{x:field.x+field.width/2,y:field.y+5});
  await expect(page.locator('#feedback')).toContainText(/outside your frontier|marked practice site/);expect(await gold(page)).toBe(initial);
  await page.keyboard.press('Escape');await expect(page.locator('#cancelChoice')).toBeDisabled();
  await firstBuild(page);expect(await gold(page)).toBe(initial-BUILDINGS.barracks.cost);
});

test('explicit pause blur and hidden lifecycle interruptions freeze observation until an explicit resume',async({page},testInfo)=>{
  test.setTimeout(90000);await openTraining(page);await selectLesson(page,'siege-the-tower');await startFirstObservation(page);await expectObservationFeedback(page,false);
  await expect(page.locator('#battleTime')).not.toHaveText('0:00');
  await press(page,'#pauseLesson');await expect(page.locator('#pauseLesson')).toHaveText('Resume observation');
  await expectObservationFeedback(page,true);
  const paused=await uiState(page);await page.waitForTimeout(650);expect(await uiState(page)).toEqual(paused);
  await press(page,'#pauseLesson');await expect(page.locator('#fieldState')).toContainText('TIME RUNNING');await expectObservationFeedback(page,false);
  // Explicitly synthetic lifecycle-event adapters, not a claim of OS-level
  // backgrounding. They run the real installed lifecycle listeners.
  await page.evaluate(()=>window.dispatchEvent(new Event('blur')));
  await expect(page.locator('body')).toHaveAttribute('data-training-paused','true');
  await expectObservationFeedback(page,true);
  const blurred=await uiState(page);await page.waitForTimeout(650);expect(await uiState(page)).toEqual(blurred);
  await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await page.waitForTimeout(300);expect(await uiState(page)).toEqual(blurred);
  await press(page,'#pauseLesson');await expectObservationFeedback(page,false);
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
  await expect(page.locator('#pauseLesson')).toHaveText('Resume observation');await expectObservationFeedback(page,true);const hidden=await uiState(page);
  await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});
  await page.waitForTimeout(650);expect(await uiState(page)).toEqual(hidden);
  await press(page,'#pauseLesson');await expectObservationFeedback(page,false);await completedObservation(page);
  testInfo.annotations.push({type:'synthetic-adapter',description:'blur/focus/hidden/visible lifecycle events are controlled test adapters. Explicit pause/resume and all simulation time remain real.'});
});

test('keyboard can choose place pause navigate and reach every practice control without focus loss',async({page})=>{
  await openTraining(page);await page.locator('#trainingBattle').focus();await page.keyboard.press('Digit1');
  await expect(page.locator('[data-build="barracks"]')).toHaveAttribute('aria-pressed','true');
  const before=await gold(page);await page.locator('[data-site-index="0"]').focus();await page.keyboard.press('Space');
  expect(await gold(page)).toBe(before-BUILDINGS.barracks.cost);await expect(page.locator('#continueLesson')).toHaveText('Continue');
  await expect(page.locator('#continueLesson')).toBeFocused();await page.keyboard.press('Enter');
  await expect(page.locator('#stepTitle')).toBeFocused();await expect(page.locator('#continueLesson')).toHaveText('Start observation');
  await page.keyboard.press('Tab');await expect(page.locator('#continueLesson')).toBeFocused();await page.keyboard.press('Space');await expect(page.locator('#stepTitle')).toBeFocused();
  await expect(page.locator('#fieldState')).toContainText('TIME RUNNING');
  await page.keyboard.press('Space');await expect(page.locator('#pauseLesson')).toHaveText('Resume observation');await expectObservationFeedback(page,true);
  await page.keyboard.press('Space');await expectObservationFeedback(page,false);await completedObservation(page,{timeout:10000});
  const required=['returnGame','lessonPicker','continueLesson','restartLesson','skipLesson','homeCamera','frontCamera','trainingMinimap','trainingBattle'];
  const seen=new Set();await page.locator('#returnGame').focus();
  for(let i=0;i<30&&!required.every(id=>seen.has(id));i++){
    const focus=await page.evaluate(()=>({id:document.activeElement.id,tag:document.activeElement.tagName}));seen.add(focus.id);
    expect(focus.tag,'Tab always reaches an actual focusable control').not.toBe('BODY');await page.keyboard.press('Tab');
  }
  for(const id of required)expect(seen.has(id),id+' reachable with Tab').toBe(true);
  await page.locator('#lessonPicker').focus();await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');
  await expect(page.locator('#lessonPicker')).toHaveValue('shield-and-arrow');await expect(page.locator('#stepTitle')).toBeFocused();
});

test('retry jump and skip produce an honest temporary review without completions or profile rewards',async({page})=>{
  await seedTrainingProfile(page);const before=await storageBytes(page),operations=await observeTrainingStorage(page);
  await openTraining(page);await firstBuild(page);await press(page,'#restartLesson');
  await expect(page.locator('body')).toHaveAttribute('data-training-status','instruction');expect(await gold(page)).toBe(280);
  await selectLesson(page,'answer-the-air');await press(page,'#skipLesson');
  await expect(page.locator('body')).toHaveAttribute('data-training-status','finished');
  await expect(page.locator('#lessonSubtitle')).toContainText('0 completed');
  await expect(page.locator('#reviewResults')).toContainText('not attempted');
  await expect(page.locator('#reviewResults')).toContainText(/skipped/i);
  await expect(page.locator('#stepPrompt')).toHaveText('These results cover this practice session. Skipped lessons do not count as completed. Choose a lesson to replay, or return to your game. No rewards or progress were saved.');
  for(const id of await lessonIds(page)){await selectLesson(page,id);await press(page,'#skipLesson');}
  await expect(page.locator('#lessonSubtitle')).toContainText('0 completed');
  await expect(page.locator('#lessonSubtitle')).toContainText('5 skipped');
  await expect(page.locator('#skipLesson')).toBeDisabled();
  await expectNoTrainingWrites(page,operations);expect(await storageBytes(page)).toEqual(before);
  await press(page,'#restartLesson');await expect(page.locator('body')).toHaveAttribute('data-training-status','instruction');
  await expect(page.locator('#reviewResults')).toBeHidden();
});

for(const lesson of [{id:'mine-and-upgrade',status:'step-complete',timeout:10000},{id:'shield-and-arrow',status:'lesson-complete',timeout:20000}])test('old held pointer across natural '+lesson.status+' cannot leave or retry the newer step and fresh input works',async({page,context},testInfo)=>{
  test.setTimeout(65000);await openTraining(page);
  const touch=await page.evaluate(()=>navigator.maxTouchPoints>0);
  // The small-screen session footer moves when completion feedback grows.
  // Touch therefore uses the stable Return link; mouse uses the same real
  // Restart button and moves to its newly verified position before release.
  // Touch motion is not used to manufacture a browser-cancelled tap.
  const selector=touch?'#returnGame':'#restartLesson';
  for(const immediate of [false,true]){
    await selectLesson(page,lesson.id);await firstBuild(page);await continueStep(page);await continueStep(page);
    await page.locator(selector).scrollIntoViewIfNeeded();const point=await center(page,selector);
    expect(await page.evaluate(({point,id})=>document.elementFromPoint(point.x,point.y)?.closest('button,a')?.id===id,{point,id:selector.slice(1)})).toBe(true);
    const held=await heldPointer(page,context,point);
    try{
      await expect(page.locator('body')).toHaveAttribute('data-training-status',lesson.status,{timeout:lesson.timeout});
      if(!touch)await page.locator(selector).scrollIntoViewIfNeeded();
      const releasePoint=touch?point:await center(page,selector);
      expect(await page.evaluate(({point,id})=>document.elementFromPoint(point.x,point.y)?.closest('button,a')?.id===id,{point:releasePoint,id:selector.slice(1)}),'release must genuinely hit the still-live Return/Retry control').toBe(true);
      if(!touch)await page.mouse.move(releasePoint.x,releasePoint.y);
      const complete=await uiState(page);await held.release();
      if(!immediate){await page.waitForTimeout(350);expect(await uiState(page)).toEqual(complete);await expect(page).toHaveURL(/\/training\.html$/);}
      // Second run deliberately places no observation/debounce delay between
      // the stale release and an independent press of the current Retry.
      await press(page,'#restartLesson');await expect(page.locator('body')).toHaveAttribute('data-training-status','instruction');
      expect(await gold(page)).toBe(lesson.id==='mine-and-upgrade'?330:350);
    }finally{await held.dispose();}
  }
  // Space starts and ends on the same unchanged Retry DOM button, but spans a
  // lesson generation. A new choice makes a stray retry observable.
  await page.locator('#restartLesson').focus();await page.keyboard.down('Space');
  await selectLesson(page,'first-barracks');await press(page,'[data-build="barracks"]');
  await page.locator('#restartLesson').evaluate(element=>element.focus({preventScroll:true}));
  await page.keyboard.up('Space');
  await expect(page.locator('[data-build="barracks"]')).toHaveAttribute('aria-pressed','true');
  expect(await gold(page)).toBe(280);
  await press(page,'#restartLesson');await expect(page.locator('[data-build="barracks"]')).toHaveAttribute('aria-pressed','false');
  await expect(page.locator('#stepTitle')).toBeFocused();
  testInfo.annotations.push({type:'gesture',description:(touch?'Native stationary touch over stable Return link':'Native mouse held on real Restart, released over its verified new center')+' through natural '+lesson.status+'; stale release rejected with delayed and immediate fresh recovery. Held Space starts/ends on same Retry button across lesson generation.'});
});
