/** Closed fixed hypothesis. Policy reads only permitted observations, never enemy treasury. */
import {observe} from '../../dist/fog.js';
import {deepFreeze} from '../../dist/rulesets.js';
export const DECISION_TICK=2400;
export const PROBE=deepFreeze([
 {tick:0,type:'barracks',x:1250,lane:0},{tick:100,type:'barracks',x:1250,lane:2},
 {tick:200,type:'archery',x:1110,lane:0},{tick:300,type:'archery',x:1110,lane:2},
 {tick:1200,type:'foundry',x:970,lane:0},{tick:1300,type:'foundry',x:970,lane:2},
]);
export const POLICIES=deepFreeze(Object.fromEntries(['fresh-contact','stale-contact','omniscient-diagnostic'].map(id=>[id,{id,decisionTick:DECISION_TICK,budgetCap:270,probe:PROBE,afterDecision:'No further player commands; ordinary production/combat continue.'}])));
const fields=(v,keys)=>!!v&&Object.getPrototypeOf(v)===Object.prototype&&Object.keys(v).length===keys.length&&keys.every(k=>Object.hasOwn(v,k));
const uint=n=>Number.isSafeInteger(n)&&n>=0;
export function contact(b,time){return {id:b.id,type:b.type,side:b.side,x:b.x,y:b.y,lane:b.lane,level:b.level,observedAt:time};}
export function validateContacts(rows,time){
 if(!Array.isArray(rows)||rows.length>64)throw Error('Invalid contact list');let prior=0;
 for(const b of rows){if(!fields(b,['id','type','side','x','y','lane','level','observedAt'])||!uint(b.id)||b.id<=prior||!['barracks','archery','foundry','watchtower','mint','sanctum','aerie','wardenLodge'].includes(b.type)||b.side!==1||![0,2].includes(b.lane)||b.y!==[260,450,640][b.lane]||!Number.isFinite(b.x)||b.x<1880||b.x>3000||![1,2,3].includes(b.level)||!Number.isFinite(b.observedAt)||b.observedAt<0||b.observedAt>time+1e-7)throw Error('Invalid contact record');prior=b.id;}
 return rows;
}
export function validatePolicyState(s,{tick=null}={}){
 if(!fields(s,['epoch','policyId','nextProbeIndex','firstContacts','decision'])||s.epoch!==2||!Object.hasOwn(POLICIES,s.policyId)||!uint(s.nextProbeIndex)||s.nextProbeIndex>PROBE.length||!Array.isArray(s.firstContacts)||s.firstContacts.length!==2)throw Error('Invalid policy envelope');
 const bound=tick??12000;
 if(tick!==null&&(s.nextProbeIndex<PROBE.filter(p=>p.tick<tick).length||s.nextProbeIndex>PROBE.filter(p=>p.tick<=tick).length))throw Error('Probe phase contradicts engine tick');
 if(tick!==null&&tick>DECISION_TICK&&s.decision===null)throw Error('Missing past decision');
 for(const [i,r] of s.firstContacts.entries())if(r!==null){if(!fields(r,['lane','tick','buildings'])||r.lane!==[0,2][i]||!uint(r.tick)||r.tick>bound||!Array.isArray(r.buildings)||r.buildings.length===0)throw Error('Invalid first-contact envelope');validateContacts(r.buildings,r.tick*.05);if(r.buildings.some(b=>b.lane!==r.lane||Math.abs(b.observedAt-r.tick*.05)>1e-7))throw Error('Wrong first-contact road');}
 if(s.decision!==null){const d=s.decision;if(!fields(d,['tick','type','lane','x','source','contacts','ok','reason','cost'])||d.tick!==DECISION_TICK||d.tick>bound||!['archery','foundry','sanctum'].includes(d.type)||![0,2].includes(d.lane)||d.x!==550||d.source!==s.policyId||typeof d.ok!=='boolean'||!(d.reason===null||typeof d.reason==='string')||!Number.isFinite(d.cost)||d.cost<0||d.cost>270)throw Error('Invalid decision envelope');validateContacts(d.contacts,d.tick*.05);const expected=chooseCounter(d.contacts);if(d.type!==expected.type||d.lane!==expected.lane||d.cost!==(d.ok?{archery:175,foundry:270,sanctum:230}[d.type]:0))throw Error('Decision contradicts fixed rule or ordinary price');}
 return s;
}
// Public opening chart, not engine/treasury knowledge. Replacements at these
// plots are conservatively ignored too; the question is off-chart construction.
export const OPENING_CHART=deepFreeze([0,2].flatMap(lane=>[
 {lane,x:1950,type:'watchtower'},{lane,x:2090,type:'barracks'},{lane,x:2370,type:'archery'}]));
