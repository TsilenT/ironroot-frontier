import test, {after} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, rm, readFile, readdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {Game as BaselineGame} from '../../dist/engine.js';
import {prepareLab} from './prepare-lab.mjs';

const temp = await mkdtemp(path.join(tmpdir(), 'ironroot-colossus-test-'));
const lab = await prepareLab(path.join(temp, 'lab'));
after(() => rm(temp, {recursive: true, force: true}));
const {Game} = await import(pathToFileURL(path.join(lab, 'dist/engine.js')));
const {COLOSSUS, COLOSSUS_IDS, ENCOUNTER, bodyDistance} = await import(pathToFileURL(path.join(lab, 'dist/colossus.js')));
const {createColossusScenario} = await import(pathToFileURL(path.join(lab, 'dist/colossus-scenario.js')));
const advance = (g, ticks) => {for (let n = 0; n < ticks && g.state.winner === null; n++) g.update(.05);};
function blank(mode = 'aftermath') {
  const g = new Game({ai: false, rulesetId: COLOSSUS_IDS[mode === 'aftermath' ? 0 : 1]});
  g.state.buildings = []; g.state.effects = []; return g;
}
function deploy(mode = 'aftermath', hp = 600) {
  const g = blank(mode); g.state.bases[1].hp = hp; g.update(.05); return g;
}
const bossOf = g => g.state.units.find(u => u.type === 'colossus');
function addUnit(g, type, x, lane = 1, side = 0) {
  const building = {warrior: 'barracks', archer: 'archery', siege: 'foundry', wizard: 'sanctum', gryphon: 'aerie', rootwarden: 'wardenLodge'}[type];
  g._spawn({type: building, side, x: x - (side ? -48 : 48), lane, level: 1});
  const unit = g.state.units.at(-1); unit.x = x; unit.y = g.map.lanes[lane]; unit.cooldown = 0;
  return unit;
}

test('external lab generation leaves every production runtime byte unchanged', async () => {
  const files = await readdir(new URL('../../dist/', import.meta.url));
  const before=new Map(await Promise.all(files.map(async name=>[name,await readFile(new URL(`../../dist/${name}`,import.meta.url))])));
  for(const bytes of before.values())assert.doesNotMatch(bytes.toString(),/frontier-qa-colossus/);
  await prepareLab(path.join(temp,'source-preservation-check'));
  for(const [name,bytes]of before)assert.deepEqual(await readFile(new URL(`../../dist/${name}`,import.meta.url)),bytes,name);
  await assert.rejects(() => prepareLab(lab), /EEXIST/);
  await assert.rejects(() => prepareLab(new URL('./unsafe-output', import.meta.url).pathname), /outside/);
});

test('QA-only identities reject normal engine/profile admission rather than becoming campaign content', async () => {
  assert.throws(() => new BaselineGame({rulesetId: COLOSSUS_IDS[0]}), /Unknown ruleset/);
  const g = deploy(); assert.deepEqual(Game.restore(g.serialize()).serialize(), g.serialize());
  assert.throws(() => BaselineGame.restore(g.serialize()), /unknown or unsupported/);
  const {validateBattleIdentity} = await import(pathToFileURL(path.join(lab, 'dist/battle-codec.js')));
  assert.throws(() => validateBattleIdentity({ruleset: {id: COLOSSUS_IDS[0], revision: 1}, map: {id: 'classic', revision: 1}, scenario: {kind: 'skirmish', id: 'standard', revision: 1}}), /isolated QA shell/);
  assert.throws(() => new Game({mapId: 'twin-span', rulesetId: COLOSSUS_IDS[0]}), /Classic/);
});

for (const hp of [600, 1, 0]) test(`late threshold at ${hp} HP deploys one full-health boss atomically`, () => {
  const g = deploy('aftermath', hp), p = g.state.colossus, b = bossOf(g);
  assert.equal(p.phase, 'active'); assert.equal(p.triggeredAt, 1); assert.equal(b.hp, 10000); assert.equal(b.id, p.bossId);
  assert.equal(g.state.winner, null); assert.deepEqual(Game.restore(g.serialize()).serialize(), g.serialize());
  advance(g, 20); assert.equal(g.state.units.filter(u => u.type === 'colossus').length, 1);
});

test('HP above threshold never triggers on elapsed time alone', () => {
  const g = blank(); g.state.bases[1].hp = 600.00001; advance(g, 1000);
  assert.equal(g.state.colossus.phase, 'armed'); assert.equal(bossOf(g), undefined);
});

