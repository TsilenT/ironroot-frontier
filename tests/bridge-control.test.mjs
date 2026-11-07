import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {Game, MAPS, RULESETS, worldX, getRuleset} from '../dist/engine.js';
import {supportsBridgeControl, bridgeZones, createBridgeControl, advanceBridgeControl, bridgeStatus, bridgeIncome} from '../dist/bridge-control.js';
import {encodeBattle, decodeBattle, identityOf} from '../dist/battle-codec.js';
import {createCurrentChallenge, CURRENT_CHALLENGES} from '../dist/challenges.js';
import {createProgressionCampaignMission, createCampaignProgress} from '../dist/campaign.js';
import {createCurrentTrainingSession, TRAINING_LESSONS} from '../dist/training.js';
import {createBattleJournal, exportBattleReport} from '../dist/battle-report.js';
const eps=1e-8;
const near=(actual,expected,message)=>assert.ok(Math.abs(actual-expected)<eps,`${message||'amount'}: ${actual} != ${expected}`);
const modern=(mapId='classic',rulesetId='frontier-bridge-open')=>new Game({mapId,rulesetId,seed:51017,ai:false});
const types=getRuleset('frontier-bridge-open').units;
const troop=(side=0,type='warrior',x=1600,y=260,extra={})=>({side,type,hp:1,x,y,...extra});
const pay=(control,units,dt=.05,map=MAPS.classic)=>advanceBridgeControl(control,map,units,dt,types);
const pureGame=(control,units=[],map=MAPS.classic)=>({map,ruleset:getRuleset('frontier-bridge-open'),units:types,state:{bridgeControl:control,units}});
function hold(control,units,seconds,map=MAPS.classic) {let total=[0,0];for(let n=0;n<Math.round(seconds/.05);n++){const p=pay(control,units,.05,map);total=total.map((v,i)=>v+p[i]);}return total;}

test('bridge contract is opt-in through frozen whole rulesets with existing automatic flyers and endgame rules',()=>{
  assert.deepEqual(Object.values(RULESETS).filter(supportsBridgeControl).map(r=>r.id).sort(),['frontier-bridge-open','frontier-bridge-timed','frontier-citadel-bridge-open','frontier-citadel-bridge-timed'].sort());
  for(const id of ['frontier-bridge-open','frontier-bridge-timed']) {
    const game=modern('classic',id),off=getRuleset(id.endsWith('timed')?'frontier-air-local-timed':'frontier-air-local-open');
    assert.ok(Object.isFrozen(game.ruleset.economy));assert.equal(game.units,off.units);assert.equal(game.buildings,off.buildings);
    assert.deepEqual(game.ruleset.movement,off.movement);assert.deepEqual(game.ruleset.endgame,off.endgame);
    assert.throws(()=>{game.ruleset=off;},TypeError);assert.throws(()=>{game.ruleset.economy.policy='legacy';},TypeError);
  }
  assert.equal(supportsBridgeControl(new Game().ruleset),false);
});

test('every road has a symmetric 210 by 130 inclusive center zone, determined by actual position',()=>{
  for(const map of Object.values(MAPS)) {
    const zones=bridgeZones(map);assert.equal(zones.length,map.lanes.length);
    zones.forEach((zone,lane)=>{
      assert.deepEqual(zone,{lane,x:map.width/2,y:map.lanes[lane],width:210,height:130});
      for(const dx of [-105,105])for(const dy of [-65,65]) {
        const c=createBridgeControl(map),u=troop(0,'warrior',zone.x+dx,zone.y+dy,{lane:(lane+1)%map.lanes.length});
        hold(c,[u],2,map);assert.equal(c.bridges[lane].owner,0);
      }
      for(const [dx,dy]of [[105.0001,0],[-105.0001,0],[0,65.0001],[0,-65.0001]]) {
        const c=createBridgeControl(map);hold(c,[troop(0,'warrior',zone.x+dx,zone.y+dy,{lane})],2,map);
        assert.ok(c.bridges.every(b=>b.owner===null));
      }
    });
  }
});

test('empty untouched bridges stay unowned; dead units, buildings, projectiles and unknown types cannot capture or deny',()=>{
  const c=createBridgeControl(MAPS.classic);
  const excluded=[troop(0,'warrior',1600,260,{hp:0}),troop(0,'warrior',1600,260,{hp:-1}),troop(0,'barracks'),troop(0,'tower'),troop(0,'projectile'),troop(0,'constructor')];
  near(hold(c,excluded,4)[0],0);assert.deepEqual(c,createBridgeControl(MAPS.classic));
  hold(c,[troop(0)],2);
  near(hold(c,excluded.map(u=>({...u,side:1})),3)[0],.5);
});

