import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {Game, buildSites} from '../dist/engine.js';
import {supportsAutonomousAir} from '../dist/autonomous-air.js';
import {supportsFlightOrders} from '../dist/flight-orders.js';
import * as campaign from '../dist/campaign.js';
import {campaignTeaching, campaignCoach} from '../dist/campaign-flow.js';
import {encodeBattle, decodeBattle, identityOf, resolveScenario, validateBattleIdentity} from '../dist/battle-codec.js';
import {validateHistoryRow} from '../dist/history-codec.js';
import {createBackup, parseBackup, restoreBackup, BACKUP_STORAGE_KEYS as K} from '../dist/backup.js';
import {writeBattle} from '../dist/persistence.js';

const current='frontier-campaign-citadel-open',automatic='frontier-campaign-air-local', date='2026-11-07T09:00:00.000Z';
const record={completed:true,stars:2,bestTime:60};
const full=()=>({...campaign.createCampaignProgress(),missions:Object.fromEntries(campaign.CAMPAIGN_PROGRESS_MISSIONS.filter(m=>m.id!=='the-long-screen'&&m.id!=='the-hammer-turns'&&m.id!=='salt-in-the-stores'&&m.id!=='the-archers-quay').map(m=>[m.id,{...record}]))});
const stages=()=>{
  const result=[campaign.createCampaignProgress()];
  for(const mission of campaign.ONBOARDING_MISSIONS){
    const progress=structuredClone(result.at(-1));progress.missions[mission.id]={...record};result.push(progress);
  }
  return result;
};
const scenario=(game,id)=>campaign.campaignScenarioForGame(game,id);
const saved=(game,id,progress=full())=>encodeBattle(game,scenario(game,id),{campaignProgress:progress});
const storage=()=>{const data=new Map(),calls=[];return {data,calls,getItem(k){calls.push(['get',k]);return data.get(k)??null;},setItem(k,v){calls.push(['set',k]);data.set(k,v);},removeItem(k){calls.push(['remove',k]);data.delete(k);}};};

test('automatic-air descriptors leave all three reviewed writing catalogs byte-identical',()=>{
  const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
  assert.equal(hash(campaign.CAMPAIGN_PROGRESS_MISSIONS.filter(m=>m.id!=='the-long-screen'&&m.id!=='the-hammer-turns'&&m.id!=='salt-in-the-stores'&&m.id!=='the-archers-quay'&&!['shared-crossing','one-signal-is-enough','lanterns-on-the-water','borrowed-ground','a-river-between-us','false-quiet','the-road-we-know','through-the-reed-beds','the-archers-quay','salt-in-the-stores'].includes(m.id))),'53266184f5cf4de840ff59446c889bed62f96a7527587be7b3bc1c581cdcb47e');
  assert.equal(hash(campaign.PROGRESSION_CAMPAIGN_MISSIONS),'e01353144482a6a80082d35ec51674a9fdd7a62000b5e37d1c0313d8f576f57c');
  assert.equal(hash(campaign.FLIGHT_CAMPAIGN_MISSIONS),'25a5f44ced4f379eb4b800ff8ca819282e49d6fb199e4291972e61db945370fa');
  assert.equal(campaign.AUTONOMOUS_AIR_CAMPAIGN_MISSIONS.length,19);
  for(const mission of campaign.AUTONOMOUS_AIR_CAMPAIGN_MISSIONS){
    assert.ok(Object.isFrozen(mission)&&Object.isFrozen(mission.briefing)&&Object.isFrozen(mission.objectives));
    assert.equal(mission.scenarioRevision,4);assert.equal(mission.rulesetId,automatic);
    assert.equal(mission.rulesetRevision,1);assert.equal(mission.mapRevision,1);
    const old=campaign.getCampaignMission(mission.id,1);
    for(const field of ['mapId','difficulty','seed','timeLimit','startingGold','startingHealth','prerequisites','playerBuildings','enemyBuildings','objectives','medals','markedTargets','protectedTargets'])
      assert.deepEqual(mission[field],old[field],mission.id+'/'+field);
    assert.doesNotMatch(mission.briefing.join(' '),/two-second|gateway|future launches|order Hold/);
  }
});

