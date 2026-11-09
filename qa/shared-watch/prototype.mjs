/** QA-only hypothesis. No campaign, catalogue or released ruleset admission. */
import {Game} from '../../dist/engine.js';
import {deepFreeze,CITADEL_CAMPAIGN_RULESET_IDS} from '../../dist/rulesets.js';
import {actualIncome} from '../salt-stores/economy.mjs';
export const DESIGN=deepFreeze({
 id:'shared-watch-prototype',epoch:1,title:'The Shared Watch',status:'unreviewed-no-battles',
 baselineCommit:'e3ef4e160b6d223484820dbe102961ef7d31e39b',baselineTree:'9e764d661d2942af123ed0f65c277c2a728e06e6',
 numericStatus:'All encounter numbers below are new design hypotheses, not historical reconstruction or balance evidence.',
 rulesetId:CITADEL_CAMPAIGN_RULESET_IDS[2],mapId:'classic',difficulty:'normal',ai:true,
 seed:8405,timeLimit:600,startingGold:1100,enemyGold:100,startingHealth:6000,cadenceSeconds:5,
 playerBuildings:[['barracks',690,0],['barracks',830,1],['barracks',690,2],['archery',550,1],['mint',410,1]],
 enemyBuildings:[['barracks',1950,0],['sanctum',2230,0],['barracks',2090,1],['foundry',2370,1],['barracks',1950,2],['archery',2230,2],['mint',2790,1]],
});
export function createPrototype({seed=DESIGN.seed}={}){
 if(!Number.isSafeInteger(seed)||seed<0||seed>4294967295)throw new RangeError('Prototype seed must be uint32');
 const g=new Game({seed,difficulty:DESIGN.difficulty,ai:DESIGN.ai,mapId:DESIGN.mapId,rulesetId:DESIGN.rulesetId}),s=g.state;
 s.buildings=[];s.effects=[];s.stats.built=[0,0];s.gold=[10000,10000];
 for(const [side,formation] of [[0,DESIGN.playerBuildings],[1,DESIGN.enemyBuildings]])for(const [type,x,lane] of formation){
  const r=g.build(type,x,g.map.lanes[lane],side);if(!r.ok)throw Error('Illegal Shared Watch authoring: '+r.reason);
 }
 s.effects=[];s.gold=[DESIGN.startingGold,DESIGN.enemyGold];s.bases[0].hp=DESIGN.startingHealth;s.income=[0,1].map(side=>actualIncome(g,side));
 return g;
}
/** Local QA core/deadline contract, deliberately not an admitted campaign evaluator. */
export function evaluatePrototype(g){
 const s=g.state;
 if(s.bases[0].hp<=0||s.winner===1||s.winner==='draw')return {completed:false,failed:true,reason:'player-core'};
 if(s.bases[1].hp<=0||s.winner===0)return {completed:true,failed:false,reason:'enemy-core'};
 if(s.time>=DESIGN.timeLimit-1e-7)return {completed:false,failed:true,reason:'deadline'};
 return {completed:false,failed:false,reason:null};
}
const B=(type,x,lane)=>({method:'build',type,x,lane});
const common=[B('mint',410,0),B('mint',410,2),B('archery',830,0),B('sanctum',830,2),B('archery',550,2),B('foundry',1250,0),B('barracks',970,2),B('sanctum',970,1),B('archery',1110,2),B('wardenLodge',1110,1),B('foundry',1250,2)];
export const POLICIES=deepFreeze({
 'central-watch':{kind:'paid-plan',description:'Pay for the middle watch, then screened north siege, economy and sustained three-road support.',plan:[B('watchtower',1250,1),B('foundry',1110,0),B('archery',550,0),B('wardenLodge',970,0),...common]},
 'distributed-mobile':{kind:'paid-plan',description:'No watchtower. Buy northern archers and southern ground splash first, then screened north siege and sustained support.',plan:[B('archery',550,0),B('sanctum',830,2),B('foundry',1110,0),B('wardenLodge',970,0),...common.filter(x=>!(x.type==='sanctum'&&x.lane===2))]},
 'no-new-support-siege':{kind:'paid-plan',description:'Concentrated siege diagnostic: inherited infantry still screen; mass north siege without buying new screens or ranged support, then economy and siege upgrades.',plan:[B('foundry',1110,0),B('foundry',1250,0),B('foundry',970,0),B('foundry',830,0),B('mint',410,0),B('mint',410,2),B('foundry',550,0)]},
 'watch-only':{kind:'paid-plan',description:'Pay only for the central watch at tick zero; inherited factories continue but no active assault investment follows.',noUpgrades:true,plan:[B('watchtower',1250,1)]},
 idle:{kind:'idle',description:'No player commands. Inherited factories and normal paid enemy remain active.'},
 'north-watch-control':{kind:'replay',donor:'central-watch',description:'Replay donor purchases at exactly their original ticks; move its single 220-gold watch to north x1250.'},
 'omit-watch-control':{kind:'replay',donor:'central-watch',description:'Replay donor purchases at exactly their original ticks, omitting its watch. The saved 220 gold remains unspent.'},
 'central-archery-control':{kind:'replay',donor:'central-watch',description:'Replay donor purchases at exactly their original ticks, replacing the 220-gold watch with a normal 175-gold central archery; the 45 saving remains unspent. This is a cheaper-substitute test, not a matched-spend claim.'},
});
/** Own state only; one attempt per five seconds, including failed affordability attempts.
 * Plans retry the next unbuilt item until paid, never rebuild lost items, never sell,
 * cast or buy a citadel option. After the plan, upgrade surviving producers, not mines
 * or the watch: level, offensive type priority, north/middle/south, frontmost, then ID.
 * No hidden enemy treasury or RNG enters player decisions. */
