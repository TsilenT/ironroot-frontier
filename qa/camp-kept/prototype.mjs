/** Isolated QA-only new design. No catalog, ruleset, unlock or version admission. */
import {Game} from '../../dist/engine.js';
import {deepFreeze,CITADEL_CAMPAIGN_RULESET_IDS} from '../../dist/rulesets.js';
import {actualIncome} from '../salt-stores/economy.mjs';
export const DESIGN=deepFreeze({
 id:'camp-kept-prototype',epoch:3,title:'The Camp We Kept',
 baselineCommit:'5df8df8510dc6ca5806146e6e2023385cd7d7198',baselineTree:'4c6ebc192061e346ff57b72aa2741e474d0f5107',
 numericStatus:'Outcome-informed epoch3 policies only; the epoch2 scenario is unchanged and remains unvalidated.',
 mapId:'classic',rulesetId:CITADEL_CAMPAIGN_RULESET_IDS[2],difficulty:'normal',ai:true,
 seed:9101,timeLimit:600,startingHealth:2700,startingGold:1100,enemyGold:100,cadenceSeconds:2,
 playerBuildings:[['barracks',830,0],['barracks',830,1],['archery',690,1],['mint',410,1]],
 enemyBuildings:[['barracks',2090,0],['archery',2370,0],['barracks',1950,1],['foundry',2230,1],['aerie',1950,2],['barracks',2230,2],['mint',2790,1]],
});
export function createPrototype({seed=DESIGN.seed,health='wounded'}={}){
 if(!Number.isSafeInteger(seed)||seed<0||seed>4294967295)throw new RangeError('Seed must be uint32');
 if(!['wounded','full'].includes(health))throw new RangeError('Unknown health control');
 const g=new Game({seed,mapId:DESIGN.mapId,rulesetId:DESIGN.rulesetId,difficulty:DESIGN.difficulty,ai:DESIGN.ai}),s=g.state;
 s.buildings=[];s.effects=[];s.stats.built=[0,0];s.gold=[10000,10000];
 for(const [side,formation] of [[0,DESIGN.playerBuildings],[1,DESIGN.enemyBuildings]])for(const [type,x,lane] of formation){
  const r=g.build(type,x,g.map.lanes[lane],side);if(!r.ok)throw Error('Invalid Camp formation: '+r.reason);
 }
 s.effects=[];s.gold=[DESIGN.startingGold,DESIGN.enemyGold];s.bases[0].hp=health==='full'?6000:DESIGN.startingHealth;
 s.income=[0,1].map(side=>actualIncome(g,side));return g;
}
export function evaluatePrototype(g){
 const s=g.state;
 if(s.bases[0].hp<=0||s.winner===1||s.winner==='draw')return {completed:false,failed:true,reason:'player-core'};
 if(s.bases[1].hp<=0||s.winner===0)return {completed:true,failed:false,reason:'enemy-core'};
 if(s.time>=DESIGN.timeLimit-1e-7)return {completed:false,failed:true,reason:'deadline'};
 return {completed:false,failed:false,reason:null};
}
const slot=(type,x,lane)=>({type,x,lane});
export const OPENING=deepFreeze([slot('archery',690,2),slot('barracks',830,2),slot('archery',690,0),slot('sanctum',550,0)]);
export const FOLLOWUP=deepFreeze([slot('sanctum',550,1),slot('archery',550,2),slot('mint',270,0),slot('foundry',270,1),slot('mint',270,2),slot('foundry',410,0),slot('foundry',410,2)]);
export const POLICIES=deepFreeze({
 'support-none':{choice:null,description:'Support and rebuild the perimeter first; no citadel purchase. Then add rear support, income and screened rear siege.'},
 'support-regen':{choice:'regen',description:'The same support/rebuild policy, buying ordinary regeneration after the four initial support additions and before optional development.'},
 'support-arrows':{choice:'arrows',description:'The same support/rebuild policy, buying the equal-price Extra Arrow at the same decision stage.'},
 idle:{choice:null,description:'No player actions. Inherited production and ordinary paid opponent remain active.'},
});
const key=a=>`${a.type}@${a.x},${a.lane}`;
const present=(g,a)=>g.state.buildings.some(b=>b.side===0&&b.hp>0&&b.type===a.type&&b.x===a.x&&b.lane===a.lane);
/** Fresh outcome-informed scripts, not retroactive fixes to earlier policies.
 * One ordinary command at most every 2s. No per-step hidden-state/RNG reads.
 * Priority: urgent visible core-area volley; rebuild introduced producers;
 * next opening addition; optional one-time choice; introduced mine repair;
 * next rear support/development; affordable producer upgrade. */
