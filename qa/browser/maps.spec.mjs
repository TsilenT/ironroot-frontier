// Map integration gates introduced in 0.9. Browser execution belongs in the authorized cloud runner.
import {expect} from '@playwright/test';
import {Game,MAPS,buildSites} from '../../dist/engine.js';
import {parseBackup,BACKUP_STORAGE_KEYS} from '../../dist/backup.js';
import {createCampaignMission,createCampaignProgress} from '../../dist/campaign.js';
import {MAP_IDS,NEW_MAP_IDS,SAVE,HISTORY,mapFixture,mapBackup,authoredMap,invalidMapFixtures} from './map-fixtures.mjs';
import {test,press,tapPoint,selectMap,saved,pause,seedOnce,homePoint,chooseBackup,openBackup,downloadBackup,observeCanvas,canvasFrame,expectCamera,dragPoint} from './map-browser-helpers.mjs';
import {installPad,padButton,steerTo} from './map-controller-helpers.mjs';
import {minimapActivationTarget} from './minimap-input-contract.mjs';

function assertMap(envelope,id){
  // This helper is only used for newly launched skirmishes. Legacy persisted
  // v1/v2 restoration is covered separately, without rewriting its identity.
  expect(envelope).toMatchObject({format:'ironroot-save',version:3,scenario:{kind:'skirmish',id:'standard',revision:1}});
  expect(envelope).not.toHaveProperty('campaignId');
  expect(envelope.game).toMatchObject({version:3,mapId:id,mapRevision:1,rulesetId:'frontier-air-local-open',rulesetRevision:1});
  expect(Game.restore(envelope.game).map.id).toBe(id);
}

function assertLegacyMap(envelope,id){
  expect(envelope).toMatchObject({format:'ironroot-save',version:2,challengeId:null,campaignId:null});
  expect(envelope.game).toMatchObject({version:2,mapId:id,mapRevision:1});
  expect(Game.restore(envelope.game).ruleset.id).toBe('frontier-legacy');
}
const ownBuildings=envelope=>envelope.game.state.buildings.filter(b=>b.side===0).map(b=>[b.type,b.x,b.y,b.level]);
async function storageBytes(page){
  return page.evaluate(keys=>Object.fromEntries(keys.map(key=>[key,localStorage.getItem(key)])),[...Object.values(BACKUP_STORAGE_KEYS),'qa.unrelated']);
}

async function tapMinimap(page,point,map,testInfo,label){
  // Passive native observations only: no retries, rounding or re-centering.
  // A native compatibility click may have different subpixel precision from
  // pointerdown/up, so verify its delivered coordinate rather than inventing it.
  await page.evaluate(point=>{
    window.__qaMinimapInput=[];
    window.__qaMinimapGeometricTarget=document.elementFromPoint(point.x,point.y)?.id;
    window.__qaMinimapInputAbort?.abort();
    const abort=new AbortController();window.__qaMinimapInputAbort=abort;
    for(const type of ['pointerdown','pointerup','click'])document.addEventListener(type,event=>{
      const rect=document.getElementById('minimap').getBoundingClientRect();
      window.__qaMinimapInput.push({type,target:event.target.id,trusted:event.isTrusted,
        clientX:event.clientX,clientY:event.clientY,defaultPreventedAtCapture:event.defaultPrevented,
        rect:{left:rect.left,top:rect.top,width:rect.width,height:rect.height}});
    },{capture:true,passive:true,signal:abort.signal});
  },point);
  let telemetry;
  try{
    expect(await page.evaluate(()=>window.__qaMinimapGeometricTarget),'requested pixel belongs to the minimap').toBe('minimap');
    await tapPoint(page,point);
    await expect.poll(()=>page.evaluate(()=>window.__qaMinimapInput.map(({type,target,trusted})=>({type,target,trusted})))).toEqual([
      {type:'pointerdown',target:'minimap',trusted:true},
      {type:'pointerup',target:'minimap',trusted:true},
      {type:'click',target:'minimap',trusted:true},
    ]);
    const events=await page.evaluate(()=>window.__qaMinimapInput);
    telemetry={requested:point,rect:events[2].rect,events,mapWidth:map.width};
    const target=minimapActivationTarget(telemetry);
    telemetry.projectedActivationWorldX=target;
    return target;
  }finally{
    const observed=await page.evaluate(()=>({geometricTarget:window.__qaMinimapGeometricTarget,events:window.__qaMinimapInput}));
    await testInfo.attach(map.id+'-minimap-'+label+'-native-input',{body:Buffer.from(JSON.stringify({
      requested:point,mapWidth:map.width,...observed,...telemetry,
    },null,2)),contentType:'application/json'});
    await page.evaluate(()=>window.__qaMinimapInputAbort.abort());
  }
}

