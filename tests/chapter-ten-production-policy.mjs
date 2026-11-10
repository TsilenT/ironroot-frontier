/** Faithful port of the reviewed fixed two-second paid policy; no world edits. */
import {observe} from '../dist/fog.js';
export function finalChapterPolicy(c){
 let nextCommand=0,queueIndex=0,successfulBuilds=0;
 return g=>{
  const v=c.name==='Night'?observe(g,0).state:g.state;
  if(v.time+1e-8<nextCommand)return;nextCommand+=2;let acted=false;
  if(successfulBuilds>=4){
   if(c.name==='Finale'&&v.bases[0].hp<2100&&g.canBuyCitadelOption('regen').ok)acted=g.buyCitadelOption('regen').ok;
   if(!acted&&v.spellCooldown[0]<=0&&v.gold[0]>=g.ruleset.spell.cost){
    const threats=v.units.filter(u=>u.side===1&&u.hp>0&&u.x<1150);
    const target=(c.name==='Finale'?v.units.find(u=>u.side===1&&u.type==='colossus'&&u.hp>0&&u.x<1500):null)??threats.find(u=>threats.filter(t=>Math.hypot(t.x-u.x,t.y-u.y)<g.ruleset.spell.radius).length>=4);
    if(target)acted=g.cast(target.x,target.y).ok;
   }
  }
  if(!acted&&queueIndex<c.queue.length){const [type,home,lane]=c.queue[queueIndex];if(v.gold[0]>=g.buildings[type].cost){const result=g.build(type,home,g.map.lanes[lane]);if(result.ok){acted=true;successfulBuilds++;}queueIndex++;}}
  else if(!acted&&c.upgradePriority.length){const rank=t=>c.upgradePriority.indexOf(t);const b=v.buildings.filter(b=>b.side===0&&b.hp>0&&b.level<3&&rank(b.type)>=0).sort((a,b)=>a.level-b.level||rank(a.type)-rank(b.type)||a.id-b.id)[0];if(b&&v.gold[0]>=g.upgradeCost(b))acted=g.upgrade(b.id).ok;}
 };
}
