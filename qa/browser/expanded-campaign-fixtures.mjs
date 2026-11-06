// Admissible pre-result positions, never claims of human-played wins.
// Derive targets, prerequisites, map and exact deadlines from public mission APIs.
import assert from 'node:assert/strict';
import {Game} from '../../dist/engine.js';
import {CAMPAIGN_MISSIONS,createCampaignMission,createCampaignProgress,evaluateCampaignMission,getCampaignTargets,isMissionUnlocked,normalizeCampaignProgress} from '../../dist/campaign.js';
import {campaignPolicy} from '../../tests/campaign-policies.mjs';
import {FIXTURE_STEP,imminentHit,validateImminent} from './campaign-fixtures.mjs';
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
// Paid primary routes use the authored seed, public commands and ordinary ticks.
// The River/Beacon routes are the disclosed routes in CAMPAIGN_PRIMARY_ROUTES.md.
const nearResults=new Map();
function primaryPolicy(id){
  if(!['river-charter','far-beacon'].includes(id))return campaignPolicy(id);
  const river=id==='river-charter';
  const opening=river?[['aerie',550,0],['watchtower',1250,1,3]]:[['watchtower',1250,0,3],['watchtower',1250,2,3],['aerie',270,1]];
  const economy=river?[['mint',270,0],['mint',270,1],['mint',410,0,2],['mint',270,0,2],['mint',270,1,2],['mint',410,0,3]]:[['mint',270,0],['mint',270,2],['mint',410,1,2],['mint',270,0,2]];
  const offense=[['archery',1110,0,3],['archery',1110,2,3],['barracks',970,0,3],['barracks',970,2,3],['foundry',690,0,2],['foundry',690,2,2]];
  return g=>{
    if(g.state.spellCooldown[0]===0&&g.state.gold[0]>=75){
      const foes=g.state.units.filter(u=>u.side===1&&u.x<1450);
      const pack=foes.map(u=>({u,n:foes.filter(v=>Math.hypot(v.x-u.x,v.y-u.y)<170).length})).sort((a,b)=>b.n-a.n)[0];
      if(pack?.n>=4){g.cast(pack.u.x,pack.u.y);return;}
    }
    for(const [type,x,lane,level=1] of [...opening,...economy,...(!river&&g.state.time+1e-7>=120?offense:[])]){
      const building=g.state.buildings.find(b=>b.side===0&&b.hp>0&&b.type===type&&b.x===x&&b.lane===lane);
      if(!building){g.build(type,x,g.map.lanes[lane]);return;}
      if(building.level<level){g.upgrade(building.id);return;}
    }
  };
}
function beforePrimary(mission){
  if(nearResults.has(mission.id))return Game.restore(nearResults.get(mission.id));
  const game=createCampaignMission(mission.id),policy=primaryPolicy(mission.id),period=['river-charter','far-beacon'].includes(mission.id)?40:20;
  for(let tick=0;tick<(mission.timeLimit+1)*20;tick++){
    if(tick%period===0)policy(game);
    const before=game.serialize();game.update(FIXTURE_STEP);
    const outcome=evaluateCampaignMission(game,mission.id);
    assert.ok(!outcome.failed,'paid '+mission.id+' route must not fail');
    if(outcome.completed){
      assert.equal(game.state.winner,null,'primary objective, not an alternate citadel victory');
      assert.ok(outcome.objectives.every(o=>o.met));
      nearResults.set(mission.id,before);return Game.restore(before);
    }
  }
  throw Error('Paid primary route did not finish: '+mission.id);
}
export function expandedFixture(id,kind='start'){
  const mission=CAMPAIGN_MISSIONS.find(m=>m.id===id),progress=prerequisiteProgress(id);
  assert.ok(mission&&FRONTIER_IDS.includes(id));
  const game=kind==='success'?beforePrimary(mission):createCampaignMission(id);
  if(kind==='deadline')game.state.time=mission.timeLimit-FIXTURE_STEP;
  else if(kind==='protected-loss'){
    const target=getCampaignTargets(game,id).find(t=>t.kind==='protect');assert.ok(target);
    game.state.time=10;imminentHit(game,target.building);
  }else if(kind==='health-loss'){
    const objective=mission.objectives.find(o=>o.type==='health');assert.ok(objective);
    game.state.time=10;imminentHit(game,game.state.bases[0],{health:objective.amount});
  }else assert.ok(['start','success'].includes(kind));
  assert.ok(isMissionUnlocked(progress,id));
  const fixture=validateImminent(game,{campaignId:id,progress,terminal:kind!=='start'}),final=Game.restore(fixture.finalGame);
  assert.equal(final.map.id,mission.mapId);
  assert.equal(fixture.outcome.completed,kind==='success');
  assert.equal(fixture.outcome.failed,['deadline','protected-loss','health-loss'].includes(kind));
  if(kind==='success'){assert.equal(final.state.winner,null);assert.ok(fixture.outcome.objectives.every(o=>o.met));}
  if(kind==='deadline'){assert.equal(final.state.time,mission.timeLimit);assert.ok(fixture.outcome.objectives.some(o=>!o.met));}
  if(kind==='protected-loss')assert.equal(getCampaignTargets(final,id).filter(t=>t.kind==='protect'&&!t.building).length,1);
  if(kind==='health-loss'){assert.ok(final.state.bases[0].hp>0);assert.ok(fixture.outcome.objectives.find(o=>o.type==='health').failed);}
  return {mission,...fixture};
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