test('fresh onboarding selects the revision from its actual two/five/eight roster, including every earned replay',()=>{
  const tiers=stages();
  for(const [minimum,mission] of campaign.ONBOARDING_MISSIONS.entries())for(let tier=minimum;tier<3;tier++){
    const p=tiers[tier],before=JSON.stringify(p),preview=campaign.getCampaignLaunchMission(mission.id,p);
    const game=campaign.createProgressionCampaignMission(mission.id,p),revision=5;
    assert.equal(preview.scenarioRevision,revision);assert.equal(campaign.getCurrentCampaignRevision(mission.id,p),revision);
    assert.equal(scenario(game,mission.id).revision,revision);
    assert.equal(game.ruleset.id,['frontier-campaign-citadel-watch','frontier-campaign-citadel-fork',current][tier]);
    assert.equal(preview.rulesetId,game.ruleset.id);assert.equal(Object.keys(game.buildings).length,[2,5,8][tier]);
    assert.equal(supportsAutonomousAir(game.ruleset),tier===2);assert.equal(supportsFlightOrders(game.ruleset),false);
    assert.deepEqual(decodeBattle(saved(game,mission.id,p),{campaignProgress:p}).game.serialize(),game.serialize());
    assert.equal(JSON.stringify(p),before);
  }
  assert.equal(campaign.getCampaignRoster(tiers[2]).stage,3);assert.equal(campaign.getCampaignRoster(tiers[2]).rulesetId,current);
  assert.equal(campaign.CAMPAIGN_RULESET_STAGES[automatic],3);
  assert.equal(campaign.isMissionUnlocked(tiers[2],'open-three-roads',4),true,'third opening is not gated by its own victory');
  assert.equal(campaign.isMissionUnlocked(tiers[2],'emberwatch',4),false);
  assert.equal(campaign.isMissionUnlocked(tiers[3],'emberwatch',4),true);
  for(const id of ['roadside-watch','shield-at-the-fork'])assert.equal(campaign.getCurrentCampaignRevision(id),5);
  assert.equal(campaign.getCurrentCampaignRevision('open-three-roads'),5);
  for(const mission of campaign.INTRO_MISSIONS)assert.equal(campaign.getCampaignLaunchMission(mission.id,full()).rulesetId,'frontier-authored-citadel','optional fresh lessons use automatic air without a Rootwarden unlock');
});

test('all nineteen full-roster starts roundtrip battle, history and backup and restart the exact authored revision',()=>{
  const p=full(),before=JSON.stringify(p);
  for(const mission of campaign.AUTONOMOUS_AIR_CAMPAIGN_MISSIONS){
    const id=mission.id,game=campaign.createProgressionCampaignMission(id,p),initial=game.serialize();
    assert.equal(game.ruleset.id,current);assert.equal(game.schemaVersion,3);assert.equal(scenario(game,id).revision,5);
    assert.equal(Object.keys(game.buildings).length,8);assert.equal(game.ruleset.endgame.forcedDecay,false);
    const site=buildSites(game.map,0).find(s=>game.canBuild('aerie',s.x,s.y).ok);
    assert.ok(site,id);assert.equal(game.build('aerie',site.x,site.y).ok,true);
    for(let i=0;i<330;i++)game.update(.05);game.update(.017);
    assert.ok(game.state.units.some(u=>u.type==='gryphon'&&Object.hasOwn(u,'airTargetId')),id);
    const envelope=saved(game,id,p),decoded=decodeBattle(envelope,{campaignProgress:p});
    assert.deepEqual(decoded.game.serialize(),game.serialize());assert.equal(resolveScenario(decoded.identity.scenario).revision,5);
    const row={won:false,draw:false,difficulty:game.difficulty,time:game.state.time,kills:0,built:1,date,identity:decoded.identity};
    assert.deepEqual(validateHistoryRow(row),row);
    const text=createBackup(storage(),{createdAt:date,campaign:p,battle:envelope,history:[row]}),backup=parseBackup(text);
    assert.deepEqual(backup.data.battle,envelope);assert.deepEqual(backup.data.history,[row]);
    const target=storage();assert.equal(restoreBackup(target,text).ok,true);assert.deepEqual(JSON.parse(target.data.get(K.battle)),envelope);
    const restarted=campaign.createCampaignRestart(decoded.game,id);
    assert.deepEqual(restarted.serialize(),initial);assert.deepEqual(scenario(restarted,id),scenario(game,id));
    assert.deepEqual(campaign.getCampaignTargets(restarted,id).map(t=>[t.originalId,t.kind]),campaign.getCampaignTargets(game,id).map(t=>[t.originalId,t.kind]));
    for(let i=0;i<20;i++){game.update(.05);decoded.game.update(.05);}assert.deepEqual(decoded.game.serialize(),game.serialize());
  }
  assert.equal(JSON.stringify(p),before);
});

