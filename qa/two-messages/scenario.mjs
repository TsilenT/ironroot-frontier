/** Private experiment envelope. Actual Game retains exact registered fog parent. */
import {Game} from '../../dist/engine.js';
import {LANTERNS_RULESET_ID,deepFreeze} from '../../dist/rulesets.js';
import {createFog,refreshFog,supportsFog} from '../../dist/fog.js';
import {actualIncome} from '../salt-stores/economy.mjs';
import {validatePolicyState} from './policies.mjs';
export const QA_IDENTITY=deepFreeze({id:'qa-two-messages-e1',revision:1,parentRulesetId:LANTERNS_RULESET_ID,parentRulesetRevision:1});
export const DESIGN=deepFreeze({id:'two-messages',epoch:1,status:'closed-untested-hypothesis',baselineCommit:'fe8124d9a4654797996f9dd88f4eb74192291341',baselineTree:'7ec5d6a1f10ef802121f65db6c1c3aa02c9948a2',parentRulesetId:LANTERNS_RULESET_ID,mapId:'classic',difficulty:'normal',ai:true,seeds:[9501,9502],seed:9501,timeLimit:600,decisionTime:180,comparisonTime:240,startingGold:1100,enemyGold:100,startingHealth:6000,
 playerBuildings:[['barracks',830,0],['archery',690,0],['barracks',830,1],['archery',690,1],['barracks',830,2],['archery',690,2],['mint',410,1]],
 enemyBuildings:[['watchtower',1950,0],['barracks',2090,0],['archery',2370,0],['barracks',2090,1],['archery',2370,1],['watchtower',1950,2],['barracks',2090,2],['sanctum',2370,2],['mint',2790,1]],
});
const owned=new WeakMap();
export function createPrototype({seed=DESIGN.seed}={}){
 if(!DESIGN.seeds.includes(seed))throw Error('Only two preset closed seeds');
 const g=new Game({seed,difficulty:DESIGN.difficulty,ai:true,mapId:'classic',rulesetId:DESIGN.parentRulesetId}),s=g.state;
 s.buildings=[];s.effects=[];s.stats.built=[0,0];s.gold=[10000,10000];
 for(const [side,formation] of [[0,DESIGN.playerBuildings],[1,DESIGN.enemyBuildings]])for(const [type,x,lane] of formation){const r=g.build(type,x,g.map.lanes[lane],side);if(!r.ok)throw Error('Illegal authored setup: '+r.reason);}
 s.effects=[];s.gold=[DESIGN.startingGold,DESIGN.enemyGold];s.bases[0].hp=DESIGN.startingHealth;s.income=[0,1].map(side=>actualIncome(g,side));
 // Authoring is not reconnaissance: retain only genuine final-opening sight.
 s.fog=createFog();refreshFog(g);if(!supportsFog(g.ruleset))throw Error('Actual parent fog required');owned.set(g,seed);return g;
}
export function evaluatePrototype(g){const s=g.state;if(s.bases[0].hp<=0||s.winner===1||s.winner==='draw')return {completed:false,failed:true,reason:'player-core'};if(s.time>600+1e-7)return {completed:false,failed:true,reason:'deadline'};if(s.bases[1].hp<=0||s.winner===0)return {completed:true,failed:false,reason:'enemy-core'};if(s.time>=600-1e-7)return {completed:false,failed:true,reason:'deadline'};return {completed:false,failed:false,reason:null};}
export function savePrototype(game,policyState=null){
 if(!owned.has(game)||game.ruleset.id!==DESIGN.parentRulesetId||!supportsFog(game.ruleset))throw Error('Not this experiment Game');
 if(policyState!==null)validatePolicyState(policyState,{tick:game.tick});
 return {format:'two-messages-private-envelope-v1',experimentId:QA_IDENTITY.id,epoch:1,constructionSeed:owned.get(game),engine:game.serialize(),policyState:structuredClone(policyState)};
}
export function restorePrototype(packet){
 const keys=['format','experimentId','epoch','constructionSeed','engine','policyState'];if(!packet||Object.getPrototypeOf(packet)!==Object.prototype||Object.keys(packet).length!==keys.length||keys.some(k=>!Object.hasOwn(packet,k))||packet.format!=='two-messages-private-envelope-v1'||packet.experimentId!==QA_IDENTITY.id||packet.epoch!==1||!DESIGN.seeds.includes(packet.constructionSeed))throw Error('Invalid private experiment identity');
 const p=structuredClone(packet),e=p.engine;if(e.version!==3||e.rulesetId!==DESIGN.parentRulesetId||e.rulesetRevision!==1||e.mapId!=='classic'||e.mapRevision!==1||e.difficulty!=='normal'||e.ai!==true)throw Error('Wrong real fog parent');
 const game=Game.restore(e);if(!supportsFog(game.ruleset)||Math.abs(game.state.time-game.tick*.05)>1e-7||game.state.time>600+1e-7||game.state.overtime!==(game.state.time>=300))throw Error('Invalid experiment clock/fog');
 if(p.policyState!==null)validatePolicyState(p.policyState,{tick:game.tick});owned.set(game,p.constructionSeed);return {game,policyState:p.policyState};
}
