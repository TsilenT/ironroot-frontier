/**
 * QA-only encounter phase model. This is not a Game subclass, playable battle,
 * campaign entry, or normal-save format. No production module imports it.
 * A future engine adapter must consume each returned intent atomically in the
 * same fixed tick as the state transition. See DESIGN.md before integrating.
 */
const freeze = value => {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
};

export const SHIFT = freeze({
  id: 'qa-momentum-shift', revision: 1, hz: 20, maxTick: 12096000,
  triggerPercent: 35, warningTicks: 160, recoveryTicks: 80,
  citadelMaxHp: 6000, bossMaxHp: 10000, radius: 240,
  variants: {
    'bounded-boss': {kind: 'damage', damage: 150},
    'lethal-boss': {kind: 'lethal'}
  }
});

const PHASES = ['armed', 'warning', 'recovering', 'pushing', 'spent', 'ended'];
const keys = (value, expected, name) => {
  const descriptors = value && Object.getOwnPropertyDescriptors(value);
  if (!value || Object.getPrototypeOf(value) !== Object.prototype ||
      Reflect.ownKeys(value).length !== expected.length ||
      Reflect.ownKeys(value).some(k => typeof k !== 'string' || !expected.includes(k)) ||
      expected.some(k => !Object.hasOwn(value, k)) ||
      Object.values(descriptors).some(d => !Object.hasOwn(d, 'value') || !d.enumerable)) {
    throw Error(`Invalid ${name} fields`);
  }
  return Object.fromEntries(expected.map(k => [k, descriptors[k].value]));
};
const number = (value, min, max, name, integer = false) => {
  if (!Number.isFinite(value) || value < min || value > max || (integer && !Number.isSafeInteger(value))) {
    throw Error(`Invalid ${name}`);
  }
};
const tick = (value, name) => number(value, 0, SHIFT.maxTick, name, true);
const variants = variant => {
  if (typeof variant !== 'string' || !Object.hasOwn(SHIFT.variants, variant)) throw Error('Unknown shift variant');
};
const optionalTick = (value, name, current) => {
  if (value !== null) { tick(value, name); if (value > current) throw Error(`Future ${name}`); }
};

export function createShift(variant = 'bounded-boss') {
  variants(variant);
  return {
    id: SHIFT.id, revision: SHIFT.revision, variant, tick: 0, phase: 'armed',
    warningAt: null, deployedAt: null, spentAt: null, endedAt: null,
    bossHp: null, outcome: null
  };
}

