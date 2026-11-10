import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import * as c from '../dist/campaign.js';import {missionBriefing} from '../dist/campaign-presentation.js';import {getMissionScouting,renderMissionScouting} from '../dist/scouting.js';
test('truthful two-road180-second objective, ordinary deployment and partial Chapter9 navigation',()=>{
 const m=c.getCampaignMission('three-minutes-more'),b=missionBriefing(m),s=getMissionScouting(m),html=renderMissionScouting(m);
 assert.match(b.goal,/Survive until 3:00.*destroy the enemy citadel earlier.*One HP/);assert.equal(b.protection,'');assert.ok(b.facts.includes('Hold for 3:00'));assert.match(b.facts.join(' '),/ends before 5:00/);
 assert.equal(s.map.lanes.length,2);assert.equal(s.armies[0].buildingCount,5);assert.equal(s.armies[1].buildingCount,6);assert.match(s.objectives.summary,/Survive until 3:00.*enemy citadel earlier/);assert.match(html,/North|north/);assert.match(html,/South|south/);assert.match(m.briefing.join(' '),/normal|Normal/);assert.match(m.briefing.join(' '),/100 gold/);
 const p=c.createCampaignProgress();for(const old of c.CAMPAIGN_PROGRESS_MISSIONS)p.missions[old.id]={completed:true,stars:1,bestTime:60};
 const o=c.getProgressionCampaignOverview(p),ch=o.chapters.find(x=>x.number===9);assert.equal(o.total,36);assert.equal(o.maxStars,108);assert.equal(o.completed,false);assert.equal(ch.total,4);assert.equal(ch.completed,false);assert.equal(ch.plannedMissions,5);assert.match(ch.description,/Four missions.*five/);assert.equal(o.chapters.some(x=>x.number===10),false);assert.equal(c.getCampaignLaunchMission('leave-no-road-closed',p).reward,'Unlocks Three Minutes More');assert.match(m.reward,/More of Chapter 9/);
 const app=readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');assert.match(app,/Math\.ceil\(Math\.max\(0, authored.timeLimit - s.time\)\)/);assert.match(app,/currentCampaign === 'three-minutes-more' \? 'CAMPAIGN MISSIONS'/);
});
