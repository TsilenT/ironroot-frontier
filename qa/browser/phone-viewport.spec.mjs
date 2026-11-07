// Regression contract for the phone-sizing repair. Running these tests uses
// actual Chromium DOM layout and ordinary trusted mouse/touch actions. Viewport
// presets, explicit safe-area variables, and visualViewport replacement below
// are synthetic fixtures, not physical-phone, browser-chrome or iOS/PWA proof.
import {expect} from '@playwright/test';
import {Game} from '../../dist/engine.js';
import {CAMPAIGN_STORAGE_KEY,createCampaignMission,getCampaignTargets} from '../../dist/campaign.js';
import {protectedTargetLabels} from '../../dist/protected-objectives.js';
import {campaignFixture} from './campaign-fixtures.mjs';
import {test,press,tapPoint,seedOnce,saved,pause,homePoint} from './map-browser-helpers.mjs';
import {openBuildControls} from './shared-build-controls.mjs';
import {inspectPhoneText,settlePhoneViewport,savedClockText} from './phone-text-evidence.mjs';
import {heldPointer} from './training-browser-helpers.mjs';
const SAVE='ironroot.battle.v1';
const sizes=[{width:320,height:430},{width:667,height:300},{width:740,height:320},{width:393,height:659},{width:920,height:420}];

async function geometry(page){
 const geometry=await page.evaluate(()=>{
  const rect=e=>{const r=e.getBoundingClientRect();return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height};};
  const vv=window.visualViewport,left=Math.max(0,vv?.offsetLeft||0),top=Math.max(0,vv?.offsetTop||0);
  const viewport={left,top,right:Math.min(innerWidth,left+(vv?.width??innerWidth)),bottom:Math.min(innerHeight,top+(vv?.height??innerHeight))};
  const contains=(outer,r)=>r.left>=outer.left-.5&&r.top>=outer.top-.5&&r.right<=outer.right+.5&&r.bottom<=outer.bottom+.5;
  const overlaps=(a,b)=>a.left<b.right-.5&&a.right>b.left+.5&&a.top<b.bottom-.5&&a.bottom>b.top+.5;
  const world=rect(document.getElementById('battle'));
  const elements=[...['pause','speed','rally','settings','home','front','minimap','compactBuild'].map(id=>document.getElementById(id)),...document.querySelectorAll('[data-protected-id]')];
  const controls=elements.map(e=>({id:e.id||e.dataset.protectedId,...rect(e),hit:e.contains(document.elementFromPoint(...[rect(e).left+rect(e).width/2,rect(e).top+rect(e).height/2]))}));
  const root=rect(document.getElementById('app'));
  const objectiveOverlap=overlaps(rect(document.getElementById('objectiveProgress')),rect(document.getElementById('objectiveTime')));
  return {viewport,root,world,controls,objectiveOverlap,regions:['topbar','protectedDock','protectedNavigation'].map(id=>({id,...rect(document.getElementById(id))})),
   allInside:controls.every(r=>contains(viewport,r))&&contains(viewport,world),outsideWorld:controls.every(r=>!overlaps(r,world)),
   collisions:controls.flatMap((a,i)=>controls.slice(i+1).filter(b=>overlaps(a,b)).map(b=>[a.id,b.id]))};
 });
 geometry.text=await page.evaluate(inspectPhoneText,{selector:'[data-protected-id] .protected-name,[data-protected-id] .protected-health,#gold,#time,#objectiveProgress,#objectiveTime'});
 return geometry;
}
async function expectGeometry(page,{protectedCount=0}={}){
 await settlePhoneViewport(page);await expect(page.locator('#viewportModal')).toBeHidden();
 const g=await geometry(page);
 expect(g.root.left).toBeCloseTo(g.viewport.left,1);expect(g.root.top).toBeCloseTo(g.viewport.top,1);
 expect(g.root.right).toBeCloseTo(g.viewport.right,1);expect(g.root.bottom).toBeCloseTo(g.viewport.bottom,1);
 expect(g.world.height).toBeGreaterThanOrEqual(211.5);expect(g.world.width).toBeGreaterThanOrEqual(128);
 expect(g.controls).toHaveLength(8+protectedCount);expect(g.allInside).toBe(true);expect(g.outsideWorld).toBe(true);expect(g.collisions).toEqual([]);
 for(const r of g.regions){expect(r.left).toBeGreaterThanOrEqual(g.viewport.left-.5);expect(r.top).toBeGreaterThanOrEqual(g.viewport.top-.5);expect(r.right).toBeLessThanOrEqual(g.viewport.right+.5);expect(r.bottom).toBeLessThanOrEqual(g.viewport.bottom+.5);}
 for(const c of g.controls){expect(c.width,c.id).toBeGreaterThanOrEqual(43.5);expect(c.height,c.id).toBeGreaterThanOrEqual(43.5);expect(c.hit,c.id+' actual center hit').toBe(true);}
 expect(g.objectiveOverlap,'objective progress and time must occupy separate cells').toBe(false);
 expect(g.text).toHaveLength(protectedCount*2+4);
 for(const t of g.text){expect(t.text.trim()).not.toBe('');expect(t.complete,JSON.stringify(t)).toBe(true);expect(t.visibleText,t.text+' full visible text including nested spans').toBe(t.expectedText);expect(t.overflow,t.text+' is not horizontally clipped').toBe(false);}
 return g;
}
async function startSkirmish(page){
 await page.goto('/');await press(page,'[data-mode="skirmish"]');await page.locator('#skirmishRules').selectOption('frontier-air-local-open');await press(page,'#start');
 await expect(page.locator('#welcome')).toBeHidden();await expect(page.locator('#pause')).toHaveAttribute('aria-label','Pause game');
}
async function waitForClock(page,previous='00:00'){
 await expect(page.locator('#time')).not.toHaveText(previous,{timeout:6000});
}

