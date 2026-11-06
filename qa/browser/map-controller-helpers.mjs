// Only the standard Gamepad API is simulated. The production polling loop,
// cursor, snapping, occupancy validation and purchase handlers remain real.
import {expect} from '@playwright/test';
export async function installPad(page){
  await page.addInitScript(()=>{
    window.__qaPad={axes:[0,0,0,0],buttons:Array(17).fill(false)};window.__qaPadPolls=0;
    Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>{
      window.__qaPadPolls++;const pad=window.__qaPad;
      return [{id:'QA Standard Controller',index:0,mapping:'standard',connected:true,timestamp:performance.now(),
        axes:pad.axes,buttons:pad.buttons.map(pressed=>({pressed,touched:pressed,value:pressed?1:0}))}];
    }});
  });
}
async function neutralPad(page){
  const prior=await page.evaluate(()=>{window.__qaPad.buttons.fill(false);window.__qaPad.axes=[0,0,0,0];return window.__qaPadPolls;});
  await expect.poll(()=>page.evaluate(()=>window.__qaPadPolls),{intervals:[20,40,80]}).toBeGreaterThanOrEqual(prior+3);
}
export async function padButton(page,index){
  await neutralPad(page);
  const prior=await page.evaluate(index=>{window.__qaPad.buttons[index]=true;return window.__qaPadPolls;},index);
  await expect.poll(()=>page.evaluate(()=>window.__qaPadPolls),{intervals:[20,40,80]}).toBeGreaterThanOrEqual(prior+2);
  await neutralPad(page);
}
export async function steerTo(page,target){
  await page.evaluate(()=>{window.__qaPad.buttons[6]=true;});
  for(let step=0;step<160;step++){
    const box=await page.locator('#controllerCursor').boundingBox();expect(box).not.toBeNull();
    const dx=target.x-box.x-box.width/2,dy=target.y-box.y-box.height/2;
    if(Math.hypot(dx,dy)<8)break;
    await page.evaluate(({dx,dy})=>{
      const length=Math.hypot(dx,dy),magnitude=length>25?1:.5;
      window.__qaPad.axes=[dx/length*magnitude,dy/length*magnitude,0,0];
    },{dx,dy});
    await page.waitForTimeout(40);
  }
  await neutralPad(page);
  const box=await page.locator('#controllerCursor').boundingBox();
  expect(Math.hypot(target.x-box.x-box.width/2,target.y-box.y-box.height/2)).toBeLessThan(15);
}
