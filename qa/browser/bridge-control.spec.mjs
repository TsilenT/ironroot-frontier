// Native Chromium input/layout; no virtual clock or live-game hook. Only the
// separately named synthetic restore case seeds units and control state.
import {expect} from '@playwright/test';
import {Game,MAPS} from '../../dist/engine.js';
import {bridgeIncome,bridgeZones} from '../../dist/bridge-control.js';
import {encodeBattle,decodeBattle} from '../../dist/battle-codec.js';
import {test,press,tapPoint,saved,pause,seedOnce,selectMap,observeCanvas,canvasFrame,expectCamera} from './map-browser-helpers.mjs';
import {openBuildControls} from './shared-build-controls.mjs';
import {inspectPhoneText,settlePhoneViewport} from './phone-text-evidence.mjs';
const SAVE='ironroot.battle.v1',SETTINGS='ironroot.settings.v1';
const earnedKeys=['ironroot.campaign.v1','ironroot.trials.v1','ironroot.history.v1'];
const earned=page=>page.evaluate(keys=>Object.fromEntries(keys.map(k=>[k,localStorage.getItem(k)])),earnedKeys);
const settings=page=>page.evaluate(k=>JSON.parse(localStorage.getItem(k)),SETTINGS);
test.setTimeout(60000);
test.beforeEach(async({page},info)=>{
  if(info.project.name==='narrow-phone')await page.setViewportSize({width:320,height:430});
  await observeCanvas(page);
  // A pending capture can legitimately finish between two host round trips.
  // Latch bounded observations of real paint/status calls without changing
  // simulation, arguments, return values, input, timers or rendering callbacks.
  await page.addInitScript(()=>{
    const evidence=window.__bridgePresentation={};
    const draw=CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText=function(...args){
      if(this.canvas.id==='battle'){
        if(args[0]==='X BLOCKED'&&!evidence.canvasBlocked)evidence.canvasBlocked={text:args[0],font:this.font};
        if(/^E →/.test(args[0])&&!evidence.canvasCapture)evidence.canvasCapture={text:args[0],font:this.font};
      }
      return draw.apply(this,args);
    };
    const observer=new MutationObserver(()=>{
      if(evidence.accessibleCapture&&evidence.accessibleContest)return;
      const text=document.getElementById('bridgeBattleStatus')?.textContent||'';
      if(text.includes('enemy capturing'))evidence.accessibleCapture=text;
      if(text.includes('Road 1: yours, payment stopped'))evidence.accessibleContest=text;
    });
    observer.observe(document,{subtree:true,childList:true,characterData:true});
  });
});
async function skirmish(page){await press(page,'[data-mode="skirmish"]');await expect(page.locator('#skirmishConfig')).toBeVisible();}
async function begin(page){await press(page,'#start');await expect(page.locator('#welcome')).toBeHidden();await expect(page.locator('#pause')).toHaveAttribute('aria-label','Pause game');}
async function capture(page,info,label){await page.screenshot({path:info.outputPath(label+'.png'),fullPage:true});}
async function fit(page,info,label){
  await settlePhoneViewport(page);await expect(page.locator('#viewportModal')).toBeHidden();
  const geometry=await page.evaluate(()=>{
    const box=e=>{const b=e.getBoundingClientRect();return {left:b.left,right:b.right,top:b.top,bottom:b.bottom,width:b.width,height:b.height};};
    const visible=e=>e&&e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden';
    const mobile=document.getElementById('app').classList.contains('protected-mobile');
    const controls=['pause','speed','sound','settings','home','front','minimap','compactBuild'].map(id=>document.getElementById(id)).filter(visible).map(e=>({id:e.id,...box(e),hit:e.contains(document.elementFromPoint(box(e).left+box(e).width/2,box(e).top+box(e).height/2))}));
    const overlaps=(a,b)=>a.left<b.right-.5&&a.right>b.left+.5&&a.top<b.bottom-.5&&a.bottom>b.top+.5;
    return {mobile,viewport:{width:innerWidth,height:innerHeight},world:box(document.getElementById('battle')),controls,collisions:controls.flatMap((a,i)=>controls.slice(i+1).filter(b=>overlaps(a,b)).map(b=>[a.id,b.id])),objectiveOverlap:overlaps(box(document.getElementById('objectiveProgress')),box(document.getElementById('objectiveTime')))};
  });
  expect(geometry.world.height).toBeGreaterThanOrEqual(211.5);expect(geometry.world.width).toBeGreaterThanOrEqual(128);expect(geometry.collisions).toEqual([]);expect(geometry.objectiveOverlap).toBe(false);
  for(const c of geometry.controls){if(geometry.mobile){expect(c.width,c.id).toBeGreaterThanOrEqual(43.5);expect(c.height,c.id).toBeGreaterThanOrEqual(43.5);}expect(c.hit,c.id).toBe(true);expect(c.left).toBeGreaterThanOrEqual(-.5);expect(c.right).toBeLessThanOrEqual(geometry.viewport.width+.5);expect(c.top).toBeGreaterThanOrEqual(-.5);expect(c.bottom).toBeLessThanOrEqual(geometry.viewport.height+.5);}
  const text=await page.evaluate(inspectPhoneText,{selector:geometry.mobile?'#income,#gold,#objectiveProgress,#objectiveTime':'#income,#gold,#phase small',ownerSelector:'.resources,#protectedDock,#phase',minimumFont:10});
  for(const t of text){expect(t.complete,JSON.stringify(t)).toBe(true);expect(t.overflow,t.text).toBe(false);}
  await info.attach(label+'-geometry',{body:JSON.stringify({geometry,text},null,2),contentType:'application/json'});return geometry;
}
async function savedIncome(page,battle){
  const game=Game.restore(battle.game),rate=bridgeIncome(game)[0];
  await expect(page.locator('#income')).toHaveText(`+${game.state.income[0].toFixed(2)} /s`);
  await expect(page.locator('#income')).toHaveAccessibleName(`Total income ${game.state.income[0].toFixed(2)} gold per second, including ${rate.toFixed(2)} from bridges.`);
  expect(game.state.income[0]).toBeCloseTo(5+rate,8);return rate;
}

