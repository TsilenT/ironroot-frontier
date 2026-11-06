import assert from 'node:assert/strict';
import test from 'node:test';
import {Game,LANES} from '../dist/engine.js';
import {CAMPAIGN_CHAPTERS,CAMPAIGN_MISSIONS,CAMPAIGN_VERSION,createCampaignMission,evaluateCampaignMission,getCampaignTargets,currentIncome,createCampaignProgress,normalizeCampaignProgress,mergeCampaignProgress,recordCampaignResult,isMissionUnlocked,getCampaignOverview,readCampaignProgress,writeCampaignProgress} from '../dist/campaign.js';
import {playCampaign} from './campaign-policies.mjs';

const complete=(id)=>{const game=createCampaignMission(id);game.state.bases[1].hp=0;return game;};
function clearThrough(last) {let progress=createCampaignProgress();for(const mission of CAMPAIGN_MISSIONS){progress=recordCampaignResult(progress,mission.id,complete(mission.id));if(mission.id===last)break;}return progress;}

test('four chapters contain twelve independent deterministic and restorable campaign battles',()=>{
  assert.equal(CAMPAIGN_CHAPTERS.length,4);assert.equal(CAMPAIGN_MISSIONS.length,12);
  assert.equal(new Set(CAMPAIGN_MISSIONS.map(m=>m.id)).size,12);
  for(const chapter of CAMPAIGN_CHAPTERS)assert.equal(CAMPAIGN_MISSIONS.filter(m=>m.chapterId===chapter.id).length,3);
  for(const mission of CAMPAIGN_MISSIONS) {
    const a=createCampaignMission(mission.id),b=createCampaignMission(mission.id);
    assert.deepEqual(a.serialize(),b.serialize());assert.equal(a.ai,mission.ai);
    assert.equal(a.state.gold[0],mission.startingGold);assert.equal(a.state.bases[0].hp,mission.startingHealth);
    assert.equal(a.state.stats.built[0],mission.playerBuildings.length);assert.equal(a.state.stats.built[1],mission.enemyBuildings.length);
    assert.ok(mission.description&&mission.dialogue.speaker&&mission.dialogue.text&&mission.victoryText&&mission.hint&&mission.objective&&mission.reward);
    assert.ok(mission.briefing.length>=3);assert.equal(mission.medals.length,2);
    assert.deepEqual(Game.restore(a.serialize()).serialize(),a.serialize());
    const result=evaluateCampaignMission(a,mission.id);assert.equal(result.completed,false);assert.equal(result.failed,false);assert.equal(result.progress,0);assert.equal(result.stars,0);
    assert.ok(getCampaignTargets(a,mission.id).every(t=>t.building&&t.building.id===t.originalId));
    a.state.gold[0]--;assert.equal(b.state.gold[0],mission.startingGold);
  }
});

test('unknown mission IDs reject in all mission-specific APIs',()=>{
  for(const id of ['',null,undefined,'normal','constructor','toString','__proto__'])for(const action of [()=>createCampaignMission(id),()=>evaluateCampaignMission(new Game(),id),()=>getCampaignTargets(new Game(),id),()=>isMissionUnlocked(createCampaignProgress(),id),()=>recordCampaignResult(createCampaignProgress(),id,new Game())])assert.throws(action,/Unknown campaign mission/);
});

test('target destruction counts originals, never replacement buildings or stale object references',()=>{
  const mission=CAMPAIGN_MISSIONS.find(m=>m.id==='black-ledger');let game=createCampaignMission(mission.id);
  const target=getCampaignTargets(game,mission.id)[0];game.state.buildings=game.state.buildings.filter(b=>b.id!==target.originalId);game.state.gold[1]=1000;
  const replacement=game.build(target.type,target.x,LANES[target.lane],1);assert.equal(replacement.ok,true);assert.notEqual(replacement.building.id,target.originalId);
  game=Game.restore(game.serialize());
  assert.equal(getCampaignTargets(game,mission.id)[0].building,null);assert.equal(evaluateCampaignMission(game,mission.id).progress,1/3);
  for(const t of getCampaignTargets(game,mission.id))if(t.building)t.building.hp=0;
  const result=evaluateCampaignMission(game,mission.id);assert.equal(result.completed,true);assert.equal(result.failed,false);assert.equal(result.progress,1);assert.equal(game.state.winner,null);
});

