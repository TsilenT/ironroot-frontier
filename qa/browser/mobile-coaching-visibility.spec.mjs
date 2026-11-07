import {startLegacyTeaching,finishFirstBuild} from './campaign-teaching-helpers.mjs';
import {test as base,expect} from '@playwright/test';
import {openBuildControls,prepareBuildControl} from './shared-build-controls.mjs';
import {inspectPhoneText} from './phone-text-evidence.mjs';
import {progressionProfile} from './campaign-progression-fixtures.mjs';
import {campaignFixture} from './campaign-fixtures.mjs';
import {Game} from '../../dist/engine.js';
import {createCampaignMission,createProgressionCampaignMission} from '../../dist/campaign.js';
import {encodeBattle,decodeBattle,scenarioForBattle} from '../../dist/battle-codec.js';
const SAVE='ironroot.battle.v1',PROGRESS='ironroot.campaign.v1';
const test=base.extend({page:async({page},use)=>{const errors=[];page.on('pageerror',e=>errors.push(e.message));await use(page);expect(errors).toEqual([]);}});
test.setTimeout(45000);
async function press(page,selector){if(await prepareBuildControl(page,selector))return;const target=page.locator(selector);if(await page.evaluate(()=>navigator.maxTouchPoints>0))await target.tap();else await target.click();}
async function fresh(page,index=0){
  // Zero index exercises retained legacy teaching; first Roadside has no Start rail.
  if(index===0){await startLegacyTeaching(page,press);return;}
  await page.goto('/');
  await page.evaluate(({key,profile})=>{localStorage.clear();localStorage.setItem(key,JSON.stringify(profile));},{key:PROGRESS,profile:progressionProfile(index)});
  await page.reload();await press(page,'#start');await expect(page.locator('#coachingModal')).toBeVisible();
}
async function frozen(page){
  await expect(page.locator('#time')).toHaveText('00:00');
  const gold=await page.locator('#gold').textContent();await page.waitForTimeout(1100);
  await expect(page.locator('#time')).toHaveText('00:00');await expect(page.locator('#gold')).toHaveText(gold);
}
async function visibleRail(page,testInfo,label,{running=false}={}){
  await expect(page.locator('#viewportModal')).toBeHidden();
  await expect(page.locator('#campaignCoach')).toBeVisible();
  if(running)await expect(page.locator('#coachResume')).toBeHidden();else await expect(page.locator('#coachResume')).toBeVisible();
  const geometry=await page.evaluate(running=>{
    const box=e=>{const r=e.getBoundingClientRect();return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height};};
    const root=document.querySelector('#app'),style=getComputedStyle(root),r=box(root);
    const safe={left:r.left+parseFloat(style.paddingLeft),top:r.top+parseFloat(style.paddingTop),right:r.right-parseFloat(style.paddingRight),bottom:r.bottom-parseFloat(style.paddingBottom)};
    const ids=['battle','campaignTeaching','topbar','protectedDock','protectedNavigation',...(!running?['coachResume']:[]),'toggleCoach','compactBuild','pause','speed','rally','settings','home','front','minimap'];
    const nodes=Object.fromEntries(ids.map(id=>[id,box(document.getElementById(id))]));
    const controls=[...(!running?['coachResume']:[]),'toggleCoach','compactBuild','pause','speed','rally','settings','home','front','minimap'].map(id=>{
      const e=document.getElementById(id),rect=nodes[id],hit=document.elementFromPoint((rect.left+rect.right)/2,(rect.top+rect.bottom)/2);
      return {id,...rect,hit:e===hit||e.contains(hit)};
    });
    return {safe,nodes,controls,parent:document.getElementById('campaignTeaching').parentNode.id};
  },running);
  expect(geometry.parent).toBe('app');expect(geometry.nodes.battle.height).toBeGreaterThanOrEqual(212);
  const overlaps=(a,b)=>a.left<b.right-.5&&a.right>b.left+.5&&a.top<b.bottom-.5&&a.bottom>b.top+.5;
  for(const id of ['battle','topbar','protectedDock','protectedNavigation'])expect(overlaps(geometry.nodes.campaignTeaching,geometry.nodes[id]),'teaching must not cover '+id).toBe(false);
  for(const r of Object.values(geometry.nodes)){
    expect(r.left).toBeGreaterThanOrEqual(geometry.safe.left-.5);expect(r.top).toBeGreaterThanOrEqual(geometry.safe.top-.5);
    expect(r.right).toBeLessThanOrEqual(geometry.safe.right+.5);expect(r.bottom).toBeLessThanOrEqual(geometry.safe.bottom+.5);
  }
  for(const control of geometry.controls){expect(control.width,control.id).toBeGreaterThanOrEqual(44);expect(control.height,control.id).toBeGreaterThanOrEqual(44);expect(control.hit,control.id).toBe(true);}
  const text=await page.evaluate(inspectPhoneText,{selector:'#coachNext',ownerSelector:'#campaignCoach',minimumFont:12});
  expect(text).toHaveLength(1);expect(text[0].complete,JSON.stringify(text[0])).toBe(true);
  await testInfo.attach(label+'-geometry',{body:JSON.stringify(geometry,null,2),contentType:'application/json'});
}

