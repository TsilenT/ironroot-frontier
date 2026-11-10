import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';import * as c from '../dist/campaign.js';import {getRuleset} from '../dist/engine.js';
const frozen=JSON.parse(readFileSync(new URL('./fixtures/bowstrings-parent-v038-candidate.json',import.meta.url)));const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
test('reviewed pending Three Minutes More descriptor/rules/opening remain exact while earlier published hashes retain their separate test',()=>{
 assert.equal(frozen.commit,'85e5d8930d53deb105bf1708e54ff35fa6aa4dad');assert.equal(hash(getRuleset('frontier-campaign-three-minutes')),frozen.threeMinutes.rules);assert.equal(hash(c.getCampaignMission('three-minutes-more')),frozen.threeMinutes.descriptor);assert.equal(hash(c.createCampaignMission('three-minutes-more').serialize()),frozen.threeMinutes.opening);
});