test('map picker uses native disclosure keyboard semantics and remains reachable on narrow and landscape screens',async ({page})=>{
  test.setTimeout(35000);
  await page.goto('/');await press(page,'[data-mode="skirmish"]');await expect(page.locator('#mapPicker')).toHaveJSProperty('open',false);
  await expect(page.locator('#mapChoices')).toBeHidden();
  await page.locator('#mapPickerToggle').focus();await page.keyboard.press('Space');
  await expect(page.locator('#mapPicker')).toHaveJSProperty('open',true);
  await expect(page.locator('#mapPickerToggle')).toBeFocused();
  await expect(page.locator('#mapChoices [data-map]')).toHaveCount(3);
  for(const size of [page.viewportSize(),{width:320,height:568},{width:844,height:390}]){
    await page.setViewportSize(size);
    for(const id of MAP_IDS){
      const choice=page.locator('#mapChoices [data-map="'+id+'"]');
      await choice.scrollIntoViewIfNeeded();await choice.focus();await page.keyboard.press('Enter');
      await expect(choice).toBeFocused();await expect(choice).toHaveAttribute('aria-pressed','true');
      await expect(page.locator('#selectedMapName')).toHaveText(MAPS[id].name);
      await expect(choice).toContainText(MAPS[id].lanes.length+' roads');
      await expect(choice).toContainText(MAPS[id].buildLimit+' sites');
      const box=await choice.boundingBox();
      expect(box.x).toBeGreaterThanOrEqual(0);expect(box.x+box.width).toBeLessThanOrEqual(size.width+1);
      expect(box.y).toBeGreaterThanOrEqual(0);expect(box.y+box.height).toBeLessThanOrEqual(size.height+1);
    }
    await press(page,'[data-difficulty="hard"]');
    await expect(page.locator('#selectedMapName')).toHaveText('Twin Span');
    await selectMap(page,'long-march');await expect(page.locator('[data-difficulty="hard"]')).toHaveClass(/active/);
    await expect(page.locator('#mapDescription')).toContainText('unchanged');
    await page.locator('#start').scrollIntoViewIfNeeded();
    const box=await page.locator('#start').boundingBox();
    expect(box.y+box.height).toBeLessThanOrEqual(size.height+1);
  }
  await page.locator('#mapPickerToggle').focus();await page.keyboard.press('Space');
  await expect(page.locator('#mapPicker')).toHaveJSProperty('open',false);
  await expect(page.locator('#mapChoices')).toBeHidden();
  expect(await saved(page)).toBeNull();
});

