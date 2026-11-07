/** Exact verified 495cf2563f8b9f06723e27e06ae77dcdc5d9b2ca protocol-8 source. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {protocolSevenSource} from './profile-session-v0172-source.mjs';
export const protocolEightSource = protocolSevenSource
  .replace('CURRENT_PROFILE_PROTOCOL_VERSION = 7;', 'CURRENT_PROFILE_PROTOCOL_VERSION = 8;')
  .replace('protocol 7 fences keyboard preferences from clients that reconstruct only the older fields.', 'protocol 7 fences keyboard preferences from clients that reconstruct only the older fields; protocol 8 fences the expanded field-trial catalog from clients that discard unknown records.')
  .replace('[1, 2, 3, 4, 5, 6, 7].includes(requiredProtocolVersion)', '[1, 2, 3, 4, 5, 6, 7, 8].includes(requiredProtocolVersion)')
  .replace('version 1, 2, 3, 4, 5, 6 or 7.', 'version 1, 2, 3, 4, 5, 6, 7 or 8.');
export const protocolEightHash = 'dfab0369f5beefc742bed294c2172bc70128f8c1c49e7cbbb24890d81c75f8e3';
assert.equal(createHash('sha256').update(protocolEightSource).digest('hex'), protocolEightHash);
export const protocolEight = await import('data:text/javascript;base64,' + Buffer.from(protocolEightSource).toString('base64'));