test('setup defaults off, remembers both choices and keeps active/restarted identity with earned profiles intact',async({page},info)=>{
  await page.goto('/');await skirmish(page);await expect(page.locator('#skirmishBridgeIncome')).not.toBeChecked();
  await expect(page.locator('#skirmishBridgeDescription')).toContainText('0.5 gold/s');await expect(page.locator('#skirmishBridgeDescription')).toContainText('Ownership remains when empty, with no timeout');
  const target=await page.locator('#skirmishBridgeIncome').boundingBox();expect(target.width).toBe(44);expect(target.height).toBe(44);
  await begin(page);const off=await pause(page);expect(off.game.rulesetId).toBe('frontier-air-local-open');expect(off.game.state.bridgeControl).toBeUndefined();await expect(page.locator('#pauseBridgeDetails')).toBeHidden();await press(page,'#saveExit');
  // Existing earned profile data, distinct from the active-game fixture below.
  await page.evaluate(()=>{localStorage.setItem('ironroot.trials.v1',JSON.stringify({shieldbreaker:{completed:true,bestTime:20}}));localStorage.setItem('ironroot.history.v1',JSON.stringify([{won:false,draw:false,challengeId:null,campaignId:null,difficulty:'easy',time:60,kills:0,built:1,date:'2026-11-06T11:00:00.000Z'}]));localStorage.setItem('ironroot.settings.v1',JSON.stringify({sound:false,music:false,sfx:true,volume:.25,reducedMotion:true,quality:'low'}));});
  await page.reload();const before=await earned(page);await skirmish(page);await press(page,'#skirmishBridgeIncome');await expect(page.locator('#skirmishBridgeIncome')).toBeChecked();expect((await settings(page)).skirmishBridgeIncome).toBe(true);
  await page.reload();await skirmish(page);await expect(page.locator('#skirmishBridgeIncome')).toBeChecked();expect(await settings(page)).toMatchObject({sound:false,music:false,sfx:true,volume:.25,reducedMotion:true,quality:'low',skirmishBridgeIncome:true});
  await selectMap(page,'twin-span');await page.locator('#skirmishRules').selectOption('frontier-air-local-timed');await page.locator('#skirmishBridgeIncome').scrollIntoViewIfNeeded();await capture(page,info,'setup-checked');
  await begin(page);const bound=await pause(page);expect(bound.game.rulesetId).toBe('frontier-bridge-timed');expect(bound.game.mapId).toBe('twin-span');expect(bound.game.state.bridgeControl.bridges).toHaveLength(2);
  await press(page,'#saveExit');await press(page,'#skirmishBridgeIncome');expect((await settings(page)).skirmishBridgeIncome).toBe(false);await page.reload();await skirmish(page);await expect(page.locator('#skirmishBridgeIncome')).not.toBeChecked();expect(await earned(page)).toEqual(before);
  await press(page,'#resumeSaved');const resumed=await pause(page);expect(resumed.game.rulesetId).toBe('frontier-bridge-timed');expect(resumed.game.mapId).toBe('twin-span');
  await press(page,'#restartBattle');await press(page,'#confirmRestart');await expect(page.locator('#welcome')).toBeHidden();const restart=await pause(page);expect(restart.game.rulesetId).toBe('frontier-bridge-timed');expect(restart.game.mapId).toBe('twin-span');expect(restart.game.state.bridgeControl.bridges.every(b=>b.owner===null)).toBe(true);expect(restart.game.state.bridgeControl.earned).toEqual([0,0]);
  await press(page,'#saveExit');await press(page,'[data-mode="campaign"]');await expect(page.locator('#skirmishBridgeIncome')).toBeHidden();await press(page,'[data-mode="challenges"]');await expect(page.locator('#skirmishBridgeIncome')).toBeHidden();expect(await earned(page)).toEqual(before);expect((await settings(page)).skirmishBridgeIncome).toBe(false);
});