for(const id of MAP_IDS){
  const map=MAPS[id];
  test(map.name+' selection start save reload resume and switching preserve independent difficulty',async ({page})=>{
    await observeCanvas(page);await page.goto('/');await press(page,'[data-mode="skirmish"]');await press(page,'[data-difficulty="hard"]');await selectMap(page,id);
    await expect(page.locator('[data-difficulty="hard"]')).toHaveClass(/active/);
    await press(page,'#start');await expect(page.locator('#welcome')).toBeHidden();
    const before=await pause(page);assertMap(before,id);expect(before.game.difficulty).toBe('hard');
    await expect.poll(async()=>(await canvasFrame(page)).battle?.terrain?.width).toBe(map.width);
    await press(page,'#saveExit');
    await expect(page.locator('#resumeSaved')).toContainText(id==='classic'?'RESUME BATTLE':map.name.toUpperCase());
    await page.reload();await press(page,'#resumeSaved');const after=await pause(page);
    assertMap(after,id);expect(ownBuildings(after)).toEqual(ownBuildings(before));
    expect(after.game.difficulty).toBe('hard');expect(after.game.state.time).toBeGreaterThanOrEqual(before.game.state.time);
    expect(after.game.state.time-before.game.state.time).toBeLessThan(3);
    await expect.poll(async()=>(await canvasFrame(page)).battle?.terrain?.width).toBe(map.width);
    await press(page,'#saveExit');await expect(page.locator('#selectedMapName')).toHaveText(map.name);
    const next=MAP_IDS[(MAP_IDS.indexOf(id)+1)%MAP_IDS.length];
    await selectMap(page,next);await press(page,'[data-difficulty="easy"]');await press(page,'#start');
    const switched=await pause(page);assertMap(switched,next);expect(switched.game.difficulty).toBe('easy');
    await expect.poll(async()=>(await canvasFrame(page)).battle?.terrain?.width).toBe(MAPS[next].width);
  });

  test(map.name+' actual pointer placement rejects occupied sites and dragging never buys',async ({page,context})=>{
    await observeCanvas(page);await page.goto('/');await selectMap(page,id);await press(page,'#start');
    await press(page,'[data-type="archery"]');
    await expect.poll(async()=>(await canvasFrame(page)).battle?.slots?.length).toBe(map.buildLimit);
    expect((await canvasFrame(page)).battle.slots).toEqual(buildSites(map,0).map(({x,y})=>[x,y]));
    const y=map.lanes[map.startingLane],point=await homePoint(page,map,550,y);
    await tapPoint(page,point);await expect(page.locator('#toast')).toContainText('Archery range raised');
    await expect(page.locator('#battle')).not.toHaveClass(/placing/);
    await press(page,'[data-type="archery"]'); // A new order, not automatic repeat.
    await tapPoint(page,point);await expect(page.locator('#toast')).toContainText('Too close');
    const built=await pause(page);assertMap(built,id);
    expect(built.game.state.buildings.filter(b=>b.side===0&&b.type==='archery')).toMatchObject([{x:550,y,lane:map.startingLane}]);
    expect(built.game.state.gold[0]).toBeCloseTo(420-175+5*built.game.state.time,1);
    await press(page,'#resume');
    const drag=await homePoint(page,map,690,y);await dragPoint(page,context,drag);
    const after=await pause(page);expect(ownBuildings(after)).toEqual(ownBuildings(built));
    expect(after.game.state.gold[0]-built.game.state.gold[0]).toBeCloseTo(5*(after.game.state.time-built.game.state.time),1);
  });

  test(map.name+' minimap ends home front and whole-world viewport use the real map width',async ({page},testInfo)=>{
    await observeCanvas(page);await seedOnce(page,{[SAVE]:JSON.stringify(mapFixture(id))});
    await press(page,'#resumeSaved');
    await expect.poll(async()=>(await canvasFrame(page)).mini?.lines?.length).toBe(map.lanes.length);
    const mini=await page.locator('#minimap').boundingBox();
    const lines=(await canvasFrame(page)).mini.lines;
    lines.forEach((line,index)=>expect(line[0][1]/mini.height*900).toBeCloseTo(map.lanes[index],5));
    const activation=await tapMinimap(page,{x:mini.x+mini.width*.73,y:mini.y+mini.height/2},map,testInfo,'73-percent');
    await expectCamera(page,map,activation);
    await tapMinimap(page,{x:mini.x+mini.width-1,y:mini.y+mini.height/2},map,testInfo,'right-edge');await expectCamera(page,map,map.width);
    if(id!=='classic'){
      const frame=(await canvasFrame(page)).mini;
      const base=frame.fills.find(fill=>fill.color==='#e5a281'&&fill.args[2]===4&&fill.args[3]===6);
      expect(base,'actual enemy citadel minimap draw').toBeTruthy();
      expect(base.args[0]+2).toBeCloseTo((map.width-110)/map.width*mini.width,3);
    }
    await testInfo.attach(id+'-far-right',{body:await page.screenshot(),contentType:'image/png'});
    await tapMinimap(page,{x:mini.x+1,y:mini.y+mini.height/2},map,testInfo,'left-edge');await expectCamera(page,map,0);
    await press(page,'#home');await expectCamera(page,map,450);
    const state=await pause(page);await press(page,'#resume');await press(page,'#front');
    await expectCamera(page,map,state.game.state.frontline,30);
    await press(page,'#home');
    await page.setViewportSize({width:4000,height:600});
    await expect.poll(()=>page.locator('#battle').evaluate(element=>element.getBoundingClientRect().width)).toBe(4000);
    await expectCamera(page,map,map.width/2);
    const whole=(await canvasFrame(page)).mini,wideMini=await page.locator('#minimap').boundingBox();
    expect(whole.viewport[0]).toBeCloseTo(.75,3);expect(whole.viewport[2]+1.5).toBeCloseTo(wideMini.width,3);
  });
}

