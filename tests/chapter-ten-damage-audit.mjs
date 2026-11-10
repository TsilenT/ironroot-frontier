/** Observational damage attribution across the native simultaneous-damage FIFO.
 * No damage, target, order, policy, HP or outcome is changed by this wrapper. */
import assert from 'node:assert/strict';
export function auditFinaleDamage(game){
 const damage=game._damage,pending=[],losses=[],bossHits=[];
 game._damage=function(target,amount,side){
  let boss=false;
  if(this.damageQueue){
   boss=new Error().stack.includes('stepColossusUnit');
   pending.push({target,amount,side,boss});
  }else if(pending.length){
   const next=pending.shift();assert.equal(next.target,target,'native damage flush keeps target FIFO');assert.equal(next.amount,amount);assert.equal(next.side,side);boss=next.boss;
  }
  const queued=!!this.damageQueue,before=target.hp,result=damage.call(this,target,amount,side);
  if(!queued&&before>0&&target.hp<before&&boss)bossHits.push({id:target.id,time:this.state.time,damage:before-target.hp,type:target.type});
  if(!queued&&before>0&&target.hp<=0&&target.side===0&&Object.hasOwn(this.buildings,target.type))losses.push({id:target.id,time:this.state.time,type:target.type,lane:target.lane,boss});
  return result;
 };
 return {losses,bossHits,pendingCount:()=>pending.length};
}
