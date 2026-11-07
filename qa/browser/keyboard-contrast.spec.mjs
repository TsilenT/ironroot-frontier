import {expect} from '@playwright/test';
import {writeFile} from 'node:fs/promises';
import {test, press} from './map-browser-helpers.mjs';

const row = (page, action) => page.locator(`[data-keyboard-action="${action}"]`);
const stage = process.env.IRONROOT_CONTRAST_STAGE || 'candidate';

// Inspect the actual button fill, border, opacity and focus outline. Requiring
// an opaque fill avoids silently calculating against an assumed ancestor or
// native background. No canvas, game state or storage-write hooks are used.
function paintedButton(element) {
  const style = getComputedStyle(element);
  const rgba = value => {
    const parts = value.match(/[\d.]+/g)?.map(Number);
    if (!parts || parts.length < 3) throw Error('Unrecognized computed color: ' + value);
    return [...parts.slice(0, 3), parts[3] ?? 1];
  };
  const luminance = color => color.slice(0,3).map(channel => {
    const value = channel / 255;
    return value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4;
  }).reduce((sum, value, index) => sum + value * [.2126,.7152,.0722][index], 0);
  const foreground = rgba(style.color), background = rgba(style.backgroundColor);
  const contrast = (left, right) => {
    // Forced-color highlight borders/outlines can be translucent. Composite
    // them against the measured opaque fill before calculating contrast.
    const painted = left.slice(0,3).map((value,index)=>value*left[3]+right[index]*(1-left[3]));
    const a = luminance(painted), b = luminance(right);
    return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);
  };
  const rect = element.getBoundingClientRect();
  return {label:element.getAttribute('aria-label'), disabled:element.disabled,
    color:style.color, backgroundColor:style.backgroundColor, backgroundImage:style.backgroundImage,
    foregroundAlpha:foreground[3], backgroundAlpha:background[3], opacity:Number(style.opacity),
    textContrast:contrast(foreground, background),
    borderContrastAgainstFill:contrast(rgba(style.borderTopColor), background),
    outlineContrastAgainstFill:contrast(rgba(style.outlineColor), background),
    borderColor:style.borderTopColor, borderStyle:style.borderTopStyle, borderWidth:parseFloat(style.borderTopWidth),
    outlineColor:style.outlineColor, outlineStyle:style.outlineStyle, outlineWidth:parseFloat(style.outlineWidth),
    outlineOffset:parseFloat(style.outlineOffset), focusVisible:element.matches(':focus-visible'),
    forcedColorAdjust:style.forcedColorAdjust,
    rect:{x:rect.x,y:rect.y,width:rect.width,height:rect.height},
  };
}

function readable(sample) {
  expect(sample.disabled).toBe(false);
  expect(sample.opacity).toBe(1);
  expect(sample.foregroundAlpha).toBe(1);
  expect(sample.backgroundAlpha).toBe(1);
  expect(sample.backgroundImage).toBe('none');
  expect.soft(sample.textContrast, `${sample.label}: ${sample.color} on ${sample.backgroundColor}`).toBeGreaterThanOrEqual(4.5);
  expect.soft(sample.borderWidth, sample.label + ' has an actual border').toBeGreaterThanOrEqual(1);
  expect.soft(sample.borderStyle).not.toBe('none');
  expect.soft(sample.borderContrastAgainstFill, sample.label + ' boundary against its fill').toBeGreaterThanOrEqual(3);
}

async function openControls(page) {
  await page.goto('/'); await press(page,'#welcomeSettings');
  await press(page,'#keyboardSettings > summary');
  await expect(page.locator('#keyboardRows button:enabled')).toHaveCount(24);
}

