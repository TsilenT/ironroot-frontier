/** Authored tactical counterfactuals, not a win-rate or campaign-difficulty claim.
 * node qa/flight-command/evaluation.mjs [seeds=4] [--output FILE]
 */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {Game,BUILDINGS,homeX,buildSites} from '../lane-lab/engine.js';
import {SCENARIOS,RESPONSE_POLICIES,createScenario,createResponseMemory,respond} from './scenarios.js';

const args=process.argv.slice(2),count=args[0]&&!args[0].startsWith('--')?Number(args.shift()):4;
assert.ok(Number.isInteger(count)&&count>0&&count<=16,'Choose 1–16 spread seeds.');
let output=null;
if(args.length){assert.equal(args.shift(),'--output');output=args.shift();assert.ok(output&&!args.length);}
const seeds=Array.from({length:count},(_,i)=>{
  if(i===0)return 51001;
  let n=(51001+Math.imul(i,0x9e3779b9))>>>0;
  n=Math.imul(n^(n>>>16),0x85ebca6b);n=Math.imul(n^(n>>>13),0xc2b2ae35);return(n^(n>>>16))>>>0;
});
const maps=['command-two-roads','command-three-roads'];
const plansFor=mapId=>mapId==='command-two-roads'?['hold','shift']:['hold','north','south','alternate'];
const round=n=>+n.toFixed(3),mean=values=>values.length?round(values.reduce((a,b)=>a+b,0)/values.length):null;
const hash=file=>createHash('sha256').update(readFileSync(new URL(file,import.meta.url))).digest('hex');
const sourceHashes={engine:hash('../lane-lab/engine.js'),scenarios:hash('./scenarios.js'),evaluation:hash('./evaluation.mjs')};
const started=performance.now();

function invariant(g){
  assert.ok(g.state.gold.every(n=>Number.isFinite(n)&&n>=0));
  assert.ok(g.state.units.length<=140&&g.state.effects.length<=256&&g.state.projectiles.length<=256);
  for(const side of[0,1]){
    const own=g.state.buildings.filter(b=>b.side===side),sites=buildSites(g.map,side);
    assert.ok(own.length<=g.map.buildLimit&&own.filter(b=>b.type==='mint').length<=3);
    assert.ok(g.state.units.filter(u=>u.side===side).length<=70);
    for(const b of own)assert.ok(sites.some(p=>p.x===b.x&&p.y===b.y&&p.lane===b.lane));
  }
}

