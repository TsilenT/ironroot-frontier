import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {getCampaignMission,createCampaignProgress,getProgressionCampaignOverview} from '../dist/campaign.js';import {missionBriefing} from '../dist/campaign-presentation.js';import {getMissionScouting} from '../dist/scouting.js';
test('Road briefing and Scout disclose exact three-road alternative, deadline and ordinary economy',()=>{
 const m=getCampaignMission('leave-no-road-closed'),brief=missionBriefing(m),scout=getMissionScouting(m);
 assert.match(brief.goal,/all three bridges.*30 cumulative seconds.*enemy citadel.*10:00/);assert.match(brief.goal,/One HP/);assert.ok(brief.facts.includes('Contested progress pauses; secured time is kept'));assert.match(brief.facts.join(' '),/No compulsory purchase, building loss or replacement/);
 assert.deepEqual([scout.objectives.control.bridges,scout.objectives.control.seconds],[3,30]);assert.match(scout.objectives.summary,/all three bridges.*30 cumulative seconds.*10:00/);assert.match(scout.objectives.summary,/No bridge income/);
 assert.equal(scout.armies[0].buildingCount,5);assert.equal(scout.armies[1].buildingCount,7);
 const app=readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');assert.match(app,/game.ruleset.id === 'frontier-campaign-leave-roads' \? 'Secure all three bridges for 30 cumulative seconds/);
});

// Bind the visible chapter count to actual content, not only the global catalog.
test('Chapter 9 copy matches four available missions and remains partial until minimum five',()=>{
 const progress=createCampaignProgress(),overview=getProgressionCampaignOverview(progress);
 const chapter=overview.chapters.find(c=>c.id==='broken-line');
 assert.equal(chapter.total,4);assert.equal(chapter.plannedMissions,5);
 const words={4:'Four',5:'five'};
 assert.ok(chapter.description.includes(`${words[chapter.total]} missions are currently available; at least ${words[chapter.plannedMissions]} are planned.`));
 const missions=overview.missions.filter(m=>m.chapterId===chapter.id);assert.equal(missions.length,chapter.total);
 for(const m of overview.missions)progress.missions[m.id]={completed:true,stars:1,bestTime:60};
 const cleared=getProgressionCampaignOverview(progress).chapters.find(c=>c.id===chapter.id);
 assert.equal(cleared.cleared,4);assert.equal(cleared.completed,false);assert.equal(cleared.description,chapter.description);
});
