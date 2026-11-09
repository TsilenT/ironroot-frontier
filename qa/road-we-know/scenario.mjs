import {Game} from '../../dist/engine.js';
import {getRuleset} from '../../dist/rulesets.js';
export const DEFAULT_VARIANT='charted';
export const ROAD_WE_KNOW_SEEDS=[7301,719,51017];
const b=(type,x,lane,level=1)=>({type,x,lane,level});
export function describeRoadWeKnow(){
 const playerBuildings=[b('barracks',1110,0),b('archery',970,0),b('watchtower',830,1),b('mint',410,1)];
 const enemyBuildings=[b('watchtower',2230,0),b('archery',2370,0),b('barracks',1950,1),b('foundry',2230,1),b('mint',2510,1),b('barracks',2650,0)];
 const r=getRuleset('frontier-campaign-citadel-open');
 return {variant:'charted',mapId:'twin-span',rulesetId:r.id,difficulty:'normal',ai:true,startingGold:[1000,120],startingHealth:[6000,6000],startingIncome:[7.5,7.5],timeLimit:600,playerBuildings,enemyBuildings,startingInvestment:[playerBuildings,enemyBuildings].map(bs=>bs.reduce((n,b)=>n+r.buildings[b.type].cost*(b.level===2?1.7:1),0)),objective:'Destroy the enemy citadel. Your citadel must survive.',publicIntel:'Both roads are charted and fully visible. North has a tower and ranged support. South holds ground production and their mine. Choose where to commit; keep the other road covered. Win within 10:00. Ordinary escalation begins at 5:00.'};
}
export function createRoadWeKnow({seed=7301}={}){
 const d=describeRoadWeKnow(),g=new Game({difficulty:d.difficulty,seed,ai:true,mapId:d.mapId,rulesetId:d.rulesetId}),s=g.state;
 s.buildings=[];s.effects=[];s.stats.built=[0,0];s.gold=[10000,10000];
 for(const [side,bs] of [[0,d.playerBuildings],[1,d.enemyBuildings]])for(const b of bs){const r=g.build(b.type,b.x,g.map.lanes[b.lane],side);if(!r.ok)throw Error(JSON.stringify({b,r}));for(let l=1;l<b.level;l++)if(!g.upgrade(r.building.id,side).ok)throw Error('Upgrade failed');}
 s.gold=[...d.startingGold];s.income=[...d.startingIncome];
 Object.defineProperty(g,'roadWeKnow',{value:{timeLimit:d.timeLimit,posts:s.buildings.filter(b=>b.side===1).map(b=>({name:`${b.lane===0?'North':'South'} ${b.type}`,id:b.id,x:b.x,lane:b.lane,type:b.type}))}});return g;
}
export function evaluateRoadWeKnow(g){const s=g.state,postsRemaining=g.roadWeKnow.posts.filter(p=>s.buildings.some(b=>b.id===p.id&&b.hp>0)).length;const result=(outcome,route)=>({outcome,route,postsRemaining});if(s.bases[0].hp<=0)return result('lost','player-citadel');if(s.bases[1].hp<=0)return result('won','enemy-citadel');if(s.time>=600-1e-8)return result('lost','deadline');return result('running',null);}
