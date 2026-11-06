import {COMMAND_MAPS, AIR_ROUTE, BUILDINGS, UNITS, SPELL, buildSites, worldX, homeX, upgradeCost} from '../lane-lab/engine.js';
import {SCENARIOS, RESPONSE_POLICIES, createScenario, createResponseMemory, respond} from './scenarios.js';

const $=id=>document.getElementById(id),canvas=$('field'),c=canvas.getContext('2d');
const friendly='#8cddca',hostile='#f49c82',gold='#edd18b',muted='#acbcae';
const responseNames={none:'No new response','destination-archery':'Destination archers','destination-tower':'Destination tower','origin-archery':'Origin archers',rally:'Rally strike'};
const responseDescriptions={none:'The opponent makes no new purchases. Existing defenders still fight. Use this control to inspect the cost and benefit of leaving your current road.','destination-archery':'After a launch is visible, the opponent tries to buy archers on its destination road. Those troops pay normal prices and can engage a crossing flyer from either connected road within range.','destination-tower':'After a launch is visible, the opponent saves for a tower on its destination road. A tower covers physical distance across roads, but stays in place and costs 220 gold.','origin-archery':'After a launch is visible, the opponent tries to place archers on the originating road. Leaving may evade that screen, but can abandon your own defense.','rally':'The opponent can pay 75 gold to strike a visible cluster of at least two flyers, with the normal radius and cooldown. A route warning gives it an opportunity to respond.'};
const unitSymbols={warrior:'W',archer:'A',siege:'S',wizard:'M',gryphon:'G'},types=Object.keys(BUILDINGS);
let setup,game,side=0,defender=1,responsePolicy='none',responseMemory,paidSpend=0,responseSpend=0;
let paused=true,speed=1,selected=null,selectedAerie=null,chosen='archery',aiming=false,finished=false;
let elapsed=0,lastFrame=performance.now(),lastUI=0,nextResponse=0,worldScale=.4;
let previousPhases=new Map(),totals={warning:0,transit:0,done:0};
const number=n=>Math.floor(n).toLocaleString('en-US'),clock=n=>`${Math.floor(n/60)}:${String(Math.floor(n%60)).padStart(2,'0')}`;
const roadName=lane=>game.map.lanes.length===2?['North','South'][lane]:['North','Middle','South'][lane];
const isAlive=id=>game.state.buildings.find(b=>b.id===id&&b.hp>0);
const selectedBuilding=()=>game.state.buildings.find(b=>b.id===selected&&b.side===side&&b.hp>0);
const aerie=()=>game.state.buildings.find(b=>b.id===selectedAerie&&b.side===side&&b.type==='aerie'&&b.hp>0);
const phaseName=phase=>({approach:'Approaching gate',warning:'Warning',transit:'Crossing',done:'Arrived',hold:'Holding launch road'}[phase]||phase);
function message(text,error=false){$('message').textContent=text;$('message').classList.toggle('error',error);}
for(const scenario of SCENARIOS)$('scenario').append(new Option(scenario.name,scenario.id));
for(const map of Object.values(COMMAND_MAPS))$('map').append(new Option(map.name,map.id));
if(COMMAND_MAPS['command-three-roads'])$('map').value='command-three-roads';
for(const policy of RESPONSE_POLICIES)$('response').append(new Option(responseNames[policy]||policy,policy));
for(const type of types){const button=document.createElement('button');button.dataset.building=type;button.title=BUILDINGS[type].description;const title=document.createElement('b');title.textContent=BUILDINGS[type].name;const cost=document.createElement('small');cost.textContent=`${BUILDINGS[type].cost} gold`;button.append(title,cost);button.onclick=()=>choose(type);$('buildings').append(button);}

