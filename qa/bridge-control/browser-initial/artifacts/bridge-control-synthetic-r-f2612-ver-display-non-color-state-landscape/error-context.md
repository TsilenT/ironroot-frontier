# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: bridge-control.spec.mjs >> synthetic restored contest and pending ground takeover display non-color state
- Location: bridge-control.spec.mjs:81:1

# Error details

```
Error: {"text":"+5.00 /s","expectedText":"+5.00/s","visibleText":"","complete":false,"characters":[{"character":"+","visible":false,"reasons":["undersized"]},{"character":"5","visible":false,"reasons":["undersized"]},{"character":".","visible":false,"reasons":["undersized"]},{"character":"0","visible":false,"reasons":["undersized"]},{"character":"0","visible":false,"reasons":["undersized"]},{"character":"/","visible":false,"reasons":["undersized"]},{"character":"s","visible":false,"reasons":["undersized"]}],"rects":[{"left":630.015625,"top":19,"right":633.875,"bottom":28,"width":3.859375,"height":9},{"left":633.859375,"top":19,"right":638.109375,"bottom":28,"width":4.25,"height":9},{"left":638.09375,"top":19,"right":639.296875,"bottom":28,"width":1.203125,"height":9},{"left":639.28125,"top":19,"right":643.890625,"bottom":28,"width":4.609375,"height":9},{"left":643.875,"top":19,"right":648.46875,"bottom":28,"width":4.59375,"height":9},{"left":650.34375,"top":19,"right":652.90625,"bottom":28,"width":2.5625,"height":9},{"left":652.890625,"top":19,"right":656.46875,"bottom":28,"width":3.578125,"height":9}],"overflow":false}

expect(received).toBe(expected) // Object.is equality

Expected: true
Received: false
```

# Page snapshot

```yaml
- generic [ref=f1e1]:
  - generic [ref=f1e2]:
    - banner [ref=f1e3]:
      - generic [ref=f1e4]:
        - generic [ref=f1e5]:
          - generic [ref=f1e6]: ◆
          - generic [ref=f1e7]: "428"
          - generic "Total income 5.00 gold per second, including 0.00 from bridges." [ref=f1e8]: +5.00 /s
        - generic [ref=f1e9]:
          - generic [ref=f1e10]: ⚑
          - generic "2 / 70 army capacity" [ref=f1e11]: "2"
          - generic [ref=f1e12]: ARMY
        - generic [ref=f1e13]:
          - generic [ref=f1e14]: 00:11
          - generic [ref=f1e15]: BATTLE TIME
      - generic:
        - generic:
          - generic: YOUR CITADEL
          - generic: 100%
        - generic:
          - text: TWIN SPAN
          - generic: TWO LANES · 16 SITES
        - generic:
          - generic: ENEMY CITADEL
          - generic: 100%
    - main [ref=f1e16]:
      - 'generic "Battlefield. Choose a building, then a green build slot to place it once. Hold Shift with a mouse click to keep building. Drag or middle mouse drag to explore. Right-click or Escape cancels placement. Pan left: Left arrow. Pan right: Right arrow. Battle keyboard controls are in Options." [ref=f1e17]'
      - status [ref=f1e18]
      - status: Battle resumed.
      - paragraph [ref=f1e19]: "Road 1: yours, payment stopped. Road 2: enemy owned, earning"
    - generic [ref=f1e20]:
      - region "Mission objectives":
        - generic: NORMAL · SKIRMISH
        - generic: Bridges +0.00 /s
        - generic: You 1 · Enemy 1
        - button "Open building controls" [ref=f1e21] [cursor=pointer]: Build
    - navigation "Battle controls" [ref=f1e22]:
      - generic [ref=f1e23]:
        - button "Pause game" [ref=f1e24] [cursor=pointer]
        - button "Change battle speed" [ref=f1e28] [cursor=pointer]: 1×
        - button "Mute audio" [ref=f1e29] [cursor=pointer]: ♫
        - button "Open options" [ref=f1e30] [cursor=pointer]: ⚙
      - generic [ref=f1e31]:
        - button "Go to your base" [ref=f1e32] [cursor=pointer]: ⌂
        - generic "Map overview. Tap to move the camera." [ref=f1e33] [cursor=pointer]
        - button "Follow the frontline" [active] [ref=f1e34] [cursor=pointer]: ⚔
  - text: ▸
```

# Test source

