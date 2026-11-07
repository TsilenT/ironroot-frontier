import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,buildSites,getRuleset} from '../dist/engine.js';
import {CAMPAIGN_RULESET_IDS} from '../dist/rulesets.js';
import {
  CAMPAIGN_MISSIONS,INTRO_MISSIONS,ONBOARDING_MISSIONS,
  createCampaignProgress,createCampaignMission,createProgressionCampaignMission,
  createCampaignRestart,getCampaignMission,getCampaignTargets,recordCampaignResult,
} from '../dist/campaign.js';
import {encodeBattle,decodeBattle,identityOf,scenarioForBattle} from '../dist/battle-codec.js';
import {writeBattle} from '../dist/persistence.js';
import {createCampaignMission as createHistoricalMission} from '../qa/fixtures/production-v012/dist/campaign.js';

// Earn test profiles through the ordinary result path. Restart receives neither
// these profiles nor synthetic achievements: the admitted attempt owns its tier.
function earnedProfiles() {
  const tiers=[createCampaignProgress()];
  for(const mission of ONBOARDING_MISSIONS){
    const prior=tiers.at(-1),game=createProgressionCampaignMission(mission.id,prior);
    game.state.bases[1].hp=0;
    tiers.push(recordCampaignResult(prior,mission.id,game));
  }
  let complete=tiers.at(-1);
  for(const mission of [...CAMPAIGN_MISSIONS,...INTRO_MISSIONS]){
    const game=createCampaignMission(mission.id);
    game.state.bases[1].hp=0;
    complete=recordCampaignResult(complete,mission.id,game);
  }
  return {tiers,complete};
}
const {tiers,complete}=earnedProfiles();
const scenario=(game,id)=>scenarioForBattle(null,id,game);
const fullIdentity=(game,id)=>({
  ...identityOf(game,scenario(game,id)),schemaVersion:game.schemaVersion,difficulty:game.difficulty,ai:game.ai,
});
function roundtrip(game,id,progress=complete) {
  const encoded=encodeBattle(game,scenario(game,id),{campaignProgress:progress});
  const restored=decodeBattle(JSON.stringify(encoded),{campaignProgress:progress});
  assert.deepEqual(restored.game.serialize(),game.serialize());
  assert.deepEqual(restored.identity,identityOf(game,scenario(game,id)));
  return restored.game;
}
function advance(game) {
  const slot=buildSites(game.map,0).find(site=>game.canBuild('barracks',site.x,site.y).ok);
  assert.ok(slot);
  const result=game.build('barracks',slot.x,slot.y);
  assert.equal(result.ok,true);
  assert.equal(game.upgrade(result.building.id).ok,true);
  for(let i=0;i<48;i++)game.update(.25);
  game.update(.017);
  game.random();
  assert.ok(game.state.time>0&&game.tick>0&&game.accumulator>0);
  assert.ok(game.state.units.length>0);
  return game;
}
function assertRestart(game,id,start,progress=complete) {
  const before=game.serialize(),identity=fullIdentity(game,id);
  const restarted=createCampaignRestart(game,id);
  assert.notEqual(restarted,game);
  assert.notEqual(restarted.state,game.state);
  assert.deepEqual(game.serialize(),before,'restart never mutates the active attempt');
  assert.deepEqual(fullIdentity(restarted,id),identity);
  assert.deepEqual(restarted.serialize(),start,'all mutable state returns to the authored start');
  assert.deepEqual(roundtrip(restarted,id,progress).serialize(),start);
  assert.deepEqual(createCampaignRestart(restarted,id).serialize(),start,'repeated restart is deterministic');
  return restarted;
}

test('all sixteen revision-two restarts retain the full roster, map and scenario identity',()=>{
  for(const mission of CAMPAIGN_MISSIONS){
    const game=createCampaignMission(mission.id,{revision:2}),start=game.serialize();
    const restarted=assertRestart(game,mission.id,start);
    assert.equal(fullIdentity(restarted,mission.id).scenario.revision,2);
    assert.equal(restarted.ruleset.id,'frontier-campaign-open');
    assert.equal(restarted.schemaVersion,3);
    assert.equal(Object.keys(restarted.buildings).length,8);
    assert.equal(restarted.buildings.wardenLodge.unit,'rootwarden');
    assert.deepEqual(getCampaignTargets(restarted,mission.id),getCampaignTargets(game,mission.id));
  }
});