test('native paid forward barracks captures, pays while empty, restores ownership, and fits with drawer/options/Back',async({page},info)=>{
  await page.goto('/');await skirmish(page);await press(page,'#skirmishBridgeIncome');await begin(page);await fit(page,info,'initial');await openBuildControls(page);
  if(await page.locator('#compactBuild').isVisible()){await expect(page.locator('#app')).toHaveClass(/compact-build-open/);for(const card of await page.locator('.build-card').all()){const b=await card.boundingBox();expect(b.width).toBeGreaterThanOrEqual(43.5);expect(b.height).toBeGreaterThanOrEqual(43.5);}await capture(page,info,'drawer');}
  await press(page,'[data-type="barracks"]');const mini=await page.locator('#minimap').boundingBox();await tapPoint(page,{x:mini.x+mini.width/2,y:mini.y+mini.height/2});await expectCamera(page,MAPS.classic,1600);
  const r=await page.locator('#battle').boundingBox(),scale=Math.max(.32,r.height/900),p={x:r.x+r.width/2+(1250-1600)*scale,y:r.y+r.height/2+(260-450)*scale};expect(await page.evaluate(p=>document.elementFromPoint(p.x,p.y)?.id,p)).toBe('battle');
  await page.locator('#battle').evaluate(e=>e.addEventListener('pointerup',event=>{window.__bridgePaidInput={trusted:event.isTrusted,type:event.pointerType};},{once:true,passive:true}));await tapPoint(page,p);await expect(page.locator('#toast')).toContainText('Barracks raised');expect((await page.evaluate(()=>window.__bridgePaidInput)).trusted).toBe(true);await expect(page.locator('#app')).not.toHaveClass(/compact-build-open/);await expect(page.locator('#battle')).not.toHaveClass(/placing/);
  await expect(page.locator('#bridgeBattleStatus')).toContainText('Road 1: yours',{timeout:15000});await expect(page.locator('#income')).toHaveAccessibleName(/including 0.17 from bridges/);await expect(page.locator('#bridgeBattleStatus')).toHaveAttribute('aria-live','off');await expect(page.locator('#minimap')).toHaveAttribute('aria-describedby','bridgeBattleStatus');
  await page.waitForTimeout(2500);await fit(page,info,'owned');await capture(page,info,'bridge-owned');const observed=await canvasFrame(page);expect(observed.battle.text.some(t=>t.text==='1 YOU')).toBe(true);
  const held=await pause(page),s=held.game.state;expect(s.buildings.some(b=>b.side===0&&b.type==='barracks'&&b.x===1250&&b.y===260)).toBe(true);expect(s.stats.built[0]).toBe(2);expect(s.bridgeControl.bridges[0].owner).toBe(0);expect(s.bridgeControl.earned[0]).toBeGreaterThan(0);
  const zone=bridgeZones(MAPS.classic)[0];expect(s.units.filter(u=>u.hp>0&&Math.abs(u.x-zone.x)<=zone.width/2&&Math.abs(u.y-zone.y)<=zone.height/2)).toHaveLength(0);expect(s.gold[0]).toBeCloseTo(420-140+5*s.time+2*s.stats.kills[0]+s.bridgeControl.earned[0],7);
  await savedIncome(page,held);await press(page,'#pauseBridgeDetails > summary');await expect(page.locator('#pauseBridgeRules')).toContainText('Flyers deny but cannot capture');await capture(page,info,'pause-rules');await press(page,'#pauseSettings');await expect(page.locator('#settingsModal')).toBeVisible();await page.evaluate(()=>history.back());await expect(page.locator('#settingsModal')).toBeHidden();await expect(page.locator('#pauseVeil')).toBeVisible();expect(await saved(page)).toEqual(held);
  await page.waitForTimeout(350);expect(await saved(page)).toEqual(held);await press(page,'#saveExit');await page.reload();expect(await saved(page)).toEqual(held);await press(page,'#resumeSaved');await expect(page.locator('#bridgeBattleStatus')).toContainText('Road 1: yours');await fit(page,info,'restored');await page.waitForTimeout(250);
  const restored=await pause(page);expect(restored.game.state.bridgeControl.bridges[0].owner).toBe(0);expect(restored.game.state.bridgeControl.earned[0]).toBeGreaterThan(s.bridgeControl.earned[0]);expect(restored.game.rulesetId).toBe(held.game.rulesetId);await info.attach('paid-save',{body:JSON.stringify({held,restored},null,2),contentType:'application/json'});
  await press(page,'#resume');await page.evaluate(()=>history.back());await expect(page.locator('#pauseVeil')).toBeVisible();await expect(page.locator('#viewportModal')).toBeHidden();
});

