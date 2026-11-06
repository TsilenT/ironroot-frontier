/** QA-only fork of the fixed-step engine at 24eddda. No production imports this file.
 * Deliberately pins the combat/economy implementation for this experiment; run
 * lab parity tests before rebasing. Shared roster/prices come from production.
 */
import {MAPS as RELEASE_MAPS, WORLD, LANES, homeX, worldX, laneFor, buildBounds, buildSites, SPELL, UNITS, BUILDINGS, upgradeCost} from '../../dist/engine.js';
export {WORLD, LANES, homeX, worldX, laneFor, buildBounds, buildSites, SPELL, UNITS, BUILDINGS, upgradeCost};
const columns=Object.freeze([270,410,550,690,830,970,1110,1250]);
export const AIR_ROUTE=Object.freeze({gate:1400,warning:2,speed:UNITS.gryphon.speed});
const descriptor=(id,name,lanes,airRoutes=null)=>Object.freeze({id,revision:1,name,width:3200,height:900,lanes:Object.freeze(lanes),startingLane:lanes.length===3?1:0,buildLimit:lanes.length*columns.length,siteColumns:columns,experimental:true,airRoutes:airRoutes&&Object.freeze(airRoutes)});
export const LAB_MAPS=Object.freeze({
  'single-road':descriptor('single-road','First Road',[450]),
  'two-roads':descriptor('two-roads','Divided Front',[340,560]),
  'three-roads':descriptor('three-roads','Three Fronts',[260,450,640]),
  'two-roads-crosswind':descriptor('two-roads-crosswind','Crosswind: Two Roads',[340,560],[1,0]),
  'three-roads-crosswind':descriptor('three-roads-crosswind','Crosswind: Three Roads',[260,450,640],[1,null,1])
});
// Command trials use new identities; fixed-route v3 lab maps keep their rules.
export const COMMAND_MAPS=Object.freeze({
  'command-two-roads':Object.freeze({...descriptor('command-two-roads','Flight Orders: Two Roads',[340,560]),commandFlights:true}),
  'command-three-roads':Object.freeze({...descriptor('command-three-roads','Flight Orders: Three Roads',[260,450,640]),commandFlights:true})
});
export const MAPS=Object.freeze({...RELEASE_MAPS,...LAB_MAPS,...COMMAND_MAPS});
export function getMap(mapId='classic'){if(typeof mapId!=='string'||!Object.hasOwn(MAPS,mapId))throw new Error('Unknown battlefield: '+String(mapId));return MAPS[mapId];}
const isBuildSite=(map,side,x,y)=>map.siteColumns.includes(homeX(map,side,x))&&map.lanes.includes(y);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export class Game {
  constructor({difficulty='normal',seed=123,ai=true,mapId='classic'}={}) {
    Object.defineProperty(this,'map',{value:getMap(mapId),enumerable:true});
    const map=this.map;
    this.difficulty=['easy','normal','hard'].includes(difficulty)?difficulty:'normal';
    this.seed=seed>>>0; this.ai=ai;this.nextId=1;this.aiTimer=this.difficulty==='easy'?7:0;this.accumulator=0;this.tick=0;this.damageQueue=null;
    this.state={time:0,gold:[420,420],income:[5,5],bases:[{id:'base0',type:'base',side:0,hp:6000,maxHp:6000,cooldown:0,x:110,y:450},{id:'base1',type:'base',side:1,hp:6000,maxHp:6000,cooldown:0,x:map.width-110,y:450}],buildings:[],units:[],projectiles:[],effects:[],frontline:map.width/2,winner:null,spellCooldown:[0,0],overtime:false,stats:{kills:[0,0],built:[0,0],damage:[0,0]}};
    for(let side=0;side<2;side++)this._place('barracks',worldX(map,side,410),map.lanes[map.startingLane],side);
  }
  serialize(){return JSON.parse(JSON.stringify({...(this.map.commandFlights?{version:4,ruleset:'lane-command-1',mapId:this.map.id,mapRevision:this.map.revision}:this.map.experimental?{version:3,ruleset:'lane-lab-1',mapId:this.map.id,mapRevision:this.map.revision}:this.map.id==='classic'?{version:1}:{version:2,mapId:this.map.id,mapRevision:this.map.revision}),difficulty:this.difficulty,seed:this.seed,ai:this.ai,nextId:this.nextId,aiTimer:this.aiTimer,accumulator:this.accumulator,tick:this.tick,state:this.state}));}
  static restore(data){
    const map=validateSave(data);
    const clean=JSON.parse(JSON.stringify(data));
    const game=new Game({difficulty:clean.difficulty,seed:clean.seed,ai:clean.ai,mapId:map.id});
    for(const key of ['difficulty','seed','ai','nextId','aiTimer','accumulator','tick','state'])game[key]=clean[key];
    return game;
  }
  random(){this.seed=(Math.imul(this.seed,1664525)+1013904223)>>>0;return this.seed/4294967296;}
  canBuild(type,x,y,side=0){
    const s=this.state,d=BUILDINGS[type],bounds=buildBounds(this.map,side);
    if(s.winner!==null)return {ok:false,reason:'The battle has ended.'};
    if(!Object.hasOwn(BUILDINGS,type)||![0,1].includes(side))return {ok:false,reason:'Unknown building.'};
    if(!Number.isFinite(x)||!Number.isFinite(y)||x<bounds.minX||x>bounds.maxX||y<bounds.minY||y>bounds.maxY)return {ok:false,reason:'Build within your territory.'};
    if(this.map.id!=='classic'&&!isBuildSite(this.map,side,x,y))return {ok:false,reason:'Choose a marked building site.'};
    if(s.buildings.some(b=>b.hp>0&&Math.hypot(b.x-x,b.y-y)<108))return {ok:false,reason:'Too close to another building.'};
    if(type==='mint'&&s.buildings.filter(b=>b.side===side&&b.type==='mint').length>=3)return {ok:false,reason:'Maximum 3 gold mines per side.'};
    if(s.gold[side]<d.cost)return {ok:false,reason:`Need ${d.cost} gold.`};
    if(s.buildings.filter(b=>b.side===side).length>=this.map.buildLimit)return {ok:false,reason:`Building limit reached (${this.map.buildLimit}).`};
    return {ok:true};
  }
  build(type,x,y,side=0){const result=this.canBuild(type,x,y,side);if(!result.ok)return result;this.state.gold[side]-=BUILDINGS[type].cost;return {ok:true,building:this._place(type,x,y,side)};}
  _place(type,x,y,side){const d=BUILDINGS[type];const b={id:this.nextId++,type,side,x,y,lane:laneFor(this.map,y),hp:d.hp,maxHp:d.hp,level:1,progress:d.unit?1-1.2/d.spawnTime:0,cooldown:0,invested:d.cost};if(this.map.commandFlights&&type==='aerie')b.flightPlan=b.lane;this.state.buildings.push(b);this.state.stats.built[side]++;this._effect(x,y,'build',side,0.7);return b;}
  setFlightPlan(id,toLane,side=0){
    if(this.state.winner!==null)return {ok:false,reason:'The battle has ended.'};
    if(!this.map.commandFlights)return {ok:false,reason:'Flight orders are available only in command trials.'};
    if(![0,1].includes(side))return {ok:false,reason:'Choose an owned gryphon aerie.'};
    const b=this.state.buildings.find(b=>b.id===id&&b.side===side&&b.type==='aerie'&&b.hp>0);
    if(!b)return {ok:false,reason:'Choose an owned gryphon aerie.'};
    if(!Number.isInteger(toLane)||toLane<0||toLane>=this.map.lanes.length||Math.abs(toLane-b.lane)>1)return {ok:false,reason:'Hold this road or choose an adjacent road.'};
    b.flightPlan=toLane;
    return {ok:true,building:b,reason:'Flight plan set for future launches. Airborne gryphons keep their orders.'};
  }
  upgrade(id,side=0){const b=this.state.buildings.find(b=>b.id===id&&b.side===side&&b.hp>0);if(this.state.winner!==null||!b)return {ok:false,reason:'Select one of your buildings.'};if(b.level>=3)return {ok:false,reason:'Already at maximum level.'};const cost=upgradeCost(b);if(this.state.gold[side]<cost)return {ok:false,reason:`Need ${cost} gold.`};this.state.gold[side]-=cost;b.invested+=cost;b.level++;const hp=BUILDINGS[b.type].hp*(1+0.4*(b.level-1));b.hp+=hp-b.maxHp;b.maxHp=hp;this._effect(b.x,b.y,'upgrade',side,0.8);return {ok:true,building:b};}
  sell(id,side=0){const b=this.state.buildings.find(b=>b.id===id&&b.side===side&&b.hp>0);if(this.state.winner!==null||!b)return {ok:false,reason:'Select one of your buildings.'};const refund=Math.floor(b.invested*0.5*b.hp/b.maxHp);this.state.gold[side]+=refund;this.state.buildings=this.state.buildings.filter(a=>a!==b);this._effect(b.x,b.y,'sell',side,0.6);return {ok:true,refund};}
  cast(x,y,side=0){const s=this.state;if(s.winner!==null||![0,1].includes(side)||!Number.isFinite(x)||!Number.isFinite(y)||x<0||x>this.map.width||y<0||y>this.map.height)return {ok:false,reason:'Choose a point on the battlefield.'};if(s.spellCooldown[side]>0)return {ok:false,reason:'Volley is recharging.'};if(s.gold[side]<SPELL.cost)return {ok:false,reason:`Need ${SPELL.cost} gold.`};s.gold[side]-=SPELL.cost;s.spellCooldown[side]=SPELL.cooldown;for(const u of s.units)if(u.side!==side&&Math.hypot(u.x-x,u.y-y)<SPELL.radius)this._damage(u,SPELL.damage,side);this._effect(x,y,'volley',side,1.1,SPELL.radius);return {ok:true};}
  _effect(x,y,type,side,life=0.35,radius=30){if(this.state.effects.length>=256)this.state.effects.shift();this.state.effects.push({x,y,type,side,life,maxLife:life,radius});}
  _spawn(b){const s=this.state;if(s.units.filter(u=>u.side===b.side&&u.hp>0).length>=70)return;const type=BUILDINGS[b.type].unit,d=UNITS[type],mult=1+0.12*(b.level-1);const u={id:this.nextId++,type,flying:d.flying,side:b.side,x:b.x+(b.side?-48:48),y:this.map.lanes[b.lane]+(this.random()-0.5)*32,lane:b.lane,hp:d.hp*mult,maxHp:d.hp*mult,level:b.level,cooldown:this.random()*0.2,attack:0};const to=this.map.commandFlights?(b.flightPlan??b.lane):this.map.airRoutes?.[u.lane];if(type==='gryphon'&&to!=null&&to!==u.lane)u.airRoute={from:u.lane,to,phase:'approach',remaining:AIR_ROUTE.warning};s.units.push(u);this._effect(u.x,u.y,'spawn',u.side,0.45);}
  _advanceAirRoute(u,dt){
    const route=u.airRoute;if(!route||route.phase==='done')return false;
    if(route.phase==='approach'){
      if(homeX(this.map,u.side,u.x)<AIR_ROUTE.gate)return false;
      route.phase='warning';route.remaining=AIR_ROUTE.warning;
    }
    u.attack=0;
    if(route.phase==='warning'){
      route.remaining=Math.max(0,route.remaining-dt);
      if(route.remaining<=1e-9){route.remaining=0;route.phase='transit';}
    }else {
      const y=this.map.lanes[route.to],distance=y-u.y,step=AIR_ROUTE.speed*dt;
      u.y+=Math.sign(distance)*Math.min(Math.abs(distance),step);
      if(Math.abs(distance)<=step){u.y=y;u.lane=route.to;route.phase='done';}
    }
    return true;
  }
  _damage(target,amount,side){if(this.damageQueue){this.damageQueue.push([target,amount,side]);return;}if(target.hp<=0)return;const damage=Math.min(target.hp,amount);target.hp=Math.max(0,target.hp-amount);this.state.stats.damage[side]+=damage;target.hit=0.16;if(target.hp===0){if(UNITS[target.type]){this.state.stats.kills[side]++;this.state.gold[side]+=2;}this._effect(target.x,target.y,'death',target.side,0.7,UNITS[target.type]?18:52);}}
  _fire(attacker,target,damage,type){const s=this.state;attacker.attack=0.22;this._damage(target,damage,attacker.side);if(type!=='warrior'&&s.projectiles.length<256)s.projectiles.push({x:attacker.x,y:attacker.y,sx:attacker.x,sy:attacker.y,tx:target.x,ty:target.y,side:attacker.side,type,sourceAir:!!UNITS[attacker.type]?.flying,targetAir:!!UNITS[target.type]?.flying,life:0.28,maxLife:0.28});else this._effect(target.x,target.y,'hit',attacker.side,0.2,16);}
  update(dt){if(!Number.isFinite(dt)||dt<=0||this.state.winner!==null)return;this.accumulator+=Math.min(dt,0.25);while(this.accumulator>=0.05){this._step(0.05);this.accumulator-=0.05;if(this.state.winner!==null)break;}}
  _step(dt){
    const s=this.state;this.tick++;this.damageQueue=[];s.time+=dt;s.overtime=s.time>=300;
    for(let side=0;side<2;side++){s.income[side]=5+s.buildings.filter(b=>b.side===side&&b.type==='mint'&&b.hp>0).reduce((n,b)=>n+2.5*(1+0.5*(b.level-1)),0);s.gold[side]+=s.income[side]*dt;s.spellCooldown[side]=Math.max(0,s.spellCooldown[side]-dt);}
    for(const e of s.effects)e.life-=dt;s.effects=s.effects.filter(e=>e.life>0);
    for(const p of s.projectiles){p.life-=dt;const t=1-p.life/p.maxLife;p.x=p.sx+(p.tx-p.sx)*t;p.y=p.sy+(p.ty-p.sy)*t;}s.projectiles=s.projectiles.filter(p=>p.life>0);
    for(const b of (this.tick%2?s.buildings:[...s.buildings].reverse())){if(b.hp<=0)continue;b.hit=Math.max(0,(b.hit||0)-dt);const d=BUILDINGS[b.type];if(d.unit){b.progress+=dt*(1+0.22*(b.level-1))*(s.overtime?1.65:1)/d.spawnTime;if(b.progress>=1){b.progress-=1;this._spawn(b);}}
      if(d.range){b.cooldown=Math.max(-1,b.cooldown-dt);const enemies=s.units.filter(u=>u.side!==b.side&&u.hp>0&&Math.hypot(u.x-b.x,u.y-b.y)<d.range);enemies.sort((a,c)=>Math.hypot(a.x-b.x,a.y-b.y)-Math.hypot(c.x-b.x,c.y-b.y));if(enemies[0]&&b.cooldown<=0){const t=enemies[0];this._fire(b,t,d.damage*(1+0.3*(b.level-1))*(t.type==='warrior'?0.72:1),'tower');b.cooldown=0.85;}}
    }
    // Towers retain the original structure-first targeting. Resolve routes
    // together before unit combat so opposing units see the same route snapshot.
    const routing=new Set();
    if(this.map.airRoutes||this.map.commandFlights)for(const u of s.units)if(u.hp>0&&this._advanceAirRoute(u,dt))routing.add(u.id);
    const pendingMoves=[];
    for(const u of (this.tick%2?s.units:[...s.units].reverse())){if(u.hp<=0)continue;const d=UNITS[u.type],dir=u.side? -1:1;u.cooldown=Math.max(-1,u.cooldown-dt);u.attack=Math.max(0,u.attack-dt);u.hit=Math.max(0,(u.hit||0)-dt);
      if(routing.has(u.id))continue;
      let target=null,best=Infinity;
      for(const e of s.units){if(e.side===u.side||e.hp<=0||(e.lane!==u.lane&&!(d.canAttackAir&&e.airRoute?.phase==='transit'&&[e.airRoute.from,e.airRoute.to].includes(u.lane))&&Math.abs(u.x-(u.side?110:this.map.width-110))>220)||(UNITS[e.type].flying&&!d.canAttackAir)||(!UNITS[e.type].flying&&!d.canAttackGround))continue;const dist=Math.hypot(e.x-u.x,e.y-u.y);if(dist<best&&dist<Math.max(d.range+80,190)){target=e;best=dist;}}
      if(!target){for(const b of s.buildings){if(b.side===u.side||b.hp<=0||b.lane!==u.lane||(b.x-u.x)*dir < -90)continue;const dist=Math.hypot(b.x-u.x,b.y-u.y)-35;if(dist<best){target=b;best=dist;}}}
      if(!target){target=s.bases[1-u.side];best=Math.hypot(target.x-u.x,target.y-u.y)-55;}
      const structure=!UNITS[target.type];
      if(best<=d.range){if(u.cooldown<=0){const troopDamage=d.damage*(1+0.12*(u.level-1));let damage=troopDamage;if(u.type==='archer'&&target.type==='warrior')damage*=0.55;if(u.type==='warrior'&&target.type==='archer')damage*=1.35;if(u.type==='archer'&&UNITS[target.type]?.flying)damage*=1.5;if(u.type==='gryphon'&&structure)damage*=0.6;if(u.type==='siege'&&structure)damage*=3;if(s.overtime&&structure)damage*=1.75;this._fire(u,target,damage,u.type);if(u.type==='siege'||u.type==='wizard'){for(const e of s.units)if(e!==target&&e.side!==u.side&&e.hp>0&&!UNITS[e.type].flying&&Math.hypot(e.x-target.x,e.y-target.y)<64)this._damage(e,troopDamage*(u.type==='wizard'?.65:.45),u.side);this._effect(target.x,target.y,u.type==='wizard'?'magic':'blast',u.side,0.45,55);}u.cooldown=d.attackTime;}}
      else {const committedApproach=this.map.commandFlights&&u.airRoute?.phase==='approach';const targetY=committedApproach||target.type==='base'&&Math.abs(target.x-u.x)>180?this.map.lanes[u.lane]:target.y;const targetX=committedApproach?worldX(this.map,u.side,AIR_ROUTE.gate):target.x;let dx=targetX-u.x,dy=targetY-u.y;const length=Math.hypot(dx,dy)||1;pendingMoves.push([u,clamp(u.x+dx/length*d.speed*dt,75,this.map.width-75),clamp(u.y+dy/length*d.speed*dt,180,720)]);}
    }
    for(const [unit,x,y] of pendingMoves){unit.x=x;unit.y=y;}
    for(const base of s.bases){
      base.cooldown=Math.max(-1,base.cooldown-dt);base.hit=Math.max(0,(base.hit||0)-dt);base.attack=Math.max(0,(base.attack||0)-dt);
      const nearby=s.units.filter(u=>u.side!==base.side&&Math.hypot(u.x-base.x,u.y-base.y)<310).sort((a,b)=>Math.hypot(a.x-base.x,a.y-base.y)-Math.hypot(b.x-base.x,b.y-base.y));
      if(base.cooldown<=0&&nearby[0]){this._fire(base,nearby[0],s.overtime?18:32,'tower');base.cooldown=1.15;}
    }
    const pendingDamage=this.damageQueue;this.damageQueue=null;for(const hit of pendingDamage)this._damage(...hit);
    s.units=s.units.filter(u=>u.hp>0);s.buildings=s.buildings.filter(b=>b.hp>0);
    if(s.units.length){const left=s.units.filter(u=>u.side===0),right=s.units.filter(u=>u.side===1);const a=left.length?Math.max(...left.map(u=>u.x)):110;const b=right.length?Math.min(...right.map(u=>u.x)):this.map.width-110;s.frontline=clamp((a+b)/2,110,this.map.width-110);}
    if(s.time>420){for(const b of s.bases)b.hp=Math.max(0,b.hp-dt*(20+(s.time-420)*0.3));}
    if(s.bases[0].hp<=0||s.bases[1].hp<=0){if(s.bases[0].hp===0&&s.bases[1].hp===0)s.winner='draw';else s.winner=s.bases[0].hp<=0?1:0;return;}
    if(this.ai){this.aiTimer-=dt;if(this.aiTimer<=0){this._ai();this.aiTimer=(this.difficulty==='easy'?14:this.difficulty==='hard'?3:5)+this.random()*3;}}
  }
  _ai(side=1){
    if(![0,1].includes(side)||this.state.winner!==null)return;
    const home=x=>homeX(this.map,side,x);
    // Keep Classic's original arithmetic even at adjacent floating-point values
    // in historical non-grid saves. New maps use explicit home distances.
    const legacyX=x=>side===1?x:3200-x;
    const near=(x,distance)=>this.map.id==='classic'?legacyX(x)>3200-distance:home(x)<distance;
    const screened=x=>this.map.id==='classic'?legacyX(x)<2650:home(x)>550;
    const s=this.state,hard=this.difficulty==='hard',easy=this.difficulty==='easy';
    // Honest economy, but stronger rivals react earlier and reinforce threatened lanes.
    const actions=easy?1:hard?3:2;
    for(let action=0;action<actions;action++){
      const own=s.buildings.filter(b=>b.side===side),enemy=s.buildings.filter(b=>b.side!==side);
      const count=t=>own.filter(b=>b.type===t).length;
      const lanes=this.map.lanes.map((_,lane)=>{
        const buildings=own.filter(b=>b.lane===lane),foes=s.units.filter(u=>u.side!==side&&u.lane===lane);
        const enemyProduction=enemy.filter(b=>b.lane===lane&&BUILDINGS[b.type].unit).length;
        const production=buildings.filter(b=>BUILDINGS[b.type].unit).length;
        // Normal's two-action opening must not count rear mine-row producers
        // as a nearby screen. Hard already fields three opening barracks.
        const coverage=this.difficulty==='normal'?buildings.filter(b=>BUILDINGS[b.type].unit&&screened(b.x)).length:production;
        return {lane,buildings,foes,production,enemyProduction,score:enemyProduction-coverage+foes.filter(u=>near(u.x,1550)).length*.35};
      }).sort((a,b)=>b.score-a.score||a.production-b.production||a.lane-b.lane);
      const target=lanes[0];let lane=target.lane,type='barracks';
      const local=t=>target.buildings.filter(b=>b.type===t).length;
      const pressure=target.foes.some(u=>near(u.x,1450))||target.enemyProduction>target.production;
      if(!easy&&s.time<5)type='barracks';
      else if(!easy&&target.foes.some(u=>UNITS[u.type].flying)&&local('archery')<2)type='archery';
      else if(!easy&&target.foes.some(u=>near(u.x,1250))&&local('watchtower')<1&&target.production>0)type='watchtower';
      else if(local('barracks')<1||(this.difficulty==='normal'&&!target.buildings.some(b=>b.type==='barracks'&&screened(b.x))))type='barracks';
      else if(enemy.some(b=>b.type==='watchtower'&&b.lane===lane)&&local('foundry')<1)type='foundry';
      else if(!easy&&target.foes.filter(u=>u.type==='warrior').length>=3&&local('sanctum')<1)type='sanctum';
      else if(local('archery')<local('barracks'))type='archery';
      else if(!pressure&&count('mint')<(hard?3:2)&&s.time>35&&s.time<220&&own.length>4){type='mint';lane=Math.floor(this.random()*this.map.lanes.length);}
      else if(s.time>90&&local('sanctum')<1)type='sanctum';
      else if(s.time>110&&local('aerie')<1&&!enemy.some(b=>b.lane===lane&&b.type==='watchtower'))type='aerie';
      else if(s.time>130&&local('foundry')<1)type='foundry';
      const xs=type==='mint'?[270,410,550]:easy?[690,830,550,970,410,1110,270,1250]:type==='watchtower'?[1250,1110,970,830,690]:[1250,1110,970,830,690,550,410,270];
      let built=false;
      // Search the other lanes when the preferred lane has no legal space.
      for(const candidate of [lane,...lanes.map(l=>l.lane).filter(l=>l!==lane)]){
        for(const x of xs)if(this.build(type,worldX(this.map,side,x),this.map.lanes[candidate],side).ok){built=true;break;}
        if(built)break;
      }
      // Save for the selected counter if it is still affordable in principle.
      // At a full frontier, spend only on upgrades we can actually afford.
      if(!built&&(own.length>=this.map.buildLimit||s.gold[side]>=BUILDINGS[type].cost)){
        const upgrades=own.filter(b=>b.level<3&&upgradeCost(b)<=s.gold[side])
          .sort((a,b)=>(a.lane!==lane)-(b.lane!==lane)||a.level-b.level||a.id-b.id);
        if(upgrades[0])this.upgrade(upgrades[0].id,side);
      }
      if(!built)break;
    }
    if(!easy&&s.gold[side]>=SPELL.cost){const enemies=s.units.filter(u=>u.side!==side&&near(u.x,1650));let target=null,best=hard?2:3;for(const u of enemies){const n=enemies.filter(e=>Math.hypot(e.x-u.x,e.y-u.y)<SPELL.radius).length;if(n>best){best=n;target=u;}}if(target)this.cast(target.x,target.y,side);}
  }
}

