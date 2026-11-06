import {readFile} from 'node:fs/promises';
import {expect} from '@playwright/test';
import {test,press,observeCanvas,canvasFrame} from './map-browser-helpers.mjs';
import {SAVE} from './map-fixtures.mjs';
import {FONT_FILES,loadFontFaces,normalizeNotice} from './font-browser-helpers.mjs';

test('all five local WOFF2 assets load and actual DOM text uses bundled faces with painted canvas labels',async ({page,context},testInfo)=>{
  const requests=[],responses=[];
  page.on('request',request=>requests.push({url:request.url(),type:request.resourceType()}));
  page.on('response',response=>{if(new URL(response.url()).pathname.endsWith('.woff2'))responses.push(response);});
  await observeCanvas(page);await page.goto('/');await press(page,'#mapPickerToggle');
  const faces=await loadFontFaces(page);expect(faces).toHaveLength(8);
  for(const face of faces){
    expect(face.loaded,'FontFaceSet.load matched '+face.family+' '+face.weight).toHaveLength(1);
    expect(face.loaded[0].status).toBe('loaded');
    expect(face.loaded[0].family.replace(/["']/g,'')).toBe(face.family);
  }
  await expect.poll(()=>new Set(responses.map(response=>new URL(response.url()).pathname)).size).toBe(5);
  for(const file of FONT_FILES){
    const response=responses.find(response=>new URL(response.url()).pathname==='/'+file);
    expect(response,file).toBeTruthy();expect(response.ok()).toBe(true);
    expect(response.headers()['content-type']).toContain('font/woff2');
    expect((await response.body()).subarray(0,4).toString('ascii')).toBe('wOF2');
  }
  const origin=new URL(page.url()).origin;
  expect(requests.filter(request=>request.type==='font').every(request=>new URL(request.url).origin===origin)).toBe(true);
  expect(requests.some(request=>/fonts\.(googleapis|gstatic)\.com/.test(request.url))).toBe(false);
  // Chromium's rendered-font inspection verifies the faces used to paint real
  // app text. CSS family strings and document.fonts.check alone are insufficient.
  const cdp=await context.newCDPSession(page);
  try{
    await cdp.send('DOM.enable');await cdp.send('CSS.enable');
    const {root}=await cdp.send('DOM.getDocument');
    for(const [selector,family] of [['#selectedMapName',/^Barlow Condensed$/],['#mapDescription',/^DM Sans(?: 9pt)?$/]]){
      const {nodeId}=await cdp.send('DOM.querySelector',{nodeId:root.nodeId,selector});
      const {fonts}=await cdp.send('CSS.getPlatformFontsForNode',{nodeId});
      expect(fonts.some(font=>font.isCustomFont&&font.glyphCount>0&&family.test(font.familyName)),selector+' rendered custom font: '+JSON.stringify(fonts)).toBe(true);
    }
  }finally{await cdp.detach();}
  await testInfo.attach('local-font-menu',{body:await page.screenshot(),contentType:'image/png'});
  await press(page,'#start');
  await expect.poll(async()=>(await canvasFrame(page)).battle?.text?.some(label=>label.text==='HOME CITADEL'&&label.font.includes('DM Sans'))).toBe(true);
  expect(await page.locator('#battle').evaluate(canvas=>{
    const pixels=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
    for(let i=3;i<pixels.length;i+=4)if(pixels[i])return true;return false;
  })).toBe(true);
  await testInfo.attach('local-font-battle',{body:await page.screenshot(),contentType:'image/png'});
});

test('complete font notices remain keyboard accessible and wrap at narrow and landscape sizes',async ({page},testInfo)=>{
  const expected=normalizeNotice(await readFile(new URL('../../dist/FONTS-NOTICES.txt',import.meta.url),'utf8'));
  await page.goto('/');await press(page,'#welcomeSettings');
  const before=await page.evaluate(key=>localStorage.getItem(key),SAVE);
  await expect(page.locator('#creditsDetails')).toHaveJSProperty('open',false);
  await page.locator('#creditsDetails > summary').focus();await page.keyboard.press('Space');
  await expect(page.locator('#creditsDetails')).toHaveJSProperty('open',true);
  await expect(page.locator('#creditsDetails > summary')).toBeFocused();
  expect(normalizeNotice(await page.locator('#fontLicenseText').textContent())).toBe(expected);
  expect(expected.match(/SIL OPEN FONT LICENSE Version 1\.1/g)).toHaveLength(2);
  for(const size of [{width:320,height:568},{width:844,height:390}]){
    await page.setViewportSize(size);await page.locator('#fontLicenseText').scrollIntoViewIfNeeded();
    const dimensions=await page.locator('#fontLicenseText').evaluate(element=>({
      width:element.clientWidth,scrollWidth:element.scrollWidth,height:element.clientHeight,scrollHeight:element.scrollHeight,
      x:element.getBoundingClientRect().x,right:element.getBoundingClientRect().right,
      whiteSpace:getComputedStyle(element).whiteSpace,
    }));
    expect(dimensions.width).toBeGreaterThan(100);expect(dimensions.height).toBeGreaterThan(80);
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.width+1);expect(dimensions.scrollHeight).toBeGreaterThan(dimensions.height);
    expect(dimensions.x).toBeGreaterThanOrEqual(0);expect(dimensions.right).toBeLessThanOrEqual(size.width+1);
    expect(dimensions.whiteSpace).toBe('pre-wrap');
    await page.locator('#fontLicenseText').focus();await expect(page.locator('#fontLicenseText')).toBeFocused();
    await page.keyboard.press('End');
    await expect.poll(()=>page.locator('#fontLicenseText').evaluate(element=>element.scrollHeight-element.clientHeight-element.scrollTop)).toBeLessThanOrEqual(2);
    await testInfo.attach('font-license-'+size.width+'x'+size.height,{body:await page.screenshot(),contentType:'image/png'});
    await page.keyboard.press('Home');await expect.poll(()=>page.locator('#fontLicenseText').evaluate(element=>element.scrollTop)).toBe(0);
  }
  await page.locator('#creditsDetails > summary').focus();await page.keyboard.press('Space');
  await expect(page.locator('#creditsDetails')).toHaveJSProperty('open',false);
  expect(await page.evaluate(key=>localStorage.getItem(key),SAVE)).toBe(before);
  await page.locator('#settingsDone').scrollIntoViewIfNeeded();await press(page,'#settingsDone');await expect(page.locator('#welcome')).toBeVisible();
});
