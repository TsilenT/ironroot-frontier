// Developer-only ordinary paid-engine checkpoints and isolated browser profile.
import assert from 'node:assert/strict';
import {cp,mkdir,readFile,writeFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createCampaignMission,evaluateCampaignMission,getCampaignTargets} from '../../dist/campaign.js';
import {advanceObjectiveBattle} from '../../dist/objectives.js';
import {encodeBattle,decodeBattle,scenarioForBattle} from '../../dist/battle-codec.js';
import {paidPolicy,ROUTES,campaignProgress,MISSION_ID} from '../../tests/one-signal-policies.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const output=path.resolve(process.argv[2]||path.join(root,'../preview'));
assert.ok(output!==root&&!output.startsWith(path.join(root,'dist')));
const progress=campaignProgress();
function profile(battle=null){return {'ironroot.campaign.v1':JSON.stringify(progress),'ironroot.settings.v1':JSON.stringify({sound:false,music:false,sfx:false,volume:.3,reducedMotion:false,quality:'high'}),...(battle?{'ironroot.battle.v1':JSON.stringify(battle)}:{})};}
const profiles={fresh:profile()},receipts={};
for(const [name,route,at] of [['loss','northSacrifice',53],['finish','northSacrifice',139],['evacuation','southRanged',208]]){
 const game=createCampaignMission(MISSION_ID);const policy=paidPolicy(ROUTES[route]);let spent=0,income=0,outcome=evaluateCampaignMission(game,MISSION_ID);const actions=[];
 for(let tick=0;tick<Math.round(at*20);tick++){
  assert.ok(!outcome.completed&&!outcome.failed,`${name} prematurely ended`);
  if(tick%40===0){const before=game.state.gold[0],r=policy(game);if(r?.ok){const cost=before-game.state.gold[0];spent+=cost;actions.push({time:game.state.time,type:r.building.type,x:r.building.x,lane:r.building.lane,level:r.building.level,cost});}}
  const before=game.state.time;outcome=advanceObjectiveBattle(game,.05,g=>evaluateCampaignMission(g,MISSION_ID),210);income+=game.state.income[0]*(game.state.time-before);
  assert.ok(Math.abs(game.state.gold[0]-(1100+income+2*game.state.stats.kills[0]-spent))<1e-6);
 }
 assert.ok(!outcome.completed&&!outcome.failed);
 const battle=encodeBattle(game,scenarioForBattle(null,MISSION_ID,game),{campaignProgress:progress});
 assert.deepEqual(decodeBattle(battle,{campaignProgress:progress}).game.serialize(),game.serialize());
 profiles[name]=profile(battle);
 receipts[name]={route,at:game.state.time,spent,income,actions,targets:getCampaignTargets(game,MISSION_ID).map(t=>({name:t.name,originalId:t.originalId,hp:t.building?.hp??null})),cores:game.state.bases.map(b=>b.hp),battleSha256:createHash('sha256').update(JSON.stringify(battle)).digest('hex')};
}
await mkdir(path.join(output,'.openai'),{recursive:true});await cp(path.join(root,'dist'),path.join(output,'dist'),{recursive:true});
await writeFile(path.join(output,'.openai/hosting.json'),JSON.stringify({static:{directory:'dist'}})+'\n');
const prefix=`// Developer-only synthetic prior records and exact paid-engine checkpoints.\nconst localStorage=(()=>{const profiles=${JSON.stringify(profiles)},requested=new URLSearchParams(location.search).get('fixture'),mode=Object.hasOwn(profiles,requested)?requested:'fresh',backend=window.sessionStorage,prefix='ironroot.one-signal.native.'+mode+'.';const storage={getItem:k=>backend.getItem(prefix+k),setItem:(k,v)=>backend.setItem(prefix+k,String(v)),removeItem:k=>backend.removeItem(prefix+k)};if(backend.getItem(prefix+'initialized')!=='1'){for(const [k,v] of Object.entries(profiles[mode]))storage.setItem(k,v);backend.setItem(prefix+'initialized','1');}return storage;})();\ndocument.title='QA sandbox: One Signal Is Enough';\n`;
await writeFile(path.join(output,'dist/app.js'),prefix+await readFile(path.join(root,'dist/app.js'),'utf8'));
let html=await readFile(path.join(root,'dist/index.html'),'utf8');
html=html.replace('<div class="welcome-rule"></div>',`<p style="font-size:12px">LOCAL QA: synthetic prior progress and paid-engine checkpoints; temporary tab storage only.</p><nav aria-label="QA fixture"><a href="?fixture=fresh">Fresh mission</a> · <a href="?fixture=loss">One signal lost</a> · <a href="?fixture=finish">Near core win</a> · <a href="?fixture=evacuation">Near evacuation</a></nav><div class="welcome-rule"></div>`);
html=html.replace(/Campaign · Skirmish · Field trials · v[0-9.]+/,'LOCAL QA · One Signal · no real profile access');
await writeFile(path.join(output,'dist/index.html'),html);
const hashes=async dir=>Object.fromEntries(await Promise.all((await readdir(dir)).sort().map(async name=>[name,createHash('sha256').update(await readFile(path.join(dir,name))).digest('hex')])));
const receipt={scope:'Synthetic prerequisite records; battle checkpoints use ordinary paid commands and fixed ticks with ledger checks. Only app storage prefix and index QA navigation differ. Not browser-earned wins or production-profile persistence evidence.',receipts,source:await hashes(path.join(root,'dist')),preview:await hashes(path.join(output,'dist'))};
await writeFile(path.join(root,'qa/one-signal/native-fixtures.json'),JSON.stringify(receipt,null,2)+'\n');
console.log(output);
