// Focused real-layout regression: being in the DOM is not enough for income.
import {expect} from '@playwright/test';
import {CAMPAIGN_STORAGE_KEY} from '../../dist/campaign.js';
import {campaignFixture} from './campaign-fixtures.mjs';
import {test,press,seedOnce} from './map-browser-helpers.mjs';
import {inspectPhoneText,settlePhoneViewport} from './phone-text-evidence.mjs';

async function checkIncome(page){
 await settlePhoneViewport(page);
 await expect(page.locator('#income')).toBeVisible();
 await expect(page.locator('#income')).toHaveText(/^\+\d+(\.\d+)? \/s$/);
 const labels=await page.evaluate(inspectPhoneText,{selector:'#income',ownerSelector:'.resources',minimumFont:11});
 expect(labels).toHaveLength(1);
 expect(labels[0].complete,JSON.stringify(labels[0])).toBe(true);
 expect(labels[0].overflow).toBe(false);
 const geometry=await page.evaluate(()=>{
  const r=e=>{const b=e.getBoundingClientRect();return {left:b.left,right:b.right,top:b.top,bottom:b.bottom,width:b.width,height:b.height};};
  const income=document.getElementById('income'),box=r(income),row=r(income.closest('.resources')),app=document.getElementById('app'),root=r(app),style=getComputedStyle(app);
  const safe={left:root.left+parseFloat(style.paddingLeft),right:root.right-parseFloat(style.paddingRight),top:root.top+parseFloat(style.paddingTop)};
  const overlap=(a,b)=>a.left<b.right-.5&&a.right>b.left+.5&&a.top<b.bottom-.5&&a.bottom>b.top+.5;
  const collisions=['#gold','.coin','.army-block','.clock-block','.battle-top'].filter(s=>overlap(box,r(document.querySelector(s))));
  const range=document.createRange();range.selectNodeContents(income);
  const textBoxes=[...range.getClientRects()].filter(b=>b.width&&b.height);
  const occluded=textBoxes.some(b=>{const hit=document.elementFromPoint(b.left+b.width/2,b.top+b.height/2);return hit!==income&&!income.contains(hit);});
  return {box,row,safe,collisions,occluded,header:r(document.getElementById('topbar')).height,short:app.classList.contains('protected-short-portrait')};
 });
 expect(geometry.collisions).toEqual([]);expect(geometry.occluded).toBe(false);
 expect(geometry.header).toBe(geometry.short?48:72);
 expect(geometry.box.height).toBeGreaterThanOrEqual(16);
 for(const bounds of [geometry.row,geometry.safe]){
  expect(geometry.box.left).toBeGreaterThanOrEqual(bounds.left-.5);
  expect(geometry.box.right).toBeLessThanOrEqual(bounds.right+.5);
  expect(geometry.box.top).toBeGreaterThanOrEqual(bounds.top-.5);
 }
 expect(geometry.box.bottom).toBeLessThanOrEqual(geometry.row.bottom+.5);
}

for(const [width,height] of [[320,430],[320,568],[390,650]]){
 test(`income is visibly inside portrait HUD at ${width}x${height}`,async({page})=>{
  await page.setViewportSize({width,height});
  const fixture=campaignFixture('protected');
  await seedOnce(page,{'ironroot.battle.v1':JSON.stringify(fixture.envelope),[CAMPAIGN_STORAGE_KEY]:JSON.stringify(fixture.progress)});
  await press(page,'#resumeSaved');
  await checkIncome(page);
  // Exercise the existing safe-area variables, not a mock layout calculation.
  await page.addStyleTag({content:'.app.protected-mobile { --mobile-inset-top: 12px; --mobile-inset-left: 8px; --mobile-inset-right: 8px; --mobile-inset-bottom: 21px; }'});
  await checkIncome(page);
 });
}
