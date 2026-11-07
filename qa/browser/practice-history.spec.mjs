// Cross-document regression: the existing training.spec.mjs repeated flow stays
// unchanged. These cases add menu nesting/Forward and verify profile isolation.
import {expect} from '@playwright/test';
import {test,press,seedTrainingProfile,storageBytes,observeTrainingStorage} from './training-browser-helpers.mjs';
const ready=async page=>{await expect(page.locator('#lessonPicker option')).toHaveCount(5);await expect(page.locator('#stepTitle')).not.toHaveText('Preparing your lesson…');};
for(const nested of [false,true])test(`practice return preserves its real document boundary${nested?' after Options Back/Forward':''}`,async({page})=>{
 test.setTimeout(45000);await seedTrainingProfile(page);const before=await storageBytes(page),operations=await observeTrainingStorage(page);
 await press(page,'#welcomeTraining');await ready(page);const practiceURL=page.url(),length=await page.evaluate(()=>history.length);
 await press(page,'#returnGame');await expect(page.locator('#welcome')).toBeVisible();
 await expect(page.locator('#campaignMissionPage')).toBeVisible();expect(await page.evaluate(()=>history.length)).toBe(length+1);
 expect(await storageBytes(page)).toEqual(before);
 if(nested){
  await press(page,'#welcomeSettings');const menuLength=await page.evaluate(()=>history.length);
  await page.goBack();await expect(page.locator('#settingsModal')).toBeHidden();await expect(page.locator('#welcomeSettings')).toBeFocused();
  await page.goForward();await expect(page.locator('#settingsModal')).toBeVisible();expect(await page.evaluate(()=>history.length)).toBe(menuLength);
  await press(page,'#settingsDone');await expect(page.locator('#settingsModal')).toBeHidden();
 }
 await page.goBack();await ready(page);expect(page.url()).toBe(practiceURL);expect(await storageBytes(page)).toEqual(before);
 await page.goForward();await expect(page.locator('#welcome')).toBeVisible();expect(await storageBytes(page)).toEqual(before);
 expect(operations).toEqual([]);await page.reload();await expect(page.locator('#welcome')).toBeVisible();
 await page.goBack();await ready(page);expect(await storageBytes(page)).toEqual(before);expect(operations).toEqual([]);
});
