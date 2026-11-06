/** Historical source oracles only. Current legacy behavior is checked by executable parity suites. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
export const FROZEN_ENGINE_SHA256 = 'e47a168c099c2a4e1f45b238d5224cb44a02433a7cff06adbfb87095c4d56bc7';
export const ORIGINAL_ENUM_GUARD = "if(!Object.hasOwn(types,e.type))";
export const HARDENED_ENUM_GUARD = "if(typeof e.type!=='string'||!Object.hasOwn(types,e.type))";
export function assertHistoricalEngineExceptEnumValidation(bytes) {
  const source = String(bytes);
  assert.equal(source.split(HARDENED_ENUM_GUARD).length - 1, 1, 'exactly one primitive-string save guard is required');
  assert.equal(source.includes(ORIGINAL_ENUM_GUARD), false, 'the coercing save guard must not remain');
  const frozen = source.replace(HARDENED_ENUM_GUARD, ORIGINAL_ENUM_GUARD);
  assert.equal(createHash('sha256').update(frozen).digest('hex'), FROZEN_ENGINE_SHA256,
    'all engine bytes outside the single save-type guard must match the original frozen oracle');
  return frozen;
}

export function readHistoricalProduction(file = 'engine.js') {
  const root = new URL('../qa/fixtures/production-v012/', import.meta.url);
  const manifestBytes = readFileSync(new URL('historical-manifest.json', root));
  assert.equal(createHash('sha256').update(manifestBytes).digest('hex'), '1bfa09e053e363e0589a8a96180be04cc4821b0b644b5b5923de66b83b6f6ff7', 'immutable production manifest');
  const manifest = JSON.parse(manifestBytes);
  assert.ok(Object.hasOwn(manifest.files, file), 'historical runtime file is inventoried');
  const bytes = readFileSync(new URL('dist/' + file, root));
  assert.equal(createHash('sha256').update(bytes).digest('hex'), manifest.files[file], file + ' historical production bytes');
  return bytes;
}
export function assertHistoricalEngineOracle() {
  return assertHistoricalEngineExceptEnumValidation(readHistoricalProduction());
}
