// Synthetic near-result checkpoints for UI regressions, not human-balance proof.
// Start from a real paid-action run and retain the last still-active fixed step.
// Do not import an already-completed mission now that Resume uses shared admission.
import {Game} from '../../dist/engine.js';
import {createCampaignMission,evaluateCampaignMission,createCampaignProgress} from '../../dist/campaign.js';
import {encodeBattle,scenarioForBattle,decodeBattle} from '../../dist/battle-codec.js';
import {campaignPolicy} from '../../tests/campaign-policies.mjs';
let checkpoint;
function nearWin(){
 if(checkpoint)return checkpoint;
 const game=createCampaignMission('emberwatch'),policy=campaignPolicy('emberwatch');
 for(let tick=0;tick<3600;tick++){
  if(tick%20===0)policy(game);
  const before=game.serialize();game.update(.05);
  const outcome=evaluateCampaignMission(game,'emberwatch');
  if(outcome.completed){checkpoint=before;return checkpoint;}
  if(outcome.failed)throw Error('Paid Emberwatch fixture failed before a win.');
 }
 throw Error('Paid Emberwatch fixture did not finish.');
}
export function campaignReplayFixture(stars,progress=createCampaignProgress()){
 const game=Game.restore(nearWin());
 // Vary only the optional time/health medals. The next real combat step still
 // earns the victory; no target is removed or marked complete in the save.
 if(stars<3){game.state.time=110;game.tick=2200;}
 if(stars===1)game.state.bases[0].hp=5000;
 const envelope=encodeBattle(game,scenarioForBattle(null,'emberwatch'),{campaignProgress:progress});
 decodeBattle(envelope,{campaignProgress:progress});
 const proof=Game.restore(envelope.game);proof.update(.05);
 const outcome=evaluateCampaignMission(proof,'emberwatch');
 if(!outcome.completed||outcome.stars!==stars)throw Error('Near-result fixture did not earn its expected stars.');
 return envelope;
}
