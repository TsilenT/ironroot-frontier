/** Authored QA situations. Setup forces are explicit grants; live actions pay normally. */
import {Game, SPELL, worldX, supportsFlightOrders, getRuleset} from '../../dist/engine.js';
const BUILDINGS=getRuleset('frontier-flight-open').buildings;

export const SCENARIOS = Object.freeze([
  Object.freeze({id:'open-supply', name:'The open supply road', description:'A tower guards the launch road while exposed mines occupy the side roads.', goal:'Compare the supply damage of a side raid with staying behind the ground screen.'}),
  Object.freeze({id:'pressed-road', name:'The screen under pressure', description:'Veteran infantry and siege press the launch road. Side-road mines offer a tempting raid.', goal:'Measure what the original ground screen loses when its flying support leaves.'}),
  Object.freeze({id:'baited-supply', name:'A tempting mine', description:'One visible mine has prepared anti-air cover; a different road offers a softer target.', goal:'Compare a baited raid, a safer raid, and holding against visible anti-air.'}),
]);
export const RESPONSE_POLICIES = Object.freeze(['none', 'destination-archery', 'destination-tower', 'origin-archery', 'rally']);
const describe = (b, label = BUILDINGS[b.type].name) => ({id:b.id, type:b.type, lane:b.lane, side:b.side, label, initialHp:b.hp, maxHp:b.maxHp, invested:b.invested, x:b.x, y:b.y});

export function createScenario(id, {seed=51001, side=0, mapId='classic', difficulty='normal', screenType='barracks', nativeAI=false}={}) {
  const definition = SCENARIOS.find(s => s.id === id);
  if (!definition) throw new Error('Unknown flight scenario: '+id);
  if (![0,1].includes(side)) throw new Error('Invalid player side.');
  const game = new Game({mapId, seed, difficulty, ai:nativeAI,rulesetId:'frontier-flight-open'});
  if (!supportsFlightOrders(game.ruleset)) throw new Error('A flight-command battlefield is required.');
  const playerSide=side, defenderSide=1-side, originLane=game.map.startingLane;
  const outside=game.map.lanes.map((_,lane)=>lane).filter(lane=>lane!==originLane);
  const baitedLane=outside[0], safeLane=outside.at(-1);
  const targets=[], protectedBuildings=[], aerieIds=[];
  game.state.gold=[10000,10000];
  const place=(type,distance,lane,owner,level=1,label=null)=>{
    const result=game.build(type,worldX(game.map,owner,distance),game.map.lanes[lane],owner);
    if (!result.ok) throw new Error(`Invalid authored placement ${id}/${owner}/${type}/${distance}/${lane}: ${result.reason}`);
    for(let n=1;n<level;n++) {
      const upgrade=game.upgrade(result.building.id,owner);
      if(!upgrade.ok)throw new Error('Invalid authored upgrade: '+upgrade.reason);
    }
    return describe(result.building,label||BUILDINGS[type].name);
  };
  protectedBuildings.push(place(screenType,1250,originLane,playerSide,1,'Forward ground screen'));
  place('archery',830,originLane,playerSide);
  for(const distance of [1110,970])aerieIds.push(place('aerie',distance,originLane,playerSide).id);
  if(id==='open-supply') {
    targets.push(place('watchtower',1110,originLane,defenderSide,1,'Tower on the launch road'));
    for(const lane of outside)targets.push(place('mint',970,lane,defenderSide,1,'Exposed supply mine'));
  } else if(id==='pressed-road') {
    targets.push(place('barracks',1250,originLane,defenderSide,3,'Veteran infantry works'));
    place('barracks',1110,originLane,defenderSide,2);
    targets.push(place('foundry',970,originLane,defenderSide,2,'Siege works pressing the screen'));
    for(const lane of outside)targets.push(place('mint',830,lane,defenderSide,1,'Side-road supply mine'));
  } else {
    targets.push(place('mint',830,originLane,defenderSide,1,'Supply mine on the launch road'));
    for(const lane of outside)targets.push(place('mint',970,lane,defenderSide,1,lane===baitedLane?'Baited supply mine':'Exposed supply mine'));
    place('watchtower',1250,baitedLane,defenderSide,2);
    place('archery',1110,baitedLane,defenderSide,2);
  }
  game.state.gold=[420,420];
  const initialBuildings=game.state.buildings.map(b=>describe(b));
  const preferredLane=id==='pressed-road'?originLane:id==='baited-supply'&&outside.length===1?originLane:safeLane;
  return {...definition, game, playerSide, defenderSide, originLane, aerieIds, targets, protected:protectedBuildings,
    initialBuildings, baitedLane:id==='baited-supply'?baitedLane:null, preferredLane, targetLane:preferredLane, horizon:110,
    initialInvestment:[0,1].map(owner=>initialBuildings.filter(b=>b.side===owner).reduce((n,b)=>n+b.invested,0)),
    setupRule:'Authored free starting structures and upgrades, then exactly 420 gold per side. No free live reinforcements, refunds or income changes.'};
}

