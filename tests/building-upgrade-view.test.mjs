import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../dist/engine.js';
import {buildingUpgradeView} from '../dist/building-upgrade-view.js';
import {startupHarness} from './mobile-startup-fixture.mjs';

const row = (view, label) => view.rows.find(row => row.label === label);
const number = value => String(Number(value.toFixed(2)));

test('previews match paid upgrade health and future spawned recruits for every building and level', () => {
  for (const rulesetId of ['frontier-legacy', 'frontier-citadel-open', 'frontier-fog-skirmish-open', 'frontier-campaign-citadel-watch']) {
    for (const overtime of [false, true]) {
      const template = new Game({rulesetId, ai: false});
      for (const type of Object.keys(template.buildings)) {
        const game = new Game({rulesetId, ai: false});
        game.state.gold[0] = 10000;
        game.state.overtime = overtime;
        const result = game.build(type, 550, 450);
        assert.equal(result.ok, true);
        const b = result.building, d = game.buildings[type];
        b.hp -= 101.25;
        for (let level = 1; level < 3; level++) {
          const before = game.serialize(), view = buildingUpgradeView(game, b);
          assert.deepEqual(game.serialize(), before, 'inspection is read-only');
          assert.equal(view.title, `Upgrade to level ${level + 1}`);
          const oldRecruit = d.unit ? (game._spawn(b), game.state.units.at(-1)) : null;
          const paid = game.upgrade(b.id);
          assert.equal(paid.ok, true);
          assert.equal(game.state.gold[0], before.state.gold[0] - game.upgradeCost(before.state.buildings.find(x => x.id === b.id)));
          assert.equal(row(view, 'Building HP').after, `${Math.ceil(b.hp)} / ${Math.ceil(b.maxHp)}`);
          assert.equal(b.maxHp - b.hp, 101.25, 'upgrade preserves absolute damage');
          if (d.unit) {
            game._spawn(b);
            const recruit = game.state.units.at(-1), unit = game.units[d.unit];
            assert.equal(row(view, 'Recruit HP').before, number(oldRecruit.maxHp));
            assert.equal(row(view, 'Recruit HP').after, number(recruit.maxHp));
            assert.equal(oldRecruit.level, level, 'deployed troops keep their original level');
            // Exercise actual combat, including the warrior-vs-archer modifier.
            recruit.x = 1550; recruit.y = 450; recruit.lane = 1; recruit.cooldown = 0;
            const enemy = {id:game.nextId++,type:'archer',side:1,x:1565,y:450,lane:1,hp:10000,maxHp:10000,level:1,cooldown:10,attack:0};
            game.state.units = [recruit, enemy];
            const damageBefore = enemy.hp;
            game._step(.05);
            const modifier = d.unit === 'warrior' ? 1.35 : 1;
            assert.ok(Math.abs(damageBefore - enemy.hp - Number(row(view, 'Recruit damage').after) * modifier) < .000001);
            assert.match(view.note, /Future recruits only.*target modifiers/);
            // Observe a full wave with no enemy or competing production.
            game.state.units = []; game.state.buildings = [b]; b.progress = 0;
            game.state.time = overtime ? 300 : 0;
            const start = game.state.time;
            for (let ticks = 0; !game.state.units.length && ticks < 500; ticks++) game._step(.05);
            const interval = Number(row(view, 'Wave interval').after.slice(0, -1));
            assert.ok(Math.abs(game.state.time - start - interval) <= .1, 'displayed interval agrees within rounding and one simulation tick');
          }
        }
        assert.deepEqual(buildingUpgradeView(game, b), {title:'Maximum level reached', rows:[], note:''});
      }
    }
  }
});

test('mine income and tower shots match the live engine after an upgrade', () => {
  for (const type of ['mint', 'watchtower']) {
    const game = new Game({ai:false}); game.state.gold[0] = 10000;
    const b = game.build(type, 550, 450).building;
    for (let level = 1; level < 3; level++) {
      const view = buildingUpgradeView(game, b);
      assert.equal(game.upgrade(b.id).ok, true);
      if (type === 'mint') {
        game._step(.05);
        assert.equal(Number(row(view, 'Gold / second').after), game.state.income[0] - 5);
      } else {
        const enemy = {id:game.nextId++,type:'archer',side:1,x:560,y:450,lane:1,hp:1000,maxHp:1000,level:1,cooldown:10,attack:0};
        game.state.units = [enemy]; b.cooldown = 0;
        game._step(.05);
        assert.ok(Math.abs(1000 - enemy.hp - Number(row(view, 'Shot damage').after)) < .000001);
        assert.match(view.note, /Range and firing speed stay the same/);
      }
    }
  }
});

test('actual inspector updates the preview after purchasing and removes it at maximum level', () => {
  const h = startupHarness({width:390,height:650});
  const game = new Game({rulesetId:'frontier-citadel-open',ai:false});
  h.c.start(game); const b = game.state.buildings.find(b => b.side === 0);
  game.state.gold[0] = 1000; h.c.ui.selected = b.id; h.c.updateHUD();
  assert.match(h.$('upgradePreview').innerHTML, /Upgrade to level 2.*700 \/ 700 → 980 \/ 980.*9\.0s → 7\.4s/);
  assert.equal(h.$('upgrade').disabled, false);
  h.$('upgrade').onclick();
  assert.equal(b.level, 2);
  assert.match(h.$('upgradePreview').innerHTML, /Upgrade to level 3/);
  h.$('upgrade').onclick();
  assert.equal(h.$('upgradePreview').innerHTML, '<h4>Maximum level reached</h4>');
  assert.equal(h.$('upgrade').disabled, true);
});