test('protected original structures fail immediately if destroyed or salvaged, even after replacement',()=>{
  for(const mission of CAMPAIGN_MISSIONS.filter(m=>m.protectedTargets.length))for(const operation of ['destroy','sell']) {
    const game=createCampaignMission(mission.id),target=getCampaignTargets(game,mission.id).find(t=>t.kind==='protect');
    if(operation==='sell')assert.equal(game.sell(target.originalId).ok,true);else target.building.hp=0;
    game.state.buildings=game.state.buildings.filter(b=>b.id!==target.originalId);game.state.gold[0]=1000;
    assert.equal(game.build(target.type,target.x,LANES[target.lane]).ok,true);
    const result=evaluateCampaignMission(Game.restore(game.serialize()),mission.id);assert.equal(result.failed,true);assert.equal(result.completed,false);assert.match(result.label,/failed/);
    game.state.bases[1].hp=0;assert.equal(evaluateCampaignMission(game,mission.id).completed,false,'a core victory must not waive protection');
  }
});

test('deadlines, mandatory citadel health and simultaneous defeat have explicit precedence',()=>{
  for(const mission of CAMPAIGN_MISSIONS) {
    const game=createCampaignMission(mission.id);game.state.time=mission.timeLimit-.05;
    assert.equal(evaluateCampaignMission(game,mission.id).failed,false);
    game.state.time=mission.timeLimit;
    const result=evaluateCampaignMission(game,mission.id);
    assert.equal(result.completed,mission.mode==='survive');assert.equal(result.failed,mission.mode!=='survive');
    game.state.bases[1].hp=0;
    assert.equal(evaluateCampaignMission(game,mission.id).completed,true);
    game.state.bases[0].hp=0;
    assert.equal(evaluateCampaignMission(game,mission.id).completed,false);assert.equal(evaluateCampaignMission(game,mission.id).failed,true);
  }
  const game=createCampaignMission('furnace-heart');game.state.bases[0].hp=1999;game.state.bases[1].hp=0;
  assert.equal(evaluateCampaignMission(game,'furnace-heart').failed,true);
});

test('economy objectives use live mines and upgrades, and never succeed before the deadline',()=>{
  for(const id of ['winter-stores','crown-foothold']) {
    const mission=CAMPAIGN_MISSIONS.find(m=>m.id===id),game=createCampaignMission(id);game.state.gold[0]=10000;
    for(const lane of [0,1,2]) {
      let mine=game.state.buildings.find(b=>b.side===0&&b.type==='mint'&&b.lane===lane);
      if(!mine)mine=game.build('mint',410,LANES[lane]).building;
      while(mine.level<3)assert.equal(game.upgrade(mine.id).ok,true);
    }
    assert.equal(currentIncome(game),20);assert.equal(evaluateCampaignMission(game,id).completed,false);
    game.state.time=mission.timeLimit-.05;assert.equal(evaluateCampaignMission(game,id).completed,false);
    game.state.time=mission.timeLimit;assert.equal(evaluateCampaignMission(game,id).completed,true);
    assert.equal(evaluateCampaignMission(game,id).stars,3);
  }
});

test('the campaign branches, converges and unlocks the ending only after all missions',()=>{
  const fresh=createCampaignProgress();let overview=getCampaignOverview(fresh);
  assert.equal(overview.nextMissionId,'emberwatch');assert.equal(overview.missions.filter(m=>m.unlocked).length,1);assert.equal(overview.maxStars,36);
  let progress=clearThrough('winter-stores');overview=getCampaignOverview(progress);
  assert.equal(isMissionUnlocked(progress,'wings-of-ash'),true);assert.equal(isMissionUnlocked(progress,'stonegate'),true);assert.equal(isMissionUnlocked(progress,'long-vigil'),false);
  assert.equal(overview.chapters[0].completed,true);assert.equal(overview.chapters[1].unlocked,true);
  progress=recordCampaignResult(progress,'stonegate',complete('stonegate'));assert.equal(isMissionUnlocked(progress,'long-vigil'),false);
  progress=recordCampaignResult(progress,'wings-of-ash',complete('wings-of-ash'));assert.equal(isMissionUnlocked(progress,'long-vigil'),true);
  overview=getCampaignOverview(clearThrough('ironroot'));assert.equal(overview.cleared,12);assert.equal(overview.completed,true);assert.equal(overview.nextMissionId,null);assert.ok(overview.chapters.every(c=>c.completed));
});

