// Independent, bounded real-time input checks for the single persistent Volley
// action. Use native taps/clicks directly: press() may auto-open old Build UI.
import {expect} from '@playwright/test';
import {Game, DEFAULT_SKIRMISH_RULESET_ID} from '../../dist/engine.js';
import {encodeBattle, scenarioForBattle} from '../../dist/battle-codec.js';
import {test, press, saved, seedOnce, tapPoint} from './map-browser-helpers.mjs';
import {trainingProfileFixture} from './training-fixtures.mjs';
import {finishFirstBuild} from './campaign-teaching-helpers.mjs';
import {installPad, neutralPad, padButton} from './synthetic-gamepad-helpers.mjs';
import {observeVolleyHistory, serveVolleyBase, VOLLEY_BASE} from './volley-history-evidence.mjs';

const SAVE = 'ironroot.battle.v1';
const SETTINGS = 'ironroot.settings.v1';
const DOMAINS = ['ironroot.campaign.v1', 'ironroot.trials.v1', SETTINGS, 'ironroot.history.v1'];
const bytes = page => page.evaluate(key => localStorage.getItem(key), SAVE);
const profile = page => page.evaluate(keys => Object.fromEntries(keys.map(key => [key, localStorage.getItem(key)])), DOMAINS);
async function direct(page, selector = '#rally') {
  const target = page.locator(selector);
  await expect(target).toBeVisible();
  if (await page.evaluate(() => navigator.maxTouchPoints > 0)) await target.tap();
  else await target.click();
}
async function noDrawer(page) {
  await expect(page.locator('#app')).not.toHaveClass(/compact-build-open/);
}
async function arm(page) {
  await noDrawer(page);
  await direct(page);
  await expect(page.locator('#rally')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#battle')).toHaveClass(/placing/);
  await noDrawer(page);
}
async function unarmed(page) {
  await expect(page.locator('#rally')).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('#battle')).not.toHaveClass(/placing/);
}
function noCast(checkpoint, gold = 420) {
  expect(checkpoint.game.state.spellCooldown[0]).toBe(0);
  expect(checkpoint.game.state.gold[0]).toBeCloseTo(gold + 5 * checkpoint.game.state.time, 1);
}
async function start(page) {
  const game = new Game({seed:77201, ai:false, rulesetId:DEFAULT_SKIRMISH_RULESET_ID});
  const fixture = trainingProfileFixture().values;
  fixture[SAVE] = JSON.stringify(encodeBattle(game, scenarioForBattle(null, null, game)));
  await seedOnce(page, fixture);
  const persistent = await profile(page);
  await press(page, '#resumeSaved');
  await expect(page.locator('#welcome')).toBeHidden();
  await expect(page.locator('#viewportModal')).toBeHidden();
  return persistent;
}
async function pause(page) {
  await press(page, '#pause');
  await expect(page.locator('#pauseVeil')).toBeVisible();
  return saved(page);
}

