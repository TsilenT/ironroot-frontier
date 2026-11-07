import {startLegacyTeaching} from './campaign-teaching-helpers.mjs';
import {test as base,expect} from '@playwright/test';
import {openBuildControls,prepareBuildControl} from './shared-build-controls.mjs';
import {Game} from '../../dist/engine.js';
import {createCampaignProgress, ONBOARDING_MISSIONS} from '../../dist/campaign.js';
import {progressionProfile} from './campaign-progression-fixtures.mjs';
const SAVE='ironroot.battle.v1', PROGRESS='ironroot.campaign.v1';
const test=base.extend({page:async({page},use)=>{const errors=[];page.on('pageerror',e=>errors.push(e.message));await use(page);expect(errors).toEqual([]);}});
test.setTimeout(40000);
async function press(page,selector){if(await prepareBuildControl(page,selector))return;const e=page.locator(selector);if(await page.evaluate(()=>navigator.maxTouchPoints>0))await e.tap();else await e.click();}
const saved=page=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),SAVE);
async function fresh(page,id='first-watch'){
  if(id==='first-watch'){await startLegacyTeaching(page,press);return;}
  await page.goto('/');
  const index=ONBOARDING_MISSIONS.findIndex(mission=>mission.id===id);
  if(index>0){
    // Declared already-earned prerequisite records, not browser-played wins.
    await page.evaluate(({key,progress})=>localStorage.setItem(key,JSON.stringify(progress)),{key:PROGRESS,progress:progressionProfile(index)});
    await page.reload();
  }
  await expect(page.locator('#campaignMissionTitle')).toHaveText(ONBOARDING_MISSIONS[index].name);
  await press(page,'#start');
  if(id==='roadside-watch')await expect(page.locator('#coachingModal')).toBeHidden();
  else await expect(page.locator('#coachingModal')).toBeVisible();
}
async function place(page,type,x,y=450){
  await press(page,`[data-type="${type}"]`);
  const touch=await page.evaluate(()=>navigator.maxTouchPoints>0);
  const map=Game.restore((await saved(page)).game).map;
  const mini=page.locator('#minimap'),m=await mini.boundingBox();
  // Use the ordinary minimap to expose the site. Home cannot show forward
  // sites on a portrait screen. Observe the delivered native activation so
  // compatibility-click pixel quantization is not mistaken for camera drift.
  await mini.evaluate(element=>{
    window.__qaPlacementMinimap=null;
    element.addEventListener('click',event=>{
      window.__qaPlacementMinimap={x:event.clientX,trusted:event.isTrusted,target:event.target.id};
    },{once:true,passive:true});
  });
  const aim={x:m.x+m.width*x/map.width,y:m.y+m.height/2};
  if(touch)await page.touchscreen.tap(aim.x,aim.y);else await page.mouse.click(aim.x,aim.y);
  const activation=await page.evaluate(()=>window.__qaPlacementMinimap);
  expect(activation).toMatchObject({trusted:true,target:'minimap'});
  expect(Math.abs(activation.x-aim.x)).toBeLessThanOrEqual(1);
  const r=await page.locator('#battle').boundingBox(),scale=Math.max(.32,r.height/map.height),half=r.width/(2*scale);
  const target=(activation.x-m.x)/m.width*map.width;
  const camera=half>=map.width/2?map.width/2:Math.max(half,Math.min(map.width-half,target));
  const p={x:r.x+r.width/2+(x-camera)*scale,y:r.y+r.height/2+(y-map.height/2)*scale};
  expect(p.x).toBeGreaterThan(r.x);expect(p.x).toBeLessThan(r.x+r.width);
  expect(p.y).toBeGreaterThan(r.y);expect(p.y).toBeLessThan(r.y+r.height);
  expect(await page.evaluate(({x,y})=>document.elementFromPoint(x,y)?.id,p)).toBe('battle');
  if(touch)await page.touchscreen.tap(p.x,p.y);else await page.mouse.click(p.x,p.y);
  await expect(page.locator('#toast')).toContainText('raised');
  await expect(page.locator('#battle')).not.toHaveClass(/placing/);
  await expect(page.locator('#app')).not.toHaveClass(/compact-build-open/);
}

