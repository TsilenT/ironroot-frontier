/** Frozen paid hypotheses, not policies chosen from observed battle outcomes. */
import {deepFreeze} from '../../dist/rulesets.js';
const B=(type,x,lane)=>({method:'build',type,x,lane});
function supportedPlan(primary){
 const other=2-primary;
 return [
  B('archery',550,primary),       // Rear ranged support before siege.
  B('wardenLodge',830,primary),   // Ordinary screen; no healing or shielding buff.
  B('foundry',410,primary),       // Siege behind inherited barracks and paid support.
  B('mint',410,other),
  B('archery',550,other),         // Keep the opposite inherited road supported.
  B('sanctum',830,1),
  B('barracks',970,primary),
  B('foundry',270,primary),
  B('mint',270,other),
  B('archery',830,other),
  B('wardenLodge',970,1),
  B('archery',1110,primary),
  B('foundry',270,1),
 ];
}
export const CADENCE_TICKS=100;
export const UPGRADE_TYPES=deepFreeze(['foundry','archery','sanctum','wardenLodge','barracks']);
export const POLICIES=deepFreeze({
 'north-supported':{id:'north-supported',primaryLane:0,description:'Buy northern archers and a Warden screen before rear siege, then economy, opposite-road coverage and sustained northern pressure.',plan:supportedPlan(0)},
 'south-bypass':{id:'south-bypass',primaryLane:2,description:'Mirrored southern supported advance. The original northern command post remains optional; inherited north troops may still fight it.',plan:supportedPlan(2)},
 idle:{id:'idle',primaryLane:null,description:'No player commands. Inherited ordinary factories and paid adaptive enemy continue.',plan:[]},
});
export function createPolicy(id,saved=null){
 const def=POLICIES[id];if(!def)throw Error('Unknown baseline policy.');
 let index=0,nextTick=0;
 if(saved!==null){
  if(!saved||Object.getPrototypeOf(saved)!==Object.prototype||Object.keys(saved).sort().join(',')!=='id,index,nextTick'||saved.id!==id||!Number.isSafeInteger(saved.index)||saved.index<0||saved.index>def.plan.length||!Number.isSafeInteger(saved.nextTick)||saved.nextTick<0||saved.nextTick%CADENCE_TICKS)throw Error('Invalid baseline policy state.');
  index=saved.index;nextTick=saved.nextTick;
 }
 return {id,serialize:()=>({id,index,nextTick}),step(game){
  if(id==='idle'||game.tick<nextTick)return null;
  if(game.tick!==nextTick)throw Error('Missed five-second player decision boundary.');
  nextTick+=CADENCE_TICKS;
  let action;
  if(index<def.plan.length)action={...def.plan[index]};
  else{
   // Only own surviving producers; no enemy state, future RNG or repairs.
   // Lowest level, primary/middle/opposite road, type priority, rearward x, ID.
   const roads=[def.primaryLane,1,2-def.primaryLane],eligible=game.state.buildings.filter(b=>b.side===0&&b.hp>0&&b.level<3&&UPGRADE_TYPES.includes(b.type))
    .sort((a,b)=>a.level-b.level||roads.indexOf(a.lane)-roads.indexOf(b.lane)||UPGRADE_TYPES.indexOf(a.type)-UPGRADE_TYPES.indexOf(b.type)||a.x-b.x||a.id-b.id);
   const b=eligible[0];if(!b)return {tick:game.tick,time:game.state.time,action:null,ok:false,reason:'No surviving producer below level three.'};
   action={method:'upgrade',id:b.id,type:b.type,x:b.x,lane:b.lane,fromLevel:b.level};
  }
  const beforeGold=game.state.gold[0],result=action.method==='build'?game.build(action.type,action.x,game.map.lanes[action.lane],0):game.upgrade(action.id,0);
  if(result.ok&&index<def.plan.length)index++;
  return {tick:game.tick,time:game.state.time,action,ok:result.ok,reason:result.reason??null,beforeGold,afterGold:game.state.gold[0],buildingId:result.building?.id??null};
 }};
}