test('first capture needs continuous two seconds and pays only time after the threshold',()=>{
  const c=createBridgeControl(MAPS.classic),u=troop(0);
  near(hold(c,[u],1.95)[0],0);assert.equal(c.bridges[0].owner,null);near(c.bridges[0].progress,1.95);
  near(pay(c,[u],.05)[0],0);assert.deepEqual(c.bridges[0],{owner:0,capturing:null,progress:0});
  near(pay(c,[u],.05)[0],.5/3*.05);
  const split=createBridgeControl(MAPS.classic);hold(split,[u],1.95);
  near(pay(split,[u],.1)[0],.5/3*.05,'only .05 of .1 sec earns');
  near(split.earned[0],c.earned[0]);
});

test('ground captures and same-side air can accompany it; opposing air interrupts and cannot capture alone',()=>{
  const c=createBridgeControl(MAPS.classic),ground=troop(0),ownAir=troop(0,'gryphon'),enemyAir=troop(1,'gryphon');
  hold(c,[ownAir],3);assert.equal(c.bridges[0].owner,null);
  hold(c,[ground,ownAir],1.5);near(c.bridges[0].progress,1.5);
  pay(c,[ground,enemyAir]);assert.deepEqual(c.bridges[0],{owner:null,capturing:null,progress:0});
  hold(c,[ground],1.95);assert.equal(c.bridges[0].owner,null);
  pay(c,[ground]);assert.equal(c.bridges[0].owner,0);
  near(hold(c,[enemyAir],4)[0],0);assert.equal(c.bridges[0].owner,0);assert.equal(c.bridges[0].capturing,null);
  near(hold(c,[ownAir],3)[0],.5);assert.equal(bridgeStatus(pureGame(c,[enemyAir]))[0].blocked,true);
});

test('both living sides stop capture and payment, retaining the owner regardless of entity order',()=>{
  for(const reverse of [false,true]) {
    const c=createBridgeControl(MAPS.classic);hold(c,[troop(0)],2);
    const units=[troop(0),troop(1)];if(reverse)units.reverse();
    near(hold(c,units,4)[0],0);assert.deepEqual(c.bridges[0],{owner:0,capturing:null,progress:0});
    const status=bridgeStatus(pureGame(c,units))[0];assert.equal(status.blocked,true);assert.equal(status.income,0);
    const dead=units.map(u=>({...u,hp:u.side?0:1}));near(pay(c,dead)[0],.5/3*.05);
  }
});

test('unfinished enemy capture suspends old income; withdrawal resumes it; returning owner cannot cause instant flip',()=>{
  const c=createBridgeControl(MAPS.classic);hold(c,[troop(0)],2);
  near(hold(c,[troop(1)],1.5)[0],0);assert.deepEqual(c.bridges[0],{owner:0,capturing:1,progress:c.bridges[0].progress});near(c.bridges[0].progress,1.5);
  const status=bridgeStatus(pureGame(c,[troop(1)]))[0];assert.equal(status.owner,0);assert.equal(status.blocked,true);assert.equal(status.income,0);
  near(pay(c,[])[0],.5/3*.05);assert.deepEqual(c.bridges[0],{owner:0,capturing:null,progress:0});
  hold(c,[troop(1)],1.95);assert.equal(c.bridges[0].owner,0);pay(c,[troop(1)]);assert.equal(c.bridges[0].owner,1);
  hold(c,[troop(0)],1.95);assert.equal(c.bridges[0].owner,1);pay(c,[troop(0)]);assert.equal(c.bridges[0].owner,0);
});

test('ownership persists empty indefinitely within the supported horizon, with repeated symmetric flips',()=>{
  const c=createBridgeControl(MAPS.classic);hold(c,[troop(0)],2);
  near(pay(c,[],86400)[0],14400);assert.equal(c.bridges[0].owner,0);
  for(const owner of [1,0,1,0]) {
    near(hold(c,[troop(owner)],2)[owner],0);assert.equal(c.bridges[0].owner,owner);
    near(hold(c,[],3)[owner],.5);
  }
});

test('reward is at most 0.5 per second map-wide, divided by roads and identical under mirrored sides',()=>{
  for(const map of Object.values(MAPS)) {
    const run=mirror=>{
      const c=createBridgeControl(map),units=bridgeZones(map).map(z=>troop((z.lane%2)^mirror,'warrior',z.x,z.y));
      hold(c,units,2,map);const paid=hold(c,[],10,map);
      near(paid[0]+paid[1],5);const income=bridgeIncome(pureGame(c,[],map));near(income[0]+income[1],.5);
      c.bridges.forEach((b,i)=>assert.equal(b.owner,(i%2)^mirror));return paid;
    };
    const left=run(0),right=run(1);near(left[0],right[1]);near(left[1],right[0]);
  }
});

