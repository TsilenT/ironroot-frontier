import {rendererBeforeObliqueArt} from './final-chapter-render-source.mjs';
import {fogViewBeforeLocomotion} from './locomotion-render-source.mjs';
import {currentRuntimeFiles} from './runtime-catalog.mjs';
/** Private current-source DOM stubs and source calculations; no browser or graphics run. */
import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';import {runInContext} from 'node:vm';
import {Game,buildBounds} from '../dist/engine.js';import * as campaign from '../dist/campaign.js';import {CURRENT_PROFILE_PROTOCOL_VERSION} from '../dist/profile-session.js';import {renderMissionScouting} from '../dist/scouting.js';import {startupHarness} from './mobile-startup-fixture.mjs';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8'),source=read('../dist/app.js'),html=read('../dist/index.html'),css=read('../dist/styles.css');
const section=(from,to)=>{const start=source.indexOf(from),end=source.indexOf(to,start);assert.ok(start>=0&&end>start,from);return source.slice(start,end);};
function harness({start=true,width=1180,height=850}={}){
 const h=startupHarness({width,height}),{c:app}=h;Object.assign(app,{labels:{},buildBounds,renderMissionScouting,trialRecords:{}});app.renderer.snap=p=>p;
 for(const [from,to]of [['function populateBuildCards()','populateBuildCards();'],['function selectBuild(','function cancel()'],["$('rally').onclick =",'function pauseControl('],['function activateBattlePoint(','function resetBattleGesture()'],["$('speed').onclick =", "$('sound').onclick ="],["for (const btn of document.querySelectorAll('[data-difficulty]'))",'function holdBattleSafety('],['function renderChallenge()','function setMode(']])runInContext(section(from,to),app);
 if(start)app.start(new Game({difficulty:'normal',ai:false}),null,null);return h;
}
const cards=h=>h.$('buildCards').children;
function selected(h,type=null,volley=false){for(const b of cards(h)){assert.equal(b.attributes['aria-pressed'],String(b.dataset.type===type));assert.equal(b.classList.contains('active'),b.dataset.type===type);}assert.equal(h.$('rally').attributes['aria-pressed'],String(volley));assert.equal(h.$('rally').classList.contains('active'),volley);}
test('initial HTML values and freshly constructed build cards agree before interaction',()=>{
 const h=harness({start:false});h.c.populateBuildCards();assert.equal(cards(h).length,Object.keys(h.c.game.buildings).length);for(const b of cards(h))assert.equal(b.attributes['aria-pressed'],'false');
 const rally=html.match(/<button id="rally"[^>]*>/)[0];assert.match(rally,/aria-pressed="false"/);for(const difficulty of ['easy','normal','hard'])assert.match(html,new RegExp(`data-difficulty="${difficulty}" aria-pressed="${difficulty==='easy'}"`));assert.match(html,/title="Battle speed: 1×\. Change to 1\.5×"/);assert.match(html,/aria-label="Battle speed: 1×\. Change to 1\.5×"/);
});
for(const width of [320,1180])test(`actual build/Volley selection, toggles and cancellation expose state without spending at ${width}px`,()=>{
 const h=harness({width,height:850}),{c:app,$}=h,before=app.game.serialize();selected(h);
 for(let i=0;i<3;i++){app.selectBuild('barracks');selected(h,'barracks');app.selectBuild('barracks');selected(h);app.selectBuild('barracks');selected(h,'barracks');app.selectBuild('archery');selected(h,'archery');$('rally').onclick();selected(h,null,true);$('rally').onclick();selected(h);app.selectBuild('barracks');app.cancel();selected(h);}
 assert.deepEqual(app.game.serialize(),before,'selection and cancellation do not buy, tick or consume RNG');
});
test('successful native placement clears pressed state; failed placement retains selection and ordinary completion cannot repeat-buy',()=>{
 const h=harness(),{c:app}=h;app.selectBuild('barracks');const before=app.game.serialize();app.activateBattlePoint({x:3000,y:450});selected(h,'barracks');assert.deepEqual(app.game.serialize(),before);app.activateBattlePoint({x:550,y:450});selected(h);assert.equal(app.game.state.gold[0],before.state.gold[0]-app.game.buildings.barracks.cost);const after=app.game.serialize();app.activateBattlePoint({x:550,y:450});assert.deepEqual(app.game.serialize(),after);
});
test('successful native Volley clears armed state; cooldown rejection cannot re-arm or spend again',()=>{
 const h=harness(),{c:app,$}=h,before=app.game.state.gold[0];$('rally').onclick();selected(h,null,true);app.activateBattlePoint({x:1600,y:450});selected(h);assert.equal(app.game.state.gold[0],before-app.game.ruleset.spell.cost);const after=app.game.serialize();$('rally').onclick();selected(h);assert.deepEqual(app.game.serialize(),after);
});
test('first-build gating remains authoritative and pressed state resets after its legal paid Barracks',()=>{
 const h=harness({start:false}),{c:app,$}=h;app.campaignProgress=campaign.createCampaignProgress();app.mode='campaign';app.selectedCampaign=campaign.ONBOARDING_MISSIONS[0].id;app.start();assert.equal(app.firstBuildHold,true);assert.equal($('rally').disabled,true);app.selectBuild('barracks');const before=app.game.serialize();$('rally').onclick();selected(h,'barracks');assert.deepEqual(app.game.serialize(),before);app.activateBattlePoint({x:550,y:450});assert.equal(app.firstBuildHold,false);assert.equal(app.coachingHold,false);assert.equal($('rally').disabled,false);selected(h);
});
test('difficulty selection keeps one pressed opponent and a restored start uses its actual difficulty',()=>{
 const h=harness(),{c:app}=h,buttons=app.document.querySelectorAll('[data-difficulty]'),before=app.game.serialize();
 for(const name of ['hard','easy','normal','hard']){buttons.find(b=>b.dataset.difficulty===name).onclick();assert.equal(app.difficulty,name);for(const b of buttons)assert.equal(b.attributes['aria-pressed'],String(b.dataset.difficulty===name));}assert.deepEqual(app.game.serialize(),before);
 for(const difficulty of ['easy','normal','hard']){const restored=Game.restore(new Game({difficulty,ai:false}).serialize());app.start(restored,null,null);assert.equal(app.difficulty,difficulty);for(const b of buttons)assert.equal(b.attributes['aria-pressed'],String(b.dataset.difficulty===difficulty));}
});
test('trial choices maintain one pressed selection through repeated re-rendering and preserve focused selection',()=>{
 const h=harness({start:false}),{c:app,$}=h;app.mode='challenges';app.renderChallenge();
 for(const index of [0,2,1,2,0]){const before=app.game.serialize();$('challengeChoices').children[index].onclick();const buttons=$('challengeChoices').children;assert.equal(buttons.filter(b=>b.attributes['aria-pressed']==='true').length,1);for(let i=0;i<buttons.length;i++)assert.equal(buttons[i].attributes['aria-pressed'],String(i===index));assert.equal(app.document.activeElement,buttons[index]);assert.deepEqual(app.game.serialize(),before);}
});
test('speed labels expose current and next values for repeated1/1.5/2 cycles, then reset on new and restored starts',()=>{
 const h=harness(),{c:app,$}=h,before=app.game.serialize(),expectSpeed=(value,next)=>{const label=`Battle speed: ${value}×. Change to ${next}×`;assert.equal($('speed').textContent,`${value}×`);assert.equal($('speed').attributes['aria-label'],label);assert.equal($('speed').title,label);assert.equal(app.speed,value);};expectSpeed(1,1.5);
 for(let i=0;i<3;i++)for(const [value,next]of [[1.5,2],[2,1],[1,1.5]]){$('speed').onclick();expectSpeed(value,next);}assert.deepEqual(app.game.serialize(),before);
 $('speed').onclick();app.selectBuild('barracks');app.start(new Game({difficulty:'hard',ai:false}),null,null);expectSpeed(1,1.5);selected(h);$('rally').onclick();$('speed').onclick();const saved=app.game.serialize();app.start(Game.restore(saved),null,null);expectSpeed(1,1.5);selected(h);assert.deepEqual(app.game.serialize(),saved);
});
test('mode-count typography is10px ink in every declared span rule; contrast calculation is source-only',()=>{
 const rules=[...css.matchAll(/\.mode-tabs span\s*\{([^}]+)\}/g)].map(m=>m[1]);assert.equal(rules.length,2);assert.match(rules[0],/font-size:\s*10px/);assert.match(rules[0],/color:\s*var\(--ink\)/);for(const rule of rules)assert.doesNotMatch(rule,/font-size:\s*[78]px/);
 const ink=css.match(/--ink:\s*(#[0-9a-f]{6})/i)[1],background=rules[0].match(/background:\s*(#[0-9a-f]{6})/i)[1];const luminance=hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);const ratio=(luminance(ink)+.05)/(luminance(background)+.05);assert.ok(ratio>=4.5);assert.equal(ratio.toFixed(2),'6.56');
});
test('only the three incorrect navigation instructions are changed to the visible Options entry',()=>{
 assert.match(source,/Preferences apply to this page only\. Open Options to retry saving\./);assert.match(source,/Download the original save, then open Options to restore a compatible backup\./);assert.match(html,/Fullscreen is in Options, available from the title screen or pause menu\./);assert.doesNotMatch(source,/Preferences apply to this page only\. Open Preferences|original save, then open Preferences/);assert.doesNotMatch(html,/Fullscreen is in Preferences/);
});
test('current0.40 protocol32/catalog42 and declared art/cache exceptions and original64-file oracle retain exact d0327c6 source',()=>{
 const pkg=JSON.parse(read('../package.json')),desktop=JSON.parse(read('../desktop/package.json')),lock=JSON.parse(read('../desktop/package-lock.json'));assert.equal(pkg.version,'0.40.3');assert.equal(desktop.version,pkg.version);assert.equal(lock.version,pkg.version);assert.equal(lock.packages[''].version,pkg.version);assert.match(read('../dist/service-worker.js'),/const VERSION = 'ironroot-v0\.40\.3';/);assert.match(html,/v0\.40\.3/);assert.equal(CURRENT_PROFILE_PROTOCOL_VERSION,32);const overview=campaign.getProgressionCampaignOverview(campaign.createCampaignProgress());assert.equal(overview.total,42);assert.equal(overview.maxStars,126);const chapter=overview.chapters.find(c=>c.number===10);assert.equal(chapter.total,5);assert.equal(chapter.completed,false);
 // This literal aggregate was read from d0327c6 Git blobs, not generated from
 // the candidate. Existing runtime-catalog preserves the separate released
 // path oracle and exactly six private additions. The three permitted control
 // files are reviewed as source hunks. One later report exception reverses only
 // these two exact reveal-guard hunks to the actual27d243 parent blob, which
 // also matches d0327c6; the original64-file aggregate below stays literal.
 const reportParent='0d0c6d9bc4c67d82ac7c8e593d787e7687712035a786f17c309dcf0b76b56f37';
 let report=read('../dist/battle-report.js');
 const additions=[
  ["import { supportsColossus } from './colossus.js';\n",''],
  ["  // Reveal state survives boss death/restore; current live counts do not.\n  const unitTypes = Object.keys(UNITS).filter(type => type !== 'colossus' || !supportsColossus(game.ruleset) || game.state.colossus.phase !== 'armed'), buildingTypes = Object.keys(BUILDINGS);","  const unitTypes = Object.keys(UNITS), buildingTypes = Object.keys(BUILDINGS);"]
 ];
 for(const [addition,parent] of additions){assert.equal(report.split(addition).length-1,1,'exact report reveal addition');report=report.replace(addition,parent);}
 assert.equal(createHash('sha256').update(report).digest('hex'),reportParent,'all other actual27d243 report bytes');
 // The shared visible-copy/download projection is the second declared report
 // exception. Reverse its exact additions to its independently read parent.
 const viewParent='bb532faa5c0b4a5ea4072832e661fac5e1e01452b854581c00f778a95e6cd84f';
 let view=read('../dist/report-view.js');
 const viewAdditions=[
  ["/** The registered finale's observer omits the boss row until actual reveal.\n * Row presence, including zero after death, is the retained visibility fact. */\nexport function reportConcealsFinale(report) {\n  const identity = report?.identity;\n  return report?.version === 2 && identity?.ruleset.id === 'frontier-campaign-last-engine-r2' && identity.ruleset.revision === 1 &&\n    identity.scenario.kind === 'campaign' && identity.scenario.id === 'the-last-engine' && identity.scenario.revision === 1 &&\n    report.final.sides.every(side => !side.unitComposition.some(unit => unit.type === 'colossus'));\n}\n",''],
  ["  const concealed = reportConcealsFinale(report);\n  const ruleName = concealed ? 'Campaign · The Last Fortress' : rules.name;\n  const ruleId = concealed ? 'Final fortress rules' : identity.ruleset.id;\n  const scenarioId = concealed ? 'The Last Fortress' : identity.scenario.id;\n",''],
  ['escape(ruleName)','escape(rules.name)'],['escape(ruleId)','escape(identity.ruleset.id)'],['escape(scenarioId)','escape(identity.scenario.id)'],
  ["${reportConcealsFinale(report) ? '<p class=\"report-note\">JSON includes exact technical encounter identifiers and may reveal encounter details.</p>' : ''}",''],
 ];
 for(const [addition,parent] of viewAdditions){assert.equal(view.split(addition).length-1,1,'exact report presentation addition');view=view.replace(addition,parent);}
 assert.equal(createHash('sha256').update(view).digest('hex'),viewParent,'all other actual27d243 report presentation bytes');
 // One post-reveal announcement sentence, against the actual30b0b57 parent.
 const cueParent='5bb7ec2cf1f5619a5c35d6ff7e0b445ef9990420fe46b247f431922c7eac1c9c';
 const cue='The Last Engine is emerging and can take damage. All three roads can attack its body.';
 let engineView=read('../dist/final-chapter-view.js');assert.equal(engineView.split(cue).length-1,1);
 engineView=engineView.replace(cue,'The Last Engine is emerging and can take damage.');
 assert.equal(createHash('sha256').update(engineView).digest('hex'),cueParent,'all other actual30b0b57 reveal/presentation bytes');
 // Art and audio settings exceptions preserve the original runtime oracle.
 // The frozen profile is independently checked against protocol32 by audio-preferences.
 const profileParent = createHash('sha256').update(read('./fixtures/profile-session-v0401.js')).digest('hex');
 let backup = read('../dist/backup.js');
 for (const [addition,parent] of [
  ["'volume', 'musicVolume', 'sfxVolume', 'reducedMotion'", "'volume', 'reducedMotion'"],
  ["if (['volume', 'musicVolume', 'sfxVolume'].includes(key))", "if (key === 'volume')"],
 ]) { assert.equal(backup.split(addition).length-1,1); backup=backup.replace(addition,parent); }
 const backupParent='2b9d5a3b34a9daae2b2d9a43c365f7bd20a0091944c90020ecb7d486830b1d06';
 assert.equal(createHash('sha256').update(backup).digest('hex'),backupParent);
 const renderParent=createHash('sha256').update(rendererBeforeObliqueArt()).digest('hex');
 const fogParent=createHash('sha256').update(fogViewBeforeLocomotion()).digest('hex');
 let sw=read('../dist/service-worker.js');assert.equal(sw.split('ironroot-v0.40.3').length-1,1);sw=sw.replace('ironroot-v0.40.3','ironroot-v0.40.0');
 const upgradeAsset="  './building-upgrade-view.js',\n";
 assert.equal(sw.split(upgradeAsset).length-1,1);sw=sw.replace(upgradeAsset,'');
 const rewardAsset="  './reward-feedback.css',\n";
 assert.equal(sw.split(rewardAsset).length-1,1);sw=sw.replace(rewardAsset,'');
 const swParent='2d81977dc8cfcd71a365091bc449f0fd8ee7bd0b1464af69ce471db60918be12';assert.equal(createHash('sha256').update(sw).digest('hex'),swParent);
 const files=currentRuntimeFiles(),stable=Object.entries(files.files).filter(([path])=>!['app.js','index.html','styles.css','building-upgrade-view.js','reward-feedback.css'].includes(path)).map(([path,hash])=>[path,path==='fog-view.js'?fogParent:path==='profile-session.js'?profileParent:path==='backup.js'?backupParent:path==='render.js'?renderParent:path==='service-worker.js'?swParent:path==='battle-report.js'?reportParent:path==='report-view.js'?viewParent:path==='final-chapter-view.js'?cueParent:hash]);assert.equal(files.runtimeFiles,69);assert.equal(stable.length,64);assert.equal(createHash('sha256').update(JSON.stringify(stable)).digest('hex'),'7ac3de73da8a0b93408dde4d5229b22a47eda6edf1273e1c9a769814ce536af1');
});
