/** All decisions use observe(game,0); only immutable map/rules constants are read separately. */
import {observe} from '../../dist/fog.js';
const b=(type,x,lane)=>({type,x,lane});
export const POLICY_IDS=['scout-adapt','screened-siege','broad-budget','broad-novice','air-heavy','direct-rush','safe-economy','scout-adapt-5s','screened-siege-5s','direct-rush-5s','idle'];
export const describePolicy=id=>({id,information:'Detached player observation only; normal paid actions.'});
export function createPolicy(id){if(!POLICY_IDS.includes(id))throw Error('Unknown policy');const paced=id==='broad-novice'||id.endsWith('-5s'),strategy=id.replace(/-5s$/,'');let next=0,decision=null;
return {report:()=>({decision}),step(g){const s=observe(g,0).state;if(strategy==='idle'||s.time<next||s.winner!==null)return;next=s.time+(paced?5:1);
 if(s.gold[0]>150&&s.spellCooldown[0]<=0){const threats=s.units.filter(u=>u.side===1&&u.x<850);const target=threats.find(u=>threats.filter(v=>Math.hypot(u.x-v.x,u.y-v.y)<g.ruleset.spell.radius).length>=5);if(target&&g.cast(target.x,target.y,0).ok&&paced)return;}
 const screen=[b('barracks',1250,1),b('foundry',830,1),b('foundry',690,1),b('sanctum',550,1)];
 const sides=[b('archery',1110,0),b('archery',1110,2),b('barracks',1250,0),b('barracks',1250,2)];
 const economy=[b('mint',270,0),b('mint',270,2)];
 let plan,order=['foundry','archery','barracks','sanctum','aerie','mint'];
 if(strategy==='scout-adapt'){
  const enemies=[...s.units,...s.buildings].filter(u=>u.side===1);
  if(enemies.length&&((!decision&&s.time>=20)||(decision?.response!=='anti-air'&&enemies.some(u=>u.type==='gryphon'||u.type==='aerie')))){const air=enemies.some(u=>u.type==='gryphon'||u.type==='aerie');decision={time:s.time,response:air?'anti-air':'screened-ground',contacts:enemies.map(u=>({type:u.type,lane:u.lane}))};}
  plan=[b('barracks',1250,1),b('archery',1110,0),b('archery',1110,2)];
  if(decision)plan.push(...(decision.response==='anti-air'?[b('barracks',1250,0),b('barracks',1250,2),b('archery',970,0),b('archery',970,2)]:[]),...screen,...sides,...economy,b('archery',970,2),b('archery',970,0));
 }else if(strategy==='screened-siege')plan=[screen[0],screen[1],...sides,screen[2],screen[3],...economy,b('sanctum',970,0),b('sanctum',970,2)];
 else if((strategy==='broad-budget'||strategy==='broad-novice')){plan=[...[0,1,2].map(l=>b('barracks',1250,l)),b('archery',1110,0),b('archery',1110,2),...economy,...[0,2].map(l=>b('barracks',970,l)),...[0,1,2].map(l=>b('archery',690,l)),...[0,1,2].map(l=>b('barracks',550,l))];order=['barracks','archery','mint'];}
 else if(strategy==='air-heavy')plan=[...[0,1,2].map(l=>b('aerie',1250,l)),...economy,...[0,2].map(l=>b('aerie',1110,l)),b('aerie',830,1),...[0,1,2].map(l=>b('archery',690,l))];
 else if(strategy==='direct-rush')plan=[b('barracks',1250,1),b('barracks',830,1),b('barracks',690,1),b('barracks',550,1),b('archery',270,1),...sides,...economy];
 else plan=[...economy,b('watchtower',690,0),b('watchtower',690,2),...sides,...screen];
 const own=()=>observe(g,0).state.buildings.filter(u=>u.side===0);
 for(const item of plan){if(own().some(u=>Math.hypot(u.x-item.x,u.y-g.map.lanes[item.lane])<108))continue;if(!g.build(item.type,item.x,g.map.lanes[item.lane],0).ok)return;if(paced)return;}
 if(strategy==='scout-adapt'&&!decision)return;
 const up=own().filter(u=>u.level<3&&order.includes(u.type)).sort((a,b)=>a.level-b.level||order.indexOf(a.type)-order.indexOf(b.type)||b.x-a.x);if(up[0])g.upgrade(up[0].id,0);
}};}
