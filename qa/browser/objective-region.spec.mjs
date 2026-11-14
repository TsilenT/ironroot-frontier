import{expect}from'@playwright/test';
import{test,press,seedOnce,canvasFrame,observeCanvas}from'./map-browser-helpers.mjs';
import{createCampaignProgress,getProgressionCampaignOverview,getCampaignLaunchMission}from'../../dist/campaign.js';
import{campaignFixture}from'./campaign-fixtures.mjs';
import{inspectPhoneText,settlePhoneViewport}from'./phone-text-evidence.mjs';
import{objectiveRegionGeometry,readObjectiveText}from'./objective-region-evidence.mjs';
import{heldPointer}from'./training-browser-helpers.mjs';
import{installPad,padButton}from'./synthetic-gamepad-helpers.mjs';
async function launch(page,id='below-the-ramparts'){
 const progress=createCampaignProgress(),missions=getProgressionCampaignOverview(progress).missions,index=missions.findIndex(m=>m.id===id);
 for(const m of missions.slice(0,index))progress.missions[m.id]={completed:true,stars:1,bestTime:120};
 const mission=getCampaignLaunchMission(id,progress);await seedOnce(page,{'ironroot.campaign.v1':JSON.stringify(progress)});
 await press(page,'#campaignStoryNav');await press(page,`[data-chapter="${mission.chapterId}"]`);await press(page,`[data-mission="${id}"]`);await press(page,'#start');
 await expect(page.locator('#welcome')).toBeHidden();await safe(page);
}
async function safe(page){await settlePhoneViewport(page);await expect(page.locator('#viewportModal')).toBeHidden();const g=await page.evaluate(objectiveRegionGeometry);expect(g.shell).toMatchObject({safe:true});expect(g.local).toMatchObject({safe:true});expect(g.world.height).toBeGreaterThanOrEqual(211.5);for(const c of g.controls){expect(c.width,c.id).toBeGreaterThanOrEqual(43.5);expect(c.height,c.id).toBeGreaterThanOrEqual(43.5);expect(c.hit,c.id).toBe(true);}return g;}
function shape(g){return{world:g.world,regions:g.regions,controls:g.controls.map(({hit,...r})=>r)};}
async function stress(page){return page.evaluate(()=>{
 const port=document.getElementById('objectiveContent');
 document.querySelectorAll('[data-protected-id] .protected-name').forEach((e,i)=>e.textContent=`Position ${i+1} `+'W'.repeat(90)+' · 北方 🏰 طريق '.repeat(5));
 const identity=document.getElementById('objectiveIdentity');identity.textContent='A very long mission identity 🏰 '.repeat(12);
 const text=document.createElement('p');text.id='adversarialObjective';text.style.gridColumn='1 / -1';text.style.gridRow='4';text.textContent='Detailed objective '+('capture every original position while keeping the citadel standing. '.repeat(15));port.append(text);
 return{names:[...port.querySelectorAll('.protected-name')].map(e=>e.textContent),detail:text.textContent};
});}
async function firstTargetPoint(page){return page.locator('[data-protected-id]').first().evaluate(e=>{const b=e.getBoundingClientRect(),p=document.getElementById('objectiveContent').getBoundingClientRect();return{x:(Math.max(b.left,p.left)+Math.min(b.right,p.right))/2,y:(Math.max(b.top,p.top)+Math.min(b.bottom,p.bottom))/2};});}
test.beforeEach(async({},info)=>{test.skip(info.project.name!=='phone','explicit native touch viewport matrix');});
for(const size of[{width:320,height:430},{width:320,height:568},{width:568,height:320},{width:844,height:390}])test(`bounded objectives contain and expose long text at ${size.width}x${size.height}`,async({page})=>{
 test.setTimeout(90000);await page.setViewportSize(size);await launch(page);const before=shape(await safe(page));await stress(page);await page.addStyleTag({content:'#objectiveContent .protected-name {font-size:20px;line-height:1.5}'});await safe(page);expect(shape(await safe(page))).toEqual(before);
 const text=await readObjectiveText(page,inspectPhoneText,'#objectiveIdentity,[data-protected-id] .protected-name,#adversarialObjective');expect(text.every(x=>x.complete)).toBe(true);expect(shape(await safe(page))).toEqual(before);
 const clock=await page.locator('#time').textContent();await expect(page.locator('#time')).not.toHaveText(clock,{timeout:6000});
});
test('scrolling owns keys, preserves reading position and keeps native target activation fresh',async({page,context})=>{
 test.setTimeout(45000);await page.setViewportSize({width:320,height:430});await observeCanvas(page);await launch(page);await stress(page);await page.waitForTimeout(80);
 const camera=await page.evaluate(()=>window.__qaCanvas.mini.viewport),port=page.locator('#objectiveContent');await port.focus();await page.keyboard.press('End');await expect.poll(()=>port.evaluate(e=>e.scrollTop)).toBeGreaterThan(100);
 await expect.poll(()=>port.evaluate(async e=>{const start=e.scrollTop;await new Promise(r=>setTimeout(r,100));return e.scrollTop===start;})).toBe(true);
 const position=await port.evaluate(e=>e.scrollTop);await page.waitForTimeout(350);expect(await port.evaluate(e=>e.scrollTop)).toBe(position);
 await page.keyboard.press('Home');await page.waitForTimeout(150);await page.keyboard.press('Space');await expect.poll(()=>port.evaluate(e=>e.scrollTop)).toBeGreaterThan(0);await page.keyboard.press('ArrowRight');await expect(page.locator('#pauseVeil')).toBeHidden();expect(await page.evaluate(()=>window.__qaCanvas.mini.viewport)).toEqual(camera);
 await port.focus();await page.keyboard.press('Home');await page.waitForTimeout(150);
 const point=await firstTargetPoint(page),held=await heldPointer(page,context,point);
 try{await page.locator('[data-protected-id] .protected-name').first().evaluate(e=>e.textContent='Changed '+e.textContent);await held.release();}finally{await held.dispose();}
 await expect(page.locator('#toast')).not.toContainText('Showing');
 await page.locator('[data-protected-id]').first().focus();await page.keyboard.press('Enter');await expect(page.locator('#toast')).toContainText('Showing');await safe(page);
});
test('coached 320x430 keeps the existing field, hint strip and full-size navigation',async({page})=>{
 await page.setViewportSize({width:320,height:430});const fixture=campaignFixture('protected');await seedOnce(page,{'ironroot.battle.v1':JSON.stringify(fixture.envelope),'ironroot.campaign.v1':JSON.stringify(fixture.progress)});await press(page,'#resumeSaved');const before=await safe(page);expect(before.world.width).toBeCloseTo(216,1);expect(before.world.height).toBeCloseTo(278,1);await expect(page.locator('#campaignTeaching')).toBeVisible();await stress(page);expect(shape(await safe(page))).toEqual(shape(before));await expect(page.locator('#toggleCoach')).toBeVisible();
});
test('missing clipping pauses rather than excusing escaped objective paint',async({page})=>{
 await page.setViewportSize({width:320,height:430});await launch(page);const style=await page.addStyleTag({content:'#objectiveContent {overflow:visible!important;contain:none!important}'});await expect(page.locator('#viewportModal')).toBeVisible();await expect(page.locator('#viewportResume')).toBeDisabled();await style.evaluate(e=>e.remove());await expect(page.locator('#viewportResume')).toBeEnabled();await press(page,'#viewportResume');await safe(page);
});
test('gamepad can read a text-only objective port and leave it',async({page})=>{
 await installPad(page);await page.setViewportSize({width:320,height:430});await launch(page,'the-last-engine');await stress(page);await padButton(page,2);await page.locator('#objectiveContent').focus();const before=await page.locator('#objectiveContent').evaluate(e=>e.scrollTop);await padButton(page,13);await expect.poll(()=>page.locator('#objectiveContent').evaluate(e=>e.scrollTop)).toBeGreaterThan(before);await padButton(page,1);await expect(page.locator('#battle')).toBeFocused();await safe(page);
});

