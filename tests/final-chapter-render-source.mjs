import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';

const fixture=JSON.parse(readFileSync(new URL('./fixtures/final-chapter-render-additions.json',import.meta.url)));
// Keep old render-source oracles literal by reversing only the exact boss
// drawing, culling and minimap additions. An unlisted edit fails the full hash.
export function rendererBeforeFinalChapter(){
  assert.equal(fixture.releasedCommit,'d27e45c296875bc74735698a02e033e11e7ff57c');
  assert.equal(fixture.releasedRenderSha256,'401a2ba9c96811d7deffdb1cb4a0440cd064a597665be7e74a7ce149d0d78d32');
  assert.equal(fixture.changes.length,5);
  let source=readFileSync(new URL('../dist/render.js',import.meta.url),'utf8');
  for(const {released,addition} of fixture.changes){
    assert.equal(source.split(addition).length-1,1,'exact final-chapter renderer hunk: '+addition);
    source=source.replace(addition,released);
  }
  assert.equal(createHash('sha256').update(source).digest('hex'),fixture.releasedRenderSha256);
  return source;
}
