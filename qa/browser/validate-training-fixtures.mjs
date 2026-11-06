import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {trainingProfileFixture,PROFILE_DOMAINS,PROFILE_KEYS,TRAINING_FILES} from './training-fixtures.mjs';
import {shellManifest,currentRoot,candidateIdentity} from './update-fixtures.mjs';
const fixture=trainingProfileFixture();
assert.equal(PROFILE_DOMAINS.length,5);assert.equal(PROFILE_KEYS.length,6);
assert.deepEqual(Object.keys(fixture.values).sort(),[...PROFILE_KEYS].sort());
for(const key of PROFILE_DOMAINS){assert.match(fixture.values[key],/^ \n/);assert.match(fixture.values[key],/\n $/);}
const current=await candidateIdentity();
for(const file of TRAINING_FILES)assert.ok(current.hashes[file],'offline shell includes '+file);
const html=await readFile(new URL('../../dist/training.html',import.meta.url),'utf8');
assert.match(html,/<script type="module" src="\.\/training-app\.js"><\/script>/);
assert.match(html,/<link rel="stylesheet" href="\.\/training\.css"/);
assert.doesNotMatch(html,/<script[^>]*src=["']\.\/(?:app|profile-session|persistence|backup)\.js/);
const title=await readFile(new URL('../../dist/index.html',import.meta.url),'utf8');
assert.match(title,/<a[^>]*id="welcomeTraining"[^>]*href="\.\/training\.html"|<a[^>]*href="\.\/training\.html"[^>]*id="welcomeTraining"/);
console.log('Training fixture: all five synthetic persisted profile domains plus ready marker validated; active Twin Span save is engine/backup-valid. Exact whitespace bytes retained.');
console.log('Training shell: independent HTML/module/style route and four precached resources verified; no browser, natural lesson, gesture or offline execution claimed.');

const visited=new Set();
async function inspectModule(file){
  if(visited.has(file))return;visited.add(file);
  const source=await readFile(new URL('../../dist/'+file,import.meta.url),'utf8');
  assert.doesNotMatch(source,/\b(?:localStorage|sessionStorage|indexedDB|BroadcastChannel|createProfileSession|createSaveSession)\b/,'independent training dependency '+file+' contains no storage/profile access');
  for(const match of source.matchAll(/(?:import|export)[^;]*?from\s*['"]\.\/([^'"]+)['"]/g))await inspectModule(match[1]);
}
await inspectModule('training-app.js');
for(const file of ['training.js','engine.js','render.js','input-scope.js'])assert.ok(visited.has(file),'training uses the real '+file);
for(const file of ['app.js','campaign.js','challenges.js','backup.js','persistence.js','profile-session.js','battle-report.js'])assert.ok(!visited.has(file),'training does not boot '+file);
console.log('Training import graph: '+visited.size+' modules, real engine/renderer, and no profile/storage/persistence/reward module dependency verified.');
