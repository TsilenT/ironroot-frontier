import test from 'node:test';
import assert from 'node:assert/strict';
import {runInContext} from 'node:vm';
import {createCampaignMission, CAMPAIGN_MISSIONS, SHARED_CROSSING_MISSIONS, getProgressionCampaignOverview, getCampaignLaunchMission, getCampaignMission, createCampaignProgress} from '../dist/campaign.js';
import {Game} from '../dist/engine.js';
import {campaignControlStatus} from '../dist/bridge-control.js';
import {controlProgressLabel,controlProgressDescription,CONTROL_MAP_LEGEND} from '../dist/campaign-control-view.js';
import {missionBriefing} from '../dist/campaign-presentation.js';
import {getMissionScouting,renderMissionScouting} from '../dist/scouting.js';
import {Renderer} from '../dist/render.js';
import {installCanvas,makeRenderer} from './renderer-canvas.mjs';
import {startupHarness} from './mobile-startup-fixture.mjs';

const mission=SHARED_CROSSING_MISSIONS[0];
const fresh=()=>createCampaignMission('shared-crossing');
const section=(source,from,to)=>{const a=source.indexOf(from),b=source.indexOf(to,a);assert.ok(a>=0&&b>a);return source.slice(a,b);};

// These are deliberately synthetic scene boundaries, not evidence of a paid route.
function heldScene(g,seconds=12.5){
  g.state.time=30;g.tick=600;
  g.state.campaignControl.heldSeconds=seconds;
  g.state.campaignControl.bridges[0].owner=0;
  g.state.campaignControl.bridges[2].owner=0;
  return g;
}

test('control copy distinguishes cumulative progress, contest and completion without payout promises',()=>{
  const g=fresh();
  assert.equal(controlProgressLabel(campaignControlStatus(g)),'0/60s · 0/2 clear');
  assert.match(controlProgressDescription(campaignControlStatus(g)),/paused; the time already secured is kept/);
  heldScene(g);
  assert.equal(controlProgressLabel(campaignControlStatus(g)),'12/60s · 2/2 clear');
  assert.match(controlProgressDescription(campaignControlStatus(g)),/12.5 of 60.*advances while the battle runs/);
  g.state.units.push({type:'gryphon',side:1,x:1600,y:260,hp:125});
  assert.equal(controlProgressLabel(campaignControlStatus(g)),'12/60s · 1/2 clear');
  assert.equal(g.state.campaignControl.heldSeconds,12.5);
  assert.match(controlProgressDescription(campaignControlStatus(g)),/paused/);
  g.state.time=62;g.state.campaignControl.heldSeconds=60;
  assert.match(controlProgressDescription(campaignControlStatus(g)),/Supply route secured/);
  assert.match(CONTROL_MAP_LEGEND,/X = contested/);
  assert.doesNotMatch(CONTROL_MAP_LEGEND,/payout/);
});

for(const [width,height] of [[320,430],[390,650],[844,390],[1180,768]])test(`actual HUD and Pause at ${width}×${height} use control rather than gold, and reset on ordinary play`,()=>{
  const {c,$,source}=startupHarness({width,height});
  c.campaignProgress={...createCampaignProgress(),missions:Object.fromEntries(CAMPAIGN_MISSIONS.map(m=>[m.id,{completed:true,stars:1,bestTime:60}]))};
  const g=fresh();c.start(g,null,'shared-crossing');c.updateHUD();
  assert.equal($('phase').textContent,'SHARED CROSSINGCAMPAIGN');
  assert.equal($('objectiveProgress').textContent,'0/60s · 0/2 clear');
  assert.match($('objectiveProgress').attributes['aria-label'],/0.0 of 60/);
  assert.equal($('income').textContent,'+7.5 /s');
  assert.doesNotMatch($('income').attributes['aria-label'],/including.*bridges/);
  assert.equal($('app').classList.contains('bridge-income'),false);
  assert.equal($('bridgeBattleStatus').classList.contains('hidden'),false);
  assert.equal($('minimap').attributes['aria-describedby'],'bridgeBattleStatus');
  heldScene(g);c.updateHUD();
  assert.equal($('objectiveProgress').textContent,'12/60s · 2/2 clear');
  g.state.units.push({type:'gryphon',side:1,x:1600,y:260,hp:125});c.updateHUD();
  assert.equal($('objectiveProgress').textContent,'12/60s · 1/2 clear');
  assert.match($('bridgeBattleStatus').textContent,/paused.*time already secured is kept/);
  assert.match($('bridgeBattleStatus').textContent,/Road 1: yours, contested/);
  assert.doesNotMatch($('bridgeBattleStatus').textContent,/earning|payment stopped|payout/);
  Object.assign(c,{updateCitadelUI(){},saveWarning:false});
  runInContext(section(source,'function syncPauseMenu()', 'function hideRestart()'),c);c.syncPauseMenu();
  assert.equal($('pauseBridgeTitle').textContent,'Supply crossings');
  assert.match($('pauseBridgeRules').textContent,/Bridges grant no income or capture bounty/);
  assert.equal($('pauseBridgeLegend').textContent,CONTROL_MAP_LEGEND);
  assert.match($('pauseBridgeStatus').textContent,/12.5 of 60/);
  c.start(new Game({rulesetId:'frontier-citadel-open'}));c.updateHUD();c.syncPauseMenu();
  assert.equal($('objectiveProgress').attributes['aria-label'],undefined);
  assert.equal($('bridgeBattleStatus').classList.contains('hidden'),true);
  assert.equal($('pauseBridgeDetails').classList.contains('hidden'),true);
  assert.equal($('minimap').attributes['aria-describedby'],undefined);
});