test('results are immutable and idempotent, and unsuccessful or locked missions never earn progress',()=>{
  const original=createCampaignProgress();const game=complete('emberwatch');game.state.time=90;
  const recorded=recordCampaignResult(original,'emberwatch',game);assert.deepEqual(original,createCampaignProgress());assert.equal(recorded.missions.emberwatch.stars,3);assert.equal(recorded.missions.emberwatch.bestTime,90);
  assert.deepEqual(recordCampaignResult(recorded,'emberwatch',game),recorded);
  game.state.time=110;game.state.bases[0].hp=1;
  const worse=recordCampaignResult(recorded,'emberwatch',game);assert.deepEqual(worse,recorded);
  game.state.time=60;assert.equal(recordCampaignResult(recorded,'emberwatch',game).missions.emberwatch.bestTime,60);
  assert.deepEqual(recordCampaignResult(original,'ironroot',complete('ironroot')),original);
  assert.deepEqual(recordCampaignResult(original,'emberwatch',createCampaignMission('emberwatch')),original);
  game.state.bases[0].hp=0;assert.deepEqual(recordCampaignResult(recorded,'emberwatch',game),recorded);
});

test('normalization rejects corrupt, foreign, unsupported and orphaned progress without retaining arbitrary keys',()=>{
  const empty=createCampaignProgress();
  for(const raw of [null,undefined,[],true,5,'{}',{},new Date(),{version:1,missions:{}},{format:empty.format,version:99,missions:{}},{...empty,missions:[]}])assert.deepEqual(normalizeCampaignProgress(raw),empty);
  for(const bad of [null,[],true,{}, {completed:false,stars:3,bestTime:10},{completed:true,stars:0,bestTime:10},{completed:true,stars:4,bestTime:10},{completed:true,stars:1.5,bestTime:10},{completed:true,stars:2,bestTime:-1},{completed:true,stars:2,bestTime:Infinity},{completed:true,stars:2,bestTime:1000},{completed:true,stars:2,bestTime:'10'}])assert.deepEqual(normalizeCampaignProgress({...empty,missions:{emberwatch:bad}}),empty);
  const record={completed:true,stars:2,bestTime:90,extra:{unsafe:true}};
  const raw=JSON.parse(JSON.stringify({...empty,missions:{emberwatch:record,unknown:record,ironroot:record}}));
  raw.missions.__proto__={polluted:true};
  assert.deepEqual(normalizeCampaignProgress(raw),empty,'non-plain mission containers are rejected');
  const safe=normalizeCampaignProgress({...empty,missions:{emberwatch:record,unknown:record,ironroot:record}});
  assert.deepEqual(safe,{format:empty.format,version:CAMPAIGN_VERSION,missions:{emberwatch:{completed:true,stars:2,bestTime:90}}});assert.equal({}.polluted,undefined);
  const parsed=JSON.parse('{"format":"ironroot-campaign","version":1,"missions":{"__proto__":{"polluted":true}}}');assert.deepEqual(normalizeCampaignProgress(parsed),empty);
});

test('storage failures are safe, explicit, and never represented as a successful save',()=>{
  let data=null;const storage={get:()=>data,set:(_,value)=>{data=value;return true;}};
  const progress=clearThrough('three-roads');assert.equal(writeCampaignProgress(storage,progress),true);assert.deepEqual(readCampaignProgress(storage),progress);
  data='{broken';assert.deepEqual(readCampaignProgress(storage),createCampaignProgress());
  assert.equal(writeCampaignProgress({set:()=>false},progress),false);assert.equal(writeCampaignProgress({set:()=>{throw Error('denied');}},progress),false);
  assert.deepEqual(readCampaignProgress({get:()=>{throw Error('denied');}}),createCampaignProgress());
});

test('every mission is winnable with ordinary paid actions across four seeds and repeated restoration',()=>{
  for(const mission of CAMPAIGN_MISSIONS)for(const seed of [mission.seed,1,57,999]) {
    const {game,outcome}=playCampaign(createCampaignMission,evaluateCampaignMission,mission,{seed,restore:seed===999?data=>Game.restore(data):null});
    assert.equal(outcome.completed,true,`${mission.id}, seed ${seed}: ${outcome.label}`);assert.equal(outcome.failed,false);assert.equal(outcome.progress,1);
    assert.ok(outcome.stars>=1&&outcome.stars<=3);assert.ok(game.state.time<=mission.timeLimit+.001);assert.ok(game.state.bases[0].hp>0);
    assert.doesNotThrow(()=>Game.restore(game.serialize()));
  }
});

test('idle play cannot clear any campaign mission',()=>{
  for(const mission of CAMPAIGN_MISSIONS) {
    const {outcome}=playCampaign(createCampaignMission,evaluateCampaignMission,mission,{idle:true});
    assert.equal(outcome.completed,false,mission.id);assert.equal(outcome.failed,true,mission.id);
  }
});

