// Developer-only paid checkpoints. Default regenerates metadata only.
// --write-preview explicitly creates an isolated session-storage-only runtime outside source.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import { cp, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createCampaignMission, createCampaignProgress, CAMPAIGN_MISSIONS, normalizeCampaignProgress, getCampaignMission, getCampaignTargets, evaluateCampaignMission } from '../../dist/campaign.js';
import { advanceObjectiveBattle } from '../../dist/objectives.js';
import { encodeBattle, decodeBattle, scenarioForBattle } from '../../dist/battle-codec.js';
import { createPolicy } from './paid-policies.mjs';
import {instrumentEconomy,verifyPlayerCadence} from './economy.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..'),ID='through-the-reed-beds';
const hash=value=>createHash('sha256').update(value).digest('hex');
const rounded=value=>Array.isArray(value)?value.map(rounded):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).map(([k,v])=>[k,rounded(v)])):typeof value==='number'?Math.round(value*1e6)/1e6:value;
export function syntheticPrerequisites(){const p=createCampaignProgress();for(const m of CAMPAIGN_MISSIONS)if(m.id!==ID)p.missions[m.id]={completed:true,stars:1,bestTime:60};for(const id of ['shared-crossing','one-signal-is-enough','lanterns-on-the-water','borrowed-ground','a-river-between-us','false-quiet','the-road-we-know'])p.missions[id]={completed:true,stars:1,bestTime:180};return normalizeCampaignProgress(p);}
export function buildFixtures(){
 const progress=syntheticPrerequisites(),profiles={},receipts={},completionTime={};
 assert.ok(!progress.missions[ID]);
 const profile=battle=>({'ironroot.campaign.v1':JSON.stringify(progress),'ironroot.settings.v1':JSON.stringify({sound:false,music:false,sfx:false,volume:.3,reducedMotion:false,quality:'high'}),...(battle?{'ironroot.battle.v1':JSON.stringify(battle)}:{})});
 profiles.briefing=profile(null);receipts.briefing={time:0,note:'Synthetic one-star prior progress unlocks Reed, not browser-earned.'};
 for(const [variant,route]of [['main','outer-pair'],['core','core-rush']]){
  const game=createCampaignMission(ID),mission=getCampaignMission(ID),policy=createPolicy(route),economy=instrumentEconomy(game);
  function capture(name,note){
   const outcome=evaluateCampaignMission(game,ID);assert.ok(!outcome.completed&&!outcome.failed);
   const battle=encodeBattle(game,scenarioForBattle(null,ID,game),{campaignProgress:progress}),restored=decodeBattle(battle,{campaignProgress:progress}).game;
   assert.deepEqual(restored.serialize(),game.serialize());verifyPlayerCadence(economy.ledger.transactions);
   profiles[name]=profile(battle);receipts[name]={variant,route,seed:mission.seed,time:game.state.time,targets:getCampaignTargets(game,ID).map(t=>({name:t.name,originalId:t.originalId,alive:!!t.building,hp:t.building?.hp??null})),cores:game.state.bases.map(b=>b.hp),gold:[...game.state.gold],ledger:economy.snapshot(),battleSha256:hash(JSON.stringify(battle)),note};
  }
  if(variant==='main')capture('fresh-main','Exact authored tick-zero save; ordinary mines and income caches.');
  let outcome=evaluateCampaignMission(game,ID);
  while(!outcome.completed&&!outcome.failed){
   policy.step(game);outcome=advanceObjectiveBattle(game,.05,g=>evaluateCampaignMission(g,ID),mission.timeLimit);economy.reconcile();
   if(outcome.completed||outcome.failed)break;
   if(variant==='main'&&!receipts['paid-opening-main']&&game.state.time>=25-1e-8)capture('paid-opening-main','Natural25-second ordinary-paid outer-pair checkpoint.');
   const targets=getCampaignTargets(game,ID),destroyed=targets.filter(t=>!t.building).length,low=targets.filter(t=>t.building).some(t=>t.building.hp<=150);
   if(!receipts['terminal-near-'+variant]&&(variant==='main'?destroyed===1&&low:game.state.bases[1].hp<=500))capture('terminal-near-'+variant,'Natural active paid checkpoint. Continue ordinary simulation; no terminal state edits.');
  }
  assert.ok(outcome.completed,'Paid route must win naturally');completionTime[variant]=game.state.time;
 }
 const legacy=JSON.parse(readFileSync(new URL('./legacy-road-profile.json',import.meta.url),'utf8'));
 profiles['legacy-road']=legacy.profile;receipts['legacy-road']={time:legacy.time,battleSha256:legacy.battleSha256,note:legacy.scope,baseCommit:legacy.baseCommit,paidOpening:legacy.paidOpening};
 assert.deepEqual(Object.keys(profiles).sort(),['briefing','fresh-main','legacy-road','paid-opening-main','terminal-near-core','terminal-near-main']);
 return {profiles,receipts,completionTime,syntheticPrerequisiteRecords:Object.keys(progress.missions).length};
}

async function runtimeHashes(directory) {
  return Object.fromEntries(await Promise.all((await readdir(directory)).sort().map(async name => [name, hash(await readFile(path.join(directory, name)))])));
}

