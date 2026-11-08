import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../../dist/engine.js';
import { supportsAutonomousAir } from '../../dist/autonomous-air.js';
import { createLastAscent, describeLastAscent, evaluateLastAscent, LAST_ASCENT_VARIANTS, LAST_ASCENT_RULESET } from './scenario.mjs';
import { createPolicy, POLICY_IDS } from './policies.mjs';
import { observeRun, runLastAscent } from './simulate.mjs';
const advance=(g,seconds,pilot)=>{for(let n=0;n<Math.round(seconds*20);n++){pilot?.step(g);g.update(.05);}};

for(const variant of Object.keys(LAST_ASCENT_VARIANTS))test(`${variant}: visible authoring, costs and ordinary engine save admission`,()=>{
  const game=createLastAscent({variant,seed:10}),d=describeLastAscent({variant});
  assert.equal(game.ruleset.id,LAST_ASCENT_RULESET);assert.equal(game.state.time,0);assert.equal(game.state.units.length,0);
  assert.equal(game.ai,true);assert.equal(game.ruleset.endgame.forcedDecay,false);assert.equal(game.ruleset.economy.policy,'legacy');
  assert.equal(Object.keys(game.buildings).length,8);assert.ok(supportsAutonomousAir(game.ruleset));
  assert.deepEqual(game.state.gold,d.startingGold);assert.deepEqual(game.state.bases.map(b=>b.hp),d.startingHealth);
  for(const side of [0,1]){
    assert.equal(game.state.buildings.filter(b=>b.side===side).reduce((n,b)=>n+b.invested,0),d.startingInvestment[side]);
    assert.equal(game.state.buildings.filter(b=>b.side===side).length,d.formations[side].length);
    assert.equal(game.state.income[side],d.startingIncome[side]);
  }
  assert.deepEqual(Game.restore(game.serialize()).serialize(),game.serialize());
  const clone=describeLastAscent({variant});clone.formations[0][0].home=999;assert.notEqual(describeLastAscent({variant}).formations[0][0].home,999);
  assert.match(d.warning,/5:00/);assert.match(d.warning,/censored stall/);
});

test('one HP wins, both dead draw, no campaign award or minimum health',()=>{
  const state=(player,enemy)=>({state:{bases:[{hp:player},{hp:enemy}]}});
  assert.equal(evaluateLastAscent(state(1,0)),'won');assert.equal(evaluateLastAscent(state(0,0)),'draw');
  assert.equal(evaluateLastAscent(state(0,1)),'lost');assert.equal(evaluateLastAscent(state(1,1)),'running');
});

test('unknown variant/policy and invalid seeds fail closed',()=>{
  assert.throws(()=>createLastAscent({variant:'invented'}));assert.throws(()=>createLastAscent({seed:-1}));
  assert.throws(()=>createPolicy('invented'));assert.equal(POLICY_IDS.length,8);
});

for(const variant of ['foothold','supply-road'])for(const policy of ['supported-race','screened-siege','warden-ranged','economy-first','air-heavy','adaptive-defense'])test(`${variant}/${policy}: save/restore resumes the same paid decision stream`,()=>{
  const a=createLastAscent({variant,seed:101}),p=createPolicy(policy);advance(a,32,p);
  const b=Game.restore(a.serialize()),q=createPolicy(policy,{state:p.serialize()});assert.deepEqual(b.serialize(),a.serialize());
  advance(a,30,p);advance(b,30,q);assert.deepEqual(b.serialize(),a.serialize());assert.deepEqual(q.serialize(),p.serialize());
});

test('telemetry does not change combat and both gold ledgers close, including volley kill gold',()=>{
  const a=createLastAscent({variant:'foothold',seed:303}),b=createLastAscent({variant:'foothold',seed:303});
  const p=createPolicy('screened-siege'),q=createPolicy('screened-siege'),o=observeRun(b,{variant:'foothold'});
  for(let n=0;n<2200;n++){if(evaluateLastAscent(a)!=='running')break;p.step(a);a.update(.05);q.step(b);o.beforeStep();b.update(.05);o.afterStep();}
  assert.deepEqual(b.serialize(),a.serialize());assert.ok(o.result.ledgerMaxError.every(e=>e<1e-6));
});

// The following are isolated mechanics fixtures, never part of a paid run.
test('destroying actual mines removes income, leaves baseline and existing factory spawns',()=>{
  const intact=createLastAscent({variant:'foothold',seed:101}),cut=Game.restore(intact.serialize());
  intact.ai=false;cut.ai=false; // Isolate income from purchase decisions for this fixture only.
  const mines=cut.state.buildings.filter(b=>b.side===1&&b.type==='mint');
  for(const mine of mines)cut._damage(mine,mine.hp,0);
  const initial=intact.state.gold[1];advance(intact,4);advance(cut,4);
  assert.ok(Math.abs(intact.state.gold[1]-initial-50)<1e-6);
  assert.ok(Math.abs(cut.state.gold[1]-initial-20)<1e-6);
  assert.equal(cut.state.income[1],5);assert.equal(cut.state.buildings.filter(b=>b.side===1&&b.type==='mint').length,0);
  assert.ok(cut.state.units.filter(u=>u.side===1).length>0);
});

test('automatic flyers reject flight orders; citadel choices have an ordinary price and no instant heal',()=>{
  const g=createLastAscent({variant:'foothold'}),a=g.build('aerie',1250,260,0);assert.ok(a.ok);
  assert.equal(g.setFlightPlan(a.building.id,1,0).ok,false);
  const hp=g.state.bases[0].hp,gold=g.state.gold[0];assert.ok(g.buyCitadelOption('regen').ok);
  assert.equal(g.state.gold[0],gold-190);assert.equal(g.state.bases[0].hp,hp);assert.equal(g.buyCitadelOption('arrows').ok,false);
});

test('existing escalation is retained at 300 seconds without forced health drain or test-cap defeat',()=>{
  const g=new Game({rulesetId:LAST_ASCENT_RULESET,ai:false});g.state.buildings=[];
  advance(g,300);assert.equal(g.state.overtime,true);
  assert.equal(g.ruleset.endgame.productionMultiplier,1.65);assert.equal(g.ruleset.endgame.structureDamageMultiplier,1.75);
  assert.equal(g.ruleset.endgame.escalatedBaseDamage,18);advance(g,140);
  assert.deepEqual(g.state.bases.map(b=>b.hp),[6000,6000]);assert.equal(evaluateLastAscent(g),'running');
  const run=runLastAscent({variant:'foothold',policy:'idle',seed:101,cap:1});assert.equal(run.outcome,'stall');assert.equal(run.censored,true);
});

// Replays the held-out outcomes only as regression checks, not further tuning.
for(const [policy,duration,hp] of [['distributed-cheap',123.1,3800],['economy-first',137.15,2510]])test(`${policy}: frozen held-out route remains paid and reproducible`,()=>{
  const r=runLastAscent({variant:'supply-road',policy,seed:505});
  assert.equal(r.outcome,'won');assert.equal(r.duration,duration);assert.equal(r.finalHP[0],hp);
  assert.deepEqual(r.ledgerMaxError,[0,0]);assert.ok(r.minimumMineFundedSpending[1]>600);
  assert.ok(r.mineLossConsequences.length>0);assert.ok(r.purchases.every(p=>p.cost>=0));
});
