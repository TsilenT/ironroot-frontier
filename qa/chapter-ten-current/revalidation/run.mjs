/** Fresh fixed-policy validation, deliberately separate from reconstructed source.
 * Import is inert. CLI requires --run CASE NEW_OUTPUT_DIRECTORY; one case only. */
import assert from 'node:assert/strict';
import {execFile as execFileCallback} from 'node:child_process';import {promisify} from 'node:util';
import {readFile,writeFile,mkdir,mkdtemp,rm,realpath} from 'node:fs/promises';
import {createHash} from 'node:crypto';import {tmpdir} from 'node:os';import path from 'node:path';import {fileURLToPath,pathToFileURL} from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url));
const hash=b=>createHash('sha256').update(b).digest('hex');
const execFile=promisify(execFileCallback);
async function inspectSourceGit(source,plan){
 const git=async(...args)=>(await execFile('git',['--no-optional-locks',...args],{cwd:source,maxBuffer:1024*1024})).stdout.trim();
 assert.equal(await realpath(await git('rev-parse','--show-toplevel')),source,'sourceFolder must be the actual repository root');
 return {commit:await git('rev-parse','HEAD'),tree:await git('rev-parse','HEAD^{tree}'),dirty:(await git('status','--porcelain=v1','--untracked-files=all')).length>0,reviewedFactoryCommit:plan.remoteSourceCommit,reviewedFactoryTree:plan.remoteSourceTree};
}
export async function inspectPlan(){const bytes=await readFile(path.join(here,'plan.json'));const plan=JSON.parse(bytes);return {plan,planHash:hash(bytes)};}
export async function runOne(caseId,destination){
 const {plan,planHash}=await inspectPlan(),c=plan.cases.find(c=>c.id===caseId);assert.ok(c,'Choose exactly one frozen case');
 const source=await realpath(path.resolve(here,plan.sourceFolder));
 const sourceGit=await inspectSourceGit(source,plan);
 const output=path.resolve(destination),parent=await realpath(path.dirname(output));assert.ok(output!==source&&!output.startsWith(source+path.sep)&&parent!==source&&!parent.startsWith(source+path.sep),'Evidence must stay outside source');
 await mkdir(output,{recursive:false}); // No overwriting an earlier run.
 const runnerHash=hash(await readFile(fileURLToPath(import.meta.url)));
 await writeFile(path.join(output,'RUN.json'),JSON.stringify({caseId,planHash,runnerHash,sourceGit,startedAt:new Date().toISOString(),status:'started'},null,2));
 let temp;
 try{
  let modulePath=path.join(source,'qa/chapter-ten-current',c.module);
  if(c.name==='Crossing'||c.name==='Finale'){
   temp=await mkdtemp(path.join(tmpdir(),'ironroot-ch10-fixed-validation-'));const folder=c.name==='Crossing'?'crossing':'finale';
   const generator=await import(pathToFileURL(path.join(source,'qa/chapter-ten-current',folder,'prepare-lab.mjs')));
   const runtime=await generator['prepare'+c.name+'Lab'](path.join(temp,'runtime'));modulePath=path.join(runtime,'dist',folder+'-scenario.js');
  }
  const m=await import(pathToFileURL(modulePath)),e=m['create'+c.name]({seed:c.seed}),g=e.game,s=g.state;
  const evaluate=()=>m['evaluate'+c.name](e),advance=dt=>m['advance'+c.name](e,dt),serialize=()=>m['serialize'+c.name](e),restore=p=>m['restore'+c.name](p);
  const r={caseId,seed:c.seed,planHash,runnerHash,remoteSourceCommit:plan.remoteSourceCommit,sourceGit,ruleset:g.ruleset.id,startingGold:[...s.gold],startingKills:[...s.stats.kills],startingHP:s.bases.map(b=>b.hp),minimumOwnHP:s.bases[0].hp,spending:[0,0],grossIncome:[0,0],commands:[],failedBuilds:[],events:[],packets:[],losses:[],breakoutTroops:[],bossDamage:0,bossMinimumX:null};
  for(const method of ['build','upgrade','cast','buyCitadelOption']){const original=g[method];g[method]=function(...args){const side=method==='build'?(args[3]??0):method==='cast'?(args[2]??0):(args[1]??0),gold=s.gold[side],kills=s.stats.kills[side];const result=original.apply(this,args);if(result.ok){const cost=gold-s.gold[side]+2*(s.stats.kills[side]-kills);r.spending[side]+=cost;r.commands.push({time:s.time,side,method,args:[...args],cost});}return result;};}
  const damage=g._damage;g._damage=function(target,amount,side){const before=target.hp;if(s.colossus?.phase==='active'&&s.colossus.triggeredAt===g.tick&&target.side===0&&Object.hasOwn(g.units,target.type)&&amount===before&&before>0&&Math.hypot(target.x-s.bases[1].x,target.y-s.bases[1].y)<=310)r.breakoutTroops.push({id:target.id,type:target.type,x:target.x,y:target.y,hp:before});const result=damage.call(this,target,amount,side);if(target.type==='colossus'&&side===0&&target.hp<before)r.bossDamage+=before-target.hp;if(before>0&&target.hp<=0&&Object.hasOwn(g.buildings,target.type))r.losses.push({time:s.time,side:target.side,id:target.id,type:target.type,lane:target.lane,invested:target.invested});return result;};
  let packetIndex=0;
  async function packet(label){const p=serialize();assert.deepEqual(m['serialize'+c.name](restore(p)),p,'Exact private restore');const filename=`packet-${String(packetIndex++).padStart(3,'0')}-${label}.json`;await writeFile(path.join(output,filename),JSON.stringify(p));r.packets.push({label,time:s.time,filename,sha256:hash(Buffer.from(JSON.stringify(p)))});}
  await packet('opening');
  let nextCommand=0,queueIndex=0,successfulBuilds=0,nextSample=30,activeSaved=false;
  let priorPhase=s.colossus?.phase,priorCore=s.bases[1].hp>0;
  while(!evaluate().completed&&!evaluate().failed&&s.time<c.horizon-1e-7){
   // This is the entire information boundary for decision making in fog.
   const v=c.name==='Night'?m.observeNight(e).state:s;
   if(v.time+1e-8>=nextCommand){nextCommand+=plan.commandIntervalSeconds;let acted=false;
    if(successfulBuilds>=4){
     if(c.name==='Finale'&&v.bases[0].hp<2100&&g.canBuyCitadelOption('regen').ok)acted=g.buyCitadelOption('regen').ok;
     if(!acted&&v.spellCooldown[0]<=0&&v.gold[0]>=g.ruleset.spell.cost){
      const threats=v.units.filter(u=>u.side===1&&u.hp>0&&u.x<1150);
      const target=(c.name==='Finale'?v.units.find(u=>u.side===1&&u.type==='colossus'&&u.hp>0&&u.x<1500):null)??threats.find(u=>threats.filter(t=>Math.hypot(t.x-u.x,t.y-u.y)<g.ruleset.spell.radius).length>=4);
      if(target)acted=g.cast(target.x,target.y).ok;
     }
    }
    if(!acted&&queueIndex<c.queue.length){const [type,home,lane]=c.queue[queueIndex];if(v.gold[0]>=g.buildings[type].cost){const result=g.build(type,home,g.map.lanes[lane]);if(result.ok){acted=true;successfulBuilds++;}else r.failedBuilds.push({time:v.time,index:queueIndex,type,reason:result.reason});queueIndex++;}}
    else if(!acted&&c.upgradePriority.length){const rank=t=>c.upgradePriority.indexOf(t);const b=v.buildings.filter(b=>b.side===0&&b.hp>0&&b.level<3&&rank(b.type)>=0).sort((a,b)=>a.level-b.level||rank(a.type)-rank(b.type)||a.id-b.id)[0];if(b&&v.gold[0]>=g.upgradeCost(b))acted=g.upgrade(b.id).ok;}
   }
   if(evaluate().completed||evaluate().failed)break; // A paid Volley can finish now.
   const rates=[0,1].map(side=>5+s.buildings.filter(b=>b.side===side&&b.type==='mint'&&b.hp>0).reduce((n,b)=>n+2.5*(1+.5*(b.level-1)),0));
   const before=s.time;advance(plan.stepSeconds);const elapsed=s.time-before;assert.ok(elapsed>0,'Nonterminal native simulation stalled');for(const side of [0,1])r.grossIncome[side]+=rates[side]*elapsed;r.minimumOwnHP=Math.min(r.minimumOwnHP,s.bases[0].hp);const livingBoss=s.units.find(u=>u.type==='colossus'&&u.hp>0);if(livingBoss)r.bossMinimumX=Math.min(r.bossMinimumX??livingBoss.x,livingBoss.x);
   const phase=s.colossus?.phase,core=s.bases[1].hp>0;
   if(phase!==priorPhase||core!==priorCore){r.events.push({time:s.time,phase,enemyCoreHP:s.bases[1].hp,bossHP:livingBoss?.hp??null,playerSurvivors:s.units.filter(u=>u.side===0&&u.hp>0).length,liveBuildings:[0,1].map(side=>s.buildings.filter(b=>b.side===side&&b.hp>0).length)});await packet('transition');priorPhase=phase;priorCore=core;}
   if(s.time+1e-7>=nextSample){await packet(!activeSaved&&!evaluate().completed&&!evaluate().failed?'active':'sample');activeSaved=true;nextSample+=30;}
  }
  await packet('final');
  const outcome=evaluate(),targets=e.targets?.map(t=>({name:t.name,id:t.id,destroyed:!s.buildings.some(b=>b.id===t.id&&b.hp>0)}))??[];
  const primary=outcome.completed&&(c.name==='Foothold'?targets.filter(t=>t.destroyed).length>=2:c.name==='Granary'?targets.filter(t=>t.destroyed).length===2:c.name==='Night'?targets.filter(t=>t.destroyed).length===1:c.name==='Crossing'?s.campaignControl.heldSeconds>=60:s.colossus.phase==='defeated'&&s.bases[1].hp<=0);
  const killBounties=s.stats.kills.map((k,side)=>2*(k-r.startingKills[side]));
  const ledgerError=[0,1].map(side=>r.startingGold[side]+r.grossIncome[side]+killBounties[side]-r.spending[side]-s.gold[side]);
  Object.assign(r,{outcome,time:s.time,horizonReached:s.time>=c.horizon-1e-7&&!outcome.completed&&!outcome.failed,classification:outcome.completed?(primary?'primary':'core-alternative'):outcome.failed?outcome.outcome:'inconclusive',primarySatisfied:primary,targets,heldSeconds:s.campaignControl?.heldSeconds??null,bossPhase:s.colossus?.phase??null,finalHP:s.bases.map(b=>b.hp),finalGold:[...s.gold],killBounties,ledgerError,queueIndex,successfulBuilds});
  await writeFile(path.join(output,'result.json'),JSON.stringify(r,null,2));
  for(const error of ledgerError)assert.ok(Math.abs(error)<1e-6,`Ledger discrepancy ${error}`);
  const paid=r.commands.filter(a=>a.side===0);for(let i=1;i<paid.length;i++)assert.ok(paid[i].time-paid[i-1].time>=2-1e-7,'Player command cadence');
  if(outcome.completed)assert.ok(primary||s.bases[1].hp<=0,'Win must satisfy disclosed primary or core alternative');
  await writeFile(path.join(output,'COMPLETE.json'),JSON.stringify({caseId,classification:r.classification,time:r.time,ledgerVerified:true,packetsRestored:true,planHash,runnerHash,sourceGit},null,2));return r;
 }catch(error){await writeFile(path.join(output,'ERROR.txt'),String(error.stack??error));throw error;}finally{if(temp)await rm(temp,{recursive:true,force:true});}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){if(process.argv.length!==5||process.argv[2]!=='--run')throw Error('Usage: node run.mjs --run CASE NEW_OUTPUT_DIRECTORY (one frozen case only)');const r=await runOne(process.argv[3],process.argv[4]);console.log(JSON.stringify({caseId:r.caseId,classification:r.classification,time:r.time}));}
