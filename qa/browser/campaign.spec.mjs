import {startRunning as startCampaignRunning} from './campaign-teaching-helpers.mjs';
import { prepareBuildControl, openBuildControls } from './shared-build-controls.mjs';
import {test as base, expect} from '@playwright/test';
import {Game, LANES} from '../../dist/engine.js';
import {CAMPAIGN_STORAGE_KEY,createCampaignMission} from '../../dist/campaign.js';
import {campaignFixture} from './campaign-fixtures.mjs';
import {progressionProfile} from './campaign-progression-fixtures.mjs';

const SAVE='ironroot.battle.v1', HISTORY='ironroot.history.v1';
const test = base.extend({page:async ({page},use)=>{
  const errors=[]; page.on('pageerror',error=>errors.push(error.message));
  await use(page); expect(errors,'uncaught browser errors').toEqual([]);
}});
async function startRunning(page) {
  await startCampaignRunning(page,press);
}
async function press(page,selector) {
  if (await prepareBuildControl(page, selector)) return;
  const control=page.locator(selector);
  if (await page.evaluate(()=>navigator.maxTouchPoints>0)) await control.tap();
  else await control.click();
}
async function openCampaign(page,{legacy=false}={}) {
  // Declared earned-opening profile fixture for fresh main-campaign UI tests.
  // The explicit legacy option retains the version-two envelope regression.
  await page.goto('/');
  const progress=progressionProfile(3),battle=legacy?{format:'ironroot-save',version:2,challengeId:null,campaignId:'emberwatch',game:createCampaignMission('emberwatch').serialize()}:null;
  await page.evaluate(({progress,battle,key,save})=>{localStorage.setItem(key,JSON.stringify(progress));if(battle)localStorage.setItem(save,JSON.stringify(battle));},{progress,battle,key:CAMPAIGN_STORAGE_KEY,save:SAVE});
  await page.reload(); await press(page,'[data-mode="campaign"]'); await press(page,'#campaignStoryNav'); await press(page,'[data-chapter="embers"]'); await press(page,'[data-mission="emberwatch"]');
  await expect(page.locator('#campaignConfig')).toBeVisible();
}
async function chooseMission(page,id) {
  await press(page,'#campaignChapterNav'); await press(page,'[data-mission="'+id+'"]');
}
async function snapshot(page) {
  return page.evaluate(key=>JSON.parse(localStorage.getItem(key)),SAVE);
}
async function pause(page) {
  if (await page.locator('#coachingModal').isVisible()) await press(page,'#coachingPlay');
  await press(page,'#pause'); await expect(page.locator('#pauseVeil')).toBeVisible();
  return snapshot(page);
}
async function seed(page,kind) {
  const fixture=campaignFixture(kind);
  await page.addInitScript(({fixture,save,progress})=>{
    localStorage.setItem(save,JSON.stringify(fixture.envelope));
    localStorage.setItem(progress,JSON.stringify(fixture.progress));
  },{fixture,save:SAVE,progress:CAMPAIGN_STORAGE_KEY});
  await page.goto('/'); await expect(page.locator('#resumeSaved')).toContainText('RESUME MISSION');
  await press(page,'#resumeSaved');
  return fixture;
}
async function worldPoint(page,x,y) {
  await press(page,'#home');
  const rect=await page.locator('#battle').boundingBox();
  const scale=Math.max(.32,rect.height/900),half=rect.width/(2*scale);
  const camera=half>=1600?1600:Math.max(half,450);
  return {x:rect.x+rect.width/2+(x-camera)*scale,y:rect.y+rect.height/2+(y-450)*scale};
}
async function tapPoint(page,p) {
  if (await page.evaluate(()=>navigator.maxTouchPoints>0)) await page.touchscreen.tap(p.x,p.y);
  else await page.mouse.click(p.x,p.y);
}

test('campaign locked mission cannot launch and an unlocked mission can',async ({page})=>{
  await openCampaign(page); await chooseMission(page,'three-roads');
  await expect(page.locator('#campaignMissionTitle')).toHaveText('Three Roads');
  await expect(page.locator('#campaignUnlock')).toContainText('Complete Emberwatch');
  await expect(page.locator('#start')).toBeDisabled();
  await expect(page.locator('#start')).toContainText('MISSION LOCKED');
  await page.keyboard.press('Enter'); await expect(page.locator('#welcome')).toBeVisible();
  expect(await snapshot(page)).toBeNull();
  await chooseMission(page,'emberwatch'); await expect(page.locator('#start')).toBeEnabled();
  await startRunning(page); await expect(page.locator('#welcome')).toBeHidden();
  const save=await pause(page); expect(save.scenario).toEqual({kind:'campaign',id:'emberwatch',revision:2});
});

