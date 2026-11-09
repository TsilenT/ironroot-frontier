/** Separate, fail-closed v2 authorization; never weakens the epoch1 entrypoint. */
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,realpathSync} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {deepFreeze} from '../../dist/rulesets.js';
import {DESIGN,POLICIES} from '../shared-watch/prototype.mjs';
export const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
export const PLAN=deepFreeze(JSON.parse(readFileSync(new URL('./PLAN.json',import.meta.url))));
export const sha256=x=>createHash('sha256').update(typeof x==='string'||Buffer.isBuffer(x)?x:JSON.stringify(x)).digest('hex');
export const DEPENDENCIES=Object.freeze(['package.json','qa/shared-watch/prototype.mjs','qa/shared-watch/experiment.mjs','qa/shared-watch/PLAN.json','qa/salt-stores/economy.mjs','docs/SHARED_WATCH_PROTOTYPE.md','qa/shared-watch-validation/PLAN.json','qa/shared-watch-validation/contract.mjs','qa/shared-watch-validation/evaluate.mjs','qa/shared-watch-validation/run.mjs','qa/shared-watch-validation/README.md','tests/shared-watch-prototype.test.mjs','tests/shared-watch-validation-evaluate.test.mjs','tests/shared-watch-validation-observer.test.mjs']);
export function validationClosure(){const files={};for(const n of readdirSync(path.join(ROOT,'dist')).sort())files['dist/'+n]=sha256(readFileSync(path.join(ROOT,'dist',n)));for(const n of DEPENDENCIES)files[n]=sha256(readFileSync(path.join(ROOT,n)));return {baseCommit:PLAN.baseCommit,baseTree:PLAN.baseTree,execution:{nodeVersion:process.version,platform:process.platform,arch:process.arch,nodeExecutable:process.execPath,workspace:realpathSync(ROOT),entrypoint:'qa/shared-watch-validation/run.mjs',mode:'--run-approved',stopPolicy:'OUTPUT.stop every100ticks and between cases; SIGINT/SIGTERM between cases after yield; retain incomplete, no retry'},files,design:DESIGN,policies:POLICIES,plan:PLAN};}
export function validationFreeze(){const closure=validationClosure();return {format:'shared-watch-v2-freeze-v1',status:'awaiting-independent-review-and-coordinator-authorization',closureSha256:sha256(closure),closure};}
export function verifyValidationApproval(p){assert.equal(p?.format,'shared-watch-v2-approved-validation-v1');assert.equal(p.status,'independent-review-approved-and-coordinator-authorized');for(const k of ['independentReviewer','coordinatorAuthorization'])assert.ok(typeof p[k]==='string'&&p[k].trim().length,'Missing '+k);assert.equal(p.freeze?.format,'shared-watch-v2-freeze-v1');assert.deepEqual(p.freeze.closure,validationClosure(),'V2 source/environment mismatch');assert.equal(p.freeze.closureSha256,sha256(p.freeze.closure),'V2 freeze digest mismatch');return true;}
export function verifyValidationCase({packet,seed,policy}){verifyValidationApproval(packet);assert.ok(PLAN.seeds.includes(seed),'Seed outside exact v2 matrix');assert.ok(PLAN.caseOrder.includes(policy),'Policy outside exact v2 matrix');}
export function verifyValidationInvocation(p,approval,output){assert.deepEqual(p.invocation,[process.execPath,path.join(ROOT,'qa/shared-watch-validation/run.mjs'),'--run-approved',realpathSync(approval),path.resolve(output)],'V2 exact invocation mismatch');}
