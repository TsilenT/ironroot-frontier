/** Focused, reproducible interaction audit; does not establish device performance.
 * Serve the repository root first. No dependency installation is performed here.
 * FLIGHT_COMMAND_PLAYWRIGHT=/path/to/playwright/index.mjs node qa/flight-command/browser-smoke.mjs [baseURL]
 */
import assert from 'node:assert/strict';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const {chromium}=await import(process.env.FLIGHT_COMMAND_PLAYWRIGHT||'playwright');
const base=process.argv[2]||'http://127.0.0.1:8765',output=new URL('./browser-evidence/',import.meta.url);
mkdirSync(output,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.FLIGHT_COMMAND_CHROMIUM||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const rows=[];
try{
  for(const viewport of [{width:1280,height:1000},{width:390,height:844}]){
    const touch=viewport.width===390,context=await browser.newContext({viewport,deviceScaleFactor:1,hasTouch:touch,isMobile:touch});
    const page=await context.newPage(),errors=[],requests=[];page.on('pageerror',error=>errors.push(String(error)));page.on('request',request=>requests.push(request.url()));
    await page.addInitScript(()=>{localStorage.setItem('ironroot.battle.v1','flight-command-battle-sentinel');localStorage.setItem('ironroot.campaign.v1','flight-command-campaign-sentinel');});
    await page.goto(base+'/qa/flight-command/');await page.waitForSelector('[data-order="0"]');
    const storageBefore=await page.evaluate(()=>({...localStorage}));
    const activate=async selector=>{const locator=page.locator(selector);await locator.scrollIntoViewIfNeeded();touch?await locator.tap():await locator.click();};
    assert.match(await page.locator('#clock').innerText(),/Paused/);
    assert.match(await page.locator('#launch').innerText(),/Hold Middle/);
    assert.equal(await page.locator('#orders button').count(),3);
    const orderBoxes=await page.locator('#orders button').evaluateAll(buttons=>buttons.map(button=>({width:button.getBoundingClientRect().width,height:button.getBoundingClientRect().height})));
    assert.ok(orderBoxes.every(box=>box.width>=44&&box.height>=44),'Order controls must meet 44px touch dimensions');
    // Native alternatives to canvas use the same paid actions.
    await page.locator('#site').selectOption('270');await activate('#place');
    assert.match(await page.locator('#message').innerText(),/built for 175 gold/);assert.match(await page.locator('#gold').innerText(),/245 gold/);assert.match(await page.locator('#spend').innerText(),/175 gold/);
    await activate('[data-order="0"]');assert.equal(await page.locator('[data-order="0"]').getAttribute('aria-pressed'),'true');
    await activate('#pause');await activate('#speed');
    await page.waitForFunction(()=>document.querySelector('#flights tr[data-to="0"]'),null,{timeout:15000});
    await activate('#pause');
    const committed=await page.locator('#flights tr[data-to="0"]').first().evaluate(row=>({...row.dataset}));
    const firstWaveIds=await page.locator('#flights tr[data-unit]').evaluateAll(flights=>flights.map(row=>Number(row.dataset.unit)));
    await activate('[data-order="1"]');
    const unchanged=await page.locator(`#flights tr[data-unit="${committed.unit}"]`).evaluate(row=>({...row.dataset}));
    assert.deepEqual(unchanged,committed,'Retasking an aerie leaves the airborne flight unchanged');
    assert.match(await page.locator('#orderNotice').innerText(),/airborne.*keep/);
    await activate('#pause');
    await page.waitForFunction(()=>/warnings/.test(document.querySelector('#routeCounts').textContent)&&/Observed: [1-9]/.test(document.querySelector('#routeCounts').textContent),null,{timeout:15000});
    await page.waitForFunction(()=>/Crossing/.test(document.querySelector('#flights').textContent),null,{timeout:15000});
    await activate('#pause');await activate('#gates');
    const transit=await page.locator('#flights').innerText();
    await page.screenshot({path:new URL(`crossing-${viewport.width}.png`,output).pathname,fullPage:true});
    await activate('#pause');
    await page.waitForFunction(()=>/· [1-9][0-9]* arrivals/.test(document.querySelector('#routeCounts').textContent),null,{timeout:15000});
    await page.waitForFunction(max=>Array.from(document.querySelectorAll('#flights tr[data-unit]')).some(row=>Number(row.dataset.unit)>max&&row.dataset.phase==='hold'&&row.dataset.to==='1'),Math.max(...firstWaveIds),{timeout:15000});
    await activate('#pause');const nextWave=await page.locator('#flights').innerText(),routeCounts=await page.locator('#routeCounts').innerText();
    assert.match(routeCounts,/[1-9][0-9]* warnings/);assert.match(routeCounts,/[1-9][0-9]* crossings/);assert.match(routeCounts,/[1-9][0-9]* arrivals/);
    // A different authored scene and two-road controls stay separate from pilots.
    await page.locator('#scenario').selectOption('pressed-road');await page.locator('#map').selectOption('command-two-roads');await activate('#reset');
    assert.equal(await page.locator('#orders button').count(),2);assert.equal(await page.locator('#road option').count(),2);assert.match(await page.locator('#orderNotice').innerText(),/^Orders are free/);
    // Observe a paid, launch-triggered counter in a fresh comparable setup.
    await page.locator('#scenario').selectOption('open-supply');await page.locator('#map').selectOption('command-three-roads');await page.locator('#response').selectOption('destination-archery');await activate('#reset');await activate('[data-order="0"]');
    assert.match(await page.locator('#enemySpend').innerText(),/^0 gold/);
    await activate('#pause');
    await page.waitForFunction(()=>Number(document.querySelector('#enemySpend').textContent.replace(/[^0-9]/g,''))>=175,null,{timeout:15000});
    await activate('#pause');const responseSpending=await page.locator('#enemySpend').innerText();assert.match(responseSpending,/175|350/);
    await page.locator('#road').selectOption('0');await page.locator('#site').selectOption('270');await activate('#place');assert.match(await page.locator('#message').innerText(),/built for 175/);
    // Space operates when the native form controls do not own focus.
    await page.locator('h1').click();await page.keyboard.press('Space');assert.equal(await page.locator('#pause').getAttribute('aria-pressed'),'false');await page.keyboard.press('Space');assert.equal(await page.locator('#pause').getAttribute('aria-pressed'),'true');
    // Two actual rallies in the unguarded southern road: the first wounds the
    // original pair; the second kills it and awards two 2-gold bounties. Gross
    // response spending must still read 150, rather than the 146 net gold drop.
    await page.locator('#scenario').selectOption('baited-supply');await page.locator('#response').selectOption('rally');await activate('#reset');
    const aerieIds=await page.locator('#aerie option').evaluateAll(options=>options.map(option=>option.value));
    for(const id of aerieIds){await page.locator('#aerie').selectOption(id);await activate('[data-order="2"]');}
    await activate('#pause');
    await page.waitForFunction(()=>document.querySelector('#enemySpend').textContent==='75 gold',null,{timeout:15000});await activate('#pause');
    const woundedWave=await page.locator('#flights tr[data-unit]').evaluateAll(flights=>flights.map(row=>row.dataset.unit));assert.equal(woundedWave.length,2);
    await activate('#pause');
    await page.waitForFunction(()=>document.querySelector('#enemySpend').textContent==='150 gold',null,{timeout:15000});await activate('#pause');
    const survivingIds=await page.locator('#flights tr[data-unit]').evaluateAll(flights=>flights.map(row=>row.dataset.unit));assert.ok(woundedWave.every(id=>!survivingIds.includes(id)),'Second rally killed the original wounded pair');
    const rallyGrossSpend=await page.locator('#enemySpend').innerText();assert.equal(rallyGrossSpend,'150 gold');
    // The player also pays the full nominal rally cost, independently of income.
    await page.locator('#road').selectOption('2');await activate('#rallyGate');assert.equal(await page.locator('#spend').innerText(),'75 gold');
    const storageAfter=await page.evaluate(()=>({...localStorage}));assert.deepEqual(storageAfter,storageBefore);assert.deepEqual(errors,[]);assert.ok(requests.every(url=>url.startsWith(base+'/')),'No external resource requests');
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);assert.equal(overflow,false,'Page should fit; battlefield scroll is contained');
    await page.screenshot({path:new URL(`counter-${viewport.width}.png`,output).pathname,fullPage:true});
    rows.push({viewport,touch,orderBoxes,nativePaidPlacement:true,committedFlightBefore:committed,committedFlightAfter:unchanged,transit,nextWave,routeCounts,responseSpending,rallyGrossSpend,rallyWoundedWave:woundedWave,rallyKilledOriginalPair:true,playerRallyGrossSpend:'75 gold',keyboardPause:true,setupResetClearsNotice:true,pageErrors:errors,externalRequests:0,storagePreserved:true,pageOverflow:overflow});
    await context.close();
  }
}finally{await browser.close();}
const hash=file=>createHash('sha256').update(readFileSync(new URL(file,import.meta.url))).digest('hex');
const report={browser:'Headless system Chromium',scope:'Actual touch taps at 390px and mouse/keyboard at 1280px; synthetic viewport audit, not physical-device certification',hashes:Object.fromEntries(['./app.js','./index.html','./styles.css','./scenarios.js','../lane-lab/engine.js','./browser-smoke.mjs'].map(file=>[file,hash(file)])),rows};
writeFileSync(new URL('results.json',output),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
