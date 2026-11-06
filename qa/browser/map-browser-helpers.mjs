import {installCanvasObservation} from './canvas-observation.mjs';
import { prepareBuildControl, openBuildControls } from './shared-build-controls.mjs';
import {test as base,expect} from '@playwright/test';
import {SAVE} from './map-fixtures.mjs';
export const test=base.extend({page:async ({page},use)=>{
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await use(page);expect(errors,'uncaught browser errors').toEqual([]);
}});
export async function press(page,selector){
  if (await prepareBuildControl(page, selector)) return;
  if(await page.evaluate(()=>navigator.maxTouchPoints>0))await page.locator(selector).tap();
  else await page.locator(selector).click();
}
export async function tapPoint(page,point){
  if(await page.evaluate(()=>navigator.maxTouchPoints>0))await page.touchscreen.tap(point.x,point.y);
  else await page.mouse.click(point.x,point.y);
}
export async function selectMap(page,id){
  if (!await page.locator('#skirmishConfig').isVisible()) await press(page,'[data-mode="skirmish"]');
  if(!await page.locator('#mapPicker').evaluate(element=>element.open))await press(page,'#mapPickerToggle');
  await press(page,'#mapChoices [data-map="'+id+'"]');
  await expect(page.locator('#mapChoices [data-map="'+id+'"]')).toHaveAttribute('aria-pressed','true');
}
export async function saved(page){return page.evaluate(key=>JSON.parse(localStorage.getItem(key)),SAVE);}
export async function pause(page){await press(page,'#pause');await expect(page.locator('#pauseVeil')).toBeVisible();return saved(page);}
export async function seedOnce(page,values){
  // Seed after initial navigation, then reload. No init script re-inserts old
  // fixture bytes on a later import/reload or masks a real app write.
  await page.goto('/');
  await page.evaluate(values=>{for(const [key,value] of Object.entries(values))localStorage.setItem(key,value);},values);
  await page.reload();
}
export async function homePoint(page,map,x,y){
  await press(page,'#home');
  const rect=await page.locator('#battle').boundingBox(),scale=Math.max(.32,rect.height/900);
  const half=rect.width/(2*scale),camera=half>=map.width/2?map.width/2:Math.max(half,450);
  return {x:rect.x+rect.width/2+(x-camera)*scale,y:rect.y+rect.height/2+(y-450)*scale};
}
export async function chooseBackup(page,text){
  const event=page.waitForEvent('filechooser');await press(page,'#importBackup');
  await (await event).setFiles({name:'ironroot-map-backup.json',mimeType:'application/json',buffer:Buffer.from(text)});
}
export async function openBackup(page){
  await press(page,'#welcomeSettings');
  if(!await page.locator('.backup-details').evaluate(element=>element.open))await press(page,'.backup-details > summary');
}
export async function downloadBackup(page){
  const event=page.waitForEvent('download');await press(page,'#exportBackup');
  const file=await event;expect(await file.failure()).toBeNull();
  const stream=await file.createReadStream(),parts=[];expect(stream).not.toBeNull();
  for await(const chunk of stream)parts.push(chunk);
  return Buffer.concat(parts).toString('utf8');
}
// Pass-through observations of native Canvas2D calls, not a mock canvas or app
// state hook. Actual drawing still runs unchanged in Chromium. Retain one frame.
export async function observeCanvas(page){
  await page.addInitScript(installCanvasObservation);
}
export async function canvasFrame(page){return page.evaluate(()=>window.__qaCanvas);}
export async function expectCamera(page,map,target,tolerance=3){
  const rect=await page.locator('#battle').boundingBox(),mini=await page.locator('#minimap').boundingBox();
  const scale=Math.max(.32,rect.height/900),half=rect.width/(2*scale);
  const expected=half>=map.width/2?map.width/2:Math.max(half,Math.min(map.width-half,target));
  await expect.poll(async()=>{
    const frame=(await canvasFrame(page)).mini;
    if(!frame?.viewport)return Infinity;
    const [x,,width]=frame.viewport;
    return Math.abs(((x-.75)+(width+1.5)/2)/mini.width*map.width-expected);
  },{message:'real minimap viewport maps to camera '+target}).toBeLessThan(tolerance);
  const frame=(await canvasFrame(page)).mini;
  expect(frame.viewport[2]+1.5).toBeCloseTo(Math.min(mini.width,rect.width/scale/map.width*mini.width),3);
}
export async function dragPoint(page,context,point){
  if(await page.evaluate(()=>navigator.maxTouchPoints>0)){
    const cdp=await context.newCDPSession(page);
    try{
      await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point]});
      for(let i=1;i<=5;i++){
        await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:point.x-13*i,y:point.y}]});
        await page.waitForTimeout(30);
      }
      await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
      await page.waitForTimeout(400);
    }finally{await cdp.detach();}
  }else{await page.mouse.move(point.x,point.y);await page.mouse.down();await page.mouse.move(point.x-65,point.y,{steps:5});await page.mouse.up();}
}
