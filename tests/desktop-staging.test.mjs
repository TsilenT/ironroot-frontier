import test from 'node:test';
import assert from 'node:assert/strict';
import {cp, copyFile, mkdir, mkdtemp, readFile, readdir, rm, writeFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {inspectRuntime} from '../scripts/verify-runtime.mjs';
import {assertPortableNames} from '../desktop/scripts/stage-policy.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
const packageText=await readFile(path.join(root,'package.json'),'utf8');
async function fixture(t) {
  const dir=await mkdtemp(path.join(tmpdir(),'ironroot-desktop-stage-'));
  t.after(()=>rm(dir,{recursive:true,force:true}));
  await mkdir(path.join(dir,'desktop/scripts'),{recursive:true});await mkdir(path.join(dir,'scripts'));
  await cp(path.join(root,'dist'),path.join(dir,'dist'),{recursive:true});
  for(const name of ['stage.mjs','stage-policy.mjs'])
    await copyFile(path.join(root,'desktop/scripts',name),path.join(dir,'desktop/scripts',name));
  await copyFile(path.join(root,'scripts/verify-runtime.mjs'),path.join(dir,'scripts/verify-runtime.mjs'));
  await writeFile(path.join(dir,'package.json'),packageText);await writeFile(path.join(dir,'desktop/package.json'),packageText);
  await mkdir(path.join(dir,'desktop/game'));await writeFile(path.join(dir,'desktop/game/previous.marker'),'previous generated stage');
  return dir;
}
function stage(dir,flags=[]) {return spawnSync(process.execPath,[...flags,path.join(dir,'desktop/scripts/stage.mjs')],{cwd:dir,encoding:'utf8'});}
async function unchanged(dir) {
  assert.deepEqual(await readdir(path.join(dir,'desktop/game')),['previous.marker']);
  assert.equal(await readFile(path.join(dir,'desktop/game/previous.marker'),'utf8'),'previous generated stage');
  assert.equal((await readdir(path.join(dir,'desktop'))).some(name=>name.startsWith('.game-stage-')),false);
}

test('desktop staging copies the exact validated runtime, replaces stale files and leaves source unchanged',async t=>{
  const dir=await fixture(t),before=inspectRuntime(path.join(dir,'dist'));
  const result=stage(dir);assert.equal(result.status,0,result.stderr);
  assert.match(result.stdout,/verified game assets/);
  assert.deepEqual(inspectRuntime(path.join(dir,'desktop/game')).files,before.files);
  assert.deepEqual(inspectRuntime(path.join(dir,'dist')).files,before.files);
  assert.equal((await readdir(path.join(dir,'desktop'))).some(name=>name.startsWith('.game-stage-')),false);
});
test('an unlisted local JSON file cannot enter the package or replace the previous stage',async t=>{
  const dir=await fixture(t);await writeFile(path.join(dir,'dist/local-profile.json'),'synthetic non-runtime data');
  const result=stage(dir);assert.notEqual(result.status,0);assert.match(result.stderr,/Runtime file mismatch/);
  await unchanged(dir);
});
test('a missing cached asset stops staging before replacing the previous bundle',async t=>{
  const dir=await fixture(t);await rm(path.join(dir,'dist/audio.js'));
  const result=stage(dir);assert.notEqual(result.status,0);assert.match(result.stderr,/Missing: audio.js/);
  await unchanged(dir);
});
test('nested directories remain excluded even when they contain ordinary files',async t=>{
  const dir=await fixture(t);await mkdir(path.join(dir,'dist/private'));
  const result=stage(dir);assert.notEqual(result.status,0);assert.match(result.stderr,/only regular files/);
  await unchanged(dir);
});
for(const corrupt of [false,true])test(`${corrupt?'changed copied bytes':'an interrupted copy'} cannot replace the previous stage`,async t=>{
  const dir=await fixture(t),hook=path.join(dir,'copy-fault.cjs');
  // Instrument only this child process's real filesystem copy. Production
  // staging has no fault-injection flags or environment-specific behavior.
  await writeFile(hook,`const fs=require('node:fs/promises');
const path=require('node:path');
const original=fs.copyFile;
fs.copyFile=async(...args)=>{
  await original(...args);
  if(path.basename(args[0])==='app.js') {
    if(${corrupt}) await fs.appendFile(args[1],'\\n// injected changed bytes');
    else throw Error('injected copy failure');
  }
};
require('node:module').syncBuiltinESMExports();`);
  const result=stage(dir,['--require',hook]);assert.notEqual(result.status,0);
  assert.match(result.stderr,corrupt?/Runtime changed while staging/:/injected copy failure/);
  await unchanged(dir);
});
for(const change of ['desktop package','worker','document'])test(`a mismatched ${change} identity preserves the previous stage`,async t=>{
  const dir=await fixture(t);
  const file=change==='desktop package'?'desktop/package.json':change==='worker'?'dist/service-worker.js':'dist/index.html';
  const text=await readFile(path.join(dir,file),'utf8');
  const updated=change==='desktop package'?JSON.stringify({...JSON.parse(text),version:'99.0.0'}):
    change==='worker'?text.replace(/const VERSION = '[^']+';/,"const VERSION = 'ironroot-v99.0.0';"):
      text.replace(/data-runtime-version="[^"]+"/,'data-runtime-version="ironroot-v99.0.0"');
  assert.notEqual(updated,text);await writeFile(path.join(dir,file),updated);
  const result=stage(dir);assert.notEqual(result.status,0);assert.match(result.stderr,/release identities must agree/);
  await unchanged(dir);
});
test('portable naming rejects reserved devices, ambiguous paths and case collisions on every host',()=>{
  assert.doesNotThrow(()=>assertPortableNames(['app.js','FONTS-NOTICES.txt','icon.svg']));
  for(const name of ['CON','aux.js','LPT9.json','COM1.css','bad:name.js','bad name.js','tail.','../secret.js','nested/app.js','ümlaut.js'])
    assert.throws(()=>assertPortableNames([name]),/desktop portability policy/,name);
  assert.throws(()=>assertPortableNames(['app.js','App.js']),/collide on Windows/);
});