test('campaign chapter and mission navigation focuses the new heading for keyboard users',async ({page})=>{
  await openCampaign(page); await press(page,'#campaignStoryNav');
  await page.locator('[data-chapter="highpass"]').focus(); await page.keyboard.press('Enter');
  await expect(page.locator('#campaignChapterTitle')).toBeFocused();
  await press(page,'#campaignStoryNav');
  await page.locator('[data-chapter="embers"]').focus(); await page.keyboard.press('Space');
  await expect(page.locator('#campaignChapterTitle')).toBeFocused();
  await page.locator('[data-mission="three-roads"]').focus(); await page.keyboard.press('Enter');
  await expect(page.locator('#campaignMissionTitle')).toBeFocused();
  await expect(page.locator('#start')).toBeDisabled();
  await press(page,'#campaignChapterNav');
  await page.locator('[data-mission="emberwatch"]').focus(); await page.keyboard.press('Space');
  await expect(page.locator('#campaignMissionTitle')).toBeFocused();
  await expect(page.locator('#start')).toBeEnabled();
});

test('explicit revision-one campaign retains its version 2 save through UI construction and reload',async ({page})=>{
  await openCampaign(page,{legacy:true}); await press(page,'#resumeSaved');
  const point=await worldPoint(page,270,450);
  await press(page,'[data-type="archery"]'); await tapPoint(page,point);
  await expect(page.locator('#toast')).toContainText('Archery range raised');
  const before=await pause(page);
  expect(before).toMatchObject({format:'ironroot-save',version:2,challengeId:null,campaignId:'emberwatch'});
  expect(before.game.state.buildings.some(b=>b.side===0&&b.type==='archery')).toBe(true);
  Game.restore(before.game);
  await press(page,'#saveExit'); await page.reload();
  await expect(page.locator('#resumeSaved')).toContainText('RESUME MISSION');
  await press(page,'#resumeSaved'); await expect(page.locator('#matchType')).toHaveText('CAMPAIGN');
  await expect(page.locator('#opponentLabel')).toHaveText('EMBERWATCH');
  const after=await pause(page);
  expect(after.campaignId).toBe('emberwatch'); expect(after.version).toBe(2);
  const layout=data=>data.game.state.buildings.filter(b=>b.side===0).map(b=>[b.type,b.x,b.y,b.level]);
  expect(layout(after)).toEqual(layout(before));
  expect(after.game.state.time).toBeGreaterThanOrEqual(before.game.state.time);
  expect(after.game.state.time-before.game.state.time).toBeLessThan(3);
});

test('campaign victory awards stars once and Continue unlocks the next mission',async ({page})=>{
  await seed(page,'victory');
  await expect(page.locator('#resultTitle')).toHaveText('MISSION COMPLETE');
  await expect(page.locator('#playAgain')).toBeFocused();
  await expect(page.locator('.result-stars')).toHaveText('★★★');
  await expect(page.locator('#playAgain')).toContainText('CONTINUE CAMPAIGN');
  await page.waitForTimeout(350);
  expect(await snapshot(page)).toBeNull();
  const progress=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),CAMPAIGN_STORAGE_KEY);
  expect(progress.missions.emberwatch).toMatchObject({completed:true,stars:3});
  expect(Object.keys(progress.missions)).toEqual(['emberwatch']);
  const history=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),HISTORY);
  expect(history).toHaveLength(1); expect(history[0]).toMatchObject({campaignId:'emberwatch',won:true});
  await press(page,'#playAgain');
  await expect(page.locator('#welcome')).toBeVisible();
  await expect(page.locator('#campaignMissionTitle')).toHaveText('Three Roads');
  await expect(page.locator('[data-mission="three-roads"]')).toHaveClass(/active/);
  await expect(page.locator('#start')).toBeEnabled();
  await expect(page.locator('#campaignProgressText')).toContainText('1/19 missions');
  await startRunning(page); const save=await pause(page);
  expect(save.scenario).toEqual({kind:'campaign',id:'three-roads',revision:2});
  expect(Game.restore(save.game).buildings.wardenLodge).toBeTruthy();
});

