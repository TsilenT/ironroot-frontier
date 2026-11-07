// Experimental engine-only wrapper. Never imported by production code.
import {Game, MAPS, validateEngineFields} from '../../dist/engine.js';
export const CONTRACT = Object.freeze({id:'qa-citadel-190-600-90-v1',cost:190,hp:600,at:90,tick:1800});
const IDS = ['frontier-air-local-open','frontier-air-local-timed','frontier-bridge-open','frontier-bridge-timed'];
const fail = () => { throw new Error('Invalid experimental citadel snapshot'); };
function keys(o, fields) {
  if (!o || typeof o !== 'object' || Array.isArray(o) || Object.keys(o).length !== fields.length || fields.some(k=>!Object.hasOwn(o,k))) fail();
}
function number(v,min,max) { if (!Number.isFinite(v) || v < min || v > max) fail(); }
export class CitadelGame extends Game {
  constructor({reinforcement=false,...options}={}) {
    super(options);
    if (typeof reinforcement !== 'boolean') fail();
    if (reinforcement && (!IDS.includes(this.ruleset.id) || !Object.hasOwn(MAPS,this.map.id))) fail();
    this.reinforcement = reinforcement;
    this.reinforcementPurchases = [null,null];
  }
  reinforce(side=0) {
    const reject = code => ({ok:false,code});
    if (!this.reinforcement) return reject('disabled');
    if (side!==0 && side!==1) return reject('invalid-side');
    if (this.limitReason) return reject('save-safety-limit');
    if (this.state.winner!==null || this.state.bases.some(b=>b.hp<=0)) return reject('ended-or-dead');
    if (this.reinforcementPurchases[side]) return reject('already-used');
    if (this.tick<CONTRACT.tick || this.state.time<CONTRACT.at-1e-8) return reject('too-early');
    if (this.state.gold[side]<CONTRACT.cost) return reject('insufficient-gold');
    const base=this.state.bases[side];
    this.reinforcementPurchases[side]={time:this.state.time,tick:this.tick,hpBefore:base.hp,goldBefore:this.state.gold[side]};
    this.state.gold[side]-=CONTRACT.cost;
    base.hp+=CONTRACT.hp; base.maxHp+=CONTRACT.hp;
    return {ok:true,cost:CONTRACT.cost,hpAdded:CONTRACT.hp};
  }
  snapshot() {
    return structuredClone({experiment:CONTRACT.id,enabled:this.reinforcement,purchases:this.reinforcementPurchases,engine:super.serialize()});
  }
  static restoreSnapshot(data) {
    keys(data,['experiment','enabled','purchases','engine']);
    if (data.experiment!==CONTRACT.id || typeof data.enabled!=='boolean' || !Array.isArray(data.purchases) || data.purchases.length!==2) fail();
    const raw=data.engine;
    validateEngineFields(raw);
    if (data.enabled && (raw.version!==3 || !IDS.includes(raw.rulesetId) || !Object.hasOwn(MAPS,raw.mapId))) fail();
    for (const side of [0,1]) {
      const p=data.purchases[side],base=raw.state.bases[side];
      if(p!==null) {
        if(!data.enabled) fail();
        keys(p,['time','tick','hpBefore','goldBefore']);
        number(p.time,90-1e-8,raw.state.time);number(p.tick,1800,raw.tick);
        if(!Number.isInteger(p.tick) || Math.abs(p.time-p.tick*.05)>1e-4) fail();
        number(p.hpBefore,Number.MIN_VALUE,6000);number(p.goldBefore,190,1e12);
      }
      if(base.maxHp!==(p?6600:6000)) fail();
      number(base.hp,0,base.maxHp);
    }
    // Validate every ordinary field using the released strict codec. Only the
    // independently validated HP extension is normalized in this validation copy.
    const normalized=structuredClone(raw);
    for(const base of normalized.state.bases){base.maxHp=6000;base.hp=Math.min(base.hp,6000);}
    Game.restore(normalized);
    const g=new CitadelGame({reinforcement:data.enabled,difficulty:raw.difficulty,seed:raw.seed,ai:raw.ai,mapId:raw.mapId,rulesetId:raw.rulesetId});
    for(const key of ['difficulty','seed','ai','nextId','aiTimer','accumulator','tick','state'])g[key]=structuredClone(raw[key]);
    g.reinforcementPurchases=structuredClone(data.purchases);
    return g;
  }
}
