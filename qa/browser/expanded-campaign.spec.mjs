// 0.12 integration gates. Run only in the separately authorized browser runner.
import {expect} from '@playwright/test';
import {measureToastGeometry,toastGeometryIsSafe} from './toast-geometry.mjs';
import {Game,MAPS} from '../../dist/engine.js';
import {CAMPAIGN_STORAGE_KEY,CAMPAIGN_MISSIONS,CAMPAIGN_CHAPTERS,getCampaignTargets,recordCampaignResult} from '../../dist/campaign.js';
import {getMissionScouting} from '../../dist/scouting.js';
import {BACKUP_STORAGE_KEYS,parseBackup} from '../../dist/backup.js';
import {test,press,tapPoint,seedOnce,saved,pause,openBackup,chooseBackup,downloadBackup} from './map-browser-helpers.mjs';
import {FRONTIER_IDS,FRONTIER_MISSIONS,LEGACY_IDS,progressThrough,expandedFixture,expandedBackup,wrongMapFixture} from './expanded-campaign-fixtures.mjs';
const SAVE=BACKUP_STORAGE_KEYS.battle,HISTORY=BACKUP_STORAGE_KEYS.history;
async function profile(page){return page.evaluate(keys=>Object.fromEntries(keys.map(key=>[key,localStorage.getItem(key)])),Object.values(BACKUP_STORAGE_KEYS));}
async function progress(page){return page.evaluate(key=>JSON.parse(localStorage.getItem(key)),CAMPAIGN_STORAGE_KEY);}
async function showFrontier(page,id){
  await press(page,'[data-mode="campaign"]');await press(page,'#campaignStoryNav');await press(page,'[data-chapter="frontier"]');
  await press(page,id?'[data-mission="'+id+'"]':'#campaignMissions > .active');
}
async function seedMission(page,fixture){
  await seedOnce(page,{[SAVE]:JSON.stringify(fixture.envelope),[CAMPAIGN_STORAGE_KEY]:JSON.stringify(fixture.progress)});
  await expect(page.locator('#resumeSaved')).toContainText('RESUME MISSION');await press(page,'#resumeSaved');
}
async function buildingPoint(page,map,building){
  const mini=await page.locator('#minimap').boundingBox();
  await tapPoint(page,{x:mini.x+building.x/map.width*mini.width,y:mini.y+mini.height/2});
  const rect=await page.locator('#battle').boundingBox(),scale=Math.max(.32,rect.height/900),half=rect.width/(2*scale);
  const camera=half>=map.width/2?map.width/2:Math.max(half,Math.min(map.width-half,building.x));
  return {x:rect.x+rect.width/2+(building.x-camera)*scale,y:rect.y+rect.height/2+(building.y-450)*scale};
}
const layout=envelope=>envelope.game.state.buildings.map(b=>[b.id,b.side,b.type,b.x,b.y,b.lane,b.level]);
async function expectSelectedChapterVisible(page,id='frontier'){
  await expect(page.locator('#campaignChapters > .active')).toHaveAttribute('data-chapter',id);
  await expect(page.locator('#campaignChapterNav')).toBeVisible();
  await expect(page.locator('#campaignChapterNav')).toContainText('The Open Frontier');
  await expect(page.locator('#campaignMissionPage')).toBeVisible();
}
async function chooseMission(page,id){
  await press(page,'#campaignChapterNav');await press(page,'[data-mission="'+id+'"]');
}
async function expectWholeSelectionHealth(page,building){
  await expect(page.locator('#selectionDetail')).toContainText('Level '+building.level);
  // Only the health span is integer-valued. The production wave interval in
  // the neighboring span legitimately contains a decimal and must stay intact.
  await expect(page.locator('#selectionStats > span').first()).toHaveText(new RegExp('^♥ \\d+ / '+Math.ceil(building.maxHp)+'$'));
}

