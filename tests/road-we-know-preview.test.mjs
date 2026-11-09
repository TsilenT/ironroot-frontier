import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildFixtures,prepareNative} from '../qa/road-we-know/prepare-native.mjs';
import {createRoadWeKnow} from '../qa/road-we-know/scenario.mjs';
import {createCampaignMission} from '../dist/campaign.js';
test('recovered prototype opening is exactly production except dedicated ruleset identity',()=>{const a=createCampaignMission('the-road-we-know').serialize(),b=createRoadWeKnow().serialize();b.rulesetId=a.rulesetId;assert.deepEqual(a,b);});
test('preview uses reconciled ordinary paid progress and never a synthetic terminal result',()=>{const {profiles,receipts,completionTime}=buildFixtures();assert.deepEqual(Object.keys(profiles),['briefing','fresh-main','paid-opening-main','terminal-near-main']);assert.equal(receipts['fresh-main'].time,0);assert.equal(receipts['paid-opening-main'].time,25);const near=receipts['terminal-near-main'];assert.ok(near.cores[0]>0&&near.cores[1]>0&&near.cores[1]<=700);assert.ok(near.ledger.purchases.every(n=>n>0));assert.ok(near.ledger.maxError.every(n=>n<1e-6));assert.ok(completionTime.main>near.time&&completionTime.main<=600);});
test('preview refuses source paths and statically disables real storage and service workers',async()=>{await assert.rejects(()=>prepareNative({output:new URL('../',import.meta.url).pathname,writePreview:true}));const source=readFileSync(new URL('../qa/road-we-know/prepare-native.mjs',import.meta.url),'utf8');assert.match(source,/backend = window.sessionStorage/);assert.match(source,/false && \/\/ Developer preview: do not install a service worker/);});