test.describe('independent: native history readiness', () => {
  // Both compared heads use the same storage, native timing and SW policy.
  const serviceWorkers = process.env.VOLLEY_HISTORY_SERVICE_WORKERS === 'allow' ? 'allow' : 'block';
  test.use({serviceWorkers});
  const heads = process.env.VOLLEY_HISTORY_COMPARE_BASE === '1' ? ['candidate','base'] : ['candidate'];
  for (const head of heads) for (const setup of ['fresh-document','seeded-reload']) {
    test(`${head} ${setup}: Back/Forward markers, targeting, Resume and profile`, async ({page,context}, info) => {
      const trace = await observeVolleyHistory(page);
      const detail = {head,setup,serviceWorkers,base:VOLLEY_BASE,baseAccess:'Native KeyR on base because mobile Volley is hidden; no Build entry is added. Candidate uses its visible button.'};
      try {
        if (head === 'base') {
          expect(serviceWorkers, 'base diagnostics must stay isolated from service workers').toBe('block');
          detail.runtime = await serveVolleyBase(context);
        }
        const game = new Game({seed:77201,ai:false,rulesetId:DEFAULT_SKIRMISH_RULESET_ID});
        const fixture = trainingProfileFixture().values;
        fixture[SAVE] = JSON.stringify(encodeBattle(game,scenarioForBattle(null,null,game)));
        if (setup === 'fresh-document') {
          // Seed on a real same-origin prior document; first app load has no
          // stale app marker and must eventually Back out to this real page.
          await page.goto('/FONTS-NOTICES.txt?volley-history-exit');
          await page.evaluate(values => {for (const [key,value] of Object.entries(values)) localStorage.setItem(key,value);},fixture);
          await page.goto('/');
        } else await seedOnce(page,fixture);
        if (serviceWorkers === 'allow') {
          // app.js intentionally skips registration on localhost. Register the
          // unchanged shipped worker in this secure loopback context; this is
          // real worker/cache control, not production-origin certification.
          await page.evaluate(() => navigator.serviceWorker.register('/service-worker.js', {updateViaCache:'none'}));
          await page.evaluate(() => navigator.serviceWorker.ready);
          await expect.poll(() => page.evaluate(() => navigator.serviceWorker.controller?.scriptURL)).toMatch(/\/service-worker\.js$/);
          const keys = await page.evaluate(() => caches.keys());
          expect(keys).toContain('ironroot-v0.18.2');
          detail.shippingWorker = {controller:await page.evaluate(() => navigator.serviceWorker.controller.scriptURL),cacheKeys:keys,registration:'explicit loopback QA registration; app skips localhost'};
        }
        const persistent = await profile(page);
        await press(page,'#resumeSaved');
        await expect(page.locator('#welcome')).toBeHidden();
        await expect(page.locator('#viewportModal')).toBeHidden();
        await trace.ready();
        const baseline = await trace.mark('pre-arm baseline');
        if (head === 'candidate') await arm(page);
        else {
          await page.locator('#battle').focus();
          await page.keyboard.press('KeyR');
          await expect(page.locator('#rally')).toHaveClass(/active/);
          await expect(page.locator('#battle')).toHaveClass(/placing/);
          await noDrawer(page);
        }
        const armed = await trace.ready();
        expect(armed.length).toBe(baseline.length);
        const back = await trace.traverse('back');
        expect(back.state.ironrootNavigation.document === baseline.state.ironrootNavigation.document).toBe(setup === 'fresh-document');
        await expect(page.locator('#pauseVeil')).toBeVisible();
        if (head === 'candidate') await unarmed(page);
        else await expect(page.locator('#rally')).toHaveClass(/active/);
        const frozen = await bytes(page);
        noCast(JSON.parse(frozen));
        await page.waitForTimeout(180);
        expect(await bytes(page)).toBe(frozen);
        await trace.traverse('forward');
        await expect(page.locator('#pauseVeil')).toBeVisible();
        if (head === 'candidate') await unarmed(page);
        else await expect(page.locator('#rally')).toHaveClass(/active/);
        expect(await bytes(page)).toBe(frozen);
        const beforeResume = await trace.mark('strict pre-Resume');
        // Retain the original strict assertion, now after actual Forward.
        expect(beforeResume.length).toBe(baseline.length);
        expect(beforeResume.state).toEqual(baseline.state);
        await press(page,'#resume');
        await expect(page.locator('#pauseVeil')).toBeHidden();
        await trace.ready();
        const resumed = await trace.mark('explicit Resume');
        // Stale-document ancestry can add one slot here on BOTH heads. This
        // later effect does not explain the original pre-Resume failure.
        expect(resumed.length).toBe(baseline.length + (setup === 'seeded-reload' ? 1 : 0));
        if (head === 'candidate') await unarmed(page);
        else await expect(page.locator('#battle')).toHaveClass(/placing/);
        const box = await page.locator('#battle').boundingBox();
        await tapPoint(page,{x:box.x + box.width / 2,y:box.y + box.height / 2});
        const afterTouch = await pause(page);
        if (head === 'candidate') noCast(afterTouch);
        else {
          expect(afterTouch.game.state.spellCooldown[0]).toBeGreaterThan(20);
          expect(afterTouch.game.state.gold[0]).toBeCloseTo(420 - 75 + 5 * afterTouch.game.state.time,1);
        }
        expect(await profile(page)).toEqual(persistent);
        await trace.ready();
        await trace.mark('fresh battlefield input checked', {paidCast:head === 'base'});
        if (setup === 'fresh-document') {
          await press(page,'#resume');await trace.ready();
          for (let cycle = 0; cycle < 2; cycle++) {
            await trace.traverse('back');await expect(page.locator('#pauseVeil')).toBeVisible();
            await trace.traverse('forward');await expect(page.locator('#pauseVeil')).toBeVisible();
            expect((await trace.mark('repeat pre-Resume',{cycle})).length).toBe(baseline.length);
            await press(page,'#resume');await trace.ready();
            expect((await trace.mark('repeat resumed',{cycle})).length).toBe(baseline.length);
          }
          // The bound is the observed finite native stack, never a history trap.
          let steps = 0;
          while (!page.url().includes('volley-history-exit') && steps < baseline.length) {
            await trace.traverse('back');steps++;
          }
          await expect(page).toHaveURL(/FONTS-NOTICES\.txt\?volley-history-exit$/);
          await trace.mark('finite Back exit',{steps,bound:baseline.length});
          expect(await profile(page)).toEqual(persistent);
        }
        trace.assertOpaqueStates();
      } finally {
        await trace.attach(info,detail);
      }
    });
  }
});

