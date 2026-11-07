// Immutable released runtime; seeded checkpoints are automated paid runs, not human play.
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import * as campaign from '../fixtures/production-v015/dist/campaign.js';
import * as backup from '../fixtures/production-v015/dist/backup.js';
import {encodeBattle,identityOf} from '../fixtures/production-v015/dist/battle-codec.js';
import {advanceObjectiveBattle} from '../fixtures/production-v015/dist/objectives.js';
import {createProfileSession,PROFILE_MARKER_KEY} from '../fixtures/production-v015/dist/profile-session.js';
import {campaignPolicy} from '../fixtures/production-v015/campaign-policies.mjs';
import {onboardingReferencePolicy} from '../fixtures/production-v015/onboarding-campaign-policies.mjs';
export {PROFILE_MARKER_KEY};
export const PRODUCTION_V015_ROOT=new URL('../fixtures/production-v015/dist/',import.meta.url);
export const PRODUCTION_V015_PATH='/__qa_production/0.15.0/';
export const PRODUCTION_V015_MANIFEST_SHA256='9011e995f6e8562afc994cb3dc270d209e91a9568c7a9a11955d2f8eda9c4d8f';
export const V015_KEYS=Object.values(backup.BACKUP_STORAGE_KEYS);
export const V015_SCENARIOS=['fresh-opening','earned-ranged','earned-full','saved-wings'];
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
export async function validateProductionV015(){
  const bytes=await readFile(new URL('../fixtures/production-v015/historical-manifest.json',import.meta.url));
  assert.equal(hash(bytes),PRODUCTION_V015_MANIFEST_SHA256);
  const manifest=JSON.parse(bytes);assert.equal(manifest.runtimeFiles,46);assert.equal(manifest.totalBytes,907887);
  assert.deepEqual((await readdir(PRODUCTION_V015_ROOT)).sort(),Object.keys(manifest.files).sort());
  let total=0;for(const [file,pin] of Object.entries(manifest.files)){
    assert.ok(!file.includes('/')&&!file.includes('\\')&&!file.includes('..'));
    const data=await readFile(new URL(file,PRODUCTION_V015_ROOT));total+=data.length;assert.equal(hash(data),pin,file);
  }
  assert.equal(total,manifest.totalBytes);
  for(const [file,pin] of Object.entries({'campaign-policies.mjs':'62ec228967ac6d3582379eaa01b76785e0aa6f7e0b3d2a18f0e918c9f1c2873b','onboarding-campaign-policies.mjs':'57ab268177cc6f695215df554a9c3608580ae0e6333929d5e1c54935c7138ed3'}))assert.equal(hash(await readFile(new URL('../fixtures/production-v015/'+file,import.meta.url))),pin);
  return manifest;
}
const cache=new Map();
export function productionV015Profile(name){
  assert.ok(V015_SCENARIOS.includes(name));if(cache.has(name))return structuredClone(cache.get(name));
  const count=[0,1,2,6][V015_SCENARIOS.indexOf(name)],ids=['roadside-watch','shield-at-the-fork','open-three-roads','emberwatch','three-roads','winter-stores'];
  let progress=campaign.createCampaignProgress();const earned=[],history=[];
  for(const id of ids.slice(0,count)){
    const game=campaign.createProgressionCampaignMission(id,progress),mission=campaign.getCampaignLaunchMission(id,progress);
    const policy=campaign.isOnboardingMission(id)?onboardingReferencePolicy(id):campaignPolicy(id);
    let outcome;
    for(let tick=0;tick<(mission.timeLimit+1)*20;tick++){
      if(tick%20===0)policy(game);
      outcome=advanceObjectiveBattle(game,.05,g=>campaign.evaluateCampaignMission(g,id),mission.timeLimit);
      if(outcome.completed||outcome.failed)break;
    }
    assert.equal(outcome.completed,true,id+' earned victory');assert.equal(outcome.failed,false);
    progress=campaign.recordCampaignResult(progress,id,game);assert.ok(progress.missions[id]);
    history.push({won:true,draw:false,identity:identityOf(game,campaign.campaignScenarioForGame(game,id)),difficulty:mission.difficulty,time:game.state.time,kills:game.state.stats.kills[0],built:game.state.stats.built[0],date:'2026-11-07T00:00:00.000Z'});
    earned.push({id,time:game.state.time,stars:progress.missions[id].stars});
  }
  const id=name==='saved-wings'?'wings-of-ash':ids[count];
  const game=campaign.createProgressionCampaignMission(id,progress);
  const type=name==='saved-wings'?'aerie':'archery';
  assert.equal(game.build(type,550,game.map.lanes[1]??game.map.lanes[0]).ok,true);
  for(let i=0;i<40;i++)advanceObjectiveBattle(game,.05,g=>campaign.evaluateCampaignMission(g,id));
  const battle=encodeBattle(game,campaign.campaignScenarioForGame(game,id),{campaignProgress:progress});
  const domains={campaign:progress,trials:{},settings:{sound:false,music:false,sfx:true,volume:.25,reducedMotion:true,quality:'low'},history,battle};
  const values={};for(const [domain,key] of Object.entries(backup.BACKUP_STORAGE_KEYS))values[key]=' \n'+JSON.stringify(domains[domain],null,2)+'\n ';
  const backend={getItem:key=>values[key]??null,setItem:(key,value)=>{values[key]=value;},removeItem:key=>{delete values[key];}};
  const profile=createProfileSession(()=>backend,{requiredProtocolVersion:4,newEpoch:()=>`qa-v015-${name}`});
  const text=backup.createBackup(profile.storage,{createdAt:'2026-11-07T00:00:00.000Z'});assert.deepEqual(backup.parseBackup(text).data,domains);
  const result={name,id,values,domains,text,earned,roster:campaign.getCampaignRoster(progress),overview:campaign.getProgressionCampaignOverview(progress)};
  cache.set(name,structuredClone(result));return result;
}
