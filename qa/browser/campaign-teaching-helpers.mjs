import {expect} from '@playwright/test';
import {Game} from '../../dist/engine.js';
import {createCampaignMission} from '../../dist/campaign.js';
import {openBuildControls} from './shared-build-controls.mjs';

// Complete the genuine first paid order through native input. Observation is
// read-only: the ordinary checkpoint, rendered geometry and trusted event.
export async function finishFirstBuild(page, press) {
  // Hidden coaching has no live-region copy. Determine this opening from its
  // actual teaching state and saved scenario, never stale hint text.
  if(await page.locator('#battleClockLabel').textContent() !== 'TEACHING PAUSE' ||
     await page.locator('#coachingModal').isVisible() || await page.locator('#coachResume').isVisible())return;
  await expect(page.locator('#coachingModal')).toBeHidden();
  await expect(page.locator('#coachResume')).toBeHidden();
  const before=await page.evaluate(()=>JSON.parse(localStorage.getItem('ironroot.battle.v1')));
  expect(before.scenario.id).toBe('roadside-watch');
  expect(before.game.state.time).toBe(0);
  const game=Game.restore(before.game),cost=game.buildings.barracks.cost;
  await openBuildControls(page);await press(page,'[data-type="barracks"]');
  await press(page,'#home');
  const r=await page.locator('#battle').boundingBox(),scale=Math.max(.32,r.height/game.map.height);
  const half=r.width/(2*scale),camera=half>=game.map.width/2?game.map.width/2:Math.max(half,450);
  const p={x:r.x+r.width/2+(550-camera)*scale,y:r.y+r.height/2+(450-game.map.height/2)*scale};
  expect(p.x).toBeGreaterThan(r.x);expect(p.x).toBeLessThan(r.x+r.width);
  expect(await page.evaluate(p=>document.elementFromPoint(p.x,p.y)?.id,p)).toBe('battle');
  await page.locator('#battle').evaluate(e=>e.addEventListener('pointerup',event=>{
    window.__firstBuildInput={trusted:event.isTrusted,type:event.pointerType};
  },{once:true,passive:true}));
  const touch=await page.evaluate(()=>navigator.maxTouchPoints>0);
  if(touch)await page.touchscreen.tap(p.x,p.y);else await page.mouse.click(p.x,p.y);
  expect(await page.evaluate(()=>window.__firstBuildInput)).toMatchObject({trusted:true,type:touch?'touch':'mouse'});
  await expect(page.locator('#battle')).not.toHaveClass(/placing/);
  await expect(page.locator('#coachResume')).toBeHidden();
  // Ordinary pause persists actual cost and elapsed income, without assuming
  // an exact number of animation frames between input and save.
  await press(page,'#pause');await expect(page.locator('#pauseVeil')).toBeVisible();
  const after=await page.evaluate(()=>JSON.parse(localStorage.getItem('ironroot.battle.v1')));
  expect(after.game.state.buildings.filter(b=>b.side===0)).toHaveLength(1);
  expect(after.game.state.buildings.find(b=>b.side===0)).toMatchObject({type:'barracks',x:550,y:450,invested:cost});
  expect(after.game.state.gold[0]).toBeCloseTo(before.game.state.gold[0]-cost+5*after.game.state.time,1);
  await press(page,'#resume');
}

export async function startRunning(page, press) {
  await press(page, '#start');
  await finishFirstBuild(page,press);
  if (await page.locator('#coachingModal').isVisible()) await press(page, '#coachingPlay');
}

// Explicit compatibility context for indefinite zero-time paid planning. The
// legacy lesson has the same one-road map, 420 gold and ordinary building costs;
// it is not the new Roadside Watch onboarding. Only seed a declared save, then
// use Resume, Pause and confirmed Restart to reach its real fresh lesson.
export async function startLegacyTeaching(page,press) {
  const game=createCampaignMission('first-watch');
  await page.goto('/');
  await page.evaluate(battle=>{
    localStorage.removeItem('ironroot.campaign.v1');
    localStorage.setItem('ironroot.battle.v1',JSON.stringify(battle));
  },{format:'ironroot-save',version:3,scenario:{kind:'campaign',id:'first-watch',revision:1},game:game.serialize()});
  await page.reload();await press(page,'#resumeSaved');await press(page,'#pause');
  await press(page,'#restartBattle');await press(page,'#confirmRestart');
  await expect(page.locator('#coachingModal')).toBeVisible();
  await expect(page.locator('#time')).toHaveText('00:00');
  await expect(page.locator('#gold')).toHaveText('420');
}
