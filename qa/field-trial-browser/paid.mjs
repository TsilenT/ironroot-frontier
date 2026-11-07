import {test,expect} from '../browser/node_modules/@playwright/test/index.mjs';
import {createCurrentChallenge,evaluateChallenge,getChallengeTargets} from '../../dist/challenges.js';
import {advanceObjectiveBattle} from '../../dist/objectives.js';
import {press,tapPoint} from '../browser/map-browser-helpers.mjs';
import {TRIAL_ID} from '../../tests/ashen-crossroads-policies.mjs';
// Bounded callback-preserving clock pattern from deterministic-fast/helpers.mjs.
// Used only for this paid simulation. Navigation/storage/gesture tests use real time.
const hostWait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function native(page,operation){
  let done=false,error;const pending=operation().then(()=>done=true,e=>{error=e;done=true;});
  const start=performance.now();
  while(!done){if(performance.now()-start>10000)throw Error('Native input deadlock');await page.clock.runFor(16);await hostWait(1);}
  await pending;if(error)throw error;await page.clock.runFor(16);
}
const boundary=s=>({...s,accumulator:0});
const observed=page=>page.evaluate(()=>window.__qaPaid);
// Cover the southern flyers early, leaving time for native mobile drawer actions.
const plan=[['watchtower',1250,1],['archery',1250,2],['foundry',1250,0],['archery',1110,2],['archery',1110,0]];

