/** Authored tactical counterfactuals, not a win-rate or campaign-difficulty claim.
 * node qa/flight-production-engine/evaluation.mjs [--cohort all|baseline|long|extension] [--seeds 1..4] [--output FILE]
 */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {pathToFileURL} from 'node:url';
import {Game,homeX,buildSites,flightGateHome} from '../../dist/engine.js';
import {SCENARIOS,RESPONSE_POLICIES,createScenario,createResponseMemory,respond} from './scenarios.js';

export const SPREAD_SEEDS=Object.freeze([51001,3052302604,4010181097,2367780941]);
export const PROTOTYPE_MAP_MAPPING=Object.freeze({'command-two-roads':'twin-span','command-three-roads':'classic'});
const plansFor=mapId=>mapId==='twin-span'?['hold','shift']:['hold','north','south','alternate'];
const round=n=>+n.toFixed(3),mean=values=>values.length?round(values.reduce((a,b)=>a+b,0)/values.length):null;
const hash=file=>createHash('sha256').update(readFileSync(new URL(file,import.meta.url))).digest('hex');
const sourceHashes=()=>({engine:hash('../../dist/engine.js'),rulesets:hash('../../dist/rulesets.js'),flightHelper:hash('../../dist/flight-orders.js'),scenarios:hash('./scenarios.js'),evaluation:hash('./evaluation.mjs')});

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

