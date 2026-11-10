import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, writeFileSync, rmSync, symlinkSync, mkdirSync, readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {SOURCE, TARGET, blobSha, snapshotRuntime, validateContext, githubApi, publishRuntime} from '../scripts/publish-runtime.mjs';

const hash = text => blobSha(Buffer.from(text));
const SOURCE_SHA = hash('source commit');
const ORIGINAL_HEAD = hash('public commit');
const NEXT_SHA = hash('a newer source or target commit');
const OLD_SW = "const VERSION = 'ironroot-v0.24.0';\n";
const repo = (expected, privateRepo) => ({id: expected.id, full_name: expected.name, private: privateRepo,
  visibility: privateRepo ? 'private' : 'public', default_branch: 'main', archived: false, disabled: false});
const ref = sha => ({ref: 'refs/heads/main', object: {type: 'commit', sha}});
const environment = () => ({GITHUB_ACTIONS: 'true', GITHUB_REPOSITORY: SOURCE.name,
  GITHUB_REPOSITORY_ID: String(SOURCE.id), GITHUB_REF: 'refs/heads/main', GITHUB_EVENT_NAME: 'push',
  GITHUB_API_URL: 'https://api.github.com', GITHUB_SERVER_URL: 'https://github.com', GITHUB_SHA: SOURCE_SHA,
  SOURCE_READ_TOKEN: 'source-read-only-test-value', IRONROOT_PUBLISH_TOKEN: 'target-write-test-value'});

function fixture(t, {cache = '0.24.1', extras = {}} = {}) {
  const directory = mkdtempSync(join(tmpdir(), 'ironroot-publish-'));
  t.after(() => rmSync(directory, {recursive: true, force: true}));
  const files = {'index.html': '<!doctype html><script type="module" src="./app.js"></script>',
    'app.js': 'export const game = true;', 'manifest.webmanifest': '{}', ...extras};
  const sw = `const VERSION = 'ironroot-v${cache}';\nconst FILES = [\n './',\n${Object.keys(files).map(name => ` './${name}',`).join('\n')}\n];\n`;
  for (const [name, content] of Object.entries({...files, 'service-worker.js': sw})) {
    const path = join(directory, name);
    mkdirSync(join(path, '..'), {recursive: true});
    writeFileSync(path, content);
  }
  return {directory, snapshot: () => snapshotRuntime(directory)};
}

