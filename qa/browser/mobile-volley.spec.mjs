// Real-time layout/pointer cases. Only the isolated cooldown case virtualizes RAFs.
import {expect} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
import {test,press,seedOnce,saved,tapPoint,dragPoint,homePoint} from './map-browser-helpers.mjs';
import {campaignFixture} from './campaign-fixtures.mjs';
import {CAMPAIGN_STORAGE_KEY} from '../../dist/campaign.js';
import {inspectMobileBattlefield} from './mobile-safety-evidence.mjs';
import {inspectPhoneText,settlePhoneViewport} from './phone-text-evidence.mjs';
import {Game,SPELL,getMap} from '../../dist/engine.js';
import {encodeBattle,scenarioForBattle} from '../../dist/battle-codec.js';
const output=new URL('../../docs/mobile-volley-evidence/',import.meta.url);
mkdirSync(output,{recursive:true});
const direct=async(page,id)=>{if(await page.evaluate(()=>navigator.maxTouchPoints>0))await page.locator('#'+id).tap();else await page.locator('#'+id).click();};
const snap=page=>page.evaluate(()=>window.__volleyRead());
async function observe(page){
 await page.evaluate(async()=>{
  const {Game}=await import('/engine.js');const update=Game.prototype.update,serialize=Game.prototype.serialize,cast=Game.prototype.cast;let game;
  Game.prototype.update=function(...a){game=this;return update.apply(this,a);};
  Game.prototype.serialize=function(...a){game=this;return serialize.apply(this,a);};
  window.__volleyCalls=[];window.__volleyRead=()=>serialize.call(game);
  Game.prototype.cast=function(...a){const before=serialize.call(this),result=cast.apply(this,a);window.__volleyCalls.push({args:a,before,result,after:serialize.call(this)});return result;};
 });
}
async function start(page,kind='skirmish'){
 if(kind==='protected'){
  const f=campaignFixture('protected');await seedOnce(page,{'ironroot.battle.v1':JSON.stringify(f.envelope),[CAMPAIGN_STORAGE_KEY]:JSON.stringify(f.progress)});await observe(page);await press(page,'#resumeSaved');
 }else{
  await page.goto('/');await observe(page);
  if(kind==='skirmish')await press(page,'[data-mode="skirmish"]');
  if(kind==='ashen'){await press(page,'[data-mode="challenges"]');await press(page,'#challengeChoices button:has-text("Ashen Crossroads")');}
  await press(page,'#start');
 }
 await settlePhoneViewport(page);await expect(page.locator('#viewportModal')).toBeHidden();
}
function contrast(a,b){
 const lum=c=>{const [r,g,bl]=c.match(/[\d.]+/g).slice(0,3).map(Number).map(n=>n/255).map(n=>n<=.04045?n/12.92:((n+.055)/1.055)**2.4);return .2126*r+.7152*g+.0722*bl;};
 return (Math.max(lum(a),lum(b))+.05)/(Math.min(lum(a),lum(b))+.05);
}
async function geometry(page){
 const mobile=await page.locator('#app').evaluate(e=>e.classList.contains('protected-mobile'));
 const b=page.locator('#rally');await expect(b).toBeVisible();await expect(b).toHaveCount(1);
 const v=await b.evaluate(e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return {width:r.width,height:r.height,parent:e.parentElement.id,background:s.backgroundColor,hit:e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)),text:[...e.querySelectorAll('#rallyName,#rallyGold,#rallyStatus')].map(n=>{const range=document.createRange();range.selectNodeContents(n);const t=range.getBoundingClientRect(),s=getComputedStyle(n);return {text:n.textContent,font:parseFloat(s.fontSize),color:s.color,inside:t.left>=r.left&&t.right<=r.right+.5&&t.top>=r.top-.5&&t.bottom<=r.bottom+.5};})};});
 expect(v.hit).toBe(true);expect(v.parent).toBe(mobile?'battleTools':'deckBody');
 if(mobile){
  expect(v.width).toBe(44);expect(v.height).toBe(44);await expect(page.locator('#sound')).toBeHidden();
  for(const t of v.text){expect(t.inside,JSON.stringify(t)).toBe(true);expect(t.font).toBeGreaterThanOrEqual(12);t.contrast=contrast(t.color,v.background);expect(t.contrast).toBeGreaterThanOrEqual(4.5);}
  const g=await page.evaluate(inspectMobileBattlefield);expect(g.collisions).toEqual([]);expect(g.covered).toBe(false);expect(g.world.height).toBeGreaterThanOrEqual(212);expect(g.world.width).toBeGreaterThanOrEqual(128);
  for(const c of g.controls){expect(c.width,c.id).toBeGreaterThanOrEqual(44);expect(c.height,c.id).toBeGreaterThanOrEqual(44);expect(c.hit,c.id).toBe(true);}
  v.field=g.world;v.controls=g.controls.map(c=>({id:c.id,width:c.width,height:c.height}));
 }else{await expect(page.locator('#sound')).toBeVisible();expect(v.width).toBe(145);}
 const labels=await page.evaluate(inspectPhoneText,{selector:'#gold,#income,#time,#objectiveHUD:not(.hidden) #objectiveProgress,#objectiveHUD:not(.hidden) #objectiveTime,.protected-name,.protected-health',ownerSelector:mobile?'[data-protected-id],#protectedDock,.topbar':'[data-protected-id],#objectiveHUD,.topbar',minimumFont:0});
 for(const t of labels)expect(t.complete,JSON.stringify(t)).toBe(true);v.labels=labels.map(t=>t.text);return v;
}

