import test from 'node:test';
import assert from 'node:assert/strict';
import {validateProductionV015Upgrade} from '../qa/browser/validate-production-v015-upgrade.mjs';
import {productionV015Profile,V015_SCENARIOS} from '../qa/browser/production-v015-fixtures.mjs';
test('exact released 0.15 runtime upgrades without rewriting domains or permitting stale recovery',validateProductionV015Upgrade);
test('four historical profiles have legally earned tiers and revision-2 Wings',()=>{
  const profiles=V015_SCENARIOS.map(productionV015Profile);
  assert.deepEqual(profiles.map(f=>f.roster.stage),[1,2,3,3]);
  assert.deepEqual(profiles.map(f=>f.earned.length),[0,1,2,6]);
  assert.deepEqual(profiles.map(f=>f.domains.history.length),[0,1,2,6]);
  for(const f of profiles){assert.deepEqual(productionV015Profile(f.name),f);assert.equal(f.earned.reduce((n,r)=>n+r.stars,0),f.overview.stars);}
  assert.equal(profiles[3].domains.battle.scenario.revision,2);
});
