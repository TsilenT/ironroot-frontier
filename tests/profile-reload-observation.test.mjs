import test from 'node:test';
import assert from 'node:assert/strict';
import {createContext, runInContext} from 'node:vm';
import {PROFILE_RELOAD_LEDGER_KEY, installProfileReloadObservation, summarizeProfileReload} from '../qa/browser/profile-reload-observation.mjs';

// This is a unit harness for the passive observer only, not a browser/app test.
// Serializing the function matches addInitScript and prevents hidden closures.
let documentSerial = 0;
function harness({storage = new Map(), denyRead = false, denyWrite = false, maxEvents = 256} = {}) {
  const calls = [], listeners = [], writes = [];
  const nativeError = new Error('native receiver rejected');
  const results = Object.fromEntries(['go', 'back', 'forward', 'pushState', 'replaceState'].map(method => [method, {native: method}]));
  class History {}
  const history = new History();
  for (const method of Object.keys(results)) History.prototype[method] = function (...args) {
    if (this !== history) throw nativeError;
    calls.push({method, receiver: this, args});
    return results[method];
  };
  const documentId = `document-${++documentSerial}`;
  let now = 0;
  const addListener = target => (type, handler, options) => listeners.push({target, type, handler, options});
  const context = createContext({
    History, history,
    crypto: {randomUUID: () => documentId},
    performance: {now: () => ++now, timeOrigin: 1000 + documentSerial,
      getEntriesByType: type => type === 'navigation' ? [{type: storage.size ? 'reload' : 'navigate'}] : []},
    sessionStorage: {
      getItem(key) { if (denyRead) throw Error('read denied'); return storage.get(key) ?? null; },
      setItem(key, value) { if (denyWrite) throw Error('write denied'); writes.push({key, value}); storage.set(key, value); },
    },
    document: {hidden: false, addEventListener: addListener('document')},
    addEventListener: addListener('window'),
  });
  Object.defineProperty(context, 'localStorage', {get() { throw Error('observer must never access profile storage'); }});
  context.window = context;
  runInContext(`(${installProfileReloadObservation.toString()})(${JSON.stringify({storageKey: PROFILE_RELOAD_LEDGER_KEY, maxEvents})})`, context);
  return {calls, context, documentId, history, listeners, nativeError, results, storage, writes,
    ledger: () => JSON.parse(storage.get(PROFILE_RELOAD_LEDGER_KEY)),
    emit(target, type, event = {}) {
      for (const listener of listeners.filter(listener => listener.target === target && listener.type === type))
        listener.handler(event);
    }};
}
const click = (h, {trusted = true, enabled = true, id = 'profileReload'} = {}) => h.emit('document', 'click', {
  isTrusted: trusted, pointerType: 'touch', target: {closest: () => ({id, disabled: !enabled})},
  preventDefault() { throw Error('observer must not cancel a native event'); },
});

for (const method of ['go', 'back', 'forward', 'pushState', 'replaceState']) {
  test(`observer preserves native ${method} receiver, arguments and return value`, () => {
    const h = harness();
    const opaque = {get toJSON() { throw Error('do not inspect app payloads'); },
      [Symbol.toPrimitive]() { throw Error('do not coerce native arguments'); }};
    const args = method === 'go' ? [opaque] : [opaque, '', opaque];
    assert.equal(Reflect.apply(h.context.History.prototype[method], h.history, args), h.results[method]);
    assert.equal(h.calls.length, 1);
    assert.equal(h.calls[0].receiver, h.history);
    assert.deepEqual(h.calls[0].args, args);
    const observation = h.ledger().events.at(-1);
    assert.equal(observation.type, 'history-call');
    assert.equal(observation.method, method);
    assert.equal(observation.delta, null);
    assert.equal(observation.argumentCount, args.length);
    assert.ok(h.writes.every(write => write.key === PROFILE_RELOAD_LEDGER_KEY));
  });
}

test('observer preserves exact native exceptions and never accepts an invalid receiver', () => {
  const h = harness();
  assert.throws(() => Reflect.apply(h.context.History.prototype.go, {}, [-1]), error => error === h.nativeError);
  assert.equal(h.calls.length, 0);
  assert.equal(h.ledger().events.at(-1).delta, -1);
});

test('denied diagnostic storage cannot block native input/history', () => {
  const h = harness({denyRead: true, denyWrite: true});
  click(h);
  assert.equal(h.history.back(), h.results.back);
  assert.equal(h.calls.length, 1);
  assert.equal(h.storage.size, 0);
});

