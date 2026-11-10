/** Historical PR52 source oracles; current control behavior runs once in
 * private-control-polish.test.mjs. No browser, graphics or audio output. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {engineBeforeFinalChapter} from './final-chapter-engine-source.mjs';
import {audioBeforeEnginePresentation} from './final-chapter-audio-source.mjs';
import {CURRENT_PROFILE_PROTOCOL_VERSION as releasedProtocol} from './fixtures/profile-session-v039.js';

test('released PR52 engine/audio/protocol30 retain their literal historical source oracles', () => {
  // Released abfcf6f uses the same three blobs as d27e45c. Keep the incoming
  // literal hashes: exact-hunk reversals prove preservation across Chapter10,
  // while the actual released writer remains the compatibility fixture.
  const sources = [
    ['engine.js', engineBeforeFinalChapter(), 'c750484509dfaeb8d6e4179bd27abe0956208dc7a4c48eab24a2b6cf8515b092'],
    ['audio.js', audioBeforeEnginePresentation(), '7e5921c056ab468b5de8c97cee1b5b930ef2e501136eb08cb715822f3c7b782a'],
    ['profile-session.js', readFileSync(new URL('./fixtures/profile-session-v039.js', import.meta.url)), 'edcb542e6035ff87e8786922c10396cd29f624ee09c6033f2dccb8b3059f8e42'],
  ];
  for (const [name, source, expected] of sources) {
    assert.equal(createHash('sha256').update(source).digest('hex'), expected, 'released PR52 ' + name);
  }
  assert.equal(releasedProtocol, 30);
});
