import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,MAPS,getRuleset} from '../dist/engine.js';
import {SHARED_CROSSING_RULESET_ID} from '../dist/rulesets.js';
import {createCampaignControl,advanceCampaignControl,campaignControlStatus,bridgeStatus,bridgeIncome,bridgeSummary,supportsCampaignControl,supportsBridgeControl,createBridgeControl,CAMPAIGN_CONTROL_RULES_TEXT} from '../dist/bridge-control.js';
import {createCampaignMission,evaluateCampaignMission,createCampaignRestart,CAMPAIGN_MISSIONS,CAMPAIGN_CHAPTERS,PROGRESSION_CAMPAIGN_MISSIONS,getCampaignMission,getCurrentCampaignRevision,campaignScenarioForGame,normalizeCampaignProgress,getProgressionCampaignOverview,isMissionUnlocked,recordCampaignResult,SHARED_CROSSING_CHAPTER,SHARED_CROSSING_MISSIONS} from '../dist/campaign.js';
import {encodeBattle,decodeBattle,identityOf,scenarioForBattle} from '../dist/battle-codec.js';
import {campaignProgress,playSharedCrossing} from './shared-crossing-policies.mjs';
const rule=getRuleset(SHARED_CROSSING_RULESET_ID),map=MAPS.classic,types=rule.units;
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
const troop=(side,lane,type='warrior',extra={})=>({side,type,hp:100,x:1600,y:map.lanes[lane],...extra});
const advance=(control,units,dt=.05)=>advanceCampaignControl(control,map,units,dt,types);
const owner=(side=0)=>({owner:side,capturing:null,progress:0});
function pure(control,units=[]){return {ruleset:rule,map,units:types,state:{campaignControl:control,units,time:10,winner:null,bases:[{hp:6000},{hp:6000}]}};}
function emptyGame(){const g=createCampaignMission('shared-crossing');g.state.buildings=[];g.state.effects=[];g.state.income=[5,5];return g;}
function setClock(g,time){g.state.time=time;g.tick=Math.round(time/.05);}
function ownedPair(g,held=0){setClock(g,Math.max(2,g.state.time));g.state.campaignControl.bridges=[owner(),owner(),owner(null)];g.state.campaignControl.heldSeconds=held;}

test('new immutable campaign identity is isolated from all published missions, maps and Skirmish economy',()=>{
  assert.equal(supportsCampaignControl(rule),true);assert.equal(supportsBridgeControl(rule),false);
  assert.equal(rule.campaignOnly,true);assert.equal(rule.economy.policy,'legacy');assert.equal(rule.fog,undefined);
  assert.equal(rule.movement.policy,'autonomous-air-local-v1');assert.ok(Object.isFrozen(rule.campaignControl));
  assert.equal(CAMPAIGN_MISSIONS.length,16);assert.equal(CAMPAIGN_CHAPTERS.length,5);assert.equal(PROGRESSION_CAMPAIGN_MISSIONS.length,16);
  assert.equal(SHARED_CROSSING_CHAPTER.number,6);assert.equal(SHARED_CROSSING_CHAPTER.name,'The River Compact');assert.equal(SHARED_CROSSING_MISSIONS.length,1);
  assert.equal(getCurrentCampaignRevision('common-ground'),5);assert.equal(getCurrentCampaignRevision('shared-crossing'),1);
  for(const revision of [2,3,4,5])assert.throws(()=>getCampaignMission('shared-crossing',revision));
  assert.throws(()=>new Game({rulesetId:rule.id,mapId:'twin-span'}));
  const game=createCampaignMission('shared-crossing');assert.equal(Object.hasOwn(game.state,'bridgeControl'),false);
  assert.deepEqual(campaignScenarioForGame(game,'shared-crossing'),{kind:'campaign',id:'shared-crossing',revision:1});
  assert.throws(()=>identityOf(game));assert.throws(()=>identityOf(new Game({rulesetId:'frontier-campaign-citadel-open'}),{kind:'campaign',id:'shared-crossing',revision:1}));
  assert.throws(()=>campaignScenarioForGame(game,'common-ground'));assert.deepEqual(bridgeIncome(game),[0,0]);
  assert.doesNotMatch(bridgeSummary(game),/earning|payment/);assert.match(CAMPAIGN_CONTROL_RULES_TEXT,/enemy denies/);
});

