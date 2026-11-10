/** RECONSTRUCTED from retained design history; not original source bytes. */
import {createFog,refreshFog,observe} from '../../../dist/fog.js';
/** Private Chapter 10 lead-up. Native registered mechanics; no campaign admission. */
import {Game,worldX,getRuleset} from '../../../dist/engine.js';
import {advanceObjectiveBattle} from '../../../dist/objectives.js';
export const NO_FIRES=Object.freeze({id:'private-ch10-no-fires-tonight',revision:1,rulesetId:'frontier-campaign-lanterns',mapId:'classic',timeLimit:600,required:1});
const player=[["barracks", 1110, 1], ["barracks", 1110, 2], ["archery", 970, 1], ["watchtower", 830, 0], ["watchtower", 830, 2], ["mint", 410, 1]];
const enemy=[["watchtower", 970, 0], ["barracks", 1250, 0], ["archery", 1110, 0], ["barracks", 1250, 1], ["sanctum", 970, 1], ["barracks", 1110, 2], ["archery", 970, 2], ["mint", 410, 1]];
function seedCheck(seed){if(!Number.isSafeInteger(seed)||seed<0||seed>0xffffffff)throw Error('Invalid night seed');}
export function createNight({seed=103}={}){
  seedCheck(seed);
  const game=new Game({rulesetId:NO_FIRES.rulesetId,difficulty:'hard',ai:true,mapId:'classic',seed}),s=game.state;
  s.buildings=[];s.effects=[];s.stats.built=[0,0];s.gold=[10000,10000];
  const targets=[];
  for(const [side,formation]of [[0,player],[1,enemy]])for(const[type,home,lane]of formation){
    const r=game.build(type,worldX(game.map,side,home),game.map.lanes[lane],side);
    if(!r.ok)throw Error(`Invalid night formation: ${r.reason}`);
    if(side===1&&type==='watchtower')targets.push(Object.freeze({id:r.building.id,type,side,x:r.building.x,y:r.building.y,lane,name:['North Command Post','Middle Command Post','South Command Post'][lane]}));
  }
  s.gold=[900, 140];s.income=[7.5, 7.5];s.bases[0].hp=4200;
  s.effects=[];s.projectiles=[];s.fog=createFog();refreshFog(game);
  return {game,seed,targets:Object.freeze(targets)};
}
export function nightTargets(encounter){return encounter.targets.map(t=>({...t,building:encounter.game.state.buildings.find(b=>b.id===t.id&&b.hp>0)??null}));}
export function evaluateNight(encounter){
  const s=encounter.game.state,destroyed=nightTargets(encounter).filter(t=>!t.building).length;
  let outcome='running',reason='Destroy the original mission targets, or the enemy citadel, by 10:00. Your citadel must survive.';
  if(s.bases.every(b=>b.hp<=0)){outcome='draw';reason='Both citadels fell.';}
  else if(s.bases[0].hp<=0){outcome='lost';reason='Your citadel fell.';}
  else if(s.time>NO_FIRES.timeLimit+1e-7){outcome='lost';reason='The breach came after the deadline.';}
  else if(s.bases[1].hp<=0||destroyed>=NO_FIRES.required){outcome='won';reason=s.bases[1].hp<=0?'Enemy citadel destroyed.':'Original mission targets destroyed.';}
  else if(s.time>=NO_FIRES.timeLimit-1e-7){outcome='lost';reason='No breach by 10:00.';}
  return {outcome,reason,destroyed,completed:outcome==='won',failed:outcome==='lost'||outcome==='draw'};
}
/** Stop after the first decisive native tick, including a goal on the deadline. */
export function advanceNight(encounter,delta){return advanceObjectiveBattle(encounter.game,delta,()=>evaluateNight(encounter),NO_FIRES.timeLimit);}
export function restartNight(encounter){return createNight({seed:encounter.seed});}
function fields(value,names){if(!value||Object.getPrototypeOf(value)!==Object.prototype||Object.keys(value).length!==names.length||names.some(k=>!Object.hasOwn(value,k)))throw Error('Invalid private night envelope');}
export function serializeNight(encounter){return {format:NO_FIRES.id,version:NO_FIRES.revision,seed:encounter.seed,game:encounter.game.serialize()};}
export function restoreNight(value){
  fields(value,['format','version','seed','game']);
  if(value.format!==NO_FIRES.id||value.version!==NO_FIRES.revision)throw Error('Unknown private night identity');
  const fresh=createNight({seed:value.seed}),game=Game.restore(value.game),s=game.state;
  if(game.ruleset!==getRuleset(NO_FIRES.rulesetId)||game.map.id!=='classic'||game.difficulty!=='hard'||!game.ai)throw Error('Wrong night parent identity');
  if(s.time>NO_FIRES.timeLimit+1e-7||Math.abs(s.time-game.tick*.05)>1e-6||game.nextId<fresh.game.nextId)throw Error('Invalid night clock or initial IDs');
  for(const t of fresh.targets){const b=[...s.buildings,...s.units].find(b=>b.id===t.id);if(b&&(b.type!==t.type||b.side!==t.side||b.x!==t.x||b.y!==t.y||b.lane!==t.lane))throw Error('Original night target identity changed');}
  return {...fresh,game};
}

export function chartedNightTargets(e){return e.targets.map(({name,type,x,y,lane})=>({name,type,x,y,lane}));}
export function observeNight(e,side=0){return observe(e.game,side);}