export function createPolicy(id,{donorCommands=[]}={}){
 const def=POLICIES[id];if(!def)throw Error('Unknown policy');
 let nextTick=0,index=0,replayIndex=0;const applied=[],priority=['foundry','archery','sanctum','wardenLodge','barracks'];
 return {id,applied,step(g){
  if(evaluatePrototype(g).completed||evaluatePrototype(g).failed)return null;
  if(def.kind==='idle')return null;
  if(def.kind==='replay'){
   const command=donorCommands[replayIndex];if(!command||g.tick<command.tick)return null;
   if(g.tick!==command.tick)throw Error('Missed donor command tick');replayIndex++;
   let action={...command.action};
   if(action.type==='watchtower'){
    if(id==='omit-watch-control'){const row={tick:g.tick,time:g.state.time,action,omitted:true,ok:true};applied.push(row);return row;}
    if(id==='north-watch-control')action.lane=0;
    if(id==='central-archery-control')action.type='archery';
   }
   return apply(g,action);
  }
  if(g.tick<nextTick)return null;nextTick=g.tick+Math.round(DESIGN.cadenceSeconds/.05);
  if(index<def.plan.length){const row=apply(g,def.plan[index]);if(row.ok)index++;return row;}
  if(def.noUpgrades)return null;
  const eligible=g.state.buildings.filter(b=>b.side===0&&b.hp>0&&b.level<3&&priority.includes(b.type))
   .sort((a,b)=>a.level-b.level||priority.indexOf(a.type)-priority.indexOf(b.type)||a.lane-b.lane||b.x-a.x||a.id-b.id);
  const b=eligible[0];return b?apply(g,{method:'upgrade',type:b.type,x:b.x,lane:b.lane,fromLevel:b.level}):null;
 }};
 function apply(g,action){
  const a={...action};let r;
  if(a.method==='build')r=g.build(a.type,a.x,g.map.lanes[a.lane],0);
  else {const b=g.state.buildings.find(b=>b.side===0&&b.type===a.type&&b.x===a.x&&b.lane===a.lane&&b.level===a.fromLevel);r=b?g.upgrade(b.id,0):{ok:false,reason:'Donor upgrade target unavailable'};}
  const row={tick:g.tick,time:g.state.time,action:a,ok:r.ok,reason:r.reason??null,buildingId:r.building?.id??null};applied.push(row);return row;
 }
}