test('all input and departure listeners are passive and never install beforeunload/unload handlers', () => {
  const h = harness();
  assert.deepEqual(h.listeners.map(({type}) => type).sort(),
    ['click', 'pagehide', 'pageshow', 'pointerup', 'popstate', 'visibilitychange']);
  assert.ok(h.listeners.every(({options}) => options.passive === true));
  assert.ok(h.listeners.filter(({type}) => ['click', 'pointerup'].includes(type)).every(({options}) => options.capture === true));
  click(h);
  h.emit('window', 'pagehide', {isTrusted: true, persisted: false});
  assert.equal(h.calls.length, 0, 'observer never invokes History methods itself');
});

test('ledger survives a fresh document and identifies an old-document competing traversal', () => {
  const old = harness();
  old.history.go(-1); // Ordinary work before activation is outside the window.
  click(old);
  old.history.go(-1); // Deliberate negative observer control, not app injection.
  old.emit('window', 'popstate', {isTrusted: true});
  old.emit('window', 'pagehide', {isTrusted: true, persisted: false});
  const fresh = harness({storage: old.storage});
  fresh.history.replaceState({}, '');
  fresh.history.back(); // A later genuine Back belongs to the fresh document.
  fresh.emit('window', 'popstate', {isTrusted: true});
  const ledger = fresh.ledger(), summary = summarizeProfileReload(ledger, old.documentId);
  assert.equal(ledger.dropped, 0);
  assert.equal(summary.activations.length, 1);
  assert.equal(summary.departure.documentId, old.documentId);
  assert.equal(summary.nextDocument.documentId, fresh.documentId);
  assert.equal(summary.nextDocument.navigationType, 'reload');
  assert.equal(summary.competingTraversals.length, 1);
  assert.equal(summary.competingTraversals[0].method, 'go');
  assert.equal(summary.competingTraversals[0].delta, -1);
  assert.equal(summary.historyCalls.length, 1);
  assert.equal(summary.oldDocumentPopstates.length, 1);
  assert.ok(summary.nextDocument.sequence > summary.departure.sequence);
});

test('successful reload permits harmless old-document replaceState and fresh-document startup/Back', () => {
  const old = harness();
  click(old);
  old.history.replaceState({}, '');
  old.emit('window', 'pagehide', {isTrusted: true});
  const fresh = harness({storage: old.storage});
  fresh.history.replaceState({}, '');
  fresh.history.back();
  fresh.emit('window', 'popstate', {isTrusted: true});
  const summary = summarizeProfileReload(fresh.ledger(), old.documentId);
  assert.equal(summary.activations.length, 1);
  assert.deepEqual(summary.competingTraversals, []);
  assert.deepEqual(summary.historyCalls.map(event => event.method), ['replaceState']);
  assert.deepEqual(summary.oldDocumentPopstates, []);
});

test('untrusted, disabled and unrelated clicks cannot stand in for authorized native Reload', () => {
  const h = harness();
  click(h, {trusted: false});
  click(h, {enabled: false});
  click(h, {id: 'confirmImport'});
  h.history.go(-1);
  const summary = summarizeProfileReload(h.ledger(), h.documentId);
  assert.deepEqual(summary.activations, []);
  assert.equal(summary.departure, null);
  assert.equal(summary.nextDocument, null);
  assert.deepEqual(summary.competingTraversals, []);
});

test('bounded ledger reports dropped evidence instead of silently claiming a complete reload window', () => {
  const h = harness({maxEvents: 8});
  for (let i = 0; i < 40; i++) h.history.go(-1);
  const ledger = h.ledger();
  assert.equal(ledger.events.length, 8);
  assert.equal(ledger.nextSequence, 41);
  assert.equal(ledger.dropped, 33);
  assert.equal(ledger.events[0].sequence, 33);
  assert.equal(ledger.events.at(-1).sequence, 40);
});

test('diagnostic key and event bounds are validated before installing any observers', () => {
  for (const storageKey of ['ironroot.battle.v1', '', undefined])
    assert.throws(() => installProfileReloadObservation({storageKey}), /QA-only/);
  for (const maxEvents of [0, 7, 513, Infinity, 8.5])
    assert.throws(() => installProfileReloadObservation({storageKey: PROFILE_RELOAD_LEDGER_KEY, maxEvents}), /8 to 512/);
});