test('visible named action fits existing slots with objectives and hints retained',async({page},info)=>{
 test.setTimeout(60000);const evidence=[];
 for(const kind of ['skirmish','protected','ashen','first-build']){
  // Fresh context state per scenario: return to title and clear only QA profile.
  if(kind!=='skirmish'){await page.goto('/FONTS-NOTICES.txt');await page.evaluate(()=>localStorage.clear());}
  await start(page,kind);await expect(page.locator('#toast')).not.toHaveClass(/show/);const sizes=info.project.name==='narrow-phone'?[[320,568],[320,430]]:[[page.viewportSize().width,page.viewportSize().height]];
  for(const [width,height] of sizes){
   await page.setViewportSize({width,height});await settlePhoneViewport(page);
   const hints=await page.locator('#toggleCoach').isVisible();
   if(hints&&await page.locator('#toggleCoach').getAttribute('aria-pressed')==='false')await direct(page,'toggleCoach');
   for(const hidden of hints?[false,true]:[false]){
    if(hidden)await direct(page,'toggleCoach');
    const g=await geometry(page);evidence.push({kind,viewport:{width,height},hidden,...g});
    if(kind==='first-build'){await expect(page.locator('#rallyStatus')).toHaveText('Build');await expect(page.locator('#rally')).toHaveAttribute('aria-disabled','true');}
    else{
     await direct(page,'rally');await expect(page.locator('#rally')).toHaveAttribute('aria-pressed','true');
     if(g.parent==='battleTools'){await expect(page.locator('#rallyStatus')).toHaveText('Cancel');await expect(page.locator('#volleyAim')).toBeVisible();}
     const armed=await geometry(page);evidence.push({kind,viewport:{width,height},hidden,armed:true,...armed});
     if((kind==='ashen'&&!hidden)||(kind==='protected'&&hidden))await page.screenshot({path:new URL(`${info.project.name}-${kind}-${width}x${height}${hidden?'-hidden':''}.png`,output).pathname});
     await direct(page,'rally');await expect(page.locator('#rally')).toHaveAttribute('aria-pressed','false');
    }
   }
  }
 }
 writeFileSync(new URL(`${info.project.name}-geometry.json`,output),JSON.stringify(evidence,null,2));
});

