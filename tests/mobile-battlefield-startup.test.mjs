import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {startupHarness} from './mobile-startup-fixture.mjs';
const app=readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');

test('actual first protected launch and restore reveal and populate HUD before geometry measurement',()=>{
 for(const restored of [false,true])for(const [width,height]of [[320,480],[390,500],[320,568],[568,320],[844,390]]){
  const h=startupHarness({width,height});
  assert.equal(h.$('objectiveHUD').classList.contains('hidden'),true,'actual markup starts with a hidden HUD');
  const original=h.start(restored);
  assert.equal(h.$('objectiveHUD').classList.contains('hidden'),false);
  assert.equal(h.$('objectiveIdentity').textContent,'NORMAL · PROTECT');
  assert.ok(h.$('objectiveProgress').textContent.includes('2/2 protected'));
  assert.equal(h.c.protectedControls.size,2);
  for(const {button,health}of h.c.protectedControls.values()){
    assert.equal(button.getBoundingClientRect().height>=44,true);
    assert.equal(health.textContent,'100% HP');
  }
  assert.equal(h.c.paused,false,`${width}x${height} restore=${restored}`);
  assert.equal(h.c.viewportPause.active,false);
  assert.equal(h.log.measures.length,1);
  assert.equal(h.log.measures[0].filter(r=>!r.width||!r.height).length,0);
  assert.equal(h.log.saves,1);assert.equal(h.log.claims,1);
  assert.equal(h.c.game.state.time,0,'startup presentation cannot advance the battle');
  if(restored){assert.equal(h.c.game,original);assert.deepEqual(h.c.game.serialize(),h.fixture.envelope.game);}
 }
});
test('removing synchronous HUD initialization reproduces hidden-control false holds on fresh start and restore',()=>{
 const before=app.replace("  $('objectiveHUD').classList.toggle('hidden', !currentCampaign && !currentChallenge && !landscape && !portrait);", '').replace("  // Reveal and populate the real HUD before measuring its target controls.\n  updateHUD();\n  syncViewportSafety();",'  syncViewportSafety();');
 assert.notEqual(before,app);
 for(const restored of [false,true])for(const [width,height]of [[320,480],[568,320]]){
  const h=startupHarness({width,height,source:before});h.start(restored);
  assert.equal(h.$('objectiveHUD').classList.contains('hidden'),true);
  assert.equal(h.c.paused,true);assert.equal(h.c.viewportPause.active,true);
  assert.equal(h.log.measures[0].filter(r=>!r.width||!r.height).length,width>height?3:2);
 }
});
test('real first launch and restore still hold insufficient geometry after HUD initialization',()=>{
 for(const restored of [false,true])for(const [width,height]of [[568,300],[320,440]]){
  const h=startupHarness({width,height});h.start(restored);
  assert.equal(h.$('objectiveHUD').classList.contains('hidden'),false);
  assert.equal(h.log.measures[0].filter(r=>!r.width||!r.height).length,0,'hold is genuine space shortage, not hidden HUD');
  assert.equal(h.c.paused,true);assert.equal(h.c.viewportPause.active,true);assert.equal(h.c.viewportPause.blocked,true);
  assert.equal(h.c.game.state.time,0);
 }
});
test('same-page skirmish to protected launch does not reuse the skirmish-hidden HUD or invent a hold',()=>{
 const h=startupHarness();h.c.mode='skirmish';h.c.renderMapSelection=()=>{};h.start();h.c.updateHUD();
 assert.equal(h.$('objectiveHUD').classList.contains('hidden'),false);
 assert.equal(h.$('objectiveIdentity').textContent,'EASY · SKIRMISH');
 h.c.mode='campaign';h.c.selectedCampaign='winter-stores';h.start();
 assert.equal(h.$('objectiveHUD').classList.contains('hidden'),false);assert.equal(h.c.paused,false);assert.equal(h.c.viewportPause.active,false);
});
