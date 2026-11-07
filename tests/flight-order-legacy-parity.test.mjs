/** Frozen v0.15 oracle: adding flight identities cannot reinterpret existing simulations. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { Game, MAPS, INTRO_MAPS, RULESETS, buildSites, validateEngineFields } from '../dist/engine.js';
import { Game as FrozenGame } from './fixtures/flight-baseline-v015/engine.js';
import { RULESETS as FrozenRules } from './fixtures/flight-baseline-v015/rulesets.js';
import { decodeBattle } from '../dist/battle-codec.js';
const json=g=>JSON.stringify(g.serialize());
const equal=(a,b,label)=>assert.equal(json(a),json(b),label);
function paidActions(g,index){
  const results=[];for(const side of [0,1]){
    const types=Object.keys(g.buildings),type=types[index%types.length];
    for(const site of buildSites(g.map,side)){const result=g.build(type,site.x,site.y,side);results.push(result);if(result.ok)break;}
    const b=g.state.buildings.find(b=>b.side===side&&b.level<3);if(index%3===0&&b)results.push(g.upgrade(b.id,side));
    if(index%5===3){const target=g.state.units.find(u=>u.side!==side);if(target)results.push(g.cast(target.x,target.y,side));}
    if(index%7===4){const target=g.state.buildings.find(b=>b.side===side&&b.type==='mint');if(target)results.push(g.sell(target.id,side));}
  }return results;
}
const stripFlight=g=>{const saved=g.serialize();saved.rulesetId=saved.rulesetId.replace('frontier-flight-','frontier-rootwarden-');for(const b of saved.state.buildings)delete b.flightPlan;return saved;};

test('frozen immediate-predecessor engine/rules are independently pinned and unchanged',()=>{
  const hashes={'engine.js':'16320893e83d7819b3103117803845e061fdb79cbb8adc2a8e6e95d76ec168bf','rulesets.js':'d674b36b469ade51f50eeeb45fe6253c7828578524adf96f1903ad45b72f9785'};
  for(const [file,hash] of Object.entries(hashes))assert.equal(createHash('sha256').update(readFileSync(new URL('./fixtures/flight-baseline-v015/'+file,import.meta.url))).digest('hex'),hash);
  for(const [id,rules] of Object.entries(FrozenRules))assert.deepEqual(RULESETS[id],rules,id);
});

test('all six old identities × all maps × difficulties retain exact paid actions, AI, RNG, states and restores',()=>{
  let cohorts=0;
  for(const rulesetId of Object.keys(FrozenRules))for(const mapId of Object.keys({...MAPS,...INTRO_MAPS}))for(const difficulty of ['easy','normal','hard']){
    const restricted=['frontier-campaign-watch','frontier-campaign-fork'].includes(rulesetId);
    const options={rulesetId,mapId,difficulty,seed:958,ai:!restricted};let a=new Game(options),b=new FrozenGame(options);equal(a,b,'initial');
    for(let frame=0;frame<2400&&a.state.winner===null;frame++){
      if(frame%100===0)assert.deepEqual(paidActions(a,frame/100),paidActions(b,frame/100));
      const dt=frame%13===0?.017:frame%13===1?.083:.05;a.update(dt);b.update(dt);
      if(frame%50===0)equal(a,b,`${rulesetId}/${mapId}/${difficulty}/${frame}`);
      if(frame%401===0){const x=a.serialize(),y=b.serialize();a=Game.restore(y);b=FrozenGame.restore(x);equal(a,b,'cross-restored');}
    }
    equal(a,b,'final');cohorts++;
  }
  assert.equal(cohorts,90);
});

test('flight Hold preserves production movement/combat/RNG exactly against old full-roster counterparts',()=>{
  for(const mode of ['open','timed'])for(const mapId of Object.keys(MAPS)){
    const a=new Game({rulesetId:'frontier-flight-'+mode,mapId,ai:true,seed:71}),b=new FrozenGame({rulesetId:'frontier-rootwarden-'+mode,mapId,ai:true,seed:71});
    for(const g of [a,b]){g.state.gold=[2000,2000];for(const side of [0,1]){const sites=buildSites(g.map,side);for(const type of ['aerie','wardenLodge','archery','foundry'])for(const site of sites)if(g.build(type,site.x,site.y,side).ok)break;}}
    for(let frame=0;frame<4000&&a.state.winner===null;frame++){a.update(.05);b.update(.05);if(frame%40===0)assert.deepEqual(stripFlight(a),b.serialize(),`${mode}/${mapId}/${frame}`);}
    assert.deepEqual(stripFlight(a),b.serialize());assert.ok(a.state.units.every(u=>!Object.hasOwn(u,'airRoute')));
  }
});

test('raw legacy v1/v2 preserves unused historical route fields but never executes them; playable admission stays strict',()=>{
  for(const mapId of Object.keys(MAPS)){
    const old=new FrozenGame({mapId,ai:false});old.state.gold=[2000,2000];const site=buildSites(old.map,0).find(s=>s.lane===0);const b=old.build('aerie',site.x,site.y,0).building;old._spawn(b);const saved=old.serialize();saved.state.buildings.at(-1).flightPlan='historical unused JSON';saved.state.units[0].airRoute={from:0,to:1,phase:'transit',remaining:0};
    const a=Game.restore(saved),f=FrozenGame.restore(saved);equal(a,f,'legacy extra fields retained');assert.equal(a.serialize().version,mapId==='classic'?1:2);assert.throws(()=>validateEngineFields(saved));assert.throws(()=>decodeBattle(saved));
    for(let i=0;i<500;i++){a.update(.05);f.update(.05);if(i%20===0)equal(a,f,'old route ignored');}equal(a,f,'unused field parity');
    const explicit=new Game({rulesetId:'frontier-legacy',mapId,ai:false}).serialize();explicit.state.buildings[0].flightPlan=0;assert.throws(()=>Game.restore(explicit));
  }
});

test('all old identities preserve escalation, decay, long-counter guards and terminal state at boundaries',()=>{
  for(const rulesetId of Object.keys(FrozenRules))for(const mapId of Object.keys(MAPS))for(const time of [299.95,300,419.95,420,420.05]){
    const a=new Game({rulesetId,mapId,ai:false}),b=new FrozenGame({rulesetId,mapId,ai:false});for(const g of [a,b]){g.state.buildings=[];g.state.effects=[];g.state.time=time;g.state.overtime=time>=300;}
    for(let frame=0;frame<8;frame++){a.update(.05);b.update(.05);equal(a,b,'endgame edge');}
    if(a.ruleset.limits.headroom){for(const g of [a,b])g.state.gold[0]=g.ruleset.limits.maxCounter-g.ruleset.limits.headroom+1;assert.deepEqual(a.update(.05),b.update(.05));equal(a,b,'safety edge');}
  }
});
