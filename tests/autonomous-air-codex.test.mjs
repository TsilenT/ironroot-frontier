import test from 'node:test';
import assert from 'node:assert/strict';
import { createCodex } from '../dist/codex.js';
import { Game, RULESETS } from '../dist/engine.js';

test('automatic flight guide reflects actual sight, attack reach and retention without instructions to give orders', () => {
  for (const id of ['frontier-air-local-open', 'frontier-air-local-timed', 'frontier-campaign-air-local']) {
    const game = new Game({ rulesetId: id, ai: false });
    const before = JSON.stringify(game.serialize());
    const codex = createCodex(game);
    const flyer = codex.UNIT_CODEX.find(unit => unit.id === 'gryphon');
    const archer = codex.UNIT_CODEX.find(unit => unit.id === 'archer');
    assert.match(flyer.advantages, /on its own.*adjacent road/);
    assert.ok(flyer.mechanics.some(text => text.includes(`${game.ruleset.movement.autonomousAir.perception} world units`)));
    assert.ok(flyer.mechanics.some(text => text.includes(`${game.units.gryphon.range} attack range`)));
    assert.ok(flyer.mechanics.some(text => text.includes(`${game.ruleset.movement.autonomousAir.retention} world units`)));
    assert.match(flyer.mechanics.join(' '), /draw the gryphon away/);
    assert.match(archer.mechanics.join(' '), /stay on their road.*between roads/);
    assert.doesNotMatch(JSON.stringify(flyer), /gateway|two-second|Select an aerie|Hold or/);
    assert.equal(JSON.stringify(game.serialize()), before);
  }
});

test('earlier rules do not receive the new automatic-flight promises', () => {
  for (const id of ['frontier-legacy', 'frontier-rootwarden-open', 'frontier-flight-open', 'frontier-campaign-flight']) {
    const flyer = createCodex(RULESETS[id]).UNIT_CODEX.find(unit => unit.id === 'gryphon');
    assert.doesNotMatch(flyer.advantages, /adjacent road/);
    assert.doesNotMatch(flyer.mechanics.join(' '), /Notices troops|Keeps pursuing|nearest road/);
    assert.equal(flyer.baseStats.range, 110);
  }
});
