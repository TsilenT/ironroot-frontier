import {expect} from '@playwright/test';
import {test as inherited,press} from './map-browser-helpers.mjs';
import {TRAINING_PATH,PROFILE_KEYS,trainingProfileFixture} from './training-fixtures.mjs';
export {press};
export const test=inherited.extend({page:async({page},use)=>{
  const errors=[];page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
  await use(page);expect(errors,'training flows emit no browser console errors').toEqual([]);
}});
export async function profileBytes(page){
  return page.evaluate(keys=>Object.fromEntries(keys.map(key=>[key,localStorage.getItem(key)])),PROFILE_KEYS);
}
export async function storageBytes(page){
  return page.evaluate(()=>Object.fromEntries(['localStorage','sessionStorage'].map(name=>{
    const storage=window[name];return [name,Object.fromEntries(Object.keys(storage).sort().map(key=>[key,storage.getItem(key)]))];
  })));
}
export async function seedTrainingProfile(page){
  await page.goto('/');
  const fixture=trainingProfileFixture();
  // Deliberately seed once, never via a navigation init script. Return/reload
  // cannot silently repair profile mutations or reinsert an abandoned save.
  await page.evaluate(values=>{
    localStorage.clear();sessionStorage.clear();
    for(const [key,value] of Object.entries(values))localStorage.setItem(key,value);
    sessionStorage.setItem('qa.training.sentinel','Exact session bytes\n');
  },fixture.values);
  await page.reload();
  expect(await profileBytes(page)).toEqual(fixture.values);
  return fixture;
}
export async function observeTrainingStorage(page,{blocked=false}={}){
  const operations=[];
  await page.exposeBinding('__qaRecordTrainingStorage',(_source,entry)=>{operations.push(entry);});
  await page.addInitScript(({blocked})=>{
    if(!location.pathname.endsWith('/training.html'))return;
    window.__qaTrainingStorage=[];
    const record=entry=>{window.__qaTrainingStorage.push(entry);void window.__qaRecordTrainingStorage(entry);};
    // Pass-through native mutation observers, not a storage implementation.
    // The blocked-storage case additionally faults both window getters before
    // any training module starts. Reading even a fresh profile would fail.
    const local=window.localStorage,session=window.sessionStorage;
    for(const method of ['setItem','removeItem','clear']){
      const original=Storage.prototype[method];
      Storage.prototype[method]=function(...args){
        record({storage:this===local?'localStorage':this===session?'sessionStorage':'other',method,args});
        return original.apply(this,args);
      };
    }
    if(blocked)for(const name of ['localStorage','sessionStorage'])Object.defineProperty(window,name,{configurable:true,get(){
      record({storage:name,method:'get-backend',args:[]});throw new DOMException('Synthetic blocked storage','SecurityError');
    }});
  },{blocked});
  return operations;
}
export async function openTraining(page){
  await page.goto(TRAINING_PATH);
  await expect(page.locator('#lessonPicker option')).toHaveCount(5);
  await expect(page.locator('#stepTitle')).not.toHaveText('Preparing your lesson…');
  await page.evaluate(()=>document.fonts.ready);
}
export async function selectLesson(page,id){
  await page.locator('#lessonPicker').selectOption(id);
  await expect(page.locator('#lessonPicker')).toHaveValue(id);
}
export async function gold(page){return Number(await page.locator('#gold').textContent());}
export async function uiState(page){
  return page.evaluate(()=>Object.fromEntries(['lessonPicker','stepTitle','stepPrompt','fieldState','gold','income','battleTime','feedback'].map(id=>{
    const element=document.getElementById(id);return [id,element.value??element.textContent];
  })));
}
export async function expectNoTrainingWrites(page,operations){
  expect(await page.evaluate(()=>window.__qaTrainingStorage)).toEqual([]);
  expect(operations,'training must attempt no localStorage/sessionStorage mutation, profile claim or blocked-storage access').toEqual([]);
}
export async function expectReachable(page,selector){
  const control=page.locator(selector);await expect(control).toBeVisible();
  // Explicit ordinary scrolling/focus is allowed. Focus exercises the real
  // portrait alignment handler; no click()/tap() silently repairs clipping.
  await control.scrollIntoViewIfNeeded();await control.focus();
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  await expect(control).toBeInViewport({ratio:1});
  expect(await control.evaluate(element=>{
    const r=element.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);
    return !!hit&&(hit===element||element.contains(hit));
  }),selector+' remains genuinely hit-testable after ordinary scrolling/focus').toBe(true);
}
export async function heldPointer(page,context,point){
  const touch=await page.evaluate(()=>navigator.maxTouchPoints>0);
  const cdp=touch?await context.newCDPSession(page):null;
  if(touch)await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:0,...point}]});
  else {await page.mouse.move(point.x,point.y);await page.mouse.down();}
  let active=true;
  return {
    touch,
    async release(){if(!active)return;active=false;if(touch)await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});else await page.mouse.up();},
    async dispose(){if(active){active=false;if(touch)await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});else await page.mouse.up();}if(cdp)await cdp.detach();},
  };
}
export async function center(page,selector){
  const box=await page.locator(selector).boundingBox();expect(box).not.toBeNull();
  return {x:box.x+box.width/2,y:box.y+box.height/2};
}
