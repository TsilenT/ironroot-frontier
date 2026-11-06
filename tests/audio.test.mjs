import test from 'node:test';
import assert from 'node:assert/strict';
import {GameAudio, SOUND_NAMES, AUDIO_CREDITS} from '../dist/audio.js';

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
  const {a,c}=await setup({musicEnabled:false});try{
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
test('full 16-bar score cycles with valid envelopes and adaptive layers',async()=>{
  const {a,c}=await setup();try{a._stopScheduler();a.setScene('battle');a._stopScheduler();for(let i=0;i<256;i++){c.advance(60/AUDIO_CREDITS.bpm/2);a.setIntensity((i%32)/31);a._musicStep(i,c.currentTime+.01);assert.ok(a.voices.size<=80);}assert.ok(a.stats.musicNotes>600);c.advance(5);assert.equal(a.voices.size,0);}finally{await a.destroy();}
});
test('destroy closes context and makes repeated cleanup and unlock safe',async()=>{
  const {a,c}=await setup();a.play('strike');await a.destroy();assert.equal(c.state,'closed');assert.equal(a.voices.size,0);assert.equal(a.timer,null);assert.equal(a.play('click'),false);assert.equal(await a.unlock(),false);a.setMuted(false);a.setScene('battle');await a.destroy();assert.equal(a.timer,null);
});

test('important rally and result cues are not lost in crowded combat',async()=>{
  const {a,c}=await setup({musicEnabled:false});try{for(const name of ['strike','victory','defeat','warning','start']){c.advance(4);for(let i=0;i<24;i++)a._tone(c.currentTime,220,1,.1);assert.equal(a._voiceCount('sfx'),24);assert.equal(a.play(name),true,name);assert.ok(a._voiceCount('sfx')<24);}}finally{await a.destroy();}
});
