// Developer-only Chapter 6 presentation acceptance fixtures. Never shipped in dist.
// --write-preview creates an isolated sibling runtime with session-only profiles.
import assert from 'node:assert/strict';
import { cp, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Game } from '../../dist/engine.js';
import {
  CAMPAIGN_MISSIONS, SHARED_CROSSING_MISSIONS, ONE_SIGNAL_MISSIONS, LANTERNS_MISSIONS,
  BORROWED_GROUND_MISSIONS, RIVER_BETWEEN_MISSIONS, createCampaignProgress,
  normalizeCampaignProgress, createCampaignMission, getCampaignMission,
  getCampaignTargets, evaluateCampaignMission,
} from '../../dist/campaign.js';
import { advanceObjectiveBattle } from '../../dist/objectives.js';
import { encodeBattle, decodeBattle, scenarioForBattle } from '../../dist/battle-codec.js';
import { createPolicy } from '../river-between/paid-policies.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const ID = 'a-river-between-us';
const hash = value => createHash('sha256').update(value).digest('hex');
const rounded = value => Array.isArray(value) ? value.map(rounded) : value && typeof value === 'object'
  ? Object.fromEntries(Object.entries(value).map(([key, item]) => [key, rounded(item)]))
  : typeof value === 'number' ? Math.round(value * 1e6) / 1e6 : value;
const chapter = [...SHARED_CROSSING_MISSIONS, ...ONE_SIGNAL_MISSIONS, ...LANTERNS_MISSIONS,
  ...BORROWED_GROUND_MISSIONS, ...RIVER_BETWEEN_MISSIONS];

function syntheticProgress(through = null) {
  const progress = createCampaignProgress();
  for (const mission of CAMPAIGN_MISSIONS) progress.missions[mission.id] = { completed: true, stars: 1, bestTime: 60 };
  if (through) {
    for (const mission of chapter) {
      progress.missions[mission.id] = { completed: true, stars: 1, bestTime: mission.timeLimit };
      if (mission.id === through) break;
    }
  }
  return normalizeCampaignProgress(progress);
}
function profile(progress, battle = null) {
  return {
    'ironroot.campaign.v1': JSON.stringify(progress),
    'ironroot.settings.v1': JSON.stringify({ sound: false, music: false, sfx: false, volume: .3, reducedMotion: false, quality: 'high' }),
    ...(battle ? { 'ironroot.battle.v1': JSON.stringify(battle) } : {}),
  };
}
function observation(game) {
  return {
    time: game.state.time, cores: game.state.bases.map(base => base.hp),
    heldSeconds: game.state.campaignControl.heldSeconds,
    targets: getCampaignTargets(game, ID).map(target => ({ name: target.name, originalId: target.originalId,
      standing: !!target.building, hp: target.building?.hp ?? null })),
    outcome: evaluateCampaignMission(game, ID),
  };
}
function paidTerminalCheckpoint(policyId, progress) {
  const game = createCampaignMission(ID), mission = getCampaignMission(ID), policy = createPolicy(policyId);
  const ledger = { spending: [0, 0], refunds: [0, 0], income: [0, 0], purchases: [0, 0], maxError: [0, 0] };
  for (const method of ['build', 'upgrade', 'cast', 'sell', 'buyCitadelOption']) {
    const original = game[method];
    game[method] = function (...args) {
      const side = method === 'build' ? (args[3] ?? 0) : method === 'cast' ? (args[2] ?? 0) : (args[1] ?? 0);
      const gold = this.state.gold[side], kills = this.state.stats.kills[side], result = original.apply(this, args);
      if (result.ok) {
        const cost = gold - this.state.gold[side] + 2 * (this.state.stats.kills[side] - kills);
        if (cost >= 0) ledger.spending[side] += cost; else ledger.refunds[side] -= cost;
        ledger.purchases[side]++;
      }
      return result;
    };
  }
  let outcome = evaluateCampaignMission(game, ID), previous;
  while (!outcome.completed && !outcome.failed) {
    policy.step(game);
    previous = game.serialize();
    for (const side of [0, 1]) ledger.income[side] += .05 * (5 + game.state.buildings
      .filter(building => building.side === side && building.type === 'mint' && building.hp > 0)
      .reduce((sum, building) => sum + 2.5 * (1 + .5 * (building.level - 1)), 0));
    outcome = advanceObjectiveBattle(game, .05, current => evaluateCampaignMission(current, ID), mission.timeLimit);
    for (const side of [0, 1]) {
      const opening = side ? mission.enemyGold : mission.startingGold;
      const expected = opening + ledger.income[side] + 2 * game.state.stats.kills[side] + ledger.refunds[side] - ledger.spending[side];
      ledger.maxError[side] = Math.max(ledger.maxError[side], Math.abs(game.state.gold[side] - expected));
      assert.ok(ledger.maxError[side] < 1e-6, 'Ordinary-price ledger must reconcile for each side');
    }
  }
  assert.ok(outcome.completed, `${policyId} must win through ordinary play`);
  const checkpoint = Game.restore(previous), checkpointOutcome = evaluateCampaignMission(checkpoint, ID);
  assert.ok(!checkpointOutcome.completed && !checkpointOutcome.failed, 'Checkpoint must precede terminal update');
  const battle = encodeBattle(checkpoint, scenarioForBattle(null, ID, checkpoint), { campaignProgress: progress });
  const restored = decodeBattle(battle, { campaignProgress: progress }).game;
  assert.deepEqual(restored.serialize(), checkpoint.serialize());
  const resumedOutcome = advanceObjectiveBattle(restored, .05, current => evaluateCampaignMission(current, ID), mission.timeLimit);
  assert.ok(resumedOutcome.completed, 'Normal resumed update must complete');
  assert.deepEqual(restored.serialize(), game.serialize(), 'Checkpoint continuation must equal ordinary paid terminal');
  const route = game.state.bases[1].hp <= 0 ? 'enemy-citadel' : 'command-and-crossings';
  if (policyId === 'infantry-routes') {
    assert.equal(route, 'enemy-citadel');
    assert.ok(getCampaignTargets(checkpoint, ID).every(target => target.building), 'Core checkpoint must retain original command post');
    assert.ok(getCampaignTargets(game, ID).every(target => target.building), 'Core victory must leave original command post standing');
  } else {
    assert.equal(route, 'command-and-crossings');
    assert.ok(game.state.bases[1].hp > 0);
  }
  return { battle, receipt: rounded({ policy: policyId, seed: mission.seed, route,
    checkpoint: observation(checkpoint), terminal: observation(game), terminalLedger: ledger,
    commands: policy.report(), battleSha256: hash(JSON.stringify(battle)),
    provenance: 'Ordinary paid engine play from authored initial state; saved immediately before the terminal update. No HP, time, objective, income or treasury edits.' }) };
}

