// 0.12 integration gates. Browser/server execution is only for the separately
// authorized runner. Synthetic fixtures below are not human-play/balance proof.
import {expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {Game,MAPS} from '../../dist/engine.js';
import {BACKUP_STORAGE_KEYS,parseBackup} from '../../dist/backup.js';
import {CAMPAIGN_STORAGE_KEY} from '../../dist/campaign.js';
import {test,press,tapPoint,homePoint,pause,saved,seedOnce,selectMap,openBackup,downloadBackup} from './map-browser-helpers.mjs';
import {installPad,padButton} from './map-controller-helpers.mjs';
import {REPORT_CASES,reportFixture,imminentSkirmishFixture} from './battle-report-fixtures.mjs';
import {REPORT_LEGACY_PATH} from './battle-report-legacy-fixtures.mjs';
const SAVE=BACKUP_STORAGE_KEYS.battle,HISTORY=BACKUP_STORAGE_KEYS.history;
const reportSelector='#resultReport details.battle-report';
const profileKeys=[...Object.values(BACKUP_STORAGE_KEYS),'ironroot.profile.v1'];
async function profile(page){return page.evaluate(keys=>Object.fromEntries(keys.map(key=>[key,localStorage.getItem(key)])),profileKeys);}
async function seedResult(page,kind='campaign-primary-zero'){
  const fixture=reportFixture(kind);
  await seedOnce(page,{[SAVE]:JSON.stringify(fixture.envelope),[CAMPAIGN_STORAGE_KEY]:JSON.stringify(fixture.progress)});
  await press(page,'#resumeSaved');await expect(page.locator('#resultModal')).toBeVisible();
  await expect(page.locator('#playAgain')).toBeFocused();
  await expect(page.locator(reportSelector)).toHaveJSProperty('open',false);
  await expect(page.locator('[data-report-download]')).toBeHidden();
  return fixture;
}
async function openReport(page){
  if(!await page.locator(reportSelector).evaluate(element=>element.open))await press(page,reportSelector+' > summary');
  await expect(page.locator(reportSelector)).toHaveJSProperty('open',true);
}
async function readDownload(file){
  expect(await file.failure()).toBeNull();
  expect(file.suggestedFilename()).toMatch(/^ironroot-report-[a-z0-9-]+-\d{4}-\d{2}-\d{2}\.json$/);
  const stream=await file.createReadStream(),chunks=[];expect(stream).not.toBeNull();
  for await(const chunk of stream)chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
async function downloadReport(page){
  await openReport(page);
  const downloadEvent=page.waitForEvent('download');
  await press(page,'[data-report-download]');
  const data=await readDownload(await downloadEvent);
  await expect(page.locator('[data-report-status]')).toHaveText('Report download started. Check your browser’s downloads to keep it.');
  return data;
}
function expectScope(report,fixture){
  expect(report).toMatchObject({format:'ironroot-battle-report',version:2,identity:fixture.identity,context:fixture.expected.context,outcome:{result:fixture.expected.result},scope:{resumed:true,startedAt:fixture.envelope.game.state.time,missingBefore:fixture.envelope.game.state.time,fullTimeline:false,counters:'full-match-engine'}});
  expect(report.map.id).toBe(Game.restore(fixture.envelope.game).map.id);
  expect(report.timeline[0]).toEqual(report.initial);expect(report.timeline.at(-1)).toEqual(report.final);
  expect(report.final.time).toBe(fixture.expected.time);expect(report.outcome.engineWinner).toBe(fixture.expected.winner);
  expect(report.final.time).toBe(report.scope.endedAt);expect(report.scope.observedDuration).toBeCloseTo(report.scope.endedAt-report.scope.startedAt,8);
  expect(report.timeline.length).toBeGreaterThan(0);expect(report.timeline.length).toBeLessThanOrEqual(256);
  expect(report.sampling).toMatchObject({maximumPoints:256,retainedPoints:report.timeline.length,interpolated:false});
  for(let i=1;i<report.timeline.length;i++)expect(report.timeline[i].time).toBeGreaterThan(report.timeline[i-1].time);
  for(const side of [0,1])expect(report.cumulativeStats[side]).toEqual({side,kills:fixture.expected.stats.kills[side],built:fixture.expected.stats.built[side],damage:fixture.expected.stats.damage[side]});
  expect(report.limitations.join(' ')).toMatch(/Earlier timeline observations are unavailable/i);
  expect(report.limitations.join(' ')).toMatch(/not gold received/i);
  expect(report.limitations.join(' ')).toMatch(/not included in saves, history, or backups/i);
  for(const field of ['game','seed','settings','campaignProgress','history','backup','replay'])expect(report).not.toHaveProperty(field);
}
async function assertActionsVisible(page){
  for(const id of ['playAgain','resultMenu','inspectBattle']){
    await expect(page.locator('#'+id)).toBeInViewport({ratio:1});
    expect(await page.locator('#'+id).evaluate(element=>{
      const r=element.getBoundingClientRect();return document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest('button')===element;
    }),id+' remains genuinely hit-testable without automatic scrolling').toBe(true);
  }
}

for(const kind of REPORT_CASES)test('synthetic persisted '+kind+' produces genuine scoped report JSON without replacing cumulative counters',async({page})=>{
  const fixture=await seedResult(page,kind),before=await profile(page);
  const report=await downloadReport(page);expectScope(report,fixture);
  await expect(page.locator('.report-scope')).toContainText('Recording began when this battle was resumed on this page');
  if(fixture.envelope.game.state.time>0){
    await expect(page.locator('.report-scope')).toContainText('is not in these charts');
    await expect(page.locator('.report-scope')).toContainText('Battle totals above still include that earlier play');
  }
  await expect(page.locator('#resultReport')).toContainText('the whole battle, including play before a resume');
  const totalsHeading=page.locator('#resultReport .report-section > h3').filter({hasText:/^Battle totals$/});
  await expect(totalsHeading).toHaveCount(1);
  expect(await totalsHeading.evaluate(heading=>Boolean(heading.closest('section').compareDocumentPosition(document.querySelector('.report-scope'))&Node.DOCUMENT_POSITION_FOLLOWING)),'plain Battle totals precede recording coverage').toBe(true);
  expect(()=>parseBackup(JSON.stringify(report))).toThrow();expect(()=>Game.restore(report)).toThrow();
  expect(await profile(page)).toEqual(before);
  expect(await saved(page)).toBeNull();
  expect(await page.locator('#resultKills').textContent()).toBe(String(report.cumulativeStats[0].kills));
  expect(await page.locator('#resultBuilt').textContent()).toBe(String(report.cumulativeStats[0].built));
  if(kind==='campaign-primary-zero'){
    expect(report.scope.startedAt).toBe(0);expect(report.final.time).toBe(.05);expect(report.scope.observedDuration).toBe(.05);
    expect(report.timeline.map(sample=>sample.time)).toEqual([0,.05]);expect(report.outcome.engineWinner).toBeNull();
    await expect(page.locator('#resultTime')).toHaveText('00:00');
  }
  if(kind==='trial-primary'){
    expect(report.final.time).toBe(40-1e-10); // Export is full precision, never presentation-rounded.
    await expect(page.locator('#resultTime')).toHaveText('00:40');
    await expect(page.locator('.report-header > p')).toContainText('0:40 battle time');
    await expect(page.locator('.report-scope')).toContainText('at 0:39. Recording ends at 0:40.');
    await expect(page.locator('.report-x-axis')).toHaveText(Array(4).fill('0:390:40'));
    expect(report.timeline.map(sample=>sample.time)).toEqual([fixture.envelope.game.state.time,40-1e-10]);
  }
  if(kind.includes('primary')||kind.includes('alternate')||kind.includes('failure'))expect(report.outcome.source).toBe('objective');
  if(kind.endsWith('alternate')){
    expect(report.outcome.label).toMatch(/Enemy citadel destroyed/i);
    expect(report.objectives.targets.filter(t=>t.kind==='destroy').every(t=>t.alive)).toBe(true);
  }
  if(kind.includes('primary'))expect(report.objectives.targets.filter(t=>t.kind==='destroy').every(t=>!t.alive)).toBe(true);
  if(kind==='campaign-protected-failure')expect(report.objectives.targets.some(t=>t.kind==='protect'&&!t.alive)).toBe(true);
  if(kind==='skirmish-draw'){
    expect(report.outcome).toMatchObject({result:'draw',source:'engine',engineWinner:'draw'});
    await expect(page.locator('#resultTitle')).toHaveText('DRAW');
  }
});

test('fresh observed Holdfast start ordinary build upgrade and native 2x play reach a natural terminal report',async({page})=>{
  test.setTimeout(110000);
  await page.goto('/');await press(page,'[data-mode="challenges"]');
  await press(page,'#challengeChoices button:has-text("Holdfast")');
  await press(page,'#start');await expect(page.locator('#welcome')).toBeHidden();
  const point=await homePoint(page,MAPS.classic,270,450);
  await press(page,'[data-type="archery"]');await tapPoint(page,point);
  await expect(page.locator('#toast')).toContainText('Archery range raised');
  await press(page,'#cancelBuild');await tapPoint(page,point);await press(page,'#upgrade');
  await expect(page.locator('#selectionDetail')).toContainText('Level 2');await press(page,'#closeSelection');
  const intermediate=await pause(page);
  expect(intermediate.challengeId).toBe('holdfast');expect(intermediate.game.state.stats.built[0]).toBe(2);
  expect(JSON.stringify(intermediate)).not.toContain('ironroot-battle-report');
  await press(page,'#resume');await press(page,'#speed');await press(page,'#speed');
  await expect(page.locator('#speed')).toHaveText('2×');
  // No clock fast-forward, private state hook, seeded victory or time mutation.
  // The live RAF, existing authored deadline and actual combat decide outcome.
  await expect(page.locator('#resultModal')).toBeVisible({timeout:90000});
  await expect(page.locator('#playAgain')).toBeFocused();
  const report=await downloadReport(page);
  expect(report.context).toMatchObject({mode:'challenge',id:'holdfast'});
  expect(report.scope).toMatchObject({resumed:false,startedAt:0,missingBefore:0,fullTimeline:true,counters:'full-match-engine'});
  expect(report.timeline.length).toBeGreaterThan(3);expect(report.timeline.length).toBeLessThanOrEqual(256);
  expect(report.initial.sides[0].buildingCount).toBe(1);expect(report.cumulativeStats[0].built).toBe(2);
  expect(report.timeline.some(point=>point.sides[0].buildingComposition.find(b=>b.type==='archery').count===1)).toBe(true);
  expect(['victory','defeat']).toContain(report.outcome.result);expect(report.outcome.source).toBe('objective');
  expect(report.final.time).toBeLessThanOrEqual(140.0000001);expect(report.final.time).toBeGreaterThan(intermediate.game.state.time);
  expect(await saved(page)).toBeNull();
  test.info().annotations.push({type:'coverage',description:'Live ordinary-input Holdfast lifecycle, not a human strategy or balance claim; no time acceleration except the public 2× control.'});
});

test('reopening completed result preserves report bytes rewards history and all profile storage writes',async({page})=>{
  await seedResult(page);const first=await downloadReport(page);
  await press(page,'#playAgain');await expect(page.locator('#welcome')).toBeVisible();
  await expect(page.locator('#lastResult')).toBeVisible();const before=await profile(page);
  await page.evaluate(()=>{
    window.__qaReportStorageWrites=[];
    for(const method of ['setItem','removeItem','clear']){
      const original=Storage.prototype[method];Storage.prototype[method]=function(...args){
        if(this===localStorage)window.__qaReportStorageWrites.push({method,args});return original.apply(this,args);
      };
    }
  });
  for(let repeat=0;repeat<3;repeat++){
    await press(page,'#lastResult');await expect(page.locator(reportSelector+' > summary')).toBeFocused();
    expect(await downloadReport(page)).toEqual(first);await press(page,'#resultMenu');
    await expect(page.locator('#welcome')).toBeVisible();
  }
  expect(await profile(page)).toEqual(before);
  expect(await page.evaluate(()=>window.__qaReportStorageWrites)).toEqual([]);
  expect(JSON.parse(before[HISTORY])).toHaveLength(1);
  expect(JSON.parse(before[CAMPAIGN_STORAGE_KEY]).missions.emberwatch.stars).toBe(3);
});

test('starting another battle clears last-result access rather than reopening stale report',async({page})=>{
  await seedResult(page);await press(page,'#resultMenu');await expect(page.locator('#lastResult')).toBeVisible();
  await press(page,'[data-mode="skirmish"]');await press(page,'#start');
  await pause(page);await press(page,'#saveExit');await expect(page.locator('#welcome')).toBeVisible();
  await expect(page.locator('#lastResult')).toBeHidden();await expect(page.locator('#resumeSaved')).toBeVisible();
});

test('reload clears ephemeral completed report without putting it in save history or backup',async({page})=>{
  await seedResult(page);await press(page,'#resultMenu');await expect(page.locator('#lastResult')).toBeVisible();
  const before=await profile(page);expect(Object.values(before).join('')).not.toContain('ironroot-battle-report');
  await openBackup(page);const text=await downloadBackup(page);parseBackup(text);
  expect(text).not.toContain('ironroot-battle-report');expect(text).not.toContain('observedPeaks');
  await page.reload();await expect(page.locator('#lastResult')).toBeHidden();
  await expect(page.locator('#resultModal')).toBeHidden();expect(await profile(page)).toEqual(before);
});

test('collapsed report keeps Continue first and native Enter Space disclosure and Tab focus stay inside result',async({page})=>{
  await seedResult(page);
  const summary=page.locator(reportSelector+' > summary');
  await summary.focus();await page.keyboard.press('Space');await expect(page.locator(reportSelector)).toHaveJSProperty('open',true);
  await expect(summary).toBeFocused();await expect(page.locator('#pauseVeil')).toBeHidden();
  await page.keyboard.press('Enter');await expect(page.locator(reportSelector)).toHaveJSProperty('open',false);await expect(summary).toBeFocused();
  const seen=new Set();
  for(let index=0;index<12;index++){
    await page.keyboard.press('Tab');
    const focus=await page.evaluate(()=>({id:document.activeElement.id,inResult:!!document.activeElement.closest('#resultModal'),download:document.activeElement.matches('[data-report-download]')}));
    expect(focus.inResult).toBe(true);expect(focus.download).toBe(false);seen.add(focus.id);
  }
  for(const id of ['playAgain','resultMenu','inspectBattle'])expect(seen.has(id),id+' reachable with closed report').toBe(true);
  await summary.focus();await page.keyboard.press('Space');
  await page.locator('.report-samples > summary').focus();await page.keyboard.press('Space');
  await expect(page.locator('.report-samples')).toHaveJSProperty('open',true);
  await expect(page.locator('#pauseVeil')).toBeHidden();await expect(page.locator('#resultModal')).toBeVisible();
});

test('controller focuses report disclosure and toggles it while Continue and Inspect remain reachable',async({page})=>{
  await installPad(page);await seedResult(page);
  // Only the standard Gamepad API is faked; application navigation is real.
  const seen=new Set();let reached=false;
  for(let step=0;step<24;step++){
    const focus=await page.evaluate(()=>({id:document.activeElement.id,isSummary:document.activeElement.matches('details.battle-report > summary'),download:document.activeElement.matches('[data-report-download]'),inResult:!!document.activeElement.closest('#resultModal')}));
    expect(focus.inResult).toBe(true);expect(focus.download).toBe(false);seen.add(focus.id);
    if(focus.isSummary){reached=true;break;}await padButton(page,13);
  }
  expect(reached,'D-pad must reach native report summary').toBe(true);
  await padButton(page,0);await expect(page.locator(reportSelector)).toHaveJSProperty('open',true);
  await padButton(page,0);await expect(page.locator(reportSelector)).toHaveJSProperty('open',false);
  for(let step=0;step<24;step++){
    seen.add(await page.evaluate(()=>document.activeElement.id));await padButton(page,13);
  }
  for(const id of ['playAgain','inspectBattle'])expect(seen.has(id),id+' reachable with controller').toBe(true);
  await expect(page.locator('#resultModal')).toBeVisible();await expect(page.locator('#pauseVeil')).toBeHidden();
});

for(const viewport of [{width:320,height:568},{width:844,height:390}])test('expanded report at '+viewport.width+'px uses one result scroller and fixed visible actions without focus theft',async({page})=>{
  await seedResult(page,'campaign-protected-failure');await page.setViewportSize(viewport);
  const body=page.locator('#resultBody'),summary=page.locator(reportSelector+' > summary');
  await assertActionsVisible(page);
  const footer=await page.locator('.result-actions').boundingBox();
  await summary.focus();
  const outer=await page.evaluate(()=>({x:scrollX,y:scrollY}));
  await page.keyboard.press('Space');await expect(page.locator(reportSelector)).toHaveJSProperty('open',true);
  await expect(summary).toBeFocused();
  await expect.poll(()=>summary.evaluate(element=>{
    const body=document.getElementById('resultBody'),bounds=body.getBoundingClientRect();
    return Math.abs(element.getBoundingClientRect().top-bounds.top);
  }),{message:'opening the main report aligns its summary at the top of the actual result scroller'}).toBeLessThanOrEqual(2);
  await assertActionsVisible(page);
  expect(await page.evaluate(()=>({x:scrollX,y:scrollY}))).toEqual(outer);
  const content=await page.locator('.report-body').evaluate(element=>{
    const style=getComputedStyle(element);return {maxHeight:style.maxHeight,overflowY:style.overflowY,clientHeight:element.clientHeight,scrollHeight:element.scrollHeight};
  });
  expect(content.maxHeight).toBe('none');expect(content.overflowY).toBe('visible');
  expect(content.scrollHeight).toBeLessThanOrEqual(content.clientHeight+1);
  const nestedSummary=page.locator('.report-samples > summary');
  await nestedSummary.focus();
  const nestedScroll=await body.evaluate(element=>element.scrollTop);
  await page.keyboard.press('Space');await expect(page.locator('.report-samples')).toHaveJSProperty('open',true);
  // Let deferred toggle/rAF work finish before checking that a subdisclosure
  // did not mistakenly invoke the main report's top-alignment behavior.
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  await expect(nestedSummary).toBeFocused();
  expect(Math.abs(await body.evaluate(element=>element.scrollTop)-nestedScroll),'nested disclosure does not realign the main report').toBeLessThanOrEqual(2);
  for(const edge of ['top','bottom']){
    await body.evaluate((element,edge)=>{element.scrollTop=edge==='top'?0:element.scrollHeight;},edge);
    await assertActionsVisible(page);
    const box=await page.locator('.result-actions').boundingBox();
    for(const key of ['x','y','width','height'])expect(Math.abs(box[key]-footer[key]),'fixed footer '+key+' at '+edge).toBeLessThanOrEqual(1);
    const geometry=await body.evaluate(element=>{
      const r=element.getBoundingClientRect();
      const nested=[...element.querySelectorAll('*')].filter(child=>/^(auto|scroll)$/.test(getComputedStyle(child).overflowY)&&child.scrollHeight>child.clientHeight+1);
      return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,height:r.height,clientHeight:element.clientHeight,scrollHeight:element.scrollHeight,scrollTop:element.scrollTop,nested:nested.map(child=>child.id||child.className)};
    });
    expect(geometry.left).toBeGreaterThanOrEqual(0);expect(geometry.right).toBeLessThanOrEqual(viewport.width+1);
    expect(geometry.top).toBeGreaterThanOrEqual(0);expect(geometry.bottom).toBeLessThanOrEqual(box.y+1);
    expect(geometry.height).toBeGreaterThan(0);expect(geometry.scrollHeight).toBeGreaterThan(geometry.clientHeight);
    expect(geometry.scrollTop).toBeCloseTo(edge==='top'?0:geometry.scrollHeight-geometry.clientHeight,0);
    expect(geometry.nested,'resultBody is the only vertically overflowing scroller').toEqual([]);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
    expect(await page.evaluate(()=>({x:scrollX,y:scrollY}))).toEqual(outer);
    await expect(nestedSummary).toBeFocused();
    await test.info().attach('battle-report-'+viewport.width+'-'+edge,{body:await page.screenshot(),contentType:'image/png'});
  }
  await expect(page.locator('.report-chart')).toHaveCount(4);
  const sideLabels=await page.locator('.report-chart-values th.report-side-label').evaluateAll(elements=>elements.map(element=>{
    const range=document.createRange();range.selectNodeContents(element);return {text:element.textContent,lines:range.getClientRects().length,fits:element.scrollWidth<=element.clientWidth+1};
  }));
  expect(sideLabels).toHaveLength(8);
  for(const label of sideLabels){expect(['You','Enemy']).toContain(label.text);expect(label.lines).toBe(1);expect(label.fits).toBe(true);}
});

test('browser-denied report download never claims the file was saved or successfully delivered',async({page,context})=>{
  await seedResult(page);await openReport(page);const before=await profile(page);
  const cdp=await context.newCDPSession(page);
  try{
    // Chromium's native deny path cancels before a tiny local Blob can finish.
    // The page cannot observe Save As cancellation and must only say started.
    await cdp.send('Page.setDownloadBehavior',{behavior:'deny'});
    const event=page.waitForEvent('download');await press(page,'[data-report-download]');
    const download=await event;expect(await download.failure()).not.toBeNull();
    await expect(page.locator('[data-report-status]')).toHaveText('Report download started. Check your browser’s downloads to keep it.');
    await expect(page.locator('[data-report-status]')).not.toContainText(/saved|success|delivered|complete/i);
    expect(await profile(page)).toEqual(before);
  }finally{await cdp.send('Page.setDownloadBehavior',{behavior:'default'});await cdp.detach();}
});

test('unavailable local object URL reports failed download without false success or storage changes',async({page})=>{
  await seedResult(page);await openReport(page);const before=await profile(page),downloads=[];page.on('download',file=>downloads.push(file));
  await page.evaluate(()=>{URL.createObjectURL=()=>{throw new Error('QA unavailable local download');};});
  await press(page,'[data-report-download]');
  await expect(page.locator('[data-report-status]')).toContainText(/unavailable|could not|failed/i);
  await expect(page.locator('[data-report-status]')).not.toContainText(/started|saved|success/i);
  await page.waitForTimeout(250);expect(downloads).toHaveLength(0);expect(await profile(page)).toEqual(before);
  await expect(page.locator('#playAgain')).toBeEnabled();
});

for(const stage of ['initial observation','later sample'])test(stage+' failure leaves genuine result title and engine final stats intact',async({page})=>{
  const source=await readFile(new URL('../../dist/battle-report.js',import.meta.url),'utf8');
  const needle=stage==='initial observation'?"boolean(resumed, 'resumed flag');":"sample(current = game) {";
  expect(source.split(needle)).toHaveLength(2);
  const replacement=stage==='initial observation'?"throw new Error('QA observer unavailable');":needle+" throw new Error('QA observer unavailable');";
  await page.route('**/battle-report.js',route=>route.fulfill({status:200,contentType:'text/javascript',body:source.replace(needle,replacement)}));
  const fixture=reportFixture('campaign-primary-zero');
  await seedOnce(page,{[SAVE]:JSON.stringify(fixture.envelope),[CAMPAIGN_STORAGE_KEY]:JSON.stringify(fixture.progress)});
  await press(page,'#resumeSaved');await expect(page.locator('#resultTitle')).toHaveText('MISSION COMPLETE');
  await expect(page.locator('#resultKills')).toHaveText('17');await expect(page.locator('#resultBuilt')).toHaveText('23');await expect(page.locator('#resultTime')).toHaveText('00:00');
  await expect(page.locator('#playAgain')).toBeFocused();await expect(page.locator('#resultReportIssue')).toContainText(/unavailable|could not/i);
  await expect(page.locator('[data-report-download]')).toHaveCount(0);
  expect(JSON.parse((await profile(page))[HISTORY])).toHaveLength(1);
});

test('real frozen 0.10 QA UI save continues in 0.12 with unchanged persistence contracts and partial report coverage',async({page})=>{
  await page.goto(REPORT_LEGACY_PATH);await selectMap(page,'twin-span');await press(page,'#start');
  await press(page,'[data-type="archery"]');await tapPoint(page,await homePoint(page,MAPS['twin-span'],550,340));
  await expect(page.locator('#toast')).toContainText('Archery range raised');const oldSave=await pause(page);
  await press(page,'#saveExit');const oldBytes=await profile(page);
  await page.goto('/');await expect(page.locator('#resumeSaved')).toContainText('TWIN SPAN');
  expect((await profile(page))[SAVE]).toBe(oldBytes[SAVE]);await press(page,'#resumeSaved');const resumed=await pause(page);
  expect(resumed.game.version).toBe(oldSave.game.version);expect(resumed.game.mapId).toBe(oldSave.game.mapId);
  const layout=data=>data.game.state.buildings.map(b=>[b.id,b.side,b.type,b.x,b.y,b.level,b.hp]);
  expect(layout(resumed)).toEqual(layout(oldSave));
  expect(resumed.game.state.stats).toEqual(oldSave.game.state.stats);expect(resumed.game.state.time).toBeGreaterThanOrEqual(oldSave.game.state.time);
  expect(JSON.stringify(resumed)).not.toContain('ironroot-battle-report');await press(page,'#saveExit');
  // Continue the actual old save first. A disclosed synthetic living attacker
  // then earns the result by normal next-tick damage; no terminal save is seeded.
  const completion=imminentSkirmishFixture(resumed),terminal=completion.envelope;
  await page.evaluate(({key,value})=>localStorage.setItem(key,value),{key:SAVE,value:JSON.stringify(terminal)});
  await page.reload();await press(page,'#resumeSaved');await expect(page.locator('#resultModal')).toBeVisible();
  const report=await downloadReport(page);
  expect(report.map.id).toBe('twin-span');expect(report.scope.resumed).toBe(true);expect(report.scope.fullTimeline).toBe(false);
  expect(report.scope.startedAt).toBe(terminal.game.state.time);expect(report.cumulativeStats[0].built).toBe(terminal.game.state.stats.built[0]);
  test.info().annotations.push({type:'fixture',description:'Actual frozen 0.10 QA runtime UI save continued in 0.12. Only the final imminent attacker/one-HP living-base setup is synthetic; ordinary combat earns the result. Frozen QA baseline is not labeled production.'});
});

test('offline report modules load from actual service-worker cache and finish/download a resumed synthetic result',async({page,context})=>{
  test.setTimeout(45000);await page.goto('/');await page.evaluate(()=>navigator.serviceWorker.register('/service-worker.js',{scope:'/'}));
  await expect.poll(()=>page.evaluate(()=>navigator.serviceWorker.controller?.state),{timeout:15000}).toBe('activated');
  const fixture=reportFixture('campaign-primary-zero');
  await page.evaluate(({save,campaign,fixture})=>{localStorage.setItem(save,JSON.stringify(fixture.envelope));localStorage.setItem(campaign,JSON.stringify(fixture.progress));},{save:SAVE,campaign:CAMPAIGN_STORAGE_KEY,fixture});
  const fromWorker=new Set();page.on('response',response=>{if(response.fromServiceWorker())fromWorker.add(new URL(response.url()).pathname);});
  try{
    await context.setOffline(true);const response=await page.reload({waitUntil:'load'});expect(response.fromServiceWorker()).toBe(true);
    for(const file of ['battle-report.js','report-view.js','report-view.css'])await expect.poll(()=>fromWorker.has('/'+file)).toBe(true);
    await press(page,'#resumeSaved');await expect(page.locator('#resultModal')).toBeVisible();expectScope(await downloadReport(page),fixture);
  }finally{await context.setOffline(false);}
});