function evaluate(spec){
  const situation=createScenario(spec.scenarioId,{seed:spec.seed,side:spec.playerSide,mapId:spec.mapId});
  let g=situation.game;
  const player=situation.playerSide,defender=situation.defenderSide,origin=situation.originLane;
  const response=createResponseMemory(),structures=new Map(),units=new Map(),audited=new Set(),orders=[];
  let checks=0,playerSpend=0,originThreatSeconds=0,groundThreatSeconds=0,peakOriginThreat=0,firstOriginThreat=null;
  let maxUnitsBySide=[0,0],orderDestination=null;
  const initialIds=new Set(situation.initialBuildings.map(b=>b.id));
  function observe(dt=0){
    const now=g.state.time,presentBuildings=new Map([...g.state.buildings,...g.state.bases].map(b=>[b.id,b]));
    for(const b of presentBuildings.values())if(!structures.has(b.id))structures.set(b.id,{id:b.id,type:b.type,side:b.side,lane:b.lane??null,initial:initialIds.has(b.id),maxHp:b.maxHp,hp:b.maxHp,damage:0,firstDamage:null,destroyedAt:null});
    for(const r of structures.values()){
      const hp=presentBuildings.get(r.id)?.hp??0;
      if(hp<r.hp){r.damage+=r.hp-hp;r.firstDamage??=now;}
      if(hp===0&&r.hp>0)r.destroyedAt=now;
      r.hp=hp;
    }
    const presentUnits=new Map(g.state.units.map(u=>[u.id,u]));
    for(const u of presentUnits.values()){
      if(!units.has(u.id))units.set(u.id,{id:u.id,type:u.type,side:u.side,firstSeen:now,hp:u.maxHp,damage:0,deadAt:null,
        origin:u.airRoute?.from??u.lane,destination:u.airRoute?.to??u.lane,
        warning:null,transit:null,landed:null,firstDamaged:null,firstDamagePhase:null,deathPhase:null,lastPhase:u.airRoute?.phase||'hold'});
      const r=units.get(u.id),phase=u.airRoute?.phase||'hold';
      if(phase==='warning')r.warning??=now;
      if(phase==='transit')r.transit??=now;
      if(phase==='done')r.landed??=now;
      if(u.hp<r.hp){r.damage+=r.hp-u.hp;if(r.firstDamaged===null){r.firstDamaged=now;r.firstDamagePhase=phase;}}
      // Paid rally damage is immediate; dead units remain in the array until the
      // next fixed-step filter, so record the death at the observed zero HP.
      if(u.hp===0&&r.deadAt===null){r.deadAt=now;r.deathPhase=phase;}
      r.hp=u.hp;r.lastPhase=phase;
    }
    for(const r of units.values())if(r.hp>0&&!presentUnits.has(r.id)){
      r.damage+=r.hp;r.hp=0;r.deadAt=now;r.deathPhase=r.lastPhase;
      if(r.firstDamaged===null){r.firstDamaged=now;r.firstDamagePhase=r.lastPhase;}
    }
    if(dt){
      const ground=g.state.units.filter(u=>u.side===defender&&!u.flying&&homeX(g.map,player,u.x)<1400);
      const local=ground.filter(u=>u.lane===origin).length;
      groundThreatSeconds+=ground.length*dt;originThreatSeconds+=local*dt;
      peakOriginThreat=Math.max(peakOriginThreat,local);if(local)firstOriginThreat??=now;
      for(const side of[0,1])maxUnitsBySide[side]=Math.max(maxUnitsBySide[side],g.state.units.filter(u=>u.side===side).length);
    }
  }
  function issue(tick){
    const plan=spec.plan,destination=plan==='hold'?origin:plan==='shift'?1-origin:plan==='north'?0:plan==='south'?g.map.lanes.length-1:Math.floor(tick/300)%2?g.map.lanes.length-1:0;
    if(orderDestination===destination)return;
    orderDestination=destination;
    for(const id of situation.aerieIds){
      if(!g.state.buildings.some(b=>b.id===id&&b.side===player))continue;
      const before=g.state.gold[player],result=g.setFlightPlan(id,destination,player);
      assert.ok(result.ok,JSON.stringify(result));playerSpend+=before-g.state.gold[player];
      orders.push({time:round(g.state.time),aerieId:id,toLane:destination});
    }
  }
  observe();
  assert.deepEqual(Game.restore(g.serialize()).serialize(),g.serialize());
  const ticks=situation.horizon*20;
  for(let tick=0;tick<ticks&&g.state.winner===null;tick++){
    if(tick%20===0){issue(tick);respond(g,defender,spec.response,response);observe();}
    const phases=g.state.units.filter(u=>u.side===player&&u.airRoute).map(u=>u.airRoute.phase);
    const phase=phases.find(p=>!audited.has(p));
    const checkpoint=phase||(tick===1200?'clock-60':null);
    let restored=null;
    if(checkpoint&&!audited.has(checkpoint)){
      audited.add(checkpoint);const snapshot=g.serialize();restored=Game.restore(snapshot);
      assert.deepEqual(restored.serialize(),snapshot);
    }
    g.update(.05);
    if(restored){restored.update(.05);assert.deepEqual(restored.serialize(),g.serialize(),'Saved continuation diverged at '+checkpoint);g=restored;checks++;}
    observe(.05);
    if(tick%20===0)invariant(g);
  }
  invariant(g);assert.deepEqual(Game.restore(g.serialize()).serialize(),g.serialize());
  assert.equal(playerSpend,0,'Flight orders must not charge gold.');
  const targetRows=situation.targets.map(t=>{const r=structures.get(t.id);return{id:t.id,type:t.type,lane:t.lane,label:t.label,damage:round(r.damage),remainingHp:round(r.hp),firstDamageAt:r.firstDamage===null?null:round(r.firstDamage),destroyedAt:r.destroyedAt===null?null:round(r.destroyedAt)};});
  const enemyStructures=[...structures.values()].filter(r=>r.side===defender&&r.type!=='base');
  const ownStructures=[...structures.values()].filter(r=>r.side===player&&r.type!=='base');
  const ownWaves=[...units.values()].filter(r=>r.side===player&&r.type==='gryphon');
  const phases=['approach','warning','transit','done','hold'];
  const screen=situation.protected.map(p=>({id:p.id,label:p.label,lane:p.lane,remainingHp:round(structures.get(p.id).hp),firstDamageAt:structures.get(p.id).firstDamage===null?null:round(structures.get(p.id).firstDamage),destroyedAt:structures.get(p.id).destroyedAt===null?null:round(structures.get(p.id).destroyedAt)}));
  const firstAction=response.actions[0]??null,firstFlyer=ownWaves[0]??null;
  const waveTiming=ownWaves.slice(0,4).map(w=>({...w,firstSeen:round(w.firstSeen),damage:round(w.damage),hp:round(w.hp),
    responseAt:response.actions.find(a=>a.unitId===w.id)?.time??null}));
  return{...spec,seconds:round(g.state.time),winner:g.state.winner,initialInvestment:situation.initialInvestment,playerLiveSpend:playerSpend,defenderLiveSpend:round(response.spend),defenderActions:response.actions,
    supplyDamage:round(targetRows.filter(t=>t.type==='mint').reduce((n,t)=>n+t.damage,0)),targetDamage:round(targetRows.reduce((n,t)=>n+t.damage,0)),targets:targetRows,
    offRoadSupplyDamage:round(targetRows.filter(t=>t.type==='mint'&&t.lane!==origin).reduce((n,t)=>n+t.damage,0)),
    originSupplyDamage:round(targetRows.filter(t=>t.type==='mint'&&t.lane===origin).reduce((n,t)=>n+t.damage,0)),
    enemyStructureDamageByLane:g.map.lanes.map((_,lane)=>round(enemyStructures.filter(r=>r.lane===lane).reduce((n,r)=>n+r.damage,0))),
    enemyStructureFirstDamageByLane:g.map.lanes.map((_,lane)=>{const times=enemyStructures.filter(r=>r.lane===lane&&r.firstDamage!==null).map(r=>r.firstDamage);return times.length?round(Math.min(...times)):null;}),
    originEnemyStructureDamage:round(enemyStructures.filter(r=>r.lane===origin).reduce((n,r)=>n+r.damage,0)),
    ownStructureDamage:round(ownStructures.reduce((n,r)=>n+r.damage,0)),ownCitadelHp:round(g.state.bases[player].hp),screen,
    originThreatSeconds:round(originThreatSeconds),groundThreatSeconds:round(groundThreatSeconds),peakOriginThreat,firstOriginThreat:firstOriginThreat===null?null:round(firstOriginThreat),
    observedEnemyGroundDeaths:[...units.values()].filter(r=>r.side===defender&&r.type!=='gryphon'&&r.deadAt!==null).length,
    observedEnemyGroundHpLost:round([...units.values()].filter(r=>r.side===defender&&r.type!=='gryphon').reduce((n,r)=>n+r.damage,0)),
    waves:{launched:ownWaves.length,committed:ownWaves.filter(w=>w.lastPhase!=='hold').length,crossing:ownWaves.filter(w=>w.warning!==null).length,warned:ownWaves.filter(w=>w.warning!==null).length,
      landed:ownWaves.filter(w=>w.landed!==null).length,surviving:ownWaves.filter(w=>w.hp>0).length,
      firstDamagePhases:Object.fromEntries(phases.map(p=>[p,ownWaves.filter(w=>w.firstDamagePhase===p).length])),
      deathPhases:Object.fromEntries(phases.map(p=>[p,ownWaves.filter(w=>w.deathPhase===p).length]))},firstWaves:waveTiming,
    firstResponse:firstAction,firstResponseDelayFromLaunch:firstAction&&firstFlyer?round(firstAction.time-firstFlyer.firstSeen):null,
    firstResponseDelayFromWarning:firstAction&&firstFlyer?.warning!==null&&firstFlyer?.warning!==undefined?round(firstAction.time-firstFlyer.warning):null,
    orders,maxUnitsBySide,continuationChecks:checks,auditedPhases:[...audited],
    finalGold:g.state.gold.map(round),finalInvestment:[0,1].map(side=>round(g.state.buildings.filter(b=>b.side===side).reduce((n,b)=>n+b.invested,0)))};
}