for(const size of sizes)test(`phone ${size.width}x${size.height}: clock, paid build, save and reload resume use real UI`,async({page})=>{
 test.setTimeout(45000);await page.setViewportSize(size);await startSkirmish(page);await expectGeometry(page);await waitForClock(page);
 await openBuildControls(page);await press(page,'[data-type="wardenLodge"]');
 const map=Game.restore((await saved(page)).game).map;await tapPoint(page,await homePoint(page,map,550,450));
 await expect(page.locator('#toast')).toContainText('Warden lodge raised');
 const state=await pause(page);
 expect(state.game.state.time).toBeGreaterThan(0);expect(state.game.state.buildings.filter(b=>b.side===0&&b.type==='wardenLodge')).toHaveLength(1);
 expect(state.game.state.gold[0]).toBeCloseTo(420-210+5*state.game.state.time,1);
 expect(state).toMatchObject({version:3,scenario:{kind:'skirmish',id:'standard',revision:1},game:{rulesetId:'frontier-air-local-open'}});
 const stopped=savedClockText(state);await expect(page.locator('#time')).toHaveText(stopped);await page.waitForTimeout(1100);expect(await saved(page)).toEqual(state);await expect(page.locator('#time')).toHaveText(stopped);
 await press(page,'#saveExit');await page.reload();expect(await saved(page)).toEqual(state);
 await press(page,'#resumeSaved');await expectGeometry(page);await waitForClock(page,stopped);const resumed=await pause(page);
 expect(resumed.game.state.time).toBeGreaterThan(state.game.state.time);expect(resumed.scenario).toEqual(state.scenario);
 expect(resumed.game.rulesetId).toBe(state.game.rulesetId);expect(resumed.game.state.buildings.filter(b=>b.side===0&&b.type==='wardenLodge')).toHaveLength(1);
 expect(resumed.game.state.stats.built[0]).toBe(state.game.state.stats.built[0]);
});

for(const size of sizes)test(`phone ${size.width}x${size.height}: protected names, health and all hit targets remain visible`,async({page})=>{
 test.setTimeout(30000);await page.setViewportSize(size);const fixture=campaignFixture('protected');
 await seedOnce(page,{[SAVE]:JSON.stringify(fixture.envelope),[CAMPAIGN_STORAGE_KEY]:JSON.stringify(fixture.progress)});await press(page,'#resumeSaved');
 await expectGeometry(page,{protectedCount:2});await waitForClock(page);
 for(const target of await page.locator('[data-protected-id]').all()){
  await expect(target.locator('.protected-name')).not.toHaveText('');await expect(target.locator('.protected-health')).toContainText('HP');
  if(await page.evaluate(()=>navigator.maxTouchPoints>0))await target.tap();else await target.click();
  await expect(page.locator('#toast')).toContainText('Showing');
 }
 await press(page,'#compactBuild');await expect(page.locator('#app')).toHaveClass(/compact-build-open/);await press(page,'#compactBuild');
 await expectGeometry(page,{protectedCount:2});const state=await pause(page);expect(state.game.state.stats.built[0]).toBe(fixture.envelope.game.state.stats.built[0]);
 expect(state.game.state.time).toBeGreaterThan(fixture.envelope.game.state.time);expect(state.scenario).toEqual(fixture.envelope.scenario);
});