export function createPolicy(id){
 const def=POLICIES[id];if(!def)throw Error('Unknown Camp policy');let nextTick=0,opening=0,followup=0;
 const introduced=DESIGN.playerBuildings.map(([type,x,lane])=>slot(type,x,lane)),commands=[];
 const typePriority=['barracks','archery','sanctum','foundry'],laneOrder=[0,2,1];
 function remember(a){if(!introduced.some(s=>key(s)===key(a)))introduced.push({...a});}
 function nearest(g,lane){return Math.min(Infinity,...g.state.units.filter(u=>u.side===1&&u.hp>0&&u.lane===lane&&u.x<=1600).map(u=>u.x));}
 function order(g,a,b){const da=nearest(g,a.lane),db=nearest(g,b.lane);return (da===db?0:da-db)||typePriority.indexOf(a.type)-typePriority.indexOf(b.type)||laneOrder.indexOf(a.lane)-laneOrder.indexOf(b.lane)||b.x-a.x;}
 function build(g,a,reason){return apply(g,{method:'build',...a,decision:reason});}
 function repair(g,production){
  const missing=introduced.filter(a=>(!!g.buildings[a.type].unit)===production&&!present(g,a)).sort((a,b)=>order(g,a,b));
  if(!missing.length)return null;
  const affordable=missing.find(a=>g.state.gold[0]>=g.buildings[a.type].cost);
  return build(g,affordable??missing[0],production?'rebuild-production':'rebuild-income');
 }
 function volley(g){
  const s=g.state,base=s.bases[0];if(s.gold[0]<g.ruleset.spell.cost||s.spellCooldown[0]>0)return null;
  const enemies=s.units.filter(u=>u.side===1&&u.hp>0),aims=enemies.filter(u=>Math.hypot(u.x-base.x,u.y-base.y)<=600)
   .map(u=>({u,count:enemies.filter(v=>Math.hypot(v.x-u.x,v.y-u.y)<g.ruleset.spell.radius).length}))
   .filter(a=>a.count>=3).sort((a,b)=>b.count-a.count||Math.hypot(a.u.x-base.x,a.u.y-base.y)-Math.hypot(b.u.x-base.x,b.u.y-base.y)||a.u.id-b.u.id);
  return aims[0]?apply(g,{method:'cast',x:aims[0].u.x,y:aims[0].u.y,decision:'visible-core-cluster'}):null;
 }
 function apply(g,a){let r;
  if(a.method==='build')r=g.build(a.type,a.x,g.map.lanes[a.lane]);
  else if(a.method==='citadel')r=g.buyCitadelOption(a.choice);
  else if(a.method==='cast')r=g.cast(a.x,a.y);
  else r=g.upgrade(a.id);
  const row={tick:g.tick,time:g.state.time,action:a,ok:r.ok,reason:r.reason??null,buildingId:r.building?.id??null};commands.push(row);return row;
 }
 return {commands,step(g){
  const end=evaluatePrototype(g);if(end.completed||end.failed||id==='idle'||g.tick<nextTick)return null;
  nextTick=g.tick+Math.round(DESIGN.cadenceSeconds/.05);
  let r=volley(g);if(r)return r;
  r=repair(g,true);if(r)return r;
  while(opening<OPENING.length&&present(g,OPENING[opening]))remember(OPENING[opening++]);
  if(opening<OPENING.length){const a=OPENING[opening];r=build(g,a,'initial-support');if(r.ok){remember(a);opening++;}return r;}
  if(def.choice!==null&&g.state.citadelOptions.sides[0].choice===null)return apply(g,{method:'citadel',choice:def.choice,decision:'after-initial-support'});
  r=repair(g,false);if(r)return r;
  while(followup<FOLLOWUP.length&&present(g,FOLLOWUP[followup]))remember(FOLLOWUP[followup++]);
  if(followup<FOLLOWUP.length){const a=FOLLOWUP[followup];r=build(g,a,'rear-development');if(r.ok){remember(a);followup++;}return r;}
  const eligible=g.state.buildings.filter(b=>b.side===0&&b.hp>0&&b.level<3&&g.buildings[b.type].unit&&g.upgradeCost(b)<=g.state.gold[0])
   .sort((a,b)=>a.level-b.level||order(g,a,b)||a.id-b.id);
  const b=eligible[0];return b?apply(g,{method:'upgrade',id:b.id,type:b.type,x:b.x,lane:b.lane,fromLevel:b.level,decision:'affordable-producer-upgrade'}):null;
 }};
}
