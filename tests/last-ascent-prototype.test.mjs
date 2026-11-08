// Source-only scenario regressions. The prototype is not a campaign entry.
import '../qa/last-ascent/mechanics.test.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const script=path.join(root,'qa/last-ascent/prepare-preview.mjs');
for(const suffix of ['', 'dist']) test(`Last Ascent preview refuses source ${suffix || 'root'} as output`,()=>{
  const result=spawnSync(process.execPath,[script,path.join(root,suffix)],{encoding:'utf8'});
  assert.notEqual(result.status,0);
  assert.match(result.stderr,/Preview must not replace published runtime/);
});
test('Last Ascent preview changes only its isolated wrapper and leaves source runtime exact',async t=>{
  const output=await mkdtemp(path.join(tmpdir(),'ironroot-ascent-test-'));
  t.after(()=>rm(output,{recursive:true,force:true}));
  const result=spawnSync(process.execPath,[script,output],{encoding:'utf8'});
  assert.equal(result.status,0,result.stderr);
  const receipt=JSON.parse(await readFile(path.join(output,'PREVIEW_RECEIPT.json'),'utf8'));
  assert.equal(receipt.variant,'supply-road');
  const changed=Object.keys(receipt.source).filter(name=>receipt.source[name]!==receipt.preview[name]);
  assert.deepEqual(changed,['app.js','index.html']);
  assert.deepEqual(Object.keys(receipt.preview).filter(name=>!(name in receipt.source)),['last-ascent-scenario.mjs']);
  const sourceApp=await readFile(path.join(root,'dist/app.js'),'utf8');
  const previewApp=await readFile(path.join(output,'dist/app.js'),'utf8');
  assert.equal(sourceApp.includes('qaCreateLastAscent'),false);
  assert.match(previewApp,/backend=window\.sessionStorage,prefix='ironroot\.last-ascent\.lab\.'/);
  assert.match(previewApp,/Local experimental setup, not a released campaign mission/);
  assert.equal(previewApp.split('qaCreateLastAscent({variant:qaVariant,seed:qaSeed})').length-1,2);
});
