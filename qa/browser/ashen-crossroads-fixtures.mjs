// UI fixtures are earned with ordinary paid engine actions, then saved before
// an outcome. They test resumed presentation/persistence, not a human playthrough.
import assert from 'node:assert/strict';
import {Game} from '../../dist/engine.js';
import {createCurrentChallenge,evaluateChallenge,getChallengeTargets} from '../../dist/challenges.js';
import {encodeBattle,scenarioForBattle} from '../../dist/battle-codec.js';
import {createCampaignProgress} from '../../dist/campaign.js';
import {BACKUP_STORAGE_KEYS as K} from '../../dist/backup.js';
export const ID='ashen-crossroads';
export const NAMES=['Pinewatch','Stonegate','Ember Roost'];
export const TARGETS=['watchtower-1950-0','barracks-2090-1','aerie-2230-2'];
const plan=[['sanctum',830,1],['archery',550,1],['foundry',1250,0],['watchtower',830,2],['foundry',1110,1]];
const envelope=game=>encodeBattle(game,scenarioForBattle(ID,null,game));
function positions(){
  const game=createCurrentChallenge(ID);let partial=null,nearWin=null,cursor=0;
  for(let tick=0;tick<4800;tick++){
    if(tick>=120&&(tick-120)%120===0&&cursor<plan.length){
      const [type,x,lane]=plan[cursor],gold=game.state.gold[0],result=game.build(type,x,game.map.lanes[lane]);
      if(result.ok){assert.equal(game.state.gold[0],gold-game.buildings[type].cost);cursor++;}
    }
    const before=game.serialize();game.update(.05);
    const outcome=evaluateChallenge(game,ID),targets=getChallengeTargets(game,ID);
    if(!partial&&targets.filter(t=>!t.building).length===1)partial=envelope(game);
    if(outcome.completed){assert.equal(game.state.winner,null);assert.ok(targets[2].building);assert.ok(game.state.bases[1].hp>0);nearWin=envelope(Game.restore(before));break;}
    assert.equal(outcome.failed,false);
  }
  assert.ok(partial&&nearWin);assert.equal(evaluateChallenge(Game.restore(nearWin.game),ID).completed,false);
  const idle=createCurrentChallenge(ID);let nearLoss=null;
  for(let tick=0;tick<4800;tick++){const before=idle.serialize();idle.update(.05);if(evaluateChallenge(idle,ID).failed){nearLoss=envelope(Game.restore(before));break;}}
  assert.ok(nearLoss);return {partial,nearWin,nearLoss};
}
export const FIXTURES=positions();
export function priorProfile(battle=null){
  const campaign=createCampaignProgress();campaign.missions.emberwatch={completed:true,stars:2,bestTime:60};
  const data={campaign,trials:{shieldbreaker:{completed:true,bestTime:10}},
    settings:{sound:false,music:false,sfx:true,volume:.25,reducedMotion:true,quality:'low',keyboard:{version:1,bindings:{build1:'KeyQ'}}},
    history:[{won:false,draw:false,challengeId:null,campaignId:null,difficulty:'easy',time:60,kills:0,built:1,date:'2026-11-06T11:00:00.000Z'}]};
  return Object.fromEntries([...Object.entries(data).map(([domain,value])=>[K[domain],JSON.stringify(value)]),...(battle?[[K.battle,JSON.stringify(battle)]]:[])]);
}
