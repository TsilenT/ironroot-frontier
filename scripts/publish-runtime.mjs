/** Publish only a validated browser snapshot. No dependencies, shell, or git credentials. */
import {createHash} from 'node:crypto';
import {lstatSync, readFileSync, readdirSync} from 'node:fs';
import {join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {inspectRuntime} from './verify-runtime.mjs';

export const SOURCE = Object.freeze({name: 'TsilenT/ironroot-frontier', id: 1447793733});
export const TARGET = Object.freeze({name: 'TsilenT/ironroot-frontier-play', id: 1447794727});
const API = 'https://api.github.com';
// Reviewed pure production constants; other spec/QA/evidence names stay rejected.
const PRODUCTION_SPEC_FILES = new Set(['citadel-spec.js', 'colossus-spec.js']);
const PRESERVED = new Set(['README.md', 'CNAME', '.nojekyll']);
const SHA = /^[0-9a-f]{40}$/;
const LIMITS = Object.freeze({files: 256, fileBytes: 2 * 1024 * 1024, totalBytes: 16 * 1024 * 1024});

function requireThat(condition, message) {
  if (!condition) throw new Error(message);
}
function validSha(value) {
  requireThat(typeof value === 'string' && SHA.test(value), 'Invalid Git object identity.');
  return value;
}
export function blobSha(bytes) {
  return createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
}
function allowedRuntimePath(path) {
  // Current runtime is deliberately flat. New directory layouts require review.
  return typeof path === 'string' && path.length <= 120 &&
    (/^[a-z][a-z0-9-]*\.(?:js|css|html|svg|woff2|webmanifest)$/.test(path) || path === 'FONTS-NOTICES.txt') &&
    (!/(?:^|-)(?:test|tests|spec|qa|evidence|secret|secrets|credentials)(?:-|\.)/i.test(path) || PRODUCTION_SPEC_FILES.has(path));
}
function cacheVersion(bytes) {
  const match = bytes.toString('utf8').match(/^const VERSION = '(ironroot-v[0-9]+\.[0-9]+\.[0-9]+)';$/m);
  requireThat(match, 'Service worker must declare a literal, versioned Ironroot cache.');
  return match[1];
}
function rejectObviousSecrets(path, bytes) {
  if (path.endsWith('.woff2')) return;
  const text = bytes.toString('utf8');
  requireThat(!/-----BEGIN (?:[A-Z]+ )*PRIVATE KEY-----|github_pat_[A-Za-z0-9_]{40,}|gh[pousr]_[A-Za-z0-9]{30,}|\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/.test(text),
    'Runtime contains a possible credential or private key; review it before publication.');
}

export function snapshotRuntime(directory) {
  const root = resolve(directory);
  requireThat(lstatSync(root).isDirectory() && !lstatSync(root).isSymbolicLink(), 'Runtime root must be a real directory.');
  // Bound input before the existing manifest verifier reads any file contents.
  const names = readdirSync(root);
  requireThat(names.length > 0 && names.length <= LIMITS.files, 'Runtime file count exceeds the safety limit.');
  let totalBytes = 0;
  for (const path of names) {
    requireThat(allowedRuntimePath(path) && !PRESERVED.has(path), 'Runtime contains an unapproved browser file path.');
    const stat = lstatSync(join(root, path));
    requireThat(stat.isFile() && !stat.isSymbolicLink() && stat.size <= LIMITS.fileBytes, 'Runtime entry must be a bounded regular file, never a symlink or directory.');
    totalBytes += stat.size;
    requireThat(totalBytes <= LIMITS.totalBytes, 'Runtime size exceeds the safety limit.');
  }
  const report = inspectRuntime(root);
  requireThat(report.runtimeFiles > 0 && report.runtimeFiles <= LIMITS.files, 'Runtime file count exceeds the safety limit.');
  requireThat(report.totalBytes <= LIMITS.totalBytes, 'Runtime size exceeds the safety limit.');
  const files = new Map();
  for (const path of Object.keys(report.files)) {
    requireThat(allowedRuntimePath(path) && !PRESERVED.has(path), 'Runtime contains an unapproved browser file path.');
    const stat = lstatSync(join(root, path));
    requireThat(stat.isFile() && !stat.isSymbolicLink() && stat.size <= LIMITS.fileBytes, 'Runtime entry is not a bounded regular file.');
    const bytes = readFileSync(join(root, path));
    requireThat(createHash('sha256').update(bytes).digest('hex') === report.files[path], 'Runtime changed during validation.');
    rejectObviousSecrets(path, bytes);
    files.set(path, {path, mode: '100644', type: 'blob', sha: blobSha(bytes), bytes});
  }
  for (const name of ['index.html', 'service-worker.js', 'manifest.webmanifest']) {
    requireThat(files.has(name), 'A required browser entry point is missing.');
  }
  return {files, cache: cacheVersion(files.get('service-worker.js').bytes)};
}

export function validateContext(env) {
  requireThat(env.GITHUB_ACTIONS === 'true', 'Publishing must run inside GitHub Actions.');
  requireThat(env.GITHUB_REPOSITORY === SOURCE.name && env.GITHUB_REPOSITORY_ID === String(SOURCE.id), 'Unexpected source repository.');
  requireThat(env.GITHUB_REF === 'refs/heads/main' && ['push', 'workflow_dispatch'].includes(env.GITHUB_EVENT_NAME), 'Only main push or manual runs may publish.');
  requireThat(env.GITHUB_API_URL === API && env.GITHUB_SERVER_URL === 'https://github.com', 'Unexpected GitHub server.');
  validSha(env.GITHUB_SHA);
  requireThat(typeof env.SOURCE_READ_TOKEN === 'string' && env.SOURCE_READ_TOKEN.length > 0, 'Source read token is missing.');
  requireThat(typeof env.IRONROOT_PUBLISH_TOKEN === 'string' && env.IRONROOT_PUBLISH_TOKEN.length > 0, 'IRONROOT_PUBLISH_TOKEN is missing; configure the approved restricted credential.');
  requireThat(env.SOURCE_READ_TOKEN !== env.IRONROOT_PUBLISH_TOKEN, 'Source and publication credentials must be separate.');
  return env.GITHUB_SHA;
}

// Tokens are sent only to this fixed origin and exact repository path. Never retry writes.
export function githubApi(repository, token, fetchImpl = fetch) {
  requireThat([SOURCE.name, TARGET.name].includes(repository), 'Unexpected API repository.');
  requireThat(typeof token === 'string' && token.length > 0, 'API credential is missing.');
  let requests = 0;
  return async (method, endpoint = '', body) => {
    requireThat(++requests <= 300, 'API request budget exceeded.');
    requireThat(['GET', 'POST', 'PATCH'].includes(method), 'Unsupported API operation.');
    requireThat(/^$|^\/git\/(?:ref\/heads\/main|refs\/heads\/main|commits(?:\/[0-9a-f]{40})?|trees(?:\/[0-9a-f]{40})?|blobs(?:\/[0-9a-f]{40})?)$/.test(endpoint), 'Unapproved API endpoint.');
    requireThat(repository === TARGET.name || method === 'GET', 'Source API is read-only.');
    const url = `${API}/repos/${repository}${endpoint}`;
    let response;
    try {
      response = await fetchImpl(url, {
        method,
        redirect: 'error',
        signal: AbortSignal.timeout(20_000),
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'Content-Type': 'application/json',
          'X-GitHub-Api-Version': '2022-11-28',
          'User-Agent': 'ironroot-runtime-publisher',
          // Ask HTTP caches to revalidate mutable refs; immutable reads stay as before.
          ...(method === 'GET' && endpoint === '/git/ref/heads/main' ? {'Cache-Control': 'no-cache'} : {}),
        },
        ...(body === undefined ? {} : {body: JSON.stringify(body)}),
      });
    } catch {
      throw new Error(`GitHub ${method} request failed or timed out; inspect the target ref before rerunning a write.`);
    }
    requireThat(response.status === (method === 'POST' ? 201 : 200), `GitHub ${method} failed (HTTP ${response.status}); no automatic retry.`);
    requireThat(Number(response.headers.get('content-length') || 0) <= 4 * 1024 * 1024, 'GitHub response exceeds the safety limit.');
    const chunks = [];
    let size = 0;
    try {
      for await (const chunk of response.body) {
        size += chunk.length;
        requireThat(size <= 4 * 1024 * 1024, 'GitHub response exceeds the safety limit.');
        chunks.push(chunk);
      }
      return JSON.parse(Buffer.concat(chunks).toString('utf8'));
    } catch {
      throw new Error('GitHub returned an invalid or oversized response.');
    }
  };
}