export function validateShift(state) {
  keys(state, ['id', 'revision', 'variant', 'tick', 'phase', 'warningAt', 'deployedAt', 'spentAt', 'endedAt', 'bossHp', 'outcome'], 'shift');
  if (state.id !== SHIFT.id || state.revision !== SHIFT.revision) throw Error('Unknown shift identity');
  variants(state.variant); tick(state.tick, 'tick');
  if (!PHASES.includes(state.phase)) throw Error('Unknown shift phase');
  for (const key of ['warningAt', 'deployedAt', 'spentAt', 'endedAt']) optionalTick(state[key], key, state.tick);
  if (state.warningAt === 0 || state.deployedAt === 0 || state.spentAt === 0 || state.endedAt === 0) throw Error('Transition before the first tick');
  if (![null, 'won', 'lost', 'draw'].includes(state.outcome)) throw Error('Unknown outcome');
  if ((state.phase === 'ended') !== (state.endedAt !== null) ||
      (state.phase === 'ended') !== (state.outcome !== null)) throw Error('Terminal state mismatch');
  if (state.deployedAt !== null) {
    if (state.warningAt === null || state.deployedAt !== state.warningAt + SHIFT.warningTicks) throw Error('Deployment skipped warning');
    number(state.bossHp, 0, SHIFT.bossMaxHp, 'boss HP');
  } else if (state.bossHp !== null || state.spentAt !== null) throw Error('Boss before deployment');
  if (state.spentAt !== null && (state.deployedAt === null || state.spentAt <= state.deployedAt || state.bossHp !== 0)) throw Error('Invalid spent state');
  if (state.phase === 'armed' && state.warningAt !== null) throw Error('Armed state has already triggered');
  if (state.phase === 'warning' && (state.warningAt === null || state.deployedAt !== null || state.tick >= state.warningAt + SHIFT.warningTicks)) throw Error('Invalid warning window');
  if (['recovering', 'pushing', 'spent'].includes(state.phase) && state.deployedAt === null) throw Error('Missing deployment');
  if (['recovering', 'pushing'].includes(state.phase) && (state.bossHp <= 0 || state.spentAt !== null)) throw Error('Dead boss still active');
  if (state.phase === 'recovering' && state.tick >= state.deployedAt + SHIFT.recoveryTicks) throw Error('Recovery has expired');
  if (state.phase === 'recovering' && state.tick === state.deployedAt && state.bossHp !== SHIFT.bossMaxHp) throw Error('Deployment must start at full boss HP');
  if (state.phase === 'pushing' && state.tick < state.deployedAt + SHIFT.recoveryTicks) throw Error('Recovery was skipped');
  if (state.phase === 'spent' && state.spentAt === null) throw Error('Missing defeat tick');
  if (state.phase === 'ended' && state.endedAt !== state.tick) throw Error('Terminal clock moved');
  if (state.phase === 'ended' && state.warningAt !== null && state.warningAt >= state.endedAt) throw Error('Warning must precede termination');
  if (state.phase === 'ended' && state.warningAt !== null && state.deployedAt === null && state.endedAt > state.warningAt + SHIFT.warningTicks) throw Error('Terminal warning missed deployment');
  if (state.phase === 'ended' && state.deployedAt !== null && state.deployedAt >= state.endedAt) throw Error('Deployment must precede termination');
  if (state.deployedAt !== null && state.bossHp === 0 && state.spentAt === null) throw Error('Missing boss defeat tick');
  if (state.phase !== 'ended' && state.warningAt !== null && state.deployedAt === null && state.phase !== 'warning') throw Error('Missing warning phase');
  return state;
}

/** This sidecar has its own explicit identity. Never load it through Game.restore. */
export function restoreShift(saved) {
  validateShift(saved);
  return {...saved};
}

/** A pure HUD projection. Rendering/repeated evaluation cannot deploy anything. */
export function viewShift(state) {
  validateShift(state);
  return {
    phase: state.phase, used: state.deployedAt !== null,
    warningSeconds: state.phase === 'warning' ? (state.warningAt + SHIFT.warningTicks - state.tick) / SHIFT.hz : 0,
    recoverySeconds: state.phase === 'recovering' ? (state.deployedAt + SHIFT.recoveryTicks - state.tick) / SHIFT.hz : 0,
    bossHp: state.bossHp, bossMaxHp: state.deployedAt === null ? null : SHIFT.bossMaxHp,
    outcome: state.outcome
  };
}

/**
 * Call once after ordinary simultaneous damage for each fixed tick. A legal
 * core kill wins before a due deployment. There is no HP floor or invulnerability.
 * bossHp is the adapter's post-damage HP, or null before deployment.
 */
