/** Passive event receipts. Observers neither fund nor steer either side. */
export function observeCombat(game){
 const s=game.state,original=new Set(s.buildings.map(b=>b.id)),postId=game.reserve.postId;
 const receipt={spawns:[],fires:[],damage:[],losses:[],firstPositiveDamageAt:null,firstUnitCombatAt:null,firstStructureDamageAt:[null,null],firstCoreDamageAt:[null,null],firstOriginalStructureLossAt:[null,null],firstOriginalPostLossAt:null};
 const pending=[];let currentFire=null;
 const position=e=>({id:e.id,type:e.type,side:e.side,lane:e.lane??null,x:e.x,y:e.y,hp:e.hp,level:e.level??null});
 const spawn=game._spawn;game._spawn=function(b){const id=this.nextId,result=spawn.call(this,b);if(this.nextId!==id){const u=s.units.find(u=>u.id===id);receipt.spawns.push({tick:this.tick,time:s.time,unit:position(u),sourceBuildingId:b.id??null,sourceType:b.type});}return result;};
 const fire=game._fire;game._fire=function(a,t,amount,type,extra){
  const row={tick:this.tick,time:s.time,attacker:position(a),target:position(t),requested:amount,effective:0,type,extra:extra===true};receipt.fires.push(row);
  const previous=currentFire;currentFire=receipt.fires.length-1;try{return fire.call(this,a,t,amount,type,extra);}finally{currentFire=previous;}
 };
 const damage=game._damage;game._damage=function(target,amount,side){
  if(this.damageQueue){pending.push({target:target.id,amount,side,fire:currentFire});return damage.call(this,target,amount,side);}
  const meta=pending.length?pending.shift():{fire:currentFire};
  if(meta.target!==undefined&&(meta.target!==target.id||meta.amount!==amount||meta.side!==side))throw Error('Damage queue attribution changed.');
  const before=position(target),hp=target.hp,result=damage.call(this,target,amount,side),effective=hp-target.hp;
  if(effective>0){
   const row={tick:this.tick,time:s.time,side,target:before,effective,fireIndex:meta.fire};receipt.damage.push(row);
   if(meta.fire!==null)receipt.fires[meta.fire].effective+=effective;
   receipt.firstPositiveDamageAt??=s.time;
   if(game.units[target.type])receipt.firstUnitCombatAt??=s.time;
   else if(target.type==='base')receipt.firstCoreDamageAt[target.side]??=s.time;
   else receipt.firstStructureDamageAt[target.side]??=s.time;
   if(target.hp<=0){
    receipt.losses.push({...row,original:original.has(target.id)});
    if(original.has(target.id))receipt.firstOriginalStructureLossAt[target.side]??=s.time;
    if(target.id===postId)receipt.firstOriginalPostLossAt??=s.time;
   }
  }
  return result;
 };
 return {receipt,assertDrained(){if(pending.length)throw Error('Unresolved observed damage queue.');}};
}
export function forceSummary(game){
 const s=game.state;
 return {tick:game.tick,time:s.time,gold:[...s.gold],income:[...s.income],coreHP:s.bases.map(b=>b.hp),sides:[0,1].map(side=>{
  const troops=s.units.filter(u=>u.side===side&&u.hp>0),composition={};for(const u of troops)composition[u.type]=(composition[u.type]??0)+1;
  return {side,troops:troops.length,troopHP:troops.reduce((n,u)=>n+u.hp,0),composition,buildings:s.buildings.filter(b=>b.side===side&&b.hp>0).map(({id,type,lane,x,hp,level})=>({id,type,lane,x,hp,level}))};})};
}
