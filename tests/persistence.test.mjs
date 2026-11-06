import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createStorage,
  readHistory,
  writeBattle,
  nativeSpaceTarget,
} from '../dist/persistence.js';
import { Game } from '../dist/engine.js';
import { createChallenge } from '../dist/challenges.js';
import { createCampaignMission } from '../dist/campaign.js';
const fixture = () => {
  const data = new Map();
  return {
    data,
    storage: createStorage(() => ({
      getItem: (k) => data.get(k) || null,
      setItem: (k, v) => data.set(k, v),
      removeItem: (k) => data.delete(k),
    })),
  };
};
test('save success requires a completed storage write and preserves its envelope', () => {
  const { data, storage } = fixture(),
    game = createChallenge('shieldbreaker');
  assert.equal(writeBattle(storage, 'save', game, 'shieldbreaker'), true);
  const saved = JSON.parse(data.get('save'));
  assert.equal(saved.challengeId, 'shieldbreaker');
  assert.deepEqual(Game.restore(saved.game).serialize(), game.serialize());
});
test('quota, denied storage access and serialization failure return false rather than false success', () => {
  const quota = createStorage(() => ({
    setItem() {
      throw new Error('QuotaExceededError');
    },
  }));
  assert.equal(writeBattle(quota, 'save', new Game()), false);
  const denied = createStorage(() => {
    throw new Error('SecurityError');
  });
  assert.equal(denied.get('x'), null);
  assert.equal(denied.set('x', 'y'), false);
  assert.equal(denied.remove('x'), false);
  assert.equal(
    writeBattle(fixture().storage, 'save', {
      serialize() {
        throw new Error('corrupt');
      },
    }),
    false,
  );
});
test('malformed history cannot freeze result processing and valid history is bounded', () => {
  const { storage } = fixture();
  for (const value of [
    '{}',
    'null',
    '42',
    '"text"',
    '{bad',
    '[null,7,"x",[]]',
  ]) {
    storage.set('history', value);
    const history = readHistory(storage, 'history');
    history.unshift({ won: true });
    assert.equal(history.length, 1);
  }
  storage.set(
    'history',
    JSON.stringify(Array.from({ length: 100 }, (_, n) => ({ time: n }))),
  );
  assert.equal(readHistory(storage, 'history').length, 30);
});
test('Space belongs to focused native controls, not the global pause shortcut', () => {
  assert.equal(nativeSpaceTarget(null), false);
  assert.equal(nativeSpaceTarget({ closest: () => null }), false);
  for (const tag of ['button', 'input', 'select', 'textarea', 'a', 'summary'])
    assert.equal(
      nativeSpaceTarget({
        closest: (selector) => (selector.includes(tag) ? {} : null),
      }),
      true,
    );
});
test('campaign saves keep mission identity outside the deterministic engine state', () => {
  const { data, storage } = fixture(),
    game = createCampaignMission('emberwatch');
  assert.equal(writeBattle(storage, 'save', game, null, 'emberwatch'), true);
  const saved = JSON.parse(data.get('save'));
  assert.equal(saved.version, 2);
  assert.equal(saved.challengeId, null);
  assert.equal(saved.campaignId, 'emberwatch');
  assert.equal(Object.hasOwn(saved.game.state, 'campaignId'), false);
});

test('save sessions never overwrite a newer tab and skip unchanged writes', async () => {
  const { createSaveSession } = await import('../dist/persistence.js');
  const { storage, data } = fixture();
  let writes = 0;
  const backend = {
    ...storage,
    set(k, v) {
      writes++;
      return storage.set(k, v);
    },
  };
  const first = createSaveSession(backend, 'save'),
    second = createSaveSession(backend, 'save');
  first.claim();
  assert.equal(first.set('save', 'old'), true);
  assert.equal(writes, 1);
  assert.equal(first.set('save', 'old'), true);
  assert.equal(writes, 1);
  second.claim();
  assert.equal(second.set('save', 'new'), true);
  assert.equal(first.isCurrent(), false);
  assert.equal(first.set('save', 'old-again'), false);
  assert.equal(first.remove(), false);
  assert.equal(data.get('save'), 'new');
  assert.equal(second.isCurrent(), true);
  assert.equal(second.remove(), true);
  first.claim();
  assert.equal(first.set('save', 'deliberate-new'), true);
});

test('save session never claims a failed write as persisted', async () => {
  const { createSaveSession } = await import('../dist/persistence.js');
  const values = new Map();
  let fail = true;
  const backend = {
    get: (k) => values.get(k) ?? null,
    set(k, v) {
      if (fail) return false;
      values.set(k, v);
      return true;
    },
    remove() {
      return false;
    },
  };
  const session = createSaveSession(backend, 'save');
  session.claim();
  assert.equal(session.set('save', 'data'), false);
  assert.equal(session.isCurrent(), true);
  fail = false;
  assert.equal(session.set('save', 'data'), true);
  assert.equal(session.set('other', 'bad'), false);
  assert.equal(session.remove(), false);
  assert.equal(values.get('save'), 'data');
});

test('unavailable reads are not mistaken for a newer saved battle', async () => {
  const { createSaveSession } = await import('../dist/persistence.js');
  let denied = false,
    value = 'existing';
  const storage = createStorage(() => ({
    getItem() {
      if (denied) throw Error('Denied');
      return value;
    },
    setItem(k, v) {
      value = v;
    },
    removeItem() {
      value = null;
    },
  }));
  const session = createSaveSession(storage, 'save');
  session.claim();
  denied = true;
  assert.equal(storage.read('save').ok, false);
  assert.equal(session.status(), 'unavailable');
  assert.equal(session.set('save', 'unsafe'), false);
  denied = false;
  assert.equal(session.status(), 'current');
  value = 'newer';
  assert.equal(session.status(), 'stale');
});

test('storage-denied fresh game recovers only into an empty save slot', async () => {
  const { createSaveSession } = await import('../dist/persistence.js');
  let denied = true,
    value = null;
  const storage = createStorage(() => ({
    getItem() {
      if (denied) throw Error('Denied');
      return value;
    },
    setItem(k, v) {
      value = v;
    },
  }));
  const session = createSaveSession(storage, 'save');
  assert.equal(session.claim(), false);
  denied = false;
  assert.equal(session.status(), 'current');
  assert.equal(session.set('save', 'game'), true);
  denied = true;
  const other = createSaveSession(storage, 'save');
  other.claim();
  denied = false;
  assert.equal(other.status(), 'stale');
  assert.equal(other.set('save', 'overwrite'), false);
});
