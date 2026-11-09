import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';

const manifestBytes = readFileSync(new URL('../qa/hammer-prototype/history/salt-profile22-closure.json', import.meta.url));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
assert.equal(hash(manifestBytes), '9d6907f8b40caef319d8956363e508951e1764273aea0adaac11d6bf04c7ba65');
const manifest = JSON.parse(manifestBytes);
const root = new URL('../qa/hammer-prototype/history/'+manifest.directory+'/', import.meta.url);
test('unchanged Salt22 profile source/hash/catalog assertions retain their exact minimal historical dependency closure', () => {
  assert.equal(Object.keys(manifest.files).length, 25);
  for (const [path, expected] of Object.entries(manifest.files)) assert.equal(hash(readFileSync(new URL(path, root))), expected, path);
  assert.equal(manifest.files['tests/salt-stores-profile.test.mjs'], '0344228125b32d7f3cc467247fb7fb134353f40d819ffddf0bad60599115b36a');
});
await import(new URL('tests/salt-stores-profile.test.mjs', root));
