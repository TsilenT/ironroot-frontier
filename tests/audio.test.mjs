import test from 'node:test';
import assert from 'node:assert/strict';
import {GameAudio, SOUND_NAMES, AUDIO_CREDITS, AUDIO_SECTIONS} from '../dist/audio.js';

// These graph doubles test our Web Audio API usage without browser dependencies.
class Param {
  constructor(value=0){this.value=value;this.events=[];}
  _event(type,value,time){assert.ok(Number.isFinite(value));assert.ok(Number.isFinite(time));this.events.push([type,value,time]);this.value=value;}
  setValueAtTime(value,time){this._event('set',value,time);}
  linearRampToValueAtTime(value,time){this._event('linear',value,time);}
  exponentialRampToValueAtTime(value,time){assert.ok(value>0);this._event('exponential',value,time);}
  cancelScheduledValues(time){assert.ok(Number.isFinite(time));}
}
class Node {
  constructor(context){this.context=context;this.gain=new Param(1);this.frequency=new Param(440);this.Q=new Param(1);this.pan=new Param(0);this.delayTime=new Param(0);this.connections=[];}
  connect(node){this.connections.push(node);return node;}
  disconnect(){this.connections=[];}
  start(at){assert.ok(Number.isFinite(at));this.started=at;}
  stop(at){assert.ok(Number.isFinite(at));this.stopped=at;}
}
class Context {
  constructor(state='suspended'){this.state=state;this.currentTime=0;this.sampleRate=24000;this.nodes=[];this.destination=new Node(this);}
  node(){const node=new Node(this);this.nodes.push(node);return node;}
  createGain(){return this.node();}
  createOscillator(){return this.node();}
  createStereoPanner(){return this.node();}
  createBiquadFilter(){return this.node();}
  createBufferSource(){return this.node();}
  createDelay(){return this.node();}
  createDynamicsCompressor(){const node=this.node();for(const p of ['threshold','knee','ratio','attack','release'])node[p]=new Param();return node;}
  createBuffer(channels,length){const data=Array.from({length:channels},()=>new Float32Array(length));return {getChannelData:i=>data[i]};}
  async resume(){this.state='running';}
  async close(){this.state='closed';}
  advance(seconds){this.currentTime+=seconds;for(const node of this.nodes)if(node.stopped<=this.currentTime&&!node.ended){node.ended=true;node.onended?.();}}
}
const setup=async options=>{const c=new Context();const a=new GameAudio({muted:false,contextFactory:()=>c,...options});assert.equal(await a.unlock(),true);return {a,c};};