export function evaluate(spec){
  const situation=createScenario(spec.scenarioId,{seed:spec.seed,side:spec.playerSide,mapId:spec.mapId,difficulty:spec.difficulty??'normal',screenType:spec.rootwarden?'wardenLodge':'barracks',nativeAI:!!spec.nativeAI});
  let g=situation.game;
  const player=situation.playerSide,defender=situation.defenderSide,origin=situation.originLane;
  const response=createResponseMemory(),structures=new Map(),units=new Map(),audited=new Set(),orders=[];
  let checks=0,playerSpend=0,originThreatSeconds=0,groundThreatSeconds=0,peakOriginThreat=0,firstOriginThreat=null;
  let maxUnitsBySide=[0,0],orderDestination=null;
  const initialIds=new Set(situation.initialBuildings.map(b=>b.id));
  const audit={actions:[],decisions:[],gross:[0,0]},reinforcementAttempts=[];
  let actor='orders',reinforcementIndex=0;
  // The production engine owns policy/cadence/RNG. This mirror-only test binding
  // picks the defender side when _step invokes its otherwise-side-1 default.
  function bindAudit(game,record=true){
    for(const method of ['build','upgrade','cast'])game[method]=function(...args){
      const side=args[method==='build'?3:method==='cast'?2:1]??0;
      const cost=method==='build'?game.buildings[args[0]]?.cost:method==='cast'?game.ruleset.spell.cost:(()=>{const b=game.state.buildings.find(b=>b.id===args[0]);return b?game.upgradeCost(b):0;})();
      const before=game.state.gold[side],result=Game.prototype[method].apply(game,args);
      if(record&&result.ok){audit.gross[side]+=cost;audit.actions.push({time:round(game.state.time),actor,side,type:method,cost,netGoldDelta:round(before-game.state.gold[side]),buildingId:result.building?.id??null,building:result.building?.type??null,lane:result.building?.lane??null,x:result.building?.x??args[0],y:result.building?.y??args[1]});}
      return result;
    };
    game._ai=function(side=defender){
      const previous=actor;actor='native-ai';
      if(record)audit.decisions.push({time:round(game.state.time),side,aiTimer:game.aiTimer,committedThreats:game.state.units.filter(u=>u.side!==side&&u.airRoute&&u.airRoute.phase!=='done').map(u=>({id:u.id,from:u.airRoute.from,to:u.airRoute.to,phase:u.airRoute.phase}))});
      try{return Game.prototype._ai.call(game,side);}finally{actor=previous;}
    };
    return game;
  }
  bindAudit(g);
  function reinforce(){
    if(!spec.paidReinforcements)return;
    const tasks=[{at:10,type:'wardenLodge'},{at:35,type:'archery'},{at:60,type:'foundry'},{at:90,upgrade:situation.protected[0].id},{at:120,upgrade:situation.aerieIds[0]}];
    if(reinforcementIndex>=tasks.length||g.state.time+1e-6<tasks[reinforcementIndex].at)return;
    const task=tasks[reinforcementIndex++];actor='paid-attacker';let result;
    if(task.upgrade)result=g.upgrade(task.upgrade,player);
    else for(const site of buildSites(g.map,player).filter(p=>p.lane===origin).sort((a,b)=>Math.abs(homeX(g.map,player,a.x)-690)-Math.abs(homeX(g.map,player,b.x)-690))){result=g.build(task.type,site.x,site.y,player);if(result.ok)break;}
    reinforcementAttempts.push({time:round(g.state.time),...task,ok:!!result?.ok,reason:result?.reason??null});actor='orders';
  }
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
      const ground=g.state.units.filter(u=>u.side===defender&&!u.flying&&homeX(g.map,player,u.x)<flightGateHome(g.map,g.ruleset));
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
  const ticks=(spec.horizon??situation.horizon)*20;
  for(let tick=0;tick<ticks&&g.state.winner===null;tick++){
    if(tick%20===0){issue(tick);reinforce();if(!spec.nativeAI){actor='scripted-defender';respond(g,defender,spec.response,response);actor='orders';}observe();}
    const phases=g.state.units.filter(u=>u.side===player&&u.airRoute).map(u=>u.airRoute.phase);
    const phase=phases.find(p=>!audited.has(p));
    const checkpoint=phase||(tick===1200?'clock-60':null);
    let restored=null;
    if(checkpoint&&!audited.has(checkpoint)){
      audited.add(checkpoint);const snapshot=g.serialize();restored=bindAudit(Game.restore(snapshot),false);
      assert.deepEqual(restored.serialize(),snapshot);
    }
    g.update(.05);
    if(restored){restored.update(.05);assert.deepEqual(restored.serialize(),g.serialize(),'Saved continuation diverged at '+checkpoint);g=bindAudit(restored);checks++;}
    observe(.05);
    if(tick%20===0)invariant(g);
  }
  invariant(g);assert.deepEqual(Game.restore(g.serialize()).serialize(),g.serialize());
  assert.equal(playerSpend,0,'Flight orders must not charge gold.');
  assert.equal(audit.gross[player],audit.actions.filter(a=>a.side===player).reduce((n,a)=>n+a.cost,0));
  assert.equal(audit.gross[defender],audit.actions.filter(a=>a.side===defender).reduce((n,a)=>n+a.cost,0));
  if(!spec.nativeAI)assert.equal(audit.gross[defender],response.spend,'Scripted gross costs must match the actual production purchases.');
  const targetRows=situation.targets.map(t=>{const r=structures.get(t.id);return{id:t.id,type:t.type,lane:t.lane,label:t.label,damage:round(r.damage),remainingHp:round(r.hp),firstDamageAt:r.firstDamage===null?null:round(r.firstDamage),destroyedAt:r.destroyedAt===null?null:round(r.destroyedAt)};});
  const enemyStructures=[...structures.values()].filter(r=>r.side===defender&&r.type!=='base');
  const ownStructures=[...structures.values()].filter(r=>r.side===player&&r.type!=='base');
  const ownWaves=[...units.values()].filter(r=>r.side===player&&r.type==='gryphon');
  const phases=['approach','warning','transit','done','hold'];
  const screen=situation.protected.map(p=>({id:p.id,label:p.label,lane:p.lane,remainingHp:round(structures.get(p.id).hp),firstDamageAt:structures.get(p.id).firstDamage===null?null:round(structures.get(p.id).firstDamage),destroyedAt:structures.get(p.id).destroyedAt===null?null:round(structures.get(p.id).destroyedAt)}));
  const firstAction=(spec.nativeAI?audit.actions.filter(a=>a.side===defender):response.actions)[0]??null,firstFlyer=ownWaves[0]??null;
  const waveTiming=ownWaves.slice(0,4).map(w=>({...w,firstSeen:round(w.firstSeen),damage:round(w.damage),hp:round(w.hp),
    responseAt:response.actions.find(a=>a.unitId===w.id)?.time??null}));
  return{...spec,seconds:round(g.state.time),winner:g.state.winner,initialInvestment:situation.initialInvestment,playerLiveSpend:playerSpend,defenderLiveSpend:round(audit.gross[defender]),attackerReinforcementSpend:round(audit.gross[player]),defenderActions:spec.nativeAI?audit.actions.filter(a=>a.side===defender):response.actions,paidActions:audit.actions,aiDecisions:audit.decisions,reinforcementAttempts,
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

export function runEvaluation({cohort='all',seedCount=4,output=null}={}){
  assert.ok(['all','baseline','long','extension'].includes(cohort));assert.ok(Number.isInteger(seedCount)&&seedCount>=1&&seedCount<=4);
  const started=performance.now(),seeds=SPREAD_SEEDS.slice(0,seedCount),results=[];
  const run=spec=>results.push(evaluate(spec));
  if(cohort==='all'||cohort==='baseline')for(const mapId of Object.values(PROTOTYPE_MAP_MAPPING)){
    for(const scenario of SCENARIOS)for(const response of RESPONSE_POLICIES)for(const seed of seeds)for(const playerSide of [0,1])for(const plan of plansFor(mapId))run({cohort:'prototype-port',mapId,scenarioId:scenario.id,response,seed,playerSide,plan});
    process.stderr.write(`Completed production ${mapId}: ${results.length} authored branches\n`);
  }
  if(cohort==='all'||cohort==='long'){
    for(const scenario of SCENARIOS)for(const response of RESPONSE_POLICIES)for(const seed of seeds)for(const playerSide of [0,1])for(const plan of plansFor('long-march'))run({cohort:'long-march',mapId:'long-march',scenarioId:scenario.id,response,seed,playerSide,plan});
    process.stderr.write(`Completed Long March: ${results.length} authored branches\n`);
  }
  if(cohort==='all'||cohort==='extension'){
    const variants=[{variant:'rootwarden-screen',rootwarden:true,response:'destination-archery'},
      {variant:'paid-attacker',paidReinforcements:true,response:'destination-archery'},
      {variant:'normal-native-ai',rootwarden:true,paidReinforcements:true,nativeAI:true,difficulty:'normal',response:'native-ai'},
      {variant:'hard-native-ai',rootwarden:true,paidReinforcements:true,nativeAI:true,difficulty:'hard',response:'native-ai'}];
    for(const mapId of ['twin-span','classic','long-march']){
      for(const scenario of SCENARIOS)for(const config of variants)for(const seed of seeds.slice(0,2))for(const playerSide of [0,1])for(const plan of mapId==='twin-span'?['hold','shift']:['hold','north','south'])run({cohort:'extension',mapId,scenarioId:scenario.id,seed,playerSide,plan,horizon:180,...config});
      process.stderr.write(`Completed ${mapId} extension: ${results.length} authored branches\n`);
    }
  }
  const grouped=new Map();
  for(const r of results){const key=[r.cohort,r.variant??'',r.mapId,r.scenarioId,r.response,r.plan].join('/');if(!grouped.has(key))grouped.set(key,[]);grouped.get(key).push(r);}
  const rows=[...grouped.values()].map(selected=>{const first=selected[0];return{
    cohort:first.cohort,variant:first.variant??null,mapId:first.mapId,scenarioId:first.scenarioId,response:first.response,plan:first.plan,branches:selected.length,
    meanSupplyDamage:mean(selected.map(r=>r.supplyDamage)),meanTargetDamage:mean(selected.map(r=>r.targetDamage)),meanOffRoadSupplyDamage:mean(selected.map(r=>r.offRoadSupplyDamage)),
    meanOwnCitadelHp:mean(selected.map(r=>r.ownCitadelHp)),citadelLost:selected.filter(r=>r.ownCitadelHp===0).length,meanScreenHp:mean(selected.map(r=>r.screen.reduce((n,s)=>n+s.remainingHp,0))),screenLost:selected.filter(r=>r.screen.some(s=>s.remainingHp===0)).length,
    meanOwnStructureDamage:mean(selected.map(r=>r.ownStructureDamage)),meanOriginThreatSeconds:mean(selected.map(r=>r.originThreatSeconds)),meanEnemyGroundDeaths:mean(selected.map(r=>r.observedEnemyGroundDeaths)),
    meanDefenderSpend:mean(selected.map(r=>r.defenderLiveSpend)),meanAttackerSpend:mean(selected.map(r=>r.attackerReinforcementSpend)),meanLandings:mean(selected.map(r=>r.waves.landed)),meanFlyingSurvivors:mean(selected.map(r=>r.waves.surviving)),
    meanResponseFromLaunch:mean(selected.map(r=>r.firstResponseDelayFromLaunch).filter(n=>n!==null)),meanResponseFromWarning:mean(selected.map(r=>r.firstResponseDelayFromWarning).filter(n=>n!==null)),
    bySide:[0,1].map(playerSide=>{const cohort=selected.filter(r=>r.playerSide===playerSide);return{playerSide,meanSupplyDamage:mean(cohort.map(r=>r.supplyDamage)),meanScreenHp:mean(cohort.map(r=>r.screen.reduce((n,s)=>n+s.remainingHp,0))),meanOwnCitadelHp:mean(cohort.map(r=>r.ownCitadelHp))};})};});
  const counterfactuals=results.filter(r=>r.plan!=='hold').map(r=>{
    const hold=results.find(h=>h.cohort===r.cohort&&h.variant===r.variant&&h.mapId===r.mapId&&h.scenarioId===r.scenarioId&&h.response===r.response&&h.seed===r.seed&&h.playerSide===r.playerSide&&h.plan==='hold');assert.ok(hold);
    const screenHp=v=>v.screen.reduce((n,s)=>n+s.remainingHp,0);
    return{cohort:r.cohort,variant:r.variant??null,mapId:r.mapId,scenarioId:r.scenarioId,response:r.response,plan:r.plan,seed:r.seed,playerSide:r.playerSide,
      supplyDamageDelta:round(r.supplyDamage-hold.supplyDamage),targetDamageDelta:round(r.targetDamage-hold.targetDamage),offRoadSupplyDamageDelta:round(r.offRoadSupplyDamage-hold.offRoadSupplyDamage),ownCitadelHpDelta:round(r.ownCitadelHp-hold.ownCitadelHp),
      ownStructureDamageDelta:round(r.ownStructureDamage-hold.ownStructureDamage),screenHpDelta:round(screenHp(r)-screenHp(hold)),originThreatSecondsDelta:round(r.originThreatSeconds-hold.originThreatSeconds),defenderSpendDelta:round(r.defenderLiveSpend-hold.defenderLiveSpend),attackerSpendDelta:round(r.attackerReinforcementSpend-hold.attackerReinforcementSpend)};
  });
  const report={schemaVersion:1,sourceHashes:sourceHashes(),node:process.version,seeds,prototypeMapMapping:PROTOTYPE_MAP_MAPPING,stepSeconds:.05,
    provenance:'Selectively adapted from PR2 head 4581245af7e23e7c3b5eb905d4a29c663006e0ea. Exact upstream file/blob metadata is in upstream-provenance.json. Original four seeds, three scenarios, five response policies, mirrored sides and two/four plan choices are unchanged in the 720 prototype-port cohort. Production rules and map identities replace lab identities; the current exact-center gate policy applies.',
    rules:'Three unequal authored free deployments, then 420 gold per side and unchanged prices/income. Prototype-port and Long March horizons are 110 seconds with no paid attacker reinforcements or native AI. Extension is bounded at 180 seconds and separately labels Rootwarden replacement screens, paid attacker purchases and native Normal/Hard AI. All live purchases/upgrades/volleys pay ordinary costs and cooldowns; failed attempts are retained. No engine tuning is part of this evaluation.',
    controls:'Each non-Hold branch is paired to identical scenario/variant/map/seed/side Hold. Alternate changes future plans every 15 seconds. Production native AI runs at its existing persisted aiTimer cadence; the evaluator binds its default side only for mirrored defender-side-0 cases, and rebinds the same mirrored test context after restore. The evaluator uses the real Game policy and RNG, not a replacement AI.',
    metrics:'Structure damage sums observed HP reductions, including destroyed structures. Marked supply targets remain starting mines. Original-road threat unit-seconds use the shared gateHome helper (1400 or Long March1800). Gross costs are recorded at successful build/upgrade/cast calls separately from net gold delta (which can include bounties). First wave phase/timing observations and paid response events are retained. Negative response-from-warning means response preceded the gateway warning; native AI can also build before any launch. Initial/final investment is surviving structure invested value, not spend.',
    limitations:'Authored starting forces are unequal; synthetic branch win/loss counts are not human balance estimates or difficulty certification. Fixed 110/180-second horizons may stop unfinished. After-step observers can miss a unit spawned and killed within the same step. First damage/death phases are observations, not complete causal attribution. Only first four wave traces are retained, with aggregate counts for all observed waves. Save checks compare first observed route phase/60-second next-step continuation, not every full replay. No human/hardware playtest.',
    branches:results.length,cohortCounts:Object.fromEntries(['prototype-port','long-march','extension'].map(c=>[c,results.filter(r=>r.cohort===c).length])),continuationChecks:results.reduce((n,r)=>n+r.continuationChecks,0),elapsedSeconds:round((performance.now()-started)/1000),rows,counterfactuals,results};
  if(output){writeFileSync(output,JSON.stringify(report,null,2)+'\n');console.log(`Wrote ${report.branches} branches and ${report.continuationChecks} continuation comparisons to ${output} (${report.elapsedSeconds}s).`);}return report;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const args=process.argv.slice(2),options={};while(args.length){const flag=args.shift(),value=args.shift();if(flag==='--output')options.output=value;else if(flag==='--cohort')options.cohort=value;else if(flag==='--seeds')options.seedCount=Number(value);else throw new Error('Unknown evaluator argument: '+flag);}
  const report=runEvaluation(options);if(!options.output)process.stdout.write(JSON.stringify(report,null,2)+'\n');
}
