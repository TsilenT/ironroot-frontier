/** Separate v2 CLI adapter. No implicit games, no seed search or retries. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync,mkdirSync,realpathSync} from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {runValidationCase,validateOutputDirectory,external,stopFileRequested} from '../shared-watch/experiment.mjs';
import {PLAN,validationClosure,validationFreeze,verifyValidationApproval,verifyValidationInvocation,sha256} from './contract.mjs';
import {decideValidation,validateObservedFires} from './evaluate.mjs';
export async function runApprovedMatrix(packet,approval,output){
 verifyValidationApproval(packet);verifyValidationInvocation(packet,approval,output);const out=validateOutputDirectory(output);mkdirSync(out);const closure=validationClosure(),runs=[];let signaled=false,active=null;
 const stop=()=>signaled||stopFileRequested(out),signal=()=>{signaled=true;};process.on('SIGINT',signal);process.on('SIGTERM',signal);
 try{
  writeFileSync(path.join(out,'approved-packet.json'),JSON.stringify(packet,null,2)+'\n',{flag:'wx'});
  for(const seed of PLAN.seeds)for(const policy of PLAN.caseOrder){
   await new Promise(resolve=>setImmediate(resolve));if(stop()){const e=new Error('External stop between cases');e.code='EXTERNAL_STOP';throw e;}
   active={seed,policy};assert.deepEqual(validationClosure(),closure,'V2 pre-case closure mismatch');const r=runValidationCase({policy,seed,packet,donor:runs.find(r=>r.seed===seed&&r.policy==='central-watch'),stop});
   // Persist first: even an audit rejection retains the full generated case.
   writeFileSync(path.join(out,`${seed}-${policy}.json`),JSON.stringify(r)+'\n',{flag:'wx'});runs.push(r);validateObservedFires(r);assert.deepEqual(validationClosure(),closure,'V2 post-case closure mismatch');console.log(JSON.stringify({seed,policy,won:r.outcome.completed,time:r.duration,hp:r.finalHP}));
  }
  const decision=decideValidation(runs,PLAN);assert.deepEqual(validationClosure(),closure,'V2 final closure mismatch');writeFileSync(path.join(out,'decision.json'),JSON.stringify(decision,null,2)+'\n',{flag:'wx'});writeFileSync(path.join(out,'completion.json'),JSON.stringify({cases:runs.length,closureSha256:sha256(closure),decision:decision.decision})+'\n',{flag:'wx'});return decision;
 }catch(error){writeFileSync(path.join(out,'incomplete.json'),JSON.stringify({complete:false,completedCases:runs.length,reason:error.message,partial:error.partial??active},null,2)+'\n',{flag:'wx'});throw error;}
 finally{process.removeListener('SIGINT',signal);process.removeListener('SIGTERM',signal);}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const [mode,a,b]=process.argv.slice(2);if(mode==='--freeze'){assert.ok(a);external(path.dirname(a));assert.ok(!existsSync(a),'Never overwrite freeze');writeFileSync(a,JSON.stringify(validationFreeze(),null,2)+'\n',{flag:'wx'});}else if(mode==='--run-approved'){assert.ok(a&&b);await runApprovedMatrix(JSON.parse(readFileSync(realpathSync(a))),a,b);}else throw new Error('Use --freeze EXTERNAL_FILE or --run-approved APPROVAL_PACKET NEW_EXTERNAL_DIRECTORY');}
