import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../dist/engine.js';
import { CAMPAIGN_MISSIONS, createCampaignMission, getCampaignTargets, evaluateCampaignMission } from '../dist/campaign.js';
import { advanceObjectiveBattle } from '../dist/objectives.js';
import { createProtectedObjectiveMonitor } from '../dist/protected-objectives.js';
import {
  createObjectiveAlertPolicy,
  OBJECTIVE_ALERT_RECOVERY_RATIO,
  OBJECTIVE_WARNING_QUIET_SECONDS,
} from '../dist/objective-alerts.js';

const target = (originalId = 1, hp = 100, maxHp = 100, extra = {}) => Object.freeze({
  originalId, label: originalId === 1 ? 'North gold mine' : 'South barracks',
  hp, maxHp, ratio: hp / maxHp, percent: Math.ceil(hp / maxHp * 100),
  status: hp <= 0 ? 'lost' : hp / maxHp <= .3 ? 'critical' : hp < maxHp ? 'damaged' : 'healthy',
  loss: null, ...extra,
});
const snapshot = (...targets) => Object.freeze(targets);
function fixture(ids = [1]) {
  const battleKey = Object.freeze({});
  const policy = createObjectiveAlertPolicy({ battleKey, targetIds: ids });
  return {
    policy, battleKey,
    observe: (...targets) => policy.observe(snapshot(...targets), { battleKey }),
    flush: (now = 0, options = {}) => policy.flush({ battleKey, active: true, now, ...options }),
  };
}

test('construction requires an explicit battle identity and unique valid original IDs', () => {
  for (const config of [undefined, {}, { battleKey: null, targetIds: [1] },
    { battleKey: {}, targetIds: [1, 1] }, { battleKey: {}, targetIds: [''] },
    { battleKey: {}, targetIds: [NaN] }, { battleKey: {}, targetIds: [{}] }])
    assert.throws(() => createObjectiveAlertPolicy(config), TypeError);
  assert.ok(Object.isFrozen(createObjectiveAlertPolicy({ battleKey: {}, targetIds: [] })));
});

test('healthy, damaged, empty and unchanged observations do not produce warnings', () => {
  const f = fixture();
  for (const hp of [100, 100, 99, 75, 31, 30.00001]) {
    f.observe(target(1, hp));
    assert.equal(f.flush(), null);
  }
  const empty = fixture([]);
  assert.equal(empty.observe(), true);
  assert.equal(empty.flush(), null);
});

test('a full-health original reaching exactly 30% produces one named current-HP cue', () => {
  const f = fixture();
  f.observe(target());
  f.observe(target(1, 30));
  const cue = f.flush();
  assert.equal(cue.kind, 'critical-danger');
  assert.equal(cue.sound, 'warning');
  assert.equal(cue.message, 'Critical health: North gold mine (30% HP).');
  assert.deepEqual(cue.targets, [{ originalId: 1, label: 'North gold mine', hp: 30,
    maxHp: 100, ratio: .3, percent: 30, reason: 'health-decreased' }]);
  assert.equal(f.flush(99), null);
});

test('thresholds use actual HP rather than rounded percentages or an inconsistent status', () => {
  const f = fixture();
  f.observe(target());
  f.observe(target(1, 30.01, 100, { percent: 30, ratio: .3, status: 'critical' }));
  assert.equal(f.flush(), null);
  f.observe(target(1, 29, 100, { percent: 100, ratio: 1 }));
  assert.equal(f.flush().targets[0].percent, 29);
  const inconsistent = fixture();
  inconsistent.observe(target(1, 20, 100, { status: 'healthy' }));
  assert.equal(inconsistent.flush(), null);
});

test('a loaded critical target is current danger once, not invented historical damage', () => {
  const f = fixture();
  f.observe(target(1, 2));
  const cue = f.flush();
  assert.equal(cue.targets[0].reason, 'current-danger');
  assert.match(cue.message, /North gold mine \(2% HP\)/);
  assert.doesNotMatch(cue.message, /attacked|enemy|siege|save|recover|just|damage|restored/i);
  f.observe(target(1, 1));
  assert.equal(f.flush(100), null);
});