export function buildFixtures() {
  const progress = syntheticProgress('borrowed-ground');
  const compound = paidTerminalCheckpoint('crossings-first', progress);
  const core = paidTerminalCheckpoint('infantry-routes', progress);
  return {
    profiles: {
      shared: profile(syntheticProgress()),
      lanterns: profile(syntheticProgress('lanterns-on-the-water')),
      borrowed: profile(progress),
      compound: profile(progress, compound.battle),
      core: profile(progress, core.battle),
      completed: profile(syntheticProgress(ID)),
    },
    receipts: { compound: compound.receipt, core: core.receipt },
  };
}
async function runtimeHashes(directory) {
  return Object.fromEntries(await Promise.all((await readdir(directory)).sort()
    .map(async name => [name, hash(await readFile(path.join(directory, name)))])));
}
export async function prepareNative({ output = path.resolve(root, '../chapter-six-preview'), writePreview = false } = {}) {
  output = path.resolve(output);
  assert.ok(output !== root && !output.startsWith(root + path.sep), 'Preview must be outside the source checkout');
  const { profiles, receipts } = buildFixtures(), source = await runtimeHashes(path.join(root, 'dist'));
  const metadata = {
    scope: 'Developer-only synthetic prior progression, synthetic completed-menu profile, and ordinary paid-engine terminal checkpoints. Not from-zero browser wins or production-profile evidence.',
    storage: 'sessionStorage only; per-fixture ironroot.chapter-six-closure.native namespace; no real-profile fallback',
    fixtureNames: Object.keys(profiles), receipts, sourceFiles: source,
    sourceRuntimeSha256: hash(JSON.stringify(source)), previewPrepared: writePreview,
  };
  if (writePreview) {
    let app = await readFile(path.join(root, 'dist/app.js'), 'utf8');
    assert.ok(!/\b(?:window|globalThis)\.localStorage\b/.test(app), 'Direct real-profile access not allowed');
    for (const name of Object.keys(source).filter(name => name.endsWith('.js') && name !== 'app.js')) {
      assert.ok(!/\blocalStorage\b/.test(await readFile(path.join(root, 'dist', name), 'utf8')), `Unisolated storage reference in ${name}`);
    }
    const prefix = `// Developer-only fixture profile. Never fall back to a real profile.\nconst localStorage = (() => {\n  const profiles = ${JSON.stringify(profiles)};\n  const requested = new URLSearchParams(location.search).get('fixture');\n  const mode = Object.hasOwn(profiles, requested) ? requested : 'shared';\n  const backend = window.sessionStorage, prefix = 'ironroot.chapter-six-closure.native.' + mode + '.';\n  const storage = { getItem: key => backend.getItem(prefix + key), setItem: (key, value) => backend.setItem(prefix + key, String(value)), removeItem: key => backend.removeItem(prefix + key) };\n  if (backend.getItem(prefix + 'initialized') !== '1') {\n    for (const [key, value] of Object.entries(profiles[mode])) storage.setItem(key, value);\n    backend.setItem(prefix + 'initialized', '1');\n  }\n  return storage;\n})();\ndocument.title = 'QA sandbox: Chapter 6 closure';\n`;
    assert.ok(app.includes("'serviceWorker' in navigator &&"));
    app = app.replace("'serviceWorker' in navigator &&", "false && // Developer preview: no service-worker installation.\n  'serviceWorker' in navigator &&");
    await mkdir(path.join(output, '.openai'), { recursive: true });
    await cp(path.join(root, 'dist'), path.join(output, 'dist'), { recursive: true });
    await writeFile(path.join(output, '.openai/hosting.json'), JSON.stringify({ static: { directory: 'dist' } }) + '\n');
    await writeFile(path.join(output, 'dist/app.js'), prefix + app);
    let html = await readFile(path.join(root, 'dist/index.html'), 'utf8');
    assert.ok(html.includes('<div class="welcome-rule"></div>'));
    html = html.replace('<div class="welcome-rule"></div>', '<p style="font-size:12px">LOCAL QA: synthetic prior records and completed menu. Terminal checkpoints are ordinary paid-engine runs, not browser-earned wins. Temporary tab storage only.</p><nav aria-label="QA fixture">' + Object.keys(profiles).map(name => `<a href="?fixture=${name}">${name}</a>`).join(' · ') + '</nav><div class="welcome-rule"></div>');
    html = html.replace(/Campaign · Skirmish · Field trials · v[0-9.]+/, 'LOCAL QA · Chapter 6 closure · no real profile access');
    await writeFile(path.join(output, 'dist/index.html'), html);
    const preview = await runtimeHashes(path.join(output, 'dist'));
    const changed = Object.keys(source).filter(name => source[name] !== preview[name]);
    assert.deepEqual(changed.sort(), ['app.js', 'index.html']);
    assert.deepEqual(Object.keys(source), Object.keys(preview));
    metadata.preview = { directory: output, runtimeFiles: Object.keys(source).length,
      runtimeSha256: hash(JSON.stringify(preview)), changedFiles: changed,
      differences: 'Only namespaced session storage, fixture links/disclosure and disabled service-worker installation. All other runtime bytes unchanged.' };
  }
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(path.resolve(output, '../chapter-six-native-fixtures.json'), JSON.stringify(metadata, null, 2) + '\n');
  return metadata;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2), output = args.find(arg => !arg.startsWith('--'));
  const result = await prepareNative({ ...(output ? { output } : {}), writePreview: args.includes('--write-preview') });
  console.log(JSON.stringify({ previewPrepared: result.previewPrepared, output: result.preview?.directory ?? null,
    sourceRuntimeSha256: result.sourceRuntimeSha256,
    checkpoints: Object.fromEntries(Object.entries(result.receipts).map(([name, receipt]) => [name, {
      time: receipt.checkpoint.time, completionTime: receipt.terminal.time, route: receipt.route,
      commandPostStanding: receipt.terminal.targets[0].standing,
    }])) }));
}
