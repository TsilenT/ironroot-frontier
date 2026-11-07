import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../dist/engine.js';
import {CAMPAIGN_PROGRESS_MISSIONS,createCampaignProgress,createCampaignMission,createCampaignRestart,campaignScenarioForGame} from '../dist/campaign.js';
import {campaignTeaching} from '../dist/campaign-flow.js';
import {startupHarness} from './mobile-startup-fixture.mjs';

function harness(id) {
  const h=startupHarness({width:390,height:650});
  h.c.campaignProgress=createCampaignProgress();
  for(const m of CAMPAIGN_PROGRESS_MISSIONS)if(m.id!==id)h.c.campaignProgress.missions[m.id]={completed:true,stars:1,bestTime:60};
  h.c.selectedCampaign=id;h.c.start();
  return h;
}

for(const id of ['wings-of-ash','stonegate']) {
  test(`${id}: only new flight-capable fresh starts pause for the optional flight lesson`,()=>{
    const h=harness(id),{c,$}=h;
    assert.deepEqual(campaignScenarioForGame(c.game,id),{kind:'campaign',id,revision:3});
    assert.equal(c.coachingHold,true);
    assert.equal($('coachingModal').classList.contains('hidden'),false);
    assert.match($('coachingText').textContent,/future gryphons.*two-second warning.*cannot attack/);
    const before=c.game.serialize();
    $('coachingPlay').onclick();
    assert.equal(c.coachingHold,false);assert.deepEqual(c.game.serialize(),before,'Start never spends or ticks by itself');
    c.game.update(.05);assert.ok(c.game.state.time>0);
    for(const revision of [1,2,3]) {
      const old=createCampaignMission(id,{revision});old.update(.05);
      const saved=old.serialize();c.start(Game.restore(saved),null,id);
      assert.equal(c.coachingHold,false,`restored revision ${revision}`);
      assert.deepEqual(c.game.serialize(),saved);
    }
    for(const revision of [1,2]) {
      const old=createCampaignMission(id,{revision});
      c.start(createCampaignRestart(old,id),null,id,{fresh:true});
      assert.equal(c.coachingHold,false,`legacy revision ${revision} restart has no new flight lesson`);
    }
    c.campaignProgress.missions[id]={completed:true,stars:1,bestTime:60};c.start();
    assert.equal(c.coachingHold,false,'historical completion is preserved and suppresses surprise teaching');
  });
}

test('flight teaching is capability gated and neither resumed nor completed attempts are interrupted',()=>{
  for(const id of ['wings-of-ash','stonegate']) {
    assert.equal(campaignTeaching(id),null);
    assert.ok(campaignTeaching(id,{flightOrders:true}));
    assert.equal(campaignTeaching(id,{flightOrders:true,resumed:true}),null);
    assert.equal(campaignTeaching(id,{flightOrders:true,completed:true}),null);
  }
  assert.equal(campaignTeaching('common-ground',{flightOrders:true}),null,'later missions do not all repeat the lesson');
});
