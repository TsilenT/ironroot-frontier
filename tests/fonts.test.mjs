import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const read = (name) =>
  readFileSync(new URL('../dist/' + name, import.meta.url));
const manifest = JSON.parse(
  readFileSync(new URL('./fixtures/font-assets.json', import.meta.url), 'utf8'),
);
test('bundled font and notice bytes exactly match verified official-source artifacts', () => {
  for (const asset of manifest.files) {
    const data = read(asset.file);
    assert.equal(data.length, asset.bytes, asset.file);
    assert.equal(
      createHash('sha256').update(data).digest('hex'),
      asset.sha256,
      asset.file,
    );
    if (asset.file.endsWith('.woff2')) {
      assert.equal(data.subarray(0, 4).toString(), 'wOF2');
      assert.equal(data.readUInt32BE(8), data.length);
    }
  }
});
test('all five local faces and complete notices are cached without a font-service import', () => {
  const css = read('styles.css').toString(),
    sw = read('service-worker.js').toString();
  assert.doesNotMatch(css, /@import\s+(?:url|['"])/);
  assert.doesNotMatch(css, /https:\/\/fonts\.(?:googleapis|gstatic)/);
  assert.equal((css.match(/@font-face\s*\{/g) || []).length, 5);
  for (const asset of manifest.files) {
    assert.ok(sw.includes(`'./${asset.file}'`));
    if (asset.file.endsWith('.woff2'))
      assert.ok(css.includes(`'./${asset.file}'`));
  }
  assert.match(css, /font-weight:\s*400 700/);
});
test('complete licensed font notices are readable in game without external navigation', () => {
  const html = read('index.html').toString();
  assert.match(html, /id="creditsDetails"/);
  assert.match(html, /id="fontLicenseText"/);
  const pre = html.match(
    /<pre[^>]*id="fontLicenseText"[^>]*>([\s\S]*?)<\/pre\s*>/,
  )?.[1];
  assert.ok(pre);
  const decoded = pre
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&amp;/g, '&');
  assert.equal(
    decoded.replace(/\r\n/g, '\n').trim(),
    read('FONTS-NOTICES.txt').toString().replace(/\r\n/g, '\n').trim(),
  );
  assert.match(decoded, /Copyright 2017 The Barlow Project Authors/);
  assert.match(decoded, /Copyright 2014 The DM Sans Project Authors/);
  assert.ok(
    (decoded.match(/SIL OPEN FONT LICENSE Version 1\.1/g) || []).length >= 2,
  );
});