test('paid native north and south route completes with Stonegate and enemy citadel standing',async({page},info)=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  // Install on an empty page; never jump time or bypass callbacks in the game.
  await page.goto('about:blank');const epoch=Date.UTC(2026,10,7);
  await page.clock.install({time:new Date(epoch)});await page.clock.pauseAt(new Date(epoch+1000));await page.goto('/');
  await page.evaluate(async()=>{
    const {Game}=await import('/engine.js');
    const {evaluateChallenge}=await import('/challenges.js');
    const update=Game.prototype.update,build=Game.prototype.build;
    window.__qaPaid={actions:[],last:null};
    Game.prototype.update=function(...args){const value=update.apply(this,args);if(this.ruleset.id==='frontier-authored-air-local'&&(this.tick%5===0||evaluateChallenge(this,'ashen-crossroads').completed||evaluateChallenge(this,'ashen-crossroads').failed))window.__qaPaid.last=this.serialize();return value;};
    Game.prototype.build=function(...args){const before=this.state.gold[0],tick=this.tick,active=this.state.time>0&&this.ruleset.id==='frontier-authored-air-local';const result=build.apply(this,args);
      if(active&&result.ok)window.__qaPaid.actions.push({args,tick,before,after:this.state.gold[0],cost:this.buildings[args[0]].cost});return result;};
  });
  await native(page,()=>press(page,'[data-mode="challenges"]'));
  await native(page,()=>page.getByRole('button',{name:/Ashen Crossroads/}).click());
  await expect(page.locator('#challengeObjective')).toContainText('any 2 of the 3');
  await native(page,()=>press(page,'#start'));
  await expect(page.locator('#objectiveProgress')).toHaveText('0/2 targets destroyed');
  // The shipped 2× control still uses normal fixed ticks and objective evaluation.
  await native(page,()=>press(page,'#speed'));await native(page,()=>press(page,'#speed'));
  const seen=new Set(['0/2 targets destroyed']);
  // Every purchase uses the real build bar, legal canvas coordinate, ordinary gold.
  for(const [type,x,lane] of plan){
    const previous=(await observed(page)).actions.at(-1);
    const minimum=previous?previous.tick/20+6:6;
    while((await observed(page)).last.state.time<minimum || (await observed(page)).last.state.gold[0]<(createCurrentChallenge(TRIAL_ID)).buildings[type].cost){
      await page.clock.runFor(250);seen.add(await page.locator('#objectiveProgress').textContent());
      if(await page.locator('#resultModal').isVisible())break;
    }
    if(await page.locator('#resultModal').isVisible())break;
    await native(page,()=>press(page,'#home'));
    // Center via the actual minimap if this world's x is offscreen from Home.
    const mini=await page.locator('#minimap').boundingBox();
    await native(page,()=>tapPoint(page,{x:mini.x+mini.width*x/3200,y:mini.y+mini.height/2}));
    await native(page,()=>press(page,`[data-type="${type}"]`));
    // The minimap centers the renderer with its normal clamping; no camera injection.
    const rect=await page.locator('#battle').boundingBox(),scale=Math.max(.32,rect.height/900),half=rect.width/(2*scale);
    const camera=half>=1600?1600:Math.max(half,Math.min(3200-half,x));
    const point={x:rect.x+rect.width/2+(x-camera)*scale,y:rect.y+rect.height/2+([260,450,640][lane]-450)*scale};
    const count=(await observed(page)).actions.length;
    await native(page,()=>tapPoint(page,point));
    expect((await observed(page)).actions.length).toBe(count+1);
    expect((await observed(page)).actions.at(-1).args[0]).toBe(type);
    expect((await observed(page)).actions.at(-1).args[1]).toBeCloseTo(x,5);
    expect((await observed(page)).actions.at(-1).args[2]).toBe([260,450,640][lane]);
  }
  for(let i=0;i<1100&&!await page.locator('#resultModal').isVisible();i++){await page.clock.runFor(250);seen.add(await page.locator('#objectiveProgress').textContent());}
  const observedResult=await observed(page);
  console.log('PAID_OBSERVED '+JSON.stringify({profile:info.project.name,time:observedResult.last.state.time,actions:observedResult.actions,result:await page.locator('#resultCopy').textContent()}));
  await expect(page.locator('#resultEyebrow')).toHaveText('FIELD TRIAL COMPLETE');
  await expect(page.locator('#resultCopy')).toContainText('2/2 targets destroyed');
  await expect(page.locator('#resultObjectives')).toContainText('Stonegate: standing · not needed');
  expect([...seen]).toContain('1/2 targets destroyed');
  const data=await observed(page),oracle=createCurrentChallenge(TRIAL_ID);
  for(const action of data.actions){while(oracle.tick<action.tick)oracle.update(.05);expect(oracle.tick).toBe(action.tick);expect(oracle.state.gold[0]).toBeCloseTo(action.before,6);expect(oracle.build(...action.args).ok).toBe(true);expect(oracle.state.gold[0]).toBeCloseTo(action.after,6);expect(action.before-action.after).toBe(action.cost);}
  let outcome=evaluateChallenge(oracle,TRIAL_ID);
  while(!outcome.completed&&!outcome.failed)outcome=advanceObjectiveBattle(oracle,.05,g=>evaluateChallenge(g,TRIAL_ID),240);
  expect(boundary(data.last)).toEqual(boundary(oracle.serialize()));
  expect(outcome.completed).toBe(true);expect(oracle.state.winner).toBeNull();
  expect(getChallengeTargets(oracle,TRIAL_ID).map(t=>!!t.building)).toEqual([false,true,false]);expect(oracle.state.bases[1].hp).toBeGreaterThan(0);
  expect(errors).toEqual([]);
  await info.attach('paid-result',{body:await page.screenshot({fullPage:true}),contentType:'image/png'});
  const summary={profile:info.project.name,time:oracle.state.time,actions:data.actions,targets:getChallengeTargets(oracle,TRIAL_ID).map(t=>({name:t.name,hp:t.building?.hp??0})),citadels:oracle.state.bases.map(b=>b.hp),gold:oracle.state.gold[0],kills:oracle.state.stats.kills[0]};
  await info.attach('paid-route-evidence',{body:Buffer.from(JSON.stringify(summary,null,2)),contentType:'application/json'});
  console.log('PAID_TRIAL '+JSON.stringify(summary));
});