function contestedFixture(mapId){
  const g=new Game({rulesetId:'frontier-bridge-open',mapId,ai:false,seed:62001});
  const add=(type,side,lane,x)=>{g._spawn({type,side,lane,x,level:1});const u=g.state.units.at(-1);u.x=x;u.y=g.map.lanes[lane];u.cooldown=1;return u;};
  add('barracks',0,0,g.map.width/2-30);add('aerie',1,0,g.map.width/2+50);add('wardenLodge',1,1,g.map.width/2+30);g.state.time=10;g.tick=200;g.state.bridgeControl.bridges[0]={owner:0,capturing:null,progress:0};g.state.bridgeControl.bridges[1]={owner:0,capturing:1,progress:1};
  const envelope=encodeBattle(g);decodeBattle(envelope);return envelope;
}
test('synthetic restored contest and pending ground takeover display non-color state',async({page},info)=>{
  const mapId=['phone','landscape'].includes(info.project.name)?'twin-span':'long-march',fixture=contestedFixture(mapId);await seedOnce(page,{[SAVE]:JSON.stringify(fixture),[SETTINGS]:JSON.stringify({skirmishBridgeIncome:false})});await press(page,'#resumeSaved');await press(page,'#front');
  await expect.poll(()=>page.evaluate(()=>window.__bridgePresentation.accessibleContest)).toContain('Road 1: yours, payment stopped');
  await expect.poll(()=>page.evaluate(()=>window.__bridgePresentation.accessibleCapture)).toContain('enemy capturing');
  const evidence=await page.evaluate(()=>window.__bridgePresentation);expect(evidence.canvasBlocked.text).toBe('X BLOCKED');expect(evidence.canvasCapture.text).toMatch(/^E →/);await info.attach('observed-capture-presentation',{body:JSON.stringify(evidence,null,2),contentType:'application/json'});
  await capture(page,info,'contested-capturing');await fit(page,info,'contest');await expect(page.locator('#bridgeBattleStatus')).toContainText('Road 2: enemy owned',{timeout:4000});
  const state=await pause(page);expect(state.game.mapId).toBe(mapId);expect(state.game.state.bridgeControl.bridges[0].owner).toBe(0);expect(state.game.state.bridgeControl.bridges[1].owner).toBe(1);expect(state.game.state.bridgeControl.earned[0]).toBe(0);expect(state.game.state.bridgeControl.earned[1]).toBeGreaterThan(0);await savedIncome(page,state);await press(page,'#saveExit');await page.reload();await press(page,'#resumeSaved');await expect(page.locator('#bridgeBattleStatus')).toContainText('Road 2: enemy owned');await pause(page);await info.attach('synthetic-contest-save',{body:JSON.stringify(state,null,2),contentType:'application/json'});
});
