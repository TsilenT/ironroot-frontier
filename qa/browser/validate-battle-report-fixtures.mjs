import assert from 'node:assert/strict';
import {Game} from '../../dist/engine.js';
import {createBattleJournal,exportBattleReport} from '../../dist/battle-report.js';
import {getCampaignTargets} from '../../dist/campaign.js';
import {getChallengeTargets} from '../../dist/challenges.js';
import {decodeBattle} from '../../dist/battle-codec.js';
import {advanceFixture} from './campaign-fixtures.mjs';
import {REPORT_CASES,reportFixture,imminentSkirmishFixture} from './battle-report-fixtures.mjs';
import {validateBattleReportLegacyFixture} from './battle-report-legacy-fixtures.mjs';
for(const kind of REPORT_CASES){
  const fixture=reportFixture(kind),{game,campaignId,challengeId,identity}=decodeBattle(fixture.envelope,{campaignProgress:fixture.progress});
  const before=JSON.stringify(game.serialize());
  const journal=createBattleJournal(game,{resumed:true,...fixture.expected.context,identity});
  assert.equal(JSON.stringify(game.serialize()),before,'journal construction is read-only');
  const objectiveOutcome=advanceFixture(game,{campaignId,challengeId});
  assert.deepEqual(objectiveOutcome,fixture.outcome);assert.deepEqual(game.serialize(),fixture.finalGame);
  const targets=campaignId?getCampaignTargets(game,campaignId):challengeId?getChallengeTargets(game,challengeId).map(t=>({...t,kind:'destroy',side:1})):[];
  const snapshot=JSON.stringify(game.serialize());
  const report=JSON.parse(exportBattleReport(journal.finish(game,{objectiveOutcome,targets})));
  assert.equal(JSON.stringify(game.serialize()),snapshot,'report finish is read-only');
  assert.equal(report.version,2);assert.deepEqual(report.identity,identity);
  assert.equal(report.outcome.result,fixture.expected.result);
  assert.equal(report.outcome.engineWinner,fixture.expected.winner);
  assert.equal(report.scope.startedAt,fixture.envelope.game.state.time);assert.equal(report.final.time,fixture.expected.time);
  assert.equal(report.scope.fullTimeline,false);assert.equal(report.scope.resumed,true);
  assert.equal(report.scope.counters,'full-match-engine');assert.ok(report.timeline.length<=256);
  for(const side of [0,1])for(const field of ['kills','built','damage'])assert.equal(report.cumulativeStats[side][field],fixture.expected.stats[field][side]);
  assert.deepEqual(report.timeline.map(sample=>sample.time),[fixture.envelope.game.state.time,fixture.expected.time]);
  if(kind==='campaign-primary-zero'){
    assert.equal(report.final.time,.05);assert.equal(report.scope.startedAt,0);assert.equal(report.outcome.engineWinner,null);
    // Same-time report finalization is a data-layer case, not an inadmissible
    // terminal Resume. The real winning step above has already happened.
    const sameTime=createBattleJournal(game,{resumed:true,...fixture.expected.context,identity}).finish(game,{objectiveOutcome,targets});
    assert.equal(sameTime.scope.observedDuration,0);assert.equal(sameTime.timeline.length,1);
    assert.equal(sameTime.outcome.result,'victory');
  }
  if(kind==='trial-primary')assert.equal(report.final.time,40-1e-10,'JSON preserves the near-integer simulation time exactly');
  console.log(`${kind}: admitted active; next step ${report.final.time}s; ${report.outcome.result}; exact identity/counters/restore.`);
}
for(const mapId of ['classic','long-march','twin-span'])for(const result of ['victory','defeat','draw']){
  const game=new Game({mapId,ai:false});
  const fixture=imminentSkirmishFixture({format:'ironroot-save',version:2,challengeId:null,campaignId:null,game:game.serialize()},result);
  assert.deepEqual(fixture.finalGame.state.stats.built,game.state.stats.built);
}
const manifest=await validateBattleReportLegacyFixture();
console.log(`Battle report fixtures: ${REPORT_CASES.length} admissible imminent positions, 9 preserved-map base continuations, read-only export, exact counters and honest resumed scopes verified.`);
console.log('Zero-duration single-point report remains independently checked after a real result; no completed-at-zero save is admitted.');
console.log('Frozen 0.10 QA baseline: '+Object.keys(manifest.files).length+' exact runtime SHA-256 hashes verified; no production/released provenance claimed.');
