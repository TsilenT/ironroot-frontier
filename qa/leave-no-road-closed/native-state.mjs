/** QA-only manual control state. No app/profile identity or persistence adapter. */
import {createPrototype,evaluatePrototype} from './scenario.mjs';
export const NATIVE_SEEDS=Object.freeze([9305]);
const STEP=.05,EPS=1e-10;
export function createNativeSession({seed=NATIVE_SEEDS[0]}={}){
 if(!NATIVE_SEEDS.includes(seed))throw new RangeError('Choose a disclosed known seed');
 const game=createPrototype({seed});
 return {seed,game,paused:true,wallAccumulator:0,outcome:evaluatePrototype(game)};
}
export const nativeEnded=session=>session.outcome.completed||session.outcome.failed;
export const nativeControlsDisabled=session=>session.paused||nativeEnded(session);
export function evaluateNative(session){
 session.outcome=evaluatePrototype(session.game);
 if(nativeEnded(session)){session.paused=true;session.wallAccumulator=0;}
 return session.outcome;
}
export function setNativePaused(session,value){
 evaluateNative(session);session.paused=nativeEnded(session)||!!value;
 session.wallAccumulator=0;return session.paused;
}
export function restartNative(session,{seed=session.seed}={}){
 // Validate and construct the replacement before changing the current attempt.
 const fresh=createNativeSession({seed});Object.assign(session,fresh);return session;
}
/** Native wall time feeds whole ordinary engine ticks. Never shorten the final
 * engine update to deadline remainder: that can strand its fixed-step accumulator.
 * Evaluate before/after every tick and discard queued wall time on terminal/pause. */
export function advanceNative(session,elapsed){
 evaluateNative(session);if(session.paused||nativeEnded(session))return 0;
 if(!Number.isFinite(elapsed)||elapsed<=0)return 0;
 session.wallAccumulator+=Math.min(.25,elapsed);let ticks=0;
 while(session.wallAccumulator+EPS>=STEP&&!nativeEnded(session)){
  session.wallAccumulator=Math.max(0,session.wallAccumulator-STEP);
  const before=session.game.tick;session.game.update(STEP);
  if(session.game.tick!==before+1)throw Error('Native preview did not advance exactly one ordinary tick');
  ticks++;evaluateNative(session);
 }
 return ticks;
}
/** Every paid command goes through the unchanged ordinary engine method. */
export function paidNative(session,method,args=[]){
 evaluateNative(session);
 if(nativeEnded(session))return {ok:false,reason:'This QA attempt has ended.'};
 if(session.paused)return {ok:false,reason:'Resume before giving paid commands.'};
 const g=session.game;let result;
 if(method==='build')result=g.build(args[0],args[1],args[2],0);
 else if(method==='upgrade')result=g.upgrade(args[0],0);
 else if(method==='sell')result=g.sell(args[0],0);
 else if(method==='cast')result=g.cast(args[0],args[1],0);
 else if(method==='citadel')result=g.buyCitadelOption(args[0],0);
 else return {ok:false,reason:'Unknown QA control.'};
 evaluateNative(session);return result;
}
