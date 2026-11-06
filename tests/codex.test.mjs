import assert from 'node:assert/strict';
import test from 'node:test';
import { BUILDINGS, Game, LANES, SPELL, UNITS, upgradeCost } from '../dist/engine.js';
import { ECONOMY_GUIDE, STRUCTURE_CODEX, UNIT_CODEX, formatNumber, formatSeconds } from '../dist/codex.js';

const entry = id => UNIT_CODEX.find(unit => unit.id === id);
const structure = id => STRUCTURE_CODEX.find(building => building.id === id);
const close = (actual, expected, label = '') => assert.ok(Math.abs(actual - expected) < 1e-8, `${label}: ${actual} != ${expected}`);
const step = (game, seconds) => { for (let tick = 0; tick < Math.round(seconds * 20); tick++) game.update(0.05); };
function empty() {
  const game = new Game({ ai: false });
  game.state.buildings = [];
  game.state.units = [];
  return game;
}
function troop(game, type, side, x, y = 450, level = 1) {
  const producer = entry(type).production.id;
  game._spawn({ type: producer, side, x: x - (side ? -48 : 48), y, lane: 1, level });
  const unit = game.state.units.at(-1);
  unit.x = x; unit.y = y; unit.cooldown = 0;
  return unit;
}
function hit(attackerType, targetType, { level = 1, overtime = false } = {}) {
  const game = empty();
  if (overtime) game.state.time = 301;
  const attacker = troop(game, attackerType, 0, 1500, 450, level);
  const target = troop(game, targetType, 1, 1520);
  target.cooldown = 100;
  const hp = target.hp;
  game.update(0.05);
  return { damage: hp - target.hp, attacker, target, game };
}
function assertFrozen(value) {
  if (!value || typeof value !== 'object') return;
  assert.ok(Object.isFrozen(value));
  Object.values(value).forEach(assertFrozen);
}

test('codex covers the entire original roster and derives exact base and producer data', () => {
  assert.deepEqual(UNIT_CODEX.map(unit => unit.id), Object.keys(UNITS));
  const known = new Set();
  for (const unit of UNIT_CODEX) {
    const source = UNITS[unit.id], producer = BUILDINGS[unit.production.id];
    assert.equal(unit.name, source.name);
    assert.equal(unit.portraitId, unit.id);
    for (const field of ['hp', 'damage', 'attackTime', 'range', 'speed', 'flying', 'canAttackAir', 'canAttackGround']) {
      assert.equal(unit.baseStats[field], source[field], `${unit.id}.${field}`);
    }
    assert.equal(producer.unit, unit.id);
    for (const field of ['name', 'cost', 'hp', 'spawnTime']) assert.equal(unit.production[field], producer[field]);
    assert.deepEqual(unit.production.upgradeCosts, [1, 2].map(level => upgradeCost({ type: unit.production.id, level })));
    for (const field of ['role', 'silhouette', 'advantages', 'cautions']) assert.ok(unit[field].length > 0);
    assert.ok(unit.mechanics.length);
    assert.ok(!known.has(unit.silhouette)); known.add(unit.silhouette);
  }
});

test('every roster entry agrees with actual spawning, direct attacks, range, cooldown and movement', () => {
  for (const unit of UNIT_CODEX) {
    const game = empty(), attacker = troop(game, unit.id, 0, 1500);
    close(attacker.hp, unit.baseStats.hp, `${unit.id} HP`);
    const target = troop(game, 'siege', 1, 1500 + unit.baseStats.range);
    target.cooldown = 100;
    const hp = target.hp;
    game.update(0.05);
    close(hp - target.hp, unit.baseStats.damage, `${unit.id} direct hit`);
    close(attacker.cooldown, unit.baseStats.attackTime, `${unit.id} cooldown`);

    const outside = empty(), walker = troop(outside, unit.id, 0, 1500);
    const beyond = troop(outside, 'siege', 1, 1500 + unit.baseStats.range + 0.1);
    beyond.cooldown = 100;
    outside.update(0.05);
    close(beyond.hp, beyond.maxHp, `${unit.id} range boundary`);
    close(walker.x - 1500, unit.baseStats.speed * 0.05, `${unit.id} speed`);
  }
});