/** Strict save validation. Nothing is evaluated or merged into prototypes. */
function validateSave(data){
  const fail=message=>{throw new Error('Invalid saved game: '+message);};
  let nodes=0;
  const plain=(v,path,depth=0)=>{
    if(++nodes>30000||depth>8)fail('data is too large or deeply nested');
    if(v===null||typeof v==='boolean')return;
    if(typeof v==='number'){if(!Number.isFinite(v))fail(path+' must be finite');return;}
    if(typeof v==='string'){if(v.length>100)fail(path+' is too long');return;}
    if(typeof v!=='object')fail(path+' is not JSON-compatible');
    if(Array.isArray(v)){if(v.length>256)fail(path+' exceeds its size limit');}
    else if(Object.getPrototypeOf(v)!==Object.prototype&&Object.getPrototypeOf(v)!==null)fail(path+' must be a plain object');
    if(Object.keys(v).length>256)fail(path+' has too many fields');
    for(const key of Object.keys(v)){if(['__proto__','constructor','prototype'].includes(key))fail('unsafe property');plain(v[key],path+'.'+key,depth+1);}
  };
  plain(data,'save');
  const obj=(v,p)=>{if(!v||typeof v!=='object'||Array.isArray(v))fail(p+' must be an object');};
  const num=(v,a,b,p,integer=false)=>{if(typeof v!=='number'||!Number.isFinite(v)||v<a||v>b||(integer&&!Number.isInteger(v)))fail(p+' is outside its valid range');};
  const arr=(v,min,max,p)=>{if(!Array.isArray(v)||v.length<min||v.length>max)fail(p+' has an invalid length');};
  const pair=(v,p,integer=false,max=1e9)=>{arr(v,2,2,p);v.forEach(n=>num(n,0,max,p,integer));};
  obj(data,'save');if(![1,2,3,4].includes(data.version))fail('unsupported version');
  let map=MAPS.classic;
  if(data.version===1){if(Object.hasOwn(data,'mapId')||Object.hasOwn(data,'mapRevision'))fail('version 1 cannot contain map identity');}
  else {
    if(typeof data.mapId!=='string'||!Object.hasOwn(MAPS,data.mapId)||data.mapId==='classic')fail('unknown battlefield');
    if(data.version===4){if(!MAPS[data.mapId].commandFlights||data.ruleset!=='lane-command-1')fail('unknown command ruleset');}
    else if(data.version===3){if(!MAPS[data.mapId].experimental||MAPS[data.mapId].commandFlights||data.ruleset!=='lane-lab-1')fail('unknown lab ruleset');}
    else if(MAPS[data.mapId].experimental)fail('lab battlefield requires version 3');
    map=MAPS[data.mapId];if(data.mapRevision!==map.revision)fail('unsupported battlefield revision');
    const fields=[...(data.version>=3?['ruleset']:[]),'version','mapId','mapRevision','difficulty','seed','ai','nextId','aiTimer','accumulator','tick','state'];
    if(Object.keys(data).some(key=>!fields.includes(key)))fail('unknown version 2 field');
  }
  if(!['easy','normal','hard'].includes(data.difficulty))fail('unknown difficulty');
  if(typeof data.ai!=='boolean')fail('ai must be boolean');
  num(data.seed,0,4294967295,'seed',true);num(data.nextId,1,1e9,'nextId',true);num(data.tick,0,1e7,'tick',true);
  num(data.aiTimer,-1,30,'aiTimer');num(data.accumulator,0,.251,'accumulator');
  const s=data.state;obj(s,'state');num(s.time,0,10000,'time');pair(s.gold,'gold');pair(s.income,'income',false,20);pair(s.spellCooldown,'spellCooldown',false,SPELL.cooldown);
  if(![null,0,1,'draw'].includes(s.winner))fail('unknown winner');if(typeof s.overtime!=='boolean')fail('overtime must be boolean');num(s.frontline,110,map.width-110,'frontline');
  obj(s.stats,'stats');pair(s.stats.kills,'kills',true);pair(s.stats.built,'built',true);pair(s.stats.damage,'damage');
  arr(s.bases,2,2,'bases');arr(s.buildings,0,map.buildLimit*2,'buildings');arr(s.units,0,140,'units');arr(s.effects,0,256,'effects');arr(s.projectiles,0,256,'projectiles');
  const ids=new Set(),occupiedSites=new Set();
  function entity(e,p){obj(e,p);num(e.side,0,1,p+'.side',true);num(e.x,0,map.width,p+'.x');num(e.y,0,map.height,p+'.y');num(e.maxHp,1,10000,p+'.maxHp');num(e.hp,0,e.maxHp,p+'.hp');if(e.hit!==undefined)num(e.hit,0,1,p+'.hit');if(e.attack!==undefined)num(e.attack,0,1,p+'.attack');}
  s.bases.forEach((b,i)=>{entity(b,'base');if(b.type!=='base'||b.side!==i||b.id!=='base'+i||b.maxHp!==6000||b.x!==(i?map.width-110:110)||b.y!==450)fail('invalid base');num(b.cooldown,-1,2,'base.cooldown');});
  for(const [kind,entities,types] of [['building',s.buildings,BUILDINGS],['unit',s.units,UNITS]])for(const e of entities){
    entity(e,kind);if(typeof e.type!=='string'||!Object.hasOwn(types,e.type))fail('unknown '+kind+' type');num(e.id,1,data.nextId-1,kind+'.id',true);if(ids.has(e.id))fail('duplicate entity id');ids.add(e.id);
    num(e.lane,0,map.lanes.length-1,kind+'.lane',true);num(e.level,1,3,kind+'.level',true);num(e.cooldown,-1,20,kind+'.cooldown');
    const maxHp=types[e.type].hp*(1+(kind==='building'?.4:.12)*(e.level-1));if(Math.abs(e.maxHp-maxHp)>.001)fail(kind+' health does not match its level');
    if(kind==='building'){if(map.commandFlights&&e.type==='aerie'){num(e.flightPlan,0,map.lanes.length-1,'flightPlan',true);if(Math.abs(e.flightPlan-e.lane)>1)fail('flight plan is not adjacent');}else if(map.commandFlights&&e.flightPlan!==undefined)fail('unexpected flight plan');num(e.progress,0,1,'progress');num(e.invested,types[e.type].cost,2000,'invested');const bounds=buildBounds(map,e.side);num(e.x,bounds.minX,bounds.maxX,'building.x');num(e.y,bounds.minY,bounds.maxY,'building.y');if(e.lane!==laneFor(map,e.y))fail('building lane does not match position');if(map.id!=='classic'){if(!isBuildSite(map,e.side,e.x,e.y))fail('building is not on an owned site');const site=e.side+':'+e.x+':'+e.y;if(occupiedSites.has(site))fail('duplicate occupied building site');occupiedSites.add(site);}}
    else {if(e.flying!==types[e.type].flying)fail('unit flight does not match its type');num(e.attack,0,1,'unit.attack');num(e.x,75,map.width-75,'unit.x');num(e.y,180,720,'unit.y');validateAirRoute(e);}
  }
  function validateAirRoute(u){
    const r=u.airRoute,eligible=u.type==='gryphon'&&(map.commandFlights?r!==undefined:map.airRoutes?.[r?.from??u.lane]!=null);
    if(!eligible){if(r!==undefined)fail('unexpected air route');return;}
    obj(r,'airRoute');
    if(Object.keys(r).length!==4||Object.keys(r).some(k=>!['from','to','phase','remaining'].includes(k)))fail('unknown air route field');
    num(r.from,0,map.lanes.length-1,'airRoute.from',true);num(r.to,0,map.lanes.length-1,'airRoute.to',true);
    if(map.commandFlights?Math.abs(r.from-r.to)!==1:map.airRoutes[r.from]!==r.to)fail('air route does not match battlefield');
    if(!['approach','warning','transit','done'].includes(r.phase))fail('unknown air route phase');
    num(r.remaining,0,AIR_ROUTE.warning,'airRoute.remaining');
    if(u.lane!==(r.phase==='done'?r.to:r.from))fail('air route lane mismatch');
    if(r.phase==='approach'&&r.remaining!==AIR_ROUTE.warning)fail('approach timer mismatch');
    if(['transit','done'].includes(r.phase)&&r.remaining!==0)fail('completed warning timer mismatch');
    const h=homeX(map,u.side,u.x);
    if(r.phase==='approach'&&h>AIR_ROUTE.gate+AIR_ROUTE.speed*.05+.001)fail('approach is beyond gateway');
    if(['warning','transit'].includes(r.phase)&&Math.abs(h-AIR_ROUTE.gate)>AIR_ROUTE.speed*.05+.001)fail('air route is outside gateway');
    if(r.phase!=='done'&&(u.y<Math.min(map.lanes[r.from],map.lanes[r.to])-16.001||u.y>Math.max(map.lanes[r.from],map.lanes[r.to])+16.001))fail('air route position mismatch');
  }
  for(let side=0;side<2;side++){if(s.units.filter(u=>u.side===side).length>70||s.buildings.filter(b=>b.side===side).length>map.buildLimit||s.buildings.filter(b=>b.side===side&&b.type==='mint').length>3)fail('per-side entity limit exceeded');}
  for(const e of s.effects){obj(e,'effect');if(!['build','upgrade','sell','spawn','death','hit','blast','magic','volley'].includes(e.type))fail('unknown effect');num(e.side,0,1,'effect.side',true);num(e.x,0,map.width,'effect.x');num(e.y,0,map.height,'effect.y');num(e.maxLife,.01,2,'effect.maxLife');num(e.life,0,e.maxLife,'effect.life');num(e.radius,0,200,'effect.radius');}
  for(const p of s.projectiles){obj(p,'projectile');for(const field of ['sourceAir','targetAir'])if(p[field]!==undefined&&typeof p[field]!=='boolean')fail('projectile flight flags must be boolean');if(!['archer','siege','wizard','gryphon','tower'].includes(p.type))fail('unknown projectile');num(p.side,0,1,'projectile.side',true);for(const k of ['x','sx','tx'])num(p[k],0,map.width,'projectile.'+k);for(const k of ['y','sy','ty'])num(p[k],0,map.height,'projectile.'+k);num(p.maxLife,.01,1,'projectile.maxLife');num(p.life,0,p.maxLife,'projectile.life');}
  if(s.winner==='draw'&&s.bases.some(b=>b.hp>0))fail('draw requires both cores to be destroyed');
  if(typeof s.winner==='number'&&s.bases[1-s.winner].hp>0)fail('winner has not destroyed the opposing base');
  return map;
}
