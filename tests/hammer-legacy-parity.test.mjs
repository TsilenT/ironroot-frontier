import {engineBeforeFinalChapter} from './final-chapter-engine-source.mjs';
import test from'node:test';import assert from'node:assert/strict';import{readFileSync}from'node:fs';
import{verifyHistoricalRuntime,historicalRoot}from'../qa/hammer-prototype/historical-runtime.mjs';
import*as current from'../dist/campaign.js';import{Game,RULESETS}from'../dist/engine.js';import{CURRENT_PROFILE_PROTOCOL_VERSION}from'../dist/profile-session.js';import{CURRENT_PROFILE_PROTOCOL_VERSION as HAMMER_PROFILE_VERSION}from'./fixtures/profile-session-v0320.js';
verifyHistoricalRuntime();const prior=await import(new URL('dist/campaign.js',historicalRoot));const oldEngine=await import(new URL('dist/engine.js',historicalRoot));
const before=readFileSync(new URL('dist/engine.js',historicalRoot),'utf8'),after=engineBeforeFinalChapter();
test('legacy AI branch and scheduling arithmetic remain verbatim Salt bytes',()=>{const nl=String.fromCharCode(10),body=s=>s.slice(s.indexOf('  _ai(side=1){'),s.indexOf(nl+'}'+nl+nl+'/** Strict save validation.'));assert.equal(body(after).replace('    if(supportsHammer(this.ruleset))return runHammerAI(this,side);'+nl,''),body(before));assert.equal(after.split(nl).find(x=>x.includes('if(this.ai){this.aiTimer')),before.split(nl).find(x=>x.includes('if(this.ai){this.aiTimer')));assert.equal(HAMMER_PROFILE_VERSION,23);assert.equal(CURRENT_PROFILE_PROTOCOL_VERSION,31);});
test('all previous whole-rule descriptors remain exact, including legacy AI policy',()=>{for(const[id,r]of Object.entries(oldEngine.RULESETS))assert.deepEqual(RULESETS[id],r,id);});
const frozen=JSON.parse(readFileSync(new URL('tests/fixtures/salt-parent-v0300.json',historicalRoot)));
const refs=[...Object.keys(frozen.descriptors),'salt-in-the-stores@1'];
for(const ref of refs){const[id,revision]=ref.split('@');for(const variant of id==='false-quiet'?['a','b']:[null])test('prior identity paid/restore continuation parity: '+ref+(variant?'/'+variant:''),()=>{
 const options={revision:+revision,...(variant?{variant}:{})},a=prior.createCampaignMission(id,options),b=current.createCampaignMission(id,options);
 assert.deepEqual(current.getCampaignMission(id,+revision),prior.getCampaignMission(id,+revision));assert.deepEqual(b.serialize(),a.serialize());
 const action=g=>{for(const lane of g.map.lanes)for(const home of[1250,1110,970,830,690,550,410,270]){const result=g.build('barracks',home,lane,0);if(result.ok)return result;}return null;};assert.deepEqual(action(b),action(a));
 for(let i=0;i<400;i++){if(i===100)assert.deepEqual(b.buyCitadelOption('arrows',0),a.buyCitadelOption('arrows',0));if(i===200)assert.deepEqual(b.cast(1600,b.map.lanes[0],0),a.cast(1600,a.map.lanes[0],0));a.update(.05);b.update(.05);}
 assert.deepEqual(b.serialize(),a.serialize());const ar=oldEngine.Game.restore(a.serialize()),br=Game.restore(b.serialize());for(let i=0;i<200;i++){ar.update(.05);br.update(.05);}assert.deepEqual(br.serialize(),ar.serialize());
});}
for(const mapId of['classic','long-march','twin-span'])test('legacy implicit engine format and continuation parity '+mapId,()=>{const a=new oldEngine.Game({mapId,seed:7301}),b=new Game({mapId,seed:7301});for(let i=0;i<600;i++){a.update(.05);b.update(.05);}assert.deepEqual(b.serialize(),a.serialize());});
// Run the original Salt mission test bytes, including its original engine SHA oracle,
// entirely inside the content-addressed historical closure. Never retarget its hash.
await import(new URL('tests/salt-stores-mission.test.mjs',historicalRoot));
