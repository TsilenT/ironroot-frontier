// Synthetic persistence fixtures, not claims of human-played mission victories.
import assert from 'node:assert/strict';
import {Game} from '../../dist/engine.js';
import {
  createCampaignMission, createCampaignProgress, evaluateCampaignMission,
  getCampaignTargets, isMissionUnlocked, normalizeCampaignProgress,
} from '../../dist/campaign.js';

export function campaignFixture(kind) {
  const id = kind === 'protected' ? 'winter-stores' : 'emberwatch';
  const game = createCampaignMission(id);
  const progress = createCampaignProgress();
  if (kind === 'victory') {
    const ids = new Set(getCampaignTargets(game,id).filter(t=>t.kind==='destroy').map(t=>t.originalId));
    game.state.buildings = game.state.buildings.filter(b=>!ids.has(b.id));
    game.state.time = 10;
  } else if (kind === 'failure') {
    game.state.time = 180; // Deadline reached with the required enemy target still alive.
  } else if (kind === 'protected') {
    for (const prerequisite of ['emberwatch','three-roads']) {
      progress.missions[prerequisite] = {completed:true,stars:3,bestTime:10};
    }
  } else throw new Error('Unknown fixture: '+kind);
  const data = game.serialize();
  const restored = Game.restore(data);
  const outcome = evaluateCampaignMission(restored,id);
  assert.ok(isMissionUnlocked(progress,id));
  assert.deepEqual(normalizeCampaignProgress(progress),progress);
  assert.equal(outcome.completed,kind==='victory');
  assert.equal(outcome.failed,kind==='failure');
  if (kind === 'victory') assert.equal(outcome.stars,3);
  if (kind === 'protected') assert.equal(getCampaignTargets(restored,id).filter(t=>t.kind==='protect'&&t.building).length,2);
  return {
    envelope:{format:'ironroot-save',version:2,challengeId:null,campaignId:id,game:data},
    progress,
  };
}
