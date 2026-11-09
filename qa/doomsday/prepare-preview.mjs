/** Generate an isolated ordinary-UI lab outside this repository. No deployment. */
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFile,writeFile,realpath} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {describeDoomsday} from './scenario.mjs';
const root=await realpath(path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..'));
const output=path.resolve(process.argv[2]??'/tmp/ironroot-doomsday-preview');
// Existing output aliases must also stay outside source; refuse before copying.
let resolved=output;try{resolved=await realpath(output);}catch(error){if(error.code!=='ENOENT')throw error;resolved=path.join(await realpath(path.dirname(output)),path.basename(output));}
assert.ok(resolved!==root&&!resolved.startsWith(root+path.sep),'Doomsday preview must stay outside repository');
const variant=process.argv[3]??'doomsday-hard';const description=describeDoomsday({variant});
const result=spawnSync(process.execPath,[path.join(root,'qa/last-ascent/prepare-preview.mjs'),output,'supply-road'],{encoding:'utf8'});
assert.equal(result.status,0,result.stderr);
const dest=path.join(output,'dist');
let app=await readFile(path.join(dest,'app.js'),'utf8');
app=app.replace("createLastAscent as qaCreateLastAscent,describeLastAscent as qaDescribe} from './last-ascent-scenario.mjs'","createDoomsday as qaCreateLastAscent,describeDoomsday as qaDescribe} from './doomsday-scenario.mjs'");
app=app.replace("const qaVariant=\"supply-road\",qaSeed=101;",`const qaVariant=${JSON.stringify(variant)},qaSeed=(()=>{const value=new URLSearchParams(location.search).get('seed');const n=value===null?101:Number(value);return Number.isSafeInteger(n)&&n>=0&&n<=0xffffffff?n:101;})();`);
assert.ok(app.includes('let difficulty = "normal",'));
app=app.replace('let difficulty = "normal",',`let difficulty = ${JSON.stringify(description.difficulty)},`);
app=app.replace("prefix='ironroot.last-ascent.lab.'","prefix='ironroot.doomsday.lab.'");
app=app.replace("'serviceWorker' in navigator &&","false && 'serviceWorker' in navigator &&");
// Replace the older long briefing with a compact summary and optional details.
const marker='// Display setup facts without changing simulation, resources or outcomes.';
assert.ok(app.includes(marker));app=app.slice(0,app.indexOf(marker))+`
const qaInfo=qaDescribe({variant:qaVariant});
const qaBrief=document.createElement('section');qaBrief.id='qaAscentBrief';qaBrief.setAttribute('aria-label','Doomsday prototype briefing');
for(const text of ['CHAPTER 10 LAB · DOOMSDAY · SEED '+qaSeed,
  'Break the enemy citadel. Any surviving HP wins. Your camp starts at 3800/6000 HP, with 1050 gold and 7.5 gold/sec. The enemy has 6000 HP, 120 gold, 12.5 gold/sec and an entrenched forward army.',
  qaInfo.opponent,
  'At 5:00: production ×1.65, troop damage to structures ×1.75, citadel shots 32 → 18. No timed base drain or mission deadline.',
  'Developer prototype. Isolated temporary tab storage; no real campaign progress. Not a released mission.']) {const p=document.createElement('p');p.textContent=text;qaBrief.append(p);}
const details=document.createElement('details'),summary=document.createElement('summary');summary.textContent='Deployment and counterplay';details.append(summary);
for(const text of [qaInfo.briefing,qaInfo.controls,'Player buildings: 1225 gold invested; enemy: 2225. Including treasury: 2275 vs 2345. The opening disadvantage is position, established production, income and health.',qaInfo.formations[1].map(b=>['North','Middle','South'][b.lane]+' '+b.type+' level '+b.level).join('; ')+'.']){const p=document.createElement('p');p.textContent=text;details.append(p);}qaBrief.append(details);$('skirmishConfig').before(qaBrief);
document.title='LOCAL CHAPTER 10 PROTOTYPE: Doomsday';
`;
assert.ok(app.includes('createDoomsday as qaCreateLastAscent'));assert.ok(app.includes(`qaVariant=${JSON.stringify(variant)}`));
await writeFile(path.join(dest,'app.js'),app);
const scenario=(await readFile(path.join(root,'qa/doomsday/scenario.mjs'),'utf8')).replaceAll("'../../dist/","'./").replaceAll("'../last-ascent/scenario.mjs'","'./last-ascent-scenario.mjs'");
await writeFile(path.join(dest,'doomsday-scenario.mjs'),scenario);
let html=await readFile(path.join(dest,'index.html'),'utf8');
html=html.replace('</head>',`<style>#qaAscentBrief{max-height:none;overflow:visible}.welcome{padding:18px 24px}.welcome-sigil,.welcome-copy,.welcome-rule{display:none}.welcome h1{font-size:27px}.welcome h1 span{font-size:19px}#qaAscentBrief p{font-size:13px;line-height:1.45}#qaAscentBrief summary{cursor:pointer;padding:8px}header .brand:after{content:'CHAPTER 10 LAB'}</style></head>`);
await writeFile(path.join(dest,'index.html'),html);
const receipt=JSON.parse(await readFile(path.join(output,'PREVIEW_RECEIPT.json'),'utf8'));
receipt.variant=variant;receipt.description=description;receipt.scope='Doomsday developer preview; original source dist untouched, temporary sessionStorage, no service worker, no campaign registration or deployment.';
receipt.preview={...receipt.preview,'app.js':createHash('sha256').update(app).digest('hex'),'index.html':createHash('sha256').update(html).digest('hex'),'doomsday-scenario.mjs':createHash('sha256').update(scenario).digest('hex')};
await writeFile(path.join(output,'PREVIEW_RECEIPT.json'),JSON.stringify(receipt,null,2)+'\n');console.log(output);
