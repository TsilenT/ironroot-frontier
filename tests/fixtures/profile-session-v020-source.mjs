/** Exact released cd63f7c543b7c8425dc304105e229ff09d01e043 protocol-10 writer. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {protocolNineSource} from './profile-session-v019-source.mjs';
export const protocolTenSource = protocolNineSource
  .replace('CURRENT_PROFILE_PROTOCOL_VERSION = 9;', 'CURRENT_PROFILE_PROTOCOL_VERSION = 10;')
  .replace('protocol 9 fences the optional Skirmish bridge preference and result identities from older writers.', 'protocol 9 fences the optional Skirmish bridge preference and result identities from older writers; protocol 10 fences citadel campaign, field-trial and Skirmish result identities from older writers.')
  .replace('[1, 2, 3, 4, 5, 6, 7, 8, 9].includes(requiredProtocolVersion)', '[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].includes(requiredProtocolVersion)')
  .replace('version 1, 2, 3, 4, 5, 6, 7, 8 or 9.', 'version 1, 2, 3, 4, 5, 6, 7, 8, 9 or 10.');
export const protocolTenHash = 'd081875a2702d641a924ef3eaa4c597e4d3068c2dd6370b5f924a3047ed4bbd8';
assert.equal(createHash('sha256').update(protocolTenSource).digest('hex'), protocolTenHash);
export const protocolTen = await import('data:text/javascript;base64,' + Buffer.from(protocolTenSource).toString('base64'));
