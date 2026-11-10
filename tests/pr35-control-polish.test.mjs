/** Current-source DOM stubs and source calculations; no browser or graphics run. */
import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';import {runInContext} from 'node:vm';
import {Game,buildBounds} from '../dist/engine.js';import * as campaign from '../dist/campaign.js';import {CURRENT_PROFILE_PROTOCOL_VERSION} from '../dist/profile-session.js';import {renderMissionScouting} from '../dist/scouting.js';import {startupHarness,installBattlePointerHandlers} from './mobile-startup-fixture.mjs';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8'),source=read('../dist/app.js'),html=read('../dist/index.html'),css=read('../dist/styles.css');
const section=(from,to)=>{const start=source.indexOf(from),end=source.indexOf(to,start);assert.ok(start>=0&&end>start,from);return source.slice(start,end);};
function harness({start=true,width=1180,height=850}={}){
 const h=startupHarness({width,height}),{c:app}=h;Object.assign(app,{labels:{},buildBounds,renderMissionScouting,trialRecords:{}});app.renderer.snap=p=>p;
 for(const [from,to]of [['function populateBuildCards()','populateBuildCards();'],['function selectBuild(','function cancel()'],["$('rally').onclick =",'function pauseControl('],['function activateBattlePoint(','function resetBattleGesture()'],["$('speed').onclick =", "$('sound').onclick ="],["for (const btn of document.querySelectorAll('[data-difficulty]'))",'function holdBattleSafety('],['function renderChallenge()','function setMode(']])runInContext(section(from,to),app);
 h.field=installBattlePointerHandlers(h);
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
for(const pointerType of ['touch','mouse'])test(`old ${pointerType} field release cannot cast a newly armed Volley; a fresh gesture pays exactly once`,()=>{
 const h=harness(),{c:app,$,field}=h,before=app.game.serialize();
 field.emit('pointerdown',1,{pointerType});assert.equal(field.captured.has(1),true);
 $('rally').onclick();selected(h,null,true);assert.equal(field.captured.has(1),false);
 field.emit('pointerup',1,{pointerType});selected(h,null,true);
 assert.deepEqual(app.game.serialize(),before,'old release leaves gold, cooldown, tick and RNG unchanged');
 field.emit('pointerdown',2,{pointerType});field.emit('pointerup',2,{pointerType});selected(h);
 assert.equal(app.game.state.gold[0],before.state.gold[0]-app.game.ruleset.spell.cost);
 assert.equal(app.game.state.spellCooldown[0],app.game.ruleset.spell.cooldown);
 const after=app.game.serialize();field.emit('pointerup',2,{pointerType});assert.deepEqual(app.game.serialize(),after);
});
test('armed field gesture is retired by cancel/rearm, including repeated state transitions',()=>{
 const h=harness(),{c:app,$,field}=h,before=app.game.serialize();
 for(let id=1;id<=3;id++){
  $('rally').onclick();selected(h,null,true);field.emit('pointerdown',id);
  $('rally').onclick();selected(h);assert.equal(field.captured.has(id),false);
  $('rally').onclick();selected(h,null,true);field.emit('pointerup',id);
  assert.deepEqual(app.game.serialize(),before);selected(h,null,true);$('rally').onclick();selected(h);
 }
});
for(const probe of ['gold','cooldown'])test(`armed Volley can cancel after controlled ${probe} change without payment`,()=>{
 const h=harness(),{c:app,$,field}=h;$('rally').onclick();selected(h,null,true);
 // Robustness probes, not claims that these changes naturally occur while armed.
 if(probe==='gold')app.game.state.gold[0]=0;else app.game.state.spellCooldown[0]=3;
 const before=app.game.serialize();field.emit('pointerdown',1);$('rally').onclick();selected(h);
 assert.equal(field.captured.has(1),false);field.emit('pointerup',1);assert.deepEqual(app.game.serialize(),before);
 $('rally').onclick();selected(h);assert.deepEqual(app.game.serialize(),before,'unavailable Volley cannot newly arm');
});
for(const blocked of ['paused','hidden','dialog','profile','ended'])test(`${blocked} state rejects Volley arming without changing the battle`,()=>{
 const h=harness(),{c:app,$}=h;
 if(blocked==='paused')app.paused=true;if(blocked==='hidden')app.document.hidden=true;
 if(blocked==='dialog')$('settingsModal').classList.remove('hidden');
 if(blocked==='profile')app.profileGate={message:'Reload required'};if(blocked==='ended')app.game.state.winner=1;
 const before=app.game.serialize();$('rally').onclick();selected(h);assert.deepEqual(app.game.serialize(),before);
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
test('v0.39.2 metadata retains protocol30,37 missions/111 stars and literal canonical engine/audio/profile source',()=>{
 const pkg=JSON.parse(read('../package.json')),desktop=JSON.parse(read('../desktop/package.json')),lock=JSON.parse(read('../desktop/package-lock.json'));assert.equal(pkg.version,'0.39.2');assert.equal(desktop.version,pkg.version);assert.equal(lock.version,pkg.version);assert.equal(lock.packages[''].version,pkg.version);assert.match(read('../dist/service-worker.js'),/const VERSION = 'ironroot-v0\.39\.2';/);assert.match(html,/v0\.39\.2/);assert.equal(CURRENT_PROFILE_PROTOCOL_VERSION,30);const overview=campaign.getProgressionCampaignOverview(campaign.createCampaignProgress());assert.equal(overview.total,37);assert.equal(overview.maxStars,111);assert.equal(overview.chapters.some(c=>c.number===10),false);
 const sha=p=>createHash('sha256').update(read(p)).digest('hex');for(const [path,expected]of [['engine.js','c750484509dfaeb8d6e4179bd27abe0956208dc7a4c48eab24a2b6cf8515b092'],['audio.js','7e5921c056ab468b5de8c97cee1b5b930ef2e501136eb08cb715822f3c7b782a'],['profile-session.js','edcb542e6035ff87e8786922c10396cd29f624ee09c6033f2dccb8b3059f8e42']])assert.equal(sha('../dist/'+path),expected,'released d27e45c '+path);
});
