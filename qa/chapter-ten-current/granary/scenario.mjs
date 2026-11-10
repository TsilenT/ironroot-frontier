/** RECONSTRUCTED from retained design history; not original source bytes. */
/** Private Chapter 10 lead-up. Native registered mechanics; no campaign admission. */
import {Game,worldX,getRuleset} from '../../../dist/engine.js';
import {advanceObjectiveBattle} from '../../../dist/objectives.js';
export const GRANARY=Object.freeze({id:'private-ch10-last-granary',revision:1,rulesetId:'frontier-campaign-citadel-open',mapId:'long-march',timeLimit:600,required:2});
const player=[["barracks", 1110, 1], ["barracks", 1110, 2], ["archery", 970, 1], ["watchtower", 830, 0], ["watchtower", 830, 2], ["mint", 410, 1]];
const enemy=[["barracks", 1250, 0], ["barracks", 1250, 1], ["barracks", 1250, 2], ["archery", 1110, 0], ["archery", 1110, 2], ["watchtower", 970, 1], ["foundry", 830, 1], ["mint", 410, 0], ["mint", 410, 2]];
function seedCheck(seed){if(!Number.isSafeInteger(seed)||seed<0||seed>0xffffffff)throw Error('Invalid granary seed');}
export function createGranary({seed=102}={}){
  seedCheck(seed);
  const game=new Game({rulesetId:GRANARY.rulesetId,difficulty:'hard',ai:true,mapId:'long-march',seed}),s=game.state;
  s.buildings=[];s.effects=[];s.stats.built=[0,0];s.gold=[10000,10000];
  const targets=[];
  for(const [side,formation]of [[0,player],[1,enemy]])for(const[type,home,lane]of formation){
    const r=game.build(type,worldX(game.map,side,home),game.map.lanes[lane],side);
    if(!r.ok)throw Error(`Invalid granary formation: ${r.reason}`);
    if(side===1&&type==='mint')targets.push(Object.freeze({id:r.building.id,type,side,x:r.building.x,y:r.building.y,lane,name:['North Supply Mine','Middle Supply Mine','South Supply Mine'][lane]}));
  }
  s.gold=[900, 200];s.income=[7.5, 10];s.bases[0].hp=4200;
  return {game,seed,targets:Object.freeze(targets)};
}
export function granaryTargets(encounter){return encounter.targets.map(t=>({...t,building:encounter.game.state.buildings.find(b=>b.id===t.id&&b.hp>0)??null}));}
export function evaluateGranary(encounter){
  const s=encounter.game.state,destroyed=granaryTargets(encounter).filter(t=>!t.building).length;
  let outcome='running',reason='Destroy the original mission targets, or the enemy citadel, by 10:00. Your citadel must survive.';
  if(s.bases.every(b=>b.hp<=0)){outcome='draw';reason='Both citadels fell.';}
  else if(s.bases[0].hp<=0){outcome='lost';reason='Your citadel fell.';}
  else if(s.time>GRANARY.timeLimit+1e-7){outcome='lost';reason='The breach came after the deadline.';}
  else if(s.bases[1].hp<=0||destroyed>=GRANARY.required){outcome='won';reason=s.bases[1].hp<=0?'Enemy citadel destroyed.':'Original mission targets destroyed.';}
  else if(s.time>=GRANARY.timeLimit-1e-7){outcome='lost';reason='No breach by 10:00.';}
  return {outcome,reason,destroyed,completed:outcome==='won',failed:outcome==='lost'||outcome==='draw'};
}
/** Stop after the first decisive native tick, including a goal on the deadline. */
export function advanceGranary(encounter,delta){return advanceObjectiveBattle(encounter.game,delta,()=>evaluateGranary(encounter),GRANARY.timeLimit);}
export function restartGranary(encounter){return createGranary({seed:encounter.seed});}
function fields(value,names){if(!value||Object.getPrototypeOf(value)!==Object.prototype||Object.keys(value).length!==names.length||names.some(k=>!Object.hasOwn(value,k)))throw Error('Invalid private granary envelope');}
export function serializeGranary(encounter){return {format:GRANARY.id,version:GRANARY.revision,seed:encounter.seed,game:encounter.game.serialize()};}
export function restoreGranary(value){
  fields(value,['format','version','seed','game']);
  if(value.format!==GRANARY.id||value.version!==GRANARY.revision)throw Error('Unknown private granary identity');
  const fresh=createGranary({seed:value.seed}),game=Game.restore(value.game),s=game.state;
  if(game.ruleset!==getRuleset(GRANARY.rulesetId)||game.map.id!=='long-march'||game.difficulty!=='hard'||!game.ai)throw Error('Wrong granary parent identity');
  if(s.time>GRANARY.timeLimit+1e-7||Math.abs(s.time-game.tick*.05)>1e-6||game.nextId<fresh.game.nextId)throw Error('Invalid granary clock or initial IDs');
  for(const t of fresh.targets){const b=[...s.buildings,...s.units].find(b=>b.id===t.id);if(b&&(b.type!==t.type||b.side!==t.side||b.x!==t.x||b.y!==t.y||b.lane!==t.lane))throw Error('Original granary target identity changed');}
  return {...fresh,game};
}
