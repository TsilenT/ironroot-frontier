/** Historical dependencies and pinned evidence only. Never the old whole-repository scan or a new heldout epoch. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync, lstatSync} from 'node:fs';
import {isBuiltin} from 'node:module';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

export const HISTORICAL_SALT_SCOPE = 'Historical Salt58-asset runtime/execution dependencies plus pinned original evidence. The original594-path whole-repository scan is not repeated; no new heldout epoch or current-runtime source freeze is claimed.';
export const HISTORICAL_SALT_MANIFEST = 'qa/hammer-prototype/history/salt-evidence-closure.json';
export const HISTORICAL_SALT_MANIFEST_SHA256 = 'a50bedab3eb8de00ccc85f504971db0d0eceb56c707262331ffeea0493d3fea7';
export const SOURCE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const own = (value, key) => Object.hasOwn(value, key);

export function assertHistoricalRelativePath(value) {
  assert.equal(typeof value, 'string', 'Historical paths must be strings');
  assert.ok(value.length > 0 && /^[A-Za-z0-9._/-]+$/.test(value) && !path.posix.isAbsolute(value), 'Unsafe historical path');
  assert.ok(value.split('/').every(part => part && !['.','..','__proto__','constructor','prototype'].includes(part)), 'Unsafe historical path segment');
  assert.equal(path.posix.normalize(value), value, 'Historical paths must be canonical');
  return value;
}
function regularFile(root, relative, mode = null) {
  assertHistoricalRelativePath(relative);
  let target = path.resolve(root);
  const rootStat = lstatSync(target);
  assert.ok(rootStat.isDirectory() && !rootStat.isSymbolicLink(), 'Historical root must be a real directory');
  for (const [index, part] of relative.split('/').entries()) {
    target = path.join(target, part); const stat = lstatSync(target);
    assert.ok(!stat.isSymbolicLink(), 'Historical path must not contain symlinks: '+relative);
    if (index < relative.split('/').length - 1) assert.ok(stat.isDirectory(), 'Historical parent must be a directory: '+relative);
    else {
      assert.ok(stat.isFile(), 'Historical source must be a regular file: '+relative);
      if (mode) assert.equal(stat.mode & 0o111 ? '100755' : '100644', mode, 'Historical mode changed: '+relative);
    }
  }
  return target;
}
export function readHistoricalSaltManifest(root = SOURCE_ROOT) {
  const bytes = readFileSync(regularFile(root, HISTORICAL_SALT_MANIFEST, '100644'));
  assert.equal(sha256(bytes), HISTORICAL_SALT_MANIFEST_SHA256, 'Historical evidence manifest changed');
  return JSON.parse(bytes);
}

/** Exported separately so negative tests can inspect untrusted inventories in temporary copies. */
export function verifyHistoricalInventory(root, manifest) {
  assert.ok(manifest && typeof manifest === 'object' && !Array.isArray(manifest));
  assert.ok(manifest.files && typeof manifest.files === 'object' && !Array.isArray(manifest.files));
  const contents = new Map();
  for (const [logical, entry] of Object.entries(manifest.files)) {
    assertHistoricalRelativePath(logical); assertHistoricalRelativePath(entry.path);
    assert.match(entry.sha256, /^[a-f0-9]{64}$/); assert.ok(['100644','100755'].includes(entry.mode));
    assert.ok(['execution','configuration','fixture-data'].includes(entry.kind));
    const bytes = readFileSync(regularFile(root, entry.path, entry.mode));
    assert.equal(sha256(bytes), entry.sha256, 'Historical dependency changed: '+logical); contents.set(logical, bytes);
  }
  assert.equal(manifest.roots.length, 11, 'All eleven frozen harness/test roots must be covered');
  assert.equal(manifest.runtimeFiles.length, 58, 'All fifty-eight historical runtime assets must be covered');
  for (const logical of [...manifest.roots, ...manifest.runtimeFiles, ...Object.values(manifest.dynamicDependencies).flat()])
    assert.ok(contents.has(assertHistoricalRelativePath(logical)), 'Uninventoried historical execution/data dependency: '+logical);
  // Discover every relative static import and literal dynamic import from the
  // original execution closure. Nonliteral dynamic imports fail closed.
  for (const [logical, entry] of Object.entries(manifest.files)) {
    if (entry.kind !== 'execution') continue;
    const text = contents.get(logical).toString();
    for (const match of text.matchAll(/\bimport\s*\(([^)]*)\)/g))
      assert.match(match[1].trim(), /^['"][^'"]+['"]$/, 'Unresolved dynamic import: '+logical);
    const specifiers = new Set([
      ...[...text.matchAll(/(?:^|[;\n])\s*(?:import\b\s*(?:[^;\n]*?\bfrom\s*)?|export\b[^;\n]*?\bfrom\s*)['"]([^'"]+)['"]/g)].map(match => match[1]),
      ...[...text.matchAll(/(?:\bfrom\s*|\bimport\s*(?:\(\s*)?)['"](\.{1,2}\/[^'"]+)['"]/g)].map(match => match[1]),
    ]);
    for (const specifier of specifiers) {
      if (isBuiltin(specifier)) continue;
      assert.ok(specifier.startsWith('./') || specifier.startsWith('../'), 'Unresolved external historical dependency: '+logical+' -> '+specifier);
      const dependency = path.posix.normalize(path.posix.join(path.posix.dirname(logical), specifier));
      assertHistoricalRelativePath(dependency);
      assert.ok(contents.has(dependency), 'Uninventoried static/dynamic import: '+logical+' -> '+dependency);
      assert.equal(manifest.files[dependency].kind, 'execution', 'Imported module must be classified for execution: '+dependency);
    }
  }
  return contents;
}

