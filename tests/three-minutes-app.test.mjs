import test from 'node:test';import assert from 'node:assert/strict';import * as c from '../dist/campaign.js';import {startupHarness} from './mobile-startup-fixture.mjs';import {advanceObjectiveBattle} from '../dist/objectives.js';
for(const [width,height]of [[320,568],[500,850],[844,390],[1180,757]])test(`Three Minutes More HUD uses actual180-second countdown and earned full roster at ${width}x${height}`,()=>{
 const {c:app,$}=startupHarness({width,height});app.campaignProgress={...c.createCampaignProgress(),missions:Object.fromEntries(c.CAMPAIGN_PROGRESS_MISSIONS.filter(m=>m.id!=='cut-the-bowstrings'&&m.id!=='three-minutes-more').map(m=>[m.id,{completed:true,stars:1,bestTime:60}]))};
 const g=c.createProgressionCampaignMission('three-minutes-more',app.campaignProgress),initial=g.serialize();app.start(g,null,'three-minutes-more');app.updateHUD();
 assert.equal($('objectiveTime').textContent,'180 remaining');assert.notEqual($('enemyHpText').textContent,'?');assert.equal(app.protectedControls.size,0);assert.equal(Object.keys(g.buildings).length,8);
 // Explicitly synthetic final-frame fixture. The paid route is a separate test.
 g.state.buildings=[];g.state.units=[];g.state.projectiles=[];g.state.time=179.95;g.tick=3599;g.state.bases[0].hp=1;g.aiTimer=30;
 const outcome=advanceObjectiveBattle(g,.25,x=>c.evaluateCampaignMission(x,'three-minutes-more'),180);assert.equal(outcome.completed,true);assert.equal(outcome.stars,1);app.objectiveOutcome=outcome;app.updateHUD();assert.equal($('objectiveTime').textContent,'0 remaining');
 const records=c.recordCampaignResult(app.campaignProgress,'three-minutes-more',g);assert.equal(records.missions['three-minutes-more'].stars,1);assert.equal(c.getProgressionCampaignOverview(records).completed,false);
 app.start(c.createCampaignRestart(g,'three-minutes-more'),null,'three-minutes-more');assert.deepEqual(app.game.serialize(),initial);assert.equal($('objectiveTime').textContent,'180 remaining');
});
