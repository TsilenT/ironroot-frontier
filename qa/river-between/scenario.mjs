/** Authored production setup only. Alternate seeds change ordinary random choices. */
import {createCampaignMission,evaluateCampaignMission,getCampaignMission,getCampaignTargets} from '../../dist/campaign.js';
import {getRuleset} from '../../dist/rulesets.js';
export const RIVER_SEEDS=Object.freeze([6501,719,51017]);
export const ID='a-river-between-us';
export function describeRiver(){const m=getCampaignMission(ID);return {mapId:m.mapId,rulesetId:m.rulesetId,startingGold:[m.startingGold,m.enemyGold],startingIncome:[7.5,7.5],startingInvestment:[m.playerBuildings,m.enemyBuildings].map(list=>list.reduce((sum,[type])=>sum+getRuleset(m.rulesetId).buildings[type].cost,0)),timeLimit:m.timeLimit,playerBuildings:m.playerBuildings,enemyBuildings:m.enemyBuildings};}
export function createRiver({seed=RIVER_SEEDS[0]}={}){if(!Number.isSafeInteger(seed)||seed<0||seed>0xffffffff)throw new RangeError('Invalid seed');const g=createCampaignMission(ID);g.seed=seed;return g;}
export function evaluateRiver(g){const r=evaluateCampaignMission(g,ID);return {outcome:r.completed?'won':r.failed?'lost':'running',route:r.completed?(g.state.bases[1].hp<=0?'enemy-citadel':'command-and-crossings'):r.failed?(g.state.bases[0].hp<=0?'player-citadel':'deadline'):null,commandRemaining:getCampaignTargets(g,ID).filter(t=>t.building).length,heldSeconds:g.state.campaignControl.heldSeconds};}