const results=[];
for(const mapId of maps){
  for(const scenario of SCENARIOS)for(const response of RESPONSE_POLICIES)for(const seed of seeds)for(const playerSide of[0,1])for(const plan of plansFor(mapId))
    results.push(evaluate({mapId,scenarioId:scenario.id,response,seed,playerSide,plan}));
  process.stderr.write(`Completed ${mapId}: ${results.length} authored branches\n`);
}
const rows=[];
for(const mapId of maps)for(const scenario of SCENARIOS)for(const response of RESPONSE_POLICIES)for(const plan of plansFor(mapId)){
  const selected=results.filter(r=>r.mapId===mapId&&r.scenarioId===scenario.id&&r.response===response&&r.plan===plan);
  rows.push({mapId,scenarioId:scenario.id,response,plan,branches:selected.length,
    meanSupplyDamage:mean(selected.map(r=>r.supplyDamage)),meanTargetDamage:mean(selected.map(r=>r.targetDamage)),
    meanOffRoadSupplyDamage:mean(selected.map(r=>r.offRoadSupplyDamage)),meanOwnCitadelHp:mean(selected.map(r=>r.ownCitadelHp)),citadelLost:selected.filter(r=>r.ownCitadelHp===0).length,
    meanScreenHp:mean(selected.map(r=>r.screen.reduce((n,s)=>n+s.remainingHp,0))),screenLost:selected.filter(r=>r.screen.some(s=>s.remainingHp===0)).length,
    meanOwnStructureDamage:mean(selected.map(r=>r.ownStructureDamage)),meanOriginThreatSeconds:mean(selected.map(r=>r.originThreatSeconds)),
    meanEnemyGroundDeaths:mean(selected.map(r=>r.observedEnemyGroundDeaths)),meanDefenderSpend:mean(selected.map(r=>r.defenderLiveSpend)),
    meanLandings:mean(selected.map(r=>r.waves.landed)),meanFlyingSurvivors:mean(selected.map(r=>r.waves.surviving)),
    meanResponseFromLaunch:mean(selected.map(r=>r.firstResponseDelayFromLaunch).filter(n=>n!==null)),
    meanResponseFromWarning:mean(selected.map(r=>r.firstResponseDelayFromWarning).filter(n=>n!==null)),
    bySide:[0,1].map(playerSide=>{const cohort=selected.filter(r=>r.playerSide===playerSide);return{playerSide,meanSupplyDamage:mean(cohort.map(r=>r.supplyDamage)),meanScreenHp:mean(cohort.map(r=>r.screen.reduce((n,s)=>n+s.remainingHp,0)))};})});
}
const counterfactuals=results.filter(r=>r.plan!=='hold').map(r=>{
  const hold=results.find(h=>h.mapId===r.mapId&&h.scenarioId===r.scenarioId&&h.response===r.response&&h.seed===r.seed&&h.playerSide===r.playerSide&&h.plan==='hold');
  assert.ok(hold);
  const screenHp=v=>v.screen.reduce((n,s)=>n+s.remainingHp,0);
  return{mapId:r.mapId,scenarioId:r.scenarioId,response:r.response,plan:r.plan,seed:r.seed,playerSide:r.playerSide,
    supplyDamageDelta:round(r.supplyDamage-hold.supplyDamage),targetDamageDelta:round(r.targetDamage-hold.targetDamage),
    offRoadSupplyDamageDelta:round(r.offRoadSupplyDamage-hold.offRoadSupplyDamage),ownCitadelHpDelta:round(r.ownCitadelHp-hold.ownCitadelHp),
    ownStructureDamageDelta:round(r.ownStructureDamage-hold.ownStructureDamage),screenHpDelta:round(screenHp(r)-screenHp(hold)),
    originThreatSecondsDelta:round(r.originThreatSeconds-hold.originThreatSeconds),defenderSpendDelta:round(r.defenderLiveSpend-hold.defenderLiveSpend)};
});
const report={schemaVersion:1,sourceHashes,node:process.version,seeds,maps,horizonSeconds:110,stepSeconds:.05,
  rules:'Three explicitly authored free deployments, equal 420-gold remaining treasuries, unchanged income and prices. Two player aeries receive free future-wave orders. No paid player reinforcements, salvaging or spells. All defender responses pay normal prices/cooldowns and inspect only launched units. No enemy AI outside the named response policy.',
  controls:'Each hold/shift/north/south/alternate branch begins with the same setup, seed and side. Alternate switches the future orders between north and south every 15 seconds. Both sides and spread seeds are retained. These are short tactical situations with unequal authored free forces, not normal skirmish or campaign balance samples.',
  metrics:'Structure damage sums actual HP reductions including destroyed structures; target and mine damage refer to marked starting targets. Origin threat seconds sum observed enemy ground units within 1400 of the player home on the original road times .05 seconds. First wave damage phases are observations of HP loss, not inferred targeting intent. Negative response-from-warning means a defender acted on the publicly committed launch route before the gateway warning. Initial/final investment is surviving structure invested value, not a resource-spend estimate.',
  limitations:'110-second horizon may leave targets alive. Unit deaths/damage count observed entities and can miss a unit spawned and killed inside one fixed step. First four wave traces are retained per branch; counts cover all observed waves. No human or hardware playtest. No claim of tactical optimality, fairness or competitive balance. Initial architecture experiment uses no reactive attacker purchases. Save checks compare the next uninterrupted/restored step at first route phases and 60 seconds; they are not full replay verification.',
  branches:results.length,continuationChecks:results.reduce((n,r)=>n+r.continuationChecks,0),elapsedSeconds:round((performance.now()-started)/1000),rows,counterfactuals,results};