test('every producer cost, nominal repeat interval and early first spawn agree with simulation', () => {
  for (const { id, production } of UNIT_CODEX) {
    const game = empty(); game.state.gold[0] = 10000;
    const before = game.state.gold[0];
    const { building } = game.build(production.id, 700, 450);
    assert.equal(before - game.state.gold[0], production.cost);
    close((1 - building.progress) * production.spawnTime, 1.2);
    building.progress = 0;
    step(game, production.spawnTime - 0.05);
    assert.equal(game.state.units.length, 0, `${id} cannot spawn early`);
    // Floating-point accumulation may move a nominal boundary by one fixed tick.
    step(game, 0.1);
    assert.equal(game.state.units.length, 1);
    assert.equal(game.state.units[0].type, id);
  }
});

test('documented direct counter numbers match executed combat, without a universal shield', () => {
  const facts = [
    ['archer', 'warrior', 9.35], ['warrior', 'archer', 28.35],
    ['archer', 'gryphon', 25.5], ['wizard', 'warrior', 24],
    ['siege', 'warrior', 30], ['gryphon', 'warrior', 17],
    ['wizard', 'archer', 24],
  ];
  for (const [attacker, target, damage] of facts) close(hit(attacker, target).damage, damage, `${attacker} → ${target}`);
  assert.match(entry('warrior').mechanics.join(' '), /45% less.*9\.35.*35% extra.*28\.35.*28% less/);
  assert.match(entry('archer').mechanics.join(' '), /50% extra.*25\.5.*55%.*9\.35/);
  assert.match(entry('wizard').mechanics.join(' '), /full 24 damage/);
  assert.match(entry('wizard').cautions, /Archers outrange it.*can kill it/);
  assert.ok(entry('archer').baseStats.range > entry('wizard').baseStats.range);
  assert.match(ECONOMY_GUIDE.counterCaveat, /Army size, range, position, upgrades and support can still decide/);
});

test('all advertised air targeting permissions match actual attacks', () => {
  for (const unit of UNIT_CODEX) {
    const result = hit(unit.id, 'gryphon');
    assert.equal(result.damage > 0, unit.baseStats.canAttackAir, unit.id);
    assert.equal(hit(unit.id, 'warrior').damage > 0, unit.baseStats.canAttackGround, unit.id);
    assert.equal(result.attacker.flying, unit.baseStats.flying);
  }
});

test('siege and wizard splash have a strict 64-unit radius and affect only other enemy ground troops', () => {
  for (const [type, splash, percentage] of [['siege', 13.5, 45], ['wizard', 15.6, 65]]) {
    const game = empty(); troop(game, type, 0, 1500);
    const primary = troop(game, 'warrior', 1, 1660);
    const inner = troop(game, 'warrior', 1, 1723.9);
    const boundary = troop(game, 'warrior', 1, 1724);
    const air = troop(game, 'gryphon', 1, 1665);
    const friend = troop(game, 'warrior', 0, 1670);
    const building = game._place('mint', 1670, 480, 1);
    for (const unit of [primary, inner, boundary, air, friend]) unit.cooldown = 100;
    game.update(0.05);
    close(primary.maxHp - primary.hp, UNITS[type].damage);
    close(inner.maxHp - inner.hp, splash);
    for (const entity of [boundary, air, friend, building]) close(entity.hp, entity.maxHp);
    assert.ok(entry(type).mechanics.some(text => text.includes('64 world units') && text.includes(`${percentage}%`) && text.includes(String(splash))));
  }
});

test('structure bonuses match the codex, while level and overtime bonuses do not inflate splash', () => {
  for (const level of [1, 2, 3]) for (const overtime of [false, true]) {
    for (const [type, multiplier, targetX, splash] of [['siege', 3, 1750, 0.45], ['wizard', 1, 1710, 0.65], ['gryphon', 0.6, 1640, 0]]) {
      const game = empty(); if (overtime) game.state.time = 301;
      troop(game, type, 0, 1500, 450, level);
      const target = game._place('mint', targetX, 450, 1);
      // Outside unit acquisition but within splash distance of the structure.
      const nearby = splash ? troop(game, 'warrior', 1, targetX + 60) : null;
      if (nearby) nearby.cooldown = 100;
      game.update(0.05);
      const damage = UNITS[type].damage * (1 + 0.12 * (level - 1));
      close(target.maxHp - target.hp, damage * multiplier * (overtime ? ECONOMY_GUIDE.overtime.unitStructureDamageMultiplier : 1));
      if (nearby) close(nearby.maxHp - nearby.hp, damage * splash);
    }
  }
  assert.match(entry('siege').mechanics.join(' '), /3× damage.*90 per level-1 hit/);
  assert.match(entry('gryphon').mechanics.join(' '), /60% of normal damage.*10\.2/);
});

