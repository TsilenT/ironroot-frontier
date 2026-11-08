/** Developer-only full-UI wrapper. Never place its output in a release artifact. */
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,cp,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {describeLastAscent} from './scenario.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const output=path.resolve(process.argv[2]||path.join(root,'../preview'));
assert.ok(output !== root && !output.startsWith(path.join(root,'dist')),'Preview must not replace published runtime');
const variant=process.argv[3]||'supply-road';const description=describeLastAscent({variant});
await mkdir(path.join(output,'.openai'),{recursive:true});
await cp(path.join(root,'dist'),path.join(output,'dist'),{recursive:true});
await writeFile(path.join(output,'.openai/hosting.json'),JSON.stringify({static:{directory:'dist'}})+'\n');
const scenario=(await readFile(path.join(root,'qa/last-ascent/scenario.mjs'),'utf8')).replaceAll("'../../dist/","'./");
await writeFile(path.join(output,'dist/last-ascent-scenario.mjs'),scenario);
let app=await readFile(path.join(root,'dist/app.js'),'utf8');
const edits=[];
function once(before,after,label){assert.equal(app.split(before).length-1,1,label);app=app.replace(before,after);edits.push(label);}
once("let mode = 'campaign',","let mode = 'skirmish',",'lab starts in skirmish presentation');
once("let difficulty = 'easy',",`let difficulty = ${JSON.stringify(description.difficulty)},`,'lab authored opponent presentation');
once('function setMode(value) {\n  mode = value;','function setMode(value) {\n  mode = \'skirmish\';','lab cannot enter real progression');
once("new Game({ difficulty, seed: Date.now() >>> 0, mapId: selectedMap, mapRevision: 1, rulesetId: skirmishRulesetId(selectedRuleset, $('skirmishBridgeIncome').checked, $('skirmishFog').checked), rulesetRevision: 1 })",'qaCreateLastAscent({variant:qaVariant,seed:qaSeed})','fresh lab launch preserves authored setup');
once("new Game({ difficulty: game.difficulty, ai: game.ai, seed: Date.now() >>> 0,\n          mapId: game.map.id, mapRevision: game.map.revision,\n          ...(game.schemaVersion === 3 ? {rulesetId: game.ruleset.id, rulesetRevision: game.ruleset.revision} : {}) })",'qaCreateLastAscent({variant:qaVariant,seed:qaSeed})','lab restart preserves authored setup');
const prefix=`// Isolated Last Ascent developer preview. No real profile access.\nimport {createLastAscent as qaCreateLastAscent,describeLastAscent as qaDescribe} from './last-ascent-scenario.mjs';\nconst qaVariant=${JSON.stringify(variant)},qaSeed=101;\nconst localStorage=(()=>{const backend=window.sessionStorage,prefix='ironroot.last-ascent.lab.'+qaVariant+'.';return {getItem:k=>backend.getItem(prefix+k),setItem:(k,v)=>backend.setItem(prefix+k,String(v)),removeItem:k=>backend.removeItem(prefix+k)};})();\ndocument.title='LOCAL PROTOTYPE: The Last Ascent';\n`;
app=prefix+app+`\n// Display setup facts without changing simulation, resources or outcomes.\nconst qaBrief=document.createElement('section');qaBrief.id='qaAscentBrief';qaBrief.setAttribute('aria-label','Last Ascent prototype briefing');\nconst qaInfo=qaDescribe({variant:qaVariant});\nfor(const text of ['LOCAL PROTOTYPE · THE LAST ASCENT',qaInfo.briefing,\n  'Your camp: '+qaInfo.startingInvestment[0]+' gold invested, '+qaInfo.startingGold[0]+' to spend, '+qaInfo.startingHealth[0]+'/6000 citadel HP, '+qaInfo.startingIncome[0]+' gold/sec.',\n  'Enemy camp: '+qaInfo.startingInvestment[1]+' gold invested, '+qaInfo.startingGold[1]+' to spend, '+qaInfo.startingHealth[1]+'/6000 citadel HP, '+qaInfo.startingIncome[1]+' gold/sec.',\n  'Enemy deployment: '+qaInfo.formations[1].map(b=>['North','Middle','South'][b.lane]+' '+b.type+' level '+b.level+' ('+b.invested+' gold)').join('; ')+'.',
  qaInfo.warning,'Local experimental setup, not a released campaign mission. This tab uses isolated temporary storage; it earns no real campaign progress.']) {const p=document.createElement('p');p.textContent=text;qaBrief.append(p);}\n$('skirmishConfig').before(qaBrief);\n`;
await writeFile(path.join(output,'dist/app.js'),app);
let html=await readFile(path.join(root,'dist/index.html'),'utf8');
html=html.replace('</head>',`<style>/* Developer preview only. */ .mode-tabs,#skirmishConfig,#campaignConfig,#challengeConfig{display:none!important}#qaAscentBrief{max-height:42vh;overflow:auto;text-align:left;padding:.5rem 0}#qaAscentBrief p{font-size:13px;line-height:1.45;margin:.5rem 0}#qaAscentBrief p:first-child{font-weight:800;color:#f5d68c}header .brand:after{content:'LAST ASCENT LAB';color:#f5d68c;font-size:10px;margin-left:8px}</style></head>`);
html=html.replace(/Campaign · Skirmish · Field trials · v[0-9.]+/,'LOCAL PROTOTYPE · Last Ascent · no campaign progress');
await writeFile(path.join(output,'dist/index.html'),html);
const hashes=async directory=>Object.fromEntries(await Promise.all((await readdir(directory)).sort().map(async name=>[name,createHash('sha256').update(await readFile(path.join(directory,name))).digest('hex')])));
await writeFile(path.join(output,'PREVIEW_RECEIPT.json'),JSON.stringify({scope:'Developer preview only. Released engine/rules/render copied unchanged; app entry uses isolated sessionStorage, single lab setup, disclosed briefing and restart factory. Not release runtime or profile persistence evidence.',variant,description,edits,source:await hashes(path.join(root,'dist')),preview:await hashes(path.join(output,'dist'))},null,2)+'\n');
console.log(output);
