/** Chapter 10 follow-up. Developer-only; never registered in the campaign. */
import {Game} from '../../dist/engine.js';
import {describeLastAscent} from '../last-ascent/scenario.mjs';

export const DOOMSDAY_VARIANTS=Object.freeze(['control-normal','doomsday-hard']);
export function describeDoomsday({variant='doomsday-hard'}={}) {
  if(!DOOMSDAY_VARIANTS.includes(variant))throw new RangeError(`Unknown doomsday variant: ${variant}`);
  const original=describeLastAscent({variant:'supply-road'});
  return {...original,id:'chapter-ten-doomsday-lab',revision:1,variant,
    label:variant==='doomsday-hard'?'Doomsday — Hard garrison':'Supply-road normal control',
    difficulty:variant==='doomsday-hard'?'hard':'normal',
    briefing:original.briefing+' The forward barracks protect the central supply mine; supported siege can break structures, while cheap production can contest several roads. These are options to investigate, not guaranteed recipes.',
    opponent:variant==='doomsday-hard'?'Existing Hard AI: up to three ordinary paid build actions each 3–6 seconds; responds to visible air and clustered troops. No damage, income or health bonus.':'Existing Normal AI: up to two ordinary paid build actions each 5–8 seconds.',
    scope:'Isolated Chapter 10 developer lab. No campaign entry, deadline, stars, progress or release changes.'};
}
export function createDoomsday({variant='doomsday-hard',seed=101}={}) {
  const d=describeDoomsday({variant});
  if(!Number.isSafeInteger(seed)||seed<0||seed>0xffffffff)throw new RangeError('Seed must be an unsigned 32-bit integer.');
  const game=new Game({difficulty:d.difficulty,seed,ai:true,mapId:d.mapId,rulesetId:d.rulesetId});
  const s=game.state;
  s.buildings=[];s.effects=[];s.stats.built=[0,0];s.gold=[10000,10000];
  for(const formation of d.formations)for(const item of formation){
    const result=game.build(item.type,item.x,item.y,item.side);
    if(!result.ok)throw new Error(`Invalid doomsday formation: ${result.reason}`);
    for(let level=1;level<item.level;level++)if(!game.upgrade(result.building.id,item.side).ok)throw new Error('Invalid doomsday upgrade.');
  }
  s.gold=[...d.startingGold];s.bases.forEach((base,side)=>{base.hp=d.startingHealth[side];});s.income=[...d.startingIncome];
  return game;
}
export {evaluateLastAscent as evaluateDoomsday} from '../last-ascent/scenario.mjs';