```ts
  1  | // Native Chromium input/layout; no virtual clock or live-game hook. Only the
  2  | // separately named synthetic restore case seeds units and control state.
  3  | import {expect} from '@playwright/test';
  4  | import {Game,MAPS} from '../../dist/engine.js';
  5  | import {bridgeIncome,bridgeZones} from '../../dist/bridge-control.js';
  6  | import {encodeBattle,decodeBattle} from '../../dist/battle-codec.js';
  7  | import {test,press,tapPoint,saved,pause,seedOnce,selectMap,observeCanvas,canvasFrame,expectCamera} from './map-browser-helpers.mjs';
  8  | import {openBuildControls} from './shared-build-controls.mjs';
  9  | import {inspectPhoneText,settlePhoneViewport} from './phone-text-evidence.mjs';
  10 | const SAVE='ironroot.battle.v1',SETTINGS='ironroot.settings.v1';
  11 | const earnedKeys=['ironroot.campaign.v1','ironroot.trials.v1','ironroot.history.v1'];
  12 | const earned=page=>page.evaluate(keys=>Object.fromEntries(keys.map(k=>[k,localStorage.getItem(k)])),earnedKeys);
  13 | const settings=page=>page.evaluate(k=>JSON.parse(localStorage.getItem(k)),SETTINGS);
  14 | test.setTimeout(60000);
  15 | test.beforeEach(async({page},info)=>{if(info.project.name==='narrow-phone')await page.setViewportSize({width:320,height:430});await observeCanvas(page);});
  16 | async function skirmish(page){await press(page,'[data-mode="skirmish"]');await expect(page.locator('#skirmishConfig')).toBeVisible();}
  17 | async function begin(page){await press(page,'#start');await expect(page.locator('#welcome')).toBeHidden();await expect(page.locator('#pause')).toHaveAttribute('aria-label','Pause game');}
  18 | async function capture(page,info,label){await page.screenshot({path:info.outputPath(label+'.png'),fullPage:true});}
  19 | async function fit(page,info,label){
  20 |   await settlePhoneViewport(page);await expect(page.locator('#viewportModal')).toBeHidden();
  21 |   const geometry=await page.evaluate(()=>{
  22 |     const box=e=>{const b=e.getBoundingClientRect();return {left:b.left,right:b.right,top:b.top,bottom:b.bottom,width:b.width,height:b.height};};
  23 |     const visible=e=>e&&e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden';
  24 |     const mobile=document.getElementById('app').classList.contains('protected-mobile');
  25 |     const controls=['pause','speed','sound','settings','home','front','minimap','compactBuild'].map(id=>document.getElementById(id)).filter(visible).map(e=>({id:e.id,...box(e),hit:e.contains(document.elementFromPoint(box(e).left+box(e).width/2,box(e).top+box(e).height/2))}));
  26 |     const overlaps=(a,b)=>a.left<b.right-.5&&a.right>b.left+.5&&a.top<b.bottom-.5&&a.bottom>b.top+.5;
  27 |     return {mobile,viewport:{width:innerWidth,height:innerHeight},world:box(document.getElementById('battle')),controls,collisions:controls.flatMap((a,i)=>controls.slice(i+1).filter(b=>overlaps(a,b)).map(b=>[a.id,b.id])),objectiveOverlap:overlaps(box(document.getElementById('objectiveProgress')),box(document.getElementById('objectiveTime')))};
  28 |   });
  29 |   expect(geometry.world.height).toBeGreaterThanOrEqual(211.5);expect(geometry.world.width).toBeGreaterThanOrEqual(128);expect(geometry.collisions).toEqual([]);expect(geometry.objectiveOverlap).toBe(false);
  30 |   for(const c of geometry.controls){if(geometry.mobile){expect(c.width,c.id).toBeGreaterThanOrEqual(43.5);expect(c.height,c.id).toBeGreaterThanOrEqual(43.5);}expect(c.hit,c.id).toBe(true);expect(c.left).toBeGreaterThanOrEqual(-.5);expect(c.right).toBeLessThanOrEqual(geometry.viewport.width+.5);expect(c.top).toBeGreaterThanOrEqual(-.5);expect(c.bottom).toBeLessThanOrEqual(geometry.viewport.height+.5);}
  31 |   const text=await page.evaluate(inspectPhoneText,{selector:geometry.mobile?'#income,#gold,#objectiveProgress,#objectiveTime':'#income,#gold,#phase small',ownerSelector:'.resources,#protectedDock,#phase',minimumFont:10});
> 32 |   for(const t of text){expect(t.complete,JSON.stringify(t)).toBe(true);expect(t.overflow,t.text).toBe(false);}
     |                                                             ^ Error: {"text":"+5.00 /s","expectedText":"+5.00/s","visibleText":"","complete":false,"characters":[{"character":"+","visible":false,"reasons":["undersized"]},{"character":"5","visible":false,"reasons":["undersized"]},{"character":".","visible":false,"reasons":["undersized"]},{"character":"0","visible":false,"reasons":["undersized"]},{"character":"0","visible":false,"reasons":["undersized"]},{"character":"/","visible":false,"reasons":["undersized"]},{"character":"s","visible":false,"reasons":["undersized"]}],"rects":[{"left":630.015625,"top":19,"right":633.875,"bottom":28,"width":3.859375,"height":9},{"left":633.859375,"top":19,"right":638.109375,"bottom":28,"width":4.25,"height":9},{"left":638.09375,"top":19,"right":639.296875,"bottom":28,"width":1.203125,"height":9},{"left":639.28125,"top":19,"right":643.890625,"bottom":28,"width":4.609375,"height":9},{"left":643.875,"top":19,"right":648.46875,"bottom":28,"width":4.59375,"height":9},{"left":650.34375,"top":19,"right":652.90625,"bottom":28,"width":2.5625,"height":9},{"left":652.890625,"top":19,"right":656.46875,"bottom":28,"width":3.578125,"height":9}],"overflow":false}
  33 |   await info.attach(label+'-geometry',{body:JSON.stringify({geometry,text},null,2),contentType:'application/json'});return geometry;
  34 | }
  35 | async function savedIncome(page,battle){
  36 |   const game=Game.restore(battle.game),rate=bridgeIncome(game)[0];
  37 |   await expect(page.locator('#income')).toHaveText(`+${game.state.income[0].toFixed(2)} /s`);
  38 |   await expect(page.locator('#income')).toHaveAccessibleName(`Total income ${game.state.income[0].toFixed(2)} gold per second, including ${rate.toFixed(2)} from bridges.`);
  39 |   expect(game.state.income[0]).toBeCloseTo(5+rate,8);return rate;
  40 | }
  41 | 
  42 | test('setup defaults off, remembers both choices and keeps active/restarted identity with earned profiles intact',async({page},info)=>{
  43 |   await page.goto('/');await skirmish(page);await expect(page.locator('#skirmishBridgeIncome')).not.toBeChecked();
  44 |   await expect(page.locator('#skirmishBridgeDescription')).toContainText('0.5 gold/s');await expect(page.locator('#skirmishBridgeDescription')).toContainText('Ownership remains when empty, with no timeout');
  45 |   const target=await page.locator('#skirmishBridgeIncome').boundingBox();expect(target.width).toBe(44);expect(target.height).toBe(44);
  46 |   await begin(page);const off=await pause(page);expect(off.game.rulesetId).toBe('frontier-air-local-open');expect(off.game.state.bridgeControl).toBeUndefined();await expect(page.locator('#pauseBridgeDetails')).toBeHidden();await press(page,'#saveExit');
  47 |   // Existing earned profile data, distinct from the active-game fixture below.
  48 |   await page.evaluate(()=>{localStorage.setItem('ironroot.trials.v1',JSON.stringify({shieldbreaker:{completed:true,bestTime:20}}));localStorage.setItem('ironroot.history.v1',JSON.stringify([{won:false,draw:false,challengeId:null,campaignId:null,difficulty:'easy',time:60,kills:0,built:1,date:'2026-11-06T11:00:00.000Z'}]));localStorage.setItem('ironroot.settings.v1',JSON.stringify({sound:false,music:false,sfx:true,volume:.25,reducedMotion:true,quality:'low'}));});
  49 |   await page.reload();const before=await earned(page);await skirmish(page);await press(page,'#skirmishBridgeIncome');await expect(page.locator('#skirmishBridgeIncome')).toBeChecked();expect((await settings(page)).skirmishBridgeIncome).toBe(true);
  50 |   await page.reload();await skirmish(page);await expect(page.locator('#skirmishBridgeIncome')).toBeChecked();expect(await settings(page)).toMatchObject({sound:false,music:false,sfx:true,volume:.25,reducedMotion:true,quality:'low',skirmishBridgeIncome:true});
  51 |   await selectMap(page,'twin-span');await page.locator('#skirmishRules').selectOption('frontier-air-local-timed');await page.locator('#skirmishBridgeIncome').scrollIntoViewIfNeeded();await capture(page,info,'setup-checked');
  52 |   await begin(page);const bound=await pause(page);expect(bound.game.rulesetId).toBe('frontier-bridge-timed');expect(bound.game.mapId).toBe('twin-span');expect(bound.game.state.bridgeControl.bridges).toHaveLength(2);
  53 |   await press(page,'#saveExit');await press(page,'#skirmishBridgeIncome');expect((await settings(page)).skirmishBridgeIncome).toBe(false);await page.reload();await skirmish(page);await expect(page.locator('#skirmishBridgeIncome')).not.toBeChecked();expect(await earned(page)).toEqual(before);
  54 |   await press(page,'#resumeSaved');const resumed=await pause(page);expect(resumed.game.rulesetId).toBe('frontier-bridge-timed');expect(resumed.game.mapId).toBe('twin-span');
  55 |   await press(page,'#restartBattle');await press(page,'#confirmRestart');await expect(page.locator('#welcome')).toBeHidden();const restart=await pause(page);expect(restart.game.rulesetId).toBe('frontier-bridge-timed');expect(restart.game.mapId).toBe('twin-span');expect(restart.game.state.bridgeControl.bridges.every(b=>b.owner===null)).toBe(true);expect(restart.game.state.bridgeControl.earned).toEqual([0,0]);
  56 |   await press(page,'#saveExit');await press(page,'[data-mode="campaign"]');await expect(page.locator('#skirmishBridgeIncome')).toBeHidden();await press(page,'[data-mode="challenges"]');await expect(page.locator('#skirmishBridgeIncome')).toBeHidden();expect(await earned(page)).toEqual(before);expect((await settings(page)).skirmishBridgeIncome).toBe(false);
  57 | });
  58 | 
  59 | test('native paid forward barracks captures, pays while empty, restores ownership, and fits with drawer/options/Back',async({page},info)=>{
  60 |   await page.goto('/');await skirmish(page);await press(page,'#skirmishBridgeIncome');await begin(page);await fit(page,info,'initial');await openBuildControls(page);
  61 |   if(await page.locator('#compactBuild').isVisible()){await expect(page.locator('#app')).toHaveClass(/compact-build-open/);for(const card of await page.locator('.build-card').all()){const b=await card.boundingBox();expect(b.width).toBeGreaterThanOrEqual(43.5);expect(b.height).toBeGreaterThanOrEqual(43.5);}await capture(page,info,'drawer');}
  62 |   await press(page,'[data-type="barracks"]');const mini=await page.locator('#minimap').boundingBox();await tapPoint(page,{x:mini.x+mini.width/2,y:mini.y+mini.height/2});await expectCamera(page,MAPS.classic,1600);
  63 |   const r=await page.locator('#battle').boundingBox(),scale=Math.max(.32,r.height/900),p={x:r.x+r.width/2+(1250-1600)*scale,y:r.y+r.height/2+(260-450)*scale};expect(await page.evaluate(p=>document.elementFromPoint(p.x,p.y)?.id,p)).toBe('battle');
  64 |   await page.locator('#battle').evaluate(e=>e.addEventListener('pointerup',event=>{window.__bridgePaidInput={trusted:event.isTrusted,type:event.pointerType};},{once:true,passive:true}));await tapPoint(page,p);await expect(page.locator('#toast')).toContainText('Barracks raised');expect((await page.evaluate(()=>window.__bridgePaidInput)).trusted).toBe(true);await expect(page.locator('#app')).not.toHaveClass(/compact-build-open/);await expect(page.locator('#battle')).not.toHaveClass(/placing/);
  65 |   await expect(page.locator('#bridgeBattleStatus')).toContainText('Road 1: yours',{timeout:15000});await expect(page.locator('#income')).toHaveAccessibleName(/including 0.17 from bridges/);await expect(page.locator('#bridgeBattleStatus')).toHaveAttribute('aria-live','off');await expect(page.locator('#minimap')).toHaveAttribute('aria-describedby','bridgeBattleStatus');
  66 |   await page.waitForTimeout(2500);await fit(page,info,'owned');await capture(page,info,'bridge-owned');const observed=await canvasFrame(page);expect(observed.battle.text.some(t=>t.text==='1 YOU')).toBe(true);
  67 |   const held=await pause(page),s=held.game.state;expect(s.buildings.some(b=>b.side===0&&b.type==='barracks'&&b.x===1250&&b.y===260)).toBe(true);expect(s.stats.built[0]).toBe(2);expect(s.bridgeControl.bridges[0].owner).toBe(0);expect(s.bridgeControl.earned[0]).toBeGreaterThan(0);
  68 |   const zone=bridgeZones(MAPS.classic)[0];expect(s.units.filter(u=>u.hp>0&&Math.abs(u.x-zone.x)<=zone.width/2&&Math.abs(u.y-zone.y)<=zone.height/2)).toHaveLength(0);expect(s.gold[0]).toBeCloseTo(420-140+5*s.time+2*s.stats.kills[0]+s.bridgeControl.earned[0],7);
  69 |   await savedIncome(page,held);await press(page,'#pauseBridgeDetails > summary');await expect(page.locator('#pauseBridgeRules')).toContainText('Flyers deny but cannot capture');await capture(page,info,'pause-rules');await press(page,'#pauseSettings');await expect(page.locator('#settingsModal')).toBeVisible();await page.evaluate(()=>history.back());await expect(page.locator('#settingsModal')).toBeHidden();await expect(page.locator('#pauseVeil')).toBeVisible();expect(await saved(page)).toEqual(held);
  70 |   await page.waitForTimeout(350);expect(await saved(page)).toEqual(held);await press(page,'#saveExit');await page.reload();expect(await saved(page)).toEqual(held);await press(page,'#resumeSaved');await expect(page.locator('#bridgeBattleStatus')).toContainText('Road 1: yours');await fit(page,info,'restored');await page.waitForTimeout(250);
  71 |   const restored=await pause(page);expect(restored.game.state.bridgeControl.bridges[0].owner).toBe(0);expect(restored.game.state.bridgeControl.earned[0]).toBeGreaterThan(s.bridgeControl.earned[0]);expect(restored.game.rulesetId).toBe(held.game.rulesetId);await info.attach('paid-save',{body:JSON.stringify({held,restored},null,2),contentType:'application/json'});
  72 |   await press(page,'#resume');await page.evaluate(()=>history.back());await expect(page.locator('#pauseVeil')).toBeVisible();await expect(page.locator('#viewportModal')).toBeHidden();
  73 | });
  74 | 
  75 | function contestedFixture(mapId){
  76 |   const g=new Game({rulesetId:'frontier-bridge-open',mapId,ai:false,seed:62001});
  77 |   const add=(type,side,lane,x)=>{g._spawn({type,side,lane,x,level:1});const u=g.state.units.at(-1);u.x=x;u.y=g.map.lanes[lane];u.cooldown=1;return u;};
  78 |   add('barracks',0,0,g.map.width/2-30);add('aerie',1,0,g.map.width/2+50);add('wardenLodge',1,1,g.map.width/2+30);g.state.time=10;g.tick=200;g.state.bridgeControl.bridges[0]={owner:0,capturing:null,progress:0};g.state.bridgeControl.bridges[1]={owner:0,capturing:1,progress:1};
  79 |   const envelope=encodeBattle(g);decodeBattle(envelope);return envelope;
  80 | }
  81 | test('synthetic restored contest and pending ground takeover display non-color state',async({page},info)=>{
  82 |   const mapId=['phone','landscape'].includes(info.project.name)?'twin-span':'long-march',fixture=contestedFixture(mapId);await seedOnce(page,{[SAVE]:JSON.stringify(fixture),[SETTINGS]:JSON.stringify({skirmishBridgeIncome:false})});await press(page,'#resumeSaved');await press(page,'#front');await expect(page.locator('#bridgeBattleStatus')).toContainText('Road 1: yours, payment stopped');await expect(page.locator('#bridgeBattleStatus')).toContainText('enemy capturing');
  83 |   const frame=await canvasFrame(page);expect(frame.battle.text.some(t=>t.text==='X BLOCKED')).toBe(true);expect(frame.battle.text.some(t=>t.text.startsWith('E →'))).toBe(true);await capture(page,info,'contested-capturing');await fit(page,info,'contest');await expect(page.locator('#bridgeBattleStatus')).toContainText('Road 2: enemy owned',{timeout:4000});
  84 |   const state=await pause(page);expect(state.game.mapId).toBe(mapId);expect(state.game.state.bridgeControl.bridges[0].owner).toBe(0);expect(state.game.state.bridgeControl.bridges[1].owner).toBe(1);expect(state.game.state.bridgeControl.earned[0]).toBe(0);expect(state.game.state.bridgeControl.earned[1]).toBeGreaterThan(0);await savedIncome(page,state);await press(page,'#saveExit');await page.reload();await press(page,'#resumeSaved');await expect(page.locator('#bridgeBattleStatus')).toContainText('Road 2: enemy owned');await pause(page);await info.attach('synthetic-contest-save',{body:JSON.stringify(state,null,2),contentType:'application/json'});
  85 | });
  86 | 
```