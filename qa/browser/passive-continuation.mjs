import assert from 'node:assert/strict';
import {Game} from '../../dist/engine.js';

// Resume is live: RNG, units and combat may legitimately change before Pause.
// Replay every elapsed fixed tick and compare every simulated field, including
// the full state and RNG seed. RAF's sub-tick accumulator is independently
// bounded and used only as the fractional timing remainder, never as game state.
export function assertPassiveContinuation(before,after,{maxSeconds=3}={}){
 const replay=Game.restore(before);Game.restore(after);
 const ticks=after.tick-before.tick;
 assert.ok(Number.isInteger(ticks)&&ticks>=0&&ticks*0.05<maxSeconds,'bounded forward tick continuation');
 assert.ok(after.accumulator>=0&&after.accumulator<0.05,'sub-tick RAF remainder');
 const elapsed=ticks*0.05+after.accumulator-before.accumulator;
 assert.ok(elapsed>=-1e-12&&elapsed<maxSeconds,'bounded nonnegative elapsed time');
 for(let step=0;step<ticks;step++)replay.update(.05);
 const expected=replay.serialize();
 assert.equal(expected.tick,after.tick,'replay reaches the observed fixed tick');
 assert.deepEqual({...expected,accumulator:after.accumulator},after,'exact passive simulation, including RNG and full state');
}
