import { prepareBuildControl, openBuildControls } from './shared-build-controls.mjs';
import {test as base,expect} from '@playwright/test';
import {createCodex,formatNumber,formatSeconds} from '../../dist/codex.js';
import {getRuleset} from '../../dist/engine.js';
import {CURRENT_CHALLENGES} from '../../dist/challenges.js';
const {UNIT_CODEX,STRUCTURE_CODEX,ECONOMY_GUIDE}=createCodex(getRuleset(CURRENT_CHALLENGES[0].rulesetId,CURRENT_CHALLENGES[0].rulesetRevision));
const SAVE='ironroot.battle.v1';
const test=base.extend({page:async ({page},use)=>{
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await use(page);expect(errors,'uncaught browser errors').toEqual([]);
}});
async function press(page,selector){
  if (await prepareBuildControl(page, selector)) return;
  const target=page.locator(selector);
  if(await page.evaluate(()=>navigator.maxTouchPoints>0))await target.tap();
  else await target.click();
}
async function guide(page){
  await page.goto('/');
  // Fresh trials keep five units and seven buildings, with automatic flying.
  // Compare the reference to the current bound rules, not historical exports.
  await press(page,'[data-mode="challenges"]');await press(page,'#welcomeHelp');
  await expect(page.locator('#helpModal')).toBeVisible();
  await expect(page.locator('#closeHelp')).toBeFocused();
}
async function toggle(page,selector,open){
  await page.locator(selector+' > summary').focus();
  await page.keyboard.press('Space');
  await expect(page.locator(selector)).toHaveJSProperty('open',open);
  await expect(page.locator(selector+' > summary')).toBeFocused();
}
async function stat(card,label,value){
  await expect(card.locator('.codex-stats > div').filter({has:card.page().getByText(label,{exact:true})}).locator('dd')).toHaveText(value);
}

