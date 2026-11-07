// Read-only native history observations for the bounded Volley regression.
// The observer never writes history, game state, or application storage.
import {expect} from '@playwright/test';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {extname} from 'node:path';

export const VOLLEY_BASE = 'b88119fdd2cc288633e58bfaf0baffa302ee76de';
const marker = state => state?.ironrootNavigation ?? null;
const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const mime = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.webmanifest':'application/manifest+json','.woff2':'font/woff2','.txt':'text/plain'};
let baseAssets;
export async function serveVolleyBase(context) {
  // Serve exact git objects through the same origin and requests as candidate.
  // No copied runtime fixture, new server, application hook, or production URL.
  if (!baseAssets) {
    const names = execFileSync('git', ['ls-tree','-r','--name-only',VOLLEY_BASE,'dist'], {encoding:'utf8'}).trim().split('\n');
    baseAssets = new Map(names.map(name => {
      const body = execFileSync('git', ['show', `${VOLLEY_BASE}:${name}`]);
      return ['/' + name.slice(5), {body, sha256:createHash('sha256').update(body).digest('hex')}];
    }));
    expect(baseAssets.size).toBe(51);
  }
  await context.route('http://127.0.0.1:4187/**', async route => {
    const path = new URL(route.request().url()).pathname.replace(/\/$/, '/index.html');
    const asset = baseAssets.get(path);
    if (!asset) return route.continue();
    await route.fulfill({status:200,body:asset.body,contentType:mime[extname(path)] || 'application/octet-stream',headers:{'Cache-Control':'no-store'}});
  });
  return Object.fromEntries([...baseAssets].map(([path, value]) => [path, value.sha256]));
}

export async function observeVolleyHistory(page) {
  const records = [], checks = [], entries = [];
  let index = -1;
  function accept(record) {
    records.push(record);
    // This passive ledger retains full opaque identities, including the prior
    // document's entries across a fixture reload. It is not written to the app.
    if (record.kind === 'document-start' || record.kind === 'popstate' || record.kind === 'pageshow') {
      const found = entries.findIndex(entry => entry && (marker(record.state)
        ? equal(entry.state, record.state) : !marker(entry.state) && entry.url === record.url));
      if (found >= 0) index = found;
      else if (record.kind === 'document-start') {
        index = record.length - 1;
        entries.length = record.length;
        entries[index] = {state:record.state,url:record.url};
      }
    }
    if (record.kind === 'after pushState') {
      entries.splice(index + 1);
      entries.push({state:record.state,url:record.url});
      index++;
    }
    if (record.kind === 'after replaceState') entries[index] = {state:record.state,url:record.url};
  }
  await page.exposeBinding('__volleyHistorySink', (_source, record) => accept(record));
  await page.addInitScript(() => {
    const documentId = crypto.randomUUID(), pending = [];
    let sequence = 0, pops = 0;
    const copy = value => value == null ? null : structuredClone(value);
    const snapshot = () => ({documentId, sequence:++sequence, timeOrigin:performance.timeOrigin,
      at:performance.now(), wallTime:Date.now(), url:location.href, length:history.length,
      state:copy(history.state), pops, armed:document.querySelector('#rally')?.classList.contains('active') ?? false,
      paused:document.querySelector('#pauseVeil')?.classList.contains('hidden') === false});
    const record = (kind, detail = {}) => {
      const value = {...snapshot(),kind,...detail};
      pending.push(window.__volleyHistorySink(value));
      return value;
    };
    window.__volleyHistoryProbe = {record,snapshot,flush:() => Promise.all(pending)};
    record('document-start', {navigationType:performance.getEntriesByType('navigation')[0]?.type});
    for (const name of ['pushState','replaceState','go','back','forward']) {
      const original = history[name];
      history[name] = function(...args) {
        record('before ' + name, {args:copy(args)});
        try {const result = original.apply(this,args);record('after ' + name);return result;}
        catch (error) {record('throw ' + name, {error:String(error)});throw error;}
      };
    }
    addEventListener('popstate', event => {
      pops++;record('popstate', {eventState:copy(event.state)});
      queueMicrotask(() => record('after popstate microtask'));
    });
    for (const name of ['pageshow','pagehide']) addEventListener(name, event => record(name, {persisted:event.persisted}));
    document.addEventListener('click', event => record('click', {target:event.target.closest('button')?.id ?? event.target.id}), true);
    document.addEventListener('keyup', event => record('keyup', {code:event.code}), true);
  });
  const flush = () => page.evaluate(() => window.__volleyHistoryProbe?.flush());
  const snapshot = () => page.evaluate(() => window.__volleyHistoryProbe.snapshot());
  async function ready() {
    // Let native UI handlers, mutation observers and queued history reconciliation
    // complete; if go() is pending, require its actual new popstate as well.
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    await flush();
    const lastGo = records.findLast(record => ['before go','before back','before forward'].includes(record.kind));
    if (lastGo) await expect.poll(async () => {
      await flush();
      return records.some(record => record.documentId === lastGo.documentId && record.kind === 'popstate' && record.sequence > lastGo.sequence)
        || (await snapshot()).documentId !== lastGo.documentId;
    }, {message:'pending native traversal must finish before the next action'}).toBe(true);
    await flush();
    const current = await snapshot();
    expect(entries[index]?.state, 'passive ledger agrees with the full native marker').toEqual(current.state);
    expect(entries.length).toBe(current.length);
    return current;
  }
  async function mark(label, detail = {}) {
    const current = await page.evaluate(label => window.__volleyHistoryProbe.record(label), label);
    await flush();checks.push({label,...detail,...current});return current;
  }
  async function traverse(direction) {
    const before = await ready(), destination = entries[index + (direction === 'back' ? -1 : 1)];
    expect(destination, 'observed native history destination exists').toBeTruthy();
    const expected = structuredClone(destination);
    const count = records.filter(record => record.kind === 'popstate').length;
    checks.push({label:'expected ' + direction,from:before.state,to:expected.state,documentId:before.documentId,popCountBefore:count});
    await page.evaluate(direction => history[direction](), direction);
    if (marker(expected.state)) {
      await expect.poll(async () => {
        await flush();
        return records.filter(record => record.kind === 'popstate').slice(count).some(record =>
          record.documentId === before.documentId && equal(record.eventState, expected.state) && equal(record.state, expected.state));
      }, {message:'new native popstate must carry the full expected document/entry identity'}).toBe(true);
      await expect.poll(async () => (await snapshot()).state, {message:'native current marker reaches the expected destination'}).toEqual(expected.state);
      return ready();
    }
    await expect(page).toHaveURL(expected.url);
    await expect.poll(async () => (await snapshot()).documentId).not.toBe(before.documentId);
    await flush();return snapshot();
  }
  async function attach(info, detail) {
    // Always called in finally, including a failed readiness or UI assertion.
    try {await flush();} catch (error) {records.push({kind:'final flush error',error:String(error)});}
    await info.attach('complete-native-history-trace', {body:JSON.stringify({...detail,checks,records}),contentType:'application/json'});
  }
  function assertOpaqueStates() {
    for (const record of records) for (const state of [record.state,record.eventState]) {
      if (state == null) continue;
      expect(Object.keys(state)).toEqual(['ironrootNavigation']);
      expect(Object.keys(state.ironrootNavigation).sort()).toEqual(['document','entry','version']);
    }
  }
  return {ready,mark,traverse,attach,assertOpaqueStates};
}