export async function prepareNative({ output = path.resolve(root, '../preview'), writePreview = false } = {}) {
  output = path.resolve(output);
  assert.ok(output !== root && !output.startsWith(root + path.sep), 'preview must be outside the source checkout');
  const { profiles, receipts, completionTime, syntheticPrerequisiteRecords } = buildFixtures();
  const source = await runtimeHashes(path.join(root, 'dist'));
  const metadata = {
    scope: 'Developer-only synthetic prerequisites plus ordinary paid-engine checkpoints. Not browser-earned wins or production-profile persistence evidence.',
    mission: ID, syntheticPrerequisiteRecords, storage: 'sessionStorage only, per-fixture ironroot.reed-beds.native namespace',
    fixtureNames: Object.keys(profiles), receipts, completionTime,
    sourceRuntimeSha256: hash(JSON.stringify(source)), sourceFileHashes:source, previewPrepared: writePreview
  };
  if (writePreview) {
    let app = await readFile(path.join(root, 'dist/app.js'), 'utf8');
    assert.ok(!/\b(?:window|globalThis)\.localStorage\b/.test(app), 'direct real-profile access is not allowed in this fixture');
    for (const name of Object.keys(source).filter(name => name.endsWith('.js') && name !== 'app.js')) {
      assert.ok(!/\blocalStorage\b/.test(await readFile(path.join(root, 'dist', name), 'utf8')), `unisolated storage reference in ${name}`);
    }
    const prefix = `// Developer-only fixture profile; never falls back to the real profile.\nconst localStorage = (() => {\n  const profiles = ${JSON.stringify(profiles)};\n  const requested = new URLSearchParams(location.search).get('fixture');\n  const mode = Object.hasOwn(profiles, requested) ? requested : 'briefing';\n  const backend = window.sessionStorage, prefix = 'ironroot.reed-beds.native.' + mode + '.';\n  const storage = { getItem: key => backend.getItem(prefix + key), setItem: (key, value) => backend.setItem(prefix + key, String(value)), removeItem: key => backend.removeItem(prefix + key) };\n  if (backend.getItem(prefix + 'initialized') !== '1') {\n    for (const [key, value] of Object.entries(profiles[mode])) storage.setItem(key, value);\n    backend.setItem(prefix + 'initialized', '1');\n  }\n  return storage;\n})();\ndocument.title = 'QA sandbox: Through the Reed Beds';\n`;
    assert.ok(app.includes("'serviceWorker' in navigator &&"));
    app = app.replace("'serviceWorker' in navigator &&", "false && // Developer preview: do not install a service worker.\n  'serviceWorker' in navigator &&");
    await mkdir(path.join(output, '.openai'), { recursive: true });
    await cp(path.join(root, 'dist'), path.join(output, 'dist'), { recursive: true });
    await writeFile(path.join(output, '.openai/hosting.json'), JSON.stringify({ static: { directory: 'dist' } }) + '\n');
    await writeFile(path.join(output, 'dist/app.js'), prefix + app);
    let html = await readFile(path.join(root, 'dist/index.html'), 'utf8');
    assert.ok(html.includes('<div class="welcome-rule"></div>'));
    html = html.replace('<div class="welcome-rule"></div>', '<p style="font-size:12px">LOCAL QA: synthetic prior progress and paid-engine checkpoints, not browser-earned wins. Temporary tab storage only.</p><nav aria-label="QA fixture"><a href="?fixture=briefing">Briefing</a> · <a href="?fixture=fresh-main">Fresh</a> · <a href="?fixture=paid-opening-main">Paid opening</a> · <a href="?fixture=terminal-near-main">Near two-target victory</a> · <a href="?fixture=terminal-near-core">Near core victory</a> · <a href="?fixture=legacy-road">Synthetic v0.28 Road save</a></nav><div class="welcome-rule"></div>');
    html = html.replace(/Campaign · Skirmish · Field trials · v[0-9.]+/, 'LOCAL QA · Through the Reed Beds · no real profile access');
    await writeFile(path.join(output, 'dist/index.html'), html);
    const preview = await runtimeHashes(path.join(output, 'dist'));
    const changed = Object.keys(source).filter(name => source[name] !== preview[name]);
    assert.deepEqual(changed.sort(), ['app.js', 'index.html']);
    assert.deepEqual(Object.keys(source), Object.keys(preview));
    metadata.preview = { directory: output, runtimeFiles: Object.keys(source).length,
      runtimeSha256: hash(JSON.stringify(preview)), changedFiles: changed,
      differences: 'Namespaced session storage and fixture navigation/disclosure only; service-worker installation disabled. Every other runtime file is byte-identical.' };
  }
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(path.resolve(output, 'reed-beds-native-fixtures.json'), JSON.stringify(metadata, null, 2) + '\n');
  return metadata;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2), output = args.find(arg => !arg.startsWith('--'));
  const result = await prepareNative({ ...(output ? { output } : {}), writePreview: args.includes('--write-preview') });
  console.log(JSON.stringify({ previewPrepared: result.previewPrepared, output: result.preview?.directory ?? null,
    fixtures: Object.fromEntries(Object.entries(result.receipts).map(([name, receipt]) => [name, receipt.time])), completionTime: result.completionTime }));
}
