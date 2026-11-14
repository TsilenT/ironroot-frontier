/** Source-derived handlers in a DOM stub; no browser, canvas or renderer executes. */
import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {runInContext} from 'node:vm';
import {startupHarness} from './mobile-startup-fixture.mjs';import * as campaign from '../dist/campaign.js';import {advanceObjectiveBattle} from '../dist/objectives.js';import {supportsCitadelOptions} from '../dist/citadel-options.js';import {encodeBattle,decodeBattle} from '../dist/battle-codec.js';
const source=readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');
const section=(a,b)=>{const start=source.indexOf(a),end=source.indexOf(b,start);assert.ok(start>=0&&end>start);return source.slice(start,end);};
const earned=()=>({...campaign.createCampaignProgress(),missions:Object.fromEntries(campaign.CAMPAIGN_PROGRESS_MISSIONS.filter(m=>m.id!=='the-last-engine').map(m=>[m.id,{completed:true,stars:1,bestTime:60}]))});
test('actual frame advancement, input, save and citadel handlers keep core-first aftermath running',()=>{
 const {c:app,$}=startupHarness({width:1180,height:850}),announcements=watchText($('protectedAlert'));app.campaignProgress=earned();const g=campaign.createProgressionCampaignMission('the-last-engine',app.campaignProgress);app.start(g,null,'the-last-engine');app.updateHUD();assert.match($('objectiveProgress').textContent,/fortress/i);assert.equal($('objectiveTime').textContent,'No deadline');assert.doesNotMatch($('phase').textContent,/Engine/i);
 assert.equal(announcements.filter(Boolean).length,0);assert.doesNotMatch($('protectedAlert').textContent,/Engine|All three roads can attack/);
 // Explicit synthetic core-first fixture, not the paid route: engine triggers normally.
 g.state.buildings=[];g.state.units=[];g.state.bases[1].hp=0;g.update(.05);app.refreshPresentation();app.updateHUD();assert.match($('objectiveProgress').textContent,/Defeat the Last Engine/);assert.equal(app.canInteract(),true);
 assert.equal(announcements.filter(Boolean).length,1);assert.match(announcements.filter(Boolean)[0],/All three roads can attack its body/);
 const revealed=g.serialize();for(let n=0;n<8;n++)app.updateHUD();assert.equal(announcements.filter(Boolean).length,1);assert.deepEqual(g.serialize(),revealed);
 Object.assign(app,{supportsCitadelOptions,advanceObjectiveBattle,saveTimer:0,sampleBattleReport(){},finishCalls:0,finish(){app.finishCalls++;},SAVE:'active-battle',saveWarning:false});
 runInContext(section('function citadelDialogSafe()','function updateCitadelUI()'),app);assert.equal(app.citadelDialogSafe(),true);assert.equal(g.buyCitadelOption('regen').ok,true);assert.equal(g.buyCitadelOption('regen',1).ok,false);assert.equal(g.build('archery',690,g.map.lanes[0]).ok,true);
 const start=source.indexOf('  if (started && !paused && !coachingHold',source.indexOf('function frame(now)')),end=source.indexOf('  refreshPresentation();',start);runInContext('function advanceAppWithoutRendering(dt){'+source.slice(start,end)+'}',app);const before=g.state.time;app.advanceAppWithoutRendering(.05);assert.ok(g.state.time>before);assert.equal(app.objectiveOutcome,null);assert.equal(app.resultShown,false);
 let packet=null;app.writeBattle=(_session,_key,game,_challenge,id,opts)=>{packet=encodeBattle(game,campaign.campaignScenarioForGame(game,id),opts);return true;};runInContext(section('function save()','function updateResume()'),app);assert.equal(app.save(),true);assert.deepEqual(decodeBattle(packet,{campaignProgress:app.campaignProgress}).game.serialize(),g.serialize());
 // The real finish guard must not produce history/progress before the objective.
 runInContext(section('function finish()','let pointer ='),app);app.finish();assert.equal(app.resultShown,false);assert.equal(app.campaignProgress.missions['the-last-engine'],undefined);
});
for(const [id,labels]of [['below-the-ramparts',['North Breach Post','Middle Breach Post','South Breach Post']],['the-last-granary',['North Supply Mine','South Supply Mine']],['no-fires-tonight',['North Command Post']]])test(`${id}: actual objective controls show original named targets without invented protected goals`,()=>{
 const {c:app,$}=startupHarness({width:1180,height:850});app.campaignProgress=earned();app.fogRenderer=app.renderer;app.start(campaign.createProgressionCampaignMission(id,app.campaignProgress),null,id);app.updateHUD();assert.deepEqual(Array.from(app.objectiveFocusTargets(),t=>t.label),labels);assert.equal(app.protectedControls.size,labels.length);if(id==='no-fires-tonight'){assert.match($('protectedTargets').attributes['aria-label'],/North Command Post/);assert.doesNotMatch($('protectedTargets').attributes['aria-label'],/customs/);assert.equal(app.objectiveFocusTargets()[0].percent,null);}
});

