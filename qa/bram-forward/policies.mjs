/** Frozen development policies. Only current clear-view state, no AI internals. */
export const POLICY_IDS=Object.freeze(['rear','prompt','cautious','idle']);
export const OPENING=Object.freeze([
 ['foundry',1250,0],['foundry',1250,1],['mint',270,0],['mint',270,1],['sanctum',830,0],['sanctum',830,1]
]);
export function padSafety(g,lane){
 const foes=g.state.units.filter(u=>u.side===1&&u.hp>0&&u.lane===lane),friends=g.state.units.filter(u=>u.side===0&&u.hp>0&&u.lane===lane&&Math.abs(u.x-2510)<400);
 const close=foes.filter(u=>Math.abs(u.x-2510)<350),immediate=foes.some(u=>Math.abs(u.x-2510)<220),siege=foes.some(u=>u.type==='siege'&&Math.abs(u.x-2510)<440),air=foes.some(u=>u.flying&&Math.abs(u.x-2510)<300);
 return {safe:!immediate&&!siege&&!air&&close.length<2&&friends.length>=close.length+2,close:close.length,friends:friends.length,immediate,siege,air};
}
export function policyAction(g,id,notes=[]){
 if(!POLICY_IDS.includes(id))throw Error('Unknown Bram policy');
 if(id==='idle'||g.tick%100!==0||g.state.winner!==null)return;
 const own=g.state.buildings.filter(b=>b.side===0&&b.hp>0),occupied=(x,lane)=>own.some(b=>Math.hypot(b.x-x,b.y-g.map.lanes[lane])<108);
 // All active policies share the same opening, including replacement of lost rear works.
 for(const[type,x,lane]of OPENING)if(!occupied(x,lane))return g.build(type,x,g.map.lanes[lane],0);
 if(id!=='rear'&&own.length<g.map.buildLimit)for(const gate of g.state.bramBreach.gates.filter(b=>b.openedTick!==null).sort((a,b)=>a.openedTick-b.openedTick||a.lane-b.lane)){
  const safety=padSafety(g,gate.lane);
  if(id==='cautious'&&!safety.safe){notes.push({tick:g.tick,lane:gate.lane,kind:'delay',safety});continue;}
  for(const[type,x]of[['foundry',2510],['barracks',2370]])if(!occupied(x,gate.lane))return g.build(type,x,g.map.lanes[gate.lane],0);
 }
 const order=['foundry','archery','barracks','sanctum','mint'];
 const up=own.filter(b=>b.level<3&&order.includes(b.type)).sort((a,b)=>a.level-b.level||order.indexOf(a.type)-order.indexOf(b.type)||a.lane-b.lane||b.x-a.x)[0];
 if(up)return g.upgrade(up.id,0);
 for(const lane of[0,1])for(const[type,x]of[['archery',690],['barracks',550]])if(!occupied(x,lane))return g.build(type,x,g.map.lanes[lane],0);
}
