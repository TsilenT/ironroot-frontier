/** Passive reserve observations. No wrappers, decisions, RNG or state writes. */
import {createHash} from 'node:crypto';
import {Game} from '../../dist/engine.js';
import {DESIGN,reserveStatus} from '../minor-reserve/scenario.mjs';
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const view=e=>({id:e.id,type:e.type,side:e.side,x:e.x,y:e.y,lane:e.lane??null,hp:e.hp,maxHp:e.maxHp,level:e.level??null});
export function createEventObserver(){
 const receipt={prefix:[],firstReleaseTick:null,releases:[],paths:[],contexts:[]};
 let lastReleaseCount=0,damageIndex=0,lossIndex=0,postLossTick=null,firstInteraction=false,firstDeath=false;
 const tagged=new Set();
 function capture(game,policy,combat){
  const r=game.reserve,s=game.state,roles=[],tags=[];
  const tag=name=>{if(!tagged.has(name)){tagged.add(name);tags.push(name);if(r.enabled&&(['warning-start','last-warning-tick','warning-due','first-release','queue-complete'].includes(name)||name.startsWith('partial-release-')))roles.push(name);}};
  if(postLossTick===null){const lost=combat.losses.find(l=>l.target.id===r.postId);if(lost){postLossTick=lost.tick;tag('original-post-loss');}}
  const due=r.triggerTick===null?null:r.triggerTick+DESIGN.warningTicks;
  if(r.enabled&&r.triggerTick===game.tick)tag('warning-start');
  if(due!==null&&game.tick===due-1)tag('last-warning-tick');
  if(due!==null&&game.tick===due)tag('warning-due');
  if(r.releases.length>lastReleaseCount){
   if(lastReleaseCount===0){receipt.firstReleaseTick=game.tick;tag('first-release');}
   if(r.releases.length<DESIGN.reserve.length)tag('partial-release-'+r.releases.length);
   for(const row of r.releases.slice(lastReleaseCount)){
    const unit=s.units.find(u=>u.id===row.unitId);if(!unit)throw Error('Fresh reserve unit missing at release boundary');
    receipt.releases.push({...row,unit:view(unit)});
   }
   if(r.releases.length===DESIGN.reserve.length)tag('queue-complete');lastReleaseCount=r.releases.length;
  }
  const ids=new Set(r.releases.map(x=>x.unitId));
  for(const hit of combat.damage.slice(damageIndex)){
   const fire=hit.fireIndex===null?null:combat.fires[hit.fireIndex];
   if(!firstInteraction&&(ids.has(hit.target.id)||(fire&&ids.has(fire.attacker.id)))){firstInteraction=true;tag('first-reserve-interaction');}
  }
  for(const loss of combat.losses.slice(lossIndex))if(!firstDeath&&ids.has(loss.target.id)){firstDeath=true;tag('first-reserve-death');}
  damageIndex=combat.damage.length;lossIndex=combat.losses.length;
  if(receipt.firstReleaseTick===null)receipt.prefix.push({tick:game.tick,digest:hash({engine:Game.prototype.serialize.call(game),policy:policy.serialize()})});
  if(ids.size)receipt.paths.push({tick:game.tick,units:s.units.filter(u=>ids.has(u.id)).map(view)});
  if(tags.length||(postLossTick!==null&&(game.tick-postLossTick)%20===0))receipt.contexts.push({tick:game.tick,time:s.time,tags,phase:reserveStatus(game),reserve:structuredClone(r),units:s.units.filter(u=>u.hp>0).map(view),buildings:s.buildings.filter(b=>b.hp>0).map(view),bases:s.bases.map(view)});
  return roles;
 }
 function finish(game,combat){
  const ids=new Set(game.reserve.releases.map(r=>r.unitId)),births=new Map(combat.spawns.map(b=>[b.unit.id,b]));
  for(const [index,r] of game.reserve.releases.entries()){
   const b=births.get(r.unitId);if(!b||b.sourceBuildingId!==null||b.unit.side!==1||b.unit.type!==DESIGN.reserve[index]||b.unit.level!==1||b.unit.hp!==game.units[b.unit.type].hp)throw Error('Authored reserve provenance/stat mismatch');
  }
  const outgoing=combat.fires.filter(f=>ids.has(f.attacker.id)&&f.effective>0),incoming=combat.damage.filter(d=>ids.has(d.target.id)),deaths=combat.losses.filter(d=>ids.has(d.target.id));
  return {...receipt,summary:{triggerTick:game.reserve.triggerTick,dueTick:game.reserve.triggerTick===null?null:game.reserve.triggerTick+DESIGN.warningTicks,released:game.reserve.releases.length,remaining:game.reserve.enabled?DESIGN.reserve.length-game.reserve.releases.length:0,firstOutgoingTick:outgoing[0]?.tick??null,firstIncomingTick:incoming[0]?.tick??null,outgoingEffective:outgoing.reduce((n,f)=>n+f.effective,0),incomingEffective:incoming.reduce((n,d)=>n+d.effective,0),outgoingFireIndexes:outgoing.map(f=>combat.fires.indexOf(f)),incomingDamageIndexes:incoming.map(d=>combat.damage.indexOf(d)),deathIds:deaths.map(d=>d.target.id),survivors:game.state.units.filter(u=>ids.has(u.id)).map(view)}};
 }
 return {capture,finish,receipt};
}
export function verifyPairPrefix(disabled,enabled){
 if(disabled.events.firstReleaseTick!==null||!disabled.events.prefix.length||!enabled.events.prefix.length)throw Error('Missing or invalid paired prefix');
 for(const rows of [disabled.events.prefix,enabled.events.prefix])if(rows.some((row,index)=>row.tick!==index))throw Error('Paired prefix clock is not dense');
 if(enabled.events.firstReleaseTick!==null&&enabled.events.prefix.length!==enabled.events.firstReleaseTick)throw Error('Prefix does not end immediately before release');
 if(enabled.events.firstReleaseTick===null&&enabled.events.prefix.length!==disabled.events.prefix.length)throw Error('Unreleased pair terminated differently');
 const donor=new Map(disabled.events.prefix.map(row=>[row.tick,row.digest]));
 for(const row of enabled.events.prefix)if(donor.get(row.tick)!==row.digest)throw Error('Engine/policy diverged before first authored release at tick '+row.tick);
 const semantic=row=>row?{tick:row.tick,action:row.action?Object.fromEntries(Object.entries(row.action).filter(([key])=>key!=='id')):null,ok:row.ok,reason:row.reason,beforeGold:row.beforeGold,afterGold:row.afterGold}:null;
 const left=disabled.commands??[],right=enabled.commands??[];let firstCommandOrAffordabilityDivergence=null;
 for(let i=0;i<Math.max(left.length,right.length);i++)if(JSON.stringify(semantic(left[i]))!==JSON.stringify(semantic(right[i]))){
  const rows=[left[i],right[i]].filter(Boolean);if(rows.some(row=>!Number.isSafeInteger(row.tick)||row.tick<0))throw Error('Invalid command receipt tick');
  const divergence={disabled:semantic(left[i]),enabled:semantic(right[i])},tick=Math.min(...rows.map(row=>row.tick));
  if(enabled.events.firstReleaseTick===null||tick<enabled.events.firstReleaseTick)throw Error('Command/affordability receipt diverged before first authored release at tick '+tick);
  firstCommandOrAffordabilityDivergence??=divergence;
 }
 return {comparedTicks:enabled.events.prefix.length,throughTick:enabled.events.prefix.at(-1)?.tick??null,firstReleaseTick:enabled.events.firstReleaseTick,firstCommandOrAffordabilityDivergence};
}
