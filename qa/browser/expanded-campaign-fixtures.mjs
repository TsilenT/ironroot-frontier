// Synthetic, engine-valid persisted positions, never claims of human-played wins.
// Derive targets, prerequisites, map and exact deadlines from public mission APIs.
import assert from 'node:assert/strict';
import {Game,buildSites} from '../../dist/engine.js';
import {CAMPAIGN_MISSIONS,createCampaignMission,createCampaignProgress,currentIncome,evaluateCampaignMission,getCampaignTargets,isMissionUnlocked,normalizeCampaignProgress} from '../../dist/campaign.js';
import {BACKUP_STORAGE_KEYS,createBackup,parseBackup} from '../../dist/backup.js';
export const FRONTIER_IDS=['open-horizon','river-charter','far-beacon','common-ground'];
export const FRONTIER_MISSIONS=FRONTIER_IDS.map(id=>CAMPAIGN_MISSIONS.find(m=>m.id===id));
export const LEGACY_IDS=CAMPAIGN_MISSIONS.slice(0,12).map(m=>m.id);
export const PROFILE_MARKER='ironroot.profile.v1';
export const readyMarker=(version=1,epoch='qa-legacy-profile')=>JSON.stringify({format:'ironroot-profile',version,epoch,phase:'ready'});
export function progressThrough(ids=LEGACY_IDS){
  const progress=createCampaignProgress();
  for(const id of ids)progress.missions[id]={completed:true,stars:3,bestTime:10};
  assert.deepEqual(normalizeCampaignProgress(progress),progress);
  return progress;
}
export function prerequisiteProgress(id){
  const needed=new Set();
  function visit(id){for(const prerequisite of CAMPAIGN_MISSIONS.find(m=>m.id===id).prerequisites){visit(prerequisite);needed.add(prerequisite);}}
  visit(id);return progressThrough(CAMPAIGN_MISSIONS.filter(m=>needed.has(m.id)).map(m=>m.id));
}
function meetIncome(game,amount){
  game.state.gold[0]=10000;
  for(const site of buildSites(game.map,0)){
    if(currentIncome(game)>=amount)break;
    let mine=game.state.buildings.find(b=>b.side===0&&b.x===site.x&&b.y===site.y);
    if(mine&&mine.type!=='mint')continue;
    if(!mine){const result=game.build('mint',site.x,site.y);assert.equal(result.ok,true);mine=result.building;}
    while(mine.level<3&&currentIncome(game)<amount)assert.equal(game.upgrade(mine.id).ok,true);
  }
  assert.ok(currentIncome(game)>=amount,'paid fixture mines meet income objective');
  game.state.income=[currentIncome(game),currentIncome(game,1)];
}
export function expandedFixture(id,kind='start'){
  const mission=CAMPAIGN_MISSIONS.find(m=>m.id===id),game=createCampaignMission(id),progress=prerequisiteProgress(id);
  assert.ok(mission&&FRONTIER_IDS.includes(id));
  if(kind==='success'){
    const destroyed=new Set(getCampaignTargets(game,id).filter(t=>t.kind==='destroy').map(t=>t.originalId));
    game.state.buildings=game.state.buildings.filter(b=>!destroyed.has(b.id));
    const income=mission.objectives.find(o=>o.type==='income');if(income)meetIncome(game,income.amount);
    game.state.time=income?mission.timeLimit:Math.max(10,...mission.objectives.filter(o=>o.type==='survive').map(o=>o.seconds));
  }else if(kind==='deadline')game.state.time=mission.timeLimit;
  else if(kind==='protected-loss'){
    const target=getCampaignTargets(game,id).find(t=>t.kind==='protect');assert.ok(target,'mission has protected target');
    game.state.buildings=game.state.buildings.filter(b=>b.id!==target.originalId);game.state.time=10;
  }else if(kind==='health-loss'){
    const objective=mission.objectives.find(o=>o.type==='health');assert.ok(objective);
    game.state.bases[0].hp=objective.amount-1;game.state.time=10;
  }else assert.equal(kind,'start');
  const data=game.serialize(),restored=Game.restore(data),outcome=evaluateCampaignMission(restored,id);
  assert.equal(restored.map.id,mission.mapId);assert.ok(isMissionUnlocked(progress,id));
  assert.equal(outcome.completed,kind==='success');
  assert.equal(outcome.failed,['deadline','protected-loss','health-loss'].includes(kind));
  return {mission,envelope:{format:'ironroot-save',version:2,challengeId:null,campaignId:id,game:data},progress,outcome};
}
export function expandedBackup(id){
  const fixture=expandedFixture(id),values={
    [BACKUP_STORAGE_KEYS.battle]:JSON.stringify(fixture.envelope),
    [BACKUP_STORAGE_KEYS.campaign]:JSON.stringify(fixture.progress),
  };
  const text=createBackup({getItem:key=>values[key]??null},{createdAt:'2026-11-06T12:00:00.000Z'});
  return {...fixture,text,backup:parseBackup(text),values};
}
export function wrongMapFixture(id){
  const fixture=expandedFixture(id),mission=fixture.mission;
  // This is valid Classic engine data with matching rules, not a corrupt map
  // schema. Only campaign/map identity is wrong, so rejection tests that boundary.
  fixture.envelope.game=new Game({mapId:'classic',difficulty:mission.difficulty,ai:mission.ai,seed:mission.seed}).serialize();
  assert.equal(Game.restore(fixture.envelope.game).map.id,'classic');
  return fixture;
}
