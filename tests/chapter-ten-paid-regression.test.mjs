import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,readdir,rm,realpath} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFile as execFileCallback} from 'node:child_process';
import {promisify} from 'node:util';
import {fileURLToPath} from 'node:url';
import {getMap} from '../dist/engine.js';
import {inspectPlan,runOne} from '../qa/chapter-ten-current/revalidation/run.mjs';

const root=fileURLToPath(new URL('..',import.meta.url)),execFile=promisify(execFileCallback);
const {plan,planHash}=await inspectPlan();
const cases=[['foothold',101,'primary'],['granary',102,'core-alternative'],['no-fires',103,'primary'],['crossing-control',104,'primary'],['finale-splash',105,'primary'],['granary-primary',102,'primary']];
assert.deepEqual(plan.cases.map(c=>[c.id,c.seed]),cases.map(([id,seed])=>[id,seed]));
assert.equal(plan.commandIntervalSeconds,2);assert.equal(plan.stepSeconds,.05);
assert.equal(await realpath(path.resolve(root,'qa/chapter-ten-current/revalidation',plan.sourceFolder)),await realpath(root));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const readJSON=async file=>JSON.parse(await readFile(file,'utf8'));

for(const [id,seed,classification]of cases)test(id==='granary'?'Granary fixed core-alternative route; this case does not validate the mine primary':`${id}: fixed paid route satisfies its primary`,async t=>{
 const owned=await mkdtemp(path.join(tmpdir(),'ironroot-ch10-paid-regression-')),output=path.join(owned,id);let passed=false;
 t.after(async()=>{if(passed)await rm(owned,{recursive:true,force:true});else t.diagnostic(`Failure evidence retained outside the checkout: ${owned}`);});
 const c=plan.cases.find(c=>c.id===id),r=await runOne(id,output);
 assert.equal(r.caseId,id);assert.equal(r.seed,seed);assert.equal(r.outcome.completed,true);assert.equal(r.outcome.failed,false);assert.equal(r.outcome.outcome,'won');assert.equal(r.classification,classification);assert.equal(r.primarySatisfied,classification==='primary');assert.equal(r.horizonReached,false);assert.ok(r.finalHP[0]>0);
 assert.equal(r.planHash,planHash);assert.equal(r.remoteSourceCommit,'c5ff97670e86ad244af9a0ee2165096f1e6454c6');
 const current=(await execFile('git',['--no-optional-locks','rev-parse','HEAD'],{cwd:root})).stdout.trim();assert.equal(r.sourceGit.commit,current);assert.match(r.sourceGit.tree,/^[0-9a-f]{40}$/);assert.equal(typeof r.sourceGit.dirty,'boolean');assert.equal(r.sourceGit.reviewedFactoryCommit,r.remoteSourceCommit);assert.equal(r.sourceGit.reviewedFactoryTree,'b12ff4f61b3eb40c2fde444595407377fa65b007');
 const started=await readJSON(path.join(output,'RUN.json')),complete=await readJSON(path.join(output,'COMPLETE.json'));assert.deepEqual(started.sourceGit,r.sourceGit);assert.deepEqual(complete.sourceGit,r.sourceGit);assert.equal(complete.ledgerVerified,true);assert.equal(complete.packetsRestored,true);assert.equal(complete.classification,classification);assert.equal(complete.planHash,planHash);assert.equal(complete.runnerHash,r.runnerHash);
 const packets=[];
 for(const p of r.packets){const bytes=await readFile(path.join(output,p.filename));assert.equal(sha(bytes),p.sha256);packets.push(JSON.parse(bytes));}
 assert.ok(packets.length>=2);assert.equal(r.packets[0].label,'opening');assert.equal(r.packets.at(-1).label,'final');const opening=packets[0].game.state,final=packets.at(-1).game.state;
 assert.deepEqual(r.startingGold,opening.gold);assert.deepEqual(r.finalGold,final.gold);assert.deepEqual(r.finalHP,final.bases.map(b=>b.hp));
 for(const side of [0,1]){const spending=r.commands.filter(a=>a.side===side).reduce((sum,a)=>sum+a.cost,0),bounty=2*(final.stats.kills[side]-opening.stats.kills[side]),error=opening.gold[side]+r.grossIncome[side]+bounty-spending-final.gold[side];assert.ok(Math.abs(spending-r.spending[side])<1e-6);assert.equal(bounty,r.killBounties[side]);assert.ok(Math.abs(error)<1e-6);assert.ok(Math.abs(r.ledgerError[side])<1e-6);}
 const player=r.commands.filter(a=>a.side===0);assert.ok(player.length>0);
 for(const [i,a]of player.entries()){assert.ok(a.cost>0);assert.ok(['build','upgrade','cast','buyCitadelOption'].includes(a.method));assert.ok(Math.abs(a.time/2-Math.round(a.time/2))<1e-6,'fixed decision ticks');if(i)assert.ok(a.time-player[i-1].time>=2-1e-7,'at most one successful command per two seconds');}
 const map=getMap(packets[0].game.mapId??'classic'),positions=new Set(opening.buildings.filter(b=>b.side===0).map(b=>`${b.x}/${b.y}`));let queueIndex=0;
 for(const a of player.filter(a=>a.method==='build')){const [type,x,y]=a.args;while(queueIndex<c.queue.length){const [wanted,home,lane]=c.queue[queueIndex++];if(type===wanted&&x===home&&y===map.lanes[lane])break;}assert.ok(queueIndex<=c.queue.length);const prior=c.queue[queueIndex-1];assert.deepEqual([type,x,y],[prior[0],prior[1],map.lanes[prior[2]]]);const position=`${x}/${y}`;assert.equal(positions.has(position),false,'no original or later factory replacements');positions.add(position);}
 const types=new Map();for(const packet of packets)for(const b of packet.game.state.buildings)types.set(b.id,b.type);for(const b of r.losses)types.set(b.id,b.type);
 for(const a of player.filter(a=>a.method==='upgrade'))assert.ok(c.upgradePriority.includes(types.get(a.args[0])),'only listed producer/mine upgrades');
 const originalTargets=r.targets.map(t=>({...t,destroyed:!final.buildings.some(b=>b.id===t.id&&b.hp>0)}));assert.deepEqual(originalTargets,r.targets);
 if(id==='foothold')assert.ok(r.targets.filter(t=>t.destroyed).length>=2);
 if(id==='granary-primary'){assert.equal(r.targets.length,2);assert.ok(r.targets.every(t=>t.destroyed));assert.ok(final.bases[1].hp>0,'two-original-mine primary with enemy core still alive');}
 if(id==='no-fires'){assert.equal(r.targets.length,1);assert.equal(r.targets[0].destroyed,true);}
 if(id==='crossing-control'){assert.ok(final.campaignControl.heldSeconds>=60);assert.equal(final.campaignControl.bridges.length,2);assert.equal(r.heldSeconds,final.campaignControl.heldSeconds);assert.ok(final.bases[1].hp>0,'genuine control primary with enemy core still alive');}
 if(id==='finale-splash'){assert.equal(final.colossus.phase,'defeated');assert.equal(r.bossPhase,'defeated');assert.ok(final.bases[1].hp<=0);}
 if(id==='granary'){assert.ok(final.bases[1].hp<=0);assert.ok(r.targets.filter(t=>t.destroyed).length<2,'core alternative does not validate both mine targets');}
 // Rejection occurs before importing/advancing any scenario: this is not a second case.
 const runBytes=await readFile(path.join(output,'RUN.json')),names=await readdir(output);await assert.rejects(runOne(id,output),error=>error.code==='EEXIST');assert.deepEqual(await readFile(path.join(output,'RUN.json')),runBytes);assert.deepEqual(await readdir(output),names);
 await assert.rejects(runOne(id,root),/Evidence must stay outside source/);
 passed=true;
});
