#!/usr/bin/env node
// Dependency-free and read-only. No server, browser, network, child process, or real profile.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, readdir, lstat } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const MANIFEST_SHA256 = '1bfa09e053e363e0589a8a96180be04cc4821b0b644b5b5923de66b83b6f6ff7';
const PUBLIC_COMMIT = 'acb366c33898fabff885118cead7158fbe837c87';
const SOURCE_COMMIT = '24edddab2cff33b3f91b396bc855193f87421ba3';
const PUBLIC_TREE = 'e93d2be7b43e956ce27d92097e6f24568f99134c';
const SOURCE_TREE = 'babc04d69e315c133fa1a365e88b4578660fbaba';
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const gitObject = (kind, bytes) => createHash('sha1').update(`${kind} ${bytes.length}\0`).update(bytes).digest('hex');
const gitBlob = bytes => gitObject('blob', bytes);
const sorted = values => [...values].sort();
const pass = message => console.log(`PASS ${message}`);
const readJSON = async file => JSON.parse(await readFile(file, 'utf8'));

function safePath(path) {
  assert.equal(typeof path, 'string');
  assert.ok(path.length && !path.includes('\\') && !path.includes('\0'));
  assert.ok(path.split('/').every(part => part && part !== '.' && part !== '..'), `unsafe inventory path: ${path}`);
  return path;
}
async function inventory(root, prefix = '') {
  const rootStat = await lstat(root);
  assert.ok(rootStat.isDirectory() && !rootStat.isSymbolicLink(), `not a real directory: ${root}`);
  const files = [];
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const path = prefix + entry.name;
    assert.ok(!entry.isSymbolicLink(), `unexpected symlink: ${path}`);
    if (entry.isDirectory()) files.push(...await inventory(join(root, entry.name), path + '/'));
    else { assert.ok(entry.isFile(), `not a regular file: ${path}`); files.push(path); }
  }
  return sorted(files);
}
function verifyBytes(bytes, expected, label) {
  assert.equal(bytes.length, expected.bytes, `${label}: byte length`);
  assert.equal(sha256(bytes), expected.sha256, `${label}: SHA-256`);
  assert.equal(gitBlob(bytes), expected.gitBlobSha1, `${label}: Git blob SHA-1`);
}
function treeHash(files) {
  const tree = new Map();
  const seen = new Set();
  for (const entry of files) {
    const path = safePath(entry.path);
    assert.ok(!seen.has(path), `duplicate path: ${path}`); seen.add(path);
    assert.match(entry.sha, /^[a-f0-9]{40}$/);
    let node = tree;
    const parts = path.split('/');
    for (const part of parts.slice(0, -1)) {
      if (!node.has(part)) node.set(part, new Map());
      node = node.get(part); assert.ok(node instanceof Map, `file/directory collision: ${path}`);
    }
    assert.ok(!node.has(parts.at(-1)), `duplicate/colliding tree entry: ${path}`);
    node.set(parts.at(-1), entry.sha);
  }
  function digest(node) {
    // Git sorts directory names as if a slash follows them. Every recorded file
    // is a regular 100644 blob; the independently matching root hashes verify it.
    const entries = [...node].sort(([a, av], [b, bv]) => Buffer.compare(
      Buffer.from(a + (av instanceof Map ? '/' : '')),
      Buffer.from(b + (bv instanceof Map ? '/' : '')),
    ));
    const data = Buffer.concat(entries.flatMap(([name, value]) => [
      Buffer.from(`${value instanceof Map ? '40000' : '100644'} ${name}\0`),
      Buffer.from(value instanceof Map ? digest(value) : value, 'hex'),
    ]));
    return gitObject('tree', data);
  }
  return digest(tree);
}

