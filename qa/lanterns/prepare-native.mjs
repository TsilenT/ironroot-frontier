// Developer-only paid checkpoints. No real profile access and no browser-earned win claim.
// Default: regenerate concise metadata only. Copy the current runtime only with --write-preview.
import assert from 'node:assert/strict';
import { cp, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createCampaignMission, createCampaignProgress, CAMPAIGN_MISSIONS, normalizeCampaignProgress, getCampaignMission, getCampaignTargets, evaluateCampaignMission } from '../../dist/campaign.js';
import { observe, isPointVisible } from '../../dist/fog.js';
import { advanceObjectiveBattle } from '../../dist/objectives.js';
import { encodeBattle, decodeBattle, scenarioForBattle } from '../../dist/battle-codec.js';
import { createPolicy } from './paid-policies.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const ID = 'lanterns-on-the-water';
const hash = value => createHash('sha256').update(value).digest('hex');
const rounded = value => Array.isArray(value) ? value.map(rounded) : value && typeof value === 'object'
  ? Object.fromEntries(Object.entries(value).map(([key, item]) => [key, rounded(item)]))
  : typeof value === 'number' ? Math.round(value * 1e6) / 1e6 : value;

export function syntheticPrerequisites() {
  const progress = createCampaignProgress();
  for (const mission of CAMPAIGN_MISSIONS) progress.missions[mission.id] = { completed: true, stars: 1, bestTime: 60 };
  progress.missions['shared-crossing'] = { completed: true, stars: 1, bestTime: 180 };
  progress.missions['one-signal-is-enough'] = { completed: true, stars: 1, bestTime: 210 };
  return normalizeCampaignProgress(progress);
}