test('all sixteen legacy defaults and restart formations remain equal to frozen production',()=>{
  for(const mission of CAMPAIGN_MISSIONS){
    const game=createCampaignMission(mission.id),start=createHistoricalMission(mission.id).serialize();
    assert.deepEqual(game.serialize(),start,'the existing factory is unchanged');
    assert.deepEqual(createCampaignMission(mission.id,{revision:1,progress:complete}).serialize(),start);
    const restarted=assertRestart(game,mission.id,start);
    assert.equal(fullIdentity(restarted,mission.id).scenario.revision,1);
    assert.equal(restarted.ruleset.id,'frontier-legacy');
    assert.equal(restarted.schemaVersion,mission.mapId==='classic'?1:2);
    assert.equal(Object.keys(restarted.buildings).length,7);
    assert.equal(restarted.buildings.wardenLodge,undefined);
  }
});

test('every allowed onboarding replay tier stays pinned even after the profile earns more',()=>{
  let checked=0;
  for(const [minimum,mission] of ONBOARDING_MISSIONS.entries())for(let tier=minimum;tier<3;tier++){
    const game=createCampaignMission(mission.id,{revision:1,progress:tiers[tier]}),start=game.serialize();
    assert.equal(game.ruleset.id,CAMPAIGN_RULESET_IDS[tier]);
    const restarted=assertRestart(game,mission.id,start,tiers[tier]);
    assert.equal(Object.keys(restarted.buildings).length,[2,5,8][tier]);
    assert.equal(fullIdentity(restarted,mission.id).scenario.revision,1);
    const restoredWithLaterProgress=roundtrip(advance(game),mission.id,complete);
    assertRestart(restoredWithLaterProgress,mission.id,start);
    assert.equal(createProgressionCampaignMission(mission.id,complete).ruleset.id,'frontier-campaign-air-local');
    if(tier<2)assert.notEqual(restarted.ruleset.id,'frontier-campaign-open');
    checked++;
  }
  assert.equal(checked,6,'Watch accepts 3 tiers, Fork accepts 2, Three Roads accepts only the full tier');
});

test('old optional introductions retain their legacy seven-building schema-three contract',()=>{
  for(const mission of INTRO_MISSIONS){
    const game=createCampaignMission(mission.id),start=game.serialize();
    assert.deepEqual(createCampaignMission(mission.id,{progress:complete}).serialize(),start);
    const restarted=assertRestart(roundtrip(advance(game),mission.id),mission.id,start);
    assert.equal(restarted.schemaVersion,3);
    assert.equal(restarted.ruleset.id,'frontier-legacy');
    assert.equal(Object.keys(restarted.buildings).length,7);
    assert.equal(fullIdentity(restarted,mission.id).scenario.revision,1);
  }
});

test('midcombat and restored main campaigns reset RNG, treasury, units, IDs and elapsed state',()=>{
  for(const mission of CAMPAIGN_MISSIONS)for(const revision of [1,2]){
    const game=createCampaignMission(mission.id,{revision}),start=game.serialize();
    advance(game);
    assert.notEqual(game.seed,start.seed,'the active RNG has advanced');
    assert.notEqual(game.nextId,start.nextId);
    assert.notDeepEqual(game.state.gold,start.state.gold);
    assert.notDeepEqual(game.state.stats,start.state.stats);
    assertRestart(game,mission.id,start);
    assertRestart(roundtrip(game,mission.id),mission.id,start);
  }
});

test('admitted explicit schema-three legacy saves restart without downgrading to schema one or two',()=>{
  for(const mission of CAMPAIGN_MISSIONS){
    const legacy=createCampaignMission(mission.id),start={...legacy.serialize(),version:3,
      rulesetId:legacy.ruleset.id,rulesetRevision:legacy.ruleset.revision,mapId:legacy.map.id,mapRevision:legacy.map.revision};
    const explicit=roundtrip(Game.restore(start),mission.id);
    const restarted=assertRestart(roundtrip(advance(explicit),mission.id),mission.id,start);
    assert.equal(restarted.schemaVersion,3);
    assert.equal(fullIdentity(restarted,mission.id).scenario.revision,1);
    assert.equal(restarted.ruleset.id,'frontier-legacy');
  }
});