function mock(snapshot, options = {}) {
  const calls = [], blobs = new Map(), sourceTrees = new Map(), targetTrees = new Map();
  const entry = (path, bytes) => {
    bytes = Buffer.from(bytes);
    const sha = blobSha(bytes); blobs.set(sha, bytes);
    return {path, type: 'blob', mode: '100644', sha};
  };
  const sourceDist = [...snapshot.files.values()].map(({bytes, ...e}) => ({...e}));
  const distSha = hash('dist tree'), rootSha = hash('source root tree'), targetTreeSha = hash('public tree');
  sourceTrees.set(distSha, {sha: distSha, truncated: false, tree: sourceDist});
  sourceTrees.set(rootSha, {sha: rootSha, truncated: false, tree: [{path: 'dist', mode: '040000', type: 'tree', sha: distSha}]});
  const runtime = [...snapshot.files.values()].map(e => entry(e.path, e.bytes));
  const publicTree = [entry('README.md', 'Public project information.\n'), entry('CNAME', 'ironroot.stevets.ai\n'),
    entry('.nojekyll', ''), ...runtime];
  if (!options.unchanged) {
    publicTree.splice(publicTree.findIndex(e => e.path === 'service-worker.js'), 1, entry('service-worker.js', OLD_SW));
    publicTree.splice(publicTree.findIndex(e => e.path === 'app.js'), 1, entry('app.js', 'export const previousGame = true;'));
    publicTree.push(entry('obsolete.js', 'export const obsolete = true;'));
  }
  targetTrees.set(targetTreeSha, {sha: targetTreeSha, truncated: false, tree: publicTree});
  let publicHead = ORIGINAL_HEAD, sourceChecks = 0, targetChecks = 0, sourceRepoChecks = 0, targetRepoChecks = 0, postPatchReads = 0;
  const writes = () => calls.filter(c => c.method !== 'GET');
  const sourceApi = async (method, endpoint = '', body) => {
    calls.push({side: 'source', method, endpoint, body});
    assert.equal(method, 'GET');
    if (!endpoint) { sourceRepoChecks++; return options.sourceRepo?.(sourceRepoChecks) ?? repo(SOURCE, true); }
    if (endpoint === '/git/ref/heads/main') {
      sourceChecks++;
      return ref(sourceChecks === options.supersedeAt ? NEXT_SHA : SOURCE_SHA);
    }
    if (endpoint === `/git/commits/${SOURCE_SHA}`) return {sha: SOURCE_SHA, tree: {sha: rootSha}};
    if (endpoint.startsWith('/git/trees/')) return sourceTrees.get(endpoint.split('/').at(-1));
    throw new Error(`Unexpected mock source request ${method} ${endpoint}`);
  };
  const targetApi = async (method, endpoint = '', body) => {
    calls.push({side: 'target', method, endpoint, body});
    if (method === 'GET') {
      if (!endpoint) { targetRepoChecks++; return options.targetRepo?.(targetRepoChecks) ?? repo(TARGET, false); }
      if (endpoint === '/git/ref/heads/main') {
        targetChecks++;
        if (publicHead !== ORIGINAL_HEAD && options.postPatchHeads) {
          const value = options.postPatchHeads[Math.min(postPatchReads++, options.postPatchHeads.length - 1)];
          return ref(value === 'old' ? ORIGINAL_HEAD : value === 'published' ? publicHead : NEXT_SHA);
        }
        return ref(targetChecks === options.targetChangesAt ? NEXT_SHA : publicHead);
      }
      if (endpoint === `/git/commits/${ORIGINAL_HEAD}`) return {sha: ORIGINAL_HEAD, tree: {sha: targetTreeSha}};
      if (endpoint.startsWith('/git/trees/')) return targetTrees.get(endpoint.split('/').at(-1));
      if (endpoint.startsWith('/git/blobs/')) {
        const sha = endpoint.split('/').at(-1), bytes = blobs.get(sha);
        return {sha, encoding: 'base64', size: bytes.length, content: bytes.toString('base64')};
      }
    }
    if (method === 'POST' && endpoint === '/git/blobs') return {sha: blobSha(Buffer.from(body.content, 'base64'))};
    if (method === 'POST' && endpoint === '/git/trees') return {sha: hash(JSON.stringify(body.tree))};
    if (method === 'POST' && endpoint === '/git/commits') return {sha: hash(JSON.stringify(body))};
    if (method === 'PATCH' && endpoint === '/git/refs/heads/main') {
      assert.equal(body.force, false);
      if (options.patchFails) throw new Error('Mock non-fast-forward update rejected.');
      publicHead = body.sha;
      return options.patchResult ?? ref(publicHead);
    }
    throw new Error(`Unexpected mock target request ${method} ${endpoint}`);
  };
  return {calls, writes, sourceDist, sourceTrees, publicTree, entry, sourceApi, targetApi,
    run: () => publishRuntime({snapshot, sourceSha: SOURCE_SHA, sourceApi, targetApi})};
}

test('current real browser runtime passes the conservative publish snapshot guard', () => {
  const snapshot = snapshotRuntime(new URL('../dist', import.meta.url).pathname);
  assert.ok(snapshot.files.size > 0);
  assert.match(snapshot.cache, /^ironroot-v[0-9]+\.[0-9]+\.[0-9]+$/);
});

test('only main push or workflow_dispatch in the exact private repository is allowed', () => {
  assert.equal(validateContext(environment()), SOURCE_SHA);
  assert.equal(validateContext({...environment(), GITHUB_EVENT_NAME: 'workflow_dispatch'}), SOURCE_SHA);
  for (const changes of [
    {GITHUB_ACTIONS: 'false'}, {GITHUB_REPOSITORY: TARGET.name}, {GITHUB_REPOSITORY_ID: '0'},
    {GITHUB_REF: 'refs/pull/1/merge'}, {GITHUB_REF: 'refs/tags/v1'},
    {GITHUB_EVENT_NAME: 'pull_request'}, {GITHUB_EVENT_NAME: 'pull_request_target'},
    {GITHUB_REF: 'refs/heads/release', GITHUB_EVENT_NAME: 'workflow_dispatch'},
    {GITHUB_API_URL: 'https://untrusted.invalid'}, {GITHUB_SERVER_URL: 'https://untrusted.invalid'},
    {GITHUB_SHA: 'main'}, {SOURCE_READ_TOKEN: ''}, {IRONROOT_PUBLISH_TOKEN: ''},
    {IRONROOT_PUBLISH_TOKEN: environment().SOURCE_READ_TOKEN},
  ]) assert.throws(() => validateContext({...environment(), ...changes}));
});

