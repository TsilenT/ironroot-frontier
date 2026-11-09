/** Synthetic records only. No Game import, construction, update or real seed. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {cleanPrefix,retainedProduction,validateOrdinarySpawns} from '../qa/shared-watch-validation/evaluate.mjs';
const build=(type,x,lane)=>({method:'build',type,x,lane});
const command=(tick,action,ok=true)=>({tick,time:tick*.05,action,ok,buildingId:tick+100});
const payment=(c,id,cost)=>({tick:c.tick,time:c.time,side:0,method:c.action.method,type:c.action.type,x:c.action.x,lane:c.action.lane,id,cost,before:{building:c.action.method==='upgrade'?{level:c.action.fromLevel}:null}});
function pair(){
 const dc=[command(0,build('watchtower',1250,1)),command(1000,build('sanctum',830,2)),command(1700,build('foundry',1250,0))];
 const cc=structuredClone(dc);cc[0].action.lane=0;cc[2].ok=false;cc[2].reason='Too close to another building.';
 const donor={policy:'central-watch',seed:'synthetic-only',commands:dc,ledger:{transactions:dc.map((c,i)=>payment(c,100+i,[220,230,270][i]))},initial:{state:{buildings:[{id:10,type:'barracks',side:0,x:690,lane:2,invested:140}]}},final:{tick:2400,state:{buildings:[]}},losses:[],spawns:[{id:500,type:'warrior',side:0,buildingId:10,birthLane:2,tick:1464,time:73.2}]};
 const control={policy:'north-watch-control',seed:'synthetic-only',commands:cc,ledger:{transactions:cc.filter(c=>c.ok).map((c,i)=>payment(c,900+i,[220,230][i]))},initial:{state:{buildings:[{id:999,type:'barracks',side:0,x:690,lane:2,invested:140}]}},final:{tick:2400,state:{buildings:[]}},losses:[{id:999,type:'barracks',side:0,x:690,lane:2,tick:1329,time:66.45}],spawns:[]};
 return {donor,control};
}

test('85s placement collision censors strictly then, preserving a complete earlier retained-output witness',()=>{
 const {donor,control}=pair(),r=retainedProduction(donor,control);assert.equal(r.prefix.exclusiveTick,1700);assert.equal(r.prefix.reason,'control-command-rejected');assert.equal(r.material,true);assert.equal(r.witnesses.length,1);assert.equal(r.witnesses[0].subsequentOutput[0].tick,1464);
 assert.equal(r.witnesses[0].donorAsset.id,10);assert.equal(r.witnesses[0].controlAsset.id,999); // Different generated IDs are legal.
});

test('50s affordability failure prevents later evidence, not complete evidence strictly before it',()=>{
 const {donor,control}=pair();control.commands[1].ok=false;control.commands[1].reason='Need 230 gold.';control.ledger.transactions.pop();let r=retainedProduction(donor,control);assert.equal(r.prefix.exclusiveTick,1000);assert.equal(r.material,false);
 control.losses[0].tick=900;donor.spawns[0].tick=950;donor.spawns[0].time=47.5;r=retainedProduction(donor,control);assert.equal(r.material,true);assert.equal(r.prefix.exclusiveTick,1000);
});

test('same-tick output, boundary-tick output and boundary-tick loss never count',()=>{
 const {donor,control}=pair(),loss=control.losses[0];donor.spawns=[{id:500,type:'warrior',side:0,buildingId:10,birthLane:2,tick:loss.tick,time:loss.tick*.05},{id:501,type:'warrior',side:0,buildingId:10,birthLane:2,tick:1700,time:85}];assert.equal(retainedProduction(donor,control).material,false);
 donor.spawns.push({id:502,type:'warrior',side:0,buildingId:10,birthLane:2,tick:loss.tick+1,time:(loss.tick+1)*.05});assert.equal(retainedProduction(donor,control).material,true);loss.tick=1700;assert.equal(retainedProduction(donor,control).material,false);
});

test('a semantic paid target or cost difference censors even if both commands report success',()=>{
 let {donor,control}=pair();control.ledger.transactions[1].cost++;let p=cleanPrefix(donor,control);assert.equal(p.exclusiveTick,1000);assert.equal(p.reason,'different-payment-cost-or-target');
 ({donor,control}=pair());control.commands[1].action.x=970;p=cleanPrefix(donor,control);assert.equal(p.exclusiveTick,1000);assert.equal(p.reason,'different-command-target');
 ({donor,control}=pair());control.ledger.transactions[1].x=970;assert.equal(cleanPrefix(donor,control).exclusiveTick,1000);
});

test('upgrade level is semantic; IDs are not',()=>{
 const {donor,control}=pair(),a={method:'upgrade',type:'barracks',x:690,lane:2,fromLevel:1};donor.commands[1].action={...a};control.commands[1].action={...a};donor.ledger.transactions[1]=payment(donor.commands[1],10,98);control.ledger.transactions[1]=payment(control.commands[1],999,98);
 assert.equal(cleanPrefix(donor,control).exclusiveTick,1700);control.ledger.transactions[1].before.building.level=2;assert.equal(cleanPrefix(donor,control).exclusiveTick,1000);
});

test('actual lost producer classification does not depend on final survivors; mines and unmatched assets fail',()=>{
 const {donor,control}=pair();assert.deepEqual(donor.final.state.buildings,[]);assert.equal(retainedProduction(donor,control).material,true);
 control.initial.state.buildings[0].invested=141;assert.equal(retainedProduction(donor,control).material,false);control.initial.state.buildings[0].invested=140;control.losses[0].type='mint';assert.equal(retainedProduction(donor,control).material,false);
});

test('paid producer must be identically bought, and donor must retain it through the prefix',()=>{
 const {donor,control}=pair();control.losses=[{id:901,type:'sanctum',side:0,x:830,lane:2,tick:1260,time:63}];donor.spawns=[{id:501,type:'wizard',side:0,buildingId:101,birthLane:2,tick:1404,time:70.2}];assert.equal(retainedProduction(donor,control).material,true);
 donor.losses.push({id:101,type:'sanctum',side:0,x:830,lane:2,tick:1600});assert.equal(retainedProduction(donor,control).material,false);
});

test('omitted watch and cheaper archery are only the declared treatment, not a new spending budget',()=>{
 let {donor,control}=pair();control.policy='omit-watch-control';control.commands[0].action.lane=1;control.commands[0].omitted=true;control.ledger.transactions.shift();assert.equal(cleanPrefix(donor,control).exclusiveTick,1700);
 ({donor,control}=pair());control.policy='central-archery-control';control.commands[0].action=build('archery',1250,1);control.ledger.transactions[0]=payment(control.commands[0],900,175);assert.equal(cleanPrefix(donor,control).exclusiveTick,1700);control.ledger.transactions[0].cost=220;assert.equal(cleanPrefix(donor,control).exclusiveTick,0);
});

test('missing, extra, duplicate and unpaired commands/payments are censored without silently repairing them',()=>{
 let {donor,control}=pair();control.commands.splice(1,1);assert.equal(cleanPrefix(donor,control).exclusiveTick,1000);
 ({donor,control}=pair());control.commands.push(command(800,build('mint',410,2),false));assert.equal(cleanPrefix(donor,control).exclusiveTick,800);
 ({donor,control}=pair());control.commands.push(structuredClone(control.commands[1]));assert.equal(cleanPrefix(donor,control).exclusiveTick,1000);
 ({donor,control}=pair());control.ledger.transactions.push({...payment(command(700,build('mint',410,2)),77,190)});assert.equal(cleanPrefix(donor,control).exclusiveTick,700);
});

test('terminal/maximum caps are exclusive and inputs remain unchanged',()=>{
 const {donor,control}=pair(),before=structuredClone({donor,control});assert.equal(cleanPrefix(donor,control,{maximumSeconds:60}).exclusiveTick,1200);control.final.tick=1300;assert.equal(retainedProduction(donor,control).material,false);control.final.tick=before.control.final.tick;
 assert.deepEqual({donor,control},before);assert.throws(()=>cleanPrefix(donor,{...control,seed:'different-synthetic-label'}),/seeds differ/);assert.throws(()=>cleanPrefix(donor,control,{maximumSeconds:0}),/prefix maximum/);
});


test('ordinary output rejects missing, duplicate, nonunit, wrong-type and impossible provenance records',()=>{
 for(const mutate of [u=>delete u.id,u=>u.id=NaN,u=>u.id=-1,u=>u.type='invalid-nonunit',u=>u.type='wizard',u=>u.side=1,u=>u.birthLane=0,u=>u.buildingId=12345,u=>u.tick=2500,u=>u.time=1]){const {donor,control}=pair();mutate(donor.spawns[0]);assert.throws(()=>retainedProduction(donor,control),/identity|Spawn|spawn/);}
 let {donor}=pair();donor.spawns.push({...donor.spawns[0]});assert.throws(()=>validateOrdinarySpawns(donor),/duplicate/);
 ({donor}=pair());donor.spawns[0].id=10;assert.throws(()=>validateOrdinarySpawns(donor),/identity/);
 ({donor}=pair());donor.losses.push({id:10,tick:1400});assert.throws(()=>validateOrdinarySpawns(donor),/after producer loss/);
});