test('real pointer arm cancel drag and cast are free until exactly one valid release',async({page,context},info)=>{
 test.setTimeout(40000);await start(page);await page.evaluate(()=>{window.__rallyNode=document.getElementById('rally');window.__statusNode=document.getElementById('rallyStatus');});
 if(info.project.name==='phone')await page.locator('#rally').screenshot({path:new URL('volley-ready.png',output).pathname});
 const before=await snap(page);await direct(page,'rally');await expect(page.locator('#app')).not.toHaveClass(/compact-build-open/);
 expect((await snap(page)).state.spellCooldown[0]).toBe(0);expect((await snap(page)).state.gold[0]).toBeGreaterThanOrEqual(before.state.gold[0]);
 if(await page.locator('#volleyAim').isVisible())await page.locator('#volleyAim').tap();
 expect(await page.evaluate(()=>window.__volleyCalls.length)).toBe(0);
 const r=await page.locator('#battle').boundingBox(),point={x:r.x+r.width*.65,y:r.y+r.height*.5};
 await dragPoint(page,context,point);expect(await page.evaluate(()=>window.__volleyCalls.length)).toBe(0);await expect(page.locator('#rally')).toHaveAttribute('aria-pressed','true');
 await direct(page,'rally');await expect(page.locator('#rally')).toHaveAttribute('aria-pressed','false');
 await direct(page,'rally');await page.keyboard.press('Escape');await expect(page.locator('#rally')).toHaveAttribute('aria-pressed','false');
 if(info.project.name!=='desktop'){
  await direct(page,'rally');await direct(page,'compactBuild');await expect(page.locator('#rally')).toHaveAttribute('aria-pressed','false');
  await direct(page,'compactBuild');await expect(page.locator('#commandDeck')).toBeVisible();await direct(page,'rally');await expect(page.locator('#commandDeck')).toBeHidden();
 }else await direct(page,'rally');
 await tapPoint(page,point);await expect(page.locator('#rally')).toHaveAttribute('aria-pressed','false');
 const calls=await page.evaluate(()=>window.__volleyCalls);expect(calls).toHaveLength(1);
 const call=calls[0];expect(call.result.ok).toBe(true);expect(call.before.state.gold[0]-call.after.state.gold[0]).toBe(SPELL.cost);expect(call.after.state.spellCooldown[0]).toBe(SPELL.cooldown);
 const oracle=Game.restore(call.before);expect(oracle.cast(...call.args)).toEqual(call.result);expect(oracle.serialize()).toEqual(call.after);
 await expect(page.locator('#rally')).toHaveAttribute('aria-disabled','true');
 expect(await page.locator('#rallyStatus').evaluate(e=>parseFloat(getComputedStyle(e).fontSize))).toBeGreaterThanOrEqual(info.project.name==='desktop'?11:12);
 if(info.project.name==='phone')await page.locator('#rally').screenshot({path:new URL('volley-recharge.png',output).pathname});
 await page.locator('#rally').evaluate(e=>e.click());await expect(page.locator('#rally')).toHaveAttribute('aria-pressed','false');expect(await page.evaluate(()=>window.__volleyCalls.length)).toBe(1);
 expect(await page.evaluate(()=>window.__rallyNode===document.getElementById('rally')&&window.__statusNode===document.getElementById('rallyStatus'))).toBe(true);
 writeFileSync(new URL(`${info.project.name}-cast.json`,output),JSON.stringify({beforeTick:call.before.tick,goldBefore:call.before.state.gold[0],goldAfter:call.after.state.gold[0],cooldown:call.after.state.spellCooldown[0],casts:1,exactCastReplay:true},null,2));
});