test('legacy lesson reading and paid construction stop both armies, clocks and income until explicit Resume',async({page})=>{
  await fresh(page);
  await expect(page.locator('#coachingPlan')).toBeFocused();
  await expect(page.locator('#app')).toHaveAttribute('inert','');
  const before=await saved(page);await page.waitForTimeout(1100);expect(await saved(page)).toEqual(before);
  await press(page,'#coachingPlan');await place(page,'barracks',550);await place(page,'archery',410);
  await openBuildControls(page);await expect(page.locator('#coachTitle')).toHaveText('Follow your army');
  await expect(page.locator('#time')).toHaveText('00:00');await expect(page.locator('#gold')).toHaveText('105');
  await page.waitForTimeout(1100);await expect(page.locator('#time')).toHaveText('00:00');await expect(page.locator('#gold')).toHaveText('105');
  await press(page,'#coachResume');await expect(page.locator('#time')).not.toHaveText('00:00');
  await press(page,'#pause');const result=await saved(page);
  expect(result.game.state.buildings.filter(b=>b.side===0)).toHaveLength(2);
  expect(result.game.state.gold[0]).toBeCloseTo(105+5*result.game.state.time,1);
  expect(result.game.state.units.length).toBeGreaterThan(0);Game.restore(result.game);
  expect(JSON.stringify(result)).not.toMatch(/coachingHold|teachingPause/);
});

test('legacy lesson alternative composition, legal unmarked sites and hiding hints preserve player agency',async({page})=>{
  await fresh(page);await press(page,'#coachingPlan');
  // Legacy optional roster is retained; only the two introductory cards show.
  await expect(page.locator('#allBuildings')).toBeVisible();
  await expect(page.locator('.build-card:visible')).toHaveCount(2);
  await expect(page.locator('[data-type="foundry"]')).toBeHidden();
  await place(page,'archery',410);
  await openBuildControls(page);await expect(page.locator('#coachTitle')).toHaveText('Build a barracks');
  await expect(page.locator('#time')).toHaveText('00:00');
  await press(page,'#toggleCoach');await expect(page.locator('#campaignCoach')).toBeHidden();
  await page.waitForTimeout(1100);await expect(page.locator('#time')).toHaveText('00:00');
  await press(page,'#settings');await expect(page.locator('#settingsDone')).toHaveText('Back to planning');
  await press(page,'#settingsDone');await expect(page.locator('#settings')).toBeFocused();
  await page.waitForTimeout(1100);await expect(page.locator('#time')).toHaveText('00:00');
  await press(page,'#coachResume');await expect(page.locator('#time')).not.toHaveText('00:00');
  await press(page,'#pause');const result=await saved(page);
  expect(result.game.state.buildings.some(b=>b.side===0&&b.type==='archery'&&b.x===410)).toBe(true);
  expect(result.game.state.buildings.some(b=>b.side===0&&b.type==='barracks')).toBe(false);
});

test('start now, manual pause, preferences and optional teaching replay require deliberate transitions',async({page})=>{
  await fresh(page);await press(page,'#coachingPlay');
  await expect(page.locator('#time')).not.toHaveText('00:00');
  await press(page,'#pause');const t=await page.locator('#time').innerText();
  await press(page,'#pauseSettings');await press(page,'#closeSettings');
  await expect(page.locator('#pauseVeil')).toBeVisible();await expect(page.locator('#time')).toHaveText(t);
  await press(page,'#resume');await press(page,'#coachReplay');
  await expect(page.locator('#coachingModal')).toBeVisible();
  await page.keyboard.press('Escape');await expect(page.locator('#coachingModal')).toBeHidden();
  const frozen=await page.locator('#time').innerText();await page.waitForTimeout(1100);await expect(page.locator('#time')).toHaveText(frozen);
  await press(page,'#pause');await expect(page.locator('#time')).not.toHaveText(frozen);
});