test('native drags at scroll boundaries do not activate objectives and a fresh tap works',async({page,context})=>{
 test.setTimeout(40000);await page.setViewportSize({width:320,height:430});await observeCanvas(page);await launch(page);
 const port=page.locator('#objectiveContent'),cdp=await context.newCDPSession(page);
 try{
  const camera=await page.evaluate(()=>window.__qaCanvas.mini.viewport);
  for(const [key,delta]of [['Home',45],['End',-45]]){
   await port.focus();await page.keyboard.press(key);await page.waitForTimeout(100);const point=await firstTargetPoint(page);
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:0,...point}]});
   for(let i=1;i<=5;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{id:0,x:point.x,y:point.y+delta*i/5}]});await page.waitForTimeout(25);}
   await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(80);
   await expect(page.locator('#toast')).not.toContainText('Showing');expect(await page.evaluate(()=>window.__qaCanvas.mini.viewport)).toEqual(camera);await safe(page);
  }
  const point=await firstTargetPoint(page),held=await heldPointer(page,context,point);
  try{await page.waitForTimeout(400);await held.release();}finally{await held.dispose();}
  await expect(page.locator('#toast')).toContainText('Showing North Breach Post');await safe(page);
 }finally{await cdp.detach();}
});

test('additional objective cards stay inside the same slot and remain keyboard reachable',async({page})=>{
 test.setTimeout(40000);await page.setViewportSize({width:320,height:430});await launch(page);const before=shape(await safe(page));
 await page.evaluate(()=>{const list=document.getElementById('protectedTargets');window.__qaExtraObjectiveClicks=[];
  for(let i=4;i<=12;i++){const b=document.createElement('button');b.className='protected-target';b.dataset.protectedId='extra-'+i;
   const n=document.createElement('span');n.className='protected-name';n.textContent='Additional objective '+i;
   const h=document.createElement('span');h.className='protected-health';h.textContent='Standing';b.append(n,h);
   b.addEventListener('click',e=>window.__qaExtraObjectiveClicks.push({id:i,trusted:e.isTrusted}));list.append(b);}
 });
 expect(shape(await safe(page))).toEqual(before);
 const text=await readObjectiveText(page,inspectPhoneText,'[data-protected-id] .protected-name');expect(text).toHaveLength(12);expect(text.every(x=>x.complete)).toBe(true);
 await page.locator('#battle').focus();await page.keyboard.press('Tab');await expect(page.locator('#objectiveContent')).toBeFocused();
 for(let i=0;i<12;i++)await page.keyboard.press('Tab');await expect(page.locator('[data-protected-id="extra-12"]')).toBeFocused();await page.keyboard.press('Enter');
 expect(await page.evaluate(()=>window.__qaExtraObjectiveClicks)).toEqual([{id:12,trusted:true}]);await safe(page);
});

test('optional hidden controls are ignored while required hidden originals still hold safely',async({page})=>{
 await page.setViewportSize({width:320,height:430});await launch(page);
 await page.evaluate(()=>{const port=document.getElementById('objectiveContent');
  const htmlHidden=document.createElement('button');htmlHidden.hidden=true;htmlHidden.textContent='Unused action';port.append(htmlHidden);
  const cssHidden=document.createElement('button');cssHidden.style.display='none';cssHidden.textContent='Not rendered';port.append(cssHidden);
  const details=document.createElement('details');details.style.gridColumn='1 / -1';details.style.gridRow='4';
  const summary=document.createElement('summary');summary.textContent='Optional details';summary.style.cssText='min-height:44px;display:block';
  const action=document.createElement('button');action.className='protected-target';action.textContent='Closed action';details.append(summary,action);port.append(details);
 });await safe(page);
 const hidden=await page.addStyleTag({content:'[data-protected-id]:first-child {display:none!important}'});
 await expect(page.locator('#viewportModal')).toBeVisible();await expect(page.locator('#viewportResume')).toBeDisabled();
 await hidden.evaluate(e=>e.remove());await expect(page.locator('#viewportResume')).toBeEnabled();await press(page,'#viewportResume');await safe(page);
});
