import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../dist/engine.js';
import { flightRoadName, flightOrderModel, flightRouteRows, flightWarningSummary, flightWarningTime } from '../dist/flight-orders-view.js';
import { startupHarness } from './mobile-startup-fixture.mjs';

function setup(rulesetId = 'frontier-flight-open') {
  const game = new Game({rulesetId, ai: false, seed: 1717});
  game.state.gold[0] = 900;
  const result = game.build('aerie', 550, 450);
  assert.equal(result.ok, true);
  return {game, building: result.building};
}
function ui() {
  const h = startupHarness({width: 390, height: 650});
  const {game, building} = setup();
  h.c.start(game);
  h.c.ui.selected = building.id;
  h.c.setCompactBuildOpen(true);
  h.c.updateSelection();
  return {...h, game, building};
}

test('flight panel offers only Hold and adjacent roads, using the actual map names', () => {
  const {game, building} = setup();
  assert.deepEqual(flightOrderModel(game, building).options.map(o => [o.key, o.lane, o.available, o.selected]),
    [['north',0,true,false],['hold',1,true,true],['south',2,true,false]]);
  const outer = {...building, lane: 0, flightPlan: 0};
  assert.equal(flightOrderModel(game, outer).options[0].available, false);
  assert.equal(flightOrderModel(game, outer).options[2].label, 'Middle road');
  assert.equal(flightRoadName({lanes:[340,560]},1),'South road');
  assert.equal(flightRoadName({lanes:[450]},0),'Only road');
  assert.equal(flightRoadName(game.map,-1),'Unknown road');
});

test('old identities and non-owned/dead/non-aerie selections never offer orders', () => {
  const old = setup('frontier-rootwarden-open');
  assert.equal(flightOrderModel(old.game, old.building),null);
  const {game, building} = setup();
  for(const change of [{side:1},{hp:0},{type:'barracks'}])
    assert.equal(flightOrderModel(game,{...building,...change}),null);
  assert.equal(flightOrderModel(game,null),null);
});

test('route text groups actual launches and ignores unlaunched enemy plans and completed flights', () => {
  const {game, building} = setup();
  game.setFlightPlan(building.id,0);
  assert.deepEqual(flightRouteRows(game),[],'unlaunched plan is not a live flight');
  const unit = (id,side,phase,remaining=2) => ({id,side,type:'gryphon',hp:125,
    airRoute:{from:1,to:0,phase,remaining}});
  game.state.units = [unit(100,0,'approach'),unit(101,1,'warning',1.3),unit(102,1,'warning',.6),unit(103,1,'transit',0),unit(104,0,'done',0),{...unit(105,1,'warning'),hp:0}];
  const before = JSON.stringify(game.state), rows = flightRouteRows(game);
  assert.equal(rows.length,3);
  assert.match(rows.find(row=>row.phase==='warning').text,/Enemy 2 gryphons: Middle road to North road.*Next crossing starts in 0.6 seconds/);
  assert.match(rows.find(row=>row.phase==='transit').text,/cannot attack/);
  assert.equal(JSON.stringify(game.state),before);
  assert.equal(flightWarningSummary(game,game.state.units),'Enemy gryphons are about to cross toward the north road, and your archers can hit them along the way.');
  assert.equal(flightWarningSummary({...game,ruleset:{combat:{flyingCrossLanes:false}}},game.state.units),'');
});

test('real aerie controls change only future plan and preserve focus, resources and airborne orders', () => {
  const h = ui();
  h.game.setFlightPlan(h.building.id,0);
  for(let i=0;i<30;i++)h.game.update(.05);
  const airborne = h.game.state.units.filter(u=>u.type==='gryphon').map(u=>JSON.stringify(u));
  assert.ok(airborne.length);
  const gold = h.game.state.gold[0], seed = h.game.seed, time = h.game.state.time;
  const button = h.$('flightSouth'); button.focus();
  button.onclick({detail:0,currentTarget:button});
  assert.equal(h.building.flightPlan,2);
  assert.equal(h.c.document.activeElement,button);
  assert.equal(h.game.state.gold[0],gold);assert.equal(h.game.seed,seed);assert.equal(h.game.state.time,time);
  assert.deepEqual(h.game.state.units.filter(u=>u.type==='gryphon').map(u=>JSON.stringify(u)),airborne);
  assert.match(h.$('flightOrderCurrent').textContent,/south road/);
  assert.equal(h.$('flightSouth').attributes['aria-pressed'],'true');
});