test('watchtower data, warrior resistance, air defense and siege edge reach match the simulation', () => {
  const info = structure('watchtower');
  for (const key of ['name', 'cost', 'hp', 'range', 'damage']) assert.equal(info[key], BUILDINGS.watchtower[key]);
  assert.deepEqual(info.upgradeCosts, [154, 231]);
  for (const [type, damage] of [['warrior', 20.88], ['gryphon', 29]]) {
    const game = empty(), tower = game._place('watchtower', 1500, 450, 0);
    const target = troop(game, type, 1, 1600); target.cooldown = 100;
    game.update(0.05);
    close(target.maxHp - target.hp, damage);
    close(tower.cooldown, info.attackTime);
  }
  assert.match(info.mechanics.join(' '), /29 every 0\.85 s.*20\.88/);
  const game = empty(), tower = game._place('watchtower', 1900, 450, 1);
  const siege = troop(game, 'siege', 0, 1900 - UNITS.siege.range - 35);
  game.update(0.05);
  close(tower.maxHp - tower.hp, UNITS.siege.damage * 3);
  close(siege.hp, siege.maxHp);
  assert.match(entry('siege').mechanics.join(' '), /35 world units.*255 effective reach.*240 center-based reach/);
  for (const type of ['warrior', 'gryphon']) {
    const coreGame = empty(), target = troop(coreGame, type, 0, 2850); target.cooldown = 100;
    coreGame.update(0.05);
    close(target.maxHp - target.hp, 32, 'citadel is not a watchtower');
  }
});

test('skirmish starting economy is current, symmetric and independent of difficulty', () => {
  for (const difficulty of ['easy', 'normal', 'hard']) {
    const game = new Game({ ai: false, difficulty });
    for (const side of [0, 1]) {
      assert.equal(ECONOMY_GUIDE.startingGold, game.state.gold[side]);
      assert.equal(ECONOMY_GUIDE.baseIncome, game.state.income[side]);
      assert.equal(ECONOMY_GUIDE.citadelHp, game.state.bases[side].maxHp);
      assert.deepEqual(ECONOMY_GUIDE.startingBuildings, game.state.buildings.filter(building => building.side === side).map(building => ({ id: building.type, name: BUILDINGS[building.type].name, level: building.level })));
    }
    step(game, 1);
    close(game.state.gold[0], ECONOMY_GUIDE.startingGold + ECONOMY_GUIDE.baseIncome);
  }
  assert.deepEqual(ECONOMY_GUIDE.rallyStrike, SPELL);
  assert.match(ECONOMY_GUIDE.scope, /Level-1 skirmish baseline.*before upgrades or overtime.*Campaigns and field trials/);
});

test('mine marginal payback, each upgrade price and all three income levels are exact', () => {
  const info = structure('mint');
  for (const key of ['name', 'cost', 'hp', 'income']) assert.equal(info[key], BUILDINGS.mint[key]);
  assert.deepEqual(info.upgradeCosts, [1, 2].map(level => upgradeCost({ type: 'mint', level })));
  assert.deepEqual(info.levels.map(level => level.income), [2.5, 3.75, 5]);
  assert.deepEqual(info.levels.map(level => level.cost), [190, 133, 199]);
  assert.deepEqual(info.levels.map(level => level.bestCasePaybackSeconds), [76, 106.4, 159.2]);
  const game = empty(); game.state.gold[0] = 10000;
  const { building } = game.build('mint', 700, 450);
  for (const infoLevel of info.levels) {
    if (infoLevel.level > 1) {
      const before = game.state.gold[0];
      assert.ok(game.upgrade(building.id).ok);
      close(before - game.state.gold[0], infoLevel.cost);
    }
    game.update(0.05);
    close(game.state.income[0] - ECONOMY_GUIDE.baseIncome, infoLevel.income);
    close(infoLevel.bestCasePaybackSeconds, infoLevel.cost / infoLevel.marginalIncome);
  }
  const refund = game.sell(building.id).refund;
  assert.equal(refund, Math.floor((190 + 133 + 199) * 0.5));
  game.update(0.05); close(game.state.income[0], ECONOMY_GUIDE.baseIncome);
  assert.match(info.mechanics.join(' '), /76 s.*106\.4 s.*159\.2 s/);
  assert.match(info.mechanics.join(' '), /payback times assume the mine keeps working.*exclude defense costs, destruction and salvage.*need troops sooner/);
});

