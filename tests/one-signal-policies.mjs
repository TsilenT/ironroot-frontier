import assert from 'node:assert/strict';
import {createCampaignMission,evaluateCampaignMission,getCampaignTargets,createCampaignProgress,CAMPAIGN_MISSIONS,normalizeCampaignProgress} from '../dist/campaign.js';
import {advanceObjectiveBattle} from '../dist/objectives.js';
import {encodeBattle,decodeBattle,scenarioForBattle} from '../dist/battle-codec.js';
export const MISSION_ID='one-signal-is-enough';
export const ROUTES={
  northSacrifice:[['wardenLodge',1250,0],['foundry',1110,0],['foundry',830,0],['archery',690,0],['wait',55],['archery',550,2],['watchtower',410,2]],
  southSacrifice:[['archery',1110,2],['watchtower',970,2],['wait',40],['wardenLodge',410,0],['foundry',270,0],['foundry',550,0],['barracks',830,2],['archery',690,2]],
  bothNoWardens:[['archery',1110,2],['watchtower',970,2],['barracks',690,0],['barracks',550,0],['foundry',410,0],['foundry',270,0],['archery',830,2]],
  northAssault:[['barracks',1250,0],['sanctum',1110,0],['foundry',830,0],['archery',690,2],['watchtower',550,2],['mint',270,0],['archery',690,0]],
  northWardens:[['wardenLodge',1250,0],['foundry',1110,0],['archery',830,0],['mint',270,0],['sanctum',690,0]],
  southRanged:[['archery',1110,2],['watchtower',970,2],['wardenLodge',690,0],['foundry',550,0],['foundry',410,0],['barracks',830,2],['archery',690,2],['mint',270,2],['sanctum',550,2]],
  southAir:[['aerie',1110,2],['watchtower',970,2],['wardenLodge',690,0],['foundry',550,0],['foundry',410,0],['barracks',830,2],['archery',690,2],['mint',270,2],['aerie',550,2]],
  broad:[['wardenLodge',1250,0],['foundry',1110,0],['archery',1110,2],['foundry',830,0],['watchtower',970,2],['barracks',830,2],['archery',690,0],['archery',690,2],['mint',270,1]],
  screenedSiege:[['barracks',1250,0],['foundry',1110,0],['foundry',830,0],['mint',270,0]],
  airHeavy:[['aerie',1110,2],['aerie',970,2],['aerie',830,2],['mint',270,2]],
  economy:[['mint',270,0],['mint',410,0],['mint',550,0],['mint',270,2]],
  idle:[],
};
export function campaignProgress(){const p=createCampaignProgress();for(const m of CAMPAIGN_MISSIONS)p.missions[m.id]={completed:true,stars:1,bestTime:60};p.missions['shared-crossing']={completed:true,stars:1,bestTime:180};return normalizeCampaignProgress(p);}
export function paidPolicy(plan){let cursor=0;return game=>{
  if(cursor<plan.length){const [type,x,lane]=plan[cursor];if(type==='wait'){if(game.state.time>=x)cursor++;return null;}const r=game.build(type,x,game.map.lanes[lane]);if(r.ok)cursor++;return r;}
  if(!plan.length)return null;
  const lanes=new Set(plan.filter(p=>p[0]!=='mint').map(p=>p[2]));
  const b=game.state.buildings.filter(b=>b.side===0&&lanes.has(b.lane)&&b.type!=='mint'&&b.level<3).sort((a,b)=>a.level-b.level||b.x-a.x)[0];
  return b?game.upgrade(b.id):null;
};}
export function playOneSignal({route='northAssault',seed=6201,restore=false,cadence=2}={}){
  let game=createCampaignMission(MISSION_ID);game.seed=seed;
  const startingGold=game.state.gold[0];
  const policy=paidPolicy(ROUTES[route]),profile=campaignProgress(),actions=[],losses={},firstContact={},trace=[];
  let spent=0,income=0,saved=0,outcome=evaluateCampaignMission(game,MISSION_ID);
  for(let tick=0;tick<4300&&!outcome.completed&&!outcome.failed;tick++){
    if(tick%Math.round(cadence*20)===0){const before=game.state.gold[0],r=policy(game);if(r?.ok){const cost=before-game.state.gold[0];assert.ok(cost>0);spent+=cost;actions.push({time:+game.state.time.toFixed(2),type:r.building.type,x:r.building.x,lane:r.building.lane,level:r.building.level,cost});}else assert.equal(before,game.state.gold[0]);}
    const before=game.state.time;outcome=advanceObjectiveBattle(game,.05,g=>evaluateCampaignMission(g,MISSION_ID),210);income+=game.state.income[0]*(game.state.time-before);
    assert.ok(Math.abs(game.state.gold[0]-(startingGold+income+2*game.state.stats.kills[0]-spent))<1e-6,'ordinary economy only');
    for(const t of getCampaignTargets(game,MISSION_ID)){if(!t.building&&losses[t.name]===undefined)losses[t.name]=+game.state.time.toFixed(2);if(t.building&&t.building.hp<t.building.maxHp&&firstContact[t.name]===undefined)firstContact[t.name]=+game.state.time.toFixed(2);}
    if(tick%200===199&&!outcome.completed&&!outcome.failed){trace.push({time:+game.state.time.toFixed(2),posts:getCampaignTargets(game,MISSION_ID).map(t=>t.building?.hp??0),cores:game.state.bases.map(b=>b.hp)});if(restore){const bytes=encodeBattle(game,scenarioForBattle(null,MISSION_ID,game),{campaignProgress:profile});const copy=decodeBattle(bytes,{campaignProgress:profile}).game;assert.deepEqual(copy.serialize(),game.serialize());game=copy;saved++;}}
  }
  return {game,outcome,summary:{route,seed,restore,saved,won:outcome.completed,winKind:outcome.completed?(game.state.bases[1].hp<=0?'core':'evacuation'):null,time:+game.state.time.toFixed(2),survivors:getCampaignTargets(game,MISSION_ID).filter(t=>t.building).map(t=>t.name),losses,firstContact,spent,income:+income.toFixed(2),gold:+game.state.gold[0].toFixed(2),citadels:game.state.bases.map(b=>+b.hp.toFixed(2)),stars:outcome.stars,actions,trace}};
}
