/** QA authoring fixture plus explicit production-parity route. QA identity is never profile-admitted. */
import { Game } from '../../dist/engine.js';
import { createFog, refreshFog } from '../../dist/fog.js';
import { deepFreeze, FOG_RULESET_ID, getRuleset } from '../../dist/rulesets.js';
import { createCampaignMission, evaluateCampaignMission, getCampaignTargets } from '../../dist/campaign.js';
export const DEFAULT_VARIANT='charted-crossing';
export const LANTERNS_QA_RULESET=FOG_RULESET_ID;
export const LANTERNS_SEEDS=Object.freeze([6301,719,51017]);
const b=(type,x,lane,level=1)=>({type,x,lane,level});
export const LANTERNS_VARIANTS=deepFreeze({
  'charted-crossing':{
    id:'charted-crossing',label:'Charted crossing',startingGold:[1050,80],startingHealth:[6000,6000],timeLimit:600,
    playerBuildings:[b('barracks',1110,1),b('archery',970,1),b('watchtower',830,0),b('watchtower',830,2),b('mint',410,1)],
    enemyBuildings:[b('watchtower',2090,0),b('watchtower',2090,2),b('barracks',1950,1),b('barracks',2230,0),b('barracks',2230,2),b('archery',2370,1),b('mint',2790,1)],
    posts:[{name:'North Customs House',type:'watchtower',x:2090,lane:0},{name:'River Customs House',type:'watchtower',x:2090,lane:2}]
  }
});
function definition(variant){if(!Object.hasOwn(LANTERNS_VARIANTS,variant))throw new RangeError(`Unknown Lanterns variant: ${String(variant)}`);return LANTERNS_VARIANTS[variant];}
export function describeLanterns({variant=DEFAULT_VARIANT}={}){
  const d=definition(variant),rules=getRuleset(LANTERNS_QA_RULESET);
  const formations=[d.playerBuildings,d.enemyBuildings].map((items,side)=>items.map(item=>({...item,side,y:[260,450,640][item.lane],invested:rules.buildings[item.type].cost+Array.from({length:item.level-1},(_,i)=>Math.round(rules.buildings[item.type].cost*(.7+.35*i))).reduce((a,b)=>a+b,0)})));
  return {...structuredClone(d),mapId:'classic',difficulty:'normal',ai:true,rulesetId:LANTERNS_QA_RULESET,formations,
    startingInvestment:formations.map(items=>items.reduce((n,item)=>n+item.invested,0)),
    startingIncome:formations.map(items=>5+items.filter(b=>b.type==='mint').reduce((n,b)=>n+2.5*(1+.5*(b.level-1)),0)),
    objective:'Destroy both charted original customs posts or the enemy citadel by 10:00. Your citadel must survive.',
    publicIntel:'The terrain and original post locations are charted. Enemy troops, current HP, upgrades and replacement buildings are unknown outside current sight. Dispatch confirms original-post destruction even outside sight. Building memories are last-seen intelligence.',
    escalation:'At 5:00, ordinary escalation speeds production ×1.65, multiplies troop structure damage ×1.75, and lowers citadel shot damage from 32 to 18. No forced base drain.',
    scope:'Isolated QA fog identity only. Initial assets are authored with ordinary build/upgrade calls, then opening treasuries replace the temporary authoring bank. All later actions are paid; no profile writes, combat edits, hidden grants or outcome forcing.'};
}
export function createLanterns({variant=DEFAULT_VARIANT,seed=LANTERNS_SEEDS[0],production=false}={}){
  if(!Number.isSafeInteger(seed)||seed<0||seed>0xffffffff)throw new RangeError('Seed must be unsigned 32-bit integer.');
  const d=definition(variant);
  if(production){
    const game=createCampaignMission('lanterns-on-the-water');game.seed=seed;
    const posts=getCampaignTargets(game,'lanterns-on-the-water').map(({type,x,lane,name,originalId})=>({type,x,lane,name,id:originalId}));
    Object.defineProperty(game,'lanterns',{value:{variant,timeLimit:d.timeLimit,posts,production:true}});
    return game;
  }
  const game=new Game({difficulty:'normal',seed,ai:true,mapId:'classic',rulesetId:LANTERNS_QA_RULESET});
  const s=game.state;s.buildings=[];s.effects=[];s.stats.built=[0,0];s.gold=[10000,10000];
  for(const [side,items] of [[0,d.playerBuildings],[1,d.enemyBuildings]])for(const item of items){
    const result=game.build(item.type,item.x,game.map.lanes[item.lane],side);
    if(!result.ok)throw new Error(`Invalid ${variant} formation: ${result.reason}`);
    for(let level=1;level<item.level;level++)if(!game.upgrade(result.building.id,side).ok)throw new Error('Invalid authored upgrade.');
  }
  s.gold=[...d.startingGold];s.income=describeLanterns({variant}).startingIncome;
  s.bases.forEach((base,side)=>{base.hp=d.startingHealth[side];});s.fog=createFog();refreshFog(game);
  const posts=d.posts.map(p=>({...p,id:s.buildings.find(b=>b.side===1&&b.type===p.type&&b.x===p.x&&b.lane===p.lane).id}));
  Object.defineProperty(game,'lanterns',{value:{variant,timeLimit:d.timeLimit,posts}});
  return game;
}
export function evaluateLanterns(game){
  const s=game.state,alive=game.lanterns.posts.filter(p=>s.buildings.some(b=>b.id===p.id&&b.hp>0));
  if(game.lanterns.production){
    const outcome=evaluateCampaignMission(game,'lanterns-on-the-water');
    return {outcome:outcome.completed?'won':outcome.failed?(s.bases[0].hp<=0&&s.bases[1].hp<=0?'draw':'lost'):'running',route:outcome.completed?(s.bases[1].hp<=0?'enemy-citadel':'original-posts'):outcome.failed?(s.bases[0].hp<=0?'player-citadel':'deadline'):null,postsRemaining:alive.length};
  }
  // Ordinary player/core loss precedence. Replacements never restore an original target.
  if(s.bases[0].hp<=0)return {outcome:s.bases[1].hp<=0?'draw':'lost',route:'player-citadel',postsRemaining:alive.length};
  if(s.bases[1].hp<=0)return {outcome:'won',route:'enemy-citadel',postsRemaining:alive.length};
  if(!alive.length)return {outcome:'won',route:'original-posts',postsRemaining:0};
  if(s.time>=game.lanterns.timeLimit-1e-8)return {outcome:'lost',route:'deadline',postsRemaining:alive.length};
  return {outcome:'running',route:null,postsRemaining:alive.length};
}
