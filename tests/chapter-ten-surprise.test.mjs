import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {Game} from '../dist/engine.js';import * as c from '../dist/campaign.js';import {lastEngineView} from '../dist/final-chapter-view.js';import {COLOSSUS,ENCOUNTER,supportsColossus} from '../dist/colossus.js';import {encodeBattle,decodeBattle} from '../dist/battle-codec.js';import {getMissionScouting,renderMissionScouting} from '../dist/scouting.js';import {advanceObjectiveBattle} from '../dist/objectives.js';
const earned=()=>({...c.createCampaignProgress(),missions:Object.fromEntries(c.CAMPAIGN_PROGRESS_MISSIONS.filter(m=>m.id!=='the-last-engine').map(m=>[m.id,{completed:true,stars:1,bestTime:60}]))});
const ticks=(g,n)=>{for(let i=0;i<n;i++)g.update(.05);};
function reveal(){const g=c.createCampaignMission('the-last-engine');g.state.buildings=[];g.state.units=[];g.state.bases[1].hp=0;g.update(.05);return g;}
test('surprise is withheld before trigger; reveal explains emergence, approach, siege and real victory',()=>{
 const g=c.createCampaignMission('the-last-engine');assert.equal(lastEngineView(g),null);assert.equal(lastEngineView(c.createCampaignMission('below-the-ramparts')),null);
 g.state.buildings=[];g.state.units=[];g.state.bases[1].hp=0;g.update(.05);assert.equal(lastEngineView(g).mode,'emerging');assert.match(lastEngineView(g).description,/already take damage/);assert.match(lastEngineView(g).objective,/Defeat the Last Engine/);assert.equal(c.evaluateCampaignMission(g,'the-last-engine').completed,false);
 ticks(g,60);assert.equal(lastEngineView(g).mode,'approach');assert.match(lastEngineView(g).description,/midfield.*slows/);ticks(g,338);assert.equal(lastEngineView(g).mode,'siege');assert.equal(g.state.units.find(u=>u.type==='colossus').x,1600);assert.equal(ENCOUNTER.approachSpeed,3*COLOSSUS.speed);
 const boss=g.state.units.find(u=>u.type==='colossus');g._damage(boss,boss.hp,0);g.update(.05);assert.equal(lastEngineView(g).mode,'defeated');assert.equal(c.evaluateCampaignMission(g,'the-last-engine').completed,true);
});
test('revision2 movement restores every stage exactly; forged counts, old state and old production identity reject',()=>{
 const g=reveal(),ref=c.campaignScenarioForGame(g,'the-last-engine'),p=earned();
 for(const n of [0,37,24,338,30]){ticks(g,n);const packet=encodeBattle(g,ref,{campaignProgress:p}),r=decodeBattle(packet,{campaignProgress:p}).game;assert.deepEqual(r.serialize(),g.serialize());g.update(.017);r.update(.017);assert.deepEqual(r.serialize(),g.serialize());for(const mutate of [x=>x.state.colossus.motion.approachTicks++,x=>x.state.colossus.motion.siegeTicks=-1,x=>x.state.colossus.revision=1,x=>x.rulesetId='frontier-campaign-last-engine']){const forged=structuredClone(g.serialize());mutate(forged);assert.throws(()=>Game.restore(forged));}}
});
test('synthetic body can damage original ordinary buildings across all three roads without guaranteed casualties',()=>{
 const g=reveal();ticks(g,60+338);const boss=g.state.units.find(u=>u.type==='colossus');assert.equal(boss.x,1600);
 // Legal ordinary builds at the player's front; only fixture gold is supplied here.
 g.state.gold[0]=1000;const buildings=g.map.lanes.map(y=>g.build('barracks',1250,y).building);assert.ok(buildings.every(Boolean));const hp=buildings.map(b=>b.hp);ticks(g,190);assert.ok(buildings.every((b,i)=>b.hp<hp[i]&&b.hp>0));assert.equal(g.state.bases[0].hp,4200);
});
test('Night accessible Scout names one command post; Crossing describes exactly two zones',()=>{
 const night=renderMissionScouting(c.getCampaignMission('no-fires-tonight')),cross=getMissionScouting(c.getCampaignMission('carry-the-crossing'));
 assert.match(night,/charted battlefield/);assert.match(night,/North Command Post/);assert.doesNotMatch(night,/customs.post/i);assert.match(cross.legend,/two capture zones/);assert.doesNotMatch(cross.legend,/three capture/);
});
for(const id of ['below-the-ramparts','the-last-granary','no-fires-tonight','carry-the-crossing','the-last-engine'])test(`${id}: no-input pacing diagnostic loses naturally with enemy citadel intact`,()=>{const g=c.createCampaignMission(id),m=c.getCampaignMission(id);let out=c.evaluateCampaignMission(g,id);while(!out.completed&&!out.failed&&g.state.time<600)out=advanceObjectiveBattle(g,.05,x=>c.evaluateCampaignMission(x,id),m.timeLimit??Infinity);assert.equal(out.failed,true);assert.equal(out.completed,false);assert.equal(g.state.bases[0].hp,0);assert.equal(g.state.bases[1].hp,6000);});
test('app source uses the no-deadline path, dynamic reveal and true objective completion before recording ending',async()=>{const text=await readFile(new URL('../dist/app.js',import.meta.url),'utf8');assert.match(text,/authored\.timeLimit \?\? Infinity/);assert.match(text,/authored\.timeLimit === null \? 'No deadline'/);assert.match(text,/const engineView = lastEngineView\(game\)/);assert.match(text,/campaignEndingReward\(priorProgress,campaignProgress,currentCampaign,game\)/);assert.match(text,/won = authored \? objectiveOutcome\?\.completed/);});
