import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInContext} from 'node:vm';
import {Game, getRuleset, buildBounds, DEFAULT_SKIRMISH_RULESET_ID} from '../dist/engine.js';
import {createCodex, formatNumber, formatSeconds} from '../dist/codex.js';
import {createCampaignProgress,createCampaignMission,createCampaignRestart,campaignScenarioForGame} from '../dist/campaign.js';
import {startupHarness} from './mobile-startup-fixture.mjs';

const html=readFileSync(new URL('../dist/index.html',import.meta.url),'utf8');
const app=readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');
const section=(from,to)=>{
  const start=app.indexOf(from),end=app.indexOf(to,start);
  assert.ok(start>=0&&end>start,from);
  return app.slice(start,end);
};

// These checks execute actual app function bodies in the narrow source fixture.
// Native browser geometry, focus and input acceptance are separate evidence.
test('the actual app exposes no flight-order controls, command handler, route information or stale route instruction',()=>{
  assert.doesNotMatch(html,/id="flight(?:North|Hold|South|Orders)"|data-flight-order|Select an aerie after resuming|<summary>Air routes<\/summary>/);
  assert.doesNotMatch(app,/setFlightPlan|flightOrderModel|armedFlightControl|syncFlightOrders|Tap it for flight orders|aerie flight orders|flightOrders: supportsFlightOrders/);
  assert.doesNotMatch(html,/pauseFlights|pauseFlightList|flightAlert|Earlier air rules|saved aerie routes/);
  assert.doesNotMatch(app,/flightRouteRows|flightWarningSummary|updateFlightStatus/);
});

for(const suffix of ['open','timed'])test(`fresh ${suffix} skirmish selects automatic air and refuses old route-rule choices`,()=>{
  const h=startupHarness(),{c,$}=h;
  Object.assign(c,{getRuleset});c.mode='skirmish';
  runInContext(section('function updateSkirmishRules()','for (const button of document.querySelectorAll('),c);
  assert.equal(DEFAULT_SKIRMISH_RULESET_ID,'frontier-air-local-open');
  $('skirmishRules').value=`frontier-air-local-${suffix}`;$('skirmishRules').onchange();
  assert.equal(c.selectedRuleset,`frontier-air-local-${suffix}`);
  assert.match($('skirmishRulesDescription').textContent,/gryphons that seek nearby enemies one road over/);
  assert.doesNotMatch($('skirmishRulesDescription').textContent,/orders|gateway|warning|Hold road/);
  for(const rejected of ['frontier-flight-open','frontier-flight-timed','frontier-rootwarden-open']) {
    $('skirmishRules').value=rejected;$('skirmishRules').onchange();
    assert.equal(c.selectedRuleset,`frontier-air-local-${suffix}`);
  }
  c.start();
  assert.equal(c.game.ruleset.id,`frontier-air-local-${suffix}`);
  assert.equal(c.game.ruleset.movement.policy,'autonomous-air-local-v1');
  assert.equal(c.game.ruleset.endgame.forcedDecay,suffix==='timed');
  assert.equal(c.document.querySelector('#pauseFlights'),null);
});

test('the field guide uses active air rules without changing stats or retained saves',()=>{
  const h=startupHarness(),{c,$}=h;
  Object.assign(c,{createCodex,formatNumber,formatSeconds,drawUnitPortrait(){}});
  runInContext(section('function populateFieldGuide(','const viewportPause ='),c);
  const auto=new Game({rulesetId:'frontier-air-local-open',ai:false,seed:1700});
  const before=auto.serialize();c.populateFieldGuide(auto);
  assert.equal($('flightGuide').classList.contains('hidden'),false);
  assert.equal($('flightGuideTitle').textContent,'Flying between roads');
  assert.match($('flightGuideText').textContent,/one road over.*automatically/);
  assert.match($('unitCodex').innerHTML,/300 world units.*420 world units/);
  assert.equal(($('unitCodex').innerHTML.match(/300 world units/g)||[]).length,1,'use the canonical codex once, without UI duplication');
  assert.match($('unitCodex').innerHTML,/Archers stay on their road.*within range/);
  assert.deepEqual(createCodex(auto).UNIT_CODEX.find(u=>u.id==='gryphon').baseStats,
    createCodex(getRuleset('frontier-flight-open')).UNIT_CODEX.find(u=>u.id==='gryphon').baseStats);
  assert.deepEqual(auto.serialize(),before);
  const old=new Game({rulesetId:'frontier-flight-open',ai:false,seed:1700}),saved=old.serialize();
  c.populateFieldGuide(old);
  assert.equal($('flightGuide').classList.contains('hidden'),true);
  assert.equal($('flightGuideTitle').textContent,'');
  assert.doesNotMatch($('unitCodex').innerHTML,/300 world units|420 world units/);
  assert.deepEqual(old.serialize(),saved);
  c.populateFieldGuide(getRuleset('frontier-campaign-watch'));
  assert.equal($('flightGuide').classList.contains('hidden'),true);
  assert.equal($('flightGuideTitle').textContent,'');
  assert.equal($('flightGuideText').textContent,'');
});

