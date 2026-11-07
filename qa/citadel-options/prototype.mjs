import {Game, MAPS, validateEngineFields} from '../../dist/engine.js';
export const CONTRACT=Object.freeze({id:'qa-citadel-options-v1',cost:190,atTick:1800,shotMultiplier:1.25,extraMultiplier:.5,regenRate:3,regenDelay:8});
export const KINDS=Object.freeze(['shot','regen','arrows']);
const ALLOWED=['frontier-air-local-open','frontier-air-local-timed'];
const fail=()=>{throw Error('Invalid experimental citadel option snapshot');};
const keys=(v,ks)=>{if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).length!==ks.length||ks.some(k=>!Object.hasOwn(v,k)))fail();};
const num=(v,min,max)=>{if(!Number.isFinite(v)||v<min||v>max)fail();};
export class OptionGame extends Game {
  constructor({optionsEnabled=false,...opts}={}){
    super(opts);if(typeof optionsEnabled!=='boolean')fail();
    if(optionsEnabled&&(!ALLOWED.includes(this.ruleset.id)||!Object.hasOwn(MAPS,this.map.id)))fail();
    this.optionsEnabled=optionsEnabled;this.purchases=[null,null];this.lastBaseDamage=[null,null];
  }
  purchase(kind,side=0){
    const no=code=>({ok:false,code});
    if(!this.optionsEnabled)return no('disabled');
    if(!KINDS.includes(kind)||![0,1].includes(side))return no('invalid-choice');
    if(this.limitReason)return no('save-safety-limit');
    if(this.state.winner!==null||this.state.bases.some(b=>b.hp<=0))return no('ended-or-dead');
    if(this.purchases[side])return no('already-used');
    if(this.tick<1800||this.state.time<90-1e-8)return no('too-early');
    if(this.state.gold[side]<190)return no('insufficient-gold');
    this.purchases[side]={kind,time:this.state.time,tick:this.tick,goldBefore:this.state.gold[side],hpBefore:this.state.bases[side].hp,healed:0};
    this.state.gold[side]-=190;return {ok:true,cost:190};
  }
  _baseShot(attacker,target,damage,extra=false){return super._fire(attacker,target,damage,'tower');}
  _fire(attacker,target,damage,type){
    if(attacker.type!=='base')return super._fire(attacker,target,damage,type);
    const kind=this.purchases[attacker.side]?.kind;
    this._baseShot(attacker,target,kind==='shot'?damage*1.25:damage,false);
    if(kind==='arrows'){
      const second=this.state.units.filter(u=>u!==target&&u.side!==attacker.side&&u.hp>0&&Math.hypot(u.x-attacker.x,u.y-attacker.y)<310)
        .sort((a,b)=>Math.hypot(a.x-attacker.x,a.y-attacker.y)-Math.hypot(b.x-attacker.x,b.y-attacker.y)||a.id-b.id)[0];
      if(second)this._baseShot(attacker,second,damage*.5,true);
    }
  }
  _damage(target,amount,side){
    const before=target.hp,queued=!!this.damageQueue;
    super._damage(target,amount,side);
    if(!queued&&target.type==='base'&&target.hp<before)this.lastBaseDamage[target.side]=this.state.time;
  }
  _step(dt){
    super._step(dt);
    if(this.state.winner!==null||this.limitReason||(this.ruleset.endgame.forcedDecay&&this.state.time>=420-1e-8))return;
    for(const side of [0,1]){
      const p=this.purchases[side],b=this.state.bases[side];
      if(p?.kind!=='regen'||b.hp<=0)continue;
      const start=Math.max(p.time,this.lastBaseDamage[side]??0)+8;
      if(this.state.time-dt<start-1e-8)continue;
      const heal=Math.min(3*dt,b.maxHp-b.hp);
      b.hp+=heal;p.healed+=heal;
    }
  }
  snapshot(){return structuredClone({experiment:CONTRACT.id,enabled:this.optionsEnabled,purchases:this.purchases,lastBaseDamage:this.lastBaseDamage,engine:super.serialize()});}
  static restoreSnapshot(s){
    keys(s,['experiment','enabled','purchases','lastBaseDamage','engine']);
    if(s.experiment!==CONTRACT.id||typeof s.enabled!=='boolean'||!Array.isArray(s.purchases)||s.purchases.length!==2||!Array.isArray(s.lastBaseDamage)||s.lastBaseDamage.length!==2)fail();
    validateEngineFields(s.engine);Game.restore(s.engine);
    if(s.enabled&&(!ALLOWED.includes(s.engine.rulesetId)||!Object.hasOwn(MAPS,s.engine.mapId)))fail();
    for(const side of [0,1]){
      const p=s.purchases[side];if(s.lastBaseDamage[side]!==null)num(s.lastBaseDamage[side],0,s.engine.state.time);
      if(p!==null){
        if(!s.enabled)fail();keys(p,['kind','time','tick','goldBefore','hpBefore','healed']);
        if(!KINDS.includes(p.kind))fail();num(p.time,90-1e-8,s.engine.state.time);num(p.tick,1800,s.engine.tick);
        if(!Number.isInteger(p.tick)||Math.abs(p.time-p.tick*.05)>1e-4)fail();
        num(p.goldBefore,190,1e12);num(p.hpBefore,Number.MIN_VALUE,6000);num(p.healed,0,p.kind==='regen'?1e12:0);
        if(p.kind==='regen'&&p.healed>Math.max(0,s.engine.state.time-p.time-8)*3+1e-5)fail();
      }
    }
    const e=s.engine,g=new OptionGame({optionsEnabled:s.enabled,difficulty:e.difficulty,ai:e.ai,seed:e.seed,mapId:e.mapId,rulesetId:e.rulesetId});
    for(const k of ['difficulty','seed','ai','nextId','aiTimer','accumulator','tick','state'])g[k]=structuredClone(e[k]);
    g.purchases=structuredClone(s.purchases);g.lastBaseDamage=structuredClone(s.lastBaseDamage);return g;
  }
}