// Observe actual live-region writes, not just final strings: assigning the same
// text on every HUD refresh would still be an accessibility regression.
function watchText(node){
 const changes=[],descriptor=Object.getOwnPropertyDescriptor(Object.getPrototypeOf(node),'textContent');
 Object.defineProperty(node,'textContent',{get(){return descriptor.get.call(this);},set(value){changes.push(value);descriptor.set.call(this,value);}});
 return changes;
}
function revealedFixture(mode){
 const h=startupHarness({width:1180,height:850}),{c:app,$}=h;
 app.campaignProgress=earned();const g=campaign.createProgressionCampaignMission('the-last-engine',app.campaignProgress);
 // Synthetic source/DOM fixture only. No paid-route or difficulty claim.
 g.state.buildings=[];g.state.units=[];g.state.bases[1].hp=600;g.update(.05);
 for(let n=0;n<500&&app.lastEngineView(g).mode!==mode;n++)g.update(.05);
 assert.equal(app.lastEngineView(g).mode,mode);
 const announcements=watchText($('protectedAlert')),toasts=[];app.toast=text=>toasts.push(text);
 app.start(g,null,'the-last-engine');return {...h,g,announcements,toasts};
}
for(const mode of ['emerging','approach','siege'])test(`${mode}: same-mode core fall announces the remaining goal once; current HP is inspectable without tick chatter`,()=>{
 const {c:app,$,g,announcements,toasts}=revealedFixture(mode),messages=()=>announcements.filter(Boolean),boss=g.state.units.find(u=>u.type==='colossus');
 assert.equal(messages().length,1);assert.match(messages()[0],/Last Engine/);assert.ok(messages()[0].length<180,'the immediate cue is concise');assert.doesNotMatch(messages()[0],/310|rear production|extra deadline/);
 if(mode==='emerging')assert.match(messages()[0],/All three roads can attack its body/);
 const focus=$('pause');focus.focus();let before=g.serialize();for(let i=0;i<8;i++)app.updateHUD();assert.deepEqual(g.serialize(),before);assert.equal(messages().length,1);assert.equal(app.document.activeElement,focus);
 g._damage(boss,123,0);app.updateHUD();assert.match($('objectiveProgress').attributes['aria-label'],/Last Engine health 9877 of 10000 HP/);assert.match($('objectiveProgress').textContent,/9877\/10000 HP/);assert.equal(messages().length,1,'HP-only change is inspectable, not a live announcement');
 g.state.bases[1].hp=0;g.update(.05);assert.equal(app.lastEngineView(g).mode,mode);app.updateHUD();assert.equal(messages().length,2);assert.match(messages()[1],/Enemy citadel destroyed\. Defeat the Engine/);assert.doesNotMatch(messages()[1],/Mission complete|Destroy.*enemy citadel/);
 before=g.serialize();for(let i=0;i<8;i++)app.updateHUD();assert.deepEqual(g.serialize(),before);assert.equal(messages().length,2);assert.equal(app.document.activeElement,focus);
 assert.equal(toasts.some(text=>/Last Engine|Defeat the Engine|citadel destroyed/.test(text)),false,'the Engine cue has one live channel, not a duplicate toast');assert.match(app.lastEngineView(g).description,/All three roads.*Volley.*rear production/,'detailed counterplay remains inspectable in pause');
});
test('phase changes are announced once, independently of HP updates and without focus or simulation changes',()=>{
 const {c:app,$,g,announcements}=revealedFixture('emerging'),messages=()=>announcements.filter(Boolean);
 for(let i=0;i<60;i++)g.update(.05);assert.equal(app.lastEngineView(g).mode,'approach');const before=g.serialize();app.updateHUD();app.updateHUD();assert.deepEqual(g.serialize(),before);assert.equal(messages().length,2);assert.match(messages()[1],/approaching midfield/);
});
for(const coreFirst of [false,true])test(`${coreFirst?'core-first':'boss-first'} reveal completion announces factual remaining and completed goals`,()=>{
 const {c:app,$,g,announcements}=revealedFixture('emerging'),messages=()=>announcements.filter(Boolean);
 if(coreFirst){g.state.bases[1].hp=0;g.update(.05);app.updateHUD();assert.match(messages().at(-1),/Enemy citadel destroyed\. Defeat the Engine/);}
 const boss=g.state.units.find(u=>u.type==='colossus');g._damage(boss,boss.hp,0);g.update(.05);app.updateHUD();
 if(!coreFirst){assert.match(messages().at(-1),/Engine is defeated\. Destroy the enemy citadel/);assert.doesNotMatch(messages().at(-1),/Mission complete/);g.state.bases[1].hp=0;g.update(.05);app.updateHUD();}
 assert.equal(g.state.winner,0);assert.match(messages().at(-1),/Enemy citadel and Last Engine destroyed.*Mission complete/);assert.doesNotMatch(messages().at(-1),/Defeat|Destroy the enemy citadel/);assert.match($('objectiveProgress').attributes['aria-label'],/Mission complete/);const count=messages().length;app.updateHUD();assert.equal(messages().length,count);
});
for(const mode of ['emerging','approach','siege'])test(`${mode}: real active codec restore and app re-entry announce the current goal once`,()=>{
 const {c:app,$,g,announcements}=revealedFixture(mode);g.state.bases[1].hp=0;g.update(.05);const ref=campaign.campaignScenarioForGame(g,'the-last-engine'),packet=encodeBattle(g,ref,{campaignProgress:app.campaignProgress}),restored=decodeBattle(packet,{campaignProgress:app.campaignProgress}).game;
 announcements.length=0;app.start(restored,null,'the-last-engine');app.updateHUD();app.updateHUD();let messages=announcements.filter(Boolean);assert.equal(messages.length,1);assert.match(messages[0],/Enemy citadel destroyed\. Defeat the Engine/);assert.match($('objectiveProgress').attributes['aria-label'],new RegExp(`Last Engine health ${Math.ceil(restored.state.units.find(u=>u.type==='colossus').hp)} of 10000 HP`));
 announcements.length=0;app.start(restored,null,'the-last-engine');app.updateHUD();messages=announcements.filter(Boolean);assert.equal(messages.length,1,'a deliberate re-entry resets delivery once, without tick repetition');assert.deepEqual(restored.serialize(),decodeBattle(packet,{campaignProgress:app.campaignProgress}).game.serialize());
});
for(const draw of [false,true])test(`${draw?'draw':'loss'} after reveal announces terminal facts without stale attack instructions`,()=>{
 const {c:app,g,announcements}=revealedFixture('emerging');g.state.bases[0].hp=0;if(draw){g.state.bases[1].hp=0;const boss=g.state.units.find(u=>u.type==='colossus');g._damage(boss,boss.hp,0);}g.update(.05);app.updateHUD();const message=announcements.filter(Boolean).at(-1);assert.match(message,draw?/both citadels fell\. Draw\./:/Your citadel fell\. Mission failed\./);assert.doesNotMatch(message,/keep yours|Defeat|Destroy/);
});
test('boss-first running restore announces the remaining fortress goal once',()=>{
 const {c:app,g,announcements}=revealedFixture('emerging'),boss=g.state.units.find(u=>u.type==='colossus');g._damage(boss,boss.hp,0);g.update(.05);assert.equal(g.state.winner,null);const ref=campaign.campaignScenarioForGame(g,'the-last-engine'),packet=encodeBattle(g,ref,{campaignProgress:app.campaignProgress}),restored=decodeBattle(packet,{campaignProgress:app.campaignProgress}).game;
 announcements.length=0;app.start(restored,null,'the-last-engine');app.updateHUD();app.updateHUD();const messages=announcements.filter(Boolean);assert.equal(messages.length,1);assert.match(messages[0],/Engine is defeated\. Destroy the enemy citadel/);assert.doesNotMatch(messages[0],/Mission complete|Defeat the Engine/);assert.deepEqual(restored.serialize(),g.serialize());
});