function verifyRepository(repo, expected, privateRepo) {
  requireThat(repo.id === expected.id && repo.full_name === expected.name && repo.private === privateRepo &&
    repo.visibility === (privateRepo ? 'private' : 'public') && repo.default_branch === 'main' &&
    repo.archived === false && repo.disabled === false, 'Repository identity, visibility, or availability changed.');
}
function verifySourceRepository(repo) {
  // Permit the source's private-to-public transition, with consistent API
  // visibility fields. Destination checks still require a public repository.
  requireThat(repo.visibility === 'private' || repo.visibility === 'public', 'Unsupported source repository visibility.');
  verifyRepository(repo, SOURCE, repo.visibility === 'private');
}
async function head(api) {
  const ref = await api('GET', '/git/ref/heads/main');
  requireThat(ref.ref === 'refs/heads/main' && ref.object?.type === 'commit', 'Unexpected main reference.');
  return validSha(ref.object.sha);
}
async function treeAt(api, commitSha) {
  const commit = await api('GET', `/git/commits/${validSha(commitSha)}`);
  requireThat(commit.sha === commitSha, 'GitHub returned the wrong commit.');
  return readTree(api, validSha(commit.tree?.sha));
}
async function readTree(api, treeSha) {
  const tree = await api('GET', `/git/trees/${validSha(treeSha)}`);
  requireThat(tree.sha === treeSha && tree.truncated === false && Array.isArray(tree.tree) && tree.tree.length <= 512, 'Tree is incomplete or exceeds the safety limit.');
  const seen = new Set();
  for (const entry of tree.tree) {
    validSha(entry.sha);
    requireThat(typeof entry.path === 'string' && !seen.has(entry.path), 'Invalid or duplicate tree entry.');
    seen.add(entry.path);
  }
  return tree;
}
async function readBlob(api, sha, maxBytes) {
  const blob = await api('GET', `/git/blobs/${validSha(sha)}`);
  requireThat(blob.sha === sha && blob.encoding === 'base64' && typeof blob.content === 'string' && blob.size <= maxBytes, 'Invalid or oversized Git blob.');
  const bytes = Buffer.from(blob.content, 'base64');
  requireThat(bytes.length === blob.size && blobSha(bytes) === sha, 'Git blob integrity check failed.');
  return bytes;
}

