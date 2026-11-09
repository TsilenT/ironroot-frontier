/** A new verification epoch, preserving the original freeze and evidence files. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,realpathSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {runReedBeds,verifyFrozen,summarize} from './simulate.mjs';
import {auditRun} from './verify-evidence.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const readRuns=file=>readFileSync(file,'utf8').trim().split('\n').filter(Boolean).map(JSON.parse);
export function bindFinalSource({checkpoint,development,heldOut,raw,out}){
 const startedAt=new Date().toISOString(),planFile=path.join(root,'qa/reed-beds/VALIDATION_PLAN.json'),planBytes=readFileSync(planFile),originalPlanSha256=sha(planBytes),plan=verifyFrozen();
 const campaignFile=path.join(root,'dist/campaign.js'),campaignBytes=readFileSync(campaignFile),campaignSha256=sha(campaignBytes);
 const overlayFile=path.join(checkpoint,'overlay.json'),archiveFile=path.join(checkpoint,'source.tar.gz'),checkpointFile=path.join(checkpoint,'checkpoint.json');
 const overlayBytes=readFileSync(overlayFile),overlay=JSON.parse(overlayBytes),receipt=JSON.parse(readFileSync(checkpointFile,'utf8')),archiveSha256=sha(readFileSync(archiveFile));
 assert.equal(sha(overlayBytes),receipt.overlaySha256);assert.equal(archiveSha256,receipt.archiveSha256);
 const overlayCampaign=overlay.files.find(f=>f.path==='dist/campaign.js');assert.ok(overlayCampaign);
 assert.equal(sha(Buffer.from(overlayCampaign.content)),overlayCampaign.sha256);assert.equal(overlayCampaign.sha256,campaignSha256);
 const archivedCampaign=execFileSync('tar',['-xOf',archiveFile,'dist/campaign.js'],{maxBuffer:2**20});assert.equal(sha(archivedCampaign),campaignSha256);assert.deepEqual(archivedCampaign,campaignBytes);
 const prior=[...readRuns(development),...readRuns(heldOut)];assert.equal(prior.length,54);assert.equal(new Set(prior.map(r=>r.policy+'/'+r.seed)).size,54);
 const expected=plan.policies.flatMap(policy=>[...plan.developmentSeeds,...plan.heldOutSeeds].map(seed=>policy+'/'+seed)).sort();assert.deepEqual(prior.map(r=>r.policy+'/'+r.seed).sort(),expected);
 const destination=path.resolve(raw);mkdirSync(path.dirname(destination),{recursive:true});const resolved=path.join(realpathSync(path.dirname(destination)),path.basename(destination));assert.ok(!resolved.startsWith(root+path.sep),'raw receipts must remain outside source');
 const fresh=[],audits=[];let exactReceiptMatches=0;
 for(const old of prior){
  const run=runReedBeds({policy:old.policy,seed:old.seed});audits.push(auditRun(run));assert.deepEqual(run.ledger.transactions,old.ledger.transactions);exactReceiptMatches++;assert.deepEqual(run,old);fresh.push(run);
  writeFileSync(destination,fresh.map(r=>JSON.stringify(r)).join('\n')+'\n');console.log(`${fresh.length}/54 ${run.policy} seed=${run.seed}: ${run.outcome}, exact run and receipts match`);
 }
 verifyFrozen();assert.equal(sha(readFileSync(planFile)),originalPlanSha256);assert.equal(sha(readFileSync(campaignFile)),campaignSha256);
 const rawBytes=readFileSync(destination),combinedOriginal=Buffer.concat([readFileSync(development),readFileSync(heldOut)]);assert.deepEqual(rawBytes,combinedOriginal);
 const report={scope:'Fresh final-evaluator binding verification of the existing frozen 54-run matrix. This is a deterministic rerun, not 54 new held-out samples or human/native UI evidence.',startedAt,completedAt:new Date().toISOString(),originalFreezePreserved:true,originalPlan:{file:'VALIDATION_PLAN.json',sha256:originalPlanSha256,frozenAt:plan.frozenAt},policySha256:plan.policySha256,formationSha256:plan.formationSha256,
  finalEvaluator:{file:'dist/campaign.js',sha256:campaignSha256,unchangedThroughRerun:true,checkpoint001ByteIdentical:true},
  checkpoint001:{overlaySha256:sha(overlayBytes),archiveSha256,checkpointReceiptSha256:sha(readFileSync(checkpointFile)),campaignSha256:overlayCampaign.sha256,overlayContentVerified:true,archiveBytesVerified:true},
  finalCombatHashes:{...plan.combatHashes,'dist/campaign.js':campaignSha256},
  originalRawFiles:[development,heldOut].map(file=>{const bytes=readFileSync(file);return{filename:path.basename(file),sha256:sha(bytes),bytes:bytes.length};}),
  rerunRaw:{filename:path.basename(destination),sha256:sha(rawBytes),bytes:rawBytes.length,byteIdenticalToConcatenatedOriginalRaw:true},
  verification:{runs:fresh.length,exactRunMatches:fresh.length,exactReceiptMatches,independentAuditsPassed:audits.length,maximumLedgerError:Math.max(...audits.map(a=>a.maxLedgerError)),allOrdinaryPricesAndMineEventIncomeVerified:true},results:Object.fromEntries(Object.entries(summarize(fresh)).map(([policy,value])=>[policy,{games:value.games,wins:value.wins,losses:value.runs.filter(r=>r.outcome==='lost').length}]))};
 writeFileSync(out,JSON.stringify(report,null,2)+'\n');return report;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const args=Object.fromEntries(process.argv.slice(2).map(a=>{const [k,...v]=a.replace(/^--/,'').split('=');return[k,v.join('=')];}));
 const report=bindFinalSource({checkpoint:args.checkpoint,development:args.development,heldOut:args['held-out'],raw:args.raw,out:args.out});console.log(JSON.stringify({campaignSha256:report.finalEvaluator.sha256,...report.verification,rawSha256:report.rerunRaw.sha256}));
}
