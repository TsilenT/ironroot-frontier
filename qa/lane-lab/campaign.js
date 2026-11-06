/** Authored geography probes only. Never register mission IDs or award progress. */
import {CAMPAIGN_MISSIONS} from '../../dist/campaign.js';
import {Game, BUILDINGS} from './engine.js';

const definition=(id,sourceId,name,mapId,laneMap,hint)=>Object.freeze({id,sourceId,name,mapId,laneMap:Object.freeze(laneMap),hint,timeLimit:CAMPAIGN_MISSIONS.find(m=>m.id===sourceId).timeLimit});
export const PILOTS=Object.freeze([
  definition('first-road','emberwatch','Pilot 1 · First Road','single-road',[0,0,0],'One road: place a warrior screen ahead of archers. Break the marked barracks.'),
  definition('divided-front','three-roads','Pilot 2 · Divided Front','two-roads',[0,0,1],'Two roads: the original middle barracks and enemy archers move north. Destroy both roadblocks.'),
  definition('full-front','winter-stores','Pilot 3 · Full Front','three-roads',[0,1,2],'Three roads: protect the two original mines and reach 15 gold/sec at 2:30. Add a third mine and upgrades.'),
  definition('crosswind-air','wings-of-ash','Later probe · Crosswind Air','three-roads-crosswind',[0,1,2],'Outer flyers converge on the middle road after a two-second warning. Cover the destination with archers while attacking both outer aeries.')
]);

export function createPilot(id,{seed,mapId}={}) {
  const pilot=PILOTS.find(p=>p.id===id);
  if(!pilot)throw new Error('Unknown lane pilot: '+id);
  const source=CAMPAIGN_MISSIONS.find(m=>m.id===pilot.sourceId);
  const game=new Game({mapId:mapId||pilot.mapId,seed:seed??source.seed,difficulty:source.difficulty,ai:false});
  const s=game.state;s.buildings=[];s.effects=[];s.stats.built=[0,0];s.gold=[10000,10000];
  // Just as in the production campaign, these are explicit free authored forces.
  // Player purchases after setup always pay normal prices. No adaptive enemy.
  for(const [side,placements] of [[0,source.playerBuildings],[1,source.enemyBuildings]])for(const [type,x,lane,level=1] of placements) {
    const result=game.build(type,x,game.map.lanes[pilot.laneMap[lane]],side);
    if(!result.ok)throw new Error('Invalid pilot formation: '+result.reason);
    for(let l=1;l<level;l++)if(!game.upgrade(result.building.id,side).ok)throw new Error('Invalid pilot upgrade');
  }
  s.gold=[source.startingGold,source.enemyGold||0];s.bases[0].hp=source.startingHealth;
  const income=(g,side)=>5+g.state.buildings.filter(b=>b.side===side&&b.type==='mint').reduce((n,b)=>n+BUILDINGS.mint.income*(1+.5*(b.level-1)),0);
  s.income=[income(game,0),income(game,1)];
  const targets=source.objectives.flatMap(o=>o.type==='destroy'||o.type==='protect'?o.targets.map(t=>{
    const side=o.type==='destroy'?1:0,lane=pilot.laneMap[t.lane];
    const building=s.buildings.find(b=>b.side===side&&b.type===t.type&&b.x===t.x&&b.lane===lane);
    if(!building)throw new Error('Missing original pilot target');
    return Object.freeze({id:building.id,side,type:t.type,x:t.x,lane,kind:o.type});
  }):[]);
  const evaluate=g=>{
    const alive=t=>g.state.buildings.some(b=>b.id===t.id&&b.hp>0);
    const protectedLost=targets.some(t=>t.kind==='protect'&&!alive(t));
    const defeated=g.state.winner===1||g.state.winner==='draw'||g.state.bases[0].hp<=0;
    const atDeadline=g.state.time+1e-7>=source.timeLimit;
    const destroyed=targets.filter(t=>t.kind==='destroy'&&!alive(t)).length,total=targets.filter(t=>t.kind==='destroy').length;
    const requiredIncome=source.objectives.find(o=>o.type==='income')?.amount;
    const requirements=requiredIncome!==undefined?atDeadline&&income(g,0)>=requiredIncome:destroyed===total;
    const completed=!defeated&&!protectedLost&&(g.state.winner===0||requirements);
    const failed=defeated||protectedLost||(!completed&&atDeadline);
    const label=protectedLost?'An original protected mine was lost or salvaged.':defeated?'Your citadel fell.':completed?'Pilot objective complete.':failed?'Time expired.':requiredIncome!==undefined?`${income(g,0).toFixed(1)}/${requiredIncome} gold/sec at ${source.timeLimit}s; protect both original mines`:`${destroyed}/${total} marked targets destroyed`;
    return {completed,failed,label};
  };
  return {pilot,game,targets:Object.freeze(targets),evaluate};
}