test('saved planning construction resumes normally and completed replay skips the automatic hold',async({page})=>{
  await fresh(page);await press(page,'#coachingPlan');await place(page,'barracks',550);
  await press(page,'#pause'); // Explicitly leave teaching, then open manual pause.
  await press(page,'#pause');await press(page,'#saveExit');
  await page.reload();await press(page,'#resumeSaved');
  await expect(page.locator('#coachingModal')).toBeHidden();await expect(page.locator('#time')).not.toHaveText('00:00');
  await press(page,'#pause');const result=await saved(page);expect(result.game.state.buildings.some(b=>b.side===0&&b.x===550)).toBe(true);
  await press(page,'#saveExit');
  const completed=createCampaignProgress();completed.missions['roadside-watch']={completed:true,stars:1,bestTime:30};
  await page.evaluate(({key,value})=>localStorage.setItem(key,JSON.stringify(value)),{key:PROGRESS,value:completed});
  await page.reload();await press(page,'#campaignStoryNav');await press(page,'[data-chapter="opening-roads"]');await press(page,'[data-mission="roadside-watch"]');await press(page,'#start');
  await expect(page.locator('#coachingModal')).toBeHidden();await expect(page.locator('#time')).not.toHaveText('00:00');
});

test('visibility interruption while planning requires explicit resume and cannot buy with a held gesture',async({page,context})=>{
  await fresh(page);await press(page,'#coachingPlan');await press(page,'[data-type="barracks"]');
  const r=await page.locator('#battle').boundingBox(),p={x:r.x+r.width/2,y:r.y+r.height/2};
  const touch=await page.evaluate(()=>navigator.maxTouchPoints>0),cdp=touch?await context.newCDPSession(page):null;
  if(touch)await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[p]});else{await page.mouse.move(p.x,p.y);await page.mouse.down();}
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});
  await expect(page.locator('#pauseVeil')).toBeVisible();
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>false});document.dispatchEvent(new Event('visibilitychange'));});
  if(touch)await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});else await page.mouse.up();
  await page.waitForTimeout(1100);await expect(page.locator('#time')).toHaveText('00:00');
  expect((await saved(page)).game.state.buildings.filter(b=>b.side===0)).toHaveLength(0);
  await press(page,'#resume');await expect(page.locator('#time')).not.toHaveText('00:00');
});

test('keyboard focus stays in the teaching dialog and Space on its buttons does not leak into battle',async({page})=>{
  await fresh(page);await page.keyboard.press('Shift+Tab');await expect(page.locator('.coaching-copy')).toBeFocused();
  await page.keyboard.press('Shift+Tab');await expect(page.locator('#coachingPlay')).toBeFocused();
  await page.keyboard.press('Tab');await expect(page.locator('.coaching-copy')).toBeFocused();
  await page.keyboard.press('Tab');await expect(page.locator('#coachingPlan')).toBeFocused();
  await page.keyboard.press('Space');await expect(page.locator('#coachingModal')).toBeHidden();
  await page.waitForTimeout(1100);await expect(page.locator('#time')).toHaveText('00:00');
  await page.locator('#battle').focus();await page.keyboard.press('Space');await expect(page.locator('#time')).not.toHaveText('00:00');
});

test('a fresh suggested army earns a real win and Continue opens the next teaching mission',async({page},testInfo)=>{
  test.skip(testInfo.project.name!=='desktop','One complete real-time route; touch paid construction is covered separately.');
  test.setTimeout(110000);
  await fresh(page,'roadside-watch');
  // The documented renderer transform includes camera clamping on wide views.
  // These are the independently verified opening suggestions, paid through UI.
  await place(page,'barracks',970);
  await place(page,'archery',830);
  await openBuildControls(page);await expect(page.locator('#coachTitle')).toHaveText('Follow your army');
  await expect(page.locator('#coachResume')).toBeHidden();
  await expect(page.locator('#time')).not.toHaveText('00:00');
  await press(page,'#speed');await press(page,'#speed');
  await expect(page.locator('#resultTitle')).toHaveText('MISSION COMPLETE',{timeout:95000});
  const result=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),PROGRESS);
  expect(result.missions['roadside-watch'].completed).toBe(true);
  await press(page,'#playAgain');await expect(page.locator('#campaignMissionTitle')).toHaveText('Shield at the Fork');
  await press(page,'#start');await expect(page.locator('#coachingTitle')).toHaveText('Plan for both roads');
  expect((await saved(page)).game.state.time).toBe(0);
  await press(page,'#coachingPlan');
  await place(page,'wardenLodge',970,340);
  await place(page,'archery',830,340);
  await place(page,'barracks',970,560);
  await openBuildControls(page);await expect(page.locator('#coachTitle')).toHaveText('Fund reinforcements');
  await expect(page.locator('#gold')).toHaveText('215');
  await expect(page.locator('#time')).toHaveText('00:00');
});

