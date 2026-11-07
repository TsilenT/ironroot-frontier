/** Exact ea9da128e1a2d9902dc3261c045dd8ec1c1f9010 protocol-7 source.
 * Reuse the existing pinned v0.17 module plus its complete three-line change,
 * rather than storing another full runtime fixture. Hash before execution.
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
const base = readFileSync(new URL('./profile-session-v017.js', import.meta.url), 'utf8');
assert.equal(createHash('sha256').update(base).digest('hex'), '980297cd20ab3ca653d132c1acb71bd7c793bed482bbaba05b53d078acbd45d0');
export const protocolSevenSource = base
  .replace('CURRENT_PROFILE_PROTOCOL_VERSION = 6;', 'CURRENT_PROFILE_PROTOCOL_VERSION = 7;')
  .replace('protocol 6 fences automatic adjacent-road flyers and campaign revision 4.', 'protocol 6 fences automatic adjacent-road flyers and campaign revision 4; protocol 7 fences keyboard preferences from clients that reconstruct only the older fields.')
  .replace('[1, 2, 3, 4, 5, 6].includes(requiredProtocolVersion)', '[1, 2, 3, 4, 5, 6, 7].includes(requiredProtocolVersion)')
  .replace('version 1, 2, 3, 4, 5 or 6.', 'version 1, 2, 3, 4, 5, 6 or 7.');
export const protocolSevenHash = '7abfee0165c5276f69e6c2fcea168805cddf179793621163f9b75520674c574e';
assert.equal(createHash('sha256').update(protocolSevenSource).digest('hex'), protocolSevenHash);
export const protocolSeven = await import('data:text/javascript;base64,' + Buffer.from(protocolSevenSource).toString('base64'));