test('protected critical-health text remains unclipped across repaired phone sizes',async({page})=>{
 test.setTimeout(30000);const fixture=campaignFixture('protected');
 // Valid synthetic damage setup, not a claimed played outcome. Real HUD code
 // must render the longest live health status without clipping original names.
 for(const building of fixture.envelope.game.state.buildings.filter(b=>b.side===0))building.hp=building.maxHp*.2;
 await page.setViewportSize(sizes[0]);await seedOnce(page,{[SAVE]:JSON.stringify(fixture.envelope),[CAMPAIGN_STORAGE_KEY]:JSON.stringify(fixture.progress)});await press(page,'#resumeSaved');
 for(const size of sizes){await page.setViewportSize(size);await expect(page.locator('[data-protected-id][data-state="critical"]')).toHaveCount(2);await expectGeometry(page,{protectedCount:2});}
});

test('render-only longest protected names and critical/missing labels stay inside their targets',async({page})=>{
 test.setTimeout(30000);await page.setViewportSize(sizes[0]);const fixture=campaignFixture('protected');
 const authored=createCampaignMission('last-light'),names=protectedTargetLabels(getCampaignTargets(authored,'last-light').filter(t=>t.kind==='protect'),authored.map.lanes.length);
 expect(names).toEqual(['North watchtower','South watchtower']);
 await seedOnce(page,{[SAVE]:JSON.stringify(fixture.envelope),[CAMPAIGN_STORAGE_KEY]:JSON.stringify(fixture.progress)});await press(page,'#resumeSaved');const state=await pause(page);
 for(const size of sizes){
  await page.setViewportSize(size);await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  // Clone the actual mounted app markup and stylesheet into an isolated frame.
  // No app module runs there. The explicit critical/missing DOM mutation below is a
  // CSS/text regression fixture, not an observed battle loss or gameplay claim.
  await page.evaluate(size=>{
   const frame=document.createElement('iframe');frame.dataset.qaLostRender='true';frame.setAttribute('title','Render-only missing-original text fixture');
   frame.style.cssText=`position:fixed;left:0;top:0;width:${size.width}px;height:${size.height}px;border:0;z-index:10000;pointer-events:none;`;
   frame.srcdoc='<!doctype html><html><head><base href="'+location.origin+'/"><link rel="stylesheet" href="styles.css"></head><body>'+document.getElementById('app').outerHTML+'</body></html>';
   document.body.append(frame);
  },size);
  const handle=await page.locator('iframe[data-qa-lost-render]').elementHandle(),frame=await handle.contentFrame();expect(frame).not.toBeNull();
  await frame.waitForFunction(()=>document.querySelector('link[rel=stylesheet]')?.sheet&&document.querySelectorAll('[data-protected-id]').length===2);
  await frame.evaluate(()=>document.fonts.ready);
  expect(await frame.locator('script').count()).toBe(0);
  for(const status of ['lost','critical']){
   await frame.evaluate(({status,names})=>{
    for(const [i,button] of [...document.querySelectorAll('[data-protected-id]')].entries()){
     button.dataset.state=status;button.disabled=status==='lost';button.querySelector('.protected-name').textContent=names[i];
     const health=button.querySelector('.protected-health');health.textContent=status==='lost'?'Original missing':'20% HP · ';
     if(status==='critical'){const nested=document.createElement('span');nested.style.font='inherit';nested.style.color='inherit';nested.textContent='Critical';health.append(nested);}
    }
   },{status,names});
   const labels=await frame.evaluate(inspectPhoneText,{selector:'[data-protected-id] .protected-name,[data-protected-id] .protected-health'});
   expect(labels).toHaveLength(4);
   for(const [i,label] of labels.entries()){
    const expected=i%2===0?names[Math.floor(i/2)]:status==='lost'?'Original missing':'20% HP · Critical';
    expect(label.text).toBe(expected);expect(label.complete,`${size.width}x${size.height} ${status}: ${JSON.stringify(label)}`).toBe(true);
    expect(label.visibleText).toBe(expected.replace(/\s/gu,''));expect(label.overflow,label.text).toBe(false);
   }
   for(let i=0;i<labels.length;i+=2)expect(labels[i].rects.some(a=>labels[i+1].rects.some(b=>a.left<b.right-.5&&a.right>b.left+.5&&a.top<b.bottom-.5&&a.bottom>b.top+.5)),'name and complete status text do not overlap').toBe(false);
   for(const target of await frame.locator('[data-protected-id]').all()){
    await expect(target).toHaveAttribute('data-state',status);if(status==='lost')await expect(target).toBeDisabled();else await expect(target).toBeEnabled();
   }
  }
  await page.locator('iframe[data-qa-lost-render]').evaluate(frame=>frame.remove());
 }
 expect(await saved(page),'render-only lost labels cannot alter the real saved battle').toEqual(state);
});

