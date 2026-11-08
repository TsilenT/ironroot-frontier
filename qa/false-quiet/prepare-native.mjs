// Developer-only paid checkpoints. Default regenerates metadata only.
// --write-preview explicitly creates an isolated session-storage-only runtime outside source.
import assert from 'node:assert/strict';
import { cp, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createCampaignMission, createCampaignProgress, CAMPAIGN_MISSIONS, normalizeCampaignProgress, getCampaignMission, getCampaignTargets, evaluateCampaignMission } from '../../dist/campaign.js';
import { advanceObjectiveBattle } from '../../dist/objectives.js';
import { encodeBattle, decodeBattle, scenarioForBattle } from '../../dist/battle-codec.js';
import { createPolicy } from './paid-policies.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..'),ID='false-quiet';
const hash=value=>createHash('sha256').update(value).digest('hex');
const rounded=value=>Array.isArray(value)?value.map(rounded):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).map(([k,v])=>[k,rounded(v)])):typeof value==='number'?Math.round(value*1e6)/1e6:value;
export function syntheticPrerequisites(){const p=createCampaignProgress();for(const m of CAMPAIGN_MISSIONS)if(m.id!==ID)p.missions[m.id]={completed:true,stars:1,bestTime:60};for(const id of ['shared-crossing','one-signal-is-enough','lanterns-on-the-water','borrowed-ground','a-river-between-us'])p.missions[id]={completed:true,stars:1,bestTime:180};return normalizeCampaignProgress(p);}
export function buildFixtures(){
 const progress=syntheticPrerequisites(),profiles={},receipts={},completionTime={};
 assert.ok(!progress.missions[ID]?.completed,'False Quiet itself must not be completed');
 const profile=battle=>({'ironroot.campaign.v1':JSON.stringify(progress),'ironroot.settings.v1':JSON.stringify({sound:false,music:false,sfx:false,volume:.3,reducedMotion:false,quality:'high'}),...(battle?{'ironroot.battle.v1':JSON.stringify(battle)}:{})});
 profiles.briefing=profile(null);receipts.briefing={time:0,note:'Synthetic prior progress unlocks False Quiet. No saved battle; open the mission briefing.'};
 for(const variant of ['a','b']){
  const game=createCampaignMission(ID,{variant}),mission=getCampaignMission(ID),policy=createPolicy('scout-adapt-5s'),ledger={spending:[0,0],refunds:[0,0],income:[0,0],purchases:[0,0],maxError:[0,0]};
  for(const method of ['build','upgrade','cast','sell','buyCitadelOption']){const original=game[method];game[method]=function(...args){const side=method==='build'?(args[3]??0):method==='cast'?(args[2]??0):(args[1]??0),gold=this.state.gold[side],kills=this.state.stats.kills[side],r=original.apply(this,args);if(r.ok){const cost=gold-this.state.gold[side]+2*(this.state.stats.kills[side]-kills);if(cost>=0)ledger.spending[side]+=cost;else ledger.refunds[side]-=cost;ledger.purchases[side]++;}return r;};}
  function capture(name,note){
   const outcome=evaluateCampaignMission(game,ID);assert.ok(!outcome.completed&&!outcome.failed,`${name} must remain active`);
   const battle=encodeBattle(game,scenarioForBattle(null,ID,game),{campaignProgress:progress}),restored=decodeBattle(battle,{campaignProgress:progress}).game;
   assert.deepEqual(restored.serialize(),game.serialize());const second=decodeBattle(battle,{campaignProgress:progress}).game;restored.update(.05);second.update(.05);assert.deepEqual(restored.serialize(),second.serialize());
   profiles[name]=profile(battle);receipts[name]=rounded({variant,rulesetId:game.ruleset.id,route:'scout-adapt-5s',seed:mission.seed,time:game.state.time,targets:getCampaignTargets(game,ID).map(t=>({name:t.name,originalId:t.originalId,alive:!!t.building,hp:t.building?.hp??null})),cores:game.state.bases.map(b=>b.hp),gold:[...game.state.gold],buildings:game.state.buildings.filter(b=>b.side===0).map(b=>({id:b.id,type:b.type,x:b.x,lane:b.lane,level:b.level,hp:b.hp})),ledger:structuredClone(ledger),battleSha256:hash(JSON.stringify(battle)),note});
  }
  capture('fresh-'+variant,'Exact authored zero-time saved battle. Resume enters this layout. Synthetic prior records are not browser-earned.');
  let outcome=evaluateCampaignMission(game,ID);
  while(!outcome.completed&&!outcome.failed){
   policy.step(game);
   for(const side of [0,1])ledger.income[side]+=.05*(5+game.state.buildings.filter(b=>b.side===side&&b.type==='mint'&&b.hp>0).reduce((sum,b)=>sum+2.5*(1+.5*(b.level-1)),0));
   outcome=advanceObjectiveBattle(game,.05,g=>evaluateCampaignMission(g,ID),mission.timeLimit);
   for(const side of [0,1]){const opening=side?mission.enemyGold:mission.startingGold,expected=opening+ledger.income[side]+2*game.state.stats.kills[side]+ledger.refunds[side]-ledger.spending[side];ledger.maxError[side]=Math.max(ledger.maxError[side],Math.abs(game.state.gold[side]-expected));assert.ok(ledger.maxError[side]<1e-6,'paid ledger must reconcile');}
   if(!outcome.completed&&!outcome.failed){
    if(!receipts['paid-opening-'+variant]&&game.state.time>=25-1e-8)capture('paid-opening-'+variant,'Natural 25-second paid scout/adapt checkpoint; one action per five seconds including spells.');
    const target=getCampaignTargets(game,ID)[0];
    if(!receipts['terminal-near-'+variant]&&target.building?.hp<=200)capture('terminal-near-'+variant,'Original fort naturally below 200 HP, still alive. Continue ordinary simulation; no victory state edits.');
   }
  }
  assert.ok(outcome.completed,'Authored-seed scout/adapt route should win naturally');completionTime[variant]=rounded(game.state.time);
 }
 assert.deepEqual(Object.keys(profiles).sort(),['briefing','fresh-a','fresh-b','paid-opening-a','paid-opening-b','terminal-near-a','terminal-near-b']);
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
    mission: ID, syntheticPrerequisiteRecords, storage: 'sessionStorage only, per-fixture ironroot.false-quiet.native namespace',
    fixtureNames: Object.keys(profiles), receipts, completionTime,
    sourceRuntimeSha256: hash(JSON.stringify(source)), sourceFileHashes:source, previewPrepared: writePreview
  };
  if (writePreview) {
    let app = await readFile(path.join(root, 'dist/app.js'), 'utf8');
    assert.ok(!/\b(?:window|globalThis)\.localStorage\b/.test(app), 'direct real-profile access is not allowed in this fixture');
    for (const name of Object.keys(source).filter(name => name.endsWith('.js') && name !== 'app.js')) {
      assert.ok(!/\blocalStorage\b/.test(await readFile(path.join(root, 'dist', name), 'utf8')), `unisolated storage reference in ${name}`);
    }
    const prefix = `// Developer-only fixture profile; never falls back to the real profile.\nconst localStorage = (() => {\n  const profiles = ${JSON.stringify(profiles)};\n  const requested = new URLSearchParams(location.search).get('fixture');\n  const mode = Object.hasOwn(profiles, requested) ? requested : 'briefing';\n  const backend = window.sessionStorage, prefix = 'ironroot.false-quiet.native.' + mode + '.';\n  const storage = { getItem: key => backend.getItem(prefix + key), setItem: (key, value) => backend.setItem(prefix + key, String(value)), removeItem: key => backend.removeItem(prefix + key) };\n  if (backend.getItem(prefix + 'initialized') !== '1') {\n    for (const [key, value] of Object.entries(profiles[mode])) storage.setItem(key, value);\n    backend.setItem(prefix + 'initialized', '1');\n  }\n  return storage;\n})();\ndocument.title = 'QA sandbox: False Quiet';\n`;
    assert.ok(app.includes("'serviceWorker' in navigator &&"));
    app = app.replace("'serviceWorker' in navigator &&", "false && // Developer preview: do not install a service worker.\n  'serviceWorker' in navigator &&");
    await mkdir(path.join(output, '.openai'), { recursive: true });
    await cp(path.join(root, 'dist'), path.join(output, 'dist'), { recursive: true });
    await writeFile(path.join(output, '.openai/hosting.json'), JSON.stringify({ static: { directory: 'dist' } }) + '\n');
    await writeFile(path.join(output, 'dist/app.js'), prefix + app);
    let html = await readFile(path.join(root, 'dist/index.html'), 'utf8');
    assert.ok(html.includes('<div class="welcome-rule"></div>'));
    html = html.replace('<div class="welcome-rule"></div>', '<p style="font-size:12px">LOCAL QA: synthetic prior progress and paid-engine checkpoints, not browser-earned wins. Temporary tab storage only.</p><nav aria-label="QA fixture"><a href="?fixture=briefing">Briefing</a> · <a href="?fixture=fresh-a">Fresh A</a> · <a href="?fixture=fresh-b">Fresh B</a> · <a href="?fixture=paid-opening-a">Paid A</a> · <a href="?fixture=paid-opening-b">Paid B</a> · <a href="?fixture=terminal-near-a">Near terminal A</a> · <a href="?fixture=terminal-near-b">Near terminal B</a></nav><div class="welcome-rule"></div>');
    html = html.replace(/Campaign · Skirmish · Field trials · v[0-9.]+/, 'LOCAL QA · False Quiet · no real profile access');
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
  await writeFile(path.resolve(output, 'false-quiet-native-fixtures.json'), JSON.stringify(metadata, null, 2) + '\n');
  return metadata;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2), output = args.find(arg => !arg.startsWith('--'));
  const result = await prepareNative({ ...(output ? { output } : {}), writePreview: args.includes('--write-preview') });
  console.log(JSON.stringify({ previewPrepared: result.previewPrepared, output: result.preview?.directory ?? null,
    fixtures: Object.fromEntries(Object.entries(result.receipts).map(([name, receipt]) => [name, receipt.time])), completionTime: result.completionTime }));
}