async function main() {
  const options = {};
  for (let i = 2; i < process.argv.length; i += 2) {
    const key = process.argv[i];
    assert.ok(['--compare-deployment', '--compare-source'].includes(key), `unknown option: ${key}`);
    assert.ok(!options[key] && process.argv[i + 1] && !process.argv[i + 1].startsWith('--'), `missing/duplicate option: ${key}`);
    options[key] = resolve(process.argv[i + 1]);
  }
  const manifestBytes = await readFile(join(ROOT, 'historical-manifest.json'));
  assert.equal(sha256(manifestBytes), MANIFEST_SHA256, 'historical manifest pin');
  const manifest = JSON.parse(manifestBytes);
  assert.equal(manifest.schemaVersion, 1);
  assert.equal(manifest.version, '0.12.0');
  assert.equal(manifest.publicCommit, PUBLIC_COMMIT);
  assert.equal(manifest.sourceCommit, SOURCE_COMMIT);
  assert.equal(manifest.publicTreeSha, PUBLIC_TREE);
  assert.equal(manifest.sourceTreeSha, SOURCE_TREE);
  assert.equal(manifest.runtimeDirectory, 'dist');
  assert.equal(manifest.fileCount, 33);
  assert.equal(manifest.runtimeBytes, 668075);
  const names = sorted(Object.keys(manifest.files));
  assert.equal(names.length, 33);
  assert.deepEqual(sorted(Object.keys(manifest.gitBlobs)), names);
  assert.deepEqual(sorted(Object.keys(manifest.byteLengths)), names);
  assert.deepEqual(await inventory(join(ROOT, 'dist')), names, 'exact runtime inventory');
  const expectedInventory = sorted([
    ...names.map(name => `dist/${name}`), ...Object.keys(manifest.evidenceFiles),
    'historical-manifest.json', 'validate-fixture.mjs',
  ]);
  assert.deepEqual(await inventory(ROOT), expectedInventory, 'unexpected fixture files (including profiles)');
  for (const path of Object.keys(manifest.evidenceFiles)) {
    safePath(path); verifyBytes(await readFile(join(ROOT, path)), manifest.evidenceFiles[path], path);
  }
  pass('manifest pin, exact fixture inventory, documentation and local evidence hashes');

  const release = await readJSON(join(ROOT, 'provenance/RELEASE_VERIFIED.json'));
  const publicObjects = await readJSON(join(ROOT, 'provenance/public-objects.json'));
  const privateObjects = await readJSON(join(ROOT, 'provenance/private-objects.json'));
  assert.equal(release.public_commit, PUBLIC_COMMIT);
  assert.equal(release.source_commit, SOURCE_COMMIT);
  assert.equal(release.public_tree, PUBLIC_TREE);
  assert.equal(publicObjects.tree_sha, PUBLIC_TREE);
  assert.equal(privateObjects.tree_sha, SOURCE_TREE);
  assert.equal(treeHash(publicObjects.files), PUBLIC_TREE, 'reconstructed public Git tree');
  assert.equal(treeHash(privateObjects.files), SOURCE_TREE, 'reconstructed private Git tree');
  assert.equal(publicObjects.files.length, 36);
  assert.equal(privateObjects.files.length, 384);
  assert.equal(release.runtime_bytes, 668075);
  assert.deepEqual(sorted(release.runtime_files.map(file => file.path)), names);
  const publicByPath = new Map(publicObjects.files.map(file => [file.path, file]));
  const privateByPath = new Map(privateObjects.files.map(file => [file.path, file]));
  let bytesTotal = 0;
  for (const name of names) {
    safePath(name);
    const bytes = await readFile(join(ROOT, 'dist', name)); bytesTotal += bytes.length;
    verifyBytes(bytes, { bytes: manifest.byteLengths[name], sha256: manifest.files[name], gitBlobSha1: manifest.gitBlobs[name] }, name);
    const published = release.runtime_files.find(file => file.path === name);
    assert.equal(published.bytes, bytes.length); assert.equal(published.sha256, sha256(bytes));
    const pub = publicByPath.get(name), source = privateByPath.get(`dist/${name}`);
    assert.equal(pub?.sha, gitBlob(bytes), `${name}: public inventory`);
    assert.equal(pub?.bytes, bytes.length);
    assert.equal(source?.sha, gitBlob(bytes), `${name}: frozen private inventory`);
    assert.equal(source?.sha256, sha256(bytes)); assert.equal(source?.bytes, bytes.length);
  }
  assert.equal(bytesTotal, 668075);
  for (const name of ['.nojekyll', 'CNAME', 'README.md']) assert.ok(!names.includes(name), `deployment metadata excluded: ${name}`);
  const packageBytes = await readFile(join(ROOT, 'package.json'));
  verifyBytes(packageBytes, manifest.sourcePackage, 'frozen private package');
  const pkg = JSON.parse(packageBytes);
  assert.equal(pkg.name, 'ironroot-frontier'); assert.equal(pkg.version, '0.12.0'); assert.equal(pkg.type, 'module');
  assert.equal(packageBytes.length, 331);
  assert.equal(gitBlob(packageBytes), '952804859136b1b730518289b55a32591c58aec6');
  assert.equal(privateByPath.get('package.json').sha, gitBlob(packageBytes));
  assert.equal(privateByPath.get('package.json').sha256, sha256(packageBytes));
  pass('33 binary-exact runtime files / 668075 bytes, frozen package, both reconstructed Git trees');

  const worker = await readFile(join(ROOT, 'dist/service-worker.js'), 'utf8');
  const workerVersion = worker.match(/const VERSION = '([^']+)'/)[1];
  assert.equal(workerVersion, 'ironroot-v0.12.0');
  const list = worker.match(/const FILES = \[([\s\S]*?)\];/)[1];
  const urls = [...list.matchAll(/'([^']+)'/g)].map(match => match[1]);
  assert.deepEqual(urls, manifest.serviceWorker.precacheURLs);
  assert.equal(urls.length, 33);
  for (const url of urls) assert.ok(url.startsWith('./'), `nonlocal cache entry: ${url}`);
  const cached = sorted(new Set(urls.map(url => url === './' ? 'index.html' : url.slice(2))));
  assert.equal(cached.length, 32);
  assert.deepEqual(cached, names.filter(name => name !== 'service-worker.js'));
  const fonts = names.filter(name => name.endsWith('.woff2'));
  assert.equal(fonts.length, 5);
  for (const name of fonts) assert.equal((await readFile(join(ROOT, 'dist', name))).subarray(0, 4).toString('ascii'), 'wOF2', `${name}: binary WOFF2 header`);
  assert.match(worker, /new URL\('\.\/training\.html', self\.registration\.scope\)/);
  pass('historical worker identity, full precache including five WOFF2 fonts and report/training resources');

  // Only hashed historical, DOM-free modules are imported. All state below is
  // generated in memory; browser storage and real profiles are never accessed.
  const load = name => import(pathToFileURL(join(ROOT, 'dist', name)).href);
  const { Game, MAPS } = await load('engine.js');
  const campaign = await load('campaign.js');
  const backup = await load('backup.js');
  const { CHALLENGES } = await load('challenges.js');
  const { createProfileSession, PROFILE_MARKER_KEY } = await load('profile-session.js');
  const { TRAINING_LESSONS, TrainingSession } = await load('training.js');
  const { createBattleJournal, exportBattleReport } = await load('battle-report.js');
  const { renderBattleReport } = await load('report-view.js');
  assert.deepEqual(Object.keys(MAPS), ['classic', 'long-march', 'twin-span']);
  assert.deepEqual(Object.values(MAPS).map(map => [map.id, map.revision, map.width, map.height, [...map.lanes]]), [
    ['classic', 1, 3200, 900, [260, 450, 640]], ['long-march', 1, 4000, 900, [260, 450, 640]], ['twin-span', 1, 3200, 900, [340, 560]],
  ]);
  const syntheticProgress = campaign.createCampaignProgress();
  for (const mission of campaign.CAMPAIGN_MISSIONS) syntheticProgress.missions[mission.id] = { completed: true, stars: 3, bestTime: 60 };
  const overview = campaign.getCampaignOverview(syntheticProgress);
  assert.equal(overview.total, 16); assert.equal(overview.cleared, 16);
  assert.equal(overview.stars, 48); assert.equal(overview.maxStars, 48); assert.equal(overview.chapters.length, 5);
  assert.equal(CHALLENGES.length, 5);
  assert.deepEqual(campaign.CAMPAIGN_MISSIONS.slice(-4).map(mission => [mission.id, mission.mapId]), [
    ['open-horizon', 'long-march'], ['river-charter', 'twin-span'], ['far-beacon', 'long-march'], ['common-ground', 'twin-span'],
  ]);
  for (const mission of campaign.CAMPAIGN_MISSIONS) {
    const game = campaign.createCampaignMission(mission.id);
    assert.equal(Game.restore(game.serialize()).map.id, mission.mapId);
  }
  const data = new Map();
  const storage = { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value), removeItem: key => data.delete(key) };
  assert.equal(PROFILE_MARKER_KEY, 'ironroot.profile.v1');
  const profile = createProfileSession(() => storage, { requiredProtocolVersion: 2, newEpoch: () => 'synthetic-v012-fixture' });
  assert.equal(profile.status().canWrite, true);
  assert.equal(JSON.parse(storage.getItem(PROFILE_MARKER_KEY)).version, 2);
  const markerBefore = storage.getItem(PROFILE_MARKER_KEY);
  const olderClient = createProfileSession(() => storage, { requiredProtocolVersion: 1 });
  assert.equal(olderClient.status().canWrite, false);
  assert.equal(storage.getItem(PROFILE_MARKER_KEY), markerBefore, 'older protocol must not downgrade marker');
  storage.setItem(backup.BACKUP_STORAGE_KEYS.campaign, JSON.stringify(syntheticProgress));
  storage.setItem(backup.BACKUP_STORAGE_KEYS.trials, JSON.stringify({ shieldbreaker: { completed: true, bestTime: 60 } }));
  storage.setItem(backup.BACKUP_STORAGE_KEYS.settings, JSON.stringify({ sound: false, music: false, sfx: true, volume: .25, reducedMotion: true, quality: 'low' }));
  for (const mapId of Object.keys(MAPS)) {
    const game = new Game({ seed: 12012, ai: false, mapId });
    assert.equal(game.build('archery', 550, MAPS[mapId].lanes[0]).ok, true); game.update(.1);
    const save = game.serialize();
    assert.equal(save.version, mapId === 'classic' ? 1 : 2);
    if (mapId === 'classic') { assert.ok(!Object.hasOwn(save, 'mapId')); assert.ok(!Object.hasOwn(save, 'mapRevision')); }
    else { assert.equal(save.mapId, mapId); assert.equal(save.mapRevision, 1); }
    assert.deepEqual(Game.restore(save).serialize(), save);
    storage.setItem(backup.BACKUP_STORAGE_KEYS.battle, JSON.stringify({ format: 'ironroot-save', version: 2, challengeId: null, campaignId: null, game: save }));
    storage.setItem(backup.BACKUP_STORAGE_KEYS.history, JSON.stringify([{ won: true, difficulty: 'normal', time: 60, kills: 1, built: 2, date: '2026-11-06T00:00:00.000Z', mapId }]));
    const exported = backup.parseBackup(backup.createBackup(storage, { createdAt: '2026-11-06T00:00:00.000Z' }));
    assert.equal(exported.format, 'ironroot-backup'); assert.equal(exported.version, 1);
    assert.deepEqual(exported.data.battle.game, save);
    assert.equal(campaign.getCampaignOverview(exported.data.campaign).stars, 48);
    assert.equal(exported.data.history[0].mapId, mapId);
    assert.deepEqual(sorted(Object.keys(exported.data)), ['battle', 'campaign', 'history', 'settings', 'trials']);
  }
  const app = await readFile(join(ROOT, 'dist/app.js'), 'utf8');
  assert.match(app, /createProfileSession\(\(\) => localStorage, \{ requiredProtocolVersion: 2 \}\)/);
  pass('three-map historical save/backup round trips, all 16 mission saves, 48-star progress, protocol-2 fence');

  const beforePractice = [...data];
  assert.equal(TRAINING_LESSONS.length, 5);
  const practice = new TrainingSession();
  assert.equal(practice.game.state.gold[0], 280);
  assert.equal(practice.build('barracks', 1110, 450).ok, true);
  assert.equal(practice.game.state.gold[0], 140);
  assert.deepEqual([...data], beforePractice, 'synthetic profile unchanged by in-memory practice');
  const reportGame = new Game({ ai: false, mapId: 'long-march' }); reportGame.update(.1);
  const journal = createBattleJournal(reportGame, { resumed: true });
  reportGame.update(.1); reportGame.state.winner = 'draw';
  const report = journal.finish(reportGame);
  assert.equal(report.format, 'ironroot-battle-report'); assert.equal(report.version, 1);
  assert.equal(report.map.id, 'long-march'); assert.equal(report.scope.resumed, true);
  assert.equal(report.scope.startedAt, .1); assert.equal(report.scope.fullTimeline, false);
  assert.deepEqual(JSON.parse(exportBattleReport(report)), report);
  assert.match(renderBattleReport(report), /Battle report/);
  assert.deepEqual([...data], beforePractice, 'report generation does not modify the synthetic profile');
  pass('historical report generation/partial coverage and isolated paid practice action (in-memory only)');

  if (options['--compare-deployment']) {
    const baseline = await readJSON(join(ROOT, 'provenance/deployment-baseline.json'));
    const root = options['--compare-deployment'];
    assert.deepEqual(await inventory(root), sorted(Object.keys(baseline.files)), 'original deployment inventory changed');
    for (const [path, expected] of Object.entries(baseline.files)) verifyBytes(await readFile(join(root, safePath(path))), expected, `original deployment ${path}`);
    pass(`original deployment unchanged: all ${Object.keys(baseline.files).length} files, including metadata and smoke image`);
  } else console.log('UNRUN original deployment comparison (supply --compare-deployment PATH)');
  if (options['--compare-source']) {
    const root = options['--compare-source'];
    assert.deepEqual(await inventory(root), sorted(privateObjects.files.map(file => file.path)), 'frozen source inventory changed');
    for (const file of privateObjects.files) verifyBytes(await readFile(join(root, safePath(file.path))), { bytes: file.bytes, sha256: file.sha256, gitBlobSha1: file.sha }, `frozen private ${file.path}`);
    pass('frozen private source unchanged: all 384 files match independently pinned source metadata');
  } else console.log('UNRUN frozen private comparison (supply --compare-source PATH)');
  console.log('UNRUN browsers, network, live smoke, and 0.12-to-future takeover; a distinct future worker and exact candidate are required.');
  console.log(`PASS historical fixture validated; manifest SHA-256 ${MANIFEST_SHA256}`);
}

main().catch(error => { console.error(`FAIL ${error.stack || error.message}`); process.exitCode = 1; });