test('a paid aerie placement explains automatic engagement and retains normal one-shot build behavior',()=>{
  const h=startupHarness({width:390,height:650}),{c,$}=h,notices=[];
  Object.assign(c,{buildBounds,toast:text=>notices.push(text)});
  c.renderer.snap=point=>point;
  runInContext(section('function selectBuild(','function cancel()'),c);
  runInContext(section('function activateBattlePoint(','function resetBattleGesture()'),c);
  c.mode='skirmish';c.start();c.game.state.gold[0]=900;
  c.setCompactBuildOpen(true);c.selectBuild('aerie');
  assert.match($('buildHelp').textContent,/one road over.*Archers and towers/);
  const before=c.game.state.gold[0];
  c.activateBattlePoint({x:550,y:450});
  assert.equal(c.game.state.gold[0],before-c.game.buildings.aerie.cost);
  assert.equal(c.game.state.buildings.filter(b=>b.side===0&&b.type==='aerie').length,1);
  assert.equal(c.ui.build,null);
  assert.equal($('app').classList.contains('compact-build-open'),false);
  assert.match(notices.at(-1),/Gryphons will seek nearby enemies, including one road over/);
  assert.doesNotMatch(notices.join(' '),/orders|route|gateway|Hold road/);
});

for(const id of ['shieldbreaker','skyguard','siegecraft','goldrush','holdfast'])test(`fresh ${id} trial and its actual Restart action use automatic air`,()=>{
  const h=startupHarness(),{c,$}=h,guideContexts=[];
  Object.assign(c,{getRuleset,renderChallenge(){},renderCampaign(){},populateFieldGuide:value=>guideContexts.push(value),progressDirty:false,SAVE:'ironroot.battle.v1'});
  c.selectedChallenge=id;
  runInContext(section('function setMode(','function updateSkirmishRules()'),c);
  c.setMode('challenges');
  assert.equal(guideContexts.at(-1).id,'frontier-authored-air-local');
  c.start();
  assert.equal(c.currentChallenge,id);
  assert.equal(c.game.ruleset.id,'frontier-authored-air-local');
  assert.equal(c.game.ruleset.movement.policy,'autonomous-air-local-v1');
  assert.equal(Object.keys(c.game.buildings).length,7);
  const initial=c.game.serialize();c.game.update(.25);const advanced=c.game.serialize();
  assert.notDeepEqual(advanced,initial);
  c.pause(true);let checkpoint=null;
  c.writeBattle=(_session,_key,candidate,challenge,campaign)=>{
    checkpoint={game:candidate.serialize(),challenge,campaign};return true;
  };
  runInContext(section('function hideRestart()','let settingsWasPaused ='),c);
  $('restartBattle').onclick();$('confirmRestart').onclick();
  assert.equal(checkpoint.challenge,id);assert.equal(checkpoint.campaign,null);
  assert.deepEqual(checkpoint.game,initial);
  assert.deepEqual(c.game.serialize(),initial);
  assert.equal(c.game.ruleset.movement.policy,'autonomous-air-local-v1');
});


for(const [id,mapId] of [['first-watch','intro-one-road'],['forked-road','intro-two-road']]) {
  test(`fresh optional ${id} uses automatic air with its original seven-building roster`,()=>{
    const h=startupHarness(),{c}=h;
    c.mode='campaign';c.selectedCampaign=id;c.campaignProgress=createCampaignProgress();
    if(id==='forked-road')c.campaignProgress.missions['first-watch']={completed:true,stars:2,bestTime:95};
    const progress=JSON.stringify(c.campaignProgress);
    c.start();
    assert.equal(c.currentCampaign,id);
    assert.deepEqual(campaignScenarioForGame(c.game,id),{kind:'campaign',id,revision:4});
    assert.equal(c.game.ruleset.id,'frontier-authored-air-local');
    assert.equal(c.game.ruleset.movement.policy,'autonomous-air-local-v1');
    assert.equal(c.game.map.id,mapId);
    assert.equal(Object.keys(c.game.buildings).length,7);
    assert.equal(c.game.buildings.wardenLodge,undefined);
    assert.equal(c.game.state.time,0);
    assert.equal(JSON.stringify(c.campaignProgress),progress);
    assert.equal(c.document.querySelector('[data-flight-order]'),null);
  });

  test(`explicit old ${id} Restart keeps its retained attempt rather than invoking a fresh launch`,()=>{
    const h=startupHarness(),{c,$}=h;
    c.mode='campaign';c.selectedCampaign=id;c.campaignProgress=createCampaignProgress();
    if(id==='forked-road')c.campaignProgress.missions['first-watch']={completed:true,stars:1,bestTime:95};
    const old=createCampaignMission(id),initial=old.serialize();old.update(.25);
    c.start(old,null,id);c.pause(true);
    Object.assign(c,{createCampaignRestart,progressDirty:false,SAVE:'ironroot.battle.v1',writeBattle:()=>true});
    runInContext(section('function hideRestart()','let settingsWasPaused ='),c);
    $('restartBattle').onclick();$('confirmRestart').onclick();
    assert.deepEqual(campaignScenarioForGame(c.game,id),{kind:'campaign',id,revision:1});
    assert.equal(c.game.ruleset.id,'frontier-legacy');
    assert.deepEqual(c.game.serialize(),initial);
  });
}