async function checkControls(page, info, forcedColors = false) {
  await openControls(page);
  const samples = {stage, profile:info.project.name, viewport:page.viewportSize(), forcedColors, normal:[], hover:[], focus:[], geometry:[]};
  for (const button of await page.locator('#keyboardRows button').all()) samples.normal.push(await button.evaluate(paintedButton));
  // One soft check per distinct normal palette, while retaining all 24 actual
  // samples. A failure must not skip the real Change/Clear/capture assertions.
  for (const sample of [...new Map(samples.normal.map(s=>[JSON.stringify([s.color,s.backgroundColor,s.borderColor,s.borderWidth]),s])).values()]) readable(sample);
  expect(await page.locator('.settings-modal').evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);
  expect(await page.locator('.settings-content').evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);
  for (const action of ['build1','panLeft','panRight']) for (const attr of ['change','clear']) {
    const button=row(page,action).locator(`[data-keyboard-${attr}]`);
    await button.scrollIntoViewIfNeeded();
    const rect=await button.boundingBox(), viewport=page.viewportSize();
    samples.geometry.push({action,button:attr,...rect});
    expect(rect.x).toBeGreaterThanOrEqual(0); expect(rect.x+rect.width).toBeLessThanOrEqual(viewport.width+1);
    expect(rect.y).toBeGreaterThanOrEqual(0); expect(rect.y+rect.height).toBeLessThanOrEqual(viewport.height+1);
    expect(rect.height).toBeGreaterThanOrEqual(44);
  }
  const change=row(page,'panLeft').locator('[data-keyboard-change]');
  const clear=row(page,'panLeft').locator('[data-keyboard-clear]');
  if (info.project.name==='desktop') for (const button of [change,clear]) {
    await button.hover(); const sample=await button.evaluate(paintedButton);
    samples.hover.push(sample); readable(sample);
  }
  await page.mouse.move(0,0);
  await row(page,'pause').locator('[data-keyboard-clear]').focus();
  await page.keyboard.press('Tab'); await expect(change).toBeFocused();
  for (const button of [change,clear]) {
    const sample=await button.evaluate(paintedButton); samples.focus.push(sample); readable(sample);
    expect(sample.focusVisible).toBe(true); expect(sample.outlineWidth).toBeGreaterThanOrEqual(2);
    expect(sample.outlineStyle).not.toBe('none'); expect(sample.outlineOffset).toBeGreaterThanOrEqual(2);
    expect(sample.outlineContrastAgainstFill).toBeGreaterThanOrEqual(3);
    if(forcedColors) expect(sample.forcedColorAdjust).toBe('auto');
    await page.keyboard.press('Tab');
  }
  // Return by native keyboard movement and capture using native Enter.
  await page.keyboard.press('Shift+Tab'); await page.keyboard.press('Shift+Tab');
  await expect(change).toBeFocused();
  await page.screenshot({path:info.outputPath(`${stage}${forcedColors?'-forced':''}.png`)});
  await page.keyboard.press('Enter'); await expect(page.locator('#keyboardStatus')).toContainText('Press a key');
  await page.keyboard.press('KeyA'); await expect(row(page,'panLeft').locator('.keyboard-key')).toHaveText('A');
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('ironroot.settings.v1')).keyboard.bindings.panLeft)).toBe('KeyA');
  await press(page,'[data-keyboard-action="panLeft"] [data-keyboard-clear]'); await expect(row(page,'panLeft').locator('.keyboard-key')).toHaveText('Unbound');
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('ironroot.settings.v1')).keyboard.bindings.panLeft)).toBeNull();
  await press(page,'#keyboardDefaults'); await expect(row(page,'panLeft').locator('.keyboard-key')).toHaveText('Left arrow');
  samples.realActions = {nativeEnterCapture:true, remapped:'KeyA', cleared:null, defaultsRestored:true};
  await writeFile(info.outputPath(`${stage}${forcedColors?'-forced':''}.json`),JSON.stringify(samples,null,2)+'\n');
}

test('enabled keyboard buttons have readable painted states, visible focus and real actions',async({page},info)=>{
  test.setTimeout(40000);
  await checkControls(page,info);
});

test('keyboard buttons preserve native forced colors and keyboard activation',async({page},info)=>{
  test.skip(info.project.name!=='desktop','One bounded native forced-colors profile.');
  test.setTimeout(40000);
  await page.emulateMedia({forcedColors:'active'});
  await checkControls(page,info,true);
});
