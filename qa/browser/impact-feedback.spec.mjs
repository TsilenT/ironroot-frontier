import {expect} from '@playwright/test';
import {Game} from '../../dist/engine.js';
import {encodeBattle} from '../../dist/battle-codec.js';
import {paidImpactScene} from '../../tests/impact-feedback-fixture.mjs';
import {rendererBeforeImpact} from '../../tests/impact-render-source.mjs';
import {test,press,seedOnce,pause} from './map-browser-helpers.mjs';
import {SAVE} from './map-fixtures.mjs';

test('native canvas shows contact on the first HP-loss frame and holds its anchor through the tail', async ({page},info) => {
  const scene = paidImpactScene();
  await page.route('**/__qa-impact-before.js',route => route.fulfill({contentType:'text/javascript',body:rendererBeforeImpact()}));
  await page.goto('/');
  const result = await page.evaluate(async scene => {
    const [{Game},{Renderer},{Renderer:Before}] = await Promise.all([import('/engine.js'),import('/render.js'),import('/__qa-impact-before.js')]);
    let game = Game.restore(scene.after), tracked = game.state.projectiles[scene.projectileIndex];
    const anchors = [], beforeState = JSON.stringify(game.serialize());
    const make = Class => {
      const canvas = document.createElement('canvas'), mini = document.createElement('canvas');
      canvas.style.cssText = `width:${Math.min(600,innerWidth-24)}px;height:${Math.max(220,Math.min(360,innerHeight-220))}px`;
      mini.style.cssText = 'width:240px;height:60px'; document.body.append(canvas,mini);
      const renderer = new Class(canvas,mini); renderer.reducedMotion = false; renderer.camera = (tracked.sx+tracked.tx)/2;
      return renderer;
    };
    const current = make(Renderer), prior = make(Before), draw = current.drawProjectile;
    current.drawProjectile = function(p) {
      if (p !== tracked) return draw.call(this,p);
      const native = this.c.translate; let first = null;
      this.c.translate = function(x,y) { first ??= [x,y]; return native.call(this,x,y); };
      try { return draw.call(this,p); }
      finally { this.c.translate = native; anchors.push({life:p.life,point:first}); }
    };
    const images = []; let previous = 0;
    for (const elapsed of [0,.05,.15,.25]) {
      if (elapsed > previous) game.update(elapsed-previous);
      const before = JSON.stringify(game.serialize());
      prior.draw(game,{paused:true},0); current.draw(game,{paused:true},0);
      if (JSON.stringify(game.serialize()) !== before) throw Error('Drawing altered the simulation');
      images.push({elapsed,prior:prior.canvas.toDataURL(),current:current.canvas.toDataURL()}); previous = elapsed;
    }
    const paused = current.canvas.toDataURL(), state = JSON.stringify(game.serialize());
    for (let frame = 0; frame < 5; frame++) current.draw(game,{paused:true},0);
    const stable = paused === current.canvas.toDataURL() && state === JSON.stringify(game.serialize());
    const restoredIndex = game.state.projectiles.indexOf(tracked);
    game = Game.restore(game.serialize()); tracked = game.state.projectiles[restoredIndex];
    current.draw(game,{paused:true},0);
    return {anchors,images,stable,restoredLife:tracked.life,launchUnchanged:beforeState === JSON.stringify(scene.after),expected:[tracked.tx,tracked.ty-17-(tracked.targetAir?17:0)]};
  },scene);
  expect(scene.receipt.hpAfter).toBeLessThan(scene.receipt.hpBefore);
  expect(result.launchUnchanged).toBe(true); expect(result.stable).toBe(true);
  expect(result.anchors[0].life).toBe(.28);
  for (const observation of result.anchors) expect(observation.point).toEqual(result.expected);
  expect(result.restoredLife).toBeLessThan(.1);
  expect(result.images[0].prior).not.toBe(result.images[0].current);
  if (info.project.name === 'desktop') {
    for (const frame of result.images) for (const type of ['prior','current'])
      await info.attach(`${type}-${Math.round(frame.elapsed*1000)}ms`,{body:Buffer.from(frame[type].split(',')[1],'base64'),contentType:'image/png'});
    await info.attach('paid-damage-receipt',{body:JSON.stringify(scene.receipt,null,2),contentType:'application/json'});
  }
});

for (const reducedMotion of [false,true]) test(`actual UI resumes a paid pre-shot save, applies damage and pauses safely; reduced motion ${reducedMotion}`, async ({page}) => {
  const scene = paidImpactScene();
  await seedOnce(page,{[SAVE]:JSON.stringify(encodeBattle(Game.restore(scene.before))),
    'ironroot.settings.v1':JSON.stringify({sound:false,music:false,sfx:false,reducedMotion,quality:reducedMotion?'low':'high'})});
  await press(page,'#resumeSaved'); await expect(page.locator('#welcome')).toBeHidden();
  await page.waitForTimeout(150); const saved = await pause(page);
  const game = Game.restore(saved.game);
  expect(game.state.time).toBeGreaterThan(scene.before.state.time);
  const target = game.state.units.find(unit => unit.id === scene.receipt.target);
  expect(target?.hp ?? 0).toBeLessThan(scene.receipt.hpBefore);
  await expect(page.locator('#pauseVeil')).toBeVisible();
});
