import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const read = (name) => readFileSync(join(root, name), 'utf8');
test('HTML has unique IDs and all static UI bindings exist', () => {
  const html = read('index.html'),
    app = read('app.js');
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);
  assert.equal(new Set(ids).size, ids.length, 'duplicate DOM IDs');
  const dynamic = new Set(['resumeSaved']);
  for (const [, id] of app.matchAll(/\$\('([^']+)'\)/g)) {
    if (id.endsWith('Hp') || id.endsWith('HpText')) continue;
    assert.ok(ids.includes(id) || dynamic.has(id), `missing #${id}`);
  }
});
test('local scripts, styles, icon and manifest references resolve', () => {
  const html = read('index.html');
  for (const [, path] of html.matchAll(/(?:src|href)="\.\/([^"#]*)"/g))
    if (path) assert.ok(existsSync(join(root, path)), `missing ${path}`);
  for (const file of ['app.js', 'render.js'])
    for (const [, path] of read(file).matchAll(/from\s+'\.\/([^']+)'/g))
      assert.ok(existsSync(join(root, path)), `missing import ${path}`);
});
test('offline shell is complete and deployment-relative', () => {
  const sw = read('service-worker.js'),
    manifest = JSON.parse(read('manifest.webmanifest'));
  const entries = [...sw.matchAll(/'\.\/([^']*)'/g)].map((m) => m[1]);
  for (const name of entries)
    if (name) assert.ok(existsSync(join(root, name)), `missing cached ${name}`);
  assert.equal(manifest.start_url, './');
  assert.equal(manifest.scope, './');
  assert.equal(manifest.display, 'standalone');
  assert.ok(manifest.icons.length);
  assert.match(sw, /request\.method\s*!==\s*'GET'/);
  assert.match(sw, /url\.origin\s*!==\s*self\.location\.origin/);
});
test('critical dialogs and battlefield expose accessible descriptions', () => {
  const html = read('index.html');
  assert.equal([...html.matchAll(/role="dialog"/g)].length, 8);
  assert.equal([...html.matchAll(/aria-modal="true"/g)].length, 8);
  assert.match(html, /aria-labelledby="viewportTitle" aria-describedby="viewportReason"/);
  assert.match(html, /<canvas\s+id="battle"[^>]+aria-label=/);
  assert.match(html, /id="toast"[^>]+role="status"/);
  assert.match(read('app.js'), /document\.querySelector\('\.app'\)\.inert/);
});

test('portable backup controls require a preview and explicit replacement action', () => {
  const html = read('index.html'),
    app = read('app.js');
  for (const id of [
    'backupModal',
    'backupSummary',
    'confirmImport',
    'cancelImport',
    'backupImportStatus',
    'backupStatus',
    'backupIncludeBattle',
    'backupFile',
  ])
    assert.match(html, new RegExp(`id="${id}"`));
  assert.match(html, /Replace local saves/);
  assert.match(html, /type="file"/);
  assert.match(
    app,
    /restoreBackup\(profileSession\.importStorage, pendingBackupText\)/,
  );
  assert.match(app, /createBackup\(localStorage, options\)/);
  assert.match(
    app,
    /allowProfileReload = true;[\s\S]*?started = false;[\s\S]*?progressDirty = false;[\s\S]*?location\.reload\(\)/,
  );
});

test('controller uses the shared legal placement path and runtime assets are cached', () => {
  const app = read('app.js'),
    sw = read('service-worker.js');
  assert.match(app, /function activateBattlePoint\(w\)/);
  assert.match(app, /activateBattlePoint\(ui\.pointer\)/);
  assert.match(app, /activateBattlePoint\(w\)/);
  for (const file of ['backup.js', 'controller.js'])
    assert.ok(sw.includes(`'./${file}'`));
  assert.match(read('index.html'), /id="controllerHelp"/);
});

test('field reference uses original portraits, engine-derived data and cached assets', () => {
  const html = read('index.html'),
    app = read('app.js'),
    sw = read('service-worker.js');
  for (const id of [
    'rosterGuide',
    'rosterGuideToggle',
    'unitCodex',
    'structureCodex',
    'economyCodex',
    'codexScope',
    'codexCaveat',
  ])
    assert.match(html, new RegExp(`id="${id}"`));
  assert.match(app, /UNIT_CODEX,?\s*STRUCTURE_CODEX/);
  assert.match(app, /drawUnitPortrait\(canvas, canvas.dataset.portrait, 0, context\)/);
  assert.match(app, /data-codex-unit/);
  assert.ok(sw.includes("'./codex.js'"));
});

test('browser release metadata and offline cache versions remain aligned', () => {
  const pkg = JSON.parse(
    readFileSync(join(root, '..', 'package.json'), 'utf8'),
  );
  assert.ok(read('service-worker.js').includes(`ironroot-v${pkg.version}`));
  assert.ok(
    read('index.html').includes(
      `v${pkg.version.split('.').slice(0, 2).join('.')}`,
    ),
  );
});
