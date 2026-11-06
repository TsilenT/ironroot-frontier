import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {PRODUCTION_V012_ROOT} from './production-v012-fixtures.mjs';
// Explicit immutable allowlist. Never construct a filesystem path from the
// requested version or expose arbitrary snapshot directories through the server.
export const PRIOR_BUILDS=Object.freeze({
  '0.7.0':Object.freeze({root:new URL('./fixtures/0.7.0-dist/',import.meta.url),fileCount:17,label:'production 0.7.0'}),
  '0.8.0':Object.freeze({root:new URL('./fixtures/0.8.0-dist/',import.meta.url),fileCount:18,label:'private QA 0.8.0'}),
});
export const UPDATE_BUILDS=Object.freeze({...PRIOR_BUILDS,'0.12.0':Object.freeze({root:PRODUCTION_V012_ROOT,fileCount:33,label:'production 0.12.0'})});
export const currentRoot=new URL('../../dist/',import.meta.url);
export async function shellManifest(root){
  const source=await readFile(new URL('service-worker.js',root),'utf8');
  const version=source.match(/const VERSION = '([^']+)'/)[1];
  const files=[...source.matchAll(/'\.\/([^']*)'/g)].map(match=>match[1]||'index.html');
  const hashes={};
  for(const file of new Set(files))hashes[file]=createHash('sha256').update(await readFile(new URL(file,root))).digest('hex');
  return {version,hashes,workerHash:createHash('sha256').update(source).digest('hex')};
}

export async function candidateIdentity(){
  const [manifest,bytes]=await Promise.all([shellManifest(currentRoot),readFile(new URL('../../package.json',import.meta.url))]);
  const version=JSON.parse(bytes).version;
  assert.match(version,/^\d+\.\d+\.\d+$/,'candidate package must identify a release');
  assert.equal(manifest.version,'ironroot-v'+version,'package and worker identity must agree');
  return {...manifest,packageVersion:version};
}
export function requireDistinctUpgrade(prior,current){
  assert.notEqual(current.version,prior.version,'BLOCKED: candidate reuses the historical worker/cache identity; bump before an upgrade run');
  assert.notEqual(current.workerHash,prior.workerHash,'BLOCKED: candidate worker bytes are unchanged');
  const parts=value=>value.match(/^ironroot-v(\d+)\.(\d+)\.(\d+)$/)?.slice(1).map(Number);
  const a=parts(prior.version),b=parts(current.version);assert.ok(a&&b,'worker versions must be explicit semantic versions');
  const changed=b.findIndex((value,index)=>value!==a[index]);assert.ok(changed>=0&&b[changed]>a[changed],'BLOCKED: upgrade candidate must be newer than historical source');
}