test('advertised caps, free ongoing production and unit-only bounty are enforced', () => {
  const game = empty(); game.state.gold[0] = 10000;
  for (const y of LANES) assert.ok(game.build('mint', 270, y).ok);
  assert.equal(game.state.buildings.length, ECONOMY_GUIDE.mineCap);
  assert.equal(game.build('mint', 700, 450).ok, false);
  const gold = game.state.gold[0];
  for (let index = 0; index < ECONOMY_GUIDE.unitCap + 1; index++) troop(game, 'warrior', 0, 1500);
  assert.equal(game.state.units.length, ECONOMY_GUIDE.unitCap);
  assert.equal(game.state.gold[0], gold);
  const enemy = troop(game, 'warrior', 1, 1800);
  game._damage(enemy, enemy.hp, 0);
  assert.equal(game.state.gold[0] - gold, ECONOMY_GUIDE.killBounty);
  const mint = game._place('mint', 2200, 450, 1), before = game.state.gold[0];
  game._damage(mint, mint.hp, 0); assert.equal(game.state.gold[0], before);
  const crowded = empty(); crowded.state.gold[0] = 10000;
  for (const y of LANES) for (let index = 0; index < 8; index++) assert.ok(crowded.build('barracks', 250 + index * 120, y).ok);
  assert.equal(crowded.state.buildings.length, ECONOMY_GUIDE.buildingCap);
  assert.equal(crowded.build('barracks', 1210, 450).ok, false);
});

test('upgrade and overtime summaries match executable production, health and damage rules', () => {
  for (const unit of UNIT_CODEX) for (const level of [1, 2, 3]) {
    const game = empty(); game.state.gold[0] = 10000;
    const building = game._place(unit.production.id, 700, 450, 0);
    for (let previous = 1; previous < level; previous++) assert.ok(game.upgrade(building.id).ok);
    close(building.maxHp, unit.production.hp * (1 + 0.4 * (level - 1)));
    const soldier = troop(game, unit.id, 0, 1500, 450, level);
    close(soldier.maxHp, unit.baseStats.hp * (1 + 0.12 * (level - 1)));
    building.progress = 0; game.update(0.05);
    close(building.progress, 0.05 * (1 + 0.22 * (level - 1)) / unit.production.spawnTime);
    game.state.time = ECONOMY_GUIDE.overtime.startSeconds; building.progress = 0;
    game.update(0.05);
    close(building.progress, 0.05 * (1 + 0.22 * (level - 1)) * ECONOMY_GUIDE.overtime.productionMultiplier / unit.production.spawnTime);
    if (level === ECONOMY_GUIDE.maxLevel) assert.equal(game.upgrade(building.id).ok, false);
  }
  for (const level of [1, 2, 3]) {
    const game = empty(); game.state.gold[0] = 10000;
    const tower = game._place('watchtower', 1500, 450, 0);
    while (tower.level < level) game.upgrade(tower.id);
    const target = troop(game, 'gryphon', 1, 1600); target.cooldown = 100;
    game.update(0.05);
    close(target.maxHp - target.hp, BUILDINGS.watchtower.damage * (1 + 0.3 * (level - 1)));
  }
});

test('codex is recursively immutable while engine state stays mutable and registered definitions stay frozen', () => {
  for (const value of [UNIT_CODEX, STRUCTURE_CODEX, ECONOMY_GUIDE]) assertFrozen(value);
  assert.throws(() => { UNIT_CODEX[0].baseStats.hp = 1; }, TypeError);
  assert.throws(() => { structure('mint').levels.push({}); }, TypeError);
  assert.ok(Object.isFrozen(UNITS.warrior));
  assert.ok(Object.isFrozen(BUILDINGS.barracks));
  assert.ok(Object.isFrozen(SPELL));
  assert.ok(!Object.isFrozen(new Game({ ai: false }).state));
  assert.notEqual(ECONOMY_GUIDE.rallyStrike, SPELL);
});

test('number formatters keep exact useful decimals and handle invalid values consistently', () => {
  assert.equal(formatNumber(1.05), '1.05');
  assert.equal(formatNumber(180), '180');
  assert.equal(formatNumber(9.350000000000001), '9.35');
  assert.equal(formatNumber(-0), '0');
  assert.equal(formatNumber(1 / 3, 3), '0.333');
  assert.equal(formatNumber(NaN), '—');
  assert.equal(formatNumber(Infinity), '—');
  assert.equal(formatNumber('12'), '—');
  assert.equal(formatSeconds(1.05), '1.05 s');
  assert.equal(formatSeconds(15), '15 s');
});
