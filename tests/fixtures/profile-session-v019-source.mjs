/** Exact verified 5ec1f967a1c8c8f9861f68b8fef3cf99c4fa460d protocol-9 source. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {protocolEightSource} from './profile-session-v0181-source.mjs';
export const protocolNineSource = protocolEightSource
  .replace('CURRENT_PROFILE_PROTOCOL_VERSION = 8;', 'CURRENT_PROFILE_PROTOCOL_VERSION = 9;')
  .replace('protocol 8 fences the expanded field-trial catalog from clients that discard unknown records.', 'protocol 8 fences the expanded field-trial catalog from clients that discard unknown records; protocol 9 fences the optional Skirmish bridge preference and result identities from older writers.')
  .replace('[1, 2, 3, 4, 5, 6, 7, 8].includes(requiredProtocolVersion)', '[1, 2, 3, 4, 5, 6, 7, 8, 9].includes(requiredProtocolVersion)')
  .replace('version 1, 2, 3, 4, 5, 6, 7 or 8.', 'version 1, 2, 3, 4, 5, 6, 7, 8 or 9.');
export const protocolNineHash = 'e80a8f5620f4a3a36c537e6b5265f40b2c0f9d21284a3cdee339232d3abb7393';
assert.equal(createHash('sha256').update(protocolNineSource).digest('hex'), protocolNineHash);
export const protocolNine = await import('data:text/javascript;base64,' + Buffer.from(protocolNineSource).toString('base64'));
