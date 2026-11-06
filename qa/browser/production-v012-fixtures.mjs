// Read-only historical source. Never regenerate this fixture from the candidate.
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {Game as HistoricalGame} from '../fixtures/production-v012/dist/engine.js';
import * as oldCampaign from '../fixtures/production-v012/dist/campaign.js';
import * as oldBackup from '../fixtures/production-v012/dist/backup.js';
import {createProfileSession as oldProfile,PROFILE_MARKER_KEY} from '../fixtures/production-v012/dist/profile-session.js';
export const PRODUCTION_V012_ROOT=new URL('../fixtures/production-v012/dist/',import.meta.url);
export const PRODUCTION_V012_PATH='/__qa_production/0.12.0/';
export const PRODUCTION_V012_MANIFEST_SHA256='1bfa09e053e363e0589a8a96180be04cc4821b0b644b5b5923de66b83b6f6ff7';
export const HISTORICAL_SCENARIOS=['classic','long-march','twin-span','far-beacon'];
export const HISTORICAL_KEYS=Object.values(oldBackup.BACKUP_STORAGE_KEYS);
export {PROFILE_MARKER_KEY};
const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
export async function validateProductionV012(){
  const bytes=await readFile(new URL('../fixtures/production-v012/historical-manifest.json',import.meta.url));
  assert.equal(sha256(bytes),PRODUCTION_V012_MANIFEST_SHA256,'externally pinned production manifest');
  const manifest=JSON.parse(bytes);
  assert.equal(manifest.version,'0.12.0');assert.equal(manifest.fileCount,33);assert.equal(manifest.runtimeBytes,668075);
  assert.deepEqual((await readdir(PRODUCTION_V012_ROOT)).sort(),Object.keys(manifest.files).sort());
  let total=0;
  for(const [file,hash] of Object.entries(manifest.files)){
    assert.ok(!file.includes('/')&&!file.includes('\\')&&!file.includes('..'));
    const data=await readFile(new URL(file,PRODUCTION_V012_ROOT));total+=data.length;
    assert.equal(sha256(data),hash,file+' immutable SHA-256');assert.equal(data.length,manifest.byteLengths[file]);
  }
  assert.equal(total,668075);return manifest;
}
export function historicalProfile(scenario='classic'){
  assert.ok(HISTORICAL_SCENARIOS.includes(scenario));
  const progress=oldCampaign.createCampaignProgress();
  const ids=scenario==='far-beacon'?oldCampaign.CAMPAIGN_MISSIONS.slice(0,13):oldCampaign.CAMPAIGN_MISSIONS;
  ids.forEach((mission,index)=>{progress.missions[mission.id]={completed:true,stars:3,bestTime:41+index};});
  const game=scenario==='far-beacon'?oldCampaign.createCampaignMission(scenario):new HistoricalGame({mapId:scenario,seed:120012,ai:false});
  const battle={format:'ironroot-save',version:2,challengeId:null,campaignId:scenario==='far-beacon'?scenario:null,game:game.serialize()};
  const domains={campaign:progress,trials:{shieldbreaker:{completed:true,bestTime:68.25}},settings:{sound:false,music:false,sfx:true,volume:.25,reducedMotion:true,quality:'low'},history:[{won:true,draw:false,challengeId:null,campaignId:'open-horizon',difficulty:'normal',time:120,kills:7,built:4,date:'2026-11-06T00:00:00.000Z',mapId:'long-march'}],battle};
  const values={};for(const [domain,key] of Object.entries(oldBackup.BACKUP_STORAGE_KEYS))values[key]=' \n'+JSON.stringify(domains[domain],null,2)+'\n ';
  const backend={getItem:key=>values[key]??null,setItem:(key,value)=>{values[key]=value;},removeItem:key=>{delete values[key];}};
  const profile=oldProfile(()=>backend,{requiredProtocolVersion:2,newEpoch:()=>`qa-production-v012-${scenario}`});
  assert.equal(profile.status().canWrite,true);
  const text=oldBackup.createBackup(profile.storage,{createdAt:'2026-11-06T00:00:00.000Z'}),parsed=oldBackup.parseBackup(text);
  assert.deepEqual(parsed.data,domains);
  const overview=oldCampaign.getCampaignOverview(progress);
  assert.equal(overview.total,16);assert.equal(overview.maxStars,48);
  assert.equal(overview.cleared,scenario==='far-beacon'?13:16);assert.equal(overview.stars,scenario==='far-beacon'?39:48);
  return {values,domains,text,overview};
}