test('emergence lasts exactly three seconds, is targetable, and grants no invulnerability', () => {
  const g = deploy(), b = bossOf(g), x = b.x;
  addUnit(g, 'archer', b.x - 250, 1); g.update(.05); assert.equal(b.hp, 9983);
  advance(g, ENCOUNTER.emergeTicks - 2); assert.equal(b.x, x);
  g.update(.05); assert.ok(b.x < x);
});

test('lethal 310px breakout clears all ordinary core attack ranges, not remote armies or buildings', () => {
  const g = blank(), core = g.state.bases[1];
  const affected = ['warrior', 'archer', 'siege', 'wizard', 'gryphon', 'rootwarden'].map(type => addUnit(g, type, core.x - g.units[type].range - 55));
  const outside = addUnit(g, 'warrior', core.x - ENCOUNTER.pulseRadius - 10);
  const ally = addUnit(g, 'warrior', core.x - 20, 1, 1);
  const built = g.build('barracks', 1250, 450).building;
  g.state.bases[1].hp = 600; g.update(.05);
  assert.ok(affected.every(u => u.hp === 0)); assert.ok(outside.hp > 0); assert.ok(ally.hp > 0); assert.ok(built.hp > 0);
  assert.equal(g.state.stats.kills[1], affected.length);
});

test('one slot is reserved before deployment and the ordinary 70-unit cap is never exceeded', () => {
  const g = new Game({ai: false, rulesetId: COLOSSUS_IDS[0]}), producer = g.state.buildings.find(b => b.side === 1);
  for (let n = 0; n < 80; n++) g._spawn(producer);
  assert.equal(g.state.units.filter(u => u.side === 1).length, 69);
  g.state.bases[1].hp = 600; g.update(.05);
  assert.equal(g.state.units.filter(u => u.side === 1).length, 70);
  assert.equal(g.state.units.filter(u => u.type === 'colossus').length, 1);
  assert.deepEqual(Game.restore(g.serialize()).serialize(), g.serialize());
});

for (const type of ['warrior', 'archer', 'siege', 'wizard', 'rootwarden', 'gryphon']) test(`${type}: actual attacks from all three roads damage the body`, () => {
  const g = deploy(), boss = bossOf(g), radius = type === 'warrior' || type === 'rootwarden' ? 150 : 250;
  const units = [0, 1, 2].map(lane => addUnit(g, type, boss.x - radius, lane));
  const expected = 3 * g.units[type].damage; g.update(.05);
  assert.equal(boss.hp, 10000 - expected);
  assert.deepEqual(units.map(u => u.lane), [0, 1, 2]);
  assert.deepEqual(Game.restore(g.serialize()).serialize(), g.serialize());
});

test('body geometry is real and ordinary units do not gain cross-lane ground attacks', () => {
  const g = blank();
  const a = addUnit(g, 'warrior', 1600, 0), b = addUnit(g, 'warrior', 1600, 2, 1);
  g.update(.05); assert.equal(a.hp, 180); assert.equal(b.hp, 180);
  assert.equal(bodyDistance({x: 0, y: 0}, {type: 'colossus', x: 300, y: 0}), 90);
});

test('wide-body air perception, retention and saved locks use the same distance', () => {
  const g = deploy(), boss = bossOf(g), flyer = addUnit(g, 'gryphon', boss.x - 460, 0);
  assert.ok(Math.hypot(flyer.x - boss.x, flyer.y - boss.y) > 420);
  g.update(.05); assert.equal(flyer.airTargetId, boss.id);
  assert.deepEqual(Game.restore(g.serialize()).serialize(), g.serialize());
  g._damage(boss, boss.hp, 0); g.update(.05); assert.equal(flyer.airTargetId, null);
});

test('volley can hit the physical body without aiming at its centre', () => {
  const g = deploy(), boss = bossOf(g); g.state.gold[0] = 1000;
  assert.ok(g.cast(boss.x - 300, boss.y).ok); assert.equal(boss.hp, 9908);
  assert.deepEqual(Game.restore(g.serialize()).serialize(), g.serialize());
});

test('a finishing Volley settles phase and victory before a paused/immediate save', () => {
  for (const enemyHp of [0, 600]) {
    const g = deploy('aftermath', enemyHp); g.update(.05); const boss = bossOf(g);
    // Synthetic damage fixture leaves an ordinary legal 92-HP target for the public command.
    g._damage(boss, boss.hp - 92, 0); g.state.gold[0] = 1000;
    const at = g.tick; assert.ok(g.cast(boss.x, boss.y).ok);
    assert.equal(g.tick, at); assert.equal(g.state.colossus.phase, 'defeated'); assert.equal(bossOf(g), undefined);
    assert.equal(g.state.winner, enemyHp === 0 ? 0 : null);
    assert.deepEqual(Game.restore(g.serialize()).serialize(), g.serialize());
  }
});