export function buildFixtures() {
  const progress = syntheticPrerequisites(), game = createCampaignMission(ID), mission = getCampaignMission(ID);
  const policy = createPolicy('scout-commit'), seenOriginals = new Set(), receipts = {};
  const profile = battle => ({
    'ironroot.campaign.v1': JSON.stringify(progress),
    'ironroot.settings.v1': JSON.stringify({ sound: false, music: false, sfx: false, volume: .3, reducedMotion: false, quality: 'high' }),
    ...(battle ? { 'ironroot.battle.v1': JSON.stringify(battle) } : {})
  });
  const profiles = { fresh: profile(null) }, battles = {};
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
  function capture(name, details = {}) {
    const outcome = evaluateCampaignMission(game, ID), view = observe(game, 0);
    assert.ok(!outcome.completed && !outcome.failed, `${name} must be an active checkpoint`);
    const battle = name === 'fresh' ? null : encodeBattle(game, scenarioForBattle(null, ID, game), { campaignProgress: progress });
    if (battle) {
      assert.deepEqual(decodeBattle(battle, { campaignProgress: progress }).game.serialize(), game.serialize());
      profiles[name] = profile(battle); battles[name] = battle;
    }
    receipts[name] = rounded({
      route: name === 'fresh' ? null : 'scout-commit', seed: mission.seed, time: game.state.time,
      targets: getCampaignTargets(game, ID).map(target => {
        const visible = view.state.buildings.some(b => b.id === target.originalId), memory = view.fog.memories.find(m => m.id === target.originalId);
        return { name: target.name, originalId: target.originalId, alive: !!target.building,
          displayState: !target.building ? 'dispatch-confirmed destroyed' : visible ? 'visible' : memory ? 'last seen' : 'charted',
          locationInSight: isPointVisible(game, 0, target.x, game.map.lanes[target.lane]),
          actualHpForQA: target.building?.hp ?? null, ...(memory ? { lastSeen: memory.observedAt } : {}) };
      }),
      cores: game.state.bases.map(base => base.hp), ledger: structuredClone(ledger),
      battleSha256: battle ? hash(JSON.stringify(battle)) : null, ...details
    });
  }
  capture('fresh', { note: 'No saved battle; open the unlocked mission briefing. Prior records are synthetic.' });
  let outcome = evaluateCampaignMission(game, ID);
  while (!outcome.completed && !outcome.failed) {
    policy.step(game);
    for (const side of [0, 1]) ledger.income[side] += .05 * (5 + game.state.buildings.filter(b => b.side === side && b.type === 'mint' && b.hp > 0).reduce((total, b) => total + 2.5 * (1 + .5 * (b.level - 1)), 0));
    outcome = advanceObjectiveBattle(game, .05, g => evaluateCampaignMission(g, ID), mission.timeLimit);
    for (const side of [0, 1]) {
      const openingGold = side ? mission.enemyGold : mission.startingGold;
      const expected = openingGold + ledger.income[side] + 2 * game.state.stats.kills[side] + ledger.refunds[side] - ledger.spending[side];
      ledger.maxError[side] = Math.max(ledger.maxError[side], Math.abs(game.state.gold[side] - expected));
      assert.ok(ledger.maxError[side] < 1e-6, 'ordinary income/purchase ledger must reconcile');
    }
    const view = observe(game, 0), targets = getCampaignTargets(game, ID);
    for (const target of targets) if (view.state.buildings.some(b => b.id === target.originalId)) seenOriginals.add(target.originalId);
    const stale = targets.find(target => target.building && seenOriginals.has(target.originalId) && view.fog.memories.some(m => m.id === target.originalId && game.state.time - m.observedAt >= 2));
    if (!receipts.stale && stale) capture('stale', { note: 'An original survives outside sight, last observed at least two seconds earlier. No memory injection.' });
    if (!receipts.dispatch && game.state.time >= 83 - 1e-8) {
      assert.equal(targets.filter(target => !target.building).length, 1);
      capture('dispatch', { note: 'One original is confirmed destroyed. Its chart location remains in sight; this is not evidence of an unseen destruction event.' });
    }
    if (!receipts.finish && game.state.time >= 97 - 1e-8) {
      assert.equal(targets.filter(target => !target.building).length, 1);
      capture('finish', { note: 'Active paid checkpoint near a natural original-post victory. No HP or objective edits.' });
    }
  }
  assert.ok(outcome.completed && outcome.objectives[0].value === 2 && game.state.bases[1].hp > 0);
  assert.deepEqual(Object.keys(profiles).sort(), ['dispatch', 'finish', 'fresh', 'stale']);
  const continuation = decodeBattle(battles.finish, { campaignProgress: progress }).game;
  let continued = evaluateCampaignMission(continuation, ID);
  while (!continued.completed && !continued.failed && continuation.state.time < receipts.finish.time + 5) {
    continued = advanceObjectiveBattle(continuation, .05, g => evaluateCampaignMission(g, ID), mission.timeLimit);
  }
  assert.ok(continued.completed && continued.objectives[0].value === 2, 'near-win checkpoint must finish with no further player commands');
  receipts.finish.continuation = rounded({ result: 'original-post victory', time: continuation.state.time,
    secondsAfterCheckpoint: continuation.state.time - receipts.finish.time, additionalPlayerCommands: 0 });
  return { profiles, receipts, completionTime: rounded(game.state.time), syntheticPrerequisiteRecords: Object.keys(progress.missions).length };
}

async function runtimeHashes(directory) {
  return Object.fromEntries(await Promise.all((await readdir(directory)).sort().map(async name => [name, hash(await readFile(path.join(directory, name)))])));
}

