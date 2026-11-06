import assert from 'node:assert/strict';
import {validateProductionV012,historicalProfile,HISTORICAL_SCENARIOS,PRODUCTION_V012_ROOT} from './production-v012-fixtures.mjs';
import {candidateIdentity,shellManifest,requireDistinctUpgrade} from './update-fixtures.mjs';
import {decodeBattle} from '../../dist/battle-codec.js';
import {parseBackup} from '../../dist/backup.js';
const manifest=await validateProductionV012(),prior=await shellManifest(PRODUCTION_V012_ROOT),current=await candidateIdentity();
assert.throws(()=>requireDistinctUpgrade(prior,prior),/BLOCKED/,'same-identity negative control must fail closed');
for(const scenario of HISTORICAL_SCENARIOS){
  const fixture=historicalProfile(scenario),decoded=decodeBattle(fixture.domains.battle,{campaignProgress:fixture.domains.campaign});
  assert.deepEqual(decoded.game.serialize(),fixture.domains.battle.game);
  assert.deepEqual(parseBackup(fixture.text).data,fixture.domains);
}
if(process.argv.includes('--require-candidate'))requireDistinctUpgrade(prior,current);
console.log(`Production 0.12 fixture: ${manifest.fileCount} files / ${manifest.runtimeBytes} bytes; four historical five-domain profiles accepted unchanged; same-identity rejection verified.`);
console.log(`Candidate ${current.version}: ${current.version===prior.version?'BLOCKED for real upgrade execution until identity bump':'distinct identity; browser takeover still UNRUN'}.`);