export function stepShift(previous, frame) {
  validateShift(previous);
  keys(frame, ['tick', 'playerHp', 'enemyHp', 'bossHp'], 'frame');
  tick(frame.tick, 'frame tick');
  if (previous.phase === 'ended') throw Error('Encounter has ended');
  if (frame.tick !== previous.tick + 1) throw Error('Expected exactly one new fixed tick');
  number(frame.playerHp, 0, SHIFT.citadelMaxHp, 'player HP');
  number(frame.enemyHp, 0, SHIFT.citadelMaxHp, 'enemy HP');
  if (previous.deployedAt === null) {
    if (frame.bossHp !== null) throw Error('Boss HP before deployment');
  } else {
    number(frame.bossHp, 0, previous.bossHp, 'non-healing boss HP');
  }
  const state = {...previous, tick: frame.tick, bossHp: frame.bossHp}, intents = [];
  if (frame.playerHp === 0 || frame.enemyHp === 0) {
    state.phase = 'ended'; state.endedAt = frame.tick;
    state.outcome = frame.playerHp === 0 ? (frame.enemyHp === 0 ? 'draw' : 'lost') : 'won';
    // Persist defeat bookkeeping even when a core also falls on this tick.
    if (previous.deployedAt !== null && frame.bossHp === 0 && state.spentAt === null) state.spentAt = frame.tick;
  } else if (previous.phase === 'armed' && frame.enemyHp * 100 <= SHIFT.citadelMaxHp * SHIFT.triggerPercent) {
    state.phase = 'warning'; state.warningAt = frame.tick;
    intents.push({type: 'warn-breakout', deployAt: frame.tick + SHIFT.warningTicks, variant: state.variant});
  } else if (previous.phase === 'warning' && frame.tick === previous.warningAt + SHIFT.warningTicks) {
    state.phase = 'recovering'; state.deployedAt = frame.tick; state.bossHp = SHIFT.bossMaxHp;
    intents.push({type: 'deploy-boss', maxHp: SHIFT.bossMaxHp, recoveryUntil: frame.tick + SHIFT.recoveryTicks});
    intents.push({type: 'breakout-pulse', radius: SHIFT.radius, ...SHIFT.variants[state.variant]});
  } else if (['recovering', 'pushing'].includes(previous.phase)) {
    if (frame.bossHp === 0) {
      state.phase = 'spent'; state.spentAt = frame.tick;
      intents.push({type: 'boss-defeated'});
    } else if (previous.phase === 'recovering' && frame.tick === previous.deployedAt + SHIFT.recoveryTicks) {
      state.phase = 'pushing'; intents.push({type: 'begin-counterpush'});
    }
  }
  validateShift(state);
  return {state, intents};
}

/** Pure local pulse oracle, not damage application. No structures or allies. */
export function pulseHits(variant, centre, troops) {
  variants(variant); centre = keys(centre, ['x', 'y', 'side'], 'pulse centre');
  number(centre.x, 0, 3200, 'centre x'); number(centre.y, 0, 900, 'centre y'); number(centre.side, 0, 1, 'centre side', true);
  if (!Array.isArray(troops) || Object.getPrototypeOf(troops) !== Array.prototype || troops.length > 140) throw Error('Invalid troops');
  const descriptors = Object.getOwnPropertyDescriptors(troops), expected = ['length', ...Array.from({length: troops.length}, (_, i) => String(i))];
  if (Reflect.ownKeys(troops).length !== expected.length || Reflect.ownKeys(troops).some(k => typeof k !== 'string' || !expected.includes(k)) ||
      expected.some(k => !Object.hasOwn(descriptors, k) || !Object.hasOwn(descriptors[k], 'value') || (k !== 'length' && !descriptors[k].enumerable))) throw Error('Invalid troop array fields');
  const ids = new Set(), snapshot = [];
  for (let i = 0; i < troops.length; i++) {
    const u = keys(descriptors[String(i)].value, ['id', 'side', 'x', 'y', 'hp'], 'pulse troop');
    number(u.id, 1, 1e12, 'troop ID', true); number(u.side, 0, 1, 'troop side', true);
    number(u.x, 0, 3200, 'troop x'); number(u.y, 0, 900, 'troop y'); number(u.hp, 0, 10000, 'troop HP');
    if (ids.has(u.id)) throw Error('Duplicate troop ID'); ids.add(u.id);
    snapshot.push(u);
  }
  return snapshot.filter(u => u.side !== centre.side && u.hp > 0 && Math.hypot(u.x - centre.x, u.y - centre.y) <= SHIFT.radius)
    .map(u => ({id: u.id, damage: SHIFT.variants[variant].kind === 'lethal' ? u.hp : Math.min(u.hp, SHIFT.variants[variant].damage)}))
    .sort((a, b) => a.id - b.id);
}
