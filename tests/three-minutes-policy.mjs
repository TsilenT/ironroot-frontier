/** One ordinary paid defensive route on the authored opening; not a balance sweep. */
export function defensivePolicy(){
 let nextTick=0;
 const additions=[['archery',830,1],['wardenLodge',830,0],['foundry',690,1],['wardenLodge',550,1],['archery',690,0]];
 return game=>{
  if(game.tick<nextTick)return null;nextTick=game.tick+100;
  const own=game.state.buildings.filter(b=>b.side===0&&b.hp>0),gold=game.state.gold[0];
  const north=own.find(b=>b.type==='archery'&&b.x===970&&b.lane===0);
  if(north&&north.level===1&&gold>=game.upgradeCost(north)){const r=game.upgrade(north.id,0);return {action:'upgrade',id:north.id,...r};}
  for(const [type,x,lane]of additions){if(own.some(b=>b.x===x&&b.lane===lane))continue;if(gold<game.buildings[type].cost)return null;return {action:'build',type,x,lane,...game.build(type,x,game.map.lanes[lane],0)};}
  if(!game.state.citadelOptions.sides[0].choice&&gold>=190)return {action:'citadel',...game.buyCitadelOption('regen',0)};
  const upgrade=own.filter(b=>game.buildings[b.type].unit&&b.level<3).sort((a,b)=>a.level-b.level||a.id-b.id).find(b=>gold>=game.upgradeCost(b));
  return upgrade?{action:'upgrade',id:upgrade.id,...game.upgrade(upgrade.id,0)}:null;
 };
}

/** Rear ranged support and ground screens, without adding a foundry push. */
export function survivalPolicy(){
 let nextTick=0;
 const sites=[['archery',550,1],['wardenLodge',690,1],['archery',410,0],['watchtower',830,0],['watchtower',830,1]];
 return game=>{
  if(game.tick<nextTick)return null;nextTick=game.tick+100;
  const own=game.state.buildings.filter(b=>b.side===0&&b.hp>0),gold=game.state.gold[0];
  if(gold>=75&&game.state.spellCooldown[0]===0){
   const threats=game.state.units.filter(u=>u.side===1&&u.hp>0&&u.x<1000);
   const target=threats.map(u=>({u,count:threats.filter(v=>Math.hypot(v.x-u.x,v.y-u.y)<game.ruleset.spell.radius).length})).sort((a,b)=>b.count-a.count||a.u.x-b.u.x)[0];
   if(target?.count>=3)return {action:'volley',...game.cast(target.u.x,target.u.y,0)};
  }
  for(const [type,x,lane]of sites){if(own.some(b=>b.x===x&&b.lane===lane))continue;return gold>=game.buildings[type].cost?{action:'build',type,x,lane,...game.build(type,x,game.map.lanes[lane],0)}:null;}
  if(!game.state.citadelOptions.sides[0].choice)return gold>=190?{action:'citadel',...game.buyCitadelOption('regen',0)}:null;
  const tower=own.filter(b=>b.type==='watchtower'&&b.level<3).sort((a,b)=>a.level-b.level||a.lane-b.lane)[0];
  return tower&&gold>=game.upgradeCost(tower)?{action:'upgrade',id:tower.id,...game.upgrade(tower.id,0)}:null;
 };
}
