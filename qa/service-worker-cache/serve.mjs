// Manual native-browser cache regression. Loopback only; no browser automation.
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve, extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const port = Number(process.env.PORT || 4319);
const priorRoot = resolve(process.argv[2] || '');
if (!process.argv[2]) throw new Error('Provide an immutable prior runtime directory.');
const currentRoot = resolve(fileURLToPath(new URL('../../dist/', import.meta.url)));
const page = await readFile(new URL('./index.html', import.meta.url));
const phases = new Map([['default', 'prior'], ['reload', 'prior']]);
const requests = [];
const currentWorker = await readFile(resolve(currentRoot, 'service-worker.js'), 'utf8');
const files = [...new Set([...currentWorker.match(/const FILES = \[([\s\S]*?)\];/)[1].matchAll(/'([^']+)'/g)].map(m => m[1].slice(2) || 'index.html'))];
const expected = {};
for (const file of files) expected[file] = createHash('sha256').update(await readFile(resolve(currentRoot, file))).digest('hex');
const mime = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.woff2':'font/woff2','.webmanifest':'application/manifest+json'};
createServer(async (req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1:' + port);
  if (req.method === 'GET' && url.pathname === '/') {res.writeHead(200, {'Content-Type':'text/html','Cache-Control':'no-store'}).end(page);return;}
  if (req.method === 'GET' && url.pathname === '/expected') {res.writeHead(200, {'Content-Type':'application/json','Cache-Control':'no-store'}).end(JSON.stringify({expected, requests}));return;}
  const match = url.pathname.match(/^\/(default|reload)\/(.*)$/);
  if (!match) {res.writeHead(404).end();return;}
  const [,mode,name] = match;
  if (name === 'advance' && req.method === 'POST') {phases.set(mode, 'current');res.writeHead(204).end();return;}
  if (req.method !== 'GET') {res.writeHead(405).end();return;}
  const phase = phases.get(mode), root = phase === 'prior' ? priorRoot : currentRoot;
  const file = resolve(root, name || 'index.html');
  if (!file.startsWith(root + '/')) {res.writeHead(403).end();return;}
  try {
    let body = await readFile(file);
    if (name === 'service-worker.js') {
      let script = body.toString().replace(/const VERSION = '[^']+'/ , "const VERSION = 'ironroot-qa-" + mode + '-' + phase + "'");
      if (mode === 'default') script = script.replace(/FILES\.map\(\(path\) => new Request\(path, \{ cache: 'reload' \}\)\)/, 'FILES');
      body = Buffer.from(script);
    }
    requests.push({mode, phase, file: name || 'index.html', cacheControl:req.headers['cache-control'] || null});
    // Deliberately warm HTTP cache. Do not use request interception in this test.
    res.writeHead(200, {'Content-Type':mime[extname(file)] || 'text/plain','Cache-Control':'public, max-age=3600'}).end(body);
  } catch {res.writeHead(404).end();}
}).listen(port, '127.0.0.1', () => console.log('Cache regression at http://127.0.0.1:' + port + '/'));
