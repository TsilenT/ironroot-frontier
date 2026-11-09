// Native input and read-only DOM/serialized-save observations. No game-state hooks.
import {expect} from '@playwright/test';
import {test,press,saved,homePoint,tapPoint} from './map-browser-helpers.mjs';
import {openBuildControls} from './shared-build-controls.mjs';
import {MAPS} from '../../dist/engine.js';
test.setTimeout(40000);

async function onlyPressed(page,selector,active) {
  await expect(page.locator(`${selector}[aria-pressed="true"]`)).toHaveCount(1);
  await expect(page.locator(active)).toHaveAttribute('aria-pressed','true');
  for(const button of await page.locator(selector).all())
    await expect(button).toHaveAttribute('aria-pressed',await button.evaluate(b=>String(b.classList.contains('active'))));
}

test('opponent and trial selections expose the visible choice through mode changes and native keys',async({page})=>{
  await page.goto('/');await press(page,'[data-mode="skirmish"]');
  await onlyPressed(page,'[data-difficulty]','[data-difficulty="easy"]');
  await press(page,'[data-difficulty="hard"]');
  await onlyPressed(page,'[data-difficulty]','[data-difficulty="hard"]');
  await page.locator('[data-difficulty="normal"]').focus();await page.keyboard.press('Enter');
  await onlyPressed(page,'[data-difficulty]','[data-difficulty="normal"]');
  await press(page,'[data-mode="challenges"]');
  await onlyPressed(page,'#challengeChoices button','#challengeChoices button:first-child');
  await press(page,'#challengeChoices button:nth-child(3)');
  await onlyPressed(page,'#challengeChoices button','#challengeChoices button:nth-child(3)');
  await expect(page.locator('#challengeChoices button:nth-child(3)')).toBeFocused();
  await press(page,'[data-mode="campaign"]');await press(page,'[data-mode="challenges"]');
  await onlyPressed(page,'#challengeChoices button','#challengeChoices button:nth-child(3)');
  await press(page,'[data-mode="skirmish"]');
  await onlyPressed(page,'[data-difficulty]','[data-difficulty="normal"]');
});

test('construction and volley expose armed, switched, cancelled and paid-completion states',async({page})=>{
  await page.goto('/');await press(page,'[data-mode="skirmish"]');await press(page,'#start');
  await openBuildControls(page);
  await expect(page.locator('.build-card[aria-pressed="false"]')).toHaveCount(8);
  await expect(page.locator('#rally')).toHaveAttribute('aria-pressed','false');
  await press(page,'[data-type="barracks"]');
  await onlyPressed(page,'.build-card','[data-type="barracks"]');
  await press(page,'[data-type="archery"]');
  await onlyPressed(page,'.build-card','[data-type="archery"]');
  await press(page,'#rally');
  await expect(page.locator('.build-card[aria-pressed="true"]')).toHaveCount(0);
  await expect(page.locator('#rally')).toHaveAttribute('aria-pressed','true');
  await press(page,'#cancelBuild');
  await expect(page.locator('#rally')).toHaveAttribute('aria-pressed','false');
  await openBuildControls(page);await press(page,'[data-type="barracks"]');
  await tapPoint(page,await homePoint(page,MAPS.classic,550,450));
  await expect(page.locator('#toast')).toContainText('Barracks raised');
  await expect(page.locator('.build-card[aria-pressed="true"]')).toHaveCount(0);
  await press(page,'#pause');
  expect((await saved(page)).game.state.buildings.filter(b=>b.side===0&&b.type==='barracks'&&b.x===550&&b.y===450)).toHaveLength(1);
});

test('speed names follow the full cycle and reset on resumed battle while its opponent stays selected',async({page})=>{
  await page.goto('/');await press(page,'[data-mode="skirmish"]');await press(page,'[data-difficulty="hard"]');await press(page,'#start');
  const speed=page.locator('#speed');
  for(const [current,next] of [[1,1.5],[1.5,2],[2,1],[1,1.5]]) {
    await expect(speed).toHaveText(`${current}×`);
    await expect(speed).toHaveAccessibleName(`Battle speed: ${current}×. Change to ${next}×`);
    await press(page,'#speed');
  }
  await press(page,'#pause');await press(page,'#saveExit');
  await press(page,'[data-difficulty="easy"]');await press(page,'#resumeSaved');
  await expect(speed).toHaveAccessibleName('Battle speed: 1×. Change to 1.5×');
  await expect(speed).toHaveText('1×');await press(page,'#pause');
  expect((await saved(page)).game.difficulty).toBe('hard');
  await press(page,'#saveExit');await onlyPressed(page,'[data-difficulty]','[data-difficulty="hard"]');
});

test('mode counts remain readable and fit when selected, unselected and keyboard focused',async({page},info)=>{
  await page.goto('/');
  const samples=[];
  for(const mode of ['campaign','skirmish','challenges']) {
    await press(page,`[data-mode="${mode}"]`);
    for(const badge of await page.locator('.mode-tabs span').all()) {
      const sample=await badge.evaluate(e=>{
        const c=getComputedStyle(e),r=e.getBoundingClientRect(),tabs=e.closest('.mode-tabs').getBoundingClientRect();
        const rgb=s=>s.match(/[\d.]+/g).slice(0,3).map(Number);
        const luminance=s=>rgb(s).map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((n,v,i)=>n+v*[.2126,.7152,.0722][i],0);
        const a=luminance(c.color),b=luminance(c.backgroundColor);
        return {id:e.id||e.textContent,color:c.color,background:c.backgroundColor,contrast:(Math.max(a,b)+.05)/(Math.min(a,b)+.05),font:parseFloat(c.fontSize),left:r.left,right:r.right,tabsLeft:tabs.left,tabsRight:tabs.right,viewport:innerWidth};
      });
      expect(sample.contrast).toBeGreaterThanOrEqual(4.5);expect(sample.font).toBeGreaterThanOrEqual(10);
      expect(sample.left).toBeGreaterThanOrEqual(sample.tabsLeft);expect(sample.right).toBeLessThanOrEqual(sample.tabsRight+1);
      expect(sample.right).toBeLessThanOrEqual(sample.viewport);samples.push({mode,...sample});
    }
  }
  await page.locator('[data-mode="campaign"]').focus();await page.keyboard.press('Enter');
  await expect(page.locator('[data-mode="campaign"]')).toBeFocused();
  await info.attach('badge-contrast-and-geometry',{body:JSON.stringify(samples,null,2),contentType:'application/json'});
  await page.screenshot({path:info.outputPath('mode-counts.png')});
});
