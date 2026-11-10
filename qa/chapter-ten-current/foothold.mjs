/** Private Chapter 10 lead-up. Native registered mechanics; no campaign admission. */
import {Game,worldX,getRuleset} from '../../dist/engine.js';
import {advanceObjectiveBattle} from '../../dist/objectives.js';
export const FOOTHOLD=Object.freeze({id:'private-ch10-wounded-foothold',revision:2,rulesetId:'frontier-campaign-citadel-open',timeLimit:600,required:2});
const player=[['barracks',690,0],['barracks',690,1],['barracks',690,2],['archery',550,1],['watchtower',830,0],['watchtower',830,2],['mint',270,1]];
// Revision 2's sole pacing correction: rear foundry at home 410 rather than
// 970. Native siege travels farther; no budget, stat or spawn-timer changes.
const enemy=[...Array.from({length:3},(_,lane)=>['barracks',1250,lane]),...Array.from({length:3},(_,lane)=>['archery',1110,lane]),['watchtower',970,0],['foundry',410,1],['watchtower',970,2],...Array.from({length:3},(_,lane)=>['mint',270,lane])];
function seedCheck(seed){if(!Number.isSafeInteger(seed)||seed<0||seed>0xffffffff)throw Error('Invalid foothold seed');}
export function createFoothold({seed=101}={}){
  seedCheck(seed);
  const game=new Game({rulesetId:FOOTHOLD.rulesetId,difficulty:'hard',ai:true,mapId:'classic',seed}),s=game.state;
  s.buildings=[];s.effects=[];s.stats.built=[0,0];s.gold=[10000,10000];
  const targets=[];
  for(const [side,formation]of [[0,player],[1,enemy]])for(const[type,home,lane]of formation){
    const r=game.build(type,worldX(game.map,side,home),game.map.lanes[lane],side);
    if(!r.ok)throw Error(`Invalid foothold formation: ${r.reason}`);
    if(side===1&&type==='barracks')targets.push(Object.freeze({id:r.building.id,type,side,x:r.building.x,y:r.building.y,lane,name:['North Breach Post','Middle Breach Post','South Breach Post'][lane]}));
  }
  s.gold=[900,200];s.income=[7.5,12.5];s.bases[0].hp=3600;
  return {game,seed,targets:Object.freeze(targets)};
}
export function footholdTargets(encounter){return encounter.targets.map(t=>({...t,building:encounter.game.state.buildings.find(b=>b.id===t.id&&b.hp>0)??null}));}
export function evaluateFoothold(encounter){
  const s=encounter.game.state,destroyed=footholdTargets(encounter).filter(t=>!t.building).length;
  let outcome='running',reason='Destroy any two original breach posts, or the enemy citadel, by 10:00. Your citadel must survive.';
  if(s.bases.every(b=>b.hp<=0)){outcome='draw';reason='Both citadels fell.';}
  else if(s.bases[0].hp<=0){outcome='lost';reason='Your citadel fell.';}
  else if(s.time>FOOTHOLD.timeLimit+1e-7){outcome='lost';reason='The breach came after the deadline.';}
  else if(s.bases[1].hp<=0||destroyed>=FOOTHOLD.required){outcome='won';reason=s.bases[1].hp<=0?'Enemy citadel destroyed.':'Two original breach posts destroyed.';}
  else if(s.time>=FOOTHOLD.timeLimit-1e-7){outcome='lost';reason='No breach by 10:00.';}
  return {outcome,reason,destroyed,completed:outcome==='won',failed:outcome==='lost'||outcome==='draw'};
}
/** Stop after the first decisive native tick, including a goal on the deadline. */
export function advanceFoothold(encounter,delta){return advanceObjectiveBattle(encounter.game,delta,()=>evaluateFoothold(encounter),FOOTHOLD.timeLimit);}
export function restartFoothold(encounter){return createFoothold({seed:encounter.seed});}
function fields(value,names){if(!value||Object.getPrototypeOf(value)!==Object.prototype||Object.keys(value).length!==names.length||names.some(k=>!Object.hasOwn(value,k)))throw Error('Invalid private foothold envelope');}
export function serializeFoothold(encounter){return {format:FOOTHOLD.id,version:FOOTHOLD.revision,seed:encounter.seed,game:encounter.game.serialize()};}
export function restoreFoothold(value){
  fields(value,['format','version','seed','game']);
  if(value.format!==FOOTHOLD.id||value.version!==FOOTHOLD.revision)throw Error('Unknown private foothold identity');
  const fresh=createFoothold({seed:value.seed}),game=Game.restore(value.game),s=game.state;
  if(game.ruleset!==getRuleset(FOOTHOLD.rulesetId)||game.map.id!=='classic'||game.difficulty!=='hard'||!game.ai)throw Error('Wrong foothold parent identity');
  if(s.time>FOOTHOLD.timeLimit+1e-7||Math.abs(s.time-game.tick*.05)>1e-6||game.nextId<fresh.game.nextId)throw Error('Invalid foothold clock or initial IDs');
  for(const t of fresh.targets){const b=[...s.buildings,...s.units].find(b=>b.id===t.id);if(b&&(b.type!==t.type||b.side!==t.side||b.x!==t.x||b.y!==t.y||b.lane!==t.lane))throw Error('Original foothold target identity changed');}
  return {...fresh,game};
}