test('existing twelve missions and 36 stars remain version 1 and unlock chapter five without clearing records',async ({page})=>{
  test.setTimeout(35000);
  const legacy=progressThrough(),bytes=JSON.stringify(legacy);
  await seedOnce(page,{[CAMPAIGN_STORAGE_KEY]:JSON.stringify(progressThrough(LEGACY_IDS.slice(0,-1)))});
  await showFrontier(page,'open-horizon');await expect(page.locator('#start')).toBeDisabled();
  await expect(page.locator('#campaignUnlock')).toContainText('Complete Ironroot');
  await page.keyboard.press('Enter');await expect(page.locator('#welcome')).toBeVisible();expect(await saved(page)).toBeNull();
  await seedOnce(page,{[CAMPAIGN_STORAGE_KEY]:bytes});
  // Initial campaign entry inherits the next mission from saved progress. Do
  // not click the offscreen Chapter 5 button before measuring its visibility.
  const nativeViewport=page.viewportSize();
  await press(page,'[data-mode="campaign"]');await expectSelectedChapterVisible(page);
  for(const viewport of [{width:1180,height:757},{width:320,height:568},{width:844,height:390},{width:390,height:650},nativeViewport]){
    await page.setViewportSize(viewport);await expectSelectedChapterVisible(page);
  }
  // Re-entering the mode is another render while Chapter 5 stays selected.
  await press(page,'[data-mode="skirmish"]');await press(page,'[data-mode="campaign"]');
  await expectSelectedChapterVisible(page);await expect(page.locator('#campaignMissionTitle')).toHaveText('Open Horizon');
  await expect(page.locator('[data-chapter]')).toHaveCount(7);
  await expect(page.locator('[data-mission]')).toHaveCount(4);
  await expect(page.locator('#campaignProgressText')).toHaveText('12/20 missions · 36/60 stars');
  await expect(page.locator('#start')).toBeEnabled();
  await press(page,'#start');const fresh=await pause(page);expect(fresh.scenario).toEqual({kind:'campaign',id:'open-horizon',revision:4});expect(fresh.game.rulesetId).toBe('frontier-campaign-air-local');expect(Game.restore(fresh.game).buildings.wardenLodge).toBeTruthy();
  await press(page,'#saveExit');await page.reload();
  expect(await progress(page)).toEqual(legacy);
  for(const opening of ['roadside-watch','shield-at-the-fork','open-three-roads'])expect((await progress(page)).missions[opening]).toBeUndefined();
  expect(await page.evaluate(key=>localStorage.getItem(key),CAMPAIGN_STORAGE_KEY)).toBe(bytes);
  await openBackup(page);const backup=parseBackup(await downloadBackup(page));
  expect(backup.data.campaign).toEqual(legacy);expect(backup.data.campaign.version).toBe(1);
});

test('frontier unlock branches after Open Horizon then converges only after both river and beacon victories',async ({page})=>{
  test.setTimeout(45000);
  let current=progressThrough();
  await seedOnce(page,{[CAMPAIGN_STORAGE_KEY]:JSON.stringify(current)});await showFrontier(page,'river-charter');
  await expect(page.locator('#start')).toBeDisabled();await expect(page.locator('#campaignUnlock')).toContainText('Open Horizon');
  for(const id of FRONTIER_IDS){
    const fixture=expandedFixture(id,'success');fixture.progress=current;
    await seedMission(page,fixture);await expect(page.locator('#resultTitle')).toHaveText('MISSION COMPLETE');
    current=recordCampaignResult(current,id,Game.restore(fixture.finalGame));
    expect(await progress(page)).toEqual(current);
    for(const legacyId of LEGACY_IDS)expect(current.missions[legacyId]).toEqual({completed:true,stars:3,bestTime:10});
    await press(page,'#playAgain');await expect(page.locator('#welcome')).toBeVisible();
    await showFrontier(page);
    if(id==='open-horizon'){
      for(const branch of ['river-charter','far-beacon']){await chooseMission(page,branch);await expect(page.locator('#start')).toBeEnabled();}
      await chooseMission(page,'common-ground');await expect(page.locator('#start')).toBeDisabled();
    }else if(id==='river-charter'){
      await chooseMission(page,'common-ground');await expect(page.locator('#start')).toBeDisabled();await expect(page.locator('#campaignUnlock')).toContainText('The Far Beacons');
    }else if(id==='far-beacon'){
      await chooseMission(page,'common-ground');await expect(page.locator('#start')).toBeEnabled();
    }else{
      await expect(page.locator('#campaignProgressText')).toContainText('16/20 missions');
      await expect(page.locator('#campaignChapterStory')).toContainText(CAMPAIGN_CHAPTERS.find(chapter=>chapter.id==='frontier').epilogue);
    }
  }
});