function choose(type){chosen=type;aiming=false;for(const button of $('buildings').children)button.setAttribute('aria-pressed',String(button.dataset.building===type));if(game){message(`${BUILDINGS[type].name}: choose a legal empty site.`);updateUI();}}
function actionReady(){if(finished||game.state.winner!==null){message('The observation has ended. Reset the scene to compare another choice.');return false;}return true;}
function reset(){
  const seed=Number($('seed').value);if(!Number.isInteger(seed)||seed<0||seed>4294967295){message('Choose a whole-number seed between 0 and 4,294,967,295.',true);return;}
  setup=createScenario($('scenario').value,{seed,side:0,mapId:$('map').value});game=setup.game;side=setup.playerSide;defender=setup.defenderSide;responsePolicy=$('response').value;responseMemory=createResponseMemory();
  selectedAerie=setup.aerieIds.find(id=>isAlive(id))??null;selected=selectedAerie;paused=true;finished=false;aiming=false;elapsed=0;nextResponse=0;paidSpend=0;responseSpend=0;previousPhases=new Map();totals={warning:0,transit:0,done:0};
  $('orderNotice').textContent='Orders are free. Already airborne gryphons retain their launch orders.';
  $('aerie').dataset.signature='';$('owned').dataset.signature='';$('orders').dataset.signature='';$('flights').dataset.signature='';
  $('scene').textContent=`${setup.description||SCENARIOS.find(s=>s.id===setup.id)?.description||''} ${setup.goal||''} Authored starting structures are FREE; treasuries start at ${number(game.state.gold[side])} for you and ${number(game.state.gold[defender])} for the opponent, with ordinary income. Observation limit ${setup.horizon||110}s. Changing setup controls requires Reset scene.`;
  $('responseDescription').textContent=responseDescriptions[responsePolicy]||responsePolicy;$('mapName').textContent=game.map.name;
  $('road').replaceChildren();for(const lane of game.map.lanes.keys())$('road').append(new Option(roadName(lane),String(lane)));
  $('road').value=String(setup.originLane??aerie()?.lane??0);refreshSites();choose(chosen);message('Paused for planning. Choose a future launch order, then Launch / Resume.');updateUI();resize();requestAnimationFrame(()=>scrollTo(1100));
}
function order(to){
  if(!actionReady())return;const b=aerie();if(!b){message('Select a living aerie first.',true);return;}
  const result=game.setFlightPlan(b.id,to,side);if(!result.ok){message(result.reason,true);return;}
  const count=game.state.units.filter(u=>u.side===side&&u.type==='gryphon').length;
  $('orderNotice').textContent=`Next launch: ${to===b.lane?'Hold '+roadName(b.lane):roadName(b.lane)+' → '+roadName(to)}. Free order. ${count} airborne ${count===1?'gryphon keeps its':'gryphons keep their'} launch orders.`;
  message('Future flight order updated. Already airborne routes are unchanged.');updateUI();
}
function nextLaunch(b){if(!b)return 0;return Math.max(0,(1-b.progress)*BUILDINGS.aerie.spawnTime/((1+.22*(b.level-1))*(game.state.overtime?1.65:1)));}
function describeRoad(lane){
  const foes=game.state.units.filter(u=>u.side===defender&&u.lane===lane),structures=game.state.buildings.filter(b=>b.side===defender&&b.lane===lane);
  const archers=foes.filter(u=>u.type==='archer').length,air=foes.filter(u=>u.flying).length,towers=structures.filter(b=>b.type==='watchtower').length;
  const targets=(setup.targets||[]).filter(t=>t.lane===lane);const hp=targets.reduce((n,t)=>n+(isAlive(t.id)?.hp||0),0);
  return {archers,air,towers,units:foes.length,targets:targets.length,hp};
}
function updateOrders(){
  const b=aerie();if(!b){$('orders').replaceChildren();$('launch').textContent='No aerie remains. Build one to issue future launch orders.';return;}
  const destinations=[b.lane,...[b.lane-1,b.lane+1].filter(l=>l>=0&&l<game.map.lanes.length)];
  const signature=`${b.id}/${destinations.join()}`;
  if($('orders').dataset.signature!==signature){$('orders').dataset.signature=signature;$('orders').replaceChildren();for(const to of destinations){const button=document.createElement('button');button.className='order-card';button.dataset.order=String(to);button.onclick=()=>order(to);for(const className of ['order-name','order-road','order-detail','order-timing']){const span=document.createElement('span');span.className=className;button.append(span);}$('orders').append(button);}}
  const seconds=nextLaunch(b),gateTravel=Math.max(0,AIR_ROUTE.gate-homeX(game.map,side,b.x)-48)/UNITS.gryphon.speed;
  $('launch').textContent=`${roadName(b.lane)} aerie · next launch ready in ${seconds.toFixed(1)}s · current order: ${(b.flightPlan??b.lane)===b.lane?'Hold '+roadName(b.lane):roadName(b.flightPlan)} · ${game.state.units.filter(u=>u.side===side).length}/70 army slots`;
  for(const button of $('orders').children){const to=Number(button.dataset.order),hold=to===b.lane,info=describeRoad(to),delay=hold?0:AIR_ROUTE.warning+Math.ceil(Math.abs(game.map.lanes[to]-game.map.lanes[b.lane])/(AIR_ROUTE.speed*.05))*.05;
    button.disabled=finished;button.setAttribute('aria-pressed',String((b.flightPlan??b.lane)===to));button.querySelector('.order-name').textContent=hold?'Hold':roadName(to);button.querySelector('.order-road').textContent=hold?`Stay on ${roadName(b.lane)}`:`${roadName(b.lane)} → ${roadName(to)}`;
    button.querySelector('.order-detail').textContent=`${info.targets?`${info.targets} marked target${info.targets===1?'':'s'} · ${number(info.hp)} HP. `:'No marked target. '}${info.archers} archers · ${info.towers} towers. ${hold?'Fastest route. Ordinary combat supports this road.':'Commit to the launch road until the gate, then leave to contest this road.'}`;
    button.querySelector('.order-timing').textContent=hold?'No crossing delay':`+${delay.toFixed(2)}s: 2s warning + transit · gate ≈${(seconds+gateTravel).toFixed(1)}s`;
  }
}
function refreshSites(){if(!game)return;const old=$('site').value,lane=Number($('road').value);$('site').replaceChildren();for(const distance of game.map.siteColumns){const x=worldX(game.map,side,distance),b=game.state.buildings.find(b=>b.side===side&&b.lane===lane&&b.x===x);$('site').append(new Option(`${distance} from home · ${b?BUILDINGS[b.type].name:'empty'}`,String(x)));}if([...$('site').options].some(o=>o.value===old))$('site').value=old;}
function buildAt(x,y){if(!actionReady())return;const result=game.build(chosen,x,y,side);if(result.ok){paidSpend+=BUILDINGS[chosen].cost;selected=result.building.id;if(chosen==='aerie')selectedAerie=selected;message(`${BUILDINGS[chosen].name} built for ${BUILDINGS[chosen].cost} gold.`);refreshSites();}else message(result.reason,true);updateUI();}
function cast(x,y){if(!actionReady())return;const result=game.cast(x,y,side);if(result.ok){paidSpend+=SPELL.cost;aiming=false;}message(result.ok?'Rally strike cast for 75 gold.':result.reason,!result.ok);updateUI();}
function observeRoutes(){const phases=new Map();for(const u of game.state.units)if(u.side===side&&u.airRoute){phases.set(u.id,u.airRoute.phase);if(previousPhases.get(u.id)!==u.airRoute.phase&&u.airRoute.phase in totals)totals[u.airRoute.phase]++;}previousPhases=phases;}
function updateUI(){
  const s=game.state,b=selectedBuilding();$('clock').textContent=`${clock(s.time)} / ${clock(setup.horizon||110)} · ${finished?'Observation ended':paused?'Paused':speed+'× running'}`;
  $('pause').textContent=paused?'Launch / Resume':'Pause';$('pause').setAttribute('aria-pressed',String(paused));$('speed').textContent=`Speed ${speed}×`;$('speed').setAttribute('aria-pressed',String(speed===4));
  $('ownHp').textContent=`${number(s.bases[side].hp)} HP`;
  const protectedInitial=(setup.protected||[]).reduce((n,t)=>n+(t.initialHp??t.maxHp??0),0),protectedHp=(setup.protected||[]).reduce((n,t)=>n+(isAlive(t.id)?.hp||0),0);$('screenHp').textContent=`${number(protectedHp)} / ${number(protectedInitial)} HP`;
  const targetInitial=(setup.targets||[]).reduce((n,t)=>n+(t.initialHp??t.hp??isAlive(t.id)?.maxHp??0),0),remaining=(setup.targets||[]).reduce((n,t)=>n+(isAlive(t.id)?.hp||0),0);
  $('targetDamage').textContent=`${number(Math.max(0,targetInitial-remaining))} / ${number(targetInitial)}`;$('spend').textContent=`${number(paidSpend)} gold`;$('enemySpend').textContent=`${number(responseSpend)} gold`;
  $('gold').textContent=`${number(s.gold[side])} gold · +${s.income[side]}/sec`;
  const ownStructures=s.buildings.filter(b=>b.side===side),aeries=ownStructures.filter(b=>b.type==='aerie');const aSignature=aeries.map(b=>b.id).join('|');
  if($('aerie').dataset.signature!==aSignature){$('aerie').dataset.signature=aSignature;$('aerie').replaceChildren();for(const a of aeries)$('aerie').append(new Option(`${roadName(a.lane)} · site ${homeX(game.map,side,a.x)}`,String(a.id)));if(!aeries.some(a=>a.id===selectedAerie))selectedAerie=aeries[0]?.id??null;}
  $('aerie').value=selectedAerie===null?'':String(selectedAerie);
  const signature=ownStructures.map(b=>`${b.id}:${b.level}`).join('|');if($('owned').dataset.signature!==signature){$('owned').dataset.signature=signature;$('owned').replaceChildren(new Option('Choose a structure',''));for(const v of ownStructures)$('owned').append(new Option(`${roadName(v.lane)} ${homeX(game.map,side,v.x)} · ${BUILDINGS[v.type].name} L${v.level}`,String(v.id)));refreshSites();}
  $('owned').value=b?String(b.id):'';$('upgrade').disabled=!b||b.level>=3||finished;$('sell').disabled=!b||finished;$('upgrade').textContent=b&&b.level<3?`Upgrade · ${upgradeCost(b)}`:'Upgrade';
  $('selection').textContent=b?`${BUILDINGS[b.type].name} · ${Math.ceil(b.hp)}/${Math.round(b.maxHp)} HP · level ${b.level}. ${b.type==='aerie'?'Orders above affect only its future launches.':''}`:'Select one of your structures to inspect or improve it.';
  for(const button of $('buildings').children)button.classList.toggle('unaffordable',s.gold[side]<BUILDINGS[button.dataset.building].cost);
  $('rally').textContent=aiming?'Cancel rally aim':'Aim rally · 75 gold';$('rally').setAttribute('aria-pressed',String(aiming));$('rallyStatus').textContent=s.spellCooldown[side]>0?`${Math.ceil(s.spellCooldown[side])}s cooldown`:'Rally ready · radius 170';
  updateOrders();
  const flights=s.units.filter(u=>u.side===side&&u.type==='gryphon');$('flightCount').textContent=`${flights.length} alive`;
  $('flights').replaceChildren();for(const u of flights){const from=u.airRoute?.from??u.lane,to=u.airRoute?.to??u.lane,phase=u.airRoute?.phase??'hold',row=document.createElement('tr');row.dataset.unit=String(u.id);row.dataset.from=String(from);row.dataset.to=String(to);row.dataset.phase=phase;for(const value of [`G${u.id}`,`${roadName(from)} → ${roadName(to)}`,`${phaseName(phase)}${phase==='warning'?' · '+u.airRoute.remaining.toFixed(1)+'s':''}`]){const cell=document.createElement('td');cell.textContent=value;row.append(cell);}$('flights').append(row);}
  if(!flights.length){const row=document.createElement('tr'),cell=document.createElement('td');cell.colSpan=3;cell.textContent='No live gryphons yet. Choose the next launch order.';row.append(cell);$('flights').append(row);}
  $('routeCounts').textContent=`Observed: ${totals.warning} warnings · ${totals.transit} crossings · ${totals.done} arrivals`;
  $('roadObservations').style.gridTemplateColumns=`repeat(${game.map.lanes.length}, minmax(0, 1fr))`;$('roadObservations').replaceChildren();for(const lane of game.map.lanes.keys()){const info=describeRoad(lane),div=document.createElement('div'),title=document.createElement('strong');title.textContent=roadName(lane);div.append(title,document.createTextNode(`Enemy: ${info.units} troops (${info.archers} archers, ${info.air} flyers), ${info.towers} towers. Marked targets: ${number(info.hp)} HP remaining.`));$('roadObservations').append(div);}
  $('outcome').textContent=finished?`Observation ended at ${s.time.toFixed(2)}s. ${s.winner===side?'Enemy citadel destroyed.':s.winner===defender?'Your citadel fell.':s.winner==='draw'?'Both citadels fell.':'Compare target damage, defense and spending, then reset with another choice.'}`:'';
}