test('Plan, selected tool, failed correction and paid build keep teaching and Start outside the closed drawer',async({page},testInfo)=>{
  test.skip(testInfo.project.name==='desktop','Mobile rail; desktop shared controls remain in the normal deck.');
  for(const index of [0,1,2]){
    await fresh(page,index);await press(page,'#coachingPlan');
    await expect(page.locator('#commandDeck')).toBeHidden();await expect(page.locator('#coachNext')).toContainText('Paused.');
    await visibleRail(page,testInfo,'plan-'+index);await frozen(page);
    await openBuildControls(page);await expect(page.locator('.build-card:visible')).toHaveCount([2,5,8][index]);
    await press(page,'[data-type="barracks"]');await expect(page.locator('#commandDeck')).toBeHidden();
    await visibleRail(page,testInfo,'selected-'+index);
    // Selection centers the actual suggested site. Inspect public canvas transform
    // only, then send native input. No game/UI state is rewritten.
    const r=await page.locator('#battle').boundingBox();
    const y=index===0?450:index===1?340:260;
    const scale=Math.max(.32,r.height/900),site={x:r.x+r.width/2,y:r.y+r.height/2+(y-450)*scale};
    const tap=async p=>{if(await page.evaluate(()=>navigator.maxTouchPoints>0))await page.touchscreen.tap(p.x,p.y);else await page.mouse.click(p.x,p.y);};
    const beforeGold=Number(await page.locator('#gold').textContent());
    // Empty road offset is deliberately not a legal building row.
    await tap({x:site.x,y:r.y+8});await expect(page.locator('#gold')).toHaveText(String(beforeGold));
    await expect(page.locator('#compactBuild')).toHaveAttribute('aria-label','Cancel placement');
    await tap(site);await expect(page.locator('#toast')).toContainText('raised');
    await expect(page.locator('#gold')).toHaveText(String(beforeGold-140));
    // The combined default is one successful order, including during teaching.
    await expect(page.locator('#compactBuild')).toHaveAttribute('aria-label','Open building controls');
    await expect(page.locator('#battle')).not.toHaveClass(/placing/);
    await expect(page.locator('#commandDeck')).toBeHidden();
    await visibleRail(page,testInfo,'paid-'+index);await frozen(page);
    await press(page,'#toggleCoach');await expect(page.locator('#campaignCoach')).toBeHidden();
    await expect(page.locator('#coachResume')).toBeVisible();await expect(page.locator('#toggleCoach')).toHaveAccessibleName('Show hints');await frozen(page);
    await press(page,'#toggleCoach');await expect(page.locator('#commandDeck')).toBeHidden();await visibleRail(page,testInfo,'shown-'+index);
    await press(page,'#coachResume');await expect(page.locator('#time')).not.toHaveText('00:00');
    await press(page,'#pause');
  }
});