test('ended attempts can restart because elapsed combat state is not part of restart identity',()=>{
  for(const revision of [1,2])for(const ending of ['victory','defeat','deadline']){
    const game=createCampaignMission('emberwatch',{revision}),start=game.serialize();
    advance(game);
    if(ending==='deadline')game.state.time=getCampaignMission('emberwatch',revision).timeLimit;
    else {game.state.winner=ending==='victory'?0:1;game.state.bases[1-game.state.winner].hp=0;}
    assert.throws(()=>encodeBattle(game,scenario(game,'emberwatch'),{campaignProgress:complete}),error=>error.code==='ended-battle');
    assertRestart(game,'emberwatch',start);
  }
});

test('restart rejects incompatible mission, map, ruleset, revision and authored options before a save call',()=>{
  const modern=createCampaignMission('emberwatch',{revision:2}),legacy=createCampaignMission('emberwatch');
  const alter=(game,changes)=>({...game,schemaVersion:game.schemaVersion,...changes});
  const cases=[
    [null,'emberwatch'],[{},'emberwatch'],
    ...['',null,undefined,'missing','constructor','__proto__'].map(id=>[modern,id]),
    [modern,'open-horizon'],[modern,'first-watch'],[modern,'three-roads'],
    [createCampaignMission('first-watch'),'roadside-watch'],
    [alter(modern,{map:{...modern.map,id:'long-march'}}),'emberwatch'],
    ...[0,2,99,'1',undefined].flatMap(revision=>[
      [alter(modern,{map:{...modern.map,revision}}),'emberwatch'],
      [alter(modern,{ruleset:{...modern.ruleset,revision}}),'emberwatch'],
    ]),
    [alter(modern,{ruleset:getRuleset('frontier-rootwarden-open')}),'emberwatch'],
    [alter(modern,{ruleset:getRuleset('frontier-campaign-watch')}),'emberwatch'],
    [alter(modern,{difficulty:'hard'}),'emberwatch'],[alter(modern,{ai:!modern.ai}),'emberwatch'],
    ...[0,1,2,4,'3',undefined].map(schemaVersion=>[alter(modern,{schemaVersion}),'emberwatch']),
    [alter(legacy,{schemaVersion:2}),'emberwatch'],
    [alter(createCampaignMission('open-horizon'),{schemaVersion:1}),'open-horizon'],
    ...[0,1].map(tier=>[alter(createCampaignMission('open-three-roads'),{ruleset:getRuleset(CAMPAIGN_RULESET_IDS[tier])}),'open-three-roads']),
    [alter(createCampaignMission('shield-at-the-fork'),{ruleset:getRuleset(CAMPAIGN_RULESET_IDS[0])}),'shield-at-the-fork'],
  ];
  const calls=[],storage={get:(...args)=>{calls.push(['get',...args]);return null;},set:(...args)=>{calls.push(['set',...args]);return true;}};
  for(const [game,id] of cases){
    assert.throws(()=>{
      const candidate=createCampaignRestart(game,id);
      writeBattle(storage,'battle',candidate,null,id,{campaignProgress:complete});
    },RangeError);
    assert.deepEqual(calls,[],'identity rejection precedes all storage access');
  }
});

test('restart does not grant progress: ordinary candidate admission still enforces the earned tier',()=>{
  const game=createProgressionCampaignMission('roadside-watch',tiers[2]),candidate=createCampaignRestart(game,'roadside-watch');
  const before=structuredClone(tiers[0]),calls=[];
  const storage={get:(...args)=>{calls.push(['get',...args]);return null;},set:(...args)=>{calls.push(['set',...args]);return true;}};
  assert.throws(()=>encodeBattle(candidate,scenario(candidate,'roadside-watch'),{campaignProgress:tiers[0]}),error=>error.code==='locked-roster');
  assert.equal(writeBattle(storage,'battle',candidate,null,'roadside-watch',{campaignProgress:tiers[0]}),false);
  assert.deepEqual(calls,[]);
  assert.deepEqual(tiers[0],before);
});
