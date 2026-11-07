// Read the real campaign UI without seeding progress or playing synthetic wins.
import {test as base,expect} from '@playwright/test';
import {getProgressionCampaignOverview,createCampaignProgress} from '../../dist/campaign.js';
const missions=getProgressionCampaignOverview(createCampaignProgress()).missions;
const test=base.extend({page:async({page},use)=>{
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await use(page);expect(errors,'uncaught browser errors').toEqual([]);
}});
async function press(page,selector){
  if(await page.evaluate(()=>navigator.maxTouchPoints>0))await page.locator(selector).tap();
  else await page.locator(selector).click();
}
test('revised copy presents every current dialogue and hint without horizontal clipping',async({page},testInfo)=>{
  test.setTimeout(60000);
  await page.goto('/');
  await expect(page.locator('#welcomeFullscreenStatus')).toHaveText('Optional fullscreen can hide browser bars, though system controls may remain.');
  for(const mission of missions){
    await expect(page.locator('#campaignMissionTitle')).toHaveText(mission.name);
    await expect(page.locator('#campaignMissionDescription')).toHaveText(mission.description);
    await expect(page.locator('#campaignSpeaker')).toHaveText(mission.dialogue.speaker);
    await expect(page.locator('#campaignDialogue')).toHaveText(mission.dialogue.text);
    await expect(page.locator('#campaignDialogue')).toBeVisible();
    await press(page,'#campaignHintDetails summary');
    await expect(page.locator('#campaignHint')).toHaveText(mission.hint);
    await expect(page.locator('#campaignHint')).toBeVisible();
    for(const selector of ['#campaignMissionDescription','#campaignDialogue','#campaignHint'])
      expect(await page.locator(selector).evaluate(e=>e.scrollWidth<=e.clientWidth+1),mission.id+' '+selector).toBe(true);
    if(mission.id==='emberwatch'){
      await expect(page.locator('#campaignDialogue')).toHaveText('We’ll need warriors at the crossing before the next raid, so get a barracks up there.');
      await page.locator('#campaignDialogue').scrollIntoViewIfNeeded();
      await testInfo.attach('revised-dialogue',{body:await page.screenshot(),contentType:'image/png'});
    }
    if(mission!==missions.at(-1))await press(page,'#campaignNext');
  }
  await expect(page.locator('#campaignNext')).toBeDisabled();
  expect(await page.evaluate(()=>localStorage.getItem('ironroot.campaign.v1'))).toBeNull();
});