export function createResponseMemory() {
  return {spend:0, decisions:0, actions:[], observations:[], waves:{}, firstObservation:null, firstAction:null, lastDecisionAt:-1};
}

/** Public launched units reveal their committed destination. No aerie plan reads. */
export function respond(game, defenderSide, policy, memory) {
  if(!RESPONSE_POLICIES.includes(policy))throw new Error('Unknown response policy: '+policy);
  if(game.state.winner!==null||game.state.time-memory.lastDecisionAt<.999)return null;
  memory.lastDecisionAt=game.state.time;memory.decisions++;
  const flyers=game.state.units.filter(u=>u.side!==defenderSide&&u.type==='gryphon'&&u.hp>0).sort((a,b)=>a.id-b.id);
  for(const u of flyers) {
    const phase=u.airRoute?.phase||'hold',destination=u.airRoute?.to??u.lane,origin=u.airRoute?.from??u.lane;
    const seen=memory.waves[u.id]??={id:u.id,origin,destination,firstSeen:game.state.time,warning:null,transit:null,landed:null};
    if(memory.firstObservation===null)memory.firstObservation=game.state.time;
    if(phase==='warning'&&seen.warning===null)seen.warning=game.state.time;
    if(phase==='transit'&&seen.transit===null)seen.transit=game.state.time;
    if(phase==='done'&&seen.landed===null)seen.landed=game.state.time;
  }
  if(policy==='none'||!flyers.length)return null;
  const record=(action,goldBefore)=>{
    // Rally kills can award gold immediately. Gross paid cost and net balance
    // change are different observations; do not subtract bounties from spend.
    const cost=action.type==='rally'?SPELL.cost:BUILDINGS[action.building].cost;
    const event={time:game.state.time,...action,cost,netGoldDelta:goldBefore-game.state.gold[defenderSide]};
    memory.spend+=event.cost;memory.firstAction??=event.time;
    if(memory.actions.length<256)memory.actions.push(event);
    return event;
  };
  if(policy==='rally') {
    if(game.state.gold[defenderSide]<SPELL.cost||game.state.spellCooldown[defenderSide]>0)return null;
    const ranked=flyers.map(u=>({u,count:flyers.filter(v=>Math.hypot(v.x-u.x,v.y-u.y)<SPELL.radius).length}))
      .sort((a,b)=>b.count-a.count||a.u.id-b.u.id);
    if(ranked[0].count<2)return null;
    const {u}=ranked[0],before=game.state.gold[defenderSide];
    if(game.cast(u.x,u.y,defenderSide).ok)return record({type:'rally',unitId:u.id,lane:u.airRoute?.to??u.lane},before);
    return null;
  }
  const type=policy==='destination-tower'?'watchtower':'archery',limit=type==='watchtower'?1:2;
  if(game.state.gold[defenderSide]<BUILDINGS[type].cost)return null;
  for(const u of flyers) {
    const lane=policy==='origin-archery'?(u.airRoute?.from??u.lane):(u.airRoute?.to??u.lane);
    if(game.state.buildings.filter(b=>b.side===defenderSide&&b.lane===lane&&b.type===type).length>=limit)continue;
    for(const distance of [1250,1110,970,830,690,550,410,270]) {
      const before=game.state.gold[defenderSide];
      const result=game.build(type,worldX(game.map,defenderSide,distance),game.map.lanes[lane],defenderSide);
      if(result.ok)return record({type:'build',building:type,lane,buildingId:result.building.id,unitId:u.id,observedPhase:u.airRoute?.phase||'hold'},before);
    }
  }
  return null;
}