test('towers and citadels use physical-body range, not the distant centre', () => {
  const g = deploy(), boss = bossOf(g); g.state.gold[0] = 1000; const tower = g.build('watchtower', 1250, 450).building;
  while (boss.x > 1600) g.update(.05);
  tower.cooldown = 0; const hp = boss.hp;
  assert.ok(Math.hypot(boss.x - tower.x, boss.y - tower.y) > 240);
  assert.ok(bodyDistance(boss, tower) < 240); g.update(.05); assert.ok(boss.hp < hp);
  const coreGame = deploy(), target = bossOf(coreGame);
  while (target.x > 620) coreGame.update(.05);
  const core = coreGame.state.bases[0], before = target.hp; core.cooldown = 0;
  assert.ok(Math.hypot(target.x - core.x, target.y - core.y) > 310);
  assert.ok(bodyDistance(target, core) < 310); coreGame.update(.05); assert.ok(target.hp < before);
});

test('boss marches through a surviving defender instead of stopping on it', () => {
  const g = deploy(), boss = bossOf(g); advance(g, ENCOUNTER.emergeTicks);
  const unit = addUnit(g, 'rootwarden', boss.x - 50, 0), before = boss.x;
  g.update(.05); assert.ok(unit.hp > 0 && unit.hp < 800); assert.ok(boss.x < before);
  assert.equal(boss.y, 450); assert.equal(boss.lane, 1);
});

test('aftermath continues after the core falls, allows replacement purchases and stops dead-core AI purchases', () => {
  const g = deploy('aftermath', 0), boss = bossOf(g); g.ai = true;
  assert.equal(g.state.winner, null); g.state.gold = [1000, 1000];
  assert.ok(g.build('archery', 690, 260).ok);
  const enemyGold = g.state.gold[1], count = g.state.buildings.length; g._ai(1);
  assert.equal(g.state.gold[1], enemyGold); assert.equal(g.state.buildings.length, count);
  g._damage(boss, boss.hp, 0); g.update(.05);
  assert.equal(g.state.winner, 0); assert.equal(g.state.colossus.phase, 'defeated');
  assert.deepEqual(Game.restore(g.serialize()).serialize(), g.serialize());
});

test('core-race comparison explicitly ends with a living boss', () => {
  const g = deploy('core-race', 0); assert.equal(g.state.winner, 0); assert.ok(bossOf(g).hp > 0);
  assert.deepEqual(Game.restore(g.serialize()).serialize(), g.serialize());
});

test('core-race simultaneous core deaths still draw after an earlier boss deployment', () => {
  const g = deploy('core-race'); g.state.bases.forEach(b => {b.hp = 0;}); g.update(.05);
  assert.equal(g.state.winner, 'draw'); assert.deepEqual(Game.restore(g.serialize()).serialize(), g.serialize());
});

test('the surviving aftermath citadel can purchase and regenerate; the dead enemy cannot', () => {
  const g = deploy('aftermath', 0); g.state.gold = [1000, 1000]; g.state.bases[0].hp = 5000;
  assert.ok(g.buyCitadelOption('regen').ok); const hp = g.state.bases[0].hp;
  assert.equal(g.buyCitadelOption('arrows', 1).ok, false);
  advance(g, 210); assert.ok(g.state.bases[0].hp > hp); assert.equal(g.state.bases[1].hp, 0);
  assert.ok(g.state.citadelOptions.sides[0].healedTotal > 0);
  assert.deepEqual(Game.restore(g.serialize()).serialize(), g.serialize());
  const arrows = deploy('aftermath', 0); arrows.state.gold[0] = 1000; assert.ok(arrows.buyCitadelOption('arrows').ok);
});

test('a boss that reaches a dead-enemy-core aftermath can win, not produce a spurious draw', () => {
  const g = deploy('aftermath', 0); advance(g, 2600);
  assert.equal(g.state.winner, 1); assert.equal(g.state.bases[0].hp, 0); assert.ok(bossOf(g).hp > 0);
  assert.deepEqual(Game.restore(g.serialize()).serialize(), g.serialize());
});