test('teaching dialog, real controls and a suggestion are visible at the current viewport',async({page},testInfo)=>{
  await fresh(page);
  const dialog=page.locator('#coachingModal [role="dialog"]');
  const r=await dialog.boundingBox(),v=page.viewportSize();expect(r.x).toBeGreaterThanOrEqual(0);expect(r.y).toBeGreaterThanOrEqual(0);expect(r.y+r.height).toBeLessThanOrEqual(v.height);
  for(const id of ['coachingPlan','coachingPlay']){const b=await page.locator('#'+id).boundingBox();expect(b.height).toBeGreaterThanOrEqual(44);}
  await page.screenshot({path:testInfo.outputPath('teaching-dialog.png')});
  await press(page,'#coachingPlan');await press(page,'[data-type="barracks"]');
  await expect(page.locator('#battle')).toBeVisible();await expect(page.locator('#pause')).toHaveAttribute('aria-label','Resume game');
  await page.screenshot({path:testInfo.outputPath('suggested-site.png')});
});

test('viewport safety covers the reading dialog and remains usable until an explicit safe Resume',async({page})=>{
  await fresh(page);const original=page.viewportSize();
  await page.setViewportSize({width:320,height:250});
  await expect(page.locator('#viewportModal')).toBeVisible();
  await expect(page.locator('#viewportResume')).toBeDisabled();
  await page.setViewportSize(original);
  await expect(page.locator('#viewportResume')).toBeEnabled();
  const hit=await page.locator('#viewportResume').evaluate(e=>{const r=e.getBoundingClientRect();return document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest('button')===e;});
  expect(hit,'the foreground safety control must be hit-testable above the inert teaching dialog').toBe(true);
  await expect(page.locator('#time')).toHaveText('00:00');
  await press(page,'#viewportResume');
  await expect(page.locator('#coachingModal')).toBeHidden();
  await expect(page.locator('#time')).not.toHaveText('00:00');
});

for(const [id,purchases,gold] of [
  ['shield-at-the-fork',[['wardenLodge',970,340],['archery',830,340],['barracks',970,560]],215],
  ['open-three-roads',[['archery',970,260],['barracks',970,450],['foundry',830,450],['barracks',970,640]],375],
])test(id+' allows real paid planning across every road with its earned roster',async({page})=>{
  await fresh(page,id);const before=await saved(page),rules=Game.restore(before.game).ruleset.id;
  await press(page,'#coachingPlan');
  const forkPrompts=[
    {open:'Build a Warden lodge toward the front of the north road to train Rootwardens who take hits but deal little damage.',closed:'Open Build, then build a Warden lodge toward the front of the north road to train Rootwardens who take hits but deal little damage.'},
    {open:'Place an archery range behind the northern Warden lodge to add damage while the Rootwardens hold the front.',closed:'Open Build, then place an archery range behind the northern Warden lodge to add damage while the Rootwardens hold the front.'},
  ];
  const compact=await page.locator('#app').evaluate(e=>e.classList.contains('protected-compact'));
  if(id==='shield-at-the-fork')await expect(page.locator('#coachText')).toHaveText(forkPrompts[0][compact?'closed':'open']);
  for(const [type,x,y]of purchases){
    await place(page,type,x,y);
    if(id==='shield-at-the-fork'&&type==='wardenLodge')await expect(page.locator('#coachText')).toHaveText(forkPrompts[1][compact?'closed':'open']);
  }
  await expect(page.locator('#time')).toHaveText('00:00');
  await expect(page.locator('#gold')).toHaveText(String(gold));
  await page.waitForTimeout(1100);await expect(page.locator('#time')).toHaveText('00:00');
  await openBuildControls(page);await press(page,'#coachResume');await press(page,'#pause');
  const after=await saved(page);expect(after.game.rulesetId).toBe(rules);
  const own=after.game.state.buildings.filter(b=>b.side===0);
  expect(own.map(b=>[b.type,b.x,b.y])).toEqual(purchases);
  expect(after.game.state.gold[0]).toBeCloseTo(gold+5*after.game.state.time,1);
  expect(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),PROGRESS)).toEqual(progressionProfile(ONBOARDING_MISSIONS.findIndex(m=>m.id===id)));
});

