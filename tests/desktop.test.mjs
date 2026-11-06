import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile, mkdtemp, mkdir, writeFile, symlink, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { isLocal, assetPath, readAsset, CSP } = require('../desktop/security.cjs');
const root = path.resolve('/tmp/ironroot-test-assets');
test('only the fixed offline origin is trusted', () => {
  assert.equal(isLocal('ironroot://game/index.html'), true);
  for (const url of ['https://game/index.html', 'file:///etc/passwd', 'ironroot://evil/x.js', 'ironroot://game:80/x.js', 'ironroot://user@game/x.js', 'javascript:alert(1)', 'bad']) assert.equal(isLocal(url), false, url);
});
test('asset resolution rejects traversal, unsupported types, workers and malformed encodings', () => {
  assert.equal(assetPath(root, 'ironroot://game/'), path.join(root, 'index.html'));
  assert.equal(assetPath(root, 'ironroot://game/app.js?version=1'), path.join(root, 'app.js'));
  for (const suffix of ['/%2e%2e%2fsecret.js', '/a%5c..%5csecret.js', '/%00.js', '/%GG.js', '/main.cjs', '/service-worker.js', '/.env']) assert.equal(assetPath(root, `ironroot://game${suffix}`), null, suffix);
});
test('real asset reads refuse symlink escape, missing files and directories', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'ironroot-security-'));
  try {
    const assets = path.join(dir, 'assets'); await mkdir(assets);
    await writeFile(path.join(assets, 'app.js'), 'export const ok = true;');
    await writeFile(path.join(dir, 'secret.js'), 'secret');
    // Windows developer-mode/admin rights may be required for symlink creation.
    let linkCreated = false;
    try { await symlink(path.join(dir, 'secret.js'), path.join(assets, 'escape.js')); linkCreated = true; }
    catch (error) { if (process.platform !== 'win32' || error.code !== 'EPERM') throw error; }
    assert.equal((await readAsset(assets, 'ironroot://game/app.js')).type, 'text/javascript; charset=utf-8');
    if (linkCreated) assert.equal(await readAsset(assets, 'ironroot://game/escape.js'), null);
    assert.equal(await readAsset(assets, 'ironroot://game/missing.js'), null);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
test('CSP prohibits remote code, network connections, workers and framing', () => {
  for (const directive of ["script-src 'self'", "connect-src 'none'", "worker-src 'none'", "frame-src 'none'", "object-src 'none'", "frame-ancestors 'none'"]) assert.ok(CSP.includes(directive));
  assert.ok(!CSP.includes('unsafe-eval'));
});
test('desktop isolation and package safety contracts remain explicit', async () => {
  const main = await readFile(new URL('../desktop/main.cjs', import.meta.url), 'utf8');
  for (const contract of ['nodeIntegration: false', 'contextIsolation: true', 'sandbox: true', 'webSecurity: true', 'webviewTag: false', "action: 'deny'", "persist:ironroot-frontier", 'setPermissionRequestHandler', "will-download", 'requestSingleInstanceLock']) assert.ok(main.includes(contract), contract);
  const pkg = JSON.parse(await readFile(new URL('../desktop/package.json', import.meta.url), 'utf8'));
  assert.equal(pkg.version, '0.4.0'); assert.equal(pkg.private, true); assert.equal(pkg.build.publish, null);
  for (const key of ['pack', 'package:win', 'package:mac', 'package:linux']) assert.match(pkg.scripts[key], /--publish never/);
  assert.deepEqual(pkg.build.files, ['main.cjs', 'security.cjs', 'game/**/*', 'package.json']);
});
test('main process wires a sandboxed persistent window and denies privileged actions', async () => {
  const { runInNewContext } = await import('node:vm');
  const events = new Map(); const windowEvents = new Map(); const contentEvents = new Map();
  const callbacks = {}; const windows = [];
  const gameSession = {
    setPermissionRequestHandler: fn => callbacks.permission = fn,
    setPermissionCheckHandler: fn => callbacks.permissionCheck = fn,
    on: (name, fn) => events.set(name, fn),
    webRequest: { onBeforeRequest: fn => callbacks.request = fn },
    protocol: { handle: async (scheme, fn) => { assert.equal(scheme, 'ironroot'); callbacks.protocol = fn; } },
    flushStorageData() {}
  };
  class FakeWindow {
    constructor(options) { this.options = options; windows.push(this); this.webContents = { setWindowOpenHandler: fn => callbacks.open = fn, on: (name, fn) => contentEvents.set(name, fn) }; }
    once(name, fn) { windowEvents.set(name, fn); }
    on(name, fn) { windowEvents.set(name, fn); }
    loadURL(url) { this.url = url; return Promise.resolve(); }
    show() {} static getAllWindows() { return windows; }
  }
  const electron = {
    app: { setName() {}, requestSingleInstanceLock: () => true, on: (name, fn) => events.set(name, fn), whenReady: () => Promise.resolve(), isPackaged: true, quit() {} },
    BrowserWindow: FakeWindow,
    Menu: { setApplicationMenu() {}, buildFromTemplate: value => value },
    protocol: { registerSchemesAsPrivileged: schemes => { assert.equal(schemes[0].privileges.allowServiceWorkers, undefined); assert.equal(schemes[0].privileges.bypassCSP, undefined); } },
    session: { fromPartition: partition => { assert.equal(partition, 'persist:ironroot-frontier'); return gameSession; } },
    dialog: { showErrorBox: (_title, message) => assert.fail(message) }
  };
  runInNewContext(await readFile(new URL('../desktop/main.cjs', import.meta.url), 'utf8'), {
    require: name => name === 'electron' ? electron : name === './security.cjs' ? require('../desktop/security.cjs') : require(name),
    __dirname: path.resolve('desktop'), process: { platform: 'linux' }, Response
  });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(windows.length, 1);
  assert.equal(windows[0].url, 'ironroot://game/index.html');
  const prefs = windows[0].options.webPreferences;
  assert.equal(prefs.session, gameSession); assert.equal(prefs.sandbox, true);
  assert.equal(prefs.nodeIntegration, false); assert.equal(prefs.contextIsolation, true); assert.equal(prefs.devTools, false);
  assert.equal(callbacks.open().action, 'deny'); assert.equal(callbacks.permissionCheck(), false);
  callbacks.permission(null, 'media', allowed => assert.equal(allowed, false));
  callbacks.request({ url: 'https://example.com/' }, result => assert.equal(result.cancel, true));
  callbacks.request({ url: 'ironroot://game/app.js' }, result => assert.equal(result.cancel, false));
  for (const name of ['will-navigate', 'will-frame-navigate', 'will-attach-webview']) {
    let blocked = false; contentEvents.get(name)({ preventDefault: () => blocked = true }); assert.equal(blocked, true);
  }
  let blocked = false; events.get('will-download')({ preventDefault: () => blocked = true }); assert.equal(blocked, true);
  assert.equal((await callbacks.protocol({ method: 'POST', url: 'ironroot://game/index.html' })).status, 405);
});