test('unlisted, private, hidden, nested, and symlink runtime entries fail closed', async t => {
  for (const [name, listed] of [['notes.txt', false], ['README.md', true], ['private.html', false],
    ['secrets.js', true], ['game.test.js', true], ['.env', false], ['docs/private.js', true]]) {
    await t.test(name, st => {
      const f = fixture(st, {extras: listed ? {[name]: 'not browser runtime'} : {}});
      if (!listed) writeFileSync(join(f.directory, name), 'must not publish');
      assert.throws(f.snapshot);
    });
  }
  await t.test('symlink inside runtime', st => {
    const f = fixture(st); rmSync(join(f.directory, 'app.js')); symlinkSync('/etc/passwd', join(f.directory, 'app.js'));
    assert.throws(f.snapshot, /symlink/);
  });
  await t.test('symlink runtime root', st => {
    const f = fixture(st), link = f.directory + '-link'; symlinkSync(f.directory, link);
    st.after(() => rmSync(link)); assert.throws(() => snapshotRuntime(link), /real directory/);
  });
  await t.test('oversized runtime file', st => {
    const f = fixture(st); writeFileSync(join(f.directory, 'app.js'), 'x'.repeat(2 * 1024 * 1024 + 1));
    assert.throws(f.snapshot, /bounded regular file/);
  });
});

test('obvious credential patterns and private keys fail without echoing their value', async t => {
  for (const value of ['ghp_' + 'A'.repeat(36), 'github_pat_' + 'A'.repeat(60),
    '-----BEGIN RSA PRIVATE KEY-----', 'AKIA' + 'A'.repeat(16)]) {
    await t.test(value.slice(0, 5), st => {
      const f = fixture(st, {extras: {'token.js': `export const accidentallyCommitted = '${value}';`}});
      assert.throws(f.snapshot, error => /possible credential/.test(error.message) && !error.message.includes(value));
    });
  }
});

test('file-count and total-byte limits reject before manifest reads', async t => {
  await t.test('too many files', st => {
    const f = fixture(st);
    for (let i = 0; i < 257; i++) writeFileSync(join(f.directory, `extra-${i}.js`), '');
    assert.throws(f.snapshot, /file count/);
  });
  await t.test('too many total bytes in individually bounded files', st => {
    const f = fixture(st), bytes = Buffer.alloc(2 * 1024 * 1024, 'x');
    for (let i = 0; i < 9; i++) writeFileSync(join(f.directory, `large-${i}.js`), bytes);
    assert.throws(f.snapshot, /Runtime size/);
  });
});

test('identical public runtime is a true no-op with zero object or ref writes', async t => {
  const f = fixture(t), m = mock(f.snapshot(), {unchanged: true});
  assert.deepEqual(await m.run(), {status: 'unchanged', commit: ORIGINAL_HEAD});
  assert.equal(m.writes().length, 0);
});

test('publish is runtime-only, preserves public metadata, removes obsolete files, and never forces', async t => {
  const f = fixture(t), snapshot = f.snapshot(), m = mock(snapshot);
  const result = await m.run(); assert.equal(result.status, 'published');
  const tree = m.writes().find(c => c.endpoint === '/git/trees').body;
  assert.deepEqual(Object.keys(tree), ['tree']);
  assert.deepEqual(tree.tree.map(e => e.path).sort(), [...snapshot.files.keys(), 'README.md', 'CNAME', '.nojekyll'].sort());
  for (const name of ['README.md', 'CNAME', '.nojekyll']) {
    assert.deepEqual(tree.tree.find(e => e.path === name), m.publicTree.find(e => e.path === name));
  }
  const uploads = m.writes().filter(c => c.endpoint === '/git/blobs');
  assert.equal(uploads.length, 2);
  assert.deepEqual(new Set(uploads.map(c => blobSha(Buffer.from(c.body.content, 'base64')))),
    new Set(['app.js', 'service-worker.js'].map(path => snapshot.files.get(path).sha)));
  const commit = m.writes().find(c => c.endpoint === '/git/commits').body;
  assert.deepEqual(commit.parents, [ORIGINAL_HEAD]);
  assert.equal(commit.message, 'Publish validated browser runtime');
  assert.ok(!JSON.stringify(commit).includes(SOURCE_SHA));
  assert.deepEqual(m.writes().at(-1).body, {sha: result.commit, force: false});
  assert.equal(m.writes().filter(c => c.method === 'PATCH').length, 1);
});

