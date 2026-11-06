/** Optional campaign stress report. Run: node tests/campaign-balance.mjs [sample-count] */
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {CAMPAIGN_MISSIONS,createCampaignMission,evaluateCampaignMission} from '../dist/campaign.js';
import {Game} from '../dist/engine.js';
import {playCampaign} from './campaign-policies.mjs';
const engineSha=createHash('sha256').update(await readFile(new URL('../dist/engine.js',import.meta.url))).digest('hex').slice(0,12);
const count=Number(process.argv[2]||12);
if(!Number.isInteger(count)||count<1||count>100)throw Error('Sample count must be an integer from 1 to 100.');
const results=[];
for(const mission of CAMPAIGN_MISSIONS) {
  const row={mission:mission.id,mapId:mission.mapId,chapter:mission.chapterId,samples:count,clears:0,masteryClears:0,threeStars:0,minSeconds:Infinity,maxSeconds:0,minCitadelHP:6000,failures:[],missedMedals:[]};
  for(let index=0;index<count;index++)for(const mastery of [false,true]) {
    const seed=index===0?mission.seed:(Math.imul(index,2654435761)>>>0);
    const {game,outcome}=playCampaign(createCampaignMission,evaluateCampaignMission,mission,{seed,mastery,restore:index%4===3?data=>Game.restore(data):null});
    if(outcome.completed) {
      if(mastery){row.masteryClears++;if(outcome.stars===3)row.threeStars++;else row.missedMedals.push({seed,stars:outcome.stars,seconds:+game.state.time.toFixed(2),goals:outcome.medals.filter(m=>!m.earned).map(m=>m.label)});}
      else {row.clears++;row.minSeconds=Math.min(row.minSeconds,game.state.time);row.maxSeconds=Math.max(row.maxSeconds,game.state.time);row.minCitadelHP=Math.min(row.minCitadelHP,game.state.bases[0].hp);}
    } else row.failures.push({seed,route:mastery?'mastery':'reference',seconds:+game.state.time.toFixed(2),reason:outcome.label});
    Game.restore(game.serialize());
  }
  row.minSeconds=Number.isFinite(row.minSeconds)?+row.minSeconds.toFixed(2):null;
  row.maxSeconds=+row.maxSeconds.toFixed(2);row.minCitadelHP=Math.round(row.minCitadelHP);
  results.push(row);
}
console.log(JSON.stringify({engineSha,legacyMissions:12,legacyStars:36,totalMissions:CAMPAIGN_MISSIONS.length,totalStars:CAMPAIGN_MISSIONS.length*3,note:'Reference-policy outcomes, not human difficulty or proof that every strategy is viable. Only the initial combat seed varies; paid action rules are unchanged.',results},null,2));