export async function publishRuntime({snapshot, sourceSha, sourceApi, targetApi}) {
  validSha(sourceSha);
  verifySourceRepository(await sourceApi('GET'));
  verifyRepository(await targetApi('GET'), TARGET, false);
  // Concurrency is not FIFO. An older queued run becomes a harmless no-op.
  if (await head(sourceApi) !== sourceSha) return {status: 'superseded'};
  const sourceRoot = await treeAt(sourceApi, sourceSha);
  const dist = sourceRoot.tree.find(entry => entry.path === 'dist');
  requireThat(dist?.type === 'tree' && dist.mode === '040000', 'Source dist must be a real Git tree.');
  const sourceDist = await readTree(sourceApi, dist.sha);
  requireThat(sourceDist.tree.length === snapshot.files.size && sourceDist.tree.every(entry =>
    entry.type === 'blob' && entry.mode === '100644' && snapshot.files.get(entry.path)?.sha === entry.sha),
  'Local runtime does not exactly match the tested source commit.');

  const targetHead = await head(targetApi);
  const targetTree = await treeAt(targetApi, targetHead);
  const current = new Map(targetTree.tree.map(entry => [entry.path, entry]));
  for (const entry of current.values()) {
    requireThat(entry.type === 'blob' && entry.mode === '100644' && (PRESERVED.has(entry.path) || allowedRuntimePath(entry.path)),
      'Target contains an unexpected file, directory, symlink, or submodule; review it manually.');
  }
  for (const name of PRESERVED) requireThat(current.has(name), 'A protected public file is missing.');
  requireThat((await readBlob(targetApi, current.get('CNAME').sha, 256)).toString('utf8') === 'ironroot.stevets.ai\n', 'Public domain differs from the approved domain.');
  requireThat(current.get('.nojekyll').sha === blobSha(Buffer.alloc(0)), '.nojekyll must remain an empty file.');

  const desired = [
    ...[...PRESERVED].map(path => ({path, mode: '100644', type: 'blob', sha: current.get(path).sha})),
    ...[...snapshot.files.values()].map(({bytes, ...entry}) => entry),
  ].sort((a, b) => a.path.localeCompare(b.path));
  if (desired.length === current.size && desired.every(entry => current.get(entry.path)?.sha === entry.sha)) {
    return {status: 'unchanged', commit: targetHead};
  }
  requireThat(current.has('service-worker.js'), 'Public service worker is missing.');
  const previousCache = cacheVersion(await readBlob(targetApi, current.get('service-worker.js').sha, LIMITS.fileBytes));
  requireThat(previousCache !== snapshot.cache, 'Runtime changed without a service-worker cache version bump.');

  // Validate again before uploading any bytes to the public repository.
  verifySourceRepository(await sourceApi('GET'));
  verifyRepository(await targetApi('GET'), TARGET, false);
  if (await head(sourceApi) !== sourceSha) return {status: 'superseded'};
  requireThat(await head(targetApi) === targetHead, 'Public main changed; no files were uploaded. Rerun after review.');
  for (const entry of snapshot.files.values()) {
    if (current.get(entry.path)?.sha === entry.sha) continue;
    const uploaded = await targetApi('POST', '/git/blobs', {content: entry.bytes.toString('base64'), encoding: 'base64'});
    requireThat(uploaded.sha === entry.sha, 'Uploaded blob identity mismatch.');
  }
  // A complete root tree intentionally drops obsolete runtime files. Protected bytes are reused.
  const createdTree = await targetApi('POST', '/git/trees', {tree: desired});
  const treeSha = validSha(createdTree.sha);
  const commit = await targetApi('POST', '/git/commits', {
    message: 'Publish validated browser runtime',
    tree: treeSha,
    parents: [targetHead],
    author: {name: 'github-actions[bot]', email: '41898282+github-actions[bot]@users.noreply.github.com'},
    committer: {name: 'github-actions[bot]', email: '41898282+github-actions[bot]@users.noreply.github.com'},
  });
  const commitSha = validSha(commit.sha);
  verifySourceRepository(await sourceApi('GET'));
  verifyRepository(await targetApi('GET'), TARGET, false);
  if (await head(sourceApi) !== sourceSha) return {status: 'superseded'};
  requireThat(await head(targetApi) === targetHead, 'Public main changed; prepared objects were not published. Rerun after review.');
  // force:false also rejects a racing non-fast-forward change after the preceding read.
  const updated = await targetApi('PATCH', '/git/refs/heads/main', {sha: commitSha, force: false});
  requireThat(updated.ref === 'refs/heads/main' && updated.object?.sha === commitSha && updated.object.type === 'commit', 'Publication result is uncertain; inspect public main before rerunning.');
  let verifiedHead = await head(targetApi);
  // Only the known pre-write head merits one read-only confirmation. A distinct
  // head is a possible concurrent move: reject it immediately, even if another
  // read might return our commit. Never repeat PATCH or accept tree equivalence.
  if (verifiedHead === targetHead) verifiedHead = await head(targetApi);
  requireThat(verifiedHead === commitSha,
    `Public main did not verify after publication; inspect its current state. Expected ${commitSha}, observed ${verifiedHead}. No writes were retried.`);
  return {status: 'published', commit: commitSha};
}

async function main() {
  const sourceSha = validateContext(process.env);
  const snapshot = snapshotRuntime('dist');
  const result = await publishRuntime({
    snapshot, sourceSha,
    sourceApi: githubApi(SOURCE.name, process.env.SOURCE_READ_TOKEN),
    targetApi: githubApi(TARGET.name, process.env.IRONROOT_PUBLISH_TOKEN),
  });
  console.log(`Runtime publication: ${result.status}.`);
  if (result.commit) console.log(`Public commit: ${result.commit}`);
  console.log(JSON.stringify(result));
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