test('held touch multitouch and resize cannot cast; short safety stays paused',async({page,context},info)=>{
 test.skip(info.project.name!=='phone','One real-time touch/orientation case.');test.setTimeout(40000);await start(page);await direct(page,'rally');
 const cdp=await context.newCDPSession(page),r=await page.locator('#battle').boundingBox();
 const a={x:r.x+r.width*.4,y:r.y+r.height*.5,id:0},b={x:r.x+r.width*.65,y:r.y+r.height*.5,id:1};
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[a]});await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[a,b]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(200);expect(await page.evaluate(()=>window.__volleyCalls.length)).toBe(0);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[a]});await page.setViewportSize({width:844,height:390});await settlePhoneViewport(page);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(200);expect(await page.evaluate(()=>window.__volleyCalls.length)).toBe(0);
 await expect(page.locator('#rally')).toHaveAttribute('aria-pressed','true');await geometry(page);
 await direct(page,'rally');
 const field=await page.locator('#battle').boundingBox(),held={x:field.x+field.width*.4,y:field.y+field.height*.5,id:0};
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[held]});await page.keyboard.press('r');
 await expect(page.locator('#rally')).toHaveAttribute('aria-pressed','true');await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 expect(await page.evaluate(()=>window.__volleyCalls.length)).toBe(0);
 await page.setViewportSize({width:1180,height:757});await settlePhoneViewport(page);await expect(page.locator('#rally')).toHaveAttribute('aria-pressed','true');await geometry(page);
 await page.setViewportSize({width:320,height:430});await settlePhoneViewport(page);await geometry(page);
 await page.setViewportSize({width:240,height:180});await expect(page.locator('#viewportModal')).toBeVisible();await expect(page.locator('#viewportResume')).toBeDisabled();
 await expect(page.locator('#rally')).toHaveAttribute('aria-pressed','false');const stopped=await saved(page);await page.waitForTimeout(300);expect(await saved(page)).toEqual(stopped);
 await page.setViewportSize({width:390,height:650});await expect(page.locator('#viewportResume')).toBeEnabled();await expect(page.locator('#viewportModal')).toBeVisible();expect(await saved(page)).toEqual(stopped);
 await direct(page,'viewportResume');await expect(page.locator('#viewportModal')).toBeHidden();await expect(page.locator('#rally')).toHaveAttribute('aria-pressed','false');expect(await page.evaluate(()=>window.__volleyCalls.length)).toBe(0);await cdp.detach();
});

test('bounded virtual cooldown preserves ordinary engine state and returns Ready',async({page},info)=>{
 test.skip(info.project.name!=='desktop','One isolated deterministic cooldown case; no gesture assertions.');
 const game=new Game({seed:719,ai:false});expect(game.cast(700,450).ok).toBe(true);
 const before=game.serialize(),envelope=encodeBattle(game,scenarioForBattle(null,null,game));
 await seedOnce(page,{'ironroot.battle.v1':JSON.stringify(envelope)});await page.goto('about:blank');
 const epoch=Date.UTC(2026,10,7);await page.clock.install({time:new Date(epoch)});await page.clock.pauseAt(new Date(epoch+1000));await page.goto('/');await observe(page);
 await page.locator('#resumeSaved').evaluate(e=>e.click());await page.clock.runFor(100);
 await page.setViewportSize({width:390,height:650});await page.clock.runFor(100);await expect(page.locator('#rallyStatus')).toHaveText(/\d+s/);
 for(let i=0;i<255;i++)await page.clock.runFor(100);
 const after=await snap(page);await expect(page.locator('#rallyStatus')).toHaveText('Ready');expect(after.state.spellCooldown[0]).toBe(0);
 const replay=Game.restore(before);while(replay.tick<after.tick)replay.update(.05-replay.accumulator);
 expect({...after,accumulator:0}).toEqual({...replay.serialize(),accumulator:0});
 writeFileSync(new URL('cooldown-parity.json',output),JSON.stringify({beforeTick:before.tick,afterTick:after.tick,cooldownBefore:before.state.spellCooldown[0],cooldownAfter:after.state.spellCooldown[0],exactFixedTickReplay:true,incrementMs:100},null,2));
});

