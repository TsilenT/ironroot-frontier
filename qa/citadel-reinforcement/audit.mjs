import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {getRuleset} from '../../dist/rulesets.js';
const dir='qa/citadel-reinforcement/',base='5ec1f967a1c8c8f9861f68b8fef3cf99c4fa460d';
const git=(...a)=>execFileSync('git',a,{encoding:'utf8'}).trim();
const sha=x=>createHash('sha256').update(x).digest('hex');
const data=JSON.parse(readFileSync(dir+'results.json'));
assert.equal(data.cases.length,108);assert.equal(new Set(data.cases.map(c=>c.id)).size,108);
for(const [file,hash] of Object.entries(data.sources))assert.equal(sha(execFileSync('git',['show',`${data.sourceCommit}:${file}`])),hash,`first-run source ${file}`);
const counts={primary:0,interaction:0,symmetric:0};
let paidChoices=0,reactivePurchases=0,attempts=0;
for(const c of data.cases){
  counts[c.group]++;
  if(c.assigned?.ok)paidChoices++;
  for(const side of [0,1]){
    const l=c.ledgers[side],actions=c.actions.filter(a=>a.side===side&&a.ok);
    const spend=actions.reduce((n,a)=>n+Math.max(0,a.before.gold-a.after.gold),0);
    assert.ok(Math.abs(spend-l.spent)<1e-7);
    assert.ok(Math.abs(l.initial+l.base+l.mine+l.bridge+l.bounty+l.refund-l.spent-c.final.gold[side])<1e-7);
    assert.ok(l.maxResidual<1e-7);
    for(const a of actions){
      if(a.method==='reinforce'){
        assert.equal(a.before.gold-a.after.gold,190);assert.equal(a.after.hp-a.before.hp,600);assert.equal(a.after.maxHp-a.before.maxHp,600);assert.ok(a.tick>=1800);
        if(c.group==='symmetric')reactivePurchases++;
      }
      if(a.method==='build')assert.equal(a.before.gold-a.after.gold,getRuleset('frontier-air-local-open').buildings[a.args[0]].cost);
    }
  }
  if(c.group==='symmetric')attempts+=c.actions.filter(a=>a.method==='reinforce').length;
}
assert.deepEqual(counts,{primary:72,interaction:24,symmetric:12});assert.equal(paidChoices,72);assert.equal(reactivePurchases,1);assert.equal(attempts,49);
const runtime=git('ls-tree','-r','--name-only',base,'dist').split('\n');
const runtimeHashes={};
for(const file of runtime){const current=readFileSync(file),original=execFileSync('git',['show',`${base}:${file}`],{maxBuffer:10*1024*1024});assert.equal(sha(current),sha(original),file);runtimeHashes[file]=sha(current);}
assert.equal(git('diff','--name-only',base,'--','dist'),'');
const changed=git('diff','--name-only',base,'HEAD').split('\n').filter(Boolean);assert.ok(changed.every(p=>p.startsWith(dir)));
const evidence=Object.fromEntries(readdirSync(dir).filter(f=>f!=='provenance.json').sort().map(f=>[dir+f,sha(readFileSync(dir+f))]));
const provenance={base,preregistrationCommit:git('rev-parse','261101a'),firstRunSourceCommit:data.sourceCommit,analyzedCommit:git('rev-parse','HEAD'),node:process.version,counts,distinctGames:108,measurementReplays:24,paidChoiceBranches:paidChoices,reactiveAttempts:attempts,reactivePurchases,sourceHashesVerifiedAgainstFirstRunGitCommit:true,productionRuntimeUnchanged:true,changedTrackedPaths:changed,sourceRuntimeSha256:runtimeHashes,evidenceSha256:evidence};
writeFileSync(dir+'provenance.json',JSON.stringify(provenance,null,2)+'\n');
console.log('Verified source hashes, 108 cases, both ledgers, normal prices, 24 replay assertions, and unchanged runtime.');
