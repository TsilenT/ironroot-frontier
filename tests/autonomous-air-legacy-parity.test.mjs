/** Independently pinned live predecessor, including its manual-order saves. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { Game, MAPS, INTRO_MAPS, RULESETS, buildSites } from '../dist/engine.js';
import { supportsFog } from '../dist/fog.js';
import { Game as FrozenGame } from './fixtures/autonomous-air-baseline/engine.js';
import { RULESETS as FrozenRules } from './fixtures/autonomous-air-baseline/rulesets.js';
const serialized=g=>JSON.stringify(g.serialize());
function paid(g,index){const results=[];for(const side of [0,1]){const type=Object.keys(g.buildings)[index%Object.keys(g.buildings).length];for(const site of [...buildSites(g.map,side)].reverse()){const result=g.build(type,site.x,site.y,side);results.push(result);if(result.ok){if(type==='aerie'&&g.ruleset.movement.policy==='flight-orders-v1')results.push(g.setFlightPlan(result.building.id,Math.max(0,result.building.lane-1),side));break;}}if(index%3===0){const b=g.state.buildings.find(b=>b.side===side&&b.level<3);if(b)results.push(g.upgrade(b.id,side));}if(index%5===2){const u=g.state.units.find(u=>u.side!==side);if(u)results.push(g.cast(u.x,u.y,side));}}return results;}

test('frozen live precursor includes unchanged route helpers and all nine rule identities',()=>{
  const hashes={'engine.js':'548f1b67763e710aad5d1e1a7e70a1e39c4d93eddd3b47daf68a2b385b823168','rulesets.js':'9fa81aace334850fbe92f354e04fb3560dfb69419a9539bbb6d89534a9f6727d','flight-orders.js':'b69738dcd49ff416191a1c0d0f9f3170f1191b27c16235075ea6b7237815d196'};
  for(const [file,hash] of Object.entries(hashes))assert.equal(createHash('sha256').update(readFileSync(new URL('./fixtures/autonomous-air-baseline/'+file,import.meta.url))).digest('hex'),hash);
  for(const [id,rules] of Object.entries(FrozenRules))assert.deepEqual(RULESETS[id],rules);
  const citadelGate='    if(supportsCitadelOptions(this.ruleset)){const choice=chooseAICitadelOption(this,side);if(choice)this.buyCitadelOption(choice,side);}'+'\n';
  // Normalize only reviewed, exact fog additions. Every literal must occur once;
  // unexpected AI edits still fail the unchanged predecessor source oracle below.
  const fogPrelude=`    const observation=supportsFog(this.ruleset)?observe(this,side):null;
    const strategyEnemies=observation?[...observation.state.buildings.filter(b=>b.side!==side),...observation.fog.memories]:null;
`;
  const fogCitadelGate=`    if(supportsCitadelOptions(this.ruleset)){
      let choice=null;
      if(!observation)choice=chooseAICitadelOption(this,side);
      // Eligibility is an authoritative action guard; the choice uses only own state and contacts.
      else if(this.canBuyCitadelOption('arrows',side).ok){
        const ownBase=observation.state.bases[side],record=observation.state.citadelOptions.sides[side];
        if(observation.state.units.filter(u=>u.side!==side&&u.hp>0&&Math.hypot(u.x-ownBase.x,u.y-ownBase.y)<310).length>=2)choice='arrows';
        else if(ownBase.maxHp-ownBase.hp>=150&&(record.lastDamageAt===null||this.state.time>=record.lastDamageAt+this.ruleset.citadel.regenDelay-1e-8))choice='regen';
      }
      if(choice)this.buyCitadelOption(choice,side);
    }
`;
  const fogTransforms=[
    ['observation prelude',fogPrelude,''],
    ['observation-aware citadel choice',fogCitadelGate,citadelGate],
    ['observed troops',"    const s=observation?{...this.state,units:observation.state.units}:this.state,hard=this.difficulty==='hard',easy=this.difficulty==='easy';","    const s=this.state,hard=this.difficulty==='hard',easy=this.difficulty==='easy';"],
    ['observed structures',"      const own=s.buildings.filter(b=>b.side===side),enemy=strategyEnemies??s.buildings.filter(b=>b.side!==side);","      const own=s.buildings.filter(b=>b.side===side),enemy=s.buildings.filter(b=>b.side!==side);"]
  ];
  let aiSource=Game.prototype._ai.toString();
  for(const [label,before,after] of fogTransforms){assert.equal(aiSource.split(before).length,2,`exactly one reviewed fog ${label}`);aiSource=aiSource.replace(before,after);}
  assert.ok(Object.values(FrozenRules).every(r=>!supportsFog(r)),'the observation branches are unreachable in every frozen identity');
  assert.ok(Object.keys(FrozenRules).every(id=>!supportsFog(RULESETS[id])),'current bindings of frozen identities cannot enable fog');
  assert.equal(aiSource.split(citadelGate).length,2,'exactly one new ruleset-gated citadel purchase precedes ordinary AI spending');
  assert.ok(Object.values(FrozenRules).every(r=>r.citadel===undefined),'the citadel branch is unreachable in every frozen identity');
  assert.equal(aiSource.replace(citadelGate,''),FrozenGame.prototype._ai.toString(),'all ordinary AI source remains exact after removing only the new gated purchase');
  const fallback=FrozenGame.prototype._step.toString().split('\n').find(line=>line.includes('else {const targetY='));
  assert.ok(Game.prototype._step.toString().includes(fallback),'fallback movement preserves exact floating-point evaluation order');
});

test('all nine prior identities × five maps × three difficulties preserve exact actions, AI, movement, RNG and cross-restores',()=>{
  let cohorts=0;
  for(const rulesetId of Object.keys(FrozenRules))for(const mapId of Object.keys({...MAPS,...INTRO_MAPS}))for(const difficulty of ['easy','normal','hard']){
    const options={rulesetId,mapId,difficulty,seed:958,ai:!['frontier-campaign-watch','frontier-campaign-fork'].includes(rulesetId)};
    let a=new Game(options),b=new FrozenGame(options);for(const g of [a,b])g.state.gold=[5000,5000];assert.equal(serialized(a),serialized(b));
    for(let frame=0;frame<900&&a.state.winner===null;frame++){
      if(frame%70===0)assert.deepEqual(paid(a,frame/70),paid(b,frame/70));
      const dt=frame%13===0?.017:frame%13===1?.083:.05;a.update(dt);b.update(dt);
      if(frame%30===0)assert.equal(serialized(a),serialized(b),`${rulesetId}/${mapId}/${difficulty}/${frame}`);
      if(frame%201===0){const x=a.serialize(),y=b.serialize();a=Game.restore(y);b=FrozenGame.restore(x);}
    }
    assert.equal(serialized(a),serialized(b));cohorts++;
  }
  assert.equal(cohorts,135);
});