test('campaign deadline failure focuses Retry and restarts without granting progress',async ({page})=>{
  await seed(page,'failure');
  await expect(page.locator('#resultTitle')).toHaveText('MISSION FAILED');
  await expect(page.locator('#playAgain')).toBeFocused();
  await expect(page.locator('#playAgain')).toContainText('RETRY MISSION');
  await expect(page.locator('.result-stars')).toHaveText('☆☆☆');
  expect(await snapshot(page)).toBeNull();
  const progress=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),CAMPAIGN_STORAGE_KEY);
  expect(progress.missions).toEqual({});
  await page.keyboard.press('Shift+Tab'); await expect(page.locator('#resultReport details.battle-report > summary')).toBeFocused();
  await page.keyboard.press('Shift+Tab'); await expect(page.locator('#inspectBattle')).toBeFocused();
  await page.keyboard.press('Tab'); await expect(page.locator('#resultReport details.battle-report > summary')).toBeFocused();
  await page.keyboard.press('Tab'); await expect(page.locator('#playAgain')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#resultModal')).toBeHidden();
  await expect(page.locator('#welcome')).toBeHidden();
  const retry=await pause(page); expect(retry.campaignId).toBe('emberwatch');
  expect(retry.game.state.time).toBeLessThan(5);
  expect(retry.game.state.buildings.some(b=>b.side===1&&b.type==='barracks'&&b.x===2230)).toBe(true);
});

test('campaign protected mine has disabled salvage while normal buildings remain salvageable',async ({page})=>{
  await seed(page,'protected');
  await tapPoint(page,await worldPoint(page,410,LANES[2]));
  await expect(page.locator('#selectionPanel')).toBeVisible();
  await expect(page.locator('#sell')).toBeDisabled();
  await expect(page.locator('#sell')).toHaveText('Protected objective');
  await expect(page.locator('#selectionDescription')).toContainText('Keep this building standing.');
  await press(page,'#closeSelection');
  await tapPoint(page,await worldPoint(page,690,450));
  await expect(page.locator('#selectionPanel')).toBeVisible();
  await expect(page.locator('#sell')).toBeEnabled();
  const save=await pause(page);
  expect(save.game.state.buildings.filter(b=>b.side===0&&b.type==='mint')).toHaveLength(2);
});

test('campaign briefing and launch remain reachable across viewport changes',async ({page})=>{
  await openCampaign(page);
  for (const viewport of [{width:320,height:568},{width:844,height:390},{width:390,height:650}]) {
    await page.setViewportSize(viewport);
    await chooseMission(page,'emberwatch');
    await page.locator('#start').scrollIntoViewIfNeeded();
    await expect(page.locator('#start')).toBeInViewport({ratio:1});
    await expect(page.locator('#start')).toBeEnabled();
    const bounds=await page.locator('#start').boundingBox();
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.x+bounds.width).toBeLessThanOrEqual(viewport.width+1);
  }
  await startRunning(page); await expect(page.locator('#welcome')).toBeHidden();
  expect((await pause(page)).scenario).toEqual({kind:'campaign',id:'emberwatch',revision:2});
});

// Known regression from independent UI review: a stale paused tab used to write
// over a newer battle during beforeunload. Keep this assertion red until fixed.
test('closing a stale paused campaign tab preserves the newer shared-context skirmish save',async ({page,context})=>{
  await openCampaign(page); await startRunning(page);
  expect((await pause(page)).scenario).toEqual({kind:'campaign',id:'emberwatch',revision:2});

  const newer=await context.newPage(),errors=[];
  newer.on('pageerror',error=>errors.push(error.message));
  try {
    await newer.goto('/');
    await expect(newer.locator('#resumeSaved')).toContainText('RESUME MISSION');
    await press(newer,'[data-mode="skirmish"]');
    await press(newer,'[data-difficulty="hard"]'); await press(newer,'#start');
    const newerSave=await pause(newer);
    expect(newerSave).toMatchObject({version:3,scenario:{kind:'skirmish',id:'standard',revision:1}});
    expect(newerSave.game.difficulty).toBe('hard');
    const durable=await newer.evaluate(key=>localStorage.getItem(key),SAVE);

    // Explicitly run beforeunload: Playwright's default page.close() skips it.
    // A conflict warning is allowed; accepting means leave the stale tab, not
    // consent to overwrite the other tab's independently saved battle.
    page.on('dialog',dialog=>dialog.accept());
    await Promise.all([
      page.waitForEvent('close'),
      page.close({runBeforeUnload:true}),
    ]);
    expect(await newer.evaluate(key=>localStorage.getItem(key),SAVE)).toBe(durable);
    expect(await snapshot(newer)).toMatchObject({version:3,scenario:{kind:'skirmish',id:'standard',revision:1}});
    expect(errors,'uncaught errors in the newer tab').toEqual([]);
  } finally {
    await newer.close();
  }
});