function movingCapture(mapId='classic') {
  const g=modern(mapId),b=g.state.buildings.find(b=>b.side===0);g._spawn(b);g.state.units=g.state.units.filter(u=>u.side===0);
  const u=g.state.units[0];u.x=g.map.width/2-100;u.y=g.map.lanes[0];u.lane=0;u.cooldown=0;
  g.state.buildings=[];g.state.effects=[];return g;
}

test('real engine credits exact incremental gold and saves unfinished capture then continues byte-identically',()=>{
  for(const mapId of Object.keys(MAPS)) {
    const original=movingCapture(mapId),startGold=original.state.gold[0];
    for(let i=0;i<25;i++)original.update(.05);
    assert.equal(original.state.bridgeControl.bridges[0].owner,null);near(original.state.bridgeControl.bridges[0].progress,1.25);
    const restored=decodeBattle(encodeBattle(original)).game;
    for(let i=0;i<15;i++){original.update(.05);restored.update(.05);}
    assert.equal(original.state.bridgeControl.bridges[0].owner,0);near(original.state.bridgeControl.earned[0],0);
    for(let i=0;i<50;i++){original.update(.137);restored.update(.137);}
    assert.deepEqual(restored.serialize(),original.serialize());
    near(original.state.gold[0]-startGold,original.state.time*5+original.state.bridgeControl.earned[0]);
    near(original.state.income[0],5+bridgeIncome(original)[0]);
    assert.equal(original.state.bridgeControl.bridges[0].owner,0,'empty retained owner saves too');
    assert.deepEqual(Game.restore(original.serialize()).serialize(),original.serialize());
  }
});

test('new-mode save schema rejects malformed ownership, progress, income, counters and unknown fields',()=>{
  const g=movingCapture();for(let i=0;i<50;i++)g.update(.05);const valid=g.serialize();
  const corruptions=[
    s=>delete s.state.bridgeControl,s=>s.state.bridgeControl.extra=true,s=>s.state.bridgeControl.bridges.pop(),
    s=>s.state.bridgeControl.bridges[0].extra=1,s=>s.state.bridgeControl.bridges[0].owner=2,
    s=>s.state.bridgeControl.bridges[0].capturing='0',s=>s.state.bridgeControl.bridges[0].progress=-.1,
    s=>s.state.bridgeControl.bridges[0].progress=2,s=>s.state.bridgeControl.bridges[0].progress=.1,
    s=>Object.assign(s.state.bridgeControl.bridges[0],{capturing:0,progress:.5}),
    s=>s.state.bridgeControl.earned[0]=-1,s=>s.state.bridgeControl.earned[0]=s.state.time*.5+1,
    s=>s.state.bridgeControl.earned=[.2,.2],s=>s.state.income[0]=20.5001,
    s=>s.state.time=1,s=>s.rulesetId='frontier-air-local-open',
  ];
  for(const corrupt of corruptions){const changed=structuredClone(valid);corrupt(changed);assert.throws(()=>Game.restore(changed),String(corrupt));}
  for(const id of ['frontier-legacy','frontier-air-local-open','frontier-authored-air-local']) {
    const off=new Game({rulesetId:id,ai:false}).serialize();off.state.income[0]=20.01;assert.throws(()=>Game.restore(off));
  }
});

test('authored identities and current campaign, trial and practice factories cannot receive bridge income',()=>{
  const bridge=modern();
  for(const scenario of [{kind:'campaign',id:'roadside-watch',revision:4},{kind:'trial',id:'shieldbreaker',revision:2},{kind:'lesson',id:'first-barracks',revision:1}])assert.throws(()=>identityOf(bridge,scenario));
  const campaign=createProgressionCampaignMission('roadside-watch',createCampaignProgress());
  const trialGames=CURRENT_CHALLENGES.map(c=>createCurrentChallenge(c.id));
  const practiceGames=TRAINING_LESSONS.map(lesson=>createCurrentTrainingSession({lessonId:lesson.id}).game);
  for(const game of [campaign,...trialGames,...practiceGames]) {
    assert.equal(supportsBridgeControl(game.ruleset),false);assert.equal(Object.hasOwn(game.state,'bridgeControl'),false);
    assert.deepEqual(bridgeIncome(game),[0,0]);assert.deepEqual(bridgeStatus(game),[]);
  }
});