test('Twin Span center-gap pointer snaps to a real road with sixteen sites and no phantom middle lane',async ({page})=>{
  await observeCanvas(page);await page.goto('/');await selectMap(page,'twin-span');await press(page,'#start');
  await press(page,'[data-type="archery"]');
  await expect.poll(async()=>(await canvasFrame(page)).battle?.slots?.length).toBe(16);
  expect([...new Set((await canvasFrame(page)).battle.slots.map(point=>point[1]))]).toEqual([340,560]);
  await tapPoint(page,await homePoint(page,MAPS['twin-span'],550,460));
  await expect(page.locator('#toast')).toContainText('Archery range raised');
  const envelope=await pause(page);assertMap(envelope,'twin-span');
  expect(envelope.game.state.buildings.filter(b=>b.side===0&&b.type==='archery')).toMatchObject([{x:550,y:560,lane:1}]);
  expect(envelope.game.state.buildings.every(b=>[340,560].includes(b.y)&&[0,1].includes(b.lane))).toBe(true);
});

for(const mode of ['campaign','challenges'])test(mode+' authored mission starts Classic after a nonclassic skirmish and preserves the skirmish choice',async ({page})=>{
  await observeCanvas(page);
  if(mode==='campaign'){
    // A declared returning-player record unlocks the current Emberwatch replay.
    // New main-campaign launches are revision 4, never the historical v1 battle.
    const progress=createCampaignProgress();
    progress.missions.emberwatch={completed:true,stars:1,bestTime:60};
    await seedOnce(page,{[BACKUP_STORAGE_KEYS.campaign]:JSON.stringify(progress)});
  }else await page.goto('/');
  await selectMap(page,'long-march');await press(page,'#start');await pause(page);await press(page,'#saveExit');
  await press(page,'[data-mode="'+mode+'"]');await expect(page.locator('#mapPicker')).toBeHidden();
  if(mode==='campaign'){
    await press(page,'#campaignStoryNav');await press(page,'[data-chapter="embers"]');
    await press(page,'[data-mission="emberwatch"]');
    await expect(page.locator('#campaignMissionTitle')).toHaveText('Emberwatch');
    await expect(page.locator('#start')).toBeEnabled();
  }
  await press(page,'#start');const envelope=await pause(page);
  expect(Game.restore(envelope.game).map.id).toBe('classic');
  if(mode==='campaign')expect(envelope).toMatchObject({format:'ironroot-save',version:3,
    scenario:{kind:'campaign',id:'emberwatch',revision:4},
    game:{version:3,mapId:'classic',mapRevision:1,rulesetId:'frontier-campaign-air-local',rulesetRevision:1}});
  else expect(envelope).toMatchObject({version:3,scenario:{kind:'trial',id:'shieldbreaker',revision:2},game:{version:3,mapId:'classic',mapRevision:1,rulesetId:'frontier-authored-air-local',rulesetRevision:1}});
  await expect.poll(async()=>(await canvasFrame(page)).battle?.terrain?.width).toBe(3200);
  await press(page,'#saveExit');await press(page,'[data-mode="skirmish"]');await expect(page.locator('#selectedMapName')).toHaveText('Long March');
  await press(page,'#start');assertMap(await pause(page),'long-march');
});

test('legacy Emberwatch resume keeps Classic and its original revision without replacing the nonclassic skirmish choice',async ({page})=>{
  // Public legacy factory plus the historical envelope, not a new campaign start.
  const legacy={format:'ironroot-save',version:2,challengeId:null,campaignId:'emberwatch',
    game:createCampaignMission('emberwatch').serialize()};
  await observeCanvas(page);await seedOnce(page,{[SAVE]:JSON.stringify(legacy)});
  await selectMap(page,'long-march');await press(page,'[data-mode="campaign"]');
  await expect(page.locator('#mapPicker')).toBeHidden();
  await expect(page.locator('#resumeSaved')).toContainText('EMBERWATCH');
  await press(page,'#resumeSaved');const envelope=await pause(page);
  expect(envelope).toMatchObject({format:'ironroot-save',version:2,challengeId:null,campaignId:'emberwatch',game:{version:1}});
  const restored=Game.restore(envelope.game);
  expect(restored.map.id).toBe('classic');expect(restored.ruleset.id).toBe('frontier-legacy');
  await expect.poll(async()=>(await canvasFrame(page)).battle?.terrain?.width).toBe(3200);
  await press(page,'#saveExit');await press(page,'[data-mode="skirmish"]');
  await expect(page.locator('#selectedMapName')).toHaveText('Long March');
  await press(page,'#start');assertMap(await pause(page),'long-march');
});

