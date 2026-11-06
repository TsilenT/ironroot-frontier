import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {Game,MAPS,BUILDINGS,buildSites} from '../dist/engine.js';
import {CAMPAIGN_CHAPTERS,CAMPAIGN_MISSIONS,CAMPAIGN_VERSION,CAMPAIGN_STORAGE_KEY,createCampaignMission,evaluateCampaignMission,getCampaignTargets,currentIncome,createCampaignProgress,normalizeCampaignProgress,mergeCampaignProgress,recordCampaignResult,isMissionUnlocked,getCampaignOverview} from '../dist/campaign.js';
import {campaignPolicy,campaignMasteryPolicy,productionPolicy,playCampaign} from './campaign-policies.mjs';
const legacy=CAMPAIGN_MISSIONS.slice(0,12),expansion=CAMPAIGN_MISSIONS.slice(12);
const snapshots=JSON.parse(await readFile(new URL('./campaign-legacy-snapshots.json',import.meta.url),'utf8'));
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const victory=id=>{const g=createCampaignMission(id);g.state.bases[1].hp=0;return g;};
function clearThrough(last){let p=createCampaignProgress();for(const m of CAMPAIGN_MISSIONS){p=recordCampaignResult(p,m.id,victory(m.id));if(m.id===last)break;}return p;}

test('legacy chapter prose, formations, objectives, saves and 40-second simulations match the frozen 0.9 campaign',()=>{
  assert.equal(hash(CAMPAIGN_CHAPTERS.slice(0,4)),snapshots.chapters);
  assert.equal(snapshots.missions.length,12);
  for(const mission of legacy){
    const expected=snapshots.missions.find(row=>row.id===mission.id),metadata=structuredClone(mission);
    delete metadata.mapId;if(mission.id==='ironroot')delete metadata.reward;
    assert.equal(mission.mapId,'classic');assert.equal(hash(metadata),expected.metadata,`${mission.id} metadata`);
    assert.equal(hash(createCampaignMission(mission.id).serialize()),expected.initial,`${mission.id} initial state`);
    for(const style of ['idle','reference','mastery']){
      const game=createCampaignMission(mission.id),policy=style==='idle'?()=>{}:style==='mastery'?campaignMasteryPolicy(mission.id):campaignPolicy(mission.id);
      for(let tick=0;tick<800;tick++){if(tick%20===0)policy(game);game.update(.05);}
      assert.equal(hash(game.serialize()),expected.tracks[style].simulation,`${mission.id} ${style} exact simulation`);
      assert.equal(hash(evaluateCampaignMission(game,mission.id)),expected.tracks[style].evaluation,`${mission.id} ${style} evaluation`);
    }
  }
});

test('a four-mission fifth chapter uses both actual frontier maps and expands the campaign to 48 stars',()=>{
  assert.equal(CAMPAIGN_CHAPTERS.length,5);assert.equal(CAMPAIGN_MISSIONS.length,16);
  assert.deepEqual(expansion.map(m=>[m.id,m.mapId]),[['open-horizon','long-march'],['river-charter','twin-span'],['far-beacon','long-march'],['common-ground','twin-span']]);
  assert.deepEqual(expansion.map(m=>m.number),[13,14,15,16]);
  assert.equal(new Set(CAMPAIGN_MISSIONS.map(m=>m.id)).size,16);
  const overview=getCampaignOverview(createCampaignProgress());assert.equal(overview.total,16);assert.equal(overview.maxStars,48);
  assert.equal(overview.chapters[4].total,4);assert.equal(overview.chapters[4].maxStars,12);
  for(const m of expansion){
    assert.equal(m.chapterId,'frontier');assert.equal(m.medals.length,2);
    assert.ok(m.description&&m.dialogue.speaker&&m.dialogue.text&&m.victoryText&&m.hint&&m.objective&&m.reward);
    const game=createCampaignMission(m.id),map=MAPS[m.mapId];
    assert.equal(game.map,map);assert.equal(game.state.bases[1].x,map.width-110);
    assert.equal(game.state.gold[0],m.startingGold);assert.equal(game.state.gold[1],m.enemyGold||0);
    assert.equal(game.state.bases[0].hp,m.startingHealth);assert.equal(game.ai,m.ai);
    assert.deepEqual(createCampaignMission(m.id).serialize(),game.serialize());
    for(const side of [0,1]){
      const buildings=game.state.buildings.filter(b=>b.side===side),placements=side?m.enemyBuildings:m.playerBuildings,sites=buildSites(map,side);
      assert.equal(game.state.stats.built[side],placements.length);assert.equal(buildings.length,placements.length);
      assert.deepEqual(buildings.map(b=>[b.type,b.x,b.lane,b.level]),placements.map(([type,x,lane,level=1])=>[type,x,lane,level]));
      for(const b of buildings)assert.ok(sites.some(site=>site.x===b.x&&site.y===b.y&&site.lane===b.lane),`${m.id}: actual map site`);
    }
    const save=game.serialize();assert.equal(save.version,2);assert.equal(save.mapId,m.mapId);
    assert.deepEqual(Game.restore(save).serialize(),save);
    const result=evaluateCampaignMission(game,m.id);assert.equal(result.completed,false);assert.equal(result.failed,false);assert.equal(result.progress,0);
    assert.ok(getCampaignTargets(game,m.id).every(t=>t.building&&t.originalId===t.building.id));
  }
});

