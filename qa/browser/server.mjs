import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {basename, extname, isAbsolute, relative, resolve, sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';
import {UPDATE_BUILDS} from './update-fixtures.mjs';
import {LEGACY_QA_ROOT,LEGACY_QA_PATH} from './legacy-profile-fixtures.mjs';
import {REPORT_LEGACY_ROOT,REPORT_LEGACY_PATH} from './battle-report-legacy-fixtures.mjs';
import {PRODUCTION_V012_ROOT,PRODUCTION_V012_PATH,validateProductionV012} from './production-v012-fixtures.mjs';
import {validateProductionV015} from './production-v015-fixtures.mjs';
await validateProductionV015();
await validateProductionV012(); // Fail closed before serving immutable historical bytes.
const root = fileURLToPath(new URL('../../dist', import.meta.url));
// QA-only, loopback-only update sessions. Each case gets an unguessable path
// and its own browser context. There is no shared current-version switch.
const updates = new Map();
// Synthetic consecutive release identities exercise the current update UI and
// real worker lifecycle. No historical production source is relabelled here.
const runtimeUpdates = new Map();
const runtimeVersion = JSON.parse(await readFile(new URL('../../package.json', import.meta.url), 'utf8')).version;
const nextRuntimeVersion = runtimeVersion.split('.').map((value, index) => index === 2 ? Number(value) + 1 : value).join('.');
const mime = {'.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8'};
createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  let pathname = url.pathname, selectedRoot = root, runtimeAdvanced = null;
  if (pathname === '/__qa_runtime_update/sessions' && req.method === 'POST') {
    const id = randomUUID(); runtimeUpdates.set(id, false);
    res.writeHead(201, {'Content-Type':'application/json','Cache-Control':'no-store'});
    res.end(JSON.stringify({basePath:'/__qa_runtime_update/'+id+'/',from:runtimeVersion,to:nextRuntimeVersion})); return;
  }
  if (pathname.startsWith('/__qa_runtime_update/')) {
    const match = pathname.match(/^\/__qa_runtime_update\/([a-f0-9-]{36})(\/.*)?$/);
    if (!match || !runtimeUpdates.has(match[1])) {res.writeHead(404).end(); return;}
    const [,id,suffix='/'] = match;
    if (req.method === 'DELETE' && suffix === '/') {runtimeUpdates.delete(id);res.writeHead(204).end();return;}
    if (req.method === 'POST' && suffix === '/advance') {runtimeUpdates.set(id,true);res.writeHead(204).end();return;}
    if (!['GET','HEAD'].includes(req.method)) {res.writeHead(405).end();return;}
    runtimeAdvanced = runtimeUpdates.get(id); pathname = suffix;
  }
  if (pathname === '/__qa_update/sessions' && req.method === 'POST') {
    const from = url.searchParams.get('from');
    if (!Object.hasOwn(UPDATE_BUILDS, from) || url.searchParams.getAll('from').length !== 1) {res.writeHead(400).end();return;}
    const id = randomUUID(); updates.set(id, {from,phase:'prior'});
    res.writeHead(201, {'Content-Type': 'application/json', 'Cache-Control': 'no-store'});
    res.end(JSON.stringify({id,from,basePath:'/__qa_update/'+id+'/'})); return;
  }
  if (pathname.startsWith('/__qa_update/')) {
    const match = pathname.match(/^\/__qa_update\/([a-f0-9-]{36})(\/.*)?$/);
    if (!match || !updates.has(match[1])) {res.writeHead(404).end(); return;}
    const [,id,suffix='/'] = match;
    if (req.method === 'DELETE' && suffix === '/') {updates.delete(id);res.writeHead(204).end();return;}
    if (req.method === 'POST' && suffix === '/advance') {
      updates.get(id).phase = 'current';res.writeHead(204).end();return;
    }
    if (!['GET','HEAD'].includes(req.method)) {res.writeHead(405).end();return;}
    const session = updates.get(id);
    selectedRoot = session.phase === 'prior' ? resolve(fileURLToPath(UPDATE_BUILDS[session.from].root)) : root; pathname = suffix;
  }
  // Fixed QA-only baseline path shares browser-origin storage with current app.
  if(pathname.startsWith(LEGACY_QA_PATH)){
    if(!['GET','HEAD'].includes(req.method)){res.writeHead(405).end();return;}
    selectedRoot=fileURLToPath(LEGACY_QA_ROOT).replace(/\/$/,'');
    pathname='/'+pathname.slice(LEGACY_QA_PATH.length);
  }
  if(pathname.startsWith(REPORT_LEGACY_PATH)){
    if(!['GET','HEAD'].includes(req.method)){res.writeHead(405).end();return;}
    selectedRoot=fileURLToPath(REPORT_LEGACY_ROOT).replace(/\/$/,'');
    pathname='/'+pathname.slice(REPORT_LEGACY_PATH.length);
  }
  if(pathname.startsWith(PRODUCTION_V012_PATH)){
    if(!['GET','HEAD'].includes(req.method)){res.writeHead(405).end();return;}
    selectedRoot=fileURLToPath(PRODUCTION_V012_ROOT).replace(/\/$/,'');
    pathname='/'+pathname.slice(PRODUCTION_V012_PATH.length);
  }
  const path = resolve(selectedRoot, '.' + pathname.replace(/\/$/, '/index.html'));
  const relativePath = relative(selectedRoot, path);
  if (!relativePath || relativePath === '..' || relativePath.startsWith('..' + sep) || isAbsolute(relativePath)) {
    res.writeHead(403).end(); return;
  }
  try {
    let body = await readFile(path);
    if (runtimeAdvanced && ['service-worker.js','index.html'].includes(basename(path)))
      body = Buffer.from(body.toString('utf8').replaceAll('v'+runtimeVersion,'v'+nextRuntimeVersion));
    res.writeHead(200, {'Content-Type': mime[extname(path)] || 'application/octet-stream', 'Cache-Control': runtimeAdvanced === null ? 'no-store' : 'max-age=600'}); res.end(body);
  }
  catch {res.writeHead(404).end();}
}).listen(4187, '127.0.0.1');
