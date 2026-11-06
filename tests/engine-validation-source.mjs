/** Preserve the frozen engine oracle while permitting exactly one validation-only change. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
export const FROZEN_ENGINE_SHA256 = 'e47a168c099c2a4e1f45b238d5224cb44a02433a7cff06adbfb87095c4d56bc7';
export const ORIGINAL_ENUM_GUARD = "if(!Object.hasOwn(types,e.type))";
export const HARDENED_ENUM_GUARD = "if(typeof e.type!=='string'||!Object.hasOwn(types,e.type))";
export function assertFrozenEngineExceptEnumValidation(bytes) {
  const source = String(bytes);
  assert.equal(source.split(HARDENED_ENUM_GUARD).length - 1, 1, 'exactly one primitive-string save guard is required');
  assert.equal(source.includes(ORIGINAL_ENUM_GUARD), false, 'the coercing save guard must not remain');
  const frozen = source.replace(HARDENED_ENUM_GUARD, ORIGINAL_ENUM_GUARD);
  assert.equal(createHash('sha256').update(frozen).digest('hex'), FROZEN_ENGINE_SHA256,
    'all engine bytes outside the single save-type guard must match the original frozen oracle');
  return frozen;
}
