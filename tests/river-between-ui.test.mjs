import test from 'node:test';
import assert from 'node:assert/strict';
import {runInContext} from 'node:vm';
import {CAMPAIGN_PROGRESS_MISSIONS,createCampaignProgress,createCampaignMission,createCampaignRestart,getCampaignMission,getCampaignTargets,evaluateCampaignMission} from '../dist/campaign.js';
import {identityOf} from '../dist/battle-codec.js';
import {Game} from '../dist/engine.js';
import {campaignControlStatus} from '../dist/bridge-control.js';
import {controlProgressLabel,controlProgressDescription} from '../dist/campaign-control-view.js';
import {missionBriefing} from '../dist/campaign-presentation.js';
import {getMissionScouting,renderMissionScouting} from '../dist/scouting.js';
import {createCodex,formatNumber,formatSeconds} from '../dist/codex.js';
import {createBattleJournal} from '../dist/battle-report.js';
import {renderBattleReport} from '../dist/report-view.js';
import {startupHarness} from './mobile-startup-fixture.mjs';

const id='a-river-between-us', mission=getCampaignMission(id,1);
function unlock(c){c.campaignProgress={...createCampaignProgress(),missions:Object.fromEntries(CAMPAIGN_PROGRESS_MISSIONS.filter(m=>m.id!=='the-long-screen'&&m.id!=='the-hammer-turns'&&m.id!=='salt-in-the-stores'&&m.id!=='the-archers-quay').map(m=>[m.id,{completed:true,stars:1,bestTime:60}]))};}
const fresh=()=>createCampaignMission(id);
const section=(source,from,to)=>source.slice(source.indexOf(from),source.indexOf(to,source.indexOf(from)));
const post=g=>getCampaignTargets(g,id).find(t=>t.kind==='destroy');
function held(g,seconds){g.state.time=80;g.tick=1600;g.state.campaignControl.heldSeconds=seconds;for(const i of [1,2])g.state.campaignControl.bridges[i].owner=0;return g;}
function removePost(g){const target=post(g);g.state.buildings=g.state.buildings.filter(b=>b.id!==target.originalId);return target;}

// Synthetic boundaries isolate presentation and identity, not balance evidence.
for(const [width,height] of [[320,430],[390,650],[844,390],[1180,768]])test(`compound HUD and Pause remain honest at ${width}×${height}`,()=>{
  const {c,$,source}=startupHarness({width,height});unlock(c);const g=fresh();c.start(g,null,id);c.updateHUD();
  assert.match($('objectiveProgress').textContent,/0\/60s.*0\/2 clear.*North Command Post: standing/);
  assert.match($('objectiveProgress').attributes['aria-label'],/Complete both goals in either order/);
  assert.equal($('app').classList.contains('bridge-income'),false);
  assert.doesNotMatch($('income').attributes['aria-label'],/from bridges/);
  const active=$('pause');active.focus();held(g,60);c.updateHUD();
  assert.equal(c.document.activeElement,active);
  assert.match($('objectiveProgress').textContent,/60\/60s.*North Command Post: standing/);
  assert.doesNotMatch($('objectiveProgress').textContent,/mission complete/i);
  assert.match($('bridgeBattleStatus').textContent,/Supply goal met.*alone does not win/);
  assert.equal(evaluateCampaignMission(g,id).completed,false);
  Object.assign(c,{saveWarning:false});runInContext(section(source,'function syncPauseMenu()', 'function hideRestart()'),c);c.syncPauseMenu();
  assert.match($('pauseObjective').textContent,/North Command Post AND.*60 cumulative/);
  assert.match($('pauseBridgeStatus').textContent,/original still standing/);
  assert.match($('pauseBridgeRules').textContent,/10:00/);
  assert.match($('pauseBridgeRules').textContent,/Bridges grant no income or capture bounty/);
  assert.doesNotMatch($('pauseBridgeRules').textContent,/4:30|only your supply route has a control victory/);
  removePost(g);c.updateHUD();assert.match($('objectiveProgress').textContent,/complete/i);
  c.start(createCampaignMission('shared-crossing'),null,'shared-crossing');c.updateHUD();c.syncPauseMenu();
  assert.equal($('objectiveProgress').textContent,'0/60s · 0/2 clear');assert.match($('pauseBridgeRules').textContent,/4:30/);
  assert.doesNotMatch($('pauseBridgeRules').textContent,/North Command Post/);
  c.start(new Game({rulesetId:'frontier-citadel-open'}));c.updateHUD();c.syncPauseMenu();
  assert.equal($('objectiveProgress').attributes['aria-label'],undefined);
  assert.equal($('pauseBridgeDetails').classList.contains('hidden'),true);
});