test('Options audio synchronizes desktop Sound; the same focused Volley survives relocation',async({page},info)=>{
 test.skip(info.project.name!=='phone','One audio/settings and focus handoff check.');
 await start(page);await direct(page,'settings');await expect(page.locator('#settingsModal')).toBeVisible();
 const before=await page.locator('#audioEnabled').isChecked();await page.locator('#audioEnabled').setChecked(!before);
 await direct(page,'settingsDone');await expect(page.locator('#settingsModal')).toBeHidden();
 await page.locator('#rally').focus();await page.evaluate(()=>{window.__audioVolley=document.getElementById('rally');});
 await page.setViewportSize({width:1180,height:757});await settlePhoneViewport(page);
 await expect(page.locator('#rally')).toBeFocused();expect(await page.evaluate(()=>window.__audioVolley===document.getElementById('rally'))).toBe(true);
 await expect(page.locator('#sound')).toHaveAttribute('aria-label',before?'Enable audio':'Mute audio');
 await direct(page,'sound');await direct(page,'settings');expect(await page.locator('#audioEnabled').isChecked()).toBe(before);await direct(page,'settingsDone');
 await page.locator('#sound').focus();await page.keyboard.down('Space');await page.setViewportSize({width:390,height:650});await settlePhoneViewport(page);await page.keyboard.up('Space');
 await expect(page.locator('#rally')).toBeFocused();await expect(page.locator('#rally')).toHaveAttribute('aria-pressed','false');
 await page.keyboard.press('Enter');await expect(page.locator('#rally')).toHaveAttribute('aria-pressed','true');await page.keyboard.press('Enter');await expect(page.locator('#rally')).toHaveAttribute('aria-pressed','false');
});

test('unaffordable spell and measured subminimum target cannot bypass their guards',async({page},info)=>{
 test.skip(info.project.name!=='phone','One unavailable and control-measurement safety case.');
 const game=new Game({seed:88,ai:false});game.state.gold[0]=0;
 await seedOnce(page,{'ironroot.battle.v1':JSON.stringify(encodeBattle(game,scenarioForBattle(null,null,game)))});await observe(page);await press(page,'#resumeSaved');await settlePhoneViewport(page);
 await expect(page.locator('#rallyStatus')).toHaveText('No gold');await expect(page.locator('#rally')).toHaveAttribute('aria-disabled','true');await geometry(page);
 const rect=await page.locator('#rally').boundingBox();await tapPoint(page,{x:rect.x+rect.width/2,y:rect.y+rect.height/2});
 await expect(page.locator('#toast')).toContainText('Need 75 gold');await expect(page.locator('#rally')).toHaveAttribute('aria-pressed','false');expect((await snap(page)).state.spellCooldown[0]).toBe(0);
 const shrink=await page.addStyleTag({content:'.protected-mobile #rally { width: 43px; min-width: 43px; }'});
 await expect(page.locator('#viewportModal')).toBeVisible();await expect(page.locator('#viewportResume')).toBeDisabled();const checkpoint=await saved(page);
 await shrink.evaluate(e=>e.remove());await expect(page.locator('#viewportResume')).toBeEnabled();await expect(page.locator('#viewportModal')).toBeVisible();expect(await saved(page)).toEqual(checkpoint);
 await direct(page,'viewportResume');await expect(page.locator('#viewportModal')).toBeHidden();await expect(page.locator('#rally')).toHaveAttribute('aria-pressed','false');
});


test('owned-building inspector hands control to Volley and Options dominates targeting',async({page},info)=>{
 test.skip(info.project.name!=='phone','One compact inspector and overlay check.');
 await start(page,'protected');const before=await snap(page),building=before.state.buildings.find(b=>b.side===0);
 await tapPoint(page,await homePoint(page,getMap(before.mapId||'classic'),building.x,building.y));
 await expect(page.locator('#selectionPanel')).toBeVisible();await expect(page.locator('#app')).toHaveClass(/compact-build-open/);
 await direct(page,'rally');await expect(page.locator('#selectionPanel')).toBeHidden();await expect(page.locator('#app')).not.toHaveClass(/compact-build-open/);
 await expect(page.locator('#rally')).toHaveAttribute('aria-pressed','true');await direct(page,'settings');await expect(page.locator('#settingsModal')).toBeVisible();
 await page.locator('#rally').evaluate(e=>e.click());await expect(page.locator('#settingsModal')).toBeVisible();
 expect(await page.evaluate(()=>window.__volleyCalls.length)).toBe(0);expect((await snap(page)).state.spellCooldown[0]).toBe(0);
 await direct(page,'settingsDone');await expect(page.locator('#settingsModal')).toBeHidden();await direct(page,'rally');
 await expect(page.locator('#rally')).toHaveAttribute('aria-pressed','false');expect(await page.evaluate(()=>window.__volleyCalls.length)).toBe(0);
});
