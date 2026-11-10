import {deepFreeze} from '../../dist/rulesets.js';
import {DESIGN,evaluatePrototype} from './scenario.mjs';
const B=(type,x,lane,once=false)=>({type,x,lane,once});
const mines=[B('mint',410,0),B('mint',410,2)];
const middle=[B('barracks',1250,1),B('foundry',830,1),B('sanctum',690,1),B('archery',550,1)];
export const POLICIES=deepFreeze({
 'paid-three-road':{
  intent:'Outcome-informed fixed order: start the southern screen, reinforce north/middle before remaining southern support and siege, then buy each mine once. Rebuild lost ordinary combat sites.',
  plan:[B('barracks',1250,2),B('barracks',1250,0),B('barracks',1250,1),B('foundry',830,0),B('foundry',830,1),B('archery',1110,2),B('sanctum',970,2),B('foundry',830,2),B('mint',410,0,true),B('mint',410,2,true)],
 },
 'screened-middle-core':{
  intent:'Concentrate on middle citadel pressure. Siege sits behind the inherited warrior/archer screen and a new front barracks, never unsupported at the front.',
  plan:[...middle,...mines,B('foundry',270,1),B('barracks',1250,0),B('sanctum',830,0)],
 },
 'two-roads-cheap-third':{
  intent:'Buy one southern barracks once, then commit to north/middle support and siege. Do not replace or add further southern factories. This is the cheaper-coverage comparison, not a required loser.',
  plan:[B('barracks',1250,2,true),B('sanctum',830,0),...middle,...mines,B('foundry',690,0)],
 },
});
export const UPGRADE_PRIORITY=Object.freeze(['foundry','archery','sanctum','barracks']);
/** Own living assets only. One attempted command every five simulated seconds.
 * Missing planned sites are rebuilt, except explicitly one-purchase items.
 * An occupied planned site is skipped, never sold. Unaﬀordable items wait.
 * After sites, upgrade lowest level, type priority, lane, frontmost x, then ID.
 * No spells, citadel purchase, direct troop orders or enemy treasury reads. */
export function createPolicy(id,{state={nextTick:0,onceCompleted:[]}}={}){
 const def=POLICIES[id];if(!def)throw Error('Unknown policy');
 const progress=structuredClone(state);
 if(!Number.isSafeInteger(progress.nextTick)||progress.nextTick<0||!Array.isArray(progress.onceCompleted)||progress.onceCompleted.some(i=>!Number.isInteger(i)||!def.plan[i]?.once))throw Error('Invalid policy continuation');
 return {id,snapshot:()=>structuredClone(progress),step(game){
  const outcome=evaluatePrototype(game);if(outcome.completed||outcome.failed||game.tick<progress.nextTick)return null;
  progress.nextTick=game.tick+DESIGN.cadenceTicks;
  const own=game.state.buildings.filter(b=>b.side===0&&b.hp>0);
  for(const [index,item] of def.plan.entries()){
   if(item.once&&progress.onceCompleted.includes(index))continue;
   if(own.some(b=>Math.hypot(b.x-item.x,b.y-game.map.lanes[item.lane])<108))continue;
   const before=game.state.gold[0],result=game.build(item.type,item.x,game.map.lanes[item.lane],0);
   if(result.ok&&item.once)progress.onceCompleted.push(index);
   return {tick:game.tick,time:game.state.time,method:'build',...item,ok:result.ok,reason:result.reason??null,cost:before-game.state.gold[0]};
  }
  const eligible=own.filter(b=>b.level<3&&UPGRADE_PRIORITY.includes(b.type)&&!(id==='two-roads-cheap-third'&&b.lane===2)).sort((a,b)=>a.level-b.level||UPGRADE_PRIORITY.indexOf(a.type)-UPGRADE_PRIORITY.indexOf(b.type)||a.lane-b.lane||b.x-a.x||a.id-b.id);
  if(!eligible[0])return null;
  const b=eligible[0],before=game.state.gold[0],result=game.upgrade(b.id,0);
  return {tick:game.tick,time:game.state.time,method:'upgrade',type:b.type,x:b.x,lane:b.lane,ok:result.ok,reason:result.reason??null,cost:before-game.state.gold[0]};
 }};
}