// Captured from verified base 495cf2563f8b9f06723e27e06ae77dcdc5d9b2ca via git archive.
// These are exact serialized snapshots every 20s through 180s under paid decisions.
// Including air, Rootwardens and mines exercises unrelated combat/economy paths.
const offHashes={
  'classic/frontier-air-local-open':'1450156e81d96b047e3adeac0ef63a30513a0ad0825fffe9aa32e6f817bfebe7',
  'classic/frontier-air-local-timed':'25bf9e729a54ef9fc7eb8e801b68d975567a73f4f4d0ec7f05c35ecafc98d53b',
  'long-march/frontier-air-local-open':'003b28a0615fe04f631a6377d9bd1e95d091a89369bff06b1bd41630c45cee71',
  'long-march/frontier-air-local-timed':'f0d600af1969b3adf43b96dbb34aa58addfb285f9ad5e36c29ecab64ecf5df32',
  'twin-span/frontier-air-local-open':'745e8fbbedf93b8274c23a32280953a9480d2f0fcc28b2a94d352004134202b1',
  'twin-span/frontier-air-local-timed':'edc7aa5246ddcf4f297b7152bdc0beee4e431fe1c8a14c9aca65bfbb56af5bb3'
};
test('mode off is exactly behavior-identical to verified v0.18.1 across all Skirmish maps and endgame identities',()=>{
  for(const [key,expected]of Object.entries(offHashes)) {
    const [mapId,rulesetId]=key.split('/'),game=new Game({mapId,rulesetId,seed:51017,ai:false,difficulty:'normal'});
    const queues=[['wardenLodge','archery','aerie','mint','foundry','barracks'],['barracks','sanctum','archery','aerie','wardenLodge','mint']],next=[0,0],snapshots=[];
    for(let tick=0;tick<=3600;tick++) {
      if(tick%20===0)for(let side=0;side<2;side++) {
        const type=queues[side][next[side]];
        if(type){const lane=next[side]%game.map.lanes.length;for(const home of [1250,1110,970,830,690,550,410,270])if(game.build(type,worldX(game.map,side,home),game.map.lanes[lane],side).ok){next[side]++;break;}}
      }
      if(tick%400===0)snapshots.push(game.serialize());
      if(tick<3600)game.update(.05);
    }
    assert.equal(createHash('sha256').update(JSON.stringify(snapshots)).digest('hex'),expected,key);
    assert.equal(Object.hasOwn(game.state,'bridgeControl'),false);
  }
});


test('bridge reward has no overtime multiplier and does not force open-ended outcomes',()=>{
  for(const id of ['frontier-bridge-open','frontier-bridge-timed'])for(const time of [299.95,419.95]) {
    const g=modern('classic',id);g.state.buildings=[];g.state.effects=[];
    const troops=bridgeZones(g.map).map(z=>troop(0,'warrior',z.x,z.y));
    hold(g.state.bridgeControl,troops,2,g.map);g.state.time=time;g.tick=Math.round(time/.05);
    const before=g.state.gold[0],earned=g.state.bridgeControl.earned[0];
    for(let i=0;i<200;i++)g.update(.05);
    near(g.state.bridgeControl.earned[0]-earned,5);near(g.state.gold[0]-before,55);near(g.state.income[0],5.5);
    assert.equal(g.state.winner,null);
    if(id==='frontier-bridge-open')assert.equal(g.state.bases[0].hp,6000);
  }
});

test('reports preserve total income and separately expose current bridge rate and exact full-match bridge gold after restore',()=>{
  const g=movingCapture();for(let i=0;i<100;i++)g.update(.05);
  const restored=decodeBattle(encodeBattle(g)).game,journal=createBattleJournal(restored,{resumed:true});
  const before=JSON.stringify(restored.serialize());
  const report=journal.finish(restored,{objectiveOutcome:{completed:true,failed:false,label:'Test complete'}});
  assert.equal(report.scope.resumed,true);near(report.final.sides[0].income,5+bridgeIncome(restored)[0]);
  near(report.final.sides[0].bridgeIncome,bridgeIncome(restored)[0]);
  near(report.cumulativeStats[0].bridgeGold,restored.state.bridgeControl.earned[0]);
  near(report.cumulativeStats[1].bridgeGold,0);
  assert.equal(report.rules.bridgeControl.policy,'persistent-bridge-v1');assert.match(exportBattleReport(report),/exact full-match engine counter/);
  assert.equal(JSON.stringify(restored.serialize()),before,'report is read only');
  const off=new Game({rulesetId:'frontier-air-local-open',ai:false});
  const ordinary=createBattleJournal(off).finish(off,{objectiveOutcome:{completed:true,failed:false,label:'Test complete'}});
  assert.equal(Object.hasOwn(ordinary.final.sides[0],'bridgeIncome'),false);
  assert.equal(Object.hasOwn(ordinary.cumulativeStats[0],'bridgeGold'),false);
  assert.equal(Object.hasOwn(ordinary.rules,'bridgeControl'),false);
});
