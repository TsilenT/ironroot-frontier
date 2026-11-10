/** QA-only fresh hypothesis. Nothing here admits a ruleset or campaign mission. */
import {Game} from '../../dist/engine.js';
import {CITADEL_CAMPAIGN_RULESET_IDS,deepFreeze} from '../../dist/rulesets.js';
import {CAMPAIGN_CONTROL,createCampaignControl,validateCampaignControl,campaignControlStatus} from '../../dist/bridge-control.js';
import {actualIncome} from '../salt-stores/economy.mjs';

export const DESIGN=deepFreeze({
 id:'leave-no-road-closed',epoch:1,title:'Leave No Road Closed',status:'fresh-design-natural-cases-unopened',
 baselineCommit:'65ee1438435a9e8a4cb6b8b6930ac87ca17518b7',baselineTree:'b6ee01ff93f43176a889d7fb3c226cf5ef442643',
 numericStatus:'All formation, purse, seed and policy choices are new hypotheses, not balance evidence.',
 parentRulesetId:CITADEL_CAMPAIGN_RULESET_IDS[2],mapId:'classic',difficulty:'normal',ai:true,
 seed:9305,timeLimit:600,seconds:30,requiredBridges:3,startingGold:900,enemyGold:100,startingHealth:6000,cadenceTicks:100,
 playerBuildings:[['barracks',1110,0],['archery',970,0],['barracks',1110,1],['archery',970,1],['mint',410,1]],
 enemyBuildings:[['barracks',2090,0],['archery',2370,0],['barracks',1950,1],['sanctum',2230,1],['barracks',1950,2],['archery',2230,2],['mint',2790,1]],
});
const PARENT=new Game({rulesetId:DESIGN.parentRulesetId,ai:false}).ruleset;
export const QA_RULES=deepFreeze(Object.fromEntries([2,3].map(required=>[required,{
 ...PARENT,id:`qa-leave-no-road-closed-e1-${required}`,name:`QA only · Leave No Road Closed · ${required} crossings`,qaOnly:true,
 campaignControl:{...CAMPAIGN_CONTROL,requiredBridges:required,seconds:DESIGN.seconds,timeLimit:DESIGN.timeLimit},
}])));

/** Rebind a freshly validated whole Game to an unregistered immutable QA rule.
 * Native Game constructor/restore intentionally reject these identities. This
 * adapter lets the actual native _step run control BEFORE regeneration and AI.
 * No production descriptor, state schema or method implementation is patched. */
export function bindQAControl(game,required=3,control=createCampaignControl(game.map)){
 if(![2,3].includes(required)||game.ruleset.id!==DESIGN.parentRulesetId||game.map.id!=='classic'||game.map.revision!==1)throw Error('Unsupported QA control binding');
 const descriptors=Object.getOwnPropertyDescriptors(game);
 descriptors.ruleset={...descriptors.ruleset,value:QA_RULES[required]};
 const bound=Object.create(Object.getPrototypeOf(game),descriptors);
 bound.state.campaignControl=control;
 return bound;
}
export function createPrototype({seed=DESIGN.seed,requiredBridges=3}={}){
 if(!Number.isSafeInteger(seed)||seed<0||seed>4294967295)throw new RangeError('Seed must be uint32');
 const base=new Game({seed,difficulty:DESIGN.difficulty,ai:DESIGN.ai,mapId:DESIGN.mapId,rulesetId:DESIGN.parentRulesetId}),s=base.state;
 s.buildings=[];s.effects=[];s.stats.built=[0,0];s.gold=[10000,10000];
 for(const [side,formation] of [[0,DESIGN.playerBuildings],[1,DESIGN.enemyBuildings]])for(const [type,x,lane] of formation){
  const result=base.build(type,x,base.map.lanes[lane],side);
  if(!result.ok)throw Error('Illegal QA formation: '+result.reason);
 }
 s.effects=[];s.gold=[DESIGN.startingGold,DESIGN.enemyGold];s.bases[0].hp=DESIGN.startingHealth;
 s.income=[0,1].map(side=>actualIncome(base,side));
 return bindQAControl(base,requiredBridges);
}
export function evaluatePrototype(game){
 const s=game.state;
 if(s.bases[0].hp<=0||s.winner===1||s.winner==='draw')return {completed:false,failed:true,reason:'player-core'};
 if(s.time>DESIGN.timeLimit+1e-7)return {completed:false,failed:true,reason:'deadline'};
 if(s.bases[1].hp<=0||s.winner===0)return {completed:true,failed:false,reason:'enemy-core'};
 if(campaignControlStatus(game).complete)return {completed:true,failed:false,reason:'control'};
 if(s.time>=DESIGN.timeLimit-1e-7)return {completed:false,failed:true,reason:'deadline'};
 return {completed:false,failed:false,reason:null};
}
/** Private QA envelope, never a campaign/battle-codec/profile save. */
export function savePrototype(game){
 if(game.ruleset!==QA_RULES[game.ruleset.campaignControl?.requiredBridges])throw Error('Not this QA hypothesis');
 const engine=game.serialize(),control=engine.state.campaignControl;
 engine.rulesetId=DESIGN.parentRulesetId;delete engine.state.campaignControl;
 return {format:'leave-roads-qa-envelope-v1',designId:DESIGN.id,epoch:1,requiredBridges:game.ruleset.campaignControl.requiredBridges,engine,control};
}
export function restorePrototype(packet){
 const fields=['format','designId','epoch','requiredBridges','engine','control'];
 if(!packet||Object.getPrototypeOf(packet)!==Object.prototype||Object.keys(packet).length!==fields.length||fields.some(k=>!Object.hasOwn(packet,k))||packet.format!=='leave-roads-qa-envelope-v1'||packet.designId!==DESIGN.id||packet.epoch!==1||![2,3].includes(packet.requiredBridges))throw Error('Invalid QA envelope');
 const data=structuredClone(packet),e=data.engine;
 if(e.version!==3||e.rulesetId!==DESIGN.parentRulesetId||e.rulesetRevision!==1||e.mapId!=='classic'||e.mapRevision!==1)throw Error('Wrong QA parent identity');
 const game=Game.restore(e),fail=message=>{throw Error('Invalid QA control: '+message);};
 if(Math.abs(game.state.time-game.tick*.05)>1e-7)fail('clock mismatch');
 if(game.state.overtime!==(game.state.time>=300))fail('escalation clock mismatch');
 validateCampaignControl(data.control,game.map,game.state.time,fail,QA_RULES[packet.requiredBridges].campaignControl);
 return bindQAControl(game,packet.requiredBridges,data.control);
}
