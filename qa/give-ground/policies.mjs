import {deepFreeze} from '../../dist/rulesets.js';
import {DESIGN,evaluatePrototype,metadataFor} from './scenario.mjs';
const B=(type,x,lane)=>({type,x,lane});
const attack=[B('barracks',1250,2),B('sanctum',830,2),B('foundry',690,2),B('mint',410,2),B('archery',550,2)];
export const POLICIES=deepFreeze({rescue:{intent:'Support original north foundry; fund the same south attack.',plan:[B('barracks',1110,0),B('archery',970,0),...attack]},front:{intent:'Do not rescue north. After actual original loss replace at the same legal front site; continue south plan.',replacementX:1250,plan:attack},rear:{intent:'Identical to front except paid replacement is rearward at x410. No forced loss or sale.',replacementX:410,plan:attack},idle:{intent:'No purchases; diagnostic, not a required loser.',plan:[]}});
export function createPolicy(id,{state={nextTick:0}}={}){const def=POLICIES[id];if(!def)throw Error('Unknown policy');if(!state||Object.keys(state).length!==1||!Number.isSafeInteger(state.nextTick)||state.nextTick<0||state.nextTick%100!==0)throw Error('Invalid policy continuation');const progress={...state};return {id,snapshot:()=>({...progress}),step(game){
 const outcome=evaluatePrototype(game);if(outcome.completed||outcome.failed||game.tick<progress.nextTick||id==='idle')return null;progress.nextTick=game.tick+DESIGN.cadenceTicks;
 const own=game.state.buildings.filter(b=>b.side===0&&b.hp>0),originalAlive=own.some(b=>b.id===metadataFor(game).originalProducerId);
 const plan=[...(!originalAlive&&def.replacementX?[B('foundry',def.replacementX,0)]:[]),...def.plan];
 for(const item of plan){if(own.some(b=>Math.hypot(b.x-item.x,b.y-game.map.lanes[item.lane])<108))continue;const before=game.state.gold[0],r=game.build(item.type,item.x,game.map.lanes[item.lane],0);return {tick:game.tick,time:game.state.time,method:'build',...item,ok:r.ok,reason:r.reason??null,cost:before-game.state.gold[0]};}
 return null;
 }};}
