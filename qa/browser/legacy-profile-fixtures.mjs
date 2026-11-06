// Exact frozen 0.9 QA baseline, NOT a released/production build. It predates the
// held-gesture input fix and is used only to exercise a real protocol-1 client.
import {readFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
export const LEGACY_QA_ROOT=new URL('./fixtures/0.9.0-qa-baseline-dist/',import.meta.url);
export const LEGACY_QA_PATH='/__qa_legacy/0.9.0/';
export async function validateLegacyProfileFixture(){
  const manifest=JSON.parse(await readFile(new URL('./fixtures/0.9.0-qa-baseline-sha256.json',import.meta.url),'utf8'));
  assert.equal(manifest.version,'0.9.0');assert.equal(Object.keys(manifest.files).length,24);
  assert.deepEqual((await readdir(LEGACY_QA_ROOT)).sort(),Object.keys(manifest.files).sort());
  for(const [file,expected] of Object.entries(manifest.files))assert.equal(createHash('sha256').update(await readFile(new URL(file,LEGACY_QA_ROOT))).digest('hex'),expected,'frozen QA baseline '+file);
  const {CAMPAIGN_MISSIONS:oldMissions}=await import(new URL('campaign.js',LEGACY_QA_ROOT));
  const {CAMPAIGN_MISSIONS:newMissions}=await import('../../dist/campaign.js');
  const rules=mission=>Object.fromEntries(Object.entries(mission).filter(([key])=>!['mapId','ai','reward'].includes(key)));
  assert.deepEqual(oldMissions.map(rules),newMissions.slice(0,12).map(rules),'first twelve authored missions unchanged except derived next-chapter reward');
  assert.deepEqual(oldMissions.map(m=>m.ai===true),newMissions.slice(0,12).map(m=>m.ai));
  const {createProfileSession}=await import(new URL('profile-session.js',LEGACY_QA_ROOT));
  const raw=JSON.stringify({format:'ironroot-profile',version:2,epoch:'qa-proof',phase:'ready'});
  assert.equal(createProfileSession(()=>({getItem:()=>raw,setItem(){throw Error('No writes expected');},removeItem(){throw Error('No writes expected');}})).status().canWrite,false);
  return manifest;
}
