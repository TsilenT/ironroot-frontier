import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';

const fixture=JSON.parse(readFileSync(new URL('./fixtures/final-chapter-engine-additions.json',import.meta.url)));
const sha=source=>createHash('sha256').update(source).digest('hex');

// Reverse only the twenty literal final-chapter hunks. Every current hunk
// must occur exactly once; the complete reconstructed engine must then match
// the released v0.39 bytes. Older oracles can continue stripping their own
// previously reviewed additions from that exact source.
export function engineBeforeFinalChapter(){
  assert.equal(fixture.releasedCommit,'d27e45c296875bc74735698a02e033e11e7ff57c');
  assert.equal(fixture.releasedEngineSha256,'c750484509dfaeb8d6e4179bd27abe0956208dc7a4c48eab24a2b6cf8515b092');
  assert.equal(fixture.changes.length,20);
  let source=readFileSync(new URL('../dist/engine.js',import.meta.url),'utf8');
  for(const {released,addition} of fixture.changes){
    assert.equal(source.split(addition).length-1,1,'exact final-chapter engine hunk: '+addition);
    source=source.replace(addition,released);
  }
  assert.equal(sha(source),fixture.releasedEngineSha256,'all released engine bytes outside exact final-chapter additions');
  return source;
}
