import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Game, MAPS, UNITS } from '../dist/engine.js';
import { createBattleJournal, exportBattleReport } from '../dist/battle-report.js';
import { renderBattleReport, reportConcealsFinale } from '../dist/report-view.js';
import { CAMPAIGN_MISSIONS, createCampaignMission, evaluateCampaignMission, getCampaignTargets, getCampaignMission } from '../dist/campaign.js';
import { CHALLENGES, createChallenge, evaluateChallenge, getChallengeTargets } from '../dist/challenges.js';

const clone = value => structuredClone(value);
function completed({ mapId = 'classic', resumed = false, initialTime = 0, finalTime = 12, winner = 0, name = 'Skirmish' } = {}) {
  const game = new Game({ mapId, ai: false });
  game.state.time = initialTime;
  const journal = createBattleJournal(game, { resumed, name });
  if (finalTime > initialTime) {
    game.state.time = finalTime;
    game.state.gold = [671.125, 380.25];
    journal.sample(game);
  }
  game.state.winner = winner;
  if (winner === 'draw') game.state.bases.forEach(base => { base.hp = 0; });
  else game.state.bases[1 - winner].hp = 0;
  return { game, journal, report: journal.finish(game) };
}
const count = (source, pattern) => (source.match(pattern) || []).length;

// Synthetic report contracts, not played wins or rendered-browser evidence.
for(const phase of ['armed','active','defeated','restored-defeated'])test(`finale ${phase} report uses actual reveal state and retains ordinary zero rows`,()=>{
 let game=createCampaignMission('the-last-engine');
 if(phase!=='armed'){
  game.state.bases[1].hp=600;game.update(.05);
  if(phase!=='active'){const boss=game.state.units.find(u=>u.type==='colossus');game._damage(boss,boss.hp,0);game.update(.05);assert.equal(game.state.colossus.phase,'defeated');}
 }
 if(phase==='restored-defeated')game=Game.restore(game.serialize());
 const journal=createBattleJournal(game,{mode:'campaign',id:'the-last-engine',name:getCampaignMission('the-last-engine').name,resumed:phase==='restored-defeated'});
 game.state.bases[0].hp=0;game.update(.05);const before=game.serialize();
 const report=journal.finish(game,{objectiveOutcome:evaluateCampaignMission(game,'the-last-engine')}),html=renderBattleReport(report);
 assert.deepEqual(game.serialize(),before);assert.equal(report.version,2);
 for(const side of report.final.sides){
  assert.ok(side.unitComposition.some(u=>u.type==='gryphon'&&u.count===0),'ordinary zero rows remain');
  const boss=side.unitComposition.find(u=>u.type==='colossus');
  assert.equal(!!boss,phase!=='armed');if(boss&&phase!=='active')assert.equal(boss.count,0);
 }
 assert.equal(reportConcealsFinale(report),phase==='armed');
 assert.match(html,/Siege ram/,'ordinary siege wording and zero rows remain visible');
 if(phase==='armed'){
  assert.doesNotMatch(html,/last[ -]engine|colossus/i,'no boss name or technical finale ID in visible report copy');
  assert.match(html,/JSON includes exact technical encounter identifiers/);
 }else{assert.match(html,/The Last Engine/);assert.match(html,/frontier-campaign-last-engine-r2/);}
 assert.equal(JSON.parse(exportBattleReport(report)).identity.ruleset.id,'frontier-campaign-last-engine-r2','technical JSON identity is preserved');
 for(const foreign of [
  {...report,version:1},
  {...report,identity:{...report.identity,ruleset:{...report.identity.ruleset,revision:2}}},
  {...report,identity:{...report.identity,scenario:{...report.identity.scenario,id:'ordinary-mission'}}},
 ])assert.equal(reportConcealsFinale(foreign),false,'projection is limited to the exact current finale');
 const retained=exportBattleReport(report);assert.equal(journal.finish(game),report);
 assert.equal(exportBattleReport(report),retained);assert.equal(renderBattleReport(report),html);
});

