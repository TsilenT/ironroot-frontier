import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
// Explicit immutable allowlist. Never construct a filesystem path from the
// requested version or expose arbitrary snapshot directories through the server.
export const PRIOR_BUILDS=Object.freeze({
  '0.7.0':Object.freeze({root:new URL('./fixtures/0.7.0-dist/',import.meta.url),fileCount:17}),
  '0.8.0':Object.freeze({root:new URL('./fixtures/0.8.0-dist/',import.meta.url),fileCount:18}),
});
export const currentRoot=new URL('../../dist/',import.meta.url);
export async function shellManifest(root){
  const source=await readFile(new URL('service-worker.js',root),'utf8');
  const version=source.match(/const VERSION = '([^']+)'/)[1];
  const files=[...source.matchAll(/'\.\/([^']*)'/g)].map(match=>match[1]||'index.html');
  const hashes={};
  for(const file of new Set(files))hashes[file]=createHash('sha256').update(await readFile(new URL(file,root))).digest('hex');
  return {version,hashes};
}