test('simultaneous boss/player-core deaths draw after enemy core destruction; no boss on an already-lost trigger', () => {
  const g = deploy('aftermath', 0), boss = bossOf(g);
  g._damage(boss, boss.hp, 0); g._damage(g.state.bases[0], 6000, 1); g.update(.05);
  assert.equal(g.state.winner, 'draw'); assert.deepEqual(Game.restore(g.serialize()).serialize(), g.serialize());
  const both = blank(); both.state.bases.forEach(b => {b.hp = 0;}); both.update(.05);
  assert.equal(both.state.winner, 'draw'); assert.equal(bossOf(both), undefined);
});

test('one-shot defeat survives continued combat and cannot respawn from low health', () => {
  const g = deploy(), boss = bossOf(g); g._damage(boss, boss.hp, 0); g.update(.05);
  const id = g.state.colossus.bossId; advance(g, 200);
  assert.equal(g.state.colossus.phase, 'defeated'); assert.equal(g.state.colossus.bossId, id); assert.equal(bossOf(g), undefined);
});

test('save/resume preserves real combat through emergence, march, targeting and aftermath', () => {
  for (const cut of [0, 1, 38, 39, 40, 98, 99, 500, 900]) {
    const g = createColossusScenario(); advance(g, cut);
    const clone = Game.restore(g.serialize());
    advance(g, 100); advance(clone, 100); assert.deepEqual(clone.serialize(), g.serialize());
  }
});

test('disclosed staged late-battle fixture reaches the aftermath with no surviving enemy buildings', () => {
  const g = createColossusScenario(); assert.equal(g.state.bases[1].hp, 80);
  assert.equal(g.state.buildings.filter(b => b.side === 1).length, 0);
  g.update(.05); assert.equal(g.state.bases[1].hp, 0); assert.equal(g.state.colossus.phase, 'active');
  assert.equal(g.state.winner, null); assert.deepEqual(Game.restore(g.serialize()).serialize(), g.serialize());
});

test('malformed phase, body, outcome and identity links reject', () => {
  const original = deploy().serialize();
  for (const mutate of [
    s => {s.colossus.extra = 1;}, s => {s.colossus.phase = 'invented';}, s => {s.colossus.bossId++;},
    s => {s.colossus.triggeredAt = 0;}, s => {s.colossus.triggeredAt = 2;}, s => {s.colossus.defeatedAt = 1;},
    s => {s.colossus.coreFellAt = 1;}, s => {s.units[0].side = 0;}, s => {s.units[0].y = 260;},
    s => {s.units[0].lane = 0;}, s => {s.units[0].cooldown = 20;}, s => {s.units[0].attack = 1;}, s => {s.units[0].x -= 1;},
    s => {s.units[0].level = 2;}, s => {s.units = [];}, s => {s.winner = 0;}
  ]) {const data = structuredClone(original); mutate(data.state); assert.throws(() => Game.restore(data));}
  const falseWin = deploy('aftermath', 0).serialize(); falseWin.state.winner = 0; assert.throws(() => Game.restore(falseWin), /terminal outcome/);
  const clock = deploy('core-race', 0).serialize(); clock.tick++; clock.state.time += .05; clock.state.units[0].cooldown = -.05;
  assert.throws(() => Game.restore(clock), /terminal clock/);
  clock.state.colossus.endedAt = clock.tick; assert.throws(() => Game.restore(clock), /terminal event clock/);
  const timer = deploy(); timer.update(.05);
  for (const mutate of [s => {s.units[0].cooldown = 20;}, s => {s.units[0].attack = 1;}, s => {s.units[0].cooldown = 1;}, s => {s.units[0].attack = .1;}, s => {s.units[0].hit = .5;}]) {
    const data = timer.serialize(); mutate(data.state); assert.throws(() => Game.restore(data), /timer/);
  }
  const finished = deploy('aftermath', 0); finished.update(.05); finished._damage(bossOf(finished), 10000, 0); finished.update(.05);
  const later = finished.serialize(); later.tick++; later.state.time += .05; later.state.colossus.endedAt = later.tick;
  assert.throws(() => Game.restore(later), /terminal event clock/);
  later.state.bases[0].hp = 0; later.state.colossus.playerFellAt = later.tick; later.state.winner = 1;
  assert.throws(() => Game.restore(later), /terminal outcome/);
});

