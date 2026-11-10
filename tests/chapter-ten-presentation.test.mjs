/** Pure poses, native-event observers and DOM stubs only; no pixels/audio output. */
import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {runInContext} from 'node:vm';
import * as c from '../dist/campaign.js';import {COLOSSUS} from '../dist/colossus-spec.js';import {createLastEngineAudioObserver,colossusPose,lastEngineView} from '../dist/final-chapter-view.js';import {encodeBattle,decodeBattle} from '../dist/battle-codec.js';import {startupHarness} from './mobile-startup-fixture.mjs';
const earned=()=>({...c.createCampaignProgress(),missions:Object.fromEntries(c.CAMPAIGN_PROGRESS_MISSIONS.filter(m=>m.id!=='the-last-engine').map(m=>[m.id,{completed:true,stars:1,bestTime:60}]))});
function armed(){const g=c.createCampaignMission('the-last-engine');g.state.buildings=[];g.state.units=[];g.state.effects=[];return g;}
function reveal(g){g.state.bases[1].hp=600;g.update(.05);return g.state.units.find(u=>u.type==='colossus');}
const options={audible:true,camera:1250,width:1200,scale:1};
function attackFixture(){const g=armed();assert.equal(g.build('barracks',1250,g.map.lanes[1]).ok,true);reveal(g);for(let n=0;n<900;n++){g.update(.05);if(g.state.effects.some(e=>e.type==='blast'&&e.radius===180))return g;}throw Error('synthetic native-contact fixture did not strike');}
test('armed silence, fresh deployment once, and pure observation preserve exact serialization/RNG',()=>{
 const g=armed(),observer=createLastEngineAudioObserver();observer.prime(g);let before=g.serialize();assert.equal(lastEngineView(g),null);assert.deepEqual(observer.update(g,options),[]);assert.deepEqual(g.serialize(),before);reveal(g);before=g.serialize();assert.deepEqual(observer.update(g,options).map(c=>c.name),['engineReveal']);for(let i=0;i<20;i++)assert.deepEqual(observer.update(g,options),[]);assert.deepEqual(g.serialize(),before);observer.reset();assert.deepEqual(observer.update(g,options),[],'unprimed active encounter is treated as an existing save');
});
test('actual native attack occurrence emits once; held contact flags and surviving effects do not retrigger',()=>{
 const g=armed(),observer=createLastEngineAudioObserver();g.build('barracks',1250,g.map.lanes[1]);observer.prime(g);reveal(g);observer.update(g,options);let impacts=0;
 for(let n=0;n<1000&&impacts<2;n++){g.update(.05);const cues=observer.update(g,options);if(cues.some(c=>c.name==='engineImpact')){impacts++;assert.equal(cues.length,1);const before=g.serialize();for(let i=0;i<5;i++)assert.deepEqual(observer.update(g,options),[]);assert.deepEqual(g.serialize(),before);}}
 assert.equal(impacts,2,'two distinct native strikes, not repeated attack>0 frames');
});
test('large time jumps, blocked deployment and current impacts are consumed without queued catch-up',()=>{
 for(const audible of [false,true]){const g=armed(),o=createLastEngineAudioObserver();o.prime(g);reveal(g);if(audible)for(let i=0;i<30;i++)g.update(.05);assert.deepEqual(o.update(g,{...options,audible}),[]);assert.deepEqual(o.update(g,options),[]);}
 const g=attackFixture(),o=createLastEngineAudioObserver();o.prime(g);assert.deepEqual(o.update(g,options),[]);assert.ok(g.state.effects.some(e=>o.isImpact(g,e)));o.reset();assert.deepEqual(o.update(g,options),[]);
});
test('reduced motion is a useful static mechanical pose; native body and phase/contact information remain unchanged',()=>{
 const unit={x:2800,y:450,attack:0},phase={triggeredAt:1},before=structuredClone({unit,phase});
 const first=colossusPose(unit,.5,phase),later=colossusPose(unit,1.5,phase);assert.equal(first.mode,'emerging');assert.notEqual(first.panelLift,later.panelLift);assert.deepEqual(colossusPose(unit,.5,phase,{reducedMotion:true}),colossusPose(unit,1.5,phase,{reducedMotion:true}));
 const left={...unit,x:1000},right={...unit,x:1100};assert.notEqual(colossusPose(left,30,phase).treadOffset,colossusPose(right,30,phase).treadOffset);assert.deepEqual(colossusPose(left,30,phase,{reducedMotion:true}),colossusPose(right,31,phase,{reducedMotion:true}));const contact=colossusPose({...left,attack:.1},30,phase,{reducedMotion:true});assert.equal(contact.contact,true);assert.equal(contact.brace,4);assert.equal(contact.mode,'siege');assert.equal(COLOSSUS.radius,210);assert.deepEqual({unit,phase},before);
});
const source=readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');
function harness(game=armed()){
 const h=startupHarness({width:1180,height:850}),{c:app}=h,cues=[],state={unlocked:true,muted:false,sfxEnabled:true,volume:.6,sfxVolume:.5};
 app.campaignProgress=earned();app.audio={getState:()=>state,setScene(scene){state.scene=scene;},setIntensity(){}};app.sound=(name,options)=>cues.push({name,options});const start=source.indexOf('function updateAudio()'),end=source.indexOf('function frame(',start);runInContext(source.slice(start,end),app);app.start(game,null,'the-last-engine');cues.length=0;
 return {...h,g:game,cues,state};
}
test('actual audio handler selects a bounded global reveal and distinct local impact without generic duplication',()=>{
 const {c:app,g,cues,$}=harness();app.updateAudio();assert.deepEqual(cues,[]);reveal(g);app.updateAudio();assert.deepEqual(cues.map(c=>c.name),['engineReveal']);app.updateHUD();assert.match($('objectiveTime').textContent,/Emerging · damageable/);assert.match($('objectiveProgress').attributes['aria-label'],/health 10000 of 10000/);cues.length=0;for(let i=0;i<10;i++)app.updateAudio();assert.deepEqual(cues,[]);
 const boss=g.state.units.find(u=>u.type==='colossus');app.renderer.camera=boss.x;g._effect(boss.x,boss.y,'blast',1,.7,180);g._effect(boss.x,boss.y,'blast',1,.7,55);app.updateAudio();assert.deepEqual(cues.map(c=>c.name),['engineImpact','siege'],'only the separate ordinary blast retains the generic siege cue');cues.length=0;app.updateAudio();assert.deepEqual(cues,[]);
});
for(const blocked of ['paused','hidden','muted','sfx-disabled','volume-zero','sfx-zero','suspended'])test(`actual audio handler consumes ${blocked} reveal/impact events with no resume backlog`,()=>{
 const {c:app,g,cues,state}=harness();if(blocked==='paused')app.paused=true;else if(blocked==='hidden')app.document.hidden=true;else if(blocked==='muted')state.muted=true;else if(blocked==='sfx-disabled')state.sfxEnabled=false;else if(blocked==='volume-zero')state.volume=0;else if(blocked==='sfx-zero')state.sfxVolume=0;else state.unlocked=false;
 const boss=reveal(g);app.renderer.camera=boss.x;g._effect(boss.x,boss.y,'blast',1,.7,180);app.updateAudio();assert.deepEqual(cues,[]);if(blocked==='hidden')assert.equal(state.scene,'paused');app.paused=false;app.document.hidden=false;Object.assign(state,{muted:false,sfxEnabled:true,volume:.6,sfxVolume:.5,unlocked:true});app.updateAudio();assert.deepEqual(cues,[],'complete cue list includes no fallback generic boss blast');
});
test('real active restore/re-entry with an existing native blast primes both boss and generic audio cursors',()=>{
 const g=attackFixture(),progress=earned(),ref=c.campaignScenarioForGame(g,'the-last-engine'),packet=encodeBattle(g,ref,{campaignProgress:progress}),restored=decodeBattle(packet,{campaignProgress:progress}).game;
 const {c:app,cues}=harness(restored);app.renderer.camera=restored.state.units.find(u=>u.type==='colossus').x;const before=restored.serialize();app.updateAudio();app.updateAudio();assert.deepEqual(cues,[],'neither engineReveal, engineImpact nor generic siege/collapse is replayed');assert.deepEqual(restored.serialize(),before);app.start(restored,null,'the-last-engine');cues.length=0;app.updateAudio();assert.deepEqual(cues,[]);
});
test('native art source consumes pure reduced-motion pose without camera takeover or changing the radius/health geometry',()=>{
 const text=readFileSync(new URL('../dist/render.js',import.meta.url),'utf8'),start=text.indexOf('  drawColossus('),end=text.indexOf('  drawUnit(',start),body=text.slice(start,end);assert.match(body,/colossusPose\(u,time,phase,\{reducedMotion:this.reducedMotion\}\)/);assert.match(body,/arc\(0,0,COLOSSUS\.radius/);assert.match(body,/this\.health\(-175,-221,350,u\.hp\/u\.maxHp/);assert.doesNotMatch(body,/camera\s*=|Math\.random|random\(|setTimeout/);
});
test('crowded native-effect batches select at most one heavy impact and consume the whole batch',()=>{
 const g=armed(),o=createLastEngineAudioObserver();o.prime(g);const boss=reveal(g);o.update(g,options);for(let i=0;i<40;i++)g._effect(boss.x,boss.y,'blast',1,.7,180);const view={...options,camera:boss.x};assert.deepEqual(o.update(g,view).map(c=>c.name),['engineImpact']);assert.deepEqual(o.update(g,view),[]);
});