test('short portrait safe inset and protected landscape retain measured world and reachable teaching controls',async({page},testInfo)=>{
  test.skip(testInfo.project.name==='desktop','Mobile safe-area geometry.');
  await page.setViewportSize({width:320,height:480});await fresh(page);
  await page.locator('#app').evaluate(e=>e.style.setProperty('--mobile-inset-bottom','34px'));
  await press(page,'#coachingPlan');await visibleRail(page,testInfo,'320x480-bottom34');
  await page.screenshot({path:testInfo.outputPath('short-portrait-teaching.png')});
  await page.setViewportSize({width:740,height:320});
  await visibleRail(page,testInfo,'rotated-740x320');await frozen(page);
  const fixture=campaignFixture('protected');
  await page.evaluate(({save,progress,key,progressKey})=>{localStorage.setItem(key,JSON.stringify(save));localStorage.setItem(progressKey,JSON.stringify(progress));},{save:fixture.envelope,progress:fixture.progress,key:SAVE,progressKey:PROGRESS});
  await page.reload();await press(page,'#resumeSaved');
  await press(page,'#coachReplay');await press(page,'#coachingPlan');
  await page.locator('#app').evaluate(e=>{e.style.setProperty('--mobile-inset-left','21px');e.style.setProperty('--mobile-inset-right','21px');e.style.setProperty('--mobile-inset-bottom','21px');});
  await visibleRail(page,testInfo,'protected-740x320-insets');
  await expect(page.locator('[data-protected-id]')).toHaveCount(2);
  await page.screenshot({path:testInfo.outputPath('protected-landscape-teaching.png')});
});

test('narrow teaching dialog pins both actions while instructions remain scrollable',async({page})=>{
  await page.setViewportSize({width:320,height:568});await fresh(page);
  for(const id of ['coachingPlan','coachingPlay']){
    const r=await page.locator('#'+id).boundingBox();expect(r.height).toBeGreaterThanOrEqual(44);expect(r.y).toBeGreaterThanOrEqual(0);expect(r.y+r.height).toBeLessThanOrEqual(568);
    expect(await page.locator('#'+id).evaluate(e=>{const r=e.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return e===hit||e.contains(hit);})).toBe(true);
  }
  await expect(page.locator('#coachingPlan')).toBeFocused();
  await page.keyboard.press('Shift+Tab');await expect(page.locator('.coaching-copy')).toBeFocused();
  await page.keyboard.press('End');await frozen(page);await press(page,'#coachingPlan');
  await expect(page.locator('#coachingModal')).toBeHidden();await frozen(page);
});

test('reading hint details with keyboard scroll keys never starts or pans the battlefield',async({page})=>{
  await fresh(page);await press(page,'#coachingPlan');
  await page.locator('#campaignCoach').focus();
  for(const key of ['Space','ArrowLeft','ArrowRight','PageDown','Home'])await page.keyboard.press(key);
  await frozen(page);await expect(page.locator('#coachingModal')).toBeHidden();
  await expect(page.locator('#campaignCoach')).toBeFocused();
  await press(page,'#coachResume');await expect(page.locator('#time')).not.toHaveText('00:00');
});