// Real module outputs, rather than a guessed view-only model, are the fixtures.
test('all battlefields render the correct name, both sides, four histories and final roster', () => {
  for (const mapId of Object.keys(MAPS)) {
    const { report } = completed({ mapId });
    const html = renderBattleReport(report);
    assert.ok(html.includes(MAPS[mapId].name));
    assert.equal(count(html, /<figure class="report-chart">/g), 4);
    assert.equal(count(html, /<svg\b/g), 4);
    for (const label of ['Gold on hand', 'Income rate', 'Living army', 'Citadel health', 'You', 'Enemy', 'Objective outcomes', 'At battle’s end']) assert.ok(html.includes(label), `${mapId}: ${label}`);
    for (const unit of Object.values(UNITS)) assert.ok(html.includes(unit.name));
    assert.match(html, /Living unit roster at 0:12 · not total production/);
    assert.ok(!html.includes('undefined'));
  }
});

test('every authored campaign and trial report handles objective endings without guessing medals', () => {
  for (const mission of CAMPAIGN_MISSIONS) {
    const game = createCampaignMission(mission.id);
    const journal = createBattleJournal(game, { mode: 'campaign', id: mission.id, name: mission.name });
    game.state.bases[0].hp = 0; game.state.winner = 1;
    const objectiveOutcome = evaluateCampaignMission(game, mission.id);
    const report = journal.finish(game, { objectiveOutcome, targets: getCampaignTargets(game, mission.id) });
    const html = renderBattleReport(report);
    assert.ok(html.includes(mission.name));
    assert.ok(html.includes('Defeat'));
    for (const item of report.objectives.items) assert.ok(html.includes(item.label));
    assert.ok(!html.includes('stars earned'));
  }
  for (const trial of CHALLENGES) {
    const game = createChallenge(trial.id);
    const journal = createBattleJournal(game, { mode: 'challenge', id: trial.id, name: trial.name });
    game.state.bases[1].hp = 0; game.state.winner = 0;
    const report = journal.finish(game, {
      objectiveOutcome: evaluateChallenge(game, trial.id),
      targets: getChallengeTargets(game, trial.id).map(target => ({ ...target, side: 1, kind: 'destroy' })),
    });
    assert.ok(renderBattleReport(report).includes(trial.name));
  }
});

test('native disclosure is collapsed; region, chart and table semantics support nonvisual reading', () => {
  const html = renderBattleReport(completed().report);
  assert.ok(html.startsWith('<details class="battle-report"><summary>'));
  assert.ok(!/<details\b[^>]*\bopen\b/.test(html));
  assert.match(html, /class="report-body" role="region" aria-label="Battle report"/);
  assert.ok(!/class="report-body"[^>]*tabindex=/.test(html), 'a non-scrolling region does not add a tab stop');
  assert.ok(!html.includes('scrollable debrief'));
  assert.equal(count(html, /role="img"/g), 4);
  assert.equal(count(html, /<title>/g), 4); assert.equal(count(html, /<desc>/g), 4);
  assert.equal(count(html, /focusable="false"/g), 4);
  assert.equal(count(html, /stroke-dasharray="7 5"/g), 4);
  assert.match(html, /You · solid \/ circle/); assert.match(html, /Enemy · dashed \/ diamond/);
  assert.match(html, /elapsed battle time on the horizontal axis/);
  assert.match(html, /numeric chart summary/);
  assert.equal(count(html, /<table\b/g), count(html, /<caption>/g));
  assert.equal(count(html, /<th /g), count(html, /<th scope=/g));
  assert.equal(count(html, /class="report-table-scroll" tabindex="0" role="region"/g), 2);
  assert.match(html, /View retained sample data \(2\)/);
  assert.match(html, /data-report-status role="status" aria-live="polite"/);
  assert.ok(!/\sid=/.test(html), 'multiple reports do not collide on DOM IDs');
  assert.ok(!/<text\b/.test(html), 'axis labels remain legible HTML, never scale down inside SVG');
});

test('zero-time single-point draws keep finite coordinates and explicit outcome', () => {
  const { report } = completed({ finalTime: 0, winner: 'draw' });
  const html = renderBattleReport(report);
  assert.equal(report.timeline.length, 1);
  assert.match(html, />Draw<\/span>/);
  assert.match(html, /Both citadels fell/);
  assert.equal(count(html, /one moment recorded/g), 4);
  assert.equal(count(html, /<circle cx="120\.00"/g), 4);
  assert.ok(!/NaN|Infinity|undefined/.test(html));
  assert.match(html, /1 retained sample\./);
  assert.match(html, /0:00 battle time/);
});

