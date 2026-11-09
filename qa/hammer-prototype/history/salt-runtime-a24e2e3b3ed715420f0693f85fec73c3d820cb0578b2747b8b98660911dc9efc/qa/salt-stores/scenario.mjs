import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createCampaignMission,getCampaignMission,getCampaignTargets} from '../../dist/campaign.js';
export const ID='salt-in-the-stores';
export const BASELINE=Object.freeze({commit:'0e5123f9e4574c362de0b83d2bf7a727dbefee4c',equivalentCandidate:'d399b75cadfb70aa878a02e5fb0eb9f78b8836e2',tree:'60cc6683855b38669ecddfe330853cdda86e4c8f'});
export const hash=v=>createHash('sha256').update(typeof v==='string'||Buffer.isBuffer(v)?v:JSON.stringify(v)).digest('hex');
export function exactScenario(){
 const mission=getCampaignMission(ID),game=createCampaignMission(ID),s=game.state;
 assert.equal(game.ruleset.id,'frontier-campaign-salt-stores');assert.equal(game.ruleset.revision,1);assert.equal(game.map.id,'classic');assert.equal(game.map.revision,1);assert.equal(mission.scenarioRevision,1);
 assert.deepEqual(mission.playerBuildings,[['barracks',970,1,2],['archery',830,1,2],['watchtower',1110,0,2],['watchtower',1110,2,2],['mint',410,1,1]]);
 assert.deepEqual(mission.enemyBuildings,[['mint',1950,0,1],['mint',2090,2,1],['mint',2790,1,1],['barracks',2370,0,1],['barracks',2370,2,1],['watchtower',2090,1,2],['barracks',2230,1,2],['archery',2370,1,1]]);
 assert.deepEqual(s.gold,[1100,100]);assert.deepEqual(s.bases.map(b=>b.hp),[6000,6000]);assert.deepEqual(s.income,[7.5,12.5]);assert.equal(mission.seed,8202);assert.equal(mission.timeLimit,600);assert.equal(game.difficulty,'normal');assert.equal(game.ai,true);assert.equal(game.ruleset.endgame.forcedDecay,false);assert.ok(!s.fog);assert.equal(getCampaignTargets(game,ID).length,0);
 const formation={scenario:{id:ID,revision:1},ruleset:{id:game.ruleset.id,revision:1},map:{id:'classic',revision:1},seed:8202,startingGold:[...s.gold],startingHP:s.bases.map(b=>b.hp),startingIncome:[...s.income],playerBuildings:mission.playerBuildings,enemyBuildings:mission.enemyBuildings,deadline:600,escalation:300,ai:true,difficulty:'normal',fog:false};
 return{game,mission,formation,formationSha256:hash(formation)};
}
