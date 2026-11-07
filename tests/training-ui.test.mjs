import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createTrainingGesture, createTrainingChoices, trainingScope, trainingIncome, trainingClock, syncTrainingVisuals, trainingFeedback, trainingActionLine, trainingCoachScroll, createTrainingCoachAlignment } from '../dist/training-app.js';
import { createInputScopeGuard } from '../dist/input-scope.js';
import { TrainingSession } from '../dist/training.js';
import { BattleVFX } from '../dist/vfx.js';

const pointer = (pointerId=1, pointerType='touch') => ({pointerId,pointerType,isPrimary:true});
const click = (pointerId=1,pointerType='touch') => ({...pointer(pointerId,pointerType),detail:1,isTrusted:true});

test('choosing a build and cancelling are never paid placements', () => {
  const session = new TrainingSession(), choices = createTrainingChoices(session);
  const gold = session.game.state.gold[0], count = session.game.state.buildings.length;
  assert.equal(choices.choose('barracks').ok,true);
  assert.equal(session.game.state.gold[0],gold);
  assert.equal(session.game.state.buildings.length,count);
  choices.reset();
  assert.equal(choices.place(1110,450).ok,false);
  assert.equal(session.game.state.gold[0],gold);
});

test('explicit chosen-site placement spends real gold once and clears the build choice', () => {
  const session = new TrainingSession(), choices = createTrainingChoices(session);
  choices.choose('barracks');
  assert.equal(choices.place(1110,450).ok,true);
  assert.equal(session.game.state.gold[0],140);
  assert.equal(session.game.state.buildings.length,1);
  assert.equal(choices.build,null);
  assert.equal(choices.place(1110,450).ok,false);
  assert.equal(session.game.state.gold[0],140);
  assert.equal(session.game.state.time,0);
});

test('unavailable cards and wrong sites cannot pay or complete a lesson', () => {
  const session = new TrainingSession(), choices = createTrainingChoices(session);
  assert.equal(choices.choose('foundry').ok,false);
  choices.choose('barracks');
  assert.equal(choices.place(970,450).ok,false);
  assert.equal(session.game.state.gold[0],280);
  assert.equal(session.snapshot().status,'instruction');
  assert.equal(choices.build,'barracks','failed placement can be corrected or cancelled');
});

test('upgrade requires explicit owned-building selection and real payment', () => {
  const session = new TrainingSession({lessonId:'mine-and-upgrade'}), choices = createTrainingChoices(session);
  choices.choose('mint'); choices.place(410,450); session.continue(); session.continue();
  for (let i=0;i<50;i++) session.update(.05);
  session.continue();
  const mine = session.game.state.buildings.find((b)=>b.type==='mint');
  assert.equal(session.snapshot().step.kind,'upgrade');
  const gold = session.game.state.gold[0];
  assert.equal(choices.upgrade().ok,false);
  assert.equal(choices.select(-1).ok,false);
  assert.equal(choices.select(mine.id).ok,true);
  assert.equal(choices.upgrade().ok,true);
  assert.equal(mine.level,2);
  assert.ok(Math.abs(session.game.state.gold[0]-(gold-133))<1e-8);
});

for (const [name,x,y,expected] of [['still',0,0,true],['8 pixels',8,0,true],['over 8 pixels',8.01,0,false],['vertical drag',0,9,false],['diagonal drag',6,6,false]]) {
  test(`${name}: threshold controls tap versus pan without time heuristics`, () => {
    const gesture = createTrainingGesture();
    gesture.start(1,0,0);
    const movement=gesture.move(1,x,y);
    assert.equal(movement.dragging,!expected);
    assert.equal(gesture.end(1,x,y),expected);
  });
}

test('drag away and back never turns into a tap; release-only movement is checked', () => {
  const gesture=createTrainingGesture();
  gesture.start(1,0,0); gesture.move(1,12,0); gesture.move(1,0,0);
  assert.equal(gesture.end(1,0,0),false);
  gesture.start(2,0,0);
  assert.equal(gesture.end(2,20,0),false);
});

