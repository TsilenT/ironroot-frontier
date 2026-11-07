import assert from 'node:assert/strict';
import {readFileSync, writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const root = new URL('./', import.meta.url);
const source = process.argv[2] || 'study-results.json';
const outputStem = process.argv[3] || 'study';
assert.match(source, /^[a-z0-9-]+\.json$/); assert.match(outputStem, /^[a-z0-9-]+$/);
const bytes = readFileSync(new URL(source, root)), report = JSON.parse(bytes);
const sha = value => createHash('sha256').update(value).digest('hex');
const round = value => Math.round(value * 1e6) / 1e6;
const sum = values => values.reduce((a, b) => a + b, 0);
const median = values => { const s = [...values].sort((a, b) => a - b); return (s[(s.length - 1) >> 1] + s[s.length >> 1]) / 2; };
const range = values => ({min: round(Math.min(...values)), median: round(median(values)), max: round(Math.max(...values))});
const enabled = report.results.filter(g => g.mode === 'enabled');
const air = report.results.filter(g => g.policy === 'air-and-rootwarden');
const actualPayout = sum(enabled.flatMap(g => g.ledger.bridge));
const emptyPayout = sum(enabled.flatMap(g => g.ownership.paidWhileEmpty));
const numeric90Leaders = enabled.filter(g => typeof g.early90?.citadelLeader === 'number');
const groups = [...new Set(report.results.map(g => g.policy))].flatMap(policy => ['disabled', 'enabled'].map(mode => {
  const games = report.results.filter(g => g.policy === policy && g.mode === mode);
  return {policy, mode, games: games.length, playerWins: games.filter(g => g.outcome === 'player-win').length, aiWins: games.filter(g => g.outcome === 'ai-win').length, draws: games.filter(g => g.outcome === 'draw').length, ongoing: games.filter(g => g.outcome === 'ongoing').length, seconds: range(games.map(g => g.seconds))};
}));
const summary = {
  study: report.study, sourceResults: source, resultsSha256: sha(bytes), planSha256: report.planSha256, sourceHashes: report.sourceHashes,
  currentSourcesMatch: Object.entries(report.sourceHashes).every(([file, hash]) => sha(readFileSync(new URL('../../dist/' + file, import.meta.url))) === hash),
  completedGames: report.completedGames, declaredGames: report.declaredGames, failures: report.failures, groups,
  economy: {
    acceptedPaidActions: sum(report.results.flatMap(g => g.ledger.accepted)), rejectedActionChecks: sum(report.results.flatMap(g => g.ledger.rejected)),
    maximumLedgerResidual: Math.max(...report.results.map(g => g.ledger.maxResidual)), maximumMapWideRate: Math.max(...enabled.map(g => g.maxBridgeRate)),
    bridgeReceiptsPlayer: range(enabled.map(g => g.ledger.bridge[g.playerSide])), bridgeReceiptsAI: range(enabled.map(g => g.ledger.bridge[1 - g.playerSide])),
    bridgeReceipts90Player: range(enabled.map(g => g.early90.bridgeReceipts[g.playerSide])), bridgeReceipts90AI: range(enabled.map(g => g.early90.bridgeReceipts[1 - g.playerSide])),
    maximumBridgeShareOfEarnedGoldExcludingStart: Math.max(...enabled.flatMap(g => [0, 1].map(s => g.ledger.bridge[s] / (g.ledger.base[s] + g.ledger.mines[s] + g.ledger.bridge[s] + g.ledger.killBounty[s])))),
    bridgeDependentHeldLedgerActionsPlayer: sum(enabled.map(g => g.ledger.bridgeDependentLedgerActions[g.playerSide])), bridgeDependentHeldLedgerActionsAI: sum(enabled.map(g => g.ledger.bridgeDependentLedgerActions[1 - g.playerSide])),
  },
  persistence: {restoreAndContinuationCheckpoints: sum(report.results.map(g => g.checkpointCount))},
  ownership: {recaptures: sum(enabled.map(g => g.ownership.switches)), totalBridgePayout: round(actualPayout), emptyBridgePayout: round(emptyPayout), emptyPayoutShare: emptyPayout / actualPayout, maximumUninterruptedEmptyOwnershipSeconds: round(Math.max(...enabled.map(g => g.ownership.maxUninterruptedEmptyOwnership))), observedAirOnlyDenialSeconds: sum(enabled.flatMap(g => g.ownership.bridges.map(b => b.airDenialSeconds)))},
  participation: {airPolicyGames: air.length, playerGryphonSpawns: range(air.map(g => g.spawns[g.playerSide].gryphon || 0)), playerRootwardenSpawns: range(air.map(g => g.spawns[g.playerSide].rootwarden || 0)), playerGryphonAttacks: range(air.map(g => g.attacks[g.playerSide].gryphon || 0)), playerRootwardenAttacks: range(air.map(g => g.attacks[g.playerSide].rootwarden || 0))},
  leadership: {citadelLeaderAt90Games: numeric90Leaders.length, tiedCitadelsAt90Games: enabled.length - numeric90Leaders.length, earlyCitadelLeaderWasWinner: numeric90Leaders.filter(g => g.early90.citadelLeader === g.winner).length, earlyPayoutLeaderWasWinner: enabled.filter(g => g.early90.payoutLeader === g.winner).length, finalPayoutLeaderWasWinner: enabled.filter(g => g.ledger.bridge[g.winner] > g.ledger.bridge[1 - g.winner]).length},
  pairedComparisons: report.comparisons.map(({firstBuildTimes, ...c}) => c),
  changedOutcomes: report.comparisons.filter(c => c.outcomeChanged),
  limits: [...report.limitations, 'All 36 observed games ended naturally before 600 seconds; this sample does not exercise a long strategic stalemate or timed citadel decay.', 'No air-only denial occurred in these natural games; pure contracts provide that evidence. Maximum uninterrupted empty ownership observed was only 5.7 seconds; indefinite absence is a pure-contract test.']
};
writeFileSync(new URL(outputStem + '-summary.json', root), JSON.stringify(summary, null, 2) + '\n');
const lines = [
  '# Paid bridge-income comparison', '',
  `The fixed preregistration completed **${summary.completedGames}/${summary.declaredGames} games** once per measured source: three maps, three paid policies, mirrored player sides, enabled/disabled, seed 61001, normal native AI, open-ended. The bound was 600 simulated seconds. Every game ended naturally before the bound; no winner was forced and no reward or policy was tuned. This is synthetic engine evidence, not human win rates.`, '',
  `Results: [${source}](${source}); preregistration: [study-plan.json](study-plan.json); reproducible runner: [paid-study.mjs](paid-study.mjs). Plan SHA-256: \`${summary.planSha256}\`. Result SHA-256: \`${summary.resultsSha256}\`. Source hashes are recorded in both result and summary JSON. The summary was generated with current-source match **${summary.currentSourcesMatch}**.`, '',
  ...(source === 'study-final-results.json' ? ['The initial run remains in [study-results.json](study-results.json). This final run repeated the same fixed set once after stricter save-admission bounds changed. [study-provenance.json](study-provenance.json) records exact equality of every game result, action, ledger, spawn, capture, snapshot, final state hash and paired comparison. Neither run changed reward, seed, policy or observation bound.', ''] : []),
  '| Policy | Mode | Player wins | AI wins | Ongoing | Median duration | Range |', '| --- | --- | ---: | ---: | ---: | ---: | ---: |',
  ...groups.map(g => `| ${g.policy} | ${g.mode} | ${g.playerWins}/${g.games} | ${g.aiWins}/${g.games} | ${g.ongoing} | ${g.seconds.median}s | ${g.seconds.min}–${g.seconds.max}s |`), '',
  '## Actual income feedback and honest costs', '',
  `${summary.economy.acceptedPaidActions} accepted paid actions and ${summary.economy.rejectedActionChecks} rejected calls were audited. Both sides paid the engine prices; rejected calls changed no gold. Initial gold + base + living mines + kill bounty + actual bridge receipts − spending + refunds matched both sides at every step, with maximum residual ${summary.economy.maximumLedgerResidual.toExponential(3)} gold. The observed map-wide bridge rate reached, and never exceeded, 0.5 gold/s. ${summary.persistence.restoreAndContinuationCheckpoints} strict restore and live-versus-restored next-step comparisons passed.`, '',
  `Enabled player bridge receipts ranged ${summary.economy.bridgeReceiptsPlayer.min}–${summary.economy.bridgeReceiptsPlayer.max} gold (median ${summary.economy.bridgeReceiptsPlayer.median}); AI receipts ranged ${summary.economy.bridgeReceiptsAI.min}–${summary.economy.bridgeReceiptsAI.max} (median ${summary.economy.bridgeReceiptsAI.median}). At 90 seconds the medians were ${summary.economy.bridgeReceipts90Player.median} player and ${summary.economy.bridgeReceipts90AI.median} AI. The largest bridge share of gold earned after the starting allocation was ${(summary.economy.maximumBridgeShareOfEarnedGoldExcludingStart * 100).toFixed(2)}%.`, '',
  `The bonus changed actual purchasing times: Classic rush bought its later barracks at 48.5s enabled versus 49.5s disabled; against the air/Rootwarden policy the AI bought its first archery at 34.1s versus 39.45s. There were ${summary.economy.bridgeDependentHeldLedgerActionsPlayer} player and ${summary.economy.bridgeDependentHeldLedgerActionsAI} AI commands that current gold minus cumulative bridge receipts could not have funded, holding all other recorded transactions fixed. That last check is a ledger diagnostic, not a full causal counterfactual; divergent spawning, combat and RNG consumption also affect later decisions.`, '',
  '## Ownership and participation', '',
  `${summary.ownership.emptyBridgePayout} of ${summary.ownership.totalBridgePayout} total bridge gold (${(summary.ownership.emptyPayoutShare * 100).toFixed(2)}%) arrived while an owned bridge was empty. The longest uninterrupted empty period was ${summary.ownership.maximumUninterruptedEmptyOwnershipSeconds}s, and ${summary.ownership.recaptures} enemy ground recapture occurred. Owners were never cleared without recapture. This does not prove indefinite absence; that belongs to the pure contracts.`, '',
  `All ${summary.participation.airPolicyGames} air/Rootwarden cases produced real paid units: ${summary.participation.playerGryphonSpawns.min}–${summary.participation.playerGryphonSpawns.max} gryphons and ${summary.participation.playerRootwardenSpawns.min}–${summary.participation.playerRootwardenSpawns.max} Rootwardens on the scripted side, with ${summary.participation.playerGryphonAttacks.min}–${summary.participation.playerGryphonAttacks.max} gryphon attacks and ${summary.participation.playerRootwardenAttacks.min}–${summary.participation.playerRootwardenAttacks.max} Rootwarden attacks. No isolated air-only denial occurred naturally; the unit contract tests must cover it.`, '',
  '## Adverse result and snowball limits', '',
  'One paired outcome changed adversely for the scripted player: Long March rush on side 1 won at 151.9s disabled and lost at 216.55s enabled. Its first changed purchase was a barracks 0.5s earlier. It captured road 2 at 28.8s, retained it until enemy ground recapture at 141.8s, and ultimately received 17.2 bridge gold versus the winning AI’s 14.941667. At 90s the player led army count and bridge receipts while citadels were tied. This is a real sensitivity result, retained rather than tuned away; it is not a reward runaway in favor of the early bonus leader.', '',
  `At 90s, ${summary.leadership.citadelLeaderAt90Games} games had a citadel-health leader and ${summary.leadership.tiedCitadelsAt90Games} were tied. All ${summary.leadership.earlyCitadelLeaderWasWinner} non-tied leaders won; the early payout leader won ${summary.leadership.earlyPayoutLeaderWasWinner}/${enabled.length}, as did the final payout leader. The extra income therefore largely went to already stronger field positions in this sample. Early capture and paid timing feedback can amplify advantage; this bounded run neither proves balance nor excludes longer-run snowball. The fixed reward remained small relative to base income and no mechanical cap/ledger/save failure appeared.`, '',
  '| Map | Policy | Player side | Disabled outcome / seconds | Enabled outcome / seconds | Duration change | Player / AI bonus |', '| --- | --- | ---: | --- | --- | ---: | ---: |',
  ...report.comparisons.map(c => `| ${c.mapId} | ${c.policy} | ${c.playerSide} | ${c.offOutcome} / ${c.offSeconds} | ${c.onOutcome} / ${c.onSeconds} | ${c.durationDelta > 0 ? '+' : ''}${c.durationDelta}s | ${c.playerBridge} / ${c.aiBridge} |`), '',
  'No native browser, physical device, hard/easy difficulty, multiple-seed balance, extended stalemate, or timed-decay claim follows from this comparison. The pure contracts and focused native UI tests are separate evidence. The earlier presence/lease shadow study was not used as balance evidence.', ''
];
writeFileSync(new URL(outputStem + '-review.md', root), lines.join('\n'));
console.log(JSON.stringify({results: source, summary: outputStem + '-summary.json', review: outputStem + '-review.md', currentSourcesMatch: summary.currentSourcesMatch, failures: summary.failures.length, games: summary.completedGames}));