test('resume coverage is explicit while engine counters include earlier play', () => {
  const { report } = completed({ resumed: true, initialTime: 120, finalTime: 165 });
  const html = renderBattleReport(report);
  assert.match(html, /resumed on this page, at 2:00/);
  assert.match(html, /Earlier play from 0:00 to 2:00 is not in these charts/);
  assert.match(html, /Battle totals above still include that earlier play/);
  assert.match(html, /Recording ends at 2:45/);
  assert.match(html, /the whole battle, including play before a resume/);
  assert.ok(!html.includes('The charts cover this page’s battle from its opening sample'));
});

test('both-side battle totals lead the debrief, with visible coverage before every chart', () => {
  for (const options of [{}, { resumed: true, initialTime: 120, finalTime: 165 }, { initialTime: 30, finalTime: 45 }]) {
    const html = renderBattleReport(completed(options).report);
    const header = html.indexOf('class="report-header"');
    const totals = html.indexOf('<h3>Battle totals</h3>');
    const coverage = html.indexOf('<aside class="report-scope"');
    const charts = html.indexOf('<figure class="report-chart">');
    const download = html.indexOf('class="report-download"');
    assert.ok(header < totals && totals < coverage && coverage < charts && charts < download);
    assert.ok(!html.includes('Cumulative engine totals'));
    assert.equal(count(html.slice(totals, coverage), /class="report-side-label"/g), 2);
    assert.ok(!/<details\b/.test(html.slice(totals, charts)), 'coverage is visible when the report opens');
    for (const label of ['Units defeated', 'Buildings placed', 'Damage dealt (HP)']) assert.ok(html.slice(totals, coverage).includes(label));
  }
});

test('fixed-step deadline labels agree across the header, coverage, axes, roster and retained data', () => {
  let elapsed = 0, firstDeadline;
  for (let step = 1; step <= 3000; step++) {
    elapsed += 0.05;
    if (step === 1200) firstDeadline = elapsed;
  }
  assert.equal(firstDeadline, 59.99999999999873);
  assert.equal(elapsed, 149.99999999999986);
  const { game, report } = completed({ resumed: true, initialTime: firstDeadline, finalTime: elapsed });
  const exported = exportBattleReport(report), state = JSON.stringify(game.serialize());
  const html = renderBattleReport(report);
  assert.match(html, /2:30 battle time/);
  assert.match(html, /resumed on this page, at 1:00\. Recording ends at 2:30/);
  assert.equal(count(html, /horizontal axis, 1:00 to 2:30\./g), 8, 'accessible chart names and descriptions agree');
  assert.equal(count(html, /class="report-x-axis" aria-hidden="true"><span>1:00<\/span><span>2:30<\/span>/g), 4);
  assert.match(html, /Living unit roster at 2:30/);
  assert.equal(count(html, /<th scope="row">1:00<\/th>/g), 2);
  assert.equal(count(html, /<th scope="row">2:30<\/th>/g), 2);
  assert.ok(!html.includes('0:59') && !html.includes('2:29'));
  assert.equal(exportBattleReport(report), exported);
  assert.equal(JSON.stringify(game.serialize()), state);
  const saved = JSON.parse(exported);
  assert.equal(saved.scope.startedAt, firstDeadline);
  assert.equal(saved.scope.endedAt, elapsed);
  assert.equal(saved.initial.time, firstDeadline);
  assert.equal(saved.final.time, elapsed);
  assert.deepEqual(saved.timeline.map(sample => sample.time), [firstDeadline, elapsed]);
});

test('whole-second labels use only a tiny tolerance, including the hour boundary', () => {
  for (const [value, label, hours] of [
    [0, '0:00', false], [59.95, '0:59', false], [59.999998, '0:59', false],
    [59.9999995, '1:00', false], [60, '1:00', false], [60.25, '1:00', false],
    [149.95, '2:29', false], [149.9999995, '2:30', false],
    [3599.999998, '59:59', false], [3599.9999995, '1:00:00', true],
    [3600, '1:00:00', true], [3600.95, '1:00:00', true],
  ]) {
    const { report } = completed({ finalTime: value });
    const exported = exportBattleReport(report), html = renderBattleReport(report);
    assert.ok(html.includes(`${label} battle time`), `${value}: header ${label}`);
    assert.ok(html.includes(`Recording ends at ${label}.`), `${value}: coverage`);
    assert.ok(html.includes(`Living unit roster at ${label}`), `${value}: roster`);
    const axis = value ? `<span>0:00</span><span>${label}</span>` : `<span>${label} · one moment recorded</span>`;
    assert.equal(count(html, new RegExp(axis, 'g')), 4, `${value}: axes`);
    assert.equal(count(html, /Elapsed battle time · m:ss \/ h:mm:ss/g), hours ? 4 : 0, `${value}: axis format label`);
    assert.equal(exportBattleReport(report), exported, `${value}: exact export unchanged`);
    assert.equal(JSON.parse(exported).scope.endedAt, value);
    assert.equal(JSON.parse(exported).timeline.at(-1).time, value);
  }
});

