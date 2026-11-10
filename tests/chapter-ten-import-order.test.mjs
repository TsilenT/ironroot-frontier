/** Fresh module imports only: no renderer instance, canvas, browser or drawing. */
import test from 'node:test';import assert from 'node:assert/strict';import {spawnSync} from 'node:child_process';
for(const first of ['engine.js','rulesets.js','citadel-options.js','citadel-view.js','render.js','fog.js','autonomous-air.js','campaign.js','battle-codec.js'])test(`fresh-process ${first} entry has no registry/spec initialization cycle`,()=>{
 const url=new URL('../dist/'+first,import.meta.url).href,engine=new URL('../dist/engine.js',import.meta.url).href,citadel=new URL('../dist/citadel-options.js',import.meta.url).href;
 const script=`await import(${JSON.stringify(url)});const e=await import(${JSON.stringify(engine)}),c=await import(${JSON.stringify(citadel)});const g=new e.Game({rulesetId:'frontier-campaign-last-engine-r2'});if(g.ruleset.citadel!==c.CITADEL_OPTIONS)throw Error('citadel spec identity changed');`;
 const result=spawnSync(process.execPath,['--input-type=module','-e',script],{encoding:'utf8'});assert.equal(result.status,0,result.stderr);
});
