import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createCampaignMission,getCampaignMission,getCampaignTargets} from '../../dist/campaign.js';
export const ID='through-the-reed-beds';
export const BASELINE={commit:'6b6cf964097a815b214933c7e74bb3f23b72d5d5',tree:'50c098a436ddee2e36d629a2e7d36e6887ae6b25'};
export const hash=value=>createHash('sha256').update(typeof value==='string'?value:JSON.stringify(value)).digest('hex');
export function exactScenario(){
 const mission=getCampaignMission(ID),game=createCampaignMission(ID),s=game.state;
 assert.equal(game.ruleset.id,'frontier-campaign-reed-beds');assert.equal(game.ruleset.revision,1);assert.equal(mission.scenarioRevision,1);assert.equal(game.map.id,'classic');assert.equal(game.map.revision,1);
 assert.deepEqual(mission.playerBuildings,[['barracks',830,0],['barracks',830,1],['barracks',830,2],['mint',410,1]]);
 assert.deepEqual(mission.enemyBuildings,[['watchtower',2230,0,2],['archery',2370,0],['foundry',2230,1],['barracks',2090,1],['sanctum',2230,2],['archery',2090,2],['mint',2790,1]]);
 assert.deepEqual(s.gold,[1100,100]);assert.deepEqual(s.bases.map(b=>b.hp),[6000,6000]);assert.deepEqual(s.income,[7.5,7.5]);assert.equal(mission.seed,7307);assert.equal(mission.timeLimit,600);assert.equal(game.difficulty,'normal');assert.equal(game.ai,true);assert.equal(game.ruleset.endgame.forcedDecay,false);assert.ok(!s.fog);
 const targets=getCampaignTargets(game,ID).filter(t=>t.kind==='destroy');assert.equal(targets.length,3);assert.deepEqual(targets.map(t=>[t.type,t.x,t.lane]),[['watchtower',2230,0],['foundry',2230,1],['sanctum',2230,2]]);
 const formation={scenario:{id:ID,revision:1},ruleset:{id:game.ruleset.id,revision:1},map:{id:'classic',revision:1},seed:mission.seed,startingGold:[...s.gold],startingHP:s.bases.map(b=>b.hp),startingIncome:[...s.income],playerBuildings:mission.playerBuildings,enemyBuildings:mission.enemyBuildings,targets:targets.map(({type,x,lane,originalId})=>({type,x,lane,originalId})),deadline:600,escalation:300,ai:true,difficulty:'normal',fog:false};
 return {game,mission,formation,formationSha256:hash(formation)};
}
