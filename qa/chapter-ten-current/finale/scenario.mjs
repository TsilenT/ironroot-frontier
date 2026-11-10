import {COLOSSUS_IDS,colossusOutcome} from './colossus.js';
/** RECONSTRUCTED from retained design history; not original source bytes. */
/** Private Chapter 10 lead-up. Native registered mechanics; no campaign admission. */
import {Game,worldX,getRuleset} from './engine.js';
import {advanceObjectiveBattle} from './objectives.js';
export const FINALE=Object.freeze({id:'private-ch10-the-last-engine',revision:1,rulesetId:COLOSSUS_IDS[0],mapId:'classic',timeLimit:Infinity,seconds:60});
const player=[["barracks", 830, 0], ["barracks", 830, 1], ["barracks", 830, 2], ["archery", 690, 0], ["archery", 690, 1], ["archery", 690, 2], ["watchtower", 970, 1], ["mint", 410, 1]];
const enemy=[["barracks", 1250, 0], ["barracks", 1250, 1], ["barracks", 1250, 2], ["archery", 1110, 0], ["archery", 1110, 1], ["archery", 1110, 2], ["watchtower", 970, 0], ["watchtower", 970, 2], ["sanctum", 970, 1], ["foundry", 830, 0], ["foundry", 830, 2], ["aerie", 830, 1], ["mint", 410, 0], ["mint", 410, 1], ["mint", 410, 2]];
function seedCheck(seed){if(!Number.isSafeInteger(seed)||seed<0||seed>0xffffffff)throw Error('Invalid finale seed');}
export function createFinale({seed=105}={}){
  seedCheck(seed);
  const game=new Game({rulesetId:FINALE.rulesetId,difficulty:'hard',ai:true,mapId:'classic',seed}),s=game.state;
  s.buildings=[];s.effects=[];s.stats.built=[0,0];s.gold=[10000,10000];
  const targets=[];
  for(const [side,formation]of [[0,player],[1,enemy]])for(const[type,home,lane]of formation){
    const r=game.build(type,worldX(game.map,side,home),game.map.lanes[lane],side);
    if(!r.ok)throw Error(`Invalid finale formation: ${r.reason}`);
    if(side===1&&type==='mint')targets.push(Object.freeze({id:r.building.id,type,side,x:r.building.x,y:r.building.y,lane,name:['North Supply Mine','Middle Supply Mine','South Supply Mine'][lane]}));
  }
  s.gold=[1000, 160];s.income=[7.5, 12.5];s.bases[0].hp=4200;
  return {game,seed,targets:Object.freeze(targets)};
}
export function finaleTargets(encounter){return encounter.targets.map(t=>({...t,building:encounter.game.state.buildings.find(b=>b.id===t.id&&b.hp>0)??null}));}
export function evaluateFinale(encounter){
  const s=encounter.game.state,destroyed=finaleTargets(encounter).filter(t=>!t.building).length;
  const winner=colossusOutcome(encounter.game),outcome=winner===0?'won':winner===1?'lost':winner==='draw'?'draw':'running';
  return {outcome,reason:'Destroy the enemy citadel and Last Engine while your citadel survives.',completed:outcome==='won',failed:outcome==='lost'||outcome==='draw'};
}
/** Stop after the first decisive native tick, including a goal on the deadline. */
export function advanceFinale(encounter,delta){return advanceObjectiveBattle(encounter.game,delta,()=>evaluateFinale(encounter),FINALE.timeLimit);}
export function restartFinale(encounter){return createFinale({seed:encounter.seed});}
function fields(value,names){if(!value||Object.getPrototypeOf(value)!==Object.prototype||Object.keys(value).length!==names.length||names.some(k=>!Object.hasOwn(value,k)))throw Error('Invalid private finale envelope');}
export function serializeFinale(encounter){return {format:FINALE.id,version:FINALE.revision,seed:encounter.seed,game:encounter.game.serialize()};}
export function restoreFinale(value){
  fields(value,['format','version','seed','game']);
  if(value.format!==FINALE.id||value.version!==FINALE.revision)throw Error('Unknown private finale identity');
  const fresh=createFinale({seed:value.seed}),game=Game.restore(value.game),s=game.state;
  if(game.ruleset!==getRuleset(FINALE.rulesetId)||game.map.id!=='classic'||game.difficulty!=='hard'||!game.ai)throw Error('Wrong finale parent identity');
  if(s.time>FINALE.timeLimit+1e-7||Math.abs(s.time-game.tick*.05)>1e-6||game.nextId<fresh.game.nextId)throw Error('Invalid finale clock or initial IDs');
  for(const t of fresh.targets){const b=[...s.buildings,...s.units].find(b=>b.id===t.id);if(b&&(b.type!==t.type||b.side!==t.side||b.x!==t.x||b.y!==t.y||b.lane!==t.lane))throw Error('Original finale target identity changed');}
  return {...fresh,game};
}

export const FINALE_STORY=Object.freeze({speaker:'Captain Rowan',introduction:'This is the last fortress. The foundry behind its citadel is awake. Break the fortress, but keep the rear camps producing: the weapon inside is large enough to sweep away the company at the gates.',deploymentCue:'The Last Engine is moving. All roads can fire on its body. Keep the camps producing.',victory:'The Last Engine falls silent. Across the roads behind them, the company lights the watchfires again.'});
export const FINALE_BRIEFING=Object.freeze([
 'Destroy the enemy citadel AND the Last Engine while your own citadel survives at any HP. No forced drain or extra deadline.',
 'Hard AI starts with three mines and 12.5 income against your 7.5. You start with 1000 gold and 4200/6000 HP; the full roster and citadel choices remain available.',
 'At enemy citadel HP 600 or less, including a lethal hit, one authored 10000-HP Engine appears. Its single 310-radius pulse destroys player troops, including flyers, near the citadel. Remote troops and all buildings remain. No clamp or invulnerability.',
 'Three-second damageable emergence, physical body reachable from all three roads, unstoppable middle-road march. Rear production replaces losses. This authored weapon is not a treasury purchase.',
 'A destroyed enemy citadel cannot shoot, heal or buy. Existing factories still spawn; both citadel and boss must be destroyed.',
 'Ordinary five-minute escalation remains: 1.65 production, 1.75 structure damage, and 32 to 18 citadel damage. No forced weakened finish.'
]);
