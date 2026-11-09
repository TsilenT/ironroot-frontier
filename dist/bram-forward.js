/** QA-only, unadmitted forward-camp prototype. Fresh design epoch 2, approved positional-swap boundary. */
export const BRAM_RULESET_ID='frontier-qa-bram-forward-v1';
export const BRAM_MAP_ID='qa-bram-two-roads';
export const BRAM_PADS=Object.freeze([2370,2510]);
export const BRAM_GATES=Object.freeze([{id:6,lane:0,x:2750,y:340},{id:11,lane:1,x:2750,y:560}].map(Object.freeze));
export const supportsBram=rules=>rules.id===BRAM_RULESET_ID&&rules.revision===1;
export function initializeBram(game){
  const s=game.state;
  const put=(type,x,y,side,level=1)=>{const b=game._place(type,x,y,side);if(level===2){b.level=2;b.hp=b.maxHp=game.buildings[type].hp*1.4;b.invested+=Math.round(game.buildings[type].cost*.7);}return b;};
  put('barracks',1110,340,0);put('archery',970,340,0);put('barracks',1110,560,0);put('archery',970,560,0);put('mint',410,340,0);
  for(const y of [340,560]){put('watchtower',2750,y,1,2);put('barracks',2890,y,1);put('archery',3030,y,1);put('watchtower',3170,y,1);put(y===340?'foundry':'aerie',y===340?3730:3310,y,1);}
  put('mint',3310,340,1);s.gold=[1100,100];s.income=[7.5,7.5];s.effects=[];
  s.bramBreach={revision:1,gates:BRAM_GATES.map(g=>({id:g.id,lane:g.lane,openedTick:null}))};
}
export function bramPlacement(game,x,y,side){
  if(side!==0||!BRAM_PADS.includes(x))return true;
  const lane=game.map.lanes.indexOf(y);
  return lane>=0&&game.state.bramBreach.gates[lane].openedTick!==null;
}
// Called once, after the resolved-damage batch and before dead structures are removed.
export function advanceBram(game){
  for(const gate of game.state.bramBreach.gates)if(gate.openedTick===null&&game.state.buildings.some(b=>b.id===gate.id&&b.hp===0))gate.openedTick=game.tick;
}
export function validateBram(data,fail){
  const s=data.state,b=s.bramBreach;
  const keys=(v,names)=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length===names.length&&names.every(k=>Object.hasOwn(v,k));
  if(!keys(b,['revision','gates'])||b.revision!==1||!Array.isArray(b.gates)||b.gates.length!==2)fail('invalid Bram breach state');
  if(Math.abs(s.time-data.tick*.05)>1e-7+s.time*1e-9)fail('Bram clock mismatch');
  for(const [lane,gate] of b.gates.entries()){
    const fixed=BRAM_GATES[lane],live=s.buildings.find(e=>e.id===fixed.id);
    if(!keys(gate,['id','lane','openedTick'])||gate.id!==fixed.id||gate.lane!==lane||data.nextId<=16)fail('invalid original Bram gate identity');
    if(s.units.some(e=>e.id===fixed.id))fail('original gate id reused by unit');
    if(gate.openedTick===null){if(!live||live.type!=='watchtower'||live.side!==1||live.x!==fixed.x||live.y!==fixed.y||live.lane!==lane||live.hp<=0||live.level<2)fail('closed Bram gate is missing or changed');}
    else if(!Number.isInteger(gate.openedTick)||gate.openedTick<1||gate.openedTick>data.tick||live)fail('invalid Bram opening tick or original gate still present');
  }
  for(const e of s.buildings)if(!bramPlacement({map:{lanes:[340,560]},state:s},e.x,e.y,e.side))fail('forward building requires an open original gate');
}
