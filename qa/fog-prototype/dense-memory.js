import { FogRenderer, observationHUD, layoutMemoryBadges } from '../../dist/fog-view.js';
import { denseScene, DENSE_LAYOUTS, DENSE_STAGES } from './dense-scenarios.js';
import { PointerGuard } from './controls.js';
const $=id=>document.getElementById(id),renderer=new FogRenderer($('memoryBattle'),$('memoryMinimap')),gesture=new PointerGuard();
let view=denseScene(),stage=1;
for(const[i,title]of DENSE_STAGES.entries()){const option=document.createElement('option');option.value=i;option.textContent=title;$('stage').append(option);}
function camera(x){renderer.camera=x;renderer.clampCamera();gesture.invalidate();}
function update(){view=denseScene($('layout').value,stage);renderer.resetObservation();$('stage').value=stage;$('sceneTag').textContent=`Synthetic · ${DENSE_STAGES[stage]}`;
 const details=observationHUD(view).memoryDetails,contacts=view.state.buildings.filter(b=>b.side===1).map(b=>`Current: ${view.buildings[b.type].name}, level ${b.level}.`);
 $('observation').replaceChildren(...[...contacts,...details,...(!contacts.length&&!details.length?['No current or remembered building at these sites.']:[])].map(text=>{const li=document.createElement('li');li.textContent=text;li.tabIndex=0;return li;}));
}
$('layout').onchange=()=>{update();camera($('layout').value==='edge'?2550:2200);};$('stage').onchange=()=>{stage=Number($('stage').value);update();};
$('center').onclick=()=>camera($('layout').value==='edge'?2550:2200);
$('edge').onclick=()=>camera(DENSE_LAYOUTS[$('layout').value].at(-1)[1]-renderer.width/(2*renderer.scale));
$('away').onclick=()=>camera(600);
$('memoryMinimap').onclick=e=>{const r=$('memoryMinimap').getBoundingClientRect();camera((e.clientX-r.left)/r.width*view.map.width);};
$('memoryBattle').onpointerdown=e=>{if(e.button!==0)return;gesture.down(e.pointerId,e.clientX,e.clientY);$('memoryBattle').setPointerCapture(e.pointerId);};
$('memoryBattle').onpointermove=e=>{const move=gesture.move(e.pointerId,e.clientX,e.clientY);if(move.pan)renderer.pan(move.pan);};
$('memoryBattle').onpointerup=e=>{gesture.up(e.pointerId,e.clientX,e.clientY);if($('memoryBattle').hasPointerCapture(e.pointerId))$('memoryBattle').releasePointerCapture(e.pointerId);};
for(const name of['pointercancel','lostpointercapture'])$('memoryBattle').addEventListener(name,e=>gesture.cancel(e.pointerId));
for(const id of['memoryBattle','memoryMinimap'])$(id).onkeydown=e=>{if(!['ArrowLeft','ArrowRight'].includes(e.key))return;e.preventDefault();renderer.pan(e.key==='ArrowLeft'?100:-100);};
new ResizeObserver(()=>{renderer.resize();gesture.invalidate();}).observe($('memoryBattle'));
update();camera(2200);
function frame(){renderer.draw(view,{paused:true,selected:null,build:null,spell:false,pointer:null},0);const glyphs=layoutMemoryBadges(view,{width:renderer.width,height:renderer.height,scale:renderer.scale,project:(x,y)=>renderer.worldToScreen(x,y),measure:(text,bold)=>{renderer.c.font=`${bold?'bold ':''}11px sans-serif`;return renderer.c.measureText(text).width;}});
 $('metrics').textContent=`Field ${renderer.width} × ${renderer.height}; scale ${renderer.scale.toFixed(4)}; camera ${renderer.camera.toFixed(2)}. ${glyphs.length} on-screen stale markers, ${glyphs.filter(g=>g.badge).length} full badges. ${view.fog.memories.length} frozen detail entries.`;requestAnimationFrame(frame);}
requestAnimationFrame(frame);
