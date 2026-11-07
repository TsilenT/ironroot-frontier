import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../dist/engine.js';
import { flightRoadName, airRulesGuide, airBuildingDescription, flightRouteRows, flightWarningSummary, flightWarningTime } from '../dist/flight-orders-view.js';
import { startupHarness } from './mobile-startup-fixture.mjs';

function setup(rulesetId = 'frontier-flight-open') {
  const game = new Game({rulesetId, ai: false, seed: 1717});
  game.state.gold[0] = 900;
  const result = game.build('aerie', 550, 450);
  assert.equal(result.ok, true);
  return {game, building: result.building};
}
test('automatic flying descriptions explain local targets and actual anti-air range without orders', () => {
  const {game, building} = setup('frontier-air-local-open');
  const before = game.serialize(), guide = airRulesGuide(game);
  assert.equal(guide.title, 'Flying between roads');
  assert.match(guide.detail, /one road over.*automatically.*farther across the field/);
  assert.match(guide.detail, /Archers stay on their road.*within range/);
  assert.doesNotMatch(guide.detail, /gateway|two-second|route|Hold road|North road|South road/);
  assert.match(airBuildingDescription(game, 'aerie', building), /nearby enemies.*one road over.*Archers and towers/);
  assert.deepEqual(flightRouteRows(game),[]);
  assert.equal(flightWarningSummary(game,game.state.units),'');
  assert.deepEqual(game.serialize(),before);
});

test('non-automatic battle identities have no automatic guide or route instructions', () => {
  for(const id of ['frontier-flight-open','frontier-rootwarden-open']) {
    const {game,building}=setup(id),before=game.serialize();
    assert.equal(airRulesGuide(game),null);
    assert.equal(airBuildingDescription(game,'aerie',building),game.buildings.aerie.description);
    assert.deepEqual(game.serialize(),before);
  }
  assert.equal(airRulesGuide(null),null);
  assert.equal(flightRoadName({lanes:[340,560]},1),'South road');
  assert.equal(flightRoadName({lanes:[450]},0),'Only road');
  assert.equal(flightRoadName(setup().game.map,-1),'Unknown road');
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

test('actual aerie inspection is automatic and has no manual route information', () => {
  const h=startupHarness({width:390,height:650});
  for(const rulesetId of ['frontier-air-local-open','frontier-air-local-timed']) {
    const {game,building}=setup(rulesetId);h.c.start(game);h.c.ui.selected=building.id;
    const before=game.serialize();h.c.updateHUD();h.c.pause(true);h.c.updateHUD();
    for(const id of ['flightOrders','flightNorth','flightHold','flightSouth','pauseFlights','flightAlert'])
      assert.equal(h.c.document.querySelector('#'+id),null);
    assert.match(h.$('selectionDescription').textContent,/one road over/);
    assert.deepEqual(game.serialize(),before);
  }
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


