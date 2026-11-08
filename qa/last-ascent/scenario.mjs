/** Isolated finale authoring experiment. Imports the immutable released engine. */
import { Game, worldX } from '../../dist/engine.js';
import { deepFreeze, getRuleset } from '../../dist/rulesets.js';

export const LAST_ASCENT_RULESET = 'frontier-citadel-open';
export const DEFAULT_VARIANT = 'supply-road';
const p = (type, home, lane, level = 1) => ({type, home, lane, level});
const playerFormation = [
  p('barracks',550,0), p('barracks',550,1), p('barracks',550,2),
  p('archery',410,1), p('watchtower',690,0), p('watchtower',690,2), p('mint',270,1)
];
const enemyFormation = [
  p('barracks',1250,0,2), p('barracks',1250,1,2), p('barracks',1250,2,2),
  p('archery',1110,0), p('archery',1110,1), p('archery',1110,2),
  p('watchtower',970,0), p('foundry',970,1), p('watchtower',970,2),
  p('mint',270,0), p('mint',270,1), p('mint',270,2)
];
export const LAST_ASCENT_VARIANTS = deepFreeze({
  ramparts: {id:'ramparts',label:'Entrenched ramparts',difficulty:'hard',startingGold:[750,120],startingHealth:[3400,6000],playerFormation,enemyFormation},
  foothold: {id:'foothold',label:'Defensible foothold',difficulty:'normal',startingGold:[1050,120],startingHealth:[3800,6000],
    playerFormation:playerFormation.map(b=>({...b,home:b.type==='barracks'?690:b.type==='watchtower'?830:b.type==='archery'?550:b.home})),
    enemyFormation:enemyFormation.map(b=>({...b,level:1}))},
  'supply-road': {id:'supply-road',label:'Exposed supply road',difficulty:'normal',startingGold:[1050,120],startingHealth:[3800,6000],
    playerFormation:playerFormation.map(b=>({...b,home:b.type==='barracks'?690:b.type==='watchtower'?830:b.type==='archery'?550:b.home})),
    enemyFormation:enemyFormation.map(b=>({...b,level:1,home:b.lane===1&&b.type==='archery'?270:b.lane===1&&b.type==='mint'?1110:b.home}))}
});
function definition(variant) {
  if(!Object.hasOwn(LAST_ASCENT_VARIANTS,variant)) throw new RangeError(`Unknown Last Ascent variant: ${String(variant)}`);
  return LAST_ASCENT_VARIANTS[variant];
}
function costOf(item,rules) {
  const base=rules.buildings[item.type].cost;
  let invested=base;
  for(let level=1;level<item.level;level++) invested+=Math.round(base*(.7+.35*(level-1)));
  return invested;
}
export function describeLastAscent({variant=DEFAULT_VARIANT}={}) {
  const d=definition(variant),rules=getRuleset(LAST_ASCENT_RULESET);
  const formations=[d.playerFormation,d.enemyFormation].map((items,side)=>items.map(item=>({...item,side,x:side?3200-item.home:item.home,y:[260,450,640][item.lane],invested:costOf(item,rules)})));
  const startingInvestment=formations.map(items=>items.reduce((sum,item)=>sum+item.invested,0));
  const startingIncome=formations.map(items=>5+items.filter(b=>b.type==='mint').reduce((n,b)=>n+2.5*(1+.5*(b.level-1)),0));
  return {
    id:'last-ascent-local-prototype',revision:1,variant,label:d.label,mapId:'classic',rulesetId:LAST_ASCENT_RULESET,difficulty:d.difficulty,
    startingGold:[...d.startingGold],startingHealth:[...d.startingHealth],maxHealth:[6000,6000],startingInvestment,startingIncome,formations,
    briefing:(variant==='supply-road'?'The central enemy mine is forward, behind its barracks; its supporting archers begin farther back. The other two mines are in the rear. ':'')+'The company arrives battered below an entrenched garrison. Break its citadel while yours survives. The enemy starts with paid forward production, defenses and three real gold mines. You may sacrifice buildings and citadel health, or win by any effective route. Existing factories do not pay unit wages: destroying mines reduces later purchases, not every existing wave.',
    warning:'At 5:00 the existing engine accelerates production ×1.65, multiplies troop damage to structures ×1.75, and lowers citadel shots from 32 to 18. There is no forced citadel drain or mission deadline in this experiment. A test cap is a censored stall, not a loss.',
    setup:'Initial formations use ordinary build and upgrade calls from a temporary authoring bank, then the bank is replaced by the declared opening treasuries. Only initial player citadel HP is authored. No combat-state edits, hidden grants, stat multipliers, rubberbanding, required unit, or health-floor objective.',
    controls:'All eight building types, automatic flyers and the existing 190-gold citadel choices are available. Flyers choose targets automatically and do not accept flight orders.',
    scope:'Isolated local QA only. No campaign registration, progression, stars, profile writes, new ruleset or engine changes.'
  };
}
export function createLastAscent({variant=DEFAULT_VARIANT,seed=101}={}) {
  const d=definition(variant);
  if(!Number.isSafeInteger(seed)||seed<0||seed>0xffffffff) throw new RangeError('Seed must be an unsigned 32-bit integer.');
  const game=new Game({difficulty:d.difficulty,seed,ai:true,mapId:'classic',rulesetId:LAST_ASCENT_RULESET});
  const s=game.state;
  s.buildings=[];s.effects=[];s.stats.built=[0,0];s.gold=[10000,10000];
  for(const [side,formation] of [[0,d.playerFormation],[1,d.enemyFormation]]) {
    for(const item of formation) {
      const result=game.build(item.type,worldX(game.map,side,item.home),game.map.lanes[item.lane],side);
      if(!result.ok) throw new Error(`Invalid ${variant} formation: ${result.reason}`);
      for(let level=1;level<item.level;level++) if(!game.upgrade(result.building.id,side).ok) throw new Error('Invalid authored upgrade.');
    }
  }
  s.gold=[...d.startingGold];
  s.bases.forEach((base,side)=>{base.hp=d.startingHealth[side];});
  s.income=describeLastAscent({variant}).startingIncome;
  return game;
}
export function evaluateLastAscent(game) {
  const [player,enemy]=game.state.bases;
  if(player.hp<=0&&enemy.hp<=0) return 'draw';
  if(player.hp<=0) return 'lost';
  if(enemy.hp<=0) return 'won';
  return 'running';
}