// Declared valid saved attempts, not claims that these battles were browser-played.
function resumedHintFixture(id,{completed=false}={}){
  const progress=progressionProfile();
  if(completed)progress.missions[id]={completed:true,stars:1,bestTime:90};
  const game=id==='first-watch'?createCampaignMission(id):createProgressionCampaignMission(id,progress);
  if(!game.build('barracks',970,450).ok)throw Error('Expected an ordinary paid opening barracks');
  for(let tick=0;tick<20;tick++)game.update(.05);
  const envelope=encodeBattle(game,scenarioForBattle(null,id,game),{campaignProgress:progress});
  const decoded=decodeBattle(envelope,{campaignProgress:progress});
  expect(decoded.game.serialize()).toEqual(game.serialize());Game.restore(envelope.game);
  return {envelope,progress};
}
async function resumeFixture(page,fixture){
  await page.goto('/');
  await page.evaluate(({fixture,key,progressKey})=>{
    localStorage.clear();localStorage.setItem(key,JSON.stringify(fixture.envelope));localStorage.setItem(progressKey,JSON.stringify(fixture.progress));
  },{fixture,key:SAVE,progressKey:PROGRESS});
  await page.reload();await press(page,'#resumeSaved');
}

test('resumed First Watch and current campaign hints are visible without Build and never force a teaching pause',async({page},testInfo)=>{
  test.skip(testInfo.project.name==='desktop','Mobile drawer visibility; actual-app checkpoint parity also runs in Node.');
  for(const id of ['first-watch','roadside-watch']){
    await resumeFixture(page,resumedHintFixture(id));
    await expect(page.locator('#coachingModal')).toBeHidden();await expect(page.locator('#pauseVeil')).toBeHidden();
    await expect(page.locator('#commandDeck')).toBeHidden();await expect(page.locator('#coachNext')).not.toContainText('Paused.');
    await visibleRail(page,testInfo,id+'-resumed',{running:true});
    const time=await page.locator('#time').textContent();await expect(page.locator('#time')).not.toHaveText(time);
    await press(page,'#toggleCoach');await expect(page.locator('#campaignCoach')).toBeHidden();
    await expect(page.locator('#toggleCoach')).toBeVisible();await expect(page.locator('#toggleCoach')).toHaveAccessibleName('Show hints');
    expect(await page.locator('#toggleCoach').evaluate(e=>!!e.closest('#commandDeck'))).toBe(false);
    await press(page,'#toggleCoach');await visibleRail(page,testInfo,id+'-reshown',{running:true});
    await expect(page.locator('#commandDeck')).toBeHidden();
    // A deliberate fresh restart has a different teaching policy than Resume.
    await press(page,'#pause');await press(page,'#restartBattle');await press(page,'#confirmRestart');
    if(id==='roadside-watch'){
      await expect(page.locator('#coachingModal')).toBeHidden();
      await expect(page.locator('#coachResume')).toBeHidden();await frozen(page);
      await finishFirstBuild(page,press);
      await visibleRail(page,testInfo,id+'-fresh-restart',{running:true});
    }else{
      await expect(page.locator('#coachingModal')).toBeVisible();await press(page,'#coachingPlan');
      await expect(page.locator('#commandDeck')).toBeHidden();await visibleRail(page,testInfo,id+'-fresh-restart');await frozen(page);
      await press(page,'#coachResume');
    }
    await expect(page.locator('#time')).not.toHaveText('00:00');await press(page,'#pause');
  }
});

test('completed tutorial replay preserves disabled hints, then explicitly enabled hints leave Build without pausing',async({page},testInfo)=>{
  test.skip(testInfo.project.name==='desktop','Mobile replay hint layout.');
  await resumeFixture(page,resumedHintFixture('first-watch',{completed:true}));
  await expect(page.locator('#coachingModal')).toBeHidden();await expect(page.locator('#app')).not.toHaveClass(/mobile-coaching/);
  await press(page,'#pause');await press(page,'#restartBattle');await press(page,'#confirmRestart');
  await expect(page.locator('#coachingModal')).toBeHidden();await expect(page.locator('#time')).not.toHaveText('00:00');
  await openBuildControls(page);await expect(page.locator('#toggleCoach')).toHaveAccessibleName('Show hints');await press(page,'#toggleCoach');
  await visibleRail(page,testInfo,'completed-replay-enabled',{running:true});await expect(page.locator('#commandDeck')).toBeHidden();
  const time=await page.locator('#time').textContent();await expect(page.locator('#time')).not.toHaveText(time);
});