test('restart of an unfinished opening keeps its exact roster and offers fresh teaching at zero',async({page})=>{
  await fresh(page,'shield-at-the-fork');await press(page,'#coachingPlan');await place(page,'wardenLodge',970,340);
  await openBuildControls(page);await press(page,'#coachResume');await press(page,'#pause');
  const before=await saved(page);await press(page,'#restartBattle');await press(page,'#confirmRestart');
  await expect(page.locator('#coachingModal')).toBeVisible();
  const after=await saved(page);expect(after.scenario).toEqual(before.scenario);
  expect(after.game.rulesetId).toBe(before.game.rulesetId);expect(after.game.mapId).toBe(before.game.mapId);
  expect(after.game.state.time).toBe(0);expect(after.game.state.gold[0]).toBe(740);
  expect(after.game.state.buildings.filter(b=>b.side===0)).toHaveLength(0);
});

test('third mission full paid route wins two stars and offers a full-roster replay',async({page},testInfo)=>{
  test.setTimeout(135000);
  // Prerequisites are declared fixtures; this entire third battle is played
  // through native controls at ordinary 1x speed, without engine-state writes.
  await fresh(page,'open-three-roads');await press(page,'#coachingPlan');
  for(const [type,x,y]of [['archery',970,260],['archery',830,260],['barracks',970,450],['foundry',830,450],['barracks',970,640]])await place(page,type,x,y);
  await expect(page.locator('#gold')).toHaveText('200');await expect(page.locator('#time')).toHaveText('00:00');
  await openBuildControls(page);await press(page,'#coachResume');
  const elapsed=async()=>{const [m,s]=(await page.locator('#time').textContent()).split(':').map(Number);return m*60+s;};
  for(const [at,type,x,y]of [[10,'barracks',830,640],[25,'archery',690,450],[60,'archery',690,260]]){
    await expect.poll(elapsed,{timeout:70000,intervals:[200]}).toBeGreaterThanOrEqual(at);
    await place(page,type,x,y);
  }
  await expect(page.locator('#resultTitle')).toHaveText('MISSION COMPLETE',{timeout:40000});
  await expect(page.locator('.result-stars')).toHaveText('★★☆');
  await expect(page.locator('#replayMission')).toBeVisible();
  const progress=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),PROGRESS);
  expect(progress.missions['open-three-roads']).toMatchObject({completed:true,stars:2});
  expect(await saved(page)).toBeNull();
  await page.screenshot({path:testInfo.outputPath('third-mission-paid-victory.png')});
  await press(page,'#replayMission');await expect(page.locator('#coachingModal')).toBeHidden();
  await expect(page.locator('#time')).not.toHaveText('00:00');await openBuildControls(page);
  await expect(page.locator('.build-card:visible')).toHaveCount(8);
  await press(page,'#pause');const replay=await saved(page);
  expect(replay.scenario).toEqual({kind:'campaign',id:'open-three-roads',revision:1});
  expect(replay.game.rulesetId).toBe('frontier-campaign-open');
  expect(replay.game.state.buildings.filter(b=>b.side===0)).toHaveLength(0);
  expect(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),PROGRESS)).toEqual(progress);
});
