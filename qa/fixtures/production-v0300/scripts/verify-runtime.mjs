/** Source-dist preflight only. Does not upload, publish, or grant release approval. */
import {readdirSync,readFileSync,lstatSync} from 'node:fs';
import {resolve,join,posix} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
export function inspectRuntime(directory){
  const root=resolve(directory),files=[];
  function walk(relative=''){
    for(const name of readdirSync(join(root,relative))){
      const path=posix.join(relative,name),stat=lstatSync(join(root,path));
      if(stat.isSymbolicLink())throw Error(`Runtime symlink is not allowed: ${path}`);
      if(stat.isDirectory())walk(path);else if(stat.isFile())files.push(path);else throw Error(`Unsupported runtime entry: ${path}`);
    }
  }
  walk();files.sort();
  const sw=readFileSync(join(root,'service-worker.js'),'utf8'),declaration=sw.match(/const FILES\s*=\s*\[([\s\S]*?)\];/);
  if(!declaration)throw Error('Offline shell FILES list is missing.');
  const urls=[...declaration[1].matchAll(/'([^']*)'/g)].map(m=>m[1]);
  if(!urls.length||new Set(urls).size!==urls.length)throw Error('Offline shell paths must be nonempty and unique.');
  const cached=new Set();
  for(const url of urls){
    if(!url.startsWith('./')||url.includes('..')||/[?#\\]/.test(url))throw Error(`Nonlocal or ambiguous offline path: ${url}`);
    if(url!=='./')cached.add(url.slice(2));
  }
  const expected=new Set([...cached,'service-worker.js']);
  const extras=files.filter(path=>!expected.has(path)),missing=[...expected].filter(path=>!files.includes(path));
  if(extras.length||missing.length)throw Error(`Runtime file mismatch. Unexpected: ${extras.join(', ')||'none'}. Missing: ${missing.join(', ')||'none'}.`);
  for(const file of files){
    if(/(?:^|\/)(__qa|\.)|\.(orig|rej|map)$/.test(file))throw Error(`Developer artifact in runtime: ${file}`);
    if(!file.endsWith('.js'))continue;
    const text=readFileSync(join(root,file),'utf8');
    for(const [,path] of text.matchAll(/\b(?:from\s*|import\s*(?:\(\s*)?)['"](\.\.?\/[^'"]+)['"]/g)){
      const target=posix.normalize(posix.join(posix.dirname(file),path));
      if(!cached.has(target))throw Error(`Uncached module imported by ${file}: ${target}`);
    }
  }
  return {scope:'local source-dist validation only, not publication approval',runtimeFiles:files.length,totalBytes:files.reduce((sum,file)=>sum+lstatSync(join(root,file)).size,0),files:Object.fromEntries(files.map(file=>[file,createHash('sha256').update(readFileSync(join(root,file))).digest('hex')]))};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{console.log(JSON.stringify(inspectRuntime(process.argv[2]||'dist'),null,2));}catch(error){console.error(error.message);process.exitCode=1;}
}