async function installSyntheticVisualViewport(page){
 await page.addInitScript(()=>{
  const synthetic=new EventTarget(),state={width:390,height:650,offsetLeft:0,offsetTop:0,scale:1};
  for(const key of Object.keys(state))Object.defineProperty(synthetic,key,{get:()=>state[key]});
  Object.defineProperty(window,'visualViewport',{configurable:true,value:synthetic});
  window.__qaSetSyntheticVisibleViewport=next=>{Object.assign(state,next);synthetic.dispatchEvent(new Event('resize'));synthetic.dispatchEvent(new Event('scroll'));};
 });
}
async function syntheticViewport(page,values){
 await page.evaluate(values=>window.__qaSetSyntheticVisibleViewport(values),values);
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
}

test('synthetic visualViewport: original clip50/offset1, fractional bounds and safe fit preserve real play',async({page,context})=>{
 test.setTimeout(45000);await page.setViewportSize({width:390,height:650});await installSyntheticVisualViewport(page);await startSkirmish(page);
 for(const values of [{height:600},{height:649,offsetTop:1},{height:600,offsetTop:10},{width:389.333333333,height:599.222222222,offsetLeft:.333333333,offsetTop:1.111111111}]){
  const oldClock=await page.locator('#time').textContent();await syntheticViewport(page,values);await expectGeometry(page);await waitForClock(page,oldClock);
 }
 // A pressed placement cannot be reinterpreted in the new canvas rectangle.
 // Its fresh replacement must work after fractional serialization stabilizes.
 const baseline=await pause(page),ownedIds=game=>game.state.buildings.filter(b=>b.side===0).map(b=>b.id).sort((a,b)=>a-b);
 await press(page,'#resume');await openBuildControls(page);await press(page,'[data-type="wardenLodge"]');
 const map=Game.restore(baseline.game).map,point=await homePoint(page,map,550,450),held=await heldPointer(page,context,point);
 try{await syntheticViewport(page,{offsetTop:2.111111111});await held.release();}finally{await held.dispose();}
 const unchanged=await pause(page);expect(unchanged.game.state.stats.built[0]).toBe(baseline.game.state.stats.built[0]);
 expect(ownedIds(unchanged.game)).toEqual(ownedIds(baseline.game));
 expect(unchanged.game.state.gold[0]).toBeCloseTo(baseline.game.state.gold[0]+5*(unchanged.game.state.time-baseline.game.state.time),1);
 await press(page,'#resume');await openBuildControls(page);await press(page,'[data-type="wardenLodge"]');
 await tapPoint(page,await homePoint(page,map,550,450));await expect(page.locator('#toast')).toContainText('Warden lodge raised');
 const placed=await pause(page);expect(placed.game.state.stats.built[0]).toBe(baseline.game.state.stats.built[0]+1);
 expect(ownedIds(placed.game).filter(id=>!ownedIds(baseline.game).includes(id))).toHaveLength(1);
 expect(placed.game.state.buildings.filter(b=>b.side===0&&b.type==='wardenLodge')).toHaveLength(baseline.game.state.buildings.filter(b=>b.side===0&&b.type==='wardenLodge').length+1);
 expect(placed.game.state.gold[0]).toBeCloseTo(unchanged.game.state.gold[0]-210+5*(placed.game.state.time-unchanged.game.state.time),1);
});

