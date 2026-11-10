/** RECONSTRUCTED from retained design history; not original source bytes. */
/** Private Chapter 10 lead-up. Native registered mechanics; no campaign admission. */
import {Game,worldX,getRuleset} from './engine.js';
import {advanceObjectiveBattle} from './objectives.js';
export const CROSSING=Object.freeze({id:'private-ch10-carry-the-crossing',revision:1,rulesetId:'frontier-qa-ch10-crossing',mapId:'twin-span',timeLimit:600,seconds:60});
const player=[["barracks", 1110, 0], ["barracks", 1110, 1], ["archery", 970, 0], ["archery", 970, 1], ["mint", 410, 1]];
const enemy=[["barracks", 1250, 0], ["barracks", 1250, 1], ["archery", 1110, 0], ["archery", 1110, 1], ["foundry", 830, 0], ["sanctum", 830, 1], ["mint", 410, 1]];
function seedCheck(seed){if(!Number.isSafeInteger(seed)||seed<0||seed>0xffffffff)throw Error('Invalid crossing seed');}
export function createCrossing({seed=104}={}){
  seedCheck(seed);
  const game=new Game({rulesetId:CROSSING.rulesetId,difficulty:'hard',ai:true,mapId:'twin-span',seed}),s=game.state;
  s.buildings=[];s.effects=[];s.stats.built=[0,0];s.gold=[10000,10000];
  const targets=[];
  for(const [side,formation]of [[0,player],[1,enemy]])for(const[type,home,lane]of formation){
    const r=game.build(type,worldX(game.map,side,home),game.map.lanes[lane],side);
    if(!r.ok)throw Error(`Invalid crossing formation: ${r.reason}`);
    if(side===1&&type==='mint')targets.push(Object.freeze({id:r.building.id,type,side,x:r.building.x,y:r.building.y,lane,name:['North Supply Mine','Middle Supply Mine','South Supply Mine'][lane]}));
  }
  s.gold=[1000, 160];s.income=[7.5, 7.5];s.bases[0].hp=4200;
  return {game,seed,targets:Object.freeze(targets)};
}
export function crossingTargets(encounter){return encounter.targets.map(t=>({...t,building:encounter.game.state.buildings.find(b=>b.id===t.id&&b.hp>0)??null}));}
export function evaluateCrossing(encounter){
  const s=encounter.game.state,destroyed=crossingTargets(encounter).filter(t=>!t.building).length;
  let outcome='running';
  if(s.bases.every(b=>b.hp<=0))outcome='draw';
  else if(s.bases[0].hp<=0||s.time>600+1e-7)outcome='lost';
  else if(s.bases[1].hp<=0||s.campaignControl.heldSeconds>=60)outcome='won';
  else if(s.time>=600-1e-7)outcome='lost';
  return {outcome,reason:'Hold both clear crossings for 60 cumulative seconds, or destroy the enemy citadel, by 10:00.',completed:outcome==='won',failed:outcome==='lost'||outcome==='draw'};
}
/** Stop after the first decisive native tick, including a goal on the deadline. */
export function advanceCrossing(encounter,delta){return advanceObjectiveBattle(encounter.game,delta,()=>evaluateCrossing(encounter),CROSSING.timeLimit);}
export function restartCrossing(encounter){return createCrossing({seed:encounter.seed});}
function fields(value,names){if(!value||Object.getPrototypeOf(value)!==Object.prototype||Object.keys(value).length!==names.length||names.some(k=>!Object.hasOwn(value,k)))throw Error('Invalid private crossing envelope');}
export function serializeCrossing(encounter){return {format:CROSSING.id,version:CROSSING.revision,seed:encounter.seed,game:encounter.game.serialize()};}
export function restoreCrossing(value){
  fields(value,['format','version','seed','game']);
  if(value.format!==CROSSING.id||value.version!==CROSSING.revision)throw Error('Unknown private crossing identity');
  const fresh=createCrossing({seed:value.seed}),game=Game.restore(value.game),s=game.state;
  if(game.ruleset!==getRuleset(CROSSING.rulesetId)||game.map.id!=='twin-span'||game.difficulty!=='hard'||!game.ai)throw Error('Wrong crossing parent identity');
  if(s.time>CROSSING.timeLimit+1e-7||Math.abs(s.time-game.tick*.05)>1e-6||game.nextId<fresh.game.nextId)throw Error('Invalid crossing clock or initial IDs');
  for(const t of fresh.targets){const b=[...s.buildings,...s.units].find(b=>b.id===t.id);if(b&&(b.type!==t.type||b.side!==t.side||b.x!==t.x||b.y!==t.y||b.lane!==t.lane))throw Error('Original crossing target identity changed');}
  return {...fresh,game};
}
