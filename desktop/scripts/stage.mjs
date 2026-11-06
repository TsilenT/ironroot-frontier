import { readdir, mkdir, rm, copyFile, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const desktop = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(desktop, '..', 'dist');
const target = path.join(desktop, 'game');
const entries = await readdir(source, { withFileTypes: true });
// Explicitly reject symlinks and nested directories, rather than copying unintended files.
if (entries.some(entry => !entry.isFile())) throw new Error('dist must contain only regular files; review staging before adding subdirectories');
for (const required of ['index.html', 'app.js', 'engine.js', 'styles.css']) await readFile(path.join(source, required));
await rm(target, { recursive: true, force: true });
await mkdir(target, { recursive: true });
for (const entry of entries) await copyFile(path.join(source, entry.name), path.join(target, entry.name));
console.log(`Staged ${entries.length} game assets. Original dist remains unchanged.`);
