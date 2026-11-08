import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';
import { CAMPAIGN_PROGRESS_MISSIONS, createCampaignMission, getCampaignMission, getCampaignTargets, evaluateCampaignMission } from '../dist/campaign.js';
import { identityOf, scenarioForBattle } from '../dist/battle-codec.js';
import { supportsFog, observe } from '../dist/fog.js';
import { createBattleJournal, exportBattleReport } from '../dist/battle-report.js';
import { renderBattleReport } from '../dist/report-view.js';

const ID = 'lanterns-on-the-water';
const app = readFileSync(new URL('../dist/app.js', import.meta.url), 'utf8');
const start = app.indexOf('function beginBattleReport(');
const end = app.indexOf('function revealBattleReport(', start);
assert.ok(start >= 0 && end > start, 'the actual app report handlers must be present');

// Execute the actual begin/sample/finish handlers with the production journal.
// This tiny DOM surface checks report delivery, not browser layout or input.
function harness(id = ID) {
  const nodes = new Map();
  const $ = key => {
    if (!nodes.has(key)) {
      const classes = new Set();
      nodes.set(key, { textContent: '', innerHTML: '', scrollTop: 0,
        classList: { add: value => classes.add(value), remove: value => classes.delete(value), contains: value => classes.has(value) } });
    }
    return nodes.get(key);
  };
  const game = createCampaignMission(id);
  const c = createContext({
    $, game, currentCampaign: id, currentChallenge: null,
    CAMPAIGN_MISSIONS: CAMPAIGN_PROGRESS_MISSIONS,
    identityOf, scenarioForBattle, supportsFog, createBattleJournal,
    getCampaignTargets, renderBattleReport,
    battleJournal: null, lastBattleReport: null, hasLastResult: false,
    reportFault: false, objectiveOutcome: null,
  });
  runInContext(app.slice(start, end), c);
  const before = game.serialize();
  c.beginBattleReport(false);
  assert.equal(c.reportFault, false);
  assert.ok(c.battleJournal);
  assert.deepEqual(game.serialize(), before, 'beginning a report must not alter the battle');
  return { c, $, game };
}

function finish(h) {
  const { c, $, game } = h;
  c.objectiveOutcome = evaluateCampaignMission(game, c.currentCampaign);
  assert.ok(c.objectiveOutcome.completed || c.objectiveOutcome.failed);
  assert.equal(game.state.winner, null);
  const before = game.serialize();
  c.finishBattleReport();
  assert.equal(c.reportFault, false);
  assert.ok(c.lastBattleReport, $('resultReportIssue').textContent);
  assert.equal($('resultReport').classList.contains('hidden'), false);
  assert.equal($('resultReportIssue').classList.contains('hidden'), true);
  const exported = JSON.parse(exportBattleReport(c.lastBattleReport));
  assert.deepEqual(exported, c.lastBattleReport);
  assert.deepEqual(game.serialize(), before, 'terminal report/render/export must not alter state, RNG or winner');
  assert.equal(exported.outcome.engineWinner, null);
  assert.equal(exported.outcome.source, 'objective');
  assert.match($('resultReport').innerHTML, /This battle has no automatic citadel decay/);
  assert.doesNotMatch($('resultReport').innerHTML, /This open-ended battle|no forced time-limit winner|or forced time-limit winner/);
  assert.match($('resultReport').innerHTML, /Authored objectives and deadlines still apply/);
  return exported;
}

test('actual authored fog report rejects live finish/export and labels objective-only victory as full information', () => {
  const h = harness(), { c, $, game } = h;
  assert.equal(observe(game).state.bases[1].hp, null);
  const live = game.serialize();
  assert.throws(() => c.battleJournal.finish(game), /terminal engine or objective outcome/);
  assert.throws(() => exportBattleReport(c.battleJournal), /completed report/);
  c.sampleBattleReport();
  assert.equal(c.reportFault, false, 'rejected live finish must not consume the journal');
  assert.deepEqual(game.serialize(), live);

  const originalIds = new Set(getCampaignTargets(game, ID).map(target => target.originalId));
  game.state.buildings = game.state.buildings.filter(building => !originalIds.has(building.id));
  const report = finish(h);
  assert.equal(report.context.name, `${getCampaignMission(ID).name} · Fog · post-battle full information`);
  assert.match($('resultReport').innerHTML, /Fog · post-battle full information/);
  assert.equal(report.outcome.result, 'victory');
  assert.equal(report.final.sides[1].gold, game.state.gold[1]);
  assert.equal(report.final.sides[1].baseHp, 6000);
  assert.equal(observe(game).fog.enabled, true, 'reporting must not change ordinary AI observation');
});

test('actual authored fog report also exports objective-only deadline defeat without inventing an engine winner', () => {
  const h = harness();
  h.game.state.time = getCampaignMission(ID).timeLimit;
  h.game.tick = Math.round(h.game.state.time / .05);
  const report = finish(h);
  assert.equal(report.outcome.result, 'defeat');
  assert.equal(report.outcome.objectiveFailed, true);
  assert.match(report.context.name, /Fog · post-battle full information$/);
  assert.match(h.$('resultReport').innerHTML, /Fog · post-battle full information/);
});

test('actual ordinary campaign report retains its original authored name', () => {
  const id = 'one-signal-is-enough', h = harness(id);
  assert.equal(supportsFog(h.game.ruleset), false);
  h.game.state.time = getCampaignMission(id).timeLimit;
  h.game.tick = Math.round(h.game.state.time / .05);
  const report = finish(h);
  assert.equal(report.context.name, getCampaignMission(id).name);
  assert.equal(report.outcome.result, 'victory');
  assert.doesNotMatch(report.context.name, /Fog|full information/);
});
