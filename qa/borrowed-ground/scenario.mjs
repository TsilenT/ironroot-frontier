/** Reproducible ordinary-cost formation. This harness never writes profiles. */
import { Game } from '../../dist/engine.js';
import { BORROWED_GROUND_RULESET_ID, deepFreeze, getRuleset } from '../../dist/rulesets.js';
import { createCampaignMission, evaluateCampaignMission, getCampaignTargets } from '../../dist/campaign.js';
export const BORROWED_SEEDS=Object.freeze([6401,719,51017]);
export const BORROWED_FORMATION=deepFreeze({
  mapId:'borrowed-yard',mapRevision:1,rulesetId:BORROWED_GROUND_RULESET_ID,rulesetRevision:1,
  startingGold:[420,160],timeLimit:600,
  playerBuildings:[['watchtower',1250,0],['watchtower',1250,1],['watchtower',1250,2],['barracks',970,0],['barracks',970,1],['barracks',970,2],['archery',690,0],['archery',690,2],['mint',410,1]],
  enemyBuildings:[['watchtower',1950,0],['watchtower',1950,2],['barracks',2230,0],['barracks',1950,1],['barracks',2230,2],['archery',2230,1],['foundry',2510,0],['mint',2790,1]],
});
export function describeBorrowed(){
 const d=BORROWED_FORMATION,definitions=getRuleset(d.rulesetId).buildings;
 return {...structuredClone(d),startingInvestment:[d.playerBuildings,d.enemyBuildings].map(list=>list.reduce((sum,[type])=>sum+definitions[type].cost,0)),startingIncome:[7.5,7.5],
  scope:'One formation, ordinary normal adaptive AI. Initial buildings use normal paid authoring calls, then disclosed opening treasuries replace the setup bank. No runtime grant, combat alteration, compulsory unit or protected camp asset.'};
}
export function createBorrowed({seed=BORROWED_SEEDS[0],production=false}={}){
 if(!Number.isSafeInteger(seed)||seed<0||seed>0xffffffff)throw new RangeError('Seed must be unsigned 32-bit integer.');
 const d=BORROWED_FORMATION,g=production?createCampaignMission('borrowed-ground'):new Game({difficulty:'normal',seed,ai:true,mapId:d.mapId,mapRevision:d.mapRevision,rulesetId:d.rulesetId,rulesetRevision:d.rulesetRevision});
 if(!production){const s=g.state;s.buildings=[];s.effects=[];s.stats.built=[0,0];s.gold=[10000,10000];for(const [side,items]of [[0,d.playerBuildings],[1,d.enemyBuildings]])for(const [type,x,lane]of items){const r=g.build(type,x,g.map.lanes[lane],side);if(!r.ok)throw new Error('Invalid Borrowed Ground formation: '+r.reason);}s.gold=[...d.startingGold];s.income=[7.5,7.5];}
 g.seed=seed;
 return g;
}
export function evaluateBorrowed(g){const outcome=evaluateCampaignMission(g,'borrowed-ground'),remaining=getCampaignTargets(g,'borrowed-ground').filter(t=>t.building).length;return {outcome:outcome.completed?'won':outcome.failed?'lost':'running',route:outcome.completed?(g.state.bases[1].hp<=0?'enemy-citadel':'original-roadblocks'):outcome.failed?(g.state.bases[0].hp<=0?'player-citadel':'deadline'):null,roadblocksRemaining:remaining};}
