import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync,mkdirSync,copyFileSync,rmSync,chmodSync,symlinkSync,renameSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {SOURCE_ROOT,HISTORICAL_SALT_MANIFEST,HISTORICAL_SALT_SCOPE,readHistoricalSaltManifest,verifyHistoricalSaltEvidence,verifyHistoricalInventory,assertHistoricalRelativePath} from '../qa/hammer-prototype/historical-salt-evidence.mjs';

const manifest = readHistoricalSaltManifest();
const modes = new Map(Object.values(manifest.files).map(entry => [entry.path,entry.mode]));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
function temporaryCopy(change, verify = root => verifyHistoricalSaltEvidence({root})) {
  const root = mkdtempSync(path.join(tmpdir(), 'ironroot-salt-evidence-'));
  try {
    for (const relative of new Set([HISTORICAL_SALT_MANIFEST,...Object.values(manifest.files).map(entry => entry.path)])) {
      const to = path.join(root,relative); mkdirSync(path.dirname(to), {recursive:true}); copyFileSync(path.join(SOURCE_ROOT,relative),to);
      chmodSync(to,modes.get(relative)==='100755'?0o755:0o644);
    }
    change(root); return verify(root);
  } finally { rmSync(root,{recursive:true,force:true}); }
}
const physical = (root,logical) => path.join(root,manifest.files[logical].path);

test('bounded Salt evidence guard validates every original runtime asset, eleven import roots and explicit dynamic fixture data', () => {
  const plan = verifyHistoricalSaltEvidence();
  assert.match(HISTORICAL_SALT_SCOPE,/whole-repository scan is not repeated/);
  assert.match(HISTORICAL_SALT_SCOPE,/no new heldout epoch/);
  assert.equal(Object.keys(manifest.files).length,188); assert.equal(manifest.runtimeFiles.length,58); assert.equal(manifest.roots.length,11);
  assert.equal(Object.keys(plan.sourceHashes).length,594);
  assert.ok(manifest.files['scripts/verify-runtime.mjs']); assert.ok(manifest.files['tests/fixtures/profile-session-v0300.js']);
  assert.ok(manifest.files['tests/fixtures/backup-v0.7-format.json']); assert.ok(manifest.files['tests/fixtures/backup-v0.9-format.json']);
  assert.ok(manifest.files['qa/fixtures/production-v0300/historical-manifest.json']);
  assert.equal(manifest.baselineConfirmation.passed,11);
});

for (const [label,logical] of [
  ['runtime','dist/engine.js'], ['harness','qa/salt-stores/paid-policies.mjs'],
  ['plan','qa/salt-stores/VALIDATION_PLAN.json'], ['binding','qa/salt-stores/verifier-compatibility.json'],
  ['evidence','qa/salt-stores/final-heldout-epoch1.json'], ['dynamic fixture','tests/fixtures/backup-v0.9-format.json'],
  ['original self-hashed test','tests/salt-stores-freeze-compat.test.mjs'],
  ['parent fixture read dependency','qa/fixtures/production-v0300/dist/engine.js'],
]) for (const fault of ['changed','missing']) test('bounded Salt guard rejects '+fault+' '+label+' in temporary copies', () => {
  assert.throws(() => temporaryCopy(root => {
    const target = physical(root,logical);
    if (fault === 'missing') rmSync(target); else writeFileSync(target,Buffer.concat([readFileSync(target),Buffer.from('\nchanged\n')]));
  }));
});

test('bounded Salt guard rejects changed or missing pinned manifest in temporary copies', () => {
  assert.throws(() => temporaryCopy(root => writeFileSync(path.join(root,HISTORICAL_SALT_MANIFEST),'{}')));
  assert.throws(() => temporaryCopy(root => rmSync(path.join(root,HISTORICAL_SALT_MANIFEST))));
});

test('bounded Salt guard rejects symlink files, symlink parents, nonregular files and changed executable modes', () => {
  const logical = 'qa/salt-stores/paid-policies.mjs';
  assert.throws(() => temporaryCopy(root => { const target=physical(root,logical);renameSync(target,target+'.real');symlinkSync(target+'.real',target); }));
  assert.throws(() => temporaryCopy(root => { const target=path.dirname(physical(root,logical));renameSync(target,target+'-real');symlinkSync(target+'-real',target); }));
  assert.throws(() => temporaryCopy(root => { const target=physical(root,logical);rmSync(target);mkdirSync(target); }));
  assert.throws(() => temporaryCopy(root => chmodSync(physical(root,logical),0o755)));
  assert.throws(() => temporaryCopy(root => symlinkSync(root,path.join(root,'root-alias')),root => verifyHistoricalSaltEvidence({root:path.join(root,'root-alias')})));
});

test('bounded Salt guard rejects unsafe logical/physical paths without following them', () => {
  for (const value of ['', '..', '../secret', '/absolute', 'a/../secret', 'a//b', 'a\\b', 'a/./b', 'a/__proto__/b'])
    assert.throws(() => assertHistoricalRelativePath(value));
  for (const value of ['../secret','/absolute','a/../secret']) {
    const changed = structuredClone(manifest); changed.files['dist/engine.js'].path = value;
    assert.throws(() => verifyHistoricalInventory(SOURCE_ROOT,changed));
  }
});

test('bounded Salt import discovery rejects missing static and unresolved computed dynamic dependencies', () => {
  for (const addition of ["\nimport './not-in-the-manifest.js';\n", '\nimport(computedModule);\n']) {
    const changed = structuredClone(manifest), logical = 'qa/salt-stores/paid-policies.mjs';
    assert.throws(() => temporaryCopy(root => {
      const target=physical(root,logical);writeFileSync(target,readFileSync(target,'utf8')+addition);changed.files[logical].sha256=hash(readFileSync(target));
    }, root => verifyHistoricalInventory(root,changed)));
  }
});

test('bounded historical verification permits unrelated source materialization without rewriting its original freeze', () => {
  const result = temporaryCopy(root => { const target=path.join(root,'unrelated/new-helper.mjs');mkdirSync(path.dirname(target),{recursive:true});writeFileSync(target,'export const unrelated = true;\n'); });
  assert.equal(result.evidenceEpoch,1);
});