test('mid-battle saves replay identically, including adaptive AI and original protected targets',()=>{
  for(const mission of CAMPAIGN_MISSIONS) {
    const a=createCampaignMission(mission.id);for(let i=0;i<400;i++)a.update(.05);const b=Game.restore(a.serialize());
    for(let i=0;i<400;i++){a.update(.05);b.update(.05);}
    assert.deepEqual(a.serialize(),b.serialize());assert.deepEqual(evaluateCampaignMission(a,mission.id),evaluateCampaignMission(b,mission.id));
  }
});


test('all 36 stars are achievable through paid mastery routes, including resumed games',()=>{
  for(const mission of CAMPAIGN_MISSIONS)for(const seed of [mission.seed,999]) {
    const {game,outcome}=playCampaign(createCampaignMission,evaluateCampaignMission,mission,{seed,mastery:true,restore:seed===999?data=>Game.restore(data):null});
    assert.equal(outcome.completed,true,`${mission.id}, seed ${seed}: ${outcome.label}`);
    assert.equal(outcome.stars,3,`${mission.id}, seed ${seed}: ${outcome.medals.filter(m=>!m.earned).map(m=>m.label).join('; ')}`);
    assert.ok(game.state.bases[0].hp>0);
  }
});


test('progress merges preserve newer clears, best stars and best times against stale tabs',()=>{
  const stale=clearThrough('emberwatch'),latest=clearThrough('winter-stores');
  stale.missions.emberwatch={completed:true,stars:1,bestTime:40};
  latest.missions.emberwatch={completed:true,stars:3,bestTime:70};
  const staleBefore=structuredClone(stale),latestBefore=structuredClone(latest);
  const merged=mergeCampaignProgress(stale,latest);
  assert.deepEqual(merged.missions.emberwatch,{completed:true,stars:3,bestTime:40});
  assert.equal(getCampaignOverview(merged).cleared,3);
  assert.deepEqual(stale,staleBefore);assert.deepEqual(latest,latestBefore);
  assert.deepEqual(merged,mergeCampaignProgress(latest,stale));
  assert.deepEqual(merged,mergeCampaignProgress(merged,merged));
  assert.deepEqual(merged,normalizeCampaignProgress(merged));
  merged.missions.emberwatch.stars=2;
  assert.equal(latest.missions.emberwatch.stars,3,'output must not alias either input');
});

test('independent branch victories merge and unlock their shared finale without fabricating clears',()=>{
  const base=clearThrough('winter-stores');
  const north=recordCampaignResult(base,'wings-of-ash',complete('wings-of-ash'));
  const south=recordCampaignResult(base,'stonegate',complete('stonegate'));
  assert.equal(isMissionUnlocked(north,'long-vigil'),false);assert.equal(isMissionUnlocked(south,'long-vigil'),false);
  const merged=mergeCampaignProgress(north,south);
  assert.equal(getCampaignOverview(merged).cleared,5);assert.equal(isMissionUnlocked(merged,'long-vigil'),true);
  assert.equal(merged.missions['long-vigil'],undefined);
  assert.equal(isMissionUnlocked(merged,'cold-forge'),false);
  const final=recordCampaignResult(merged,'long-vigil',complete('long-vigil'));
  assert.deepEqual(mergeCampaignProgress(north,mergeCampaignProgress(south,final)),mergeCampaignProgress(mergeCampaignProgress(north,south),final));
  assert.deepEqual(mergeCampaignProgress(final,base),final);
});

test('merge rejects corrupt inputs and orphaned victories without losing the other valid snapshot',()=>{
  const valid=clearThrough('winter-stores'),empty=createCampaignProgress();
  for(const corrupt of [undefined,null,[],42,{},'bad',{...valid,version:999},{...empty,missions:{ironroot:{completed:true,stars:3,bestTime:10}}}]) {
    assert.deepEqual(mergeCampaignProgress(corrupt,valid),valid);
    assert.deepEqual(mergeCampaignProgress(valid,corrupt),valid);
  }
  for(const record of [{completed:true,stars:4,bestTime:1},{completed:true,stars:3,bestTime:NaN},{completed:true,stars:3,bestTime:-1},{completed:false,stars:3,bestTime:1}]) {
    assert.deepEqual(mergeCampaignProgress(valid,{...empty,missions:{emberwatch:record}}),valid);
  }
  const hostile=JSON.parse('{"format":"ironroot-campaign","version":1,"missions":{"__proto__":{"polluted":true},"unknown":{"completed":true,"stars":3,"bestTime":1}}}');
  assert.deepEqual(mergeCampaignProgress(hostile,valid),valid);assert.equal({}.polluted,undefined);
  assert.deepEqual(mergeCampaignProgress(null,hostile),empty);
});
