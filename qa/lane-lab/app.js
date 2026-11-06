import {Game, LAB_MAPS, AIR_ROUTE, BUILDINGS, UNITS, SPELL, buildSites, worldX, upgradeCost} from './engine.js';
import {PILOTS, createPilot} from './campaign.js';

const $=id=>document.getElementById(id), canvas=$('field'), context=canvas.getContext('2d');
const own='#8cddca', enemy='#f49c82', gold='#edd18b', muted='#a6bab0';
const types=Object.keys(BUILDINGS), unitLabels={warrior:'W',archer:'A',siege:'S',wizard:'M',gryphon:'G'};
let game, paused=true, speed=1, chosen='barracks', selected=null, aiming=false, demo=false;
let activePilot=null,pilotResult=null;
let previousPhases=new Map(), totals, elapsed=0, lastFrame=performance.now(), lastUI=0, worldScale=.4;
const format=n=>Math.floor(n).toLocaleString('en-US');
const roadName=lane=>game.map.lanes.length===1?'Only road':game.map.lanes.length===2?['North','South'][lane]:['North','Middle','South'][lane];
const timeText=n=>`${Math.floor(n/60)}:${String(Math.floor(n%60)).padStart(2,'0')}`;
function message(text,error=false){$('message').textContent=text;$('message').classList.toggle('error',error);}
for(const map of Object.values(LAB_MAPS)){const option=document.createElement('option');option.value=map.id;option.textContent=map.name;$('map').append(option);}
for(const pilot of PILOTS){const option=document.createElement('option');option.value=pilot.id;option.textContent=pilot.name;$('scenario').append(option);}
for(const [index,type] of types.entries()){
  const data=BUILDINGS[type],button=document.createElement('button');button.type='button';button.dataset.building=type;
  const name=document.createElement('b');name.textContent=data.name;button.append(name);
  const cost=document.createElement('small');cost.textContent=`${data.cost} gold · ${data.unit?UNITS[data.unit].name:'support'}`;button.append(cost);
  const shortcut=document.createElement('span');shortcut.className='key';shortcut.textContent=index+1;button.append(shortcut);
  button.title=data.description;button.onclick=()=>choose(type);$('buildings').append(button);
}
function choose(type){chosen=type;aiming=false;selected=null;for(const button of $('buildings').children)button.setAttribute('aria-pressed',String(button.dataset.building===type));message(`${BUILDINGS[type].name}: choose an outlined site on your frontier.`);updateUI();}
function reset(routeDemo=false,initial=false){
  const seed=Number($('seed').value);if(!Number.isInteger(seed)||seed<0||seed>4294967295){message('Choose a whole-number seed from 0 to 4,294,967,295.',true);$('seed').focus();return;}
  let mapId=$('map').value;
  if(routeDemo&&!LAB_MAPS[mapId].airRoutes){mapId='three-roads-crosswind';$('map').value=mapId;}
  activePilot=!routeDemo&&$('scenario').value!=='standard'?createPilot($('scenario').value,{seed}):null;
  if(activePilot){mapId=activePilot.pilot.mapId;$('map').value=mapId;}
  if(routeDemo){$('scenario').value='standard';$('map').disabled=false;$('difficulty').disabled=false;}
  demo=routeDemo;game=activePilot?activePilot.game:new Game({mapId,difficulty:$('difficulty').value,seed,ai:!routeDemo});pilotResult=activePilot?.evaluate(game)||null;
  if(routeDemo){
    const s=game.state;s.buildings=[];s.effects=[];s.stats.built=[0,0];
    // Explicit symmetric diagnostic formation. These structures are authored,
    // free placements; the treasury remains 420 per side, with ordinary income.
    const routes=game.map.airRoutes, origins=routes.map((to,from)=>to==null?null:from).filter(lane=>lane!==null);
    const destinations=[...new Set(origins.map(lane=>routes[lane]))];
    for(const side of [0,1]){
      for(const lane of origins)game._place('aerie',worldX(game.map,side,1250),game.map.lanes[lane],side);
      for(const lane of destinations){game._place('archery',worldX(game.map,side,1110),game.map.lanes[lane],side);game._place('watchtower',worldX(game.map,side,970),game.map.lanes[lane],side);}
    }
  }
  selected=null;aiming=false;paused=initial;elapsed=0;previousPhases=new Map();totals={approach:0,warning:0,transit:0,done:0};
  $('scene').textContent=routeDemo?'Route demo: symmetric FREE authored aeries on crossing roads, plus archers and towers on landing roads. AI construction is off. Each side still starts with 420 gold and ordinary income. This scene demonstrates movement and counters; it is not a balance test.':'Standard battle: 420 gold and one starting barracks per side, ordinary income, paid construction, and an adaptive opponent. Both sides follow the selected battlefield rules.';
  if(activePilot)$('scene').textContent=`${activePilot.pilot.name}: ${activePilot.pilot.hint} Fixed authored forces are free at setup; later purchases pay normal prices. Opponent construction is off; the source mission uses ${game.difficulty} rules. Time limit ${timeText(activePilot.pilot.timeLimit)}. Selected seed ${seed}. No campaign progress or rewards.`;
  $('road').replaceChildren();for(const lane of game.map.lanes.keys()){const option=document.createElement('option');option.value=lane;option.textContent=roadName(lane);$('road').append(option);}
  $('mapName').textContent=game.map.name;$('mapDetail').textContent=`${game.map.lanes.length} ${game.map.lanes.length===1?'road':'roads'} · ${game.map.buildLimit} sites per side · ${activePilot?'authored geography pilot':routeDemo?'diagnostic formation':$('difficulty').selectedOptions[0].textContent+' opponent'}`;
  $('rules').textContent=game.map.airRoutes?(game.map.lanes.length===3?'Outer-road gryphons each cross once to the middle road. Middle-road gryphons stay on their road.':'Gryphons each cross once to the other road.')+` Both sides stop at a gateway ${AIR_ROUTE.gate} units from home, wait ${AIR_ROUTE.warning} seconds, then cross. Routes are fixed; they do not seek weak defenses.`:'This battlefield has no air transfers. Gryphons stay on their spawning road. Compare one, two and three roads before trying Crosswind.';
  $('gates').disabled=!game.map.airRoutes;refreshSites();choose(chosen);message(initial?'Battle paused. Choose a map and start when ready.':routeDemo?'Route demo running. Watch the marked gateways.':'Battle started. Build a line and answer the opposing army.');resize();updateUI();
  requestAnimationFrame(()=>scrollTo(routeDemo?game.map.width/2:600));
}
function refreshSites(){
  const old=$('site').value,lane=Number($('road').value);$('site').replaceChildren();
  for(const x of game.map.siteColumns){const occupied=game.state.buildings.find(b=>b.side===0&&b.lane===lane&&b.x===x),option=document.createElement('option');option.value=x;option.textContent=`${x} · ${occupied?BUILDINGS[occupied.type].name:'empty'}`;$('site').append(option);}
  if([...$('site').options].some(option=>option.value===old))$('site').value=old;
}
function actionReady(){if(pilotResult?.completed||pilotResult?.failed){message('This pilot has ended. Start a scene to try again.');return false;}return true;}
function buildAt(x,y){if(!actionReady())return;const result=game.build(chosen,x,y);if(result.ok){selected=result.building.id;message(`${BUILDINGS[chosen].name} built for ${BUILDINGS[chosen].cost} gold.`);refreshSites();}else message(result.reason,true);updateUI();}
function checkPilot(){if(!activePilot)return;pilotResult=activePilot.evaluate(game);if(pilotResult.completed||pilotResult.failed){paused=true;elapsed=0;message(pilotResult.label,pilotResult.failed);}}
function selectedBuilding(){return game.state.buildings.find(b=>b.id===selected&&b.side===0);}
function routeCounts(){const counts={approach:0,warning:0,transit:0,done:0};for(const u of game.state.units)if(u.airRoute)counts[u.airRoute.phase]++;return counts;}
function observeRoutes(){const phases=new Map();for(const u of game.state.units)if(u.airRoute){const phase=u.airRoute.phase;phases.set(u.id,phase);if(previousPhases.get(u.id)!==phase)totals[phase]++;}previousPhases=phases;}
function updateUI(){
  const s=game.state,building=selectedBuilding(),outcome=s.winner===null?'':s.winner==='draw'?'Draw':s.winner===0?'Victory':'Defeat';
  $('pause').textContent=paused?'Resume':'Pause';$('pause').setAttribute('aria-pressed',String(paused));$('speed').textContent=`Speed ${speed}×`;$('speed').setAttribute('aria-pressed',String(speed===4));
  $('clock').textContent=`${timeText(s.time)} · ${pilotResult?.completed?'Pilot complete':pilotResult?.failed?'Pilot failed':outcome||(paused?'Paused':speed+'× running')}`;
  $('objective').textContent=activePilot?`Objective: ${pilotResult.label}`:'';$('objective').hidden=!activePilot;
  $('ownHp').textContent=`${format(s.bases[0].hp)} HP`;$('enemyHp').textContent=`${format(s.bases[1].hp)} HP`;$('gold').textContent=`${format(s.gold[0])} gold · +${s.income[0]}/sec`;
  for(const button of $('buildings').children)button.classList.toggle('unaffordable',s.gold[0]<BUILDINGS[button.dataset.building].cost);
  const signature=s.buildings.filter(b=>b.side===0).map(b=>`${b.id}:${b.level}`).join('|');
  if($('owned').dataset.signature!==signature){$('owned').dataset.signature=signature;$('owned').replaceChildren(new Option('Choose a structure',''));for(const b of s.buildings.filter(b=>b.side===0))$('owned').append(new Option(`${roadName(b.lane)} ${b.x} · ${BUILDINGS[b.type].name} L${b.level}`,String(b.id)));refreshSites();}
  $('owned').value=building?String(building.id):'';
  $('upgrade').disabled=!building||building.level>=3||s.winner!==null;$('sell').disabled=!building||s.winner!==null;
  $('upgrade').textContent=building&&building.level<3?`Upgrade · ${upgradeCost(building)}`:'Upgrade';
  $('selection').textContent=building?`${BUILDINGS[building.type].name} · ${roadName(building.lane)} · ${Math.ceil(building.hp)}/${Math.round(building.maxHp)} HP · level ${building.level}. ${building.level<3?`Next upgrade costs ${upgradeCost(building)} gold.`:'Maximum level.'}${activePilot?.targets.some(t=>t.id===building.id&&t.kind==='protect')?' Protected original: losing or salvaging this fails the pilot.':''}`:'Select one of your structures to see its health, range and upgrade cost.';
  $('rally').setAttribute('aria-pressed',String(aiming));$('rally').textContent=aiming?'Cancel rally aim':'Aim rally · 75 gold';$('rallyStatus').textContent=s.spellCooldown[0]>0?`Recharging · ${Math.ceil(s.spellCooldown[0])} sec`:'Ready · 25 sec cooldown';
  const counts=routeCounts();$('routes').textContent=`Now: approach ${counts.approach} · warning ${counts.warning} · crossing ${counts.transit} · landed ${counts.done}`;
  $('routeHistory').textContent=`Observed this run: ${totals.warning} warnings · ${totals.transit} crossings · ${totals.done} landings. Counts include both armies; dead gryphons leave the field.`;
}
function resize(){const width=Math.max(1280,$('battleScroll').clientWidth),height=width*game.map.height/game.map.width,dpr=Math.min(devicePixelRatio||1,2);canvas.style.width=width+'px';canvas.style.height=height+'px';canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);worldScale=width/game.map.width;context.setTransform(dpr*worldScale,0,0,dpr*worldScale,0,0);}
function scrollTo(x){$('battleScroll').scrollLeft=x*worldScale-$('battleScroll').clientWidth/2;}
function line(x1,y1,x2,y2,color,width=2,dash=[]){context.beginPath();context.strokeStyle=color;context.lineWidth=width;context.setLineDash(dash);context.moveTo(x1,y1);context.lineTo(x2,y2);context.stroke();context.setLineDash([]);}
function text(label,x,y,color=muted,size=24,align='center'){context.fillStyle=color;context.font=`600 ${size}px system-ui,sans-serif`;context.textAlign=align;context.textBaseline='middle';context.fillText(label,x,y);}
function arrow(x1,y1,x2,y2,color,width=3,dashed=false){line(x1,y1,x2,y2,color,width,dashed?[12,10]:[]);const angle=Math.atan2(y2-y1,x2-x1),length=17;line(x2,y2,x2-Math.cos(angle-.55)*length,y2-Math.sin(angle-.55)*length,color,width);line(x2,y2,x2-Math.cos(angle+.55)*length,y2-Math.sin(angle+.55)*length,color,width);}
function circle(x,y,r,color,fill=false,width=2){context.beginPath();context.arc(x,y,r,0,Math.PI*2);context[fill?'fillStyle':'strokeStyle']=color;context.lineWidth=width;fill?context.fill():context.stroke();}
function draw(){
  const s=game.state,map=game.map,c=context;c.fillStyle='#253e31';c.fillRect(0,0,map.width,map.height);
  c.fillStyle='#31534555';c.fillRect(180,175,1160,550);c.fillStyle='#78493633';c.fillRect(map.width-1340,175,1160,550);
  for(const [lane,y] of map.lanes.entries()){line(110,y,map.width-110,y,'#bdac7540',76);line(110,y,map.width-110,y,'#d8cd9b35',2,[14,15]);text(roadName(lane),34,y-72,muted,23,'left');}
  line(map.width/2,120,map.width/2,760,'#83a88d66',3,[10,12]);text('YOUR FRONTIER',260,105,own,26,'left');text('ENEMY FRONTIER',map.width-260,105,enemy,26,'right');
  if(map.airRoutes)for(const side of [0,1]){
    const x=worldX(map,side,AIR_ROUTE.gate),color=side?enemy:own;
    for(const [from,to] of map.airRoutes.entries())if(to!==null){arrow(x,map.lanes[from],x,map.lanes[to],color+'99',4,true);circle(x,map.lanes[from],26,color+'99');text(`→ ${roadName(to)}`,x+(side?24:-24),map.lanes[from]-47,color,19,side?'left':'right');}
    text(side?'ENEMY GATE':'YOUR GATE',x,790,color,21);
  }
  for(const site of buildSites(map,0)){
    if(s.buildings.some(b=>b.side===0&&b.x===site.x&&b.y===site.y))continue;
    circle(site.x,site.y,24,game.canBuild(chosen,site.x,site.y).ok?'#8cddca88':'#8cddca33');line(site.x-7,site.y,site.x+7,site.y,'#8cddca66');line(site.x,site.y-7,site.x,site.y+7,'#8cddca66');text(String(site.x),site.x,site.y+42,'#a6bab080',17);
  }
  const selectedStructure=selectedBuilding();if(selectedStructure){const data=BUILDINGS[selectedStructure.type],range=data.range||(data.unit?UNITS[data.unit].range:0);if(range)circle(selectedStructure.x,selectedStructure.y,range,own+'55',false,3);}
  for(const base of s.bases){const color=base.side?enemy:own;c.fillStyle='#16231f';c.fillRect(base.x-54,base.y-75,108,150);c.strokeStyle=color;c.lineWidth=4;c.strokeRect(base.x-54,base.y-75,108,150);text(base.side?'ENEMY':'YOU',base.x,base.y-25,color,23);text(format(base.hp),base.x,base.y+20,color,23);}
  for(const b of s.buildings){const color=b.side?enemy:own;c.fillStyle=b.id===selected?'#44644a':'#172923';c.fillRect(b.x-34,b.y-32,68,64);c.strokeStyle=color;c.lineWidth=b.id===selected?5:3;c.strokeRect(b.x-34,b.y-32,68,64);text(BUILDINGS[b.type].short,b.x,b.y-5,color,22);text(`L${b.level}`,b.x,b.y+19,muted,14);line(b.x-31,b.y-42,b.x+31,b.y-42,'#12201b',6);line(b.x-31,b.y-42,b.x-31+62*b.hp/b.maxHp,b.y-42,color,6);}
  if(activePilot)for(const target of activePilot.targets)if(s.buildings.some(b=>b.id===target.id)){circle(target.x,map.lanes[target.lane],54,gold,false,3);text(target.kind==='protect'?'PROTECT':'TARGET',target.x,map.lanes[target.lane]-76,gold,18);}
  for(const u of s.units){const color=u.side?enemy:own,r=u.flying?19:14;
    if(u.airRoute){const route=u.airRoute;if(route.phase==='approach')arrow(u.x,u.y,worldX(map,u.side,AIR_ROUTE.gate),map.lanes[route.to],color+'55',2,true);if(route.phase==='warning'){circle(u.x,u.y,36,gold,false,4);text(`${route.remaining.toFixed(1)}s`,u.x,u.y-57,gold,22);}if(route.phase==='transit'){arrow(u.x,u.y,u.x,map.lanes[route.to],gold,3);text('CROSSING',u.x+(u.side?30:-30),u.y-34,gold,16,u.side?'left':'right');}if(route.phase==='done')circle(u.x,u.y,27,color+'77',false,2);}
    c.fillStyle='#12271f';c.strokeStyle=color;c.lineWidth=3;c.beginPath();if(u.side){c.moveTo(u.x,u.y-r);c.lineTo(u.x+r,u.y);c.lineTo(u.x,u.y+r);c.lineTo(u.x-r,u.y);c.closePath();}else c.arc(u.x,u.y,r,0,Math.PI*2);c.fill();c.stroke();text(unitLabels[u.type],u.x,u.y,color,u.flying?20:16);
    if(u.hp<u.maxHp){line(u.x-18,u.y-27,u.x+18,u.y-27,'#14211b',4);line(u.x-18,u.y-27,u.x-18+36*u.hp/u.maxHp,u.y-27,color,4);}
  }
  for(const p of s.projectiles)line(p.x,p.y,p.tx,p.ty,p.side?enemy:own,2);
  for(const e of s.effects)if(e.type==='volley')circle(e.x,e.y,e.radius,gold+'99',false,5);
  if(paused){c.fillStyle='#101b1a99';c.fillRect(0,0,map.width,map.height);text('PAUSED · BUILD OR RESUME',Math.min(700,map.width/2),820,gold,27,'center');}
}
function cast(x,y){if(!actionReady())return;const result=game.cast(x,y);message(result.ok?'Rally strike cast for 75 gold.':result.reason,!result.ok);if(result.ok)aiming=false;updateUI();}
let pointerStart=null;
canvas.addEventListener('pointerdown',event=>{pointerStart={x:event.clientX,y:event.clientY};});
canvas.addEventListener('pointerup',event=>{
  if(!pointerStart||Math.hypot(event.clientX-pointerStart.x,event.clientY-pointerStart.y)>10)return;pointerStart=null;
  const rect=canvas.getBoundingClientRect(),x=(event.clientX-rect.left)/worldScale,y=(event.clientY-rect.top)/worldScale;
  if(aiming){cast(x,y);return;}const building=game.state.buildings.find(b=>b.side===0&&Math.hypot(b.x-x,b.y-y)<48);
  if(building){selected=building.id;message(`${BUILDINGS[building.type].name} selected.`);updateUI();return;}
  const nearest=buildSites(game.map,0).sort((a,b)=>Math.hypot(a.x-x,a.y-y)-Math.hypot(b.x-x,b.y-y))[0];if(nearest&&Math.hypot(nearest.x-x,nearest.y-y)<66)buildAt(nearest.x,nearest.y);else message('Choose an outlined site in your left frontier.',true);
});
$('reset').onclick=()=>reset(false);$('demo').onclick=()=>reset(true);$('pause').onclick=()=>{if(pilotResult?.completed||pilotResult?.failed){message('This pilot has ended. Start a scene to try again.');return;}paused=!paused;message(paused?'Battle paused. Paid building actions are still available.':'Battle running.');updateUI();};$('speed').onclick=()=>{speed=speed===1?4:1;updateUI();};$('home').onclick=()=>scrollTo(600);$('gates').onclick=()=>scrollTo(game.map.width/2);
$('scenario').onchange=()=>{const pilot=PILOTS.find(p=>$('scenario').value===p.id);if(pilot)$('map').value=pilot.mapId;$('map').disabled=!!pilot;$('difficulty').disabled=!!pilot;};
$('road').onchange=refreshSites;$('place').onclick=()=>buildAt(Number($('site').value),game.map.lanes[Number($('road').value)]);
$('owned').onchange=()=>{selected=$('owned').value?Number($('owned').value):null;aiming=false;updateUI();};
$('upgrade').onclick=()=>{if(!actionReady())return;const result=game.upgrade(selected);message(result.ok?'Structure upgraded.':result.reason,!result.ok);updateUI();};
$('sell').onclick=()=>{if(!actionReady())return;const result=game.sell(selected);message(result.ok?`Structure salvaged for ${result.refund} gold.`:result.reason,!result.ok);if(result.ok)selected=null;checkPilot();updateUI();};
$('rally').onclick=()=>{aiming=!aiming;message(aiming?'Tap the battlefield to aim your rally strike.':'Rally aim cancelled.');updateUI();};$('rallyGate').onclick=()=>cast(worldX(game.map,1,AIR_ROUTE.gate),game.map.lanes[Number($('road').value)]);
window.addEventListener('keydown',event=>{if(event.target.closest('input,select,textarea,button'))return;if(event.code==='Space'){event.preventDefault();$('pause').click();}if(event.key==='Escape'){aiming=false;selected=null;updateUI();}if(/^[1-7]$/.test(event.key))choose(types[Number(event.key)-1]);});
document.addEventListener('visibilitychange',()=>{if(document.hidden){paused=true;elapsed=0;updateUI();}});window.addEventListener('resize',resize);
function frame(now){const dt=Math.max(0,Math.min((now-lastFrame)/1000,.1));lastFrame=now;if(!paused&&game.state.winner===null){elapsed+=dt*speed;while(elapsed>=.05){game.update(.05);observeRoutes();elapsed-=.05;checkPilot();if(paused)break;if(game.state.winner!==null){elapsed=0;message(game.state.winner===0?'Enemy citadel defeated.':game.state.winner===1?'Your citadel has fallen.':'Both citadels have fallen.');break;}}}draw();if(now-lastUI>150){updateUI();lastUI=now;}requestAnimationFrame(frame);}
reset(false,true);requestAnimationFrame(frame);