export function historicalSaltURL(logical, root = SOURCE_ROOT) {
  const manifest = readHistoricalSaltManifest(root); assertHistoricalRelativePath(logical);
  assert.ok(own(manifest.files, logical), 'Uninventoried historical path: '+logical);
  const target = regularFile(root, manifest.files[logical].path, manifest.files[logical].mode);
  assert.equal(sha256(readFileSync(target)),manifest.files[logical].sha256,'Historical requested dependency changed: '+logical);
  return pathToFileURL(target);
}

export function verifyHistoricalSaltEvidence({root = SOURCE_ROOT} = {}) {
  const manifest = readHistoricalSaltManifest(root), contents = verifyHistoricalInventory(root, manifest);
  const json = logical => JSON.parse(contents.get(logical));
  const planBytes = contents.get('qa/salt-stores/VALIDATION_PLAN.json'), plan = JSON.parse(planBytes);
  const binding = json('qa/salt-stores/verifier-compatibility.json');
  assert.equal(sha256(planBytes), binding.originalPaidFreezeSha256);
  assert.equal(binding.originalPaidFreezeSha256, '4175ae15ba68bacfd92e700fc3f33c00e07e2b6c6389906727aea54cd35f0a47');
  assert.equal(sha256(contents.get('qa/salt-stores/frozen-verifier-epoch1.txt')), plan.harnessHashes['qa/salt-stores/simulate.mjs']);
  assert.equal(sha256(contents.get('qa/salt-stores/simulate.mjs')), binding.finalVerifierSha256);
  assert.equal(sha256(contents.get('qa/salt-stores/canonical-extra-source.json')), binding.canonicalExtraInventorySha256);
  assert.equal(sha256(contents.get('qa/salt-stores/verifier-only-diff.patch')), binding.verifierDiffSha256);
  assert.deepEqual(Object.keys(plan.combatHashes), manifest.runtimeFiles);
  assert.deepEqual(Object.keys(plan.harnessHashes), manifest.roots);
  for (const [logical, expected] of Object.entries(plan.combatHashes)) assert.equal(sha256(contents.get(logical)), expected, logical);
  for (const [logical, expected] of Object.entries(plan.harnessHashes))
    assert.equal(sha256(contents.get(logical)), logical === 'qa/salt-stores/simulate.mjs' ? binding.finalVerifierSha256 : expected, logical);
  // The complete original plan and its594-source table remain pinned. Check all
  // relevant original source hashes in this bounded closure, without pretending
  // to revalidate unrelated ancestor QA source payloads.
  for (const [logical, bytes] of contents) {
    if (logical === 'qa/salt-stores/simulate.mjs') continue;
    if (own(plan.sourceHashes, logical)) assert.equal(sha256(bytes), plan.sourceHashes[logical], logical+' original source hash');
    if (own(binding.postHeldoutVerificationFiles, logical)) assert.equal(sha256(bytes), binding.postHeldoutVerificationFiles[logical], logical+' original post-heldout source');
  }
  const original = contents.get('qa/salt-stores/frozen-verifier-epoch1.txt').toString(), final = contents.get('qa/salt-stores/simulate.mjs').toString();
  const boundary = source => [source.slice(0, source.indexOf('export function verifyFrozen()')), source.slice(source.indexOf('\nexport function runSaltStores'))];
  const [oldPrefix, oldPaid] = boundary(original), [newPrefix, newPaid] = boundary(final);
  assert.equal(newPrefix, oldPrefix.replace('realpathSync,readdirSync','realpathSync,readdirSync,lstatSync').replace("import assert from 'node:assert/strict';", "import assert from 'node:assert/strict';\nimport {createHash} from 'node:crypto';"));
  assert.equal(newPaid, oldPaid, 'Original paid simulation, summaries and CLI remain byte-exact');
  assert.equal(binding.numericOrPolicyTuning, false); assert.equal(binding.originalEvidenceRewritten, false);
  return plan;
}
export const VALIDATION_PLAN = JSON.parse(readFileSync(historicalSaltURL('qa/salt-stores/VALIDATION_PLAN.json')));