export async function prepareNative({ output = path.resolve(root, '../preview'), writePreview = false } = {}) {
  output = path.resolve(output);
  assert.ok(output !== root && !output.startsWith(root + path.sep), 'preview must be outside the source checkout');
  const { profiles, receipts, completionTime, syntheticPrerequisiteRecords } = buildFixtures();
  const source = await runtimeHashes(path.join(root, 'dist'));
  const metadata = {
    scope: 'Developer-only synthetic prerequisites plus ordinary paid-engine checkpoints. Not browser-earned wins or production-profile persistence evidence.',
    mission: ID, syntheticPrerequisiteRecords, storage: 'sessionStorage only, per-fixture ironroot.lanterns.native namespace',
    fixtureNames: ['fresh', 'stale', 'dispatch', 'finish'], receipts, completionTime,
    sourceRuntimeSha256: hash(JSON.stringify(source)), previewPrepared: writePreview
  };
  if (writePreview) {
    let app = await readFile(path.join(root, 'dist/app.js'), 'utf8');
    assert.ok(!/\b(?:window|globalThis)\.localStorage\b/.test(app), 'direct real-profile access is not allowed in this fixture');
    for (const name of Object.keys(source).filter(name => name.endsWith('.js') && name !== 'app.js')) {
      assert.ok(!/\blocalStorage\b/.test(await readFile(path.join(root, 'dist', name), 'utf8')), `unisolated storage reference in ${name}`);
    }
    const prefix = `// Developer-only fixture profile; never falls back to the real profile.\nconst localStorage = (() => {\n  const profiles = ${JSON.stringify(profiles)};\n  const requested = new URLSearchParams(location.search).get('fixture');\n  const mode = Object.hasOwn(profiles, requested) ? requested : 'fresh';\n  const backend = window.sessionStorage, prefix = 'ironroot.lanterns.native.' + mode + '.';\n  const storage = { getItem: key => backend.getItem(prefix + key), setItem: (key, value) => backend.setItem(prefix + key, String(value)), removeItem: key => backend.removeItem(prefix + key) };\n  if (backend.getItem(prefix + 'initialized') !== '1') {\n    for (const [key, value] of Object.entries(profiles[mode])) storage.setItem(key, value);\n    backend.setItem(prefix + 'initialized', '1');\n  }\n  return storage;\n})();\ndocument.title = 'QA sandbox: Lanterns on the Water';\n`;
    assert.ok(app.includes("'serviceWorker' in navigator &&"));
    app = app.replace("'serviceWorker' in navigator &&", "false && // Developer preview: do not install a service worker.\n  'serviceWorker' in navigator &&");
    await mkdir(path.join(output, '.openai'), { recursive: true });
    await cp(path.join(root, 'dist'), path.join(output, 'dist'), { recursive: true });
    await writeFile(path.join(output, '.openai/hosting.json'), JSON.stringify({ static: { directory: 'dist' } }) + '\n');
    await writeFile(path.join(output, 'dist/app.js'), prefix + app);
    let html = await readFile(path.join(root, 'dist/index.html'), 'utf8');
    assert.ok(html.includes('<div class="welcome-rule"></div>'));
    html = html.replace('<div class="welcome-rule"></div>', '<p style="font-size:12px">LOCAL QA: synthetic prior progress and paid-engine checkpoints, not browser-earned wins. Temporary tab storage only.</p><nav aria-label="QA fixture"><a href="?fixture=fresh">Fresh mission</a> · <a href="?fixture=stale">Surviving last-seen post</a> · <a href="?fixture=dispatch">One post destroyed</a> · <a href="?fixture=finish">Near post victory</a></nav><div class="welcome-rule"></div>');
    html = html.replace(/Campaign · Skirmish · Field trials · v[0-9.]+/, 'LOCAL QA · Lanterns · no real profile access');
    await writeFile(path.join(output, 'dist/index.html'), html);
    const preview = await runtimeHashes(path.join(output, 'dist'));
    const changed = Object.keys(source).filter(name => source[name] !== preview[name]);
    assert.deepEqual(changed.sort(), ['app.js', 'index.html']);
    assert.deepEqual(Object.keys(source), Object.keys(preview));
    metadata.preview = { directory: output, runtimeFiles: Object.keys(source).length,
      runtimeSha256: hash(JSON.stringify(preview)), changedFiles: changed,
      differences: 'Namespaced session storage and fixture navigation/disclosure only; service-worker installation disabled. Every other runtime file is byte-identical.' };
  }
  await writeFile(path.join(root, 'qa/lanterns/native-fixtures.json'), JSON.stringify(metadata, null, 2) + '\n');
  return metadata;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2), output = args.find(arg => !arg.startsWith('--'));
  const result = await prepareNative({ ...(output ? { output } : {}), writePreview: args.includes('--write-preview') });
  console.log(JSON.stringify({ previewPrepared: result.previewPrepared, output: result.preview?.directory ?? null,
    fixtures: Object.fromEntries(Object.entries(result.receipts).map(([name, receipt]) => [name, receipt.time])), completionTime: result.completionTime }));
}