test('repeated critical HP ticks, redraws, pans and elapsed cooldown never repeat an episode', () => {
  const f = fixture();
  f.observe(target(1, 30));
  assert.equal(f.flush().sound, 'warning');
  for (let i = 1; i <= 500; i++) {
    f.observe(target(1, 30 - i * .05, 100, { x: i * 10, camera: i * 50, cooldown: i }));
    assert.equal(f.flush(i), null);
  }
});

test('multiple fixed-step transitions batch into one sound and current named snapshots', () => {
  const f = fixture([1, 2]);
  f.observe(target(), target(2));
  f.observe(target(1, 30), target(2));
  f.observe(target(1, 22), target(2, 29));
  const cue = f.flush();
  assert.equal(cue.sound, 'warning');
  assert.deepEqual(cue.targets.map(t => [t.originalId, t.hp]), [[1, 22], [2, 29]]);
  assert.equal(cue.message, 'Critical health: North gold mine (22% HP), South barracks (29% HP).');
  assert.equal(f.flush(100), null);
});

test('original identities, not array position, drive episodes and deterministic batch ordering', () => {
  const f = fixture([1, 2]);
  f.observe(target(), target(2));
  f.observe(target(2, 20), target(1, 25));
  assert.deepEqual(f.flush().targets.map(t => t.originalId), [1, 2]);
  f.observe(target(2, 19), target(1, 24));
  assert.equal(f.flush(100), null);
});

test('a closely spaced new target still gets named text but no second sound or delayed replay', () => {
  const f = fixture([1, 2]);
  f.observe(target(1, 30), target(2));
  assert.equal(f.flush(10).sound, 'warning');
  f.observe(target(1, 29), target(2, 30));
  const next = f.flush(10.1);
  assert.equal(next.sound, null);
  assert.deepEqual(next.targets.map(t => t.originalId), [2]);
  assert.match(next.message, /South barracks/);
  assert.equal(f.flush(1000), null);
});

test('a fresh target after the wall-clock quiet window may sound, including the exact boundary', () => {
  const f = fixture([1, 2]);
  f.observe(target(1, 30), target(2));
  f.flush(5);
  f.observe(target(1, 29), target(2, 20));
  assert.equal(f.flush(5 + OBJECTIVE_WARNING_QUIET_SECONDS).sound, 'warning');
});

test('hysteresis keeps 30/31% jitter and exactly 40% recovery in the same episode', () => {
  const f = fixture();
  f.observe(target(1, 30));
  f.flush();
  for (const hp of [31, 29, 40, 30, 39, 20]) {
    f.observe(target(1, hp));
    assert.equal(f.flush(100), null);
  }
  assert.equal(OBJECTIVE_ALERT_RECOVERY_RATIO, .4);
});

test('recovery above 40% rearms only a new critical HP decrease, not recovery itself', () => {
  const f = fixture();
  f.observe(target(1, 20));
  f.flush();
  f.observe(target(1, 40.001));
  assert.equal(f.flush(100), null);
  f.observe(target(1, 30));
  assert.equal(f.flush(101).targets[0].reason, 'health-decreased');
});

test('recovered re-entry inside the quiet window updates text once without replaying sound', () => {
  const f = fixture();
  f.observe(target(1, 20)); f.flush();
  f.observe(target(1, 80));
  f.observe(target(1, 20));
  assert.equal(f.flush(.1).sound, null);
  assert.equal(f.flush(100), null);
});

test('safe HP increases, full upgrades and max-HP-only ratio changes do not trigger alerts', () => {
  const f = fixture();
  f.observe(target(1, 100));
  f.observe(target(1, 150, 150));
  assert.equal(f.flush(), null);
  f.observe(target(1, 150, 600));
  assert.equal(f.flush(), null);
  f.observe(target(1, 160, 700));
  assert.equal(f.flush(), null);
  f.observe(target(1, 159, 700));
  assert.equal(f.flush().targets[0].reason, 'health-decreased');
});

