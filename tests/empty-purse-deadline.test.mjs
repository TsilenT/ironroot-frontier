/** Synthetic deadline fixtures only: no new balance cases or outcome search. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {createCampaignMission,evaluateCampaignMission} from '../dist/campaign.js';
import {advanceObjectiveBattle} from '../dist/objectives.js';
const ID='the-empty-purse';
const evaluate=g=>evaluateCampaignMission(g,ID);
function at(time){const g=createCampaignMission(ID);g.state.time=time;g.tick=Math.round(time/.05);g.aiTimer=30;return g;}
for(const delta of [.001,.016,.05,.1,.2,.25])test(`Empty Purse production objective frames reach deadline without persistent stall, delta ${delta}`,()=>{
 const g=at(599.95);let outcome;
 for(let i=0;i<101;i++){outcome=advanceObjectiveBattle(g,delta,evaluate,600);if(outcome.completed||outcome.failed)break;}
 assert.equal(outcome.failed,true);assert.equal(outcome.completed,false);assert.equal(g.tick,12000);assert.ok(Math.abs(g.state.time-600)<1e-7);
 const terminal=g.serialize();for(let i=0;i<5;i++)assert.equal(advanceObjectiveBattle(g,delta,evaluate,600).failed,true);assert.deepEqual(g.serialize(),terminal);
});
test('Empty Purse natural fixed-step floating clock and residual accumulator reach the deadline',()=>{
 let naturalTime=0;for(let i=0;i<11999;i++)naturalTime+=.05;
 for(const accumulator of [0,.001,.016,.0499999999999]){const g=at(naturalTime);g.accumulator=accumulator;let out;for(let frame=0;frame<20;frame++){out=advanceObjectiveBattle(g,.016,evaluate,600);if(out.completed||out.failed)break;}assert.equal(out.failed,true);assert.equal(g.tick,12000);assert.ok(Math.abs(g.state.time-600)<1e-7);}
});
for(const time of [599.95,600,600.05])for(const result of ['alive','enemy-down','own-down','draw'])test(`Empty Purse core precedence at ${time}: ${result}`,()=>{
 const g=at(time);if(result==='enemy-down'){g.state.bases[1].hp=0;g.state.bases[0].hp=1;g.state.winner=0;}
 if(result==='own-down'){g.state.bases[0].hp=0;g.state.winner=1;}
 if(result==='draw'){g.state.bases.forEach(b=>b.hp=0);g.state.winner='draw';}
 const out=evaluate(g);assert.equal(out.completed,result==='enemy-down'&&time<=600);assert.equal(out.failed,result==='own-down'||result==='draw'||time>=600&&!(result==='enemy-down'&&time===600));
 if(out.completed||out.failed){const before=g.serialize();assert.deepEqual(advanceObjectiveBattle(g,.2,evaluate,600),out);assert.deepEqual(g.serialize(),before);}
});
test('Empty Purse winner terminal engine rejects ordinary spending without state mutation',()=>{
 for(const winner of [0,1,'draw']){const g=at(120);g.state.winner=winner;g.state.gold[0]=10000;const id=g.state.buildings[0].id,before=g.serialize();for(const r of [g.build('sanctum',690,g.map.lanes[0]),g.upgrade(id),g.sell(id),g.cast(1500,450),g.buyCitadelOption('regen')])assert.equal(r.ok,false);g.update(.2);assert.deepEqual(g.serialize(),before);}
});
const app=readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');
function appFunction(name){const start=app.indexOf(`function ${name}(`);assert.ok(start>=0);return app.slice(start,app.indexOf('\n}',start)+2);}
test('Empty Purse deadline outcome blocks real production interaction and citadel guards',()=>{
 const g=at(600),context={game:g,started:true,paused:false,document:{hidden:false},viewportPause:{active:false},$:()=>({classList:{contains:()=>true}}),recoveryHold:false,profileGate:false,battleSafetyReason:false,coachingHold:false,firstBuildHold:false,supportsCitadelOptions:()=>true,battleSession:{status:()=> 'current'},objectiveOutcome:null};
 vm.createContext(context);vm.runInContext(appFunction('canInteract')+'\n'+appFunction('citadelDialogSafe'),context);
 assert.equal(vm.runInContext('canInteract() && citadelDialogSafe()',context),true);
 context.objectiveOutcome=evaluate(g);assert.equal(context.objectiveOutcome.failed,true);
 assert.equal(vm.runInContext('canInteract()',context),false);assert.equal(vm.runInContext('citadelDialogSafe()',context),false);
 // All ordinary command entry points use those guards. These are source guard
 // checks, not a claim of native pointer/keyboard/touch coverage.
 for(const signature of ["$('upgrade').onclick = () => {","$('sell').onclick = () => {",'function selectBuild(type) {','function activateBattlePoint(w, { repeatBuild = false } = {}) {']){
  const start=app.indexOf(signature);assert.ok(start>=0);assert.match(app.slice(start,start+200),/!canInteract\(\)/);
 }
 assert.match(app,/if \(outcome.completed \|\| outcome.failed\) objectiveOutcome = outcome;/);
 assert.match(app,/if \(started && !paused && !coachingHold && game.state.winner === null && !objectiveOutcome\)/);
});
