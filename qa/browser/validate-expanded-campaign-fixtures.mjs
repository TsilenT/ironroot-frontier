import assert from 'node:assert/strict';
import {Game} from '../../dist/engine.js';
import {CAMPAIGN_CHAPTERS,CAMPAIGN_MISSIONS,getCampaignOverview,evaluateCampaignMission,getCampaignTargets} from '../../dist/campaign.js';
import {decodeBattle} from '../../dist/battle-codec.js';
import {parseBackup} from '../../dist/backup.js';
import {getMissionScouting} from '../../dist/scouting.js';
import {FRONTIER_IDS,FRONTIER_MISSIONS,LEGACY_IDS,progressThrough,expandedFixture,expandedBackup,wrongMapFixture} from './expanded-campaign-fixtures.mjs';
assert.equal(CAMPAIGN_MISSIONS.length,16);assert.equal(CAMPAIGN_CHAPTERS.length,5);
assert.deepEqual(FRONTIER_MISSIONS.map(m=>m.mapId),['long-march','twin-span','long-march','twin-span']);
assert.ok(CAMPAIGN_MISSIONS.slice(0,12).every(m=>m.mapId==='classic'));
assert.equal(LEGACY_IDS.at(-1),'ironroot');
const overview=getCampaignOverview(progressThrough());
assert.equal(overview.cleared,12);assert.equal(overview.stars,36);assert.equal(overview.maxStars,48);assert.equal(overview.nextMissionId,'open-horizon');
let variants=0,protectedLosses=0;
for(const id of FRONTIER_IDS){
  for(const kind of ['start','success','deadline']){
    const sample=expandedFixture(id,kind);
    const admitted=decodeBattle(sample.envelope,{campaignProgress:sample.progress});
    assert.deepEqual(admitted.game.serialize(),sample.envelope.game);
    if(kind==='success'){
      const final=Game.restore(sample.finalGame);
      assert.equal(final.state.winner,null);assert.ok(sample.outcome.objectives.every(objective=>objective.met));
      assert.ok(final.state.bases.every(base=>base.hp>0));
      console.log(`${id}: paid primary checkpoint ${sample.envelope.game.state.time}s -> ${final.state.time}s, ${sample.outcome.stars} stars.`);
    }
    variants++;
  }
  const fixture=expandedFixture(id),game=Game.restore(fixture.envelope.game),targets=getCampaignTargets(game,id);
  if(targets.some(t=>t.kind==='protect')){expandedFixture(id,'protected-loss');protectedLosses++;}
  if(fixture.mission.objectives.some(o=>o.type==='health')){expandedFixture(id,'health-loss');variants++;}
  assert.deepEqual(expandedBackup(id).backup.data.battle,fixture.envelope);
  const wrong=wrongMapFixture(id),bad=expandedBackup(id).backup;bad.data.battle=wrong.envelope;
  assert.throws(()=>parseBackup(JSON.stringify(bad)),/battlefield/);assert.throws(()=>evaluateCampaignMission(Game.restore(wrong.envelope.game),id),/mismatch/);
  const report=getMissionScouting(fixture.mission);
  assert.equal(report.map.id,fixture.mission.mapId);assert.equal(report.objectives.protectedCount,targets.filter(t=>t.kind==='protect').length);
  assert.equal(report.objectives.markedCount,targets.filter(t=>t.kind==='destroy').length);
  console.log(id+': start / success / exact deadline '+fixture.mission.timeLimit+'s / scouting / backup / wrong-map rejection verified.');
}
console.log(`Expanded fixtures: ${variants} start/success/deadline/health variants, ${protectedLosses} protected losses, 4 backup roundtrips, 4 valid-engine wrong-map rejections; legacy 12/36 preserved in 16/48 total.`);
