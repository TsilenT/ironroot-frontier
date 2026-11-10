/** Pointer-only manual QA shell. Ordinary renderer and commands; no persistence. */
import {Renderer} from '../../dist/render.js';
import {nativePresentation,buildingPresentation} from './native-presentation.mjs';
import {NATIVE_SEEDS,createNativeSession,nativeEnded,nativeControlsDisabled,setNativePaused,restartNative,advanceNative,paidNative} from './native-state.mjs';
const $=id=>document.getElementById(id),renderer=new Renderer($('field'),$('mini'));
const requested=new URLSearchParams(location.search).get('seed'),seed=requested===null?NATIVE_SEEDS[0]:Number(requested);
let session;try{session=createNativeSession({seed});}catch(e){$('feedback').textContent=e.message+'. Use the fixed known seed 9305.';$('pause').disabled=true;$('restart').disabled=true;throw e;}
let fault=null;let ui={paused:true,build:null,spell:false,selected:null,pointer:null,targets:[]},last=performance.now(),ownedKey='';
for(const value of NATIVE_SEEDS){const option=document.createElement('option');option.value=value;option.textContent=value;$('seed').append(option);}$('seed').value=session.seed;
function clear(message=false){if(message)$('feedback').textContent=message;ui.build=null;ui.spell=false;for(const button of $('builds').children)button.setAttribute('aria-pressed','false');}
function say(result){$('feedback').textContent=result.ok?(result.refund!==undefined?'Salvaged for '+result.refund+' gold.':'Ordinary paid command accepted.'):result.reason;}
function command(method,args){const result=paidNative(session,method,args);say(result);return result;}
for(const [type,d] of Object.entries(session.game.buildings)){
 const button=document.createElement('button');button.textContent=d.name+' · '+d.cost;button.setAttribute('aria-pressed','false');
 button.onclick=()=>{if(nativeControlsDisabled(session)||fault)return;clear();ui.build=type;button.setAttribute('aria-pressed','true');$('feedback').textContent='Click a marked site in your territory.';};$('builds').append(button);
}
$('pause').onclick=()=>{setNativePaused(session,!session.paused);last=performance.now();clear(session.paused?'Paused. Selection canceled.':'Running. Selection canceled.');};
$('purchasePause').onclick=()=>$('pause').onclick();
$('restart').onclick=()=>{restartNative(session,{seed:Number($('seed').value)});fault=null;clear();ui.selected=null;ownedKey='';last=performance.now();$('feedback').textContent='Fresh exact authored setup; paused. No progress earned.';};
$('cancel').onclick=()=>clear('Selection canceled.');
$('owned').onchange=()=>{ui.selected=Number($('owned').value);};
$('upgrade').onclick=()=>command('upgrade',[Number($('owned').value)]);
$('sell').onclick=()=>command('sell',[Number($('owned').value)]);
$('arrows').onclick=()=>command('citadel',['arrows']);
$('regen').onclick=()=>command('citadel',['regen']);
$('volley').onclick=()=>{if(nativeControlsDisabled(session)||fault)return;clear();ui.spell=true;$('feedback').textContent='Click the ordinary volley target.';};
$('camera').oninput=()=>{renderer.camera=Number($('camera').value);};
$('mini').onclick=e=>{const r=$('mini').getBoundingClientRect();renderer.camera=(e.clientX-r.left)/r.width*session.game.map.width;$('camera').value=renderer.camera;};
const point=e=>{const r=$('field').getBoundingClientRect();return renderer.screenToWorld(e.clientX-r.left,e.clientY-r.top);};
$('field').onpointermove=e=>{ui.pointer=point(e);};$('field').onpointerleave=()=>{ui.pointer=null;};
$('field').onclick=e=>{
 const p=point(e),g=session.game;
 if(ui.spell){if(command('cast',[p.x,p.y]).ok)clear();return;}
 if(ui.build){const site=renderer.snap(p);if(command('build',[ui.build,site.x,site.y]).ok)clear();return;}
 const b=g.state.buildings.find(b=>b.side===0&&b.hp>0&&Math.hypot(b.x-p.x,b.y-p.y)<55);if(b){ui.selected=b.id;$('owned').value=b.id;}
};
window.addEventListener('resize',()=>renderer.resize());
document.addEventListener('visibilitychange',()=>{if(document.hidden){setNativePaused(session,true);last=performance.now();clear('Paused while hidden. Selection canceled.');}});
function refresh(dt){
 const g=session.game,s=g.state,ended=nativeEnded(session),own=s.buildings.filter(b=>b.side===0&&b.hp>0),key=own.map(b=>b.id+':'+b.level).join(',');
 if(key!==ownedKey){ownedKey=key;const prior=$('owned').value;$('owned').replaceChildren(...own.map(b=>{const option=document.createElement('option');option.value=b.id;option.textContent=g.buildings[b.type].name+' '+['north','middle','south'][b.lane]+' x'+b.x+' L'+b.level;return option;}));if(own.some(b=>String(b.id)===prior))$('owned').value=prior;}
 const selected=own.find(b=>b.id===Number($('owned').value));ui.selected=selected?.id??null;
 $('inspect').textContent=buildingPresentation(g,selected);
 const disabled=nativeControlsDisabled(session)||!!fault;
 for(const button of [...$('builds').children,...['upgrade','sell','arrows','regen','volley'].map($)])button.disabled=disabled;
 $('pause').disabled=ended||!!fault;$('pause').textContent=ended?'Ended':session.paused?'Start / Resume':'Pause';
 $('purchasePause').disabled=$('pause').disabled;$('purchasePause').textContent=$('pause').textContent;
 if(disabled)clear();ui.paused=disabled;
 const view=nativePresentation(session);
 $('status').textContent=view.status;$('purchaseStatus').textContent=view.status;
 $('goal').textContent=view.goal;
 $('roads').textContent=view.roads;
 renderer.draw(g,ui,dt);
}
function frame(now){
 const dt=Math.min(.25,Math.max(0,(now-last)/1000));last=now;
 try{if(!fault)advanceNative(session,dt);}catch(e){fault=e.message;setNativePaused(session,true);$('feedback').textContent='QA paused after an error: '+e.message;}
 refresh(dt);requestAnimationFrame(frame);
}
refresh(0);requestAnimationFrame(frame);
