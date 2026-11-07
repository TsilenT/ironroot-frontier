// Observation only. Gross spending and bounties are deliberately separate.
import assert from 'node:assert/strict';
const ledger=()=>({initial:420,base:0,mine:0,bounty:0,spent:0,refund:0,maxResidual:0});
const shotStats=()=>({primary:0,extra:0,damage:0,kills:0,byTarget:{}});
export function observe(g,prior){
  const m=prior?structuredClone(prior):{ledgers:[ledger(),ledger()],actions:[],firstDamage:[null,null],incoming:[{},{}],baseShots:[shotStats(),shotStats()],spawned:[0,0],damage:[0,0],decay:[0,0],trace:[]};
  g.metrics=m;let source=null;const pending=[];
  const audit=()=>{for(const side of [0,1]){const l=m.ledgers[side],expected=l.initial+l.base+l.mine+l.bounty+l.refund-l.spent;l.maxResidual=Math.max(l.maxResidual,Math.abs(expected-g.state.gold[side]));assert.ok(l.maxResidual<1e-6,`ledger ${side}: ${l.maxResidual}`);assert.ok(g.state.gold[side]>=0);}};
  for(const method of ['build','upgrade','sell','cast','purchase']){
    const original=g[method].bind(g);
    g[method]=(...args)=>{
      const side=args[method==='build'?3:method==='cast'?2:1]??0;
      if(![0,1].includes(side))return original(...args);
      const before={gold:g.state.gold[side],hp:g.state.bases[side].hp},bountyBefore=m.ledgers[side].bounty,oldSource=source;
      if(method==='cast')source={type:'volley'};
      const result=original(...args);source=oldSource;
      const after={gold:g.state.gold[side],hp:g.state.bases[side].hp},bounty=m.ledgers[side].bounty-bountyBefore;
      const gross=result.ok?before.gold-after.gold+bounty:0;
      if(result.ok){if(gross>=0)m.ledgers[side].spent+=gross;else m.ledgers[side].refund-=gross;if(method==='cast')assert.equal(gross,75);}
      if(result.ok||method==='purchase')m.actions.push({time:g.state.time,tick:g.tick,method,args,side,ok:result.ok,code:result.code??null,before,after,grossCost:Math.max(0,gross),refund:Math.max(0,-gross),immediateBounty:bounty,id:result.building?.id??null});
      audit();return result;
    };
  }
  const fire=g._fire.bind(g);
  g._fire=(attacker,target,damage,type)=>{const prev=source;source={type:attacker.type};const r=fire(attacker,target,damage,type);source=prev;return r;};
  const baseShot=g._baseShot.bind(g);
  g._baseShot=(a,t,d,extra)=>{
    const stats=m.baseShots[a.side];stats[extra?'extra':'primary']++;stats.byTarget[t.type]??={shots:0,extra:0,damage:0,kills:0};stats.byTarget[t.type].shots++;if(extra)stats.byTarget[t.type].extra++;
    return baseShot(a,t,d,extra);
  };
  const damage=g._damage.bind(g);
  g._damage=(target,amount,side)=>{
    if(g.damageQueue){const r=damage(target,amount,side);pending.push({target:target.id,amount,side,source});return r;}
    const hit=pending.length?pending.shift():{source};if(hit.target!==undefined){assert.equal(hit.target,target.id);assert.equal(hit.amount,amount);assert.equal(hit.side,side);}
    const hp=target.hp,kills=g.state.stats.kills[side],gold=g.state.gold[side];damage(target,amount,side);
    const dealt=hp-target.hp,bounty=g.state.gold[side]-gold;
    assert.equal(bounty,2*(g.state.stats.kills[side]-kills));m.ledgers[side].bounty+=bounty;
    if(target.type==='base'&&dealt>0){const s=target.side,type=hit.source?.type??'unknown';m.firstDamage[s]??=g.state.time;m.damage[s]+=dealt;m.incoming[s][type]=(m.incoming[s][type]??0)+dealt;}
    if(hit.source?.type==='base'){
      const b=m.baseShots[side];b.damage+=dealt;b.kills+=bounty/2;b.byTarget[target.type]??={shots:0,extra:0,damage:0,kills:0};b.byTarget[target.type].damage+=dealt;b.byTarget[target.type].kills+=bounty/2;
    }
  };
  const spawn=g._spawn.bind(g);g._spawn=b=>{const n=g.nextId;spawn(b);if(g.nextId>n)m.spawned[b.side]++;};
  const step=g._step.bind(g);g._step=dt=>{
    const hp=g.state.bases.map(b=>b.hp),damageBefore=[...m.damage],healed=g.purchases.map(p=>p?.healed??0);
    for(const s of [0,1]){m.ledgers[s].base+=5*dt;m.ledgers[s].mine+=dt*g.state.buildings.filter(b=>b.side===s&&b.type==='mint'&&b.hp>0).reduce((n,b)=>n+2.5*(1+.5*(b.level-1)),0);}
    step(dt);assert.equal(pending.length,0);
    for(const s of [0,1])m.decay[s]+=Math.max(0,hp[s]+(g.purchases[s]?.healed??0)-healed[s]-g.state.bases[s].hp-(m.damage[s]-damageBefore[s]));
    audit();
  };
  return g;
}
export function sample(g,label){return {label,time:g.state.time,tick:g.tick,hp:g.state.bases.map(b=>b.hp),gold:[...g.state.gold],healed:g.purchases.map(p=>p?.healed??0),kills:[...g.state.stats.kills],bounties:g.metrics.ledgers.map(l=>l.bounty),spent:g.metrics.ledgers.map(l=>l.spent),incoming:structuredClone(g.metrics.incoming),baseShots:structuredClone(g.metrics.baseShots),spawned:[...g.metrics.spawned],sides:[0,1].map(side=>({producers:g.state.buildings.filter(b=>b.side===side&&g.buildings[b.type].unit).map(b=>({id:b.id,type:b.type,hp:b.hp,level:b.level})),units:Object.fromEntries(Object.keys(g.units).map(t=>[t,g.state.units.filter(u=>u.side===side&&u.type===t).length])),mines:g.state.buildings.filter(b=>b.side===side&&b.type==='mint').length}))};}