test('safe ratio-only re-entry does not warn after an announced episode and recovery', () => {
  const f = fixture();
  f.observe(target(1, 20)); f.flush();
  f.observe(target(1, 50));
  f.observe(target(1, 50, 200));
  assert.equal(f.flush(100), null);
  f.observe(target(1, 49, 200));
  assert.equal(f.flush(101).sound, 'warning');
});

test('initial critical danger waits through paused/help/settings/hidden/safety-blocked delivery', () => {
  const f = fixture();
  f.observe(target(1, 20));
  for (const context of ['paused', 'help', 'settings', 'hidden', 'safety-blocked'])
    assert.equal(f.flush(10, { active: false, context }), null);
  assert.equal(f.flush(11).targets[0].reason, 'current-danger');
  assert.equal(f.flush(12, { active: false }), null);
  assert.equal(f.flush(13), null);
});

test('a genuine transition immediately before pause remains pending and uses current HP on resume', () => {
  const f = fixture();
  f.observe(target()); f.flush();
  f.observe(target(1, 30));
  assert.equal(f.flush(1, { active: false }), null);
  f.observe(target(1, 28));
  assert.equal(f.flush(2, { active: false }), null);
  const cue = f.flush(3);
  assert.equal(cue.targets[0].reason, 'health-decreased');
  assert.equal(cue.targets[0].hp, 28);
  assert.equal(f.flush(4), null);
});

test('pausing/resuming an already announced critical target never creates another alert', () => {
  const f = fixture();
  f.observe(target(1, 20)); f.flush();
  for (let i = 1; i <= 20; i++) {
    assert.equal(f.flush(i * 20, { active: false }), null);
    f.observe(target(1, 20 - i * .1));
    assert.equal(f.flush(i * 20 + 10), null);
  }
});

test('pending danger that recovers above critical is canceled instead of replayed on resume', () => {
  const f = fixture();
  f.observe(target(1, 20));
  f.flush(1, { active: false });
  f.observe(target(1, 31));
  assert.equal(f.flush(2), null);
  // It was never announced, so another genuine HP decrease can still warn.
  f.observe(target(1, 29));
  assert.equal(f.flush(3).targets[0].reason, 'health-decreased');
});

test('initial missing targets and critical originals lost before flush never warn', () => {
  const f = fixture();
  f.observe(target(1, 0, 100, { hp: null, maxHp: null }));
  assert.equal(f.flush(), null);
  const pending = fixture();
  pending.observe(target(1, 20));
  pending.observe(target(1, 0, 100, { loss: Object.freeze({ scope: 'observed-transition' }) }));
  assert.equal(pending.flush(), null);
});

test('an original is terminally lost even if later snapshots try to resurrect its ID', () => {
  const f = fixture();
  f.observe(target(1, 0));
  f.observe(target());
  f.observe(target(1, 20));
  assert.equal(f.flush(), null);
});

test('a retained loss record suppresses a seemingly live critical original', () => {
  const f = fixture();
  f.observe(target(1, 20, 100, { loss: Object.freeze({ scope: 'already-missing' }) }));
  assert.equal(f.flush(), null);
});

test('losing one queued original removes only that original from a remaining valid batch', () => {
  const f = fixture([1, 2]);
  f.observe(target(1, 20), target(2, 20));
  f.observe(target(1, 0), target(2, 18));
  assert.deepEqual(f.flush().targets.map(t => t.originalId), [2]);
});

for (const terminal of ['ended', 'stale']) test(`${terminal} suppresses and permanently closes queued warnings, even while inactive`, () => {
  const f = fixture();
  f.observe(target(1, 20));
  assert.equal(f.flush(1, { active: false, [terminal]: true }), null);
  assert.equal(f.observe(target()), false);
  assert.equal(f.observe(target(1, 20)), false);
  assert.equal(f.flush(100), null);
});

