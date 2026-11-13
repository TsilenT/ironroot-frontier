import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';

const require = createRequire(import.meta.url);
const security = require('../desktop/security.cjs');
const { isGameNavigation } = security;
const origin = 'ironroot://game';
const pages = [`${origin}/`, `${origin}/index.html`, `${origin}/training.html`];
const deniedURLs = [
  'https://game/training.html', 'http://game/training.html', 'file:///training.html',
  'javascript:alert(1)', 'data:text/html,hello', 'about:blank',
  'blob:ironroot://game/training.html', 'ironroot:game/training.html',
  'ironroot:///game/training.html', 'ironroot://game', '//game/training.html',
  './training.html', '/training.html', '', 'not a URL',
  `${origin}.evil/training.html`, 'ironroot://evil/training.html',
  'ironroot://GAME/training.html', 'IRONROOT://game/training.html',
  'ironroot://game./training.html', 'ironroot://%67ame/training.html',
  'ironroot://user@game/training.html', 'ironroot://user:password@game/training.html',
  'ironroot://:password@game/training.html', 'ironroot://@game/training.html',
  'ironroot://game@evil/training.html', 'ironroot://game:80/training.html',
  'ironroot://game:443/training.html', 'ironroot://game:0/training.html',
  'ironroot://game:/training.html', 'ironroot://game:invalid/training.html',
  ...[
    '/other.html', '/backup.json', '/app.js', '/main.cjs', '/service-worker.js',
    '/Training.html', '/training.htm', '/training.html.bak', '/training.html/',
    '/index.html/', '/training.html/other', '/nested/training.html', '//training.html',
    '/./training.html', '/nested/../training.html', '/%2e/training.html',
    '/nested/%2e%2e/training.html', '/%2E%2E/training.html', '/%2ftraining.html',
    '/%74raining.html', '/training%2ehtml', '/training.html%00', '/training.html%2f',
    '/%252e%252e%252ftraining.html', '/a%5c..%5ctraining.html', '/a\\..\\training.html',
    '/%GG.html', '/training.html%GG', '/training.html%23section', '/training.html%3f',
    '/training.html?step=1', '/training.html?', '/?next=training.html',
    '/index.html?next=https://example.com', '/training.html?x=1#section'
  ].map(path => `${origin}${path}`),
  ` ${origin}/training.html`, `${origin}/training.html `,
  `${origin}/train\ning.html`, `${origin}/training.html\r`,
  `${origin}/training.html#frag\tment`, `${origin}/training.html#fragment\0`
];

test('desktop page navigation permits only canonical entry/training URLs and fragments', () => {
  for (const page of pages) {
    for (const hash of ['', '#', '#practice', '#motion=reduce&detail=low', '#motion=full&detail=high', '#lesson%202', '#?next=https://example.com/path', '#one#two']) {
      assert.equal(isGameNavigation(`${page}${hash}`), true, `${page}${hash}`);
    }
  }
});

test('desktop page navigation rejects foreign origins, credentials, ports, aliases and other paths', () => {
  for (const url of deniedURLs) assert.equal(isGameNavigation(url), false, JSON.stringify(url));
  for (const value of [undefined, null, false, 1, {}, new URL(pages[0]), { toString() { throw Error('Do not coerce input'); } }]) {
    assert.equal(isGameNavigation(value), false);
  }
});

async function bootMockDesktop() {
  const contentEvents = new Map();
  const callbacks = {};
  const windows = [];
  const sessionEvents = new Map();
  const gameSession = {
    setPermissionRequestHandler: callback => { callbacks.permission = callback; },
    setPermissionCheckHandler: callback => { callbacks.permissionCheck = callback; },
    on: (name, callback) => sessionEvents.set(name, callback),
    webRequest: { onBeforeRequest: callback => { callbacks.request = callback; } },
    protocol: { handle: async (scheme, callback) => {
      assert.equal(scheme, 'ironroot');
      callbacks.protocol = callback;
    } },
    flushStorageData() {}
  };
  class FakeWindow {
    constructor(options) {
      this.options = options;
      windows.push(this);
      this.webContents = {
        setWindowOpenHandler: callback => { callbacks.open = callback; },
        on: (name, callback) => contentEvents.set(name, callback)
      };
    }
    once() {}
    on() {}
    loadURL(url) { this.url = url; return Promise.resolve(); }
    show() {}
    static getAllWindows() { return windows; }
  }
  const electron = {
    app: {
      setName() {}, requestSingleInstanceLock: () => true, on() {},
      whenReady: () => Promise.resolve(), isPackaged: true,
      quit: () => assert.fail('Mock desktop should not quit during startup')
    },
    BrowserWindow: FakeWindow,
    Menu: { setApplicationMenu() {}, buildFromTemplate: template => template },
    protocol: { registerSchemesAsPrivileged: schemes => { callbacks.schemes = schemes; } },
    session: { fromPartition: partition => {
      assert.equal(partition, 'persist:ironroot-frontier');
      return gameSession;
    } },
    dialog: { showErrorBox: (_title, message) => assert.fail(message) }
  };
  runInNewContext(await readFile(new URL('../desktop/main.cjs', import.meta.url), 'utf8'), {
    require: name => name === 'electron' ? electron : name === './security.cjs' ? security : require(name),
    __dirname: fileURLToPath(new URL('../desktop/', import.meta.url)),
    process: { platform: 'linux' }, Response
  });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(windows.length, 1);
  return { contentEvents, callbacks, window: windows[0], sessionEvents, gameSession };
}