test('field reference disclosures show every unit structure and exact counter economics',async ({page})=>{
  test.setTimeout(45000);
  await guide(page);
  await expect(page.locator('#rosterGuide')).toHaveJSProperty('open',false);
  await expect(page.locator('#unitCodex')).toBeHidden();
  await toggle(page,'#rosterGuide',true);
  await expect(page.locator('[data-codex-unit]')).toHaveCount(5);
  await expect(page.locator('[data-codex-structure]')).toHaveCount(2);
  await expect(page.locator('#codexScope')).toHaveText(ECONOMY_GUIDE.scope);
  await expect(page.locator('#codexCaveat')).toHaveText(ECONOMY_GUIDE.counterCaveat);
  for(const unit of UNIT_CODEX){
    const selector='[data-codex-unit="'+unit.id+'"]',card=page.locator(selector);
    await expect(card).toHaveJSProperty('open',false);
    await expect(card.locator('.codex-body')).toBeHidden();
    await expect(card.locator('summary strong')).toHaveText(unit.name);
    await toggle(page,selector,true);
    for(const [label,value] of [
      ['Health',formatNumber(unit.baseStats.hp)],['Hit',formatNumber(unit.baseStats.damage)],
      ['Cooldown',formatSeconds(unit.baseStats.attackTime)],['Range',formatNumber(unit.baseStats.range)],
      ['Speed',formatNumber(unit.baseStats.speed)+' /s'],['Training interval',formatSeconds(unit.production.spawnTime)],
    ])await stat(card,label,value);
    await expect(card.locator('.codex-body')).toContainText(unit.production.name);
    await expect(card.locator('.codex-body')).toContainText(unit.production.cost+' gold');
    await expect(card.locator('.codex-body')).toContainText(unit.advantages);
    await expect(card.locator('.codex-body')).toContainText(unit.cautions);
    await expect(card.locator('li')).toHaveText(unit.mechanics);
    await toggle(page,selector,false);
  }
  for(const structure of STRUCTURE_CODEX){
    const selector='[data-codex-structure="'+structure.id+'"]',card=page.locator(selector);
    await expect(card).toHaveJSProperty('open',false);await toggle(page,selector,true);
    await expect(card.locator('summary strong')).toHaveText(structure.name);
    await expect(card.locator('li')).toHaveText(structure.mechanics);
    await toggle(page,selector,false);
  }
  // Independently pin important arithmetic, rather than only comparing UI and source.
  await toggle(page,'[data-codex-unit="warrior"]',true);
  await expect(page.locator('[data-codex-unit="warrior"]')).toContainText('45% less damage from archers: 9.35');
  await toggle(page,'[data-codex-unit="archer"]',true);
  await expect(page.locator('[data-codex-unit="archer"]')).toContainText('50% extra damage to flyers: 25.5');
  await toggle(page,'[data-codex-unit="siege"]',true);
  await expect(page.locator('[data-codex-unit="siege"]')).toContainText('3× damage to structures: 90');
  await toggle(page,'[data-codex-unit="wizard"]',true);
  await expect(page.locator('[data-codex-unit="wizard"]')).toContainText('65% of troop damage: 15.6');
  await toggle(page,'[data-codex-unit="gryphon"]',true);
  await expect(page.locator('[data-codex-unit="gryphon"]')).toContainText('60% of normal damage to structures: 10.2');
  await expect(page.locator('[data-codex-unit="gryphon"]')).toContainText('within 300 world units');
  await expect(page.locator('[data-codex-unit="gryphon"]')).toContainText('normal 110 attack range');
  await expect(page.locator('[data-codex-unit="gryphon"]')).toContainText('up to 420 world units');
  await expect(page.locator('[data-codex-unit="archer"]')).toContainText('Archers stay on their road');
  await toggle(page,'[data-codex-structure="mint"]',true);
  await expect(page.locator('[data-codex-structure="mint"]')).toContainText('Level 2 upgrade: 133 gold ÷ 1.25 additional gold/s = 106.4 s');
  await expect(page.locator('[data-codex-structure="mint"]')).toContainText('Level 3 upgrade: 199 gold ÷ 1.25 additional gold/s = 159.2 s');
  await expect(page.locator('.codex-economy')).toHaveJSProperty('open',false);
  await toggle(page,'.codex-economy',true);
  await stat(page.locator('#economyCodex'),'Starting gold','420');
  await stat(page.locator('#economyCodex'),'Base income','5 /s');
  await stat(page.locator('#economyCodex'),'Citadel health','6000');
  await stat(page.locator('#economyCodex'),'Mine cap','3');
  for(const text of [...ECONOMY_GUIDE.notes,...ECONOMY_GUIDE.upgrades,ECONOMY_GUIDE.overtime.description])
    await expect(page.locator('#economyCodex')).toContainText(text);
  await toggle(page,'.codex-economy',false);await toggle(page,'#rosterGuide',false);
  await expect(page.locator('#unitCodex')).toBeHidden();
});

