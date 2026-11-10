/** Preserve the actual historical PCM source; no new audio output is produced. */
import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';
const fixture=JSON.parse(readFileSync(new URL('./fixtures/final-chapter-audio-additions.json',import.meta.url)));
export function audioBeforeEnginePresentation(){
 assert.equal(fixture.releasedCommit,'d27e45c296875bc74735698a02e033e11e7ff57c');assert.equal(fixture.releasedAudioSha256,'7e5921c056ab468b5de8c97cee1b5b930ef2e501136eb08cb715822f3c7b782a');
 assert.equal(fixture.changes.length,10);
 let source=readFileSync(new URL('../dist/audio.js',import.meta.url),'utf8');for(const {released,addition}of fixture.changes){assert.equal(source.split(addition).length-1,1,'exact Engine audio presentation hunk');source=source.replace(addition,released);}
 assert.equal(createHash('sha256').update(source).digest('hex'),fixture.releasedAudioSha256,'all released audio bytes outside the exact new presentation additions');return source;
}