function wasPrevented(handler, fields, ...deprecatedArgs) {
  let prevented = false;
  handler({ ...fields, preventDefault: () => { prevented = true; } }, ...deprecatedArgs);
  return prevented;
}

test('actual title/practice/return links survive both top-level navigation listeners', async () => {
  const { window, contentEvents } = await bootMockDesktop();
  assert.equal(window.url, `${origin}/index.html`);
  const title = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
  const training = await readFile(new URL('../dist/training.html', import.meta.url), 'utf8');
  const link = (html, id) => {
    const tag = html.match(new RegExp(`<a\\b[^>]*\\bid="${id}"[^>]*>`))?.[0];
    assert.ok(tag, `Missing real link: ${id}`);
    return tag.match(/\bhref="([^"]+)"/)?.[1];
  };
  const practiceURL = new URL(link(title, 'welcomeTraining'), window.url).href;
  const returnURL = new URL(link(training, 'returnGame'), practiceURL).href;
  assert.equal(practiceURL, `${origin}/training.html`);
  assert.equal(returnURL, `${origin}/`);
  for (const url of [window.url, practiceURL, returnURL, practiceURL, `${returnURL}index.html`]) {
    // Electron emits will-frame-navigate first, then will-navigate for the main frame.
    for (const name of ['will-frame-navigate', 'will-navigate']) {
      assert.equal(wasPrevented(contentEvents.get(name), { url, isMainFrame: true }), false, `${name}: ${url}`);
    }
  }
});

test('all navigation and redirect listeners apply the same top-level-only allowlist', async () => {
  const { contentEvents } = await bootMockDesktop();
  for (const name of ['will-navigate', 'will-frame-navigate', 'will-redirect']) {
    const listener = contentEvents.get(name);
    assert.equal(typeof listener, 'function', name);
    for (const url of [...pages, `${origin}/training.html#practice`]) {
      assert.equal(wasPrevented(listener, { url, isMainFrame: true }), false, `${name}: ${url}`);
      for (const isMainFrame of [false, undefined, null, 1, 'true']) {
        assert.equal(wasPrevented(listener, { url, isMainFrame }), true, `${name}: subframe/missing frame flag`);
      }
    }
    for (const url of deniedURLs) {
      assert.equal(wasPrevented(listener, { url, isMainFrame: true }), true, `${name}: ${JSON.stringify(url)}`);
    }
    for (const fields of [{}, { isMainFrame: true }, { url: null, isMainFrame: true }, { url: {}, isMainFrame: true }]) {
      assert.equal(wasPrevented(listener, fields), true, `${name}: malformed event`);
    }
    // The current Electron event object is authoritative. Do not trust deprecated
    // positional arguments or a fabricated second-argument details object.
    assert.equal(wasPrevented(listener, {}, pages[2], false, true), true);
    assert.equal(wasPrevented(listener, {}, { url: pages[2], isMainFrame: true }), true);
    assert.equal(wasPrevented(listener, { url: 'https://example.com', isMainFrame: true }, pages[2], false, true), true);
    assert.equal(wasPrevented(listener, { url: pages[2], isMainFrame: true }, 'https://example.com', false, false), false);
  }
});

test('training navigation leaves isolation, permissions, windows, downloads and request restrictions intact', async () => {
  const { callbacks, contentEvents, sessionEvents, window, gameSession } = await bootMockDesktop();
  const preferences = window.options.webPreferences;
  assert.equal(preferences.session, gameSession);
  for (const name of ['sandbox', 'contextIsolation', 'webSecurity']) assert.equal(preferences[name], true, name);
  for (const name of ['nodeIntegration', 'nodeIntegrationInWorker', 'nodeIntegrationInSubFrames', 'allowRunningInsecureContent', 'webviewTag', 'devTools']) assert.equal(preferences[name], false, name);
  assert.equal(preferences.preload, undefined);
  assert.equal(callbacks.schemes[0].privileges.allowServiceWorkers, undefined);
  assert.equal(callbacks.schemes[0].privileges.bypassCSP, undefined);
  assert.equal(callbacks.permissionCheck(), false);
  callbacks.permission(null, 'media', allowed => assert.equal(allowed, false));
  for (const url of [...pages, 'https://example.com', 'file:///tmp/example.html']) {
    assert.equal(callbacks.open({ url }).action, 'deny', url);
  }
  assert.equal(wasPrevented(contentEvents.get('will-attach-webview'), { url: pages[2], isMainFrame: true }), true);
  assert.equal(wasPrevented(sessionEvents.get('will-download'), { url: pages[2] }), true);
  for (const url of ['https://example.com', 'file:///tmp/test', 'ironroot://evil/training.html', 'ironroot://user@game/training.html', 'ironroot://game:80/training.html']) {
    callbacks.request({ url }, result => assert.equal(result.cancel, true, url));
  }
  for (const url of [...pages, `${origin}/training.js`, `${origin}/training.css`]) {
    callbacks.request({ url }, result => assert.equal(result.cancel, false, url));
  }
  assert.equal((await callbacks.protocol({ method: 'POST', url: pages[2] })).status, 405);
});
