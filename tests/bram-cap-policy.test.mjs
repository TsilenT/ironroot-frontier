import test from'node:test';import assert from'node:assert/strict';import{readFileSync}from'node:fs';import{createHash}from'node:crypto';
import{create}from'../qa/bram-forward/simulate.mjs';import{OPENING,policyAction}from'../qa/bram-forward/policies.mjs';
// Synthetic command-selection fixtures only. No development game, outcome,
// new seed, altered formation or altered saved campaign state is evaluated.
function fixture({full=false,safe=false}={}){
 const g=create(7301,false);g._damage(g.state.buildings.find(b=>b.id===6),10000,0);g.update(.05);g.state.gold[0]=10000;
 for(const[type,x,lane]of OPENING)g._place(type,x,g.map.lanes[lane],0);
 for(const lane of[0,1])for(const[type,x]of[['archery',690],['barracks',550]])g._place(type,x,g.map.lanes[lane],0);
 if(full)assert.equal(g.build('foundry',2510,340).ok,true);
 if(safe)for(let i=0;i<2;i++)g._spawn({type:'barracks',side:0,x:2300,y:340,lane:0,level:1});
 else g._spawn({type:'foundry',side:1,x:2700,y:340,lane:0,level:1});
 g.tick=100;g.state.time=5;const commands=[];
 for(const method of['build','upgrade']){const original=g[method];g[method]=function(...args){const result=original.apply(this,args);commands.push({method,args,result});return result;};}
 return{g,commands};
}
test('Policy proposal changes only the cap guard relative to exact PR40/004 source',()=>{
 const source=readFileSync(new URL('../qa/bram-forward/policies.mjs',import.meta.url),'utf8'),guard="if(id!=='rear'&&own.length<g.map.buildLimit)for(const gate",old="if(id!=='rear')for(const gate";
 assert.equal(source.split(guard).length,2);const prior=Buffer.from(source.replace(guard,old)),sha256=createHash('sha256').update(prior).digest('hex'),blob=createHash('sha1').update(Buffer.concat([Buffer.from('blob '+prior.length+'\0'),prior])).digest('hex');
 assert.equal(sha256,'79b63bc246af903d2a7117b6b8d8534dd45651a8d8d49832c92c776dbcbcabc2');assert.equal(blob,'2257cdb4bc0866efe64d4841553fcf65550e419a');
});
for(const id of['prompt','cautious'])test(id+' at full cap skips impossible forward purchase and uses exactly one existing upgrade',()=>{
 const{g,commands}=fixture({full:true}),notes=[],before=g.state.gold[0];assert.equal(g.state.buildings.filter(b=>b.side===0).length,16);policyAction(g,id,notes);
 assert.equal(commands.length,1);assert.equal(commands[0].method,'upgrade');assert.equal(commands[0].result.ok,true);assert.equal(commands[0].result.building.x,2510);assert.equal(before-g.state.gold[0],189);assert.equal(commands[0].result.building.level,2);assert.deepEqual(notes,[]);
});
for(const id of['prompt','cautious'])test(id+' below cap retains the original forward foundry choice and normal cost',()=>{
 const{g,commands}=fixture({safe:true}),before=g.state.gold[0];assert.equal(g.state.buildings.filter(b=>b.side===0).length,15);policyAction(g,id);
 assert.equal(commands.length,1);assert.equal(commands[0].method,'build');assert.deepEqual(commands[0].args,['foundry',2510,340,0]);assert.equal(commands[0].result.ok,true);assert.equal(before-g.state.gold[0],270);
});
test('Below-cap cautious danger still defers forward and reaches the original rear upgrade',()=>{
 const{g,commands}=fixture(),notes=[];policyAction(g,'cautious',notes);assert.equal(commands.length,1);assert.equal(commands[0].method,'upgrade');assert.equal(commands[0].result.building.x,1250);assert.equal(notes.length,1);assert.equal(notes[0].safety.siege,true);
});
test('At full cap unaffordable upgrade is still one failed attempt; off-cadence makes no attempt',()=>{
 for(const id of['prompt','cautious']){const{g,commands}=fixture({full:true});g.state.gold[0]=0;policyAction(g,id);assert.equal(commands.length,1);assert.equal(commands[0].method,'upgrade');assert.equal(commands[0].result.ok,false);g.tick=101;g.state.time=5.05;policyAction(g,id);assert.equal(commands.length,1);}
});
