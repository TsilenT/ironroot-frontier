import assert from 'node:assert/strict';
import {validateProductionV015,productionV015Profile,V015_SCENARIOS,V015_KEYS,PROFILE_MARKER_KEY,PRODUCTION_V015_ROOT} from './production-v015-fixtures.mjs';
import {createProfileSession as historicalSession} from '../fixtures/production-v015/dist/profile-session.js';
import {createProfileSession,CURRENT_PROFILE_PROTOCOL_VERSION} from '../../dist/profile-session.js';
import {decodeBattle} from '../../dist/battle-codec.js';
import {parseBackup} from '../../dist/backup.js';
import {CITADEL_CAMPAIGN_RULESET_IDS} from '../../dist/rulesets.js';
import {getCampaignRoster,createProgressionCampaignMission,campaignScenarioForGame} from '../../dist/campaign.js';
import {shellManifest,candidateIdentity,requireDistinctUpgrade} from './update-fixtures.mjs';
export async function validateProductionV015Upgrade(){
  const manifest=await validateProductionV015();assert.equal(CURRENT_PROFILE_PROTOCOL_VERSION,14);
  const prior=await shellManifest(PRODUCTION_V015_ROOT);
  assert.throws(()=>requireDistinctUpgrade(prior,prior),/BLOCKED/);
  requireDistinctUpgrade(prior,await candidateIdentity());
  for(const name of V015_SCENARIOS){
    const fixture=productionV015Profile(name),values={...fixture.values};
    const backend={getItem:k=>values[k]??null,setItem:(k,v)=>{values[k]=v;},removeItem:k=>{delete values[k];}};
    const old=historicalSession(()=>backend,{requiredProtocolVersion:4});assert.equal(old.status().canWrite,true);
    const modern=createProfileSession(()=>backend,{requiredProtocolVersion:CURRENT_PROFILE_PROTOCOL_VERSION});assert.equal(modern.status().canWrite,true);
    const after={...values};assert.deepEqual(JSON.parse(after[PROFILE_MARKER_KEY]),{...JSON.parse(fixture.values[PROFILE_MARKER_KEY]),version:CURRENT_PROFILE_PROTOCOL_VERSION});
    for(const key of V015_KEYS){assert.equal(values[key],fixture.values[key]);for(const method of ['getItem','setItem','removeItem'])assert.throws(()=>old.storage[method](key,'forbidden'));}
    assert.equal(old.beginImport().ok,false);assert.equal(old.beginImport({recover:true}).ok,false);
    const reopened=historicalSession(()=>backend,{requiredProtocolVersion:4});assert.equal(reopened.beginImport({recover:true}).ok,false);
    assert.deepEqual(values,after);
    assert.deepEqual(parseBackup(fixture.text).data,fixture.domains);
    const decoded=decodeBattle(fixture.domains.battle,{campaignProgress:fixture.domains.campaign});
    assert.deepEqual(decoded.game.serialize(),fixture.domains.battle.game);
    assert.deepEqual(getCampaignRoster(fixture.domains.campaign),{...fixture.roster,rulesetId:CITADEL_CAMPAIGN_RULESET_IDS[fixture.roster.stage-1]});
    if(name==='saved-wings'){
      assert.equal(fixture.domains.battle.scenario.revision,2);
      const fresh=createProgressionCampaignMission('wings-of-ash',fixture.domains.campaign);
      assert.equal(campaignScenarioForGame(fresh,'wings-of-ash').revision,5);assert.equal(fresh.ruleset.id,'frontier-campaign-citadel-open');
    }
  }
  return manifest;
}
if(process.argv[1]&&new URL(import.meta.url).pathname===process.argv[1]){const m=await validateProductionV015Upgrade();console.log(`v0.15: ${m.runtimeFiles} exact runtime files, ${m.totalBytes} bytes; four earned profiles, full old read/write/recovery fence and fresh citadel identity verified. Browser takeover UNRUN.`);}