test('an unarmed compatibility click cannot issue an order on a newly revealed aerie panel', () => {
  const h = ui(), before = h.game.serialize(), button = h.$('flightNorth');
  button.onclick({detail:1,pointerId:7,currentTarget:button});
  assert.deepEqual(h.game.serialize(),before);
});

for(const gate of ['paused','profileGate','recoveryHold','battleSafetyReason']) test(`${gate} prevents even a direct order activation`,()=>{
  const h = ui(), before=h.game.serialize();h.c[gate]=gate==='paused'?true:{};
  const button=h.$('flightNorth');button.onclick({detail:0,currentTarget:button});
  assert.deepEqual(h.game.serialize(),before);
});

test('paused route inspection is read-only and old battles do not expose the new controls', () => {
  const h=ui();h.c.pause(true);const before=h.game.serialize();h.c.updateHUD();
  assert.deepEqual(h.game.serialize(),before);
  assert.equal(h.$('flightNorth').disabled,true);
  assert.equal(h.$('pauseFlights').classList.contains('hidden'),false);
  const old=setup('frontier-rootwarden-open');h.c.start(old.game);h.c.ui.selected=old.building.id;h.c.updateHUD();
  assert.equal(h.$('flightOrders').classList.contains('hidden'),true);
  assert.equal(h.$('pauseFlights').classList.contains('hidden'),true);
});


test('staggered paid launches report the earliest warning consistently with battlefield signals', async()=>{
  const {buildFlightSignals,flightSignalLabel}=await import('../dist/flight-visuals.js');
  const game=new Game({rulesetId:'frontier-flight-open',ai:false,seed:1717});
  while(game.state.gold[0]<500)game.update(.05);
  for(const x of [1250,1110]) {
    const built=game.build('aerie',x,450);assert.equal(built.ok,true);
    assert.equal(game.setFlightPlan(built.building.id,0).ok,true);
  }
  let row;
  for(let i=0;i<1000;i++) {
    game.update(.05);row=flightRouteRows(game).find(r=>r.phase==='warning'&&r.count===2);
    if(row)break;
  }
  assert.ok(row,'two independently paid aeries can have staggered simultaneous warnings');
  const warnings=game.state.units.filter(u=>u.airRoute?.phase==='warning');
  assert.equal(row.remaining,Math.min(...warnings.map(u=>u.airRoute.remaining)));
  const route=buildFlightSignals(game).routes.find(r=>r.warningCount===2);
  assert.equal(route.remaining,row.remaining);
  assert.match(flightSignalLabel(route),/0\.3s×2/);
  assert.match(row.text,/Next crossing starts in 0\.3 seconds/);
  const snapshot=game.serialize();assert.deepEqual(Game.restore(snapshot).serialize(),snapshot);
});

test('warning rounding shares positive tenths and avoids binary floating-point overstatement',()=>{
  for(const [value,expected] of [[1.0000000000000002,'1.0'],[.30000000000000004,'0.3'],[.00001,'0.1']])
    assert.equal(flightWarningTime(value),expected);
});


for(const hold of ['paused','coachingHold','hidden'])test(`${hold} does not consume an unannounced live enemy crossing warning`,()=>{
  const h=startupHarness({width:390,height:650}),game=new Game({rulesetId:'frontier-flight-open',ai:false,seed:1717});
  const paid=game.build('aerie',1950,450,1);assert.equal(paid.ok,true);assert.equal(game.setFlightPlan(paid.building.id,0,1).ok,true);
  h.c.start(game);const sounds=[];h.c.sound=name=>sounds.push(name);
  let warning;
  for(let i=0;i<200;i++){game.update(.05);warning=game.state.units.find(u=>u.side===1&&u.airRoute?.phase==='warning');if(warning)break;}
  assert.ok(warning);const before=game.serialize();
  if(hold==='hidden')h.c.document.hidden=true;else h.c[hold]=true;
  h.c.updateHUD();assert.equal(h.$('flightAlert').textContent,'');assert.equal(sounds.includes('warning'),false);
  if(hold==='hidden')h.c.document.hidden=false;else h.c[hold]=false;
  h.c.updateHUD();assert.match(h.$('flightAlert').textContent,/Enemy gryphons.*north road/);
  assert.equal(sounds.filter(n=>n==='warning').length,1);
  h.c.updateHUD();assert.equal(sounds.filter(n=>n==='warning').length,1,'the same live warning is announced once');
  assert.deepEqual(game.serialize(),before,'feedback changes neither combat nor timer/RNG');
});