export const isChartedPlot=b=>OPENING_CHART.some(p=>p.lane===b.lane&&p.x===b.x);
export function chooseCounter(contacts){
 contacts=contacts.filter(b=>!isChartedPlot(b));
 const roads=[0,2].map(lane=>{const own=contacts.filter(b=>b.lane===lane);return {lane,contacts:own,score:own.reduce((n,b)=>n+({aerie:4,sanctum:2,watchtower:1}[b.type]??.25),0)};}).sort((a,b)=>b.score-a.score||a.lane-b.lane);
 const road=roads[0],type=road.contacts.some(b=>b.type==='aerie')?'archery':road.contacts.some(b=>b.type==='watchtower')?'foundry':'sanctum';
 return {type,lane:road.lane,x:550};
}
export function createPolicy(id,{state}={}){
 if(!Object.hasOwn(POLICIES,id))throw Error('Unknown policy');
 const s=state===undefined?{epoch:2,policyId:id,nextProbeIndex:0,firstContacts:[null,null],decision:null}:structuredClone(validatePolicyState(state));if(s.policyId!==id)throw Error('Cross-policy restore');
 return {id,snapshot:()=>structuredClone(s),step(game){
  if(s.decision||game.state.winner!==null||game.state.bases[0].hp<=0||game.state.time>=600-1e-7)return null;
  const view=observe(game,0),visible=view.state.buildings.filter(b=>b.side===1&&[0,2].includes(b.lane));
  for(const [i,lane] of [0,2].entries())if(s.firstContacts[i]===null){const buildings=visible.filter(b=>b.lane===lane).map(b=>contact(b,game.state.time)).sort((a,b)=>a.id-b.id);if(buildings.length)s.firstContacts[i]={lane,tick:game.tick,buildings};}
  const probe=PROBE[s.nextProbeIndex];
  if(probe&&game.tick>=probe.tick){if(game.tick!==probe.tick)throw Error('Missed fixed probe tick');s.nextProbeIndex++;const before=game.state.gold[0],result=game.build(probe.type,probe.x,game.map.lanes[probe.lane],0);return {kind:'common-probe',...probe,ok:result.ok,reason:result.reason??null,cost:before-game.state.gold[0]};}
  if(!s.decision&&game.tick>=DECISION_TICK){
   if(game.tick!==DECISION_TICK||s.nextProbeIndex!==PROBE.length)throw Error('Missed decision or incomplete common probe');
   let contacts;if(id==='stale-contact')contacts=s.firstContacts.flatMap(r=>r?.buildings??[]);
   else if(id==='omniscient-diagnostic')contacts=game.state.buildings.filter(b=>b.side===1&&b.hp>0&&[0,2].includes(b.lane)).map(b=>contact(b,game.state.time));
   else contacts=[...visible.map(b=>contact(b,game.state.time)),...view.fog.memories.filter(b=>[0,2].includes(b.lane)).map(b=>({...b}))];
   contacts.sort((a,b)=>a.id-b.id);validateContacts(contacts,game.state.time);const choice=chooseCounter(contacts),before=game.state.gold[0],result=game.build(choice.type,choice.x,game.map.lanes[choice.lane],0);
   s.decision={tick:game.tick,...choice,source:id,contacts,ok:result.ok,reason:result.reason??null,cost:before-game.state.gold[0]};return {kind:'decision',...structuredClone(s.decision)};
  }
  return null;
 }};
}
