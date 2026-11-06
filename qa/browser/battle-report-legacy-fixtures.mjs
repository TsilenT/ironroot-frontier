// Exact frozen QA baseline, not production/release provenance. Never edit files.
import {readFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
export const REPORT_LEGACY_ROOT=new URL('./fixtures/0.10.0-qa-baseline-dist/',import.meta.url);
export const REPORT_LEGACY_PATH='/__qa_legacy/0.10.0/';
export async function validateBattleReportLegacyFixture(){
  const manifest=JSON.parse(await readFile(new URL('./fixtures/0.10.0-qa-baseline-sha256.json',import.meta.url),'utf8'));
  assert.equal(manifest.version,'0.10.0');assert.equal(Object.keys(manifest.files).length,26);
  assert.deepEqual((await readdir(REPORT_LEGACY_ROOT)).sort(),Object.keys(manifest.files).sort());
  for(const [name,hash] of Object.entries(manifest.files))assert.equal(createHash('sha256').update(await readFile(new URL(name,REPORT_LEGACY_ROOT))).digest('hex'),hash,'frozen QA baseline '+name);
  const old=await import(new URL('engine.js',REPORT_LEGACY_ROOT)),current=await import('../../dist/engine.js');
  const game=new old.Game({seed:1010,ai:false,mapId:'twin-span'});assert.equal(game.build('archery',550,340).ok,true);game.update(.1);
  const saved=game.serialize(),restored=current.Game.restore(saved);
  assert.deepEqual(restored.serialize(),saved,'actual old engine save remains exactly restorable');
  return manifest;
}
