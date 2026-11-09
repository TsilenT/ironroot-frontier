import test,{after}from'node:test';import assert from'node:assert/strict';import{readFileSync}from'node:fs';
import*as current from'../dist/engine.js';import{createBaselineRuntime}from'../qa/bram-forward/baseline-runtime.mjs';
const runtime=createBaselineRuntime();after(runtime.cleanup);const baseline=await import(runtime.engineURL.href);
const currentSource=readFileSync(new URL('../dist/engine.js',import.meta.url),'utf8');
test('Canonical exact-source parity closure is portable, minimal and fully hash verified',()=>{
 assert.equal(runtime.manifest.files.length,8);assert.deepEqual(runtime.manifest.files.filter(r=>r.source==='fixture').map(r=>r.path),['dist/engine.js','dist/rulesets.js']);assert.equal(runtime.manifest.files.filter(r=>r.source==='unchanged-current').length,6);
});
test('All previous descriptors and ordinary AI body/scheduling are unchanged',()=>{
 for(const[id,r]of Object.entries(baseline.RULESETS))assert.deepEqual(current.RULESETS[id],r,id);
 for(const[id,m]of Object.entries({...baseline.MAPS,...baseline.INTRO_MAPS,...baseline.CAMPAIGN_MAPS}))assert.deepEqual(current.getMap(id),m,id);
 const body=s=>s.slice(s.indexOf('  _ai(side=1){'),s.indexOf('\n}\n\n/** Strict save validation.'));assert.equal(body(currentSource),body(runtime.engineSource));
 const schedule=s=>s.split('\n').find(line=>line.includes('if(this.ai){this.aiTimer'));assert.equal(schedule(currentSource),schedule(runtime.engineSource));
});
for(const mapId of['classic','twin-span','long-march','borrowed-yard'])test('Old-map paid/restore parity '+mapId,()=>{
 const options={mapId,seed:42421,...(mapId==='borrowed-yard'?{rulesetId:'frontier-campaign-borrowed-ground'}:{})},a=new baseline.Game(options),b=new current.Game(options);
 assert.deepEqual(b.serialize(),a.serialize());
 for(let i=0;i<300;i++){if(i%100===0){const x=mapId==='borrowed-yard'?1250:1110,y=a.map.lanes[0];assert.deepEqual(b.build('archery',x,y),a.build('archery',x,y));}a.update(.05);b.update(.05);}
 assert.deepEqual(b.serialize(),a.serialize());const ar=baseline.Game.restore(a.serialize()),br=current.Game.restore(b.serialize());for(let i=0;i<100;i++){ar.update(.05);br.update(.05);}assert.deepEqual(br.serialize(),ar.serialize());
});