test('explicit close is idempotent and cannot be reversed by later active calls', () => {
  const f = fixture();
  f.observe(target(1, 20));
  f.policy.close(); f.policy.close();
  assert.equal(f.flush(), null);
  assert.equal(f.observe(target(1, 10)), false);
});

test('wrong or omitted battle identity fails closed and discards old pending episodes', () => {
  for (const battleKey of [undefined, null, {}]) {
    for (const method of ['observe', 'flush']) {
      const f = fixture();
      f.observe(target(1, 20));
      const result = method === 'observe'
        ? f.policy.observe(snapshot(target(1, 19)), { battleKey })
        : f.policy.flush({ battleKey, active: true, now: 0 });
      assert.equal(result, method === 'observe' ? false : null);
      assert.equal(f.flush(100), null);
      assert.equal(f.observe(target(1, 18)), false);
    }
  }
});

test('new battle/retry/restore instances are independent even with identical original IDs', () => {
  const old = fixture();
  old.observe(target(1, 20)); old.flush(100);
  const fresh = fixture();
  fresh.observe(target(1, 20));
  assert.equal(fresh.flush(100).sound, 'warning');
  assert.equal(fresh.policy.observe(snapshot(target(1, 10)), { battleKey: old.battleKey }), false);
  assert.equal(old.flush(101), null);
});

test('a changed original target set fails closed instead of leaking a pending warning', () => {
  for (const invalid of [[], [target(2, 20)], [target(1, 20), target(1, 20)],
    [target(1, 20), target(2, 20)]]) {
    const f = fixture();
    f.observe(target(1, 20));
    assert.equal(f.policy.observe(invalid, { battleKey: f.battleKey }), false);
    assert.equal(f.flush(), null);
    assert.equal(f.observe(target(1, 20)), false);
  }
});

test('malformed input fails closed before partial batch mutation', () => {
  for (const invalid of [null, undefined, target(2, 20, 100, { hp: NaN }),
    target(2, 20, 100, { hp: 0, status: 'critical' }), target(2, 20, 0),
    target(2, 20, Infinity), target(2, 20, 100, { label: ' ' }),
    target(2, 20, 100, { status: 'unknown' })]) {
    const f = fixture([1, 2]);
    assert.equal(f.observe(target(1, 20), invalid), false);
    assert.equal(f.flush(), null);
  }
});

test('constructor IDs and observed input are not retained by mutable reference', () => {
  const ids = [1], f = fixture(ids);
  ids[0] = 2;
  const input = [{ ...target(1, 20) }];
  const before = JSON.stringify(input);
  assert.equal(f.policy.observe(input, { battleKey: f.battleKey }), true);
  assert.equal(JSON.stringify(input), before);
  input[0].label = 'Changed'; input[0].hp = 90; input.length = 0;
  assert.equal(f.flush().message, 'Critical health: North gold mine (20% HP).');
});

test('delivered cue, target list and target records are immutable independent snapshots', () => {
  const f = fixture();
  f.observe(target(1, 20));
  const cue = f.flush();
  for (const object of [cue, cue.targets, cue.targets[0]]) assert.ok(Object.isFrozen(object));
  assert.throws(() => { cue.targets[0].hp = 100; }, TypeError);
  f.observe(target(1, 10));
  assert.equal(cue.targets[0].hp, 20);
});

test('delivery consumes the episode even when the parent discards sound for mute or unavailable audio', () => {
  for (const reason of ['muted', 'sfx-disabled', 'zero-volume', 'context-locked', 'unavailable']) {
    const f = fixture();
    f.observe(target(1, 20));
    const ignored = f.flush();
    assert.equal(ignored.sound, 'warning', reason);
    f.observe(target(1, 19));
    assert.equal(f.flush(1000), null, reason);
  }
});

