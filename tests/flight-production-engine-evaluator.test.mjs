/** Production tactical harness checks; authored forces are not skirmish win-rate claims. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,buildSites} from '../dist/engine.js';
import {createScenario,respond,createResponseMemory} from '../qa/flight-production-engine/scenarios.js';
import {evaluate,SPREAD_SEEDS,PROTOTYPE_MAP_MAPPING} from '../qa/flight-production-engine/evaluation.mjs';
const spec={cohort:'test',mapId:'classic',scenarioId:'open-supply',response:'none',seed:51001,playerSide:0,plan:'north'};

test('prototype cohort keeps exact four seeds, map correspondence, paid setup and legal site positions',()=>{
  assert.deepEqual(SPREAD_SEEDS,[51001,3052302604,4010181097,2367780941]);assert.deepEqual(PROTOTYPE_MAP_MAPPING,{'command-two-roads':'twin-span','command-three-roads':'classic'});
  for(const mapId of ['classic','long-march','twin-span'])for(const side of [0,1])for(const scenario of ['open-supply','pressed-road','baited-supply']){
    const s=createScenario(scenario,{mapId,side}),g=s.game;assert.equal(g.ruleset.id,'frontier-flight-open');assert.equal(g.ruleset.units.rootwarden.hp,800);assert.deepEqual(g.state.gold,[420,420]);assert.equal(s.initialInvestment[side],955);assert.equal(g.ai,false);assert.equal(s.horizon,110);
    for(const b of g.state.buildings)assert.ok(buildSites(g.map,b.side).some(p=>p.x===b.x&&p.y===b.y));assert.doesNotThrow(()=>Game.restore(g.serialize()));
  }
});

test('scripted defenders see only launched orders and retain legal gross costs independently of bounties',()=>{
  for(const policy of ['destination-archery','destination-tower','origin-archery','rally']){
    const s=createScenario('open-supply'),g=s.game,m=createResponseMemory();for(const id of s.aerieIds)g.setFlightPlan(id,0);const before=g.serialize();assert.equal(respond(g,1,policy,m),null);assert.deepEqual(g.serialize(),before);
    for(let i=0;i<40;i++)g.update(.05);if(policy==='rally')for(const u of g.state.units.filter(u=>u.side===0&&u.type==='gryphon'))g._damage(u,u.hp-1,1);
    const action=respond(g,1,policy,m);assert.ok(action);assert.equal(action.cost,policy==='rally'?75:policy==='destination-tower'?220:175);assert.equal(m.spend,action.cost);if(policy==='rally')assert.ok(action.netGoldDelta<action.cost);else{const b=g.state.buildings.find(b=>b.id===action.buildingId);assert.ok(buildSites(g.map,1).some(p=>p.x===b.x&&p.y===b.y));}
  }
});

test('production exposed raids and pressured-road losses survive the port rather than being tuned away',()=>{
  const exposed=evaluate(spec),pressed=evaluate({...spec,scenarioId:'pressed-road'}),hold=evaluate({...spec,scenarioId:'pressed-road',plan:'hold'});
  assert.equal(exposed.offRoadSupplyDamage,380);assert.equal(exposed.ownCitadelHp,6000);assert.equal(pressed.offRoadSupplyDamage,380);assert.equal(pressed.ownCitadelHp,0);assert.equal(hold.ownCitadelHp,6000);assert.equal(pressed.screen[0].remainingHp,0);assert.equal(pressed.playerLiveSpend,0);assert.equal(pressed.attackerReinforcementSpend,0);assert.equal(pressed.continuationChecks,5);
});

test('shared Long March geometry delays warning and ordinary paid destination archery denies supply',()=>{
  const classic=evaluate(spec),long=evaluate({...spec,mapId:'long-march'}),counter=evaluate({...spec,mapId:'long-march',response:'destination-archery'});
  assert.ok(Math.abs((long.firstWaves[0].warning-classic.firstWaves[0].warning)-400/84)<.1);assert.equal(counter.offRoadSupplyDamage,0);assert.equal(counter.defenderLiveSpend,350);assert.equal(counter.firstResponseDelayFromLaunch,.75);assert.ok(counter.firstResponseDelayFromWarning<0);assert.ok(counter.waves.firstDamagePhases.transit>0);assert.equal(counter.continuationChecks,5);
});

test('Rootwarden/paid-attacker native Normal and Hard extensions pay for real actions, persist cadence and keep adverse outcomes',()=>{
  for(const difficulty of ['normal','hard'])for(const playerSide of [0,1]){
    const r=evaluate({...spec,scenarioId:'pressed-road',response:'native-ai',rootwarden:true,paidReinforcements:true,nativeAI:true,difficulty,playerSide,horizon:180});
    assert.equal(r.initialInvestment[playerSide],1025);assert.ok(r.attackerReinforcementSpend>=385);assert.ok(r.defenderLiveSpend>0);assert.ok(r.aiDecisions.length>0);assert.ok(r.aiDecisions.every(d=>d.side===1-playerSide));assert.ok(r.aiDecisions.some(d=>d.committedThreats.length));assert.equal(r.ownCitadelHp,0);assert.equal(r.continuationChecks,5);assert.equal(r.defenderLiveSpend,r.paidActions.filter(a=>a.side!==playerSide).reduce((sum,a)=>sum+a.cost,0));assert.equal(r.attackerReinforcementSpend,r.paidActions.filter(a=>a.side===playerSide).reduce((sum,a)=>sum+a.cost,0));assert.ok(r.paidActions.every(a=>a.cost>0));
    for(let i=1;i<r.aiDecisions.length;i++){const spacing=r.aiDecisions[i].time-r.aiDecisions[i-1].time;assert.ok(spacing>=(difficulty==='hard'?3:5)-.001);assert.ok(spacing<=(difficulty==='hard'?6:8)+.05);}
  }
});

test('compact adverse ledger retains every recorded case without depending on the large generated report',async()=>{
  const {readFileSync}=await import('node:fs');
  const root=new URL('../qa/flight-production-engine/',import.meta.url),ledger=JSON.parse(readFileSync(new URL('outcome-ledger.json',root))),validation=JSON.parse(readFileSync(new URL('validation.json',root)));
  assert.equal(ledger.adverseComparisons,445);assert.equal(ledger.cases.length,validation.adverseCounterfactuals);assert.equal(ledger.totalBranches,1584);assert.equal(ledger.reportSha256,validation.reportSha256);assert.deepEqual(ledger.sourceHashes,validation.sourceHashes);
  const keys=ledger.cases.map(r=>[r.cohort,r.variant,r.mapId,r.scenarioId,r.response,r.seed,r.playerSide,r.plan].join('/'));assert.equal(new Set(keys).size,445);
  for(const c of ledger.cases){assert.ok(c.ownCitadelHpDelta<0||c.protectedScreenHpDelta<0);assert.ok(Math.abs(c.raid.ownCitadelHp-c.hold.ownCitadelHp-c.ownCitadelHpDelta)<.002);assert.ok(Math.abs(c.raid.protectedScreenHp-c.hold.protectedScreenHp-c.protectedScreenHpDelta)<.002);for(const result of [c.raid,c.hold]){assert.ok(result.attackerGrossSpend>=0);assert.ok(result.defenderGrossSpend>=0);assert.ok(result.seconds>0&&result.seconds<=180);}}
});