for(const [width,height,mobile]of [[320,430,true],[390,650,true],[844,390,true],[1180,850,false]])test(`finale ${width}x${height}: compact mobile goals retain full accessible facts and exact simulation`,()=>{
 for(const coreFirst of [false,true]){
  const {c:app,$}=startupHarness({width,height});app.campaignProgress=earned();
  const g=campaign.createProgressionCampaignMission('the-last-engine',app.campaignProgress);
  g.state.buildings=[];g.state.units=[];g.state.bases[1].hp=600;g.update(.05);app.start(g,null,'the-last-engine');
  const check=()=>{const view=app.lastEngineView(g),before=g.serialize();app.updateHUD();
   assert.equal($('objectiveProgress').textContent,mobile?view.mobileHudLabel:view.hudLabel);
   assert.equal($('objectiveProgress').attributes['aria-label'],view.accessibleLabel);
   assert.equal($('objectiveTime').textContent,view.phaseCue+' · No deadline');assert.deepEqual(g.serialize(),before);
   return view;
  };
  let view=check();assert.equal(view.mobileHudLabel,'Destroy Engine + citadel · 10000/10000 HP');assert.match(view.accessibleLabel,/keep your citadel standing/);
  if(coreFirst){g.state.bases[1].hp=0;g.update(.05);view=check();assert.equal(view.mobileHudLabel,'Citadel down · Engine 10000/10000 HP');assert.match(view.accessibleLabel,/Enemy citadel destroyed\. Defeat the Last Engine/);}
  const boss=g.state.units.find(u=>u.type==='colossus');g._damage(boss,boss.hp,0);g.update(.05);view=check();
  if(!coreFirst){assert.equal(view.mobileHudLabel,'Engine down · destroy citadel');assert.match(view.accessibleLabel,/Destroy the enemy citadel/);g.state.bases[1].hp=0;g.update(.05);view=check();}
  assert.equal(view.mobileHudLabel,'Engine + enemy citadel destroyed');assert.match(view.accessibleLabel,/Mission complete/);
 }
});