test('post-PATCH read of pre-write head gets one confirmation without any write retry', async t => {
  const m = mock(fixture(t).snapshot(), {postPatchHeads: ['old', 'published']});
  const result = await m.run();
  assert.equal(result.status, 'published');
  const patch = m.calls.findIndex(c => c.method === 'PATCH');
  assert.deepEqual(m.calls.slice(patch + 1).map(c => [c.method, c.endpoint]),
    [['GET', '/git/ref/heads/main'], ['GET', '/git/ref/heads/main']]);
  assert.equal(m.writes().filter(c => c.method === 'PATCH').length, 1);
  assert.equal(m.writes().filter(c => c.endpoint === '/git/trees').length, 1);
  assert.equal(m.writes().filter(c => c.endpoint === '/git/commits').length, 1);
  assert.equal(m.writes().at(-1).body.sha, result.commit);
});

test('post-write verification stays bounded and refuses every unconfirmed or different head', async t => {
  for (const [name, heads, reads] of [
    ['persistent pre-write head', ['old'], 2],
    ['pre-write then concurrent head', ['old', 'other', 'published'], 2],
    ['concurrent then published head', ['other', 'published'], 1],
  ]) await t.test(name, async st => {
    const m = mock(fixture(st).snapshot(), {postPatchHeads: heads});
    await assert.rejects(m.run, error => error.message.includes('did not verify after publication') &&
      error.message.includes('Expected ') && error.message.includes('observed ') && error.message.includes('No writes were retried.'));
    const patch = m.calls.findIndex(c => c.method === 'PATCH');
    assert.equal(m.calls.length - patch - 1, reads);
    assert.ok(m.calls.slice(patch + 1).every(c => c.method === 'GET' && c.endpoint === '/git/ref/heads/main'));
    assert.equal(m.writes().filter(c => c.method === 'PATCH').length, 1);
  });
  for (const reread of [false, true]) await t.test(`failed ${reread ? 'confirmation' : 'initial verification'} GET does not retry writes`, async st => {
    const snapshot = fixture(st).snapshot(), m = mock(snapshot), original = m.targetApi;let published = false, reads = 0;
    await assert.rejects(publishRuntime({snapshot, sourceSha: SOURCE_SHA, sourceApi:m.sourceApi,
      targetApi: async (...args) => {
        if (published && args[0] === 'GET' && args[1] === '/git/ref/heads/main') {
          reads++;if (!reread || reads > 1) throw Error('Mock post-write read failure');
          await original(...args);return ref(ORIGINAL_HEAD);
        }
        const result = await original(...args);if(args[0] === 'PATCH')published = true;return result;
      },
    }), /post-write read failure/);
    assert.equal(reads,reread ? 2 : 1);assert.equal(m.writes().filter(c => c.method === 'PATCH').length,1);
  });
});

test('superseded source is skipped at all three freshness checkpoints', async t => {
  for (const checkpoint of [1, 2, 3]) await t.test(`checkpoint ${checkpoint}`, async st => {
    const m = mock(fixture(st).snapshot(), {supersedeAt: checkpoint});
    assert.deepEqual(await m.run(), {status: 'superseded'});
    assert.equal(m.writes().filter(c => c.method === 'PATCH').length, 0);
    if (checkpoint < 3) assert.equal(m.writes().length, 0);
  });
});