test('late recording without Resume does not claim a new battle started on this page', () => {
  const html = renderBattleReport(completed({ initialTime: 30, finalTime: 45 }).report);
  assert.match(html, /Recording began on this page, at 0:30/);
  assert.match(html, /Earlier play from 0:00 to 0:30 is not in these charts/);
  assert.ok(!html.includes('battle started on this page'));
});

test('long thinned timelines retain honest bounded plots and full retained tables', () => {
  const game = new Game({ ai: false }); const journal = createBattleJournal(game);
  for (let time = 2; time <= 40000; time += 2) {
    game.state.time = time; game.state.gold[0] = time * 5; journal.sample(game);
  }
  game.state.winner = 0; game.state.bases[1].hp = 0;
  const report = journal.finish(game), html = renderBattleReport(report);
  assert.equal(report.sampling.thinned, true);
  assert.ok(report.timeline.length <= 256);
  assert.match(html, /charts keep [\d,]+ of [\d,]+ recorded samples/);
  assert.match(html, /Short peaks and changes may not appear/);
  assert.match(html, /11:06:40/);
  assert.match(html, /h:mm:ss/);
  assert.match(html, /sampled range/);
  assert.match(html, /JSON keeps full precision/);
  assert.ok(html.length < 220000, `output length ${html.length}`);
  assert.equal(count(html, /<svg\b/g), 4);
  assert.equal(count(html, /<tr(?:\s[^>]*)?>/g), 4 + 12 + 9 + 2 + 2 * report.timeline.length);
});

test('labels do not claim profit, lifetime recruits, losses, or territory causation', () => {
  const html = renderBattleReport(completed().report);
  for (const phrase of ['does not show total earnings or profit', 'not total income earned', 'Total recruitment and losses are not shown', 'Buildings placed includes buildings each side started with', 'Upgrades do not count as new placements', 'Health that citadels lose automatically during overtime is not counted for either side']) {
    assert.ok(html.includes(phrase), phrase);
  }
  assert.ok(!/(Return on investment|Net profit:|Units recruited:|Units lost:|Territory gained:|You lost because)/.test(html));
  assert.match(html, /Available in this tab until a new battle or page reload/);
  assert.match(html, /Contains report data. It cannot replay the battle/);
});

test('hostile names, objectives, target names, limitations and Unicode stay escaped text', () => {
  const payload = `Raid </summary><script>alert("x")</script><svg onload='attack'><img src=x onerror=attack>&\u0000\ud800 🛡`;
  const report = clone(completed().report);
  report.context.name = payload; report.map.name = payload; report.outcome.label = payload;
  report.final.sides[0].unitComposition[0].name = payload;
  report.objectives.items = [{ label: payload, text: payload, met: false, failed: true }];
  report.objectives.targets = [{ kind: 'protect', side: 0, name: payload, lane: 0, alive: false }];
  report.limitations = [payload];
  const before = JSON.stringify(report), html = renderBattleReport(report);
  assert.ok(html.includes('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;'));
  assert.ok(html.includes('&lt;svg onload=&#39;attack&#39;&gt;'));
  assert.ok(html.includes('&amp;\ufffd\ufffd 🛡'));
  assert.ok(!/<(?:script|img|image|foreignObject|iframe|animate|set)\b/i.test(html));
  assert.ok(!/<[^>]*\s(?:on\w+|src|href)\s*=/i.test(html));
  assert.ok(!html.includes('\u0000'));
  assert.equal(count(html, /<svg\b/g), 4);
  assert.equal(JSON.stringify(report), before);
});

test('oversized labels are visibly truncated and output remains bounded', () => {
  const report = clone(completed().report);
  report.context.name = '<'.repeat(1_000_000);
  const html = renderBattleReport(report);
  assert.ok(html.includes('…'));
  assert.ok(html.length < 25000);
});