for(const id of NEW_MAP_IDS)test(MAPS[id].name+' engine-driven victory names the history map and supports a fresh replay',async ({page})=>{
  await seedOnce(page,{[SAVE]:JSON.stringify(mapFixture(id,{victory:true}))});await press(page,'#resumeSaved');
  await expect(page.locator('#resultTitle')).toHaveText('VICTORY');expect(await saved(page)).toBeNull();
  const history=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),HISTORY);
  expect(history).toHaveLength(1);expect(history[0]).toMatchObject({mapId:id,won:true,campaignId:null,challengeId:null});
  await press(page,'#playAgain');await press(page,'#welcomeSettings');
  await press(page,'details:has(> #battleHistory) > summary');
  await expect(page.locator('#battleHistory')).toContainText('Skirmish · '+MAPS[id].name);
  await press(page,'#settingsDone');await expect(page.locator('#selectedMapName')).toHaveText(MAPS[id].name);
  await press(page,'#start');assertMap(await pause(page),id);
});

const corruptions=[...invalidMapFixtures(),...NEW_MAP_IDS.flatMap(id=>['campaign','challenges'].map(mode=>({name:id+' masquerading as '+mode,envelope:authoredMap(id,mode)})))];
for(const {name,envelope} of corruptions)test('corrupt map save preserves original bytes: '+name,async ({page})=>{
  const bytes=JSON.stringify(envelope);
  await seedOnce(page,{[SAVE]:bytes,'qa.unrelated':'keep me'});const before=await storageBytes(page);
  await expect(page.locator('#resumeSaved')).toBeHidden();await expect(page.locator('#saveStatus')).toContainText('could not be loaded');
  await openBackup(page);const downloads=[];page.on('download',file=>downloads.push(file));
  await press(page,'#exportBackup');await expect(page.locator('#backupStatus')).toContainText(/invalid|unknown|could not|must|unsupported|requires|match|range|site|field/i);
  expect(await storageBytes(page)).toEqual(before);await page.waitForTimeout(100);expect(downloads).toHaveLength(0);
  await press(page,'#settingsDone');await page.reload();expect(await storageBytes(page)).toEqual(before);
  await selectMap(page,'twin-span');await press(page,'#start');
  // A refused save is protected evidence, not implicit permission to overwrite.
  await expect(page.locator('#settingsModal')).toBeVisible();
  await expect(page.locator('#backupStatus')).toHaveText('The original saved battle is unchanged. Download it from the title screen, or restore a compatible backup before starting a new battle.');
  expect(await page.locator('#pause').evaluate(button=>!!button.closest('[inert]'))).toBe(true);
  await expect(page.locator('#pauseVeil')).toBeHidden();expect(await storageBytes(page)).toEqual(before);
  if(!await page.locator('.backup-details').evaluate(element=>element.open))await press(page,'.backup-details > summary');
  const recovery=mapBackup('long-march');
  await chooseBackup(page,recovery.text);
  await expect(page.locator('#backupModal')).toBeVisible();
  await expect(page.locator('#backupSummary')).toContainText('Saved battle: Skirmish · Long March');
  await expect(page.locator('#backupModal .backup-warning')).toHaveText('This replaces this browser’s campaign stars, trial records, preferences, battle history and saved battle, including your current battle. Export a backup first to keep your current progress.');
  await expect(page.locator('#confirmImport')).toHaveText('Replace local saves');
  expect(await storageBytes(page)).toEqual(before);
  await press(page,'#cancelImport');await expect(page.locator('#backupModal')).toBeHidden();expect(await storageBytes(page)).toEqual(before);
  await chooseBackup(page,recovery.text);expect(await storageBytes(page)).toEqual(before);
  await Promise.all([page.waitForEvent('load'),press(page,'#confirmImport')]);
  const restored=await storageBytes(page);
  for(const [domain,key] of Object.entries(BACKUP_STORAGE_KEYS))expect(JSON.parse(restored[key])).toEqual(recovery.backup.data[domain]);
  expect(restored['qa.unrelated']).toBe('keep me');
  await expect(page.locator('#resumeSaved')).toContainText('LONG MARCH');
  await press(page,'#resumeSaved');const resumed=await pause(page);assertLegacyMap(resumed,'long-march');
  expect(ownBuildings(resumed)).toEqual(ownBuildings(recovery.backup.data.battle));
  await press(page,'#saveExit');await selectMap(page,'twin-span');await press(page,'#start');assertMap(await pause(page),'twin-span');
  expect((await storageBytes(page))['qa.unrelated']).toBe('keep me');
});

