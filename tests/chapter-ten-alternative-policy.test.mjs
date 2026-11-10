/** Synthetic choice boundary only; no natural route, tick or balance claim. */
import test from 'node:test';import assert from 'node:assert/strict';import {createCampaignMission} from '../dist/campaign.js';import {alternativeChapterTenPolicy} from './chapter-ten-alternative-policy.mjs';
test('defensive upgrade selects the lowest health fraction first and does not substitute a cheaper later candidate',()=>{
 for(const canAffordFirst of [false,true]){
  const g=createCampaignMission('the-last-engine');g.state.gold[0]=10000;
  const warden=g.build('wardenLodge',1110,g.map.lanes[0]).building,barracks=g.build('barracks',1250,g.map.lanes[2]).building;assert.ok(warden&&barracks);
  warden.hp=warden.maxHp*.2;barracks.hp=barracks.maxHp*.4;
  const firstCost=g.upgradeCost(warden),laterCost=g.upgradeCost(barracks);assert.ok(firstCost>laterCost);g.state.gold[0]=canAffordFirst?firstCost:laterCost;
  const before=g.serialize(),policy=alternativeChapterTenPolicy({queue:[],upgradePriority:[],defensiveUpgradeFraction:.6},{nextCommand:0,queueIndex:0,successfulBuilds:4,rejections:[]});policy.decide(g);
  assert.equal(barracks.level,1,'an affordable later candidate never replaces the selected first target');assert.equal(warden.level,canAffordFirst?2:1);if(!canAffordFirst)assert.deepEqual(g.serialize(),before,'unaffordable selected target leaves the world and RNG unchanged when no other action applies');
 }
});