test('invalid, sparse, nonfinite or oversized data is rejected rather than fabricated', () => {
  for (const input of [null, undefined, [], {}, 'report', 4]) assert.throws(() => renderBattleReport(input), /Battle report/);
  const edits = [
    r => { r.version = 99; }, r => { r.context.name = null; }, r => { r.map.name = {}; },
    r => { r.timeline = new Array(2); }, r => { r.final.sides = new Array(2); },
    r => { r.timeline = Array(257).fill(r.timeline[0]); },
    r => { r.timeline[0].sides[0].gold = NaN; }, r => { r.timeline[0].sides[0].income = Infinity; },
    r => { r.timeline[0].sides[0].armyCount = 0.5; }, r => { r.timeline[0].sides[0].baseHp = -1; },
    r => { r.timeline[0].time = 100; }, r => { r.sampling.retainedPoints = 1; },
    r => { r.cumulativeStats[0].damage = '100'; }, r => { r.cumulativeStats[0].built = -2; },
    r => { r.final.sides[0].unitComposition = Array(17).fill({ type: 'a', name: 'a', count: 1 }); },
    r => { r.objectives.items = new Array(1); }, r => { r.objectives.targets = new Array(1); },
    r => { r.objectives.items = [{ label: 'a', met: 'yes', failed: false }]; },
    r => { r.limitations = Array(25).fill('x'); }, r => { r.outcome.result = 'unknown'; },
  ];
  for (const edit of edits) { const report = clone(completed().report); edit(report); assert.throws(() => renderBattleReport(report), /Battle report/); }
});

test('rendering is repeatable and does not mutate immutable reports, game or export data', () => {
  const { game, report } = completed(), state = JSON.stringify(game.serialize()), exported = exportBattleReport(report);
  const first = renderBattleReport(report), second = renderBattleReport(report);
  assert.equal(first, second);
  assert.equal(JSON.stringify(game.serialize()), state);
  assert.equal(exportBattleReport(report), exported);
  const source = readFileSync(new URL('../dist/report-view.js', import.meta.url), 'utf8');
  assert.ok(!/\b(?:localStorage|sessionStorage|fetch|XMLHttpRequest|document|window|URL\.createObjectURL|Blob)\b/.test(source));
  assert.ok(!/\.addEventListener\(|\.click\(/.test(source));
});

test('layout CSS leaves vertical scrolling to the result body and preserves horizontal table access', () => {
  const css = readFileSync(new URL('../dist/report-view.css', import.meta.url), 'utf8');
  assert.ok(!/\.result(?:\s|[.#:{])/.test(css));
  const reportBodyRules = [...css.matchAll(/\.battle-report \.report-body\s*\{([^}]*)\}/g)];
  assert.ok(reportBodyRules.length > 0);
  for (const [, rule] of reportBodyRules) {
    assert.ok(!/(?:max-height|height|overflow|overscroll-behavior|scrollbar|scrolling)\s*[:-]/.test(rule), 'report content flows in its parent scroller at every breakpoint');
  }
  assert.ok(!/\.report-body:focus-visible/.test(css));
  assert.match(css, /@media \(max-width: 360px\)/);
  assert.match(css, /grid-template-columns: minmax\(27px, max-content\) minmax\(0, 1fr\)/);
  assert.match(css, /\.report-table-scroll[^}]*overflow-x: auto/s);
  assert.match(css, /\.report-samples \.report-table[^}]*min-width: 420px/s);
  assert.match(css, /summary:focus-visible/);
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(css, /forced-colors: active/);
  assert.ok(!/@keyframes/.test(css));
  assert.ok(!/font-size: [0-9]px/.test(css));
});

test('side names stay whole in narrow tables while numeric cells can wrap inside fixed columns', () => {
  const html = renderBattleReport(completed().report);
  assert.equal(count(html, /<th scope="col" class="report-side-label">Enemy<\/th>/g), 2, 'totals and final roster headings');
  assert.equal(count(html, /<th scope="row" class="report-side-label">Enemy<\/th>/g), 4, 'chart summary row names');
  const css = readFileSync(new URL('../dist/report-view.css', import.meta.url), 'utf8');
  assert.match(css, /\.report-table th\.report-side-label\s*\{[^}]*white-space: nowrap;[^}]*overflow-wrap: normal;[^}]*word-break: normal;/);
  assert.match(css, /\.report-chart-values th:first-child\s*\{[^}]*width: 4\.5em;/);
  assert.match(css, /\.report-table\s*\{[^}]*width: 100%;[^}]*table-layout: fixed;/);
  assert.match(css, /\.report-table td\s*\{[^}]*overflow-wrap: anywhere;/);
});
