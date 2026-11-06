/** Separate authored campaign probes, not skirmish difficulty evidence. */
import assert from 'node:assert/strict';
import {writeFileSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {PILOTS,createPilot} from './campaign.js';
import {Game} from './engine.js';
import {createPolicyMemory,actPolicy} from './policies.mjs';
import {productionPolicy,campaignPolicy} from '../../tests/campaign-policies.mjs';
import {advanceObjectiveBattle} from '../../dist/objectives.js';

const count=Number(process.argv[2]||4);
assert.ok(Number.isInteger(count)&&count>0&&count<=20);
const hash=file=>createHash('sha256').update(readFileSync(new URL(file,import.meta.url))).digest('hex');
const results=[];
for(const pilot of PILOTS) {
  const policies=pilot.id==='crosswind-air'?['outer-air-cover','destination-air-cover','mixed','idle']:['reference','mixed','economy','idle'];
  const maps=pilot.id==='crosswind-air'?['three-roads','three-roads-crosswind']:[pilot.mapId];
  for(const mapId of maps)for(const policy of policies)for(let i=0;i<count;i++) {
    const seed=i===0?undefined:(Math.imul(i,2654435761)>>>0);
    const setup=createPilot(pilot.id,{mapId,seed});let game=setup.game;const initialSeed=game.seed;
    const memory=createPolicyMemory();
    const reference=pilot.id==='first-road'?productionPolicy(['barracks','archery'],[0]):pilot.id==='divided-front'?productionPolicy(['barracks','archery','sanctum'],[0,1]):campaignPolicy('winter-stores');
    const air=productionPolicy(['archery'],policy==='destination-air-cover'?[1,0,2]:[0,2]);
    let outcome,restores=0;
    for(let frame=0;frame<(pilot.timeLimit+1)*20;frame++) {
      if(frame%20===0) {
        if(policy==='reference')reference(game);
        else if(policy.endsWith('air-cover'))air(game);
        else if(policy!=='idle')actPolicy(game,0,policy,memory);
      }
      outcome=advanceObjectiveBattle(game,.05,setup.evaluate,pilot.timeLimit);
      if(frame%600===0) {
        const data=game.serialize(),restored=Game.restore(data);
        assert.deepEqual(restored.serialize(),data);assert.deepEqual(setup.evaluate(restored),outcome);
        game=restored;restores++;
      }
      assert.ok(game.state.gold.every(g=>g>=0));
      if(outcome.completed||outcome.failed)break;
    }
    assert.ok(outcome.completed||outcome.failed);
    results.push({pilot:pilot.id,mapId,policy,seed:initialSeed,completed:outcome.completed,reason:outcome.label,
      winCondition:outcome.completed?(game.state.winner===0?'enemy-citadel':'authored-objective'):null,
      seconds:+game.state.time.toFixed(3),citadelHP:+game.state.bases[0].hp.toFixed(3),restores});
  }
}
const rows=[];
for(const r of results) {
  if(rows.some(v=>v.pilot===r.pilot&&v.mapId===r.mapId&&v.policy===r.policy))continue;
  const games=results.filter(v=>v.pilot===r.pilot&&v.mapId===r.mapId&&v.policy===r.policy);
  rows.push({pilot:r.pilot,mapId:r.mapId,policy:r.policy,games:games.length,clears:games.filter(v=>v.completed).length,
    failures:games.filter(v=>!v.completed).map(v=>({seed:v.seed,seconds:v.seconds,reason:v.reason})),
    meanSeconds:+(games.reduce((n,v)=>n+v.seconds,0)/games.length).toFixed(3)});
}
const report={schemaVersion:1,engineHash:hash('./engine.js'),campaignHash:hash('./campaign.js'),harnessHash:hash('./pilot-balance.mjs'),
  count,seedRule:'Original authored seed, then i*2654435761 modulo 2^32. No artificial resources after the explicitly free authored formation.',
  limits:'QA-only remapping, no stars/unlocks/save-envelope integration. Reference routes make decisions every 1 simulated second, sometimes multiple paid purchases; these are not measured human onboarding results. New two-road pilot explicitly moves the original middle forces north; it is an authored variant, not a pure lane-count control.',
  games:results.length,rows,results};
const json=JSON.stringify(report,null,2)+'\n';
if(process.argv[3])writeFileSync(process.argv[3],json);else process.stdout.write(json);