for(const mission of FRONTIER_MISSIONS){
  const {id}=mission,map=MAPS[mission.mapId];
  test(id+' UI start save reload and resume keep the authored map formation and old progress',async ({page})=>{
    const fixture=expandedFixture(id);
    await seedOnce(page,{[CAMPAIGN_STORAGE_KEY]:JSON.stringify(fixture.progress)});await showFrontier(page,id);
    await expect(page.locator('#campaignMissionTitle')).toHaveText(mission.name);await expect(page.locator('#start')).toBeEnabled();
    await press(page,'#start');const before=await pause(page);
    expect(before).toMatchObject({version:3,scenario:{kind:'campaign',id,revision:4},game:{version:3,mapId:mission.mapId,mapRevision:1,rulesetId:'frontier-campaign-air-local',rulesetRevision:1}});
    expect(Object.keys(Game.restore(before.game).buildings)).toHaveLength(8);
    expect(layout(before)).toEqual(layout(fixture.envelope));expect(Game.restore(before.game).map.id).toBe(mission.mapId);
    await press(page,'#saveExit');
    await expect(page.locator('#resumeSaved')).toContainText('RESUME MISSION · '+mission.name.toUpperCase()+' ·');
    await page.reload();await expect(page.locator('#resumeSaved')).toContainText('RESUME MISSION · '+mission.name.toUpperCase()+' ·');
    await press(page,'#resumeSaved');await expect(page.locator('#opponentLabel')).toHaveText(mission.name.toUpperCase());
    const after=await pause(page);expect(after.scenario).toEqual({kind:'campaign',id,revision:4});expect(layout(after)).toEqual(layout(before));
    expect(after.game.mapId).toBe(mission.mapId);expect(after.game.state.time).toBeGreaterThanOrEqual(before.game.state.time);
    expect(after.game.state.time-before.game.state.time).toBeLessThan(3);expect(await progress(page)).toEqual(fixture.progress);
  });

  test(id+' objective success records correct stars and map history exactly once',async ({page})=>{
    const fixture=expandedFixture(id,'success');await seedMission(page,fixture);
    await expect(page.locator('#resultTitle')).toHaveText('MISSION COMPLETE');await expect(page.locator('#playAgain')).toBeFocused();
    await expect(page.locator('.result-stars')).toHaveText('★'.repeat(fixture.outcome.stars)+'☆'.repeat(3-fixture.outcome.stars));
    expect(await saved(page)).toBeNull();
    const actual=await progress(page);expect(actual.version).toBe(1);expect(actual.missions[id]).toMatchObject({completed:true,stars:fixture.outcome.stars});
    const history=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),HISTORY);expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({campaignId:id,mapId:mission.mapId,won:true});
    await page.waitForTimeout(350);expect(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).length,HISTORY)).toBe(1);
    await press(page,'#playAgain');await page.reload();expect(await progress(page)).toEqual(actual);
  });

  test(id+' exact '+mission.timeLimit+' second deadline fails and Retry starts the same map without progress',async ({page})=>{
    const fixture=expandedFixture(id,'deadline');await seedMission(page,fixture);
    await expect(page.locator('#resultTitle')).toHaveText('MISSION FAILED');await expect(page.locator('#playAgain')).toBeFocused();
    await expect(page.locator('.result-stars')).toHaveText('☆☆☆');expect(await saved(page)).toBeNull();expect(await progress(page)).toEqual(fixture.progress);
    const history=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),HISTORY);expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({campaignId:id,mapId:mission.mapId,won:false});
    expect(history[0].time).toBeGreaterThanOrEqual(mission.timeLimit);expect(history[0].time).toBeLessThanOrEqual(mission.timeLimit+.25);
    await page.keyboard.press('Enter');const retry=await pause(page);
    expect(retry.campaignId).toBe(id);expect(retry.game.mapId).toBe(mission.mapId);expect(retry.game.state.time).toBeLessThan(5);
    expect(layout(retry)).toEqual(layout(expandedFixture(id).envelope));expect(await progress(page)).toEqual(fixture.progress);
  });

  test(id+' scouting is collapsed keyboard reachable and matches real geometry deployments levels and objectives',async ({page},testInfo)=>{
    test.setTimeout(35000);
    await seedOnce(page,{[CAMPAIGN_STORAGE_KEY]:JSON.stringify(expandedFixture(id).progress)});await showFrontier(page,id);
    const report=getMissionScouting(mission),disclosure=page.locator('#campaignScout'),toggle=page.locator('#campaignScoutToggle'),svg=page.locator('#campaignScoutReport svg');
    await expect(disclosure).toHaveJSProperty('open',false);await expect(page.locator('#campaignScoutReport')).toBeHidden();
    await toggle.focus();await page.keyboard.press('Enter');await expect(disclosure).toHaveJSProperty('open',true);await expect(toggle).toBeFocused();
    await expect(toggle).toHaveText('Scout battlefield · '+mission.name);await expect(svg).toHaveAttribute('viewBox',`0 0 ${map.width} ${map.height}`);
    await expect(svg).toHaveAttribute('role','img');await expect(svg).toHaveAttribute('aria-label',new RegExp(mission.name));
    await expect(svg).toHaveAttribute('aria-label',/Building names, levels and roads are listed below the map\./);
    await expect(page.locator('.scouting-map-facts')).toHaveText(report.map.summary+'.');await expect(page.locator('.scouting-objectives')).toHaveText(report.objectives.summary);
    await expect(page.locator('.scouting-road')).toHaveCount(map.lanes.length);await expect(page.locator('.scouting-protect')).toHaveCount(report.objectives.protectedCount);await expect(page.locator('.scouting-destroy')).toHaveCount(report.objectives.markedCount);
    for(const army of report.armies){
      const section=page.locator('.scouting-army-'+army.position);await expect(section.locator('.scouting-roster')).toHaveText(army.summary);
      await expect(section.locator('.scouting-roads li')).toHaveCount(map.lanes.length);
      for(const building of army.buildings){
        const symbol=svg.locator(`.scouting-building[data-side="${army.side}"][transform="translate(${building.x} ${building.y})"]`);
        await expect(symbol).toHaveCount(1);await expect(symbol.locator('title')).toContainText('level '+building.level);await expect(symbol).toHaveAttribute('data-kind',building.targetKind||'ordinary');
      }
    }
    await svg.scrollIntoViewIfNeeded();const box=await svg.boundingBox(),viewport=page.viewportSize();
    expect(box.x).toBeGreaterThanOrEqual(0);expect(box.x+box.width).toBeLessThanOrEqual(viewport.width+1);
    expect(box.width/box.height).toBeCloseTo(map.width/map.height,2);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await testInfo.attach(id+'-scouting-'+testInfo.project.name,{body:await page.screenshot(),contentType:'image/png'});
    await toggle.focus();await page.keyboard.press('Space');await expect(disclosure).toHaveJSProperty('open',false);await expect(toggle).toBeFocused();
    await page.locator('#start').scrollIntoViewIfNeeded();await expect(page.locator('#start')).toBeInViewport({ratio:1});await expect(page.locator('#start')).toBeEnabled();
    expect(await saved(page)).toBeNull();
  });

  test(id+' native backup export import replacement and reload retain new map campaign identity',async ({page})=>{
    const fixture=expandedBackup(id);await seedOnce(page,fixture.values);await openBackup(page);
    const text=await downloadBackup(page);expect(parseBackup(text).data).toEqual(fixture.backup.data);
    await chooseBackup(page,text);await expect(page.locator('#backupSummary')).toContainText(mission.name);await expect(page.locator('#confirmImport')).toBeEnabled();
    await Promise.all([page.waitForEvent('load'),press(page,'#confirmImport')]);
    expect(await progress(page)).toEqual(fixture.progress);expect(await saved(page)).toEqual(fixture.envelope);
    await press(page,'#resumeSaved');const restored=await pause(page);expect(restored.campaignId).toBe(id);expect(restored.game.mapId).toBe(mission.mapId);expect(layout(restored)).toEqual(layout(fixture.envelope));
  });

  test(id+' valid Classic engine data is rejected as wrong-map campaign save and backup without overwriting bytes',async ({page})=>{
    const fixture=wrongMapFixture(id),bytes=JSON.stringify(fixture.envelope);
    await seedOnce(page,{[SAVE]:bytes,[CAMPAIGN_STORAGE_KEY]:JSON.stringify(fixture.progress)});const before=await profile(page);
    await expect(page.locator('#resumeSaved')).toBeHidden();await expect(page.locator('#saveStatus')).toContainText('could not be loaded');
    await openBackup(page);const backup=expandedBackup(id).backup;backup.data.battle=fixture.envelope;
    await chooseBackup(page,JSON.stringify(backup));await expect(page.locator('#backupStatus')).toContainText(/battlefield/i);await expect(page.locator('#backupModal')).toBeHidden();
    expect(await profile(page)).toEqual(before);await press(page,'#settingsDone');await page.reload();expect(await profile(page)).toEqual(before);
  });

  if(mission.protectedTargets.length){
    test(id+' every protected starting structure disables salvage while an ordinary structure can be sold',async ({page})=>{
      const fixture=expandedFixture(id),game=Game.restore(fixture.envelope.game),targets=getCampaignTargets(game,id).filter(t=>t.kind==='protect');
      await seedMission(page,fixture);
      for(const target of targets){
        await tapPoint(page,await buildingPoint(page,map,target.building));await expect(page.locator('#selectionPanel')).toBeVisible();
        await expectWholeSelectionHealth(page,target.building);
        if(id==='open-horizon'){
          // Actual authored level-2 barracks exercises the reported IEEE-754
          // value (979.9999999999999), not a convenient integer-only fixture.
          expect(target.building.type).toBe('barracks');expect(target.building.level).toBe(2);
          expect(Math.ceil(target.building.maxHp)).toBe(980);
          await expect(page.locator('#selectionStats > span').first()).toHaveText(/^♥ \d+ \/ 980$/);
        }
        await expect(page.locator('#sell')).toBeDisabled();await expect(page.locator('#sell')).toHaveText('Protected objective');await expect(page.locator('#selectionDescription')).toContainText('Keep this building standing.');
        await press(page,'#closeSelection');
      }
      const protectedIds=targets.map(t=>t.originalId),ordinary=game.state.buildings.find(b=>b.side===0&&!protectedIds.includes(b.id));expect(ordinary).toBeTruthy();
      await tapPoint(page,await buildingPoint(page,map,ordinary));await expectWholeSelectionHealth(page,ordinary);
      await expect(page.locator('#sell')).toBeEnabled();await press(page,'#sell');await expect(page.locator('#toast')).toContainText('Building salvaged');
      await expect(page.locator('#toast')).toHaveClass(/show/);
      // Protected objectives live in a separate bottom dock. Preserve actual
      // visibility, containment and clearance rather than assuming HUD ordering.
      let toastGeometry;
      await expect.poll(async()=>{
        toastGeometry=await page.evaluate(measureToastGeometry);
        return toastGeometryIsSafe(toastGeometry);
      },{message:'Visible confirmation stays inside the field and viewport, clear of objective and navigation controls'}).toBe(true);
      await test.info().attach('salvage-toast-geometry',{body:JSON.stringify(toastGeometry,null,2),contentType:'application/json'});
      const save=await pause(page);expect(save.game.state.buildings.some(b=>b.id===ordinary.id)).toBe(false);
      for(const id of protectedIds)expect(save.game.state.buildings.some(b=>b.id===id&&b.hp>0)).toBe(true);
      expect(await progress(page)).toEqual(fixture.progress);
    });
    test(id+' loss of an original protected target fails immediately before its deadline',async ({page})=>{
      const fixture=expandedFixture(id,'protected-loss');await seedMission(page,fixture);
      await expect(page.locator('#resultTitle')).toHaveText('MISSION FAILED');expect(await progress(page)).toEqual(fixture.progress);
      const history=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),HISTORY);expect(history).toHaveLength(1);expect(history[0].time).toBeLessThan(mission.timeLimit);
      expect(await saved(page)).toBeNull();
    });
  }
}