for (const [rulesetId, mapId] of [
  ['frontier-legacy', 'classic'], ['frontier-citadel-open', 'classic'], ['frontier-citadel-open', 'twin-span'],
  ['frontier-campaign-long-screen', 'classic'], ['frontier-campaign-salt-stores', 'classic'],
  ['frontier-campaign-false-quiet-a', 'classic'], ['frontier-campaign-borrowed-ground', 'borrowed-yard']
]) test(`unchanged identity parity: ${rulesetId}/${mapId}`, () => {
  const a = new BaselineGame({rulesetId, mapId, seed: 101}), b = new Game({rulesetId, mapId, seed: 101});
  for (let n = 0; n < 1000; n++) {a.update(.05); b.update(.05);}
  assert.deepEqual(b.serialize(), a.serialize()); assert.deepEqual(Game.restore(b.serialize()).serialize(), a.serialize());
});

// New integration checks on the reviewed v0.39 source, beyond PR42's fixtures.
test('queued simultaneous lethal core attacks resolve own-core priority without deployment',()=>{
  const g=blank();g.state.bases.forEach(b=>{b.hp=1;});
  addUnit(g,'warrior',g.state.bases[1].x-65,1,0);
  addUnit(g,'warrior',g.state.bases[0].x+65,1,1);
  g.update(.05);assert.equal(g.state.winner,'draw');assert.equal(g.state.colossus.phase,'armed');assert.equal(bossOf(g),undefined);
  assert.deepEqual(Game.restore(g.serialize()).serialize(),g.serialize());
});
test('queued lethal attack triggers once, local pulse boundary is inclusive, restored state never pulses again',()=>{
  const g=blank(),core=g.state.bases[1];core.hp=1;
  addUnit(g,'warrior',core.x-65);
  const atBoundary=addUnit(g,'archer',core.x-310);atBoundary.cooldown=1;
  const outside=addUnit(g,'archer',core.x-310.01);outside.cooldown=1;
  // Archers already have the core in reach, so they do not move across the boundary.
  // Freeze only fixture movement for one tick via an in-range enemy target.
  const blocker=addUnit(g,'rootwarden',core.x-300,1,1);blocker.cooldown=1;
  g.update(.05);assert.equal(core.hp,0);assert.equal(g.state.colossus.phase,'active');
  assert.equal(atBoundary.hp,0);assert.ok(outside.hp>0);
  const restored=Game.restore(g.serialize()),id=restored.state.colossus.bossId;
  const survivor=addUnit(restored,'rootwarden',core.x-20,0);restored.update(.05);
  assert.ok(survivor.hp>0);assert.equal(restored.state.colossus.bossId,id);
});
test('existing enemy factories continue after core death and registered air stays enabled',()=>{
  const g=new Game({ai:false,rulesetId:COLOSSUS_IDS[0]});g.state.bases[1].hp=0;g.update(.05);
  const {phase}=g.state.colossus;assert.equal(phase,'active');
  advance(g,30);assert.ok(g.state.units.some(u=>u.side===1&&u.type==='warrior'));
});
const generatedEngine=await import(pathToFileURL(path.join(lab,'dist/engine.js')));
const generatedRules=await import(pathToFileURL(path.join(lab,'dist/rulesets.js')));
test('QA rules use exact registry identities and copied rules cannot silently enable autonomous air',()=>{
  const g=blank();assert.equal(generatedRules.RULESETS[g.ruleset.id],g.ruleset);
  assert.equal(generatedEngine.supportsAutonomousAir(g.ruleset),true);
  assert.equal(generatedEngine.supportsAutonomousAir({...g.ruleset}),false);
});
for(const id of ['frontier-campaign-bowstrings','frontier-campaign-three-minutes','frontier-campaign-leave-roads','frontier-campaign-empty-purse','frontier-campaign-wake-reserve','frontier-fog-skirmish-open']) {
  assert.ok(generatedRules.RULESETS[id],`Missing expected baseline identity ${id}`);
  test(`current identity remains byte-equivalent: ${id}`,()=>{
    const a=new BaselineGame({rulesetId:id,seed:37}),b=new Game({rulesetId:id,seed:37});
    advance(a,1200);advance(b,1200);assert.deepEqual(b.serialize(),a.serialize());
  });
}

const sourceCampaign=await import('../../dist/campaign.js');
const labCampaign=await import(pathToFileURL(path.join(lab,'dist/campaign.js')));
for(const id of ['wake-the-reserve','the-empty-purse','leave-no-road-closed','three-minutes-more','cut-the-bowstrings','lanterns-on-the-water'])test(`bound current campaign factory/restore parity: ${id}`,()=>{
  const a=sourceCampaign.createCampaignMission(id),b=labCampaign.createCampaignMission(id);
  advance(a,1200);advance(b,1200);assert.deepEqual(b.serialize(),a.serialize());
  assert.deepEqual(Game.restore(b.serialize()).serialize(),BaselineGame.restore(a.serialize()).serialize());
});
