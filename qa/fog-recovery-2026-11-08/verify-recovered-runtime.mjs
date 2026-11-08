// Dated recovery provenance check, intentionally separate from behavioral tests.
// Run against the recovered 2026-11-08 candidate, not every later app revision.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = process.env.FOG_CANDIDATE_ROOT || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const pinned = {
  'fog-view.js': '12f09d2c0e30b260ebfa8f431d218f1881be528b8a8b0c9c4617cb7cb6cf24db',
  'app.js': '8668d1ad368b9832c055a84c4609e1b7e78c8c81d623e5e3b7c2b7e9d67d7e06',
  'index.html': 'dadb018ce0da9a5d059d2d95a6a9e0661dbe6f89b2b996e34995259664ad913b',
};
for (const [file, sha] of Object.entries(pinned)) {
  assert.equal(createHash('sha256').update(readFileSync(path.join(root, 'dist', file))).digest('hex'), sha, file);
}
console.log('Dated recovery identity verified: all three files match the recovered SHA-256 values.');