test('only current progression gains the chapter and Common Ground unlock; old progress/star values survive exactly',()=>{
  const progress=campaignProgress(),before=structuredClone(progress);
  assert.deepEqual(normalizeCampaignProgress(progress),before);
  const overview=getProgressionCampaignOverview(progress);assert.equal(overview.total,32);assert.equal(overview.maxStars,96);assert.equal(overview.chapters.find(c=>c.id==='river-compact').total,5);assert.equal(overview.nextMissionId,'shared-crossing');
  assert.equal(isMissionUnlocked(progress,'shared-crossing'),true);
  delete progress.missions['common-ground'];assert.equal(isMissionUnlocked(progress,'shared-crossing'),false);
  progress.missions['shared-crossing']={completed:true,stars:3,bestTime:70};assert.equal(normalizeCampaignProgress(progress).missions['shared-crossing'],undefined);
  const won=emptyGame();ownedPair(won,60);setClock(won,62);const recorded=recordCampaignResult(before,'shared-crossing',won);
  for(const [id,r]of Object.entries(before.missions))assert.deepEqual(recorded.missions[id],r);
  assert.equal(recorded.missions['shared-crossing'].stars,3);
});

test('capture symmetry and ground-only eligibility; air denies either side but never captures',()=>{
  for(const side of [0,1]){
    const c=createCampaignControl(map);
    advance(c,[troop(side,0,'gryphon')],3);assert.equal(c.bridges[0].owner,null);
    advance(c,[troop(side,0)],1.95);assert.equal(c.bridges[0].owner,null);
    advance(c,[troop(side,0)]);assert.deepEqual(c.bridges[0],owner(side));
    advance(c,[troop(1-side,0,'gryphon')],8);assert.equal(c.bridges[0].owner,side);assert.equal(bridgeStatus(pure(c,[troop(1-side,0,'gryphon')]))[0].blocked,true);
    advance(c,[troop(1-side,0)],1.8);assert.equal(c.bridges[0].owner,side);
    advance(c,[],.1);assert.deepEqual(c.bridges[0],owner(side));
    advance(c,[troop(1-side,0)],1.95);assert.equal(c.bridges[0].owner,side);
    advance(c,[troop(1-side,0)]);assert.equal(c.bridges[0].owner,1-side);
  }
});

test('two captures at different sub-tick boundaries count only their overlapping eligible time',()=>{
  const c=createCampaignControl(map);c.bridges[0]={owner:null,capturing:0,progress:1.97};c.bridges[1]={owner:null,capturing:0,progress:1.98};
  near(advance(c,[troop(0,0),troop(0,1)],.05),.02);near(c.heldSeconds,.02);
  assert.deepEqual(c.bridges.slice(0,2),[owner(),owner()]);
  const d=createCampaignControl(map);d.bridges[0]=owner();d.bridges[1]={owner:1,capturing:0,progress:1.97};
  near(advance(d,[troop(0,1)],.05),.02);
  const e=createCampaignControl(map);advance(e,[troop(0,0),troop(0,1)],2);near(e.heldSeconds,0);advance(e,[],.05);near(e.heldSeconds,.05);
});

test('any pair qualifies; a third bridge is optional and does not multiply the clock',()=>{
  for(const pair of [[0,1],[0,2],[1,2]]){
    const c=createCampaignControl(map);for(const lane of pair)c.bridges[lane]=owner();
    near(advance(c,[],.5),.5);assert.equal(campaignControlStatus(pure(c)).count,2);
    const spare=[0,1,2].find(i=>!pair.includes(i));c.bridges[spare]=owner();
    near(advance(c,[troop(1,spare,'gryphon')],.5),.5,'other two stay eligible');
    near(advance(c,[],.5),.5);assert.equal(campaignControlStatus(pure(c)).count,3);
  }
  const c=createCampaignControl(map);c.bridges=[{owner:null,capturing:0,progress:1.99},{owner:null,capturing:0,progress:1.96},{owner:null,capturing:0,progress:1.98}];
  near(advance(c,[troop(0,0),troop(0,1),troop(0,2)],.05),.03,'second capture, not first or last');
});

test('contested or lost pair pauses without reset, retained empty ownership resumes after an aborted takeover',()=>{
  const c=createCampaignControl(map);c.bridges=[owner(),owner(),owner(null)];advance(c,[],4);near(c.heldSeconds,4);
  advance(c,[troop(1,1,'gryphon')],3);near(c.heldSeconds,4);
  advance(c,[troop(1,1)],1.9);near(c.heldSeconds,4);assert.equal(c.bridges[1].capturing,1);
  advance(c,[],.1);near(c.heldSeconds,4.1);assert.deepEqual(c.bridges[1],owner());
  advance(c,[troop(1,1)],2);near(c.heldSeconds,4.1);assert.equal(c.bridges[1].owner,1);
  advance(c,[],5);near(c.heldSeconds,4.1);
  advance(c,[troop(0,2)],2.5);near(c.heldSeconds,4.6,'new pair uses only post-capture .5 seconds');
  assert.deepEqual(c.bridges.map(b=>b.owner),[0,1,0]);
});

