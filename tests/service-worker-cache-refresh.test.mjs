// Worker lifecycle model, not real-browser/network certification.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const source = readFileSync(new URL('../dist/service-worker.js', import.meta.url), 'utf8');
const origin = 'https://ironroot.example';
const scope = origin + '/game/';
const manifest = [...source.match(/const FILES = \[([\s\S]*?)\];/)[1].matchAll(/'([^']+)'/g)].map(match => new URL(match[1], scope).href);
const version = source.match(/const VERSION = '([^']+)'/)[1];
const priorVersion = 'ironroot-prior-fixture';

function worker(script = source, {failAt = null} = {}) {
  const events = new Map();
  const cachesByName = new Map([[priorVersion, new Map([['prior', 'retained']])], ['unrelated-app', new Map([['other', 'retained']])]]);
  const httpCache = new Map(manifest.map(url => [url, 'old shell: ' + url]));
  const profile = new Map([['save', '{"mission":"roadside-watch","time":7}'], ['settings', '{"music":false}']]);
  const before = new Map(profile);
  const requests = [];
  let skipped = 0, claimed = 0;
  class WorkerRequest extends Request {
    constructor(input, options) { super(typeof input === 'string' ? new URL(input, scope) : input, options); }
  }
  const caches = {
    async open(name) {
      if (!cachesByName.has(name)) cachesByName.set(name, new Map());
      const entries = cachesByName.get(name);
      return {
        async addAll(inputs) {
          // Cache.addAll commits as one batch only after every response succeeds.
          const pending = [];
          for (const input of inputs) {
            const request = input instanceof Request ? input : new WorkerRequest(input);
            requests.push(request);
            if (request.url === failAt) throw new TypeError('A shell asset failed');
            const bytes = request.cache === 'reload' ? 'new shell: ' + request.url : httpCache.get(request.url);
            pending.push([request.url, bytes]);
          }
          for (const [url, bytes] of pending) entries.set(url, bytes);
        },
        async match(input) {
          const url = typeof input === 'string' ? new URL(input, scope).href : input.url;
          return entries.get(url);
        },
      };
    },
    async keys() { return [...cachesByName.keys()]; },
    async delete(name) { return cachesByName.delete(name); },
  };
  runInNewContext(script, {
    Request: WorkerRequest, URL, caches,
    fetch() { throw new Error('Unexpected network fallback'); },
    self: {
      location: {origin}, registration: {scope},
      addEventListener(type, handler) { events.set(type, handler); },
      async skipWaiting() { skipped++; },
      clients: {async claim() { claimed++; }},
    },
  });
  return {
    cachesByName, requests, profile, before,
    get skipped() { return skipped; }, get claimed() { return claimed; },
    async run(type, extra = {}) {
      let pending;
      events.get(type)({...extra, waitUntil(value) { pending = value; }, respondWith(value) { pending = value; }});
      return pending;
    },
  };
}

test('a warmed HTTP cache cannot freeze old shell bytes into the new release cache', async () => {
  const h = worker();
  await h.run('install');
  assert.equal(h.requests.length, manifest.length);
  assert.ok(h.requests.every(request => request.cache === 'reload'));
  for (const url of manifest) assert.equal(h.cachesByName.get(version).get(url), 'new shell: ' + url);
  assert.equal(h.skipped, 1);
  assert.deepEqual(h.profile, h.before);
});

test('regression model reproduces the previous default-cache failure', async () => {
  const oldInstall = source.replace(/FILES\.map\(\(path\) => new Request\(path, \{ cache: 'reload' \}\)\)/, 'FILES');
  assert.notEqual(oldInstall, source);
  const h = worker(oldInstall);
  await h.run('install');
  assert.ok(h.requests.every(request => request.cache === 'default'));
  for (const url of manifest) assert.equal(h.cachesByName.get(version).get(url), 'old shell: ' + url);
  assert.equal(h.skipped, 1);
});

test('a failed refresh keeps the prior shell and never activates a partial release', async () => {
  const h = worker(source, {failAt: manifest.at(-1)});
  await assert.rejects(h.run('install'), /shell asset failed/);
  assert.equal(h.skipped, 0);
  assert.equal(h.claimed, 0);
  assert.equal(h.cachesByName.get(version).size, 0);
  assert.equal(h.cachesByName.get(priorVersion).get('prior'), 'retained');
  assert.deepEqual(h.profile, h.before);
});

test('activation preserves unrelated caches and player data, then serves the fresh shell offline', async () => {
  const h = worker();
  await h.run('install');
  await h.run('activate');
  assert.equal(h.claimed, 1);
  assert.equal(h.cachesByName.has(priorVersion), false);
  assert.equal(h.cachesByName.get('unrelated-app').get('other'), 'retained');
  assert.deepEqual(h.profile, h.before);
  assert.equal(await h.run('fetch', {request: {method: 'GET', mode: 'navigate', url: scope}}), 'new shell: ' + scope + 'index.html');
  assert.equal(await h.run('fetch', {request: {method: 'GET', mode: 'navigate', url: scope + 'training.html'}}), 'new shell: ' + scope + 'training.html');
  for (const url of manifest) assert.equal(await h.run('fetch', {request: {method: 'GET', mode: 'cors', url}}), 'new shell: ' + url);
});