test('independent: remapped V, Escape and native button cancellation retain menu input scope', async ({page}) => {
  const persistent = await start(page);
  await press(page, '#settings');
  await press(page, '#keyboardSettings > summary');
  await page.locator('[data-keyboard-action="volley"] [data-keyboard-change]').click();
  await page.keyboard.press('KeyV');
  await expect(page.locator('[data-keyboard-action="volley"] .keyboard-key')).toHaveText('V');
  await press(page, '#settingsDone');
  await page.locator('#battle').focus();
  await page.keyboard.press('KeyR');
  await unarmed(page);
  await page.keyboard.press('KeyV');
  await expect(page.locator('#rally')).toHaveAttribute('aria-pressed', 'true');
  await noDrawer(page);
  await page.keyboard.press('Escape');
  await unarmed(page);
  await arm(page); await direct(page); await unarmed(page);
  await page.locator('#rally').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#rally')).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('Space');
  await unarmed(page);
  noCast(await pause(page));
  await page.keyboard.press('KeyV');
  await unarmed(page); await expect(page.locator('#pauseVeil')).toBeVisible();
  await press(page, '#pauseSettings');
  const frozen = await bytes(page);
  await page.keyboard.press('KeyV');
  await page.keyboard.press('KeyR');
  await unarmed(page);
  expect(await bytes(page)).toBe(frozen);
  const current = await profile(page);
  for (const key of DOMAINS.filter(key => key !== SETTINGS)) expect(current[key]).toBe(persistent[key]);
  expect(JSON.parse(current[SETTINGS]).keyboard.bindings.volley).toBe('KeyV');
});

test('independent: controller Y arms, B cancels, and Y/A casts once without opening Build', async ({page}) => {
  await installPad(page);
  const persistent = await start(page);
  await page.locator('#battle').focus();
  await neutralPad(page);
  await padButton(page, 3);
  await expect(page.locator('#rally')).toHaveAttribute('aria-pressed', 'true');
  await noDrawer(page);
  await padButton(page, 1);
  await unarmed(page);
  noCast(await pause(page));
  await press(page, '#resume');
  await page.locator('#battle').focus();
  await neutralPad(page);
  await padButton(page, 3);
  await expect(page.locator('#rally')).toHaveAttribute('aria-pressed', 'true');
  await noDrawer(page);
  await padButton(page, 0);
  await unarmed(page);
  await expect(page.locator('#toast')).toHaveText('Arrow volley fired.');
  // A second A while unarmed selects/clears, never casts a second volley.
  await padButton(page, 0);
  const after = await pause(page);
  expect(after.game.state.spellCooldown[0]).toBeGreaterThan(20);
  expect(after.game.state.gold[0]).toBeCloseTo(420 - 75 + 5 * after.game.state.time, 1);
  await padButton(page, 3);
  await unarmed(page); await expect(page.locator('#pauseVeil')).toBeVisible();
  expect(await profile(page)).toEqual(persistent);
});

