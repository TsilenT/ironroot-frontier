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
test('desktop backup export fails honestly before creating any download side effect', async () => {
  const { runInNewContext } = await import('node:vm');
  const appSource = await readFile(new URL('../dist/app.js', import.meta.url), 'utf8');
  const downloadFunction = appSource.match(/^function downloadBackup\(text, suffix = ''\) \{[\s\S]*?^\}/m)?.[0];
  assert.ok(downloadFunction, 'Test must exercise the current application export function.');
  for (const suffix of ['', '-retained-session']) {
    const forbidden = () => assert.fail('Desktop export must stop before any blob, DOM or timer side effect.');
    assert.throws(() => runInNewContext(`${downloadFunction}\ndownloadBackup('{}', ${JSON.stringify(suffix)});`, {
      location: { protocol: 'ironroot:' },
      URL: { createObjectURL: forbidden, revokeObjectURL: forbidden },
      Blob: forbidden,
      document: { createElement: forbidden, body: { append: forbidden } },
      setTimeout: forbidden
    }), /File export is not yet enabled in the desktop shell/);
  }
});
test('desktop isolation and package safety contracts remain explicit', async () => {
  const main = await readFile(new URL('../desktop/main.cjs', import.meta.url), 'utf8');
  for (const contract of ['nodeIntegration: false', 'contextIsolation: true', 'sandbox: true', 'webSecurity: true', 'webviewTag: false', "action: 'deny'", "persist:ironroot-frontier", 'setPermissionRequestHandler', "will-download", 'requestSingleInstanceLock']) assert.ok(main.includes(contract), contract);
  const pkg = JSON.parse(await readFile(new URL('../desktop/package.json', import.meta.url), 'utf8'));
  const browserPkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
  const lock = JSON.parse(await readFile(new URL('../desktop/package-lock.json', import.meta.url), 'utf8'));
  assert.equal(pkg.version, browserPkg.version); assert.equal(pkg.private, true); assert.equal(pkg.build.publish, null);
  assert.equal(pkg.engines.node, '>=22.12.0');
  assert.equal(lock.version, pkg.version); assert.equal(lock.packages[''].version, pkg.version);
  assert.deepEqual(lock.packages[''].engines, pkg.engines);
  assert.deepEqual(lock.packages[''].devDependencies, pkg.devDependencies);
  for (const key of ['pack', 'package:win', 'package:mac', 'package:linux']) assert.match(pkg.scripts[key], /--publish never/);
  assert.deepEqual(pkg.build.files, ['main.cjs', 'security.cjs', 'game/**/*', 'package.json']);
});
test('installed desktop tooling preserves the scoped minimatch compatibility contracts', async t => {
  const desktopRequire = createRequire(new URL('../desktop/package.json', import.meta.url));
  let builderPackage;
  try { builderPackage = desktopRequire.resolve('app-builder-lib/package.json'); }
  catch (error) {
    if (error.code !== 'MODULE_NOT_FOUND') throw error;
    t.skip('Optional desktop build dependencies are not installed; run npm ci in desktop/ to include this check.');
    return;
  }
  const pkg = JSON.parse(await readFile(new URL('../desktop/package.json', import.meta.url), 'utf8'));
  assert.deepEqual(pkg.overrides, {
    'app-builder-lib@26.18.1': { 'minimatch@10.2.6': '11.0.5' },
    '@electron/universal@2.0.3': { 'minimatch@9.0.9': '11.0.5' }
  });
  const builderRequire = createRequire(builderPackage);
  const universalRequire = createRequire(builderRequire.resolve('@electron/universal/package.json'));
  for (const scopedRequire of [builderRequire, universalRequire]) {
    assert.equal(scopedRequire('minimatch/package.json').version, '11.0.5');
    const { Minimatch, minimatch } = scopedRequire('minimatch');
    // Builder reads set/negate and calls match(path, partial). Universal uses matchBase.
    const glob = new Minimatch('game/**/*', { dot: true });
    assert.ok(Array.isArray(glob.set)); assert.equal(glob.negate, false);
    assert.equal(glob.match('game', true), true);
    assert.equal(glob.match('game/deep/map.json'), true);
    assert.equal(glob.match('game/.hidden'), true);
    assert.equal(glob.match('node_modules/electron/index.js'), false);
    assert.equal(new Minimatch('!**/*.map').negate, true);
    assert.equal(minimatch('Contents/Resources/native/addon.node', '*.node', { matchBase: true }), true);
    assert.equal(minimatch('Contents/Info.plist', 'Info.plist', { matchBase: true }), true);
    assert.equal(minimatch('Contents/Info.plist.bak', 'Info.plist', { matchBase: true }), false);
  }
  // Exercise the real builder wrapper rather than only reproducing its matcher calls.
  const { FileMatcher } = builderRequire('./out/fileMatcher.js');
  const fixtureRoot = path.join(tmpdir(), 'ironroot-package-matcher');
  const matcher = new FileMatcher(fixtureRoot, path.join(fixtureRoot, 'output'), value => value, pkg.build.files).createFilter();
  const regularFile = { isDirectory: () => false };
  for (const filename of ['main.cjs', 'security.cjs', 'package.json', 'game/index.html', 'game/app.js', 'game/deep/asset.json']) {
    assert.equal(matcher(path.join(fixtureRoot, filename), regularFile), true, filename);
  }
  for (const filename of ['package-lock.json', 'scripts/stage.mjs', 'node_modules/electron/index.js', 'release/app.asar']) {
    assert.equal(matcher(path.join(fixtureRoot, filename), regularFile), false, filename);
  }
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
  for (const url of [
    'https://example.com/', 'http://localhost/backup.json', 'file:///tmp/backup.json',
    'data:application/json,%7B%7D', 'javascript:alert(1)',
    'blob:ironroot://game/12345678-1234-1234-1234-123456789abc',
    'blob:https://example.com/12345678-1234-1234-1234-123456789abc',
    'ironroot://game.evil/backup.json', 'ironroot://evil@game/backup.json', 'ironroot://game:80/backup.json'
  ]) callbacks.request({ url }, result => assert.equal(result.cancel, true, url));
  callbacks.request({ url: 'ironroot://game/app.js' }, result => assert.equal(result.cancel, false));
  for (const name of ['will-navigate', 'will-frame-navigate', 'will-attach-webview']) {
    let blocked = false; contentEvents.get(name)({ preventDefault: () => blocked = true }); assert.equal(blocked, true);
  }
  const downloads = [
    { url: 'blob:ironroot://game/12345678-1234-1234-1234-123456789abc', name: 'ironroot-backup-2026-11-06.json', mime: 'application/json', bytes: 512 },
    { url: 'blob:ironroot://game/12345678-1234-1234-1234-123456789abc', name: 'ironroot-retained-session-backup-2026-11-06.json', mime: 'application/json', bytes: 512 },
    { url: 'ironroot://game/backup.json', name: 'ironroot-backup-2026-11-06.json', mime: 'application/json', bytes: 512 },
    { url: 'https://example.com/backup.json', name: 'ironroot-backup-2026-11-06.json', mime: 'application/json', bytes: 512 },
    { url: 'blob:null/forged', name: 'ironroot-backup-2026-11-06.json', mime: 'application/json', bytes: 512 },
    { url: 'data:application/json,%7B%7D', name: '../backup.json', mime: 'application/json', bytes: 2 },
    { url: 'file:///tmp/backup.json', name: 'backup.json.exe', mime: 'application/octet-stream', bytes: 512 },
    ...[0, -1, Infinity, NaN, 1024 * 1024 + 1].map(bytes => ({ url: 'blob:ironroot://game/forged', name: 'ironroot-backup-2026-11-06.json', mime: 'application/json', bytes }))
  ];
  for (const candidate of downloads) {
    let blocked = false;
    const item = {
      getURL: () => candidate.url, getURLChain: () => [candidate.url],
      getFilename: () => candidate.name, getMimeType: () => candidate.mime, getTotalBytes: () => candidate.bytes,
      setSavePath: () => assert.fail('No download may choose a filesystem destination.'),
      setSaveDialogOptions: () => assert.fail('No download capability is enabled in this iteration.')
    };
    events.get('will-download')({ preventDefault: () => blocked = true }, item, windows[0].webContents);
    assert.equal(blocked, true, JSON.stringify(candidate));
  }
  // Missing or malformed event metadata cannot bypass the unconditional policy.
  for (const contents of [undefined, {}, { getURL: () => 'https://example.com/' }]) {
    let blocked = false;
    const unreadableItem = new Proxy({}, { get: () => assert.fail('Denying a download must not depend on trusting its metadata.') });
    events.get('will-download')({ preventDefault: () => blocked = true }, unreadableItem, contents);
    assert.equal(blocked, true);
  }
  assert.equal((await callbacks.protocol({ method: 'POST', url: 'ironroot://game/index.html' })).status, 405);
});
