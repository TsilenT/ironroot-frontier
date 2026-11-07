import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {getRuleset} from '../../dist/rulesets.js';
const dir='qa/citadel-options/',base='5ec1f967a1c8c8f9861f68b8fef3cf99c4fa460d';
const sha=x=>createHash('sha256').update(x).digest('hex'),git=(...a)=>execFileSync('git',a,{encoding:'utf8'}).trim(),r=JSON.parse(readFileSync(dir+'results.json'));
assert.equal(r.cases.length,120);assert.equal(new Set(r.cases.map(c=>c.id)).size,120);assert.equal(new Set(r.cases.map(c=>c.prehistoryHash)).size,24);
for(const [f,h] of Object.entries(r.metadata.sources))assert.equal(sha(execFileSync('git',['show',`${r.metadata.sourceCommit}:${f}`])),h,f);
const oldPrototype=execFileSync('git',['show',`${r.metadata.sourceCommit}:${dir}prototype.mjs`],{encoding:'utf8'});
assert.equal(readFileSync(dir+'prototype.mjs','utf8'),oldPrototype.replace('this.state.time>=420-1e-8','this.state.time>420'));
let citadelPurchases=0,assignedArchery=0;
for(const c of r.cases){
 assert.ok(c.assigned.ok&&c.assigned.alive&&c.assigned.timeEligible);assert.equal(c.purchases[1-c.focal],null);
 if(c.choice==='archery'){assignedArchery++;assert.equal(c.assigned.cost,175);}else if(c.choice==='hold')assert.equal(c.assigned.cost,0);else{citadelPurchases++;assert.equal(c.assigned.cost,190);assert.equal(c.purchases[c.focal].kind,c.choice);}
 for(const side of [0,1]){
  const l=c.ledgers[side];assert.equal(l.bounty,2*c.final.kills[side]);
  const spend=c.actions.filter(a=>a.side===side&&a.ok).reduce((n,a)=>n+a.grossCost,0);assert.equal(l.spent,spend);
  assert.ok(Math.abs(l.initial+l.base+l.mine+l.bounty+l.refund-l.spent-c.final.gold[side])<1e-6);
  for(const a of c.actions.filter(a=>a.side===side&&a.ok)){
   assert.equal(a.before.gold-a.after.gold+a.immediateBounty,a.grossCost-a.refund);
   if(a.method==='build')assert.equal(a.grossCost,getRuleset('frontier-air-local-open').buildings[a.args[0]].cost);
   if(a.method==='purchase')assert.equal(a.grossCost,190);
   if(a.method==='cast')assert.equal(a.grossCost,75);
  }
  const damage=Object.values(c.incoming[side]).reduce((a,b)=>a+b,0);assert.ok(Math.abs(damage-c.damage[side])<1e-6);assert.equal(c.incoming[side].unknown??0,0);
  assert.ok(Math.abs(6000+c.final.healed[side]-damage-c.decay[side]-c.final.hp[side])<1e-6);
  const b=c.baseShots[side];assert.equal(Object.values(b.byTarget).reduce((n,t)=>n+t.kills,0),b.kills);assert.ok(b.kills<=c.final.kills[side]);
 }
}
assert.equal(citadelPurchases,72);assert.equal(assignedArchery,24);
const runtime=git('ls-tree','-r','--name-only',base,'dist').split('\n'),runtimeHashes={};
for(const f of runtime){const h=sha(readFileSync(f));assert.equal(h,sha(execFileSync('git',['show',`${base}:${f}`],{maxBuffer:10*1024*1024})));runtimeHashes[f]=h;}
assert.equal(git('diff','--name-only',base,'--','dist'),'');
const walk=(p)=>readdirSync(p,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(p+e.name+'/'):[p+e.name]);
const evidence=Object.fromEntries(walk(dir).filter(f=>!f.endsWith('/provenance.json')).sort().map(f=>[f,sha(readFileSync(f))]));
writeFileSync(dir+'provenance.json',JSON.stringify({base,firstRunSource:r.metadata.sourceCommit,analyzedCommit:git('rev-parse','HEAD'),node:process.version,distinctPaidScriptGames:120,pairedQuintets:24,paidCitadelPurchases:72,paidAssignedArcheries:24,holdDecisions:24,paidReplays:0,originalSourcesVerified:true,onlyPrototypeChangeAfterPaidRun:'timed decay predicate aligned exactly; open cases unaffected',grossLedgerAndBountyAudit:true,actualDamageAndHealingAudit:true,productionUnchanged:true,runtimeSha256:runtimeHashes,evidenceSha256:evidence},null,2)+'\n');
console.log('Verified 120 cases / 24 quintets, gross costs, exact kill bounties, actual damage/healing, original source hashes, timed-only correction and unchanged runtime.');
