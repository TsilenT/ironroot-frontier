/** QA-only finite reserve. Production runtime and campaign identities are unchanged. */
import {Game} from '../../dist/engine.js';
import {deepFreeze,CITADEL_CAMPAIGN_RULESET_IDS} from '../../dist/rulesets.js';

export const DESIGN=deepFreeze({
 id:'wake-the-reserve-qa',revision:1,title:'Wake the Reserve',seed:9104,
 sourceCommit:'65ee1438435a9e8a4cb6b8b6930ac87ca17518b7',sourceTree:'b6ee01ff93f43176a889d7fb3c226cf5ef442643',
 rulesetId:CITADEL_CAMPAIGN_RULESET_IDS[2],mapId:'classic',difficulty:'normal',timeLimit:600,
 startingGold:[900,100],startingHealth:[6000,6000],warningTicks:120,
 // Initial authored assets, not a recurring free-production or treasury policy.
 playerBuildings:[['barracks',690,0],['barracks',690,1],['barracks',690,2],['archery',550,1],['mint',410,1]],
 enemyBuildings:[['barracks',2090,0],['barracks',2090,1],['barracks',2090,2],['archery',2370,1],['mint',2790,1],['watchtower',2230,0]],
 post:{type:'watchtower',x:2230,lane:0,side:1,name:'North Command Post'},
 reserve:['warrior','warrior','warrior','warrior','archer','archer'],arrivalX:3050,arrivalLane:0,
 briefing:'Destroy the enemy citadel by10:00 while yours survives. The optional original North Command Post calls four ordinary warriors and two ordinary archers when destroyed. After a6-second warning, they enter at the enemy rear on the north road, then march and fight normally. Bypass it, release them early, or prepare before attacking it. Only one contingent; replacements do not call another. The70-unit enemy cap can delay arrivals. Ordinary paid enemy construction and factory production continue. At5:00 normal production and structure-damage escalation applies. No tower, road or purchase is required.',
});
const ENGINE_KEYS=['difficulty','seed','ai','nextId','aiTimer','accumulator','tick','state'];
const PRODUCER={warrior:'barracks',archer:'archery'};
const terminal=g=>g.state.winner!==null||g.state.bases.some(b=>b.hp<=0)||g.tick>=DESIGN.timeLimit*20;
export function evaluateReserve(g){
 const s=g.state;
 if(s.bases[0].hp<=0||s.winner===1||s.winner==='draw')return {completed:false,failed:true,reason:'player-core'};
 if(s.bases[1].hp<=0||s.winner===0)return {completed:true,failed:false,reason:'enemy-core'};
 if(g.tick>=DESIGN.timeLimit*20)return {completed:false,failed:true,reason:'deadline'};
 return {completed:false,failed:false,reason:null};
}
export function reserveStatus(g){
 const r=g.reserve;
 if(!r.enabled)return {phase:'disabled',remaining:0,warningSeconds:0};
 if(r.triggerTick===null)return {phase:'armed',remaining:DESIGN.reserve.length,warningSeconds:0};
 const due=r.triggerTick+DESIGN.warningTicks;
 return {phase:r.releases.length===DESIGN.reserve.length?'complete':g.tick<due?'warning':'arriving',remaining:DESIGN.reserve.length-r.releases.length,warningSeconds:Math.max(0,(due-g.tick)/20)};
}
export class MinorReserveGame extends Game{
 constructor({seed=DESIGN.seed,reserveEnabled=true}={}){
  if(!Number.isSafeInteger(seed)||seed<0||seed>0xffffffff)throw new RangeError('Seed must be uint32.');
  if(typeof reserveEnabled!=='boolean')throw new TypeError('Reserve mode must be boolean.');
  super({seed,difficulty:DESIGN.difficulty,ai:true,mapId:DESIGN.mapId,rulesetId:DESIGN.rulesetId});
  const s=this.state;s.buildings=[];s.effects=[];s.stats.built=[0,0];s.gold=[10000,10000];
  for(const [side,formation] of [[0,DESIGN.playerBuildings],[1,DESIGN.enemyBuildings]])for(const [type,x,lane] of formation){
   const result=this.build(type,x,this.map.lanes[lane],side);if(!result.ok)throw Error('Illegal reserve opening: '+result.reason);
  }
  const post=s.buildings.find(b=>b.side===1&&b.type===DESIGN.post.type&&b.x===DESIGN.post.x&&b.lane===DESIGN.post.lane);
  this.reserve={enabled:reserveEnabled,postId:post.id,triggerTick:null,releases:[]};
  s.gold=[...DESIGN.startingGold];s.bases.forEach((b,side)=>b.hp=DESIGN.startingHealth[side]);
  s.income=[7.5,7.5];s.effects=[];
 }
 _qaCommand(method,args){if(terminal(this))return {ok:false,reason:'This QA encounter has ended.'};return method.apply(this,args);}
 canBuild(...args){return this._qaCommand(super.canBuild,args);}
 upgrade(...args){return this._qaCommand(super.upgrade,args);}
 sell(...args){return this._qaCommand(super.sell,args);}
 cast(...args){return this._qaCommand(super.cast,args);}
 canBuyCitadelOption(...args){return this._qaCommand(super.canBuyCitadelOption,args);}
 buyCitadelOption(...args){return this._qaCommand(super.buyCitadelOption,args);}
 update(dt){if(terminal(this))return;return super.update(dt);}
 _step(dt){
  if(terminal(this))return;
  super._step(dt);
  // Ordinary simultaneous damage and core resolution win over a new event.
  // Deadline likewise stops the queue. No posthumous/revival phase exists.
  if(terminal(this)||!this.reserve.enabled)return;
  const r=this.reserve;
  if(r.triggerTick===null){
   if(this.state.buildings.some(b=>b.id===r.postId&&b.hp>0))return;
   r.triggerTick=this.tick;return;
  }
  if(this.tick<r.triggerTick+DESIGN.warningTicks)return;
  // Same ordinary constructor, RNG, stats and70-unit cap as factory output.
  // The temporary source is NOT a building or an income/production asset.
  while(r.releases.length<DESIGN.reserve.length){
   const type=DESIGN.reserve[r.releases.length],id=this.nextId;
   this._spawn({type:PRODUCER[type],side:1,x:DESIGN.arrivalX+48,lane:DESIGN.arrivalLane,level:1});
   if(this.nextId===id)break;
   r.releases.push({unitId:id,tick:this.tick});
  }
 }
 serialize(){return {format:'ironroot-minor-reserve-qa',version:1,scenario:{id:DESIGN.id,revision:DESIGN.revision},engine:super.serialize(),reserve:structuredClone(this.reserve)};}
 static restore(value){
  if(typeof value==='string')value=JSON.parse(value);
  const fail=message=>{throw Error('Invalid minor-reserve QA save: '+message);};
  fields(value,['format','version','scenario','engine','reserve'],fail);
  fields(value.scenario,['id','revision'],fail);
  if(value.format!=='ironroot-minor-reserve-qa'||value.version!==1||value.scenario.id!==DESIGN.id||value.scenario.revision!==DESIGN.revision)fail('wrong identity');
  const r=value.reserve;fields(r,['enabled','postId','triggerTick','releases'],fail);
  if(typeof r.enabled!=='boolean'||!denseArray(r.releases)||r.releases.length>DESIGN.reserve.length)fail('invalid reserve fields');
  const engine=Game.restore(value.engine);
  if(engine.ruleset.id!==DESIGN.rulesetId||engine.map.id!==DESIGN.mapId||engine.difficulty!==DESIGN.difficulty||engine.ai!==true)fail('wrong engine identity');
  if(Math.abs(engine.state.time-engine.tick*.05)>Math.min(.001,1e-7+engine.state.time*1e-9)||engine.tick>DESIGN.timeLimit*20)fail('invalid fixed clock');
  const game=new MinorReserveGame({seed:engine.seed,reserveEnabled:r.enabled});
  if(r.postId!==game.reserve.postId||r.postId>=engine.nextId||engine.state.units.some(u=>u.id===r.postId))fail('wrong or reused original post');
  const livePost=engine.state.buildings.find(b=>b.id===r.postId&&b.hp>0);
  if(livePost&&(livePost.type!==DESIGN.post.type||livePost.side!==1||livePost.x!==DESIGN.post.x||livePost.y!==engine.map.lanes[DESIGN.post.lane]||livePost.lane!==DESIGN.post.lane))fail('original post identity changed');
  if(r.triggerTick===null){if(r.releases.length||(r.enabled&&!livePost&&!terminal(engine)))fail('untriggered state lost its original post');}
  else{
   if(!r.enabled||!Number.isSafeInteger(r.triggerTick)||r.triggerTick<1||r.triggerTick>engine.tick||r.triggerTick>=DESIGN.timeLimit*20||livePost)fail('invalid trigger');
  }
  if(!r.enabled&&(r.triggerTick!==null||r.releases.length))fail('disabled reserve contains event state');
  const ids=new Set();let lastTick=-1,lastUnitId=r.postId;
  r.releases.forEach((release,index)=>{
   fields(release,['unitId','tick'],fail);
   if(!Number.isSafeInteger(release.unitId)||release.unitId<=lastUnitId||release.unitId>=engine.nextId||ids.has(release.unitId)||!Number.isSafeInteger(release.tick)||release.tick<r.triggerTick+DESIGN.warningTicks||release.tick>engine.tick||release.tick>=DESIGN.timeLimit*20||release.tick<lastTick)fail('invalid arrival record');
   ids.add(release.unitId);lastTick=release.tick;lastUnitId=release.unitId;
   const live=engine.state.units.find(u=>u.id===release.unitId);
   if(engine.state.buildings.some(b=>b.id===release.unitId)||(live&&(live.type!==DESIGN.reserve[index]||live.side!==1||live.level!==1||live.lane!==DESIGN.arrivalLane)))fail('arrival provenance changed');
  });
  // A legal between-tick paid Volley can free living cap slots while dead unit
  // records remain until the next fixed tick. Saving must not advance the queue.
  if(r.triggerTick!==null&&engine.tick>=r.triggerTick+DESIGN.warningTicks&&r.releases.length<DESIGN.reserve.length&&!terminal(engine)&&engine.state.units.filter(u=>u.side===1).length<70)fail('uncapped due queue was not drained');
  for(const key of ENGINE_KEYS)game[key]=engine[key];
  game.reserve=structuredClone(r);return game;
 }
}
function fields(value,expected,fail){
 if(!value||typeof value!=='object'||Array.isArray(value)||![Object.prototype,null].includes(Object.getPrototypeOf(value)))fail('expected plain object');
 const ds=Object.getOwnPropertyDescriptors(value),keys=Reflect.ownKeys(ds);
 if(keys.length!==expected.length||keys.some(k=>typeof k!=='string'||!expected.includes(k)||!Object.hasOwn(ds[k],'value')||!ds[k].enumerable))fail('unknown, missing or unsafe field');
}
export const createReserve=options=>new MinorReserveGame(options);

function denseArray(value){
 if(!Array.isArray(value)||Object.getPrototypeOf(value)!==Array.prototype)return false;
 const ds=Object.getOwnPropertyDescriptors(value),keys=Reflect.ownKeys(ds).filter(k=>k!=='length');
 return keys.length===value.length&&keys.every((k,i)=>k===String(i)&&Object.hasOwn(ds[k],'value')&&ds[k].enumerable);
}
