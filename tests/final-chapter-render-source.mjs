import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {rendererBeforeLocomotion} from './locomotion-render-source.mjs';

const fixture=JSON.parse(readFileSync(new URL('./fixtures/final-chapter-render-additions.json',import.meta.url)));
// Keep old render-source oracles literal by reversing only the exact boss
// drawing, culling and minimap additions. An unlisted edit fails the full hash.
export function rendererBeforeObliqueArt(){
  const art=JSON.parse(readFileSync(new URL('./fixtures/colossus-oblique-art.json',import.meta.url)));
  assert.equal(art.parentCommit,'7fd109477e882bec3fd81f164779c470968ac3c0');
  let source=rendererBeforeLocomotion();
  assert.equal(source.split(art.addition).length-1,1,'exact declared oblique-art method');
  const hunk=fixture.changes.find(c=>c.addition.includes('  drawColossus(')).addition;
  const old=hunk.slice(hunk.indexOf('  drawColossus('),hunk.indexOf('  drawUnit('));
  source=source.replace(art.addition,old);
  assert.equal(createHash('sha256').update(source).digest('hex'),art.parentRenderSha256,'all other actual7fd1094 renderer bytes');
  return source;
}
export function rendererBeforeFinalChapter(){
  assert.equal(fixture.releasedCommit,'d27e45c296875bc74735698a02e033e11e7ff57c');
  assert.equal(fixture.releasedRenderSha256,'401a2ba9c96811d7deffdb1cb4a0440cd064a597665be7e74a7ce149d0d78d32');
  assert.equal(fixture.changes.length,5);
  let source=rendererBeforeObliqueArt();
  for(const {released,addition} of fixture.changes){
    assert.equal(source.split(addition).length-1,1,'exact final-chapter renderer hunk: '+addition);
    source=source.replace(addition,released);
  }
  assert.equal(createHash('sha256').update(source).digest('hex'),fixture.releasedRenderSha256);
  return source;
}
