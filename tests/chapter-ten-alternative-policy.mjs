/** Frozen alternative decisions. Every decision reads the ordinary observation. */
import {observe} from '../dist/fog.js';
export function alternativeChapterTenPolicy(recipe,prior){
 const state=prior?structuredClone(prior):{nextCommand:0,queueIndex:0,successfulBuilds:0,rejections:[]};
 function decide(game){
  const v=observe(game,0).state;if(v.time+1e-8<state.nextCommand)return;state.nextCommand+=2;let acted=false;
  if(state.successfulBuilds>=4){
   if(recipe.defensiveUpgradeFraction){
    const candidates=v.buildings.filter(b=>b.side===0&&b.hp>0&&b.level<3&&['barracks','wardenLodge'].includes(b.type)&&b.hp/b.maxHp<recipe.defensiveUpgradeFraction).sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp||a.id-b.id);
    const injured=candidates.find(b=>v.gold[0]>=game.upgradeCost(b));if(injured)acted=game.upgrade(injured.id).ok;
   }
   if(!acted&&v.bases[0].hp<2100&&game.canBuyCitadelOption('regen').ok)acted=game.buyCitadelOption('regen').ok;
   if(!acted&&v.spellCooldown[0]<=0&&v.gold[0]>=game.ruleset.spell.cost){
    const threats=v.units.filter(u=>u.side===1&&u.hp>0&&u.x<1150),target=threats.find(u=>threats.filter(t=>Math.hypot(t.x-u.x,t.y-u.y)<game.ruleset.spell.radius).length>=4);
    if(target)acted=game.cast(target.x,target.y).ok;
   }
  }
  if(!acted&&state.queueIndex<recipe.queue.length){
   const [type,home,lane]=recipe.queue[state.queueIndex];if(v.gold[0]>=game.buildings[type].cost){const result=game.build(type,home,game.map.lanes[lane]);if(result.ok){acted=true;state.successfulBuilds++;}else state.rejections.push({time:v.time,index:state.queueIndex,reason:result.reason});state.queueIndex++;}
  }else if(!acted&&recipe.upgradePriority.length){
   const rank=type=>recipe.upgradePriority.indexOf(type),b=v.buildings.filter(b=>b.side===0&&b.hp>0&&b.level<3&&rank(b.type)>=0).sort((a,b)=>a.level-b.level||rank(a.type)-rank(b.type)||a.id-b.id)[0];if(b&&v.gold[0]>=game.upgradeCost(b))game.upgrade(b.id);
  }
 }
 return {decide,snapshot:()=>structuredClone(state)};
}
