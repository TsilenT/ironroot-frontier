import {GameAudio, SOUND_NAMES, AUDIO_CREDITS} from '../../dist/audio.js';

export function measure(buffer, from=0, to=buffer.duration) {
  let peak=0,sum=0,clipped=0,nonfinite=0,delta=0,dc=0,count=0;
  for(let c=0;c<buffer.numberOfChannels;c++) {
    const data=buffer.getChannelData(c),start=Math.ceil(from*buffer.sampleRate),end=Math.min(data.length,Math.floor(to*buffer.sampleRate));
    for(let i=start;i<end;i++) {const x=data[i];if(!Number.isFinite(x)){nonfinite++;continue;}peak=Math.max(peak,Math.abs(x));sum+=x*x;dc+=x;count++;if(Math.abs(x)>=1)clipped++;if(i>start)delta=Math.max(delta,Math.abs(x-data[i-1]));}
  }
  const round=x=>Number(x.toFixed(8));
  return {peak:round(peak),peakDbFS:round(20*Math.log10(peak||1e-12)),rms:round(Math.sqrt(sum/(count||1))),dc:round(dc/(count||1)),maxAdjacentDelta:round(delta),clipped,nonfinite};
}

// Advance the actual production scheduler in 128ms rendering slices. Sources
// finish naturally and live polyphony caps stay enabled. Only wall-clock timers
// are replaced; no source/envelope/mix implementation is mocked or bypassed.
export async function renderScenario(kind,{sampleRate=48000,exportWav=false}={}) {
  const full=['journey','battle','menu','stress'].includes(kind);
  const musicEnd=AUDIO_CREDITS.seconds+(kind==='battle'?AUDIO_CREDITS.seconds:0);
  const seconds=kind==='cues'?SOUND_NAMES.length*3:full?musicEnd+3:12;
  const context=new OfflineAudioContext(2,Math.ceil(sampleRate*seconds),sampleRate);
  const wrapper=new Proxy(context,{get(target,key){if(key==='state')return 'running';const value=Reflect.get(target,key,target);return typeof value==='function'?value.bind(target):value;}});
  const a=new GameAudio({muted:kind==='muted',volume:kind==='stress'?1:.65,musicVolume:kind==='stress'?1:.7,sfxVolume:kind==='stress'?1:.85,contextFactory:()=>wrapper});
  a._startScheduler=function(){
    if(!this.destroyed&&!this.muted&&this.musicEnabled&&['menu','battle'].includes(this.scene)){
      this.timer='offline-clock';this.nextStepTime=Math.max(this.nextStepTime,context.currentTime+.04);
    }
  };
  a._stopScheduler=function(){this.timer=null;};
  await a.unlock();
  if(!['menu','journey'].includes(kind))a.setScene('battle');
  if(['cues','sfxOnly','bothOff'].includes(kind))a.setMusicEnabled(false);
  if(['musicOnly','bothOff'].includes(kind))a.setSfxEnabled(false);
  if(kind==='zero')a.setVolume(0);
  a.setIntensity(kind==='menu'?.25:1);
  let lastCue=-1,lastStress=-1,stage=0,maxVoices=0,scheduleMs=0,pumps=0;
  const changes=[];
  const tick=()=>{
    const now=context.currentTime,begin=performance.now();
    if(kind==='journey'){
      if(stage===0&&now>=17.1){a.setScene('battle');changes.push({time:now,event:'request battle off-grid'});stage++;}
      a.setIntensity(now<35?.25:now<71?.55:now<106?.85:.95);
    }
    if(kind==='controls'){
      const actions=[[2,()=>a.setMuted(true),'mute'],[4,()=>a.setMuted(false),'unmute'],[6,()=>a.setVolume(0),'zero'],[8,()=>{a.setVolume(.65);a.setScene('paused');},'pause'],[10,()=>a.setScene('battle'),'resume']];
      if(stage<actions.length&&now>=actions[stage][0]){actions[stage][1]();changes.push({time:now,event:actions[stage][2]});stage++;}
    }
    if(kind==='cues'){
      const n=Math.floor(now/3);if(n!==lastCue&&n<SOUND_NAMES.length){lastCue=n;a.play(SOUND_NAMES[n],{pan:n%2?-.3:.3});}
    }else if(['stress','controls','sfxOnly','musicOnly','bothOff','muted','zero'].includes(kind)){
      const n=Math.floor(now*8);if(n!==lastStress){lastStress=n;
        const names=kind==='stress'?SOUND_NAMES:kind==='controls'&&a.scene==='paused'?[]:['sword','siege','magic'];
        for(const name of names)a.play(name,{pan:n%2?-.4:.4});
      }
    }
    if(context.currentTime<musicEnd||!full)a._schedule();
    if(full&&context.currentTime>=musicEnd&&stage!==999){a.setScene('paused');stage=999;}
    scheduleMs+=performance.now()-begin;pumps++;maxVoices=Math.max(maxVoices,a.voices.size);
  };
  tick();
  const started=performance.now();let at=.128,pause=context.suspend(at);
  const rendering=context.startRendering();
  while(at<seconds-.128){await pause;tick();at+=.128;pause=at<seconds-.128?context.suspend(at):null;await context.resume();if(!pause)break;}
  const buffer=await rendering;
  const metrics=measure(buffer);
  const result={kind,sampleRate,seconds:buffer.duration,metrics,maxVoices,state:a.getState(),renderMs:Math.round(performance.now()-started),schedulerMs:Number(scheduleMs.toFixed(3)),pumps,changes};
  if(full){result.sections=Array.from({length:4},(_,i)=>measure(buffer,i*128*60/108/2,(i+1)*128*60/108/2));result.tail=measure(buffer,seconds-1);}
  if(kind==='battle')result.loopWindow=measure(buffer,AUDIO_CREDITS.seconds-.5,AUDIO_CREDITS.seconds+.5);
  if(kind==='controls')result.silenceWindows=[measure(buffer,2.8,3.8),measure(buffer,6.8,7.8),measure(buffer,8.8,9.8)];
  if(kind==='cues')result.cues=SOUND_NAMES.map((name,i)=>({name,...measure(buffer,i*3,(i+1)*3)}));
  if(exportWav){
    const wav=new ArrayBuffer(44+buffer.length*4),view=new DataView(wav),ascii=(offset,s)=>[...s].forEach((x,i)=>view.setUint8(offset+i,x.charCodeAt(0)));
    ascii(0,'RIFF');view.setUint32(4,wav.byteLength-8,true);ascii(8,'WAVEfmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,2,true);view.setUint32(24,sampleRate,true);view.setUint32(28,sampleRate*4,true);view.setUint16(32,4,true);view.setUint16(34,16,true);ascii(36,'data');view.setUint32(40,buffer.length*4,true);
    for(let i=0;i<buffer.length;i++)for(let c=0;c<2;c++)view.setInt16(44+i*4+c*2,Math.round(Math.max(-1,Math.min(1,buffer.getChannelData(c)[i]))*32767),true);
    const link=document.createElement('a');link.href=URL.createObjectURL(new Blob([wav],{type:'audio/wav'}));link.download='ironroot-'+kind+'.wav';link.click();setTimeout(()=>URL.revokeObjectURL(link.href),1000);
  }
  await a.destroy();return result;
}