test('audio is lazy, muted by default, and unavailable Web Audio is harmless',async()=>{
  let calls=0;const a=new GameAudio({contextFactory:()=>{calls++;throw Error('unsupported');}});
  assert.equal(calls,0);assert.equal(a.getState().muted,true);assert.equal(a.play('click'),false);
  assert.equal(await a.unlock(),false);assert.equal(calls,1);assert.equal(a.getState().available,false);await a.destroy();
});
test('successful gesture unlock starts one music scheduler',async()=>{
  const {a,c}=await setup();try{const timer=a.timer;assert.ok(timer);assert.equal(c.state,'running');assert.ok(a.stats.musicNotes>0);await a.unlock();assert.equal(a.timer,timer);}finally{await a.destroy();}
});
test('repeating the same scene does not restart the track or timer',async()=>{
  const {a}=await setup();try{a.setScene('battle');const timer=a.timer,step=a.step,time=a.nextStepTime;for(let i=0;i<60;i++)a.setScene('battle');assert.equal(a.timer,timer);assert.equal(a.step,step);assert.equal(a.nextStepTime,time);a.setScene('unsupported');assert.equal(a.scene,'battle');}finally{await a.destroy();}
});
test('master mute, independent music/SFX toggles, and clamped volume work',async()=>{
  const {a,c}=await setup();try{
    a.setMusicEnabled(false);assert.equal(a.timer,null);assert.equal(a.music.gain.value,0);assert.equal(a.play('click'),true);
    a.setSfxEnabled(false);assert.equal(a.play('sword'),false);assert.equal(a.sfx.gain.value,0);a.setMusicEnabled(true);assert.ok(a.timer);
    a.setMuted(true);assert.equal(a.master.gain.value,0);assert.equal(a.timer,null);assert.equal(a.play('build'),false);
    c.advance(1);a.setMuted(false);a.setSfxEnabled(true);assert.equal(a.play('build'),true);assert.ok(a.timer);
    a.setVolume(5);assert.equal(a.volume,1);a.setVolume(-2);assert.equal(a.volume,0);a.setVolume(NaN);assert.equal(a.volume,0);
    a.setMusicVolume(.31);a.setSfxVolume(.48);a.setIntensity(4);assert.equal(a.musicVolume,.31);assert.equal(a.sfxVolume,.48);assert.equal(a.intensity,1);
  }finally{await a.destroy();}
});
test('all sound cues and legacy aliases create valid bounded graphs',async()=>{
  const {a,c}=await setup({musicEnabled:false});try{a.setScene('battle');
    for(const name of [...SOUND_NAMES,'hit','warrior','archer','tower','wizard','blast','volley','death','win','lose','construction','select']){
      c.advance(4);assert.equal(a.play(name,{pan:4,volume:4}),true,name);assert.ok(a.voices.size>0);assert.ok(a.voices.size<=80);
    }
    c.advance(4);assert.equal(a.voices.size,0);assert.equal(a.play('not-a-sound'),false);
  }finally{await a.destroy();}
});
test('SFX burst limiting prevents combat clipping storms',async()=>{
  const {a,c}=await setup({musicEnabled:false});try{assert.equal(a.play('sword'),true);for(let i=0;i<200;i++)assert.equal(a.play('sword'),false);assert.equal(a.stats.droppedEffects,200);assert.ok(a.voices.size<=4);c.advance(.2);assert.equal(a.play('sword'),true);}finally{await a.destroy();}
});
test('pause and result scenes stop music; resume creates one scheduler',async()=>{
  const {a}=await setup();try{for(const scene of ['paused','victory','defeat']){a.setScene(scene);assert.equal(a.timer,null);assert.equal(a.music.gain.value,0);}a.setScene('battle');assert.ok(a.timer);}finally{await a.destroy();}
});
test('scheduler skips background backlog rather than flooding voices',async()=>{
  const {a,c}=await setup();try{c.advance(60);const before=a.stats.musicNotes;a._schedule();assert.ok(a.stats.musicNotes-before<20);assert.ok(a.nextStepTime>60);assert.ok(a.voices.size<=80);}finally{await a.destroy();}
});
test('two full 64-bar cycles retain bounded voices and written development',async()=>{
  const {a,c}=await setup();try{
    assert.equal(AUDIO_CREDITS.bars,64);assert.ok(AUDIO_CREDITS.seconds>142&&AUDIO_CREDITS.seconds<143);assert.equal(AUDIO_SECTIONS.length,4);
    a.setScene('paused');a.setScene('battle');a._stopScheduler();
    for(let i=0;i<1024;i++){c.advance(60/AUDIO_CREDITS.bpm/2);a.setIntensity((i%32)/31);a._musicStep(i,c.currentTime+.01);assert.ok(a.voices.size<=80);}
    assert.ok(a.stats.musicNotes>2500);c.advance(5);assert.equal(a.voices.size,0);
    const phrases=[];a._tone=(at,f,d,v,o)=>phrases.at(-1).push([f,d,v,o.layer]);a._noise=()=>{};
    for(let section=0;section<4;section++){phrases.push([]);for(let beat=0;beat<128;beat++)a._musicStep(section*128+beat,c.currentTime+beat);}
    assert.notDeepEqual(phrases[0],phrases[1]);assert.notDeepEqual(phrases[1],phrases[2]);assert.notDeepEqual(phrases[2],phrases[3]);
  }finally{await a.destroy();}
});
test('destroy closes context and makes repeated cleanup and unlock safe',async()=>{
  const {a,c}=await setup();a.play('strike');await a.destroy();assert.equal(c.state,'closed');assert.equal(a.voices.size,0);assert.equal(a.timer,null);assert.equal(a.play('click'),false);assert.equal(await a.unlock(),false);a.setMuted(false);a.setScene('battle');await a.destroy();assert.equal(a.timer,null);
});

test('important rally and result cues are not lost in crowded combat',async()=>{
  const {a,c}=await setup({musicEnabled:false});try{for(const name of ['strike','victory','defeat','warning','start']){c.advance(4);for(let i=0;i<24;i++)a._tone(c.currentTime,220,1,.1);assert.equal(a._voiceCount('sfx'),24);assert.equal(a.play(name),true,name);assert.ok(a._voiceCount('sfx')<24);}}finally{await a.destroy();}
});

test('menu-to-battle waits for the downbeat without restarting transport',async()=>{
  const {a,c}=await setup();try{
    const timer=a.timer,step=a.step,voices=a.voices.size;
    a.setScene('battle');assert.equal(a.timer,timer);assert.equal(a.step,step);assert.equal(a.voices.size,voices);assert.equal(a.pendingScene,'battle');assert.equal(a.musicScene,'menu');
    a._musicStep(7,.3);assert.equal(a.musicScene,'menu');a._musicStep(8,.6);assert.equal(a.musicScene,'battle');assert.equal(a.pendingScene,null);assert.equal(a.stats.transitions,1);
    a.setScene('menu');a.setScene('battle');assert.equal(a.pendingScene,null);
    a.step=141;a.setScene('paused');assert.equal(a.step,144);c.advance(2);a.setScene('battle');assert.ok(a.step>=144);assert.equal(a.musicScene,'battle');
  }finally{await a.destroy();}
});

