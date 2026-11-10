/** QA-only, ordinary registered Game. No production admission or state patch. */
import {Game} from '../../dist/engine.js';
import {deepFreeze} from '../../dist/rulesets.js';
import {actualIncome} from '../salt-stores/economy.mjs';
export const DESIGN=deepFreeze({id:'give-ground',epoch:1,title:'Give Ground',status:'fresh-hypothesis-unopened',baselineCommit:'f415b9c8197b0eeb7fad22169b6b95a9cba4a9a1',baselineTree:'7b87d0ea613ccd6e3ef951656d4d7869f5f0d592',parentRulesetId:'frontier-campaign-citadel-open',mapId:'long-march',seed:9467,difficulty:'normal',ai:true,timeLimit:600,cadenceTicks:100,startingGold:900,enemyGold:300,startingHealth:6000,originalProducerId:3,originalType:'foundry',originalX:1250,originalLane:0,
 playerBuildings:[['foundry',1250,0],['barracks',1110,2],['archery',970,2],['mint',410,1]],
 enemyBuildings:[['barracks',2750,0],['sanctum',2890,0],['archery',3030,0],['barracks',2890,1],['barracks',2890,2],['archery',3030,2],['mint',3590,1]],
 numericStatus:'One fresh formation/purse/seed hypothesis. Not balanced facts.'});
const metadata=new WeakMap();
export function metadataFor(game){const m=metadata.get(game);if(!m)throw Error('Not a Give Ground QA game');return m;}
export function createPrototype({seed=DESIGN.seed}={}){
 if(seed!==DESIGN.seed)throw Error('Seed outside predeclared plan');
 const game=new Game({seed,mapId:DESIGN.mapId,rulesetId:DESIGN.parentRulesetId,difficulty:DESIGN.difficulty,ai:true}),s=game.state;
 s.buildings=[];s.effects=[];s.stats.built=[0,0];s.gold=[10000,10000];
 for(const [side,rows] of [[0,DESIGN.playerBuildings],[1,DESIGN.enemyBuildings]])for(const [type,x,lane] of rows){const r=game.build(type,x,game.map.lanes[lane],side);if(!r.ok)throw Error('Illegal initial site: '+r.reason);}
 s.effects=[];s.gold=[DESIGN.startingGold,DESIGN.enemyGold];s.income=[0,1].map(side=>actualIncome(game,side));
 metadata.set(game,deepFreeze({originalProducerId:DESIGN.originalProducerId,initialSeed:seed}));return game;
}
export function evaluatePrototype(game){const s=game.state;
 if(s.bases[0].hp<=0||s.winner===1||s.winner==='draw')return {completed:false,failed:true,reason:'player-core'};
 if(s.time>600+1e-7)return {completed:false,failed:true,reason:'deadline'};
 if(s.bases[1].hp<=0||s.winner===0)return {completed:true,failed:false,reason:'enemy-core'};
 if(s.time>=600-1e-7)return {completed:false,failed:true,reason:'deadline'};
 return {completed:false,failed:false,reason:null};}
const keys=(o,wanted)=>o&&Object.getPrototypeOf(o)===Object.prototype&&Object.keys(o).length===wanted.length&&wanted.every(k=>Object.hasOwn(o,k));
export function savePrototype(game){const m=metadataFor(game);return {format:'give-ground-private-qa-v1',designId:DESIGN.id,epoch:1,metadata:{...m},engine:game.serialize()};}
export function restorePrototype(packet){
 if(!keys(packet,['format','designId','epoch','metadata','engine'])||packet.format!=='give-ground-private-qa-v1'||packet.designId!==DESIGN.id||packet.epoch!==1||!keys(packet.metadata,['originalProducerId','initialSeed'])||packet.metadata.originalProducerId!==3||packet.metadata.initialSeed!==9467)throw Error('Invalid private QA identity');
 const e=packet.engine;
 if(!e||e.version!==3||e.rulesetId!==DESIGN.parentRulesetId||e.rulesetRevision!==1||e.mapId!==DESIGN.mapId||e.mapRevision!==1||e.difficulty!==DESIGN.difficulty||e.ai!==true)throw Error('Wrong QA engine identity');
 const game=Game.restore(e),s=game.state,b=s.buildings.find(b=>b.id===3);
 if(Math.abs(s.time-game.tick*.05)>1e-7||s.overtime!==(s.time>=300)||game.tick>12000||game.nextId<14)throw Error('Invalid QA clock or identity');
 if(b&&(b.side!==0||b.type!==DESIGN.originalType||b.x!==1250||b.lane!==0||b.y!==game.map.lanes[0]))throw Error('Original producer identity changed');
 metadata.set(game,deepFreeze({...packet.metadata}));return game;
}