test('shared-crossing briefing and scout map show the real route objective and three capture zones',()=>{
  const brief=missionBriefing(mission),report=getMissionScouting(mission),html=renderMissionScouting(mission);
  assert.match(brief.goal,/two bridges/);
  assert.ok(brief.facts.includes(`Hold any ${mission.objectives[0].bridges} bridges for ${mission.objectives[0].seconds} seconds in total`));
  assert.ok(brief.facts.includes('No bridge gold bonus'));
  assert.equal(brief.protection,'');
  assert.equal(report.objectives.control.zones.length,3);
  assert.match(report.objectives.summary,/2 of 3.*60 cumulative seconds/);
  assert.match(report.objectives.summary,/Destroying the enemy citadel also wins/);
  assert.equal((html.match(/class="scouting-crossing"/g)||[]).length,3);
  for(const y of [195,385,575])assert.ok(html.includes(`x="1495" y="${y}" width="210" height="130"`));
  assert.doesNotMatch(report.objectives.summary,/0 enemy destruction targets/);
  const g=fresh();assert.equal(report.armies[0].buildingCount,g.state.buildings.filter(b=>b.side===0).length);
  assert.equal(report.armies[1].buildingCount,g.state.buildings.filter(b=>b.side===1).length);
});

test('control render draws three physical capture zones and owner/contest text without color dependence',()=>{
  installCanvas();const r=makeRenderer(Renderer,390,650),g=heldScene(fresh());
  g.state.units.push({type:'gryphon',side:1,x:1600,y:260,hp:125});
  r.canvas.reset();r.drawBridgeZones(g);
  const text=r.canvas.calls.filter(c=>c[0]==='fillText').map(c=>c[1]);
  assert.ok(text.includes('NORTH YOU'));assert.ok(text.includes('MIDDLE UNOWNED'));assert.ok(text.includes('SOUTH YOU'));assert.ok(text.includes('X BLOCKED'));
  assert.equal(r.canvas.calls.filter(c=>c[0]==='strokeRect').length,3);
  r.mini.reset();r.drawMinimap(g.state,g);assert.deepEqual(r.mini.calls.filter(c=>c[0]==='fillText').map(c=>c[1]),['YX','—','Y']);
});

test('current chapter list includes the prototype without changing earned legacy totals',()=>{
  const p=createCampaignProgress(),before=JSON.stringify(p),o=getProgressionCampaignOverview(p);
  assert.equal(o.total,36);assert.equal(o.maxStars,108);assert.equal(o.chapters.find(c=>c.id==='river-compact').number,6);
  assert.equal(o.chapters.find(c=>c.id==='river-compact').total,5);assert.equal(o.chapters.find(c=>c.id==='river-compact').unlocked,false);
  assert.equal(JSON.stringify(p),before);
});


test('current continuation rewards name the next mission without rewriting published descriptors',()=>{
  const before=JSON.stringify(getCampaignMission('common-ground',5));
  const sharedBefore=JSON.stringify(getCampaignMission('shared-crossing',1));
  assert.equal(getCampaignLaunchMission('common-ground',createCampaignProgress()).reward,'Unlocks Shared Crossing');
  assert.equal(getCampaignLaunchMission('shared-crossing',createCampaignProgress()).reward,'Unlocks One Signal Is Enough');
  assert.equal(JSON.stringify(getCampaignMission('common-ground',5)),before);
  assert.equal(JSON.stringify(getCampaignMission('shared-crossing',1)),sharedBefore);
  assert.equal(getCampaignMission('shared-crossing',1).reward,'Unlocks the campaign epilogue');
  assert.equal(getCampaignMission('common-ground',5).reward,'Unlocks the campaign epilogue');
});
