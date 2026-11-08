/** Bounded deterministic CPU fixtures. Synthetic states, not balance/playthrough evidence. */
import {Game as CurrentGame} from '../../dist/engine.js';
import * as CurrentFog from '../../dist/fog.js';
import {Game as Phase1Game} from '../fixtures/fog-phase1/engine.js';
import * as Phase1Fog from '../fixtures/fog-phase1/fog.js';
import {Game as ReleasedGame} from '../fixtures/fog-baseline/engine.js';
export const versions={phase1:{Game:Phase1Game,fog:Phase1Fog,rulesetId:Phase1Fog.FOG_RULESET_ID},current:{Game:CurrentGame,fog:CurrentFog,rulesetId:CurrentFog.FOG_RULESET_ID},released:{Game:ReleasedGame,fog:Phase1Fog,rulesetId:'frontier-citadel-open'}};
const spawnTypes=['barracks','archery','foundry','sanctum','aerie','wardenLodge'];
export function fixture(name,version='current',seed=57){
 const v=versions[version],g=new v.Game({rulesetId:v.rulesetId,ai:false,seed});g.state.buildings=[];g.state.units=[];g.state.effects=[];g.state.projectiles=[];g.state.time=120;g.tick=2400;g.state.gold=[4000,4000];
 const crowded=name!=='sparse',combat=name==='crowded_combat';
 for(const side of [0,1]){
  const cols=crowded?[270,410,550,690,830,970,1110,1250]:[410];
  for(const [lane,y] of g.map.lanes.entries())for(const [i,x] of cols.entries()){const b=g._place(i===7?'watchtower':spawnTypes[(i+lane)%spawnTypes.length],side?3200-x:x,y,side);b.progress=0;}
  for(let i=0;i<(crowded?70:6);i++){
   const lane=i%3,x=combat?(side?1660:1540)+(Math.floor(i/3)%5-2)*17:(side?2700:500)+(Math.floor(i/3)%5-2)*17;
   g._spawn({type:spawnTypes[i%spawnTypes.length],side,x,y:g.map.lanes[lane],lane,level:1});
   Object.assign(g.state.units.at(-1),{x,y:g.map.lanes[lane]+(i%5-2)*3,lane,cooldown:combat?0:10});
  }
 }
 g.state.effects=[];
 for(let i=0;i<(crowded?256:8);i++){const side=i%2;g._effect(side?3090:110,450,'build',side,.7);}
 if(v.fog.supportsFog(g.ruleset))v.fog.refreshFog(g);
 return g;
}
export function counts(g){return {units:g.state.units.length,buildings:g.state.buildings.length,effects:g.state.effects.length,projectiles:g.state.projectiles.length};}
export const digestValue=g=>JSON.stringify(g.serialize());