test('independent: first-build teaching with hints shown or hidden forbids Volley until the paid barracks', async ({page}) => {
  await page.goto('/'); await press(page, '#start');
  await expect(page.locator('#battleClockLabel')).toHaveText('TEACHING PAUSE');
  for (const hidden of [false, true]) {
    if (hidden) await press(page, '#toggleCoach');
    await expect(page.locator('#rally')).toHaveAttribute('aria-disabled', 'true');
    // aria-disabled intentionally fails Playwright's enabled check. Validate
    // the actual hit target and send a native press to exercise refusal.
    const box = await page.locator('#rally').boundingBox();
    const point = {x:box.x + box.width / 2, y:box.y + box.height / 2};
    expect(await page.evaluate(p => !!document.elementFromPoint(p.x,p.y)?.closest('#rally'), point)).toBe(true);
    await tapPoint(page, point);
    await unarmed(page);
    await page.locator('#battle').focus(); await page.keyboard.press('KeyR');
    await unarmed(page);
    await noDrawer(page);
    await page.waitForTimeout(180);
    const before = await pause(page);
    expect(before.game.state.time).toBe(0);
    expect(before.game.state.gold[0]).toBe(420);
    expect(before.game.state.spellCooldown[0]).toBe(0);
    await press(page, '#resume');
  }
  await finishFirstBuild(page, press);
  await expect(page.locator('#battleClockLabel')).toHaveText('BATTLE TIME');
  await expect(page.locator('#rally')).toHaveAttribute('aria-disabled', 'false');
  await arm(page); await direct(page); await unarmed(page);
  const after = await pause(page);
  noCast(after, 420 - 140);
});

test('independent: profile recovery dominates Volley input and preserves durable campaign/trial/settings/history', async ({page, context}) => {
  const persistent = await start(page);
  await arm(page);
  const other = await context.newPage(); await other.goto('/FONTS-NOTICES.txt');
  await other.evaluate(() => {
    const key = 'ironroot.profile.v1', marker = JSON.parse(localStorage.getItem(key));
    marker.epoch = 'volley-independent-recovery'; marker.phase = 'restoring';
    localStorage.setItem(key, JSON.stringify(marker));
  });
  await page.bringToFront();
  await expect(page.locator('#profileRecovery')).toBeVisible();
  await expect(page.locator('#settingsDone')).toBeDisabled();
  const frozen = await bytes(page);
  await page.keyboard.press('KeyR');
  // Programmatic activation reaches the actual common guard, unlike inert
  // pointer targeting. It must not clear recovery, spend, or start cooldown.
  await page.locator('#rally').evaluate(element => element.click());
  await page.evaluate(() => history.back());
  await expect(page.locator('#profileRecovery')).toBeVisible();
  await page.waitForTimeout(180);
  expect(await bytes(page)).toBe(frozen);
  expect(JSON.parse(frozen).game.state.spellCooldown[0]).toBe(0);
  expect(await profile(page)).toEqual(persistent);
});

test('independent: visibility interruption retires held targeting input and requires explicit resume', async ({page, context}, info) => {
  info.annotations.push({type:'scope', description:'Visibility signal integration; document.hidden/visibilitychange double, native held pointer, real time. Not OS backgrounding certification.'});
  const persistent = await start(page);
  await arm(page);
  const box = await page.locator('#battle').boundingBox(), point = {x:box.x + box.width / 2, y:box.y + box.height / 2};
  const touch = await page.evaluate(() => navigator.maxTouchPoints > 0);
  const cdp = touch ? await context.newCDPSession(page) : null;
  try {
    if (touch) await cdp.send('Input.dispatchTouchEvent', {type:'touchStart', touchPoints:[point]});
    else { await page.mouse.move(point.x,point.y); await page.mouse.down(); }
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', {configurable:true, value:true});
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await expect(page.locator('#pauseVeil')).toBeVisible();
    const frozen = await bytes(page);
    noCast(JSON.parse(frozen));
    await page.evaluate(() => { delete document.hidden; document.dispatchEvent(new Event('visibilitychange')); });
    if (touch) await cdp.send('Input.dispatchTouchEvent', {type:'touchEnd', touchPoints:[]});
    else await page.mouse.up();
    await page.waitForTimeout(180);
    expect(await bytes(page)).toBe(frozen);
    await expect(page.locator('#pauseVeil')).toBeVisible();
    await press(page, '#resume');
    // Existing pause policy may preserve a selection. Deliberate cancellation
    // must still be reachable, with no cost from the interrupted release.
    if (await page.locator('#rally').getAttribute('aria-pressed') === 'true') await direct(page);
    await unarmed(page);
    noCast(await pause(page));
    expect(await profile(page)).toEqual(persistent);
  } finally { await cdp?.detach(); }
});
