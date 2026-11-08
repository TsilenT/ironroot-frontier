import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {GameAudio,AUDIO_CREDITS,SOUND_NAMES} from '../dist/audio.js';
import {Context} from './audio-test-doubles.mjs';

const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const setup=async(options={})=>{const c=new Context(),a=new GameAudio({muted:false,contextFactory:()=>c,...options});await a.unlock();a._stopScheduler();return {a,c};};

test('all existing SFX preserve the released v0.20.2 synthesis sequence',async()=>{
 const fixture=JSON.parse(read('./fixtures/audio/v0202-sfx.json')),{a,c}=await setup({musicEnabled:false});
 try{assert.deepEqual(Object.keys(fixture.cues),SOUND_NAMES);for(const name of SOUND_NAMES){c.advance(fixture.advanceSeconds);const events=[];a._tone=(...v)=>events.push(['tone',...v]);a._noise=(...v)=>events.push(['noise',...v]);assert.equal(a.play(name,{pan:fixture.pan,volume:fixture.volume}),true);assert.deepEqual(events,fixture.cues[name],name);}}finally{await a.destroy();}
});

test('cancel-and-hold gain automation preserves independent master and SFX controls',async()=>{
 const {a,c}=await setup();try{
  for(const p of [a.master.gain,a.music.gain,a.musicDuck.gain,a.sfx.gain,...Object.values(a.layers).map(x=>x.gain)])p.cancelAndHoldAtTime=function(at){assert.ok(Number.isFinite(at));this.events.push(['hold',this.value,at]);};
  a.setScene('battle');a.setIntensity(1);a.setMusicVolume(.31);a.setSfxVolume(.48);a.setVolume(.82);
  assert.equal(a.master.gain.value,.82*.66);assert.equal(a.music.gain.value,.31);assert.equal(a.sfx.gain.value,.48);
  const before=a.musicDuck.gain.events.length;assert.equal(a.play('warning'),true);assert.ok(a.musicDuck.gain.events.length>before);
  assert.equal(a.music.gain.value,.31);assert.equal(a.sfx.gain.value,.48);assert.equal(a.master.gain.value,.82*.66);
  c.advance(3);a.setSfxEnabled(false);const duck=a.musicDuck.gain.events.length;assert.equal(a.play('strike'),false);assert.equal(a.musicDuck.gain.events.length,duck);
 }finally{await a.destroy();}
});

test('written 64-bar score repeats deterministically with overlapping pad tails at the seam',()=>{
 const a=new GameAudio();a.scene=a.musicScene='battle';a.setIntensity(.85);const sequences=[];
 for(let cycle=0;cycle<2;cycle++){const events=[];a._tone=(at,f,d,v,o)=>events.push(['tone',+at.toFixed(8),f,d,v,o]);a._noise=(at,d,v,o)=>events.push(['noise',+at.toFixed(8),d,v,o]);for(let i=0;i<512;i++)a._musicStep(cycle*512+i,i*60/108/2);sequences.push(events);}
 assert.deepEqual(sequences[0],sequences[1]);assert.equal(AUDIO_CREDITS.seconds,142.22222222222223);
 const seam=[];a._tone=(at,f,d,v,o)=>{if(o.layer==='pad')seam.push({at,f,end:at+d});};a._noise=()=>{};
 a._musicStep(504,140);a._musicStep(512,142.22222222222223);assert.equal(seam.length,6);assert.ok(seam[0].end>seam[3].at);assert.ok(seam[0].end-seam[3].at<.081);
});

test('fresh native PCM evidence belongs to the checked-in exact audio source',()=>{
 const evidence=JSON.parse(read('../qa/audio/evidence/native-2026-11-08.json'));
 assert.equal(createHash('sha256').update(read('../dist/audio.js')).digest('hex'),evidence.sourceSha256);
 assert.equal(evidence.sourceSha256,evidence.expectedSourceSha256);assert.equal(evidence.subjectiveListening,false);
 assert.equal(evidence.offlinePass,true);assert.equal(evidence.offline.length,12);assert.ok(evidence.offline.every(r=>r.pass&&r.metrics.clipped===0&&r.metrics.nonfinite===0&&r.maxVoices<=80&&r.state.peakVoices<=80));
 assert.equal(evidence.live.pass,true);assert.equal(evidence.live.checks.length,15);assert.ok(evidence.live.checks.every(c=>c.pass));assert.deepEqual(evidence.errors,[]);
 // This verifies evidence provenance, not a new browser execution.
});

test('music candidate browser cache and desktop metadata share the package version',()=>{
 const pkg=JSON.parse(read('../package.json')),desktop=JSON.parse(read('../desktop/package.json')),lock=JSON.parse(read('../desktop/package-lock.json'));
 assert.equal(desktop.version,pkg.version);assert.equal(lock.version,pkg.version);assert.equal(lock.packages[''].version,pkg.version);
 assert.ok(read('../dist/service-worker.js').includes(`const VERSION = 'ironroot-v${pkg.version}';`));
 assert.ok(read('../dist/index.html').includes(`Field trials · v${pkg.version}`));
});
