import {observe} from '../../dist/fog.js';
const site=(type,x,lane)=>({type,x,lane});
const rearMines=[site('mint',270,0),site('mint',270,2)];
const assault=(lane)=>[site('barracks',1250,lane),site('foundry',1110,lane),site('archery',970,lane),site('sanctum',690,lane)];
const pair=(a,b)=>{const x=assault(a),y=assault(b);return [x[0],x[1],y[0],y[1],x[2],y[2],...rearMines,x[3],y[3]];};
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
export const POLICY_DEFINITIONS=freeze({
 'outer-pair':{intent:'Commit siege and screens to North Watch and South Sanctum; middle inherited barracks remains.',plan:pair(0,2)},
 'north-middle':{intent:'Commit siege and screens to North Watch and Middle Foundry.',plan:pair(0,1)},
 'middle-south':{intent:'Commit siege and screens to Middle Foundry and South Sanctum.',plan:pair(1,2)},
 'screened-siege':{intent:'Strong north siege screen plus a supported southern push.',plan:[site('barracks',1250,0),site('foundry',1110,0),site('barracks',1250,2),site('archery',1110,2),site('foundry',970,0),site('sanctum',970,2),site('archery',690,0),...rearMines,site('foundry',550,0)]},
 'supported-rootwarden':{intent:'Rootwarden screens with ranged and siege support on the outer lanes.',plan:[site('wardenLodge',1250,0),site('foundry',1110,0),site('wardenLodge',1250,2),site('archery',1110,2),site('sanctum',970,2),site('archery',970,0),...rearMines,site('foundry',690,0),site('archery',690,2)],upgradeOrder:['archery','sanctum','wardenLodge','foundry','barracks','mint']},
 'core-rush':{intent:'Single southern road attack may reach the core after one target; core bypass is valid.',plan:[site('barracks',1250,2),site('archery',1110,2),site('barracks',970,2),site('foundry',690,2),site('sanctum',550,2),site('archery',410,2),...rearMines,site('barracks',1250,1),site('archery',1110,1)]},
 'air-core':{intent:'Concentrate automatic flyers on the middle road, supported by ranged ground troops.',plan:[site('aerie',1250,1),site('aerie',1110,1),site('archery',970,1),site('aerie',690,1),site('archery',550,1),...rearMines,site('aerie',1250,2),site('archery',1110,2)]},
 'broad-novice':{intent:'Spread infantry and archers across all three roads and add ordinary mines.',plan:[site('barracks',1250,0),site('archery',1250,1),site('barracks',1250,2),site('archery',1110,0),site('archery',1110,2),...rearMines,site('barracks',970,1),site('archery',690,0),site('archery',690,2)],upgradeOrder:['barracks','archery','mint']},
 idle:{intent:'No player actions; measures the ordinary adaptive opposition.',plan:[]}
});
export const POLICY_IDS=Object.freeze(Object.keys(POLICY_DEFINITIONS));
export function describePolicy(id){if(!POLICY_DEFINITIONS[id])throw Error('Unknown policy: '+id);return structuredClone({id,...POLICY_DEFINITIONS[id],information:'Clear player observation only. No direct state writes. At most one successful action per five seconds. Volley shares that cadence.',volley:'At least five visible enemy troops clustered within spell radius at x < 850, gold > 150, and cooldown ready.'});}
export function createPolicy(id){
 const definition=POLICY_DEFINITIONS[id];if(!definition)throw Error('Unknown policy: '+id);
 let next=0,actions=0;
 return {report:()=>({id,actions,next}),step(g){
  const s=observe(g,0).state;if(id==='idle'||s.time+1e-7<next||s.winner!==null)return;
  const commit=result=>{if(result.ok){actions++;next=s.time+5;}return result;};
  if(s.gold[0]>150&&s.spellCooldown[0]<=0){const threats=s.units.filter(u=>u.side===1&&u.x<850),target=threats.find(u=>threats.filter(v=>Math.hypot(u.x-v.x,u.y-v.y)<g.ruleset.spell.radius).length>=5);if(target&&commit(g.cast(target.x,target.y,0)).ok)return;}
  const own=s.buildings.filter(b=>b.side===0&&b.hp>0);
  for(const item of definition.plan){if(own.some(b=>Math.hypot(b.x-item.x,b.y-g.map.lanes[item.lane])<108))continue;commit(g.build(item.type,item.x,g.map.lanes[item.lane],0));return;}
  const order=definition.upgradeOrder??['foundry','archery','barracks','wardenLodge','sanctum','aerie','mint'];
  const up=own.filter(b=>b.level<3&&order.includes(b.type)).sort((a,b)=>a.level-b.level||order.indexOf(a.type)-order.indexOf(b.type)||b.x-a.x||a.lane-b.lane);
  if(up[0])commit(g.upgrade(up[0].id,0));
 }};
}