test('new mission briefings disclose exact map, funds, AI behavior and every authored force count and level',()=>{
  for(const m of expansion){
    const map=MAPS[m.mapId],names=map.lanes.length===2?['North','South']:['North','Middle','South'];
    assert.ok(m.briefing[0].includes(map.name)&&m.briefing[0].includes(String(map.buildLimit)));
    assert.ok(m.briefing[1].includes(m.startingGold.toLocaleString('en-US'))&&m.briefing[1].includes(m.startingHealth.toLocaleString('en-US')));
    for(const [side,placements] of [['player',m.playerBuildings],['enemy',m.enemyBuildings]]){
      const expected=names.map((name,lane)=>{
        const groups=new Map();for(const [type,,l,level=1] of placements)if(l===lane){const label=`level-${level} ${BUILDINGS[type].name}`;groups.set(label,(groups.get(label)||0)+1);}
        return `${name}: ${[...groups].map(([label,count])=>`${count} × ${label}`).join(', ')||'no starting buildings'}`;
      }).join('; ');
      assert.equal(m.deployment[side],expected);assert.ok(m.briefing.includes(`${side==='player'?'Your':'Enemy'} deployment: ${expected}`));
    }
    assert.ok(m.ai?m.briefing[4].includes(`${m.enemyGold||0} gold`)&&m.briefing[4].includes('pays for buildings, upgrades and rally strikes'):m.briefing[4].includes('no new enemy buildings, upgrades or rally strikes'));
  }
});

test('target lookup, evaluation and recording reject the wrong map rather than count absent targets as destroyed',()=>{
  for(const m of CAMPAIGN_MISSIONS)for(const mapId of Object.keys(MAPS).filter(id=>id!==m.mapId)){
    const wrong=new Game({ai:false,mapId});wrong.state.bases[1].hp=0;
    for(const action of [()=>getCampaignTargets(wrong,m.id),()=>evaluateCampaignMission(wrong,m.id),()=>recordCampaignResult(createCampaignProgress(),m.id,wrong)])assert.throws(action,/Campaign battlefield mismatch/);
  }
});

test('new map composite objectives retain protection, hold, economy, health and deadline precedence after restore',()=>{
  for(const m of expansion){
    let g=createCampaignMission(m.id);g.state.time=m.timeLimit;
    assert.equal(evaluateCampaignMission(g,m.id).failed,true,`${m.id}: unattended deadline`);
    g=createCampaignMission(m.id);g.state.time=m.timeLimit-.05;assert.equal(evaluateCampaignMission(g,m.id).failed,false);
    g.state.bases[0].hp=0;g.state.bases[1].hp=0;assert.equal(evaluateCampaignMission(g,m.id).completed,false);
  }
  let g=createCampaignMission('far-beacon');for(const t of getCampaignTargets(g,'far-beacon'))t.building.hp=0;
  g.state.time=189.95;assert.equal(evaluateCampaignMission(g,'far-beacon').completed,false);
  g.state.time=190;g=Game.restore(g.serialize());assert.equal(evaluateCampaignMission(g,'far-beacon').completed,true);
  g.state.bases[0].hp=1999;assert.equal(evaluateCampaignMission(g,'far-beacon').failed,true);
  g=createCampaignMission('river-charter');g.state.gold[0]=10000;
  for(const [x,lane] of [[410,0],[410,1],[270,0]]){
    let b=g.state.buildings.find(b=>b.side===0&&b.type==='mint'&&b.x===x&&b.lane===lane);
    if(!b)b=g.build('mint',x,g.map.lanes[lane]).building;
    while(b.level<3)assert.equal(g.upgrade(b.id).ok,true);
  }
  assert.equal(currentIncome(g),20);g.state.time=209.95;assert.equal(evaluateCampaignMission(g,'river-charter').completed,false);
  g.state.time=210;assert.equal(evaluateCampaignMission(g,'river-charter').completed,true);
  const protectedTarget=getCampaignTargets(g,'river-charter').find(t=>t.kind==='protect');g.sell(protectedTarget.originalId);
  g.state.bases[1].hp=0;assert.equal(evaluateCampaignMission(Game.restore(g.serialize()),'river-charter').completed,false);
});

