/** QA-only, untested encounter. No campaign/catalog/ruleset admission. */
import {Game} from '../../dist/engine.js';
import {deepFreeze,CITADEL_CAMPAIGN_RULESET_IDS} from '../../dist/rulesets.js';
import {actualIncome} from '../salt-stores/economy.mjs';
export const DESIGN=deepFreeze({
 id:'empty-purse-prototype',epoch:1,title:'The Empty Purse',status:'untested-awaiting-independent-review',
 baselineCommit:'65ee1438435a9e8a4cb6b8b6930ac87ca17518b7',baselineTree:'b6ee01ff93f43176a889d7fb3c226cf5ef442643',
 baselineInventorySha256:'99598b55d37e7d7c82664e5ae848ba2405e9ec244843331c410187dbc36e6123',
 numericStatus:'All encounter numbers are fresh untested design, not reconstructed history or balance evidence.',
 mapId:'classic',rulesetId:CITADEL_CAMPAIGN_RULESET_IDS[2],difficulty:'normal',ai:true,seed:9102,
 timeLimit:600,startingGold:0,enemyGold:100,startingHealth:6000,cadenceSeconds:5,
 playerBuildings:[['barracks',970,1,2],['archery',830,1,2],['watchtower',1110,0,2],['watchtower',1110,2,2],['mint',410,1,3],['mint',410,2,1]],
 enemyBuildings:[['barracks',2370,0,1],['barracks',2370,2,1],['watchtower',2090,1,2],['barracks',2230,1,2],['archery',2370,1,1],['mint',2790,1,1]],
});
export function createPrototype({seed=DESIGN.seed}={}){
 if(!Number.isSafeInteger(seed)||seed<0||seed>4294967295)throw new RangeError('Prototype seed must be uint32');
 const g=new Game({seed,difficulty:DESIGN.difficulty,ai:DESIGN.ai,mapId:DESIGN.mapId,rulesetId:DESIGN.rulesetId}),s=g.state;
 // Authoring only. Normal build/upgrade methods establish ordinary HP/investment;
 // no battle has ticked, and setup cash is replaced before instrumentation starts.
 s.buildings=[];s.effects=[];s.stats.built=[0,0];s.gold=[10000,10000];
 for(const [side,formation] of [[0,DESIGN.playerBuildings],[1,DESIGN.enemyBuildings]])for(const [type,x,lane,level] of formation){
  const r=g.build(type,x,g.map.lanes[lane],side);if(!r.ok)throw Error('Illegal Empty Purse authoring: '+r.reason);
  while(r.building.level<level){const u=g.upgrade(r.building.id,side);if(!u.ok)throw Error('Illegal inherited upgrade: '+u.reason);}
 }
 s.effects=[];s.gold=[DESIGN.startingGold,DESIGN.enemyGold];s.bases[0].hp=DESIGN.startingHealth;
 s.income=[0,1].map(side=>actualIncome(g,side));return g;
}
/** Core-only QA objective, not an admitted campaign evaluator. */
export function evaluatePrototype(g){
 const s=g.state;
 if(s.bases[0].hp<=0||s.winner===1||s.winner==='draw')return {completed:false,failed:true,reason:'player-core'};
 if(s.time>DESIGN.timeLimit+1e-7)return {completed:false,failed:true,reason:'deadline'};
 if(s.bases[1].hp<=0||s.winner===0)return {completed:true,failed:false,reason:'enemy-core'};
 if(s.time>=DESIGN.timeLimit-1e-7)return {completed:false,failed:true,reason:'deadline'};
 return {completed:false,failed:false,reason:null};
}
const B=(type,x,lane)=>({method:'build',type,x,lane});
export const SUPPORT_PLAN=deepFreeze([
 B('sanctum',690,1),B('barracks',970,0),B('archery',830,0),B('foundry',1250,0),
 B('barracks',970,2),B('archery',830,2),B('wardenLodge',1110,1),B('foundry',1250,2),B('archery',550,1),
]);
export const POLICIES=deepFreeze({
 'retain-income':{sellOne:false,description:'Keep inherited mines. Buy the fixed screened support plan when affordable, then ordinary combat-producer upgrades.'},
 'salvage-one-mine':{sellOne:true,description:'At tick zero salvage only the original full-health level-three mine; then buy the identical support plan and upgrades. Never replace the sold mine.'},
 idle:{idle:true,description:'No player commands. Inherited production and normal paid enemy continue.'},
});
/** Own-state policy. One attempt every five seconds, including failed attempts
 * and the sale. Retry each planned build until success; never rebuild or buy mines,
 * cast, buy a citadel option, or sell other assets. After the finite plan, upgrade
 * living combat producers by level/type/lane/frontmost/ID. No enemy treasury/RNG. */
export function createPolicy(id,g){
 const def=POLICIES[id];if(!def)throw Error('Unknown policy: '+id);
 const mine=g.state.buildings.find(b=>b.side===0&&b.type==='mint'&&b.level===3);
 if(!mine)throw Error('Missing original level-three mine');
 let nextTick=0,index=0,salePending=!!def.sellOne;
 const applied=[],priority=['foundry','archery','sanctum','wardenLodge','barracks'];
 return {id,applied,step(game){
  if(def.idle||game.tick<nextTick||evaluatePrototype(game).completed||evaluatePrototype(game).failed)return null;
  nextTick=game.tick+Math.round(DESIGN.cadenceSeconds/.05);
  let action,result;
  if(salePending){salePending=false;action={method:'sell',id:mine.id};result=game.sell(mine.id,0);}
  else if(index<SUPPORT_PLAN.length){action={...SUPPORT_PLAN[index]};result=game.build(action.type,action.x,game.map.lanes[action.lane],0);if(result.ok)index++;}
  else {
   const b=game.state.buildings.filter(b=>b.side===0&&b.hp>0&&b.level<3&&priority.includes(b.type))
    .sort((a,b)=>a.level-b.level||priority.indexOf(a.type)-priority.indexOf(b.type)||a.lane-b.lane||b.x-a.x||a.id-b.id)[0];
   if(!b)return null;action={method:'upgrade',id:b.id};result=game.upgrade(b.id,0);
  }
  const row={tick:game.tick,time:game.state.time,action,ok:result.ok,reason:result.reason??null,buildingId:result.building?.id??null,refund:result.refund??null};applied.push(row);return row;
 }};
}
