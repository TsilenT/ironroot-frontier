import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
const root=new URL('../qa/campaign-evidence/',import.meta.url);
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
test('archived campaign evidence retains exact compressed bytes, source hashes and failed cases',()=>{
  const manifest=JSON.parse(readFileSync(new URL('manifest.json',root))),reports={};
  assert.deepEqual(readdirSync(root).filter(name=>name.endsWith('.gz')).sort(),Object.keys(manifest).sort());
  for(const [name,row] of Object.entries(manifest)){
    const zipped=readFileSync(new URL(name,root)),raw=gunzipSync(zipped);
    assert.equal(zipped.length,row.compressedBytes,name);assert.equal(digest(zipped),row.sha256,name);
    assert.equal(raw.length,row.uncompressedBytes,name);assert.equal(digest(raw),row.uncompressedSha256,name);
    const report=JSON.parse(raw);reports[name]=report;
    const engine=report.hashes?.engine||report.engineSha;
    // The authored summary reports retained a 12-character display hash; the
    // independent full traces retain all 64. Exact archive hashes pin both.
    assert.ok([12,64].includes(engine.length));
    assert.equal(engine,'e47a168c099c2a4e1f45b238d5224cb44a02433a7cff06adbfb87095c4d56bc7'.slice(0,engine.length));
  }
  const primary=reports['primary-matrix.json.gz'];assert.equal(primary.simulations,32);
  assert.ok(primary.results.some(row=>row.failed),'Failed primary-route policies remain evidence');
  const pilot=reports['primary-pilot1.json.gz'];assert.ok(pilot.results.some(row=>row.alternateCoreWin&&!row.primary),'Alternate victory is never reclassified as primary');
  for(const name of ['primary-positive.json.gz','primary-authored-positive.json.gz','primary-controls.json.gz'])
    for(const row of reports[name].results){assert.equal(row.primary,true);assert.equal(row.coreWin,false);assert.ok(row.enemyHP>0);}
});
