import test from 'node:test';
import assert from 'node:assert/strict';
import {CAMPAIGN_PROGRESS_MISSIONS,createCampaignProgress,createCampaignMission,createCampaignRestart,getCampaignMission} from '../dist/campaign.js';
import {getMissionScouting} from '../dist/scouting.js';
import {installCanvas,makeRenderer} from './renderer-canvas.mjs';
import {Renderer} from '../dist/render.js';
import {startupHarness} from './mobile-startup-fixture.mjs';
const ID='the-road-we-know';
for(const [width,height]of [[320,430],[390,650],[1180,768]])test(`Road We Know clear core HUD and restart at ${width}×${height}`,()=>{
 installCanvas();const {c,$}=startupHarness({width,height});c.campaignProgress={...createCampaignProgress(),missions:Object.fromEntries(CAMPAIGN_PROGRESS_MISSIONS.filter(m=>m.id!=='salt-in-the-stores'&&m.id!=='the-archers-quay'&&(m.id!==ID)).map(m=>[m.id,{completed:true,stars:1,bestTime:60}]))};c.renderer=makeRenderer(Renderer,width,398);c.ordinaryRenderer=c.renderer;const g=createCampaignMission(ID),initial=g.serialize();c.start(g,null,ID);c.updateHUD();
 assert.equal(c.currentCampaign,ID);assert.equal(c.started,true);assert.notEqual($('enemyHpText').textContent,'?');assert.equal(c.protectedControls.size,0);assert.equal(g.map.lanes.length,2);assert.equal(Object.keys(g.ruleset.buildings).length,8);
 for(let i=0;i<100;i++)g.update(.05);c.updateHUD();const restarted=createCampaignRestart(g,ID);assert.deepEqual(restarted.serialize(),initial);c.start(restarted,null,ID);c.updateHUD();assert.notEqual($('enemyHpText').textContent,'?');assert.equal(c.protectedControls.size,0);
});
test('scouting discloses both ordinary enemy roads and their real mine without false marked objectives',()=>{const intel=getMissionScouting(getCampaignMission(ID));assert.equal(intel.map.roadCount,2);assert.equal(intel.objectives.markedCount,0);assert.equal(intel.objectives.protectedCount,0);assert.match(intel.objectives.summary,/citadel/);assert.match(intel.objectives.summary,/10:00/);});
