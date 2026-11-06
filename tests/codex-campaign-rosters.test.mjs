import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,getRuleset} from '../dist/engine.js';
import {createCodex} from '../dist/codex.js';

const cases=[
  ['frontier-campaign-watch',['warrior','archer'],[]],
  ['frontier-campaign-fork',['warrior','archer','rootwarden'],['watchtower','mint']],
  ['frontier-campaign-open',['warrior','archer','siege','wizard','gryphon','rootwarden'],['watchtower','mint']],
];
test('every earned roster has a complete field guide without evaluating absent troop or structure entries',()=>{
  for(const[id,units,structures]of cases){
    const rules=getRuleset(id),game=new Game({rulesetId:id,ai:false}),before=game.serialize();
    for(const context of [rules,game]){
      const guide=createCodex(context);
      assert.deepEqual(guide.UNIT_CODEX.map(x=>x.id),units);
      assert.deepEqual(guide.STRUCTURE_CODEX.map(x=>x.id),structures);
      for(const unit of guide.UNIT_CODEX){
        assert.equal(unit.baseStats.hp,rules.units[unit.id].hp);
        assert.equal(unit.production.cost,rules.buildings[unit.production.id].cost);
        assert.equal(unit.production.upgradeCosts.length,2);
        assert.ok(unit.mechanics.every(text=>typeof text==='string'&&text.length));
      }
      assert.doesNotMatch(JSON.stringify(guide),/undefined|NaN/);
      assert.ok(Object.isFrozen(guide));
    }
    assert.deepEqual(game.serialize(),before,'reading a guide cannot change the battle or RNG');
  }
});
test('the two-building campaign guide does not advertise unavailable mines or fake mission starting resources',()=>{
  const guide=createCodex(getRuleset('frontier-campaign-watch'));
  assert.equal(guide.ECONOMY_GUIDE.mineCap,0);
  assert.equal(guide.ECONOMY_GUIDE.startingGoldLabel,'Reference gold');
  assert.match(guide.ECONOMY_GUIDE.scope,/Starting resources and forces come from the mission briefing/);
  assert.match(guide.ECONOMY_GUIDE.notes.join(' '),/no gold mines available/);
  assert.doesNotMatch(guide.ECONOMY_GUIDE.upgrades.join(' '),/Watchtowers gain|Mines gain/);
});
test('expanded campaign economy cards preserve actual paid upgrade and income values',()=>{
  for(const id of ['frontier-campaign-fork','frontier-campaign-open']){
    const game=new Game({rulesetId:id,ai:false}),guide=createCodex(game);
    const mine=guide.STRUCTURE_CODEX.find(x=>x.id==='mint');
    assert.equal(mine.cost,game.buildings.mint.cost);
    assert.deepEqual(mine.upgradeCosts,[1,2].map(level=>game.upgradeCost({type:'mint',level})));
    assert.deepEqual(mine.levels.map(x=>x.income),[2.5,3.75,5]);
    assert.equal(guide.ECONOMY_GUIDE.mineCap,3);
  }
});
