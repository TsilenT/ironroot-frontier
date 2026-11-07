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
 for(const [label,snapshot]of [['before',before],['after',after]]){
  assert.ok(Number.isFinite(snapshot.accumulator)&&snapshot.accumulator>=0&&snapshot.accumulator<0.05,label+' sub-tick RAF remainder');
 }
 const elapsed=ticks*0.05+after.accumulator-before.accumulator;
 assert.ok(elapsed>=0&&elapsed<maxSeconds,'bounded nonnegative elapsed time');
 for(let step=0;step<ticks;step++){
  // Complete only the next tick. Adding .05 to a nearly full saved remainder
  // can round up to .10 and execute two ticks, even though it is below .05.
  replay.update(.05-replay.accumulator);
  assert.equal(replay.tick,before.tick+step+1,'each replay update advances exactly one fixed tick');
  assert.equal(replay.accumulator,0,'each replay update finishes at the tick boundary');
 }
 const expected=replay.serialize();
 assert.equal(expected.tick,after.tick,'replay reaches the observed fixed tick');
 assert.deepEqual({...expected,accumulator:after.accumulator},after,'exact passive simulation, including RNG and full state');
 return {ticks,fixedSeconds:ticks*.05,elapsedSeconds:elapsed,beforeAccumulator:before.accumulator,afterAccumulator:after.accumulator};
}
