import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {PRIOR_BUILDS,currentRoot,shellManifest} from './update-fixtures.mjs';
import {Game} from '../../dist/engine.js';
const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
const gitBlob=bytes=>createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
assert.deepEqual(Object.keys(PRIOR_BUILDS),['0.7.0','0.8.0']);
const current=await shellManifest(currentRoot);assert.equal(current.version,'ironroot-v0.12.0');
assert.equal(Object.keys(current.hashes).filter(file=>file.endsWith('.woff2')).length,5);
for(const file of ['battle-report.js','report-view.js','report-view.css','training.html','training-app.js','training.css','training.js'])assert.ok(current.hashes[file],'current 0.12 offline cache includes '+file);
for(const [version,{root:priorRoot,fileCount}] of Object.entries(PRIOR_BUILDS)){
  const expected=JSON.parse(await readFile(new URL('./fixtures/'+version+'-sha256.json',import.meta.url),'utf8'));
  assert.equal(expected.version,version);assert.equal(Object.keys(expected.files).length,fileCount);
  assert.deepEqual((await readdir(priorRoot)).sort(),Object.keys(expected.files).sort());
  for(const [file,hash] of Object.entries(expected.files)){
    const bytes=await readFile(new URL(file,priorRoot));
    assert.equal(sha256(bytes),hash,version+' '+file);
    if(expected.gitBlobs)assert.equal(gitBlob(bytes),expected.gitBlobs[file],version+' '+file+' production blob');
  }
  if(version==='0.7.0'){
    assert.equal(expected.sourceCommit,'758452bfb3a415af66b70f5dbcaddfc132164c19');
    assert.equal(expected.sourceTreeSha,'9ccd1f677fce24616ed95d56dc9ccbde42d736f4');
    assert.deepEqual(Object.keys(expected.gitBlobs).sort(),Object.keys(expected.files).sort());
    const pkg=await readFile(new URL('./fixtures/0.7.0-package.json',import.meta.url));
    assert.equal(JSON.parse(pkg).version,version);assert.equal(pkg.length,expected.sourcePackage.bytes);
    assert.equal(sha256(pkg),expected.sourcePackage.sha256);assert.equal(gitBlob(pkg),expected.sourcePackage.gitBlobSha1);
    assert.equal(expected.sourcePackage.gitBlobSha1,'b5e97851588ce5b7425d9ac6c9b0d933acbdcfb6');
  }
  const prior=await shellManifest(priorRoot);
  assert.equal(prior.version,'ironroot-v'+version);
  assert.ok(Object.keys(current.hashes).length>Object.keys(prior.hashes).length);
  assert.notEqual(prior.hashes['app.js'],current.hashes['app.js']);
  assert.ok(!Object.keys(prior.hashes).some(file=>file.endsWith('.woff2')));
  // The browser creates its own old-version battle through UI input. This
  // separate fixture check confirms the actual frozen engine's public save
  // contract is admitted by the candidate before that browser gate runs.
  const {Game:LegacyGame}=await import(new URL('engine.js',priorRoot));
  const legacy=new LegacyGame({seed:707,ai:false});
  assert.equal(legacy.build('archery',550,450).ok,true);legacy.update(.1);
  const save=legacy.serialize(),restored=Game.restore(save);
  assert.equal(save.version,1);assert.equal(restored.map.id,'classic');
  assert.deepEqual(restored.state.buildings,save.state.buildings);
  assert.equal(restored.state.time,save.state.time);
  console.log('Update fixture '+version+': '+fileCount+' pinned runtime files and complete precache manifest verified.');
}
console.log('Production 0.7 commit/package metadata verified; current 0.12 precache includes all five fonts and all three Battle Report modules/styles and all four Guided practice resources.');