test('units are sampled by live actual position, not lane metadata; invalid entities do not capture or deny',()=>{
  const c=createCampaignControl(map),fake=[troop(0,0,'barracks'),troop(0,1,'constructor'),troop(0,1,'warrior',{hp:0})];
  advance(c,fake,3);assert.ok(c.bridges.every(b=>b.owner===null));
  advance(c,[troop(0,0,'warrior',{lane:2,x:1495,y:195}),troop(0,1,'warrior',{lane:0,x:1705,y:515})],2);
  near(advance(c,fake,.5),.5);
  const outside=troop(1,0,'gryphon',{x:1494.999});near(advance(c,[outside],.5),.5);
});

test('actual engine captures, preserves exact resumed time and ordinary income without retroactive credit',()=>{
  let g=emptyGame();
  for(const lane of [0,2]){const b=g._place('barracks',1250,map.lanes[lane],0);g._spawn(b);const u=g.state.units.at(-1);u.x=1500;u.y=map.lanes[lane];}
  g.state.buildings=[];g.state.effects=[];
  const initialGold=g.state.gold[0];for(let i=0;i<25;i++)g.update(.05);
  near(g.state.campaignControl.bridges[0].progress,1.25);
  const opts={campaignProgress:campaignProgress()},scenario=scenarioForBattle(null,'shared-crossing',g);
  const restored=decodeBattle(encodeBattle(g,scenario,opts),opts).game;
  for(let i=0;i<45;i++){g.update(.05);restored.update(.05);}
  near(g.state.campaignControl.heldSeconds,1.5);near(g.state.gold[0]-initialGold,5*g.state.time);
  assert.deepEqual(restored.serialize(),g.serialize());
  const snapshot=g.serialize();for(let i=0;i<50;i++){evaluateCampaignMission(g,'shared-crossing');campaignControlStatus(g);bridgeStatus(g);}assert.deepEqual(g.serialize(),snapshot);
  g.update(0);g.update(NaN);assert.deepEqual(g.serialize(),snapshot,'no simulation time means no progress');
  for(let i=0;i<100;i++){g.update(.137);restored.update(.137);}assert.deepEqual(restored.serialize(),g.serialize());
  assert.deepEqual(Game.restore(g.serialize()).serialize(),g.serialize());
  const restart=createCampaignRestart(g,'shared-crossing');assert.equal(restart.state.campaignControl.heldSeconds,0);assert.ok(restart.state.campaignControl.bridges.every(b=>b.owner===null));
});

test('terminal control/deadline engine steps freeze exactly without repeated evaluator or accumulator side effects',()=>{
  for(const [held,expected]of [[59.95,true],[59.9,false]]){
    const g=emptyGame();ownedPair(g,held);setClock(g,269.95);g.update(.25);
    near(g.state.time,270);near(g.state.campaignControl.heldSeconds,held+.05);
    const result=evaluateCampaignMission(g,'shared-crossing');assert.equal(result.completed,expected);assert.equal(result.failed,!expected);assert.equal(g.state.winner,null);
    const ended=g.serialize();for(let i=0;i<5;i++){g.update(.25);g._step(.05);evaluateCampaignMission(g,'shared-crossing');}assert.deepEqual(g.serialize(),ended);
    assert.deepEqual(Game.restore(ended).serialize(),ended);
    assert.throws(()=>encodeBattle(g,scenarioForBattle(null,'shared-crossing',g),{campaignProgress:campaignProgress()}),/already ended/);
  }
  const late=emptyGame();ownedPair(late,60);setClock(late,270.05);late.state.bases[1].hp=0;assert.equal(evaluateCampaignMission(late,'shared-crossing').failed,true,'no retroactive success after the deadline');
  const g=emptyGame();ownedPair(g,59.98);setClock(g,75);g.update(.25);near(g.state.campaignControl.heldSeconds,60);near(g.state.time,75.05);
  const ended=g.serialize();g.update(.05);assert.deepEqual(g.serialize(),ended);assert.equal(campaignControlStatus(g).advancing,false);
});

