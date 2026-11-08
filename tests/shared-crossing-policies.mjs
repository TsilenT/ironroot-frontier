import assert from 'node:assert/strict';
import {createCampaignMission,evaluateCampaignMission,createCampaignProgress,CAMPAIGN_MISSIONS,normalizeCampaignProgress} from '../dist/campaign.js';
import {campaignControlStatus,bridgeStatus} from '../dist/bridge-control.js';
import {encodeBattle,decodeBattle,scenarioForBattle} from '../dist/battle-codec.js';
export const MISSION_ID='shared-crossing';
export const ROUTES={
  northMiddle:{lanes:[0,1],supports:['archery','sanctum']},
  northSouth:{lanes:[0,2],supports:['archery','archery']},
  middleSouth:{lanes:[1,2],supports:['foundry','archery']},
  northMiddleWardens:{lanes:[0,1],supports:['archery','sanctum'],screen:'wardenLodge'},
  wardenSupport:{lanes:[0,2],supports:['archery','archery'],screen:'wardenLodge'},
  groundSplashFirst:{lanes:[0,1],supports:['sanctum','foundry']},
  concentratedRush:{lanes:[1],supports:['foundry']},
  airOnly:{lanes:[0,2],supports:['aerie','aerie'],screen:'aerie'},
  idle:{lanes:[]},
};
export function campaignProgress(){const p=createCampaignProgress();for(const m of CAMPAIGN_MISSIONS)p.missions[m.id]={completed:true,stars:1,bestTime:60};return normalizeCampaignProgress(p);}
export function paidPolicy({lanes,supports=[],screen='barracks'}){
  const plan=[...lanes.map(lane=>[screen,1250,lane]),...lanes.map((lane,i)=>[supports[i],1110,lane]),...lanes.map((lane,i)=>[supports[i],970,lane]),...lanes.map(lane=>['mint',270,lane]),...lanes.map(lane=>[screen,830,lane]),...lanes.map((lane,i)=>[supports[i],690,lane])];
  let cursor=0;
  return game=>{
    if(cursor<plan.length){const [type,x,lane]=plan[cursor],result=game.build(type,x,game.map.lanes[lane]);if(result.ok)cursor++;return result;}
    if(!lanes.length)return null;
    const b=game.state.buildings.filter(b=>b.side===0&&b.type!=='mint'&&b.level<3).sort((a,b)=>a.level-b.level||b.x-a.x)[0];
    return b?game.upgrade(b.id):null;
  };
}
/** Only normal paid build/upgrade calls. No gold, troops, HP, orders or timer grants. */
export function playSharedCrossing({route='northMiddle',seed=6101,cadence=2,restore=false}={}){
  let game=createCampaignMission(MISSION_ID);game.seed=seed;
  const startingGold=game.state.gold[0],profile=campaignProgress(),policy=paidPolicy(ROUTES[route]);
  let spent=0,ordinaryIncome=0,contestedTime=0,pausedAfterProgress=0,saved=0;
  const actions=[],trace=[];
  let outcome=evaluateCampaignMission(game,MISSION_ID);
  for(let tick=0;tick<5500&&!outcome.completed&&!outcome.failed;tick++){
    if(tick%Math.round(cadence*20)===0){
      const before=game.state.gold[0],result=policy(game);
      if(result?.ok){const cost=before-game.state.gold[0];assert.ok(cost>0);spent+=cost;actions.push({time:+game.state.time.toFixed(2),type:result.building?.type??'upgrade',cost});}
      else assert.equal(game.state.gold[0],before);
    }
    const beforeTime=game.state.time;
    game.update(.05);
    const dt=game.state.time-beforeTime;
    // Base/mines credit is sampled before combat, whereas state.income is unchanged by control.
    ordinaryIncome+=game.state.income[0]*dt;
    const status=campaignControlStatus(game),roads=bridgeStatus(game);
    if(roads.some(b=>b.blocked))contestedTime+=dt;
    if(status.seconds>0&&!status.advancing&&!status.complete)pausedAfterProgress+=dt;
    assert.ok(Math.abs(game.state.gold[0]-(startingGold+ordinaryIncome+2*game.state.stats.kills[0]-spent))<1e-6,'all spending comes from starting gold, ordinary income and ordinary kills');
    assert.equal(Object.hasOwn(game.state,'bridgeControl'),false);
    outcome=evaluateCampaignMission(game,MISSION_ID);
    if(tick%200===199&&!outcome.completed&&!outcome.failed){
      trace.push({time:+game.state.time.toFixed(2),seconds:+status.seconds.toFixed(2),owners:roads.map(b=>b.owner),count:status.count});
      if(restore){const bytes=encodeBattle(game,scenarioForBattle(null,MISSION_ID,game),{campaignProgress:profile});const copy=decodeBattle(bytes,{campaignProgress:profile}).game;assert.deepEqual(copy.serialize(),game.serialize());game=copy;saved++;}
    }
  }
  return {game,outcome,summary:{route,seed,cadence,restore,saved,won:outcome.completed,winKind:outcome.completed?(game.state.bases[1].hp<=0?'core':'control'):null,time:+game.state.time.toFixed(2),seconds:+game.state.campaignControl.heldSeconds.toFixed(2),contestedTime:+contestedTime.toFixed(2),pausedAfterProgress:+pausedAfterProgress.toFixed(2),spent,income:+ordinaryIncome.toFixed(2),kills:game.state.stats.kills[0],gold:+game.state.gold[0].toFixed(2),citadels:game.state.bases.map(b=>+b.hp.toFixed(2)),label:outcome.label,actions,trace}};
}
