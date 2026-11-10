/** RECONSTRUCTED private runtime generator; original file bytes unavailable. */
import assert from 'node:assert/strict';
import {cp,mkdir,readFile,writeFile,realpath} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(here,'../../..');
export const CROSSING_RULESET_ID='frontier-qa-ch10-crossing';
function patch(text,before,after){assert.equal(text.split(before).length-1,1,`Exact anchor ${before}`);return text.replace(before,after);}
export async function prepareCrossingLab(destination){
 const output=path.resolve(destination),parent=await realpath(path.dirname(output));
 assert.ok(parent!==root&&!parent.startsWith(root+path.sep)&&output!==root&&!output.startsWith(root+path.sep));
 await mkdir(output,{recursive:false});await cp(path.join(root,'dist'),path.join(output,'dist'),{recursive:true});
 await writeFile(path.join(output,'package.json'),'{"private":true,"type":"module"}\n');
 let t=await readFile(path.join(output,'dist/bridge-control.js'),'utf8');
 const anchor="export const CAMPAIGN_CONTROL = Object.freeze({policy:'cumulative-route-v1',requiredBridges:2,seconds:60,timeLimit:270});";
 t=patch(t,anchor,anchor+"\nexport const QA_CROSSING_CONTROL=Object.freeze({...CAMPAIGN_CONTROL,timeLimit:600});");
 t=patch(t,"if(map.id!=='classic'||map.revision!==1)fail('campaign control requires Classic');","if((rule===QA_CROSSING_CONTROL?map.id!=='twin-span':map.id!=='classic')||map.revision!==1)fail(rule===QA_CROSSING_CONTROL?'QA crossing requires Twin Span':'campaign control requires Classic');");
 await writeFile(path.join(output,'dist/bridge-control.js'),t);
 t=await readFile(path.join(output,'dist/rulesets.js'),'utf8');
 t=patch(t,'BRIDGE_CONTROL, CAMPAIGN_CONTROL, RIVER_BETWEEN_CONTROL','BRIDGE_CONTROL, CAMPAIGN_CONTROL, RIVER_BETWEEN_CONTROL, QA_CROSSING_CONTROL');
 t=patch(t,'export const RULESETS=deepFreeze({',"export const RULESETS=deepFreeze({\n'frontier-qa-ch10-crossing':deepFreeze({...autonomousAirEntry('frontier-qa-ch10-crossing','QA only · Carry the Crossing',false,true),citadel:CITADEL_OPTIONS,qaOnly:true,campaignControl:QA_CROSSING_CONTROL}),");
 await writeFile(path.join(output,'dist/rulesets.js'),t);
 t=await readFile(path.join(output,'dist/engine.js'),'utf8');
 t=patch(t,"if(supportsCampaignControl(ruleset)&&(map.id!=='classic'||map.revision!==1))throw new Error('Campaign control requires Classic');","if(supportsCampaignControl(ruleset)&&((ruleset.id==='frontier-qa-ch10-crossing'?map.id!=='twin-span':map.id!=='classic')||map.revision!==1))throw new Error(ruleset.id==='frontier-qa-ch10-crossing'?'QA crossing requires Twin Span':'Campaign control requires Classic');");
 await writeFile(path.join(output,'dist/engine.js'),t);
 await cp(path.join(here,'scenario.mjs'),path.join(output,'dist/crossing-scenario.js'));return output;
}
