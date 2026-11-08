// Real mouse/touch input and rendered geometry; no application-state hook.
import {expect} from '@playwright/test';
import {MAPS} from '../../dist/engine.js';
import {test,press,tapPoint,homePoint,saved,dragPoint,observeCanvas,canvasFrame} from './map-browser-helpers.mjs';
const map=MAPS.classic;
test.setTimeout(60000);
async function start(page,{fog=false}={}) {
  await observeCanvas(page);await page.goto('/');
  await press(page,'[data-mode="skirmish"]');if(fog)await press(page,'#skirmishFog');await press(page,'#start');
  await expect(page.locator('#welcome')).toBeHidden();
  await expect(page.locator('#viewportModal')).toBeHidden();
  await expect(page.locator('#pauseVeil')).toBeHidden();
  await press(page,'#home');
}
async function clickCitadel(page,dy=0) {
  await tapPoint(page,await homePoint(page,map,110,450+dy));
  await expect(page.locator('#citadelModal')).toBeVisible();
  await expect(page.locator('#citadelTitle')).toBeFocused();
  await expect(page.locator('#pauseVeil')).toBeVisible();
}
for(const choice of ['arrows','regen'])test(`home citadel click opens ${choice} upgrades, buys once and restores after reload`,async({page},info)=>{
  await start(page);await clickCitadel(page,choice==='arrows'?-105:15);
  await expect(page.locator('#citadelTitle')).toHaveText('Citadel upgrades');
  const before=await saved(page);expect(before.game.state.citadelOptions.sides[0].choice).toBeNull();
  const id=choice==='arrows'?'buyCitadelArrows':'buyCitadelRegen';
  await press(page,'#'+id);const bought=await saved(page);
  expect(bought.game.state.citadelOptions.sides[0].choice).toBe(choice);
  expect(bought.game.state.gold[0]).toBeCloseTo(before.game.state.gold[0]-190,7);
  expect(bought.game.state.time).toBe(before.game.state.time);
  await expect(page.locator('#buyCitadelArrows')).toBeDisabled();await expect(page.locator('#buyCitadelRegen')).toBeDisabled();
  await page.screenshot({path:info.outputPath('citadel-'+choice+'.png'),fullPage:true});
  await press(page,'#citadelResume');await expect(page.locator('#citadelModal')).toBeHidden();await expect(page.locator('#pauseVeil')).toBeHidden();
  await clickCitadel(page);await expect(page.locator('#buyCitadelArrows')).toBeDisabled();await expect(page.locator('#buyCitadelRegen')).toBeDisabled();
  await press(page,'#citadelBack');await press(page,'#saveExit');await page.reload();await press(page,'#resumeSaved');
  await clickCitadel(page);expect((await saved(page)).game.state.citadelOptions.sides[0].choice).toBe(choice);
});
test('citadel Back, Escape and browser Back preserve a paused battle without purchases',async({page})=>{
  await start(page);await clickCitadel(page);const before=await saved(page);
  await press(page,'#citadelBack');await expect(page.locator('#citadelModal')).toBeHidden();await expect(page.locator('#pauseVeil')).toBeVisible();
  await press(page,'#resume');await clickCitadel(page);await page.keyboard.press('Escape');
  await expect(page.locator('#citadelModal')).toBeHidden();await expect(page.locator('#pauseVeil')).toBeVisible();
  await press(page,'#resume');await clickCitadel(page);
  await page.locator('#buyCitadelArrows').focus();await page.keyboard.down('Space');
  await page.evaluate(()=>history.back());await expect(page.locator('#citadelModal')).toBeHidden();await page.keyboard.up('Space');
  await expect(page.locator('#pauseVeil')).toBeVisible();
  expect((await saved(page)).game.state.citadelOptions.sides[0].choice).toBeNull();
  expect((await saved(page)).game.state.gold[0]).toBeGreaterThanOrEqual(before.game.state.gold[0]);
  await page.evaluate(()=>history.forward());await expect(page.locator('#pauseVeil')).toBeVisible();
  expect((await saved(page)).game.state.citadelOptions.sides[0].choice).toBeNull();
});
test('dragging from the citadel and explicit build targeting never open upgrades',async({page,context})=>{
  await start(page);const point=await homePoint(page,map,110,450);
  await dragPoint(page,context,point);await expect(page.locator('#citadelModal')).toBeHidden();
  await press(page,'#home');await press(page,'[data-type="barracks"]');
  await tapPoint(page,await homePoint(page,map,110,450));
  await expect(page.locator('#citadelModal')).toBeHidden();await expect(page.locator('#battle')).toHaveClass(/placing/);
  await press(page,'#cancelBuild');await clickCitadel(page);
});
test('home upgrade badge is rendered and opens its citadel when tapped',async({page})=>{
  await start(page);await expect.poll(async()=>((await canvasFrame(page)).battle?.text||[]).some(t=>t.text==='UPGRADES')).toBe(true);
  // At Home, the badge is clamped to the left canvas edge. Derive its center
  // from the real label measurement and native canvas transform, not app state.
  await page.evaluate(()=>{
    const fill=CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText=function(...args){
      if(this.canvas.id==='battle'&&args[0]==='UPGRADES') {
        const m=this.getTransform(),r=this.canvas.getBoundingClientRect();
        window.__upgradeBadge={x:r.x+(m.a*args[1]+m.e)*r.width/this.canvas.width,y:r.y+(m.d*(args[2]-5/Math.max(.32,r.height/900))+m.f)*r.height/this.canvas.height};
      }
      return fill.apply(this,args);
    };
  });
  await page.waitForFunction(()=>window.__upgradeBadge);await tapPoint(page,await page.evaluate(()=>window.__upgradeBadge));
  await expect(page.locator('#citadelModal')).toBeVisible();
});

test('fog home citadel opens upgrades without exposing the enemy citadel',async({page})=>{
  await start(page,{fog:true});await clickCitadel(page);
  await expect(page.locator('#citadelEnemyStatus')).toContainText('Scout the enemy citadel');
  await expect(page.locator('#buyCitadelRegen')).toBeEnabled();
  await press(page,'#buyCitadelRegen');
  await expect(page.locator('#citadelPlayerStatus')).toContainText('Regeneration');
  await expect(page.locator('#citadelEnemyStatus')).toContainText('Scout the enemy citadel');
  await press(page,'#citadelResume');await expect(page.locator('#pauseVeil')).toBeHidden();
});