test('field reference native Space and focus keep a paused battle read-only',async ({page})=>{
  await page.goto('/');await press(page,'[data-mode="challenges"]');
  await press(page,'#start');await press(page,'#pause');
  const before=await page.evaluate(key=>localStorage.getItem(key),SAVE);
  expect(JSON.parse(before)).toMatchObject({version:3,scenario:{kind:'trial',id:'shieldbreaker',revision:2},game:{version:3,rulesetId:'frontier-authored-air-local'}});
  const time=await page.locator('#time').innerText();
  await press(page,'#help');await expect(page.locator('#closeHelp')).toBeFocused();
  await toggle(page,'#rosterGuide',true);
  await toggle(page,'[data-codex-unit="warrior"]',true);
  await toggle(page,'.codex-economy',true);
  await page.keyboard.press('Digit2');await page.keyboard.press('KeyR');
  await page.waitForTimeout(350);
  await expect(page.locator('#time')).toHaveText(time);
  await expect(page.locator('#cancelBuild')).toBeHidden();
  await expect(page.locator('#rally')).not.toHaveClass(/active/);
  await expect(page.locator('#helpModal')).toBeVisible();
  expect(await page.evaluate(key=>localStorage.getItem(key),SAVE)).toBe(before);
  await page.locator('#guideDone').focus();await page.keyboard.press('Tab');
  await expect(page.locator('#closeHelp')).toBeFocused();
  await page.keyboard.press('Shift+Tab');await expect(page.locator('#guideDone')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#helpModal')).toBeHidden();
  await expect(page.locator('#pauseVeil')).toBeVisible();
  await expect(page.locator('#time')).toHaveText(time);
  expect(await page.evaluate(key=>localStorage.getItem(key),SAVE)).toBe(before);
  await page.locator('#resume').focus();await page.keyboard.press('Space');
  await expect(page.locator('#pauseVeil')).toBeHidden();
  await expect(page.locator('#time')).not.toHaveText(time);
});

test('field reference cards remain horizontally contained and scroll reachable on narrow and landscape screens',async ({page})=>{
  await guide(page);await toggle(page,'#rosterGuide',true);
  for(const size of [{width:320,height:568},{width:844,height:390}]){
    await page.setViewportSize(size);
    for(const selector of ['[data-codex-unit="warrior"]','[data-codex-unit="archer"]','[data-codex-unit="siege"]','[data-codex-unit="wizard"]','[data-codex-unit="gryphon"]','[data-codex-structure="watchtower"]','[data-codex-structure="mint"]','.codex-economy']){
      if(!await page.locator(selector).evaluate(element=>element.open))await toggle(page,selector,true);
      await page.locator(selector+' > summary').scrollIntoViewIfNeeded();
      await expect(page.locator(selector+' > summary')).toBeInViewport({ratio:1});
      const r=await page.locator(selector).boundingBox();
      expect(r.x,selector).toBeGreaterThanOrEqual(-1);
      expect(r.x+r.width,selector).toBeLessThanOrEqual(size.width+1);
      expect(await page.locator(selector).evaluate(element=>element.scrollWidth-element.clientWidth),selector).toBeLessThanOrEqual(1);
    }
    await page.locator('#guideDone').scrollIntoViewIfNeeded();
    await expect(page.locator('#guideDone')).toBeInViewport({ratio:1});
  }
  await press(page,'#guideDone');await expect(page.locator('#welcome')).toBeVisible();
});

test('field reference renders five distinct nonempty original portrait canvases',async ({page})=>{
  await guide(page);await toggle(page,'#rosterGuide',true);
  const portraits=[];
  for(const unit of UNIT_CODEX){
    const canvas=page.locator('[data-portrait="'+unit.id+'"]');
    await canvas.scrollIntoViewIfNeeded();await expect(canvas).toBeVisible();
    const pixels=await canvas.evaluate(element=>{
      const ctx=element.getContext('2d'),data=ctx.getImageData(0,0,element.width,element.height).data;
      let opaque=0;const colors=new Set();
      for(let i=0;i<data.length;i+=4)if(data[i+3]>0){
        opaque++;colors.add(data[i]+','+data[i+1]+','+data[i+2]+','+data[i+3]);
      }
      return {width:element.width,height:element.height,opaque,colors:colors.size,url:element.toDataURL()};
    });
    expect(pixels.width).toBeGreaterThan(0);expect(pixels.height).toBeGreaterThan(0);
    expect(pixels.opaque).toBeGreaterThan(100);expect(pixels.colors).toBeGreaterThan(8);
    portraits.push(pixels.url);
  }
  expect(new Set(portraits).size).toBe(5);
});

test('fresh campaign field reference contains only its two unlocked units and no mine economy',async ({page})=>{
  await page.goto('/');
  await expect(page.locator('#campaignMissionTitle')).toHaveText('Roadside Watch');
  await press(page,'#welcomeHelp');await toggle(page,'#rosterGuide',true);
  expect(await page.locator('[data-codex-unit]').evaluateAll(cards=>cards.map(card=>card.dataset.codexUnit)))
    .toEqual(['warrior','archer']);
  await expect(page.locator('[data-codex-structure]')).toHaveCount(0);
  await expect(page.locator('#codexScope')).toContainText('Starting resources and forces come from the mission briefing');
  await toggle(page,'.codex-economy',true);
  await stat(page.locator('#economyCodex'),'Reference gold','420');
  await stat(page.locator('#economyCodex'),'Mine cap','0');
  await expect(page.locator('#economyCodex')).toContainText('no gold mines available');
  expect(await page.evaluate(key=>localStorage.getItem(key),SAVE)).toBeNull();
});
