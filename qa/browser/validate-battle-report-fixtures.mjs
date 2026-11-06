import assert from 'node:assert/strict';
import {Game} from '../../dist/engine.js';
import {createBattleJournal,exportBattleReport} from '../../dist/battle-report.js';
import {evaluateCampaignMission,getCampaignTargets} from '../../dist/campaign.js';
import {evaluateChallenge,getChallengeTargets} from '../../dist/challenges.js';
import {REPORT_CASES,reportFixture} from './battle-report-fixtures.mjs';
import {validateBattleReportLegacyFixture} from './battle-report-legacy-fixtures.mjs';
for(const kind of REPORT_CASES){
  const fixture=reportFixture(kind),game=Game.restore(fixture.envelope.game);
  const before=JSON.stringify(game.serialize());
  const journal=createBattleJournal(game,{resumed:true,...fixture.expected.context});
  assert.equal(JSON.stringify(game.serialize()),before,'journal construction is read-only');
  const {campaignId,challengeId}=fixture.envelope;
  const objectiveOutcome=campaignId?evaluateCampaignMission(game,campaignId):challengeId?evaluateChallenge(game,challengeId):null;
  if(!objectiveOutcome)game.update(.05);
  const targets=campaignId?getCampaignTargets(game,campaignId):challengeId?getChallengeTargets(game,challengeId).map(t=>({...t,kind:'destroy',side:1})):[];
  const snapshot=JSON.stringify(game.serialize());
  const report=JSON.parse(exportBattleReport(journal.finish(game,{objectiveOutcome,targets})));
  assert.equal(JSON.stringify(game.serialize()),snapshot,'report finish is read-only');
  assert.equal(report.outcome.result,fixture.expected.result);
  assert.equal(report.scope.startedAt,fixture.envelope.game.state.time);
  assert.equal(report.scope.fullTimeline,false);assert.equal(report.scope.resumed,true);
  assert.equal(report.scope.counters,'full-match-engine');
  assert.equal(report.cumulativeStats[0].kills,17);assert.equal(report.cumulativeStats[0].built,23);
  assert.equal(report.cumulativeStats[0].damage,1234.5);assert.ok(report.timeline.length<=256);
  if(kind==='campaign-primary-zero'){assert.equal(report.final.time,0);assert.equal(report.outcome.engineWinner,null);}
  if(kind==='trial-primary')assert.equal(report.final.time,40-1e-10,'JSON preserves the near-integer simulation time exactly');
}
const manifest=await validateBattleReportLegacyFixture();
console.log('Battle report fixtures: '+REPORT_CASES.length+' explicitly synthetic terminal positions verified, read-only report/export and honest resumed scopes verified.');
console.log('Frozen 0.10 QA baseline: '+Object.keys(manifest.files).length+' exact runtime SHA-256 hashes verified; no production/released provenance claimed.');