test('original 36-star progress remains valid v1, unlocks two new branches, and merges their convergence additively',()=>{
  assert.equal(CAMPAIGN_VERSION,1);assert.equal(CAMPAIGN_STORAGE_KEY,'ironroot.campaign.v1');
  const old=clearThrough('ironroot');for(const record of Object.values(old.missions))record.stars=3;
  assert.equal(getCampaignOverview(old).stars,36);assert.deepEqual(normalizeCampaignProgress(old),old);
  assert.equal(getCampaignOverview(old).nextMissionId,'open-horizon');assert.equal(isMissionUnlocked(old,'river-charter'),false);
  const gateway=recordCampaignResult(old,'open-horizon',victory('open-horizon'));
  assert.equal(isMissionUnlocked(gateway,'river-charter'),true);assert.equal(isMissionUnlocked(gateway,'far-beacon'),true);
  const north=recordCampaignResult(gateway,'river-charter',victory('river-charter')),south=recordCampaignResult(gateway,'far-beacon',victory('far-beacon'));
  assert.equal(isMissionUnlocked(north,'common-ground'),false);assert.equal(isMissionUnlocked(south,'common-ground'),false);
  const merged=mergeCampaignProgress(north,south);assert.equal(isMissionUnlocked(merged,'common-ground'),true);assert.equal(merged.missions['common-ground'],undefined);
  assert.deepEqual(mergeCampaignProgress(old,merged),merged);assert.deepEqual(mergeCampaignProgress(merged,old),merged);
  const final=recordCampaignResult(merged,'common-ground',victory('common-ground'));for(const record of Object.values(final.missions))record.stars=3;
  assert.equal(getCampaignOverview(final).stars,48);assert.equal(getCampaignOverview(final).completed,true);assert.equal(getCampaignOverview(final).nextMissionId,null);
  const orphan={...createCampaignProgress(),missions:{'common-ground':{completed:true,stars:3,bestTime:10}}};assert.deepEqual(normalizeCampaignProgress(orphan),createCampaignProgress());
});

test('all twelve new stars are achievable with paid mastery routes over four seeds and repeated restores',()=>{
  for(const m of expansion)for(const seed of [m.seed,1,57,999]){
    const actions=[];const {game,outcome}=playCampaign(createCampaignMission,evaluateCampaignMission,m,{seed,mastery:true,restore:data=>Game.restore(data),onAction:action=>actions.push({name:action.name,cost:action.cost,time:action.time})});
    assert.equal(outcome.completed,true,`${m.id}, seed ${seed}: ${outcome.label}`);assert.equal(outcome.stars,3,`${m.id}, seed ${seed}: all medals`);
    assert.ok(actions.length>0&&actions.every(a=>a.cost>0),'every issued action is paid');
    assert.equal(game.state.stats.built[0],m.playerBuildings.length+actions.filter(a=>a.name==='build').length);
    assert.ok(game.state.time<=m.timeLimit&&game.state.bases[0].hp>0);
  }
});

test('frontier clears tolerate a five-second late start and only one paid command every two seconds',()=>{
  for(const m of expansion)for(const seed of [m.seed,1,57,999]){
    const times=[];const {outcome}=playCampaign(createCampaignMission,evaluateCampaignMission,m,{seed,startDelay:5,actionEvery:2,maxActionsPerDecision:1,restore:data=>Game.restore(data),onAction:a=>times.push(a.time)});
    assert.equal(outcome.completed,true,`${m.id}, seed ${seed}: ${outcome.label}`);
    assert.ok(times[0]>=5&&times.every((time,i)=>i===0||time-times[i-1]>=2-1e-7),'one successful paid command per action window');
  }
});

test('idle and all-wizard armies fail the new chapter on the authored openings',()=>{
  for(const m of expansion)for(const idle of [true,false]){
    const policy=idle?null:productionPolicy(['sanctum'],MAPS[m.mapId].lanes.map((_,lane)=>lane));
    const {outcome}=playCampaign(createCampaignMission,evaluateCampaignMission,m,{idle,policy});
    assert.equal(outcome.completed,false,`${m.id}, ${idle?'idle':'ground-only splash'}: ${outcome.label}`);assert.equal(outcome.failed,true);
  }
});
