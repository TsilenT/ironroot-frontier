import {expect} from '@playwright/test';
import {test, press} from './map-browser-helpers.mjs';
import {rendererBeforeLocomotion} from '../../tests/locomotion-render-source.mjs';

test('paid moving troops animate during cooldown in the real canvas, while engine state stays exact', async ({page}, info) => {
  // Import-adapted actual v0.40.2 renderer, confined to this intercepted QA URL.
  await page.route('**/__qa-locomotion-render.js', route => route.fulfill({contentType:'text/javascript',body:rendererBeforeLocomotion()}));
  await page.goto('/');
  const result = await page.evaluate(async () => {
    const [{Game,buildSites},{Renderer},{Renderer:Prior}] = await Promise.all([
      import('/engine.js'),import('/render.js'),import('/__qa-locomotion-render.js'),
    ]);
    let game = new Game({ai:false,seed:731,rulesetId:'frontier-rootwarden-open'});
    for (const side of [0,1]) {
      const site = buildSites(game.map,side).find(site => site.lane === 1);
      if (!game.build('archery',site.x,site.y,side).ok) throw Error('paid fixture build failed');
    }
    const control = Game.restore(game.serialize());
    const make = Class => {
      const canvas = document.createElement('canvas'), mini = document.createElement('canvas');
      canvas.style.cssText = 'width:600px;height:360px'; mini.style.cssText = 'width:240px;height:60px';
      document.body.append(canvas,mini);
      const renderer = new Class(canvas,mini); renderer.reducedMotion = false; renderer.camera = 700;
      return renderer;
    };
    const candidate = make(Renderer), baseline = make(Prior);
    let found = null, checkpoint;
    for (let tick = 0; tick < 1000 && !found; tick++) {
      const before = game.serialize();
      const previous = new Map(game.state.units.map(unit => [unit.id,{...unit}]));
      game.update(.05); control.update(.05);
      const unit = game.state.units.find(unit => previous.has(unit.id) && unit.type === 'archer' && unit.cooldown > .4 && Math.abs(unit.x-previous.get(unit.id).x) > .001);
      if (unit) {
        checkpoint = before;
        found = {id:unit.id,type:unit.type,cooldown:unit.cooldown,dx:Math.abs(unit.x-previous.get(unit.id).x),x:unit.x};
      }
    }
    if (!found) throw Error('paid encounter did not reproduce movement during a substantial cooldown');
    // Render the actual adjacent observations at that encounter, without
    // hundreds of unnecessary terrain draws while advancing the paid fixture.
    game = Game.restore(checkpoint);
    for (const renderer of [candidate,baseline]) { renderer.camera = found.x; renderer.draw(game,{paused:true},0); }
    game.update(.05);
    for (const renderer of [candidate,baseline]) renderer.draw(game,{paused:true},0);
    found.moving = candidate.unitMotion.get(found.id).moving;
    const before = JSON.stringify(game.serialize()), pixels = candidate.canvas.toDataURL();
    for (let frame = 0; frame < 5; frame++) candidate.draw(game,{paused:true},0);
    return {found,deterministic:before === JSON.stringify(control.serialize()),readonly:before === JSON.stringify(game.serialize()),stable:pixels === candidate.canvas.toDataURL(),candidate:pixels,baseline:baseline.canvas.toDataURL()};
  });
  expect(result.found).toMatchObject({type:'archer',moving:true});
  expect(result.found.cooldown).toBeGreaterThan(.4); expect(result.found.dx).toBeGreaterThan(0);
  expect(result.deterministic).toBe(true); expect(result.readonly).toBe(true); expect(result.stable).toBe(true);
  expect(result.candidate).not.toBe(result.baseline);
  for (const name of ['candidate','baseline']) await info.attach(name+'-paid-moving-troop', {body:Buffer.from(result[name].split(',')[1],'base64'),contentType:'image/png'});
});

test('ordinary battle startup, pause and resume retain the shared presentation reset path', async ({page}) => {
  await page.goto('/'); await press(page,'[data-mode="skirmish"]'); await press(page,'#start');
  await expect(page.locator('#welcome')).toBeHidden();
  await press(page,'#pause'); await expect(page.locator('#pauseVeil')).toBeVisible();
  await press(page,'#resume'); await expect(page.locator('#pauseVeil')).toBeHidden();
});