test('synthetic pinch-small viewport still freezes and saves until an explicit safe Resume',async({page})=>{
 test.setTimeout(30000);await page.setViewportSize({width:390,height:650});await installSyntheticVisualViewport(page);await startSkirmish(page);await waitForClock(page);
 await syntheticViewport(page,{width:200,height:300,offsetLeft:90,offsetTop:200,scale:2});
 await expect(page.locator('#viewportTitle')).toHaveText('Battle paused for screen size');await expect(page.locator('#viewportResume')).toBeDisabled();
 const held=await saved(page),clock=savedClockText(held);await expect(page.locator('#time')).toHaveText(clock);await page.waitForTimeout(1100);expect(await saved(page)).toEqual(held);await expect(page.locator('#time')).toHaveText(clock);
 await syntheticViewport(page,{width:390,height:600,offsetLeft:0,offsetTop:1,scale:1});await expect(page.locator('#viewportTitle')).toHaveText('Battle ready to resume');await expect(page.locator('#viewportResume')).toBeEnabled();
 await page.waitForTimeout(1100);expect(await saved(page)).toEqual(held);await expect(page.locator('#time')).toHaveText(clock);
 await press(page,'#viewportResume');await expectGeometry(page);await waitForClock(page,clock);
});

test('synthetic safe-area padding and desktop exit preserve accessible controls without stale root sizing',async({page})=>{
 test.setTimeout(30000);await page.setViewportSize({width:740,height:320});await startSkirmish(page);
 // Explicit CSS custom properties model safe areas. They are not evidence of
 // actual OS/PWA env() values; that remains a native-device acceptance gate.
 await page.addStyleTag({content:'.app.protected-mobile { --mobile-inset-top: 10px; --mobile-inset-bottom: 21px; --mobile-inset-left: 44px; --mobile-inset-right: 44px; }'});
 const g=await expectGeometry(page);for(const r of [g.world,...g.controls,...g.regions]){expect(r.left).toBeGreaterThanOrEqual(43.5);expect(r.right).toBeLessThanOrEqual(696.5);expect(r.top).toBeGreaterThanOrEqual(9.5);expect(r.bottom).toBeLessThanOrEqual(299.5);}
 await page.setViewportSize({width:1180,height:757});await expect(page.locator('#app')).not.toHaveClass(/protected-mobile/);
 expect(await page.locator('#app').evaluate(e=>['left','top','width','height'].map(k=>e.style[k]))).toEqual(['','','','']);
 const previous=await page.locator('#time').textContent();await waitForClock(page,previous);await page.setViewportSize({width:740,height:320});await expectGeometry(page);
});


test('synthetic bottom safe area blocks protected grid overflow and requires explicit recovery',async({page})=>{
 test.setTimeout(30000);await page.setViewportSize({width:568,height:300});const fixture=campaignFixture('protected');
 await seedOnce(page,{[SAVE]:JSON.stringify(fixture.envelope),[CAMPAIGN_STORAGE_KEY]:JSON.stringify(fixture.progress)});await press(page,'#resumeSaved');await expectGeometry(page,{protectedCount:2});
 await page.addStyleTag({content:'.app.protected-mobile { --mobile-inset-bottom: 21px; }'});await page.setViewportSize({width:568,height:280});
 await expect(page.locator('#viewportTitle')).toHaveText('Battle paused for screen size');await expect(page.locator('#viewportResume')).toBeDisabled();
 const bounds=await page.evaluate(()=>{const app=document.getElementById('app').getBoundingClientRect(),nav=document.getElementById('protectedNavigation').getBoundingClientRect();return {outer:app.bottom,safe:app.bottom-parseFloat(getComputedStyle(document.getElementById('app')).paddingBottom),navigationBottom:nav.bottom};});
 expect(bounds.navigationBottom).toBeLessThanOrEqual(bounds.outer+.5);expect(bounds.navigationBottom).toBeGreaterThan(bounds.safe+.5);
 const held=await saved(page),clock=savedClockText(held);await expect(page.locator('#time')).toHaveText(clock);
 await page.waitForTimeout(1100);expect(await saved(page)).toEqual(held);await expect(page.locator('#time')).toHaveText(clock);
 await page.setViewportSize({width:568,height:320});await expect(page.locator('#viewportTitle')).toHaveText('Battle ready to resume');await expect(page.locator('#viewportResume')).toBeEnabled();
 expect(await saved(page)).toEqual(held);await expect(page.locator('#time')).toHaveText(clock);
 await press(page,'#viewportResume');await expectGeometry(page,{protectedCount:2});await waitForClock(page,clock);
});
