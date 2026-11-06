/** Optional browser audit. Requires Playwright and an already running root server.
 * LANE_LAB_PLAYWRIGHT may point to an existing Playwright index.mjs installation.
 */
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const {chromium}=await import(process.env.LANE_LAB_PLAYWRIGHT||'playwright');
const base=process.argv[2]||'http://127.0.0.1:8765';
const output=new URL('./browser-evidence/',import.meta.url);
mkdirSync(output,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.LANE_LAB_CHROMIUM||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const rows=[];
try {
  for(const viewport of [{width:1280,height:1000},{width:390,height:844}]) {
    const context=await browser.newContext({viewport,deviceScaleFactor:1});
    const page=await context.newPage(),errors=[],requests=[];
    page.on('pageerror',e=>errors.push(String(e)));
    page.on('request',r=>requests.push(r.url()));
    await page.addInitScript(()=>{localStorage.setItem('ironroot.campaign.v1','lane-lab-preserve-campaign');localStorage.setItem('ironroot.battle.v1','lane-lab-preserve-battle');});
    await page.goto(base+'/qa/lane-lab/');
    await page.waitForFunction(()=>document.querySelectorAll('#buildings button').length===7);
    const storageBefore=await page.evaluate(()=>({...localStorage}));
    assert.match(await page.locator('#mapDetail').innerText(),/1 road · 8 sites/);
    assert.match(await page.locator('#clock').innerText(),/Paused/);
    await page.locator('[data-building=archery]').click();
    await page.locator('#site').selectOption('270');
    await page.locator('#place').click();
    assert.match(await page.locator('#message').innerText(),/built for 175/);
    assert.match(await page.locator('#gold').innerText(),/245 gold/);
    for(const [map,roads] of [['two-roads',2],['three-roads',3]]) {
      await page.locator('#map').selectOption(map);await page.locator('#reset').click();await page.locator('#pause').click();
      assert.match(await page.locator('#mapDetail').innerText(),new RegExp(roads+' roads'));
      assert.equal(await page.locator('#road option').count(),roads);
    }
    await page.locator('#map').selectOption('three-roads-crosswind');
    await page.locator('#demo').click();await page.locator('#speed').click();
    await page.waitForFunction(()=>/crossing [1-9]/.test(document.querySelector('#routes').textContent),null,{timeout:15000});
    const transit=await page.locator('#routes').innerText();
    await page.locator('#pause').click();
    assert.match(await page.locator('#scene').innerText(),/FREE authored/);
    await page.locator('#gates').click();
    await page.screenshot({path:new URL(`crossing-${viewport.width}.png`,output).pathname,fullPage:true});
    await page.locator('#pause').click();
    await page.waitForFunction(()=>/landed [1-9]/.test(document.querySelector('#routes').textContent),null,{timeout:15000});
    await page.locator('#pause').click();
    const landed=await page.locator('#routes').innerText();
    for(const [pilot,roads] of [['first-road',1],['divided-front',2],['full-front',3]]) {
      await page.locator('#scenario').selectOption(pilot);await page.locator('#reset').click();await page.locator('#pause').click();
      assert.equal(await page.locator('#road option').count(),roads);
      assert.match(await page.locator('#scene').innerText(),/No campaign progress or rewards/);
      assert.equal(await page.locator('#map').isDisabled(),true);
      assert.equal(await page.locator('#objective').isVisible(),true);
    }
    const protectedMine=await page.locator('#owned option').evaluateAll(options=>options.find(v=>v.textContent.includes('Gold mine')).value);
    await page.locator('#owned').selectOption(protectedMine);await page.locator('#sell').click();
    assert.match(await page.locator('#clock').innerText(),/Pilot failed/);
    assert.match(await page.locator('#objective').innerText(),/original protected mine/);
    const failedClock=await page.locator('#clock').innerText();await page.locator('#pause').click();
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    assert.equal(await page.locator('#clock').innerText(),failedClock,'Ended pilot cannot resume');
    const storageAfter=await page.evaluate(()=>({...localStorage}));assert.deepEqual(storageAfter,storageBefore);
    assert.deepEqual(errors,[]);assert.ok(requests.every(url=>url.startsWith(base+'/')),'No external requests');
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);
    assert.equal(overflow,false,'Page itself should fit; battlefield intentionally scrolls within its panel');
    rows.push({viewport,transit,landed,pilots:[1,2,3],protectedMineFailureStops:true,pageErrors:errors,externalRequests:0,storagePreserved:true,pageOverflow:false});
    await context.close();
  }
} finally {await browser.close();}
const hash=file=>createHash('sha256').update(readFileSync(new URL(file,import.meta.url))).digest('hex');
const report={browser:'Headless system Chromium',scope:'Desktop and narrow viewport smoke, not physical-device or production-renderer QA',hashes:Object.fromEntries(['./app.js','./styles.css','./index.html','./engine.js','./campaign.js'].map(p=>[p,hash(p)])),rows};
writeFileSync(new URL('results.json',output),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