test('multiple contacts and lost capture do not place, while a fresh press works', () => {
  const gesture=createTrainingGesture();
  gesture.start(1,0,0); gesture.start(2,0,0);
  assert.equal(gesture.end(1,0,0),false); assert.equal(gesture.end(2,0,0),false);
  gesture.start(3,0,0); gesture.cancel(); assert.equal(gesture.end(3,0,0),false);
  gesture.start(4,0,0); assert.equal(gesture.end(4,0,0),true);
});

for (const type of ['mouse','touch','pen']) {
  test(`${type}: result, retry, skip and pause scopes reject held release and trailing click`, () => {
    const session = new TrainingSession();
    const guard=createInputScopeGuard(trainingScope(session.snapshot()));
    for (const action of [()=>session.build('barracks',1110,450),()=>session.retry(),()=>session.skip(),()=>session.setPaused(true)]) {
      guard.pointerDown(pointer(1,type));
      action(); guard.setScope(trainingScope(session.snapshot()));
      assert.equal(guard.pointerEnd(pointer(1,type)),true);
      assert.equal(guard.click(click(1,type)),true);
      guard.pointerDown(pointer(2,type));
      assert.equal(guard.pointerEnd(pointer(2,type)),false);
      assert.equal(guard.click(click(2,type)),false);
    }
  });
}

test('same lesson and step on replay still has a new attempt input scope', () => {
  const session=new TrainingSession(), before=trainingScope(session.snapshot());
  session.retry();
  assert.notEqual(trainingScope(session.snapshot()),before);
});

