import {observe}from'../../dist/fog.js';
const site=(type,x,lane)=>({type,x,lane});const mine=[site('mint',270,0),site('mint',270,2)];
export const POLICY_IDS=Object.freeze(['intercept','oppositeflank','centerbreach','rootwarden','broadnovice','economy','mixedair','unsupportedair','idle']);
export const POLICY_DESCRIPTION=Object.freeze({cadence:'One successful paid player action per 5s, no spells or citadel choice in this bounded first matrix. Ordinary public build/upgrade APIs only. Fixed plans skip occupied sites and wait on first empty unaffordable site; rebuilt sites are paid again.',information:'Player observation only. Intercept/oppositeflank remember the lane of the first visible foundry; they never read enemy commitment, gold or planned purchases.',upgradeOrder:['foundry','archery','barracks','sanctum','wardenLodge','aerie','mint']});
function plan(id,lane){const other=lane===0?2:0,cover=[site('archery',830,0),site('archery',830,2)],support=[site('barracks',1250,lane),site('foundry',1110,lane),site('archery',690,lane),site('sanctum',550,lane),site('foundry',410,lane),...mine,site('barracks',1250,other),site('archery',1110,other)];
 if(['intercept','oppositeflank','centerbreach'].includes(id))return[...cover,...support];
 if(id==='rootwarden')return[...cover,site('wardenLodge',1250,lane),site('foundry',1110,lane),site('archery',690,lane),site('sanctum',550,lane),...mine,site('foundry',410,lane)];
 if(id==='economy')return[...mine,...cover,site('watchtower',1250,0),site('watchtower',1250,2),...support];
 if(id==='mixedair')return[...cover,site('aerie',1250,lane),site('barracks',1110,lane),site('foundry',690,lane),site('archery',550,lane),site('aerie',410,lane),...mine];
 if(id==='unsupportedair')return[site('aerie',1250,1),site('aerie',1110,1),site('aerie',690,1),site('aerie',1250,0),site('aerie',1110,0),site('aerie',1250,2),site('aerie',1110,2)];
 if(id==='broadnovice')return[...cover,site('barracks',1250,0),site('barracks',1250,2),site('archery',1110,0),site('archery',1110,2),...mine,site('barracks',1250,1),site('foundry',1110,1),site('foundry',690,0),site('foundry',690,2)];return[];
}
export function createPolicy(id){if(!POLICY_IDS.includes(id))throw Error('Unknown policy');let next=0,actions=0,observedFoundryLane=null;return{report:()=>({id,next,actions,observedFoundryLane}),step(g){const s=observe(g,0).state;if(id==='idle'||s.time+1e-7<next||s.winner!==null)return;const foundry=s.buildings.filter(b=>b.side===1&&b.type==='foundry'&&b.hp>0).sort((a,b)=>a.id-b.id)[0];if(observedFoundryLane===null&&foundry)observedFoundryLane=foundry.lane;
 // Initial observation is genuinely absent before first construction. Take only the
 // common outer-archery opening until a foundry is visible for adaptive policies.
 const adaptive=['intercept','oppositeflank'].includes(id),lane=id==='centerbreach'?1:adaptive&&observedFoundryLane!==null?(id==='intercept'?observedFoundryLane:observedFoundryLane===0?2:0):0;
 const d=adaptive&&observedFoundryLane===null?[site('archery',830,0),site('archery',830,2)]:plan(id,lane),own=s.buildings.filter(b=>b.side===0&&b.hp>0),commit=r=>{if(r.ok){actions++;next=s.time+5;}return r;};
 for(const p of d){if(own.some(b=>Math.hypot(b.x-p.x,b.y-g.map.lanes[p.lane])<108))continue;commit(g.build(p.type,p.x,g.map.lanes[p.lane],0));return;}
 if(adaptive&&observedFoundryLane===null)return;
 const order=id==='unsupportedair'?['aerie']:POLICY_DESCRIPTION.upgradeOrder,up=own.filter(b=>b.level<3&&order.includes(b.type)).sort((a,b)=>a.level-b.level||order.indexOf(a.type)-order.indexOf(b.type)||b.x-a.x||a.lane-b.lane);if(up[0])commit(g.upgrade(up[0].id,0));
}};}
export function describePolicy(id){return{id,...POLICY_DESCRIPTION,initialPlan:plan(id,id==='centerbreach'?1:0),adaptation:['intercept','oppositeflank'].includes(id)?'Choose from first visible foundry; no private policy state.':null};}