test('concurrent public changes fail before upload or ref update and never retry a racing update', async t => {
  for (const checkpoint of [2, 3]) await t.test(`checkpoint ${checkpoint}`, async st => {
    const m = mock(fixture(st).snapshot(), {targetChangesAt: checkpoint});
    await assert.rejects(m.run, /Public main changed/);
    assert.equal(m.writes().filter(c => c.method === 'PATCH').length, 0);
    if (checkpoint === 2) assert.equal(m.writes().length, 0);
  });
  await t.test('race at atomic non-force PATCH', async st => {
    const m = mock(fixture(st).snapshot(), {patchFails: true});
    await assert.rejects(m.run, /non-fast-forward/);
    assert.equal(m.writes().filter(c => c.method === 'PATCH').length, 1);
  });
  await t.test('uncertain PATCH response is not retried', async st => {
    const m = mock(fixture(st).snapshot(), {patchResult: ref(NEXT_SHA)});
    await assert.rejects(m.run, /uncertain/);
    assert.equal(m.writes().filter(c => c.method === 'PATCH').length, 1);
  });
  await t.test('public ref moved immediately after publication', async st => {
    const m = mock(fixture(st).snapshot(), {targetChangesAt: 4});
    await assert.rejects(m.run, /did not verify after publication/);
    assert.equal(m.writes().filter(c => c.method === 'PATCH').length, 1);
  });
});

test('wrong repository identity, visibility, default branch, or availability rejects before writes', async t => {
  for (const change of [{id: 7}, {full_name: 'someone/another'}, {private: true}, {visibility: 'private'},
    {default_branch: 'release'}, {archived: true}, {disabled: true}]) await t.test(JSON.stringify(change), async st => {
    const m = mock(fixture(st).snapshot(), {targetRepo: () => ({...repo(TARGET, false), ...change})});
    await assert.rejects(m.run, /identity, visibility, or availability/);
    assert.equal(m.writes().length, 0);
  });
  await t.test('source must remain the expected private repository', async st => {
    const m = mock(fixture(st).snapshot(), {sourceRepo: () => repo(SOURCE, false)});
    await assert.rejects(m.run, /identity, visibility, or availability/); assert.equal(m.writes().length, 0);
  });
  await t.test('visibility change immediately before upload', async st => {
    const m = mock(fixture(st).snapshot(), {targetRepo: n => repo(TARGET, n >= 2)});
    await assert.rejects(m.run, /identity, visibility, or availability/); assert.equal(m.writes().length, 0);
  });
});

test('local runtime must exactly match regular files at the tested source commit', async t => {
  for (const mutation of [m => {m.sourceDist[0].sha = NEXT_SHA;}, m => m.sourceDist.pop(),
    m => {m.sourceDist[0].mode = '120000';}, m => {m.sourceDist[0].mode = '100755';},
    m => {m.sourceDist[0].type = 'commit';}, m => m.sourceDist.push({...m.sourceDist[0], path: 'private.js'})]) {
    await t.test('mismatch', async st => {
      const m = mock(fixture(st).snapshot()); mutation(m);
      await assert.rejects(m.run, /exactly match/); assert.equal(m.writes().length, 0);
    });
  }
  await t.test('truncated source tree', async st => {
    const m = mock(fixture(st).snapshot()); [...m.sourceTrees.values()][0].truncated = true;
    await assert.rejects(m.run, /incomplete/); assert.equal(m.writes().length, 0);
  });
});

test('unexpected public files, directories, links, protected metadata changes fail closed', async t => {
  for (const mutation of [m => m.publicTree.push(m.entry('private.md', 'private')),
    m => m.publicTree.push({path: '.github', type: 'tree', mode: '040000', sha: NEXT_SHA}),
    m => {m.publicTree.at(-1).mode = '120000';},
    m => {m.publicTree.splice(m.publicTree.findIndex(e => e.path === 'README.md'), 1);},
    m => {m.publicTree.splice(m.publicTree.findIndex(e => e.path === 'CNAME'), 1, m.entry('CNAME', 'wrong.example\n'));},
    m => {m.publicTree.splice(m.publicTree.findIndex(e => e.path === '.nojekyll'), 1, m.entry('.nojekyll', 'nonempty'));}]) {
    await t.test('unexpected public state', async st => {
      const m = mock(fixture(st).snapshot()); mutation(m);
      await assert.rejects(m.run); assert.equal(m.writes().length, 0);
    });
  }
});

test('runtime changes require a new offline cache version before any writes', async t => {
  const m = mock(fixture(t, {cache: '0.24.0'}).snapshot());
  await assert.rejects(m.run, /cache version bump/); assert.equal(m.writes().length, 0);
});

