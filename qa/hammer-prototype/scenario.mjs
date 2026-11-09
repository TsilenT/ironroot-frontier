import {Game} from '../../dist/engine.js';
import {HAMMER_RULESET_ID} from '../../dist/hammer-policy.js';
export const MISSION=Object.freeze({id:'the-hammer-turns-prototype',admitted:false,scenarioRevision:1,mapId:'classic',timeLimit:600,difficulty:'normal',seed:8303,startingGold:1100,enemyGold:320,startingHealth:6000,playerBuildings:[['barracks',970,0],['barracks',970,1],['barracks',970,2],['archery',830,1],['mint',410,1]],enemyBuildings:[['barracks',2090,0],['barracks',2090,1],['barracks',2090,2],['archery',2230,0],['archery',2230,1],['archery',2230,2]]});
/** Authoring only. Later outcome runs cannot call this or write state. */
export function createScenario({opponent='hammer',seed=MISSION.seed}={}){
 if(!['hammer','generic'].includes(opponent))throw Error('Unknown opponent');
 const g=new Game({difficulty:'normal',seed,ai:true,mapId:'classic',rulesetId:opponent==='hammer'?HAMMER_RULESET_ID:'frontier-campaign-salt-stores'}),s=g.state;
 s.buildings=[];s.effects=[];s.stats.built=[0,0];s.gold=[10000,10000];
 for(const [side,placements]of [[0,MISSION.playerBuildings],[1,MISSION.enemyBuildings]])for(const[type,x,lane,level=1]of placements){const out=g.build(type,x,g.map.lanes[lane],side);if(!out.ok)throw Error(out.reason);for(let i=1;i<level;i++)if(!g.upgrade(out.building.id,side).ok)throw Error('Invalid authored upgrade');}
 s.gold=[MISSION.startingGold,MISSION.enemyGold];s.income=[7.5,5];s.bases[0].hp=MISSION.startingHealth;return g;
}
export function evaluate(g){const s=g.state;if(s.bases[0].hp<=0||s.winner===1||s.winner==='draw')return{ended:true,outcome:'lost',reason:'own-citadel'};if(s.bases[1].hp<=0&&s.time<=MISSION.timeLimit+1e-7)return{ended:true,outcome:'won',reason:'enemy-citadel'};if(s.time>=MISSION.timeLimit-1e-7)return{ended:true,outcome:'lost',reason:'deadline'};return{ended:false,outcome:'running',reason:null};}
