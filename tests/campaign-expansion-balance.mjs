/** Read-only frontier stress report: node tests/campaign-expansion-balance.mjs [samples=12]. */
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {Game,MAPS} from '../dist/engine.js';
import {CAMPAIGN_MISSIONS,createCampaignMission,evaluateCampaignMission} from '../dist/campaign.js';
import {playCampaign,productionPolicy} from './campaign-policies.mjs';
const samples=Number(process.argv[2]||12);
if(!Number.isInteger(samples)||samples<1||samples>100)throw Error('Sample count must be an integer from 1 to 100.');
const routes={
  reference:()=>({}),
  mastery:()=>({mastery:true}),
  paced:()=>({startDelay:5,actionEvery:2,maxActionsPerDecision:1}),
  delayed:()=>({startDelay:10,actionEvery:3,maxActionsPerDecision:1}),
  idle:()=>({idle:true}),
  groundOnly:mission=>({policy:productionPolicy(['sanctum'],MAPS[mission.mapId].lanes.map((_,lane)=>lane))})
};
const results=[];
for(const mission of CAMPAIGN_MISSIONS.slice(12)){
  const row={mission:mission.id,mapId:mission.mapId,samples,routes:{}};
  for(const [name,options] of Object.entries(routes)){
    const route={clears:0,threeStars:0,minSeconds:Infinity,maxSeconds:0,minCitadelHP:Infinity,failures:[],missedMedals:[]};
    for(let index=0;index<samples;index++){
      const seed=index===0?mission.seed:Math.imul(index,2654435761)>>>0;
      const {game,outcome}=playCampaign(createCampaignMission,evaluateCampaignMission,mission,{seed,...options(mission),restore:index%4===3?data=>Game.restore(data):null});
      if(outcome.completed){route.clears++;if(outcome.stars===3)route.threeStars++;route.minSeconds=Math.min(route.minSeconds,game.state.time);route.maxSeconds=Math.max(route.maxSeconds,game.state.time);route.minCitadelHP=Math.min(route.minCitadelHP,game.state.bases[0].hp);if(outcome.stars<3)route.missedMedals.push({seed,stars:outcome.stars,goals:outcome.medals.filter(m=>!m.earned).map(m=>m.label)});}
      else route.failures.push({seed,seconds:+game.state.time.toFixed(2),reason:outcome.label});
      Game.restore(game.serialize());
    }
    for(const key of ['minSeconds','maxSeconds','minCitadelHP'])route[key]=Number.isFinite(route[key])?+route[key].toFixed(2):null;
    row.routes[name]=route;
  }
  results.push(row);
}
const digest=async name=>createHash('sha256').update(await readFile(new URL(`../dist/${name}`,import.meta.url))).digest('hex');
console.log(JSON.stringify({engineSha:await digest('engine.js'),campaignSha:await digest('campaign.js'),samples,simulations:results.length*samples*Object.keys(routes).length,note:'Paid actions only. First sample uses the authored seed; remaining samples use a golden-ratio seed sequence. Every fourth sample restores every ten simulated seconds. Paced and delayed routes cap successful paid commands at one per decision. These are policy controls, not human win-rate estimates; delayed and wrong-composition losses are reported rather than hidden.',results},null,2));
