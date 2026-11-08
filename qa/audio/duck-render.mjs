import {GameAudio} from '../../dist/audio.js';
import {measure} from './render.mjs';

// Diagnostic-only taps capture pre/post music duck on extra offline channels.
// Original stereo output remains channels 0/1; synthesis and voice caps are intact.
export async function renderDuck(){
 const sampleRate=48000,seconds=32,c=new OfflineAudioContext(4,sampleRate*seconds,sampleRate);
 const wrapper=new Proxy(c,{get(t,k){if(k==='state')return 'running';const v=Reflect.get(t,k,t);return typeof v==='function'?v.bind(t):v;}});
 const a=new GameAudio({muted:false,contextFactory:()=>wrapper});
 a._startScheduler=function(){if(!this.destroyed&&!this.muted&&this.musicEnabled&&['menu','battle'].includes(this.scene)){this.timer='offline-clock';this.nextStepTime=Math.max(this.nextStepTime,c.currentTime+.04);}};
 a._stopScheduler=function(){this.timer=null;};await a.unlock();a.setScene('battle');a.setIntensity(.7);
 const merger=c.createChannelMerger(4),out=c.createChannelSplitter(2),pre=c.createChannelSplitter(2),post=c.createChannelSplitter(2);
 a.limiter.disconnect();a.limiter.connect(out);out.connect(merger,0,0);out.connect(merger,1,1);a.music.connect(pre);pre.connect(merger,0,2);a.musicDuck.connect(post);post.connect(merger,0,3);merger.connect(c.destination);
 const plan=[[4,'warning',.85],[9,'strike',.85],[14,'start',.85],[19,'victory',2.7],[26,'defeat',1.8]],cues=[];let index=0,maxVoices=0;
 const pump=()=>{const now=c.currentTime;if(index<plan.length&&now>=plan[index][0]){const [,name,hold]=plan[index++],master=a.master.gain.value,sfx=a.sfx.gain.value;const accepted=a.play(name);cues.push({name,hold,at:now,accepted,masterBefore:master,masterAfter:a.master.gain.value,sfxBefore:sfx,sfxAfter:a.sfx.gain.value});}a._schedule();maxVoices=Math.max(maxVoices,a.voices.size);};
 pump();let at=.128,pause=c.suspend(at);const rendering=c.startRendering();while(at<seconds-.128){await pause;pump();at+=.128;pause=at<seconds-.128?c.suspend(at):null;await c.resume();if(!pause)break;}const buffer=await rendering;
 const rms=(channel,from,to)=>{const d=buffer.getChannelData(channel);let sum=0,count=0;for(let i=Math.ceil(from*sampleRate);i<Math.floor(to*sampleRate);i++){sum+=d[i]*d[i];count++;}return Math.sqrt(sum/count);};
 for(const cue of cues){const pre=rms(2,cue.at+.15,cue.at+.65),post=rms(3,cue.at+.15,cue.at+.65),recoverPre=rms(2,cue.at+cue.hold+.45,cue.at+cue.hold+.8),recoverPost=rms(3,cue.at+cue.hold+.45,cue.at+cue.hold+.8);cue.heldRatio=post/pre;cue.recoveredRatio=recoverPost/recoverPre;cue.pass=cue.accepted&&Math.abs(cue.heldRatio-.52)<.00001&&Math.abs(cue.recoveredRatio-1)<.00001&&cue.masterBefore===cue.masterAfter&&cue.sfxBefore===cue.sfxAfter;}
 const stereo={duration:buffer.duration,sampleRate,length:buffer.length,numberOfChannels:2,getChannelData:n=>buffer.getChannelData(n)};
 const result={kind:'priorityDuck',seconds,sampleRate,metrics:measure(stereo),maxVoices,state:a.getState(),cues,diagnosticTaps:'channels 2/3 capture mono pre/post-duck, output metrics use original stereo 0/1',pass:cues.every(x=>x.pass)};await a.destroy();return result;
}
