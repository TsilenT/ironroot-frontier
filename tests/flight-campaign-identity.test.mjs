import {beforeRhythmCopy} from './writing-rhythm-copy.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {Game,buildSites} from '../dist/engine.js';
import {CAMPAIGN_RULESET_IDS} from '../dist/rulesets.js';
import * as campaign from '../dist/campaign.js';
import {encodeBattle,decodeBattle,identityOf,scenarioForBattle,resolveScenario,validateBattleIdentity} from '../dist/battle-codec.js';
import {validateHistoryRow} from '../dist/history-codec.js';
import {createBackup,parseBackup,restoreBackup,BACKUP_STORAGE_KEYS as K} from '../dist/backup.js';
import {writeBattle} from '../dist/persistence.js';
const date='2026-11-07T00:00:00.000Z';
const record={completed:true,stars:2,bestTime:60};
const full=()=>({...campaign.createCampaignProgress(),missions:Object.fromEntries(campaign.CAMPAIGN_PROGRESS_MISSIONS.filter(m=>m.id !== 'the-shared-watch' && m.id!=='the-long-screen'&&m.id!=='the-hammer-turns'&&m.id!=='salt-in-the-stores'&&m.id!=='the-archers-quay').map(m=>[m.id,{...record}]))});
const storage=()=>{const data=new Map(),calls=[];return {data,calls,getItem(k){calls.push(['get',k]);return data.get(k)??null;},setItem(k,v){calls.push(['set',k]);data.set(k,v);},removeItem(k){calls.push(['remove',k]);data.delete(k);}};};
const scenario=(game,id)=>scenarioForBattle(null,id,game);
const saved=(game,id,progress=full())=>encodeBattle(game,scenario(game,id),{campaignProgress:progress});
const fingerprint=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');

test('published revision-one and revision-two descriptors retain frozen v0.15 exact hashes outside reviewed prose',()=>{
  assert.equal(fingerprint(beforeRhythmCopy(campaign.CAMPAIGN_PROGRESS_MISSIONS.filter(m=>m.id !== 'the-shared-watch' && m.id!=='the-long-screen'&&m.id!=='the-hammer-turns'&&m.id!=='salt-in-the-stores'&&m.id!=='the-archers-quay'&&!['shared-crossing','one-signal-is-enough','lanterns-on-the-water','borrowed-ground','a-river-between-us','false-quiet','the-road-we-know','through-the-reed-beds','the-archers-quay','salt-in-the-stores'].includes(m.id)))),'3b08ea9aa1e101b3a187e2fd9c184a6cfd871f2f2fc4f4c384e5f7693baba69e');
  assert.equal(fingerprint(beforeRhythmCopy(campaign.PROGRESSION_CAMPAIGN_MISSIONS)),'42f459c491b5653c42efe8eeb946d75bb11e6a04c7d74e161ea1a5cf755248d4');
});

test('historical flight campaign keeps thirteen explicit immutable revisions after the original opening and Embers',()=>{
  assert.equal(campaign.FLIGHT_CAMPAIGN_MISSIONS.length,13);
  assert.deepEqual(campaign.FLIGHT_CAMPAIGN_MISSION_IDS,campaign.CAMPAIGN_MISSIONS.slice(3).map(m=>m.id));
  assert.equal(CAMPAIGN_RULESET_IDS.length,3);
  for(const original of campaign.CAMPAIGN_PROGRESS_MISSIONS){
    if(!campaign.FLIGHT_CAMPAIGN_MISSION_IDS.includes(original.id)){assert.throws(()=>campaign.getCampaignMission(original.id,3));continue;}
    const flight=campaign.getCampaignMission(original.id,3);
    assert.equal(flight.rulesetId,'frontier-campaign-flight');assert.equal(flight.rulesetRevision,1);
    assert.equal(flight.mapRevision,1);assert.ok(Object.isFrozen(flight)&&Object.isFrozen(flight.objectives));
    for(const field of ['mapId','difficulty','seed','timeLimit','startingGold','startingHealth','prerequisites','playerBuildings','enemyBuildings','objectives','medals','markedTargets','protectedTargets'])assert.deepEqual(flight[field],original[field]);
  }
  for(const id of ['wings-of-ash','stonegate'])assert.match(campaign.getCampaignMission(id,3).briefing.join(' '),/future launches only.*two-second warning/);
  for(const id of ['missing',undefined,'__proto__'])assert.throws(()=>campaign.getCurrentCampaignRevision(id));
});