test('Far Beacons minimum citadel health fails immediately even before the hold and deadline',async ({page})=>{
  const fixture=expandedFixture('far-beacon','health-loss');await seedMission(page,fixture);
  await expect(page.locator('#resultTitle')).toHaveText('MISSION FAILED');expect(await progress(page)).toEqual(fixture.progress);
  expect(await saved(page)).toBeNull();
});


test('scouting stays keyboard operable when switching a legacy Classic mission to an expanded battlefield',async ({page})=>{
  await seedOnce(page,{[CAMPAIGN_STORAGE_KEY]:JSON.stringify(progressThrough())});await press(page,'[data-mode="campaign"]');
  await press(page,'#campaignStoryNav');await press(page,'[data-chapter="embers"]');await press(page,'[data-mission="emberwatch"]');
  const toggle=page.locator('#campaignScoutToggle');await toggle.focus();await page.keyboard.press('Space');
  await expect(page.locator('#campaignScout')).toHaveJSProperty('open',true);await expect(toggle).toHaveText('Scout battlefield · Emberwatch');
  await expect(page.locator('.scouting-map')).toHaveAttribute('viewBox','0 0 3200 900');await expect(page.locator('.scouting-road')).toHaveCount(3);
  await press(page,'#campaignStoryNav');await page.locator('[data-chapter="frontier"]').focus();await page.keyboard.press('Enter');
  await expect(page.locator('#campaignChapterTitle')).toBeFocused();await expect(page.locator('#campaignScout')).toHaveJSProperty('open',false);
  await page.locator('[data-mission="river-charter"]').focus();await page.keyboard.press('Enter');
  await expect(page.locator('#campaignMissionTitle')).toBeFocused();await expect(toggle).toHaveText('Scout battlefield · The River Charter');
  await expect(page.locator('#campaignScout')).toHaveJSProperty('open',false);await toggle.focus();await page.keyboard.press('Enter');
  await expect(page.locator('.scouting-road')).toHaveCount(2);await expect(page.locator('#campaignScoutReport')).toContainText('2 allied structures to protect');
  await toggle.focus();await page.keyboard.press('Enter');await expect(page.locator('#campaignScout')).toHaveJSProperty('open',false);await expect(toggle).toBeFocused();
  expect(await saved(page)).toBeNull();
});
