import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {trainingProfileFixture,PROFILE_DOMAINS,PROFILE_KEYS,PROFILE_MARKER,TRAINING_FILES} from './training-fixtures.mjs';
import {createProfileSession,CURRENT_PROFILE_PROTOCOL_VERSION} from '../../dist/profile-session.js';
import {shellManifest,currentRoot,candidateIdentity} from './update-fixtures.mjs';
const fixture=trainingProfileFixture();
assert.equal(PROFILE_DOMAINS.length,5);assert.equal(PROFILE_KEYS.length,6);
assert.deepEqual(Object.keys(fixture.values).sort(),[...PROFILE_KEYS].sort());
for(const key of PROFILE_DOMAINS){assert.match(fixture.values[key],/^ \n/);assert.match(fixture.values[key],/\n $/);}
assert.deepEqual(JSON.parse(fixture.values[PROFILE_MARKER]),{format:'ironroot-profile',version:CURRENT_PROFILE_PROTOCOL_VERSION,epoch:'qa-training-isolation',phase:'ready'});
const storage={getItem:key=>fixture.values[key]??null,
  setItem(){assert.fail('current ready-profile fixture must not need a startup migration');},
  removeItem(){assert.fail('current ready-profile startup must preserve every domain');}};
const session=createProfileSession(()=>storage,{requiredProtocolVersion:CURRENT_PROFILE_PROTOCOL_VERSION});
assert.equal(session.status().canWrite,true,'current profile is ready before any injected read/write failure');
for(const key of PROFILE_DOMAINS)assert.equal(session.storage.getItem(key),fixture.values[key],'profile facade preserves exact '+key+' bytes');
assert.equal(fixture.backup.data.battle.version,2,'legacy battle envelope is independent from profile protocol');
const current=await candidateIdentity();
for(const file of TRAINING_FILES)assert.ok(current.hashes[file],'offline shell includes '+file);
const html=await readFile(new URL('../../dist/training.html',import.meta.url),'utf8');
assert.match(html,/<script type="module" src="\.\/training-app\.js"><\/script>/);
assert.match(html,/<link rel="stylesheet" href="\.\/training\.css"/);
assert.doesNotMatch(html,/<script[^>]*src=["']\.\/(?:app|profile-session|persistence|backup)\.js/);
const title=await readFile(new URL('../../dist/index.html',import.meta.url),'utf8');
assert.match(title,/<a[^>]*id="welcomeTraining"[^>]*href="\.\/training\.html"|<a[^>]*href="\.\/training\.html"[^>]*id="welcomeTraining"/);
console.log('Training fixture: all five synthetic persisted profile domains plus ready protocol-'+CURRENT_PROFILE_PROTOCOL_VERSION+' marker validated without startup writes; active Twin Span legacy save is engine/backup-valid. Exact whitespace bytes retained.');
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