test('exact revision resolver rejects forged campaignOnly identities and cross-revision targets',()=>{
  for(const id of campaign.FLIGHT_CAMPAIGN_MISSION_IDS)for(const [rulesetId,revision] of [['frontier-legacy',1],['frontier-campaign-open',2],['frontier-campaign-flight',3]]){
    const game=campaign.createCampaignMission(id,{revision});
    assert.equal(campaign.getCampaignRevisionForRuleset(id,rulesetId),revision);
    assert.equal(campaign.campaignScenarioForGame(game,id).revision,revision);
    assert.equal(campaign.campaignRulesetAllowed(id,revision,rulesetId),true);
    for(const wrong of [1,2,3].filter(n=>n!==revision)){
      assert.equal(campaign.campaignRulesetAllowed(id,wrong,rulesetId),false);
      assert.throws(()=>campaign.getCampaignTargets(game,id,wrong));
      assert.throws(()=>campaign.evaluateCampaignMission(game,id,wrong));
      assert.throws(()=>validateBattleIdentity({...identityOf(game,scenario(game,id)),scenario:{kind:'campaign',id,revision:wrong}}));
    }
  }
  for(const id of campaign.ONBOARDING_MISSIONS.map(m=>m.id))assert.equal(campaign.campaignRulesetAllowed(id,1,'frontier-campaign-flight'),false);
  for(const rulesetId of ['frontier-flight-open','frontier-flight-timed','frontier-rootwarden-open','future-campaign',undefined])assert.throws(()=>campaign.getCampaignRevisionForRuleset('wings-of-ash',rulesetId));
  assert.throws(()=>campaign.campaignScenarioForGame({ruleset:{id:'future-campaign',revision:1,campaignOnly:true}},'wings-of-ash'));
  assert.throws(()=>campaign.getCampaignRevisionForRuleset('wings-of-ash','frontier-campaign-flight',2));
});

test('flight is earned stage three, while old opening replay identity and historical records remain unchanged',()=>{
  const tiers=[campaign.createCampaignProgress()];
  for(const m of campaign.ONBOARDING_MISSIONS){const next=structuredClone(tiers.at(-1));next.missions[m.id]={...record};tiers.push(next);}
  for(const [i,p] of tiers.entries())assert.equal(campaign.canUseCampaignRuleset(p,'wings-of-ash',3,'frontier-campaign-flight'),i>=2);
  assert.equal(campaign.CAMPAIGN_RULESET_STAGES['frontier-campaign-flight'],3);
  for(const p of tiers){assert.equal(campaign.isMissionUnlocked(p,'wings-of-ash',3),false);assert.throws(()=>campaign.createProgressionCampaignMission('wings-of-ash',p),/locked/);}
  const p=full(),before=JSON.stringify(p),overview=campaign.getProgressionCampaignOverview(p);
  assert.equal(overview.total,32);assert.equal(overview.cleared,27);assert.equal(overview.stars,54);
  assert.equal(JSON.stringify(campaign.normalizeCampaignProgress(p)),before);
  for(const m of campaign.ONBOARDING_MISSIONS)assert.equal(campaign.getCampaignLaunchMission(m.id,p).rulesetId,'frontier-campaign-citadel-open');
  const old=campaign.createCampaignMission('roadside-watch',{revision:1,progress:tiers[0]});
  const restored=decodeBattle(saved(old,'roadside-watch',tiers[0]),{campaignProgress:p}).game;
  assert.equal(restored.ruleset.id,'frontier-campaign-watch');assert.equal(restored.ruleset.combat.flyingCrossLanes,false);
  assert.deepEqual(campaign.createCampaignRestart(restored,'roadside-watch').serialize(),old.serialize());
  assert.equal(JSON.stringify(p),before);
});

test('all thirteen historical manual-flight attempts roundtrip battle/history/backup and restart the exact authored identity',()=>{
  const p=full();
  for(const id of campaign.FLIGHT_CAMPAIGN_MISSION_IDS){
    const game=campaign.createCampaignMission(id,{revision:3}),initial=game.serialize(),ref=scenario(game,id);
    assert.equal(game.ruleset.id,'frontier-campaign-flight');assert.equal(game.schemaVersion,3);assert.equal(ref.revision,3);
    assert.equal(Object.keys(game.buildings).length,8);assert.ok(game.units.rootwarden);assert.equal(game.ruleset.campaignOnly,true);
    assert.equal(game.ruleset.endgame.forcedDecay,false);
    for(let tick=0;tick<37;tick++)game.update(.05);game.update(.017);
    const envelope=saved(game,id,p),decoded=decodeBattle(envelope,{campaignProgress:p});
    assert.deepEqual(decoded.game.serialize(),game.serialize());assert.equal(resolveScenario(decoded.identity.scenario).revision,3);
    const row={won:false,draw:false,difficulty:game.difficulty,time:game.state.time,kills:0,built:1,date,identity:decoded.identity};
    assert.deepEqual(validateHistoryRow(row),row);
    const text=createBackup(storage(),{createdAt:date,campaign:p,battle:envelope,history:[row]});
    const backup=parseBackup(text);assert.deepEqual(backup.data.battle,envelope);assert.deepEqual(backup.data.history,[row]);
    const target=storage();assert.equal(restoreBackup(target,text).ok,true);assert.deepEqual(JSON.parse(target.data.get(K.battle)),envelope);
    const restarted=campaign.createCampaignRestart(decoded.game,id);
    assert.deepEqual(restarted.serialize(),initial);assert.deepEqual(scenario(restarted,id),ref);
    assert.deepEqual(campaign.getCampaignTargets(restarted,id).map(t=>[t.originalId,t.kind]),campaign.getCampaignTargets(game,id).map(t=>[t.originalId,t.kind]));
    for(let tick=0;tick<20;tick++){game.update(.05);decoded.game.update(.05);}assert.deepEqual(decoded.game.serialize(),game.serialize());
    for(const revision of [1,2]){
      const old=campaign.createCampaignMission(id,{revision}),oldSaved=saved(old,id,p);
      assert.equal(oldSaved.version,old.schemaVersion===3?3:2);
      assert.equal(scenario(campaign.createCampaignRestart(decodeBattle(oldSaved,{campaignProgress:p}).game,id),id).revision,revision);
      assert.deepEqual(campaign.createCampaignRestart(old,id).serialize(),old.serialize());
    }
  }
});