test('landscape campaign content keeps more than 120px usable height with a saved mission',async ({page})=>{
  await openCampaign(page); await startRunning(page); await pause(page);
  await press(page,'#saveExit');
  await expect(page.locator('#resumeSaved')).toBeVisible();
  await expect(page.locator('#campaignConfig')).toBeVisible();
  await page.setViewportSize({width:844,height:390});
  await page.locator('#campaignConfig').scrollIntoViewIfNeeded();
  await expect(page.locator('#resumeSaved')).toBeVisible();
  await expect.poll(()=>page.locator('#campaignConfig').evaluate(element=>{
    const r=element.getBoundingClientRect();
    return Math.min(element.clientHeight,Math.min(r.bottom,innerHeight)-Math.max(r.top,0));
  }),{message:'Landscape mission content must not collapse to a roughly 10px scroll strip'}).toBeGreaterThan(120);
});

async function resultGestureOverlap(context, viewport) {
  const page=await context.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  try {
    await page.setViewportSize(viewport);
    await seed(page,'failure');
    await expect(page.locator('#resultTitle')).toHaveText('MISSION FAILED');
    await page.evaluate(()=>document.fonts.ready);
    const candidates=await page.evaluate(()=>{
      const points=[];
      for(const action of ['playAgain','inspectBattle','resultMenu']){
        const r=document.getElementById(action).getBoundingClientRect();
        for(const fx of [.5,.25,.75,.1,.9])for(const fy of [.5,.25,.75]){
          const x=r.left+r.width*fx,y=r.top+r.height*fy;
          if(document.elementFromPoint(x,y)?.closest('button')?.id===action)
            points.push({x,y,action});
        }
      }
      return points;
    });
    await press(page,'#inspectBattle');
    await expect(page.locator('#resultModal')).toBeHidden();
    const points=await page.evaluate(candidates=>candidates.filter(p=>{
      const hit=document.elementFromPoint(p.x,p.y);
      return hit?.id==='battle'||hit?.id==='minimap'||hit?.closest('.app button');
    }),candidates);
    const history=await page.evaluate(key=>JSON.parse(localStorage.getItem(key))||[],HISTORY);
    expect(errors,'calibration page errors').toEqual([]);
    return {points,historyCount:history.length};
  } finally {await page.close();}
}

