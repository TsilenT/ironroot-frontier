/** Portable parity support, not a historical app/runtime copy.
 * Two changed canonical modules are exact fixtures. Their six unchanged source
 * dependencies are verified before use, then copied into a disposable module
 * directory so no sibling checkout or custom loader can influence the baseline.
 */
import{readFileSync,mkdtempSync,writeFileSync,rmSync}from'node:fs';
import{tmpdir}from'node:os';import{join,basename}from'node:path';import{pathToFileURL}from'node:url';import{createHash}from'node:crypto';
const fixtureRoot=new URL('../../tests/fixtures/bram-forward-baseline/',import.meta.url),sourceRoot=new URL('../../',import.meta.url);
const MANIFEST_SHA256='4bbaed42a90abff0d8bdec7c9c87d88322d36ecc369ab28f3210a4d8655f7ab1';
const digest=(bytes,kind='sha256')=>createHash(kind).update(bytes).digest('hex');
export function createBaselineRuntime(){
 const manifestBytes=readFileSync(new URL('manifest.json',fixtureRoot));if(digest(manifestBytes)!==MANIFEST_SHA256)throw Error('Bram canonical baseline manifest changed');
 const manifest=JSON.parse(manifestBytes),modules=new Map();
 if(manifest.canonicalCommit!=='e1e5cf56fd67348863a385b6b3d20293aa5ef6b3'||manifest.canonicalTree!=='eef5bea6810e665d837b029a992536cf9c7b6fc5'||manifest.canonicalInventorySHA256!=='59430caf878805c3052dc8c797f4b13163ecf0daa98b587857f8a6a1cd15ec22')throw Error('Wrong Bram baseline identity');
 for(const row of manifest.files){
  const bytes=readFileSync(row.source==='fixture'?new URL(row.fixture,fixtureRoot):new URL(row.path,sourceRoot));
  const gitBlob=digest(Buffer.concat([Buffer.from('blob '+bytes.length+'\0'),bytes]),'sha1');
  if(bytes.length!==row.bytes||digest(bytes)!==row.sha256||gitBlob!==row.gitBlobSHA1)throw Error('Canonical Bram dependency changed: '+row.path);
  modules.set(basename(row.path),bytes);
 }
 // Prove that this is the entire actual static dependency closure. A future
 // added import cannot silently resolve into unverified current source.
 for(const[name,bytes]of modules)for(const match of bytes.toString().matchAll(/(?:import|export)[^\n]*?\bfrom\s*['"]([^'"]+)['"]/g))if(!match[1].startsWith('./')||!modules.has(match[1].slice(2)))throw Error('Unverified baseline dependency from '+name+': '+match[1]);
 const root=mkdtempSync(join(tmpdir(),'ironroot-bram-baseline-'));
 try{writeFileSync(join(root,'package.json'),'\n{"type":"module"}\n');for(const[name,bytes]of modules)writeFileSync(join(root,name),bytes);}catch(error){rmSync(root,{recursive:true,force:true});throw error;}
 return{manifest,engineSource:modules.get('engine.js').toString(),engineURL:pathToFileURL(join(root,'engine.js')),cleanup:()=>rmSync(root,{recursive:true,force:true})};
}