test('clock validation does not consume pending delivery and backwards time cannot burst sounds', () => {
  const f = fixture([1, 2]);
  f.observe(target(1, 20), target(2));
  for (const now of [undefined, NaN, Infinity, -1])
    assert.throws(() => f.policy.flush({ battleKey: f.battleKey, active: true, now }), TypeError);
  assert.equal(f.flush(100).sound, 'warning');
  f.observe(target(1, 20), target(2, 20));
  assert.equal(f.flush(1).sound, null);
  assert.equal(f.flush(1000), null);
});

test('real authored monitor snapshots and safe upgrades never mutate game or RNG state', () => {
  let originals = 0;
  for (const mission of CAMPAIGN_MISSIONS) {
    const game = createCampaignMission(mission.id);
    const monitor = createProtectedObjectiveMonitor(game, mission.id);
    const policy = createObjectiveAlertPolicy({ battleKey: monitor, targetIds: monitor.read().map(t => t.originalId) });
    const before = JSON.stringify(game.serialize());
    assert.equal(policy.observe(monitor.read(), { battleKey: monitor }), true);
    assert.equal(policy.flush({ battleKey: monitor, active: true, now: 0 }), null);
    assert.equal(JSON.stringify(game.serialize()), before);
    for (const original of getCampaignTargets(game, mission.id).filter(t => t.kind === 'protect')) {
      originals++;
      const upgraded = game.upgrade(original.originalId);
      const afterAction = JSON.stringify(game.serialize());
      policy.observe(monitor.observe(), { battleKey: monitor });
      assert.equal(policy.flush({ battleKey: monitor, active: true, now: 10 }), null);
      assert.equal(JSON.stringify(game.serialize()), afterAction);
      if (upgraded.ok) assert.ok(original.building.hp > 0);
    }
  }
  assert.ok(originals >= 8);
});

test('real Common Ground critical original is named despite a full-health citadel', () => {
  const game = createCampaignMission('common-ground');
  const monitor = createProtectedObjectiveMonitor(game, 'common-ground');
  const policy = createObjectiveAlertPolicy({ battleKey: monitor, targetIds: monitor.read().map(t => t.originalId) });
  policy.observe(monitor.read(), { battleKey: monitor });
  const original = getCampaignTargets(game, 'common-ground').find(t => t.kind === 'protect');
  original.building.hp = original.building.maxHp * .1;
  const before = JSON.stringify(game.serialize());
  policy.observe(monitor.observe(), { battleKey: monitor });
  const cue = policy.flush({ battleKey: monitor, active: true, now: 0 });
  assert.equal(cue.message, 'Critical health: North gold mine (10% HP).');
  assert.equal(game.state.bases[0].hp, game.state.bases[0].maxHp);
  assert.equal(JSON.stringify(game.serialize()), before);
});

test('policy observation at every fixed step preserves engine, RNG and mission outcomes at 1x/2x', () => {
  for (const delta of [.05, .2]) {
    const game = createCampaignMission('common-ground'), control = Game.restore(game.serialize());
    const monitor = createProtectedObjectiveMonitor(game, 'common-ground');
    const policy = createObjectiveAlertPolicy({ battleKey: monitor, targetIds: monitor.read().map(t => t.originalId) });
    for (let i = 0; i < 1500; i++) {
      const actual = advanceObjectiveBattle(game, delta, current => {
        policy.observe(monitor.observe(current), { battleKey: monitor });
        return evaluateCampaignMission(current, 'common-ground');
      }, 300);
      const expected = advanceObjectiveBattle(control, delta, current => evaluateCampaignMission(current, 'common-ground'), 300);
      policy.flush({ battleKey: monitor, active: true, ended: actual.completed || actual.failed, now: i * .05 });
      assert.deepEqual(actual, expected);
      if (actual.completed || actual.failed) break;
    }
    assert.deepEqual(game.serialize(), control.serialize());
  }
});