test('a gameplay gesture held across mission end cannot activate the newly appearing result action',async ({page,context},testInfo)=>{
  test.setTimeout(60000);
  const nativeViewport=page.viewportSize();
  let viewport=nativeViewport,calibration=await resultGestureOverlap(context,viewport);
  if(!calibration.points.length){
    // A no-overlap layout is not a safety pass. Keep this profile's real input
    // mode and deliberately constrain the viewport to the reproduced layout.
    viewport={width:844,height:390};
    calibration=await resultGestureOverlap(context,viewport);
    testInfo.annotations.push({type:'constrained-viewport',description:
      `${nativeViewport.width}×${nativeViewport.height} had no playable overlap; exercising real overlapping controls at 844×390 with the same input mode.`});
  }
  expect(calibration.points.length,'A real visible result action must overlap a playable surface/control; no blank-area pass or skip').toBeGreaterThan(0);
  await page.setViewportSize(viewport);

  const fixture=campaignFixture('failure');
  fixture.envelope.game.state.time=175; // Genuine objective deadline five seconds after resume.
  Game.restore(fixture.envelope.game);
  await page.addInitScript(({fixture,save,progress})=>{
    localStorage.setItem(save,JSON.stringify(fixture.envelope));
    localStorage.setItem(progress,JSON.stringify(fixture.progress));
  },{fixture,save:SAVE,progress:CAMPAIGN_STORAGE_KEY});
  await page.goto('/');await page.evaluate(()=>document.fonts.ready);
  await press(page,'#resumeSaved');
  await expect(page.locator('#resultModal')).toBeHidden();
  const point=await page.evaluate(points=>{
    for(const p of points){
      const hit=document.elementFromPoint(p.x,p.y),button=hit?.closest('.app button:not(:disabled)');
      if(hit?.id==='battle'||hit?.id==='minimap'||button)
        return {...p,downTarget:hit.id||button.id||button.dataset.type};
    }
    return null;
  },calibration.points);
  expect(point,'The held gesture must begin on an actual playable surface or enabled control').not.toBeNull();

  const touch=await page.evaluate(()=>navigator.maxTouchPoints>0);
  const cdp=touch?await context.newCDPSession(page):null;
  let held=false;
  try{
    if(touch)await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:0,x:point.x,y:point.y}]});
    else {await page.mouse.move(point.x,point.y);await page.mouse.down();}
    held=true;
    await expect(page.locator('#resultTitle')).toHaveText('MISSION FAILED',{timeout:10000});
    await expect(page.locator('#resultModal')).toBeVisible();
    const releaseTarget=await page.evaluate(p=>document.elementFromPoint(p.x,p.y)?.closest('button')?.id,point);
    expect(releaseTarget,'The new actionable overlay must genuinely occupy the held coordinate').toBe(point.action);
    testInfo.annotations.push({type:'gesture',description:(touch?'touch':'mouse')+' down on '+point.downTarget+' at '+point.x.toFixed(1)+','+point.y.toFixed(1)+' in '+viewport.width+'×'+viewport.height+'; release over '+releaseTarget});
    if(touch)await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    else await page.mouse.up();
    held=false;
    await page.waitForTimeout(350); // Observe any browser compatibility click; not a runtime debounce.
    await expect(page.locator('#resultModal')).toBeVisible();
    await expect(page.locator('#resultTitle')).toHaveText('MISSION FAILED');
    await expect(page.locator('#welcome')).toBeHidden();
    expect(await snapshot(page)).toBeNull();
    const history=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),HISTORY);
    expect(history).toHaveLength(calibration.historyCount+1);

    // A first independent press must still work after observing the old click.
    await press(page,'#playAgain');
    await expect(page.locator('#resultModal')).toBeHidden();
    await expect(page.locator('#welcome')).toBeHidden();
    const retry=await pause(page);
    expect(retry.campaignId).toBe('emberwatch');
    expect(retry.game.state.time).toBeLessThan(5);

    // Repeat the genuine deadline crossing, this time with NO observation
    // delay between release and the independent press. A blanket next-click
    // shield or debounce would consume this fresh press and fail the test.
    await page.reload();await press(page,'#resumeSaved');
    await expect(page.locator('#resultModal')).toBeHidden();
    const playable=await page.evaluate(p=>{
      const hit=document.elementFromPoint(p.x,p.y);
      return hit?.id==='battle'||hit?.id==='minimap'||!!hit?.closest('.app button:not(:disabled)');
    },point);
    expect(playable,'Immediate recovery run also starts on real gameplay').toBe(true);
    if(touch)await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:0,x:point.x,y:point.y}]});
    else {await page.mouse.move(point.x,point.y);await page.mouse.down();}
    held=true;
    await expect(page.locator('#resultTitle')).toHaveText('MISSION FAILED',{timeout:10000});
    expect(await page.evaluate(p=>document.elementFromPoint(p.x,p.y)?.closest('button')?.id,point)).toBe(point.action);
    const retryBounds=await page.locator('#playAgain').boundingBox();
    const freshPoint={x:retryBounds.x+retryBounds.width/2,y:retryBounds.y+retryBounds.height/2};
    expect(await page.evaluate(p=>document.elementFromPoint(p.x,p.y)?.closest('button')?.id,freshPoint)).toBe('playAgain');
    if(touch){
      await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
      held=false;
      await page.touchscreen.tap(freshPoint.x,freshPoint.y);
    }else{
      await page.mouse.up();
      held=false;
      await page.mouse.click(freshPoint.x,freshPoint.y);
    }
    await expect(page.locator('#resultModal')).toBeHidden();
    await expect(page.locator('#welcome')).toBeHidden();
    const immediateRetry=await pause(page);
    expect(immediateRetry.campaignId).toBe('emberwatch');
    expect(immediateRetry.game.state.time).toBeLessThan(5);
    expect(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).length,HISTORY)).toBe(calibration.historyCount+2);
  }finally{
    if(held){
      if(touch)await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});
      else await page.mouse.up();
    }
    if(cdp)await cdp.detach();
  }
});
