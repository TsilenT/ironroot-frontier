import {validateLegacyProfileFixture} from './legacy-profile-fixtures.mjs';
await validateLegacyProfileFixture();
console.log('Frozen 0.9 QA baseline: 24 exact runtime SHA-256 hashes; unchanged first 12 mission rules; real protocol-1 rejects version-2 marker. Not a production release fixture.');
