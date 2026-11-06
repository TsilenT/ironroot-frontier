// Source contracts for two confirmed harness faults, not browser execution.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');
test('history regression targets Recent battles rather than the shared disclosure styling',()=>{
  const html=read('dist/index.html'),source=read('qa/browser/maps.spec.mjs');
  const details=[...html.matchAll(/<details\b[^>]*>([\s\S]*?)<\/details>/g)].filter(([,body])=>body.includes('id="battleHistory"'));
  assert.equal(details.length,1);assert.match(details[0][1],/<summary>Recent battles<\/summary>/);
  assert.match(source,/press\(page,'details:has\(> #battleHistory\) > summary'\)/);
  assert.doesNotMatch(source,/\.history-details:not\(\.credits-details\):not\(\.backup-details\)/);
});
test('active-battle quota regression faults only later battle writes, not profile initialization',()=>{
  const source=read('qa/browser/regression.spec.mjs');
  const start=source.indexOf("test('failed save warns the player before leaving the active battle'");
  assert.ok(start>=0);const rest=source.slice(start),end=rest.indexOf('\ntest(',1),body=end<0?rest:rest.slice(0,end);
  assert.doesNotMatch(body,/addInitScript/);
  const began=body.indexOf('await start(page)'),advanced=body.indexOf("not.toHaveText('00:00')"),fault=body.indexOf('Storage.prototype.setItem=function');
  assert.ok(began>=0&&advanced>began&&fault>advanced,'startup and real elapsed battle time precede fault');
  assert.match(body,/this===localStorage&&name===key/);
  assert.match(body,/original\.call\(this,name,value\)/);
  assert.match(body,/__qaFailedBattleSaves\)\)\.toBeGreaterThanOrEqual\(2\)/);
  assert.match(body,/localStorage\.getItem\(key\),SAVE\)\)\.toBe\(before\)/);
  assert.match(body,/locator\('#welcome'\)\)\.toBeHidden/);
  assert.match(body,/press\(page,'#resume'\)/);
});
