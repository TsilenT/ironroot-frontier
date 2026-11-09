import {observe} from '../../dist/fog.js';
const b=(type,x,lane)=>({type,x,lane});
export const POLICY_IDS=['broad-novice','screened-siege','supported-rootwarden','air-heavy','direct-rush','north-rush','safe-economy','idle'];
export const describePolicy=id=>({id,information:'Full clear player observation; one successful paid action per five seconds, including spells.'});
export function createPolicy(id){if(!POLICY_IDS.includes(id))throw Error('Unknown policy');let next=0;
return {report:()=>({decision:id}),step(g){const s=observe(g,0).state;if(id==='idle'||s.time<next||s.winner!==null)return;next=s.time+5;
 if(s.gold[0]>150&&s.spellCooldown[0]<=0){const threats=s.units.filter(u=>u.side===1&&u.x<850);const target=threats.find(u=>threats.filter(v=>Math.hypot(u.x-v.x,u.y-v.y)<g.ruleset.spell.radius).length>=5);if(target&&g.cast(target.x,target.y,0).ok)return;}
 const economy=[b('mint',270,0),b('mint',270,1)];
 const north=[b('barracks',1250,0),b('foundry',830,0),b('foundry',690,0),b('sanctum',550,0)];
 const south=[b('barracks',1250,1),b('archery',1110,1),b('archery',970,1)];
 let plan,order=['foundry','archery','barracks','wardenLodge','sanctum','aerie','mint'];
 if(id==='screened-siege')plan=[north[0],north[1],...south,north[2],north[3],...economy];
 else if(id==='supported-rootwarden'){plan=[b('barracks',1250,0),b('wardenLodge',1250,1),b('archery',1110,1),b('foundry',830,0),b('archery',970,1),b('sanctum',690,1),b('archery',550,1),...economy];order=['archery','sanctum','wardenLodge','foundry','barracks','mint'];}
 else if(id==='broad-novice'){plan=[b('barracks',1250,0),...south,...economy,b('barracks',690,1),b('archery',690,0),b('barracks',550,0),b('archery',550,1)];order=['barracks','archery','mint'];}
 else if(id==='air-heavy')plan=[b('aerie',1250,1),b('aerie',1110,1),b('aerie',1250,0),...economy,b('aerie',690,1),b('aerie',830,0),b('archery',550,1)];
 else if(id==='north-rush')plan=[b('barracks',1250,0),b('barracks',830,0),b('barracks',690,0),b('archery',550,0),...south,...economy];
 else if(id==='direct-rush')plan=[b('barracks',1250,1),b('barracks',1110,1),b('barracks',970,1),b('archery',690,1),b('barracks',550,1),b('barracks',1250,0),...economy,b('archery',690,0)];
 else plan=[...economy,b('watchtower',690,0),...south,...north];
 const own=s.buildings.filter(u=>u.side===0);
 for(const item of plan){if(own.some(u=>Math.hypot(u.x-item.x,u.y-g.map.lanes[item.lane])<108))continue;g.build(item.type,item.x,g.map.lanes[item.lane],0);return;}
 const up=own.filter(u=>u.level<3&&order.includes(u.type)).sort((a,b)=>a.level-b.level||order.indexOf(a.type)-order.indexOf(b.type)||b.x-a.x);if(up[0])g.upgrade(up[0].id,0);
}};}
