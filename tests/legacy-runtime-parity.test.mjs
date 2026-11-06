/** Independent executable compatibility against immutable production v0.12, not new golden snapshots. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as current from '../dist/engine.js';
import * as historical from '../qa/fixtures/production-v012/dist/engine.js';
import * as campaign from '../dist/campaign.js';
import * as oldCampaign from '../qa/fixtures/production-v012/dist/campaign.js';
import {campaignPolicy, campaignMasteryPolicy} from './campaign-policies.mjs';
import {readHistoricalProduction, assertHistoricalEngineOracle} from './engine-validation-source.mjs';
const approvedCopy=JSON.parse(readFileSync(new URL('./fixtures/campaign-copy-approved.json',import.meta.url)));
const maps=['classic','long-march','twin-span'], difficulties=['easy','normal','hard'];
const equal=(a,b,label)=>assert.equal(JSON.stringify(a.serialize()),JSON.stringify(b.serialize()),label);
const legacyOverview=overview=>{const value=structuredClone(overview);delete value.introduction;value.missions=normalizeCopy(value.missions,'missions');value.chapters=normalizeCopy(value.chapters,'chapters');return value;};
function normalizeCopy(rows,kind){
  return rows.map(row=>{const value=structuredClone(row);for(const edit of approvedCopy[kind].filter(edit=>edit.id===row.id)){
    assert.deepEqual(value[edit.field],edit.after,`${row.id}.${edit.field}: approved literal`);value[edit.field]=edit.before;
  }return value;});
}
function paidActions(g,turn){
  const results=[];
  for(const side of [turn%2,1-turn%2]){
    const type=Object.keys(historical.BUILDINGS)[turn%7];
    for(const site of historical.buildSites(g.map,side)){const result=g.build(type,site.x,site.y,side);results.push(result);if(result.ok)break;}
    if(turn%3===0){const b=g.state.buildings.find(b=>b.side===side&&b.level<3);if(b)results.push(g.upgrade(b.id,side));}
    if(turn%11===4){const b=g.state.buildings.find(b=>b.side===side&&b.type==='mint');if(b)results.push(g.sell(b.id,side));}
    const enemy=g.state.units.find(u=>u.side!==side);if(enemy)results.push(g.cast(enemy.x,enemy.y,side));
  }
  return results;
}

test('historical production sources and the single-guard vulnerable engine reproducer remain independently pinned',()=>{
  for(const file of ['engine.js','campaign.js','backup.js','objectives.js','profile-session.js','training.js','challenges.js','battle-report.js'])readHistoricalProduction(file);
  assertHistoricalEngineOracle();
  for(const key of ['WORLD','LANES','MAPS','BUILDINGS','UNITS','SPELL'])assert.deepEqual(current[key],historical[key],key);
});

test('legacy map helpers retain exact outputs across both sides, off-grid points and map boundaries',()=>{
  for(const mapId of maps)for(const side of [0,1]){
    const a=current.getMap(mapId),b=historical.getMap(mapId);
    assert.deepEqual(current.buildBounds(a,side),historical.buildBounds(b,side));
    assert.deepEqual(current.buildSites(a,side),historical.buildSites(b,side));
    for(const x of [-1,0,110,200,270,1320,1600,3200,4000,4001])for(const key of ['homeX','worldX'])assert.equal(current[key](a,side,x),historical[key](b,side,x));
    for(const y of [-1,0,180,260,340,450,560,640,720,900,901])assert.equal(current.laneFor(a,y),historical.laneFor(b,y));
  }
});

test('three old maps × three difficulties × three seeds preserve paid commands, full trajectories and cross-restored v1/v2 JSON',()=>{
  for(const mapId of maps)for(const difficulty of difficulties)for(const seed of [0,57,4294967295]){
    let a=new current.Game({mapId,difficulty,seed}),b=new historical.Game({mapId,difficulty,seed});
    const label=`${mapId}/${difficulty}/${seed}`;equal(a,b,label+' initial');
    for(let frame=0;frame<12000&&a.state.winner===null;frame++){
      if(frame%100===0){assert.deepEqual(paidActions(a,frame/100),paidActions(b,frame/100),label+' paid commands');equal(a,b,label+' paid state');}
      const dt=frame%13===0?.017:frame%13===1?.083:.05;a.update(dt);b.update(dt);
      if(frame%100===0)equal(a,b,label+' tick '+frame);
      if(frame%997===0){const aSave=a.serialize(),bSave=b.serialize();a=current.Game.restore(bSave);b=historical.Game.restore(aSave);equal(a,b,label+' cross restore');}
    }
    assert.notEqual(a.state.winner,null,label+' must finish');equal(a,b,label+' final');
    assert.equal(a.serialize().version,mapId==='classic'?1:2);
  }
});

test('all legacy maps preserve overtime, forced-decay edges and simultaneous-collapse outcomes',()=>{
  for(const mapId of maps)for(const difficulty of difficulties)for(const time of [299.9,299.95,300,419.9,419.95,420,420.05]){
    let a=new current.Game({mapId,difficulty,ai:false}),b=new historical.Game({mapId,difficulty,ai:false});
    for(const g of [a,b]){g.state.buildings=[];g.state.effects=[];g.state.time=time;g.state.overtime=time>=300;}
    for(let frame=0;frame<4;frame++){a.update(.05);b.update(.05);equal(a,b,`${mapId}/${difficulty}/${time}/${frame}`);}
    a=current.Game.restore(a.serialize());b=historical.Game.restore(b.serialize());equal(a,b,'boundary restore');
    if(time===420) {for(let frame=0;frame<4000&&a.state.winner===null;frame++){a.update(.05);b.update(.05);if(frame%100===0)equal(a,b,'decay trajectory');}assert.equal(a.state.winner,'draw');equal(a,b,'decay draw');}
  }
});

test('all sixteen legacy mission definitions differ only in the independently approved text literals',()=>{
  assert.equal(campaign.CAMPAIGN_MISSIONS.length,16);assert.equal(oldCampaign.CAMPAIGN_MISSIONS.length,16);
  assert.deepEqual(normalizeCopy(campaign.CAMPAIGN_MISSIONS,'missions'),oldCampaign.CAMPAIGN_MISSIONS);
  assert.deepEqual(normalizeCopy(campaign.CAMPAIGN_CHAPTERS,'chapters'),oldCampaign.CAMPAIGN_CHAPTERS);
  assert.ok(campaign.INTRO_MISSIONS.every(m=>!oldCampaign.CAMPAIGN_MISSIONS.some(old=>old.id===m.id)));
});

test('all sixteen old mission setups, targets, outcomes and paid idle/reference/mastery continuations remain exact',()=>{
  for(const mission of oldCampaign.CAMPAIGN_MISSIONS)for(const mode of ['idle','reference','mastery']){
    let a=campaign.createCampaignMission(mission.id),b=oldCampaign.createCampaignMission(mission.id);
    const policy=()=>mode==='idle'?()=>{}:mode==='mastery'?campaignMasteryPolicy(mission.id):campaignPolicy(mission.id),pa=policy(),pb=policy();
    const label=mission.id+'/'+mode;equal(a,b,label+' setup');
    let ended=false;
    for(let tick=0;tick<(mission.timeLimit+1)*20;tick++){
      if(tick%20===0){pa(a);pb(b);}
      a.update(.05);b.update(.05);
      if(tick%100===0){equal(a,b,label+' trajectory '+tick);assert.deepEqual(campaign.getCampaignTargets(a,mission.id),oldCampaign.getCampaignTargets(b,mission.id));assert.equal(campaign.currentIncome(a),oldCampaign.currentIncome(b));}
      if(tick%197===0){a=current.Game.restore(a.serialize());b=historical.Game.restore(b.serialize());equal(a,b,label+' restore');}
      const outcome=campaign.evaluateCampaignMission(a,mission.id),oldOutcome=oldCampaign.evaluateCampaignMission(b,mission.id);assert.deepEqual(outcome,oldOutcome,label+' objective '+tick);
      if(outcome.completed||outcome.failed){ended=true;break;}
    }
    assert.ok(ended,label+' must resolve');equal(a,b,label+' end');
  }
});

test('legacy progress normalization, merge, recording, unlocks and all 48 stars remain unchanged independently of intro records',()=>{
  let a=campaign.createCampaignProgress(),b=oldCampaign.createCampaignProgress();assert.deepEqual(a,b);
  for(const mission of oldCampaign.CAMPAIGN_MISSIONS){
    for(const m of oldCampaign.CAMPAIGN_MISSIONS)assert.equal(campaign.isMissionUnlocked(a,m.id),oldCampaign.isMissionUnlocked(b,m.id));
    const ga=campaign.createCampaignMission(mission.id),gb=oldCampaign.createCampaignMission(mission.id);for(const g of [ga,gb])g.state.bases[1].hp=0;
    a=campaign.recordCampaignResult(a,mission.id,ga);b=oldCampaign.recordCampaignResult(b,mission.id,gb);assert.deepEqual(a,b);
    assert.deepEqual(legacyOverview(campaign.getCampaignOverview(a)),oldCampaign.getCampaignOverview(b));
    assert.deepEqual(campaign.normalizeCampaignProgress(a),oldCampaign.normalizeCampaignProgress(b));
    assert.deepEqual(campaign.mergeCampaignProgress({},a),oldCampaign.mergeCampaignProgress({},b));
  }
  for(const p of [a,b])for(const r of Object.values(p.missions))r.stars=3;
  assert.equal(campaign.getCampaignOverview(a).maxStars,48);assert.equal(campaign.getCampaignOverview(a).stars,48);
  for(const bad of [null,[],{}, {...a,version:2}, {...a,missions:{ironroot:{completed:true,stars:3,bestTime:10}}}])assert.deepEqual(campaign.normalizeCampaignProgress(bad),oldCampaign.normalizeCampaignProgress(bad));
});