test('energy hysteresis and stable frame updates avoid automation churn',async()=>{
  const {a}=await setup();try{
    a.setIntensity(.39);assert.equal(a.energy,'calm');a.setIntensity(.41);assert.equal(a.energy,'engaged');a.setIntensity(.35);assert.equal(a.energy,'engaged');
    a.setIntensity(.8);assert.equal(a.energy,'critical');a.setIntensity(.68);assert.equal(a.energy,'critical');a.setIntensity(.59);assert.equal(a.energy,'engaged');a.setIntensity(.27);assert.equal(a.energy,'calm');
    const count=a.layers.drums.gain.events.length;for(let i=0;i<1000;i++)a.setIntensity(.27+i%2*.005);assert.equal(a.layers.drums.gain.events.length,count);
  }finally{await a.destroy();}
});

test('priority cues duck only music, preserving the user gain and SFX bus',async()=>{
  const {a,c}=await setup();try{
    const master=a.master.gain.value,sfx=a.sfx.gain.value;
    assert.equal(a.play('warning'),true);assert.equal(a.master.gain.value,master);assert.equal(a.sfx.gain.value,sfx);
    assert.ok(a.musicDuck.gain.events.some(([type,value])=>type==='linear'&&value===.52));assert.equal(a.musicDuck.gain.value,1);
    c.advance(3);a.setMuted(true);assert.equal(a.play('warning'),false);
  }finally{await a.destroy();}
});

test('Engine synthesis stays lazy and scene-bound with independent music/SFX controls',async()=>{
 let allocated=0;const c=new Context(),a=new GameAudio({muted:false,musicEnabled:false,contextFactory:()=>{allocated++;return c;}});
 assert.equal(a.play('engineReveal'),false);assert.equal(allocated,0);await a.unlock();try{
  assert.equal(a.play('engineReveal'),false,'menu cannot pre-announce');a.setScene('battle');assert.equal(a.play('engineReveal'),true);assert.equal(a._voiceCount('sfx'),5);assert.equal(a.timer,null,'SFX does not enable music');assert.equal(a.play('engineReveal'),false,'full reveal is rate limited');
  c.advance(10);a.setSfxEnabled(false);assert.equal(a.play('engineReveal'),false);a.setSfxEnabled(true);a.setMuted(true);assert.equal(a.play('engineReveal'),false);a.setMuted(false);a.setVolume(0);assert.equal(a.play('engineReveal'),false);a.setVolume(.4);a.setSfxVolume(0);assert.equal(a.play('engineReveal'),false);a.setSfxVolume(.3);assert.equal(a.play('engineReveal'),true);
 }finally{await a.destroy();}assert.equal(a.voices.size,0);assert.equal(a.lastPlayed.size,0);
});
test('important reveal reserves five bounded voices in crowded combat; impacts are capped and clean up',async()=>{
 const {a,c}=await setup({musicEnabled:false});try{a.setScene('battle');for(let i=0;i<24;i++)a._tone(0,200,2,.1);assert.equal(a.play('engineReveal'),true);assert.equal(a._voiceCount('sfx'),5);assert.ok(a.voices.size<=80);
  c.advance(2);assert.equal(a.voices.size,0);assert.equal(a.play('engineImpact'),true);assert.equal(a._voiceCount('sfx'),3);assert.equal(a.play('engineImpact'),false);c.advance(.6);assert.equal(a.play('engineImpact'),true);a.setScene('paused');assert.equal(a.voices.size,0,'pause cancels even future scheduled Engine layers');assert.equal(a.play('engineImpact'),false);a.setScene('battle');c.advance(2);assert.equal(a.voices.size,0,'resume queues no replacement voices');
 }finally{await a.destroy();}
});
for(const interrupt of ['suspension','master-zero','sfx-zero','hidden-scene'])test(`Engine voices are discarded on ${interrupt}, without a resumed backlog`,async()=>{
 const {a,c}=await setup({musicEnabled:false});try{a.setScene('battle');assert.equal(a.play('engineReveal'),true);
  if(interrupt==='suspension'){c.state='suspended';a.setScene('battle');assert.equal(a.play('engineImpact'),false);c.state='running';}
  else if(interrupt==='master-zero'){a.setVolume(0);a.setVolume(.5);}
  else if(interrupt==='sfx-zero'){a.setSfxVolume(0);a.setSfxVolume(.5);}
  else{a.setScene('paused');a.setScene('battle');}
  assert.equal(a.voices.size,0);c.advance(1);assert.equal(a.voices.size,0);assert.equal(a.play('engineReveal'),false,'discarded deployment is not replayed');
 }finally{await a.destroy();}
});
test('gesture resume drops suspended Engine tails even before the next scene observer frame',async()=>{
 const {a,c}=await setup({musicEnabled:false});try{a.setScene('battle');assert.equal(a.play('engineReveal'),true);assert.equal(a.voices.size,5);c.state='suspended';assert.equal(await a.unlock(),true);assert.equal(a.voices.size,0,'old delayed layers cannot play after gesture resume');c.advance(2);assert.equal(a.voices.size,0);assert.equal(a.play('engineReveal'),false,'unlock does not replay the consumed deployment');}finally{await a.destroy();}
});