test('protected identities, deadlines and historical progress remain exact under flight revisions',()=>{
  for(const id of campaign.FLIGHT_CAMPAIGN_MISSION_IDS){
    const p=full(),before=structuredClone(p),mission=campaign.getCampaignMission(id,3),game=campaign.createCampaignMission(id,{revision:3});
    game.state.bases[1].hp=0;
    const progress=campaign.recordCampaignResult(p,id,game);assert.equal(progress.missions[id].completed,true);assert.deepEqual(p,before);
    for(const target of campaign.getCampaignTargets(game,id).filter(t=>t.kind==='protect')){
      const broken=campaign.createCampaignMission(id,{revision:3}),b=broken.state.buildings.find(b=>b.id===target.originalId);b.hp=0;
      broken.state.bases[1].hp=0;
      const result=campaign.evaluateCampaignMission(broken,id);assert.equal(result.failed,true);assert.equal(result.completed,false);
    }
    const expired=campaign.createCampaignMission(id,{revision:3});expired.state.time=mission.timeLimit;
    assert.throws(()=>saved(expired,id,p),error=>error.code==='ended-battle');
  }
});

test('flight route phases survive backup and deterministic continuation without producer retasking',()=>{
  for(const mapId of ['classic','long-march','twin-span']){
    const game=new Game({rulesetId:'frontier-flight-open',mapId,ai:false,seed:761});
    const site=buildSites(game.map,0).filter(s=>s.lane===0&&game.canBuild('aerie',s.x,s.y).ok).sort((a,b)=>b.x-a.x)[0];assert.ok(site);
    const aerie=game.build('aerie',site.x,site.y).building;assert.equal(game.setFlightPlan(aerie.id,1).ok,true);
    const found=new Set();
    for(let tick=0;tick<1000&&found.size<4;tick++){
      game.update(.05);const flyer=game.state.units.find(u=>u.side===0&&u.airRoute);if(!flyer||found.has(flyer.airRoute.phase))continue;
      found.add(flyer.airRoute.phase);game.update(.017);
      const envelope=encodeBattle(game),text=createBackup(storage(),{createdAt:date,battle:envelope});
      const restored=decodeBattle(parseBackup(text).data.battle).game;assert.deepEqual(restored.serialize(),game.serialize());
      assert.equal(restored.setFlightPlan(aerie.id,0).ok,true);
      const after=restored.state.units.find(u=>u.id===flyer.id);assert.deepEqual(after.airRoute,flyer.airRoute);
      assert.equal(game.setFlightPlan(aerie.id,0).ok,true);
      for(let n=0;n<3;n++){game.update(.05);restored.update(.05);}assert.deepEqual(restored.serialize(),game.serialize());
      assert.equal(game.setFlightPlan(aerie.id,1).ok,true);
    }
    assert.deepEqual([...found].sort(),['approach','done','transit','warning']);
  }
});

test('mismatched identities, forbidden old fields and lab schema four reject before storage access',()=>{
  const p=full(),game=campaign.createCampaignMission('wings-of-ash',{revision:3});
  const valid=JSON.parse(createBackup(storage(),{createdAt:date,campaign:p,battle:saved(game,'wings-of-ash',p)}));
  for(const mutate of [b=>b.data.battle.scenario.revision=2,b=>b.data.battle.game.version=4,b=>b.data.battle.version=4,b=>b.data.battle.game.rulesetRevision=2,b=>b.data.battle.game.rulesetId='frontier-flight-open',b=>b.data.campaign=campaign.createCampaignProgress()]){
    const candidate=structuredClone(valid);mutate(candidate);const target=storage();assert.equal(restoreBackup(target,JSON.stringify(candidate)).ok,false);assert.deepEqual(target.calls,[]);
  }
  const old=campaign.createCampaignMission('wings-of-ash',{revision:2});old.state.buildings.find(b=>b.type==='aerie').flightPlan=0;
  const calls=[],adapter={get:()=>{calls.push('get');return null;},set:()=>{calls.push('set');return true;}};
  assert.equal(writeBattle(adapter,'battle',old,null,'wings-of-ash',{campaignProgress:p}),false);assert.deepEqual(calls,[]);
  const badHistory={won:false,difficulty:game.difficulty,time:0,kills:0,built:0,date,identity:identityOf(game,scenario(game,'wings-of-ash'))};
  badHistory.identity=structuredClone(badHistory.identity);badHistory.identity.scenario.revision=2;assert.throws(()=>validateHistoryRow(badHistory));
});