function resize(){if(!game)return;const width=Math.max(1280,$('battleScroll').clientWidth),height=width*game.map.height/game.map.width,dpr=Math.min(devicePixelRatio||1,2);canvas.style.width=width+'px';canvas.style.height=height+'px';canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);worldScale=width/game.map.width;c.setTransform(dpr*worldScale,0,0,dpr*worldScale,0,0);}
function scrollTo(x){$('battleScroll').scrollLeft=x*worldScale-$('battleScroll').clientWidth/2;}
function line(x1,y1,x2,y2,color,width=2,dash=[]){c.beginPath();c.strokeStyle=color;c.lineWidth=width;c.setLineDash(dash);c.moveTo(x1,y1);c.lineTo(x2,y2);c.stroke();c.setLineDash([]);}
function text(label,x,y,color=muted,size=24,align='center'){c.fillStyle=color;c.font=`600 ${size}px system-ui,sans-serif`;c.textAlign=align;c.textBaseline='middle';c.fillText(label,x,y);}
function circle(x,y,r,color,width=2){c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.strokeStyle=color;c.lineWidth=width;c.stroke();}
function arrow(x1,y1,x2,y2,color,width=3,dash=[]){line(x1,y1,x2,y2,color,width,dash);const a=Math.atan2(y2-y1,x2-x1),r=15;line(x2,y2,x2-Math.cos(a-.55)*r,y2-Math.sin(a-.55)*r,color,width);line(x2,y2,x2-Math.cos(a+.55)*r,y2-Math.sin(a+.55)*r,color,width);}
function draw(){
  const s=game.state,map=game.map;c.fillStyle='#294231';c.fillRect(0,0,map.width,map.height);c.fillStyle='#3b674b44';c.fillRect(180,170,1160,560);c.fillStyle='#80513c33';c.fillRect(map.width-1340,170,1160,560);
  for(const [lane,y] of map.lanes.entries()){line(110,y,map.width-110,y,'#c3b78344',76);line(110,y,map.width-110,y,'#e0d7b244',2,[13,14]);text(roadName(lane),30,y-65,muted,23,'left');}
  text('YOUR FRONTIER',250,95,friendly,25,'left');text('ENEMY FRONTIER',map.width-250,95,hostile,25,'right');
  for(const owner of [side,defender]){const x=worldX(map,owner,AIR_ROUTE.gate);line(x,190,x,710,owner===side?'#8cddca44':'#f49c8244',3,[10,12]);text(owner===side?'YOUR CROSSING GATE':'ENEMY GATE',x,790,owner===side?friendly:hostile,21);}
  for(const b of s.buildings.filter(b=>b.side===side&&b.type==='aerie')){const to=b.flightPlan??b.lane,gate=worldX(map,side,AIR_ROUTE.gate),color=b.id===selectedAerie?friendly:'#8cddca77';if(to!==b.lane){arrow(b.x,map.lanes[b.lane],gate,map.lanes[b.lane],color,3,[10,10]);arrow(gate,map.lanes[b.lane],gate,map.lanes[to],color,4,[10,10]);}else arrow(b.x+45,b.y,b.x+280,b.y,color,3,[10,10]);text(`NEXT: ${to===b.lane?'HOLD':roadName(to).toUpperCase()}`,b.x,b.y-85,color,20);}
  for(const site of buildSites(map,side)){if(s.buildings.some(b=>b.side===side&&b.x===site.x&&b.y===site.y))continue;circle(site.x,site.y,23,game.canBuild(chosen,site.x,site.y,side).ok?'#8cddca88':'#8cddca33');line(site.x-7,site.y,site.x+7,site.y,'#8cddca66');line(site.x,site.y-7,site.x,site.y+7,'#8cddca66');}
  for(const base of s.bases){const color=base.side===side?friendly:hostile;c.fillStyle='#172b22';c.fillRect(base.x-53,base.y-65,106,130);c.strokeStyle=color;c.lineWidth=4;c.strokeRect(base.x-53,base.y-65,106,130);text(base.side===side?'YOU':'ENEMY',base.x,base.y-19,color,22);text(number(base.hp),base.x,base.y+22,color,22);}
  const inspect=selectedBuilding();if(inspect){const d=BUILDINGS[inspect.type],range=d.range||(d.unit?UNITS[d.unit].range:0);if(range)circle(inspect.x,inspect.y,range,friendly+'55',3);}
  for(const b of s.buildings){const color=b.side===side?friendly:hostile;c.fillStyle=b.id===selected?'#426b4b':'#192d23';c.fillRect(b.x-34,b.y-32,68,64);c.strokeStyle=color;c.lineWidth=b.id===selected?5:3;c.strokeRect(b.x-34,b.y-32,68,64);text(BUILDINGS[b.type].short,b.x,b.y-5,color,21);text(`L${b.level}`,b.x,b.y+19,muted,14);line(b.x-31,b.y-43,b.x+31,b.y-43,'#17261e',6);line(b.x-31,b.y-43,b.x-31+62*b.hp/b.maxHp,b.y-43,color,6);}
  for(const target of [...(setup.targets||[]),...(setup.protected||[])]){const b=isAlive(target.id);if(b){circle(b.x,b.y,55,gold,3);text((setup.protected||[]).some(p=>p.id===b.id)?'DEFEND':'TARGET',b.x,b.y-76,gold,18);}}
  for(const u of s.units){const color=u.side===side?friendly:hostile,r=u.flying?19:14,route=u.airRoute;if(route){if(route.phase==='approach')arrow(u.x,u.y,worldX(map,u.side,AIR_ROUTE.gate),map.lanes[route.to],color+'66',2,[10,10]);if(route.phase==='warning'){circle(u.x,u.y,36,gold,4);text(`${route.remaining.toFixed(1)}s → ${roadName(route.to)}`,u.x,u.y-55,gold,20);}if(route.phase==='transit'){arrow(u.x,u.y,u.x,map.lanes[route.to],gold,3);text('CROSSING',u.x+(u.side===side?-32:32),u.y-30,gold,16,u.side===side?'right':'left');}if(route.phase==='done')circle(u.x,u.y,27,color+'77',2);}
    c.fillStyle='#15271e';c.strokeStyle=color;c.lineWidth=3;c.beginPath();if(u.side!==side){c.moveTo(u.x,u.y-r);c.lineTo(u.x+r,u.y);c.lineTo(u.x,u.y+r);c.lineTo(u.x-r,u.y);c.closePath();}else c.arc(u.x,u.y,r,0,Math.PI*2);c.fill();c.stroke();text(unitSymbols[u.type],u.x,u.y,color,u.flying?20:16);if(u.hp<u.maxHp){line(u.x-18,u.y-28,u.x+18,u.y-28,'#15251d',4);line(u.x-18,u.y-28,u.x-18+36*u.hp/u.maxHp,u.y-28,color,4);}}
  for(const p of s.projectiles)line(p.x,p.y,p.tx,p.ty,p.side===side?friendly:hostile,2);for(const e of s.effects)if(e.type==='volley')circle(e.x,e.y,e.radius,gold+'99',5);
  if(paused){c.fillStyle='#111d1b88';c.fillRect(0,0,map.width,map.height);const center=($('battleScroll').scrollLeft+$('battleScroll').clientWidth/2)/worldScale;text(finished?'OBSERVATION ENDED':'PAUSED · CHOOSE THE NEXT FLIGHT',center,830,gold,23);}
}

