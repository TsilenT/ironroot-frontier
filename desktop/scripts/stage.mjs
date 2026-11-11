import { readdir, mkdtemp, rm, rename, copyFile, readFile, lstat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { inspectRuntime } from '../../scripts/verify-runtime.mjs';
import { assertPortableNames } from './stage-policy.mjs';
const desktop = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(desktop, '..', 'dist');
const target = path.join(desktop, 'game');
const sourceStat = await lstat(source);
if (!sourceStat.isDirectory() || sourceStat.isSymbolicLink()) throw new Error('dist must be a regular directory');
const entries = await readdir(source, { withFileTypes: true });
// Explicitly reject symlinks and nested directories, rather than copying unintended files.
if (entries.some(entry => !entry.isFile())) throw new Error('dist must contain only regular files; review staging before adding subdirectories');
for (const required of ['index.html', 'app.js', 'engine.js', 'styles.css']) await readFile(path.join(source, required));

// Use the same inventory/preflight as browser publication. Stray regular files
// (including local JSON or credentials) must not silently enter the desktop app.
const runtime = inspectRuntime(source);
const files = Object.keys(runtime.files);
assertPortableNames(files);
const [browserPackage, desktopPackage, worker, html] = await Promise.all([
  readFile(path.join(desktop, '..', 'package.json'), 'utf8').then(JSON.parse),
  readFile(path.join(desktop, 'package.json'), 'utf8').then(JSON.parse),
  readFile(path.join(source, 'service-worker.js'), 'utf8'),
  readFile(path.join(source, 'index.html'), 'utf8'),
]);
const version = browserPackage.version;
if (typeof version !== 'string' || !version || desktopPackage.version !== version ||
    worker.match(/const VERSION = '([^']+)';/)?.[1] !== `ironroot-v${version}` ||
    html.match(/data-runtime-version="([^"]+)"/)?.[1] !== `ironroot-v${version}`)
  throw new Error('Desktop, browser, document and offline-cache release identities must agree');

// Prepare and verify the complete copy before touching a previous stage.
// Failure is a build failure; none of this accesses player-profile storage.
const prepared = await mkdtemp(path.join(desktop, '.game-stage-'));
try {
  for (const name of files) await copyFile(path.join(source, name), path.join(prepared, name));
  const staged = inspectRuntime(prepared);
  if (staged.runtimeFiles !== runtime.runtimeFiles || files.some(name => staged.files[name] !== runtime.files[name]))
    throw new Error('Runtime changed while staging; retry from a stable source checkout');
  await rm(target, { recursive: true, force: true });
  await rename(prepared, target);
} finally {
  await rm(prepared, { recursive: true, force: true });
}
console.log(`Staged ${files.length} verified game assets for ${version}. Original dist remains unchanged.`);