function imminentCore(side){const g=emptyGame();ownedPair(g,59.95);setClock(g,269.95);g.state.bases[1-side].hp=1;const b=g._place('barracks',side?1950:1250,map.lanes[1],side);g._spawn(b);const u=g.state.units.at(-1);u.x=side?120:3080;u.y=450;u.cooldown=0;g.state.buildings=[];g.state.effects=[];return g;}
test('same-step core destruction outranks control, player core death fails, including simultaneous destruction',()=>{
  for(const side of [0,1]){
    const g=imminentCore(side);g.update(.05);assert.equal(g.state.winner,side);near(g.state.campaignControl.heldSeconds,59.95);
    const result=evaluateCampaignMission(g,'shared-crossing');assert.equal(result.completed,side===0);assert.equal(result.failed,side===1);
    assert.equal(result.label,side===0?'Enemy citadel destroyed.':'Your citadel fell.');
  }
  const g=imminentCore(0),b=g._place('barracks',1950,450,1);g._spawn(b);Object.assign(g.state.units.at(-1),{x:120,y:450,cooldown:0});g.state.buildings=[];g.state.bases[0].hp=1;
  g.update(.05);assert.equal(g.state.winner,'draw');assert.equal(evaluateCampaignMission(g,'shared-crossing').failed,true);near(g.state.campaignControl.heldSeconds,59.95);
});

test('campaign-only save extension strictly rejects malformed state and cannot leak under old identities',()=>{
  const g=emptyGame();ownedPair(g,2);setClock(g,4);const valid=g.serialize();assert.deepEqual(Game.restore(valid).serialize(),valid);
  const corruptions=[s=>delete s.state.campaignControl,s=>s.state.campaignControl.earned=[0,0],s=>s.state.campaignControl.heldSeconds=-1,s=>s.state.campaignControl.heldSeconds=60.01,s=>s.state.campaignControl.heldSeconds=2.01,s=>s.state.campaignControl.heldSeconds='2',s=>s.state.campaignControl.bridges.pop(),s=>s.state.campaignControl.bridges[0].owner=2,s=>s.state.campaignControl.bridges[0].progress=.1,s=>s.state.campaignControl.bridges[0].extra=true,s=>s.state.time=271,s=>s.mapId='twin-span',s=>s.rulesetId='frontier-campaign-citadel-open',s=>s.state.bridgeControl=createBridgeControl(map)];
  for(const corrupt of corruptions){const s=structuredClone(valid);corrupt(s);assert.throws(()=>Game.restore(s),String(corrupt));}
  for(const old of [new Game({ai:false}),new Game({rulesetId:'frontier-citadel-bridge-open',ai:false})]){
    const s=old.serialize();s.state.campaignControl=valid.state.campaignControl;assert.throws(()=>Game.restore(s));
    const original=old.serialize();assert.deepEqual(Game.restore(original).serialize(),original);
    if(original.state.bridgeControl){original.state.bridgeControl.heldSeconds=0;assert.throws(()=>Game.restore(original));}
  }
});

test('paid pair routes and uninterrupted vs repeatedly restored runs remain deterministic across seeds',()=>{
  for(const [route,seed]of [['northMiddleWardens',719],['northMiddle',123],['middleSouth',6101],['middleSouth',719],['northSouth',123],['wardenSupport',51017],['airOnly',719],['concentratedRush',6101],['idle',719]]){
    const original=playSharedCrossing({route,seed}),restored=playSharedCrossing({route,seed,restore:true});
    assert.deepEqual(restored.game.serialize(),original.game.serialize(),`${route} ${seed}`);
    assert.deepEqual(restored.outcome,original.outcome);assert.ok(restored.summary.saved>0);
    if(['northMiddleWardens','northMiddle','middleSouth','northSouth','wardenSupport'].includes(route))assert.equal(original.outcome.completed,true);
    if(['airOnly','idle','concentratedRush'].includes(route))assert.equal(original.summary.seconds,0);
  }
});


test('new mission rejects off-grid and mismatched clocks before they can cross the exact deadline',()=>{
  const g=emptyGame();setClock(g,269.95);const valid=g.serialize();
  for(const edit of [s=>s.state.time=269.99,s=>s.state.time=269.96,s=>s.tick--,s=>s.tick++]){
    const bad=structuredClone(valid);edit(bad);assert.throws(()=>Game.restore(bad),/time does not match tick/);
  }
  const restored=Game.restore(valid);restored.update(.25);near(restored.state.time,270);
  assert.deepEqual(Game.restore(restored.serialize()).serialize(),restored.serialize());
  // This is deliberately additive. Old identities keep accepting their original
  // clock shapes rather than acquiring an unversioned stricter admission rule.
  const old=new Game({rulesetId:'frontier-citadel-open',ai:false}).serialize();old.state.time=269.99;old.tick=5399;
  assert.deepEqual(Game.restore(old).serialize(),old);
});
