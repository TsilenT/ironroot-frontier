// Pure execution of the production briefing assignment plus browser-contract
// checks. This does not execute a browser or establish native input/geometry.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {getRuleset} from '../dist/engine.js';
import {
  ALL_CAMPAIGN_MISSIONS, ONBOARDING_MISSIONS, PROGRESSION_CAMPAIGN_MISSIONS,
  getProgressionCampaignOverview, createCampaignProgress,
} from '../dist/campaign.js';

const RECORDS_NOTICE = 'Campaign records include stars and best times from earlier mission versions.';
const app = readFileSync(new URL('../dist/app.js', import.meta.url), 'utf8');
const briefingStart = app.indexOf("  const roster = getRuleset(mission.rulesetId || 'frontier-legacy'");
const briefingEnd = app.indexOf("  $('campaignHint').textContent", briefingStart);
assert.ok(briefingStart >= 0 && briefingEnd > briefingStart, 'production briefing assignment must exist');
const briefingAssignment = app.slice(briefingStart, briefingEnd);
const navigation = readFileSync(new URL('../qa/browser/campaign-navigation.spec.mjs', import.meta.url), 'utf8');
const expanded = readFileSync(new URL('../qa/browser/expanded-campaign.spec.mjs', import.meta.url), 'utf8');

function renderBriefing(mission, node = {innerHTML:''}) {
  const before = JSON.stringify(mission);
  runInNewContext(briefingAssignment, {mission, getRuleset, $: id => {
    assert.equal(id, 'campaignBriefing');
    return node;
  }});
  assert.equal(JSON.stringify(mission), before, 'briefing presentation must not mutate the mission');
  const rows = [...node.innerHTML.matchAll(/<li>(.*?)<\/li>/g)].map(match => match[1]);
  assert.equal(node.innerHTML, rows.map(row => `<li>${row}</li>`).join(''), 'only the exact briefing list is rendered');
  return rows;
}

function authoredRows(mission) {
  const rules = getRuleset(mission.rulesetId || 'frontier-legacy', mission.rulesetRevision || 1);
  return ['Available here: ' + Object.values(rules.buildings).map(b => b.name).join(', ') + '.', ...mission.briefing];
}

test('current briefings retain exact rosters and lists; only the 19 revised historical missions have a records notice', () => {
  const progress = createCampaignProgress(), bytes = JSON.stringify(progress);
  const missions = getProgressionCampaignOverview(progress).missions;
  assert.equal(missions.length, 42);
  let notices = 0;
  for (const mission of missions) {
    const automatic = mission.scenarioRevision >= 3;
    assert.equal(mission.scenarioRevision, ['shared-crossing','one-signal-is-enough','lanterns-on-the-water','borrowed-ground','a-river-between-us','false-quiet','the-road-we-know','through-the-reed-beds','the-archers-quay','salt-in-the-stores','the-hammer-turns','the-long-screen','the-shared-watch','wake-the-reserve','the-empty-purse','leave-no-road-closed','three-minutes-more','cut-the-bowstrings'].includes(mission.id) ? 1 : 5, mission.id);
    const rows = renderBriefing(mission);
    assert.deepEqual(rows, [...authoredRows(mission), ...(automatic ? [RECORDS_NOTICE] : [])], mission.id);
    assert.equal(rows.filter(row => row === RECORDS_NOTICE).length, automatic ? 1 : 0, mission.id);
    if (automatic) { assert.equal(rows.at(-1), RECORDS_NOTICE); notices++; }
  }
  assert.equal(notices, 19);
  assert.equal(missions.length - notices, 18, 'The eighteen additive missions have no earlier records revisions');
  assert.equal(JSON.stringify(progress), bytes);
});

test('historical revision-one and revision-two descriptors keep their exact briefing without the flight records notice', () => {
  const missions = [...ALL_CAMPAIGN_MISSIONS, ...ONBOARDING_MISSIONS, ...PROGRESSION_CAMPAIGN_MISSIONS];
  assert.equal(missions.length, 42);
  for (const mission of missions) {
    assert.ok((mission.scenarioRevision || 1) < 3);
    const rows = renderBriefing(mission);
    assert.deepEqual(rows, authoredRows(mission), `${mission.id}@${mission.scenarioRevision || 1}`);
    assert.equal(rows.includes(RECORDS_NOTICE), false, mission.id);
  }
});

test('repeated briefing selection removes old notices and never duplicates the current revision notice', () => {
  const missions = getProgressionCampaignOverview(createCampaignProgress()).missions;
  const flight = missions.find(m => m.id === 'wings-of-ash');
  const historical = PROGRESSION_CAMPAIGN_MISSIONS.find(m => m.id === flight.id);
  const node = {innerHTML:''};
  for (const mission of [flight, flight, historical, missions[0], flight, missions[3]]) {
    assert.deepEqual(renderBriefing(mission, node), [
      ...authoredRows(mission), ...(mission.scenarioRevision >= 3 ? [RECORDS_NOTICE] : []),
    ]);
  }
});

test('browser expectations require exact mission labels and the complete ordered briefing including notice presence or absence', () => {
  assert.ok(expanded.includes("await expect(toggle).toHaveText('Scout battlefield · '+mission.name)"));
  for (const name of ['Emberwatch', 'The River Charter'])
    assert.ok(expanded.includes(`await expect(toggle).toHaveText('Scout battlefield · ${name}')`));
  assert.doesNotMatch(expanded, /expect\(toggle\)\.toContainText\((?:map\.name|'Classic'|'Twin Span')\)/);
  assert.ok(navigation.includes(`const RECORDS_NOTICE = '${RECORDS_NOTICE}';`));
  assert.ok(navigation.includes('const recordNote = mission.scenarioRevision >= 3 ? [RECORDS_NOTICE] : [];'));
  assert.ok(navigation.includes("await expect(page.locator('#campaignBriefing li')).toHaveText([rosterLine, ...mission.briefing, ...recordNote]);"));
  assert.ok(navigation.includes("await expect(page.locator('#campaignBriefing').getByText(RECORDS_NOTICE, {exact:true})).toHaveCount(mission.scenarioRevision >= 3 ? 1 : 0);"));
});