if(output){
  writeFileSync(output,JSON.stringify(report,null,2)+'\n');
  console.log(`Wrote ${results.length} branches and ${report.continuationChecks} continuation comparisons to ${output} (${report.elapsedSeconds}s).`);
  for(const mapId of maps){
    console.log('\n'+mapId+' — mean off-road mine damage and cost of leaving the original road');
    console.log('| Situation | Plan | Side-mine damage / with destination archers | Citadel HP / with destination archers | Screen HP | Ground threat seconds | Defender archer spend |');
    console.log('| --- | --- | ---: | ---: | ---: | ---: | ---: |');
    for(const scenario of SCENARIOS)for(const plan of plansFor(mapId)){
      const none=rows.find(r=>r.mapId===mapId&&r.scenarioId===scenario.id&&r.plan===plan&&r.response==='none');
      const aa=rows.find(r=>r.mapId===mapId&&r.scenarioId===scenario.id&&r.plan===plan&&r.response==='destination-archery');
      console.log(`| ${scenario.id} | ${plan} | ${none.meanOffRoadSupplyDamage} / ${aa.meanOffRoadSupplyDamage} | ${none.meanOwnCitadelHp} / ${aa.meanOwnCitadelHp} | ${none.meanScreenHp} | ${none.meanOriginThreatSeconds} | ${aa.meanDefenderSpend} |`);
    }
  }
}else process.stdout.write(JSON.stringify(report,null,2)+'\n');
