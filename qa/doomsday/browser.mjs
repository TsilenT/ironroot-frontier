/** Ordinary paid browser controls and storage observation; no game state hook. */
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.IRONROOT_PLAYWRIGHT_MODULE??new URL('../browser/node_modules/@playwright/test/index.mjs',import.meta.url).href);
const out=process.argv[2]??'/tmp/ironroot-doomsday-browser';await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH??'/usr/bin/chromium',args:['--no-sandbox']});
const records=[];
async function saved(page){return page.evaluate(()=>Object.entries(sessionStorage).filter(([k])=>k.startsWith('ironroot.doomsday.lab.')).map(([k,v])=>{try{return {key:k,value:JSON.parse(v)};}catch{return null;}}).find(item=>item?.value?.game)?.value);}
try{for(const [name,viewport,mobile] of [['desktop',{width:1180,height:757},false],['phone',{width:390,height:650},true],['landscape',{width:844,height:390},true]]){
  const context=await browser.newContext({viewport,isMobile:mobile,hasTouch:mobile});const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  const press=async selector=>{if(mobile)await page.locator(selector).tap();else await page.locator(selector).click();};
  await page.goto(process.env.IRONROOT_DOOMSDAY_URL??'http://127.0.0.1:4193/?seed=202');
  await page.locator('#qaAscentBrief').waitFor();
  const brief=await page.locator('#qaAscentBrief').innerText();assert.match(brief,/Existing Hard AI/);assert.match(brief,/At 5:00/);assert.match(brief,/no real campaign progress/);
  assert.equal(await page.locator('#qaAscentBrief').evaluate(el=>getComputedStyle(el).overflow),'visible');
  await page.screenshot({path:`${out}/${name}-briefing.png`});
  await press('#start');await page.locator('#welcome').waitFor({state:'hidden'});await page.locator('#viewportModal').waitFor({state:'hidden'});
  await press('#pause');await page.locator('#pauseVeil').waitFor({state:'visible'});
  const initial=await saved(page);assert.equal(initial.game.difficulty,'hard');assert.equal(initial.game.state.buildings.filter(b=>b.side===0).length,7);assert.equal(initial.game.state.bases[0].hp,3800);
  await press('#pauseCitadel');await page.locator('#citadelModal').waitFor({state:'visible'});
  const before=await saved(page);await press('#buyCitadelRegen');const after=await saved(page);
  assert.equal(after.game.state.citadelOptions.sides[0].choice,'regen');assert.equal(before.game.state.gold[0]-after.game.state.gold[0],190);assert.equal(before.game.state.time,after.game.state.time);
  await press('#citadelBack');await press('#saveExit');await page.reload();await press('#resumeSaved');
  await page.locator('#welcome').waitFor({state:'hidden'});await press('#pause');await page.locator('#pauseVeil').waitFor({state:'visible'});
  const resumed=await saved(page);assert.equal(resumed.game.difficulty,'hard');assert.equal(resumed.game.state.citadelOptions.sides[0].choice,'regen');
  await page.screenshot({path:`${out}/${name}-resumed.png`});
  await press('#restartBattle');await press('#confirmRestart');
  await page.locator('#pauseVeil').waitFor({state:'hidden'});await press('#pause');await page.locator('#pauseVeil').waitFor({state:'visible'});
  const restarted=await saved(page);assert.equal(restarted.game.difficulty,'hard');assert.equal(restarted.game.state.citadelOptions.sides[0].choice,null);assert.equal(restarted.game.state.bases[0].hp,3800);assert.equal(restarted.game.state.buildings.filter(b=>b.side===0).length,7);
  assert.equal(await page.evaluate(()=>localStorage.length),0);assert.equal(await page.evaluate(async()=>(await navigator.serviceWorker.getRegistrations()).length),0);assert.deepEqual(errors,[]);
  records.push({name,viewport,briefing:true,paidRegeneration:true,sameTabReloadResume:true,restartFreshHardSetup:true,localStorageWrites:0,serviceWorkers:0,pageErrors:errors,initialTime:initial.game.state.time,resumeTime:resumed.game.state.time,restartTime:restarted.game.state.time});
  await context.close();console.log(`${name}: paid citadel purchase, resume, restart, storage isolation passed`);
}}finally{await browser.close();await writeFile(`${out}/results.json`,JSON.stringify({scope:'Synthetic UI smoke only. No human difficulty, full combat, production saves, or campaign/ending integration claim.',records},null,2)+'\n');}
