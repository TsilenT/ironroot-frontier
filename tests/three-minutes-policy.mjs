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
  if(!game.state.citadelOptions.sides[0].choice&&gold>=190)return {action:'citadel',...game.buyCitadelOption('regeneration',0)};
  const upgrade=own.filter(b=>game.buildings[b.type].unit&&b.level<3).sort((a,b)=>a.level-b.level||a.id-b.id).find(b=>gold>=game.upgradeCost(b));
  return upgrade?{action:'upgrade',id:upgrade.id,...game.upgrade(upgrade.id,0)}:null;
 };
}

/** Rear towers and ordinary citadel regeneration: hold, rather than add a siege push. */
export function survivalPolicy(){
 let nextTick=0;
 const sites=[[830,0],[830,1],[550,0],[550,1]];
 return game=>{
  if(game.tick<nextTick)return null;nextTick=game.tick+100;
  const own=game.state.buildings.filter(b=>b.side===0&&b.hp>0),gold=game.state.gold[0];
  for(const [x,lane]of sites.slice(0,2))if(!own.some(b=>b.x===x&&b.lane===lane))return gold>=220?{action:'build',type:'watchtower',x,lane,...game.build('watchtower',x,game.map.lanes[lane],0)}:null;
  if(!game.state.citadelOptions.sides[0].choice)return gold>=190?{action:'citadel',...game.buyCitadelOption('regeneration',0)}:null;
  const front=own.filter(b=>b.type==='watchtower'&&b.x===830&&b.level<3).sort((a,b)=>a.level-b.level||a.lane-b.lane)[0];
  if(front)return gold>=game.upgradeCost(front)?{action:'upgrade',id:front.id,...game.upgrade(front.id,0)}:null;
  for(const [x,lane]of sites.slice(2))if(!own.some(b=>b.x===x&&b.lane===lane))return gold>=220?{action:'build',type:'watchtower',x,lane,...game.build('watchtower',x,game.map.lanes[lane],0)}:null;
  const rear=own.filter(b=>b.type==='watchtower'&&b.x===550&&b.level<3).sort((a,b)=>a.level-b.level||a.lane-b.lane)[0];
  return rear&&gold>=game.upgradeCost(rear)?{action:'upgrade',id:rear.id,...game.upgrade(rear.id,0)}:null;
 };
}
