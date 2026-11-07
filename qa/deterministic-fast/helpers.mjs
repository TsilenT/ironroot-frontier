// Limited to the paid automatic-flyer and siege-lesson counterparts in cases.mjs.
// Provenance: the 342d8b5 controlled-clock benchmark and the existing public QA
// fixtures/helpers. This is not a clock adapter for lifecycle/input timing tests.
import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {createHash} from 'node:crypto';
import {Game} from '../../dist/engine.js';
import {createCurrentTrainingSession} from '../../dist/training.js';
export const virtual=process.env.IRONROOT_DETERMINISTIC_CLOCK==='virtual';
export const hostNow=()=>performance.now();
export const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
export const hostWait=ms=>new Promise(resolve=>setTimeout(resolve,ms));

export async function prepareClock(page){
  // Fixture seeding/reload happens in real time first. The only pauseAt is on an
  // empty document before any game callbacks exist; gameplay never jumps time.
  await page.goto('about:blank');
  if(virtual){const epoch=Date.UTC(2026,10,7);await page.clock.install({time:new Date(epoch)});await page.clock.pauseAt(new Date(epoch+1000));}
  await page.goto('/');
}
export async function nativeAction(page,operation){
  if(!virtual)return operation();
  let done=false,error,value;
  const pending=operation().then(result=>{done=true;value=result;},reason=>{done=true;error=reason;});
  const started=hostNow();
  while(!done){
    if(hostNow()-started>10000)throw Error('Clock/native-input deadlock; stop and diagnose.');
    // Playwright's genuine click/tap actionability waits for stable RAF geometry.
    await page.clock.runFor(16);await hostWait(1);
  }
  await pending;if(error)throw error;
  // The native click can synchronously resize/clear the lesson canvas after the
  // last pumped RAF. Deliver its next scheduled frame before reading pixels.
  // This runs the real renderer; it does not repair or bypass the pixel proof.
  await page.clock.runFor(16);return value;
}
export async function resumeRealTime(page){if(virtual)await page.clock.resume();}

export function tickBoundary(snapshot){
  assert.ok(Number.isFinite(snapshot.accumulator)&&snapshot.accumulator>=0&&snapshot.accumulator<.05,'bounded fractional RAF remainder');
  return {...snapshot,accumulator:0};
}
export function replayTo(before,tick){
  const game=Game.restore(before);
  while(game.tick<tick){const old=game.tick;game.update(.05-game.accumulator);assert.equal(game.tick,old+1);}
  assert.equal(game.tick,tick);return game.serialize();
}

export async function observeSiege(page){
  await page.evaluate(async()=>{
    const {TrainingSession}=await import('/training.js');
    const snapshot=TrainingSession.prototype.snapshot,update=TrainingSession.prototype.update;
    let receiver;
    const data=window.__qaSiegeEvidence={calls:0,captures:[],last:null,updateCalls:0,maxDt:0};
    TrainingSession.prototype.update=function(...args){data.updateCalls++;data.maxDt=Math.max(data.maxDt,args[0]);return update.apply(this,args);};
    TrainingSession.prototype.snapshot=function(...args){
      const result=snapshot.apply(this,args);data.calls++;
      if(this.lesson.id==='siege-the-tower'){
        receiver=this;
        const key=this.game.tick+':'+result.status+':'+result.stepIndex;
        if(data.last?.key!==key){data.last={key,snapshot:JSON.parse(JSON.stringify(result)),game:this.game.serialize()};data.captures.push(data.last);}
      }
      return result; // Original result, receiver and arguments remain unchanged.
    };
    data.audit=function(count,capture){
      const before=JSON.stringify({game:receiver.game.serialize(),snapshot:snapshot.call(receiver)});
      for(let i=0;i<count;i++){const s=snapshot.call(receiver);if(capture){const point={snapshot:JSON.parse(JSON.stringify(s)),game:receiver.game.serialize()};if(!point.game)throw Error('Missing capture');}}
      if(before!==JSON.stringify({game:receiver.game.serialize(),snapshot:snapshot.call(receiver)}))throw Error('Observer mutated game/objectives');
      return {stateUnchanged:true};
    };
  });
}
export async function observerOverhead(page){
  const baseStart=hostNow();const baseline=await page.evaluate(()=>window.__qaSiegeEvidence.audit(500,false));const baseMs=hostNow()-baseStart;
  const captureStart=hostNow();const capture=await page.evaluate(()=>window.__qaSiegeEvidence.audit(500,true));const captureMs=hostNow()-captureStart;
  return {samples:500,baseMs,captureMs,extraMsPerCapture:(captureMs-baseMs)/500,baseline,capture,
    caveat:'Host-timed read-only batches include separate browser round trips; signed difference is an estimate.'};
}
export function assertSiegeOracle(initial,observed){
  // Mirror actual browser boot, selection and paid actions. Constructing siege
  // directly would lose attemptId 2; bare TrainingSession would use legacy rules.
  const oracle=createCurrentTrainingSession();oracle.startLesson('siege-the-tower');
  assert.equal(oracle.build('foundry',1250,450).ok,true);oracle.continue();
  assert.deepEqual(tickBoundary(initial.game),tickBoundary(oracle.game.serialize()));
  assert.deepEqual(initial.snapshot,oracle.snapshot());oracle.continue();
  const states=new Map([[oracle.game.tick,{game:oracle.game.serialize(),snapshot:oracle.snapshot()}]]);
  while(oracle.snapshot().status==='active'){oracle.update(.05);states.set(oracle.game.tick,{game:oracle.game.serialize(),snapshot:oracle.snapshot()});}
  for(const point of observed.captures){
    if(!['active','lesson-complete'].includes(point.snapshot.status))continue;
    const expected=states.get(point.game.tick);assert.ok(expected);
    assert.deepEqual(tickBoundary(point.game),tickBoundary(expected.game));assert.deepEqual(point.snapshot,expected.snapshot);
  }
  assert.deepEqual(tickBoundary(observed.last.game),tickBoundary(oracle.game.serialize()));
  assert.deepEqual(observed.last.snapshot,oracle.snapshot());
  return {tick:oracle.game.tick,rng:oracle.game.seed,attemptId:oracle.snapshot().attemptId,ruleset:oracle.game.ruleset.id,
    gameHash:digest(tickBoundary(observed.last.game)),objectiveHash:digest(observed.last.snapshot)};
}