for(const id of NEW_MAP_IDS){
  test(MAPS[id].name+' controller and pointer use the same sites and occupied confirm never chooses a neighbor',async ({page})=>{
    test.setTimeout(35000);
    const map=MAPS[id];await installPad(page);await page.goto('/');await selectMap(page,id);await press(page,'#start');
    await press(page,'[data-type="archery"]');await tapPoint(page,await homePoint(page,map,270,map.lanes[0]));
    await expect(page.locator('#toast')).toContainText('Archery range raised');
    await expect(page.locator('#battle')).not.toHaveClass(/placing/);
    await press(page,'[data-type="archery"]'); // Explicit second order for controller confirmation.
    // Pointer controls reset controller context. A sampled neutral baseline and
    // Home pad input reveal the real cursor before confirm can spend anything.
    const target=await homePoint(page,map,550,map.lanes.at(-1));await padButton(page,8);
    await expect(page.locator('#controllerCursor')).toBeVisible();await steerTo(page,target);await padButton(page,0);
    await expect(page.locator('#toast')).toContainText('Archery range raised');
    await padButton(page,9);await expect(page.locator('#pauseVeil')).toBeVisible();
    const built=await saved(page);assertMap(built,id);
    expect(built.game.state.buildings.filter(b=>b.side===0&&b.type==='archery').map(b=>[b.x,b.y])).toEqual([[270,map.lanes[0]],[550,map.lanes.at(-1)]]);
    // Only 70 gold remains, so select an occupied starting barracks in a fresh
    // battle to keep the repeat-confirm oracle independent of affordability.
    await press(page,'#saveExit');await press(page,'#start');await press(page,'[data-type="archery"]');
    const occupied=await homePoint(page,map,410,map.lanes[map.startingLane]);await padButton(page,8);await steerTo(page,occupied);
    await padButton(page,0);await expect(page.locator('#toast')).toContainText('Too close');
    await padButton(page,0);await expect(page.locator('#toast')).toContainText('Too close');
    await padButton(page,9);const rejected=await saved(page);
    expect(rejected.game.state.buildings.filter(b=>b.side===0)).toHaveLength(1);
    expect(rejected.game.state.gold[0]).toBeCloseTo(420+5*rejected.game.state.time,1);
  });
  test(MAPS[id].name+' portable export import preview reload and resume round trip keeps all domains',async ({page})=>{
    const source=mapBackup(id);await seedOnce(page,{[SAVE]:JSON.stringify(source.backup.data.battle),'qa.unrelated':'keep me'});
    await openBackup(page);const exported=await downloadBackup(page),parsed=parseBackup(exported);
    expect(parsed.data).toEqual(source.backup.data);
    await press(page,'#settingsDone');await selectMap(page,'classic');await press(page,'#start');await pause(page);await press(page,'#saveExit');
    await openBackup(page);const before=await storageBytes(page);await chooseBackup(page,exported);
    await expect(page.locator('#backupSummary')).toContainText('Saved battle: Skirmish · '+MAPS[id].name);
    expect(await storageBytes(page)).toEqual(before);
    await Promise.all([page.waitForEvent('load'),press(page,'#confirmImport')]);
    await expect(page.locator('#resumeSaved')).toContainText(MAPS[id].name.toUpperCase());
    const bytes=await storageBytes(page);
    for(const [domain,key] of Object.entries(BACKUP_STORAGE_KEYS))expect(JSON.parse(bytes[key])).toEqual(parsed.data[domain]);
    expect(bytes['qa.unrelated']).toBe('keep me');
    await openBackup(page);expect(parseBackup(await downloadBackup(page)).data).toEqual(parsed.data);
    await press(page,'#settingsDone');await press(page,'#resumeSaved');const resumed=await pause(page);
    assertLegacyMap(resumed,id);expect(ownBuildings(resumed)).toEqual(ownBuildings(parsed.data.battle));
  });
  for(const mode of ['campaign','challenges'])test(MAPS[id].name+' portable backup rejects an authored '+mode+' identity without changing storage',async ({page})=>{
    await seedOnce(page,{[SAVE]:JSON.stringify(mapFixture('classic')),'qa.unrelated':'keep me'});await openBackup(page);
    const before=await storageBytes(page),bad=structuredClone(mapBackup(id).backup);bad.data.battle=authoredMap(id,mode);
    await chooseBackup(page,JSON.stringify(bad));await expect(page.locator('#backupStatus')).toContainText('Classic battlefield');
    await expect(page.locator('#backupModal')).toBeHidden();expect(await storageBytes(page)).toEqual(before);
  });
}