test('post first, replacements, checkpoint and restart retain honest original-objective progress',()=>{
  const {c,$}=startupHarness({width:390,height:650});unlock(c);const g=held(fresh(),12.5);const target=removePost(g);
  // A replacement at the authored position is a different entity.
  g.state.buildings.push({...fresh().state.buildings.find(b=>b.id===target.originalId),id:g.nextId++});
  c.start(g,null,id);c.updateHUD();assert.match($('objectiveProgress').textContent,/12\/60s.*North Command Post: destroyed/);
  assert.equal(evaluateCampaignMission(g,id).completed,false);
  const restored=Game.restore(g.serialize());c.start(restored,null,id);c.updateHUD();
  assert.match($('objectiveProgress').textContent,/12\/60s.*North Command Post: destroyed/);
  assert.match($('objectiveProgress').attributes['aria-label'],/Replacements do not count/);
  const restarted=createCampaignRestart(restored,id);c.start(restarted,null,id);c.updateHUD();
  assert.match($('objectiveProgress').textContent,/0\/60s.*North Command Post: standing/);
});

test('briefing and scout show both goals, named original, deadline and three physical zones',()=>{
  const brief=missionBriefing(mission),report=getMissionScouting(mission),html=renderMissionScouting(mission);
  assert.match(brief.goal,/North Command Post.*two crossings.*60 seconds.*either order.*10:00/);
  assert.ok(brief.facts.includes('Both goals required; either order'));
  assert.match(report.objectives.summary,/North Command Post.*60 cumulative.*Both goals.*10:00/);
  assert.match(report.objectives.summary,/Replacements do not count/);
  assert.equal(report.objectives.control.zones.length,3);
  assert.equal((html.match(/class="scouting-crossing"/g)||[]).length,3);
  assert.equal((html.match(/class="scouting-destroy"/g)||[]).length,1);
  assert.match(html,/North Command Post/);
  assert.doesNotMatch(report.objectives.summary,/unknown|fog/i);
});

test('active field guide uses the mission roster and autonomous air without orders',()=>{
  const g=fresh(),guide=createCodex(g);
  const {c,$,source}=startupHarness({width:390,height:650});
  Object.assign(c,{createCodex,formatNumber,formatSeconds,drawUnitPortrait(){}});
  runInContext(section(source,'function populateFieldGuide(', '\npopulateFieldGuide();'),c);
  c.populateFieldGuide(g);
  assert.equal($('flightGuide').classList.contains('hidden'),false);
  assert.match($('unitCodex').innerHTML,/data-codex-unit="gryphon"/);
  assert.doesNotMatch($('economyCodex').innerHTML,/4:30|bridge income|capture bounty/i);
  assert.equal(guide.UNIT_CODEX.length,Object.keys(g.units).length);
  const air=guide.UNIT_CODEX.find(u=>u.id==='gryphon');assert.ok(air);
  assert.match(JSON.stringify(air),/nearby|adjacent|neighbor|automati/i);
  assert.doesNotMatch(JSON.stringify(guide),/manual air order|forced citadel drain/i);
});

for(const ending of ['both','citadel','loss','deadline'])test(`report retains both objective facts for ${ending}`,()=>{
  const g=fresh(),journal=createBattleJournal(g,{mode:'campaign',id,identity:identityOf(g,{kind:'campaign',id,revision:1})});held(g,60);
  if(ending==='both')removePost(g);
  if(ending==='citadel'){g.state.bases[1].hp=0;g.state.winner=0;}
  if(ending==='loss'){g.state.bases[0].hp=0;g.state.winner=1;}
  if(ending==='deadline'){g.state.time=600;g.tick=12000;}
  const outcome=evaluateCampaignMission(g,id),report=journal.finish(g,{objectiveOutcome:outcome,targets:getCampaignTargets(g,id)}),html=renderBattleReport(report);
  assert.equal(report.objectives.items.length,2);
  assert.match(html,/Secure any two bridges for 60 cumulative seconds/);
  assert.match(html,/Destroy the original North Command Post/);
  assert.equal(report.objectives.items.find(i=>i.type==='control').met,true);
  assert.equal(report.objectives.items.find(i=>i.type==='destroy').met,ending==='both');
  assert.equal(outcome.completed,['both','citadel'].includes(ending));
});