test('current-revision admission rejects unearned full rosters, mismatched descriptors and skirmish identities before writing',()=>{
  const p=full(),empty=campaign.createCampaignProgress(),game=campaign.createProgressionCampaignMission('roadside-watch',p);
  const envelope=saved(game,'roadside-watch',p);
  assert.throws(()=>decodeBattle(envelope,{campaignProgress:empty}),e=>e.code==='locked-roster');
  for(const revision of [1,2,3,4]){
    const changed=structuredClone(envelope);changed.scenario.revision=revision;
    assert.throws(()=>decodeBattle(changed,{campaignProgress:p}));
  }
  for(const rulesetId of ['frontier-air-local-open','frontier-air-local-timed','frontier-campaign-flight','frontier-campaign-open']){
    assert.equal(campaign.campaignRulesetAllowed('roadside-watch',4,rulesetId),false);
    assert.throws(()=>validateBattleIdentity({...identityOf(game,scenario(game,'roadside-watch')),ruleset:{id:rulesetId,revision:1}}));
  }
  const calls=[],adapter={get:()=>{calls.push('get');return null;},set:()=>{calls.push('set');return true;}};
  assert.equal(writeBattle(adapter,'battle',game,null,'roadside-watch',{campaignProgress:empty}),false);assert.deepEqual(calls,[]);
  for(const id of ['first-watch','forked-road'])assert.equal(campaign.campaignRulesetAllowed(id,4,automatic),false);
  assert.throws(()=>campaign.getCampaignMission('unknown',4));
});

test('protected objectives, deadlines and best stars keep their meaning under revision four',()=>{
  for(const mission of campaign.AUTONOMOUS_AIR_CAMPAIGN_MISSIONS){
    const p=full(),before=structuredClone(p),game=campaign.createCampaignMission(mission.id,{revision:4});
    game.state.bases[1].hp=0;
    const next=campaign.recordCampaignResult(p,mission.id,game);
    assert.equal(next.missions[mission.id].completed,true);assert.ok(next.missions[mission.id].stars>=record.stars);
    assert.deepEqual(p,before);
    for(const target of campaign.getCampaignTargets(game,mission.id).filter(t=>t.kind==='protect')){
      const broken=campaign.createCampaignMission(mission.id,{revision:4});broken.state.buildings.find(b=>b.id===target.originalId).hp=0;broken.state.bases[1].hp=0;
      const result=campaign.evaluateCampaignMission(broken,mission.id);assert.equal(result.failed,true);assert.equal(result.completed,false);
    }
    const expired=campaign.createCampaignMission(mission.id,{revision:4});expired.state.time=mission.timeLimit;
    assert.throws(()=>saved(expired,mission.id,p),e=>e.code==='ended-battle');
  }
});

test('fresh air teaching describes autonomous local engagement, real anti-air range and no route commands',()=>{
  for(const id of ['open-three-roads','wings-of-ash','stonegate']){
    const lesson=campaignTeaching(id,{autonomousAir:true});assert.ok(lesson);
    assert.match(lesson.text,/nearby enemies.*adjacent road/);assert.match(lesson.text,/Archers stay on their road/);
    assert.doesNotMatch(lesson.text,/two-second|gateway|future launches|Select an aerie|order Hold/);
    assert.equal(campaignTeaching(id,{autonomousAir:true,resumed:true}),null);
    assert.equal(campaignTeaching(id,{autonomousAir:true,completed:true}),null);
    assert.equal(campaignTeaching(id,{autonomousAir:true,flightOrders:true}).text,lesson.text,'automatic context wins over obsolete presentation flags');
    const briefing=campaign.getCampaignMission(id,4).briefing.join(' ');
    assert.match(briefing,/adjacent road/);assert.match(briefing,/do not take route orders/);assert.match(briefing,/within range/);
  }
  assert.equal(campaignTeaching('common-ground',{autonomousAir:true}),null,'no extra lesson for every mission');
  for(const id of ['open-three-roads','wings-of-ash']){
    const game=campaign.createCampaignMission(id,{revision:4});
    assert.match(campaignCoach(game,id).text,/neighboring road/);
  }
});
