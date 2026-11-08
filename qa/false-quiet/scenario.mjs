import {createCampaignMission,evaluateCampaignMission,getCampaignTargets} from '../../dist/campaign.js';
import {Game} from '../../dist/engine.js';
import {createFog,refreshFog} from '../../dist/fog.js';
import {FOG_RULESET_ID,getRuleset} from '../../dist/rulesets.js';
export const DEFAULT_VARIANT='ground-heavy';
export const FALSE_QUIET_SEEDS=[7301,719,51017];
const b=(type,x,lane,level=1)=>({type,x,lane,level});
const playerBuildings=[b('barracks',1110,1),b('archery',970,1),b('watchtower',830,0),b('watchtower',830,2),b('mint',410,1)];
export function describeFalseQuiet({variant=DEFAULT_VARIANT}={}){
 if(!['ground-heavy','air-flank'].includes(variant))throw Error('Unknown variant');
 const air=variant==='air-flank';
 const enemyBuildings=[b('watchtower',2230,1,2),b(air?'aerie':'barracks',1950,1),b(air?'aerie':'barracks',2230,0),b(air?'barracks':'foundry',2230,2),b('archery',2370,1),b('barracks',2510,2),b('mint',2790,1)];
 const r=getRuleset(FOG_RULESET_ID);
 return {variant,mapId:'classic',rulesetId:FOG_RULESET_ID,difficulty:'normal',ai:true,startingGold:[1000,120],startingHealth:[6000,6000],startingIncome:[7.5,7.5],timeLimit:600,playerBuildings,enemyBuildings,startingInvestment:[playerBuildings,enemyBuildings].map(bs=>bs.reduce((n,b)=>n+r.buildings[b.type].cost*(b.level===2?1.7:1),0)),objective:'Destroy the original central Middle Road Fort or the enemy citadel. Your citadel must survive.',publicIntel:'The original central fort position is charted. Either a ground-heavy or aerial/flank garrison begins here; its selection is not revealed. Observe before choosing counters, or commit blind. Dispatch confirms original-fort destruction. Ordinary escalation begins at 5:00.'};
}
export function createFalseQuiet({variant=DEFAULT_VARIANT,seed=7301,production=false}={}){
 if(!Number.isSafeInteger(seed)||seed<0||seed>0xffffffff)throw new RangeError('Seed must be unsigned 32-bit integer.');
 describeFalseQuiet({variant});
 if(production){const g=createCampaignMission('false-quiet',{variant:variant==='ground-heavy'?'a':'b'});g.seed=seed;Object.defineProperty(g,'falseQuiet',{value:{variant,timeLimit:600,production:true,posts:getCampaignTargets(g,'false-quiet').map(p=>({...p,id:p.originalId}))}});return g;}
 const d=describeFalseQuiet({variant}),g=new Game({difficulty:'normal',seed,ai:true,mapId:'classic',rulesetId:FOG_RULESET_ID}),s=g.state;
 s.buildings=[];s.effects=[];s.stats.built=[0,0];s.gold=[10000,10000];
 for(const [side,bs] of [[0,d.playerBuildings],[1,d.enemyBuildings]])for(const b of bs){const r=g.build(b.type,b.x,g.map.lanes[b.lane],side);if(!r.ok)throw Error(JSON.stringify({b,r}));for(let l=1;l<b.level;l++)if(!g.upgrade(r.building.id,side).ok)throw Error('Upgrade failed');}
 s.gold=[...d.startingGold];s.income=[...d.startingIncome];s.fog=createFog();refreshFog(g);
 Object.defineProperty(g,'falseQuiet',{value:{variant,timeLimit:d.timeLimit,posts:[{name:'Middle Road Fort',id:s.buildings.find(b=>b.side===1&&b.x===2230&&b.lane===1).id,x:2230,lane:1,type:'watchtower'}]}});return g;
}
export function evaluateFalseQuiet(g){const s=g.state,postsRemaining=g.falseQuiet.posts.filter(p=>s.buildings.some(b=>b.id===p.id&&b.hp>0)).length;const result=(outcome,route)=>({outcome,route,postsRemaining});if(g.falseQuiet.production){const r=evaluateCampaignMission(g,'false-quiet');return result(r.completed?'won':r.failed?'lost':'running',r.completed?(s.bases[1].hp<=0?'enemy-citadel':'original-fort'):r.failed?(s.bases[0].hp<=0?'player-citadel':'deadline'):null);}if(s.bases[0].hp<=0)return result('lost','player-citadel');if(s.bases[1].hp<=0)return result('won','enemy-citadel');if(!postsRemaining)return result('won','original-fort');if(s.time>=600-1e-8)return result('lost','deadline');return result('running',null);}
