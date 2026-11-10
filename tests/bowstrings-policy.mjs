/** Ordinary paid outer demolition support, one action at most every five seconds. */
export function demolitionPolicy(){
 let nextTick=0;
 const sites=[['barracks',1250,0],['barracks',1250,2],['archery',970,0],['archery',970,2],['foundry',830,0],['foundry',830,2]];
 return g=>{
  if(g.tick<nextTick)return null;nextTick=g.tick+100;
  const own=g.state.buildings.filter(b=>b.side===0&&b.hp>0),gold=g.state.gold[0];
  if(gold>=g.ruleset.spell.cost&&g.state.spellCooldown[0]===0){
   const archers=g.state.units.filter(u=>u.side===1&&u.hp>0&&u.type==='archer'&&[0,2].includes(u.lane));
   const target=archers.map(u=>({u,count:archers.filter(v=>Math.hypot(v.x-u.x,v.y-u.y)<g.ruleset.spell.radius).length})).sort((a,b)=>b.count-a.count||a.u.id-b.u.id)[0];
   if(target?.count>=2)return {action:'volley',...g.cast(target.u.x,target.u.y,0)};
  }
  for(const [type,x,lane]of sites){if(own.some(b=>b.x===x&&b.lane===lane))continue;return gold>=g.buildings[type].cost?{action:'build',type,x,lane,...g.build(type,x,g.map.lanes[lane],0)}:null;}
  const upgrade=own.filter(b=>b.type==='foundry'&&b.level<3).sort((a,b)=>a.level-b.level||a.lane-b.lane)[0];
  return upgrade&&gold>=g.upgradeCost(upgrade)?{action:'upgrade',id:upgrade.id,...g.upgrade(upgrade.id,0)}:null;
 };
}