test('API stays on exact HTTPS repository, disables redirects, bounds requests, and separates tokens', async () => {
  const calls = [];
  const fakeFetch = async (url, options) => {calls.push({url, options}); return new Response('{}', {status: 200});};
  const api = githubApi(SOURCE.name, 'source-secret-sentinel', fakeFetch);
  await api('GET', '/git/ref/heads/main');
  assert.equal(calls[0].url, `https://api.github.com/repos/${SOURCE.name}/git/ref/heads/main`);
  assert.equal(calls[0].options.redirect, 'error');
  assert.equal(calls[0].options.headers.Authorization, 'Bearer source-secret-sentinel');
  assert.equal(calls[0].options.headers['Cache-Control'], 'no-cache');
  await api('GET', `/git/commits/${SOURCE_SHA}`);
  assert.equal(calls[1].options.headers['Cache-Control'], undefined, 'immutable object reads retain their existing behavior');
  await githubApi(TARGET.name, 'target-test-value', fakeFetch)('PATCH', '/git/refs/heads/main', {sha: NEXT_SHA, force: false});
  assert.equal(calls[2].options.headers['Cache-Control'], undefined, 'write behavior is unchanged');
  assert.ok(calls[0].options.signal instanceof AbortSignal);
  await assert.rejects(api('POST', '/git/blobs', {}), /read-only/);
  for (const path of ['https://untrusted.invalid', '/../../elsewhere', '/git/refs/heads/other', '/git/blobs?token=x', '/actions/secrets']) {
    await assert.rejects(api('GET', path), /Unapproved/);
  }
  assert.equal(calls.length, 3);
  assert.throws(() => githubApi('another/repo', 'sentinel'), /Unexpected/);
  const bounded = githubApi(TARGET.name, 'test-only', fakeFetch);
  for (let i = 0; i < 300; i++) await bounded('GET');
  await assert.rejects(bounded('GET'), /budget/);
});

test('API errors never echo secrets or API bodies, and failed/uncertain writes are never retried', async t => {
  const secret = 'sensitive-test-sentinel';
  for (const failure of ['network', '401', '403', '422', 'redirect', 'invalid-json', 'oversized', 'oversized-stream']) {
    await t.test(failure, async () => {
      let calls = 0;
      const api = githubApi(TARGET.name, secret, async () => {
        calls++;
        if (failure === 'network') throw new Error(secret);
        if (failure === 'redirect') return new Response(secret, {status: 302});
        if (/^[0-9]+$/.test(failure)) return new Response(secret, {status: Number(failure)});
        if (failure === 'oversized') return new Response(secret, {status: 200, headers: {'content-length': String(5 * 1024 * 1024)}});
        if (failure === 'oversized-stream') return new Response(new Uint8Array(4 * 1024 * 1024 + 1), {status: 200});
        return new Response(secret, {status: 200});
      });
      await assert.rejects(api('PATCH', '/git/refs/heads/main', {sha: NEXT_SHA, force: false}), error => !error.message.includes(secret));
      assert.equal(calls, 1);
    });
  }
});

test('workflow keeps secrets out of test job, gates publication, and pins official actions', () => {
  const yaml = readFileSync(new URL('../.github/workflows/test.yml', import.meta.url), 'utf8');
  const [testJob, publishJob] = yaml.split('\n  publish:');
  assert.match(testJob, /contents: read/); assert.doesNotMatch(yaml, /contents: write|pull_request_target|workflow_run/);
  assert.doesNotMatch(testJob, /IRONROOT_PUBLISH_TOKEN|secrets\./);
  for (const command of ['npm test', 'npm run check', 'npm run check:release']) assert.ok(testJob.includes(command));
  assert.match(publishJob, /needs: test/); assert.match(publishJob, /github\.ref == 'refs\/heads\/main'/);
  assert.match(publishJob, /github\.event_name == 'push'/); assert.match(publishJob, /github\.event_name == 'workflow_dispatch'/);
  assert.match(publishJob, /cancel-in-progress: false/); assert.match(publishJob, /ref: \$\{\{ github.sha \}\}/);
  const uses = [...yaml.matchAll(/uses: (.+)/g)].map(m => m[1]);
  assert.equal(uses.length, 4);
  assert.ok(uses.every(use => /^actions\/(?:checkout|setup-node)@[0-9a-f]{40} # v4$/.test(use)));
  assert.equal((yaml.match(/persist-credentials: false/g) || []).length, 2);
});
