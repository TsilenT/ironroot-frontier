// QA-only, passive browser observations. No app variables, storage domains,
// events, focus or timers are changed. The sole write is a bounded ledger in
// this tab's sessionStorage, retained so that a fresh document can be proved.
export const PROFILE_RELOAD_LEDGER_KEY = 'qa.profile-reload-navigation.v1';

// Self-contained for Playwright addInitScript and the serialized Node harness.
export function installProfileReloadObservation({storageKey, maxEvents = 256}) {
  if (typeof storageKey !== 'string' || !storageKey.startsWith('qa.'))
    throw new TypeError('Observation requires a QA-only sessionStorage key.');
  if (!Number.isInteger(maxEvents) || maxEvents < 8 || maxEvents > 512)
    throw new RangeError('Observation must retain 8 to 512 events.');
  let ledger;
  try { ledger = JSON.parse(sessionStorage.getItem(storageKey)); } catch {}
  if (!ledger || ledger.version !== 1 || !Array.isArray(ledger.events) ||
      !Number.isSafeInteger(ledger.nextSequence) || !Number.isSafeInteger(ledger.dropped))
    ledger = {version: 1, nextSequence: 0, dropped: 0, events: []};
  const documentId = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
  function record(type, detail = {}) {
    // Diagnostics must not prevent native input/history when storage is denied.
    try {
      ledger.events.push({sequence: ledger.nextSequence++, documentId, type,
        time: performance.now(), ...detail});
      if (ledger.events.length > maxEvents) {
        const excess = ledger.events.length - maxEvents;
        ledger.events.splice(0, excess); ledger.dropped += excess;
      }
      sessionStorage.setItem(storageKey, JSON.stringify(ledger));
    } catch {}
  }
  record('document-start', {timeOrigin: performance.timeOrigin,
    navigationType: performance.getEntriesByType('navigation')[0]?.type || null});
  for (const method of ['go', 'back', 'forward', 'pushState', 'replaceState']) {
    const original = History.prototype[method];
    History.prototype[method] = function (...args) {
      // Do not stringify/coerce state, URLs, receivers or nonprimitive deltas.
      // Native receiver/argument validation and thrown errors stay unchanged.
      record('history-call', {method, argumentCount: args.length,
        delta: method === 'go' && typeof args[0] === 'number' && Number.isFinite(args[0]) ? args[0] : null});
      return Reflect.apply(original, this, args);
    };
  }
  for (const type of ['click', 'pointerup']) document.addEventListener(type, event => {
    const target = event.target?.closest?.('button, #battle');
    if (!target) return;
    record(type, {target: String(target.id || '').slice(0, 100), trusted: event.isTrusted,
      enabled: !target.disabled, pointerType: String(event.pointerType || '').slice(0, 16)});
  }, {capture: true, passive: true});
  for (const type of ['pagehide', 'pageshow', 'popstate']) window.addEventListener(type, event => {
    record(type, {trusted: event.isTrusted, persisted: event.persisted === true});
  }, {passive: true});
  document.addEventListener('visibilitychange', () => {
    record('visibilitychange', {hidden: document.hidden});
  }, {passive: true});
}

// Classify only the explicitly activated OLD document. New-document startup
// and the later user-requested Back are not competing reload traversals.
export function summarizeProfileReload(ledger, fromDocument) {
  const events = ledger?.events || [];
  const activations = events.filter(event => event.documentId === fromDocument &&
    event.type === 'click' && event.target === 'profileReload' && event.trusted && event.enabled);
  const activation = activations[0] || null;
  const after = activation ? events.filter(event => event.sequence > activation.sequence) : [];
  const old = after.filter(event => event.documentId === fromDocument);
  return {
    activations,
    departure: old.find(event => event.type === 'pagehide') || null,
    nextDocument: after.find(event => event.type === 'document-start' && event.documentId !== fromDocument) || null,
    historyCalls: old.filter(event => event.type === 'history-call'),
    competingTraversals: old.filter(event => event.type === 'history-call' && ['go', 'back', 'forward'].includes(event.method)),
    oldDocumentPopstates: old.filter(event => event.type === 'popstate'),
  };
}