let pointerStart=null;canvas.addEventListener('pointerdown',event=>{pointerStart={x:event.clientX,y:event.clientY};});canvas.addEventListener('pointerup',event=>{if(!pointerStart||Math.hypot(event.clientX-pointerStart.x,event.clientY-pointerStart.y)>10)return;pointerStart=null;const rect=canvas.getBoundingClientRect(),x=(event.clientX-rect.left)/worldScale,y=(event.clientY-rect.top)/worldScale;if(aiming){cast(x,y);return;}const b=game.state.buildings.find(b=>b.side===side&&Math.hypot(b.x-x,b.y-y)<50);if(b){selected=b.id;if(b.type==='aerie')selectedAerie=b.id;updateUI();return;}const site=buildSites(game.map,side).sort((a,b)=>Math.hypot(a.x-x,a.y-y)-Math.hypot(b.x-x,b.y-y))[0];if(site&&Math.hypot(site.x-x,site.y-y)<64)buildAt(site.x,site.y);else message('Choose a site on your frontier, or use the native site controls.',true);});
$('reset').onclick=reset;$('pause').onclick=()=>{if(finished){message('Reset the scene to start another observation.');return;}paused=!paused;elapsed=0;updateUI();};$('speed').onclick=()=>{speed=speed===1?4:1;updateUI();};$('home').onclick=()=>scrollTo(aerie()?.x??1100);$('gates').onclick=()=>scrollTo(game.map.width/2);
$('aerie').onchange=()=>{selectedAerie=Number($('aerie').value);selected=selectedAerie;updateUI();};$('road').onchange=refreshSites;$('place').onclick=()=>buildAt(Number($('site').value),game.map.lanes[Number($('road').value)]);
$('owned').onchange=()=>{selected=$('owned').value?Number($('owned').value):null;if(selectedBuilding()?.type==='aerie')selectedAerie=selected;updateUI();};
$('upgrade').onclick=()=>{if(!actionReady())return;const b=selectedBuilding(),cost=b?upgradeCost(b):0,result=game.upgrade(selected,side);if(result.ok)paidSpend+=cost;message(result.ok?`Upgraded for ${cost} gold.`:result.reason,!result.ok);updateUI();};$('sell').onclick=()=>{if(!actionReady())return;const result=game.sell(selected,side);message(result.ok?`Salvaged for ${result.refund} gold. Gross spending does not subtract refunds.`:result.reason,!result.ok);if(result.ok)selected=null;updateUI();};
$('rally').onclick=()=>{aiming=!aiming;message(aiming?'Tap the battlefield to aim a rally strike.':'Rally aim cancelled.');updateUI();};$('rallyGate').onclick=()=>cast(worldX(game.map,defender,AIR_ROUTE.gate),game.map.lanes[Number($('road').value)]);
window.addEventListener('keydown',event=>{if(event.target.closest('input,select,textarea,button,summary'))return;if(event.code==='Space'){event.preventDefault();$('pause').click();}if(event.key==='Escape'){aiming=false;updateUI();}if(/^[1-7]$/.test(event.key))choose(types[Number(event.key)-1]);});document.addEventListener('visibilitychange',()=>{if(document.hidden){paused=true;elapsed=0;updateUI();}});window.addEventListener('resize',resize);
function frame(now){const dt=Math.max(0,Math.min((now-lastFrame)/1000,.1));lastFrame=now;if(!paused&&!finished){elapsed+=dt*speed;while(elapsed>=.05){if(game.state.time+1e-7>=nextResponse){const action=respond(game,defender,responsePolicy,responseMemory);responseSpend+=action?.cost??0;nextResponse+=1;}game.update(.05);elapsed-=.05;observeRoutes();if(game.state.winner!==null||game.state.time+1e-7>=(setup.horizon||110)){finished=true;paused=true;elapsed=0;break;}}}draw();if(now-lastUI>150){updateUI();lastUI=now;}requestAnimationFrame(frame);}
reset();requestAnimationFrame(frame);
