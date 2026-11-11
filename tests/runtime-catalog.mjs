import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {inspectRuntime} from '../scripts/verify-runtime.mjs';

const released=JSON.parse(readFileSync(new URL('./fixtures/runtime-v039-paths.json',import.meta.url)));
const additions=['citadel-spec.js','colossus-spec.js','colossus.js','final-chapter-identities.js','final-chapter-view.js','final-chapter.js','building-upgrade-view.js','reward-feedback.css'];
export const currentRuntimeFiles=()=>{
  assert.equal(released.commit,'d27e45c296875bc74735698a02e033e11e7ff57c');
  assert.equal(released.tree,'cc06854d38b1fad083ef7aed4f514db31d9c8820');
  assert.equal(released.files.length,61);
  const current=inspectRuntime(new URL('../dist/',import.meta.url).pathname);
  assert.deepEqual(Object.keys(current.files),[...released.files,...additions].sort(),'released runtime paths plus six final-chapter modules, the building upgrade view and reward stylesheet');
  return current;
};
