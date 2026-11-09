/** Manual QA shell only. No profile, network, storage or campaign integration. */
import {Renderer} from '../../dist/render.js';
import {createReserve,MinorReserveGame,DESIGN,evaluateReserve,reserveStatus} from './scenario.mjs';
const $=id=>document.getElementById(id),renderer=new Renderer($('field'),$('mini'));
let game=createReserve(),ui={paused:true,build:null,selected:null,pointer:null},last=performance.now(),ownedKey='';
$('brief').textContent=DESIGN.briefing;
const say=result=>{$('feedback').textContent=result.ok?'Paid command accepted.':result.reason;};
function clear(){ui.build=null;ui.spell=false;for(const b of $('builds').children)b.setAttribute('aria-pressed','false');}
function pause(value){ui.paused=value;$('pause').textContent=value?'Resume':'Pause';}
function ownId(){return Number($('owned').value);}
for(const [type,d] of Object.entries(game.buildings)){
 const button=document.createElement('button');button.textContent=d.name+' ·'+d.cost;button.setAttribute('aria-pressed','false');
 button.onclick=()=>{clear();ui.build=type;button.setAttribute('aria-pressed','true');$('feedback').textContent='Click a legal site in your territory.';};$('builds').append(button);
}
$('pause').onclick=()=>pause(!ui.paused);
$('restart').onclick=()=>{game=createReserve({reserveEnabled:$('enabled').checked});clear();pause(true);ownedKey='';$('feedback').textContent='Fresh authored setup; no progress earned.';};
$('cancel').onclick=clear;
$('upgrade').onclick=()=>say(game.upgrade(ownId()));
$('sell').onclick=()=>say(game.sell(ownId()));
$('arrows').onclick=()=>say(game.buyCitadelOption('arrows'));
$('regen').onclick=()=>say(game.buyCitadelOption('regen'));
$('owned').onchange=()=>{ui.selected=ownId();};
$('volley').onclick=()=>{clear();ui.spell=true;$('feedback').textContent='Click the volley target.';};
$('camera').oninput=()=>{renderer.camera=Number($('camera').value);};
$('mini').onclick=e=>{const r=$('mini').getBoundingClientRect();renderer.camera=(e.clientX-r.left)/r.width*game.map.width;$('camera').value=renderer.camera;};
const point=e=>{const r=$('field').getBoundingClientRect();return renderer.screenToWorld(e.clientX-r.left,e.clientY-r.top);};
$('field').onpointermove=e=>{ui.pointer=point(e);};
$('field').onpointerleave=()=>{ui.pointer=null;};
$('field').onclick=e=>{
 const p=point(e);if(ui.spell){const r=game.cast(p.x,p.y);say(r);if(r.ok)clear();return;}
 if(ui.build){const site=renderer.snap(p),r=game.build(ui.build,site.x,site.y);say(r);if(r.ok)clear();return;}
 const b=game.state.buildings.find(b=>b.side===0&&Math.hypot(b.x-p.x,b.y-p.y)<55);if(b){ui.selected=b.id;$('owned').value=b.id;}
};
$('save').onclick=()=>{pause(true);$('snapshot').value=JSON.stringify(game.serialize());$('feedback').textContent='QA save written to text.';};
$('restore').onclick=()=>{try{const restored=MinorReserveGame.restore($('snapshot').value);game=restored;pause(true);clear();ownedKey='';$('enabled').checked=game.reserve.enabled;$('feedback').textContent='QA save restored, paused.';}catch(e){$('feedback').textContent=e.message;}};
window.addEventListener('resize',()=>renderer.resize());
function frame(now){
 const dt=Math.min(.25,(now-last)/1000);last=now;if(!ui.paused)game.update(dt);
 const own=game.state.buildings.filter(b=>b.side===0),key=own.map(b=>b.id+':'+b.level).join(',');
 if(key!==ownedKey){ownedKey=key;const prior=$('owned').value;$('owned').replaceChildren(...own.map(b=>{const o=document.createElement('option');o.value=b.id;o.textContent=game.buildings[b.type].name+' '+['north','middle','south'][b.lane]+' x'+b.x+' L'+b.level;return o;}));if(own.some(b=>String(b.id)===prior))$('owned').value=prior;}
 const r=reserveStatus(game),outcome=evaluateReserve(game),s=game.state,ended=outcome.completed||outcome.failed;
 if(ended){ui.paused=true;clear();$('pause').textContent='Ended';}
 $('pause').disabled=ended;$('owned').disabled=ended;
 for(const button of [...$('builds').children,...['upgrade','sell','arrows','regen','volley'].map($)])button.disabled=ended;
 const message=r.phase==='armed'?'Original North Command Post standing.':r.phase==='warning'?'Reserve warned: '+r.warningSeconds.toFixed(1)+'s.':r.phase==='arriving'?'Reserve arriving: '+r.remaining+' waiting for cap space.':r.phase==='complete'?'One contingent released. No further reserves.':'Baseline control: reserve disabled.';
 $('status').textContent=Math.floor(s.time/60)+':'+String(Math.floor(s.time%60)).padStart(2,'0')+' · Gold '+Math.floor(s.gold[0])+' · Citadels '+Math.ceil(s.bases[0].hp)+' / '+Math.ceil(s.bases[1].hp)+' · '+(outcome.completed?'Won.':outcome.failed?'Ended: '+outcome.reason+'.':message);
 ui.targets=r.phase==='armed'?[game.reserve.postId]:[];renderer.draw(game,ui,dt);requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