test('lesson runtime has no save/profile/report dependencies, storage access or network calls', () => {
  const source=readFileSync(new URL('../dist/training-app.js',import.meta.url),'utf8');
  const html=readFileSync(new URL('../dist/training.html',import.meta.url),'utf8');
  assert.doesNotMatch(source,/\b(localStorage|sessionStorage|indexedDB|fetch|XMLHttpRequest)\b/);
  assert.doesNotMatch(source,/from ['"].*(persistence|profile-session|backup|battle-report|app\.js)/);
  assert.doesNotMatch(source,/navigator\.serviceWorker|register\(/);
  assert.match(html,/href="\.\/" id="returnGame"/);
  assert.match(html,/Practice saves no progress, history or rewards/);
  assert.match(html,/saved battle and progress stay untouched/);
  assert.doesNotMatch(html,/<script[^>]+src="\.\/app\.js"/);
});

test('document wires capture guards, interruptions and bfcache reset', () => {
  const source=readFileSync(new URL('../dist/training-app.js',import.meta.url),'utf8');
  for (const method of ['pointerDown','pointerEnd','click','keyDown','keyUp','interrupt','setScope']) assert.ok(source.includes(`inputScope.${method}(`),method);
  for (const event of ['visibilitychange','blur','pagehide','pageshow','lostpointercapture']) assert.ok(source.includes(`'${event}'`),event);
  assert.match(source,/event\.persisted[\s\S]*session = createCurrentTrainingSession\(\)/);
  assert.match(source,/event\.target\?\.closest\('button,a,select,input,textarea,summary/);
  assert.match(source,/if \(snapshot\.shouldRun\) \{\s*session\.setPaused\(true\)/);
});

test('review does not turn skipped lessons into completion claims', () => {
  const source=readFileSync(new URL('../dist/training-app.js',import.meta.url),'utf8');
  assert.match(source,/snapshot\.summary\.completed/);
  assert.match(source,/Skipped lessons do not count as completed/);
  assert.match(source,/result\?\.outcome \|\| 'not attempted'/);
  assert.doesNotMatch(source,/You have practiced paid placement/);
});


test('displayed mine income updates during paused build and upgrade instructions', () => {
  const session = new TrainingSession({lessonId:'mine-and-upgrade'});
  assert.equal(trainingIncome(session.game),5);
  session.build('mint',410,450);
  assert.equal(session.game.state.time,0);
  assert.equal(session.game.state.income[0],5,'cached engine income waits for a tick');
  assert.equal(trainingIncome(session.game),7.5);
  session.continue(); session.continue();
  for (let i=0;i<50;i++) session.update(.05);
  session.continue();
  const mine=session.game.state.buildings.find((b)=>b.type==='mint');
  session.upgrade(mine.id);
  assert.equal(trainingIncome(session.game),8.75);
  mine.hp=0;
  assert.equal(trainingIncome(session.game),5,'destroyed mines add no displayed income');
});


test('display clock tolerates exact fixed-step boundaries without changing ordinary times', () => {
  assert.equal(trainingClock(59.99999999999873),'1:00');
  assert.equal(trainingClock(59.9),'0:59');
  assert.equal(trainingClock(0),'0:00');
  assert.equal(trainingClock(120),'2:00');
});


test('new Game identity resets paused VFX; steps and pause on the same Game retain effects', () => {
  const session = new TrainingSession();
  const renderer = {vfx:new BattleVFX()};
  let previous = syncTrainingVisuals(renderer,session.game,null);
  const effect = {x:1110,y:450,type:'blast',side:0,life:.7,maxLife:.7,radius:55};
  renderer.vfx.update([effect],.05);
  const before = renderer.vfx.getStats(), shake = renderer.vfx.getShake();
  assert.ok(before.particles>0);
  session.build('barracks',1110,450); session.continue(); session.continue(); session.setPaused(true);
  previous = syncTrainingVisuals(renderer,session.game,previous);
  renderer.vfx.update([],1,{paused:true});
  assert.deepEqual(renderer.vfx.getStats(),before,'same attempt retains frozen particles across step and pause');
  assert.deepEqual(renderer.vfx.getShake(),shake);
  session.retry();
  previous = syncTrainingVisuals(renderer,session.game,previous);
  assert.equal(renderer.vfx.getStats().particles,0);
  assert.equal(renderer.vfx.getStats().spawned,0);
  assert.deepEqual(renderer.vfx.getShake(),{x:0,y:0});
  renderer.vfx.update([effect],0);
  assert.ok(renderer.vfx.getStats().particles>0,'reset also clears old effect identity tracking');
  session.startLesson('siege-the-tower');
  previous = syncTrainingVisuals(renderer,session.game,previous);
  assert.equal(renderer.vfx.getStats().particles,0,'different lesson is a new Game');
});

test('bfcache-style fresh session clears VFX even when attemptId is reused', () => {
  const first = new TrainingSession(), restored = new TrainingSession();
  assert.equal(first.snapshot().attemptId,restored.snapshot().attemptId);
  const renderer = {vfx:new BattleVFX()};
  const previous = syncTrainingVisuals(renderer,first.game,null);
  renderer.vfx.update([{x:600,y:450,type:'build',side:0,life:.7,maxLife:.7,radius:55}],0);
  assert.ok(renderer.vfx.getStats().particles>0);
  syncTrainingVisuals(renderer,restored.game,previous);
  assert.equal(renderer.vfx.getStats().particles,0);
});

test('manual observation feedback is derived from pause state, not stale session text', () => {
  const active = {status:'active',paused:false,recovering:false,feedback:'Observation running at normal speed.'};
  assert.equal(trainingFeedback({...active,paused:true}),'Observation paused. Resume when ready.');
  assert.equal(trainingFeedback({...active,feedback:'Observation paused. Resume when ready.'}),'Observation running at normal speed.');
  assert.equal(trainingFeedback({...active,paused:true},'Observation paused while you were away. Resume when ready.'),'Observation paused while you were away. Resume when ready.');
  assert.equal(trainingFeedback({...active,recovering:true,paused:true}),'Income wait paused. Resume when ready.');
  assert.match(trainingFeedback({...active,recovering:true}),/^Waiting for gold\./);
  assert.equal(trainingFeedback(active,'Choose an available building.'),'Choose an available building.');
});

test('completed observation feedback supersedes a stale interaction error', () => {
  assert.equal(trainingFeedback({status:'lesson-complete',feedback:'The tracked target was defeated.'},'Unavailable card.'),'The tracked target was defeated.');
  assert.equal(trainingFeedback({status:'failed',feedback:'Time limit reached.'},'Unavailable card.'),'Time limit reached.');
});


test('portrait action line distinguishes choosing, selected paid placement, watch and pause', () => {
  const session = new TrainingSession(), choices = createTrainingChoices(session);
  assert.match(trainingActionLine(session.snapshot(),choices),/Choose Barracks below/);
  choices.choose('barracks');
  assert.match(trainingActionLine(session.snapshot(),choices),/Barracks selected.*140 gold/);
  choices.place(1110,450);
  assert.match(trainingActionLine(session.snapshot(),choices),/^Step complete/);
  session.continue();
  assert.match(trainingActionLine(session.snapshot(),choices),/Start observation below/);
  session.continue();
  assert.match(trainingActionLine(session.snapshot(),choices),/observing$/);
  session.setPaused(true);
  assert.match(trainingActionLine(session.snapshot(),choices),/Time paused.*Resume/);
});

test('portrait coach alignment uncovers card/site centers without hiding the canvas', () => {
  const field={top:0,bottom:334}, viewport=568;
  for(const rect of [{top:250,bottom:324},{top:560,bottom:604},{top:480,bottom:554}]) {
    const delta=trainingCoachScroll(rect,field,viewport);
    assert.ok(rect.top-delta>=field.bottom+8,'control is below sticky field');
    assert.ok(rect.bottom-delta<=viewport-8,'control is above viewport bottom');
  }
  assert.equal(trainingCoachScroll({top:400,bottom:474},field,viewport),0,'visible card does not jump');
});

function coachAlignmentFixture() {
  const calls = [], frames = new Map(), cancelled = [];
  let id = 0;
  const alignment = createTrainingCoachAlignment({
    align: (target) => calls.push(target),
    schedule: (callback) => { frames.set(++id,callback); return id; },
    cancel: (frame) => cancelled.push(frame),
  });
  return {alignment,calls,frames,cancelled};
}

test('native pointer focus cannot scroll between pointerdown and compatibility click', () => {
  const {alignment,calls,frames} = coachAlignmentFixture(), control = {};
  alignment.beginPointer(pointer());
  alignment.reveal(control); // Mouse focus on pointerdown.
  alignment.releasePointer(pointer());
  alignment.reveal(control); // Touch focus after pointerup and compatibility mousedown.
  assert.deepEqual(calls,[],'neither native focus sequence moves the pending tap target');
  assert.equal(frames.size,0,'focus must not leave a deferred mid-activation scroll');
  alignment.endActivation(click()); // Click capture, before the actual action handler.
  alignment.reveal(control); // Ordinary post-click uncovering remains available.
  assert.deepEqual(calls,[control]);
  frames.get(1)();
  assert.deepEqual(calls,[control,control],'sticky position receives its normal second alignment');
});

test('a fresh pointer cancels the preceding control alignment without a timing window', () => {
  const {alignment,calls,frames,cancelled} = coachAlignmentFixture(), oldControl = {}, newControl = {};
  alignment.reveal(oldControl);
  alignment.beginPointer(pointer());
  assert.deepEqual(cancelled,[1]);
  frames.get(1)(); // Even an already-queued stale callback cannot move the page.
  alignment.reveal(newControl);
  assert.deepEqual(calls,[oldControl]);
  alignment.releasePointer(pointer());alignment.endActivation(click());
  alignment.reveal(newControl);
  assert.deepEqual(calls,[oldControl,newControl],'the first independent activation needs no debounce');
});

test('keyboard and programmatic focus retain immediate uncovering and the newest RAF target', () => {
  const {alignment,calls,frames,cancelled} = coachAlignmentFixture(), heading = {}, control = {};
  alignment.beginPointer(pointer());alignment.releasePointer(pointer());
  alignment.keyboard(); // Keyboard input clears a completed activation without a click.
  alignment.reveal(heading);
  alignment.reveal(control);
  assert.deepEqual(calls,[heading,control]);
  assert.deepEqual(cancelled,[1]);
  frames.get(1)();frames.get(2)();
  assert.deepEqual(calls,[heading,control,control],'a previous heading cannot pull focus back');
  alignment.reveal(heading);
  alignment.interrupt(); // Window interruption.
  frames.get(3)();
  assert.deepEqual(calls,[heading,control,control,heading],'interrupted RAF never scrolls later');
});

test('native pointer focus suspension extends through pointerup and retains guarded click handling', () => {
  const source=readFileSync(new URL('../dist/training-app.js',import.meta.url),'utf8');
  assert.match(source,/addEventListener\('pointerdown',[^\n]*coachAlignment\.beginPointer\(event\)[^\n]*inputScope\.pointerDown\(event\)/);
  assert.doesNotMatch(source,/addEventListener\('pointerup',[^\n]*coachAlignment\.endActivation/);
  for(const [event,method] of [['pointerup','releasePointer'],['pointercancel','cancelPointer'],['click','endActivation']])
    assert.match(source,new RegExp(`addEventListener\\('${event}',[^\\n]*coachAlignment\\.${method}\\(event\\)`));
  assert.match(source,/addEventListener\('keydown',[^\n]*coachAlignment\.keyboard\(\)/);
  assert.match(source,/addEventListener\('click',[^\n]*if \(inputScope\.click\(event\)\) stop\(event\)[^\n]*capture:true/);
  assert.match(source,/addEventListener\('focusin', \(event\) => revealCoachControl\(event\.target\)\)/);
  assert.match(source,/addEventListener\('click', \(\) => revealCoachControl\(doc\.activeElement\)\)/);
});

for(const cancelAfterRelease of [false,true])test('cancelling a secondary contact preserves primary focus suspension '+(cancelAfterRelease?'after':'before')+' primary release', () => {
  const {alignment,calls} = coachAlignmentFixture(), control = {};
  const primary=pointer(1),secondary={...pointer(2),isPrimary:false};
  alignment.beginPointer(primary);alignment.beginPointer(secondary);
  if(cancelAfterRelease)alignment.releasePointer(primary);
  alignment.cancelPointer(secondary);
  alignment.reveal(control);
  if(!cancelAfterRelease)alignment.releasePointer(primary);
  const laterSecondary={...pointer(3),isPrimary:false};
  alignment.beginPointer(laterSecondary);alignment.cancelPointer(laterSecondary);
  alignment.reveal(control);
  alignment.endActivation(click(2)); // An unrelated contact cannot release the primary.
  alignment.reveal(control);
  assert.deepEqual(calls,[],'primary pointerup still waits for its compatibility click');
  alignment.endActivation(click(1));alignment.reveal(control);
  assert.deepEqual(calls,[control]);
});

test('each device activation ends independently and secondary pointerup leaves no abandoned contact', () => {
  const {alignment,calls} = coachAlignmentFixture(), control = {};
  const mouse=pointer(1,'mouse'),touch=pointer(2,'touch'),secondary={...pointer(3,'touch'),isPrimary:false};
  alignment.beginPointer(mouse);alignment.beginPointer(touch);alignment.beginPointer(secondary);
  alignment.releasePointer(mouse);alignment.releasePointer(touch);alignment.releasePointer(secondary);
  alignment.endActivation(click(2,'touch'));alignment.reveal(control);
  assert.deepEqual(calls,[],'touch click cannot clear a released mouse activation');
  alignment.endActivation(click(1,'mouse'));alignment.reveal(control);
  assert.deepEqual(calls,[control],'non-primary pointerup needs no compatibility click');
});

test('keyboard and synthetic clicks do not release a still-held native contact', () => {
  const {alignment,calls} = coachAlignmentFixture(), control = {};
  alignment.beginPointer(pointer());alignment.keyboard();
  alignment.endActivation({...click(),isTrusted:false});
  alignment.endActivation({...click(),detail:0});
  alignment.reveal(control);
  assert.deepEqual(calls,[]);
  alignment.cancelPointer(pointer());alignment.reveal(control);
  assert.deepEqual(calls,[control],'cancellation retires only the actual held contact');
});

test('interruption restores programmatic focus while the input scope still rejects stale input', () => {
  const {alignment,calls,frames} = coachAlignmentFixture(), oldControl = {}, newControl = {};
  const guard=createInputScopeGuard('old');
  alignment.reveal(oldControl);
  alignment.beginPointer(pointer());guard.pointerDown(pointer());
  alignment.interrupt();guard.interrupt();guard.setScope('new');
  frames.get(1)();
  alignment.reveal(newControl);
  assert.deepEqual(calls,[oldControl,newControl],'lost terminal events cannot strand portrait focus');
  alignment.releasePointer(pointer());assert.equal(guard.pointerEnd(pointer()),true);
  alignment.endActivation(click());assert.equal(guard.click(click()),true);
  alignment.beginPointer(pointer(2));guard.pointerDown(pointer(2));
  alignment.cancelPointer(pointer(1));alignment.endActivation(click(1));
  alignment.reveal(newControl);
  assert.deepEqual(calls,[oldControl,newControl],'a stale terminal event cannot release fresh held input');
  alignment.releasePointer(pointer(2));assert.equal(guard.pointerEnd(pointer(2)),false);
  alignment.endActivation(click(2));assert.equal(guard.click(click(2)),false);
  alignment.reveal(newControl);
  assert.deepEqual(calls,[oldControl,newControl,newControl],'first fresh click remains immediately usable');
});

test('fresh gestures retire abandoned compatibility clicks and legacy clicks retain attribution', () => {
  const {alignment,calls} = coachAlignmentFixture(), control = {};
  for(let id=1;id<=100;id++){
    alignment.beginPointer(pointer(id));alignment.releasePointer(pointer(id));
  }
  alignment.endActivation({detail:1,isTrusted:true,sourceCapabilities:{firesTouchEvents:true}});
  alignment.reveal(control);
  assert.deepEqual(calls,[control],'completed history is bounded to the latest activation per device type');
  alignment.beginPointer(pointer(101,'mouse'));alignment.releasePointer(pointer(101,'mouse'));
  alignment.endActivation({detail:1,isTrusted:true});alignment.reveal(control);
  assert.deepEqual(calls,[control,control],'legacy MouseEvents use the latest actual primary gesture');
});

test('blur hidden pagehide and bfcache restoration reset alignment without resetting stale input protection', () => {
  const source=readFileSync(new URL('../dist/training-app.js',import.meta.url),'utf8');
  assert.match(source,/function interrupt\(\) \{\s*coachAlignment\.interrupt\(\); inputScope\.interrupt\(\)/);
  assert.match(source,/addEventListener\('blur', interrupt\)/);
  assert.match(source,/addEventListener\('visibilitychange', \(\) => \{ if \(doc\.hidden\) interrupt\(\)/);
  assert.match(source,/addEventListener\('pagehide',[^\n]*coachAlignment\.interrupt\(\); inputScope\.interrupt\(\)/);
  assert.match(source,/if \(event\.persisted\) \{[\s\S]*?coachAlignment\.interrupt\(\); inputScope\.interrupt\(\); inputScope\.setScope\('restored-page'\)/);
});

test('portrait field height budget preserves all three lanes and minimum touch controls', () => {
  // CSS gives the canvas at least 200px, with the renderer's portrait 0.32 floor.
  const visibleMin=450-200/(2*.32), visibleMax=450+200/(2*.32);
  for (const lane of [260,450,640]) assert.ok(lane>visibleMin&&lane<visibleMax);
  const css=readFileSync(new URL('../dist/training.css',import.meta.url),'utf8');
  const source=readFileSync(new URL('../dist/training-app.js',import.meta.url),'utf8');
  assert.match(css,/\.field-panel\{position:sticky;top:0;z-index:5;height:auto;min-height:0/);
  assert.match(css,/height:clamp\(200px,27svh,220px\);min-height:200px/);
  assert.match(css,/\.map-controls button\{min-height:44px\}/);
  assert.match(source,/Math\.max\(portrait\(\) \? 0\.32 : 0\.12/);
  assert.match(source,/getBoundingClientRect\(\)\.height/);
  assert.match(source,/addEventListener\('focusin'/);
  assert.doesNotMatch(css,/\.coach[^}]*overflow(?:-y)?:\s*(?:auto|scroll)/,'coach does not create a second scroller');
});
