import {expect} from '@playwright/test';
import {Game} from '../../dist/engine.js';
import {encodeBattle} from '../../dist/battle-codec.js';
import {paidImpactScene,impactReadabilityScene} from '../../tests/impact-feedback-fixture.mjs';
import {rendererBeforeImpact,rendererFirstImpact} from '../../tests/impact-render-source.mjs';
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

for (const dense of [false,true]) for (const mode of ['normal','low','reduced'])
  test(`native source attribution and late contact: ${dense?'32-shot stress':'five-role'} / ${mode}`, async ({page},info) => {
    await page.route('**/__qa-impact-first.js',route => route.fulfill({contentType:'text/javascript',body:rendererFirstImpact()}));
    await page.goto('/');
    const result = await page.evaluate(async ({snapshot,mode}) => {
      const [{Game},{Renderer},{Renderer:First}] = await Promise.all([import('/engine.js'),import('/render.js'),import('/__qa-impact-first.js')]);
      const game = Game.restore(snapshot), width = Math.min(600,innerWidth-24), height = 240;
      const make = Class => {
        const canvas = document.createElement('canvas'), mini = document.createElement('canvas');
        canvas.style.cssText = `width:${width}px;height:${height}px`;
        mini.style.cssText = 'width:240px;height:60px'; document.body.append(canvas,mini);
        const renderer = new Class(canvas,mini);
        renderer.reducedMotion = mode === 'reduced'; renderer.vfx.quality = mode === 'normal'?'high':'low';
        renderer.camera = 1600;
        return renderer;
      };
      const current = make(Renderer), first = make(First), probe = make(Renderer), frames = [], evidence = [];
      for (const elapsed of [0,.25]) {
        // This fixture is frozen presentation stress, not a played combat result.
        for (const p of game.state.projectiles) p.life=p.maxLife-elapsed;
        const before = JSON.stringify(game.serialize());
        first.draw(game,{paused:true},0); current.draw(game,{paused:true},0);
        if (JSON.stringify(game.serialize()) !== before) throw Error('Drawing altered frozen state');
        frames.push({elapsed,first:first.canvas.toDataURL(),current:current.canvas.toDataURL()});
        if (game.state.projectiles.length === 5) for (const p of game.state.projectiles) {
          const c = probe.c, dpr = probe.dpr;
          c.setTransform(1,0,0,1,0,0); c.clearRect(0,0,probe.canvas.width,probe.canvas.height);
          c.setTransform(dpr,0,0,dpr,0,0); c.translate(width/2,height/2); c.scale(probe.scale,probe.scale); c.translate(-1600,-450);
          probe.drawProjectile(p);
          const pixelsNear = (x,y,radius) => {
            const at = probe.worldToScreen(x,y), r = Math.ceil(radius*dpr), px = Math.round(at.x*dpr), py = Math.round(at.y*dpr);
            const bytes = c.getImageData(px-r,py-r,r*2+1,r*2+1).data;
            let pixels = 0; for (let i=3;i<bytes.length;i+=4) if (bytes[i]>32) pixels++;
            return pixels;
          };
          evidence.push({type:p.type,elapsed,source:pixelsNear(p.sx,p.sy-17-(p.sourceAir?17:0),4),
            contact:pixelsNear(p.tx,p.ty-17-(p.targetAir?17:0),7)});
        }
      }
      const paused = current.canvas.toDataURL(); current.draw(game,{paused:true},0);
      return {frames,evidence,stable:paused===current.canvas.toDataURL(),width,height,scale:current.scale,shots:game.state.projectiles.length};
    },{snapshot:impactReadabilityScene(dense),mode});
    expect(result.stable).toBe(true); expect(result.shots).toBe(dense?32:5);
    for (const item of result.evidence) {
      expect(item.source,`${item.type} source at ${item.elapsed}`).toBeGreaterThan(0);
      expect(item.contact,`${item.type} contact at ${item.elapsed}`).toBeGreaterThan(0);
    }
    for (const frame of result.frames) for (const version of ['first','current'])
      await info.attach(`${dense?'stress':'roles'}-${mode}-${version}-${Math.round(frame.elapsed*1000)}ms`,{
        body:Buffer.from(frame[version].split(',')[1],'base64'),contentType:'image/png'});
    await info.attach('native-readability-evidence',{body:JSON.stringify({...result,frames:undefined},null,2),contentType:'application/json'});
  });
