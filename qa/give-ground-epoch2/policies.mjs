/** Exactly two one-time middle attempts, then the unchanged epoch1 policy. */
import {deepFreeze} from '../../dist/rulesets.js';
import {createPolicy as originalPolicy,POLICIES as ORIGINAL} from '../give-ground/policies.mjs';
import {evaluatePrototype} from './scenario.mjs';
export const PREFIX=deepFreeze([{tick:0,type:'barracks',x:1110,lane:1},{tick:100,type:'archery',x:970,lane:1}]);
export const POLICIES=deepFreeze(Object.fromEntries(['rescue','front','rear'].map(id=>[id,{...ORIGINAL[id],prefix:PREFIX,startOriginalTick:200}])));
export function validatePolicyState(s){
 if(!s||Object.getPrototypeOf(s)!==Object.prototype||Object.keys(s).length!==4||s.epoch!==2||!Object.hasOwn(POLICIES,s.policyId)||!Number.isInteger(s.prefixIndex)||s.prefixIndex<0||s.prefixIndex>2)throw Error('Invalid epoch2 policy');
 originalPolicy(s.policyId,{state:s.baseState});
 if(s.baseState.nextTick<200||s.baseState.nextTick>12000||(s.prefixIndex<2&&s.baseState.nextTick!==200))throw Error('Invalid epoch2 phase');
 return s;
}
export function createPolicy(id,{state}={}){
 if(!Object.hasOwn(POLICIES,id))throw Error('Unknown epoch2 policy');
 const s=state===undefined?{epoch:2,policyId:id,prefixIndex:0,baseState:{nextTick:200}}:structuredClone(validatePolicyState(state));
 if(s.policyId!==id)throw Error('Cross-policy continuation');
 const base=originalPolicy(id,{state:s.baseState});
 return {id,snapshot:()=>({...structuredClone(s),baseState:base.snapshot()}),step(game){
  const o=evaluatePrototype(game);if(o.completed||o.failed)return null;
  if(s.prefixIndex<PREFIX.length){
   const p=PREFIX[s.prefixIndex];if(game.tick<p.tick)return null;
   if(game.tick!==p.tick)throw Error('Missed fixed middle-prefix tick');
   s.prefixIndex++;const before=game.state.gold[0],r=game.build(p.type,p.x,game.map.lanes[p.lane],0);
   return {tick:game.tick,time:game.state.time,method:'build',type:p.type,x:p.x,lane:p.lane,ok:r.ok,reason:r.reason??null,cost:before-game.state.gold[0]};
  }
  return base.step(game);
 }};
}
