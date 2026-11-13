import {expect} from '@playwright/test';
import {test,press,seedTrainingProfile,storageBytes,profileBytes,observeTrainingStorage,expectNoTrainingWrites} from './training-browser-helpers.mjs';
import {BACKUP_STORAGE_KEYS} from '../../dist/backup.js';

async function rendererPreferences(page) {
  return page.evaluate(async()=>{
    const {Renderer}=await import('/render.js');
    return new Promise(resolve=>{
      const original=Renderer.prototype.draw;
      // Observe one real frame, preserving its draw arguments and return value.
      // This is not a replacement renderer or a production-only testing hook.
      Renderer.prototype.draw=function(...args) {
        const result=Reflect.apply(original,this,args);
        Renderer.prototype.draw=original;
        resolve({reducedMotion:this.reducedMotion,effectMotion:this.vfx.reducedMotion,quality:this.vfx.quality,limits:this.vfx.limits});
        return result;
      };
    });
  });
}
function expected(reducedMotion,quality) {
  return {reducedMotion,effectMotion:reducedMotion,quality,limits:quality==='low'?{particles:80,rubble:12}:{particles:200,rubble:30}};
}

for(const [motion,quality,os] of [[true,'low','no-preference'],[false,'high','reduce']]) {
  test(`game entry carries saved ${motion?'reduced':'full'} motion and ${quality} detail without touching the profile`,async({page},info)=>{
    await page.emulateMedia({reducedMotion:os});
    const fixture=await seedTrainingProfile(page);
    await press(page,'#welcomeSettings');
    // Exercise live link updates in both directions, then reload to exercise
    // the saved-preference path rather than only the current Options controls.
    await page.locator('#reduceMotion').setChecked(!motion);
    await page.locator('#effectQuality').selectOption(quality==='low'?'high':'low');
    await expect(page.locator('#welcomeTraining')).toHaveAttribute('href',`./training.html#motion=${!motion?'reduce':'full'}&detail=${quality==='low'?'high':'low'}`);
    await page.locator('#reduceMotion').setChecked(motion);
    await page.locator('#effectQuality').selectOption(quality);
    await expect(page.locator('#preferenceSaveWarning')).toBeHidden();
    await page.reload();
    const href=`./training.html#motion=${motion?'reduce':'full'}&detail=${quality}`;
    await expect(page.locator('#welcomeTraining')).toHaveAttribute('href',href);
    const profile=await profileBytes(page);
    const saved=JSON.parse(profile[BACKUP_STORAGE_KEYS.settings]);
    expect(saved.reducedMotion).toBe(motion);expect(saved.quality).toBe(quality);
    for(const key of Object.keys(fixture.values).filter(key=>key!==BACKUP_STORAGE_KEYS.settings))
      expect(profile[key],key).toBe(fixture.values[key]);
    expect(await rendererPreferences(page)).toEqual(expected(motion,quality));
    const before=await storageBytes(page),operations=await observeTrainingStorage(page);
    await press(page,'#welcomeTraining');
    await expect(page.locator('#lessonPicker option')).toHaveCount(5);
    expect(await rendererPreferences(page)).toEqual(expected(motion,quality));
    await page.locator('#lessonPicker').selectOption('mine-and-upgrade');
    await press(page,'#restartLesson');
    expect(await rendererPreferences(page)).toEqual(expected(motion,quality));
    await page.screenshot({path:info.outputPath(`practice-${motion?'reduce':'full'}-${quality}.png`)});
    await expectNoTrainingWrites(page,operations);
    expect(await storageBytes(page)).toEqual(before);
    await press(page,'#returnGame');
    await expect(page.locator('#resumeSaved')).toBeVisible();
    expect(await storageBytes(page)).toEqual(before);
  });
}

for(const [name,hash,motion,quality] of [
  ['direct entry keeps OS reduced motion','',true,'high'],
  ['valid handoff works with blocked storage','#motion=reduce&detail=low',true,'low'],
  ['invalid or duplicated choices retain OS defaults','#motion=full&motion=reduce&detail=unknown',true,'high'],
]) {
  test(name,async({page})=>{
    await page.emulateMedia({reducedMotion:hash.includes('detail=low')?'no-preference':'reduce'});
    const operations=await observeTrainingStorage(page,{blocked:true});
    await page.goto('/training.html'+hash);
    await expect(page.locator('#lessonPicker option')).toHaveCount(5);
    expect(await rendererPreferences(page)).toEqual(expected(motion,quality));
    await expectNoTrainingWrites(page,operations);
  });
}
