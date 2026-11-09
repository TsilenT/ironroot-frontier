/** Isolated QA-only new design. No catalog, ruleset, unlock or version admission. */
import {Game} from '../../dist/engine.js';
import {deepFreeze,CITADEL_CAMPAIGN_RULESET_IDS} from '../../dist/rulesets.js';
import {actualIncome} from '../salt-stores/economy.mjs';
export const DESIGN=deepFreeze({
 id:'camp-kept-prototype',epoch:1,title:'The Camp We Kept',
 baselineCommit:'e3ef4e160b6d223484820dbe102961ef7d31e39b',baselineTree:'9e764d661d2942af123ed0f65c277c2a728e06e6',
 numericStatus:'New untested design hypotheses, not recovered historical numbers or balance evidence.',
 mapId:'classic',rulesetId:CITADEL_CAMPAIGN_RULESET_IDS[2],difficulty:'normal',ai:true,
 seed:9101,timeLimit:600,startingHealth:2700,startingGold:700,enemyGold:100,cadenceSeconds:5,
 playerBuildings:[['barracks',830,0],['barracks',830,1],['archery',690,1],['mint',410,1]],
 enemyBuildings:[['barracks',2090,0],['archery',2370,0],['barracks',1950,1],['foundry',2230,1],['aerie',1950,2],['barracks',2230,2],['mint',2790,1]],
});
export function createPrototype({seed=DESIGN.seed,health='wounded'}={}){
 if(!Number.isSafeInteger(seed)||seed<0||seed>4294967295)throw new RangeError('Seed must be uint32');
 if(!['wounded','full'].includes(health))throw new RangeError('Unknown health control');
 const g=new Game({seed,mapId:DESIGN.mapId,rulesetId:DESIGN.rulesetId,difficulty:DESIGN.difficulty,ai:DESIGN.ai}),s=g.state;
 s.buildings=[];s.effects=[];s.stats.built=[0,0];s.gold=[10000,10000];
 for(const [side,formation] of [[0,DESIGN.playerBuildings],[1,DESIGN.enemyBuildings]])for(const [type,x,lane] of formation){
  const r=g.build(type,x,g.map.lanes[lane],side);if(!r.ok)throw Error('Invalid Camp formation: '+r.reason);
 }
 s.effects=[];s.gold=[DESIGN.startingGold,DESIGN.enemyGold];s.bases[0].hp=health==='full'?6000:DESIGN.startingHealth;
 s.income=[0,1].map(side=>actualIncome(g,side));return g;
}
export function evaluatePrototype(g){
 const s=g.state;
 if(s.bases[0].hp<=0||s.winner===1||s.winner==='draw')return {completed:false,failed:true,reason:'player-core'};
 if(s.bases[1].hp<=0||s.winner===0)return {completed:true,failed:false,reason:'enemy-core'};
 if(s.time>=DESIGN.timeLimit-1e-7)return {completed:false,failed:true,reason:'deadline'};
 return {completed:false,failed:false,reason:null};
}
const B=(type,x,lane)=>({method:'build',type,x,lane}),C=choice=>({method:'citadel',choice});
const support=[B('barracks',970,2),B('archery',690,0),B('sanctum',970,1),B('foundry',1250,1),B('archery',1110,2),B('wardenLodge',1110,0),B('aerie',970,0)];
export const POLICIES=deepFreeze({
 counterattack:{description:'Fund middle siege first, then southern anti-air and ground splash; develop income after these attack commitments. No citadel purchase.',plan:[B('foundry',1110,1),B('archery',830,2),B('sanctum',1250,1),B('mint',410,0),B('mint',410,2),...support.filter(a=>!(a.type==='foundry'&&a.x===1250&&a.lane===1))]},
 'regen-income':{description:'Buy slow citadel regeneration first, southern anti-air next, then both mines before middle siege and continued support.',plan:[C('regen'),B('archery',830,2),B('mint',410,0),B('mint',410,2),B('foundry',1110,1),...support]},
 'arrows-income':{description:'The same recovery-income build order with the other ordinary 190-gold citadel choice. Extra Arrow can limit leaks; it cannot heal.',plan:[C('arrows'),B('archery',830,2),B('mint',410,0),B('mint',410,2),B('foundry',1110,1),...support]},
 'greedy-recovery':{description:'A plausible over-greedy opening: both mines and regeneration before southern anti-air or added offense.',plan:[B('mint',410,0),B('mint',410,2),C('regen'),B('archery',830,2),B('foundry',1110,1),...support]},
 idle:{description:'No player actions. The inherited factories still produce, and the normal paid opponent remains active.',plan:[]},
});
/** Fixed own-state plans, one attempt per 5 seconds from tick zero. Retry the next
 * item until paid. Never rebuild, sell, cast or inspect enemy treasury/RNG. Then
 * upgrade surviving producers by level, type priority, lane, frontmost, ID. */
export function createPolicy(id){
 const def=POLICIES[id];if(!def)throw Error('Unknown Camp policy');let index=0,nextTick=0;
 const commands=[],priority=['foundry','archery','sanctum','wardenLodge','barracks','aerie'];
 return {commands,step(g){
  const outcome=evaluatePrototype(g);if(outcome.completed||outcome.failed||id==='idle'||g.tick<nextTick)return null;
  nextTick=g.tick+Math.round(DESIGN.cadenceSeconds/.05);let a=def.plan[index],r;
  if(a){a={...a};r=a.method==='citadel'?g.buyCitadelOption(a.choice):g.build(a.type,a.x,g.map.lanes[a.lane]);if(r.ok)index++;}
  else {const b=g.state.buildings.filter(b=>b.side===0&&b.hp>0&&b.level<3&&priority.includes(b.type)).sort((a,b)=>a.level-b.level||priority.indexOf(a.type)-priority.indexOf(b.type)||a.lane-b.lane||b.x-a.x||a.id-b.id)[0];if(!b)return null;a={method:'upgrade',id:b.id,type:b.type,x:b.x,lane:b.lane,fromLevel:b.level};r=g.upgrade(b.id);}
  const row={tick:g.tick,time:g.state.time,action:a,ok:r.ok,reason:r.reason??null};commands.push(row);return row;
 }};
}
