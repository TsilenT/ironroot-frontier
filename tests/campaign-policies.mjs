/** Reference playtest policies use only ordinary paid build/upgrade/cast actions. */
import {LANES} from '../dist/engine.js';
export function productionPolicy(types,lanes) {
  let cursor=0;
  return game=>{
    for(let attempt=0;attempt<types.length*lanes.length;attempt++) {
      const type=types[Math.floor(cursor/lanes.length)%types.length],lane=lanes[cursor%lanes.length];
      let needsGold=false;
      for(const x of [1250,1110,970,830,690,550,410,270]) {
        const result=game.build(type,x,LANES[lane]);
        if(result.ok){cursor++;return;}
        if(result.reason.startsWith('Need '))needsGold=true;
      }
      if(needsGold)return;
      cursor++;
    }
    improve(game);
  };
}
function sequenceThen(steps,next) {
  let cursor=0;
  return g=>{
    while(cursor<steps.length) {
      const [type,x,lane,level=1]=steps[cursor];
      let building=g.state.buildings.find(b=>b.side===0&&b.type===type&&b.x===x&&b.lane===lane&&b.hp>0);
      if(!building) {const result=g.build(type,x,LANES[lane]);if(!result.ok)return;building=result.building;}
      while(building.level<level)if(!g.upgrade(building.id).ok)return;
      cursor++;
    }
    next?.(g);
  };
}
function improve(g) {
  const target=g.state.buildings.filter(b=>b.side===0&&b.level<3).sort((a,b)=>a.level-b.level||b.x-a.x)[0];
  if(target)g.upgrade(target.id);
}
function strike(g) {
  if(g.state.gold[0]<200||g.state.spellCooldown[0]>0)return;
  const enemies=g.state.units.filter(u=>u.side===1&&u.x<1500);let target=null,best=3;
  for(const u of enemies) {const count=enemies.filter(e=>Math.hypot(e.x-u.x,e.y-u.y)<170).length;if(count>best){best=count;target=u;}}
  if(target)g.cast(target.x,target.y);
}
export function campaignPolicy(id) {
  if(id==='emberwatch')return productionPolicy(['barracks','archery'],[1]);
  if(id==='three-roads')return sequenceThen([['watchtower',1110,1]],productionPolicy(['barracks','archery','sanctum'],[0,2]));
  if(id==='winter-stores')return sequenceThen([['watchtower',1110,0],['watchtower',1110,2],['mint',410,1],['mint',410,0,2],['mint',410,2,2],['mint',410,1,3]],improve);
  if(id==='wings-of-ash')return productionPolicy(['archery'],[0,2]);
  if(id==='stonegate')return productionPolicy(['barracks','foundry','archery'],[1]);
  if(id==='long-vigil')return sequenceThen([['watchtower',1250,1],['watchtower',1110,0],['watchtower',1110,2]],productionPolicy(['archery','barracks','foundry'],[0,1,2]));
  if(id==='cold-forge')return productionPolicy(['aerie','barracks','archery'],[0,2]);
  if(id==='crown-foothold')return sequenceThen([['watchtower',1250,1],['mint',410,1,2],['mint',410,2,2],['mint',410,0,3],['mint',410,1,3],['mint',410,2,3],['archery',970,0],['archery',970,2]],improve);
  if(id==='last-light')return sequenceThen([['watchtower',1250,1],['mint',410,0],['mint',410,1],['mint',410,2],['watchtower',970,0,3],['watchtower',970,2,3],['aerie',1250,0],['archery',1250,2]],productionPolicy(['barracks','archery','sanctum'],[0,1,2]));
  const build=sequenceThen([['mint',410,0],['mint',410,1],['mint',410,2],['watchtower',1110,0],['watchtower',1110,2],['barracks',1250,1],['foundry',1110,1],['sanctum',690,1],['archery',550,1]],productionPolicy(['barracks','archery','foundry','sanctum'],[1,0,2]));
  return g=>{strike(g);build(g);};
}
export function playCampaign(create,evaluate,mission,{seed=mission.seed,restore=null,idle=false,mastery=false}={}) {
  let game=create(mission.id);game.seed=seed;
  const policy=idle?()=>{}:mastery?campaignMasteryPolicy(mission.id):campaignPolicy(mission.id);
  let outcome;
  for(let tick=0;tick<(mission.timeLimit+1)*20;tick++) {
    if(tick%20===0)policy(game);
    game.update(.05);
    if(restore&&tick%200===0)game=restore(game.serialize());
    outcome=evaluate(game,mission.id);
    if(outcome.completed||outcome.failed)break;
  }
  return {game,outcome};
}

/** Optional mastery routes trade immediate production for advertised upgrade medals. */
export function campaignMasteryPolicy(id) {
  const main=campaignPolicy(id);
  const targets={stonegate:2,'long-vigil':3,'black-ledger':0,'last-light':6};
  if(id==='black-ledger')return sequenceThen([['mint',410,0,2],['mint',410,1,2],['mint',410,2]],main);
  if(!(id in targets))return main;
  const start=id==='stonegate'?0:id==='long-vigil'?70:80;
  return g=>{
    const upgraded=g.state.buildings.filter(b=>b.side===0&&b.hp>0&&b.level>=2).length;
    const candidate=g.state.buildings.filter(b=>b.side===0&&b.hp>0&&b.level===1).sort((a,b)=>a.invested-b.invested)[0];
    if(g.state.time>=start&&upgraded<targets[id]&&candidate){g.upgrade(candidate.id);return;}
    main(g);
  };
}
